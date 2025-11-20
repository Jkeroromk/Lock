import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

export default function ProgressLegend() {
  const { t } = useTranslation();

  const legendItems = [
    { size: 8, color: COLORS.progressWhite, label: t('calendar.completed') },
    { size: 7, color: COLORS.progressLightGray, label: t('calendar.good') },
    { size: 6, color: COLORS.progressMediumGray, label: t('calendar.normal') },
    { size: 5, color: COLORS.progressDarkGray, label: t('calendar.insufficient') },
    { size: 4, color: COLORS.progressVeryDarkGray, label: t('calendar.veryLittle') },
  ];

  return (
    <View 
      style={{ 
        borderRadius: 20,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 2,
        borderColor: COLORS.borderPrimary,
      }}
    >
      <Text 
        style={{ 
          fontSize: TYPOGRAPHY.body,
          fontWeight: '900',
          color: COLORS.textPrimary,
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
                color: COLORS.textPrimary,
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

