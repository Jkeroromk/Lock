import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface NutritionStat {
  label: string;
  value: number;
  color: string;
}

interface WeeklyNutritionBreakdownProps {
  stats: NutritionStat[];
}

export default function WeeklyNutritionBreakdown({ stats }: WeeklyNutritionBreakdownProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const total = stats.reduce((s, d) => s + d.value, 0) || 1;

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
      <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', marginBottom: DIMENSIONS.SPACING * 1.2, color: colors.textPrimary }}>
        {t('calendar.weeklyNutrition')}
      </Text>

      {/* Stacked proportion bar */}
      <View style={{
        flexDirection: 'row',
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: colors.cardBackgroundSecondary,
      }}>
        {stats.map((stat, i) => (
          <View
            key={i}
            style={{
              flex: stat.value / total,
              backgroundColor: stat.color,
              opacity: total === 1 ? 0.3 : 1,
            }}
          />
        ))}
      </View>

      {/* Stats rows */}
      {stats.map((stat, index) => {
        const pct = Math.round((stat.value / total) * 100);
        return (
          <View key={index} style={{ marginBottom: index < stats.length - 1 ? DIMENSIONS.SPACING * 0.9 : 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 10, height: 10, borderRadius: 5,
                  marginRight: DIMENSIONS.SPACING * 0.6,
                  backgroundColor: stat.color,
                }} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                  {stat.label}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
                  {stat.value}g
                </Text>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.5 }}>
                  {pct}%
                </Text>
              </View>
            </View>
            <View style={{
              height: 6, borderRadius: 3,
              backgroundColor: colors.cardBackgroundSecondary,
              overflow: 'hidden',
            }}>
              <View style={{
                height: '100%',
                width: total === 1 ? '0%' : `${pct}%`,
                backgroundColor: stat.color,
                borderRadius: 3,
              }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
