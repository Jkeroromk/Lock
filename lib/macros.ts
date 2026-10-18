/**
 * Macro targets derived from the calorie goal with a standard 30/45/25 split
 * (protein / carbs / fat). Users don't set macro goals yet.
 */
export function macroTargets(calorieGoal: number) {
  return {
    protein: Math.round((calorieGoal * 0.3) / 4),
    carbs: Math.round((calorieGoal * 0.45) / 4),
    fat: Math.round((calorieGoal * 0.25) / 9),
  };
}

/** Extra protein (g) on days with training planned or done. */
export const TRAINING_DAY_PROTEIN = 20;
