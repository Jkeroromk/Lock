/**
 * Daily targets: calories, macros and steps.
 *
 * Calories come from the profile (Mifflin–St Jeor BMR × activity), adjusted by
 * the weekly pace the user picks, unless they set their own number. Training
 * days can add a little on top. Protein follows body weight. Steps are a fixed
 * number or follow the user's own recent average.
 *
 * Settings sync to the server (users.goal_settings), so a new phone or a
 * reinstall keeps them.
 */

export type GoalKind = 'lose_weight' | 'lose_fat' | 'gain_muscle';

export interface GoalSettings {
  v: 1;
  /** auto: follow the profile; custom: the number the user picked. */
  calorieMode: 'auto' | 'custom';
  /** The user's own number (custom mode). */
  calories: number;
  /** Weekly change in body weight the plan aims for, kg (negative = lose). */
  pace: number;
  /** Add calories on days with training planned or done. */
  trainingBonus: boolean;
  stepMode: 'fixed' | 'adaptive';
  steps: number;
  /** When these were last changed (ISO); the newer copy wins when syncing. */
  updatedAt: string;
}

export interface BodyProfile {
  height?: number | string | null;
  weight?: number | string | null;
  age?: number | string | null;
  gender?: string | null;
  goal?: string | null;
  exerciseFrequency?: string | null;
}

export const ACTIVITY_MULTIPLIER: Record<string, number> = {
  never: 1.2, rarely: 1.375, '1-2': 1.375, '3-4': 1.55, '5-6': 1.725, daily: 1.9,
};

/** Steps suggested for how often someone already exercises. */
export const RECOMMENDED_STEPS: Record<string, number> = {
  never: 6000, rarely: 7000, '1-2': 8000, '3-4': 10000, '5-6': 12000, daily: 12000,
};

export const STEP_PRESETS = [6000, 8000, 10000, 12000];

/** kcal in a kg of body weight change (fat tissue), the usual rule of thumb. */
const KCAL_PER_KG = 7700;

/** Paces offered for each goal, kg per week. */
export const PACES: Record<'lose' | 'gain', number[]> = {
  lose: [0, -0.25, -0.5, -0.75],
  gain: [0, 0.15, 0.3],
};

export const paceOptionsFor = (goal?: string | null) => (goal === 'gain_muscle' ? PACES.gain : PACES.lose);

export function defaultPace(goal?: string | null): number {
  if (goal === 'gain_muscle') return 0.15;
  if (goal === 'lose_fat') return -0.25;
  if (goal === 'lose_weight') return -0.5;
  return 0;
}

/** Calories per day for a weekly pace: −0.5 kg/week → −550 kcal/day. */
export const paceToDailyKcal = (pace: number) => Math.round((pace * KCAL_PER_KG) / 7 / 10) * 10;

/** Lowest daily calories we suggest without a clinician's guidance. */
export function calorieFloor(gender?: string | null): number {
  if (gender === 'male') return 1500;
  if (gender === 'female') return 1200;
  return 1350;
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};

export interface CalorieBreakdown {
  bmr: number;
  multiplier: number;
  tdee: number;
  delta: number;
  /** Before the safety floor. */
  raw: number;
  /** What the plan uses. */
  calories: number;
  /** Raised to the safety floor. */
  floored: boolean;
}

/** Recommended calories, or null when height / weight / age are missing. */
export function recommendCalories(p: BodyProfile, pace: number): CalorieBreakdown | null {
  const weight = num(p.weight);
  const height = num(p.height);
  const age = num(p.age);
  if (!weight || !height || !age) return null;
  const male = 10 * weight + 6.25 * height - 5 * age + 5;
  const female = 10 * weight + 6.25 * height - 5 * age - 161;
  const bmr = p.gender === 'male' ? male : p.gender === 'female' ? female : (male + female) / 2;
  const multiplier = ACTIVITY_MULTIPLIER[p.exerciseFrequency ?? ''] ?? 1.375;
  const tdee = bmr * multiplier;
  const delta = paceToDailyKcal(pace);
  const raw = Math.round((tdee + delta) / 10) * 10;
  const floor = calorieFloor(p.gender);
  return {
    bmr: Math.round(bmr),
    multiplier,
    tdee: Math.round(tdee),
    delta,
    raw,
    calories: Math.max(raw, floor),
    floored: raw < floor,
  };
}

