import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { cleanText } from '@/lib/sanitize';

const CHALLENGE_TYPES = ['CALORIES', 'STREAK', 'STEPS'];
const MAX_CHALLENGE_DAYS = 366;

// GET /api/social/challenges — active challenges the user is in
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
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
  } catch (error) {
    console.error('[GET /api/social/challenges]', error);
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
  }
}

// POST /api/social/challenges — create a challenge
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => null);
  const title = cleanText(body?.title, 60);
  const description = cleanText(body?.description, 300);
  const type = CHALLENGE_TYPES.includes(body?.type) ? (body.type as string) : 'CALORIES';
  const goalValue = Number(body?.goalValue);
  const startDate = typeof body?.startDate === 'string' ? new Date(body.startDate) : null;
  const endDate = typeof body?.endDate === 'string' ? new Date(body.endDate) : null;

  if (!title || !Number.isInteger(goalValue) || !startDate || !endDate) {
    return NextResponse.json({ error: 'Challenge details required' }, { status: 400 });
  }
  if (goalValue < 1 || goalValue > 10_000_000) {
    return NextResponse.json({ error: 'Invalid goal' }, { status: 400 });
  }
  const span = endDate.getTime() - startDate.getTime();
  if (isNaN(span) || span < 0 || span > MAX_CHALLENGE_DAYS * 86_400_000) {
    return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
  }

  try {
    const challenge = await prisma.challenge.create({
      data: {
        creatorId: userId,
        title,
        description,
        type,
        goalValue,
        startDate,
        endDate,
        participants: { create: { userId, progress: 0 } },
      },
    });

    await prisma.activityFeed.create({
      data: { userId, type: 'CHALLENGE_JOINED', metadata: { challengeId: challenge.id, title } },
    });

    return NextResponse.json(challenge, { status: 201 });
  } catch (error) {
    console.error('[POST /api/social/challenges]', error);
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
  }
}
