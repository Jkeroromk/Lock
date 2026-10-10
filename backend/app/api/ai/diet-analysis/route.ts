import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { checkAndIncrementAiQuota, refundAiQuota } from '@/lib/ai-rate-limit';
import { TEXT_MODEL, fireworksChat, extractJson, describeAiError } from '@/lib/fireworks';

// The prompt is written in Chinese; this tells the model which language to answer in.
const RESPONSE_LANGUAGE: Record<string, string> = {
  'en-US': 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
};

const GOAL_LABELS: Record<string, string> = { lose_weight: '减重', lose_fat: '减脂', gain_muscle: '增肌' };
const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', other: '其他' };

// AI calls can take up to ~30s; don't let the function be cut off first.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const lang = request.nextUrl.searchParams.get('lang') ?? 'en-US';
    const responseLanguage = RESPONSE_LANGUAGE[lang] ?? RESPONSE_LANGUAGE['en-US'];

    // ── 限流检查 ────────────────────────────────────────────────────────────
    const quota = await checkAndIncrementAiQuota(userId);
    if (!quota.ok) return quota.response;
    // ────────────────────────────────────────────────────────────────────────

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [meals, healthSyncs] = await Promise.all([
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
    ]);

    if (!process.env.FIREWORKS_API_KEY?.trim()) {
      await refundAiQuota(userId);
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

    const prompt = `你是一位专业营养师兼健身顾问。根据以下用户信息给出饮食和运动建议。

用户资料：${userContext || '未知'}
近7天饮食记录：${mealSummary}
近7天营养摄入：平均每日${avgCalories}kcal，蛋白质共${totalProtein}g，碳水共${totalCarbs}g，脂肪共${totalFat}g
近7天运动数据（来自 Apple Health）：${healthContext}

请结合饮食和运动数据给出简洁、实用的建议。返回 JSON 格式（只返回 JSON，不要其他文字）：
{
  "summary": "一句话总结近期饮食状况（不超过25字）",
  "suggestions": ["饮食建议1（不超过25字）", "饮食建议2（不超过25字）", "饮食建议3（不超过25字）"],
  "exercise": "运动建议（不超过30字）",
  "score": 评分(1-10的整数)
}`;

    let analysis: { summary: string; suggestions: string[]; exercise: string; score: number };
    try {
      const content = await fireworksChat({
        model: TEXT_MODEL,
        messages: [{ role: 'user', content: `${prompt}\n\nWrite all text values in ${responseLanguage}.` }],
        temperature: 0.3,
      });
      analysis = extractJson(content);
    } catch (error) {
      await refundAiQuota(userId);
      console.error('[GET /api/ai/diet-analysis] AI call failed', { model: TEXT_MODEL, reason: describeAiError(error) });
      return NextResponse.json({ error: 'Analysis failed' }, { status: 502 });
    }

    return NextResponse.json({ ...analysis, remaining: quota.remaining });
  } catch (error: any) {
    console.error('[GET /api/ai/diet-analysis]', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
