import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/friends/requests — incoming pending requests
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const requests = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: 'PENDING' },
    include: {
      requester: { select: { id: true, name: true, username: true, avatarEmoji: true, avatarImage: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    requests.map((r) => ({
      id: r.id,
      from: {
        id: r.requester.id,
        name: r.requester.name || r.requester.username || '用户',
        username: r.requester.username,
        avatar: r.requester.avatarEmoji || (r.requester.name || r.requester.username || 'U').charAt(0).toUpperCase(),
        avatarImage: r.requester.avatarImage || null,
      },
      createdAt: r.createdAt,
    }))
  );
}
