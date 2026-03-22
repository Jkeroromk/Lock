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
    const { food_name, calories, protein, carbs, fat, image_url } = body;

    // 验证必填字段
    if (!food_name || calories === undefined) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // Ensure user row exists (new users may not have hit /api/auth/profile yet)
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });

    // 插入餐食记录
    const data = await prisma.meal.create({
      data: {
        userId: userId,
        foodName: food_name,
        calories: Number(calories),
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        imageUrl: image_url || null,
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Log meal error:', error);
    return NextResponse.json(
      { error: error.message || '保存餐食失败' },
      { status: 500 }
    );
  }
}
