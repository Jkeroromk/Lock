import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { EXERCISE_ID } from '@/lib/workouts';
import { bestSets, lastSets } from '@/lib/workout-history';

// GET /api/workouts/history?ids=a,b — per exercise: the sets done last time
// (the "上次" column) and the best set ever (for live PR detection).
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const ids = [...new Set((request.nextUrl.searchParams.get('ids') ?? '').split(','))]
    .filter((id) => EXERCISE_ID.test(id))
    .slice(0, 40);

  try {
    const [last, best] = await Promise.all([lastSets(userId, ids), bestSets(userId, ids)]);
    return NextResponse.json({ last, best });
  } catch (error) {
    console.error('[GET /api/workouts/history]', error);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
