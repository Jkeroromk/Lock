import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Appear, Bar, Button, Card, Label, Sticker } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useStore } from '@/store/useStore';
import { useWorkoutStore, fmtKg } from '@/store/useWorkoutStore';
import { exerciseName } from '@/constants/exercises';
import { macroTargets } from '@/components/today/CaloriesCard';
import ExerciseThumb from '@/components/train/ExerciseThumb';

/** Strength training ≈ 5 MET: kcal ≈ 5 × kg × hours. */
const estimateKcal = (bodyKg: number, sec: number) => Math.round(5 * bodyKg * (sec / 3600));

export default function WorkoutDoneScreen() {
  const c = useTheme();
  const { t, language } = useTranslation();
  const router = useRouter();
  const last = useWorkoutStore((s) => s.lastResult);
  const { user, todayMeals, dailyCalorieGoal, refreshToday } = useStore();

  useEffect(() => {
    if (!last) router.replace('/(tabs)/train');
    else refreshToday();
  }, []);

  if (!last) return <View style={{ flex: 1, backgroundColor: c.backgroundPrimary }} />;

  const { result, title, plannedSets } = last;
  const minutes = Math.max(1, Math.round(result.session.durationSec / 60));
  const kcal = estimateKcal(Number(user?.weight) || 70, result.session.durationSec);
  const proteinGoal = macroTargets(dailyCalorieGoal).protein;
  const protein = Math.round(todayMeals.reduce((n, m) => n + (Number(m.protein) || 0), 0));
  const proteinLeft = Math.max(0, proteinGoal - protein);
  const bumpOnly = result.bumps.filter((b) => !result.prs.some((p) => p.exerciseId === b.exerciseId));
  const close = () => router.replace('/(tabs)/train');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <Appear index={0}>
          <Sticker rotate={-5} style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
            <Ionicons name="checkmark" size={14} color={c.onAccent} />
            <Text style={{ fontFamily: FONTS.mono, fontWeight: '700', fontSize: 12, color: c.onAccent }}>{t('train.completed')}</Text>
          </Sticker>
          <Text style={{ fontSize: 44, fontWeight: '800', letterSpacing: -1.8, color: c.textPrimary }}>{t('train.doneHeadline')}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary, marginTop: 4 }}>
            {(title ?? t('train.freeTitle'))} · {t('train.minutesN', { n: String(minutes) })}
          </Text>
        </Appear>

        <Appear index={1} style={{ flexDirection: 'row', gap: 10 }}>
          <Tile label={t('train.volume')} value={Math.round(result.session.volume).toLocaleString()} unit="kg" />
          <Tile label={t('train.setsCompleted')} value={String(result.session.setCount)} unit={`/ ${Math.max(plannedSets, result.session.setCount)}`} />
          <Tile label={t('train.kcal')} value={String(kcal)} unit="kcal" />
        </Appear>

        {result.prs.length > 0 || bumpOnly.length > 0 ? (
          <Appear index={2}>
            <Card variant="hero" padding={16}>
              {result.prs.length > 0 ? <Label style={{ marginBottom: 10 }}>{t('train.prsTitle')}</Label> : null}
              {result.prs.map((p, i) => {
                const bump = result.bumps.find((b) => b.exerciseId === p.exerciseId);
                const diff = p.previous ? Math.round((p.weight - p.previous.weight) * 100) / 100 : 0;
                return (
                  <View key={p.exerciseId} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: c.divider, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <ExerciseThumb id={p.exerciseId} highlight />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary }}>{exerciseName(p.exerciseId, language)}</Text>
                        <Text style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: '600', color: c.textPrimary }}>
                          {p.weight > 0 ? `${fmtKg(p.weight)} kg × ${p.reps}` : `× ${p.reps}`}
                        </Text>
                      </View>
                      {diff > 0 ? <Sticker rotate={-6}>{`+${fmtKg(diff)}`}</Sticker> : <Ionicons name="trophy" size={20} color={c.textPrimary} />}
                    </View>
                    {bump ? (
                      <Text style={{ fontSize: 13, color: c.textSecondary, marginLeft: 56 }}>{t('train.bumpLine', { kg: fmtKg(bump.to) })}</Text>
                    ) : null}
                  </View>
                );
              })}
              {bumpOnly.map((b, i) => (
                <View key={b.exerciseId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i || result.prs.length ? 1 : 0, borderColor: c.divider }}>
                  <ExerciseThumb id={b.exerciseId} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary }}>{exerciseName(b.exerciseId, language)}</Text>
                    <Text style={{ fontSize: 13, color: c.textSecondary }}>{t('train.bumpLine', { kg: fmtKg(b.to) })}</Text>
                  </View>
                  <Ionicons name="trending-up" size={20} color={c.textPrimary} />
                </View>
              ))}
            </Card>
          </Appear>
        ) : null}

        <Appear index={3}>
          <Card variant="inverse" padding={16}>
            <Label color={c.textInverse} style={{ opacity: 0.7 }}>{t('train.refuelTitle')}</Label>
            <Text style={{ fontSize: 17, lineHeight: 24, fontWeight: '600', color: c.textInverse, marginTop: 6 }}>
              {proteinLeft > 0 ? t('train.proteinLeft', { g: String(proteinLeft) }) : t('train.proteinMet')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 }}>
              <Label color={c.textInverse} style={{ opacity: 0.7 }}>{t('log.protein')}</Label>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textInverse }}>{protein} / {proteinGoal} g</Text>
            </View>
            <Bar progress={proteinGoal ? Math.min(1, protein / proteinGoal) : 0} height={8} color={c.accent} />
            {proteinLeft > 0 ? (
              <Button
                icon="camera"
                label={t('train.logMeal')}
                onPress={() => router.replace('/(tabs)/log')}
                style={{ marginTop: 14 }}
              />
            ) : null}
          </Card>
        </Appear>
      </ScrollView>
      <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
        <Button variant="solid" label={t('train.done')} onPress={close} />
      </View>
    </SafeAreaView>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit: string }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, minHeight: 84, padding: 12, borderRadius: 18, borderWidth: 2, borderColor: c.borderPrimary, backgroundColor: c.cardBackground, justifyContent: 'space-between' }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: c.textSecondary }}>{label}</Text>
      <View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.8, color: c.textPrimary }}>{value}</Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{unit}</Text>
      </View>
    </View>
  );
}
