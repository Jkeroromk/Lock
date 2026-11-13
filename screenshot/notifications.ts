/** Screenshot builds only (swapped in for services/notifications.ts): no permission prompts, nothing scheduled. */
export * from '@/services/notifications';

export const requestNotificationPermissions = async (): Promise<boolean> => false;
export const scheduleDailyMealReminders = async (): Promise<void> => {};
export const cancelAllNotifications = async (): Promise<void> => {};
export const scheduleTrialReminder = async (..._args: any[]): Promise<void> => {};
export const scheduleProWeekReminder = async (..._args: any[]): Promise<void> => {};
export const cancelProWeekReminder = async (): Promise<void> => {};
export const getNotificationPermissionStatus = async (): Promise<boolean> => true;
export const registerAndSavePushToken = async (): Promise<void> => {};
