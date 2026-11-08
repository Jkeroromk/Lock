import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { EXPORT_LANGS, translateFoodNames, type ExportLang } from '@/lib/food-translate';

const MAX_NAMES = 100;

export const maxDuration = 60;

/**
 * Display names in the app's language: meals keep the language they were
 * logged in, so after switching the app to English, 苹果 · 1 个 should read
 * "Apple · 1 piece" in Today and the calendar. Stored names never change.
 *
 * Only names from this person's own meals are translated (so this isn't a
 * free translation service); cached per user with the export translations.
 * Body: { names: string[], lang } → { names: { [original]: translated } }.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const lang = body?.lang;
    if (!(EXPORT_LANGS as readonly string[]).includes(lang)) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }
    const asked = Array.isArray(body?.names)
      ? Array.from(new Set(body.names.filter((n: unknown): n is string => typeof n === 'string' && n.length > 0 && n.length <= 200))).slice(0, MAX_NAMES)
      : [];
    if (asked.length === 0) return NextResponse.json({ names: {} });

    // The user's own food names (as logged, and without the "×n" count, which
    // the recent-foods list strips).
    const own = await prisma.meal.findMany({
      where: { userId },
      select: { foodName: true },
      distinct: ['foodName'],
      orderBy: { foodName: 'asc' },
      take: 5000,
    });
    const mine = new Set<string>();
    for (const m of own) {
      mine.add(m.foodName);
      mine.add(m.foodName.replace(/\s×\d+(?:\.\d+)?$/, ''));
    }
    const names = (asked as string[]).filter((n) => mine.has(n));
    if (names.length === 0) return NextResponse.json({ names: {} });

    const { map } = await translateFoodNames(userId, names, lang as ExportLang);
    const out: Record<string, string> = {};
    for (const [src, tr] of map) if (tr !== src) out[src] = tr;
    return NextResponse.json({ names: out });
  } catch (error) {
    console.error('[POST /api/meals/translate-names]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
