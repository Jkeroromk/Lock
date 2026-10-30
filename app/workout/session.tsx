import { View, ScrollView, TextInput, Alert, Vibration, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Bar, Button, Card, IconButton, Label, PressScale, Sticker } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useWorkoutStore, num, boxKg, type ActiveSet } from '@/store/useWorkoutStore';
import { fmtWeight, fmtWeightUnit, kgTo } from '@/lib/units';
import { exerciseName, getExercise } from '@/constants/exercises';
import ExerciseThumb from '@/components/train/ExerciseThumb';
import ExercisePicker from '@/components/train/ExercisePicker';
import { showToast } from '@/components/ui/Toast';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';

const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export default function WorkoutSessionScreen() {
  const c = useTheme();
  const { t, language } = useTranslation();
  const router = useRouter();
  const {
    active, history, loadHistory, setCurrent, updateSet, toggleSet, addSet, removeSet,
    addExercises, removeExercise, startRest, adjustRest, skipRest, discard, finish,
  } = useWorkoutStore();
  const [now, setNow] = useState(Date.now());
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const restAlerted = useRef<number | null>(null);
  const tabsRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const layout = useDeviceLayout();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ids = useMemo(() => active?.exercises.map((e) => e.id) ?? [], [active?.exercises]);
  const idKey = ids.join(',');
  useEffect(() => {
    const missing = ids.filter((id) => !(id in history.last) && !(id in history.best));
    if (missing.length) loadHistory(missing);
  }, [idKey]);

  // Rest timer: buzz once when it runs out.
  const restLeft = active?.restEndsAt ? Math.max(0, (active.restEndsAt - now) / 1000) : null;
  useEffect(() => {
    if (!active?.restEndsAt) return;
    if (restLeft === 0 && restAlerted.current !== active.restEndsAt) {
      restAlerted.current = active.restEndsAt;
      Vibration.vibrate(Platform.OS === 'android' ? [0, 300, 150, 300] : 400);
      skipRest();
    }
  }, [restLeft === 0, active?.restEndsAt]);

  // Leaving after a finish/discard: nothing to show.
  useEffect(() => {
    if (!active && !saving) router.canGoBack() ? router.back() : router.replace('/(tabs)/train');
  }, [!!active]);

  if (!active) return <View style={{ flex: 1, backgroundColor: c.backgroundPrimary }} />;

  const unit = active.unit ?? 'kg';
  const exercises = active.exercises;
  const ei = Math.min(active.current, Math.max(0, exercises.length - 1));
  const ex = exercises[ei];
  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const allDone = totalSets > 0 && doneSets === totalSets;
  const elapsed = (now - new Date(active.startedAt).getTime()) / 1000;
  const last = ex ? history.last[ex.id] ?? [] : [];
  const prior = ex ? history.best[ex.id] : undefined;
  const bodyweight = ex ? getExercise(ex.id)?.equipment === 'bodyweight' : false;

  // Best set today, if it beats the record from before today.
  let todayPr: { weight: number; reps: number } | null = null;
  if (ex && prior) {
    for (const s of ex.sets) {
      if (!s.done) continue;
      const cand = { weight: boxKg(s.weight, unit), reps: Math.round(num(s.reps)) };
      const ref = todayPr ?? prior;
      if (cand.weight > ref.weight || (cand.weight === ref.weight && cand.reps > ref.reps)) todayPr = cand;
    }
  }

  const onToggle = (si: number) => {
    const s = ex.sets[si];
    if (!s.done) {
      // Empty boxes take the placeholder (last time's numbers).
      const prev = last[si] ?? last[last.length - 1];
      const patch: Partial<ActiveSet> = {};
      if (!s.reps.trim() && prev) patch.reps = String(prev.reps);
      if (!s.weight.trim() && prev && prev.weight > 0) patch.weight = fmtWeight(prev.weight, unit);
      if (Object.keys(patch).length) updateSet(ei, si, patch);
      if (num(patch.reps ?? s.reps) < 1) return;
    }
    const { pr } = toggleSet(ei, si);
    if (s.done) return;
    if (pr) {
      showToast({
        icon: 'trophy',
        message: pr.weight > 0 ? t('train.prToast', { w: fmtWeightUnit(pr.weight, unit), r: String(pr.reps) }) : t('train.prToastReps', { r: String(pr.reps) }),
        detail: exerciseName(ex.id, language),
      });
    }
    const willBeAllDone = doneSets + 1 === totalSets;
    if (!willBeAllDone) startRest();
    else skipRest();
  };

  const save = async () => {
    setSaving(true);
    try {
      await finish();
      router.replace('/workout/done');
    } catch {
      setSaving(false);
      Alert.alert(t('train.saveWorkoutFailed'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('train.retry'), onPress: save },
      ]);
    }
  };

  const confirmDiscard = () => {
    Alert.alert(t('train.discardTitle'), t('train.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('train.discard'), style: 'destructive', onPress: discard },
    ]);
  };

  const onEnd = () => {
    if (doneSets === 0) {
      Alert.alert(t('train.nothingDone'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('train.discard'), style: 'destructive', onPress: discard },
      ]);
      return;
    }
    Alert.alert(t('train.finishTitle'), t('train.finishBody', { done: String(doneSets), total: String(totalSets) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('train.discard'), style: 'destructive', onPress: confirmDiscard },
      { text: t('train.finishSave'), onPress: save },
    ]);
  };

  const confirmRemoveExercise = () => {
    Alert.alert(t('train.removeExercise'), exerciseName(ex.id, language), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeExercise(ei) },
    ]);
  };

  const next = exercises[ei + 1];
  const currentDone = ex ? ex.sets.length > 0 && ex.sets.every((s) => s.done) : false;

  // iPhone Duo open: a layout made for the gym.
  // - Turned a quarter and stood on a bench (tabletop): the top half is read from
  //   two metres away (big numbers, no scrolling), the bottom half has big buttons.
  // - Side by side (flat or half folded like a book): left thumb runs the clock,
  //   right thumb runs the set.
  const posture = layout.fold && ex ? (layout.tabletop ? 'table' : layout.kind === 'inner' ? 'book' : null) : null;
  if (posture && layout.fold && ex) {
    const fold = layout.fold;
    const cur = ex.sets.findIndex((s) => !s.done);
    const curSet = cur >= 0 ? ex.sets[cur] : null;
    const ph = cur >= 0 ? last[cur] ?? last[last.length - 1] ?? null : null;
    const shownWeight = curSet ? (curSet.weight.trim() ? curSet.weight : ph && ph.weight > 0 ? fmtWeight(ph.weight, unit) : '0') : '';
    const shownReps = curSet ? (curSet.reps.trim() ? curSet.reps : ph ? String(ph.reps) : '0') : '';
    const step = unit === 'lb' ? 5 : 2.5;
    const nudgeWeight = (d: number) => {
      if (cur < 0) return;
      const v = Math.max(0, Math.round((num(shownWeight) + d) * 100) / 100);
      updateSet(ei, cur, { weight: String(v) });
    };
    const nudgeReps = (d: number) => {
      if (cur < 0) return;
      updateSet(ei, cur, { reps: String(Math.max(1, Math.round(num(shownReps)) + d)) });
    };
    const resting = restLeft !== null && restLeft > 0;
    const best = todayPr ?? prior ?? null;
    const lastHere = cur >= 0 ? last[cur] ?? null : last[last.length - 1] ?? null;
    const fmtSet = (w: number, r: number) => (w > 0 ? `${fmtWeight(w, unit)}×${r}` : `${r}`);
    const volumeKg = exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).reduce((m, x) => m + boxKg(x.weight, unit) * Math.round(num(x.reps)), 0), 0);

    // The one big button: finish this set → go to the next exercise → finish the workout.
    const main = curSet
      ? { label: t('train.completeSet'), onPress: () => onToggle(cur) }
      : next
        ? { label: `${t('train.next')} · ${exerciseName(next.id, language)}`, onPress: () => setCurrent(ei + 1) }
        : { label: t('train.finishWorkout'), onPress: save };

    const side = fold.axis === 'vertical';
    const R = 28;
    const ink = c.surfaceInverse;
    const onInk = c.textInverse;
    const dim = 'rgba(127,127,127,0.55)';

    const header = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PressScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.close')}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: dim, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-down" size={20} color={onInk} />
        </PressScale>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONTS.mono, fontSize: 13, letterSpacing: 0.5, color: onInk, opacity: 0.7 }}>
          {t('train.elapsedLabel')} {mmss(elapsed)} · {t('train.exerciseOf', { i: String(ei + 1), n: String(exercises.length) })}{side ? '' : ` · ${t('train.volume')} ${volumeText}`}
        </Text>
        {curSet ? (
          <Sticker rotate={3}>
            <Text style={{ fontFamily: FONTS.mono, fontWeight: '700', fontSize: 12, color: c.onAccent }}>
              {t('train.setOf', { i: String(cur + 1), n: String(ex.sets.length) })}
            </Text>
          </Sticker>
        ) : null}
      </View>
    );

    const title = (
      <Text numberOfLines={1} style={{ fontSize: side ? 34 : 40, fontWeight: '800', letterSpacing: -1, color: onInk }}>
        {exerciseName(ex.id, language)}
      </Text>
    );

    // Giant number: the rest clock while resting, otherwise this set's target.
    const bigNumber = (
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: onInk, opacity: 0.7 }}>
          {resting ? t('train.rest') : curSet ? t('train.nextUp') : t('train.exerciseDone')}
        </Text>
        {resting ? (
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: side ? 128 : 136, fontWeight: '800', letterSpacing: -6, lineHeight: side ? 132 : 140, color: onInk, fontVariant: ['tabular-nums'] }}>
            {mmss(restLeft ?? 0)}
          </Text>
        ) : curSet ? (
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: side ? 76 : 88, fontWeight: '800', letterSpacing: -3, lineHeight: side ? 84 : 96, color: c.accent }}>
            {bodyweight && num(shownWeight) === 0 ? `${shownReps} ${t('train.repsShort')}` : `${shownWeight} × ${shownReps}`}
          </Text>
        ) : (
          <Ionicons name="checkmark-circle" size={96} color={c.accent} />
        )}
        {resting ? <Bar progress={active.restTotal ? (restLeft ?? 0) / active.restTotal : 0} height={10} color={c.accent} style={{ marginTop: 8 }} /> : null}
      </View>
    );

    const infoCard = (label: string, value: string, accent?: boolean) => (
      <View style={{ borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(127,127,127,0.18)', gap: 2 }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: onInk, opacity: 0.7 }}>{label}</Text>
        <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '800', color: accent ? c.accent : onInk }}>{value}</Text>
      </View>
    );
    const volumeText = `${Math.round(kgTo(volumeKg, unit)).toLocaleString()} ${unit}`;
    const infoCards = (
      <>
        {infoCard(t('train.colLast'), lastHere ? fmtSet(lastHere.weight, lastHere.reps) : '—')}
        {infoCard(t('train.bestLabel'), best ? fmtSet(best.weight, best.reps) : '—', !!todayPr)}
      </>
    );

    // One chip per set of this exercise: done (with numbers), now, still to do.
    const setChips = (onDark: boolean) => (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {ex.sets.map((x, si) => {
          const now_ = si === cur;
          return (
            <View key={si} style={{
              flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              backgroundColor: x.done ? (onDark ? 'rgba(127,127,127,0.3)' : c.surfaceInverse) : now_ ? c.accent : 'transparent',
              borderWidth: x.done ? 0 : 2, borderStyle: now_ ? 'solid' : 'dashed', borderColor: now_ ? c.ink : onDark ? dim : c.borderSecondary,
            }}>
              <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '700', color: x.done ? (onDark ? onInk : c.textInverse) : now_ ? c.onAccent : c.textSecondary }}>
                {x.done ? fmtSet(boxKg(x.weight, unit), Math.round(num(x.reps))) : now_ ? '●' : si + 1}
              </Text>
            </View>
          );
        })}
      </View>
    );

    // Progress through the exercises: tap one to jump to it.
    const exerciseStrip = (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {exercises.map((e, i) => {
          const finished = e.sets.length > 0 && e.sets.every((x) => x.done);
          return (
            <PressScale key={`${e.id}-${i}`} onPress={() => setCurrent(i)} accessibilityRole="tab" accessibilityState={{ selected: i === ei }}
              accessibilityLabel={exerciseName(e.id, language)} style={{ flex: 1, height: 44, justifyContent: 'center' }}>
              <View style={{ height: i === ei ? 12 : 8, borderRadius: 6, backgroundColor: finished ? c.accent : i === ei ? onInk : 'rgba(127,127,127,0.35)' }} />
            </PressScale>
          );
        })}
      </View>
    );

    const stepper = (value: string, unitLabel: string, onMinus: () => void, onPlus: () => void, a11y: string) => (
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 22, borderWidth: 2, borderColor: c.borderPrimary, backgroundColor: c.cardBackground, opacity: curSet ? 1 : 0.4 }}>
        <PressScale onPress={onMinus} disabled={!curSet} scaleTo={0.88} accessibilityRole="button" accessibilityLabel={`${a11y} −`}
          style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: c.borderPrimary, backgroundColor: c.backgroundPrimary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="remove" size={24} color={c.textPrimary} />
        </PressScale>
        <View style={{ alignItems: 'center', minWidth: 60 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 30, fontWeight: '800', color: c.textPrimary }}>{value || '—'}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{unitLabel}</Text>
        </View>
        <PressScale onPress={onPlus} disabled={!curSet} scaleTo={0.88} accessibilityRole="button" accessibilityLabel={`${a11y} +`}
          style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: c.borderPrimary, backgroundColor: c.backgroundPrimary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={24} color={c.textPrimary} />
        </PressScale>
      </View>
    );
    const steppers = (vertical: boolean) => (
      <View style={{ flexDirection: vertical ? 'column' : 'row', gap: 12 }}>
        {stepper(shownWeight, bodyweight ? `+${unit}` : unit, () => nudgeWeight(-step), () => nudgeWeight(step), t('train.wtStep'))}
        {stepper(shownReps, t('train.repsShort'), () => nudgeReps(-1), () => nudgeReps(1), t('train.repStep'))}
      </View>
    );

    const mainButton = (
      <PressScale onPress={main.onPress} disabled={saving} scaleTo={0.97} accessibilityRole="button"
        style={{ flex: 1, minHeight: 72, borderRadius: 28, borderWidth: 3, borderColor: c.ink, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, shadowColor: c.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 5, height: 5 } }}>
        <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 32, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', color: c.onAccent }}>{main.label}</Text>
      </PressScale>
    );

    const pill = (label: string, onPress: () => void, opts: { accent?: boolean; onDark?: boolean; mono?: boolean } = {}) => (
      <PressScale key={label} onPress={onPress} scaleTo={0.92} accessibilityRole="button"
        style={{
          flex: 1, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
          borderColor: opts.accent ? c.accent : opts.onDark ? onInk : c.borderPrimary,
          backgroundColor: opts.accent ? c.accent : 'transparent',
        }}>
        <Text numberOfLines={1} style={{ fontFamily: opts.mono ? FONTS.mono : undefined, fontSize: opts.mono ? 15 : 16, fontWeight: '800', color: opts.accent ? c.onAccent : opts.onDark ? onInk : c.textPrimary }}>{label}</Text>
      </PressScale>
    );
    const restRow = (onDark: boolean) => (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {pill('−15s', () => adjustRest(-15), { onDark, mono: true })}
        {pill(t('train.skip'), skipRest, { accent: true })}
        {pill('+15s', () => adjustRest(15), { onDark, mono: true })}
      </View>
    );
    const otherRow = (onDark: boolean) => (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {pill(t('train.addSet'), () => addSet(ei), { onDark })}
        {pill(t('train.addExercise'), () => setPicker(true), { onDark })}
        {pill(t('train.end'), onEnd, { onDark })}
      </View>
    );

    const picker_ = (
      <ExercisePicker visible={picker} onClose={() => setPicker(false)} exclude={ids}
        onAdd={(picked) => { addExercises(picked); loadHistory(picked); }} />
    );

    if (!side) {
      // Tabletop: display on top, controls below.
      return (
        <View style={{ flex: 1, backgroundColor: c.track }}>
          <View style={{
            position: 'absolute', left: 0, right: 0, top: 0, height: fold.start, backgroundColor: ink, borderBottomLeftRadius: R, borderBottomRightRadius: R,
            paddingTop: insets.top + 14, paddingLeft: insets.left + 28, paddingRight: insets.right + 28, paddingBottom: 18, gap: 10,
          }}>
            {header}
            {title}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <View style={{ flex: 1 }}>{bigNumber}</View>
              <View style={{ width: 168, gap: 10 }}>{infoCards}</View>
            </View>
            {setChips(true)}
            {exerciseStrip}
          </View>
          <View style={{
            position: 'absolute', left: 0, right: 0, top: fold.start + fold.width, bottom: 0, backgroundColor: c.backgroundPrimary, borderTopLeftRadius: R, borderTopRightRadius: R,
            paddingTop: 22, paddingLeft: insets.left + 28, paddingRight: insets.right + 28, paddingBottom: insets.bottom + 18, gap: 14,
          }}>
            {steppers(false)}
            {mainButton}
            {resting ? restRow(false) : otherRow(false)}
          </View>
          {picker_}
        </View>
      );
    }

    // Side by side: clock and progress on the left page, the set on the right page.
    return (
      <View style={{ flex: 1, backgroundColor: c.track }}>
        <View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: fold.start, backgroundColor: ink, borderTopRightRadius: R, borderBottomRightRadius: R,
          paddingTop: insets.top + 22, paddingLeft: insets.left + 26, paddingRight: 24, paddingBottom: insets.bottom + 20, gap: 12,
        }}>
          {header}
          {title}
          {exerciseStrip}
          <View style={{ flex: 1, justifyContent: 'center' }}>{bigNumber}</View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>{infoCard(t('train.colLast'), lastHere ? fmtSet(lastHere.weight, lastHere.reps) : '—')}</View>
            <View style={{ flex: 1 }}>{infoCard(t('train.bestLabel'), best ? fmtSet(best.weight, best.reps) : '—', !!todayPr)}</View>
            <View style={{ flex: 1 }}>{infoCard(t('train.volume'), volumeText)}</View>
          </View>
          {resting ? restRow(true) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {pill(t('train.addExercise'), () => setPicker(true), { onDark: true })}
              {pill(t('train.end'), onEnd, { onDark: true })}
            </View>
          )}
        </View>
        <View style={{
          position: 'absolute', left: fold.start + fold.width, right: 0, top: 0, bottom: 0, backgroundColor: c.backgroundPrimary, borderTopLeftRadius: R, borderBottomLeftRadius: R,
          paddingTop: insets.top + 22, paddingLeft: 24, paddingRight: insets.right + 20, paddingBottom: insets.bottom + 20, gap: 12,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Label>{curSet ? t('train.setOf', { i: String(cur + 1), n: String(ex.sets.length) }) : t('train.exerciseDone')}</Label>
            <Label>{t('train.setsDone', { done: String(doneSets), total: String(totalSets) })}</Label>
          </View>
          {setChips(false)}
          {steppers(true)}
          {mainButton}
          <PressScale onPress={() => addSet(ei)} accessibilityRole="button"
            style={{ height: 44, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: c.borderSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: c.textPrimary }}>{t('train.addSet')}</Text>
          </PressScale>
        </View>
        {picker_}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 }}>
        <IconButton icon="chevron-down" onPress={() => router.back()} accessibilityLabel={t('common.close')} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.5, color: c.textPrimary }}>{active.title ?? t('train.freeTitle')}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary }}>{mmss(elapsed)}</Text>
        </View>
        <PressScale
          onPress={onEnd}
          disabled={saving}
          accessibilityRole="button"
          style={{ height: 44, paddingHorizontal: 16, borderRadius: 13, borderWidth: 2, borderColor: c.borderPrimary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontWeight: '800', fontSize: 15, color: c.textPrimary }}>{t('train.end')}</Text>
        </PressScale>
      </View>

      {/* Exercise tabs */}
      <View>
        <ScrollView ref={tabsRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
          {exercises.map((e, i) => {
            const on = i === ei;
            const finished = e.sets.length > 0 && e.sets.every((s) => s.done);
            return (
              <PressScale
                key={`${e.id}-${i}`}
                onPress={() => setCurrent(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2,
                  borderColor: on || finished ? c.ink : c.borderSecondary,
                  backgroundColor: on ? c.accent : finished ? c.surfaceInverse : 'transparent',
                }}
              >
                {finished && !on ? <Ionicons name="checkmark" size={14} color={c.accent} /> : null}
                <Text numberOfLines={1} style={{ maxWidth: 120, fontWeight: '700', fontSize: 13, color: on ? c.onAccent : finished ? c.textInverse : c.textPrimary }}>
                  {exerciseName(e.id, language)}
                </Text>
              </PressScale>
            );
          })}
          <PressScale
            onPress={() => setPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={t('train.addExercise')}
            style={{ height: 40, width: 40, borderRadius: 12, borderWidth: 2, borderColor: c.borderPrimary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={20} color={c.textPrimary} />
          </PressScale>
        </ScrollView>
        <Bar progress={totalSets ? doneSets / totalSets : 0} height={6} style={{ marginHorizontal: 18, marginBottom: 4 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingTop: 12, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {!ex ? (
          <Card padding={20}>
            <Text style={{ fontSize: 16, color: c.textSecondary, marginBottom: 14 }}>{t('train.emptyWorkout')}</Text>
            <Button icon="add" label={t('train.addExercise')} onPress={() => setPicker(true)} />
          </Card>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Label>{t('train.exerciseOf', { i: String(ei + 1), n: String(exercises.length) })}</Label>
              <Label>{t('train.setsDone', { done: String(doneSets), total: String(totalSets) })}</Label>
            </View>

            <Card variant="hero" padding={16}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <ExerciseThumb id={ex.id} size={64} highlight />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary }}>{exerciseName(ex.id, language)}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {(getExercise(ex.id)?.muscles ?? []).map((m) => (
                      <View key={m} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5, borderColor: c.borderSecondary }}>
                        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t(`train.muscle.${m}`)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <IconButton icon="ellipsis-horizontal" onPress={confirmRemoveExercise} accessibilityLabel={t('train.removeExercise')} style={{ borderWidth: 0 }} />
              </View>
              {todayPr ? (
                <Sticker style={{ position: 'absolute', top: -14, right: 12 }} rotate={5}>
                  <Ionicons name="trophy" size={12} color={c.onAccent} />
                  <Text style={{ fontFamily: FONTS.mono, fontWeight: '700', fontSize: 12, color: c.onAccent }}>
                    {todayPr.weight > 0 ? t('train.prToast', { w: fmtWeightUnit(todayPr.weight, unit), r: String(todayPr.reps) }) : t('train.prToastReps', { r: String(todayPr.reps) })}
                  </Text>
                </Sticker>
              ) : null}

              {/* Sets */}
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 6, gap: 8 }}>
                  <Text style={[colHead(c), { width: 28 }]}>{t('train.colSet')}</Text>
                  <Text style={[colHead(c), { flex: 1.2 }]}>{t('train.colLast')}</Text>
                  <Text style={[colHead(c), { flex: 1, textAlign: 'center' }]}>{bodyweight ? `+${unit.toUpperCase()}` : unit.toUpperCase()}</Text>
                  <Text style={[colHead(c), { flex: 1, textAlign: 'center' }]}>{t('train.colReps')}</Text>
                  <View style={{ width: 40 }} />
                </View>
                {ex.sets.map((s, si) => {
                  const prev = last[si] ?? null;
                  const ph = prev ?? last[last.length - 1] ?? null;
                  return (
                    <View
                      key={si}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 12, marginBottom: 4,
                        backgroundColor: s.done ? c.accent : 'transparent',
                      }}
                    >
                      <PressScale
                        onLongPress={() => removeSet(ei, si)}
                        accessibilityLabel={t('train.removeSetA11y', { n: String(si + 1) })}
                        style={{ width: 28, alignItems: 'center' }}
                      >
                        <Text style={{ fontFamily: FONTS.mono, fontWeight: '700', fontSize: 15, color: s.done ? c.onAccent : c.textPrimary }}>{si + 1}</Text>
                      </PressScale>
                      <Text numberOfLines={1} style={{ flex: 1.2, fontFamily: FONTS.mono, fontSize: 13, color: s.done ? c.onAccent : c.textSecondary }}>
                        {prev ? (prev.weight > 0 ? `${fmtWeight(prev.weight, unit)}×${prev.reps}` : `${prev.reps}`) : '—'}
                      </Text>
                      <NumberBox
                        value={s.weight}
                        placeholder={ph && ph.weight > 0 ? fmtWeight(ph.weight, unit) : bodyweight ? '0' : unit}
                        decimal
                        done={s.done}
                        onChange={(v) => updateSet(ei, si, { weight: v })}
                        accessibilityLabel={t('train.weightA11y', { n: String(si + 1) })}
                      />
                      <NumberBox
                        value={s.reps}
                        placeholder={ph ? String(ph.reps) : '—'}
                        done={s.done}
                        onChange={(v) => updateSet(ei, si, { reps: v })}
                        accessibilityLabel={t('train.repsA11y', { n: String(si + 1) })}
                      />
                      <PressScale
                        onPress={() => onToggle(si)}
                        scaleTo={0.85}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: s.done }}
                        accessibilityLabel={t('train.doneA11y', { n: String(si + 1) })}
                        style={{
                          width: 40, height: 40, borderRadius: 12, borderWidth: 2,
                          borderColor: s.done ? c.ink : c.borderPrimary, backgroundColor: s.done ? c.ink : 'transparent',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="checkmark" size={22} color={s.done ? c.accent : c.textTertiary} />
                      </PressScale>
                    </View>
                  );
                })}
                <PressScale
                  onPress={() => addSet(ei)}
                  accessibilityRole="button"
                  style={{ marginTop: 6, height: 44, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: c.borderSecondary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 14, color: c.textPrimary }}>{t('train.addSet')}</Text>
                </PressScale>
              </View>
            </Card>

            {/* Rest timer */}
            {restLeft !== null && restLeft > 0 ? (
              <Card variant="inverse" padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Label color={c.textInverse} style={{ opacity: 0.7 }}>{t('train.rest')}</Label>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 40, fontWeight: '700', color: c.textInverse, letterSpacing: -1 }}>{mmss(restLeft)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <RestButton label="−15" onPress={() => adjustRest(-15)} />
                    <RestButton label="+15" onPress={() => adjustRest(15)} />
                    <RestButton label={t('train.skip')} onPress={skipRest} accent />
                  </View>
                </View>
                <Bar progress={active.restTotal ? restLeft / active.restTotal : 0} height={6} color={c.accent} style={{ marginTop: 12 }} />
              </Card>
            ) : null}

            {/* Next / finish */}
            {next ? (
              <PressScale
                onPress={() => {
                  setCurrent(ei + 1);
                  tabsRef.current?.scrollTo({ x: Math.max(0, (ei + 1) * 110 - 60), animated: true });
                }}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 2,
                  borderColor: currentDone ? c.ink : c.borderSecondary, backgroundColor: c.cardBackground,
                }}
              >
                <ExerciseThumb id={next.id} />
                <View style={{ flex: 1 }}>
                  <Label>{t('train.next')}</Label>
                  <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary, marginTop: 2 }}>{exerciseName(next.id, language)}</Text>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary }}>
                    {next.sets.length}×{next.sets[0]?.reps || '—'}{next.sets[0]?.weight ? ` · ${next.sets[0].weight} ${unit}` : ''}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={c.textPrimary} />
              </PressScale>
            ) : null}

            {allDone || (!next && currentDone) ? (
              <Button label={t('train.finishWorkout')} icon="flag" onPress={save} loading={saving} />
            ) : null}
          </>
        )}
      </ScrollView>

      <ExercisePicker
        visible={picker}
        onClose={() => setPicker(false)}
        exclude={ids}
        onAdd={(picked) => {
          addExercises(picked);
          loadHistory(picked);
        }}
      />
    </SafeAreaView>
  );
}

