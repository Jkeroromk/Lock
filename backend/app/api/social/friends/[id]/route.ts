import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { sendPushToUser } from '@/lib/notify';

// PATCH /api/social/friends/[id] — accept or reject request
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { action } = await request.json(); // 'accept' | 'reject'

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || friendship.addresseeId !== userId) {
    return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
  }

  const updated = await prisma.friendship.update({
    where: { id: params.id },
    data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' },
  });

  if (action === 'accept') {
    const [acceptor, requester] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
      prisma.user.findUnique({ where: { id: friendship.requesterId }, select: { name: true, username: true } }),
    ]);
    const acceptorDisplay = acceptor?.name || acceptor?.username || '对方';
    const requesterDisplay = requester?.name || requester?.username || '对方';

    await prisma.activityFeed.createMany({
      data: [
        { userId, type: 'FRIEND_ADDED', metadata: { friendId: friendship.requesterId, friendName: requesterDisplay } },
        { userId: friendship.requesterId, type: 'FRIEND_ADDED', metadata: { friendId: userId, friendName: acceptorDisplay } },
      ],
    });

    sendPushToUser(friendship.requesterId, '好友请求已通过 🎉', `${acceptorDisplay} 接受了你的好友请求`, { type: 'FRIEND_ACCEPTED' })
      .catch(() => {});
  }

  return NextResponse.json(updated);
}

// DELETE /api/social/friends/[id] — remove friend
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
    return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
