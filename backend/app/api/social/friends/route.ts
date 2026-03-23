import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/friends — list accepted friends
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, username: true, streak: true } },
      addressee: { select: { id: true, name: true, username: true, streak: true } },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const friends = await Promise.all(
    friendships.map(async (f) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      const meals = await prisma.meal.aggregate({
        where: { userId: friend.id, createdAt: { gte: today, lt: tomorrow } },
        _sum: { calories: true },
      });
      return {
        friendshipId: f.id,
        id: friend.id,
        name: friend.name || friend.username || '用户',
        username: friend.username,
        avatar: (friend.name || friend.username || 'U').charAt(0).toUpperCase(),
        calories: Math.round(Number(meals._sum.calories || 0)),
        streak: friend.streak,
      };
    })
  );

  // sort by today's calories desc
  friends.sort((a, b) => b.calories - a.calories);
  friends.forEach((f, i) => { (f as any).rank = i + 1; });

  return NextResponse.json(friends);
}

// POST /api/social/friends — send friend request by username or invite code
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { identifier } = await request.json();
  if (!identifier) {
    return NextResponse.json({ error: '请提供用户名或邀请码' }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { inviteCode: identifier }] },
  });

  if (!target) {
    return NextResponse.json({ error: '未找到该用户' }, { status: 404 });
  }
  if (target.id === userId) {
    return NextResponse.json({ error: '不能添加自己为好友' }, { status: 400 });
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      return NextResponse.json({ error: '已经是好友了' }, { status: 400 });
    }
    if (existing.status === 'PENDING') {
      return NextResponse.json({ error: '已发送过好友请求' }, { status: 400 });
    }
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: userId, addresseeId: target.id, status: 'PENDING' },
  });

  return NextResponse.json(friendship, { status: 201 });
}
