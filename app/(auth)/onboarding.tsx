import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import CompletionAnimation from '@/components/onboarding/CompletionAnimation';
import OnboardingSteps from '@/components/onboarding/OnboardingSteps';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useOnboardingAnimation } from '@/hooks/useOnboardingAnimation';

const STEPS = [
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
  const { user, setUser } = useStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lockState, setLockState] = useState<'open' | 'closed'>('open');

  // 使用数据管理 hook
  const onboardingData = useOnboardingData();

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
    if (!onboardingData.gender || !onboardingData.goal || !onboardingData.exerciseFrequency || !onboardingData.expectedTimeframe) {
      Alert.alert(t('onboarding.error'), t('onboarding.fillAllFields'));
      return;
    }

    setLockState('open');
    setIsCompleting(true);
    startCompletionAnimation();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.backgroundPrimary }}>
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
          paddingHorizontal: DIMENSIONS.CARD_PADDING,
          paddingTop: DIMENSIONS.SPACING * 2,
          paddingBottom: DIMENSIONS.SPACING * 3,
        }}
      >
        {/* Progress Indicator */}
        <View style={{ marginBottom: DIMENSIONS.SPACING * 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.6 }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '600',
                color: COLORS.textPrimary,
                opacity: 0.7,
              }}
            >
              {t('onboarding.step', { current: currentStep + 1, total: STEPS.length })}
            </Text>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '600',
                color: COLORS.textPrimary,
                opacity: 0.7,
              }}
            >
              {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: COLORS.cardBackgroundSecondary, borderRadius: 2, overflow: 'hidden' }}>
            <View 
              style={{ 
                height: '100%', 
                width: `${((currentStep + 1) / STEPS.length) * 100}%`, 
                backgroundColor: COLORS.textPrimary,
                borderRadius: 2,
              }} 
            />
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
          />
        </View>

        {/* Navigation Buttons */}
        <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.8, marginTop: DIMENSIONS.SPACING * 2 }}>
          {currentStep >= 0 && (
            <TouchableOpacity
              onPress={() => {
                if (currentStep === 0) {
                  // 如果是第一步，导航到语言选择页面
                  router.push('/(auth)/language-selection');
                } else {
                  handleBack();
                }
              }}
              style={{
                flex: 1,
                paddingVertical: DIMENSIONS.SPACING * 0.9,
                backgroundColor: COLORS.cardBackground,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: COLORS.borderPrimary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                }}
              >
                {t('onboarding.back')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canProceed()}
            style={{
              flex: 1,
              paddingVertical: DIMENSIONS.SPACING * 0.9,
              backgroundColor: canProceed() ? COLORS.textPrimary : COLORS.cardBackgroundSecondary,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canProceed() ? 1 : 0.5,
            }}
          >
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '700',
                color: canProceed() ? COLORS.backgroundPrimary : COLORS.textSecondary,
              }}
            >
              {currentStep === STEPS.length - 1 ? t('onboarding.complete') : t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
