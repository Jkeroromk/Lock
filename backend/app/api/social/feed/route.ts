import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/feed — activity feed from friends + self
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });

  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  const feedItems = await prisma.activityFeed.findMany({
    where: { userId: { in: [userId, ...friendIds] } },
    include: { user: { select: { id: true, name: true, username: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(
    feedItems.map((item) => ({
      id: item.id,
      type: item.type,
      metadata: item.metadata,
      createdAt: item.createdAt,
      isMe: item.userId === userId,
      user: {
        id: item.user.id,
        name: item.user.name || item.user.username || '用户',
        avatar: (item.user.name || item.user.username || 'U').charAt(0).toUpperCase(),
      },
    }))
  );
}
