import { View, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface StepHeaderProps {
  titleKey: string;
  descriptionKey: string;
}

export default function StepHeader({ titleKey, descriptionKey }: StepHeaderProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <>
      <Text 
        style={{ 
          fontSize: TYPOGRAPHY.title,
          fontWeight: '900',
          color: colors.textPrimary,
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
          color: colors.textPrimary,
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

