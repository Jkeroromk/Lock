import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Skeleton from '@/components/ui/Skeleton';
import { DateData } from 'react-native-calendars';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { fetchMonthlyData, fetchWeeklyData, MonthlyData } from '@/services/api';
import CalendarView from '@/components/calendar/CalendarView';
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

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return colors.progressWhite;
    if (progress >= 80) return colors.progressLightGray;
    if (progress >= 60) return colors.progressMediumGray;
    if (progress >= 40) return colors.progressDarkGray;
    return colors.progressVeryDarkGray;
  };

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
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    }
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
    } catch (error) {
      console.error('Failed to load weekly data:', error);
    }
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

  const onDayPress = (day: DateData) => {
    setSelectedMealDate(day.dateString);
  };

  const onMonthChange = (month: DateData) => {
    const newMonth = new Date(month.year, month.month - 1, 1);
    setCurrentMonth(newMonth);
    loadMonthlyData(month.year, month.month);
  };

  const buildMarkedDates = () => {
    const markedDates: any = {};
    const today = new Date();
    const year = currentMonth.getFullYear();
    const monthNum = currentMonth.getMonth();
    const daysInMonth = new Date(year, monthNum + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthNum, day);
      const dateStr = toLocalDateStr(date);
      const dayData = monthlyData[dateStr];
      const calories = dayData?.calories || 0;
      const progress = calories > 0 ? Math.min((calories / dailyCalorieGoal) * 100, 100) : 0;

      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === monthNum &&
        today.getDate() === day;

      let dotColor: string = colors.progressVeryDarkGray;
      if (calories > 0) {
        if (progress >= 100) dotColor = colors.progressWhite;
        else if (progress >= 80) dotColor = colors.progressLightGray;
        else if (progress >= 60) dotColor = colors.progressMediumGray;
        else if (progress >= 40) dotColor = colors.progressDarkGray;
      }

      markedDates[dateStr] = {
        marked: calories > 0,
        dotColor,
        selected: isToday,
        selectedColor: colors.cardBackground,
        customStyles: {
          container: {
            backgroundColor: isToday ? colors.cardBackgroundSecondary : 'transparent',
            borderRadius: 8,
          },
          text: {
            color: colors.textPrimary,
            fontWeight: isToday ? '900' : '600',
          },
        },
        calories,
        progress,
      };
    }
    return markedDates;
  };

  const markedDates = buildMarkedDates();

  const daysWithData = Object.values(monthlyData).filter((d) => d.calories > 0);
  const avgDailyCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
    : 0;

  const nutritionStats = [
    { label: t('today.protein'), value: weeklyNutrition.protein, color: '#6366F1' },
    { label: t('today.carbs'), value: weeklyNutrition.carbs, color: '#F59E0B' },
    { label: t('today.fat'), value: weeklyNutrition.fat, color: '#EF4444' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8 }}>
          {/* Header */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <Text style={{
              fontSize: TYPOGRAPHY.titleL, fontWeight: '900',
              color: colors.textPrimary, letterSpacing: -2,
              marginBottom: DIMENSIONS.SPACING * 0.3,
              lineHeight: TYPOGRAPHY.titleL * 1.1,
            }}>
              {t('tabs.calendar')}
            </Text>
            <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '500', color: colors.textPrimary, opacity: 0.7 }}>
              {t('calendar.calorieOverview')}
            </Text>
          </View>

          {loading ? (
            <View style={{ gap: DIMENSIONS.SPACING * 0.8 }}>
              <Skeleton height={320} borderRadius={24} />
              <Skeleton height={160} borderRadius={24} />
              <Skeleton height={200} borderRadius={24} />
              <Skeleton height={160} borderRadius={24} />
              <Skeleton height={120} borderRadius={20} />
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(400)}>
              {/* 1. 月历 */}
              <CalendarView
                currentMonth={currentMonth}
                markedDates={markedDates}
                selectedDate={toLocalDateStr(new Date())}
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
