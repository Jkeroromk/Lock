export type PlanTier = 'FREE' | 'PRO' | 'MAX';

/** Photo + nutrition-label scans per day on the free plan. Barcode and manual logging are never limited. */
export const FREE_DAILY_AI_CALLS = 3;
/**
 * Every new account gets Pro for its first PRO_TRIAL_DAYS days, no card and no
 * App Store involved (2026-10-20). Keep in sync with lib/plans.ts in the app.
 */
export const PRO_TRIAL_DAYS = 7;
/**
 * Fair-use ceiling on "unlimited" AI (Pro, the first week, MAX): photo/label
 * scans and AI plan generations per local day. Far above real use (a heavy
 * logger does ~15), but it caps what one scripted account can cost us.
 */
export const PAID_DAILY_AI_CALLS = 100;
/** Extra scans an inviter earns when a new user joins with their invite code. */
export const INVITE_BONUS_AI_CALLS = 5;
/** Extra scans the new user gets for joining with a friend's invite code. */
export const INVITEE_BONUS_AI_CALLS = 5;
/** Cap on invite rewards per account, so the bonus can't be farmed. */
export const MAX_INVITE_REWARDS = 10;
/** AI diet reviews per week on the free plan (separate from scans). */
export const FREE_WEEKLY_DIET_ANALYSES = 1;
/** Length of the free plan's diet-review window. */
export const DIET_ANALYSIS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Friends are unlimited on every plan (2026-10-19): social is how Lock spreads. */
export const FREE_MAX_FRIENDS = -1;

export function isPaidPlan(plan: PlanTier): boolean {
  return plan === 'PRO' || plan === 'MAX';
}

export function getDailyAiCallLimit(plan: PlanTier): number {
  return isPaidPlan(plan) ? -1 : FREE_DAILY_AI_CALLS; // -1 = unlimited
}

export function getMaxFriends(plan: PlanTier): number {
  return isPaidPlan(plan) ? -1 : FREE_MAX_FRIENDS; // -1 = unlimited (also on Free)
}

/** True during a new account's first PRO_TRIAL_DAYS days. */
export function isInProTrial(createdAt: Date, now = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < PRO_TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

/** The plan to enforce: the stored plan, or PRO while the account is in its first week. */
export function effectivePlan(plan: PlanTier, createdAt: Date, now = new Date()): PlanTier {
  if (isPaidPlan(plan)) return plan;
  return isInProTrial(createdAt, now) ? 'PRO' : plan;
}
