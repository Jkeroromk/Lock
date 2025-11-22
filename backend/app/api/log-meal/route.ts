import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { food_name, calories, protein, carbs, fat, image_url } = body;

    // 验证必填字段
    if (!food_name || calories === undefined) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 获取用户 ID（这里简化处理，实际应该从认证中获取）
    // 暂时使用固定用户 ID，实际应用中应该从 JWT token 中获取
    const userId = request.headers.get('x-user-id') || 'default-user-id';

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


