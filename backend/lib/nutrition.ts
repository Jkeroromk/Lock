/**
 * Validates meal nutrition values from the app. Calories feed the friends
 * leaderboard, so negative, NaN or absurd numbers are refused.
 * fiber is in grams, sodium in milligrams; both are optional (older meals
 * have none, and "unknown" is not the same as 0).
 */
export const NUTRITION_LIMITS = { calories: 20_000, protein: 2_000, carbs: 3_000, fat: 2_000, fiber: 500, sodium: 100_000 } as const;
type Key = keyof typeof NUTRITION_LIMITS;

/**
 * Each present value must be a finite number in 0..limit (numeric strings are
 * accepted, as before); missing/null/'' values come back undefined.
 * Returns null if any present value is invalid.
 */
export function parseNutrition(input: Partial<Record<Key, unknown>>): Partial<Record<Key, number>> | null {
  const out: Partial<Record<Key, number>> = {};
  for (const key of Object.keys(NUTRITION_LIMITS) as Key[]) {
    const v = input[key];
    if (v === undefined || v === null || v === '') continue;
    const x = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    if (!Number.isFinite(x) || x < 0 || x > NUTRITION_LIMITS[key]) return null;
    out[key] = Math.round(x * 100) / 100;
  }
  return out;
}

/** Fiber (g, 1 decimal) and sodium (mg, whole) from an AI or database answer; undefined when missing. */
export function cleanMicros(input: { fiber?: unknown; sodium?: unknown }): { fiber?: number; sodium?: number } {
  const n = (v: unknown) => {
    const x = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    return Number.isFinite(x) && x >= 0 ? x : undefined;
  };
  const f = n(input.fiber);
  const s = n(input.sodium);
  return {
    ...(f !== undefined && f <= NUTRITION_LIMITS.fiber && { fiber: Math.round(f * 10) / 10 }),
    ...(s !== undefined && s <= NUTRITION_LIMITS.sodium && { sodium: Math.round(s) }),
  };
}

/** Sum of a field over items, or undefined if no item has it (so "unknown" stays unknown). */
export function sumKnown<T>(items: T[], pick: (it: T) => number | undefined): number | undefined {
  let total: number | undefined;
  for (const it of items) {
    const v = pick(it);
    if (v !== undefined) total = (total ?? 0) + v;
  }
  return total;
}

/** Prompt fields the AI fills for fiber and sodium (keep in one place for vision, label and text). */
export const MICROS_PROMPT_FIELDS = '"fiber": <grams of dietary fiber>, "sodium": <milligrams of sodium>';

/** A nullable Decimal column as a number, keeping null (= not known). */
export const optNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/**
 * A day's totals. fiber/sodium only count meals that have a value, and
 * fiberMeals/sodiumMeals say how many did, so the app can show "from 2 of 3 meals".
 */
export interface DayTotals {
  calories: number; protein: number; carbs: number; fat: number;
  fiber: number; sodium: number; fiberMeals: number; sodiumMeals: number; meals: number;
}
export const emptyDay = (): DayTotals => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, fiberMeals: 0, sodiumMeals: 0, meals: 0 });
export function addMicros(day: DayTotals, meal: { fiber?: unknown; sodium?: unknown }): void {
  day.meals += 1;
  if (meal.fiber !== null && meal.fiber !== undefined) { day.fiber += Number(meal.fiber); day.fiberMeals += 1; }
  if (meal.sodium !== null && meal.sodium !== undefined) { day.sodium += Number(meal.sodium); day.sodiumMeals += 1; }
}
