import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { getStoredToken } from './tokenStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-nextjs-app.vercel.app';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
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

export const analyzeFoodImage = async (
  imageUri: string,
  lang?: string,
  mode: 'food' | 'label' = 'food',
): Promise<FoodAnalysis> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64' as any,
    });

    const response = await api.post<FoodAnalysis>('/api/vision', {
      image: base64,
      lang: lang ?? 'zh-CN',
      mode,
    });

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
    const name: string =
      product.product_name_en || product.product_name || product.abbreviated_product_name || '';
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

// 获取本地日期字符串 (YYYY-MM-DD) 和时区偏移（分钟，如 UTC+8 返回 -480）
const getLocalDateParams = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  const tzOffset = now.getTimezoneOffset();
  return { date, tzOffset };
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
    const response = await api.get<MonthlyData>('/api/monthly', {
      params: { year, month, tzOffset },
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
  username?: string | null;
  bio?: string | null;
  avatarEmoji?: string | null;
  avatarImage?: string | null;
  showGender?: boolean | null;
  height?: number | null;
  age?: number | null;
  weight?: number | null;
  gender?: string | null;
  goal?: string | null;
  exerciseFrequency?: string | null;
  expectedTimeframe?: string | null;
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  streak?: number;
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

export const syncHealthDataToBackend = async (steps: number, activeEnergy: number): Promise<void> => {
  try {
    await api.post('/api/sync-health', {
      steps,
      active_energy: activeEnergy,
    });
  } catch {}
};

// ─── Social ───────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  name: string;
  username: string | null;
  avatar: string;
  avatarImage?: string | null;
  calories: number;
  streak: number;
  rank: number;
  isMe: boolean;
  friendshipId?: string;
}

export interface FriendRequest {
  id: string;
  from: { id: string; name: string; username: string | null; avatar: string; avatarImage?: string | null };
  createdAt: string;
}

export interface ChallengeData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  goalValue: number;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  participants: number;
  creatorName: string;
}

export interface FeedItem {
  id: string;
  type: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
  isMe: boolean;
  user: { id: string; name: string; avatar: string };
}

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const res = await api.get<LeaderboardEntry[]>('/api/social/leaderboard');
  return res.data;
};

export const fetchFriends = async (): Promise<LeaderboardEntry[]> => {
  const res = await api.get<LeaderboardEntry[]>('/api/social/friends');
  return res.data;
};

export const searchUser = async (q: string): Promise<{
  user: { id: string; name: string; username: string | null; avatarEmoji: string; avatarImage?: string | null; bio?: string | null } | null;
  relationStatus?: 'none' | 'friends' | 'pending_sent' | 'pending_received';
  self?: boolean;
}> => {
  const res = await api.get(`/api/social/users/search?q=${encodeURIComponent(q)}`);
  return res.data;
};

export const sendFriendRequest = async (identifier: string): Promise<void> => {
  await api.post('/api/social/friends', { identifier });
};

export const fetchFriendRequests = async (): Promise<FriendRequest[]> => {
  const res = await api.get<FriendRequest[]>('/api/social/friends/requests');
  return res.data;
};

export const respondFriendRequest = async (id: string, action: 'accept' | 'reject'): Promise<void> => {
  await api.patch(`/api/social/friends/${id}`, { action });
};

export const removeFriend = async (friendshipId: string): Promise<void> => {
  await api.delete(`/api/social/friends/${friendshipId}`);
};

export const fetchInviteCode = async (): Promise<string> => {
  const res = await api.get<{ inviteCode: string }>('/api/social/invite-code');
  return res.data.inviteCode;
};

export const fetchChallenges = async (): Promise<ChallengeData[]> => {
  const res = await api.get<ChallengeData[]>('/api/social/challenges');
  return res.data;
};

export const createChallenge = async (data: {
  title: string;
  description?: string;
  type: string;
  goalValue: number;
  startDate: string;
  endDate: string;
}): Promise<void> => {
  await api.post('/api/social/challenges', data);
};

export const joinChallenge = async (challengeId: string): Promise<void> => {
  await api.post(`/api/social/challenges/${challengeId}/join`);
};

export const fetchFeed = async (): Promise<FeedItem[]> => {
  const res = await api.get<FeedItem[]>('/api/social/feed');
  return res.data;
};

export interface ChallengeDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  goalValue: number;
  startDate: string;
  endDate: string;
  status: string;
  creatorName: string;
  participants: { userId: string; name: string; progress: number; joinedAt: string }[];
}

export const fetchChallengeDetail = async (challengeId: string): Promise<ChallengeDetail> => {
  const res = await api.get<ChallengeDetail>(`/api/social/challenges/${challengeId}`);
  return res.data;
};

// ─── Subscription ─────────────────────────────────────────────────────────────

export const syncSubscriptionPlan = async (plan: 'FREE' | 'PRO' | 'ENTERPRISE'): Promise<void> => {
  await api.post('/api/subscription', { plan });
};

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface DietAnalysis {
  summary: string;
  suggestions: string[];
  exercise: string;
  score: number;
}

export const fetchDietAnalysis = async (): Promise<DietAnalysis> => {
  const res = await api.get<DietAnalysis>('/api/ai/diet-analysis');
  return res.data;
};

// ─── Weight ───────────────────────────────────────────────────────────────────

export interface WeightRecord {
  id: string;
  weight: number;
  recordedAt: string;
  note?: string;
}

export const fetchWeightRecords = async (): Promise<WeightRecord[]> => {
  const res = await api.get<WeightRecord[]>('/api/weight');
  return res.data;
};

export const logWeight = async (weight: number, note?: string): Promise<WeightRecord> => {
  const res = await api.post<WeightRecord>('/api/weight', { weight, note });
  return res.data;
};

export const deleteWeight = async (id: string): Promise<void> => {
  await api.delete(`/api/weight?id=${id}`);
};

export interface MealExportRecord {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

export const fetchAllMealsForExport = async (): Promise<MealExportRecord[]> => {
  const res = await api.get<MealExportRecord[]>('/api/meals/export');
  return res.data;
};
