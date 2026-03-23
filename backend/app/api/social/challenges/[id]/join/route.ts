import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// POST /api/social/challenges/[id]/join
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const challenge = await prisma.challenge.findUnique({ where: { id: params.id } });
  if (!challenge || challenge.status !== 'ACTIVE') {
    return NextResponse.json({ error: '挑战不存在或已结束' }, { status: 404 });
  }

  const existing = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId: params.id, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: '已加入该挑战' }, { status: 400 });
  }

  const participant = await prisma.challengeParticipant.create({
    data: { challengeId: params.id, userId, progress: 0 },
  });

  await prisma.activityFeed.create({
    data: { userId, type: 'CHALLENGE_JOINED', metadata: { challengeId: params.id, title: challenge.title } },
  });

  return NextResponse.json(participant, { status: 201 });
}
