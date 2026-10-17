import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { markStageSeen } from '@/lib/game/game';

// POST /api/game/partner/seen { stage } — the evolution for this stage has been shown
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    await markStageSeen(auth.userId, Number(body?.stage) || 1);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[game/seen]', error);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
