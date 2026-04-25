import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/weight — 获取体重记录列表（最近 90 条）
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const records = await prisma.weightRecord.findMany({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
    take: 90,
    select: { id: true, weight: true, recordedAt: true, note: true },
  });

  return NextResponse.json(records);
}

// POST /api/weight — 新增体重记录
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { weight, note } = await request.json();
  if (!weight || isNaN(Number(weight))) {
    return NextResponse.json({ error: 'Invalid weight data' }, { status: 400 });
  }

  // upsert 今天的记录（一天只保留最新的一条）
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400_000);

  const existing = await prisma.weightRecord.findFirst({
    where: { userId, recordedAt: { gte: today, lt: tomorrow } },
  });

  let record;
  if (existing) {
    record = await prisma.weightRecord.update({
      where: { id: existing.id },
      data: { weight: Number(weight), note: note ?? null },
    });
  } else {
    record = await prisma.weightRecord.create({
      data: { userId, weight: Number(weight), note: note ?? null },
    });
    // 同时更新 User.weight（最新体重）
    await prisma.user.update({
      where: { id: userId },
      data: { weight: Number(weight) },
    });
  }

  return NextResponse.json(record, { status: 201 });
}

// DELETE /api/weight?id=xxx — 删除一条记录
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await prisma.weightRecord.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
