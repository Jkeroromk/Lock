// Training tab: plan validation and personal-record rules shared by the
// /api/workouts routes. Exercise ids come from the app's catalog; the server
// only checks their shape.

export const EXERCISE_ID = /^[a-z0-9_]{2,40}$/;
export const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type Progress = 'none' | 'weight';

export interface PlanExercise {
  id: string;
  sets: number;
  reps: number;
  weight: number; // kg, 0 = bodyweight
  progress: Progress;
  step: number; // kg added after a session where every set was done
}

/** Language-neutral day types; the app shows them in the user's language. Mirrors lib/plans in the app. */
export const DAY_KINDS = ['fullA', 'fullB', 'upper', 'lower', 'push', 'pull', 'legs'] as const;
export type DayKind = (typeof DAY_KINDS)[number];
export const isDayKind = (v: unknown): v is DayKind => typeof v === 'string' && (DAY_KINDS as readonly string[]).includes(v);

export interface PlanDay {
  /** What the user typed, or the AI's name in the language of the request. */
  name?: string;
  /** Set by AI/template plans; rendered localized. Cleared when the user renames the day. */
  kind?: DayKind;
  exercises: PlanExercise[];
}

/** JS weekday ("0" = Sunday) → day. Missing weekdays are rest days. */
export type PlanDays = Record<string, PlanDay>;

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
};

/** Rounds to 0.01 kg (the column's precision), so pound values survive the round trip. */
export const roundKg = (kg: number) => Math.round(kg * 100) / 100;

/** Cleans a plan sent by the app; returns null when it isn't a plan at all. */
export function normalizePlan(input: unknown): PlanDays | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out: PlanDays = {};
  for (const [key, raw] of Object.entries(input as Record<string, any>)) {
    if (!/^[0-6]$/.test(key) || !raw || typeof raw !== 'object') continue;
    const list = Array.isArray(raw.exercises) ? raw.exercises : [];
    const exercises: PlanExercise[] = [];
    for (const e of list.slice(0, 20)) {
      if (!e || typeof e.id !== 'string' || !EXERCISE_ID.test(e.id)) continue;
      exercises.push({
        id: e.id,
        sets: Math.round(clamp(e.sets, 1, 20, 3)),
        reps: Math.round(clamp(e.reps, 1, 100, 10)),
        weight: roundKg(clamp(e.weight, 0, 1000, 0)),
        progress: e.progress === 'weight' ? 'weight' : 'none',
        step: roundKg(clamp(e.step, 0.1, 20, 2.5)),
      });
    }
    const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 24) : '';
    if (exercises.length === 0 && !name) continue;
    out[key] = { ...(name ? { name } : {}), ...(isDayKind(raw.kind) ? { kind: raw.kind } : {}), exercises };
  }
  return out;
}

export interface SetInput {
  exerciseId: string;
  weight: number;
  reps: number;
}

/** Cleans the completed sets of a finished workout. */
export function normalizeSets(input: unknown): SetInput[] {
  if (!Array.isArray(input)) return [];
  const out: SetInput[] = [];
  for (const s of input.slice(0, 300)) {
    if (!s || typeof s.exerciseId !== 'string' || !EXERCISE_ID.test(s.exerciseId)) continue;
    const reps = Math.round(clamp(s.reps, 0, 1000, 0));
    if (reps < 1) continue;
    out.push({ exerciseId: s.exerciseId, weight: roundKg(clamp(s.weight, 0, 1000, 0)), reps });
  }
  return out;
}

export interface Best {
  weight: number;
  reps: number;
}

/**
 * A set beats the best when it's heavier, or the same weight for more reps.
 * (For bodyweight exercises the weight is 0, so only reps count.)
 */
export function beats(set: Best, best: Best | null | undefined): boolean {
  if (!best) return false; // the first time isn't a record
  if (set.weight > best.weight) return true;
  return set.weight === best.weight && set.reps > best.reps;
}


/** Weekday (0 = Sunday) of a local YYYY-MM-DD. */
export function weekdayOf(dayKey: string): number {
  return new Date(`${dayKey}T12:00:00Z`).getUTCDay();
}
