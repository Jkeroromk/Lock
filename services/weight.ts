import { api } from './client';

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
