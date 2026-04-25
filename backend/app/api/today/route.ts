import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    // 获取今天的开始和结束时间（基于用户本地时区）
    const dateParam = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const tzOffset = parseInt(request.nextUrl.searchParams.get('tzOffset') || '0');
    // 用户本地午夜 = UTC午夜 + tzOffset分钟（UTC+8时tzOffset=-480，所以是UTC午夜-8h）
    const today = new Date(new Date(dateParam + 'T00:00:00Z').getTime() + tzOffset * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

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
      meals: meals.map((m) => ({
        id: m.id,
        food_name: m.foodName,
        calories: Number(m.calories),
        protein: Number(m.protein || 0),
        carbs: Number(m.carbs || 0),
        fat: Number(m.fat || 0),
        image_url: m.imageUrl,
        created_at: m.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch today data' },
      { status: 500 }
    );
  }
}
