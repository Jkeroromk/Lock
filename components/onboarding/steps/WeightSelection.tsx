import { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/i18n';
import WheelPicker from '@/components/onboarding/WheelPicker';
import StepHeader from '@/components/onboarding/StepHeader';
import UnitToggle from '@/components/onboarding/UnitToggle';

// 选项数组
const weightOptions = Array.from({ length: 281 }, (_, i) => i + 20); // 20-300 kg
const weightLbOptions = Array.from({ length: 441 }, (_, i) => i + 44); // 44-484 lb (约 20-220 kg)

interface WeightSelectionProps {
  weight: number;
  setWeight: (value: number) => void;
  weightUnit: 'kg' | 'lb';
  setWeightUnit: (unit: 'kg' | 'lb') => void;
  weightLb: number;
  setWeightLb: (value: number) => void;
}

export default function WeightSelection({
  weight,
  setWeight,
  weightUnit,
  setWeightUnit,
  weightLb,
  setWeightLb,
}: WeightSelectionProps) {
  const { t } = useTranslation();
  const [uiWeightUnit, setUiWeightUnit] = useState(weightUnit);

  // 同步外部状态到本地 UI 状态，确保外界更新时按钮也能正确显示
  useEffect(() => {
    setUiWeightUnit(weightUnit);
  }, [weightUnit]);

  const handleUnitChange = useCallback(
    (unit: 'kg' | 'lb') => {
      setUiWeightUnit(unit); // 立即更新按钮 UI
      setWeightUnit(unit); // 通知外层状态
    },
    [setWeightUnit]
  );

  return (
    <View style={{ width: '100%' }}>
      <StepHeader
        titleKey="onboarding.weightTitle"
        descriptionKey="onboarding.weightDescription"
      />

      <UnitToggle
        options={[
          { value: 'kg' as const, label: t('onboarding.kg') },
          { value: 'lb' as const, label: t('onboarding.lb') },
        ]}
        selectedValue={uiWeightUnit}
        onValueChange={handleUnitChange}
      />

      <View style={{ alignItems: 'center', width: '100%' }}>
        {uiWeightUnit === 'kg' ? (
          <WheelPicker
            options={weightOptions.map((w) => ({
              label: `${w} ${t('onboarding.kg')}`,
              value: w,
            }))}
            value={weight}
            onValueChange={setWeight}
          />
        ) : (
          <WheelPicker
            options={weightLbOptions.map((w) => ({
              label: `${w} ${t('onboarding.lb')}`,
              value: w,
            }))}
            value={weightLb}
            onValueChange={setWeightLb}
          />
        )}
      </View>
    </View>
  );
}

