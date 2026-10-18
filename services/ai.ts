import { api } from './client';
import { useStore } from '@/store/useStore';
import { macroTargets } from '@/lib/macros';

export interface DietAnalysis {
  summary: string;
  suggestions: string[];
  exercise: string;
  score: number;
}

export const fetchDietAnalysis = async (language?: string): Promise<DietAnalysis> => {
  const { language: appLang, dailyCalorieGoal } = useStore.getState();
  const lang = language ?? appLang;
  // The calorie goal lives in the app, so send the protein target it implies;
  // the server adds the training-day bonus.
  const protein = macroTargets(dailyCalorieGoal || 2000).protein;
  const res = await api.get<DietAnalysis>('/api/ai/diet-analysis', {
    params: { lang, protein },
    timeout: 60_000, // AI analysis can take longer than the default API timeout
  });
  return res.data;
};
