import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/auth/profile — get or create the user record for the current Clerk user
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const user = await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/auth/profile — update profile fields
export async function PUT(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const {
      name, email, username, bio, avatarEmoji,
      height, age, weight, gender, goal,
      exerciseFrequency, expectedTimeframe, hasCompletedOnboarding,
    } = body;

    const user = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        name,
        email,
        username,
        bio,
        avatarEmoji,
        height,
        age,
        weight,
        gender,
        goal,
        exerciseFrequency,
        expectedTimeframe,
        hasCompletedOnboarding: hasCompletedOnboarding ?? false,
      },
      update: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(avatarEmoji !== undefined && { avatarEmoji }),
        ...(height !== undefined && { height }),
        ...(age !== undefined && { age }),
        ...(weight !== undefined && { weight }),
        ...(gender !== undefined && { gender }),
        ...(goal !== undefined && { goal }),
        ...(exerciseFrequency !== undefined && { exerciseFrequency }),
        ...(expectedTimeframe !== undefined && { expectedTimeframe }),
        ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding }),
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
