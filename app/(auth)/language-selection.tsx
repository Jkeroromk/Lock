import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStore } from '@/store/useStore';
import { LanguageCode } from '@/i18n/locales';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import LanguageWheelPicker from '@/components/onboarding/LanguageWheelPicker';
import { useCallback } from 'react';

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const { language, setLanguage, setHasSelectedLanguage } = useStore();
  const { t } = useTranslation();
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

  const languages: LanguageCode[] = ['zh-CN', 'en-US', 'zh-TW', 'ja-JP', 'ko-KR'];

  const handleLanguageChange = (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    setLanguage(lang); // 立即更新语言，这样翻译会立即生效
  };

  const handleContinue = () => {
    setHasSelectedLanguage(true);
    router.push('/(auth)/onboarding'); // 使用 push 而不是 replace，允许返回
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.backgroundPrimary }}>
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
          <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 2 }}>
            <View 
              style={{ 
                width: DIMENSIONS.SCREEN_WIDTH * 0.1,
                height: DIMENSIONS.SCREEN_WIDTH * 0.1,
                borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.05,
                backgroundColor: COLORS.textPrimary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: DIMENSIONS.SPACING * 0.6,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.title,
                  fontWeight: '900',
                  color: COLORS.backgroundPrimary,
                }}
              >
                L
              </Text>
            </View>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.title,
                fontWeight: '900',
                color: COLORS.textPrimary,
                marginBottom: DIMENSIONS.SPACING * 0.2,
              }}
            >
              Lock
            </Text>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '600',
                color: COLORS.textPrimary,
                opacity: 0.7,
                textAlign: 'center',
              }}
            >
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

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            style={{
              width: '100%',
              paddingVertical: DIMENSIONS.SPACING * 0.8,
              backgroundColor: COLORS.textPrimary,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '700',
                color: COLORS.backgroundPrimary,
              }}
            >
              {t('languageSelection.continue')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

