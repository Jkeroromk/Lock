import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import Skeleton from '@/components/ui/Skeleton';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { Appear, ScreenHeader } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { fetchMonthlyData, fetchWeeklyData, MonthlyData } from '@/services/api';

type WeeklyDayData = Awaited<ReturnType<typeof fetchWeeklyData>>[number];

// Survive tab switches and remounts for the whole app session.
const monthCache = new Map<string, MonthlyData>();
let weekCache: { uid: string; days: WeeklyDayData[] } | null = null;
import CalendarView, { type DayMark } from '@/components/calendar/CalendarView';
import WeeklyCaloriesChart from '@/components/calendar/WeeklyCaloriesChart';
import WeeklyNutritionBreakdown from '@/components/calendar/WeeklyNutritionBreakdown';
import MonthlyStats from '@/components/calendar/MonthlyStats';
import AiInsightsCard from '@/components/calendar/AiInsightsCard';
import DayMealsModal from '@/components/calendar/DayMealsModal';

export default function CalendarScreen() {
  const { language, dailyCalorieGoal, user } = useStore();
  const uid = user?.id ?? 'anon';
  const { t } = useTranslation();
  const colors = useTheme();

  // 本地日期字符串（避免 toISOString UTC 偏差）
  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Cache keys include the user so another account never sees stale data.
  const monthKey = (d: Date) => `${uid}:${d.getFullYear()}-${d.getMonth() + 1}`;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData>(() => monthCache.get(monthKey(new Date())) ?? {});
  // Skeleton only on the very first visit; afterwards cached data shows instantly
  // and fresh data is swapped in quietly.
  const [loading, setLoading] = useState(() => !monthCache.has(monthKey(new Date())));
  const [chartData, setChartData] = useState<{ day: string; calories: number }[]>([]);
  const [weeklyNutrition, setWeeklyNutrition] = useState<{ protein: number; carbs: number; fat: number }>({ protein: 0, carbs: 0, fat: 0 });
  const currentKey = useRef(monthKey(new Date()));
  const monthRef = useRef(new Date());

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

  const applyWeekly = (days: WeeklyDayData[]) => {
    setChartData(days.map((d) => ({ day: getWeekdayLabel(d.date), calories: d.calories })));
    const totals = days.reduce(
      (acc, d) => ({ protein: acc.protein + (d.protein || 0), carbs: acc.carbs + (d.carbs || 0), fat: acc.fat + (d.fat || 0) }),
      { protein: 0, carbs: 0, fat: 0 }
    );
    setWeeklyNutrition({ protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat) });
  };

  const loadMonthlyData = useCallback(async (year: number, month: number) => {
    const key = monthKey(new Date(year, month - 1, 1));
    try {
      const data = await fetchMonthlyData(year, month);
      monthCache.set(key, data);
      if (currentKey.current === key) setMonthlyData(data);
    } catch {}
  }, []);

  const loadWeeklyData = useCallback(async () => {
    try {
      const days = await fetchWeeklyData();
      weekCache = { uid, days };
      applyWeekly(days);
    } catch {}
  }, [language]);

  // On every visit: refresh quietly. No skeleton unless there's nothing to show.
  useFocusEffect(
    useCallback(() => {
      const wc = weekCache;
      if (wc && wc.uid === uid) applyWeekly(wc.days);
      const m = monthRef.current;
      Promise.all([loadMonthlyData(m.getFullYear(), m.getMonth() + 1), loadWeeklyData()])
        .finally(() => setLoading(false));
      // Warm the previous month so the back arrow is instant.
      const prev = new Date(m.getFullYear(), m.getMonth() - 1, 1);
      if (!monthCache.has(monthKey(prev))) {
        fetchMonthlyData(prev.getFullYear(), prev.getMonth() + 1).then((d) => monthCache.set(monthKey(prev), d)).catch(() => {});
      }
    }, [])
  );

  const onDayPress = (dateStr: string) => {
    setSelectedMealDate(dateStr);
  };

  const onMonthChange = (month: Date) => {
    const key = monthKey(month);
    currentKey.current = key;
    monthRef.current = month;
    setCurrentMonth(month);
    setMonthlyData(monthCache.get(key) ?? {});
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
            <View>
              <Appear index={0}>
              <CalendarView
                currentMonth={currentMonth}
                markedDates={markedDates}
                todayStr={toLocalDateStr(new Date())}
                onDayPress={onDayPress}
                onMonthChange={onMonthChange}
              />

              </Appear>
              <Appear index={1}><AiInsightsCard /></Appear>
              <Appear index={2}><WeeklyCaloriesChart chartData={chartData} /></Appear>
              <Appear index={3}><WeeklyNutritionBreakdown stats={nutritionStats} /></Appear>
              <Appear index={4}><MonthlyStats markedDates={markedDates} avgDailyCalories={avgDailyCalories} /></Appear>
            </View>
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
