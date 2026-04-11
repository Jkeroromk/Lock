import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/challenges/[id] — get single challenge with all participants
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { name: true, username: true } },
      participants: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { progress: 'desc' },
      },
    },
  });

  if (!challenge) {
    return NextResponse.json({ error: '挑战不存在' }, { status: 404 });
  }

  return NextResponse.json({
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    type: challenge.type,
    goalValue: challenge.goalValue,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    status: challenge.status,
    creatorName: challenge.creator.name || challenge.creator.username || '用户',
    participants: challenge.participants.map((p) => ({
      userId: p.userId,
      name: p.user.name || p.user.username || '用户',
      progress: p.progress,
      joinedAt: p.joinedAt,
    })),
  });
}
