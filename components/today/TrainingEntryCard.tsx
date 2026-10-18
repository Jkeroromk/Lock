import { View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PressScale } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useStore, localDateKey } from '@/store/useStore';
import { useWorkoutStore, dayMinutes } from '@/store/useWorkoutStore';
import { dayTitle } from '@/components/train/dayTitle';

/**
 * Today's planned workout on the Today page: one tap starts it. Hidden on
 * rest days and when there's no plan.
 */
export default function TrainingEntryCard() {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const uid = useStore((s) => s.user?.id);
  const { plan, sessions, active, ensureUser, load, start } = useWorkoutStore();

  useEffect(() => {
    if (!uid) return;
    ensureUser(uid);
    if (!useWorkoutStore.getState().loaded) load().catch(() => {});
  }, [uid]);

  const weekday = new Date().getDay();
  const day = plan[String(weekday)];
  const done = sessions.some((s) => s.dayKey === localDateKey());

  if (!active && (!day || day.exercises.length === 0)) return null;

  const title = active ? active.title ?? t('train.freeTitle') : dayTitle(day!, weekday, t);
  const status = active ? t('train.inProgress') : done ? t('train.completed') : t('train.notStarted');

  const onPress = () => {
    if (active) return router.push('/workout/session');
    if (done) return router.push('/(tabs)/train');
    start({ planDay: weekday, title, day });
    router.push('/workout/session');
  };

  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: c.surfaceInverse, marginBottom: 14 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
        <Ionicons name={done && !active ? 'checkmark' : 'barbell'} size={22} color={c.onAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textInverse, opacity: 0.7 }}>
          {t('train.todayTraining')} · {status}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: c.textInverse, marginTop: 2 }}>
          {title}{!active && day ? <Text style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: '400' }}>{`  ${t('train.aboutMin', { n: String(dayMinutes(day)) })}`}</Text> : null}
        </Text>
      </View>
      {!done || active ? (
        <View style={{ paddingHorizontal: 14, height: 38, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '800', fontSize: 14, color: c.onAccent }}>{active ? t('train.resume') : t('train.startShort')}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={c.textInverse} />
      )}
    </PressScale>
  );
}
