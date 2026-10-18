import { api } from './client';

export interface PetCollectionItem {
  id: string;
  kind: string;
  name: string;
  days: number;
  graduatedAt: string;
}

export interface PetTodayFacts {
  xp: number;
  trained: boolean;
  steps: number;
  meals: number;
  protein: number;
  proteinTarget: number;
  pats: number;
}

export interface PetState {
  today: string;
  profile: null | {
    coachName: string;
    buddyKind: string;
    buddyName: string;
    /** 1 on the day the buddy arrived. */
    buddyDay: number;
  };
  xp?: number;
  stage?: 1 | 2 | 3;
  nextAt?: number | null;
  canGraduate?: boolean;
  todayFacts?: PetTodayFacts;
  recent?: { dayKey: string; xp: number }[];
  collection?: PetCollectionItem[];
}

export interface PetSyncInput {
  steps?: number;
  proteinBase?: number;
}

export const fetchPet = async (): Promise<PetState> => (await api.get<PetState>('/api/pet')).data;

export const syncPet = async (input: PetSyncInput): Promise<PetState> =>
  (await api.post<PetState>('/api/pet/sync', input)).data;

export const setupPet = async (
  body: { coachName: string; buddyKind: string; buddyName: string } & PetSyncInput,
): Promise<PetState> => (await api.post<PetState>('/api/pet/setup', body)).data;

export const renamePet = async (body: { coachName?: string; buddyName?: string }): Promise<PetState> =>
  (await api.put<PetState>('/api/pet/names', body)).data;

export const graduatePet = async (body: { nextKind: string; nextName: string }): Promise<PetState> =>
  (await api.post<PetState>('/api/pet/graduate', body)).data;

export const patFriendPet = async (friendId: string): Promise<{ ok: true; xp: number; buddyName: string }> =>
  (await api.post<{ ok: true; xp: number; buddyName: string }>('/api/pet/pat', { friendId })).data;
