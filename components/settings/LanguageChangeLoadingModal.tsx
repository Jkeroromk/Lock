import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface LanguageChangeLoadingModalProps {
  visible: boolean;
}

export default function LanguageChangeLoadingModal({ visible }: LanguageChangeLoadingModalProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <Modal animationType="fade" transparent={true} visible={visible} statusBarTranslucent={true}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: colors.backgroundPrimary,
          borderRadius: 24, padding: DIMENSIONS.SPACING * 2,
          alignItems: 'center', borderWidth: 2, borderColor: colors.borderPrimary,
        }}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
          <Text style={{
            color: colors.textPrimary, marginTop: DIMENSIONS.SPACING,
            fontSize: TYPOGRAPHY.bodyS, fontWeight: '600',
          }}>
            {t('settings.changingLanguage')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
