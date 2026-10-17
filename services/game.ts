import { api } from './client';
import type { AvatarLook } from '@/lib/game/avatar';

export type Encounter = { id: string; species: string; shiny: boolean; origin: 'MEAL' | 'WATER' | string };
export type GameState = {
  avatar: {
    created: boolean;
    look: AvatarLook | null;
    name: string | null;
    level: number;
    loggedDays: number;
    milestones: number;
    milestonesSeen: number;
    unlocked: { days: number; field: string; value: string }[];
    next: { days: number; field: string; value: string } | null;
  };
  egg: { progress: number; target: number; hatched: number };
  today: { encounters: number; cap: number; waterDone: boolean };
  pending: Encounter[];
  dex: Record<string, { count: number; shiny: boolean }>;
};

export const fetchGameState = async (): Promise<GameState> => (await api.get<GameState>('/api/game/state')).data;

export const captureEncounter = async (id: string) =>
  (await api.post<{ creature: { id: string; species: string; shiny: boolean } | null; alreadyCaught: boolean }>(`/api/game/encounters/${id}/capture`)).data;

export const hatchEgg = async () => (await api.post<{ creature: { id: string; species: string; shiny: boolean } }>('/api/game/eggs/hatch')).data.creature;

/** Today's water goal was reached: maybe a water-type encounter (once a day). */
export const reportWaterGoal = async (): Promise<Encounter | null> => {
  try { return (await api.post<{ encounter: Encounter | null }>('/api/game/water')).data.encounter; } catch { return null; }
};

export const saveAvatar = async (look: AvatarLook, name: string) =>
  (await api.put<{ look: AvatarLook; name: string | null }>('/api/game/avatar', { look, name })).data;

export const markMilestonesSeen = async (count: number) => { await api.post('/api/game/milestones/seen', { count }); };
