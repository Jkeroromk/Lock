import { Platform } from 'react-native';
import { syncHealthDataToBackend } from './api';

let AppleHealthKit: any = null;
let GoogleFit: any = null;
let Scopes: any = null;

try {
  if (Platform.OS === 'ios') {
    AppleHealthKit = require('react-native-health').default;
  }
  if (Platform.OS === 'android') {
    const googleFitModule = require('react-native-google-fit');
    GoogleFit = googleFitModule.default || googleFitModule;
    Scopes = googleFitModule.Scopes;
  }
} catch (error) {
  console.warn('Health modules not available (requires development build):', error);
}

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

export const requestHealthPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !AppleHealthKit) {
    return false;
  }

  try {
    const permissions: HealthKitPermissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        ],
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('Failed to initialize HealthKit:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Failed to request health permissions:', error);
    return false;
  }
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
  if (!AppleHealthKit) {
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
  } catch (error) {
    console.error('Failed to get Apple Health data:', error);
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
  } catch (error) {
    console.error('Failed to get Google Fit data:', error);
    return { steps: 0, activeEnergy: 0 };
  }
};

export const syncHealthData = async (): Promise<void> => {
  const healthData = await getHealthData();
  await syncHealthDataToBackend(healthData.steps, healthData.activeEnergy);
};
