import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface StepHeaderProps {
  titleKey: string;
  descriptionKey: string;
}

export default function StepHeader({ titleKey, descriptionKey }: StepHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <Text 
        style={{ 
          fontSize: TYPOGRAPHY.title,
          fontWeight: '900',
          color: COLORS.textPrimary,
          marginBottom: DIMENSIONS.SPACING * 0.4,
          textAlign: 'center',
        }}
      >
        {t(titleKey)}
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
        {t(descriptionKey)}
      </Text>
    </>
  );
}

