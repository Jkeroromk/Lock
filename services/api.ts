import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { getAccessToken } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-nextjs-app.vercel.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 自动附加 Supabase JWT token 到每个请求
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
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

export const analyzeFoodImage = async (imageUri: string): Promise<FoodAnalysis> => {
  try {
    // 将图片转换为 base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
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

export const fetchTodayData = async () => {
  try {
    const response = await api.get('/api/today');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取今日数据失败');
  }
};

export const fetchWeeklyData = async () => {
  try {
    const response = await api.get('/api/weekly');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取周数据失败');
  }
};
