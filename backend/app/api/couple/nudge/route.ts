import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { sendPushToUser } from '@/lib/notify';
import { pushName } from '@/lib/sanitize';

const KINDS = ['water', 'eat', 'train', 'love'] as const;
type Kind = (typeof KINDS)[number];
const COOLDOWN_MS = 10 * 60 * 1000;

const TEXT: Record<Kind, (name: string) => string> = {
  water: (n) => `💧 ${n} 提醒你喝水`,
  eat: (n) => `🍱 ${n} 提醒你吃饭，记得拍一下`,
  train: (n) => `💪 ${n} 戳你去训练`,
  love: (n) => `❤️ ${n} 送了你一颗心`,
};

// POST /api/couple/nudge — { kind }: a little push to my partner (once per kind per 10 min).
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = (await request.json().catch(() => null)) as { kind?: unknown } | null;
    const kind = body?.kind as Kind;
    if (!KINDS.includes(kind)) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });

    const link = await prisma.coupleLink.findFirst({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    if (!link) return NextResponse.json({ error: 'NOT_LINKED' }, { status: 403 });

    // Claim the slot only if the last one of this kind is old enough (atomic).
    const cutoff = new Date(Date.now() - COOLDOWN_MS);
    const claimed = await prisma.$executeRaw`
      INSERT INTO couple_nudges (sender_id, kind, sent_at) VALUES (${userId}, ${kind}, now())
      ON CONFLICT (sender_id, kind) DO UPDATE SET sent_at = now()
      WHERE couple_nudges.sent_at < ${cutoff}`;
    if (claimed === 0) return NextResponse.json({ error: 'TOO_SOON' }, { status: 429 });

    const partnerId = link.requesterId === userId ? link.addresseeId : link.requesterId;
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
    const fromName = pushName(me, '对方');
    await sendPushToUser(partnerId, '情侣空间', TEXT[kind](fromName), { type: 'COUPLE_NUDGE', kind, fromName })
      .catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/couple/nudge]', error);
    return NextResponse.json({ error: 'Failed to nudge' }, { status: 500 });
  }
}
