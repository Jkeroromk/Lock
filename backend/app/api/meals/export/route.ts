import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { trustedTimeZone } from '@/lib/timezone';
import { startOfLocalDay } from '@/lib/local-day';
import { shiftDay } from '@/lib/pet';
import { EXPORT_LANGS, translateFoodNames, type ExportLang } from '@/lib/food-translate';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 5000;

// Translating a few hundred names can take a while.
export const maxDuration = 60;

/**
 * Meals for the CSV export.
 * - No query (app versions before 11-08): the latest 1000 meals as an array.
 * - `v=2`: `{ meals, translated, complete }`, optionally limited to local days
 *   `from`..`to` (YYYY-MM-DD, inclusive) and with food names in `lang`
 *   (one of EXPORT_LANGS; anything else keeps the names as logged).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const q = request.nextUrl.searchParams;

    if (q.get('v') !== '2') {
      const meals = await prisma.meal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 1000 });
      return NextResponse.json(meals.map(row));
    }

    const from = q.get('from');
    const to = q.get('to');
    if ((from && !DAY.test(from)) || (to && !DAY.test(to)) || (from && to && from > to)) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }
    const tz = await trustedTimeZone(userId, request);
    const createdAt: { gte?: Date; lt?: Date } = {};
    if (from) createdAt.gte = startOfLocalDay(from, tz);
    if (to) createdAt.lt = startOfLocalDay(shiftDay(to, 1), tz);

    const meals = await prisma.meal.findMany({
      where: { userId, ...(from || to ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
    });
    const rows = meals.map(row);

    const lang = q.get('lang');
    if (!lang || !(EXPORT_LANGS as readonly string[]).includes(lang) || rows.length === 0) {
      return NextResponse.json({ meals: rows, translated: false, complete: true });
    }
    const { map, complete } = await translateFoodNames(userId, Array.from(new Set(rows.map((r) => r.food_name))), lang as ExportLang);
    return NextResponse.json({
      meals: rows.map((r) => ({ ...r, food_name: map.get(r.food_name) ?? r.food_name })),
      translated: true,
      complete,
    });
  } catch (error: any) {
    console.error('[GET /api/meals/export]', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function row(m: { id: string; foodName: string; calories: unknown; protein: unknown; carbs: unknown; fat: unknown; createdAt: Date }) {
  return {
    id: m.id,
    food_name: m.foodName,
    calories: Number(m.calories),
    protein: Number(m.protein || 0),
    carbs: Number(m.carbs || 0),
    fat: Number(m.fat || 0),
    created_at: m.createdAt,
  };
}
