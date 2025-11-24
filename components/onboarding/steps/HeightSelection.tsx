import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import WheelPicker from '@/components/onboarding/WheelPicker';
import StepHeader from '@/components/onboarding/StepHeader';
import UnitToggle from '@/components/onboarding/UnitToggle';

// 选项数组
const heightOptions = Array.from({ length: 151 }, (_, i) => i + 100); // 100-250 cm
const feetOptions = Array.from({ length: 5 }, (_, i) => i + 3); // 3-7 feet
const inchesOptions = Array.from({ length: 12 }, (_, i) => i); // 0-11 inches

interface HeightSelectionProps {
  height: number;
  setHeight: (value: number) => void;
  heightUnit: 'cm' | 'ft';
  setHeightUnit: (unit: 'cm' | 'ft') => void;
  heightFeet: number;
  setHeightFeet: (value: number) => void;
  heightInches: number;
  setHeightInches: (value: number) => void;
}

export default function HeightSelection({
  height,
  setHeight,
  heightUnit,
  setHeightUnit,
  heightFeet,
  setHeightFeet,
  heightInches,
  setHeightInches,
}: HeightSelectionProps) {
  const { t } = useTranslation();

  return (
    <View style={{ width: '100%' }}>
      <StepHeader
        titleKey="onboarding.heightTitle"
        descriptionKey="onboarding.heightDescription"
      />

      <UnitToggle
        options={[
          { value: 'cm' as const, label: t('onboarding.cm') },
          { value: 'ft' as const, label: `${t('onboarding.ft')} / ${t('onboarding.inch')}` },
        ]}
        selectedValue={heightUnit}
        onValueChange={setHeightUnit}
      />

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
}

