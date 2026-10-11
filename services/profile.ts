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
  inviteCode?: string | null;
  createdAt?: string;
  bonusAiCalls?: number;
  /** Team account: no AI limits. */
  isAdmin?: boolean;
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

/**
 * Ask the backend to re-verify our plan with RevenueCat after a purchase or
 * restore. The backend decides the plan itself — the client can't set it.
 * Never throws: if this fails, the RevenueCat webhook still updates the
 * backend shortly after, so a successful purchase is never reported as failed.
 */
export const syncSubscriptionPlan = async (): Promise<'FREE' | 'PRO' | 'MAX' | null> => {
  try {
    const res = await api.post<{ plan: 'FREE' | 'PRO' | 'MAX' }>('/api/subscription');
    return res.data.plan;
  } catch {
    return null;
  }
};

export const deleteAccount = async (): Promise<void> => {
  await api.delete('/api/user/delete');
};
