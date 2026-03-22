import { View, Text } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryLine, VictoryTheme } from 'victory-native';
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

  const maxCalories = Math.max(...chartData.map((d) => d.calories), dailyCalorieGoal * 1.1);

  const getBarColor = (calories: number) => {
    if (calories === 0) return colors.borderSecondary;
    const pct = calories / dailyCalorieGoal;
    if (pct >= 1.0) return colors.textPrimary;
    if (pct >= 0.8) return colors.progressLightGray;
    if (pct >= 0.6) return colors.progressMediumGray;
    return colors.progressDarkGray;
  };

  const chartWidth = DIMENSIONS.SCREEN_WIDTH - DIMENSIONS.CARD_PADDING * 2 - DIMENSIONS.SPACING * 2.4;

  const totalCalories = chartData.reduce((s, d) => s + d.calories, 0);
  const activeDays = chartData.filter((d) => d.calories > 0).length;

  return (
    <View style={{
      borderRadius: 24,
      padding: DIMENSIONS.SPACING * 1.2,
      marginBottom: DIMENSIONS.SPACING * 1.2,
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.borderPrimary,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING }}>
        <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
          {t('calendar.weeklyCalories')}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: TYPOGRAPHY.numberS, fontWeight: '900', color: colors.textPrimary }}>
            {totalCalories.toLocaleString()}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.6 }}>
            {t('calendar.thisWeek')} · {activeDays}{t('calendar.completedDays')}
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={{ height: DIMENSIONS.SCREEN_WIDTH * 0.55, overflow: 'hidden' }}>
        <VictoryChart
          theme={VictoryTheme.material}
          height={DIMENSIONS.SCREEN_WIDTH * 0.55}
          width={chartWidth}
          padding={{
            left: DIMENSIONS.SCREEN_WIDTH * 0.1,
            right: DIMENSIONS.SCREEN_WIDTH * 0.04,
            top: DIMENSIONS.SCREEN_WIDTH * 0.05,
            bottom: DIMENSIONS.SCREEN_WIDTH * 0.1,
          }}
          domain={{ y: [0, maxCalories] }}
        >
          <VictoryAxis
            style={{
              tickLabels: { fontSize: 11, fill: colors.textPrimary, fontFamily: 'System', fontWeight: '600', opacity: 0.8 },
              axis: { stroke: 'transparent' },
              grid: { stroke: 'transparent' },
            }}
          />
          <VictoryAxis
            dependentAxis
            tickCount={4}
            style={{
              tickLabels: { fontSize: 10, fill: colors.textPrimary, fontFamily: 'System', fontWeight: '600', opacity: 0.6 },
              axis: { stroke: 'transparent' },
              grid: { stroke: colors.borderSecondary, strokeDasharray: '4,4', opacity: 0.5 },
            }}
          />
          {/* Goal line */}
          <VictoryLine
            y={() => dailyCalorieGoal}
            style={{
              data: { stroke: colors.textPrimary, strokeWidth: 1.5, strokeDasharray: '6,4', opacity: 0.4 },
            }}
          />
          <VictoryBar
            data={chartData}
            x="day"
            y="calories"
            cornerRadius={{ top: 6 }}
            barRatio={0.6}
            style={{
              data: {
                fill: ({ datum }: { datum: { calories: number } }) => getBarColor(datum.calories),
                opacity: ({ datum }: { datum: { calories: number } }) => datum.calories === 0 ? 0.3 : 1,
              },
            }}
          />
        </VictoryChart>
      </View>

      {/* Goal label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: DIMENSIONS.SPACING * 0.4 }}>
        <View style={{ width: 24, height: 2, backgroundColor: colors.textPrimary, opacity: 0.4, marginRight: 6, borderStyle: 'dashed' }} />
        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.5 }}>
          {t('settings.goals')} {dailyCalorieGoal} kcal
        </Text>
      </View>
    </View>
  );
}
