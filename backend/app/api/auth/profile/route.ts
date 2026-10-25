import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getUniqueFriendCode, getUniqueInviteCode } from '@/lib/invite-code';

export const dynamic = 'force-dynamic';

// GET /api/auth/profile — get or create the user record for the current Clerk user
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    // isAdmin lets the app show "unlimited" instead of the free scan counter.
    const admin = isAdmin(userId);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (existing) {
      // Older rows may lack an invite code or Friend ID: give them one.
      if (!existing.inviteCode || !existing.friendCode) {
        try {
          const withCode = await prisma.user.update({
            where: { id: userId },
            data: {
              ...(existing.inviteCode ? {} : { inviteCode: await getUniqueInviteCode() }),
              ...(existing.friendCode ? {} : { friendCode: await getUniqueFriendCode() }),
            },
          });
          return NextResponse.json({ ...withCode, isAdmin: admin });
        } catch {
          // A rare code collision: the next profile fetch tries again.
        }
      }
      return NextResponse.json({ ...existing, isAdmin: admin });
    }

    const user = await prisma.user.create({
      data: { id: userId, inviteCode: await getUniqueInviteCode(), friendCode: await getUniqueFriendCode() },
    });
    return NextResponse.json({ ...user, isAdmin: admin });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) return NextResponse.json({ ...user, isAdmin: isAdmin(userId) });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Keeps only the known goal-setting fields, with sane ranges. */
function cleanGoalSettings(input: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (!input || typeof input !== 'object') return Prisma.DbNull;
  const s = input as Record<string, unknown>;
  const n = (v: unknown, min: number, max: number, fallback: number) => {
    const x = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
  };
  const updatedAt = typeof s.updatedAt === 'string' && !isNaN(Date.parse(s.updatedAt)) ? s.updatedAt : new Date().toISOString();
  return {
    v: 1,
    calorieMode: s.calorieMode === 'custom' ? 'custom' : 'auto',
    calories: Math.round(n(s.calories, 0, 6000, 0)),
    pace: Math.round(n(s.pace, -1, 1, 0) * 100) / 100,
    trainingBonus: s.trainingBonus !== false,
    stepMode: s.stepMode === 'adaptive' ? 'adaptive' : 'fixed',
    steps: Math.round(n(s.steps, 1000, 50000, 8000)),
    updatedAt,
  };
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
      exerciseFrequency, expectedTimeframe, hasCompletedOnboarding, goalSettings,
    } = body;

    const data = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(avatarEmoji !== undefined && { avatarEmoji: typeof avatarEmoji === 'string' ? avatarEmoji.slice(0, 16) || null : null }),
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
      ...(goalSettings !== undefined && { goalSettings: cleanGoalSettings(goalSettings) }),
    };

    const user = await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, showGender: false, hasCompletedOnboarding: false, ...data },
      update: data,
    });

    return NextResponse.json({ ...user, isAdmin: isAdmin(userId) });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '用户名已被占用，请选择其他用户名' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
