import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

type LeaderboardEntry = {
  id: string;
  name: string;
  username: string | null;
  avatar: string;
  avatarImage: string | null;
  calories: number;
  streak: number;
  isMe: boolean;
  friendshipId: string | undefined;
  rank: number;
};

// GET /api/social/leaderboard — friends leaderboard by today's calories
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const friendships = await prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );
    const friendshipMap = new Map(
      friendships.map((f) => [
        f.requesterId === userId ? f.addresseeId : f.requesterId,
        f.id,
      ])
    );
    const allIds = [userId, ...friendIds];

    const [users, calorieSums] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true, name: true, username: true, avatarEmoji: true, avatarImage: true, streak: true },
      }),
      prisma.meal.groupBy({
        by: ['userId'],
        where: { userId: { in: allIds }, createdAt: { gte: today, lt: tomorrow } },
        _sum: { calories: true },
      }),
    ]);

    const calorieMap = new Map(
      calorieSums.map((c) => [c.userId, Math.round(Number(c._sum.calories || 0))])
    );

    const entries: LeaderboardEntry[] = users.map((u) => ({
      id: u.id,
      name: u.name || u.username || '用户',
      username: u.username,
      avatar: u.avatarEmoji || (u.name || u.username || 'U').charAt(0).toUpperCase(),
      avatarImage: u.avatarImage || null,
      calories: calorieMap.get(u.id) ?? 0,
      streak: u.streak,
      isMe: u.id === userId,
      friendshipId: friendshipMap.get(u.id),
      rank: 0,
    }));

    entries.sort((a, b) => b.calories - a.calories);
    entries.forEach((e, i) => { e.rank = i + 1; });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('[GET /api/social/leaderboard]', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
