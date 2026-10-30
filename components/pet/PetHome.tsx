import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { View, Modal, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Bar, Button, Card, HardShadow, Label, PressScale, RADIUS, STROKE, Sticker, TextField } from '@/components/ui/bxc';
import UserAvatar from '@/components/ui/UserAvatar';
import { showToast } from '@/components/ui/Toast';
import { PetSprite, type PetSpriteHandle } from '@/components/pet/PetSprite';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { COACH_IMAGES, STAGE_XP, XP, buddyImage, type CoachPose } from '@/constants/pets';
import { usePetStore } from '@/store/usePetStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { isHealthConnected } from '@/services/health';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import { patFriendPet, type LeaderboardEntry, type PetState } from '@/services/api';

const SCENE_BG = '#FFF3C4';
const SCENE_GROUND = '#F7E39A';
const INK = '#0A0A0A';
const SEEN_KEY = 'lock_pet_seen_stage';

type T = (key: string, params?: Record<string, string>) => string;

export function stageLabel(t: T, stage: number) {
  return t(`pet.stage${Math.min(3, Math.max(1, stage))}`);
}

/** The coach's line for right now: the most useful next step, or a mood. */
function coachLine(t: T, s: PetState, pose: CoachPose, healthOn: boolean, trainingDay: boolean): string {
  const buddy = s.profile!.buddyName;
  const f = s.todayFacts!;
  if (s.canGraduate) return t('pet.say.graduate', { buddy });
  if (pose === 'cheer') return t('pet.say.cheer', { buddy });
  if (pose === 'sleep') return t('pet.say.night');
  if (pose === 'sad') return t('pet.say.sad', { buddy });
  if (trainingDay && !f.trained) return t('pet.say.train', { buddy });
  if (healthOn && f.steps < 8000) return t('pet.say.steps', { buddy, n: (8000 - f.steps).toLocaleString() });
  if (f.meals < 3) return t('pet.say.meals', { buddy, n: String(3 - f.meals) });
  if (f.proteinTarget > 0 && f.protein < f.proteinTarget) return t('pet.say.protein', { buddy, n: String(f.proteinTarget - f.protein) });
  if (!trainingDay && !f.trained) return t('pet.say.rest');
  return t('pet.say.full', { buddy });
}

function GrowthRow({ icon, label, value, xp, earned, first }: {
  icon: string; label: string; value: string; xp: number; earned: boolean; first?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
      borderTopWidth: first ? 0 : 1, borderTopColor: c.divider,
    }}>
      <View style={{
        width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
        backgroundColor: earned ? c.accent : c.cardBackgroundSecondary,
        borderWidth: earned ? 1.5 : 0, borderColor: c.ink,
      }}>
        <Ionicons name={icon as any} size={17} color={earned ? c.onAccent : c.textPrimary} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: c.textPrimary }}>{label}</Text>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary }}>{value}</Text>
      <View style={{
        width: 46, alignItems: 'center', paddingVertical: 3, borderRadius: 8,
        borderWidth: 1.5, borderStyle: earned ? 'solid' : 'dashed',
        borderColor: earned ? c.ink : c.textTertiary, backgroundColor: earned ? c.accent : 'transparent',
      }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: '600', color: earned ? c.onAccent : c.textSecondary }}>+{xp}</Text>
      </View>
    </View>
  );
}


type Growth = { key: string; icon: string; label: string; value: string; xp: number; earned: boolean };

/** One growth source as a square card (open Duo stood up: a row you swipe through). */
function GrowthTile({ icon, label, value, xp, earned }: Omit<Growth, 'key'>) {
  const c = useTheme();
  return (
    <View style={{
      width: 148, height: 124, padding: 12, borderRadius: 20, borderWidth: 2, justifyContent: 'space-between',
      borderColor: earned ? c.ink : c.borderSecondary, backgroundColor: earned ? c.accent : c.cardBackground,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ionicons name={icon as any} size={20} color={earned ? c.onAccent : c.textPrimary} />
        {earned ? <Ionicons name="checkmark-circle" size={18} color={c.onAccent} /> : null}
      </View>
      <View>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: earned ? c.onAccent : c.textPrimary }}>{label}</Text>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 11, color: earned ? c.onAccent : c.textSecondary, marginTop: 1 }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: earned ? c.onAccent : c.textPrimary }}>+{xp}</Text>
    </View>
  );
}

