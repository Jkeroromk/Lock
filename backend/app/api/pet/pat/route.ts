import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { requestTimeZone } from '@/lib/ai-rate-limit';
import { isBlockedEitherWay } from '@/lib/blocks';
import { sendPushToUser } from '@/lib/notify';
import { MAX_PATS_RECEIVED, XP, localDayKey, safeTimeZone } from '@/lib/pet';

// POST /api/pet/pat — pat a friend's buddy (+2), once per friend per day.
// Body: { friendId }
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const tz = safeTimeZone(requestTimeZone(request));

  const body = await request.json().catch(() => null);
  const friendId = typeof body?.friendId === 'string' ? body.friendId : null;
  if (!friendId || friendId === userId) {
    return NextResponse.json({ error: 'Invalid friend' }, { status: 400 });
  }

  try {
    const [friendship, blocked, pet] = await Promise.all([
      prisma.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: userId, addresseeId: friendId },
            { requesterId: friendId, addresseeId: userId },
          ],
        },
        select: { id: true },
      }),
      isBlockedEitherWay(userId, friendId),
      prisma.petProfile.findUnique({ where: { userId: friendId }, select: { buddyName: true } }),
    ]);
    if (!friendship || blocked) return NextResponse.json({ error: 'Not friends' }, { status: 403 });
    if (!pet) return NextResponse.json({ error: 'No pet', code: 'NO_PET' }, { status: 404 });

    const dayKey = localDayKey(new Date(), tz);
    const received = await prisma.petPat.count({ where: { toUser: friendId, dayKey } });
    if (received >= MAX_PATS_RECEIVED) {
      return NextResponse.json({ error: 'Too many pats today', code: 'FULL' }, { status: 429 });
    }

    const created = await prisma.petPat.createMany({
      data: [{ fromUser: userId, toUser: friendId, dayKey }],
      skipDuplicates: true,
    });
    if (created.count === 0) {
      return NextResponse.json({ error: 'Already patted today', code: 'ALREADY' }, { status: 409 });
    }

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
    const who = me?.name || me?.username || '好友';
    await sendPushToUser(friendId, `${pet.buddyName} 被摸了摸 🐾`, `${who} 摸了摸你的 ${pet.buddyName}，成长值 +${XP.pat}`, {
      type: 'PET_PAT',
    }).catch(() => {});

    return NextResponse.json({ ok: true, xp: XP.pat, buddyName: pet.buddyName });
  } catch (error) {
    console.error('[POST /api/pet/pat]', error);
    return NextResponse.json({ error: 'Failed to pat' }, { status: 500 });
  }
}
