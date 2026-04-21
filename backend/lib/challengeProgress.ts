import { prisma } from './prisma';

/**
 * Recalculates and updates challenge progress for a user after logging a meal or syncing health data.
 * Called after meal log (CALORIES type) or health sync (STEPS type).
 */
export async function updateChallengeProgress(userId: string, type: 'CALORIES' | 'STEPS' | 'STREAK') {
  const now = new Date();

  // Find active participations matching the given challenge type
  const participations = await prisma.challengeParticipant.findMany({
    where: {
      userId,
      challenge: {
        type,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
    include: { challenge: true },
  });

  if (participations.length === 0) return;

  for (const participation of participations) {
    const { challenge } = participation;
    let progress = 0;

    if (type === 'CALORIES') {
      // Sum calories from meals within the challenge period
      const result = await prisma.meal.aggregate({
        where: {
          userId,
          createdAt: {
            gte: challenge.startDate,
            lte: challenge.endDate,
          },
        },
        _sum: { calories: true },
      });
      progress = Math.round(Number(result._sum.calories || 0));
    } else if (type === 'STEPS') {
      // Sum steps from health syncs within the challenge period
      const result = await prisma.healthSync.aggregate({
        where: {
          userId,
          date: {
            gte: challenge.startDate,
            lte: challenge.endDate,
          },
        },
        _sum: { steps: true },
      });
      progress = result._sum.steps || 0;
    } else if (type === 'STREAK') {
      // Use current streak from user profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true },
      });
      progress = user?.streak || 0;
    }

    await prisma.challengeParticipant.update({
      where: { id: participation.id },
      data: { progress },
    });

    // Check if goal reached and log activity
    if (progress >= challenge.goalValue && participation.progress < challenge.goalValue) {
      await prisma.activityFeed.create({
        data: {
          userId,
          type: 'CHALLENGE_COMPLETED',
          metadata: { challengeId: challenge.id, title: challenge.title },
        },
      }).catch((e) => console.error('activityFeed CHALLENGE_COMPLETED:', e)); // Non-critical
    }
  }
}
