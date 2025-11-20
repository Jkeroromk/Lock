import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

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

  return (
    <View 
      style={{ 
        borderRadius: 24,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 2,
        borderColor: COLORS.borderPrimary,
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <Text 
        style={{ 
          fontSize: TYPOGRAPHY.title,
          fontWeight: '900',
          marginBottom: DIMENSIONS.SPACING * 1.2,
          color: COLORS.textPrimary,
        }}
      >
        {t('calendar.weeklyNutrition')}
      </Text>
      <View>
        {stats.map((stat, index) => (
          <View key={index} style={{ marginBottom: DIMENSIONS.SPACING }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View 
                  style={{ 
                    width: DIMENSIONS.SCREEN_WIDTH * 0.015,
                    height: DIMENSIONS.SCREEN_WIDTH * 0.015,
                    borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.015 / 2,
                    marginRight: DIMENSIONS.SPACING * 0.6,
                    backgroundColor: stat.color,
                  }} 
                />
                <Text 
                  style={{ 
                    fontSize: TYPOGRAPHY.bodyS,
                    fontWeight: '700',
                    color: COLORS.textPrimary,
                  }}
                >
                  {stat.label}
                </Text>
              </View>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '900',
                  color: COLORS.textPrimary,
                }}
              >
                {stat.value}g
              </Text>
            </View>
            <View 
              style={{ 
                height: 8,
                borderRadius: 4,
                backgroundColor: COLORS.cardBackgroundSecondary,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <View 
                style={{ 
                  height: '100%',
                  width: `${(stat.value / 200) * 100}%`,
                  backgroundColor: stat.color,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

