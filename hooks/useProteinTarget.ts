import { useStore, localDateKey } from '@/store/useStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { macroTargets, TRAINING_DAY_PROTEIN } from '@/lib/macros';

/**
 * Today's protein target: from body weight (or the calorie goal), plus
 * TRAINING_DAY_PROTEIN on a training day (a workout planned for today, one in
 * progress, or one already done today).
 */
export function useProteinTarget() {
  const goal = useStore((s) => s.dailyCalorieGoal) || 2000;
  const user = useStore((s) => s.user);
  const planned = useWorkoutStore((s) => (s.plan[String(new Date().getDay())]?.exercises.length ?? 0) > 0);
  const trained = useWorkoutStore((s) => !!s.active || s.sessions.some((x) => x.dayKey === localDateKey()));
  const base = macroTargets(goal, user).protein;
  const trainingDay = planned || trained;
  const bonus = trainingDay ? TRAINING_DAY_PROTEIN : 0;
  return { base, bonus, target: base + bonus, trainingDay };
}
