import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
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

export const scheduleDailyMealReminders = async (): Promise<void> => {
  // Cancel existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

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
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const getNotificationPermissionStatus = async (): Promise<boolean> => {
  if (!Device.isDevice || isExpoGo) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};
