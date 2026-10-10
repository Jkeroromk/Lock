import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Skeleton from '@/components/ui/Skeleton';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { ScreenHeader } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { fetchMonthlyData, fetchWeeklyData, MonthlyData } from '@/services/api';
import CalendarView, { type DayMark } from '@/components/calendar/CalendarView';
import WeeklyCaloriesChart from '@/components/calendar/WeeklyCaloriesChart';
import WeeklyNutritionBreakdown from '@/components/calendar/WeeklyNutritionBreakdown';
import MonthlyStats from '@/components/calendar/MonthlyStats';
import AiInsightsCard from '@/components/calendar/AiInsightsCard';
import DayMealsModal from '@/components/calendar/DayMealsModal';

export default function CalendarScreen() {
  const { language, dailyCalorieGoal } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();

  // 本地日期字符串（避免 toISOString UTC 偏差）
  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const [chartData, setChartData] = useState<{ day: string; calories: number }[]>([]);
  const [weeklyNutrition, setWeeklyNutrition] = useState<{ protein: number; carbs: number; fat: number }>({ protein: 0, carbs: 0, fat: 0 });

  // 点击某天弹出餐食详情
  const [selectedMealDate, setSelectedMealDate] = useState<string | null>(null);

  const getWeekdayLabel = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const localDate = new Date(y, m - 1, d, 12, 0, 0);
      return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(localDate);
    } catch {
      return dateStr.slice(5);
    }
  };

  const loadMonthlyData = useCallback(async (year: number, month: number) => {
    try {
      const data = await fetchMonthlyData(year, month);
      setMonthlyData(data);
    } catch {}
  }, []);

  const loadWeeklyData = useCallback(async () => {
    try {
      const days = await fetchWeeklyData();
      setChartData(days.map((d) => ({ day: getWeekdayLabel(d.date), calories: d.calories })));
      // 累加本周营养数据
      const totals = days.reduce(
        (acc, d) => ({
          protein: acc.protein + (d.protein || 0),
          carbs: acc.carbs + (d.carbs || 0),
          fat: acc.fat + (d.fat || 0),
        }),
        { protein: 0, carbs: 0, fat: 0 }
      );
      setWeeklyNutrition({
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
      });
    } catch {}
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        loadMonthlyData(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
        loadWeeklyData(),
      ]).finally(() => setLoading(false));
    }, [currentMonth])
  );

  const onDayPress = (dateStr: string) => {
    setSelectedMealDate(dateStr);
  };

  const onMonthChange = (month: Date) => {
    setCurrentMonth(month);
    loadMonthlyData(month.getFullYear(), month.getMonth() + 1);
  };

  const buildMarkedDates = () => {
    const marks: Record<string, DayMark> = {};
    const year = currentMonth.getFullYear();
    const monthNum = currentMonth.getMonth();
    const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
    const goal = dailyCalorieGoal || 2000;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toLocalDateStr(new Date(year, monthNum, day));
      const calories = monthlyData[dateStr]?.calories || 0;
      marks[dateStr] = { calories, progress: calories > 0 ? Math.min((calories / goal) * 100, 100) : 0 };
    }
    return marks;
  };

  const markedDates = buildMarkedDates();

  const daysWithData = Object.values(monthlyData).filter((d) => d.calories > 0);
  const avgDailyCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
    : 0;

  const nutritionStats = [
    { label: t('log.protein'), value: weeklyNutrition.protein, color: colors.accent },
    { label: t('log.carbs'), value: weeklyNutrition.carbs, color: colors.textPrimary },
    { label: t('log.fat'), value: weeklyNutrition.fat, color: '#8C8B86' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ paddingHorizontal: 18 }}>
          <ScreenHeader title={t('tabs.calendar')} />
          {loading ? (
            <View style={{ gap: 14 }}>
              <Skeleton height={340} borderRadius={22} />
              <Skeleton height={140} borderRadius={22} />
              <Skeleton height={200} borderRadius={22} />
              <Skeleton height={160} borderRadius={22} />
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(400)}>
              {/* 1. 月历 */}
              <CalendarView
                currentMonth={currentMonth}
                markedDates={markedDates}
                todayStr={toLocalDateStr(new Date())}
                onDayPress={onDayPress}
                onMonthChange={onMonthChange}
              />

              {/* 2. AI 饮食分析（上移） */}
              <AiInsightsCard />

              {/* 3. 本周热量柱状图 */}
              <WeeklyCaloriesChart chartData={chartData} />

              {/* 4. 本周营养分解（新接入） */}
              <WeeklyNutritionBreakdown stats={nutritionStats} />

              {/* 5. 本月统计 */}
              <MonthlyStats markedDates={markedDates} avgDailyCalories={avgDailyCalories} />
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* 点击某天 → 当天餐食详情弹窗 */}
      <DayMealsModal
        date={selectedMealDate}
        onClose={() => setSelectedMealDate(null)}
      />
    </SafeAreaView>
  );
}
