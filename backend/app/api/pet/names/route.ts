import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { trustedTimeZone } from '@/lib/timezone';
import { cleanName, petState } from '@/lib/pet';

// PUT /api/pet/names — rename the coach and/or the buddy. Body: { coachName?, buddyName? }
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => null);
  const data: { coachName?: string; buddyName?: string } = {};
  if (body?.coachName !== undefined) {
    const n = cleanName(body.coachName);
    if (!n) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    data.coachName = n;
  }
  if (body?.buddyName !== undefined) {
    const n = cleanName(body.buddyName);
    if (!n) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    data.buddyName = n;
  }

  try {
    const updated = await prisma.petProfile.updateMany({ where: { userId }, data });
    if (updated.count === 0) return NextResponse.json({ error: 'No pet' }, { status: 404 });
    return NextResponse.json(await petState(userId, await trustedTimeZone(userId, request)));
  } catch (error) {
    console.error('[PUT /api/pet/names]', error);
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 });
  }
}
