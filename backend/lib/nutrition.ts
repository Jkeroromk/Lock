/**
 * Validates meal nutrition values from the app. Calories feed the friends
 * leaderboard and challenges, so negative, NaN or absurd numbers are refused.
 */
export const NUTRITION_LIMITS = { calories: 20_000, protein: 2_000, carbs: 3_000, fat: 2_000 } as const;
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
