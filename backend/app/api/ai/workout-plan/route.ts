import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { checkAndIncrementAiQuota, requestTimeZone } from '@/lib/ai-rate-limit';
import { TEXT_MODEL, fireworksChat, extractJson, describeAiError } from '@/lib/fireworks';
import { CATALOG, type Equipment } from '@/lib/exercise-catalog';
import type { PlanDays } from '@/lib/workouts';
import { templatePlan } from '@/lib/plan-templates';

// AI calls can take up to ~30s; don't let the function be cut off first.
export const maxDuration = 60;

const RESPONSE_LANGUAGE: Record<string, string> = {
  'en-US': 'English', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'ja-JP': '日本語', 'ko-KR': '한국어',
};
const LOCATIONS: Record<string, { equipment: Equipment[]; label: string }> = {
  gym: { equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'], label: '健身房（器械齐全）' },
  home: { equipment: ['dumbbell', 'bodyweight'], label: '在家，有一对可调哑铃' },
  bodyweight: { equipment: ['bodyweight'], label: '徒手，没有器械' },
};
const GOAL_LABELS: Record<string, string> = { lose_weight: '减重', lose_fat: '减脂', gain_muscle: '增肌' };
const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', other: '其他' };
const LB = 2.20462;

interface AiPlan {
  summary?: string;
  tips?: string[];
  days?: { weekday?: number; name?: string; exercises?: { id?: string; sets?: number; reps?: number }[] }[];
}

/** Default kg added per successful session, as a round plate step in the user's unit. */
function stepFor(equipment: Equipment, unit: string): number {
  if (unit === 'lb') return Math.round(((equipment === 'machine' ? 10 : 5) / LB) * 100) / 100;
  return equipment === 'dumbbell' ? 2 : equipment === 'machine' ? 5 : 2.5;
}

// POST /api/ai/workout-plan — suggest a weekly plan for someone who doesn't
// know where to start. Body: { days: 2–6, location: gym|home|bodyweight,
// level: beginner|experienced, unit: kg|lb, lang }. Returns a preview; the app
// saves it through PUT /api/workouts/plan if the user keeps it.
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => ({}));
  // Training weekdays the user picked (JS: 0 = Sunday), Monday-first order.
  const picked: number[] = [...new Set<number>((Array.isArray(body.weekdays) ? body.weekdays : [])
    .map((d: unknown) => Math.round(Number(d)))
    .filter((d: number) => d >= 0 && d <= 6))]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const daysPerWeek = picked.length >= 1 ? Math.min(6, picked.length) : Math.min(6, Math.max(2, Math.round(Number(body.days)) || 3));
  const weekdays = picked.length >= 1 ? picked.slice(0, 6) : undefined;
  const WD_LABEL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const location = LOCATIONS[body.location] ? (body.location as string) : 'gym';
  const level = body.level === 'experienced' ? 'experienced' : 'beginner';
  const unit = body.unit === 'lb' ? 'lb' : 'kg';
  const responseLanguage = RESPONSE_LANGUAGE[body.lang] ?? 'English';

  const lang = RESPONSE_LANGUAGE[body.lang] ? (body.lang as string) : 'en-US';
  // When the AI can't deliver, a classic template is still a good start
  // (and the AI call is given back).
  const fallback = () => NextResponse.json({ ...templatePlan({ days: daysPerWeek, weekdays, location, level, unit, lang }), source: 'template' });

  if (!process.env.FIREWORKS_API_KEY?.trim()) return fallback();

  const quota = await checkAndIncrementAiQuota(userId, requestTimeZone(request));
  if (!quota.ok) return quota.response;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { goal: true, gender: true, age: true, weight: true, height: true, exerciseFrequency: true },
    });
    const allowed = CATALOG.filter((e) => LOCATIONS[location].equipment.includes(e.equipment));
    const byId = new Map(allowed.map((e) => [e.id, e]));
    const catalogText = allowed.map((e) => `${e.id}（${e.zh} / ${e.en}，${e.group}，${e.equipment}）`).join('\n');

    const profile = [
      user?.goal && `目标：${GOAL_LABELS[user.goal] || user.goal}`,
      user?.gender && `性别：${GENDER_LABELS[user.gender] || user.gender}`,
      user?.age && `年龄：${user.age}`,
      user?.weight && `体重：${Number(user.weight)}kg`,
      user?.height && `身高：${user.height}cm`,
    ].filter(Boolean).join('，') || '未知';

    const prompt = `你是一位经验丰富的力量训练教练。请给这位用户排一份每周训练计划。

用户资料：${profile}
每周训练天数：${daysPerWeek} 天${weekdays ? `（${weekdays.map((d) => WD_LABEL[d]).join('、')}，其余休息）` : ''}
训练地点：${LOCATIONS[location].label}
训练经验：${level === 'beginner' ? '新手（刚开始或很久没练）' : '有基础（练过一段时间）'}

只能从下面的动作里选，"id" 必须原样照抄：
${catalogText}

要求：
- 正好 ${daysPerWeek} 个训练日${weekdays ? `，就排在 ${weekdays.map((d) => WD_LABEL[d]).join('、')}；连着练的两天不要练同一个部位` : '，均匀分布在一周里，中间留休息日'}；用 weekday 表示星期几（1=周一 … 7=周日）。
- 新手：全身或上下肢分化，每天 4–5 个动作，以复合动作开头，3 组 × 8–12 次。
- 有基础：推 / 拉 / 腿或上下肢分化，每天 5–6 个动作，主项 4 组 × 5–8 次，辅助 3 组 × 10–15 次。
- 一周里每个大肌群至少练到一次；同一天不要重复同一个动作。
- 结合用户目标：减脂 / 减重可以组数略多、组间休息短；增肌注重主项和容量。
- 每天的 name 写成很短的名字，例如「推（胸肩三头）」「腿 + 核心」「全身 A」。

只返回 JSON，不要其他文字：
{
  "summary": "一句话说明这份计划的思路（不超过40字）",
  "days": [
    { "weekday": 1, "name": "全身 A", "exercises": [ { "id": "barbell_squat", "sets": 3, "reps": 8 } ] }
  ],
  "tips": ["给新手的一条建议（不超过30字）", "另一条建议（不超过30字）"]
}`;

    let ai: AiPlan;
    try {
      const content = await fireworksChat({
        model: TEXT_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a strength coach. Reply ONLY with JSON. Write every text value (summary, day names, tips) in ${responseLanguage}. `
              + 'Exercise ids must be copied exactly from the list. Keep the JSON keys in English.',
          },
          { role: 'user', content: `${prompt}\n\nWrite all text values in ${responseLanguage}.` },
        ],
        temperature: 0.5,
        // Keep it quick: little reasoning, and a template if it takes too long.
        reasoningEffort: 'low',
        maxTokens: 6000,
        timeoutMs: 25_000,
      });
      ai = extractJson<AiPlan>(content);
    } catch (error) {
      await quota.refund();
      console.error('[POST /api/ai/workout-plan] AI call failed, using template', { model: TEXT_MODEL, reason: describeAiError(error) });
      return fallback();
    }

    // Keep only what the app can run: known exercises, sane numbers, one day per weekday.
    const plan: PlanDays = {};
    for (const d of Array.isArray(ai.days) ? ai.days : []) {
      const wd = Math.round(Number(d?.weekday));
      if (!(wd >= 1 && wd <= 7)) continue;
      const key = String(wd % 7); // 7 (Sunday) → "0"
      if (plan[key]) continue;
      const seen = new Set<string>();
      const exercises = (Array.isArray(d.exercises) ? d.exercises : []).flatMap((e) => {
        const ex = typeof e?.id === 'string' ? byId.get(e.id) : undefined;
        if (!ex || seen.has(ex.id)) return [];
        seen.add(ex.id);
        const bodyweight = ex.equipment === 'bodyweight';
        return [{
          id: ex.id,
          sets: Math.min(6, Math.max(1, Math.round(Number(e.sets)) || 3)),
          reps: Math.min(30, Math.max(1, Math.round(Number(e.reps)) || 10)),
          // Weights are filled in on the first workout and remembered from then on.
          weight: 0,
          progress: bodyweight ? ('none' as const) : ('weight' as const),
          step: stepFor(ex.equipment, unit),
        }];
      }).slice(0, 8);
      if (!exercises.length) continue;
      const name = typeof d.name === 'string' ? d.name.trim().slice(0, 24) : '';
      plan[key] = name ? { name, exercises } : { exercises };
    }

    // The user's chosen weekdays win: put the AI's days on them, in order.
    if (weekdays && Object.keys(plan).length > 0) {
      const aiDays = Object.keys(plan)
        .map(Number)
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((k) => plan[String(k)]);
      for (const k of Object.keys(plan)) delete plan[k];
      if (aiDays.length < weekdays.length) {
        // Fewer days than asked: fill the rest from the template.
        const filler = templatePlan({ days: daysPerWeek, weekdays, location, level, unit, lang }).plan;
        weekdays.forEach((wd, i) => { plan[String(wd)] = aiDays[i] ?? filler[String(wd)]; });
      } else {
        weekdays.forEach((wd, i) => { plan[String(wd)] = aiDays[i]; });
      }
    }

    if (Object.keys(plan).length === 0) {
      await quota.refund();
      console.error('[POST /api/ai/workout-plan] AI returned no usable days, using template');
      return fallback();
    }

    return NextResponse.json({
      summary: typeof ai.summary === 'string' ? ai.summary.slice(0, 120) : '',
      tips: (Array.isArray(ai.tips) ? ai.tips : []).filter((x): x is string => typeof x === 'string').slice(0, 3).map((x) => x.slice(0, 80)),
      plan,
      source: 'ai',
    });
  } catch (error) {
    await quota.refund();
    console.error('[POST /api/ai/workout-plan]', error);
    return fallback();
  }
}
