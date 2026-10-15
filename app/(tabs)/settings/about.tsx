import { useCallback, useState } from 'react';
import { View, Image, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Card, HardShadow } from '@/components/ui/bxc';
import { getAppIconOption, getCurrentAppIcon } from '@/lib/appIcon';
import SettingItem from '@/components/settings/SettingItem';
import SettingsPage, { SettingsSection } from '@/components/settings/SettingsPage';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// Which JS bundle is running: lets us check whether an OTA update arrived.
const BUILD_INFO = Updates.isEnabled
  ? [
    Updates.channel || 'no channel',
    `rt ${(Updates.runtimeVersion || '?').slice(0, 7)}`,
    Updates.isEmbeddedLaunch ? 'embedded' : `ota ${(Updates.updateId || '').slice(0, 8)}`,
  ].join(' · ')
  : 'updates off';

/** About Lock: what it is, version, legal links and contact. (App icon lives in Preferences.) */
export default function AboutScreen() {
  const router = useRouter();
  const c = useTheme();
  const { t } = useTranslation();
  const [appIcon, setAppIcon] = useState(() => getAppIconOption(getCurrentAppIcon()));
  useFocusEffect(useCallback(() => {
    setAppIcon(getAppIconOption(getCurrentAppIcon()));
  }, []));

  return (
    <SettingsPage title={t('about.title')}>
      <Card padding={18} style={{ marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <HardShadow color={c.cardShadow} radius={17} offset={4} style={{ transform: [{ rotate: '-4deg' }] }}>
            <Image source={appIcon.preview} style={{ width: 72, height: 72, borderRadius: 16 }} accessibilityIgnoresInvertColors />
          </HardShadow>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: -1.2, color: c.textPrimary }}>Lock in.</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 2, textTransform: 'uppercase' }}>
              {t('about.version')} {APP_VERSION}
            </Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSecondary, marginTop: 2, opacity: 0.7 }}>
              {BUILD_INFO}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.textSecondary, marginTop: 14 }}>{t('about.description')}</Text>
      </Card>

      <SettingsSection label={t('about.legal')} />
      <SettingItem icon="shield-outline" title={t('about.privacyPolicy')} onPress={() => router.push('/(tabs)/settings/privacy-policy')} />
      <SettingItem icon="document-text-outline" title={t('about.termsOfService')} onPress={() => router.push('/(tabs)/settings/terms-of-service')} />
      <SettingItem icon="mail-outline" title={t('about.contact')} value={t('about.contactEmail')} onPress={() => Linking.openURL(`mailto:${t('about.contactEmail')}`)} />

      <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, textAlign: 'center', marginTop: 20 }}>
        {t('about.madeWith')}
      </Text>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, textAlign: 'center', marginTop: 4 }}>
        {t('about.copyright')}
      </Text>
    </SettingsPage>
  );
}
