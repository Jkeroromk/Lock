import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { requestTimeZone } from '@/lib/ai-rate-limit';
import { petState, safeTimeZone, syncPetDays } from '@/lib/pet';

// POST /api/pet/sync — recount the last few days, then return the pet.
// Body: { steps?: number (today, from Health), proteinBase?: number }
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const tz = safeTimeZone(requestTimeZone(request));
  const body = await request.json().catch(() => ({}));

  try {
    const profile = await prisma.petProfile.findUnique({ where: { userId }, select: { startDay: true } });
    if (profile) {
      await syncPetDays(userId, tz, profile.startDay, {
        todaySteps: typeof body?.steps === 'number' ? body.steps : null,
        proteinBase: typeof body?.proteinBase === 'number' ? body.proteinBase : null,
      });
    }
    return NextResponse.json(await petState(userId, tz));
  } catch (error) {
    console.error('[POST /api/pet/sync]', error);
    return NextResponse.json({ error: 'Failed to sync pet' }, { status: 500 });
  }
}
