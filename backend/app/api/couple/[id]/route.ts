import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { sendPushToUser } from '@/lib/notify';
import { pushName } from '@/lib/sanitize';

// PATCH /api/couple/[id] — the invited person accepts or declines: { action }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
    const action = body?.action;
    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const link = await prisma.coupleLink.findUnique({ where: { id: params.id } }).catch(() => null);
    if (!link || link.addresseeId !== userId || link.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (action === 'decline') {
      await prisma.coupleLink.delete({ where: { id: link.id } });
      return NextResponse.json({ ok: true });
    }

    // Either of us may have linked with someone else since the invite.
    const other = await prisma.coupleLink.findFirst({
      where: {
        id: { not: link.id },
        status: 'ACCEPTED',
        OR: [
          { requesterId: { in: [userId, link.requesterId] } },
          { addresseeId: { in: [userId, link.requesterId] } },
        ],
      },
      select: { id: true },
    });
    if (other) return NextResponse.json({ error: 'ALREADY_LINKED' }, { status: 409 });

    await prisma.coupleLink.update({ where: { id: link.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
    // Any other invites either of us still had open are void now.
    await prisma.coupleLink.deleteMany({
      where: {
        id: { not: link.id },
        status: 'PENDING',
        OR: [
          { requesterId: { in: [userId, link.requesterId] } },
          { addresseeId: { in: [userId, link.requesterId] } },
        ],
      },
    });

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
    const name = pushName(me, '对方');
    await sendPushToUser(link.requesterId, '情侣绑定成功 💕', `${name} 同意了，你们现在是情侣啦 💕`, { type: 'COUPLE_ACCEPTED', coupleId: link.id })
      .catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PATCH /api/couple/[id]]', error);
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 });
  }
}

// DELETE /api/couple/[id] — either person unlinks, or the sender cancels the invite.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const link = await prisma.coupleLink.findUnique({ where: { id: params.id } }).catch(() => null);
    if (!link || (link.requesterId !== userId && link.addresseeId !== userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.coupleLink.delete({ where: { id: link.id } });

    if (link.status === 'ACCEPTED') {
      const other = link.requesterId === userId ? link.addresseeId : link.requesterId;
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
      await sendPushToUser(other, '情侣空间', `${pushName(me, '对方')} 解除了情侣绑定`, { type: 'COUPLE_ENDED' })
        .catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/couple/[id]]', error);
    return NextResponse.json({ error: 'Failed to unlink' }, { status: 500 });
  }
}
