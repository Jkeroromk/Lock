import { View } from 'react-native';
import { useTranslation } from '@/i18n';
import WheelPicker from '@/components/onboarding/WheelPicker';
import StepHeader from '@/components/onboarding/StepHeader';
import { Goal } from '@/store/useStore';

interface GoalSelectionProps {
  goal: Goal | null;
  setGoal: (value: Goal) => void;
}

export default function GoalSelection({ goal, setGoal }: GoalSelectionProps) {
  const { t } = useTranslation();

  const goalOptions: Goal[] = ['lose_weight', 'lose_fat', 'gain_muscle'];

  return (
    <View style={{ width: '100%' }}>
      <StepHeader
        titleKey="onboarding.goalTitle"
        descriptionKey="onboarding.goalDescription"
      />
      <View style={{ alignItems: 'center', width: '100%' }}>
        <WheelPicker
          options={goalOptions.map((g) => ({
            label: t(`onboarding.goal.${g}`),
            value: g,
          }))}
          value={goal || 'lose_weight'}
          onValueChange={(value) => setGoal(value as Goal)}
        />
      </View>
    </View>
  );
}

