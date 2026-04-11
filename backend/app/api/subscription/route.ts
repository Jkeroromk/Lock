import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// POST /api/subscription — sync plan after RevenueCat purchase
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { plan } = await request.json(); // 'FREE' | 'PRO' | 'ENTERPRISE'

  if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { plan },
    select: { id: true, plan: true },
  });

  return NextResponse.json(user);
}

// GET /api/subscription — get current plan
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscription: true },
  });

  return NextResponse.json(user ?? { plan: 'FREE', subscription: null });
}
