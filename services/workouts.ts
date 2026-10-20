import { api } from './client';

export type Progress = 'none' | 'weight';

export interface PlanExercise {
  id: string;
  sets: number;
  reps: number;
  /** kg; 0 = bodyweight */
  weight: number;
  progress: Progress;
  /** kg added after a session where every planned set was done */
  step: number;
}

export type DayKind = 'fullA' | 'fullB' | 'upper' | 'lower' | 'push' | 'pull' | 'legs';

export interface PlanDay {
  /** What the user typed, or the AI's name in the language of the request. */
  name?: string;
  /** Set by AI/template plans; shown in the current app language. Cleared when the user renames the day. */
  kind?: DayKind;
  exercises: PlanExercise[];
}

/** JS weekday ("0" = Sunday … "6") → day. Missing weekdays are rest days. */
export type PlanDays = Record<string, PlanDay>;

export interface SessionSummary {
  id: string;
  dayKey: string;
  planDay: number | null;
  title: string | null;
  startedAt: string;
  finishedAt: string;
  durationSec: number;
  volume: number;
  setCount: number;
  prCount: number;
}

export interface SetResult {
  weight: number;
  reps: number;
}

export interface WorkoutsData {
  plan: PlanDays;
  sessions: SessionSummary[];
}

export interface ExerciseHistory {
  last: Record<string, SetResult[]>;
  best: Record<string, SetResult>;
}

export interface FinishResult {
  session: { id: string; dayKey: string; durationSec: number; volume: number; setCount: number; prCount: number };
  prs: { exerciseId: string; weight: number; reps: number; previous: SetResult | null }[];
  bumps: { exerciseId: string; from: number; to: number }[];
}

export const fetchWorkouts = async (): Promise<WorkoutsData> => {
  const res = await api.get<WorkoutsData>('/api/workouts');
  return res.data;
};

export const savePlan = async (days: PlanDays): Promise<PlanDays> => {
  const res = await api.put<{ plan: PlanDays }>('/api/workouts/plan', { days });
  return res.data.plan;
};

export const fetchExerciseHistory = async (ids: string[]): Promise<ExerciseHistory> => {
  if (ids.length === 0) return { last: {}, best: {} };
  const res = await api.get<ExerciseHistory>(`/api/workouts/history?ids=${encodeURIComponent(ids.join(','))}`);
  return res.data;
};

export const finishWorkout = async (body: {
  id: string;
  startedAt: string;
  finishedAt: string;
  dayKey: string;
  planDay: number | null;
  title: string | null;
  sets: { exerciseId: string; weight: number; reps: number }[];
}): Promise<FinishResult> => {
  const res = await api.post<FinishResult>('/api/workouts/sessions', body);
  return res.data;
};

export const deleteWorkout = async (id: string): Promise<void> => {
  await api.delete(`/api/workouts/sessions?id=${encodeURIComponent(id)}`);
};
