import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import UserAvatar from '@/components/ui/UserAvatar';
import { Button, PressScale, Sticker } from '@/components/ui/bxc';
import { showToast, setToastLift } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import { useCoupleStore } from '@/store/useCoupleStore';
import {
  daysSince, endCouple, nextMilestone, nextOccurrence, nudgePartner, respondCouple,
  type CoupleDay, type CoupleHome, type NudgeKind,
} from '@/services/couple';
import CoupleRoom from '@/components/couple/room/SafeCoupleRoom';
import AnniversarySheet from '@/components/couple/AnniversarySheet';
import InviteSheet from '@/components/couple/InviteSheet';
import HomeShopSheet from '@/components/couple/HomeShopSheet';
import { useShallow } from 'zustand/react/shallow';

/** Height of the phone layout's bottom panel (day cards + nudges). */
const SHEET_H = 186;
const L = (ml: number) => (Math.round(ml / 100) / 10).toFixed(1);

/**
 * The couple space: a 3D room the two share with 豆豆 (rotate it, tap the
 * anniversary wall, the people, the dog and the furniture), each other's day,
 * nudges, and the shop where your pooled growth points buy furniture styles.
 * Before linking: invite a friend, or answer an invite.
 */
export default function CoupleScreen() {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useDeviceLayout();
  const { couple, loaded, error, refresh } = useCoupleStore(useShallow((st) => ({ couple: st.couple, loaded: st.loaded, error: st.error, refresh: st.refresh })));

  const [focused, setFocused] = useState(true);
  const [annOpen, setAnnOpen] = useState(false);
  const [annHighlight, setAnnHighlight] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [event, setEvent] = useState<{ id: number; kind: NudgeKind } | null>(null);
  const [bubbles, setBubbles] = useState<{ me?: string | null; partner?: string | null; pet?: string | null; object?: string | null }>({});
  const [night, setNight] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [homeNow, setHomeNow] = useState<CoupleHome | null>(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fresh numbers whenever the screen is open (and every minute while it is).
  // Toasts float above the bottom panel here instead of covering the day cards.
  useFocusEffect(useCallback(() => {
    setToastLift(SHEET_H + 10);
    return () => setToastLift(null);
  }, []));
  useFocusEffect(useCallback(() => {
    setFocused(true);
    refresh();
    const id = setInterval(refresh, 60_000);
    const app = AppState.addEventListener('change', (s) => setFocused(s === 'active'));
    return () => { setFocused(false); clearInterval(id); app.remove(); };
  }, []));

  const accepted = couple?.status === 'ACCEPTED';
  const partner = couple?.partner;

  // the room's furniture: what the shop just changed, else what the server last said
  useEffect(() => { setHomeNow(null); }, [couple?.home]);
  const home = homeNow ?? couple?.home ?? null;
  // 豆豆 lives in the room; this tint only colours the stand-in cat while the model loads
  const pet = { kind: 'cat', stage: 1 };

  const say = (key: 'me' | 'partner' | 'pet' | 'object', text: string, ms = 2800) => {
    setBubbles((b) => ({ ...b, [key]: text }));
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => setBubbles((b) => ({ ...b, [key]: null })), ms);
  };
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const days = couple ? daysSince(couple.since) : 0;
  const milestone = couple ? nextMilestone(couple.since) : null;
  const nextLabel = milestone
    ? t('couple.nextLabel', {
        title: milestone.title.endsWith('y') ? t('couple.milestoneYears', { n: milestone.title.slice(0, -1) }) : t('couple.milestoneDays', { n: milestone.title.slice(0, -1) }),
        n: String(milestone.days),
      })
    : '';
  const frames = useMemo(() => (couple?.anniversaries ?? []).filter((a) => !a.builtIn).slice(0, 3).map((a) => {
    const { days: d } = nextOccurrence(a);
    return { id: a.id, title: a.title, sub: d >= 0 ? `${t('couple.annLeft')} ${d}` : `${a.date.replace(/-/g, '.')}`, emoji: a.emoji };
  }), [couple?.anniversaries]);

  const me = couple?.today?.me;
  const them = couple?.today?.partner;

  const nudge = async (kind: NudgeKind) => {
    if (!partner) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setEvent((e) => ({ id: (e?.id ?? 0) + 1, kind }));
    const line = kind === 'water' ? t('couple.sayWater', { name: partner.name }) : kind === 'eat' ? t('couple.sayEat') : kind === 'train' ? t('couple.sayTrain') : t('couple.sayLove');
    setTimeout(() => say('me', line), 1200);
    try {
      await nudgePartner(kind);
      showToast({ icon: 'heart', message: t('couple.nudgeSent', { name: partner.name }) });
    } catch (e: any) {
      showToast({ icon: 'time-outline', message: e?.response?.status === 429 ? t('couple.nudgeTooSoon') : t('couple.nudgeFailed') });
    }
  };

  const personLine = (d: CoupleDay | undefined, name: string) => d
    ? `${name}: ${d.calories.toLocaleString()} kcal · ${t('couple.water', { l: L(d.waterMl) })} · ${d.trained ? t('couple.trainedYes') : t('couple.trainedNo')}`
    : name;

  const unlink = () => {
    if (!couple || !partner) return;
    Alert.alert(t('couple.unlinkQ', { name: partner.name }), t('couple.unlinkBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('couple.menuUnlink'), style: 'destructive', onPress: async () => {
        try { await endCouple(couple.id); showToast({ message: t('couple.unlinked') }); refresh(); } catch {}
      } },
    ]);
  };

  // ── not linked yet ──
  if (!accepted) {
    const respond = async (action: 'accept' | 'decline') => {
      if (!couple || busy) return;
      setBusy(true);
      try {
        await respondCouple(couple.id, action);
        if (action === 'accept') showToast({ icon: 'heart', message: t('couple.accepted') });
        await refresh();
      } finally { setBusy(false); }
    };
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
          <PressScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.close')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </PressScale>
        </View>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 16, flexGrow: 1, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          {!loaded ? <ActivityIndicator color={c.textPrimary} /> : couple && partner ? (
            <View style={{ alignItems: 'center', gap: 14 }}>
              <UserAvatar image={partner.avatarImage} name={partner.name} status={partner.avatarEmoji} size={96} radius={48} ring={c.ink} />
              <Text style={{ fontSize: 24, fontWeight: '800', textAlign: 'center', color: c.textPrimary }}>
                {couple.iInvited ? t('couple.waiting', { name: partner.name }) : t('couple.incoming', { name: partner.name })}
              </Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary }}>{t('couple.incomingSub', { date: couple.since.replace(/-/g, '.') })}</Text>
              {couple.iInvited ? (
                <Button label={t('couple.cancelInvite')} variant="outline" onPress={async () => { await endCouple(couple.id).catch(() => {}); refresh(); }} style={{ alignSelf: 'stretch' }} />
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
                  <Button label={t('couple.accept')} onPress={() => respond('accept')} loading={busy} style={{ flex: 1 }} />
                  <Button label={t('couple.decline')} variant="outline" onPress={() => respond('decline')} style={{ flex: 1 }} />
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <Text style={{ fontSize: 34, fontWeight: '800', color: c.textPrimary }}>{t('couple.title')}</Text>
              <Text style={{ fontSize: 16, lineHeight: 23, color: c.textSecondary }}>{t('couple.inviteNote')}</Text>
              {error ? <Text style={{ color: c.danger }}>{t('couple.loadFailed')}</Text> : null}
              <Button label={t('couple.entryInvite')} icon="heart" onPress={() => setInviteOpen(true)} />
            </View>
          )}
        </ScrollView>
        <InviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} onSent={refresh} />
      </SafeAreaView>
    );
  }

  // ── linked: the room ──
  const dayCard = (who: 'me' | 'partner') => {
    const d = who === 'me' ? me : them;
    const dark = who === 'me';
    return (
      <View style={{
        flex: 1, minWidth: 0, borderRadius: 18, padding: 10, gap: 1,
        backgroundColor: dark ? c.surfaceInverse : '#FFE0E6', borderWidth: dark ? 0 : 2, borderColor: c.ink,
      }}>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 10, color: dark ? c.textInverse : '#55544F', opacity: 0.8 }}>
          {who === 'me' ? t('couple.meToday') : t('couple.partnerToday', { name: partner!.name })}
        </Text>
        {d && d.logged ? (
          <Text style={{ fontSize: 19, fontWeight: '800', color: dark ? c.textInverse : '#0A0A0A' }}>{d.calories.toLocaleString()} {t('couple.kcal')}</Text>
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '800', color: dark ? c.textInverse : '#0A0A0A', paddingVertical: 2 }}>{t('couple.notLogged')}</Text>
        )}
        <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 10, color: dark ? c.textInverse : '#55544F', opacity: 0.8 }}>
          {d ? `${t('couple.water', { l: L(d.waterMl) })} · ${d.steps.toLocaleString()} · ${d.trained ? t('couple.trainedYes') : t('couple.trainedNo')}` : ''}
        </Text>
      </View>
    );
  };

  const nudgeButton = (kind: NudgeKind, emoji: string, label: string, main?: boolean) => (
    <PressScale key={kind} onPress={() => nudge(kind)} accessibilityRole="button" accessibilityLabel={label}
      style={{
        flex: 1, minHeight: 54, borderRadius: 16, borderWidth: 2, borderColor: c.ink, backgroundColor: main ? c.accent : c.cardBackground,
        alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 4,
        shadowColor: c.ink, shadowOpacity: main ? 1 : 0, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
      }}>
      <Text style={{ fontSize: 17 }}>{emoji}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 12, fontWeight: '800', color: main ? c.onAccent : c.textPrimary }}>{label}</Text>
    </PressScale>
  );

  const controls = (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>{dayCard('me')}{dayCard('partner')}</View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {nudgeButton('water', '💧', t('couple.nudgeWater'))}
        {nudgeButton('eat', '🍱', t('couple.nudgeEat'))}
        {nudgeButton('train', '💪', t('couple.nudgeTrain'))}
        {nudgeButton('love', '❤️', t('couple.nudgeLove'), true)}
      </View>
    </View>
  );

  const header = (
    <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <PressScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.close')}
        style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: c.ink, backgroundColor: c.cardBackground, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
      </PressScale>
      <View pointerEvents="none" style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t('couple.together', { n: String(days) })}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: c.textPrimary }}>
          {couple!.me.name} <Text style={{ color: '#FF5C7A' }}>❤</Text> {partner!.name}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PressScale onPress={() => setHomeOpen(true)} accessibilityRole="button" accessibilityLabel={`${t('couple.homeTitle')} 🪙 ${home?.balance ?? 0}`}
            style={{ height: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 2, borderColor: c.ink, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="home" size={16} color={c.onAccent} />
            <Text style={{ fontFamily: FONTS.mono, fontWeight: '800', fontSize: 13, color: c.onAccent }}>🪙 {(home?.balance ?? 0).toLocaleString()}</Text>
          </PressScale>
          <PressScale onPress={unlink} accessibilityRole="button" accessibilityLabel={t('couple.menuUnlink')}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: c.ink, backgroundColor: c.cardBackground, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="ellipsis-horizontal" size={20} color={c.textPrimary} />
          </PressScale>
        </View>
        {couple!.streak > 0 ? (
          <Sticker rotate={3}><Text style={{ fontFamily: FONTS.mono, fontWeight: '700', fontSize: 11, color: c.onAccent }}>{t('couple.streak', { n: String(couple!.streak) })}</Text></Sticker>
        ) : null}
      </View>
    </View>
  );

  const fold = layout.fold;
  const side = fold?.axis === 'vertical';

  const room = (bottomInset: number) => (
    <CoupleRoom
      me={{ name: couple!.me.name, gender: couple!.me.gender }}
      partner={{ name: partner!.name, gender: partner!.gender }}
      pet={pet}
      furniture={home?.equipped}
      daysTogether={days}
      nextLabel={nextLabel}
      frames={frames}
      waterLevels={{ me: me ? Math.min(1, me.waterMl / Math.max(1, me.waterGoalMl)) : 0, partner: them ? Math.min(1, them.waterMl / Math.max(1, them.waterGoalMl)) : 0 }}
      event={event}
      bubbles={bubbles}
      night={night}
      paused={!focused || annOpen}
      bottomInset={bottomInset}
      onTapAnniversary={(id) => { setAnnHighlight(id); setAnnOpen(true); }}
      onTapBottles={() => say('object', t('couple.bottles', { me: couple!.me.name, a: L(me?.waterMl ?? 0), partner: partner!.name, b: L(them?.waterMl ?? 0) }))}
      onTapPerson={(who) => say(who, who === 'me' ? personLine(me, couple!.me.name) : personLine(them, partner!.name))}
      onTapPet={() => say('pet', t('couple.petSays'))}
      onTapWindow={() => setNight((n) => !n)}
      style={{ flex: 1 }}
    />
  );

  const sheets = (
    <>
      <AnniversarySheet visible={annOpen} onClose={() => setAnnOpen(false)} items={couple!.anniversaries} highlight={annHighlight} onChanged={refresh} since={couple!.since} days={days} nextLabel={nextLabel} />
      <HomeShopSheet visible={homeOpen} onClose={() => setHomeOpen(false)} home={home} onChanged={(h) => setHomeNow(h)} />
    </>
  );

  // Open iPhone Duo side by side: the room on the left page, the day and the nudges on the right.
  if (fold && side) {
    return (
      <View style={{ flex: 1, backgroundColor: c.track }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fold.start, overflow: 'hidden', borderTopRightRadius: 28, borderBottomRightRadius: 28, backgroundColor: c.backgroundPrimary }}>
          {room(0)}
          <View pointerEvents="box-none" style={{ position: 'absolute', left: insets.left + 16, right: 16, top: insets.top + 16 }}>{header}</View>
        </View>
        <ScrollView style={{ position: 'absolute', left: fold.start + fold.width, right: 0, top: 0, bottom: 0, backgroundColor: c.backgroundPrimary, borderTopLeftRadius: 28, borderBottomLeftRadius: 28 }}
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingLeft: 20, paddingRight: insets.right + 18, paddingBottom: insets.bottom + 20, gap: 14 }}>
          {controls}
          <Button label={t('couple.annTitle')} icon="calendar-outline" variant="outline" onPress={() => { setAnnHighlight(null); setAnnOpen(true); }} />
        </ScrollView>
        {sheets}
      </View>
    );
  }

  // Phones (and the Duo turned a quarter): the room fills the screen, the
  // header floats on top and the day + nudges sit in a sheet at the bottom.
  return (
    <View style={{ flex: 1, backgroundColor: c.backgroundPrimary }}>
      {room(SHEET_H + insets.bottom)}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: insets.left + 16, right: insets.right + 16, top: insets.top + 8 }}>{header}</View>
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingBottom: insets.bottom + 14,
        paddingLeft: insets.left + 16, paddingRight: insets.right + 16, backgroundColor: c.backgroundPrimary,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
      }}>
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>{controls}</View>
      </View>
      {sheets}
    </View>
  );
}
