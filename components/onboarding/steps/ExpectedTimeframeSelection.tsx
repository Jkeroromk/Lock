import { View } from 'react-native';
import { useTranslation } from '@/i18n';
import WheelPicker from '@/components/onboarding/WheelPicker';
import StepHeader from '@/components/onboarding/StepHeader';
import { ExpectedTimeframe } from '@/store/useStore';

interface ExpectedTimeframeSelectionProps {
  expectedTimeframe: ExpectedTimeframe | null;
  setExpectedTimeframe: (value: ExpectedTimeframe) => void;
}

export default function ExpectedTimeframeSelection({
  expectedTimeframe,
  setExpectedTimeframe,
}: ExpectedTimeframeSelectionProps) {
  const { t } = useTranslation();

  const timeframeOptions: ExpectedTimeframe[] = [
    '1_month',
    '2-3_months',
    '4-6_months',
    '6-12_months',
    '1_year_plus',
  ];

  return (
    <View style={{ width: '100%' }}>
      <StepHeader
        titleKey="onboarding.expectedTimeframeTitle"
        descriptionKey="onboarding.expectedTimeframeDescription"
      />
      <View style={{ alignItems: 'center', width: '100%' }}>
        <WheelPicker
          options={timeframeOptions.map((tf) => ({
            label: t(`onboarding.expectedTimeframe.${tf}`),
            value: tf,
          }))}
          value={expectedTimeframe || '2-3_months'}
          onValueChange={(value) => setExpectedTimeframe(value as ExpectedTimeframe)}
        />
      </View>
    </View>
  );
}

