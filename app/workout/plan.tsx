import { View, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Card, IconButton, Label, PressScale, TextField } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useWorkoutStore, num, fmtKg } from '@/store/useWorkoutStore';
import { exerciseName, defaultStep, isBodyweight, getExercise } from '@/constants/exercises';
import { savePlan, type PlanDays, type PlanExercise } from '@/services/workouts';
import ExerciseThumb from '@/components/train/ExerciseThumb';
import ExercisePicker from '@/components/train/ExercisePicker';
import { dayTitle } from '@/components/train/dayTitle';
import { showToast } from '@/components/ui/Toast';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

const clone = (p: PlanDays): PlanDays => JSON.parse(JSON.stringify(p ?? {}));

export default function PlanEditorScreen() {
  const c = useTheme();
  const { t, language } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ day?: string }>();
  const storedPlan = useWorkoutStore((s) => s.plan);
  const setPlan = useWorkoutStore((s) => s.setPlan);
  const [draft, setDraft] = useState<PlanDays>(() => clone(storedPlan));
  const [day, setDay] = useState<number>(() => {
    const d = Number(params.day);
    return Number.isInteger(d) && d >= 0 && d <= 6 ? d : new Date().getDay();
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const leaving = useRef(false);

  // Unsaved changes: ask before leaving (back button and swipe).
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (!dirty || leaving.current) return;
      e.preventDefault();
      Alert.alert(t('train.unsavedTitle'), t('train.unsavedBody'), [
        { text: t('train.keepEditing'), style: 'cancel' },
        { text: t('train.discardChanges'), style: 'destructive', onPress: () => { leaving.current = true; navigation.dispatch(e.data.action); } },
      ]);
    });
    return unsub;
  }, [navigation, dirty]);

  const key = String(day);
  const current = draft[key] ?? { exercises: [] };

  const update = (fn: (d: PlanDays) => void) => {
    setDraft((prev) => {
      const next = clone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  };

  const patchExercise = (i: number, patch: Partial<PlanExercise>) =>
    update((d) => {
      const list = d[key]?.exercises;
      if (list?.[i]) list[i] = { ...list[i], ...patch };
    });

  const move = (i: number, dir: -1 | 1) =>
    update((d) => {
      const list = d[key]?.exercises;
      if (!list) return;
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    });

  const save = async () => {
    setSaving(true);
    try {
      // Drop rest days that only have an empty name.
      const cleaned = clone(draft);
      for (const k of Object.keys(cleaned)) {
        const d = cleaned[k];
        if (!d.exercises.length && !d.name?.trim()) delete cleaned[k];
      }
      const saved = await savePlan(cleaned);
      setPlan(saved);
      leaving.current = true;
      showToast({ message: t('train.saved'), icon: 'checkmark-circle' });
      router.back();
    } catch {
      Alert.alert(t('train.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 }}>
        <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel={t('common.close')} />
        <Text style={{ flex: 1, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary }}>{t('train.planTitle')}</Text>
        <Button label={t('common.save')} onPress={save} loading={saving} disabled={!dirty} style={{ minHeight: 44, paddingHorizontal: 18 }} />
      </View>

      {/* Day chips */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 18, marginBottom: 12 }}>
        {WEEK_ORDER.map((wd) => {
          const d = draft[String(wd)];
          const on = wd === day;
          const training = !!d && d.exercises.length > 0;
          return (
            <PressScale
              key={wd}
              onPress={() => setDay(wd)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(`train.wdl.d${wd}`)}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 8, gap: 3, borderRadius: 12, borderWidth: 2,
                borderColor: on ? c.ink : c.borderSecondary, backgroundColor: on ? c.accent : training ? c.cardBackground : 'transparent',
              }}
            >
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: on ? c.onAccent : c.textSecondary }}>{t(`train.wd.d${wd}`)}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontWeight: '800', fontSize: 13, color: on ? c.onAccent : training ? c.textPrimary : c.textTertiary }}>
                {training && d ? dayTitle(d, wd, t, true) : t('train.restShort')}
              </Text>
            </PressScale>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Label>{t(`train.wdl.d${day}`)}</Label>
        <TextField
          value={current.name ?? ''}
          onChangeText={(v) => update((d) => { d[key] = { ...(d[key] ?? { exercises: [] }), name: v.slice(0, 24) }; })}
          placeholder={t('train.dayNamePlaceholder')}
          maxLength={24}
        />

        {current.exercises.length === 0 ? (
          <Text style={{ fontSize: 15, lineHeight: 21, color: c.textSecondary, paddingVertical: 8 }}>{t('train.restDayHint')}</Text>
        ) : null}

        {current.exercises.map((e, i) => {
          const bw = isBodyweight(e.id);
          return (
            <Card key={`${e.id}-${i}`} padding={12}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ExerciseThumb id={e.id} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary }}>{exerciseName(e.id, language)}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary }}>
                    {getExercise(e.id) ? t(`train.equip.${getExercise(e.id)!.equipment}`) : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <SmallIcon icon="chevron-up" disabled={i === 0} onPress={() => move(i, -1)} />
                  <SmallIcon icon="chevron-down" disabled={i === current.exercises.length - 1} onPress={() => move(i, 1)} />
                  <SmallIcon icon="close" onPress={() => update((d) => { d[key]?.exercises.splice(i, 1); })} label={t('train.removeExercise')} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Stepper label={t('train.sets')} value={e.sets} min={1} max={20} onChange={(v) => patchExercise(i, { sets: v })} />
                <Stepper label={t('train.reps')} value={e.reps} min={1} max={100} onChange={(v) => patchExercise(i, { reps: v })} />
                <KgField label={bw ? `+kg` : 'kg'} value={e.weight} step={e.step} onChange={(v) => patchExercise(i, { weight: v })} />
              </View>
              {!bw ? (
                <PressScale
                  onPress={() => patchExercise(i, { progress: e.progress === 'weight' ? 'none' : 'weight' })}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: e.progress === 'weight' }}
                  style={{
                    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5,
                    borderColor: e.progress === 'weight' ? c.ink : c.borderSecondary,
                    backgroundColor: e.progress === 'weight' ? c.accent : 'transparent',
                  }}
                >
                  <Ionicons name={e.progress === 'weight' ? 'trending-up' : 'remove'} size={14} color={e.progress === 'weight' ? c.onAccent : c.textSecondary} />
                  <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 12, color: e.progress === 'weight' ? c.onAccent : c.textSecondary }}>
                    {e.progress === 'weight' ? t('train.progressWeight', { n: fmtKg(e.step) }) : t('train.progressOff')}
                  </Text>
                </PressScale>
              ) : null}
            </Card>
          );
        })}

        <Button variant="outline" icon="add" label={t('train.addExercise')} onPress={() => setPicker(true)} />
      </ScrollView>

      <ExercisePicker
        visible={picker}
        onClose={() => setPicker(false)}
        exclude={current.exercises.map((e) => e.id)}
        onAdd={(ids) =>
          update((d) => {
            const target = d[key] ?? { exercises: [] };
            for (const id of ids) {
              const bw = isBodyweight(id);
              target.exercises.push({ id, sets: 3, reps: bw ? 12 : 10, weight: 0, progress: bw ? 'none' : 'weight', step: defaultStep(id) });
            }
            d[key] = target;
          })
        }
      />
    </SafeAreaView>
  );
}

