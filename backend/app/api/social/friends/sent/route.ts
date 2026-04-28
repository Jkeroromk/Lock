import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/social/friends/sent — outgoing pending requests
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const sent = await prisma.friendship.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      include: {
        addressee: { select: { id: true, name: true, username: true, avatarEmoji: true, avatarImage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      sent.map((r) => ({
        id: r.id,
        to: {
          id: r.addressee.id,
          name: r.addressee.name || r.addressee.username || '用户',
          username: r.addressee.username,
          avatar: r.addressee.avatarEmoji || (r.addressee.name || r.addressee.username || 'U').charAt(0).toUpperCase(),
          avatarImage: r.addressee.avatarImage || null,
        },
        createdAt: r.createdAt,
      }))
    );
  } catch (error) {
    console.error('[GET /api/social/friends/sent]', error);
    return NextResponse.json({ error: 'Failed to fetch sent requests' }, { status: 500 });
  }
}
