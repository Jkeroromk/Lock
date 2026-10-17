import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { markMilestonesSeen } from '@/lib/game/game';

// POST /api/game/milestones/seen { count } — the unlock celebrations up to `count` were shown
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    await markMilestonesSeen(auth.userId, Number(body?.count) || 0);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[game/milestones/seen]', error);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
