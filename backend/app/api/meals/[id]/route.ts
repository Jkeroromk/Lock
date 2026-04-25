import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

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
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const body = await request.json();
    const { food_name, calories, protein, carbs, fat } = body;

    const updated = await prisma.meal.update({
      where: { id: params.id },
      data: {
        ...(food_name !== undefined && { foodName: food_name }),
        ...(calories !== undefined && { calories: Number(calories) }),
        ...(protein !== undefined && { protein: Number(protein) }),
        ...(carbs !== undefined && { carbs: Number(carbs) }),
        ...(fat !== undefined && { fat: Number(fat) }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
