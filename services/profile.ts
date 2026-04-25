import { api } from './client';

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
    await api.post('/api/sync-health', { steps, active_energy: activeEnergy });
  } catch {}
};

export const syncSubscriptionPlan = async (plan: 'FREE' | 'PRO' | 'MAX'): Promise<void> => {
  await api.post('/api/subscription', { plan });
};
