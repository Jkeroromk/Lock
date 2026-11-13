/** Screenshot builds only (swapped in for services/health.ts): fixed activity, no permission sheets. */
import { DEMO } from './fixtures';

export interface HealthData {
  steps: number;
  activeEnergy: number;
}

export const HEALTH_APP_URL = 'x-apple-health://';
export const isHealthConnected = async (): Promise<boolean> => true;
export const isHealthAvailable = (): boolean => true;
export const requestHealthPermissions = (): Promise<boolean> => Promise.resolve(true);
export const getHealthData = async (): Promise<HealthData> => ({ steps: DEMO.steps, activeEnergy: DEMO.activeEnergy });
export const syncHealthData = async (): Promise<void> => {};
export const getDailySteps = async (days = 14): Promise<number[]> =>
  Array.from({ length: days }, (_, i) => 7200 + ((i * 1733) % 4100));
