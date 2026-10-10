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
import { loadWater, addWater, undoLastWater, loadWaterGoal, saveWaterGoal, DEFAULT_WATER_GOAL_ML } from '@/services/waterTracker';
import CaloriesCard from '@/components/today/CaloriesCard';
import DateHeader from '@/components/today/DateHeader';
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
  const [waterLogCount, setWaterLogCount] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(DEFAULT_WATER_GOAL_ML);

  const applyWater = (state: { ml: number; log: number[] }) => {
    setWaterMl(state.ml);
    setWaterLogCount(state.log.length);
  };

  const loadWaterData = async () => {
    const [state, goal] = await Promise.all([loadWater(), loadWaterGoal()]);
    applyWater(state);
    setWaterGoalMl(goal);
  };

  const handleAddWater = async (ml: number) => {
    setWaterMl((current) => current + ml); // optimistic
    applyWater(await addWater(ml));
  };

  const handleUndoWater = async () => {
    applyWater(await undoLastWater());
  };

  const handleSetWaterGoal = async (ml: number) => {
    setWaterGoalMl(await saveWaterGoal(ml));
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
    Promise.all([refreshToday(), loadHealthData(), loadWaterData()]).finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refreshToday();
        loadWaterData();
      }
    }, [loading])
  );

  const macros = todayMeals.reduce(
    (sum, m) => ({
      protein: sum.protein + (Number(m.protein) || 0),
      carbs: sum.carbs + (Number(m.carbs) || 0),
      fat: sum.fat + (Number(m.fat) || 0),
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );
  const STEP_GOAL = 10000;
  const ENERGY_GOAL = 500;

  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']} style={{ backgroundColor: colors.backgroundPrimary }}>
      <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
          }
        >
          <View style={{ paddingHorizontal: 18, paddingTop: 0, paddingBottom: 8 }}>
            <DateHeader language={language} streak={streak} />
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
                  protein={macros.protein}
                  carbs={macros.carbs}
                  fat={macros.fat}
                />

                <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12, marginBottom: 14 }}>
                  <HealthStatsCard
                    inverse
                    label={t('today.steps')}
                    value={healthData.steps}
                    goal={STEP_GOAL}
                    caption={t('today.ofGoal', { goal: STEP_GOAL.toLocaleString() })}
                  />
                  <HealthStatsCard
                    label={t('today.energy')}
                    value={healthData.activeEnergy}
                    unit={t('today.kcal')}
                    goal={ENERGY_GOAL}
                    caption={t('today.ofGoal', { goal: `${ENERGY_GOAL} ${t('today.kcal')}` })}
                  />
                </View>

                <WaterCard
                  waterMl={waterMl}
                  goalMl={waterGoalMl}
                  canUndo={waterLogCount > 0 || waterMl > 0}
                  onAdd={handleAddWater}
                  onUndo={handleUndoWater}
                  onSetGoal={handleSetWaterGoal}
                />

                <MealsList meals={todayMeals} />

              </Animated.View>
            )}
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}
