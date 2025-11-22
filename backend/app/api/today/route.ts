import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 获取用户 ID（这里简化处理，实际应该从认证中获取）
    const userId = request.headers.get('x-user-id') || 'default-user-id';

    // 获取今天的开始和结束时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查询今日餐食
    const meals = await prisma.meal.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 计算总卡路里
    const totalCalories = meals.reduce(
      (sum, meal) => sum + Number(meal.calories || 0),
      0
    );

    return NextResponse.json({
      totalCalories,
      meals: meals || [],
    });
  } catch (error: any) {
    console.error('Today API error:', error);
    return NextResponse.json(
      { error: error.message || '获取今日数据失败' },
      { status: 500 }
    );
  }
}