/** The daily calorie goal the settings produce (2000 when nothing is known). */
export function baseCalories(p: BodyProfile, s: GoalSettings): number {
  if (s.calorieMode === 'custom' && s.calories > 0) return Math.round(s.calories);
  return recommendCalories(p, s.pace)?.calories ?? (s.calories > 0 ? Math.round(s.calories) : 2000);
}

/** Extra calories on a training day, from how long the session is (≈5 kcal/min). */
export function trainingBonusKcal(minutes?: number): number {
  const m = minutes && minutes > 0 ? minutes : 45;
  return Math.min(350, Math.max(100, Math.round((m * 5) / 50) * 50));
}

/** Protein per kg of body weight for each goal. */
export function proteinPerKg(goal?: string | null): number {
  if (goal === 'gain_muscle') return 2.0;
  if (goal === 'lose_fat') return 1.8;
  return 1.6;
}

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  /** g/kg used for protein, or null when it came from the calorie split. */
  proteinPerKg: number | null;
}

/**
 * Protein from body weight (capped at 40% of calories), fat at 25% of
 * calories (at least 0.6 g/kg), carbs get the rest. Without a weight it falls
 * back to a 30/45/25 split.
 */
export function macroTargetsFor(calories: number, p?: BodyProfile | null): Macros {
  const kcal = Math.max(0, calories);
  const weight = num(p?.weight);
  if (!weight) {
    return {
      protein: Math.round((kcal * 0.3) / 4),
      carbs: Math.round((kcal * 0.45) / 4),
      fat: Math.round((kcal * 0.25) / 9),
      proteinPerKg: null,
    };
  }
  const perKg = proteinPerKg(p?.goal);
  const protein = Math.round(Math.min(weight * perKg, (kcal * 0.4) / 4));
  const fat = Math.round(Math.max((kcal * 0.25) / 9, weight * 0.6));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat, proteinPerKg: perKg };
}

/** Average of the days with steps, ignoring obviously-not-worn days (<500). */
export function averageSteps(daily: number[]): number | null {
  const days = daily.filter((n) => n >= 500);
  if (days.length < 5) return null;
  return days.reduce((a, b) => a + b, 0) / days.length;
}

/** "Keep up with me": a bit above the recent average, rounded to 500. */
export function adaptiveStepGoal(daily: number[]): number | null {
  const avg = averageSteps(daily);
  if (avg === null) return null;
  return Math.min(20000, Math.max(4000, Math.round((avg + 500) / 500) * 500));
}

export function defaultSettings(p: BodyProfile): GoalSettings {
  return {
    v: 1,
    calorieMode: 'auto',
    calories: 0,
    pace: defaultPace(p.goal),
    trainingBonus: true,
    stepMode: 'fixed',
    steps: RECOMMENDED_STEPS[p.exerciseFrequency ?? ''] ?? 8000,
    updatedAt: new Date().toISOString(),
  };
}

/** Cleans settings that came from storage or the server. */
export function normalizeSettings(input: unknown): GoalSettings | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as Record<string, unknown>;
  const pace = num(s.pace);
  const calories = Math.round(num(s.calories));
  const steps = Math.round(num(s.steps));
  return {
    v: 1,
    calorieMode: s.calorieMode === 'custom' ? 'custom' : 'auto',
    calories: calories >= 800 && calories <= 6000 ? calories : 0,
    pace: Math.min(1, Math.max(-1, pace)),
    trainingBonus: s.trainingBonus !== false,
    stepMode: s.stepMode === 'adaptive' ? 'adaptive' : 'fixed',
    steps: steps >= 1000 && steps <= 50000 ? steps : 8000,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : new Date(0).toISOString(),
  };
}
