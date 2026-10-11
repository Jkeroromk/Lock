import { View, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import Skeleton from '@/components/ui/Skeleton';
import { Appear } from '@/components/ui/bxc';
import { useStore, localDateKey } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { loadWater, addWater, undoLastWater, loadWaterGoal, saveWaterGoal, onWaterChange, DEFAULT_WATER_GOAL_ML } from '@/services/waterTracker';
import CaloriesCard from '@/components/today/CaloriesCard';
import DateHeader from '@/components/today/DateHeader';
import HealthStatsCard from '@/components/today/HealthStatsCard';
import MealsList from '@/components/today/MealsList';
import WaterCard from '@/components/today/WaterCard';
import { getHealthData, syncHealthData, isHealthAvailable, isHealthConnected, requestHealthPermissions } from '@/services/health';
import ConnectHealthCard from '@/components/today/ConnectHealthCard';

export default function TodayScreen() {
  const { todayCalories, todayMeals, todayDate, refreshToday, dailyCalorieGoal, user } = useStore();
  // Today's numbers from the last session are shown instantly; fresh data replaces them.
  const hasFreshCache = todayDate === localDateKey();
  const streak = user?.streak ?? 0;
  const { t, language } = useTranslation();
  const colors = useTheme();
  const [loading, setLoading] = useState(!hasFreshCache);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState({ steps: 0, activeEnergy: 0 });
  // iOS: until Apple Health is connected, show a "Connect" card instead of zeros.
  const healthNeedsSetup = Platform.OS === 'ios' && isHealthAvailable();
  const [healthConnected, setHealthConnected] = useState<boolean | null>(healthNeedsSetup ? null : true);
  const [connectingHealth, setConnectingHealth] = useState(false);
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

  const refreshHealth = async () => {
    const connected = healthNeedsSetup ? await isHealthConnected() : true;
    setHealthConnected(connected);
    if (connected) await loadHealthData();
  };

  const handleConnectHealth = async () => {
    setConnectingHealth(true);
    try {
      if (await requestHealthPermissions()) {
        setHealthConnected(true);
        await loadHealthData();
      }
    } finally {
      setConnectingHealth(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshToday(), refreshHealth()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Health data can be slow (HealthKit query); it fills in on its own and
    // never holds up the first render. No permission sheet until the user taps Connect.
    refreshHealth();
    Promise.all([refreshToday(), loadWaterData()]).finally(() => setLoading(false));
    // Water can change from elsewhere (meal save adds a drink, toast undo).
    return onWaterChange(() => { loadWaterData(); });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refreshToday();
        loadWaterData();
        // Re-check only while disconnected (may have been connected from Settings).
        if (healthConnected === false) refreshHealth();
      }
    }, [loading, healthConnected])
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
              <View>
                <Appear index={0}>
                <CaloriesCard
                  todayCalories={todayCalories}
                  protein={macros.protein}
                  carbs={macros.carbs}
                  fat={macros.fat}
                />
                </Appear>

                {healthConnected === false ? (
                  <Appear index={1}>
                    <ConnectHealthCard onConnect={handleConnectHealth} connecting={connectingHealth} />
                  </Appear>
                ) : (
                <Appear index={1} style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12, marginBottom: 14 }}>
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
                </Appear>
                )}

                <Appear index={2}>
                <WaterCard
                  waterMl={waterMl}
                  goalMl={waterGoalMl}
                  canUndo={waterLogCount > 0 || waterMl > 0}
                  onAdd={handleAddWater}
                  onUndo={handleUndoWater}
                  onSetGoal={handleSetWaterGoal}
                />
                </Appear>

                <Appear index={3}>
                  <MealsList meals={todayMeals} />
                </Appear>
              </View>
            )}
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}
