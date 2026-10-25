import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceLanguage } from '@/lib/deviceLanguage';
import { fetchTodayData, fetchWeeklyData, updateProfile } from '@/services/api';
import { baseCalories, defaultSettings, normalizeSettings, type GoalSettings } from '@/lib/goals';

export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose_weight' | 'lose_fat' | 'gain_muscle';
export type ExerciseFrequency = 'never' | 'rarely' | '1-2' | '3-4' | '5-6' | 'daily';
export type ExpectedTimeframe = '1_month' | '2-3_months' | '4-6_months' | '6-12_months' | '1_year_plus';
export type PlanTier = 'FREE' | 'PRO' | 'MAX';
export type WeightUnit = 'kg' | 'lb';

interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  bio?: string;
  avatarEmoji?: string;
  avatarImage?: string;
  showGender?: boolean;
  height?: number;
  age?: number;
  weight?: number;
  gender?: Gender;
  goal?: Goal;
  exerciseFrequency?: ExerciseFrequency;
  expectedTimeframe?: ExpectedTimeframe;
  hasCompletedOnboarding?: boolean;
  isAnonymous?: boolean;
  plan?: PlanTier;
  streak?: number;
  inviteCode?: string;
  friendCode?: string;
  /** Account creation time (ISO) — drives the free first-week trial. */
  createdAt?: string;
  /** Extra AI scans earned from invites. */
  bonusAiCalls?: number;
  /** Team account: no AI limits (server decides). */
  isAdmin?: boolean;
}

interface Meal {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string;
  created_at: string;
}

export interface WeeklyDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type LanguageCode = 'zh-CN' | 'en-US' | 'zh-TW' | 'ja-JP' | 'ko-KR';
export type ThemeMode = 'light' | 'dark' | 'auto';

