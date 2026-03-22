import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchTodayData, fetchWeeklyData } from '@/services/api';

export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose_weight' | 'lose_fat' | 'gain_muscle';
export type ExerciseFrequency = 'never' | 'rarely' | '1-2' | '3-4' | '5-6' | 'daily';
export type ExpectedTimeframe = '1_month' | '2-3_months' | '4-6_months' | '6-12_months' | '1_year_plus';

interface User {
  id: string;
  name: string;
  email: string;
  height?: number;
  age?: number;
  weight?: number;
  gender?: Gender;
  goal?: Goal;
  exerciseFrequency?: ExerciseFrequency;
  expectedTimeframe?: ExpectedTimeframe;
  hasCompletedOnboarding?: boolean;
  isAnonymous?: boolean;
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
  weeklyDays: WeeklyDay[];
  language: LanguageCode;
  hasSelectedLanguage?: boolean;
  themeMode: ThemeMode;
  dailyCalorieGoal: number;
  dailyStepGoal: number;
  setUser: (user: User | null) => void;
  setLanguage: (language: LanguageCode) => void;
  setHasSelectedLanguage: (hasSelected: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setDailyCalorieGoal: (goal: number) => void;
  setDailyStepGoal: (goal: number) => void;
  refreshToday: () => Promise<void>;
  fetchWeeklyData: () => Promise<void>;
  clearSession: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      user: null,
      todayCalories: 0,
      todayMeals: [],
      weeklyDays: [],
      language: 'zh-CN',
      hasSelectedLanguage: false,
      themeMode: 'auto',
      dailyCalorieGoal: 2000,
      dailyStepGoal: 10000,
      setUser: (user) => set({ user }),
      setLanguage: (language) => set({ language, hasSelectedLanguage: true }),
      setHasSelectedLanguage: (hasSelected) => set({ hasSelectedLanguage: hasSelected }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setDailyCalorieGoal: (goal) => set({ dailyCalorieGoal: goal }),
      setDailyStepGoal: (goal) => set({ dailyStepGoal: goal }),
      refreshToday: async () => {
        try {
          const data = await fetchTodayData();
          set({
            todayCalories: data.totalCalories,
            todayMeals: data.meals,
          });
        } catch (error) {
          console.error('Failed to fetch today data:', error);
        }
      },
      fetchWeeklyData: async () => {
        try {
          const data = await fetchWeeklyData();
          set({ weeklyDays: data });
        } catch (error) {
          console.error('Failed to fetch weekly data:', error);
        }
      },
      clearSession: () => {
        set({
          user: null,
          todayCalories: 0,
          todayMeals: [],
          weeklyDays: [],
          hasSelectedLanguage: false,
        });
      },
    }),
    {
      name: 'lock-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        user: state.user,
        hasSelectedLanguage: state.hasSelectedLanguage,
        themeMode: state.themeMode,
        dailyCalorieGoal: state.dailyCalorieGoal,
        dailyStepGoal: state.dailyStepGoal,
      }),
    }
  )
);
