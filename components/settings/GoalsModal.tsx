import { View, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Card, Chip, IconButton, Label, PressScale, Segmented, TextField } from '@/components/ui/bxc';
import CustomSwitch from '@/components/settings/CustomSwitch';
import { showToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { useStore, type Goal, type ExerciseFrequency } from '@/store/useStore';
import { useWorkoutStore, dayMinutes } from '@/store/useWorkoutStore';
import { updateProfile } from '@/services/api';
import { fmtWeight, kgTo, toKg, useWeightUnit } from '@/lib/units';
import {
  STEP_PRESETS, calorieFloor, defaultSettings, macroTargetsFor, paceOptionsFor, paceToDailyKcal,
  recommendCalories, trainingBonusKcal, type GoalSettings,
} from '@/lib/goals';
import { stepHistory, weekKey } from '@/hooks/useAdaptiveStepGoal';

interface GoalsModalProps {
  visible: boolean;
  onClose: () => void;
}

const GOALS: { value: Goal; icon: string }[] = [
  { value: 'lose_weight', icon: 'trending-down' },
  { value: 'lose_fat', icon: 'flame' },
  { value: 'gain_muscle', icon: 'barbell' },
];
const FREQUENCIES: ExerciseFrequency[] = ['never', 'rarely', '1-2', '3-4', '5-6', 'daily'];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const intOr = (s: string, fallback: number) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Daily goals. Calories are recommended from the body data below (and the
 * weekly pace), or set by hand; training days can add a little; protein
 * follows body weight; steps are a preset, a custom number, or "keep up with
 * me" (a bit above the last two weeks' average).
 */
export default function GoalsModal({ visible, onClose }: GoalsModalProps) {
  const { t } = useTranslation();
  const c = useTheme();
  const unit = useWeightUnit();
  const { user, setUser, goalSettings, setGoalSettings } = useStore();
  const plan = useWorkoutStore((s) => s.plan);

  const [settings, setSettings] = useState<GoalSettings>(() => goalSettings ?? defaultSettings(user ?? {}));
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState<Goal | undefined>(undefined);
  const [freq, setFreq] = useState<ExerciseFrequency | undefined>(undefined);
  const [history, setHistory] = useState<{ average: number | null; goal: number | null } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSettings(goalSettings ?? defaultSettings(user ?? {}));
    setHeight(user?.height ? String(user.height) : '');
    setWeight(user?.weight ? fmtWeight(Number(user.weight), unit) : '');
    setAge(user?.age ? String(user.age) : '');
    setGoal(user?.goal);
    setFreq(user?.exerciseFrequency);
    setHistory(null);
    stepHistory().then(setHistory).catch(() => setHistory({ average: null, goal: null }));
  }, [visible]);

  const weightKg = weight ? Math.round(toKg(parseFloat(weight.replace(',', '.')), unit) * 100) / 100 : undefined;
  const body = { height: height ? intOr(height, 0) : undefined, weight: weightKg, age: age ? intOr(age, 0) : undefined, gender: user?.gender, goal, exerciseFrequency: freq };

  const rec = recommendCalories(body, settings.pace);
  const calories = settings.calorieMode === 'custom' && settings.calories > 0 ? settings.calories : rec?.calories ?? (settings.calories || 2000);
  const floor = calorieFloor(user?.gender);
  const macros = macroTargetsFor(calories, body);
  const paces = paceOptionsFor(goal);

  // A typical training day for the bonus preview: the longest planned day, else 45 min.
  const plannedMinutes = useMemo(() => Math.max(0, ...Object.values(plan).map((d) => (d?.exercises.length ? dayMinutes(d) : 0))), [plan]);
  const bonusPreview = trainingBonusKcal(plannedMinutes || undefined);

  const patch = (p: Partial<GoalSettings>) => setSettings((s) => ({ ...s, ...p }));

  // ± on the calories switches to a custom number, starting from what's shown.
  const nudgeCalories = (delta: number) => patch({ calorieMode: 'custom', calories: clamp(Math.round((calories + delta) / 10) * 10, 800, 6000) });

  const paceLabel = (p: number) => {
    if (p === 0) return t('goals.maintain');
    const v = Math.round(kgTo(Math.abs(p), unit) * (unit === 'lb' ? 10 : 100)) / (unit === 'lb' ? 10 : 100);
    return `${p < 0 ? '−' : '+'}${v} ${unit}`;
  };
  const signed = (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(n).toLocaleString()}`;

  const fixedSteps = settings.steps;
  const adaptiveGoal = history?.goal ?? null;

  const save = async () => {
    setSaving(true);
    const changed: Record<string, unknown> = {};
    if (body.height !== (user?.height || undefined)) changed.height = body.height;
    if (weightKg !== undefined && Math.abs((Number(user?.weight) || 0) - weightKg) > 0.01) changed.weight = weightKg;
    if (body.age !== (user?.age || undefined)) changed.age = body.age;
    if (goal !== user?.goal) changed.goal = goal;
    if (freq !== user?.exerciseFrequency) changed.exerciseFrequency = freq;
    try {
      if (Object.keys(changed).length) await updateProfile(changed as any);
    } catch {
      // Saved locally below; the profile catches up on the next edit.
    }
    if (user && Object.keys(changed).length) setUser({ ...user, ...changed } as any);
    // In auto mode keep the shown number as the fallback for when body data is missing.
    setGoalSettings({ ...settings, calories: settings.calorieMode === 'custom' ? settings.calories : calories });
    if (settings.stepMode === 'adaptive' && adaptiveGoal) {
      useStore.getState().setAdaptiveSteps({ goal: adaptiveGoal, week: weekKey() });
    }
    setSaving(false);
    showToast({ icon: 'checkmark-circle', message: t('settings.goalsUpdated') });
    onClose();
  };

  const section = (text: string) => <Label style={{ marginTop: 22, marginBottom: 8 }}>{text}</Label>;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: c.backgroundPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%',
            borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: c.borderPrimary,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary }}>{t('settings.editGoals')}</Text>
              <IconButton icon="close" onPress={onClose} accessibilityLabel={t('common.close')} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
            >
              {/* Calories */}
              {section(t('goals.calories'))}
              <Card variant="hero" padding={16}>
                <Segmented
                  options={[{ key: 'auto', label: t('goals.recommended') }, { key: 'custom', label: t('goals.custom') }]}
                  value={settings.calorieMode}
                  onChange={(k) => patch(k === 'custom' ? { calorieMode: 'custom', calories } : { calorieMode: 'auto' })}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                  <StepButton icon="remove" onPress={() => nudgeCalories(-50)} label="−50" />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 44, fontWeight: '800', letterSpacing: -1.5, color: c.textPrimary }}>{calories.toLocaleString()}</Text>
                    <Label>{t('settings.kcalPerDay')}</Label>
                  </View>
                  <StepButton icon="add" onPress={() => nudgeCalories(50)} label="+50" />
                </View>

                {settings.calorieMode === 'auto' ? (
                  rec ? (
                    <View style={{ marginTop: 14, gap: 4 }}>
                      <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, textAlign: 'center' }}>
                        {t('goals.formula', { bmr: rec.bmr.toLocaleString(), mult: String(rec.multiplier), tdee: rec.tdee.toLocaleString() })}
                      </Text>
                      {rec.delta !== 0 ? (
                        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, textAlign: 'center' }}>
                          {t('goals.paceLine', { kcal: signed(rec.delta) })}
                        </Text>
                      ) : null}
                      {rec.floored ? (
                        <Text style={{ fontSize: 12, fontWeight: '700', color: c.danger, textAlign: 'center' }}>
                          {t('goals.floored', { kcal: floor.toLocaleString() })}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={{ marginTop: 14, fontSize: 13, color: c.textSecondary, textAlign: 'center' }}>{t('goals.needBody')}</Text>
                  )
                ) : (
                  <View style={{ marginTop: 12, alignItems: 'center', gap: 8 }}>
                    {calories < floor ? (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: c.danger, textAlign: 'center' }}>
                        {t('goals.belowFloor', { kcal: floor.toLocaleString() })}
                      </Text>
                    ) : null}
                    {rec ? (
                      <PressScale onPress={() => patch({ calorieMode: 'auto' })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
                        <Ionicons name="sparkles" size={12} color={c.textSecondary} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary, textDecorationLine: 'underline' }}>
                          {t('goals.useRecommended', { kcal: rec.calories.toLocaleString() })}
                        </Text>
                      </PressScale>
                    ) : null}
                  </View>
                )}
              </Card>

              {/* Pace */}
              {settings.calorieMode === 'auto' ? (
                <>
                  {section(t('goals.pace'))}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {paces.map((p) => (
                      <Chip key={p} label={paceLabel(p)} selected={Math.abs(settings.pace - p) < 0.001} onPress={() => patch({ pace: p })} style={{ flex: 1 }} />
                    ))}
                  </View>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 6 }}>
                    {settings.pace === 0 ? t('goals.maintainHint') : t('goals.perWeek', { kcal: signed(paceToDailyKcal(settings.pace)) })}
                  </Text>
                </>
              ) : null}

              {/* Training days */}
              {section(t('goals.trainingDays'))}
              <Card padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: c.textPrimary }}>{t('goals.trainingTitle')}</Text>
                    <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2 }}>{t('goals.trainingDesc', { n: String(bonusPreview) })}</Text>
                  </View>
                  <CustomSwitch value={settings.trainingBonus} onValueChange={(v) => patch({ trainingBonus: v })} accessibilityLabel={t('goals.trainingTitle')} />
                </View>
              </Card>

              {/* Macros */}
              {section(t('goals.macros'))}
              <Card padding={14}>
                <View style={{ flexDirection: 'row' }}>
                  {([['log.protein', macros.protein], ['log.carbs', macros.carbs], ['log.fat', macros.fat]] as const).map(([k, g]) => (
                    <View key={k} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: c.textPrimary }}>{g}<Text style={{ fontSize: 13, color: c.textSecondary }}> g</Text></Text>
                      <Label>{t(k)}</Label>
                    </View>
                  ))}
                </View>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, marginTop: 10, textAlign: 'center' }}>
                  {macros.proteinPerKg ? t('goals.proteinByWeight', { g: String(macros.proteinPerKg) }) : t('goals.proteinBySplit')}
                </Text>
              </Card>

              {/* Steps */}
              {section(t('goals.steps'))}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {STEP_PRESETS.map((n) => (
                  <Chip
                    key={n}
                    label={`${n / 1000}k`}
                    selected={settings.stepMode === 'fixed' && fixedSteps === n}
                    onPress={() => patch({ stepMode: 'fixed', steps: n })}
                    style={{ flexBasis: '22%', flexGrow: 1 }}
                  />
                ))}
                <Chip
                  label={t('goals.adaptive')}
                  selected={settings.stepMode === 'adaptive'}
                  onPress={() => patch({ stepMode: 'adaptive' })}
                  style={{ flexBasis: '100%' }}
                />
              </View>
              {settings.stepMode === 'fixed' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 12 }}>
                  <StepButton icon="remove" onPress={() => patch({ steps: clamp(fixedSteps - 500, 1000, 50000) })} label="−500" />
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 22, fontWeight: '700', color: c.textPrimary, minWidth: 110, textAlign: 'center' }}>
                    {fixedSteps.toLocaleString()}
                  </Text>
                  <StepButton icon="add" onPress={() => patch({ steps: clamp(fixedSteps + 500, 1000, 50000) })} label="+500" />
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 10, lineHeight: 18 }}>
                  {history === null
                    ? '…'
                    : adaptiveGoal && history.average
                      ? t('goals.adaptiveDesc', { avg: history.average.toLocaleString(), goal: adaptiveGoal.toLocaleString() })
                      : t('goals.adaptiveNoData', { steps: fixedSteps.toLocaleString() })}
                  {' '}{t('goals.adaptiveHint')}
                </Text>
              )}

              {/* Body data: drives the recommendation above */}
              {section(t('goals.body'))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <BodyField label={`${t('settings.height')} (cm)`} value={height} onChange={setHeight} placeholder="170" />
                <BodyField label={`${t('settings.weight')} (${unit})`} value={weight} onChange={setWeight} placeholder={unit === 'lb' ? '145' : '65'} decimal />
                <BodyField label={t('settings.age')} value={age} onChange={setAge} placeholder="25" />
              </View>

              {section(t('settings.goal'))}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {GOALS.map((g) => {
                  const on = goal === g.value;
                  return (
                    <PressScale
                      key={g.value}
                      onPress={() => {
                        setGoal(g.value);
                        // A new goal starts at its usual pace.
                        if (g.value !== goal) patch({ pace: g.value === 'gain_muscle' ? 0.15 : g.value === 'lose_fat' ? -0.25 : -0.5 });
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={{
                        flex: 1, minHeight: 64, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 4,
                        borderColor: on ? c.textPrimary : c.borderPrimary, backgroundColor: on ? c.textPrimary : 'transparent',
                      }}
                    >
                      <Ionicons name={g.icon as any} size={18} color={on ? c.backgroundPrimary : c.textPrimary} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: on ? c.backgroundPrimary : c.textPrimary }}>{t(`settings.goalOptions.${g.value}` as any)}</Text>
                    </PressScale>
                  );
                })}
              </View>

              {section(t('onboarding.exerciseFrequencyTitle'))}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {FREQUENCIES.map((f) => (
                  <Chip key={f} label={t(`onboarding.exerciseFrequency.${f}` as any)} selected={freq === f} onPress={() => setFreq(f)} style={{ flexBasis: '31%', flexGrow: 1 }} />
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 28 }}>
                <Button label={t('common.cancel')} variant="outline" onPress={onClose} style={{ flex: 1 }} />
                <Button label={t('common.save')} onPress={save} loading={saving} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function StepButton({ icon, onPress, label }: { icon: string; onPress: () => void; label: string }) {
  const c = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 48, height: 48, borderRadius: 14, borderWidth: 2, borderColor: c.borderPrimary, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon as any} size={22} color={c.textPrimary} />
    </PressScale>
  );
}

function BodyField({ label, value, onChange, placeholder, decimal }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  decimal?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSecondary, marginBottom: 4 }}>{label}</Text>
      <TextField
        value={value}
        onChangeText={(v) => onChange(v.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, '').slice(0, 5))}
        placeholder={placeholder}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        accessibilityLabel={label}
      />
    </View>
  );
}
