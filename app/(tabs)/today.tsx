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
import AsyncStorage from '@react-native-async-storage/async-storage';
import CaloriesCard from '@/components/today/CaloriesCard';
import DateHeader from '@/components/today/DateHeader';
import HealthStatsCard from '@/components/today/HealthStatsCard';
import MealsList from '@/components/today/MealsList';
import WaterCard from '@/components/today/WaterCard';
import { getHealthData, requestHealthPermissions, syncHealthData } from '@/services/health';

const WATER_KEY = 'lock_water_glasses';

export default function TodayScreen() {
  const { todayCalories, todayMeals, refreshToday, dailyCalorieGoal, user } = useStore();
  const streak = user?.streak ?? 0;
  const { t, language } = useTranslation();
  const colors = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState({ steps: 0, activeEnergy: 0 });
  const [waterGlasses, setWaterGlasses] = useState(0);
  const WATER_GOAL = 8;

  // 水分追踪 — 持久化到 AsyncStorage，按日期重置
  const loadWater = async () => {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(WATER_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.date === today) {
        setWaterGlasses(parsed.glasses ?? 0);
      } else {
        setWaterGlasses(0);
        await AsyncStorage.setItem(WATER_KEY, JSON.stringify({ date: today, glasses: 0 }));
      }
    } catch {}
  };

  const saveWater = async (glasses: number) => {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(WATER_KEY, JSON.stringify({ date: today, glasses }));
  };

  const handleAddWater = async () => {
    if (waterGlasses >= WATER_GOAL) return;
    const next = waterGlasses + 1;
    setWaterGlasses(next);
    await saveWater(next);
  };

  const handleRemoveWater = async () => {
    if (waterGlasses <= 0) return;
    const next = waterGlasses - 1;
    setWaterGlasses(next);
    await saveWater(next);
  };

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
    Promise.all([refreshToday(), loadHealthData(), loadWater()]).finally(() => setLoading(false));
  }, []);

  // 每次切回 today tab 时刷新数据（删除/添加餐食后立刻反映）
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refreshToday();
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
          <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8, paddingBottom: DIMENSIONS.SPACING }}>
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
                  calorieProgress={calorieProgress}
                  remainingCalories={remainingCalories}
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
                  glasses={waterGlasses}
                  goal={WATER_GOAL}
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
