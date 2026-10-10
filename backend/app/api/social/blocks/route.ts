import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/social/blocks — users I have blocked (for the unblock screen)
export async function GET() {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { select: { id: true, name: true, username: true, avatarEmoji: true, avatarImage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      blocks.map((b) => ({
        id: b.blocked.id,
        name: b.blocked.name || b.blocked.username || '用户',
        username: b.blocked.username,
        avatar: b.blocked.avatarEmoji || (b.blocked.name || b.blocked.username || 'U').charAt(0).toUpperCase(),
        avatarImage: b.blocked.avatarImage ?? null,
        blockedAt: b.createdAt,
      }))
    );
  } catch (error) {
    console.error('[GET /api/social/blocks]', error);
    return NextResponse.json({ error: 'Failed to fetch blocked users' }, { status: 500 });
  }
}

// POST /api/social/blocks { userId } — block a user.
// Also removes any friendship or pending request between the two users.
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  let targetId: unknown;
  try {
    ({ userId: targetId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof targetId !== 'string' || !targetId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  if (targetId === userId) {
    return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
        create: { blockerId: userId, blockedId: targetId },
        update: {},
      }),
      prisma.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: userId, addresseeId: targetId },
            { requesterId: targetId, addresseeId: userId },
          ],
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/social/blocks]', error);
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}
