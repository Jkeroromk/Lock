import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { syncChallengeProgress } from '@/lib/challenge-progress';
import { trustedTimeZone } from '@/lib/timezone';
import { localDayKey } from '@/lib/pet';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json();
    const { steps, active_energy } = body;

    // Ensure user row exists (new users may not have hit /api/auth/profile yet)
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });

    // Today on the user's own clock. This was the UTC date, so evening steps
    // (after 7–8 pm in New York) went into tomorrow's row and were overwritten
    // the next morning; the couple space reads the local day's row.
    const dateOnly = localDayKey(new Date(), await trustedTimeZone(userId, request));

    // 使用 upsert 来更新或插入健康数据
    const data = await prisma.healthSync.upsert({
      where: {
        userId_date: {
          userId: userId,
          date: new Date(dateOnly),
        },
      },
      update: {
        steps: Number(steps) || 0,
        activeEnergy: Number(active_energy) || 0,
      },
      create: {
        userId: userId,
        date: new Date(dateOnly),
        steps: Number(steps) || 0,
        activeEnergy: Number(active_energy) || 0,
      },
    });

    // ── 同步挑战进度（STEPS 类型）──────────────────────────────────────────
    syncChallengeProgress(userId).catch(() => {});
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to sync health data' }, { status: 500 });
  }
}
