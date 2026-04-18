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
import SelectedDateInfo from '@/components/calendar/SelectedDateInfo';
import WeeklyCaloriesChart from '@/components/calendar/WeeklyCaloriesChart';
import MonthlyStats from '@/components/calendar/MonthlyStats';
import AiInsightsCard from '@/components/calendar/AiInsightsCard';

export default function CalendarScreen() {
  const { language, dailyCalorieGoal } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();

  // 用本地时间生成 YYYY-MM-DD，避免 toISOString() UTC 偏差导致跨天错误
  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateStr(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const [chartData, setChartData] = useState<{ day: string; calories: number }[]>([]);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return colors.progressWhite;
    if (progress >= 80) return colors.progressLightGray;
    if (progress >= 60) return colors.progressMediumGray;
    if (progress >= 40) return colors.progressDarkGray;
    return colors.progressVeryDarkGray;
  };

  const getWeekdayLabel = (dateStr: string) => {
    try {
      // new Date('YYYY-MM-DD') is parsed as UTC midnight → in UTC+8 renders as previous day
      // Force local noon to avoid any timezone boundary issues
      const [y, m, d] = dateStr.split('-').map(Number);
      const localDate = new Date(y, m - 1, d, 12, 0, 0);
      const formatter = new Intl.DateTimeFormat(language, { weekday: 'short' });
      return formatter.format(localDate);
    } catch {
      return dateStr.slice(5); // MM-DD fallback
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
    setSelectedDate(day.dateString);
  };

  const onMonthChange = (month: DateData) => {
    const newMonth = new Date(month.year, month.month - 1, 1);
    setCurrentMonth(newMonth);
    loadMonthlyData(month.year, month.month);
  };

  // Build markedDates from real monthly data
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
      let dotSize = 4;
      if (calories > 0) {
        if (progress >= 100) { dotColor = colors.progressWhite; dotSize = 8; }
        else if (progress >= 80) { dotColor = colors.progressLightGray; dotSize = 7; }
        else if (progress >= 60) { dotColor = colors.progressMediumGray; dotSize = 6; }
        else if (progress >= 40) { dotColor = colors.progressDarkGray; dotSize = 5; }
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
  const selectedDateData = markedDates[selectedDate];

  // Monthly stats: average daily calories from real data
  const daysWithData = Object.values(monthlyData).filter((d) => d.calories > 0);
  const avgDailyCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
    : 0;

  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']} style={{ backgroundColor: colors.backgroundPrimary }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8 }}>
          {/* Header */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <Text
              style={{
                fontSize: TYPOGRAPHY.titleL,
                fontWeight: '900',
                color: colors.textPrimary,
                letterSpacing: -2,
                marginBottom: DIMENSIONS.SPACING * 0.3,
                lineHeight: TYPOGRAPHY.titleL * 1.1,
              }}
            >
              {t('tabs.calendar')}
            </Text>
            <Text
              style={{
                fontSize: TYPOGRAPHY.body,
                fontWeight: '500',
                color: colors.textPrimary,
                opacity: 0.7,
              }}
            >
              {t('calendar.calorieOverview')}
            </Text>
          </View>

          {loading ? (
            <View style={{ gap: DIMENSIONS.SPACING * 0.8 }}>
              <Skeleton height={320} borderRadius={24} />
              <Skeleton height={80} borderRadius={18} />
              <Skeleton height={200} borderRadius={24} />
              <Skeleton height={160} borderRadius={24} />
              <Skeleton height={120} borderRadius={20} />
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(400)}>
              <CalendarView
                currentMonth={currentMonth}
                markedDates={markedDates}
                selectedDate={selectedDate}
                onDayPress={onDayPress}
                onMonthChange={onMonthChange}
              />

              {selectedDateData && (
                <SelectedDateInfo
                  selectedDate={selectedDate}
                  selectedDateData={selectedDateData}
                  getProgressColor={getProgressColor}
                />
              )}

              <WeeklyCaloriesChart chartData={chartData} />

              <MonthlyStats markedDates={markedDates} avgDailyCalories={avgDailyCalories} />

              <AiInsightsCard />
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
