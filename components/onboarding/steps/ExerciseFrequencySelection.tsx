import { View } from 'react-native';
import { useTranslation } from '@/i18n';
import WheelPicker from '@/components/onboarding/WheelPicker';
import StepHeader from '@/components/onboarding/StepHeader';
import { ExerciseFrequency } from '@/store/useStore';

interface ExerciseFrequencySelectionProps {
  exerciseFrequency: ExerciseFrequency | null;
  setExerciseFrequency: (value: ExerciseFrequency) => void;
}

export default function ExerciseFrequencySelection({
  exerciseFrequency,
  setExerciseFrequency,
}: ExerciseFrequencySelectionProps) {
  const { t } = useTranslation();

  const frequencyOptions: ExerciseFrequency[] = ['never', 'rarely', '1-2', '3-4', '5-6', 'daily'];

  return (
    <View style={{ width: '100%' }}>
      <StepHeader
        titleKey="onboarding.exerciseFrequencyTitle"
        descriptionKey="onboarding.exerciseFrequencyDescription"
      />
      <View style={{ alignItems: 'center', width: '100%' }}>
        <WheelPicker
          options={frequencyOptions.map((f) => ({
            label: t(`onboarding.exerciseFrequency.${f}`),
            value: f,
          }))}
          value={exerciseFrequency || 'rarely'}
          onValueChange={(value) => setExerciseFrequency(value as ExerciseFrequency)}
        />
      </View>
    </View>
  );
}

