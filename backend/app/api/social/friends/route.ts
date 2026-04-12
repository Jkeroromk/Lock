import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getMaxFriends } from '@/lib/plans';
import { sendPushToUser } from '@/lib/notify';

// GET /api/social/friends — list accepted friends
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
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

    // 一次性聚合所有好友今日卡路里，避免 N+1 查询
    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );

    const calorieSums = await prisma.meal.groupBy({
      by: ['userId'],
      where: { userId: { in: friendIds }, createdAt: { gte: today, lt: tomorrow } },
      _sum: { calories: true },
    });

    const calorieMap = new Map(
      calorieSums.map((c) => [c.userId, Math.round(Number(c._sum.calories || 0))])
    );

    const friends = friendships.map((f) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      return {
        friendshipId: f.id,
        id: friend.id,
        name: friend.name || friend.username || '用户',
        username: friend.username,
        avatar: (friend.name || friend.username || 'U').charAt(0).toUpperCase(),
        calories: calorieMap.get(friend.id) ?? 0,
        streak: friend.streak,
      };
    });

    // sort by today's calories desc
    friends.sort((a, b) => b.calories - a.calories);
    friends.forEach((f, i) => { (f as any).rank = i + 1; });

    return NextResponse.json(friends);
  } catch (error: any) {
    console.error('Get friends error:', error);
    return NextResponse.json({ error: '获取好友列表失败' }, { status: 500 });
  }
}

// POST /api/social/friends — send friend request by username or invite code
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
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

    // 检查发送方的好友上限
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    const maxFriends = getMaxFriends((sender?.plan ?? 'FREE') as any);
    if (maxFriends !== -1) {
      const friendCount = await prisma.friendship.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
      });
      if (friendCount >= maxFriends) {
        return NextResponse.json(
          {
            error: 'FRIEND_LIMIT_REACHED',
            message: `免费版最多添加 ${maxFriends} 位好友，升级 Pro 即可无限添加`,
            limit: maxFriends,
          },
          { status: 403 }
        );
      }
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

    // 通知被请求方
    const senderName = (await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    }));
    const displayName = senderName?.name || senderName?.username || '有人';
    sendPushToUser(target.id, '新好友请求 👋', `${displayName} 想添加你为好友`, { type: 'FRIEND_REQUEST' })
      .catch(() => {});

    return NextResponse.json(friendship, { status: 201 });
  } catch (error: any) {
    console.error('Add friend error:', error);
    return NextResponse.json({ error: '发送好友请求失败' }, { status: 500 });
  }
}
