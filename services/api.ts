import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { getStoredToken } from './tokenStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-nextjs-app.vercel.app';

const api = axios.create({
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
  username?: string | null;
  bio?: string | null;
  avatarEmoji?: string | null;
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

export const syncHealthDataToBackend = async (steps: number, activeEnergy: number): Promise<void> => {
  try {
    await api.post('/api/sync-health', {
      steps,
      active_energy: activeEnergy,
    });
  } catch (error: any) {
    console.error('Failed to sync health data:', error);
  }
};

// ─── Social ───────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  name: string;
  username: string | null;
  avatar: string;
  calories: number;
  streak: number;
  rank: number;
  isMe: boolean;
  friendshipId?: string;
}

export interface FriendRequest {
  id: string;
  from: { id: string; name: string; username: string | null; avatar: string };
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
  metadata: any;
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
