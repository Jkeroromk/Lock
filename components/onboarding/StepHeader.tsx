import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
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
          fontSize: 34,
          fontWeight: '800',
          letterSpacing: -1.2,
          lineHeight: 36,
          color: colors.textPrimary,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {t(titleKey)}
      </Text>
      <Text 
        style={{ 
          fontSize: 15,
          lineHeight: 21,
          color: colors.textSecondary,
          marginBottom: DIMENSIONS.SPACING * 1.5,
          textAlign: 'center',
        }}
      >
        {t(descriptionKey)}
      </Text>
    </>
  );
}

