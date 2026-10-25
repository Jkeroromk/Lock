import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { trustedTimeZone } from '@/lib/timezone';
import {
  GRADUATE_XP, cleanName, daysBetween, isBuddyKind, lifetimeXp, localDayKey, petState,
} from '@/lib/pet';

// POST /api/pet/graduate — a grown-up buddy joins the collection and a new one
// starts from zero. Body: { nextKind, nextName }
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const tz = await trustedTimeZone(userId, request);

  const body = await request.json().catch(() => null);
  const nextName = cleanName(body?.nextName);
  const nextKind = body?.nextKind;
  if (!nextName || !isBuddyKind(nextKind)) {
    return NextResponse.json({ error: 'Invalid buddy' }, { status: 400 });
  }

  try {
    const profile = await prisma.petProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: 'No pet' }, { status: 404 });

    const total = (await lifetimeXp([userId])).get(userId) ?? 0;
    if (total - profile.xpOffset < GRADUATE_XP) {
      return NextResponse.json({ error: 'Not grown up yet' }, { status: 400 });
    }

    const today = localDayKey(new Date(), tz);
    const days = daysBetween(localDayKey(profile.buddyStartedAt, tz), today) + 1;
    // Only graduate if nobody else did in the meantime (double tap, two devices).
    await prisma.$transaction(async (tx) => {
      const moved = await tx.petProfile.updateMany({
        where: { userId, xpOffset: profile.xpOffset },
        data: { buddyKind: nextKind, buddyName: nextName, xpOffset: total, buddyStartedAt: new Date() },
      });
      if (moved.count === 0) throw new Error('graduate race');
      await tx.petCollection.create({
        data: { userId, kind: profile.buddyKind, name: profile.buddyName, days },
      });
    });

    return NextResponse.json(await petState(userId, tz));
  } catch (error) {
    console.error('[POST /api/pet/graduate]', error);
    return NextResponse.json({ error: 'Failed to graduate' }, { status: 500 });
  }
}
