import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  while (await prisma.user.findUnique({ where: { inviteCode: code } })) {
    code = generateInviteCode();
  }
  return code;
}

// GET /api/auth/profile — get or create the user record for the current Clerk user
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (existing) return NextResponse.json(existing);

    const inviteCode = await getUniqueInviteCode();
    const user = await prisma.user.create({ data: { id: userId, inviteCode } });
    return NextResponse.json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) return NextResponse.json(user);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/auth/profile — update profile fields
export async function PUT(request: NextRequest) {
  const authResult = await authenticateRequest();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const {
      name, email, username, bio, avatarEmoji, avatarImage, showGender,
      height, age, weight, gender, goal,
      exerciseFrequency, expectedTimeframe, hasCompletedOnboarding,
    } = body;

    const data = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(avatarEmoji !== undefined && { avatarEmoji }),
      ...(avatarImage !== undefined && { avatarImage }),
      ...(showGender !== undefined && { showGender }),
      ...(height !== undefined && { height }),
      ...(age !== undefined && { age }),
      ...(weight !== undefined && { weight }),
      ...(gender !== undefined && { gender }),
      ...(goal !== undefined && { goal }),
      ...(exerciseFrequency !== undefined && { exerciseFrequency }),
      ...(expectedTimeframe !== undefined && { expectedTimeframe }),
      ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding }),
    };

    const user = await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, showGender: false, hasCompletedOnboarding: false, ...data },
      update: data,
    });

    return NextResponse.json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '用户名已被占用，请选择其他用户名' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
