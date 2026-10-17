import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { hatchEgg } from '@/lib/game/game';

// POST /api/game/eggs/hatch — hatch the current egg once enough steps were walked
export async function POST() {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    const creature = await hatchEgg(auth.userId);
    if (!creature) return NextResponse.json({ error: 'NOT_READY' }, { status: 409 });
    return NextResponse.json({ creature });
  } catch (error) {
    console.error('[game/hatch]', error);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
