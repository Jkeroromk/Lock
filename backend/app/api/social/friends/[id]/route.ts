import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// PATCH /api/social/friends/[id] — accept or reject request
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { action } = await request.json(); // 'accept' | 'reject'

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || friendship.addresseeId !== userId) {
    return NextResponse.json({ error: '好友请求不存在' }, { status: 404 });
  }

  const updated = await prisma.friendship.update({
    where: { id: params.id },
    data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' },
  });

  if (action === 'accept') {
    await prisma.activityFeed.createMany({
      data: [
        { userId, type: 'FRIEND_ADDED', metadata: { friendId: friendship.requesterId } },
        { userId: friendship.requesterId, type: 'FRIEND_ADDED', metadata: { friendId: userId } },
      ],
    });
  }

  return NextResponse.json(updated);
}

// DELETE /api/social/friends/[id] — remove friend
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
    return NextResponse.json({ error: '好友关系不存在' }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
