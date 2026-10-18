import { useEffect, useState } from 'react';
import { View, Modal, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Card, Chip, IconButton, Label, PressScale, Sticker } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useStore } from '@/store/useStore';
import { useWorkoutStore, plannedDayCount } from '@/store/useWorkoutStore';
import { exerciseName } from '@/constants/exercises';
import { generateWorkoutPlan, type AiWorkoutPlan } from '@/services/ai';
import { savePlan } from '@/services/workouts';
import { showToast } from '@/components/ui/Toast';
import { dayTitle } from './dayTitle';

type Location = 'gym' | 'home' | 'bodyweight';
type Level = 'beginner' | 'experienced';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Training weekdays to start from: the current plan's, else spread by the onboarding answer. */
function defaultWeekdays(freq: string | undefined, plan: Record<string, { exercises: unknown[] }>): number[] {
  const current = WEEK_ORDER.filter((d) => (plan[String(d)]?.exercises.length ?? 0) > 0);
  if (current.length) return current.slice(0, 6);
  if (freq === '1-2') return [1, 4];
  if (freq === '5-6' || freq === 'daily') return [1, 2, 3, 5, 6];
  if (freq === '3-4') return [1, 2, 4, 5];
  return [1, 3, 5];
}

/**
 * "AI 推荐训练": three quick questions → an AI-made weekly plan to preview,
 * keep (replaces the current plan) or regenerate.
 */
