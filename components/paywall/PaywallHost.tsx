import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store/useStore';
import { usePaywallStore } from '@/store/usePaywallStore';
import { useTranslation } from '@/i18n';
import { PRO_TRIAL_DAYS } from '@/lib/plans';
import { healthAckKey } from '@/constants/safety';
import { scheduleProWeekReminder } from '@/services/notifications';
import PaywallSheet from './PaywallSheet';

/** The "Pro week is over" paywall is shown once per account on this device. */
const trialEndKey = (userId: string) => `lock_trial_end_paywall_v1_${userId}`;
/** Accounts whose Pro week ended longer ago than this never see it (they were here before it existed). */
const TRIAL_END_WINDOW_DAYS = 21;

/**
 * Mounted once in the tabs layout. Opens the "Pro week is over" paywall on the
 * first launch after the free week, schedules the day-before reminder, and
 * renders whichever paywall is open (the scan-limit one is opened from Log).
 */
export default function PaywallHost() {
  const { t } = useTranslation();
  const reason = usePaywallStore((s) => s.reason);
  const healthNoticeOpen = usePaywallStore((s) => s.healthNoticeOpen);
  const { userId, plan, createdAt, isAdmin } = useStore(useShallow((st) => ({
    userId: st.user?.id, plan: st.user?.plan, createdAt: st.user?.createdAt, isAdmin: st.user?.isAdmin,
  })));

  useEffect(() => {
    if (!userId || !createdAt || isAdmin || (plan && plan !== 'FREE')) return;
    const trialEndsAt = new Date(createdAt).getTime() + PRO_TRIAL_DAYS * 864e5;
    if (!Number.isFinite(trialEndsAt)) return;
    const now = Date.now();

    if (trialEndsAt > now) {
      scheduleProWeekReminder(trialEndsAt, {
        title: t('proPaywall.weekEndingTitle' as any),
        body: t('proPaywall.weekEndingBody' as any),
      });
      return;
    }
    if (now - trialEndsAt > TRIAL_END_WINDOW_DAYS * 864e5 || healthNoticeOpen) return;

    let alive = true;
    // A short wait lets the subscription status from RevenueCat land first, so a
    // subscriber never sees this.
    const timer = setTimeout(async () => {
      try {
        const [seen, healthAck] = await Promise.all([
          AsyncStorage.getItem(trialEndKey(userId)),
          AsyncStorage.getItem(healthAckKey(userId)),
        ]);
        const st = useStore.getState().user;
        const p = usePaywallStore.getState();
        if (!alive || seen === 'true' || healthAck !== 'true' || p.healthNoticeOpen || p.reason) return;
        if (st?.plan && st.plan !== 'FREE') return;
        await AsyncStorage.setItem(trialEndKey(userId), 'true');
        p.open('trialEnded');
      } catch {}
    }, 2500);
    return () => { alive = false; clearTimeout(timer); };
  }, [userId, plan, createdAt, isAdmin, healthNoticeOpen]);

  return reason ? <PaywallSheet key={reason} reason={reason} /> : null;
}
