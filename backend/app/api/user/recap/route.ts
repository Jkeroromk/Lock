import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { PRO_TRIAL_DAYS } from '@/lib/plans';
import { localDayKey, safeTimeZone } from '@/lib/pet';

export const dynamic = 'force-dynamic';

/**
 * What the user did during their free Pro week, for the "your Pro week is over"
 * paywall: meals logged, meals logged from a photo, days with a meal, workouts.
 */
export async function GET() {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, timeZone: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const from = user.createdAt;
    const to = new Date(from.getTime() + PRO_TRIAL_DAYS * 864e5);
    const window = { userId, createdAt: { gte: from, lt: to } };
    const [meals, photoMeals, workouts] = await Promise.all([
      // imageUrl can be a large data URI, so it is only counted, never selected.
      prisma.meal.findMany({ where: window, select: { createdAt: true } }),
      prisma.meal.count({ where: { ...window, imageUrl: { not: null } } }),
      prisma.workoutSession.count({ where: { userId, startedAt: { gte: from, lt: to } } }),
    ]);
    const tz = safeTimeZone(user.timeZone);
    const days = new Set(meals.map((m) => localDayKey(m.createdAt, tz)));

    return NextResponse.json({
      meals: meals.length,
      photoMeals,
      daysLogged: days.size,
      workouts,
      trialEndsAt: to.toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/user/recap]', error);
    return NextResponse.json({ error: 'Failed to load recap' }, { status: 500 });
  }
}
