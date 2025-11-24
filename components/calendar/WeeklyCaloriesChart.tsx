import { View, Text } from 'react-native';
import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis, VictoryTheme } from 'victory-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface WeeklyCaloriesChartProps {
  chartData: Array<{ day: string; calories: number }>;
}

export default function WeeklyCaloriesChart({ chartData }: WeeklyCaloriesChartProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View 
      style={{ 
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
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.title,
            fontWeight: '900',
            color: colors.textPrimary,
          }}
        >
          {t('calendar.weeklyCalories')}
        </Text>
        <View 
          style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: DIMENSIONS.SPACING * 0.6,
            paddingVertical: DIMENSIONS.SPACING * 0.3,
            borderRadius: 20,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 1,
            borderColor: colors.borderSecondary,
          }}
        >
          <View 
            style={{ 
              width: DIMENSIONS.SCREEN_WIDTH * 0.015,
              height: DIMENSIONS.SCREEN_WIDTH * 0.015,
              borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.015 / 2,
              marginRight: DIMENSIONS.SPACING * 0.4,
              backgroundColor: colors.textPrimary,
            }} 
          />
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '700',
              color: colors.textPrimary,
            }}
          >
            {t('calendar.thisWeek')}
          </Text>
        </View>
      </View>
      <View style={{ height: DIMENSIONS.SCREEN_WIDTH * 0.6, overflow: 'hidden' }}>
        <VictoryChart
          theme={VictoryTheme.material}
          height={DIMENSIONS.SCREEN_WIDTH * 0.6}
          width={DIMENSIONS.SCREEN_WIDTH - DIMENSIONS.CARD_PADDING * 2 - DIMENSIONS.SPACING * 2.4}
          padding={{ left: DIMENSIONS.SCREEN_WIDTH * 0.1, right: DIMENSIONS.SCREEN_WIDTH * 0.08, top: DIMENSIONS.SCREEN_WIDTH * 0.06, bottom: DIMENSIONS.SCREEN_WIDTH * 0.1 }}
        >
          <VictoryAxis
            tickFormat={(t) => t}
            style={{
              tickLabels: { fontSize: 11, fill: colors.textPrimary, fontFamily: 'System', fontWeight: '600' },
              axis: { stroke: colors.borderPrimary },
              grid: { stroke: colors.borderPrimary, strokeDasharray: '4,4' },
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              tickLabels: { fontSize: 11, fill: colors.textPrimary, fontFamily: 'System', fontWeight: '600' },
              axis: { stroke: colors.borderPrimary },
              grid: { stroke: colors.borderPrimary, strokeDasharray: '4,4' },
            }}
          />
          <VictoryArea
            data={chartData}
            x="day"
            y="calories"
            style={{
              data: { 
                fill: colors.textPrimary,
                fillOpacity: 0.2,
                stroke: colors.textPrimary,
                strokeWidth: 3,
              },
            }}
          />
          <VictoryLine
            data={chartData}
            x="day"
            y="calories"
            style={{
              data: { 
                stroke: colors.textPrimary,
                strokeWidth: 3,
              },
            }}
          />
        </VictoryChart>
      </View>
    </View>
  );
}

