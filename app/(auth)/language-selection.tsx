import { View, ScrollView, Image } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStore } from '@/store/useStore';
import { LanguageCode } from '@/i18n/locales';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Button, HardShadow } from '@/components/ui/bxc';
import LanguageWheelPicker from '@/components/onboarding/LanguageWheelPicker';
import { useCallback } from 'react';

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const { language, setLanguage, setHasSelectedLanguage } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language);
  const [pickerKey, setPickerKey] = useState(0); // 用于强制重新渲染 picker

  // 每次页面获得焦点时，重置 picker 以确保正确定位
  useFocusEffect(
    useCallback(() => {
      // 重置 selectedLanguage 为当前 store 中的 language
      setSelectedLanguage(language);
      // 强制重新渲染 picker，确保正确定位
      setPickerKey(prev => prev + 1);
    }, [language])
  );

  useEffect(() => {
    setSelectedLanguage(language);
    // 当语言改变时，强制重新渲染 picker 以修复定位问题
    setPickerKey(prev => prev + 1);
  }, [language]);

  const languages: LanguageCode[] = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR'];

  const handleLanguageChange = (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    setLanguage(lang); // 立即更新语言，这样翻译会立即生效
  };

  const handleContinue = () => {
    setHasSelectedLanguage(true);
    router.push('/(auth)/onboarding'); // 使用 push 而不是 replace，允许返回
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: DIMENSIONS.CARD_PADDING,
          paddingTop: DIMENSIONS.SPACING * 1.5,
          paddingBottom: DIMENSIONS.SPACING * 2,
        }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* Title */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <HardShadow color={colors.cardShadow} radius={19} style={{ transform: [{ rotate: '-4deg' }] }}>
              <Image source={require('@/assets/icons/preview-open-lock.png')} style={{ width: 84, height: 84, borderRadius: 19 }} accessibilityIgnoresInvertColors accessibilityLabel="Lock" />
            </HardShadow>
            <Text accessibilityRole="header" style={{ fontSize: 44, fontWeight: '800', letterSpacing: -1.8, color: colors.textPrimary, marginTop: 20 }}>
              Lock in.
            </Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 6, textTransform: 'uppercase' }}>
              {t('languageSelection.title')}
            </Text>
          </View>

          {/* Language Wheel Picker */}
          <View key={pickerKey} style={{ width: '100%', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.5 }}>
            <LanguageWheelPicker
              languages={languages}
              selectedValue={selectedLanguage}
              onValueChange={handleLanguageChange}
            />
          </View>

          <Button label={t('languageSelection.continue')} onPress={handleContinue} style={{ alignSelf: 'stretch' }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

