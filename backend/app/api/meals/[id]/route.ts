import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { deleteMealPhoto } from '@/lib/meal-photos';
import { parseNutrition } from '@/lib/nutrition';
import { cleanText } from '@/lib/sanitize';

// DELETE /api/meals/[id] — delete a meal
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authenticateRequest();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const meal = await prisma.meal.findUnique({ where: { id: params.id } });
    if (!meal || meal.userId !== userId) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }
    await prisma.meal.delete({ where: { id: params.id } });
    await deleteMealPhoto(meal.imageUrl, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/meals/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
  }
}

// PATCH /api/meals/[id] — update a meal's nutrition info
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authenticateRequest();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const meal = await prisma.meal.findUnique({ where: { id: params.id } });
    if (!meal || meal.userId !== userId) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { food_name, calories, protein, carbs, fat } = body;

    const nutrition = parseNutrition({ calories, protein, carbs, fat });
    if (!nutrition) {
      return NextResponse.json({ error: 'Invalid nutrition values' }, { status: 400 });
    }
    let foodName: string | undefined;
    if (food_name !== undefined) {
      foodName = cleanText(food_name, 200) ?? undefined;
      if (!foodName) return NextResponse.json({ error: 'Invalid food name' }, { status: 400 });
    }

    const updated = await prisma.meal.update({
      where: { id: params.id },
      data: {
        ...(foodName !== undefined && { foodName }),
        ...(nutrition.calories !== undefined && { calories: nutrition.calories }),
        ...(nutrition.protein !== undefined && { protein: nutrition.protein }),
        ...(nutrition.carbs !== undefined && { carbs: nutrition.carbs }),
        ...(nutrition.fat !== undefined && { fat: nutrition.fat }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[PATCH /api/meals/[id]]', error);
    return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 });
  }
}
