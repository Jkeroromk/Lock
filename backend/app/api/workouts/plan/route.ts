import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { normalizePlan } from '@/lib/workouts';

// PUT /api/workouts/plan — replace the weekly plan. Body: { days }
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => null);
  const days = normalizePlan(body?.days);
  if (!days) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  try {
    await prisma.workoutPlan.upsert({
      where: { userId },
      create: { userId, days: days as any },
      update: { days: days as any },
    });
    return NextResponse.json({ plan: days });
  } catch (error) {
    console.error('[PUT /api/workouts/plan]', error);
    return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 });
  }
}
