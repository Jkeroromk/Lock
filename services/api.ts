import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { useStore } from '@/store/useStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-nextjs-app.vercel.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const getToken = useStore.getState().getToken;
  if (getToken) {
    const token = await getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export interface FoodAnalysis {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export interface MealData {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string;
}

export interface WeeklyDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MonthlyData {
  [dateString: string]: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const analyzeFoodImage = async (imageUri: string): Promise<FoodAnalysis> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64' as any,
    });

    const response = await api.post<FoodAnalysis>('/api/vision', {
      image: base64,
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '分析图片失败');
  }
};

export const logMeal = async (meal: MealData): Promise<void> => {
  try {
    await api.post('/api/log-meal', meal);
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '保存餐食失败');
  }
};

export const fetchTodayData = async (): Promise<{ totalCalories: number; meals: any[] }> => {
  try {
    const response = await api.get('/api/today');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取今日数据失败');
  }
};

export const fetchWeeklyData = async (): Promise<WeeklyDay[]> => {
  try {
    const response = await api.get<WeeklyDay[]>('/api/weekly');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取周数据失败');
  }
};

export const fetchMonthlyData = async (year: number, month: number): Promise<MonthlyData> => {
  try {
    const response = await api.get<MonthlyData>('/api/monthly', {
      params: { year, month },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取月度数据失败');
  }
};

export interface UserProfile {
  id: string;
  email?: string | null;
  name?: string | null;
  height?: number | null;
  age?: number | null;
  weight?: number | null;
  gender?: string | null;
  goal?: string | null;
  exerciseFrequency?: string | null;
  expectedTimeframe?: string | null;
  hasCompletedOnboarding: boolean;
}

export const fetchProfile = async (): Promise<UserProfile> => {
  const response = await api.get<UserProfile>('/api/auth/profile');
  return response.data;
};

export const updateProfile = async (data: Partial<Omit<UserProfile, 'id'>>): Promise<UserProfile> => {
  const response = await api.put<UserProfile>('/api/auth/profile', data);
  return response.data;
};

export const syncHealthDataToBackend = async (steps: number, activeEnergy: number, heartRate: number): Promise<void> => {
  try {
    await api.post('/api/sync-health', {
      steps,
      active_energy: activeEnergy,
      heart_rate: heartRate,
    });
  } catch (error: any) {
    console.error('Failed to sync health data:', error);
  }
};
