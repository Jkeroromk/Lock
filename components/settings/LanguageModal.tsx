import { View, Text, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LanguageCode, languageNames } from '@/i18n/locales';
import { useTranslation } from '@/i18n';
import {
  ALWAYS_INSTALLED,
  PACK_SIZES,
  getInstalledPacks,
  installPack,
  removePack,
} from '@/i18n/languagePacks';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

const ALL_LANGUAGES: LanguageCode[] = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR'];

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
  onLanguageSelect,
  onClose,
}: LanguageModalProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const [installed, setInstalled] = useState<LanguageCode[]>([ALWAYS_INSTALLED]);
  const [busy, setBusy] = useState<LanguageCode | null>(null);

  useEffect(() => {
    if (visible) {
      getInstalledPacks().then(setInstalled);
    }
  }, [visible]);

  const handleSelect = (lang: LanguageCode) => {
    if (!installed.includes(lang)) return;
    onLanguageSelect(lang);
  };

  const handleInstall = async (lang: LanguageCode) => {
    setBusy(lang);
    // Simulate a brief download delay
    await new Promise((r) => setTimeout(r, 1200));
    await installPack(lang);
    const updated = await getInstalledPacks();
    setInstalled(updated);
    setBusy(null);
  };

  const handleRemove = (lang: LanguageCode) => {
    Alert.alert(
      t('languagePack.removeConfirm'),
      t('languagePack.removeMessage').replace('{name}', languageNames[lang]),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('languagePack.remove'),
          style: 'destructive',
          onPress: async () => {
            setBusy(lang);
            await removePack(lang);
            const updated = await getInstalledPacks();
            setInstalled(updated);
            setBusy(null);
          },
        },
      ]
    );
  };

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

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.4 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
                {t('settings.language')}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, marginBottom: DIMENSIONS.SPACING }}>
              {t('languagePack.title')}
            </Text>

            {ALL_LANGUAGES.map((langCode) => {
              const isInstalled = installed.includes(langCode);
              const isActive = currentLanguage === langCode;
              const isBusy = busy === langCode;
              const isDefault = langCode === ALWAYS_INSTALLED;

              return (
                <TouchableOpacity
                  key={langCode}
                  onPress={() => isInstalled ? handleSelect(langCode) : undefined}
                  activeOpacity={isInstalled ? 0.7 : 1}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: DIMENSIONS.SPACING * 0.8,
                    paddingHorizontal: DIMENSIONS.SPACING * 0.8,
                    marginBottom: DIMENSIONS.SPACING * 0.4,
                    borderRadius: 14,
                    backgroundColor: isActive ? colors.cardBackgroundSecondary : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: colors.borderSecondary,
                    opacity: (!isInstalled && !isBusy) ? 0.6 : 1,
                  }}
                >
                  {/* Language name */}
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyS,
                      fontWeight: isActive ? '900' : '500',
                      color: colors.textPrimary,
                    }}>
                      {languageNames[langCode]}
                    </Text>
                    {!isInstalled && !isBusy && (
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary }}>
                        {t('languagePack.sizeEstimate').replace('{size}', PACK_SIZES[langCode])}
                      </Text>
                    )}
                    {isBusy && isInstalled === false && (
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary }}>
                        {t('languagePack.installing')}
                      </Text>
                    )}
                  </View>

                  {/* Right side */}
                  {isBusy ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : isActive ? (
                    <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
                  ) : isInstalled ? (
                    !isDefault ? (
                      <TouchableOpacity
                        onPress={() => handleRemove(langCode)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{
                          fontSize: TYPOGRAPHY.bodyXS,
                          fontWeight: '700',
                          color: '#EF4444',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#EF4444',
                          overflow: 'hidden',
                        }}>
                          {t('languagePack.remove')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary }}>
                        {t('languagePack.installed')}
                      </Text>
                    )
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleInstall(langCode)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{
                        fontSize: TYPOGRAPHY.bodyXS,
                        fontWeight: '700',
                        color: colors.textPrimary,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.borderPrimary,
                        overflow: 'hidden',
                      }}>
                        {t('languagePack.install')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
