import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import SettingItem from '@/components/settings/SettingItem';
import SettingsPage from '@/components/settings/SettingsPage';
import GoalsModal from '@/components/settings/GoalsModal';

/** Daily targets and body tracking. */
export default function GoalsScreen() {
  const { dailyCalorieGoal, dailyStepGoal, goalSettings } = useStore();
  const { t } = useTranslation();
  const router = useRouter();
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const mode = goalSettings?.calorieMode === 'custom' ? t('goals.custom') : t('goals.recommended');

  return (
    <SettingsPage title={t('settings.groupGoals' as any)}>
      <SettingItem
        icon="flag-outline"
        title={t('settings.goals')}
        description={`${t('settings.dailyGoalsSummary', { calories: dailyCalorieGoal.toLocaleString(), steps: dailyStepGoal.toLocaleString() })} · ${mode}`}
        onPress={() => setShowGoalsModal(true)}
      />
      <SettingItem
        icon="scale-outline"
        title={t('settings.weightTracker' as any)}
        description={t('settings.weightTrackerDescription' as any)}
        onPress={() => router.push('/(tabs)/settings/weight-tracker')}
      />
      <GoalsModal visible={showGoalsModal} onClose={() => setShowGoalsModal(false)} />
    </SettingsPage>
  );
}
