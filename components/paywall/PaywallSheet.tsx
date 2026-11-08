import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { Text } from '@/components/ui/Text';
import { Card, Label } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useStore } from '@/store/useStore';
import { usePaywallStore, type PaywallReason } from '@/store/usePaywallStore';
import { useProPlans, ProPlanPicker } from '@/components/pricing/ProPlanPicker';
import { LegalNote } from '@/components/pricing/LegalNote';
import { restorePurchases, planFromCustomerInfo, tagPaywall } from '@/lib/revenuecat';
import { syncSubscriptionPlan, fetchProWeekRecap, type ProWeekRecap } from '@/services/api';
import { cancelProWeekReminder } from '@/services/notifications';
import { PLAN_FEATURES } from '@/lib/plans';
import { APP_STORE_URL } from '@/constants/acquisition';

/** Time until the next local midnight, when the free scans come back. */
function untilMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/**
 * The two moments a free user decides about Pro:
 * - `trialEnded`: the free Pro week just ended. A recap of the week, what changes
 *   on Free, and the plans.
 * - `limit`: today's free AI scans are used up. When they come back, the free
 *   ways to log that still work, and the plans.
 * Prices, trial and terms all come from StoreKit via ProPlanPicker.
 */
export default function PaywallSheet({ reason }: { reason: PaywallReason }) {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const close = usePaywallStore((s) => s.close);
  const { user, setPlan } = useStore(useShallow((st) => ({ user: st.user, setPlan: st.setPlan })));
  const plans = useProPlans();
  const [restoring, setRestoring] = useState(false);
  const [recap, setRecap] = useState<ProWeekRecap | null>(null);
  const [left, setLeft] = useState(untilMidnight);

  const fill = (key: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), t(key as any) as string);

  useEffect(() => { tagPaywall(reason); }, [reason]);

  useEffect(() => {
    if (reason !== 'trialEnded') return;
    let alive = true;
    fetchProWeekRecap().then((r) => { if (alive) setRecap(r); }).catch(() => {});
    return () => { alive = false; };
  }, [reason]);

  useEffect(() => {
    if (reason !== 'limit') return;
    const id = setInterval(() => setLeft(untilMidnight()), 30_000);
    return () => clearInterval(id);
  }, [reason]);

  const onPurchased = () => {
    cancelProWeekReminder();
    close();
    Alert.alert(t('pricing.purchaseSuccess' as any), t('pricing.purchaseSuccessMsg' as any));
  };

  const restore = async () => {
    setRestoring(true);
    try {
      const plan = planFromCustomerInfo(await restorePurchases());
      if (plan !== 'FREE') {
        setPlan(plan);
        await syncSubscriptionPlan();
        cancelProWeekReminder();
        close();
        Alert.alert(t('pricing.restoreSuccess' as any), t('pricing.restoreSuccessMsg' as any));
      } else {
        Alert.alert(t('pricing.noRestoreFound' as any), t('pricing.noRestoreMsg' as any));
      }
    } catch (err: any) {
      Alert.alert(t('pricing.restoreFailed' as any), err?.message || t('common.retry'));
    } finally {
      setRestoring(false);
    }
  };

  const go = (path: any) => { close(); router.push(path); };

  const invite = async () => {
    const code = user?.inviteCode;
    if (!code) { go('/(tabs)/settings'); return; }
    try {
      await Share.share({ message: fill('proPaywall.inviteMessage', { code, url: APP_STORE_URL }) });
    } catch {}
  };

  const quota = PLAN_FEATURES.FREE.dailyAiCalls;
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.max(1, Math.ceil((left % 3_600_000) / 60_000));
  const resetIn = hours > 0 ? fill('proPaywall.hoursMinutes', { h: hours, m: minutes }) : fill('proPaywall.minutes', { m: minutes });

  const showRecap = recap && recap.meals + recap.workouts > 0;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.backgroundPrimary }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 10, paddingTop: 6 }}>
          <TouchableOpacity
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('proPaywall.close' as any)}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={24} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {reason === 'trialEnded' ? (
            <>
              <Label>{t('proPaywall.trialKicker' as any)}</Label>
              <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -1, color: c.textPrimary, marginTop: 8 }}>
                {t('proPaywall.trialTitle' as any)}
              </Text>

              {recap === null ? (
                <View style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={c.textSecondary} />
                </View>
              ) : showRecap ? (
                <>
                  <Text style={{ fontSize: 16, lineHeight: 23, color: c.textSecondary, marginTop: 8 }}>{t('proPaywall.trialSub' as any)}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                    <Stat value={recap.meals} label={t('proPaywall.recapMeals' as any)} />
                    <Stat value={recap.photoMeals} label={t('proPaywall.recapPhotos' as any)} />
                    <Stat value={recap.daysLogged} label={t('proPaywall.recapDays' as any)} />
                    <Stat value={recap.workouts} label={t('proPaywall.recapWorkouts' as any)} />
                  </View>
                </>
              ) : (
                <Text style={{ fontSize: 16, lineHeight: 23, color: c.textSecondary, marginTop: 8 }}>{t('proPaywall.recapEmpty' as any)}</Text>
              )}

              <Card padding={16} style={{ marginTop: 18 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.textPrimary }}>{t('proPaywall.changesTitle' as any)}</Text>
                <View style={{ gap: 9, marginTop: 10 }}>
                  <Change icon="camera-outline" text={fill('proPaywall.changeScans', { quota })} />
                  <Change icon="analytics-outline" text={t('proPaywall.changeReviews' as any)} />
                  <Change icon="barbell-outline" text={t('proPaywall.changePlan' as any)} />
                </View>
                <Text style={{ fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 12 }}>{t('proPaywall.staysFree' as any)}</Text>
              </Card>

              <Text style={{ fontSize: 18, fontWeight: '900', color: c.textPrimary, marginTop: 22, marginBottom: 12 }}>{t('proPaywall.keepPro' as any)}</Text>
            </>
          ) : (
            <>
              <Label>{fill('proPaywall.resetsIn', { time: resetIn })}</Label>
              <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -1, color: c.textPrimary, marginTop: 8 }}>
                {fill('proPaywall.limitTitle', { quota })}
              </Text>
              <Text style={{ fontSize: 16, lineHeight: 23, color: c.textSecondary, marginTop: 8 }}>{t('proPaywall.limitSub' as any)}</Text>

              <View style={{ gap: 10, marginTop: 16 }}>
                <Alternative icon="barcode-outline" title={t('proPaywall.altBarcode' as any)} sub={t('proPaywall.altBarcodeSub' as any)}
                  onPress={() => go({ pathname: '/camera', params: { mode: 'scan' } })} />
                <Alternative icon="search-outline" title={t('proPaywall.altSearch' as any)} sub={t('proPaywall.altSearchSub' as any)}
                  onPress={close} />
                <Alternative icon="gift-outline" title={t('proPaywall.altInvite' as any)} sub={t('proPaywall.altInviteSub' as any)}
                  onPress={invite} />
              </View>

              <Text style={{ fontSize: 18, fontWeight: '900', color: c.textPrimary, marginTop: 24, marginBottom: 12 }}>{t('proPaywall.orPro' as any)}</Text>
            </>
          )}

          {plans.unavailable && !plans.loading ? (
            <Card padding={14}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary }}>{t('pricing.offeringsError' as any)}</Text>
              <TouchableOpacity onPress={plans.reload} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.textPrimary }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <ProPlanPicker plans={plans} onPurchased={onPurchased} />
          )}

          <TouchableOpacity onPress={close} accessibilityRole="button" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.textSecondary }}>
              {t((reason === 'trialEnded' ? 'proPaywall.continueFree' : 'proPaywall.maybeLater') as any)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={restore} disabled={restoring} accessibilityRole="button" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
            {restoring
              ? <ActivityIndicator size="small" color={c.textSecondary} />
              : <Text style={{ fontSize: 13, fontWeight: '700', color: c.textPrimary }}>{t('pricing.restorePurchase' as any)}</Text>}
          </TouchableOpacity>

          <LegalNote colors={c} router={{ push: go }} legalNote={t('pricing.legalNote' as any)} t={t} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const c = useTheme();
  return (
    <Card padding={14} style={{ flexGrow: 1, flexBasis: '45%' }}>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 30, fontWeight: '800', letterSpacing: -1, color: c.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

function Change({ icon, text }: { icon: string; text: string }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <Ionicons name={icon as any} size={17} color={c.textSecondary} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: c.textPrimary }}>{text}</Text>
    </View>
  );
}

function Alternative({ icon, title, sub, onPress }: { icon: string; title: string; sub: string; onPress: () => void }): ReactNode {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 60,
        borderRadius: 16, borderWidth: 1.5, borderColor: c.borderPrimary,
        backgroundColor: c.cardBackground, opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={18} color={c.onAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: c.textPrimary }}>{title}</Text>
        <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 1 }}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
    </Pressable>
  );
}
