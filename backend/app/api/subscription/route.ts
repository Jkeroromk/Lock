import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// POST /api/subscription — sync plan after RevenueCat purchase
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { plan } = await request.json();

  if (!['FREE', 'PRO', 'MAX'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan },
      select: { id: true, plan: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('[POST /api/subscription]', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

// GET /api/subscription — get current plan
export async function GET(request: NextRequest) {
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