function FriendPetRow({ entry, onPatted }: { entry: LeaderboardEntry; onPatted: (id: string) => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  const ref = useRef<PetSpriteHandle>(null);
  const [busy, setBusy] = useState(false);
  const pet = entry.pet;
  const patted = !!entry.patted;

  const pat = async () => {
    if (!pet || patted || busy) return;
    setBusy(true);
    ref.current?.hop();
    ref.current?.hearts(3);
    try {
      await patFriendPet(entry.id);
      onPatted(entry.id);
      showToast({ message: t('pet.patToast', { name: `${entry.name} · ${pet.name}` }), icon: 'paw' as any });
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === 'ALREADY') onPatted(entry.id);
      else if (code === 'FULL') showToast({ message: t('pet.patFull', { name: pet.name }) });
      else showToast({ message: t('pet.patFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18,
      borderWidth: STROKE.card, borderColor: c.borderPrimary, backgroundColor: c.cardBackground,
    }}>
      <View style={{
        width: 54, height: 54, borderRadius: 14, borderWidth: 2, borderColor: INK,
        backgroundColor: pet ? SCENE_BG : c.cardBackgroundSecondary, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden',
      }}>
        {pet ? (
          <PetSprite ref={ref} source={buddyImage(pet.kind, pet.stage)} size={50} shadow={false} />
        ) : (
          <UserAvatar image={entry.avatarImage ?? undefined} initial={entry.avatar} name={entry.name} size={50} radius={12} style={{ marginBottom: 0 }} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: c.textPrimary }}>{entry.name}</Text>
        <Text numberOfLines={1} style={{ fontSize: 12, color: c.textSecondary, marginTop: 1 }}>
          {pet ? `${pet.name} · ${stageLabel(t as T, pet.stage)}` : t('pet.noFriendPet')}
        </Text>
      </View>
      {pet ? (
        <PressScale
          onPress={pat}
          disabled={patted || busy}
          accessibilityRole="button"
          accessibilityLabel={`${patted ? t('pet.patted') : t('pet.pat')} ${pet.name}`}
          style={{
            height: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2,
            borderColor: patted ? c.ink : c.borderPrimary,
            backgroundColor: patted ? c.accent : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 5,
          }}
        >
          <Ionicons name="paw" size={15} color={patted ? c.onAccent : c.textPrimary} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: patted ? c.onAccent : c.textPrimary }}>
            {patted ? t('pet.patted') : t('pet.pat')}
          </Text>
        </PressScale>
      ) : null}
    </View>
  );
}

