import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Skeleton from '@/components/ui/Skeleton';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { loadWaterMl, saveWaterMl, GLASS_ML, WATER_GOAL_ML } from '@/services/waterTracker';
import CaloriesCard from '@/components/today/CaloriesCard';
import HealthStatsCard from '@/components/today/HealthStatsCard';
import MealsList from '@/components/today/MealsList';
import WaterCard from '@/components/today/WaterCard';
import { getHealthData, requestHealthPermissions, syncHealthData } from '@/services/health';

export default function TodayScreen() {
  const { todayCalories, todayMeals, refreshToday, dailyCalorieGoal, user } = useStore();
  const streak = user?.streak ?? 0;
  const { t, language } = useTranslation();
  const colors = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState({ steps: 0, activeEnergy: 0 });
  const [waterMl, setWaterMl] = useState(0);

  const loadWater = async () => {
    const ml = await loadWaterMl();
    setWaterMl(ml);
  };

  const handleAddWater = async () => {
    const next = waterMl + GLASS_ML;
    setWaterMl(next);
    await saveWaterMl(next);
  };

  const handleRemoveWater = async () => {
    if (waterMl <= 0) return;
    const next = Math.max(0, waterMl - GLASS_ML);
    setWaterMl(next);
    await saveWaterMl(next);
  };

  const loadHealthData = async () => {
    try {
      const data = await getHealthData();
      setHealthData(data);
      // Sync to backend in background
      syncHealthData().catch(() => {});
    } catch {}
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
    Promise.all([refreshToday(), loadHealthData(), loadWater()]).finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refreshToday();
        loadWater();
      }
    }, [loading])
  );

  const calorieProgress = Math.min((todayCalories / dailyCalorieGoal) * 100, 100);
  const remainingCalories = Math.max(dailyCalorieGoal - todayCalories, 0);

  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']} style={{ backgroundColor: colors.backgroundPrimary }}>
      <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
          }
        >
          <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: 0, paddingBottom: DIMENSIONS.SPACING }}>
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
                  language={language}
                  streak={streak}
                />

                <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: DIMENSIONS.SPACING * 0.6, marginBottom: DIMENSIONS.SPACING }}>
                  <HealthStatsCard
                    icon="footsteps"
                    label={t('today.steps')}
                    value={healthData.steps}
                    unit={t('today.stepsUnit')}
                    goal={10000}
                  />
                  <HealthStatsCard
                    icon="flame"
                    label={t('today.energy')}
                    value={healthData.activeEnergy}
                    unit={t('today.kcal')}
                    goal={500}
                  />
                </View>

                <WaterCard
                  waterMl={waterMl}
                  goalMl={WATER_GOAL_ML}
                  onAdd={handleAddWater}
                  onRemove={handleRemoveWater}
                />

                <MealsList meals={todayMeals} />

              </Animated.View>
            )}
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}
