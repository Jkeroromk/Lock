import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { sendPushToUser } from '@/lib/notify';

// POST /api/social/challenges/[id]/join
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const challenge = await prisma.challenge.findUnique({ where: { id: params.id } });
  if (!challenge || challenge.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Challenge not found or ended' }, { status: 404 });
  }

  const existing = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId: params.id, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Already joined this challenge' }, { status: 400 });
  }

  const participant = await prisma.challengeParticipant.create({
    data: { challengeId: params.id, userId, progress: 0 },
  });

  await prisma.activityFeed.create({
    data: { userId, type: 'CHALLENGE_JOINED', metadata: { challengeId: params.id, title: challenge.title } },
  });

  // 通知挑战创建者（自己创建自己加入时跳过）
  if (challenge.creatorId !== userId) {
    const joinerName = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    });
    const displayName = joinerName?.name || joinerName?.username || '有人';
    sendPushToUser(challenge.creatorId, '有人加入了你的挑战 🏆', `${displayName} 加入了「${challenge.title}」`, { type: 'CHALLENGE_JOINED', challengeId: params.id })
      .catch(() => {});
  }

  return NextResponse.json(participant, { status: 201 });
}
