import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface MonthlyStatsProps {
  markedDates: any;
  avgDailyCalories: number;
}

export default function MonthlyStats({ markedDates, avgDailyCalories }: MonthlyStatsProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const completedDays = Object.values(markedDates).filter((d: any) => d.progress >= 100).length;
  const dates = Object.values(markedDates) as any[];
  const avgProgress = dates.length === 0 ? 0 : dates.reduce((sum, d) => sum + (d.progress || 0), 0) / dates.length;

  return (
    <View 
      style={{ 
        borderRadius: 20,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.borderPrimary,
      }}
    >
      <Text 
        style={{ 
          fontSize: TYPOGRAPHY.body,
          fontWeight: '900',
          color: colors.textPrimary,
          marginBottom: DIMENSIONS.SPACING * 0.8,
        }}
      >
        {t('calendar.monthlyStats')}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <View style={{ width: '48%', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '600',
              color: colors.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 0.3,
            }}
          >
            {t('calendar.completedDays')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.numberS,
              fontWeight: '900',
              color: colors.textPrimary,
            }}
          >
            {completedDays}
          </Text>
        </View>
        <View style={{ width: '48%', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '600',
              color: colors.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 0.3,
            }}
          >
            {t('calendar.avgProgress')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.numberS,
              fontWeight: '900',
              color: colors.textPrimary,
            }}
          >
            {Math.round(avgProgress)}%
          </Text>
        </View>
        <View style={{ width: '48%' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '600',
              color: colors.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 0.3,
            }}
          >
            {t('calendar.avgDaily')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.numberS,
              fontWeight: '900',
              color: colors.textPrimary,
            }}
          >
            {avgDailyCalories} {t('today.kcal')}
          </Text>
        </View>
      </View>
    </View>
  );
}

