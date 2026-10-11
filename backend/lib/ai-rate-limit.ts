import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDailyAiCallLimit, isPaidPlan, FREE_DAILY_DIET_ANALYSES } from '@/lib/plans';

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
 * - PRO / MAX：不限次数
 *
 * 采用"先扣后用"策略，防止并发绕过限制。
 */
export async function checkAndIncrementAiQuota(
  userId: string,
  timeZone?: string | null,
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

  // New day in the user's own time zone → counter starts over at their midnight.
  const now = new Date();
  const needsReset = !sameLocalDay(now, new Date(user.aiCallsResetAt), timeZone);

  const currentCalls = needsReset ? 0 : user.aiCallsToday;

  if (limit !== -1 && currentCalls >= limit) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'AI_LIMIT_REACHED',
          message: `Free plan: ${limit} AI scans per day`,
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

/**
 * Gives back one AI call when the call failed on our side (AI provider error,
 * unparseable response), so users aren't charged quota for failures.
 */
export async function refundAiQuota(userId: string): Promise<void> {
  try {
    await prisma.user.updateMany({
      where: { id: userId, aiCallsToday: { gt: 0 } },
      data: { aiCallsToday: { decrement: 1 } },
    });
  } catch (error) {
    console.error('[refundAiQuota]', error);
  }
}

/** The user's IANA time zone, sent by the app on every request. */
export function requestTimeZone(request: Request): string | null {
  return request.headers.get('x-timezone');
}

/** YYYY-MM-DD for `d` in `timeZone` (UTC when missing or invalid). */
function localDay(d: Date, timeZone?: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function sameLocalDay(a: Date, b: Date, timeZone?: string | null): boolean {
  return localDay(a, timeZone) === localDay(b, timeZone);
}

export interface DietAllowanceOk {
  ok: true;
  /** Call on failure so a failed review doesn't use up the day's allowance. */
  refund: () => Promise<void>;
}

/**
 * AI diet review allowance, separate from scans: unlimited on paid plans,
 * FREE_DAILY_DIET_ANALYSES (1) per local day on the free plan.
 */
export async function checkDietAnalysisAllowance(
  userId: string,
  timeZone?: string | null,
): Promise<DietAllowanceOk | RateLimitDenied> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, lastDietAnalysisAt: true },
  });
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }
  if (isPaidPlan(user.plan as any)) return { ok: true, refund: async () => {} };

  const now = new Date();
  const previous = user.lastDietAnalysisAt;
  if (previous && sameLocalDay(now, previous, timeZone)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'DIET_ANALYSIS_LIMIT_REACHED', message: `Free plan: ${FREE_DAILY_DIET_ANALYSES} AI review per day`, limit: FREE_DAILY_DIET_ANALYSES },
        { status: 429 },
      ),
    };
  }

  // Claim today's review first so two quick taps can't both get through.
  const claimed = await prisma.user.updateMany({
    where: { id: userId, lastDietAnalysisAt: previous },
    data: { lastDietAnalysisAt: now },
  });
  if (claimed.count === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'DIET_ANALYSIS_LIMIT_REACHED', limit: FREE_DAILY_DIET_ANALYSES }, { status: 429 }),
    };
  }

  return {
    ok: true,
    refund: async () => {
      try {
        await prisma.user.updateMany({ where: { id: userId, lastDietAnalysisAt: now }, data: { lastDietAnalysisAt: previous } });
      } catch (error) {
        console.error('[refundDietAnalysis]', error);
      }
    },
  };
}
