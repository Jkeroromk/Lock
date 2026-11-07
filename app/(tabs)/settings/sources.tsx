import { Linking, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import SettingsPage from '@/components/settings/SettingsPage';
import { SOURCES } from '@/constants/sources';

/** Where Lock's calorie, macro, water and step numbers come from (App Review 1.4.1). */
export default function SourcesScreen() {
  const c = useTheme();
  const { t } = useTranslation();
  return (
    <SettingsPage title={t('sources.title')} caption={t('sources.intro')}>
      {SOURCES.map((s) => (
        <TouchableOpacity
          key={s.id}
          accessibilityRole="link"
          onPress={() => Linking.openURL(s.url)}
          activeOpacity={0.8}
          style={{ borderWidth: 2, borderColor: c.borderPrimary, borderRadius: 14, padding: 14, marginBottom: 10 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: c.textPrimary }}>{t(`sources.${s.use}`)}</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 6 }}>{s.citation}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Ionicons name="open-outline" size={14} color={c.textPrimary} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: '700', color: c.textPrimary, textDecorationLine: 'underline' }}>
              {s.url.replace(/^https:\/\//, '')}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      <Text style={{ fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 6 }}>{t('safety.disclaimer')}</Text>
    </SettingsPage>
  );
}
