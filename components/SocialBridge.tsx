import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useStore } from '@/store/useStore';
import { useFriendRequestsStore } from '@/store/useFriendRequestsStore';
import { useCoupleStore } from '@/store/useCoupleStore';
import { respondCouple } from '@/services/couple';
import { translations, type LanguageCode } from '@/i18n/locales';
import { showToast } from '@/components/ui/Toast';

/**
 * Friend requests, wherever the user is:
 * - keeps the pending list fresh (sign-in, back to the app, a request push);
 * - tapping a request notification opens Social on the requests;
 * - the notification's "Accept" button accepts it straight away.
 * Renders nothing.
 */

const CATEGORY = 'friend_request';
const isExpoGo = Constants.appOwnership === 'expo';

function words(language: LanguageCode): Record<string, string> {
  return ((translations[language] ?? translations['en-US']) as any).friendReq ?? {};
}

async function handleResponse(response: Notifications.NotificationResponse) {
  const data = (response.notification.request.content.data ?? {}) as { type?: string; friendshipId?: string; fromName?: string; coupleId?: string };
  if (data.type?.startsWith('COUPLE_')) {
    // A couple invite's "Accept" button accepts it; anything else opens the couple space.
    if (data.type === 'COUPLE_INVITE' && response.actionIdentifier === 'accept' && data.coupleId) {
      try { await respondCouple(data.coupleId, 'accept'); } catch {}
    }
    useCoupleStore.getState().refresh();
    router.navigate('/couple' as any);
    return;
  }
  if (data.type === 'FRIEND_REQUEST') {
    if (response.actionIdentifier === 'accept' && data.friendshipId) {
      const ok = await useFriendRequestsStore.getState().respond(data.friendshipId, 'accept');
      const w = words(useStore.getState().language as LanguageCode);
      if (ok) showToast({ icon: 'people', message: (w.accepted ?? '✓').replace('{name}', data.fromName ?? '') });
      useFriendRequestsStore.getState().refresh();
      return;
    }
    router.navigate({ pathname: '/(tabs)/dashboard', params: { requests: '1' } } as any);
  } else if (data.type === 'FRIEND_ACCEPTED') {
    router.navigate('/(tabs)/dashboard' as any);
  }
}

export default function SocialBridge() {
  const uid = useStore((s) => s.user?.id);
  const language = useStore((s) => s.language) as LanguageCode;
  const refresh = useFriendRequestsStore((s) => s.refresh);

  // "Accept / View" buttons on request notifications (labels follow the app language).
  useEffect(() => {
    if (isExpoGo) return;
    const w = words(language);
    Notifications.setNotificationCategoryAsync(CATEGORY, [
      { identifier: 'accept', buttonTitle: w.accept ?? 'Accept', options: { opensAppToForeground: true } },
      { identifier: 'view', buttonTitle: w.view ?? 'View', options: { opensAppToForeground: true } },
    ]).catch(() => {});
    const cw = ((translations[language] ?? translations['en-US']) as any).couple ?? {};
    Notifications.setNotificationCategoryAsync('couple_invite', [
      { identifier: 'accept', buttonTitle: cw.accept ?? 'Accept', options: { opensAppToForeground: true } },
      { identifier: 'view', buttonTitle: w.view ?? 'View', options: { opensAppToForeground: true } },
    ]).catch(() => {});
  }, [language]);

  useEffect(() => {
    if (!uid) return;
    refresh();
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    if (isExpoGo) return () => app.remove();
    const received = Notifications.addNotificationReceivedListener((n) => {
      const type = (n.request.content.data as { type?: string } | undefined)?.type;
      if (type === 'FRIEND_REQUEST' || type === 'FRIEND_ACCEPTED') refresh();
      if (type?.startsWith('COUPLE_')) useCoupleStore.getState().refresh();
    });
    const tapped = Notifications.addNotificationResponseReceivedListener((r) => { handleResponse(r); });
    // Opened from a notification while the app wasn't running.
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) {
        handleResponse(r);
        Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
      }
    }).catch(() => {});
    return () => { app.remove(); received.remove(); tapped.remove(); };
  }, [uid]);

  return null;
}
