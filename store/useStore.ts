import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
// 暂时禁用API调用，等待后端就绪
// import { fetchTodayData, fetchWeeklyData } from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
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

interface StoreState {
  user: User | null;
  todayCalories: number;
  todayMeals: Meal[];
  weeklyData: WeeklyData;
  language: LanguageCode;
  setUser: (user: User | null) => void;
  setLanguage: (language: LanguageCode) => void;
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
  setUser: (user) => set({ user }),
      setLanguage: (language) => set({ language }),
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
      partialize: (state) => ({ language: state.language, user: state.user }),
    }
  )
);


