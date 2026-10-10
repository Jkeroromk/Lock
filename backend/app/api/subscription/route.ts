import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { refreshUserPlan, RevenueCatNotConfiguredError } from '@/lib/revenuecat';

export const dynamic = 'force-dynamic';

// POST /api/subscription — re-verify the caller's plan with RevenueCat.
// The request body is ignored: the plan is always derived server-side from
// RevenueCat entitlements, never from what the client claims.
export async function POST() {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const result = await refreshUserPlan(userId);
    if (!result) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ id: userId, ...result });
  } catch (error) {
    if (error instanceof RevenueCatNotConfiguredError) {
      console.error('[POST /api/subscription] RevenueCat secret key missing');
      return NextResponse.json({ error: 'Subscription verification unavailable' }, { status: 503 });
    }
    console.error('[POST /api/subscription]', error);
    return NextResponse.json({ error: 'Failed to verify subscription' }, { status: 502 });
  }
}

// GET /api/subscription — get current plan (as last verified)
export async function GET() {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscription: true },
    });
    return NextResponse.json(user ?? { plan: 'FREE', subscription: null });
  } catch (error) {
    console.error('[GET /api/subscription]', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
