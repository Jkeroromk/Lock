import { View, Alert } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Button } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import CompletionAnimation from '@/components/onboarding/CompletionAnimation';
import OnboardingSteps from '@/components/onboarding/OnboardingSteps';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useOnboardingAnimation } from '@/hooks/useOnboardingAnimation';

const STEPS = [
  'theme',
  'height',
  'age',
  'weight',
  'gender',
  'goal',
  'exerciseFrequency',
  'expectedTimeframe',
] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, setUser, setThemeMode } = useStore();
  const colors = useTheme();
  const isLight = colors.backgroundPrimary !== colors.ink;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lockState, setLockState] = useState<'open' | 'closed'>('open');

  // 使用数据管理 hook
  const onboardingData = useOnboardingData();

  // 当用户选择主题时，立即更新 store，使主题立即生效
  const handleThemeChange = (themeMode: 'light' | 'dark' | 'auto') => {
    onboardingData.setThemeMode(themeMode);
    setThemeMode(themeMode); // 立即更新 store，使主题立即生效
  };

  // 使用动画 hook
  const {
    containerAnimatedStyle,
    lockContainerAnimatedStyle,
    openLockAnimatedStyle,
    closedLockAnimatedStyle,
    startCompletionAnimation,
  } = useOnboardingAnimation({
    user,
    setUser,
    setLockState,
    onboardingData: {
      height: onboardingData.height,
      age: onboardingData.age,
      weight: onboardingData.weight,
      gender: onboardingData.gender,
      goal: onboardingData.goal,
      exerciseFrequency: onboardingData.exerciseFrequency,
      expectedTimeframe: onboardingData.expectedTimeframe,
    },
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (STEPS[currentStep]) {
      case 'theme':
        return onboardingData.themeMode !== null;
      case 'height':
        return onboardingData.height > 0;
      case 'age':
        return onboardingData.age > 0;
      case 'weight':
        return onboardingData.weight > 0;
      case 'gender':
        return onboardingData.gender !== null;
      case 'goal':
        return onboardingData.goal !== null;
      case 'exerciseFrequency':
        return onboardingData.exerciseFrequency !== null;
      case 'expectedTimeframe':
        return onboardingData.expectedTimeframe !== null;
      default:
        return false;
    }
  };

  const handleComplete = () => {
    // 验证所有字段
    if (!onboardingData.gender || !onboardingData.goal || !onboardingData.exerciseFrequency || !onboardingData.expectedTimeframe || !onboardingData.themeMode) {
      Alert.alert(t('onboarding.error'), t('onboarding.fillAllFields'));
      return;
    }

    // 设置主题模式
    if (onboardingData.themeMode) {
      setThemeMode(onboardingData.themeMode);
    }

    setLockState('open');
    setIsCompleting(true);
    startCompletionAnimation();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      {isCompleting && (
        <CompletionAnimation
          containerAnimatedStyle={containerAnimatedStyle}
          lockContainerAnimatedStyle={lockContainerAnimatedStyle}
          openLockAnimatedStyle={openLockAnimatedStyle}
          closedLockAnimatedStyle={closedLockAnimatedStyle}
        />
      )}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom: 16,
        }}
      >
        {/* Progress */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase' }}>
            {t('onboarding.step', { current: currentStep + 1, total: STEPS.length })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 5 }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: currentStep + 1 }}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1, height: 10, borderRadius: 4,
                  backgroundColor: i <= currentStep ? colors.accent : 'transparent',
                  borderWidth: 1.5,
                  borderColor: i <= currentStep && !isLight ? colors.accent : isLight ? colors.ink : colors.borderSecondary,
                }}
              />
            ))}
          </View>
        </View>

        {/* Step Content */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <OnboardingSteps
            step={STEPS[currentStep]}
            height={onboardingData.height}
            setHeight={onboardingData.setHeight}
            heightUnit={onboardingData.heightUnit}
            setHeightUnit={onboardingData.setHeightUnit}
            heightFeet={onboardingData.heightFeet}
            setHeightFeet={onboardingData.setHeightFeet}
            heightInches={onboardingData.heightInches}
            setHeightInches={onboardingData.setHeightInches}
            age={onboardingData.age}
            setAge={onboardingData.setAge}
            weight={onboardingData.weight}
            setWeight={onboardingData.setWeight}
            weightUnit={onboardingData.weightUnit}
            setWeightUnit={onboardingData.setWeightUnit}
            weightLb={onboardingData.weightLb}
            setWeightLb={onboardingData.setWeightLb}
            gender={onboardingData.gender}
            setGender={onboardingData.setGender}
            goal={onboardingData.goal}
            setGoal={onboardingData.setGoal}
            exerciseFrequency={onboardingData.exerciseFrequency}
            setExerciseFrequency={onboardingData.setExerciseFrequency}
            expectedTimeframe={onboardingData.expectedTimeframe}
            setExpectedTimeframe={onboardingData.setExpectedTimeframe}
            themeMode={onboardingData.themeMode}
            setThemeMode={handleThemeChange}
          />
        </View>

        {/* Navigation */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
          <Button
            label={t('onboarding.back')}
            variant="outline"
            onPress={() => {
              if (currentStep === 0) router.push('/(auth)/language-selection');
              else handleBack();
            }}
            style={{ flex: 1 }}
          />
          <Button
            label={currentStep === STEPS.length - 1 ? t('onboarding.complete') : t('onboarding.next')}
            icon={currentStep === STEPS.length - 1 ? 'lock-closed' : undefined}
            disabled={!canProceed()}
            onPress={handleNext}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
