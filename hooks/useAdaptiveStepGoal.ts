import { useEffect } from 'react';
import { useStore, localDateKey } from '@/store/useStore';
import { getDailySteps } from '@/services/health';
import { adaptiveStepGoal, averageSteps } from '@/lib/goals';

/** Monday of this week, e.g. "2026-10-19": the adaptive goal is worked out once a week. */
export function weekKey(d = new Date()): string {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return localDateKey(monday);
}

/**
 * Looks at the last 14 days of steps: the average and the goal "keep up with
 * me" would set (a bit above the average). Nulls when there isn't enough data.
 */
export async function stepHistory(): Promise<{ average: number | null; goal: number | null }> {
  const daily = await getDailySteps(14);
  const avg = averageSteps(daily);
  return { average: avg === null ? null : Math.round(avg), goal: adaptiveStepGoal(daily) };
}

/** Works out the adaptive goal once a week, when that mode is on. */
export async function refreshAdaptiveSteps(): Promise<number | null> {
  const { goal } = await stepHistory();
  if (goal) useStore.getState().setAdaptiveSteps({ goal, week: weekKey() });
  return goal;
}

export function useAdaptiveStepGoal() {
  const mode = useStore((s) => s.goalSettings?.stepMode);
  const week = useStore((s) => s.adaptiveSteps?.week);
  useEffect(() => {
    if (mode !== 'adaptive' || week === weekKey()) return;
    refreshAdaptiveSteps().catch(() => {});
  }, [mode, week]);
}
