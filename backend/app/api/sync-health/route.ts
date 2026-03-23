import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json();
    const { steps, active_energy } = body;

    // Ensure user row exists (new users may not have hit /api/auth/profile yet)
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });

    // 获取今天的日期（只保存日期部分，不包含时间）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = today.toISOString().split('T')[0];

    // 使用 upsert 来更新或插入健康数据
    const data = await prisma.healthSync.upsert({
      where: {
        userId_date: {
          userId: userId,
          date: new Date(dateOnly),
        },
      },
      update: {
        steps: Number(steps) || 0,
        activeEnergy: Number(active_energy) || 0,
      },
      create: {
        userId: userId,
        date: new Date(dateOnly),
        steps: Number(steps) || 0,
        activeEnergy: Number(active_energy) || 0,
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Sync health error:', error);
    return NextResponse.json(
      { error: error.message || '同步健康数据失败' },
      { status: 500 }
    );
  }
}
