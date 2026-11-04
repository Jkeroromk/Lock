import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { isBlockedEitherWay } from '@/lib/blocks';
import { sendPushToUser } from '@/lib/notify';
import { pushName } from '@/lib/sanitize';
import { trustedTimeZone } from '@/lib/timezone';
import { localDayKey, safeTimeZone } from '@/lib/pet';
import { homeOf } from '@/lib/coupleHome';
import {
  PERSON_SELECT, activeLinkFor, anniversaryOrder, coupleStreak, dayFor, isDayKey, keyOf, toPerson,
} from '@/lib/couple';

// GET /api/couple — my couple: accepted, or an invite I sent / received.
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const link = await activeLinkFor(userId);
    if (!link) return NextResponse.json({ couple: null });

    const partnerId = link.requesterId === userId ? link.addresseeId : link.requesterId;
    const [meRow, partnerRow, myZone] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: PERSON_SELECT }),
      prisma.user.findUnique({ where: { id: partnerId }, select: PERSON_SELECT }),
      trustedTimeZone(userId, request),
    ]);
    if (!meRow || !partnerRow) return NextResponse.json({ couple: null });

    const since = keyOf(link.since);
    const todayKey = localDayKey(new Date(), myZone);
    type Day = Awaited<ReturnType<typeof dayFor>>;
    let today: { me: Day; partner: Day } | null = null;
    let streak = 0;
    let stored: { id: string; title: string; date: Date; yearly: boolean; emoji: string }[] = [];
    let home: Awaited<ReturnType<typeof homeOf>> | null = null;

    if (link.status === 'ACCEPTED') {
      const partnerZone = safeTimeZone(partnerRow.timeZone);
      const [me, partner, s, rows, h] = await Promise.all([
        dayFor(userId, myZone, meRow.goalSettings),
        dayFor(partnerId, partnerZone, partnerRow.goalSettings),
        coupleStreak(userId, myZone, partnerId, partnerZone, todayKey),
        prisma.coupleAnniversary.findMany({
          where: { coupleId: link.id },
          select: { id: true, title: true, date: true, yearly: true, emoji: true },
        }),
        homeOf(link),
      ]);
      today = { me, partner };
      streak = s;
      stored = rows;
      home = h;
    }

    const anniversaries = [
      { id: 'together', title: '在一起', date: since, yearly: false, emoji: '💕', builtIn: true },
      ...stored
        .map((a) => ({ id: a.id, title: a.title, date: keyOf(a.date), yearly: a.yearly, emoji: a.emoji }))
        .sort((x, y) => anniversaryOrder(x.date, x.yearly, todayKey) - anniversaryOrder(y.date, y.yearly, todayKey)),
    ];

    return NextResponse.json({
      couple: {
        id: link.id,
        status: link.status,
        iInvited: link.requesterId === userId,
        me: toPerson(meRow),
        partner: toPerson(partnerRow),
        since,
        petOwnerId: link.petOwnerId,
        streak,
        today,
        anniversaries,
        home,
      },
    });
  } catch (error) {
    console.error('[GET /api/couple]', error);
    return NextResponse.json({ error: 'Failed to load couple' }, { status: 500 });
  }
}

// POST /api/couple — invite a friend: { friendId, since: 'YYYY-MM-DD', petOwnerId }
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const friendId = typeof body?.friendId === 'string' ? body.friendId : '';
    const since = body?.since;
    const petOwnerId = typeof body?.petOwnerId === 'string' ? body.petOwnerId : userId;
    if (!friendId || friendId === userId) return NextResponse.json({ error: 'Invalid friend' }, { status: 400 });
    if (!isDayKey(since)) return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
    const tz = await trustedTimeZone(userId, request);
    if (since > localDayKey(new Date(), tz) || since < '1950-01-01') {
      return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
    }
    if (petOwnerId !== userId && petOwnerId !== friendId) {
      return NextResponse.json({ error: 'Invalid pet owner' }, { status: 400 });
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
      select: { id: true },
    });
    if (!friendship || (await isBlockedEitherWay(userId, friendId))) {
      return NextResponse.json({ error: 'NOT_FRIENDS' }, { status: 403 });
    }

    const [mine, theirs] = await Promise.all([activeLinkFor(userId), activeLinkFor(friendId)]);
    if (mine) return NextResponse.json({ error: 'ALREADY_LINKED' }, { status: 409 });
    if (theirs) return NextResponse.json({ error: 'PARTNER_LINKED' }, { status: 409 });

    const link = await prisma.coupleLink.create({
      data: { requesterId: userId, addresseeId: friendId, since: new Date(`${since}T00:00:00Z`), petOwnerId },
    });

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
    const fromName = pushName(me, '有人');
    await sendPushToUser(
      friendId, '情侣邀请 💕', `${fromName} 想和你绑定情侣`,
      { type: 'COUPLE_INVITE', coupleId: link.id, fromName },
      'couple_invite',
    ).catch(() => {});

    return NextResponse.json({ id: link.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/couple]', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
