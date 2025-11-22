import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { steps, active_energy, heart_rate } = body;

    // 获取用户 ID
    const userId = request.headers.get('x-user-id') || 'default-user-id';

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
        heartRate: Number(heart_rate) || 0,
      },
      create: {
        userId: userId,
        date: new Date(dateOnly),
        steps: Number(steps) || 0,
        activeEnergy: Number(active_energy) || 0,
        heartRate: Number(heart_rate) || 0,
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


