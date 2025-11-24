import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
// 暂时禁用API调用，等待后端就绪
// import { fetchTodayData, fetchWeeklyData } from '@/services/api';

export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose_weight' | 'lose_fat' | 'gain_muscle';
export type ExerciseFrequency = 'never' | 'rarely' | '1-2' | '3-4' | '5-6' | 'daily';
export type ExpectedTimeframe = '1_month' | '2-3_months' | '4-6_months' | '6-12_months' | '1_year_plus';

interface User {
  id: string;
  name: string;
  email: string;
  // 问卷调查数据
  height?: number; // 身高 (cm)
  age?: number; // 年龄
  weight?: number; // 体重 (kg)
  gender?: Gender; // 性别
  goal?: Goal; // 目标
  exerciseFrequency?: ExerciseFrequency; // 运动频率
  expectedTimeframe?: ExpectedTimeframe; // 期望见效时间
  hasCompletedOnboarding?: boolean; // 是否完成问卷调查
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

interface WeeklyData {
  calories: number[];
  protein: number[];
  carbs: number[];
  fat: number[];
}

type LanguageCode = 'zh-CN' | 'en-US' | 'zh-TW' | 'ja-JP' | 'ko-KR';
export type ThemeMode = 'light' | 'dark' | 'auto';

interface StoreState {
  user: User | null;
  todayCalories: number;
  todayMeals: Meal[];
  weeklyData: WeeklyData;
  language: LanguageCode;
  hasSelectedLanguage?: boolean; // 标记是否已选择语言
  themeMode: ThemeMode; // 主题模式
  setUser: (user: User | null) => void;
  setLanguage: (language: LanguageCode) => void;
  setHasSelectedLanguage: (hasSelected: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  refreshToday: () => Promise<void>;
  fetchWeeklyData: () => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
  user: null,
  todayCalories: 0,
  todayMeals: [],
  weeklyData: {
    calories: [],
    protein: [],
    carbs: [],
    fat: [],
  },
      language: 'zh-CN',
      hasSelectedLanguage: false,
      themeMode: 'auto',
  setUser: (user) => set({ user }),
      setLanguage: (language) => set({ language, hasSelectedLanguage: true }),
      setHasSelectedLanguage: (hasSelected) => set({ hasSelectedLanguage: hasSelected }),
      setThemeMode: (mode) => set({ themeMode: mode }),
  refreshToday: async () => {
        // 暂时禁用API调用，等待后端就绪
        // try {
        //   const data = await fetchTodayData();
        //   set({
        //     todayCalories: data.totalCalories,
        //     todayMeals: data.meals,
        //   });
        // } catch (error) {
        //   console.error('Failed to fetch today data:', error);
        // }
  },
  fetchWeeklyData: async () => {
        // 暂时禁用API调用，等待后端就绪
        // try {
        //   const data = await fetchWeeklyData();
        //   set({ weeklyData: data });
        // } catch (error) {
        //   console.error('Failed to fetch weekly data:', error);
        // }
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
      }),
    }
  )
);