const colHead = (c: ReturnType<typeof useTheme>) => ({ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.5, color: c.textSecondary }) as const;

function NumberBox({ value, placeholder, onChange, decimal, done, accessibilityLabel }: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  decimal?: boolean;
  done?: boolean;
  accessibilityLabel: string;
}) {
  const c = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChange(v.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, '').slice(0, 6))}
      placeholder={placeholder}
      placeholderTextColor={done ? c.onAccent : c.textTertiary}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      accessibilityLabel={accessibilityLabel}
      style={{
        flex: 1, height: 40, borderRadius: 10, borderWidth: done ? 0 : 1.5, borderColor: c.borderSecondary,
        backgroundColor: done ? 'transparent' : c.cardBackgroundSecondary, textAlign: 'center',
        fontFamily: FONTS.mono, fontSize: 16, fontWeight: '700', color: done ? c.onAccent : c.textPrimary, paddingVertical: 0,
      }}
    />
  );
}

function RestButton({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  const c = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      style={{
        height: 40, minWidth: 48, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: accent ? c.accent : 'transparent', borderWidth: 2, borderColor: accent ? c.accent : c.textInverse,
      }}
    >
      <Text style={{ fontFamily: FONTS.mono, fontWeight: '700', fontSize: 13, color: accent ? c.onAccent : c.textInverse }}>{label}</Text>
    </PressScale>
  );
}
