import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { showToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';

/**
 * Over-the-air updates (EAS Update). New JS is downloaded in the background on
 * launch and whenever the app comes back to the foreground; once it's ready we
 * offer a one-tap restart instead of waiting for the next cold start.
 * Does nothing in development / Expo Go, where updates are disabled.
 */
export default function UpdateNotifier() {
  const { t } = useTranslation();
  const { isUpdatePending } = Updates.useUpdates();
  const checking = useRef(false);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline or the update server is unreachable: try again next time.
      } finally {
        checking.current = false;
      }
    };
    check();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isUpdatePending) return;
    showToast({
      message: t('appUpdate.ready' as any),
      detail: t('appUpdate.detail' as any),
      icon: 'sparkles',
      duration: 15000,
      action: { label: t('appUpdate.restart' as any), onPress: () => { Updates.reloadAsync().catch(() => {}); } },
    });
  }, [isUpdatePending]);

  return null;
}
