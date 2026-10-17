import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { requestTimeZone } from '@/lib/ai-rate-limit';
import { createWaterEncounter } from '@/lib/game/game';

// POST /api/game/water — the app reached today's water goal: one water-type encounter per day
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ encounter: await createWaterEncounter(auth.userId, requestTimeZone(request)) });
  } catch (error) {
    console.error('[game/water]', error);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