function SmallIcon({ icon, onPress, disabled, label }: { icon: string; onPress: () => void; disabled?: boolean; label?: string }) {
  const c = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.85}
      accessibilityRole="button"
      accessibilityLabel={label ?? icon}
      style={{ width: 34, height: 40, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.25 : 1 }}
    >
      <Ionicons name={icon as any} size={19} color={c.textPrimary} />
    </PressScale>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: c.borderSecondary, paddingVertical: 6, alignItems: 'center' }}>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSecondary, textTransform: 'uppercase' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PressScale onPress={() => onChange(Math.max(min, value - 1))} accessibilityLabel={`${label} −`} style={{ width: 30, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="remove" size={16} color={c.textPrimary} />
        </PressScale>
        <Text style={{ minWidth: 24, textAlign: 'center', fontFamily: FONTS.mono, fontWeight: '700', fontSize: 17, color: c.textPrimary }}>{value}</Text>
        <PressScale onPress={() => onChange(Math.min(max, value + 1))} accessibilityLabel={`${label} +`} style={{ width: 30, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={16} color={c.textPrimary} />
        </PressScale>
      </View>
    </View>
  );
}

function KgField({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  const c = useTheme();
  const [text, setText] = useState(value > 0 ? fmtKg(value) : '');
  // Follow outside changes (the − / + buttons).
  useEffect(() => {
    if (num(text) !== value) setText(value > 0 ? fmtKg(value) : '');
  }, [value]);
  const bump = (d: number) => onChange(Math.max(0, Math.round((value + d) * 4) / 4));
  return (
    <View style={{ flex: 1.3, borderRadius: 12, borderWidth: 1.5, borderColor: c.borderSecondary, paddingVertical: 6, alignItems: 'center' }}>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSecondary, textTransform: 'uppercase' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PressScale onPress={() => bump(-step)} accessibilityLabel={`${label} −`} style={{ width: 28, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="remove" size={16} color={c.textPrimary} />
        </PressScale>
        <TextInput
          value={text}
          onChangeText={(v) => {
            const clean = v.replace(/[^0-9.,]/g, '').slice(0, 6);
            setText(clean);
            onChange(Math.min(1000, num(clean)));
          }}
          placeholder="0"
          placeholderTextColor={c.textTertiary}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{ minWidth: 44, textAlign: 'center', fontFamily: FONTS.mono, fontWeight: '700', fontSize: 17, color: c.textPrimary, paddingVertical: 0 }}
        />
        <PressScale onPress={() => bump(step)} accessibilityLabel={`${label} +`} style={{ width: 28, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={16} color={c.textPrimary} />
        </PressScale>
      </View>
    </View>
  );
}
