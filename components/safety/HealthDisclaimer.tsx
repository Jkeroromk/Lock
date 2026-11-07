import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

/**
 * Standing "not medical advice, talk to a doctor first" note, with the link to
 * where the numbers come from (App Review 1.4.1: citations easy to find).
 */
export default function HealthDisclaimer() {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 14, marginTop: 16, borderRadius: 14, borderWidth: 2, borderColor: c.borderPrimary }}>
      <Ionicons name="medkit-outline" size={20} color={c.textSecondary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, lineHeight: 19, color: c.textSecondary }}>{t('safety.disclaimer')}</Text>
        <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/(tabs)/settings/sources')} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="library-outline" size={15} color={c.textPrimary} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.textPrimary, textDecorationLine: 'underline' }}>{t('sources.link')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
