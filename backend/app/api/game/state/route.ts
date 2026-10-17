import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { requestTimeZone } from '@/lib/ai-rate-limit';
import { gameState } from '@/lib/game/game';

export const dynamic = 'force-dynamic';

// GET /api/game/state — partner, egg, today's encounters, waiting encounters and dex
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json(await gameState(auth.userId, requestTimeZone(request)));
  } catch (error) {
    console.error('[game/state]', error);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
