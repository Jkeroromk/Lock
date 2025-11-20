import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface LanguageChangeLoadingModalProps {
  visible: boolean;
}

export default function LanguageChangeLoadingModal({ visible }: LanguageChangeLoadingModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <ActivityIndicator size="large" color={COLORS.textPrimary} />
        <Text style={{ color: COLORS.textPrimary, marginTop: DIMENSIONS.SPACING }}>{t('settings.changingLanguage')}</Text>
      </View>
    </Modal>
  );
}

