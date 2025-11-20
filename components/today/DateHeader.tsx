import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface DateHeaderProps {
  language: string;
}

export default function DateHeader({ language }: DateHeaderProps) {
  const locale = language === 'zh-CN' ? 'zh-CN' : language === 'zh-TW' ? 'zh-TW' : language === 'ja-JP' ? 'ja-JP' : language === 'ko-KR' ? 'ko-KR' : 'en-US';
  
  return (
    <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2, flexDirection: 'row', alignItems: 'center' }}>
      <View 
        style={{ 
          width: DIMENSIONS.SCREEN_WIDTH * 0.1,
          height: DIMENSIONS.SCREEN_WIDTH * 0.1,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: DIMENSIONS.SPACING * 0.6,
          backgroundColor: COLORS.cardBackground,
          borderWidth: 1,
          borderColor: COLORS.borderPrimary,
        }}
      >
        <Ionicons name="calendar" size={TYPOGRAPHY.iconXS} color={COLORS.textPrimary} />
      </View>
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
  );
}

