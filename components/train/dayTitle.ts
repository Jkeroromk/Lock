import { getExercise, type MuscleGroup } from '@/constants/exercises';
import type { PlanDay } from '@/services/workouts';

/**
 * A plan day's display name: what the user called it, or else the muscle
 * groups it trains ("腿 + 背"). `short` gives one word for the week strip.
 */
export function dayTitle(day: PlanDay, weekday: number, t: (key: string, p?: Record<string, any>) => string, short = false): string {
  const name = day.name?.trim();
  if (name) return short ? name.split(/[\s+·/,，、]+/)[0] || name : name;
  const groups: MuscleGroup[] = [];
  for (const e of day.exercises) {
    const g = getExercise(e.id)?.group;
    if (g && !groups.includes(g)) groups.push(g);
  }
  if (!groups.length) return t(`train.wdl.d${weekday}`);
  return groups.slice(0, short ? 1 : 2).map((g) => t(`train.group.${g}`)).join(' + ');
}
