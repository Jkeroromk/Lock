/**
 * Screenshot builds only (swapped in for lib/screenshotMode.ts by metro.config.js).
 *
 * The app runs as a signed-in demo account whose API calls are answered from
 * screenshot/fixtures.ts. Which screen to open and in which language come from
 * launch arguments, e.g.
 *   xcrun simctl launch booted com.jkeroro.lockin -kshot buddy -klang zh-CN
 * Shots: today, photo, log, train, buddy, friends, couple, calendar.
 */
import { useEffect, useRef } from 'react';
import { Platform, Settings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { router, usePathname } from 'expo-router';
import { api } from '@/services/client';
import { useStore } from '@/store/useStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { healthAckKey } from '@/constants/safety';
import { mockAdapter } from './mockApi';
import { DEMO, DEMO_USER_ID } from './fixtures';
import { dayTitle } from '@/components/train/dayTitle';
import { useTranslation } from '@/i18n';

type T = (key: string, params?: Record<string, any>) => string;

export const SCREENSHOT_MODE = true;

api.defaults.adapter = mockAdapter;

function launchArg(key: string, fallback: string): string {
  try {
    const v = Platform.OS === 'ios' ? Settings.get(key) : null;
    return typeof v === 'string' && v ? v : fallback;
  } catch {
    return fallback;
  }
}

const SHOT = launchArg('kshot', 'today');
const LANG = launchArg('klang', 'en-US') === 'zh-CN' ? 'zh-CN' : 'en-US';

// Local state the demo day needs, and every first-run prompt already dismissed.
const seeded = Promise.all([
  AsyncStorage.setItem(
    'lock_water_ml',
    JSON.stringify({ date: new Date().toDateString(), ml: DEMO.waterMl, log: DEMO.waterLog, kinds: DEMO.waterLog.map(() => 'water') }),
  ),
  AsyncStorage.setItem('lock_water_goal_ml', '2000'),
  AsyncStorage.setItem(healthAckKey(DEMO_USER_ID), 'true'),
  AsyncStorage.setItem(`lock_trial_end_paywall_v1_${DEMO_USER_ID}`, 'true'),
  AsyncStorage.setItem(`lock_onboarding_done_${DEMO_USER_ID}`, 'true'),
  AsyncStorage.setItem('lock_pet_seen_stage', JSON.stringify({ key: '0:cat', stage: 2 })),
  AsyncStorage.setItem('lock_installed_language_packs', JSON.stringify(['en-US', 'zh-CN'])),
  // Each shot ends with the app being killed; that's not a 3D crash.
  AsyncStorage.multiRemove(['lock.coach3d.armed', 'lock.coach3d.disabledFor']),
]).catch(() => {});

function applyPrefs() {
  useStore.setState({ language: LANG, hasSelectedLanguage: true, themeMode: 'light', weightUnit: 'kg', calorieWarnings: true });
}
if (useStore.persist.hasHydrated()) applyPrefs();
else useStore.persist.onFinishHydration(applyPrefs);

async function openShot(t: T) {
  await seeded;
  const ws = useWorkoutStore.getState();
  ws.ensureUser(DEMO_USER_ID);
  if (SHOT !== 'train' && useWorkoutStore.getState().active) useWorkoutStore.getState().discard();

  switch (SHOT) {
    case 'photo': {
      const photo = Asset.fromModule(require('./assets/sushi.jpg'));
      await photo.downloadAsync();
      router.navigate({ pathname: '/(tabs)/log', params: { imageUri: photo.localUri ?? photo.uri } } as any);
      break;
    }
    case 'log':
      router.navigate('/(tabs)/log');
      break;
    case 'train': {
      await useWorkoutStore.getState().load();
      const dow = new Date().getDay();
      const day = useWorkoutStore.getState().plan[String(dow)];
      useWorkoutStore.getState().start({ planDay: dow, title: day ? dayTitle(day, dow, t) : null, day });
      useWorkoutStore.getState().toggleSet(0, 0);
      useWorkoutStore.getState().toggleSet(0, 1);
      useWorkoutStore.getState().startRest(90);
      router.push('/workout/session');
      break;
    }
    case 'buddy':
      router.navigate({ pathname: '/(tabs)/dashboard', params: { tab: 'pet' } } as any);
      break;
    case 'friends':
      router.navigate({ pathname: '/(tabs)/dashboard', params: { tab: 'friends' } } as any);
      break;
    case 'couple':
      router.push('/couple' as any);
      break;
    case 'calendar':
      router.push('/calendar');
      break;
    default:
      break; // today: already there
  }
}

/** Waits for the app to land on Today, then opens the requested screen. */
export function ScreenshotDirector(): null {
  const pathname = usePathname();
  const started = useRef(false);
  const { t } = useTranslation();
  const tRef = useRef<T>(t);
  tRef.current = t;
  useEffect(() => {
    if (started.current || pathname !== '/today') return;
    started.current = true;
    setTimeout(() => {
      openShot(tRef.current).catch((e) => console.warn('[screenshot]', e));
    }, 1500);
  }, [pathname]);
  return null;
}
