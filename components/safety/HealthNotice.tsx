import { useEffect, useState } from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { healthAckKey } from '@/constants/safety';

/**
 * Shown once per account on this device: Lock is not medical advice, talk to a
 * doctor first, and where the numbers come from (App Review 1.4.1).
 */
export default function HealthNotice() {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useStore((s) => s.user?.id);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    AsyncStorage.getItem(healthAckKey(userId))
      .then((v) => { if (alive && v !== 'true') setVisible(true); })
      .catch(() => { if (alive) setVisible(true); });
    return () => { alive = false; };
  }, [userId]);

  const accept = () => {
    if (userId) AsyncStorage.setItem(healthAckKey(userId), 'true').catch(() => {});
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={accept}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 36, flexGrow: 1 }}>
          <Ionicons name="medkit-outline" size={34} color={c.textPrimary} />
          <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.8, color: c.textPrimary, marginTop: 14 }}>
            {t('safety.title')}
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: c.textSecondary, marginTop: 12 }}>{t('safety.disclaimer')}</Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: c.textSecondary, marginTop: 12 }}>{t('safety.disorderedEating')}</Text>
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => { accept(); router.push('/(tabs)/settings/sources'); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}
          >
            <Ionicons name="library-outline" size={18} color={c.textPrimary} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: c.textPrimary, textDecorationLine: 'underline' }}>{t('sources.link')}</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={{ padding: 22, paddingTop: 8 }}>
          <Button label={t('safety.accept')} icon="lock-closed" onPress={accept} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
