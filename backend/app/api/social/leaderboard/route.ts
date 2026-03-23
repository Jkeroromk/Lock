import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/leaderboard — friends leaderboard by today's calories
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // get all accepted friends
  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });

  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  // include self
  const allIds = [userId, ...friendIds];

  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true, name: true, username: true, streak: true },
  });

  const entries = await Promise.all(
    users.map(async (u) => {
      const agg = await prisma.meal.aggregate({
        where: { userId: u.id, createdAt: { gte: today, lt: tomorrow } },
        _sum: { calories: true },
      });
      return {
        id: u.id,
        name: u.name || u.username || '用户',
        username: u.username,
        avatar: (u.name || u.username || 'U').charAt(0).toUpperCase(),
        calories: Math.round(Number(agg._sum.calories || 0)),
        streak: u.streak,
        isMe: u.id === userId,
      };
    })
  );

  entries.sort((a, b) => b.calories - a.calories);
  entries.forEach((e, i) => { (e as any).rank = i + 1; });

  return NextResponse.json(entries);
}
