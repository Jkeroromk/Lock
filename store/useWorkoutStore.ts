import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateKey, useStore, type WeightUnit } from '@/store/useStore';
import { toKg, fmtWeight } from '@/lib/units';
import {
  fetchWorkouts, finishWorkout, fetchExerciseHistory,
  type PlanDays, type PlanDay, type SessionSummary, type ExerciseHistory, type FinishResult, type SetResult,
} from '@/services/workouts';

/** One set row while training. Inputs stay strings so "77." can be typed. */
export interface ActiveSet {
  weight: string;
  reps: string;
  done: boolean;
}

export interface ActiveExercise {
  id: string;
  sets: ActiveSet[];
}

export interface ActiveWorkout {
  id: string;
  uid: string;
  startedAt: string;
  dayKey: string;
  /** Weekday whose plan this follows (progression applies to it); null = free workout. */
  planDay: number | null;
  title: string | null;
  current: number;
  exercises: ActiveExercise[];
  /** Unit the weight boxes are typed in (fixed for the workout). */
  unit?: WeightUnit;
  /** Epoch ms when the rest timer ends; null when not resting. */
  restEndsAt: number | null;
  restTotal: number;
}

export interface LastResult {
  result: FinishResult;
  title: string | null;
  plannedSets: number;
}

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export const num = (s: string) => {
  const v = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
};

/** Formats kg without trailing zeros: 80, 77.5, 22.25. */
export const fmtKg = (kg: number) => String(Math.round(kg * 100) / 100);

/** A typed weight box → kg, at the 0.01 kg precision the server keeps. */
export const boxKg = (value: string, unit: WeightUnit | undefined) => Math.round(toKg(num(value), unit ?? 'kg') * 100) / 100;

function setsFromPlan(day: PlanDay, unit: WeightUnit): ActiveExercise[] {
  return day.exercises.map((e) => ({
    id: e.id,
    sets: Array.from({ length: e.sets }, () => ({ weight: e.weight > 0 ? fmtWeight(e.weight, unit) : '', reps: String(e.reps), done: false })),
  }));
}

interface WorkoutState {
  uid: string | null;
  plan: PlanDays;
  sessions: SessionSummary[];
  loaded: boolean;
  active: ActiveWorkout | null;
  restSec: number;
  history: ExerciseHistory;
  lastResult: LastResult | null;

  /** Drops another account's cached data. */
  ensureUser: (uid: string) => void;
  load: () => Promise<void>;
  setPlan: (plan: PlanDays) => void;
  loadHistory: (ids: string[]) => Promise<void>;

  start: (opts: { planDay: number | null; title: string | null; day?: PlanDay }) => void;
  setCurrent: (index: number) => void;
  updateSet: (ei: number, si: number, patch: Partial<ActiveSet>) => void;
  /** Ticks a set off (or back on). Returns the record it beat, if any. */
  toggleSet: (ei: number, si: number) => { pr: SetResult | null };
  addSet: (ei: number) => void;
  removeSet: (ei: number, si: number) => void;
  addExercises: (ids: string[]) => void;
  removeExercise: (ei: number) => void;
  startRest: (sec?: number) => void;
  adjustRest: (deltaSec: number) => void;
  skipRest: () => void;
  discard: () => void;
  finish: () => Promise<LastResult>;
  removeSession: (id: string) => void;
}

