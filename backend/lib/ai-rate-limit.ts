import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDailyAiCallLimit } from '@/lib/plans';

export interface RateLimitOk {
  ok: true;
  remaining: number; // -1 = unlimited
  currentCalls: number;
  needsReset: boolean;
}

export interface RateLimitDenied {
  ok: false;
  response: NextResponse;
}

/**
 * 检查并扣减用户的每日 AI 调用配额（所有 AI 接口共享同一计数器）。
 * - FREE 用户：每日限 getDailyAiCallLimit() 次
 * - PRO / ENTERPRISE：不限次数
 *
 * 采用"先扣后用"策略，防止并发绕过限制。
 */
export async function checkAndIncrementAiQuota(
  userId: string
): Promise<RateLimitOk | RateLimitDenied> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, aiCallsToday: true, aiCallsResetAt: true },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: '用户不存在' }, { status: 404 }),
    };
  }

  const limit = getDailyAiCallLimit(user.plan as any);

  // 判断是否跨天，需要重置计数器
  const now = new Date();
  const resetAt = new Date(user.aiCallsResetAt);
  const needsReset =
    now.getUTCFullYear() !== resetAt.getUTCFullYear() ||
    now.getUTCMonth() !== resetAt.getUTCMonth() ||
    now.getUTCDate() !== resetAt.getUTCDate();

  const currentCalls = needsReset ? 0 : user.aiCallsToday;

  if (limit !== -1 && currentCalls >= limit) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'AI_LIMIT_REACHED',
          message: `免费版每日限 ${limit} 次 AI 识别，今日已用完`,
          callsUsed: currentCalls,
          limit,
        },
        { status: 429 }
      ),
    };
  }

  // 先扣减再调用，防止并发绕过
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiCallsToday: needsReset ? 1 : { increment: 1 },
      aiCallsResetAt: needsReset ? now : undefined,
    },
  });

  const remaining = limit === -1 ? -1 : limit - (currentCalls + 1);
  return { ok: true, remaining, currentCalls, needsReset };
}
