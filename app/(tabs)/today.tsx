import { View, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useRef } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Skeleton from '@/components/ui/Skeleton';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import CaloriesCard from '@/components/today/CaloriesCard';
import DateHeader from '@/components/today/DateHeader';
import HealthStatsCard from '@/components/today/HealthStatsCard';
import MealsList from '@/components/today/MealsList';
import { getHealthData, requestHealthPermissions, syncHealthData } from '@/services/health';

export default function TodayScreen() {
  const { todayCalories, todayMeals, refreshToday, dailyCalorieGoal } = useStore();
  const { t, language } = useTranslation();
  const colors = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState({
    steps: 0,
    activeEnergy: 0,
    heartRate: 0,
  });

  const loadHealthData = async () => {
    try {
      const data = await getHealthData();
      setHealthData(data);
      // Sync to backend in background
      syncHealthData().catch(() => {});
    } catch (error) {
      console.error('Failed to load health data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshToday(), loadHealthData()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    requestHealthPermissions();
    Promise.all([refreshToday(), loadHealthData()]).finally(() => setLoading(false));
  }, []);

  const calorieProgress = Math.min((todayCalories / dailyCalorieGoal) * 100, 100);
  const remainingCalories = Math.max(dailyCalorieGoal - todayCalories, 0);

  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']} style={{ backgroundColor: colors.backgroundPrimary }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
        }
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8, paddingBottom: DIMENSIONS.SPACING }}>
          <DateHeader language={language} />

          {loading ? (
            <View style={{ gap: DIMENSIONS.SPACING * 0.8 }}>
              <Skeleton height={180} borderRadius={24} />
              <Skeleton height={70} borderRadius={18} />
              <Skeleton height={70} borderRadius={18} />
              <Skeleton height={70} borderRadius={18} />
              <Skeleton height={120} borderRadius={18} />
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(400)}>
              <CaloriesCard
                todayCalories={todayCalories}
                calorieProgress={calorieProgress}
                remainingCalories={remainingCalories}
              />

              <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2 }}>
                <HealthStatsCard
                  icon="footsteps"
                  label={t('today.steps')}
                  value={healthData.steps}
                  unit={t('today.stepsUnit')}
                />
                <HealthStatsCard
                  icon="battery-charging"
                  label={t('today.energy')}
                  value={healthData.activeEnergy}
                  unit={t('today.kcal')}
                />
                <HealthStatsCard
                  icon="heart"
                  label={t('today.heartRate')}
                  value={healthData.heartRate || '--'}
                  unit={t('today.bpm')}
                />
              </View>

              <MealsList meals={todayMeals} />
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
