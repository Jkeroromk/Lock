import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    // dateParam is already the user's local date (YYYY-MM-DD), sent by the client
    const dateParam = request.nextUrl.searchParams.get('date') || new Date().toLocaleDateString('en-CA');
    const tzOffset = parseInt(request.nextUrl.searchParams.get('tzOffset') || '0');

    // Helper: local date string → YYYY-MM-DD using pure local arithmetic (no UTC shift)
    const localDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Build 7-day range from dateParam directly (avoid UTC toISOString off-by-one)
    const [baseYear, baseMonth, baseDay] = dateParam.split('-').map(Number);

    // For the DB query, convert local 7-days-ago midnight to UTC
    const localStartMidnight = new Date(baseYear, baseMonth - 1, baseDay - 6);
    // tzOffset = getTimezoneOffset() = UTC - local (negative for UTC+8)
    // UTC = local + tzOffset → use Date constructor which treats args as local
    const sevenDaysAgo = new Date(localStartMidnight.getTime() + tzOffset * 60 * 1000);

    const meals = await prisma.meal.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // Group meals by local date: meal UTC → local = UTC - tzOffset
    const dailyMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    meals.forEach((meal) => {
      const localMs = new Date(meal.createdAt).getTime() - tzOffset * 60 * 1000;
      const date = new Date(localMs).toISOString().split('T')[0];
      if (!dailyMap[date]) dailyMap[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      dailyMap[date].calories += Number(meal.calories || 0);
      dailyMap[date].protein += Number(meal.protein || 0);
      dailyMap[date].carbs += Number(meal.carbs || 0);
      dailyMap[date].fat += Number(meal.fat || 0);
    });

    // Build 7-day array using local Date constructor (no UTC drift)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseYear, baseMonth - 1, baseDay - i);
      const dateStr = localDateStr(d);
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
