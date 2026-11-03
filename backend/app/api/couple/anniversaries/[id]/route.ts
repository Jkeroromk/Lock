import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// DELETE /api/couple/anniversaries/[id] — either of the two (the built-in "together" day isn't stored, so can't be deleted).
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    if (params.id === 'together') return NextResponse.json({ error: 'BUILT_IN' }, { status: 400 });
    const a = await prisma.coupleAnniversary.findUnique({
      where: { id: params.id },
      include: { couple: { select: { status: true, requesterId: true, addresseeId: true } } },
    }).catch(() => null);
    if (!a || a.couple.status !== 'ACCEPTED' || (a.couple.requesterId !== userId && a.couple.addresseeId !== userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.coupleAnniversary.delete({ where: { id: a.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/couple/anniversaries/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
