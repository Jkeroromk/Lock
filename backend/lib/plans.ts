export type PlanTier = 'FREE' | 'PRO' | 'MAX';

/** Photo + nutrition-label scans per day on the free plan. Barcode and manual logging are never limited. */
export const FREE_DAILY_AI_CALLS = 8;
/** New accounts get unlimited scans for their first week. */
export const FREE_TRIAL_DAYS = 7;
/** Extra scans an inviter earns when a new user joins with their invite code. */
export const INVITE_BONUS_AI_CALLS = 5;
/** Cap on invite rewards per account, so the bonus can't be farmed. */
export const MAX_INVITE_REWARDS = 10;
/** AI diet reviews per day on the free plan (separate from scans). */
export const FREE_DAILY_DIET_ANALYSES = 1;
export const FREE_MAX_FRIENDS = 5;

export function isPaidPlan(plan: PlanTier): boolean {
  return plan === 'PRO' || plan === 'MAX';
}

export function getDailyAiCallLimit(plan: PlanTier): number {
  return isPaidPlan(plan) ? -1 : FREE_DAILY_AI_CALLS; // -1 = unlimited
}

export function getMaxFriends(plan: PlanTier): number {
  return isPaidPlan(plan) ? -1 : FREE_MAX_FRIENDS; // -1 = unlimited
}

/** True during a new account's first FREE_TRIAL_DAYS days. */
export function isInTrialWeek(createdAt: Date, now = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
}
