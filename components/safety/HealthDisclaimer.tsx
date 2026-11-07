import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

/** Standing "not medical advice, talk to a doctor first" note (App Review 1.4.1). */
export default function HealthDisclaimer() {
  const c = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 14, marginTop: 16, borderRadius: 14, borderWidth: 2, borderColor: c.borderPrimary }}>
      <Ionicons name="medkit-outline" size={20} color={c.textSecondary} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: c.textSecondary }}>{t('safety.disclaimer')}</Text>
    </View>
  );
}
