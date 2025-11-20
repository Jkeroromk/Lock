import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageCode, languageNames } from '@/i18n/locales';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0, 0, 0, 0.8)', 
        justifyContent: 'flex-end' 
      }}>
        <View style={{ 
          backgroundColor: COLORS.cardBackground, 
          borderTopLeftRadius: 20, 
          borderTopRightRadius: 20,
          padding: DIMENSIONS.SPACING * 1.2,
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderRightWidth: 2,
          borderColor: COLORS.borderPrimary,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1.0 }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyL,
                fontWeight: '900',
                color: COLORS.textPrimary,
              }}
            >
              {t('settings.language')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={TYPOGRAPHY.iconM} color={COLORS.textPrimary} />
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
                borderRadius: 12,
                backgroundColor: currentLanguage === langCode ? COLORS.cardBackgroundSecondary : 'transparent',
                borderWidth: currentLanguage === langCode ? 1 : 0,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: currentLanguage === langCode ? '700' : '500',
                  color: COLORS.textPrimary,
                }}
              >
                {languageNames[langCode]}
              </Text>
              {currentLanguage === langCode && (
                <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

