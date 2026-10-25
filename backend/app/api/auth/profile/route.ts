import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getUniqueFriendCode, getUniqueInviteCode } from '@/lib/invite-code';
import { USERNAME_RE, cleanMultiline, cleanText, isReservedUsername } from '@/lib/sanitize';

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
    console.error('[GET /api/auth/profile]', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
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

/** A number within [min, max] (rounded to `decimals`), null to clear, undefined to ignore. */
function numberField(v: unknown, min: number, max: number, decimals = 0): number | null | undefined {
  if (v === null) return null;
  const x = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(x) || x < min || x > max) return undefined;
  const f = 10 ** decimals;
  return Math.round(x * f) / f;
}

/** Profile photo: a small inline JPEG/PNG/WebP (the app sends a 256px JPEG data URI). */
const AVATAR_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const MAX_AVATAR_LENGTH = 200_000;

const USERNAME_TAKEN = '用户名已被占用，请选择其他用户名';

// PUT /api/auth/profile — update profile fields.
// Every field is checked here: other people see name, username, bio and avatar
// (search, friend requests, leaderboard) and names go into push notifications.
// email is not editable here; it comes from Clerk.
export async function PUT(request: NextRequest) {
  const authResult = await authenticateRequest();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const {
      name, username, bio, avatarEmoji, avatarImage, showGender,
      height, age, weight, gender, goal,
      exerciseFrequency, expectedTimeframe, hasCompletedOnboarding, goalSettings,
    } = body as Record<string, unknown>;

    let cleanUsername: string | null | undefined;
    if (username !== undefined) {
      if (username === null || username === '') {
        cleanUsername = null;
      } else {
        cleanUsername = typeof username === 'string' ? username.trim().replace(/^@/, '').toLowerCase() : '';
        if (!USERNAME_RE.test(cleanUsername)) {
          return NextResponse.json({ error: 'INVALID_USERNAME', message: 'Use 1–30 letters, numbers or _' }, { status: 400 });
        }
        if (isReservedUsername(cleanUsername) && !isAdmin(userId)) {
          // Someone who already has the name (from before this rule) keeps it.
          const current = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
          if (current?.username?.toLowerCase() !== cleanUsername) {
            return NextResponse.json({ error: USERNAME_TAKEN }, { status: 409 });
          }
        }
      }
    }

    let cleanAvatar: string | null | undefined;
    if (avatarImage !== undefined) {
      if (avatarImage === null || avatarImage === '') {
        cleanAvatar = null;
      } else if (typeof avatarImage === 'string' && avatarImage.length <= MAX_AVATAR_LENGTH && AVATAR_RE.test(avatarImage)) {
        cleanAvatar = avatarImage;
      } else {
        return NextResponse.json({ error: 'INVALID_AVATAR', message: 'Profile photo must be a small JPEG, PNG or WebP' }, { status: 400 });
      }
    }

    const shortText = (v: unknown) => cleanText(v, 40);
    const h = height !== undefined ? numberField(height, 50, 300) : undefined;
    const a = age !== undefined ? numberField(age, 5, 120) : undefined;
    const w = weight !== undefined ? numberField(weight, 20, 500, 2) : undefined;

    const data = {
      ...(name !== undefined && { name: cleanText(name, 30) }),
      ...(cleanUsername !== undefined && { username: cleanUsername }),
      ...(bio !== undefined && { bio: cleanMultiline(bio, 150) }),
      ...(avatarEmoji !== undefined && { avatarEmoji: cleanText(avatarEmoji, 16) }),
      ...(cleanAvatar !== undefined && { avatarImage: cleanAvatar }),
      ...(typeof showGender === 'boolean' && { showGender }),
      ...(h !== undefined && { height: h }),
      ...(a !== undefined && { age: a }),
      ...(w !== undefined && { weight: w }),
      ...(gender !== undefined && { gender: shortText(gender) }),
      ...(goal !== undefined && { goal: shortText(goal) }),
      ...(exerciseFrequency !== undefined && { exerciseFrequency: shortText(exerciseFrequency) }),
      ...(expectedTimeframe !== undefined && { expectedTimeframe: shortText(expectedTimeframe) }),
      ...(typeof hasCompletedOnboarding === 'boolean' && { hasCompletedOnboarding }),
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
      return NextResponse.json({ error: USERNAME_TAKEN }, { status: 409 });
    }
    console.error('[PUT /api/auth/profile]', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