/** Best of: the record before today and the sets already done today. */
function currentBest(state: WorkoutState, exerciseId: string, skip?: { ei: number; si: number }): SetResult | null {
  let best: SetResult | null = state.history.best[exerciseId] ?? null;
  state.active?.exercises.forEach((ex, ei) => {
    if (ex.id !== exerciseId) return;
    ex.sets.forEach((s, si) => {
      if (!s.done || (skip && skip.ei === ei && skip.si === si)) return;
      const cand = { weight: boxKg(s.weight, state.active?.unit), reps: Math.round(num(s.reps)) };
      if (!best || cand.weight > best.weight || (cand.weight === best.weight && cand.reps > best.reps)) best = cand;
    });
  });
  return best;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => {
      const patchActive = (fn: (a: ActiveWorkout) => ActiveWorkout) => {
        const a = get().active;
        if (a) set({ active: fn(a) });
      };
      const mapExercise = (a: ActiveWorkout, ei: number, fn: (e: ActiveExercise) => ActiveExercise) => ({
        ...a,
        exercises: a.exercises.map((e, i) => (i === ei ? fn(e) : e)),
      });

      return {
        uid: null,
        plan: {},
        sessions: [],
        loaded: false,
        active: null,
        restSec: 90,
        history: { last: {}, best: {} },
        lastResult: null,

        ensureUser: (uid) => {
          if (get().uid === uid) return;
          set({ uid, plan: {}, sessions: [], loaded: false, active: null, history: { last: {}, best: {} }, lastResult: null });
        },

        load: async () => {
          const data = await fetchWorkouts();
          set({ plan: data.plan ?? {}, sessions: data.sessions ?? [], loaded: true });
        },

        setPlan: (plan) => set({ plan }),

        loadHistory: async (ids) => {
          const unique = [...new Set(ids)];
          if (!unique.length) return;
          try {
            const h = await fetchExerciseHistory(unique);
            const cur = get().history;
            set({ history: { last: { ...cur.last, ...h.last }, best: { ...cur.best, ...h.best } } });
          } catch {}
        },

        start: ({ planDay, title, day }) => {
          const uid = get().uid ?? '';
          const unit = useStore.getState().weightUnit ?? 'kg';
          set({
            active: {
              id: uuid(),
              uid,
              startedAt: new Date().toISOString(),
              dayKey: localDateKey(),
              planDay,
              title,
              current: 0,
              unit,
              exercises: day ? setsFromPlan(day, unit) : [],
              restEndsAt: null,
              restTotal: get().restSec,
            },
          });
        },

        setCurrent: (index) => patchActive((a) => ({ ...a, current: Math.max(0, Math.min(index, a.exercises.length - 1)) })),

        updateSet: (ei, si, p) =>
          patchActive((a) => mapExercise(a, ei, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === si ? { ...s, ...p } : s)) }))),

        toggleSet: (ei, si) => {
          const state = get();
          const a = state.active;
          const s = a?.exercises[ei]?.sets[si];
          if (!a || !s) return { pr: null };
          const done = !s.done;
          let pr: SetResult | null = null;
          if (done) {
            const cand = { weight: boxKg(s.weight, a.unit), reps: Math.round(num(s.reps)) };
            const best = currentBest(state, a.exercises[ei].id, { ei, si });
            // A record needs history to beat; the first time isn't one.
            if (cand.reps > 0 && best && (cand.weight > best.weight || (cand.weight === best.weight && cand.reps > best.reps))) pr = cand;
          }
          set({ active: mapExercise(a, ei, (e) => ({ ...e, sets: e.sets.map((x, i) => (i === si ? { ...x, done } : x)) })) });
          return { pr };
        },

        addSet: (ei) =>
          patchActive((a) => mapExercise(a, ei, (e) => {
            const prev = e.sets[e.sets.length - 1];
            return { ...e, sets: [...e.sets, { weight: prev?.weight ?? '', reps: prev?.reps ?? '', done: false }] };
          })),

        removeSet: (ei, si) => patchActive((a) => mapExercise(a, ei, (e) => ({ ...e, sets: e.sets.filter((_, i) => i !== si) }))),

        addExercises: (ids) =>
          patchActive((a) => {
            const added = ids.map((id) => ({ id, sets: [{ weight: '', reps: '', done: false }] }));
            const exercises = [...a.exercises, ...added];
            // Jump to the first new one so it can be filled in right away.
            return { ...a, exercises, current: added.length ? a.exercises.length : a.current };
          }),

        removeExercise: (ei) =>
          patchActive((a) => {
            const exercises = a.exercises.filter((_, i) => i !== ei);
            return { ...a, exercises, current: Math.max(0, Math.min(a.current, exercises.length - 1)) };
          }),

        startRest: (sec) => {
          const total = sec ?? get().restSec;
          patchActive((a) => ({ ...a, restEndsAt: Date.now() + total * 1000, restTotal: total }));
        },

        adjustRest: (delta) => {
          const a = get().active;
          if (!a?.restEndsAt) return;
          const remaining = Math.max(0, a.restEndsAt - Date.now());
          const nextRemaining = Math.max(0, remaining + delta * 1000);
          const total = Math.max(15, Math.min(600, a.restTotal + delta));
          // The adjusted length becomes the default for the next rest.
          set({ restSec: total, active: { ...a, restEndsAt: nextRemaining > 0 ? Date.now() + nextRemaining : null, restTotal: total } });
        },

        skipRest: () => patchActive((a) => ({ ...a, restEndsAt: null })),

        discard: () => set({ active: null }),

        finish: async () => {
          const a = get().active;
          if (!a) throw new Error('No workout');
          const sets = a.exercises.flatMap((e) =>
            e.sets.filter((s) => s.done && num(s.reps) >= 1).map((s) => ({ exerciseId: e.id, weight: boxKg(s.weight, a.unit), reps: Math.round(num(s.reps)) })));
          const result = await finishWorkout({
            id: a.id,
            startedAt: a.startedAt,
            finishedAt: new Date().toISOString(),
            dayKey: a.dayKey,
            planDay: a.planDay,
            title: a.title,
            sets,
          });
          const plannedSets = a.exercises.reduce((n, e) => n + e.sets.length, 0);
          const last: LastResult = { result, title: a.title, plannedSets };
          const summary: SessionSummary = {
            ...result.session,
            planDay: a.planDay,
            title: a.title,
            startedAt: a.startedAt,
            finishedAt: new Date().toISOString(),
          };
          // Bump the plan locally too, so the next workout starts heavier.
          let plan = get().plan;
          if (a.planDay !== null && result.bumps.length) {
            const key = String(a.planDay);
            const day = plan[key];
            if (day) {
              plan = {
                ...plan,
                [key]: {
                  ...day,
                  exercises: day.exercises.map((e) => {
                    const b = result.bumps.find((x) => x.exerciseId === e.id);
                    return b ? { ...e, weight: b.to } : e;
                  }),
                },
              };
            }
          }
          // New bests feed the next workout's record checks.
          const best = { ...get().history.best };
          sets.forEach((s) => {
            const b = best[s.exerciseId];
            if (!b || s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps)) best[s.exerciseId] = { weight: s.weight, reps: s.reps };
          });
          const lastSets: Record<string, SetResult[]> = {};
          sets.forEach((s) => (lastSets[s.exerciseId] ??= []).push({ weight: s.weight, reps: s.reps }));
          set({
            active: null,
            lastResult: last,
            plan,
            sessions: [summary, ...get().sessions.filter((x) => x.id !== summary.id)],
            history: { best, last: { ...get().history.last, ...lastSets } },
          });
          return last;
        },

        removeSession: (id) => set({ sessions: get().sessions.filter((s) => s.id !== id) }),
      };
    },
    {
      name: 'lock-workouts',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({ uid: s.uid, plan: s.plan, sessions: s.sessions, active: s.active, restSec: s.restSec }),
    }
  )
);

// ── Helpers ────────────────────────────────────────────────────────────────

/** The 7 days of the week containing `d`, Monday first. */
export function weekDays(d: Date = new Date()): Date[] {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const offset = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12));
}

export const daySets = (day?: PlanDay) => (day?.exercises ?? []).reduce((n, e) => n + e.sets, 0);

/** Rough length: a working set plus its rest is about 3 minutes. */
export const dayMinutes = (day?: PlanDay) => Math.max(10, Math.round((daySets(day) * 3) / 5) * 5);

/** Planned training days in a week. */
export const plannedDayCount = (plan: PlanDays) =>
  Object.values(plan).filter((d) => d && d.exercises.length > 0).length;
