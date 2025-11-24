import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';

interface SelectedDateInfoProps {
  selectedDate: string;
  selectedDateData: {
    calories: number;
    progress: number;
  };
  getProgressColor: (progress: number) => string;
}

export default function SelectedDateInfo({ selectedDate, selectedDateData, getProgressColor }: SelectedDateInfoProps) {
  const { t } = useTranslation();
  const { language } = useStore();
  const colors = useTheme();

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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
        <View 
          style={{ 
            width: DIMENSIONS.SCREEN_WIDTH * 0.1,
            height: DIMENSIONS.SCREEN_WIDTH * 0.1,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DIMENSIONS.SPACING * 0.6,
            backgroundColor: colors.cardBackgroundSecondary,
          }}
        >
          <Ionicons name="calendar" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.body,
              fontWeight: '900',
              color: colors.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.2,
            }}
          >
            {new Date(selectedDate).toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : language === 'zh-TW' ? 'zh-TW' : language === 'ja-JP' ? 'ja-JP' : language === 'ko-KR' ? 'ko-KR' : 'en-US', { 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View 
              style={{ 
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: getProgressColor(selectedDateData.progress),
                marginRight: DIMENSIONS.SPACING * 0.4,
              }}
            />
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '600',
                color: colors.textPrimary,
                opacity: 0.7,
              }}
            >
              {t('calendar.progress')}：{Math.round(selectedDateData.progress)}%
            </Text>
          </View>
        </View>
      </View>
      
      <View 
        style={{ 
          borderRadius: 16,
          padding: DIMENSIONS.SPACING * 1.2,
          backgroundColor: colors.cardBackgroundSecondary,
          borderWidth: 1,
          borderColor: colors.borderSecondary,
        }}
      >
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.numberL,
            fontWeight: '900',
            marginBottom: DIMENSIONS.SPACING * 0.4,
            color: colors.textPrimary,
            lineHeight: TYPOGRAPHY.numberL * 1.1,
          }}
        >
          {selectedDateData.calories}
        </Text>
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.body,
            fontWeight: '700',
            color: colors.textPrimary,
          }}
        >
          {t('today.kcal')}
        </Text>
      </View>
    </View>
  );
}

