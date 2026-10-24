import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '@/services/api';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // "Rest's up" / "Open Lock to save" are scheduled natively for the Lock
      // Screen; inside the app the workout screen already covers them.
      if (notification.request.identifier === 'lock-rest' || notification.request.identifier === 'lock-save') {
        return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice || isExpoGo) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
};

const TRIAL_REMINDER_ID = 'trial-reminder';

/** Cancels scheduled notifications except the free-trial reminder. */
const cancelScheduledExceptTrial = async (): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier !== TRIAL_REMINDER_ID)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
};

export const scheduleDailyMealReminders = async (): Promise<void> => {
  // Cancel existing meal reminders first (keeps the trial reminder)
  await cancelScheduledExceptTrial();

  // Morning reminder: 8:00 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '早餐提醒 🍳',
      body: '记录今天的早餐，开始健康的一天！',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });

  // Lunch reminder: 12:00 PM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '午餐提醒 🥗',
      body: '别忘了记录午餐的营养摄入！',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 12,
      minute: 0,
    },
  });

  // Dinner reminder: 7:00 PM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '晚餐提醒 🍜',
      body: '记录晚餐，完成今天的饮食追踪！',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });
};

export const cancelAllNotifications = async (): Promise<void> => {
  await cancelScheduledExceptTrial();
};

/**
 * Reminds the user `daysBefore` days before their free trial turns into a
 * paid subscription. Best effort: does nothing without notification permission.
 */
export const scheduleTrialReminder = async (
  trialDays: number,
  content: { title: string; body: string },
  daysBefore = 2,
): Promise<void> => {
  if (isExpoGo || trialDays <= daysBefore) return;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER_ID,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + (trialDays - daysBefore) * 24 * 60 * 60 * 1000),
      },
    });
  } catch {}
};

export const getNotificationPermissionStatus = async (): Promise<boolean> => {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

/**
 * 获取 Expo Push Token 并上传到后端，使服务端可以向该设备发送推送。
 * 需要用户已登录（api 实例会自动携带 Auth 头）。
 */
export const registerAndSavePushToken = async (): Promise<void> => {
  if (!Device.isDevice || isExpoGo) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    if (!token) return;

    await api.post('/api/push-token', { token });
  } catch {}
};
