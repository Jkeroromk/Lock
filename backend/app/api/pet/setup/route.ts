import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { trustedTimeZone } from '@/lib/timezone';
import { cleanName, isBuddyKind, localDayKey, petState, syncPetDays } from '@/lib/pet';

// POST /api/pet/setup — name the coach, pick and name the first buddy.
// Body: { coachName, buddyKind, buddyName, steps?, proteinBase? }
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const tz = await trustedTimeZone(userId, request);

  const body = await request.json().catch(() => null);
  const coachName = cleanName(body?.coachName);
  const buddyName = cleanName(body?.buddyName);
  const buddyKind = body?.buddyKind;
  if (!coachName || !buddyName || !isBuddyKind(buddyKind)) {
    return NextResponse.json({ error: 'Invalid pet' }, { status: 400 });
  }

  try {
    await prisma.user.upsert({ where: { id: userId }, create: { id: userId }, update: {} });
    const existing = await prisma.petProfile.findUnique({ where: { userId } });
    if (existing) return NextResponse.json({ error: 'Pet already set up' }, { status: 409 });

    const startDay = localDayKey(new Date(), tz);
    await prisma.petProfile.create({ data: { userId, coachName, buddyKind, buddyName, startDay } });
    // Today counts from the start: whatever was already done today shows up.
    await syncPetDays(userId, tz, startDay, {
      todaySteps: typeof body?.steps === 'number' ? body.steps : null,
      proteinBase: typeof body?.proteinBase === 'number' ? body.proteinBase : null,
    });
    return NextResponse.json(await petState(userId, tz));
  } catch (error) {
    console.error('[POST /api/pet/setup]', error);
    return NextResponse.json({ error: 'Failed to set up pet' }, { status: 500 });
  }
}
