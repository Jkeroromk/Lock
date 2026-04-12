/**
 * 挑战进度自动同步
 *
 * 支持三种挑战类型（进度均为挑战期间累计值）：
 * - CALORIES : 挑战开始后累计记录的卡路里
 * - STEPS    : 挑战开始后累计步数（来自 Apple Health / Google Fit）
 * - STREAK   : 用户当前连续打卡天数（取实时值）
 *
 * 在 log-meal 和 sync-health 之后调用，保持进度实时更新。
 */

import { prisma } from '@/lib/prisma';

export async function syncChallengeProgress(userId: string): Promise<void> {
  const now = new Date();

  // 找出用户参与的所有进行中的挑战
  const participations = await prisma.challengeParticipant.findMany({
    where: {
      userId,
      challenge: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate:   { gte: now },
      },
    },
    include: { challenge: true },
  });

  if (participations.length === 0) return;

  // 一次性获取用户 streak（STREAK 类型需要）
  const hasStreak = participations.some((p) => p.challenge.type === 'STREAK');
  const userRecord = hasStreak
    ? await prisma.user.findUnique({ where: { id: userId }, select: { streak: true } })
    : null;

  await Promise.all(
    participations.map(async (p) => {
      let newProgress = p.progress;

      if (p.challenge.type === 'CALORIES') {
        // 累计该挑战期间的卡路里
        const result = await prisma.meal.aggregate({
          where: { userId, createdAt: { gte: p.challenge.startDate, lte: now } },
          _sum: { calories: true },
        });
        newProgress = Math.round(Number(result._sum.calories ?? 0));

      } else if (p.challenge.type === 'STEPS') {
        // 累计该挑战期间的步数
        const result = await prisma.healthSync.aggregate({
          where: { userId, date: { gte: p.challenge.startDate, lte: now } },
          _sum: { steps: true },
        });
        newProgress = Number(result._sum.steps ?? 0);

      } else if (p.challenge.type === 'STREAK') {
        newProgress = userRecord?.streak ?? 0;
      }

      // 更新进度
      await prisma.challengeParticipant.update({
        where: { challengeId_userId: { challengeId: p.challengeId, userId } },
        data: { progress: newProgress },
      });

      // 首次达成目标 → 写入活动动态
      if (newProgress >= p.challenge.goalValue && p.progress < p.challenge.goalValue) {
        await prisma.activityFeed.create({
          data: {
            userId,
            type: 'CHALLENGE_COMPLETED',
            metadata: { challengeId: p.challengeId, title: p.challenge.title },
          },
        }).catch(() => {}); // 动态写入失败不影响主流程
      }
    })
  );
}
