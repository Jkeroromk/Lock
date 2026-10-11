import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import SettingItem from '@/components/settings/SettingItem';
import SettingsPage from '@/components/settings/SettingsPage';
import GoalsModal from '@/components/settings/GoalsModal';

/** Daily targets and body tracking. */
export default function GoalsScreen() {
  const { user, setUser, dailyCalorieGoal, dailyStepGoal, setDailyCalorieGoal, setDailyStepGoal } = useStore();
  const { t } = useTranslation();
  const router = useRouter();
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  const handleSaveGoals = (
    goals: { dailyCalorieGoal: number; dailyStepGoal: number },
    body: Partial<{ height?: number; weight?: number; age?: number; gender?: string; goal?: string; exerciseFrequency?: string }>,
  ) => {
    setDailyCalorieGoal(goals.dailyCalorieGoal);
    setDailyStepGoal(goals.dailyStepGoal);
    if (Object.keys(body).length > 0) setUser({ ...user, ...body } as any);
    setShowGoalsModal(false);
    Alert.alert(t('settings.success'), t('settings.goalsUpdated'));
  };

  return (
    <SettingsPage title={t('settings.groupGoals' as any)}>
      <SettingItem
        icon="flag-outline"
        title={t('settings.goals')}
        description={t('settings.dailyGoalsSummary', { calories: String(dailyCalorieGoal), steps: String(dailyStepGoal) })}
        onPress={() => setShowGoalsModal(true)}
      />
      <SettingItem
        icon="scale-outline"
        title={t('settings.weightTracker' as any)}
        description={t('settings.weightTrackerDescription' as any)}
        onPress={() => router.push('/(tabs)/settings/weight-tracker')}
      />
      <GoalsModal
        visible={showGoalsModal}
        user={user}
        dailyCalorieGoal={dailyCalorieGoal}
        dailyStepGoal={dailyStepGoal}
        onSave={handleSaveGoals}
        onCancel={() => setShowGoalsModal(false)}
      />
    </SettingsPage>
  );
}
