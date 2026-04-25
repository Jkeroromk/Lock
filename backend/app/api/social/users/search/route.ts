import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/users/search?q=username — preview a user before sending request
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ user: null });
  }

  const target = await prisma.user.findFirst({
    where: { OR: [{ username: q }, { inviteCode: q }] },
    select: { id: true, name: true, username: true, avatarEmoji: true, avatarImage: true, bio: true },
  });

  if (!target) return NextResponse.json({ user: null });
  if (target.id === userId) return NextResponse.json({ user: null, self: true });

  // Check existing friendship status
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
    select: { status: true, requesterId: true },
  });

  let relationStatus: 'none' | 'friends' | 'pending_sent' | 'pending_received' = 'none';
  if (existing) {
    if (existing.status === 'ACCEPTED') relationStatus = 'friends';
    else if (existing.status === 'PENDING') {
      relationStatus = existing.requesterId === userId ? 'pending_sent' : 'pending_received';
    }
  }

  return NextResponse.json({
    user: {
      id: target.id,
      name: target.name || target.username || '用户',
      username: target.username,
      avatarEmoji: target.avatarEmoji || '🏃',
      avatarImage: target.avatarImage || null,
      bio: target.bio,
    },
    relationStatus,
  });
}
