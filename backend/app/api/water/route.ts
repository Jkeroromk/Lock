import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { isDayKey } from '@/lib/couple';

// PUT /api/water — { dayKey, ml, goalMl }: today's water from the phone, so a partner can see it.
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const dayKey = body?.dayKey;
    const ml = typeof body?.ml === 'number' ? Math.round(body.ml) : NaN;
    const goalMl = typeof body?.goalMl === 'number' ? Math.round(body.goalMl) : NaN;
    if (!isDayKey(dayKey)) return NextResponse.json({ error: 'INVALID_DAY' }, { status: 400 });
    // Only around today (any time zone): no back-filling the past.
    const now = Date.now();
    const t = Date.parse(`${dayKey}T12:00:00Z`);
    if (Math.abs(t - now) > 2 * 86_400_000) return NextResponse.json({ error: 'INVALID_DAY' }, { status: 400 });
    if (!Number.isFinite(ml) || ml < 0 || ml > 20000) return NextResponse.json({ error: 'INVALID_ML' }, { status: 400 });
    if (!Number.isFinite(goalMl) || goalMl < 500 || goalMl > 6000) return NextResponse.json({ error: 'INVALID_GOAL' }, { status: 400 });

    await prisma.dailyWater.upsert({
      where: { userId_dayKey: { userId, dayKey } },
      create: { userId, dayKey, ml, goalMl },
      update: { ml, goalMl },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PUT /api/water]', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
