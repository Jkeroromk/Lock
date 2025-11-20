import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { DateData } from 'react-native-calendars';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import CalendarView from '@/components/calendar/CalendarView';
import SelectedDateInfo from '@/components/calendar/SelectedDateInfo';
import ProgressLegend from '@/components/calendar/ProgressLegend';
import WeeklyCaloriesChart from '@/components/calendar/WeeklyCaloriesChart';
import WeeklyNutritionBreakdown from '@/components/calendar/WeeklyNutritionBreakdown';
import MonthlyStats from '@/components/calendar/MonthlyStats';

// 生成示例数据（实际应该从store或API获取）
const generateMarkedDates = (year: number, month: number) => {
  const markedDates: any = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    
    // 模拟每日卡路里数据
    const targetCalories = 2000;
    const consumedCalories = Math.floor(Math.random() * 2500) + 500; // 500-3000
    const progress = Math.min((consumedCalories / targetCalories) * 100, 100);
    
    // 根据进度设置标记样式
    let dotColor: string = COLORS.progressVeryDarkGray; // 默认深灰
    let dotSize = 4; // 默认小点
    
    if (progress >= 100) {
      dotColor = COLORS.progressWhite; // 完成目标 - 白色
      dotSize = 8; // 大点
    } else if (progress >= 80) {
      dotColor = COLORS.progressLightGray; // 80-100% - 浅灰
      dotSize = 7;
    } else if (progress >= 60) {
      dotColor = COLORS.progressMediumGray; // 60-80% - 中灰
      dotSize = 6;
    } else if (progress >= 40) {
      dotColor = COLORS.progressDarkGray; // 40-60% - 深灰
      dotSize = 5;
    }
    
    const isToday = 
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day;
    
    markedDates[dateString] = {
      marked: true,
      dotColor,
      selected: isToday,
      selectedColor: COLORS.cardBackground,
      customStyles: {
        container: {
          backgroundColor: isToday ? COLORS.cardBackgroundSecondary : 'transparent',
          borderRadius: 8,
        },
        text: {
          color: COLORS.textPrimary,
          fontWeight: isToday ? '900' : '600',
        },
      },
      calories: consumedCalories,
      progress,
    };
  }
  
  return markedDates;
};

export default function CalendarScreen() {
  const { language } = useStore();
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const markedDates = generateMarkedDates(year, month);
  
  const selectedDateData = markedDates[selectedDate];
  
  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };
  
  const onMonthChange = (month: DateData) => {
    setCurrentMonth(new Date(month.year, month.month - 1, 1));
  };
  
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return COLORS.progressWhite;
    if (progress >= 80) return COLORS.progressLightGray;
    if (progress >= 60) return COLORS.progressMediumGray;
    if (progress >= 40) return COLORS.progressDarkGray;
    return COLORS.progressVeryDarkGray;
  };
  
  // 生成星期名称（根据语言）
  const getWeekdayNames = () => {
    const locale = language;
    const baseDate = new Date(2024, 0, 1);
    const weekdays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      try {
        const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
        weekdays.push(formatter.format(date));
      } catch (error) {
        const defaultNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        weekdays.push(defaultNames[i]);
      }
    }
    return weekdays;
  };
  
  const weekdayNames = getWeekdayNames();
  
  // 生成图表数据
  const chartData = [
    { day: weekdayNames[0], calories: 1800 },
    { day: weekdayNames[1], calories: 2200 },
    { day: weekdayNames[2], calories: 1900 },
    { day: weekdayNames[3], calories: 2100 },
    { day: weekdayNames[4], calories: 2000 },
    { day: weekdayNames[5], calories: 2300 },
    { day: weekdayNames[6], calories: 1950 },
  ];

  // Mock nutrition stats
  const nutritionStats = [
    { label: t('log.protein'), value: 80, color: COLORS.proteinColor },
    { label: t('log.carbs'), value: 150, color: COLORS.carbsColor },
    { label: t('log.fat'), value: 50, color: COLORS.fatColor },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.backgroundPrimary }}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 20 : 30 }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8 }}>
          {/* Header */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.titleL,
                fontWeight: '900',
                color: COLORS.textPrimary,
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
                color: COLORS.textPrimary,
                opacity: 0.7,
              }}
            >
              {t('calendar.calorieOverview')}
            </Text>
          </View>

          {/* Calendar */}
          <CalendarView
            currentMonth={currentMonth}
            markedDates={markedDates}
            selectedDate={selectedDate}
            onDayPress={onDayPress}
            onMonthChange={onMonthChange}
          />

          {/* Selected Date Info */}
          {selectedDateData && (
            <SelectedDateInfo 
              selectedDate={selectedDate}
              selectedDateData={selectedDateData}
              getProgressColor={getProgressColor}
            />
          )}

          {/* Legend */}
          <ProgressLegend />

          {/* Weekly Calories Chart */}
          <WeeklyCaloriesChart chartData={chartData} />

          {/* Weekly Nutrition Breakdown */}
          <WeeklyNutritionBreakdown stats={nutritionStats} />

          {/* Monthly Stats */}
          <MonthlyStats markedDates={markedDates} avgDailyCalories={2036} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