function RenameSheet({ visible, onClose, coachName, buddyName }: {
  visible: boolean; onClose: () => void; coachName: string; buddyName: string;
}) {
  const c = useTheme();
  const { t } = useTranslation();
  const rename = usePetStore((s) => s.rename);
  const [coach, setCoach] = useState(coachName);
  const [buddy, setBuddy] = useState(buddyName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCoach(coachName);
      setBuddy(buddyName);
    }
  }, [visible]);

  const save = async () => {
    const body: { coachName?: string; buddyName?: string } = {};
    if (coach.trim() && coach.trim() !== coachName) body.coachName = coach.trim();
    if (buddy.trim() && buddy.trim() !== buddyName) body.buddyName = buddy.trim();
    if (!body.coachName && !body.buddyName) return onClose();
    setSaving(true);
    try {
      await rename(body);
      onClose();
    } catch {
      showToast({ message: t('pet.renameFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 22 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.backgroundPrimary, borderRadius: RADIUS.hero, borderWidth: 2, borderColor: c.borderPrimary, padding: 18, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.textPrimary }}>{t('pet.rename')}</Text>
            <Label>{t('pet.coachNameLabel')}</Label>
            <TextField value={coach} onChangeText={setCoach} maxLength={12} placeholder={t('pet.coachNamePlaceholder')} />
            <Label>{t('pet.buddyNameLabel')}</Label>
            <TextField value={buddy} onChangeText={setBuddy} maxLength={12} placeholder={t('pet.buddyNamePlaceholder')} />
            <Button label={t('pet.renameSave')} onPress={save} loading={saving} variant="solid" style={{ marginTop: 6 }} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Full-screen celebration when the buddy reaches a new stage. */
function GrowModal({ visible, onClose, s }: { visible: boolean; onClose: () => void; s: PetState }) {
  const { t } = useTranslation();
  const ref = useRef<PetSpriteHandle>(null);
  const stage = s.stage ?? 1;
  useEffect(() => {
    if (!visible) return;
    const a = setTimeout(() => ref.current?.grow(), 250);
    const b = setTimeout(() => ref.current?.hearts(5), 700);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [visible]);
  if (!s.profile) return null;
  const tt = t as T;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#FFD43B', alignItems: 'center', paddingTop: 90, paddingHorizontal: 22, paddingBottom: 40 }}>
        <Sticker background={INK} color="#FFD43B">{`${stageLabel(tt, stage - 1)} → ${stageLabel(tt, stage)}`}</Sticker>
        <View style={{
          marginTop: 26, width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFFFFF',
          borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible',
          shadowColor: INK, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 0,
        }}>
          <PetSprite ref={ref} source={buddyImage(s.profile.buddyKind, stage)} size={210} style={{ marginBottom: 18 }} />
        </View>
        <Text style={{ marginTop: 30, fontSize: 40, fontWeight: '800', letterSpacing: -1, color: INK, textAlign: 'center' }}>
          {t('pet.grewTitle', { name: s.profile.buddyName })}
        </Text>
        <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 23, color: INK, textAlign: 'center', maxWidth: 300 }}>
          {stage < 3
            ? t('pet.grewBody', { xp: String(s.xp ?? 0), next: `${stageLabel(tt, stage + 1)}（${STAGE_XP[stage - 1]}）` })
            : t('pet.grewBodyMax', { xp: String(s.xp ?? 0) })}
        </Text>
        <View style={{
          marginTop: 22, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10,
          padding: 10, borderRadius: 18, borderWidth: 2, borderColor: INK, backgroundColor: '#FFFFFF',
        }}>
          <PetSprite source={COACH_IMAGES.cheer} size={56} shadow={false} still />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: '#55544F' }}>{t('pet.coachTag', { name: s.profile.coachName })}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: INK }}>{t('pet.grewCoach')}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <Button label={t('pet.grewCta')} onPress={onClose} variant="solid" style={{ alignSelf: 'stretch', backgroundColor: INK, borderColor: INK }} />
      </View>
    </Modal>
  );
}

/**
 * The 伙伴 tab inside 社交.
 * - stack (default): scene, growth and friends one after another in the page's scroll.
 * - panel: open Duo side by side, the right-hand page. The scene stays put at
 *   the top; growth and friends scroll below it.
 * - tabletop: open Duo turned a quarter and stood up. The top half is the
 *   buddy's room (nothing scrolls there); the bottom half has the toolbar and
 *   growth / friends, or whatever `details` replaces them with.
 */
