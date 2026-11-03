import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { cleanText } from '@/lib/sanitize';
import { isDayKey, keyOf } from '@/lib/couple';

// POST /api/couple/anniversaries — { title, date: 'YYYY-MM-DD', yearly, emoji }
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const title = cleanText(body?.title, 20);
    const date = body?.date;
    const yearly = body?.yearly === true;
    const emoji = cleanText(body?.emoji, 8) ?? '💕';
    if (!title) return NextResponse.json({ error: 'INVALID_TITLE' }, { status: 400 });
    if (!isDayKey(date) || date < '1900-01-01' || date > '2200-12-31') return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });

    const link = await prisma.coupleLink.findFirst({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { id: true },
    });
    if (!link) return NextResponse.json({ error: 'NOT_LINKED' }, { status: 403 });
    const count = await prisma.coupleAnniversary.count({ where: { coupleId: link.id } });
    if (count >= 50) return NextResponse.json({ error: 'TOO_MANY' }, { status: 400 });

    const a = await prisma.coupleAnniversary.create({
      data: { coupleId: link.id, title, date: new Date(`${date}T00:00:00Z`), yearly, emoji, createdBy: userId },
    });
    return NextResponse.json({ id: a.id, title: a.title, date: keyOf(a.date), yearly: a.yearly, emoji: a.emoji }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/couple/anniversaries]', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
