import { useEffect, useState } from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { MIN_AGE, healthAckKey } from '@/constants/safety';

/**
 * Shown once per account on this device, before the app can be used: confirm
 * the age requirement and read that Lock is not medical advice (App Review
 * 1.4.1). Existing accounts see it too, since they skipped the new onboarding check.
 */
export default function HealthNotice() {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  const userId = useStore((s) => s.user?.id);
  const [visible, setVisible] = useState(false);
  const [adult, setAdult] = useState(false);
  const [underage, setUnderage] = useState(false);

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

  const leave = async () => {
    await signOut().catch(() => {});
    useStore.getState().clearSession();
    setVisible(false);
    router.replace('/(auth)/login');
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 36, flexGrow: 1 }}>
          <Ionicons name="medkit-outline" size={34} color={c.textPrimary} />
          <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.8, color: c.textPrimary, marginTop: 14 }}>
            {underage ? t('safety.underageTitle') : t('safety.title')}
          </Text>

          {underage ? (
            <Text style={{ fontSize: 16, lineHeight: 24, color: c.textSecondary, marginTop: 12 }}>
              {t('safety.underageBody', { age: MIN_AGE })}
            </Text>
          ) : (
            <>
              <Text style={{ fontSize: 16, lineHeight: 24, color: c.textSecondary, marginTop: 12 }}>
                {t('safety.disclaimer')}
              </Text>
              <Text style={{ fontSize: 16, lineHeight: 24, color: c.textSecondary, marginTop: 12 }}>
                {t('safety.disorderedEating')}
              </Text>

              <TouchableOpacity
                onPress={() => setAdult((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: adult }}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, padding: 14,
                  borderRadius: 14, borderWidth: 2, borderColor: adult ? c.accent : c.borderPrimary,
                }}
              >
                <Ionicons name={adult ? 'checkbox' : 'square-outline'} size={24} color={adult ? c.accent : c.textSecondary} />
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.textPrimary }}>
                  {t('safety.confirmAge', { age: MIN_AGE })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <View style={{ padding: 22, paddingTop: 8, gap: 10 }}>
          {underage ? (
            <Button label={t('safety.signOut')} variant="outline" onPress={leave} />
          ) : (
            <>
              <Button label={t('safety.accept')} icon="lock-closed" disabled={!adult} onPress={accept} />
              <TouchableOpacity onPress={() => setUnderage(true)} accessibilityRole="button" style={{ alignItems: 'center', padding: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.textSecondary, textDecorationLine: 'underline' }}>
                  {t('safety.imUnder', { age: MIN_AGE })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
