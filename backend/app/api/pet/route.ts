import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { requestTimeZone } from '@/lib/ai-rate-limit';
import { petState, safeTimeZone } from '@/lib/pet';

// GET /api/pet — the user's coach, buddy, growth and collection
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    return NextResponse.json(await petState(userId, safeTimeZone(requestTimeZone(request))));
  } catch (error) {
    console.error('[GET /api/pet]', error);
    return NextResponse.json({ error: 'Failed to load pet' }, { status: 500 });
  }
}
