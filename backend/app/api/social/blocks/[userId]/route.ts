import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// DELETE /api/social/blocks/[userId] — unblock a user I blocked.
// The old friendship is not restored; they would need to re-add each other.
export async function DELETE(_request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    await prisma.userBlock.deleteMany({ where: { blockerId: userId, blockedId: params.userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/social/blocks/[userId]]', error);
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}
