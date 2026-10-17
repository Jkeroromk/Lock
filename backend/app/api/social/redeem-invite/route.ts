import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { isBlockedEitherWay } from '@/lib/blocks';
import { redeemReferral } from '@/lib/referral';

const STATUS = { INVALID_CODE: 404, SELF: 400, NOT_NEW: 403, ALREADY_REDEEMED: 409 } as const;

// POST /api/social/redeem-invite { code } — a new account enters a friend's invite code:
// both get bonus scans and they become friends.
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: 'INVALID_CODE' }, { status: 404 });

    const inviter = await prisma.user.findUnique({ where: { inviteCode: code }, select: { id: true } });
    if (!inviter || (inviter.id !== userId && (await isBlockedEitherWay(userId, inviter.id)))) {
      return NextResponse.json({ error: 'INVALID_CODE' }, { status: 404 });
    }

    const result = await redeemReferral(userId, inviter.id, { makeFriends: true });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: STATUS[result.error] });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[redeem-invite]', error);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
