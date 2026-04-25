import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './client';

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

export interface MealRecord {
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

export interface MonthlyData {
  [dateString: string]: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface MealExportRecord {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

const getLocalDateParams = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA');
  const tzOffset = now.getTimezoneOffset();
  return { date, tzOffset };
};

export const analyzeFoodImage = async (
  imageUri: string,
  lang?: string,
  mode: 'food' | 'label' = 'food',
): Promise<FoodAnalysis> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as any });
    const response = await api.post<FoodAnalysis>('/api/vision', { image: base64, lang: lang ?? 'zh-CN', mode });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '分析图片失败');
  }
};

export const deleteMeal = async (mealId: string): Promise<void> => {
  try {
    await api.delete(`/api/meals/${mealId}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '删除餐食失败');
  }
};

export const updateMeal = async (
  mealId: string,
  data: Partial<{ food_name: string; calories: number; protein: number; carbs: number; fat: number }>,
): Promise<void> => {
  try {
    await api.patch(`/api/meals/${mealId}`, data);
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '更新餐食失败');
  }
};

export const lookupBarcode = async (barcode: string): Promise<FoodAnalysis | null> => {
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { headers: { 'User-Agent': 'LockApp/1.0 (health tracking)' }, timeout: 8000 },
    );
    const product = response.data?.product;
    if (!product) return null;
    const n = product.nutriments ?? {};
    const name: string = product.product_name_en || product.product_name || product.abbreviated_product_name || '';
    if (!name) return null;
    return {
      food: name,
      calories: Math.round(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0),
      protein: Math.round((n['proteins_serving'] ?? n['proteins_100g'] ?? 0) * 10) / 10,
      carbs: Math.round((n['carbohydrates_serving'] ?? n['carbohydrates_100g'] ?? 0) * 10) / 10,
      fat: Math.round((n['fat_serving'] ?? n['fat_100g'] ?? 0) * 10) / 10,
      confidence: 0.95,
    };
  } catch {
    return null;
  }
};

export const logMeal = async (meal: MealData): Promise<void> => {
  try {
    const tzOffset = new Date().getTimezoneOffset();
    await api.post('/api/log-meal', { ...meal, tzOffset });
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '保存餐食失败');
  }
};

export const fetchTodayData = async (): Promise<{ totalCalories: number; meals: MealRecord[] }> => {
  try {
    const { date, tzOffset } = getLocalDateParams();
    const response = await api.get(`/api/today?date=${date}&tzOffset=${tzOffset}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取今日数据失败');
  }
};

export const fetchDayMeals = async (date: string): Promise<{ totalCalories: number; meals: MealRecord[] }> => {
  try {
    const { tzOffset } = getLocalDateParams();
    const response = await api.get(`/api/today?date=${date}&tzOffset=${tzOffset}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取当日数据失败');
  }
};

export const fetchWeeklyData = async (): Promise<WeeklyDay[]> => {
  try {
    const { date, tzOffset } = getLocalDateParams();
    const response = await api.get<WeeklyDay[]>(`/api/weekly?date=${date}&tzOffset=${tzOffset}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取周数据失败');
  }
};

export const fetchMonthlyData = async (year: number, month: number): Promise<MonthlyData> => {
  try {
    const { tzOffset } = getLocalDateParams();
    const response = await api.get<MonthlyData>('/api/monthly', { params: { year, month, tzOffset } });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取月度数据失败');
  }
};

export const fetchAllMealsForExport = async (): Promise<MealExportRecord[]> => {
  const res = await api.get<MealExportRecord[]>('/api/meals/export');
  return res.data;
};
