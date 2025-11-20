import { Platform } from 'react-native';

// 条件导入原生模块（仅在开发构建中可用）
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

// 类型定义
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
  activeEnergy: number; // kcal
  heartRate: number; // bpm
}

// Apple Health (iOS)
export const requestHealthPermissions = async (): Promise<boolean> => {
  // 暂时禁用健康权限请求，等待开发构建就绪
  return false;
  
  /*
  if (Platform.OS !== 'ios' || !AppleHealthKit) {
    console.warn('Apple HealthKit not available (requires development build)');
    return false;
  }

  try {
    const permissions: HealthKitPermissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.HeartRate,
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
  */
};

export const getHealthData = async (): Promise<HealthData> => {
  // 暂时禁用健康数据获取，等待开发构建就绪
  // if (Platform.OS === 'ios') {
  //   return await getAppleHealthData();
  // } else if (Platform.OS === 'android') {
  //   return await getGoogleFitData();
  // }
  return { steps: 0, activeEnergy: 0, heartRate: 0 };
};

const getAppleHealthData = async (): Promise<HealthData> => {
  // 暂时禁用健康数据获取，等待开发构建就绪
  return { steps: 0, activeEnergy: 0, heartRate: 0 };
  
  /*
  if (!AppleHealthKit) {
    console.warn('Apple HealthKit not available (requires development build)');
    return { steps: 0, activeEnergy: 0, heartRate: 0 };
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return new Promise((resolve) => {
      let steps = 0;
      let activeEnergy = 0;
      let heartRate = 0;
      let completed = 0;

      const checkComplete = () => {
        completed++;
        if (completed === 3) {
          resolve({ steps, activeEnergy, heartRate });
        }
      };

      // 获取步数
      const stepOptions = {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
      };
      AppleHealthKit.getStepCount(stepOptions, (err: Object, results: HealthValue) => {
        if (!err && results) {
          steps = results.value || 0;
        }
        checkComplete();
      });

      // 获取活动能量
      const energyOptions = {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
      };
      AppleHealthKit.getActiveEnergyBurned(energyOptions, (err: Object, results: HealthValue) => {
        if (!err && results) {
          activeEnergy = results.value || 0;
        }
        checkComplete();
      });

      // 获取心率
      const heartRateOptions = {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        ascending: false,
        limit: 1,
      };
      AppleHealthKit.getHeartRateSamples(heartRateOptions, (err: Object, results: HealthValue[]) => {
        if (!err && results && results.length > 0) {
          heartRate = results[0].value || 0;
        }
        checkComplete();
      });
    });
  } catch (error) {
    console.error('Failed to get Apple Health data:', error);
    return { steps: 0, activeEnergy: 0, heartRate: 0 };
  }
  */
};

const getGoogleFitData = async (): Promise<HealthData> => {
  if (!GoogleFit || !Scopes) {
    console.warn('Google Fit not available (requires development build)');
    return { steps: 0, activeEnergy: 0, heartRate: 0 };
  }

  try {
    // 检查是否已授权
    const isAuthorized = await GoogleFit.checkIsAuthorized();
    if (!isAuthorized) {
      // 请求授权
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_HEART_RATE_READ,
        ],
      };
      await GoogleFit.authorize(options);
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [stepsData, caloriesData, heartRateData] = await Promise.all([
      GoogleFit.getDailyStepCountSamples({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
      }),
      GoogleFit.getDailyCalorieSamples({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
      }),
      GoogleFit.getHeartRateSamples({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
      }),
    ]);

    const steps = stepsData?.[0]?.steps?.[0]?.value || 0;
    const activeEnergy = caloriesData?.[0]?.calorie || 0;
    const heartRate = heartRateData?.[0]?.value || 0;

    return {
      steps,
      activeEnergy,
      heartRate,
    };
  } catch (error) {
    console.error('Failed to get Google Fit data:', error);
    return { steps: 0, activeEnergy: 0, heartRate: 0 };
  }
};

export const syncHealthData = async (): Promise<void> => {
  const healthData = await getHealthData();
  
  // 这里可以调用 API 同步数据到后端
  // await api.post('/api/sync-health', healthData);
  
  console.log('Health data synced:', healthData);
};

