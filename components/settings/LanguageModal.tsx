import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageCode, languageNames } from '@/i18n/locales';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface LanguageModalProps {
  visible: boolean;
  currentLanguage: LanguageCode;
  languages: LanguageCode[];
  onLanguageSelect: (lang: LanguageCode) => void;
  onClose: () => void;
}

export default function LanguageModal({
  visible,
  currentLanguage,
  languages,
  onLanguageSelect,
  onClose,
}: LanguageModalProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1}>
          <View style={{
            backgroundColor: colors.backgroundPrimary,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: DIMENSIONS.CARD_PADDING,
            paddingBottom: DIMENSIONS.CARD_PADDING * 2,
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: colors.borderPrimary,
          }}>
            {/* Handle */}
            <View style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: colors.borderPrimary,
              alignSelf: 'center',
              marginBottom: DIMENSIONS.SPACING * 1.2,
            }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
                {t('settings.language')}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {languages.map((langCode) => (
              <TouchableOpacity
                key={langCode}
                onPress={() => onLanguageSelect(langCode)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: DIMENSIONS.SPACING * 0.8,
                  paddingHorizontal: DIMENSIONS.SPACING * 0.8,
                  marginBottom: DIMENSIONS.SPACING * 0.4,
                  borderRadius: 14,
                  backgroundColor: currentLanguage === langCode ? colors.cardBackgroundSecondary : 'transparent',
                  borderWidth: currentLanguage === langCode ? 1 : 0,
                  borderColor: colors.borderSecondary,
                }}
              >
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: currentLanguage === langCode ? '900' : '500',
                  color: colors.textPrimary,
                }}>
                  {languageNames[langCode]}
                </Text>
                {currentLanguage === langCode && (
                  <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
