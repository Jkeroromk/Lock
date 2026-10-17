import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { requestTimeZone } from '@/lib/ai-rate-limit';
import { saveAvatar } from '@/lib/game/game';

// PUT /api/game/avatar { look, name } — save the player's avatar (locked items are dropped)
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await saveAvatar(auth.userId, body?.look, body?.name, requestTimeZone(request)));
  } catch (error) {
    console.error('[game/avatar]', error);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
