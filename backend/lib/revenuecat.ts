import { prisma } from '@/lib/prisma';
import type { PlanTier } from '@/lib/plans';

/**
 * Server-side source of truth for subscription status.
 *
 * The client must never be trusted to tell us what plan it is on — instead we
 * ask RevenueCat directly using the secret REST API key, and derive the plan
 * from the active entitlements. Entitlement identifiers must match the ones
 * configured in the RevenueCat dashboard (and used in the app: 'pro', 'max').
 */

const RC_API_BASE = 'https://api.revenuecat.com/v1';

interface RcEntitlement {
  expires_date: string | null;
  product_identifier: string;
}

interface RcSubscriberResponse {
  subscriber: {
    entitlements: Record<string, RcEntitlement>;
  };
}

export class RevenueCatNotConfiguredError extends Error {
  constructor() {
    super('REVENUECAT_SECRET_API_KEY is not configured');
  }
}

function isActive(ent: RcEntitlement, now: number): boolean {
  // expires_date null = lifetime / non-expiring entitlement
  return ent.expires_date === null || new Date(ent.expires_date).getTime() > now;
}

/** Fetch the user's current plan from RevenueCat. */
export async function fetchPlanFromRevenueCat(
  appUserId: string
): Promise<{ plan: PlanTier; productId: string | null }> {
  const key = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!key) throw new RevenueCatNotConfiguredError();

  const res = await fetch(`${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`RevenueCat API ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const data = (await res.json()) as RcSubscriberResponse;
  const entitlements = data.subscriber?.entitlements ?? {};
  const now = Date.now();

  const max = entitlements['max'];
  if (max && isActive(max, now)) return { plan: 'MAX', productId: max.product_identifier };

  const pro = entitlements['pro'];
  if (pro && isActive(pro, now)) return { plan: 'PRO', productId: pro.product_identifier };

  return { plan: 'FREE', productId: null };
}

/**
 * Re-read a user's plan from RevenueCat and persist it.
 * Returns null if the user does not exist in our database.
 */
export async function refreshUserPlan(
  userId: string
): Promise<{ plan: PlanTier; subscription: string | null } | null> {
  const { plan, productId } = await fetchPlanFromRevenueCat(userId);
  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: { plan, subscription: productId },
  });
  if (result.count === 0) return null;
  return { plan, subscription: productId };
}
