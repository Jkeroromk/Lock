import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceLanguage } from '@/lib/deviceLanguage';
import { fetchTodayData, fetchWeeklyData } from '@/services/api';

export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose_weight' | 'lose_fat' | 'gain_muscle';
export type ExerciseFrequency = 'never' | 'rarely' | '1-2' | '3-4' | '5-6' | 'daily';
export type ExpectedTimeframe = '1_month' | '2-3_months' | '4-6_months' | '6-12_months' | '1_year_plus';
export type PlanTier = 'FREE' | 'PRO' | 'MAX';

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
  dailyCalorieGoal: number;
  dailyStepGoal: number;
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
      pendingInviteCode: null,
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
      setUser: (user) => set({ user }),
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
