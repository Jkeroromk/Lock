import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { MIN_AGE } from '@/constants/safety';
import { useTranslation } from '@/i18n';
import WheelPicker from '@/components/onboarding/WheelPicker';
import StepHeader from '@/components/onboarding/StepHeader';

// 选项数组
const ageOptions = Array.from({ length: 111 }, (_, i) => i + 10); // 10-120 岁

interface AgeSelectionProps {
  age: number;
  setAge: (value: number) => void;
}

export default function AgeSelection({ age, setAge }: AgeSelectionProps) {
  const { t } = useTranslation();
  const c = useTheme();

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
        {/* Lock is for adults (App Review 1.4.1); Next stays disabled below MIN_AGE. */}
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 14, fontWeight: age < MIN_AGE ? '800' : '500', color: age < MIN_AGE ? c.danger : c.textSecondary }}
        >
          {age < MIN_AGE ? t('safety.underageBody', { age: MIN_AGE }) : t('safety.ageNote', { age: MIN_AGE })}
        </Text>
      </View>
    </View>
  );
}