export default function AiPlanSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme();
  const { t, language } = useTranslation();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const currentPlan = useWorkoutStore((s) => s.plan);
  const setPlan = useWorkoutStore((s) => s.setPlan);

  const [weekdays, setWeekdays] = useState<number[]>(() => defaultWeekdays(user?.exerciseFrequency, currentPlan));
  const days = weekdays.length;
  const [elapsed, setElapsed] = useState(0);
  const [location, setLocation] = useState<Location>('gym');
  const [level, setLevel] = useState<Level>('beginner');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<'limit' | 'failed' | null>(null);
  const [result, setResult] = useState<AiWorkoutPlan | null>(null);

  useEffect(() => {
    if (!visible) return;
    setResult(null);
    setError(null);
  }, [visible]);

  // Seconds counter while the AI works, so the wait feels finite.
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const toggleDay = (d: number) =>
    setWeekdays((cur) => {
      if (cur.includes(d)) return cur.length > 1 ? cur.filter((x) => x !== d) : cur;
      if (cur.length >= 6) return cur; // keep at least one rest day
      return WEEK_ORDER.filter((x) => x === d || cur.includes(x));
    });

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await generateWorkoutPlan({ weekdays, location, level }));
    } catch (err: any) {
      setError(err?.response?.data?.error === 'AI_LIMIT_REACHED' ? 'limit' : 'failed');
    } finally {
      setLoading(false);
    }
  };

  const keep = async () => {
    if (!result) return;
    setSaving(true);
    try {
      setPlan(await savePlan(result.plan));
      showToast({ message: t('train.aiSaved'), icon: 'sparkles' });
      onClose();
    } catch {
      Alert.alert(t('train.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const confirmKeep = () => {
    if (plannedDayCount(currentPlan) === 0) return keep();
    Alert.alert(t('train.aiReplaceTitle'), t('train.aiReplaceBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('train.aiReplace'), style: 'destructive', onPress: keep },
    ]);
  };

  const question = (label: string) => <Label style={{ marginTop: 18, marginBottom: 8 }}>{label}</Label>;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sparkles" size={20} color={c.textPrimary} />
            <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary }}>{t('train.aiPlanTitle')}</Text>
          </View>
          <IconButton icon="close" onPress={onClose} accessibilityLabel={t('common.close')} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 24 }}>
          {!result ? (
            <>
              <Text style={{ fontSize: 15, lineHeight: 21, color: c.textSecondary }}>{t('train.aiPlanBody')}</Text>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                {question(t('train.aiDaysQ'))}
                <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary }}>{t('train.aiDaysN', { n: String(days) })}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {WEEK_ORDER.map((d) => {
                  const on = weekdays.includes(d);
                  return (
                    <PressScale
                      key={d}
                      onPress={() => toggleDay(d)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={t(`train.wdl.d${d}`)}
                      style={{
                        flex: 1, height: 56, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2,
                        borderColor: on ? c.ink : c.borderSecondary, backgroundColor: on ? c.accent : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '800', color: on ? c.onAccent : c.textSecondary }}>{t(`train.wd.d${d}`)}</Text>
                      <Text style={{ fontSize: 11, color: on ? c.onAccent : c.textTertiary }}>{on ? t('train.aiTrain') : t('train.restShort')}</Text>
                    </PressScale>
                  );
                })}
              </View>
              <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 6 }}>{t('train.aiDaysHint')}</Text>

              {question(t('train.aiWhereQ'))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([['gym', 'train.aiWhereGym'], ['home', 'train.aiWhereHome'], ['bodyweight', 'train.aiWhereBody']] as const).map(([k, label]) => (
                  <Chip key={k} label={t(label)} selected={location === k} onPress={() => setLocation(k)} style={{ flex: 1 }} />
                ))}
              </View>

              {question(t('train.aiLevelQ'))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([['beginner', 'train.aiLevelNew'], ['experienced', 'train.aiLevelExp']] as const).map(([k, label]) => (
                  <Chip key={k} label={t(label)} selected={level === k} onPress={() => setLevel(k)} style={{ flex: 1 }} />
                ))}
              </View>
            </>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Label>
                  {t('train.aiDaysN', { n: String(days) })} · {t(location === 'gym' ? 'train.aiWhereGym' : location === 'home' ? 'train.aiWhereHome' : 'train.aiWhereBody')} · {t(level === 'beginner' ? 'train.aiLevelNew' : 'train.aiLevelExp')}
                </Label>
                <Text onPress={() => setResult(null)} accessibilityRole="button" style={{ fontSize: 14, fontWeight: '700', color: c.textPrimary, textDecorationLine: 'underline', padding: 6 }}>
                  {t('train.aiChange')}
                </Text>
              </View>
              {result.source === 'template' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="information-circle-outline" size={16} color={c.textSecondary} style={{ marginTop: 2 }} />
                  <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: c.textSecondary }}>{t('train.aiTemplateNote')}</Text>
                </View>
              ) : null}
              {result.summary ? (
                <Card variant="inverse" padding={14}>
                  <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '700', color: c.textInverse }}>{result.summary}</Text>
                </Card>
              ) : null}
              {WEEK_ORDER.filter((wd) => result.plan[String(wd)]).map((wd) => {
                const d = result.plan[String(wd)];
                return (
                  <Card key={wd} padding={14}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <Sticker rotate={-4}>{t(`train.wdl.d${wd}`)}</Sticker>
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: '800', color: c.textPrimary }}>{dayTitle(d, wd, t)}</Text>
                    </View>
                    {d.exercises.map((e) => (
                      <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, color: c.textPrimary }}>{exerciseName(e.id, language)}</Text>
                        <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary }}>{e.sets}×{e.reps}</Text>
                      </View>
                    ))}
                  </Card>
                );
              })}
              {result.tips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="bulb-outline" size={16} color={c.textSecondary} style={{ marginTop: 2 }} />
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.textSecondary }}>{tip}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Ionicons name="information-circle-outline" size={16} color={c.textSecondary} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.textSecondary }}>{t('train.aiWeightHint')}</Text>
              </View>
            </View>
          )}

          {error ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <Text style={{ fontSize: 15, color: c.danger }}>{error === 'limit' ? t('train.aiLimit') : t('train.aiFailed')}</Text>
              {error === 'limit' ? (
                <Button variant="outline" label={t('log.upgradeBtn' as any)} onPress={() => { onClose(); router.push('/(tabs)/settings/pricing'); }} />
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 18, paddingBottom: 8, gap: 8 }}>
          {loading ? (
            <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator color={c.textPrimary} />
              <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary }}>{t('train.aiGenerating')} {elapsed}s</Text>
            </View>
          ) : result ? (
            <>
              <Button icon="checkmark" label={t('train.aiUse')} onPress={confirmKeep} loading={saving} />
              <Button variant="outline" icon="refresh" label={t('train.aiRetry')} onPress={generate} disabled={saving} />
            </>
          ) : (
            <Button icon="sparkles" label={t('train.aiGenerate')} onPress={generate} />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
