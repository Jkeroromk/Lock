import { macroTargetsFor, type BodyProfile } from '@/lib/goals';

/**
 * Macro targets for a calorie goal: protein from body weight when the profile
 * has one, otherwise a 30/45/25 split (see macroTargetsFor in lib/goals.ts).
 */
export function macroTargets(calorieGoal: number, profile?: BodyProfile | null) {
  const { protein, carbs, fat } = macroTargetsFor(calorieGoal, profile);
  return { protein, carbs, fat };
}

/** Extra protein (g) on days with training planned or done. */
export const TRAINING_DAY_PROTEIN = 20;
