import { View, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import CaloriesCard from '@/components/today/CaloriesCard';
import DateHeader from '@/components/today/DateHeader';
import HealthStatsCard from '@/components/today/HealthStatsCard';
import MealsList from '@/components/today/MealsList';
// 暂时禁用API调用，等待后端就绪
// import { fetchTodayData } from '@/services/api';
import { getHealthData } from '@/services/health';

export default function TodayScreen() {
  const { todayCalories, todayMeals, refreshToday } = useStore();
  const { t, language } = useTranslation();
  const colors = useTheme();
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
    } catch (error) {
      console.error('Failed to load health data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // 暂时禁用API调用，等待后端就绪
      // await Promise.all([refreshToday(), loadHealthData()]);
      await loadHealthData();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // 暂时禁用API调用，等待后端就绪
    // refreshToday();
    loadHealthData();
  }, []);

  const calorieProgress = Math.min((todayCalories / 2000) * 100, 100);
  const remainingCalories = Math.max(2000 - todayCalories, 0);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.backgroundPrimary }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 20 : 30 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
        }
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8, paddingBottom: DIMENSIONS.SPACING }}>
          <DateHeader language={language} />

          {/* Calories Card */}
          <CaloriesCard 
            todayCalories={todayCalories}
            calorieProgress={calorieProgress}
            remainingCalories={remainingCalories}
          />

          {/* Health Stats */}
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

          {/* Meals Section */}
          <MealsList meals={todayMeals} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
