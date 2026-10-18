import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { checkDietAnalysisAllowance, requestTimeZone } from '@/lib/ai-rate-limit';
import { TEXT_MODEL, fireworksChat, extractJson, describeAiError } from '@/lib/fireworks';
import { normalizePlan } from '@/lib/workouts';

const TRAINING_DAY_PROTEIN = 20;
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** YYYY-MM-DD in the user's time zone (UTC when unknown). */
function dayKeyIn(d: Date, timeZone: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

// The prompt is written in Chinese; this tells the model which language to answer in.
const RESPONSE_LANGUAGE: Record<string, string> = {
  'en-US': 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
};

/** Maps any BCP-47 tag (zh, zh-Hans-CN, zh-Hant-TW, ja, ...) to a supported language. */
function toSupportedLanguage(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const t = tag.trim().replace(/_/g, '-').toLowerCase();
  if (t.startsWith('zh')) return /hant|-tw|-hk|-mo/.test(t) ? 'zh-TW' : 'zh-CN';
  if (t.startsWith('ja')) return 'ja-JP';
  if (t.startsWith('ko')) return 'ko-KR';
  if (t.startsWith('en')) return 'en-US';
  return null;
}

/** The app's language (?lang=), else the request's Accept-Language, else English. */
function resolveLanguage(request: NextRequest): string {
  const fromApp = toSupportedLanguage(request.nextUrl.searchParams.get('lang'));
  if (fromApp) return fromApp;
  for (const part of (request.headers.get('accept-language') ?? '').split(',')) {
    const lang = toSupportedLanguage(part.split(';')[0]);
    if (lang) return lang;
  }
  return 'en-US';
}

const GOAL_LABELS: Record<string, string> = { lose_weight: '减重', lose_fat: '减脂', gain_muscle: '增肌' };
const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', other: '其他' };

// AI calls can take up to ~30s; don't let the function be cut off first.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const lang = resolveLanguage(request);
    const responseLanguage = RESPONSE_LANGUAGE[lang];

    // ── 限流检查 ────────────────────────────────────────────────────────────
    // Separate from scans: unlimited on paid plans, one per day on free
    // (plus one more after switching the app language).
    const quota = await checkDietAnalysisAllowance(userId, requestTimeZone(request), lang);
    if (!quota.ok) return quota.response;
    // ────────────────────────────────────────────────────────────────────────

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const timeZone = requestTimeZone(request);
    const [meals, healthSyncs, workouts, workoutPlan] = await Promise.all([
      prisma.meal.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.healthSync.findMany({
        where: { userId, date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
        take: 7,
      }),
      prisma.workoutSession.findMany({
        where: { userId, finishedAt: { gte: sevenDaysAgo } },
        orderBy: { finishedAt: 'asc' },
        take: 20,
        include: { sets: { select: { exerciseId: true } } },
      }),
      prisma.workoutPlan.findUnique({ where: { userId }, select: { days: true } }),
    ]);

    if (!process.env.FIREWORKS_API_KEY?.trim()) {
      await quota.refund();
      console.error('[GET /api/ai/diet-analysis] FIREWORKS_API_KEY is not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const mealSummary = meals.length > 0
      ? meals.map((m) => `${m.foodName}(${Math.round(Number(m.calories))}kcal)`).join('、')
      : '暂无记录';

    const totalCalories = meals.reduce((s, m) => s + Number(m.calories), 0);
    const avgCalories = meals.length > 0 ? Math.round(totalCalories / 7) : 0;
    const totalProtein = Math.round(meals.reduce((s, m) => s + Number(m.protein || 0), 0));
    const totalCarbs = Math.round(meals.reduce((s, m) => s + Number(m.carbs || 0), 0));
    const totalFat = Math.round(meals.reduce((s, m) => s + Number(m.fat || 0), 0));

    const userContext = [
      user?.goal && `目标: ${GOAL_LABELS[user.goal] || user.goal}`,
      user?.weight && `体重: ${user.weight}kg`,
      user?.height && `身高: ${user.height}cm`,
      user?.age && `年龄: ${user.age}岁`,
      user?.gender && `性别: ${GENDER_LABELS[user.gender] || user.gender}`,
      user?.exerciseFrequency && `运动频率: ${user.exerciseFrequency}`,
    ].filter(Boolean).join('，');

    const avgSteps = healthSyncs.length > 0
      ? Math.round(healthSyncs.reduce((s, h) => s + h.steps, 0) / healthSyncs.length)
      : 0;
    const avgActiveEnergy = healthSyncs.length > 0
      ? Math.round(healthSyncs.reduce((s, h) => s + Number(h.activeEnergy), 0) / healthSyncs.length)
      : 0;

    const healthContext = healthSyncs.length > 0
      ? `平均每日步数: ${avgSteps.toLocaleString()}步，平均主动消耗: ${avgActiveEnergy}kcal`
      : '暂无运动数据';

    // ── Training (Lock's training tab) ───────────────────────────────────────
    // Exercise ids are readable English slugs ("barbell_squat"), fine for the model.
    const trainingDays = new Set(workouts.map((w) => w.dayKey));
    const workoutLines = workouts.map((w) => {
      const exercises = [...new Set(w.sets.map((s) => s.exerciseId))].slice(0, 8).join(', ');
      const weekday = WEEKDAYS[new Date(`${w.dayKey}T12:00:00Z`).getUTCDay()];
      return `${w.dayKey}(${weekday}) ${w.title ?? '训练'}：${w.setCount}组，训练量${Math.round(Number(w.volume))}kg，${Math.round(w.durationSec / 60)}分钟，动作 ${exercises}${w.prCount ? `，破纪录${w.prCount}个` : ''}`;
    });
    const planDays = normalizePlan(workoutPlan?.days) ?? {};
    const planLine = Object.entries(planDays)
      .filter(([, d]) => d.exercises.length > 0)
      .sort(([a], [b]) => ((Number(a) + 6) % 7) - ((Number(b) + 6) % 7))
      .map(([k, d]) => `${WEEKDAYS[Number(k)]}${d.name ? ` ${d.name}` : ''}（${d.exercises.map((e) => e.id).slice(0, 6).join(', ')}）`)
      .join('；');

    // Protein per local day vs. the target (higher on training days).
    const baseProtein = Math.round(Number(request.nextUrl.searchParams.get('protein')) || 0);
    const proteinByDay = new Map<string, number>();
    for (const m of meals) {
      const k = dayKeyIn(m.createdAt, timeZone);
      proteinByDay.set(k, (proteinByDay.get(k) ?? 0) + Number(m.protein || 0));
    }
    let proteinLine = '';
    if (baseProtein > 0) {
      let trainHit = 0, restHit = 0, restDays = 0;
      for (const [day, g] of proteinByDay) {
        const training = trainingDays.has(day);
        const target = baseProtein + (training ? TRAINING_DAY_PROTEIN : 0);
        if (training) { if (g >= target) trainHit++; }
        else { restDays++; if (g >= target) restHit++; }
      }
      proteinLine = `蛋白质目标：休息日 ${baseProtein}g，训练日 ${baseProtein + TRAINING_DAY_PROTEIN}g。`
        + `有饮食记录的日子里，训练日蛋白质达标 ${trainHit}/${trainingDays.size} 天，休息日达标 ${restHit}/${restDays} 天。`;
    }

    const trainingContext = [
      workoutLines.length ? `近7天力量训练 ${workoutLines.length} 次：\n${workoutLines.join('\n')}` : '近7天没有力量训练记录',
      planLine && `每周训练计划：${planLine}`,
      proteinLine,
    ].filter(Boolean).join('\n');

    const prompt = `你是一位专业营养师兼力量训练教练。根据以下用户信息，把饮食和训练放在一起看，给出建议。

用户资料：${userContext || '未知'}
近7天饮食记录：${mealSummary}
近7天营养摄入：平均每日${avgCalories}kcal，蛋白质共${totalProtein}g，碳水共${totalCarbs}g，脂肪共${totalFat}g
近7天运动数据（来自 Apple Health）：${healthContext}
${trainingContext}

请把饮食和训练结合起来看（例如训练日蛋白质够不够、练得多的时候热量是否跟上、练后吃了什么），给出简洁、实用的建议，尽量引用具体的天数或数字。返回 JSON 格式（只返回 JSON，不要其他文字）：
{
  "summary": "一句话总结近期饮食状况（不超过25字）",
  "suggestions": ["饮食建议1（不超过25字）", "饮食建议2（不超过25字）", "饮食建议3（不超过25字）"],
  "exercise": "结合饮食的训练建议，例如\"这周练腿两次，但训练日蛋白质只达标 1 天\"（不超过40字）",
  "score": 评分(1-10的整数)
}`;

    let analysis: { summary: string; suggestions: string[]; exercise: string; score: number };
    try {
      const content = await fireworksChat({
        model: TEXT_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a nutrition coach. Reply ONLY in ${responseLanguage}: every text value in the JSON `
              + `(summary, suggestions, exercise) must be written in ${responseLanguage}, whatever language the `
              + `instructions or food names are in. Keep the JSON keys in English.`,
          },
          { role: 'user', content: `${prompt}\n\nWrite all text values in ${responseLanguage}.` },
        ],
        temperature: 0.3,
        // Reasoning models think before answering; leave room for both.
        maxTokens: 6000,
        timeoutMs: 50_000,
      });
      analysis = extractJson(content);
    } catch (error) {
      await quota.refund();
      console.error('[GET /api/ai/diet-analysis] AI call failed', { model: TEXT_MODEL, reason: describeAiError(error) });
      return NextResponse.json({ error: 'Analysis failed' }, { status: 502 });
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('[GET /api/ai/diet-analysis]', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
