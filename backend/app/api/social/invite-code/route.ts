import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/social/invite-code — get or generate invite code
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    let user = await prisma.user.findUnique({ where: { id: userId }, select: { inviteCode: true } });

    if (!user?.inviteCode) {
      let code = generateCode();
      while (await prisma.user.findUnique({ where: { inviteCode: code } })) {
        code = generateCode();
      }
      user = await prisma.user.upsert({
        where: { id: userId },
        update: { inviteCode: code },
        create: { id: userId, inviteCode: code },
        select: { inviteCode: true },
      });
    }

    return NextResponse.json({ inviteCode: user!.inviteCode });
  } catch (error) {
    console.error('[GET /api/social/invite-code]', error);
    return NextResponse.json({ error: 'Failed to get invite code' }, { status: 500 });
  }
}
