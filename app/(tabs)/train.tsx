import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import Skeleton from '@/components/ui/Skeleton';
import TabFocusFade from '@/components/ui/TabFocusFade';
import { Appear, Button, Card, HardShadow, Label, PressScale, ScreenHeader, Sticker } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useStore, localDateKey } from '@/store/useStore';
import { useWorkoutStore, weekDays, daySets, dayMinutes, plannedDayCount, fmtKg } from '@/store/useWorkoutStore';
import { exerciseName } from '@/constants/exercises';
import { dayTitle } from '@/components/train/dayTitle';
import { fetchWeightRecords } from '@/services/weight';
import { deleteWorkout, type SessionSummary } from '@/services/workouts';

export default function TrainScreen() {
  const c = useTheme();
  const { t, language } = useTranslation();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const { plan, sessions, loaded, active, ensureUser, load, start, removeSession } = useWorkoutStore();
  const [loading, setLoading] = useState(!loaded);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [weight, setWeight] = useState<{ now: number; delta: number | null } | null>(null);

  const refresh = useCallback(async () => {
    try {
      await load();
      setFailed(false);
    } catch {
      setFailed(true);
    }
    fetchWeightRecords()
      .then((records) => {
        if (!records.length) return setWeight(null);
        const now = Number(records[0].weight);
        const prev = records[1] ? Number(records[1].weight) : null;
        setWeight({ now, delta: prev === null ? null : Math.round((now - prev) * 10) / 10 });
      })
      .catch(() => {});
  }, [load]);

  useEffect(() => {
    if (user?.id) ensureUser(user.id);
    refresh().finally(() => setLoading(false));
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    if (!loading) refresh();
  }, [loading, refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const now = new Date();
  const todayKey = localDateKey(now);
  const todayIdx = now.getDay();
  const week = useMemo(() => weekDays(now), [todayKey]);
  const weekKeys = week.map((d) => localDateKey(d));
  const doneKeys = new Set(sessions.map((s) => s.dayKey));
  const weekSessions = sessions.filter((s) => weekKeys.includes(s.dayKey));
  const weekPrs = weekSessions.reduce((n, s) => n + s.prCount, 0);
  const planned = plannedDayCount(plan);
  const todayPlan = plan[String(todayIdx)];
  const hasToday = !!todayPlan && todayPlan.exercises.length > 0;
  const hasPlan = planned > 0;
  const trainedToday = doneKeys.has(todayKey);

  const startPlanned = () => {
    if (!todayPlan) return;
    start({ planDay: todayIdx, title: dayTitle(todayPlan, todayIdx, t), day: todayPlan });
    router.push('/workout/session');
  };
  const startFree = () => {
    start({ planDay: null, title: t('train.freeTitle'), day: undefined });
    router.push('/workout/session');
  };
  const openPlan = (day?: number) => router.push({ pathname: '/workout/plan', params: day === undefined ? {} : { day: String(day) } });

  const confirmDelete = (s: SessionSummary) => {
    Alert.alert(t('train.deleteSessionTitle'), t('train.deleteSessionBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          removeSession(s.id);
          try { await deleteWorkout(s.id); } catch { refresh(); }
        },
      },
    ]);
  };

  const dateCaption = now.toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <TabFocusFade>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textPrimary} />}
        >
          <ScreenHeader
            title={t('train.title')}
            caption={dateCaption}
            right={
              <PressScale
                onPress={() => openPlan()}
                accessibilityRole="button"
                accessibilityLabel={t('train.editPlan')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 13, borderWidth: 2, borderColor: c.borderPrimary, marginBottom: 2 }}
              >
                <Ionicons name="create-outline" size={17} color={c.textPrimary} />
                <Text style={{ fontWeight: '700', fontSize: 14, color: c.textPrimary }}>{t('train.editPlan')}</Text>
              </PressScale>
            }
          />

          {/* Week strip */}
          <Appear index={0} style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
            {week.map((d, i) => {
              const key = weekKeys[i];
              const wd = d.getDay();
              const pd = plan[String(wd)];
              const isToday = key === todayKey;
              const done = doneKeys.has(key);
              const label = pd && pd.exercises.length ? dayTitle(pd, wd, t, true) : t('train.restShort');
              const bg = isToday ? c.accent : done ? c.surfaceInverse : 'transparent';
              const fg = isToday ? c.onAccent : done ? c.textInverse : c.textPrimary;
              return (
                <PressScale
                  key={key}
                  onPress={() => openPlan(wd)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(`train.wdl.d${wd}`)} ${label}`}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, gap: 4,
                    borderWidth: 2, borderColor: isToday || done ? c.ink : c.borderSecondary, backgroundColor: bg,
                    transform: isToday ? [{ rotate: '-4deg' }] : undefined,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: isToday || done ? fg : c.textSecondary }}>{t(`train.wd.d${wd}`)}</Text>
                  {done && !isToday ? (
                    <Ionicons name="checkmark" size={16} color={c.accent} />
                  ) : (
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontWeight: '800', fontSize: 13, color: pd?.exercises.length ? fg : c.textTertiary }}>
                      {label}
                    </Text>
                  )}
                </PressScale>
              );
            })}
          </Appear>

          {loading ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={240} borderRadius={24} />
              <Skeleton height={90} borderRadius={18} />
            </View>
          ) : (
            <>
              {failed && !sessions.length && !hasPlan ? (
                <Text style={{ color: c.textSecondary, marginBottom: 12 }}>{t('train.loadFailed')}</Text>
              ) : null}

              {/* Today */}
              <Appear index={1}>
                <Card variant="hero" style={{ marginBottom: 14 }} padding={18}>
                  {active ? (
                    <View style={{ gap: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Label>{t('train.inProgress')}</Label>
                        <Sticker>{t('train.setsDone', {
                          done: String(active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)),
                          total: String(active.exercises.reduce((n, e) => n + e.sets.length, 0)),
                        })}</Sticker>
                      </View>
                      <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: c.textPrimary }}>{active.title ?? t('train.freeTitle')}</Text>
                      <Button variant="solid" icon="play" label={t('train.resume')} onPress={() => router.push('/workout/session')} />
                    </View>
                  ) : hasToday && todayPlan ? (
                    <View style={{ gap: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Label>{trainedToday ? t('train.doneTodayTitle') : t('train.today')}</Label>
                        {trainedToday ? <Sticker><Ionicons name="checkmark" size={13} color={c.onAccent} /></Sticker> : null}
                      </View>
                      <View>
                        <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: c.textPrimary }}>{dayTitle(todayPlan, todayIdx, t)}</Text>
                        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 4 }}>
                          {t('train.exercisesN', { n: String(todayPlan.exercises.length) })} · {t('train.setsN', { n: String(daySets(todayPlan)) })} · {t('train.aboutMin', { n: String(dayMinutes(todayPlan)) })}
                        </Text>
                      </View>
                      <View style={{ gap: 0 }}>
                        {todayPlan.exercises.slice(0, 3).map((e, i) => (
                          <View key={`${e.id}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: c.divider, gap: 10 }}>
                            <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.textPrimary }}>{exerciseName(e.id, language)}</Text>
                            <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary }}>{e.sets}×{e.reps}</Text>
                            <Text style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '600', color: c.textPrimary, minWidth: 64, textAlign: 'right' }}>
                              {e.weight > 0 ? `${fmtKg(e.weight)} kg` : t('train.bodyweight')}
                            </Text>
                          </View>
                        ))}
                        {todayPlan.exercises.length > 3 ? (
                          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, paddingTop: 4 }}>{t('train.moreN', { n: String(todayPlan.exercises.length - 3) })}</Text>
                        ) : null}
                      </View>
                      <Button
                        variant={trainedToday ? 'outline' : 'solid'}
                        icon={trainedToday ? 'refresh' : 'play'}
                        label={trainedToday ? t('train.trainAgain') : t('train.start')}
                        onPress={startPlanned}
                      />
                    </View>
                  ) : hasPlan ? (
                    <View style={{ gap: 10 }}>
                      <Label>{t('train.today')}</Label>
                      <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: c.textPrimary }}>{t('train.restDay')}</Text>
                      <Text style={{ fontSize: 15, lineHeight: 21, color: c.textSecondary }}>{t('train.restDayBody')}</Text>
                      <Button variant="outline" icon="flash-outline" label={t('train.freeWorkout')} onPress={startFree} style={{ marginTop: 4 }} />
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.8, color: c.textPrimary }}>{t('train.noPlanTitle')}</Text>
                      <Text style={{ fontSize: 15, lineHeight: 21, color: c.textSecondary }}>{t('train.noPlanBody')}</Text>
                      <Button icon="calendar-outline" label={t('train.makePlan')} onPress={() => openPlan(todayIdx)} style={{ marginTop: 4 }} />
                      <Button variant="outline" icon="flash-outline" label={t('train.freeWorkout')} onPress={startFree} />
                    </View>
                  )}
                </Card>
              </Appear>

              {/* Stats */}
              <Appear index={2} style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                <StatTile label={t('train.weekWorkouts')} value={String(weekSessions.length)} suffix={planned ? `/ ${planned}` : undefined} />
                <StatTile label={t('train.newRecords')} value={String(weekPrs)} suffix={t('train.recordsUnit')} highlight />
                <StatTile
                  label={t('train.weight')}
                  value={weight ? fmtKg(weight.now) : '—'}
                  suffix={weight?.delta ? `${weight.delta < 0 ? '↓' : '↑'}${Math.abs(weight.delta)}` : weight ? 'kg' : undefined}
                />
              </Appear>

              {/* Recent */}
              <Appear index={3}>
                <Label style={{ marginBottom: 8 }}>{t('train.recent')}</Label>
                {sessions.length === 0 ? (
                  <Text style={{ fontSize: 14, color: c.textSecondary }}>{t('train.noSessions')}</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {sessions.slice(0, 6).map((s) => {
                      const [y, m, d] = s.dayKey.split('-').map(Number);
                      const date = new Date(y, m - 1, d, 12);
                      return (
                        <PressScale
                          key={s.id}
                          onLongPress={() => confirmDelete(s)}
                          accessibilityRole="button"
                          accessibilityHint={t('train.deleteSessionTitle')}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 2, borderColor: c.borderSecondary, backgroundColor: c.cardBackground }}
                        >
                          <View style={{ width: 46, alignItems: 'center' }}>
                            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t(`train.wdl.d${date.getDay()}`)}</Text>
                            <Text style={{ fontWeight: '800', fontSize: 18, color: c.textPrimary }}>{`${m}/${d}`}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary }}>{s.title ?? t('train.freeTitle')}</Text>
                            <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 2 }}>
                              {t('train.setsN', { n: String(s.setCount) })} · {Math.round(s.volume).toLocaleString()} kg · {t('train.minutesN', { n: String(Math.max(1, Math.round(s.durationSec / 60))) })}
                            </Text>
                          </View>
                          {s.prCount > 0 ? (
                            <Sticker rotate={-6}>
                              <Ionicons name="trophy" size={12} color={c.onAccent} />
                              <Text style={{ fontFamily: FONTS.mono, fontWeight: '700', fontSize: 12, color: c.onAccent }}>{s.prCount}</Text>
                            </Sticker>
                          ) : null}
                        </PressScale>
                      );
                    })}
                  </View>
                )}
              </Appear>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </TabFocusFade>
  );
}

function StatTile({ label, value, suffix, highlight }: { label: string; value: string; suffix?: string; highlight?: boolean }) {
  const c = useTheme();
  const fg = highlight ? c.onAccent : c.textPrimary;
  const body = (
    <View style={{
      flex: 1, minHeight: 84, padding: 12, borderRadius: 18, borderWidth: 2,
      borderColor: highlight ? c.ink : c.borderPrimary, backgroundColor: highlight ? c.accent : c.cardBackground, justifyContent: 'space-between',
    }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: highlight ? c.onAccent : c.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.8, color: fg, flexShrink: 1 }}>{value}</Text>
        {suffix ? <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 12, color: highlight ? c.onAccent : c.textSecondary }}>{suffix}</Text> : null}
      </View>
    </View>
  );
  if (!highlight) return <View style={{ flex: 1 }}>{body}</View>;
  return (
    <HardShadow color={c.cardShadow} radius={18} offset={3} style={{ flex: 1 }}>
      {body}
    </HardShadow>
  );
}
