import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/challenges — active challenges the user is in
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const participations = await prisma.challengeParticipant.findMany({
    where: { userId },
    include: {
      challenge: {
        include: {
          creator: { select: { name: true, username: true } },
          participants: { include: { user: { select: { name: true, username: true } } } },
        },
      },
    },
  });

  const challenges = participations.map((p) => ({
    id: p.challenge.id,
    title: p.challenge.title,
    description: p.challenge.description,
    type: p.challenge.type,
    goalValue: p.challenge.goalValue,
    startDate: p.challenge.startDate,
    endDate: p.challenge.endDate,
    status: p.challenge.status,
    progress: p.progress,
    participants: p.challenge.participants.length,
    creatorName: p.challenge.creator.name || p.challenge.creator.username || '用户',
  }));

  return NextResponse.json(challenges);
}

// POST /api/social/challenges — create a challenge
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { title, description, type, goalValue, startDate, endDate } = await request.json();

  if (!title || !goalValue || !startDate || !endDate) {
    return NextResponse.json({ error: 'Challenge details required' }, { status: 400 });
  }

  const challenge = await prisma.challenge.create({
    data: {
      creatorId: userId,
      title,
      description,
      type: type || 'CALORIES',
      goalValue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      participants: { create: { userId, progress: 0 } },
    },
  });

  await prisma.activityFeed.create({
    data: { userId, type: 'CHALLENGE_JOINED', metadata: { challengeId: challenge.id, title } },
  });

  return NextResponse.json(challenge, { status: 201 });
}
