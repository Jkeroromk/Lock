/**
 * Fiber (g) and sodium (mg). Unlike calories and macros these are often
 * unknown (meals logged before 11-2026, foods without data), so "not known"
 * stays undefined/null instead of becoming 0. Sources: constants/sources.ts
 * (dri-fiber, dri-sodium, fda-dv).
 */

/** Adequate Intake for total fiber: 14 g per 1,000 kcal (IOM 2005; FDA Daily Value 28 g at 2,000 kcal). */
export const FIBER_G_PER_1000_KCAL = 14;
/** Reduce sodium if above this (NASEM 2019 CDRR; FDA Daily Value). */
export const SODIUM_LIMIT_MG = 2300;

/** Daily fiber target for a calorie goal. */
export function fiberTarget(calorieGoal: number): number {
  const kcal = Number.isFinite(calorieGoal) && calorieGoal > 0 ? calorieGoal : 2000;
  return Math.round((kcal * FIBER_G_PER_1000_KCAL) / 1000);
}

export interface Micros {
  fiber?: number | null;
  sodium?: number | null;
}

const known = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Values for `factor` servings; unknown values stay out. */
export function scaleMicros(m: Micros | null | undefined, factor: number): { fiber?: number; sodium?: number } {
  if (!m) return {};
  return {
    ...(known(m.fiber) && { fiber: Math.round(m.fiber * factor * 10) / 10 }),
    ...(known(m.sodium) && { sodium: Math.round(m.sodium * factor) }),
  };
}

export interface MicrosTotal {
  fiber: number;
  sodium: number;
  /** How many meals had a fiber / sodium value. */
  fiberMeals: number;
  sodiumMeals: number;
  meals: number;
}

/** Day totals over meals; only meals with a value count toward each total. */
export function sumMicros(meals: Micros[]): MicrosTotal {
  const t: MicrosTotal = { fiber: 0, sodium: 0, fiberMeals: 0, sodiumMeals: 0, meals: meals.length };
  for (const m of meals) {
    if (known(m.fiber)) { t.fiber += m.fiber; t.fiberMeals += 1; }
    if (known(m.sodium)) { t.sodium += m.sodium; t.sodiumMeals += 1; }
  }
  t.fiber = Math.round(t.fiber * 10) / 10;
  t.sodium = Math.round(t.sodium);
  return t;
}

/** "1,850" (mg). */
export const formatMg = (mg: number) => Math.round(mg).toLocaleString();
/** "12.5" or "12" (g). */
export const formatG = (g: number) => (g >= 10 ? String(Math.round(g)) : String(Math.round(g * 10) / 10));

/** "Fiber 4 g · Sodium 820 mg" for one meal (known values only). `t` is the i18n function. */
export function microsLine(m: Micros, t: (key: any) => string): string {
  return [
    known(m.fiber) && `${t('micros.fiber')} ${formatG(m.fiber)} g`,
    known(m.sodium) && `${t('micros.sodium')} ${formatMg(m.sodium)} mg`,
  ].filter(Boolean).join(' · ');
}
