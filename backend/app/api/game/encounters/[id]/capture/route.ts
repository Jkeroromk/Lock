import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { captureEncounter } from '@/lib/game/game';

// POST /api/game/encounters/:id/capture — lock it in (always succeeds for a waiting encounter)
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await captureEncounter(auth.userId, params.id);
    if (!result) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[game/capture]', error);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
