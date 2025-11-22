import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import WheelPicker from '@/components/onboarding/WheelPicker';
import { Gender, Goal, ExerciseFrequency, ExpectedTimeframe } from '@/store/useStore';

interface OnboardingStepsProps {
  step: string;
  // Height
  height: number;
  setHeight: (value: number) => void;
  heightUnit: 'cm' | 'ft';
  setHeightUnit: (unit: 'cm' | 'ft') => void;
  heightFeet: number;
  setHeightFeet: (value: number) => void;
  heightInches: number;
  setHeightInches: (value: number) => void;
  // Age
  age: number;
  setAge: (value: number) => void;
  // Weight
  weight: number;
  setWeight: (value: number) => void;
  // Gender
  gender: Gender | null;
  setGender: (value: Gender) => void;
  // Goal
  goal: Goal | null;
  setGoal: (value: Goal) => void;
  // Exercise Frequency
  exerciseFrequency: ExerciseFrequency | null;
  setExerciseFrequency: (value: ExerciseFrequency) => void;
  // Expected Timeframe
  expectedTimeframe: ExpectedTimeframe | null;
  setExpectedTimeframe: (value: ExpectedTimeframe) => void;
}

// 选项数组
const heightOptions = Array.from({ length: 151 }, (_, i) => i + 100); // 100-250 cm
const feetOptions = Array.from({ length: 5 }, (_, i) => i + 3); // 3-7 feet
const inchesOptions = Array.from({ length: 12 }, (_, i) => i); // 0-11 inches
const ageOptions = Array.from({ length: 111 }, (_, i) => i + 10); // 10-120 岁
const weightOptions = Array.from({ length: 281 }, (_, i) => i + 20); // 20-300 kg

