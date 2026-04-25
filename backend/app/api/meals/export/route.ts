import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const meals = await prisma.meal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return NextResponse.json(
      meals.map((m) => ({
        id: m.id,
        food_name: m.foodName,
        calories: Number(m.calories),
        protein: Number(m.protein || 0),
        carbs: Number(m.carbs || 0),
        fat: Number(m.fat || 0),
        created_at: m.createdAt,
      }))
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