export default function PetHome({ friends, onFriendsChanged, layout = 'stack', corner, toolbar, details, bottomInset = 0, refreshControl }: {
  friends: LeaderboardEntry[];
  onFriendsChanged: (next: LeaderboardEntry[]) => void;
  layout?: 'stack' | 'panel' | 'tabletop';
  /** panel: a button laid over the scene's top-right corner. */
  corner?: ReactNode;
  /** tabletop: the row at the top of the bottom half (tabs, add button). */
  toolbar?: ReactNode;
  /** tabletop: shown in the bottom half instead of growth and friends (another tab). */
  details?: ReactNode;
  /** panel / tabletop: room to leave under the scrolling part for the tab bar. */
  bottomInset?: number;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const c = useTheme();
  const { t } = useTranslation();
  const tt = t as T;
  const { state: s, loading, error, sync } = usePetStore();
  const plan = useWorkoutStore((st) => st.plan);
  const { fold } = useDeviceLayout();
  const insets = useSafeAreaInsets();
  const coachRef = useRef<PetSpriteHandle>(null);
  const buddyRef = useRef<PetSpriteHandle>(null);
  const [healthOn, setHealthOn] = useState(false);
  const [poke, setPoke] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [growing, setGrowing] = useState(false);

  useEffect(() => {
    isHealthConnected().then(setHealthOn).catch(() => {});
  }, []);

  // Celebrate a stage-up once per buddy and stage.
  useEffect(() => {
    if (!s?.profile || !s.stage) return;
    const buddyKey = `${s.collection?.length ?? 0}:${s.profile.buddyKind}`;
    (async () => {
      let seen: { key: string; stage: number } | null = null;
      try { seen = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) || 'null'); } catch {}
      if (seen && seen.key === buddyKey && s.stage! > seen.stage) setGrowing(true);
      if (!seen || seen.key !== buddyKey || seen.stage !== s.stage) {
        AsyncStorage.setItem(SEEN_KEY, JSON.stringify({ key: buddyKey, stage: s.stage })).catch(() => {});
      }
    })();
  }, [s?.stage, s?.profile?.buddyKind, s?.collection?.length]);

  const trainingDay = (plan[String(new Date().getDay())]?.exercises.length ?? 0) > 0;
  const pose: CoachPose = useMemo(() => {
    if (!s?.profile || !s.todayFacts) return 'think';
    if (s.todayFacts.trained) return 'cheer';
    const h = new Date().getHours();
    if (h >= 22 || h < 6) return 'sleep';
    const recent = s.recent ?? [];
    const quiet = s.profile.buddyDay >= 3 && recent.slice(-3).every((d) => d.xp === 0) && s.todayFacts.xp === 0;
    if (quiet) return 'sad';
    if (!trainingDay && s.todayFacts.xp === 0) return 'wave';
    return 'idle';
  }, [s, trainingDay]);

  // Celebrate a finished workout with a hop when the tab opens.
  useEffect(() => {
    if (pose !== 'cheer') return;
    const id = setTimeout(() => coachRef.current?.hop(), 400);
    return () => clearTimeout(id);
  }, [pose]);

  const tabletop = layout === 'tabletop' && fold?.axis === 'horizontal';

  /** Tabletop: the room on the top half, the rest below, nothing on the hinge. */
  const tabletopFrame = (room: ReactNode, below: ReactNode) => (
    <View style={{ flex: 1, backgroundColor: c.track }}>
      <View style={{
        height: Math.max(0, fold!.start - insets.top), overflow: 'hidden', backgroundColor: SCENE_BG,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
      }}>
        {room}
      </View>
      <View style={{ height: fold!.width }} />
      <View style={{ flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: c.backgroundPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        {toolbar}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomInset }}
          refreshControl={refreshControl}
        >
          {below}
        </ScrollView>
      </View>
    </View>
  );

  if (!s) {
    const status = (
      <View style={{ paddingVertical: 64, alignItems: 'center', gap: 14 }}>
        {loading || !error ? (
          <ActivityIndicator size="large" color={c.textPrimary} />
        ) : (
          <>
            <Text style={{ color: c.textSecondary }}>{t('pet.loadFailed')}</Text>
            <Button label={t('pet.retry')} variant="outline" onPress={sync} />
          </>
        )}
      </View>
    );
    if (tabletop) return tabletopFrame(<View style={{ flex: 1, justifyContent: 'center' }}>{status}</View>, details ?? null);
    return status;
  }

  const others = friends.filter((f) => !f.isMe).sort((a, b) => Number(!!b.pet) - Number(!!a.pet));
  const markPatted = (id: string) => onFriendsChanged(friends.map((f) => (f.id === id ? { ...f, patted: true } : f)));

  const friendsSection = (
    <View style={{ marginTop: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{t('pet.friendsTitle')}</Text>
      </View>
      {others.length === 0 ? (
        <Text style={{ fontSize: 13, color: c.textSecondary }}>{t('pet.noFriends')}</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {others.map((f) => <FriendPetRow key={f.id} entry={f} onPatted={markPatted} />)}
          <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>{t('pet.friendsHint')}</Text>
        </View>
      )}
    </View>
  );

  /** panel: pinned scene on top, the rest scrolls under it. */
  const panelFrame = (scene: ReactNode, rest: ReactNode) => (
    <View style={{ flex: 1, paddingTop: 16 }}>
      <View style={{ paddingHorizontal: 18 }}>
        {scene}
        {corner ? <View style={{ position: 'absolute', top: 10, right: 28 }}>{corner}</View> : null}
      </View>
      <ScrollView
        style={{ flex: 1, marginTop: 6 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: bottomInset }}
      >
        {rest}
      </ScrollView>
    </View>
  );

  // ── Not adopted yet ──
  if (!s.profile) {
    if (tabletop) {
      return tabletopFrame(
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, backgroundColor: SCENE_GROUND, borderTopWidth: 2, borderTopColor: INK }} />
          <PetSprite source={COACH_IMAGES.wave} size={150} onPress={() => {}} accessibilityLabel={t('pet.setupTitle')} />
          <Text style={{ fontSize: 24, fontWeight: '800', color: INK, textAlign: 'center' }}>{t('pet.emptyTitle')}</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: INK, textAlign: 'center', maxWidth: 420 }}>{t('pet.emptyBody')}</Text>
        </View>,
        details ?? (
          <>
            <Button label={t('pet.emptyCta')} onPress={() => router.push('/pet/setup')} style={{ marginTop: 4 }} />
            {friendsSection}
          </>
        ),
      );
    }
    const adopt = (
      <HardShadow color={c.cardShadow} radius={RADIUS.hero}>
        <View style={{ borderRadius: RADIUS.hero, borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.cardBackground, overflow: 'hidden' }}>
          <View style={{ height: layout === 'panel' ? 160 : 190, backgroundColor: SCENE_BG, borderBottomWidth: 2, borderBottomColor: INK, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', left: -20, right: -20, bottom: -36, height: 70, borderRadius: 200, backgroundColor: SCENE_GROUND, borderTopWidth: 2, borderTopColor: INK }} />
            <PetSprite source={COACH_IMAGES.wave} size={layout === 'panel' ? 136 : 160} style={{ marginBottom: 6 }} onPress={() => {}} accessibilityLabel={t('pet.setupTitle')} />
          </View>
          <View style={{ padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.textPrimary }}>{t('pet.emptyTitle')}</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary }}>{t('pet.emptyBody')}</Text>
            <Button label={t('pet.emptyCta')} onPress={() => router.push('/pet/setup')} style={{ marginTop: 6 }} />
          </View>
        </View>
      </HardShadow>
    );
    if (layout === 'panel') return panelFrame(adopt, friendsSection);
    return (
      <View>
        {adopt}
        {friendsSection}
      </View>
    );
  }

  const p = s.profile;
  const f = s.todayFacts!;
  const stage = s.stage ?? 1;
  const xp = s.xp ?? 0;
  const lo = stage === 1 ? 0 : stage === 2 ? STAGE_XP[0] : STAGE_XP[1];
  const hi = s.nextAt ?? STAGE_XP[1];
  const progress = s.nextAt ? Math.min(1, (xp - lo) / (hi - lo)) : 1;
  const line = poke ?? coachLine(tt, s, pose, healthOn, trainingDay);
  const shownPose: CoachPose = poke ? 'cheer' : pose;

  const pokeCoach = () => {
    const lines = [t('pet.say.hello', { coach: p.coachName }), t('pet.say.pat', { coach: p.coachName })];
    setPoke(lines[Math.floor(Math.random() * lines.length)]);
    setTimeout(() => setPoke(null), 1800);
  };

  const stepsXp = f.steps >= 10000 ? XP.steps10k : XP.steps8k;
  const growth: Growth[] = [
    { key: 'training', icon: 'barbell-outline', label: t('pet.rowTraining'), value: f.trained ? t('pet.done') : t('pet.notYet'), xp: XP.training, earned: f.trained },
    {
      key: 'steps', icon: 'footsteps-outline', label: t('pet.rowSteps'),
      value: healthOn || f.steps > 0 ? `${f.steps.toLocaleString()} / ${(f.steps >= 8000 ? 10000 : 8000).toLocaleString()}` : t('pet.stepsUnknown'),
      xp: stepsXp, earned: f.steps >= 8000,
    },
    { key: 'meals', icon: 'restaurant-outline', label: t('pet.rowMeals'), value: `${Math.min(f.meals, 3)} / 3`, xp: XP.meals, earned: f.meals >= 3 },
    {
      key: 'protein', icon: 'water-outline', label: t('pet.rowProtein'),
      value: f.proteinTarget ? `${f.protein} / ${f.proteinTarget}g` : `${f.protein}g`,
      xp: XP.protein, earned: f.proteinTarget > 0 && f.protein >= f.proteinTarget,
    },
    ...(f.pats > 0 ? [{ key: 'pats', icon: 'paw-outline', label: t('pet.rowPats'), value: `${f.pats} / 5`, xp: f.pats * XP.pat, earned: true }] : []),
  ];
  const growthTotal = `+${f.xp + f.pats * XP.pat} / ${65 + 5 * XP.pat}`;

  const stageTrack = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {[1, 2, 3].map((st) => (
        <Text key={st} style={{ fontFamily: FONTS.mono, fontSize: 11, fontWeight: st <= stage ? '600' : '400', color: st <= stage ? c.textPrimary : c.textSecondary }}>
          {st <= stage ? '●' : '○'} {stageLabel(tt, st)}{st > 1 ? ` ${STAGE_XP[st - 2]}` : ''}
        </Text>
      ))}
    </View>
  );

  const xpFooter = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: c.textPrimary }}>
        {s.nextAt ? t('pet.xpLine', { xp: String(xp), next: String(s.nextAt) }) : t('pet.xpMax', { xp: String(xp) })}
      </Text>
      {s.nextAt ? (
        <Text numberOfLines={1} style={{ fontSize: 13, color: c.textSecondary, flexShrink: 1 }}>{t('pet.toNext', { n: String(s.nextAt - xp), stage: stageLabel(tt, stage + 1) })}</Text>
      ) : (
        <Pressable onPress={() => router.push('/pet/collection')} hitSlop={8}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.textPrimary, textDecorationLine: 'underline' }}>{t('pet.readyToGraduate')}</Text>
        </Pressable>
      )}
    </View>
  );

  const bubble = (style: object, fontSize = 13) => (
    <View style={[{
      position: 'absolute', paddingHorizontal: 12, paddingVertical: 9,
      borderWidth: 2, borderColor: INK, backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomRightRadius: 14, borderBottomLeftRadius: 4,
    }, style]}>
      <Text style={{ fontSize, fontWeight: '600', lineHeight: Math.round(fontSize * 1.38), color: INK }}>{line}</Text>
    </View>
  );

  const coachSprite = (size: number) => (
    <PetSprite
      ref={coachRef}
      source={COACH_IMAGES[shownPose]}
      blinkSource={shownPose === 'idle' ? COACH_IMAGES.blink : undefined}
      sleeping={shownPose === 'sleep'}
      sad={shownPose === 'sad'}
      size={size}
      onPress={pokeCoach}
      accessibilityLabel={t('pet.coachTag', { name: p.coachName })}
    />
  );

  const buddySprite = (scale: number) => (
    <PetSprite
      ref={buddyRef}
      source={buddyImage(p.buddyKind, stage)}
      size={Math.round((stage === 1 ? 112 : stage === 2 ? 126 : 138) * scale)}
      sleeping={shownPose === 'sleep'}
      onPress={() => {}}
      accessibilityLabel={`${p.buddyName} · ${stageLabel(tt, stage)}`}
    />
  );

  const coachTag = (style: object) => (
    <Pressable onPress={() => setRenaming(true)} style={[{ position: 'absolute' }, style]} hitSlop={8}>
      <Sticker background={INK} color="#FFD43B" style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
        {t('pet.coachTag', { name: p.coachName })}
      </Sticker>
    </Pressable>
  );

  const nameRow = (
    <Pressable onPress={() => setRenaming(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minHeight: layout === 'panel' ? 44 : undefined }} accessibilityRole="button" accessibilityLabel={t('pet.rename')}>
      <Text numberOfLines={1} style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: c.textPrimary, flexShrink: 1 }}>{p.buddyName}</Text>
      <Sticker>{stageLabel(tt, stage)}</Sticker>
      <Ionicons name="pencil" size={14} color={c.textTertiary} />
    </Pressable>
  );

  const modals = (
    <>
      <RenameSheet visible={renaming} onClose={() => setRenaming(false)} coachName={p.coachName} buddyName={p.buddyName} />
      <GrowModal visible={growing} onClose={() => setGrowing(false)} s={s} />
    </>
  );

  // ── Tabletop: the buddy's room fills the top half ──
  if (tabletop) {
    const room = (
      <View style={{ flex: 1 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 118, backgroundColor: SCENE_GROUND, borderTopWidth: 2, borderTopColor: INK }} />
        {bubble({ left: 22, top: 18, maxWidth: 320 }, 16)}
        <View style={{ position: 'absolute', right: 18, top: 10, alignItems: 'flex-end' }}>
          <Pressable onPress={() => setRenaming(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }} accessibilityRole="button" accessibilityLabel={t('pet.rename')}>
            <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: INK, maxWidth: 200 }}>{p.buddyName}</Text>
            <Sticker background={INK} color="#FFD43B">{stageLabel(tt, stage)}</Sticker>
          </Pressable>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: '#55544F' }}>{t('pet.day', { n: String(p.buddyDay) })}</Text>
        </View>
        <View style={{ position: 'absolute', left: 10, bottom: 82 }}>{coachSprite(170)}</View>
        {coachTag({ left: 34, bottom: 80 })}
        <View style={{ position: 'absolute', right: 40, bottom: 86 }}>{buddySprite(1.3)}</View>
        <View style={{
          position: 'absolute', left: 18, right: 18, bottom: 14, padding: 10, gap: 7, borderRadius: 16,
          borderWidth: 2, borderColor: INK, backgroundColor: c.cardBackground,
        }}>
          <Bar progress={progress} height={10} color={c.accent} />
          {xpFooter}
        </View>
      </View>
    );
    const below = details ?? (
      <>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <Label>{t('pet.todayGrowth')}</Label>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '600', color: c.textPrimary }}>{growthTotal}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 18 }}>
          {growth.map(({ key, ...g }) => <GrowthTile key={key} {...g} />)}
        </ScrollView>
        <Text style={{ fontSize: 12, color: c.textSecondary, paddingTop: 8 }}>{t('pet.restNote')}</Text>
        {friendsSection}
      </>
    );
    return (
      <>
        {tabletopFrame(room, below)}
        {modals}
      </>
    );
  }

  const sceneHeight = layout === 'panel' ? 176 : 214;
  const scene = (
    <HardShadow color={c.cardShadow} radius={RADIUS.hero}>
      <View style={{ borderRadius: RADIUS.hero, borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.cardBackground, overflow: 'hidden' }}>
        <View style={{ height: sceneHeight, backgroundColor: SCENE_BG, borderBottomWidth: 2, borderBottomColor: INK }}>
          <View style={{ position: 'absolute', left: -20, right: -20, bottom: -36, height: 70, borderRadius: 200, backgroundColor: SCENE_GROUND, borderTopWidth: 2, borderTopColor: INK }} />
          {bubble({ left: 14, top: 14, maxWidth: layout === 'panel' ? 200 : 220 })}
          <View style={{ position: 'absolute', left: 4, bottom: 4 }}>{coachSprite(layout === 'panel' ? 118 : 140)}</View>
          <View style={{ position: 'absolute', right: 18, bottom: 8 }}>{buddySprite(layout === 'panel' ? 0.85 : 1)}</View>
          {coachTag({ left: 26, bottom: 6 })}
        </View>

        <View style={{ padding: layout === 'panel' ? 12 : 16, gap: layout === 'panel' ? 6 : 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {nameRow}
            <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary }}>{t('pet.day', { n: String(p.buddyDay) })}</Text>
          </View>
          {layout === 'panel' ? null : stageTrack}
          <Bar progress={progress} height={layout === 'panel' ? 10 : 12} color={c.accent} />
          {xpFooter}
        </View>
      </View>
    </HardShadow>
  );

  const growthCard = (
    <Card style={{ marginTop: layout === 'panel' ? 0 : 14 }} padding={14}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <Label>{t('pet.todayGrowth')}</Label>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '600', color: c.textPrimary }}>{growthTotal}</Text>
      </View>
      {growth.map(({ key, ...g }, i) => <GrowthRow key={key} first={i === 0} {...g} />)}
      <Text style={{ fontSize: 12, color: c.textSecondary, paddingTop: 6 }}>{t('pet.restNote')}</Text>
    </Card>
  );

  if (layout === 'panel') {
    return (
      <>
        {panelFrame(scene, <>{growthCard}{friendsSection}</>)}
        {modals}
      </>
    );
  }

  return (
    <View>
      {/* Scene + growth bar */}
      {scene}

      {/* Today's growth */}
      {growthCard}

      {friendsSection}

      {modals}
    </View>
  );
}
