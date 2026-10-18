import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/workouts — the training tab's data: the weekly plan and the
// workouts of the last five weeks (enough for this week's strip and stats).
export async function GET(_request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const since = new Date(Date.now() - 35 * 86400_000);
    const [plan, sessions] = await Promise.all([
      prisma.workoutPlan.findUnique({ where: { userId }, select: { days: true } }),
      prisma.workoutSession.findMany({
        where: { userId, finishedAt: { gte: since } },
        orderBy: { finishedAt: 'desc' },
        take: 80,
        select: {
          id: true, dayKey: true, planDay: true, title: true, startedAt: true, finishedAt: true,
          durationSec: true, volume: true, setCount: true, prCount: true,
        },
      }),
    ]);
    return NextResponse.json({
      plan: plan?.days ?? {},
      sessions: sessions.map((s) => ({ ...s, volume: Number(s.volume) })),
    });
  } catch (error) {
    console.error('[GET /api/workouts]', error);
    return NextResponse.json({ error: 'Failed to load workouts' }, { status: 500 });
  }
}
