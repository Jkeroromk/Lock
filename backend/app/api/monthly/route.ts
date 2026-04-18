import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const tzOffset = parseInt(searchParams.get('tzOffset') || '0');

    // 用户本地月份第一天的UTC时间
    const startOfMonth = new Date(new Date(Date.UTC(year, month - 1, 1)).getTime() + tzOffset * 60 * 1000);
    const startOfNextMonth = new Date(new Date(Date.UTC(year, month, 1)).getTime() + tzOffset * 60 * 1000);

    const meals = await prisma.meal.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
    });

    // Sum meals per date string
    const dailyMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    meals.forEach((meal) => {
      const date = new Date(new Date(meal.createdAt).getTime() - tzOffset * 60 * 1000).toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      dailyMap[date].calories += Number(meal.calories || 0);
      dailyMap[date].protein += Number(meal.protein || 0);
      dailyMap[date].carbs += Number(meal.carbs || 0);
      dailyMap[date].fat += Number(meal.fat || 0);
    });

    return NextResponse.json(dailyMap);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch monthly data' },
      { status: 500 }
    );
  }
}
