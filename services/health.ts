import { Linking, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncHealthDataToBackend } from './api';

let AppleHealthKit: any = null;
// Android: Health Connect (Google Fit's APIs are shut down at the end of 2026).
let HC: any = null;

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
    HC = require('react-native-health-connect');
  }
} catch {}

const CONNECTED_KEY = 'lock_health_connected';

/** True once the user has gone through the Health permission sheet on this device. */
export const isHealthConnected = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(CONNECTED_KEY).catch(() => null)) === 'true';

/** Whether this build can talk to Apple Health / Health Connect at all. */
export const isHealthAvailable = (): boolean =>
  Platform.OS === 'ios'
    ? typeof AppleHealthKit?.initHealthKit === 'function'
    : Platform.OS === 'android' && typeof HC?.initialize === 'function';

/** Opens the Health app, where iOS keeps per-app Health permissions. */
export const HEALTH_APP_URL = 'x-apple-health://';

/** Play Store page of the Health Connect app (Android 13 and older install it separately). */
const HEALTH_CONNECT_STORE_URL = 'market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding';

/**
 * Where the user manages Lock's Health access: the Health app on iOS,
 * Health Connect's settings on Android.
 */
export const openHealthSettings = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try { HC?.openHealthConnectSettings?.(); return; } catch {}
    Linking.openURL(HEALTH_CONNECT_STORE_URL).catch(() => {});
    return;
  }
  Linking.openURL(HEALTH_APP_URL).catch(() => {});
};

/** What Lock reads from Health Connect. Must match the android.permission.health.* entries in app.json. */
const HC_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
] as const;

/** Health Connect's SdkAvailabilityStatus values (kept here so the enum import can't drift). */
const HC_SDK_AVAILABLE = 3;

let hcInit: Promise<boolean> | null = null;
/** Health Connect is installed and its client is ready. */
const hcReady = (): Promise<boolean> => {
  if (!isHealthAvailable()) return Promise.resolve(false);
  if (hcInit) return hcInit;
  hcInit = (async () => {
    try {
      const status = await HC.getSdkStatus();
      if (status !== (HC.SdkAvailabilityStatus?.SDK_AVAILABLE ?? HC_SDK_AVAILABLE)) return false;
      return !!(await HC.initialize());
    } catch (e) {
      console.warn('[health] Health Connect init failed:', e);
      return false;
    }
  })().then((ok) => {
    if (!ok) hcInit = null; // the user may install / update Health Connect, then retry
    return ok;
  });
  return hcInit;
};

/** Android: Health Connect is missing or outdated, so it has to come from the Play Store first. */
export const healthNeedsInstall = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !isHealthAvailable()) return false;
  try {
    const status = await HC.getSdkStatus();
    return status !== (HC.SdkAvailabilityStatus?.SDK_AVAILABLE ?? HC_SDK_AVAILABLE);
  } catch {
    return false;
  }
};

/** Sends the user to the Play Store to install or update Health Connect. */
export const installHealthConnect = (): void => {
  Linking.openURL(HEALTH_CONNECT_STORE_URL).catch(() => {});
};

const hcHasStepsPermission = async (): Promise<boolean> => {
  try {
    const granted: { recordType: string; accessType: string }[] = await HC.getGrantedPermissions();
    return granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
  } catch {
    return false;
  }
};

/**
 * Android: shows Health Connect's permission screen unless Steps is already
 * allowed. Unlike iOS, Android tells us what was granted, so `true` really
 * means Lock can read steps.
 */
const requestHealthConnectPermissions = async (): Promise<boolean> => {
  if (!(await hcReady())) return false;
  try {
    let ok = await hcHasStepsPermission();
    if (!ok) {
      const granted: { recordType: string; accessType: string }[] = await HC.requestPermission(HC_PERMISSIONS);
      ok = Array.isArray(granted) && granted.some((p) => p.recordType === 'Steps');
    }
    if (ok) AsyncStorage.setItem(CONNECTED_KEY, 'true').catch(() => {});
    else AsyncStorage.removeItem(CONNECTED_KEY).catch(() => {});
    return ok;
  } catch (e) {
    console.warn('[health] Health Connect permission request failed:', e);
    return false;
  }
};

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
  if (Platform.OS === 'android') return requestHealthConnectPermissions();
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
    return await getHealthConnectData();
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

/** Local midnight → next local midnight for the day `offset` days from today, as ISO strings. */
const dayRange = (offset: number): { startTime: string; endTime: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + 1, 0, 0, 0, 0);
  return { startTime: start.toISOString(), endTime: (offset === 0 ? now : end).toISOString() };
};

const hcSteps = async (range: { startTime: string; endTime: string }): Promise<number> => {
  const r = await HC.aggregateRecord({
    recordType: 'Steps',
    timeRangeFilter: { operator: 'between', ...range },
  });
  return Math.round(Number(r?.COUNT_TOTAL) || 0);
};

const getHealthConnectData = async (): Promise<HealthData> => {
  // Never opens the permission screen from here: that only happens from an
  // explicit "Connect" tap (Today card / Settings).
  if (!(await isHealthConnected()) || !(await hcReady())) return { steps: 0, activeEnergy: 0 };
  try {
    const range = dayRange(0);
    const [steps, energy] = await Promise.all([
      hcSteps(range),
      HC.aggregateRecord({
        recordType: 'ActiveCaloriesBurned',
        timeRangeFilter: { operator: 'between', ...range },
      }).catch(() => null),
    ]);
    return {
      steps,
      activeEnergy: Math.round(Number(energy?.ACTIVE_CALORIES_TOTAL?.inKilocalories) || 0),
    };
  } catch (e) {
    // Most often: the user took the permission back in Health Connect.
    if (!(await hcHasStepsPermission())) AsyncStorage.removeItem(CONNECTED_KEY).catch(() => {});
    return { steps: 0, activeEnergy: 0 };
  }
};

export const syncHealthData = async (): Promise<void> => {
  const healthData = await getHealthData();
  await syncHealthDataToBackend(healthData.steps, healthData.activeEnergy);
};

/**
 * Step totals for each of the last `days` full days (not today), oldest first.
 * Days without data are 0. iOS and Android; other platforms return [].
 */
export const getDailySteps = async (days = 14): Promise<number[]> => {
  if (Platform.OS === 'android') {
    if (!(await isHealthConnected()) || !(await hcReady())) return [];
    try {
      const out: number[] = [];
      for (let i = days; i >= 1; i--) out.push(await hcSteps(dayRange(-i)));
      return out;
    } catch {
      return [];
    }
  }
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
