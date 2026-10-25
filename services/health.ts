import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncHealthDataToBackend } from './api';

let AppleHealthKit: any = null;
let GoogleFit: any = null;
let Scopes: any = null;

try {
  if (Platform.OS === 'ios') {
    // react-native-health uses `module.exports = HealthKit` (no `.default`), so
    // `require(...).default` was always undefined and HealthKit never started.
    // Under the new architecture the merged object can also come back without
    // its methods, so fall back to the native module for those.
    const pkg = require('react-native-health');
    const hk = pkg?.default ?? pkg;
    const native = NativeModules.AppleHealthKit;
    if (hk || native) {
      AppleHealthKit = new Proxy({}, {
        get: (_t, key: string) => hk?.[key] ?? native?.[key],
      });
    }
  }
  if (Platform.OS === 'android') {
    const googleFitModule = require('react-native-google-fit');
    GoogleFit = googleFitModule.default || googleFitModule;
    Scopes = googleFitModule.Scopes;
  }
} catch {}

const CONNECTED_KEY = 'lock_health_connected';

/** True once the user has gone through the Health permission sheet on this device. */
export const isHealthConnected = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(CONNECTED_KEY).catch(() => null)) === 'true';

/** Whether this build can talk to Apple Health at all. */
export const isHealthAvailable = (): boolean =>
  Platform.OS === 'ios' && typeof AppleHealthKit?.initHealthKit === 'function';

/** Opens the Health app, where iOS keeps per-app Health permissions. */
export const HEALTH_APP_URL = 'x-apple-health://';

interface HealthValue {
  value: number;
}

interface HealthKitPermissions {
  permissions: {
    read: string[];
  };
}

export interface HealthData {
  steps: number;
  activeEnergy: number;
}

let initPromise: Promise<boolean> | null = null;

/**
 * Shows the Health permission sheet the first time; afterwards iOS returns
 * immediately. Apple never tells apps whether *read* access was granted, so
 * `true` means "HealthKit is set up", not "the user allowed everything".
 */
export const requestHealthPermissions = (): Promise<boolean> => {
  if (!isHealthAvailable()) return Promise.resolve(false);
  if (initPromise) return initPromise;

  const Permissions = AppleHealthKit.Constants?.Permissions ?? {};
  const permissions: HealthKitPermissions = {
    permissions: {
      read: [Permissions.Steps ?? 'Steps', Permissions.ActiveEnergyBurned ?? 'ActiveEnergyBurned'],
    },
  };

  initPromise = new Promise<boolean>((resolve) => {
    try {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.warn('[health] initHealthKit failed:', error);
          resolve(false);
        } else {
          AsyncStorage.setItem(CONNECTED_KEY, 'true').catch(() => {});
          resolve(true);
        }
      });
    } catch (e) {
      console.warn('[health] initHealthKit threw:', e);
      resolve(false);
    }
  }).then((ok) => {
    if (!ok) initPromise = null; // allow a retry later
    return ok;
  });
  return initPromise;
};

export const getHealthData = async (): Promise<HealthData> => {
  if (Platform.OS === 'ios') {
    return await getAppleHealthData();
  } else if (Platform.OS === 'android') {
    return await getGoogleFitData();
  }
  return { steps: 0, activeEnergy: 0 };
};

const getAppleHealthData = async (): Promise<HealthData> => {
  if (!(await requestHealthPermissions())) {
    return { steps: 0, activeEnergy: 0 };
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    return new Promise((resolve) => {
      let steps = 0;
      let activeEnergy = 0;
      let completed = 0;

      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          resolve({ steps, activeEnergy });
        }
      };

      AppleHealthKit.getStepCount(
        { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() },
        (err: Object, results: HealthValue) => {
          if (!err && results) steps = results.value || 0;
          checkComplete();
        }
      );

      AppleHealthKit.getActiveEnergyBurned(
        { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() },
        (err: Object, results: HealthValue) => {
          if (!err && results) activeEnergy = results.value || 0;
          checkComplete();
        }
      );
    });
  } catch {
    return { steps: 0, activeEnergy: 0 };
  }
};

const getGoogleFitData = async (): Promise<HealthData> => {
  if (!GoogleFit || !Scopes) {
    return { steps: 0, activeEnergy: 0 };
  }

  try {
    const isAuthorized = await GoogleFit.checkIsAuthorized();
    if (!isAuthorized) {
      await GoogleFit.authorize({
        scopes: [Scopes.FITNESS_ACTIVITY_READ],
      });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const [stepsData, caloriesData] = await Promise.all([
      GoogleFit.getDailyStepCountSamples({ startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() }),
      GoogleFit.getDailyCalorieSamples({ startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() }),
    ]);

    return {
      steps: stepsData?.[0]?.steps?.[0]?.value || 0,
      activeEnergy: caloriesData?.[0]?.calorie || 0,
    };
  } catch {
    return { steps: 0, activeEnergy: 0 };
  }
};

export const syncHealthData = async (): Promise<void> => {
  const healthData = await getHealthData();
  await syncHealthDataToBackend(healthData.steps, healthData.activeEnergy);
};

/**
 * Step totals for each of the last `days` full days (not today), oldest first.
 * Days without data are 0. iOS only; other platforms return [].
 */
export const getDailySteps = async (days = 14): Promise<number[]> => {
  if (Platform.OS !== 'ios' || !(await requestHealthPermissions())) return [];
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days, 0, 0, 0, 0);
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return new Promise((resolve) => {
    try {
      AppleHealthKit.getDailyStepCountSamples(
        { startDate: start.toISOString(), endDate: end.toISOString(), period: 1440 },
        (err: unknown, results: { value: number; startDate: string }[]) => {
          if (err || !Array.isArray(results)) return resolve([]);
          const byDay = new Map<string, number>();
          for (const r of results) {
            const k = key(new Date(r.startDate));
            byDay.set(k, (byDay.get(k) ?? 0) + (Number(r.value) || 0));
          }
          const out: number[] = [];
          for (let i = 0; i < days; i++) {
            const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            out.push(Math.round(byDay.get(key(d)) ?? 0));
          }
          resolve(out);
        },
      );
    } catch {
      resolve([]);
    }
  });
};
