import { api } from './client';

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
