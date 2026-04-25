import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface DateHeaderProps {
  language: string;
  streak?: number;
}

export default function DateHeader({ language, streak = 0 }: DateHeaderProps) {
  const { t } = useTranslation();
  const locale = language === 'zh-CN' ? 'zh-CN' : language === 'zh-TW' ? 'zh-TW' : language === 'ja-JP' ? 'ja-JP' : language === 'ko-KR' ? 'ko-KR' : 'en-US';

  return (
    <View style={{ marginBottom: DIMENSIONS.SPACING * 0.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View>
          <Text
            style={{
              fontSize: TYPOGRAPHY.body,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.1,
            }}
          >
            {new Date().toLocaleDateString(locale, { month: 'long', day: 'numeric' })}
          </Text>
          <Text
            style={{
              fontSize: TYPOGRAPHY.bodyXS,
              fontWeight: '500',
              color: COLORS.textPrimary,
              opacity: 0.7,
            }}
          >
            {new Date().toLocaleDateString(locale, { weekday: 'long' })}
          </Text>
        </View>
      </View>

      {/* Streak badge */}
      {streak > 0 && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          paddingHorizontal: DIMENSIONS.SPACING * 0.8,
          paddingVertical: DIMENSIONS.SPACING * 0.35,
          backgroundColor: streak >= 7 ? '#F59E0B22' : COLORS.cardBackground,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: streak >= 7 ? '#F59E0B44' : COLORS.borderPrimary,
        }}>
          <Text style={{ fontSize: 14 }}>🔥</Text>
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXS,
            fontWeight: '900',
            color: streak >= 7 ? '#F59E0B' : COLORS.textPrimary,
          }}>
            {streak} {t('dashboard.days')}
          </Text>
        </View>
      )}
    </View>
  );
}

