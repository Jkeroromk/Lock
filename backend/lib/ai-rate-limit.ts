import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { getDailyAiCallLimit, isPaidPlan, isInTrialWeek, FREE_DAILY_DIET_ANALYSES } from '@/lib/plans';

export interface RateLimitOk {
  ok: true;
  remaining: number; // -1 = unlimited; includes bonus scans
  currentCalls: number;
  needsReset: boolean;
  /** Give the unit back when the AI call fails on our side. */
  refund: () => Promise<void>;
}

export interface RateLimitDenied {
  ok: false;
  response: NextResponse;
}

/**
 * Checks and takes one AI scan from the user's daily allowance (photo + label).
 * - FREE: getDailyAiCallLimit() per local day, unlimited in the first week, then bonus scans
 * - PRO / MAX and admins (ADMIN_USER_IDS): unlimited
 *
 * Takes the unit before the AI call so parallel requests can't slip past the limit.
 */
export async function checkAndIncrementAiQuota(
  userId: string,
  timeZone?: string | null,
): Promise<RateLimitOk | RateLimitDenied> {
  // Admins: unlimited, nothing counted.
  if (isAdmin(userId)) {
    return { ok: true, remaining: -1, currentCalls: 0, needsReset: false, refund: async () => {} };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, aiCallsToday: true, aiCallsResetAt: true, bonusAiCalls: true, createdAt: true },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    };
  }

  const now = new Date();
  // Paid plans and a new account's first week are unlimited.
  const limit = isInTrialWeek(user.createdAt, now) ? -1 : getDailyAiCallLimit(user.plan as any);

  // New day in the user's own time zone → counter starts over at their midnight.
  const needsReset = !sameLocalDay(now, new Date(user.aiCallsResetAt), timeZone);
  const currentCalls = needsReset ? 0 : user.aiCallsToday;
  const bonus = Math.max(0, user.bonusAiCalls ?? 0);

  // Daily allowance used up → spend a bonus scan (earned from invites) if there is one.
  if (limit !== -1 && currentCalls >= limit) {
    if (bonus > 0) {
      const spent = await prisma.user.updateMany({
        where: { id: userId, bonusAiCalls: { gt: 0 } },
        data: { bonusAiCalls: { decrement: 1 } },
      });
      if (spent.count > 0) {
        return {
          ok: true,
          remaining: bonus - 1,
          currentCalls,
          needsReset,
          refund: async () => {
            try {
              await prisma.user.update({ where: { id: userId }, data: { bonusAiCalls: { increment: 1 } } });
            } catch (error) {
              console.error('[refundBonusAiCall]', error);
            }
          },
        };
      }
    }
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

  // Take the unit before calling the AI so parallel requests can't slip past the limit.
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiCallsToday: needsReset ? 1 : { increment: 1 },
      aiCallsResetAt: needsReset ? now : undefined,
    },
  });

  const remaining = limit === -1 ? -1 : limit - (currentCalls + 1) + bonus;
  return { ok: true, remaining, currentCalls, needsReset, refund: () => refundAiQuota(userId) };
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
 * FREE_DAILY_DIET_ANALYSES (1) per local day on the free plan. If the user
 * switches the app language, they get one more review that day in the new
 * language (at most one per supported language), so the review never gets
 * stuck in a language they no longer use.
 */
export async function checkDietAnalysisAllowance(
  userId: string,
  timeZone?: string | null,
  lang?: string | null,
): Promise<DietAllowanceOk | RateLimitDenied> {
  if (isAdmin(userId)) return { ok: true, refund: async () => {} };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, lastDietAnalysisAt: true, dietAnalysisLangs: true },
  });
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }
  if (isPaidPlan(user.plan as any)) return { ok: true, refund: async () => {} };

  const limited = () => ({
    ok: false as const,
    response: NextResponse.json(
      { error: 'DIET_ANALYSIS_LIMIT_REACHED', message: `Free plan: ${FREE_DAILY_DIET_ANALYSES} AI review per day`, limit: FREE_DAILY_DIET_ANALYSES },
      { status: 429 },
    ),
  });

  const now = new Date();
  const previous = user.lastDietAnalysisAt;
  const previousLangs = user.dietAnalysisLangs;
  const today = !!previous && sameLocalDay(now, previous, timeZone);
  // Before this column existed a day's review had no language recorded; treat
  // that as "a review was used" so it still counts against the allowance.
  const usedLangs = today ? (previousLangs ?? '?').split(',').filter(Boolean) : [];
  const langKey = (lang || '?').slice(0, 10);
  if (usedLangs.length >= FREE_DAILY_DIET_ANALYSES && (lang == null || usedLangs.includes(langKey))) {
    return limited();
  }

  // Claim the review first so two quick taps can't both get through.
  const claimed = await prisma.user.updateMany({
    where: { id: userId, lastDietAnalysisAt: previous, dietAnalysisLangs: previousLangs },
    data: { lastDietAnalysisAt: now, dietAnalysisLangs: [...usedLangs, langKey].join(',') },
  });
  if (claimed.count === 0) return limited();

  return {
    ok: true,
    refund: async () => {
      try {
        await prisma.user.updateMany({
          where: { id: userId, lastDietAnalysisAt: now },
          data: { lastDietAnalysisAt: previous, dietAnalysisLangs: previousLangs },
        });
      } catch (error) {
        console.error('[refundDietAnalysis]', error);
      }
    },
  };
}
