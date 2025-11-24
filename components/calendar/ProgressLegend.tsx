import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

export default function ProgressLegend() {
  const { t } = useTranslation();
  const colors = useTheme();

  const legendItems = [
    { size: 8, color: colors.progressWhite, label: t('calendar.completed') },
    { size: 7, color: colors.progressLightGray, label: t('calendar.good') },
    { size: 6, color: colors.progressMediumGray, label: t('calendar.normal') },
    { size: 5, color: colors.progressDarkGray, label: t('calendar.insufficient') },
    { size: 4, color: colors.progressVeryDarkGray, label: t('calendar.veryLittle') },
  ];

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
        {t('calendar.progressExplanation')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {legendItems.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: index < legendItems.length - 1 ? DIMENSIONS.SPACING * 0.6 : 0 }}>
            <View 
              style={{ 
                width: item.size,
                height: item.size,
                borderRadius: item.size / 2,
                backgroundColor: item.color,
                marginRight: DIMENSIONS.SPACING * 0.6,
              }}
            />
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '600',
                color: colors.textPrimary,
              }}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

