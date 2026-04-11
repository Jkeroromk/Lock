import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';

interface MonthlyStatsProps {
  markedDates: any;
  avgDailyCalories: number;
}

export default function MonthlyStats({ markedDates, avgDailyCalories }: MonthlyStatsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { dailyCalorieGoal } = useStore();

  const dates = Object.values(markedDates) as any[];
  const completedDays = dates.filter((d: any) => d.progress >= 100).length;
  const daysWithData = dates.filter((d: any) => d.calories > 0).length;
  const avgProgress = daysWithData === 0 ? 0 : dates.reduce((sum, d) => sum + (d.progress || 0), 0) / dates.length;
  const bestDay = Math.max(...dates.map((d: any) => d.calories || 0));

  const stats = [
    { label: t('calendar.completedDays'), value: `${completedDays}`, sub: t('dashboard.days') },
    { label: t('calendar.avgProgress'), value: `${Math.round(avgProgress)}%`, sub: null },
    { label: t('calendar.avgDaily'), value: `${avgDailyCalories}`, sub: 'kcal' },
    { label: t('today.target'), value: `${dailyCalorieGoal}`, sub: 'kcal' },
  ];

  return (
    <View style={{
      borderRadius: 20,
      padding: DIMENSIONS.SPACING * 1.2,
      marginBottom: DIMENSIONS.SPACING * 1.2,
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.borderPrimary,
    }}>
      <Text style={{
        fontSize: TYPOGRAPHY.title,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: DIMENSIONS.SPACING,
      }}>
        {t('calendar.monthlyStats')}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: DIMENSIONS.SPACING * 0.6 }}>
        {stats.map((stat, i) => (
          <View key={i} style={{
            flex: 1,
            minWidth: '45%',
            backgroundColor: colors.cardBackgroundSecondary,
            borderRadius: 16,
            padding: DIMENSIONS.SPACING,
            borderWidth: 1,
            borderColor: colors.borderSecondary,
          }}>
            <Text style={{
              fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600',
              color: colors.textPrimary, opacity: 0.6,
              marginBottom: DIMENSIONS.SPACING * 0.3,
            }}>
              {stat.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <Text style={{ fontSize: TYPOGRAPHY.numberS, fontWeight: '900', color: colors.textPrimary }}>
                {stat.value}
              </Text>
              {stat.sub && (
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.5 }}>
                  {stat.sub}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
