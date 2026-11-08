import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { signMealPhotos } from '@/lib/meal-photos';

/** How far back "recent" looks, and how many rows it reads at most. */
const DAYS = 90;
const MAX_ROWS = 600;
const MAX_RESULTS = 30;

/** "Protein bar ×2" → ["Protein bar", 2]: the app adds ×n for servings. */
function splitServings(name: string): [string, number] {
  const m = name.match(/^(.*\S)\s×(\d+(?:\.\d+)?)$/);
  if (!m) return [name.trim(), 1];
  const n = Number(m[2]);
  return n > 0 && n <= 50 ? [m[1], n] : [name.trim(), 1];
}

/**
 * Foods this person logs, for one-tap re-logging (an apple you forgot to
 * photograph). Grouped by name, per single serving, most frequent first.
 * Nothing here costs an AI call.
 */
export async function GET() {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const rows = await prisma.meal.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - DAYS * 86_400_000) } },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      select: { foodName: true, calories: true, protein: true, carbs: true, fat: true, imageUrl: true, createdAt: true },
    });

    const groups = new Map<string, {
      name: string; count: number; last: Date;
      calories: number; protein: number; carbs: number; fat: number; imageUrl: string | null;
    }>();
    for (const r of rows) {
      const [name, n] = splitServings(r.foodName);
      if (!name) continue;
      const key = name.toLowerCase();
      const g = groups.get(key);
      if (g) { g.count += 1; continue; }
      // Rows are newest first, so the first one sets the numbers and the photo.
      const r1 = (v: unknown) => Math.round((Number(v || 0) / n) * 10) / 10;
      groups.set(key, {
        name, count: 1, last: r.createdAt,
        calories: Math.round(Number(r.calories || 0) / n),
        protein: r1(r.protein), carbs: r1(r.carbs), fat: r1(r.fat),
        imageUrl: r.imageUrl,
      });
    }

    const top = Array.from(groups.values())
      .sort((a, b) => b.count - a.count || b.last.getTime() - a.last.getTime())
      .slice(0, MAX_RESULTS);

    const items = await signMealPhotos(top.map((g) => ({
      food: g.name,
      calories: g.calories,
      protein: g.protein,
      carbs: g.carbs,
      fat: g.fat,
      count: g.count,
      last_at: g.last.toISOString(),
      // For display only (signed URLs expire).
      image_url: g.imageUrl,
      // Product photos (https, e.g. Open Food Facts) can be saved again with the meal.
      reuse_image: !!g.imageUrl && g.imageUrl.startsWith('https://'),
    })), userId);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[GET /api/meals/recent]', error);
    return NextResponse.json({ error: 'Failed to load recent foods' }, { status: 500 });
  }
}
