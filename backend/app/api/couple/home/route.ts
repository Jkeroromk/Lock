import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { sendPushToUser } from '@/lib/notify';
import { pushName } from '@/lib/sanitize';
import { DEFAULTS, ITEMS, homeOf, isItem } from '@/lib/coupleHome';

const acceptedLinkOf = (userId: string) =>
  prisma.coupleLink.findFirst({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { id: true, requesterId: true, addresseeId: true, acceptedAt: true, createdAt: true, room: true },
  });

// GET /api/couple/home — the shared wallet and furniture.
export async function GET() {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    const link = await acceptedLinkOf(auth.userId);
    if (!link) return NextResponse.json({ error: 'NOT_LINKED' }, { status: 403 });
    return NextResponse.json({ home: await homeOf(link) });
  } catch (error) {
    console.error('[GET /api/couple/home]', error);
    return NextResponse.json({ error: 'Failed to load home' }, { status: 500 });
  }
}

/**
 * POST /api/couple/home — { action: 'buy' | 'equip', itemId }
 * buy: spend the shared points on a style (and put it in place); equip: show
 * a style already owned (or a slot's free default). Returns the new home.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = (await request.json().catch(() => null)) as { action?: unknown; itemId?: unknown } | null;
    const action = body?.action;
    const itemId = body?.itemId;
    if ((action !== 'buy' && action !== 'equip') || !isItem(itemId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const item = ITEMS[itemId];
    const isDefault = DEFAULTS[item.slot] === itemId;

    const link = await acceptedLinkOf(userId);
    if (!link) return NextResponse.json({ error: 'NOT_LINKED' }, { status: 403 });

    const result = await prisma.$transaction(async (tx) => {
      // one purchase at a time per couple, so two quick taps can't overspend
      await tx.$queryRaw`SELECT id FROM couple_links WHERE id = ${link.id}::uuid FOR UPDATE`;
      const fresh = await tx.coupleLink.findUniqueOrThrow({
        where: { id: link.id },
        select: { id: true, requesterId: true, addresseeId: true, acceptedAt: true, createdAt: true, room: true },
      });
      const home = await homeOf(fresh, tx);
      const owned = isDefault || home.owned.includes(itemId);

      if (action === 'buy') {
        if (owned) return { error: 'ALREADY_OWNED' as const };
        if (home.balance < item.price) return { error: 'NOT_ENOUGH' as const };
        await tx.couplePurchase.create({ data: { coupleId: link.id, itemId, price: item.price, buyerId: userId } });
      } else if (!owned) {
        return { error: 'NOT_OWNED' as const };
      }
      await tx.coupleLink.update({ where: { id: link.id }, data: { room: { ...home.equipped, [item.slot]: itemId } } });
      const after = await tx.coupleLink.findUniqueOrThrow({
        where: { id: link.id },
        select: { id: true, requesterId: true, addresseeId: true, acceptedAt: true, createdAt: true, room: true },
      });
      return { home: await homeOf(after, tx) };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'NOT_ENOUGH' ? 402 : 409 });
    }

    if (action === 'buy') {
      const partnerId = link.requesterId === userId ? link.addresseeId : link.requesterId;
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
      const fromName = pushName(me, '对方');
      await sendPushToUser(partnerId, '情侣空间', `🛋️ ${fromName} 给小家添了「${item.name}」`, { type: 'COUPLE_HOME', itemId, fromName })
        .catch(() => {});
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/couple/home]', error);
    return NextResponse.json({ error: 'Failed to update home' }, { status: 500 });
  }
}
