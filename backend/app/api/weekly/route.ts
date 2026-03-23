import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    // Build array for the past 7 days based on user's local timezone
    const dateParam = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const tzOffset = parseInt(request.nextUrl.searchParams.get('tzOffset') || '0');
    const today = new Date(new Date(dateParam + 'T00:00:00Z').getTime() + tzOffset * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

    const meals = await prisma.meal.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // Sum meals per date string
    const dailyMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    meals.forEach((meal) => {
      // 转换为用户本地日期字符串
      const date = new Date(new Date(meal.createdAt).getTime() - tzOffset * 60 * 1000).toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      dailyMap[date].calories += Number(meal.calories || 0);
      dailyMap[date].protein += Number(meal.protein || 0);
      dailyMap[date].carbs += Number(meal.carbs || 0);
      dailyMap[date].fat += Number(meal.fat || 0);
    });

    // Build a full 7-day array with zeros for missing days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        ...(dailyMap[dateStr] || { calories: 0, protein: 0, carbs: 0, fat: 0 }),
      });
    }

    return NextResponse.json(days);
  } catch (error: any) {
    console.error('Weekly API error:', error);
    return NextResponse.json(
      { error: error.message || '获取周数据失败' },
      { status: 500 }
    );
  }
}