export default function OnboardingSteps({
  step,
  height,
  setHeight,
  heightUnit,
  setHeightUnit,
  heightFeet,
  setHeightFeet,
  heightInches,
  setHeightInches,
  age,
  setAge,
  weight,
  setWeight,
  gender,
  setGender,
  goal,
  setGoal,
  exerciseFrequency,
  setExerciseFrequency,
  expectedTimeframe,
  setExpectedTimeframe,
}: OnboardingStepsProps) {
  const { t } = useTranslation();

  switch (step) {
    case 'height':
      return (
        <View style={{ width: '100%' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.4,
              textAlign: 'center',
            }}
          >
            {t('onboarding.heightTitle')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '500',
              color: COLORS.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 1.5,
              textAlign: 'center',
            }}
          >
            {t('onboarding.heightDescription')}
          </Text>

          {/* 单位选择 */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 1, gap: DIMENSIONS.SPACING * 0.6 }}>
            <TouchableOpacity
              onPress={() => setHeightUnit('cm')}
              style={{
                paddingHorizontal: DIMENSIONS.SPACING * 1.2,
                paddingVertical: DIMENSIONS.SPACING * 0.6,
                borderRadius: 12,
                backgroundColor: heightUnit === 'cm' ? COLORS.textPrimary : COLORS.cardBackground,
                borderWidth: 2,
                borderColor: heightUnit === 'cm' ? COLORS.textPrimary : COLORS.borderPrimary,
              }}
            >
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: heightUnit === 'cm' ? COLORS.backgroundPrimary : COLORS.textPrimary,
                }}
              >
                {t('onboarding.cm')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHeightUnit('ft')}
              style={{
                paddingHorizontal: DIMENSIONS.SPACING * 1.2,
                paddingVertical: DIMENSIONS.SPACING * 0.6,
                borderRadius: 12,
                backgroundColor: heightUnit === 'ft' ? COLORS.textPrimary : COLORS.cardBackground,
                borderWidth: 2,
                borderColor: heightUnit === 'ft' ? COLORS.textPrimary : COLORS.borderPrimary,
              }}
            >
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: heightUnit === 'ft' ? COLORS.backgroundPrimary : COLORS.textPrimary,
                }}
              >
                {t('onboarding.ft')} / {t('onboarding.inch')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 身高选择器 */}
          <View style={{ alignItems: 'center', width: '100%' }}>
            {heightUnit === 'cm' ? (
              <WheelPicker
                options={heightOptions.map((h) => ({
                  label: `${h} ${t('onboarding.cm')}`,
                  value: h,
                }))}
                value={height}
                onValueChange={setHeight}
              />
            ) : (
              <View style={{ flexDirection: 'row', width: '100%', gap: DIMENSIONS.SPACING * 0.8, justifyContent: 'center' }}>
                <View style={{ flex: 1, maxWidth: '45%' }}>
                  <Text
                    style={{
                      fontSize: TYPOGRAPHY.bodyXS,
                      fontWeight: '600',
                      color: COLORS.textPrimary,
                      opacity: 0.7,
                      textAlign: 'center',
                      marginBottom: DIMENSIONS.SPACING * 0.4,
                    }}
                  >
                    {t('onboarding.feet')}
                  </Text>
                  <WheelPicker
                    options={feetOptions.map((f) => ({
                      label: `${f} ${t('onboarding.ft')}`,
                      value: f,
                    }))}
                    value={heightFeet}
                    onValueChange={setHeightFeet}
                  />
                </View>
                <View style={{ flex: 1, maxWidth: '45%' }}>
                  <Text
                    style={{
                      fontSize: TYPOGRAPHY.bodyXS,
                      fontWeight: '600',
                      color: COLORS.textPrimary,
                      opacity: 0.7,
                      textAlign: 'center',
                      marginBottom: DIMENSIONS.SPACING * 0.4,
                    }}
                  >
                    {t('onboarding.inches')}
                  </Text>
                  <WheelPicker
                    options={inchesOptions.map((i) => ({
                      label: `${i} ${t('onboarding.inch')}`,
                      value: i,
                    }))}
                    value={heightInches}
                    onValueChange={setHeightInches}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      );

    case 'age':
      return (
        <View style={{ width: '100%' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.4,
              textAlign: 'center',
            }}
          >
            {t('onboarding.ageTitle')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '500',
              color: COLORS.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 1.5,
              textAlign: 'center',
            }}
          >
            {t('onboarding.ageDescription')}
          </Text>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <WheelPicker
              options={ageOptions.map((a) => ({
                label: `${a} ${t('onboarding.years')}`,
                value: a,
              }))}
              value={age}
              onValueChange={setAge}
            />
          </View>
        </View>
      );

    case 'weight':
      return (
        <View style={{ width: '100%' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.4,
              textAlign: 'center',
            }}
          >
            {t('onboarding.weightTitle')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '500',
              color: COLORS.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 1.5,
              textAlign: 'center',
            }}
          >
            {t('onboarding.weightDescription')}
          </Text>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <WheelPicker
              options={weightOptions.map((w) => ({
                label: `${w} ${t('onboarding.kg')}`,
                value: w,
              }))}
              value={weight}
              onValueChange={setWeight}
            />
          </View>
        </View>
      );

    case 'gender':
      return (
        <View style={{ width: '100%' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.4,
              textAlign: 'center',
            }}
          >
            {t('onboarding.genderTitle')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '500',
              color: COLORS.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 1.5,
              textAlign: 'center',
            }}
          >
            {t('onboarding.genderDescription')}
          </Text>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <WheelPicker
              options={(['male', 'female', 'other'] as Gender[]).map((g) => ({
                label: t(`onboarding.gender.${g}`),
                value: g,
              }))}
              value={gender || 'male'}
              onValueChange={(value) => setGender(value as Gender)}
            />
          </View>
        </View>
      );

    case 'goal':
      return (
        <View style={{ width: '100%' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.4,
              textAlign: 'center',
            }}
          >
            {t('onboarding.goalTitle')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '500',
              color: COLORS.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 1.5,
              textAlign: 'center',
            }}
          >
            {t('onboarding.goalDescription')}
          </Text>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <WheelPicker
              options={(['lose_weight', 'lose_fat', 'gain_muscle'] as Goal[]).map((g) => ({
                label: t(`onboarding.goal.${g}`),
                value: g,
              }))}
              value={goal || 'lose_weight'}
              onValueChange={(value) => setGoal(value as Goal)}
            />
          </View>
        </View>
      );

    case 'exerciseFrequency':
      return (
        <View style={{ width: '100%' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.4,
              textAlign: 'center',
            }}
          >
            {t('onboarding.exerciseFrequencyTitle')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '500',
              color: COLORS.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 1.5,
              textAlign: 'center',
            }}
          >
            {t('onboarding.exerciseFrequencyDescription')}
          </Text>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <WheelPicker
              options={(['never', 'rarely', '1-2', '3-4', '5-6', 'daily'] as ExerciseFrequency[]).map((f) => ({
                label: t(`onboarding.exerciseFrequency.${f}`),
                value: f,
              }))}
              value={exerciseFrequency || 'rarely'}
              onValueChange={(value) => setExerciseFrequency(value as ExerciseFrequency)}
            />
          </View>
        </View>
      );

    case 'expectedTimeframe':
      return (
        <View style={{ width: '100%' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.4,
              textAlign: 'center',
            }}
          >
            {t('onboarding.expectedTimeframeTitle')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '500',
              color: COLORS.textPrimary,
              opacity: 0.7,
              marginBottom: DIMENSIONS.SPACING * 1.5,
              textAlign: 'center',
            }}
          >
            {t('onboarding.expectedTimeframeDescription')}
          </Text>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <WheelPicker
              options={(['1_month', '2-3_months', '4-6_months', '6-12_months', '1_year_plus'] as ExpectedTimeframe[]).map((tf) => ({
                label: t(`onboarding.expectedTimeframe.${tf}`),
                value: tf,
              }))}
              value={expectedTimeframe || '2-3_months'}
              onValueChange={(value) => setExpectedTimeframe(value as ExpectedTimeframe)}
            />
          </View>
        </View>
      );

    default:
      return null;
  }
}


