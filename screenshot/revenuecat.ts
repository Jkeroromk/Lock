/** Screenshot builds only (swapped in for lib/revenuecat.ts): the demo account is Pro, no store calls. */
import type { PlanTier } from '@/store/useStore';
export * from '@/lib/revenuecat';

export function initRevenueCat(_platform: 'ios' | 'android'): void {}
export async function identifyUser(_userId: string): Promise<void> {}
export async function setAcquisitionSource(_source: string): Promise<void> {}
export async function tagPaywall(_reason: string): Promise<void> {}
export async function resetUser(): Promise<void> {}
export async function checkProStatus(): Promise<boolean> { return true; }
export async function getActivePlan(): Promise<PlanTier> { return 'PRO'; }
