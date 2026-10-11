import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { Button, Card } from '@/components/ui/bxc';

/**
 * Shown on Today instead of "0 steps / 0 kcal" until Apple Health is connected,
 * so empty numbers never look like a bug.
 */
export default function ConnectHealthCard({ onConnect, connecting }: { onConnect: () => void; connecting?: boolean }) {
  const c = useTheme();
  const { t } = useTranslation();
  return (
    <Card padding={16} style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
          <Ionicons name="heart" size={20} color={c.onAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: c.textPrimary }}>{t('today.connectHealthTitle' as any)}</Text>
          <Text style={{ fontSize: 14, lineHeight: 19, color: c.textSecondary, marginTop: 2 }}>{t('today.connectHealthBody' as any)}</Text>
        </View>
      </View>
      <Button label={t('today.connectHealthCta' as any)} icon="heart" loading={connecting} onPress={onConnect} style={{ marginTop: 14 }} />
    </Card>
  );
}
