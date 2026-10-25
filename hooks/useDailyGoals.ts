import { useStore, localDateKey } from '@/store/useStore';
import { useWorkoutStore, dayMinutes } from '@/store/useWorkoutStore';
import { trainingBonusKcal } from '@/lib/goals';

type WorkoutState = ReturnType<typeof useWorkoutStore.getState>;

/** A training day: a workout planned for today, one in progress, or one done today. */
function trainingToday(ws: WorkoutState): { trainingDay: boolean; minutes: number } {
  const today = localDateKey();
  const plannedDay = ws.plan[String(new Date().getDay())];
  const planned = (plannedDay?.exercises.length ?? 0) > 0;
  const doneMinutes = ws.sessions.filter((s) => s.dayKey === today).reduce((m, s) => m + s.durationSec / 60, 0);
  const trainingDay = planned || !!ws.active || doneMinutes > 0;
  const minutes = doneMinutes > 0 ? doneMinutes : planned ? dayMinutes(plannedDay) : 0;
  return { trainingDay, minutes };
}

function bonusFor(ws: WorkoutState, enabled: boolean | undefined) {
  const { trainingDay, minutes } = trainingToday(ws);
  return { trainingDay, bonus: enabled && trainingDay ? trainingBonusKcal(minutes) : 0 };
}

/**
 * Today's calorie goal: the base goal plus the training-day bonus when that's
 * switched on in the goal settings.
 */
export function useCalorieGoal() {
  const base = useStore((s) => s.dailyCalorieGoal) || 2000;
  const enabled = useStore((s) => s.goalSettings?.trainingBonus);
  // Select primitives so the component only re-renders when they change.
  const trainingDay = useWorkoutStore((ws) => trainingToday(ws).trainingDay);
  const minutes = useWorkoutStore((ws) => Math.round(trainingToday(ws).minutes));
  const bonus = enabled && trainingDay ? trainingBonusKcal(minutes) : 0;
  return { base, bonus, goal: base + bonus, trainingDay };
}

/** Same as useCalorieGoal().goal, outside React. */
export function calorieGoalNow(): number {
  const { dailyCalorieGoal, goalSettings } = useStore.getState();
  const base = dailyCalorieGoal || 2000;
  return base + bonusFor(useWorkoutStore.getState(), goalSettings?.trainingBonus).bonus;
}

/** Today's step goal (fixed, or the adaptive one). */
export function useStepGoal(): number {
  return useStore((s) => s.dailyStepGoal) || 10000;
}
