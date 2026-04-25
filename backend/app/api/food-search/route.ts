import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { searchUsda } from '@/lib/usda';

// USDA 缓存有效期：30 天
const USDA_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// 本地结果少于此阈值时，才补充查询 USDA
const LOCAL_RESULT_THRESHOLD = 3;

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 1) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    if (query.length > 100) {
      return NextResponse.json({ error: 'Search query too long' }, { status: 400 });
    }

    // ── Step 1: 查本地数据库（中文食物 + 已缓存的 USDA 结果）────────────────
    const localResults = await prisma.food.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: [
        // 本地数据优先
        { source: 'asc' },
        { name: 'asc' },
      ],
      take: 10,
      select: {
        id: true,
        name: true,
        nameEn: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        source: true,
        fdcId: true,
      },
    });

    const formatted = localResults.map(formatFood);

    // ── Step 2: 本地结果不足时，查询 USDA 并缓存 ────────────────────────────
    if (localResults.length < LOCAL_RESULT_THRESHOLD) {
      try {
        const usdaResults = await searchUsda(query, 5);

        // 过滤掉已缓存的（按 fdcId 去重），写入数据库
        const existingFdcIds = new Set(
          localResults.map((r) => r.fdcId).filter(Boolean)
        );

        const toCache = usdaResults.filter(
          (u) => !existingFdcIds.has(u.fdcId)
        );

        if (toCache.length > 0) {
          await prisma.$transaction(
            toCache.map((u) =>
              prisma.food.upsert({
                where: { fdcId: u.fdcId },
                update: {
                  calories: u.calories,
                  protein:  u.protein,
                  carbs:    u.carbs,
                  fat:      u.fat,
                  cachedAt: new Date(),
                },
                create: {
                  name:     u.name,
                  calories: u.calories,
                  protein:  u.protein,
                  carbs:    u.carbs,
                  fat:      u.fat,
                  source:   'USDA',
                  fdcId:    u.fdcId,
                  cachedAt: new Date(),
                },
              })
            )
          );
        }

        // 把新的 USDA 结果追加到响应（已缓存的不重复）
        for (const u of usdaResults) {
          if (!existingFdcIds.has(u.fdcId)) {
            formatted.push({
              id:       u.fdcId,
              name:     u.name,
              nameEn:   u.name,
              calories: u.calories,
              protein:  u.protein,
              carbs:    u.carbs,
              fat:      u.fat,
              source:   'USDA',
            });
          }
        }
      } catch {
        // USDA failure does not affect local results
      }
    }

    return NextResponse.json({ results: formatted, total: formatted.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

function formatFood(food: {
  id: string;
  name: string;
  nameEn: string | null;
  calories: any;
  protein: any;
  carbs: any;
  fat: any;
  source: string;
  fdcId: string | null;
}) {
  return {
    id:       food.fdcId ?? food.id,
    name:     food.name,
    nameEn:   food.nameEn,
    calories: Math.round(Number(food.calories)),
    protein:  Math.round(Number(food.protein) * 10) / 10,
    carbs:    Math.round(Number(food.carbs) * 10) / 10,
    fat:      Math.round(Number(food.fat) * 10) / 10,
    source:   food.source,
  };
}
