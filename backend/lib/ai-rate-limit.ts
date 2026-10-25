import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import {
  isPaidPlan, effectivePlan, FREE_DAILY_AI_CALLS, PAID_DAILY_AI_CALLS, FREE_WEEKLY_DIET_ANALYSES, DIET_ANALYSIS_WINDOW_MS,
} from '@/lib/plans';

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
 * Checks and takes one AI scan from the user's daily allowance (photo + label,
 * and AI plan generation).
 * - FREE: FREE_DAILY_AI_CALLS per local day, then bonus scans
 * - PRO / MAX and accounts in their first week (Pro trial): "unlimited", with a
 *   fair-use ceiling of PAID_DAILY_AI_CALLS per local day
 * - admins (ADMIN_USER_IDS): unlimited, nothing counted
 *
 * `timeZone` must come from trustedTimeZone() (the zone stored on the user), never
 * straight from the request header. The unit is taken with a conditional update
 * before the AI call, so parallel requests can't slip past the limit.
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
  const paid = isPaidPlan(effectivePlan(user.plan as any, user.createdAt, now));
  const limit = paid ? PAID_DAILY_AI_CALLS : FREE_DAILY_AI_CALLS;

  // New day in the user's own time zone → counter starts over at their midnight.
  const needsReset = !sameLocalDay(now, new Date(user.aiCallsResetAt), timeZone);
  const currentCalls = needsReset ? 0 : user.aiCallsToday;

  // Take one unit of today's allowance. Each update only succeeds while the row
  // still allows it, so ten requests at once can't all read "2 used" and pass.
  const increment = () =>
    prisma.user.updateMany({
      where: { id: userId, aiCallsToday: { lt: limit } },
      data: { aiCallsToday: { increment: 1 } },
    });
  let taken = needsReset
    ? await prisma.user.updateMany({
        // Range, not equality: rows created with the DB default now() keep
        // microseconds, and the Date we read back is cut to milliseconds.
        where: { id: userId, aiCallsResetAt: { gte: user.aiCallsResetAt, lt: new Date(user.aiCallsResetAt.getTime() + 1) } },
        data: { aiCallsToday: 1, aiCallsResetAt: now },
      })
    : await increment();
  // Another request reset the day first: count against the fresh counter instead.
  if (needsReset && taken.count === 0) taken = await increment();

  if (taken.count > 0) {
    const bonus = Math.max(0, user.bonusAiCalls ?? 0);
    const remaining = paid ? -1 : Math.max(0, limit - (currentCalls + 1)) + bonus;
    return { ok: true, remaining, currentCalls, needsReset, refund: () => refundAiQuota(userId) };
  }

  if (paid) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'AI_DAILY_CAP',
          message: `Daily AI limit reached (${limit} per day). It resets at midnight.`,
          limit,
        },
        { status: 429 },
      ),
    };
  }

  // Free daily allowance used up → spend a bonus scan (earned from invites) if there is one.
  const spent = await prisma.user.updateMany({
    where: { id: userId, bonusAiCalls: { gt: 0 } },
    data: { bonusAiCalls: { decrement: 1 } },
  });
  if (spent.count > 0) {
    return {
      ok: true,
      remaining: Math.max(0, (user.bonusAiCalls ?? 0) - 1),
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

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'AI_LIMIT_REACHED',
        message: `Free plan: ${limit} AI scans per day`,
        callsUsed: Math.max(currentCalls, limit),
        limit,
      },
      { status: 429 }
    ),
  };
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

/**
 * The IANA time zone the app sends on every request. Fine for display and for
 * bucketing the user's own data; for anything that limits or rewards, use
 * trustedTimeZone() from lib/timezone.ts instead.
 */
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
 * FREE_WEEKLY_DIET_ANALYSES (1) per 7 days on the free plan. The window starts
 * at the first review and doesn't slide. If the user switches the app language,
 * they get one more review in that window in the new language (at most one per
 * supported language), so the review never gets stuck in a language they no
 * longer use.
 */
export async function checkDietAnalysisAllowance(
  userId: string,
  _timeZone?: string | null,
  lang?: string | null,
): Promise<DietAllowanceOk | RateLimitDenied> {
  if (isAdmin(userId)) return { ok: true, refund: async () => {} };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, lastDietAnalysisAt: true, dietAnalysisLangs: true, createdAt: true },
  });
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }
  if (isPaidPlan(effectivePlan(user.plan as any, user.createdAt))) return { ok: true, refund: async () => {} };

  const now = new Date();
  const previous = user.lastDietAnalysisAt;
  const previousLangs = user.dietAnalysisLangs;
  // lastDietAnalysisAt marks the start of the current 7-day window.
  const inWindow = !!previous && now.getTime() - previous.getTime() < DIET_ANALYSIS_WINDOW_MS;

  const limited = () => ({
    ok: false as const,
    response: NextResponse.json(
      {
        error: 'DIET_ANALYSIS_LIMIT_REACHED',
        message: `Free plan: ${FREE_WEEKLY_DIET_ANALYSES} AI review per week`,
        limit: FREE_WEEKLY_DIET_ANALYSES,
        nextAvailableAt: previous ? new Date(previous.getTime() + DIET_ANALYSIS_WINDOW_MS).toISOString() : null,
      },
      { status: 429 },
    ),
  });

  // Before the language column existed a review had no language recorded;
  // treat that as "a review was used" so it still counts against the allowance.
  const usedLangs = inWindow ? (previousLangs ?? '?').split(',').filter(Boolean) : [];
  const langKey = (lang || '?').slice(0, 10);
  if (usedLangs.length >= FREE_WEEKLY_DIET_ANALYSES && (lang == null || usedLangs.includes(langKey))) {
    return limited();
  }

  // Claim the review first so two quick taps can't both get through.
  const windowStart = inWindow ? previous! : now;
  const nextLangs = [...usedLangs, langKey].join(',');
  const claimed = await prisma.user.updateMany({
    where: { id: userId, lastDietAnalysisAt: previous, dietAnalysisLangs: previousLangs },
    data: { lastDietAnalysisAt: windowStart, dietAnalysisLangs: nextLangs },
  });
  if (claimed.count === 0) return limited();

  return {
    ok: true,
    refund: async () => {
      try {
        await prisma.user.updateMany({
          where: { id: userId, lastDietAnalysisAt: windowStart, dietAnalysisLangs: nextLangs },
          data: { lastDietAnalysisAt: previous, dietAnalysisLangs: previousLangs },
        });
      } catch (error) {
        console.error('[refundDietAnalysis]', error);
      }
    },
  };
}
