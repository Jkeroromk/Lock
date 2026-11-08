import { View } from 'react-native';
import { useTranslation } from '@/i18n';
import WheelPicker from '@/components/onboarding/WheelPicker';
import StepHeader from '@/components/onboarding/StepHeader';

// 选项数组
// Starts at 13, the minimum age in the Terms and Privacy Policy (i18n/legal.ts).
const ageOptions = Array.from({ length: 108 }, (_, i) => i + 13); // 13-120 岁

interface AgeSelectionProps {
  age: number;
  setAge: (value: number) => void;
}

export default function AgeSelection({ age, setAge }: AgeSelectionProps) {
  const { t } = useTranslation();

  return (
    <View style={{ width: '100%' }}>
      <StepHeader
        titleKey="onboarding.ageTitle"
        descriptionKey="onboarding.ageDescription"
      />
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
}

