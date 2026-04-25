export type PlanTier = 'FREE' | 'PRO' | 'MAX';

export const FREE_DAILY_AI_CALLS = 3;
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
