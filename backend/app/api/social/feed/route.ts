import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/feed — activity feed from friends + self
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });

  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  const feedItems = await prisma.activityFeed.findMany({
    where: {
      OR: [
        { userId },
        { userId: { in: friendIds }, NOT: { type: 'FRIEND_ADDED' } },
      ],
    },
    include: { user: { select: { id: true, name: true, username: true, avatarEmoji: true, avatarImage: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Collect friendIds that need name lookup (old FRIEND_ADDED events missing friendName)
  const missingFriendIds = feedItems
    .filter((item) => {
      if (item.type !== 'FRIEND_ADDED') return false;
      const meta = item.metadata as Record<string, unknown> | null;
      return meta?.friendId && !meta?.friendName;
    })
    .map((item) => (item.metadata as Record<string, unknown>).friendId as string);

  const friendNameMap = new Map<string, string>();
  if (missingFriendIds.length > 0) {
    const friendUsers = await prisma.user.findMany({
      where: { id: { in: missingFriendIds } },
      select: { id: true, name: true, username: true },
    });
    for (const u of friendUsers) {
      friendNameMap.set(u.id, u.name || u.username || '对方');
    }
  }

  return NextResponse.json(
    feedItems.map((item) => {
      let metadata = item.metadata as Record<string, unknown> | null;
      if (item.type === 'FRIEND_ADDED' && metadata?.friendId && !metadata?.friendName) {
        metadata = { ...metadata, friendName: friendNameMap.get(metadata.friendId as string) ?? '对方' };
      }
      return {
        id: item.id,
        type: item.type,
        metadata,
        createdAt: item.createdAt,
        isMe: item.userId === userId,
        user: {
          id: item.user.id,
          name: item.user.name || item.user.username || '用户',
          avatar: item.user.avatarEmoji || (item.user.name || item.user.username || 'U').charAt(0).toUpperCase(),
          avatarImage: item.user.avatarImage ?? null,
        },
      };
    })
  );
}
