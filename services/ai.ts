import { api } from './client';
import { useStore } from '@/store/useStore';

export interface DietAnalysis {
  summary: string;
  suggestions: string[];
  exercise: string;
  score: number;
}

export const fetchDietAnalysis = async (language?: string): Promise<DietAnalysis> => {
  const lang = language ?? useStore.getState().language;
  const res = await api.get<DietAnalysis>('/api/ai/diet-analysis', {
    params: { lang },
    timeout: 60_000, // AI analysis can take longer than the default API timeout
  });
  return res.data;
};
