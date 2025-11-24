import { View } from 'react-native';
import { useTranslation } from '@/i18n';
import WheelPicker from '@/components/onboarding/WheelPicker';
import StepHeader from '@/components/onboarding/StepHeader';
import { Gender } from '@/store/useStore';

interface GenderSelectionProps {
  gender: Gender | null;
  setGender: (value: Gender) => void;
}

export default function GenderSelection({ gender, setGender }: GenderSelectionProps) {
  const { t } = useTranslation();

  const genderOptions: Gender[] = ['male', 'female', 'other'];

  return (
    <View style={{ width: '100%' }}>
      <StepHeader
        titleKey="onboarding.genderTitle"
        descriptionKey="onboarding.genderDescription"
      />
      <View style={{ alignItems: 'center', width: '100%' }}>
        <WheelPicker
          options={genderOptions.map((g) => ({
            label: t(`onboarding.gender.${g}`),
            value: g,
          }))}
          value={gender || 'male'}
          onValueChange={(value) => setGender(value as Gender)}
        />
      </View>
    </View>
  );
}

