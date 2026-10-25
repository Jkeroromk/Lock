import { useStore, localDateKey } from '@/store/useStore';
import { useCalorieGoal } from '@/hooks/useDailyGoals';

/**
 * How today's intake compares with the calorie goal.
 * - near: 90–100% of the goal
 * - over: above the goal
 * - way:  over by at least 300 kcal or 15%, whichever is larger
 * When the goal is gaining muscle, a small surplus is the plan, so only "way" warns.
 */
export type CalorieLevel = 'ok' | 'near' | 'over' | 'way';

export function calorieLevel(eaten: number, goal: number, userGoal?: string | null): CalorieLevel {
  if (!goal || goal <= 0) return 'ok';
  const over = eaten - goal;
  if (over >= Math.max(300, goal * 0.15)) return 'way';
  if (over > 0) return userGoal === 'gain_muscle' ? 'ok' : 'over';
  if (eaten >= goal * 0.9) return 'near';
  return 'ok';
}

export const isWarning = (level: CalorieLevel) => level === 'over' || level === 'way';

/** Today's calories so far (0 if the stored total is from an earlier day). */
export function todaysCalories(): number {
  const { todayCalories, todayDate } = useStore.getState();
  return todayDate && todayDate !== localDateKey() ? 0 : Math.round(todayCalories || 0);
}

/** Live status for today; level is 'ok' when the user turned warnings off. */
export function useCalorieStatus(extra = 0) {
  const todayCalories = useStore((s) => s.todayCalories);
  const todayDate = useStore((s) => s.todayDate);
  const { goal } = useCalorieGoal();
  const userGoal = useStore((s) => s.user?.goal);
  const enabled = useStore((s) => s.calorieWarnings);
  const base = todayDate && todayDate !== localDateKey() ? 0 : Math.round(todayCalories || 0);
  const eaten = base + Math.round(extra);
  return {
    enabled,
    eaten,
    goal,
    over: eaten - goal,
    level: enabled ? calorieLevel(eaten, goal, userGoal) : ('ok' as CalorieLevel),
  };
}
