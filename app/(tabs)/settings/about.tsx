import { useCallback, useState } from 'react';
import { View, Image, Linking, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getLastJsError, clearLastJsError, type JsErrorRecord } from '@/lib/crashlog';
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
  const [lastError, setLastError] = useState<JsErrorRecord | null>(null);
  useFocusEffect(useCallback(() => {
    setAppIcon(getAppIconOption(getCurrentAppIcon()));
    getLastJsError().then(setLastError);
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

      {lastError ? (
        // Diagnostics for testers: the last JS error that crashed the app (or that a feature recovered from).
        <Card padding={14} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, textTransform: 'uppercase' }}>
            Last error · {lastError.where} · {lastError.at.replace('T', ' ').slice(0, 19)}
          </Text>
          <Text selectable style={{ fontFamily: FONTS.mono, fontSize: 11, lineHeight: 16, color: c.textPrimary, marginTop: 6 }}>
            {lastError.message}
            {lastError.stack ? `\n\n${lastError.stack}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
            <TouchableOpacity accessibilityRole="button" onPress={() => Clipboard.setStringAsync(`${lastError.where} ${lastError.at}\n${lastError.message}\n${lastError.stack ?? ''}`)}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.textPrimary }}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => { clearLastJsError(); setLastError(null); }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.textSecondary }}>Clear</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : null}
      <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, textAlign: 'center', marginTop: 20 }}>
        {t('about.madeWith')}
      </Text>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, textAlign: 'center', marginTop: 4 }}>
        {t('about.copyright')}
      </Text>
    </SettingsPage>
  );
}
