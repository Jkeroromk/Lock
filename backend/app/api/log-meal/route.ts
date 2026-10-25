import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { syncChallengeProgress } from '@/lib/challenge-progress';
import { uploadMealPhoto, MAX_THUMBNAIL_BASE64 } from '@/lib/meal-photos';
import { parseNutrition } from '@/lib/nutrition';
import { cleanText } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json();
    const { food_name, calories, protein, carbs, fat, image_url, thumbnail } = body;

    if (!food_name || calories === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof food_name !== 'string' || food_name.length > 200) {
      return NextResponse.json({ error: 'Food name too long (max 200 chars)' }, { status: 400 });
    }

    if (image_url !== undefined && image_url !== null) {
      if (typeof image_url !== 'string' || image_url.length > 2000) {
        return NextResponse.json({ error: 'Image URL too long (max 2000 chars)' }, { status: 400 });
      }
      // sb:// references are written only by the server (uploadMealPhoto).
      if (image_url.startsWith('sb://')) {
        return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
      }
    }

    const nutrition = parseNutrition({ calories, protein, carbs, fat });
    if (!nutrition) {
      return NextResponse.json({ error: 'Invalid nutrition values' }, { status: 400 });
    }

    if (thumbnail !== undefined && thumbnail !== null) {
      if (typeof thumbnail !== 'string' || thumbnail.length > MAX_THUMBNAIL_BASE64) {
        return NextResponse.json({ error: 'Thumbnail too large' }, { status: 400 });
      }
    }

    // Ensure user row exists
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });

    // 插入餐食记录
    let meal = await prisma.meal.create({
      data: {
        userId,
        foodName: cleanText(food_name, 200) ?? 'Food',
        calories: nutrition.calories ?? 0,
        protein: nutrition.protein ?? 0,
        carbs: nutrition.carbs ?? 0,
        fat: nutrition.fat ?? 0,
        imageUrl: image_url || null,
      },
    });

    // Keep a small copy of the photo in Supabase Storage so it shows on every
    // device and survives reinstalls. If storage is unavailable the meal keeps
    // the device-local path the app sent.
    if (thumbnail) {
      const stored = await uploadMealPhoto(userId, meal.id, thumbnail);
      if (stored) meal = await prisma.meal.update({ where: { id: meal.id }, data: { imageUrl: stored } });
    }

    // ── 自动更新 Streak ──────────────────────────────────────────────────────
    await updateStreak(userId);
    // ────────────────────────────────────────────────────────────────────────

    // ── 同步挑战进度（fire-and-forget，不阻塞响应）──────────────────────────
    syncChallengeProgress(userId).catch(() => {});
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, data: meal });
  } catch (error: any) {
    console.error('[POST /api/log-meal]', error);
    return NextResponse.json({ error: 'Failed to save meal' }, { status: 500 });
  }
}

/**
 * 更新用户连续打卡天数（streak）
 * 规则：
 * - 今日首次记餐 → 检查昨天是否有记录
 *   - 昨天有 → streak + 1
 *   - 昨天没有 → streak 重置为 1
 * - 今日非首次记餐 → 不改变 streak
 */
async function updateStreak(userId: string): Promise<void> {
  const now = new Date();
  // 使用 UTC 日期边界，避免时区问题
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart.getTime() + 86400_000);
  const yesterdayStart = new Date(todayStart.getTime() - 86400_000);

  // 用可序列化事务防止并发竞态：多个请求同时到达时，只有一个能成功更新 streak
  await prisma.$transaction(async (tx) => {
    // 检查今天是否已经有其他餐食（count 包含刚插入的那条，所以 <=1 代表今天首次）
    const todayMealCount = await tx.meal.count({
      where: { userId, createdAt: { gte: todayStart, lt: todayEnd } },
    });

    if (todayMealCount > 1) return;

    // 检查昨天是否有记录
    const yesterdayMealCount = await tx.meal.count({
      where: { userId, createdAt: { gte: yesterdayStart, lt: todayStart } },
    });

    if (yesterdayMealCount > 0) {
      // 连续 → streak + 1
      await tx.user.update({
        where: { id: userId },
        data: { streak: { increment: 1 } },
      });
    } else {
      // 断了 → 重置为 1
      await tx.user.update({
        where: { id: userId },
        data: { streak: 1 },
      });
    }
  }, { isolationLevel: 'Serializable' });
}
