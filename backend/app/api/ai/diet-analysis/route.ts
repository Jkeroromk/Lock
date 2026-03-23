import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY?.trim();
const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';

const GOAL_LABELS: Record<string, string> = { lose_weight: '减重', lose_fat: '减脂', gain_muscle: '增肌' };
const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', other: '其他' };

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

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

    if (!FIREWORKS_API_KEY) {
      return NextResponse.json({ error: 'AI 服务未配置' }, { status: 500 });
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

    const response = await axios.post(
      FIREWORKS_API_URL,
      {
        model: 'accounts/fireworks/models/qwen3-30b-a3b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${FIREWORKS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const content = response.data.choices[0]?.message?.content || '';
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const analysis = JSON.parse(jsonContent);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Diet analysis error:', error);
    return NextResponse.json({ error: error.message || '分析失败' }, { status: 500 });
  }
}
