import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-nextjs-app.vercel.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加用户 ID 到请求头（实际应用中应该从认证中获取）
api.interceptors.request.use((config) => {
  // 这里可以从 AsyncStorage 或其他地方获取用户 ID
  const userId = 'default-user-id'; // 临时使用固定值
  if (userId) {
    config.headers['x-user-id'] = userId;
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