interface StoreState {
  user: User | null;
  todayCalories: number;
  todayMeals: Meal[];
  /** Local YYYY-MM-DD the today* fields belong to (persisted, so launches can show them instantly). */
  todayDate: string | null;
  weeklyDays: WeeklyDay[];
  language: LanguageCode;
  hasSelectedLanguage?: boolean;
  themeMode: ThemeMode;
  /** Base daily calorie goal (no training-day bonus), derived from goalSettings. */
  dailyCalorieGoal: number;
  /** Daily step goal in effect (fixed, or the adaptive one), derived from goalSettings. */
  dailyStepGoal: number;
  /** How the goals are worked out; synced to the server. Null until set up. */
  goalSettings: GoalSettings | null;
  /** The adaptive step goal and the week (Monday's date) it was worked out for. */
  adaptiveSteps: { goal: number; week: string } | null;
  /** Saves new settings, recomputes the goals and uploads them (unless sync is false). */
  setGoalSettings: (settings: GoalSettings, opts?: { sync?: boolean }) => void;
  setAdaptiveSteps: (value: { goal: number; week: string } | null) => void;
  /** A new body weight was logged: keep the profile (and auto calories) in step. */
  noteWeight: (kg: number) => void;
  /** Takes the server's copy when it's newer; sets things up for accounts without one. */
  applyServerGoals: (server: unknown) => void;
  /** Display unit for body and lifting weights; data is always stored in kg. */
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  /** Invite code from a lock://invite/… link, waiting for the onboarding invite step. */
  pendingInviteCode: string | null;
  setPendingInviteCode: (code: string | null) => void;
  setUser: (user: User | null) => void;
  setPlan: (plan: PlanTier) => void;
  setLanguage: (language: LanguageCode) => void;
  setHasSelectedLanguage: (hasSelected: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setDailyCalorieGoal: (goal: number) => void;
  /** Gently flag going over the daily calorie goal (Today, Log, tab bar). */
  calorieWarnings: boolean;
  setCalorieWarnings: (on: boolean) => void;
  setDailyStepGoal: (goal: number) => void;
  removeMealOptimistic: (mealId: string) => void;
  refreshToday: () => Promise<void>;
  fetchWeeklyData: () => Promise<void>;
  clearSession: () => void;
}

/** Goals worked out from the settings (and profile, for auto calories). */
function derivedGoals(
  user: Partial<User> | null,
  settings: GoalSettings,
  adaptive: { goal: number } | null,
): { dailyCalorieGoal: number; dailyStepGoal: number } {
  return {
    dailyCalorieGoal: baseCalories(user ?? {}, settings),
    dailyStepGoal: settings.stepMode === 'adaptive' && adaptive?.goal ? adaptive.goal : settings.steps,
  };
}

/** Uploads goal settings; a failure is fine, the next launch tries again. */
function uploadGoals(settings: GoalSettings) {
  updateProfile({ goalSettings: settings } as any).catch(() => {});
}

/** Local calendar day, e.g. "2026-10-11". */
export function localDateKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      user: null,
      todayCalories: 0,
      todayMeals: [],
      todayDate: null,
      weeklyDays: [],
      // First launch follows the phone's language; the user can change it.
      language: deviceLanguage(),
      hasSelectedLanguage: false,
      themeMode: 'auto',
      dailyCalorieGoal: 2000,
      calorieWarnings: true,
      dailyStepGoal: 10000,
      weightUnit: 'kg',
      setWeightUnit: (unit) => set({ weightUnit: unit }),
      pendingInviteCode: null,
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
      // Calories in auto mode follow the profile (weight, age, activity…).
      setUser: (user) => set((state) => ({
        user,
        ...(state.goalSettings && user ? derivedGoals(user, state.goalSettings, state.adaptiveSteps) : {}),
      })),
      goalSettings: null,
      adaptiveSteps: null,
      setGoalSettings: (settings, opts) => {
        const state = useStore.getState();
        const next = { ...settings, updatedAt: new Date().toISOString() };
        set({ goalSettings: next, ...derivedGoals(state.user, next, state.adaptiveSteps) });
        if (opts?.sync !== false) uploadGoals(next);
      },
      noteWeight: (kg) => {
        const me = useStore.getState().user;
        if (me) useStore.getState().setUser({ ...me, weight: kg });
      },
      setAdaptiveSteps: (value) => set((state) => ({
        adaptiveSteps: value,
        ...(state.goalSettings ? derivedGoals(state.user, state.goalSettings, value) : {}),
      })),
      applyServerGoals: (server) => {
        const state = useStore.getState();
        const remote = normalizeSettings(server);
        const local = state.goalSettings;
        if (remote && (!local || remote.updatedAt > local.updatedAt)) {
          set({ goalSettings: remote, ...derivedGoals(state.user, remote, state.adaptiveSteps) });
          return;
        }
        if (local) {
          // This device has newer settings than the server: send them up.
          if (!remote || local.updatedAt > remote.updatedAt) uploadGoals(local);
          return;
        }
        // First time with goal settings: keep numbers the user typed before
        // (anything but the old 2000 / 10000 defaults), work out the rest.
        const base = defaultSettings(state.user ?? {});
        const migrated: GoalSettings = {
          ...base,
          ...(state.dailyCalorieGoal && state.dailyCalorieGoal !== 2000 ? { calorieMode: 'custom' as const, calories: state.dailyCalorieGoal } : {}),
          ...(state.dailyStepGoal && state.dailyStepGoal !== 10000 ? { steps: state.dailyStepGoal } : {}),
        };
        set({ goalSettings: migrated, ...derivedGoals(state.user, migrated, state.adaptiveSteps) });
        uploadGoals(migrated);
      },
      setPlan: (plan) => set((state) => ({
        user: state.user ? { ...state.user, plan } : state.user,
      })),
      setLanguage: (language) => set({ language, hasSelectedLanguage: true }),
      setHasSelectedLanguage: (hasSelected) => set({ hasSelectedLanguage: hasSelected }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setDailyCalorieGoal: (goal) => set({ dailyCalorieGoal: goal }),
      setCalorieWarnings: (on) => set({ calorieWarnings: on }),
      setDailyStepGoal: (goal) => set({ dailyStepGoal: goal }),
      removeMealOptimistic: (mealId) => set((state) => {
        const updatedMeals = state.todayMeals.filter((m) => m.id !== mealId);
        const updatedCalories = updatedMeals.reduce((sum, m) => sum + m.calories, 0);
        return { todayMeals: updatedMeals, todayCalories: updatedCalories };
      }),
      refreshToday: async () => {
        try {
          const data = await fetchTodayData();
          set({
            todayCalories: data.totalCalories,
            todayMeals: data.meals,
            todayDate: localDateKey(),
          });
        } catch {}
      },
      fetchWeeklyData: async () => {
        try {
          const data = await fetchWeeklyData();
          set({ weeklyDays: data });
        } catch {}
      },
      clearSession: () => {
        set({
          user: null,
          todayCalories: 0,
          todayMeals: [],
          todayDate: null,
          weeklyDays: [],
          hasSelectedLanguage: false,
          // Goals belong to the account: the next sign-in loads its own.
          goalSettings: null,
          adaptiveSteps: null,
          dailyCalorieGoal: 2000,
          dailyStepGoal: 10000,
        });
      },
    }),
    {
      name: 'lock-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // v2: the default language follows the phone. Installs where the user
      // never explicitly picked a language switch to the phone's language.
      version: 2,
      migrate: (persisted: any, version) => {
        if (version < 2 && persisted && !persisted.hasSelectedLanguage) {
          persisted.language = deviceLanguage();
        }
        return persisted;
      },
      partialize: (state) => ({
        language: state.language,
        user: state.user,
        hasSelectedLanguage: state.hasSelectedLanguage,
        themeMode: state.themeMode,
        dailyCalorieGoal: state.dailyCalorieGoal,
        calorieWarnings: state.calorieWarnings,
        dailyStepGoal: state.dailyStepGoal,
        goalSettings: state.goalSettings,
        adaptiveSteps: state.adaptiveSteps,
        weightUnit: state.weightUnit,
        todayCalories: state.todayCalories,
        todayMeals: state.todayMeals,
        todayDate: state.todayDate,
        pendingInviteCode: state.pendingInviteCode,
      }),
    }
  )
);

/** True once the persisted store has been read from disk. */
export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return useStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
