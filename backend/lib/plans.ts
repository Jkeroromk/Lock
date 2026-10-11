export type PlanTier = 'FREE' | 'PRO' | 'MAX';

/** Photo + nutrition-label scans per day on the free plan. Barcode and manual logging are never limited. */
export const FREE_DAILY_AI_CALLS = 8;
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
