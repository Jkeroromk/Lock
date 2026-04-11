import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface WeeklyCaloriesChartProps {
  chartData: Array<{ day: string; calories: number }>;
}

export default function WeeklyCaloriesChart({ chartData }: WeeklyCaloriesChartProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { dailyCalorieGoal } = useStore();

  const maxCalories = Math.max(...chartData.map((d) => d.calories), dailyCalorieGoal);
  const totalCalories = chartData.reduce((s, d) => s + d.calories, 0);
  const activeDays = chartData.filter((d) => d.calories > 0).length;
  const BAR_HEIGHT = 140;

  const getBarColor = (calories: number) => {
    if (calories === 0) return colors.borderPrimary;
    const pct = calories / dailyCalorieGoal;
    if (pct >= 1.0) return colors.textPrimary;
    if (pct >= 0.8) return colors.progressLightGray;
    if (pct >= 0.6) return colors.progressMediumGray;
    return colors.progressDarkGray;
  };

  return (
    <View style={{
      borderRadius: 24,
      padding: DIMENSIONS.SPACING * 1.2,
      marginBottom: DIMENSIONS.SPACING * 1.2,
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.borderPrimary,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
        <View>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            {t('calendar.weeklyCalories')}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.titleM, fontWeight: '900', color: colors.textPrimary, lineHeight: TYPOGRAPHY.titleM * 1.1 }}>
            {totalCalories.toLocaleString()}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>
            {t('calendar.thisWeek')} · {activeDays} {t('calendar.completedDays')}
          </Text>
        </View>
        {/* Goal badge */}
        <View style={{
          backgroundColor: colors.cardBackgroundSecondary,
          borderRadius: 10, borderWidth: 1, borderColor: colors.borderPrimary,
          paddingHorizontal: DIMENSIONS.SPACING * 0.7,
          paddingVertical: DIMENSIONS.SPACING * 0.35,
          flexDirection: 'row', alignItems: 'center', gap: 5,
        }}>
          <View style={{ width: 14, height: 1.5, backgroundColor: colors.textPrimary, opacity: 0.5 }} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>
            {t('settings.goals')} {dailyCalorieGoal}
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_HEIGHT + 24 }}>
        {chartData.map((item, i) => {
          const pct = maxCalories > 0 ? item.calories / maxCalories : 0;
          const barH = Math.max(pct * BAR_HEIGHT, item.calories > 0 ? 6 : 3);
          const goalLine = (dailyCalorieGoal / maxCalories) * BAR_HEIGHT;
          const isToday = i === chartData.length - 1;

          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', height: BAR_HEIGHT + 24, justifyContent: 'flex-end' }}>
              {/* Calories label above bar */}
              {item.calories > 0 && (
                <Text style={{
                  fontSize: 9, fontWeight: '700', color: colors.textSecondary,
                  marginBottom: 3, opacity: 0.8,
                }}>
                  {item.calories >= 1000 ? `${(item.calories / 1000).toFixed(1)}k` : item.calories}
                </Text>
              )}
              {/* Bar container with goal line */}
              <View style={{ width: '100%', height: BAR_HEIGHT, justifyContent: 'flex-end', position: 'relative' }}>
                {/* Goal dashed line */}
                <View style={{
                  position: 'absolute', bottom: goalLine, left: 0, right: 0,
                  height: 1.5, backgroundColor: colors.textPrimary, opacity: 0.15,
                }} />
                {/* Bar */}
                <View style={{
                  width: '100%', height: barH,
                  borderRadius: 6,
                  backgroundColor: getBarColor(item.calories),
                  opacity: item.calories === 0 ? 0.25 : 1,
                }} />
              </View>
              {/* Day label */}
              <Text style={{
                fontSize: TYPOGRAPHY.bodyXXS, fontWeight: isToday ? '900' : '600',
                color: isToday ? colors.textPrimary : colors.textSecondary,
                marginTop: 6,
              }}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
