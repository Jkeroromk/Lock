/**
 * Screenshot builds only (swapped in for lib/screenshotMode.ts by metro.config.js).
 *
 * The app runs as a signed-in demo account whose API calls are answered from
 * screenshot/fixtures.ts. Which screen to open and in which language come from
 * launch arguments, e.g.
 *   xcrun simctl launch booted com.jkeroro.lockin -kshot buddy -klang zh-CN
 * Shots: today, photo, log, train, buddy, friends, couple, calendar.
 *
 * Promo videos (scripts/videos/record.sh) pass -kclip instead: a list of
 * scene:milliseconds played one after another while the simulator records, e.g.
 *   -kclip "today:2200,photo:3500,save:3000,buddy:4500"
 * Scenes are the shots above plus `save` (taps the log screen's Save, which
 * goes back to Today with the ring filled). Handshake through Documents/:
 * the app writes clip-armed when everything is loaded, waits for clip-go
 * (written once the recording runs), then writes clip-timeline.json (scene
 * start times in ms after go) and clip-done.
 */
import { useEffect, useRef } from 'react';
import { Platform, Settings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { router, usePathname } from 'expo-router';
import { api } from '@/services/client';
import { useStore } from '@/store/useStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { healthAckKey } from '@/constants/safety';
import { mockAdapter, visionDone } from './mockApi';
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
const CLIP = launchArg('kclip', '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean)
  .map((x) => { const [scene, ms] = x.split(':'); return { scene, ms: Math.max(0, Number(ms) || 3000) }; });
const LANG = launchArg('klang', 'en-US') === 'zh-CN' ? 'zh-CN' : 'en-US';

// capture.sh polls for this file instead of guessing how long a screen takes.
const readyFile = () => new File(Paths.document, 'shot-ready');
try { if (readyFile().exists) readyFile().delete(); } catch {}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function markReady() {
  try { readyFile().write(SHOT); } catch (e) { console.warn('[screenshot] ready marker', e); }
}
const docFile = (name: string) => new File(Paths.document, name);
for (const n of ['clip-armed', 'clip-go', 'clip-done', 'clip-timeline.json']) {
  try { if (docFile(n).exists) docFile(n).delete(); } catch {}
}
function writeDoc(name: string, text: string) {
  try { docFile(name).write(text); } catch (e) { console.warn('[clip] write', name, e); }
}

/** Actions screens hand over (see registerShotAction in lib/screenshotMode.ts). */
const shotActions: Record<string, () => unknown> = {};
export function registerShotAction(name: string, fn: () => unknown): void {
  shotActions[name] = fn;
}

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
  return openScene(SHOT, t);
}

async function openScene(scene: string, t: T) {
  await seeded;
  const ws = useWorkoutStore.getState();
  ws.ensureUser(DEMO_USER_ID);
  if (scene !== 'train' && useWorkoutStore.getState().active) useWorkoutStore.getState().discard();

  switch (scene) {
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

/** Waits until the screen has drawn: 3D scenes get their models, then time to animate in. */
async function settle() {
  const safe = (load: () => Promise<unknown>) => Promise.resolve().then(load).catch((e) => console.warn('[screenshot] assets', e));
  // Required lazily, like the screens do, so three.js isn't pulled in at startup.
  const coach = () => require('@/components/pet/coachModel').loadCoachAssets();
  if (SHOT === 'buddy') await Promise.all([safe(coach), safe(() => require('@/components/pet/stage/meadowAssets').loadMeadow())]);
  if (SHOT === 'couple') await Promise.all([safe(coach), safe(() => require('@/components/couple/room/plushAssets').loadCoupleAssets())]);
  // The photo shot shows the analysis result, not the spinner.
  if (SHOT === 'photo') await Promise.race([visionDone, sleep(60_000)]);
  await sleep(SHOT === 'buddy' || SHOT === 'couple' ? 8000 : SHOT === 'photo' ? 4000 : 3000);
}

/** Route each scene ends on (expo-router pathname, groups dropped). */
const SCENE_PATH: Record<string, string> = {
  today: '/today', save: '/today', photo: '/log', log: '/log', buddy: '/dashboard', friends: '/dashboard',
  couple: '/couple', calendar: '/calendar', train: '/workout/session',
};
let currentPath = '';
/** On a recording simulator a navigation can take seconds to land: wait for it, then let it paint. */
async function untilShown(scene: string) {
  const want = SCENE_PATH[scene];
  for (let i = 0; want && i < 150 && currentPath !== want; i++) await sleep(100);
  await sleep(1500);
}

/** Promo video: waits for the recording, then plays the scenes. 3D assets load after their
 * screen is open (like settle() does for screenshots); loading them earlier leaves the 3D view blank. */
async function runClip(t: T) {
  await seeded;
  const safe = (load: () => Promise<unknown>) => Promise.resolve().then(load).catch((e) => console.warn('[clip] assets', e));
  const coach = () => require('@/components/pet/coachModel').loadCoachAssets();
  await sleep(1500);
  writeDoc('clip-armed', '1');

  // Never wait forever: record.sh writes clip-go a moment after recording starts.
  for (let i = 0; i < 1200 && !docFile('clip-go').exists; i++) await sleep(100);
  const t0 = Date.now();
  const timeline: { scene: string; start: number }[] = [];
  let pushed = false; // a pushed screen (couple, workout, calendar) is on top of the tabs

  for (const { scene, ms } of CLIP) {
    timeline.push({ scene, start: Date.now() - t0 });
    try {
      if (scene === 'save') {
        await Promise.resolve(shotActions.saveMeal?.());
        await untilShown('save');
      } else {
        if (pushed && router.canDismiss()) {
          router.dismissAll();
          await untilShown('today');
        }
        pushed = scene === 'couple' || scene === 'train' || scene === 'calendar';
        if (scene === 'today') router.navigate('/(tabs)/today');
        else await openScene(scene, t);
        // Hold starts once the screen is really there (compose.mjs keeps only the last `ms` of each scene).
        await untilShown(scene);
        if (scene === 'photo') await Promise.race([visionDone, sleep(60_000)]);
        if (scene === 'buddy') await Promise.all([safe(coach), safe(() => require('@/components/pet/stage/meadowAssets').loadMeadow())]);
        if (scene === 'couple') await Promise.all([safe(coach), safe(() => require('@/components/couple/room/plushAssets').loadCoupleAssets())]);
        if (scene === 'buddy' || scene === 'couple') await sleep(3000); // models animate in
      }
    } catch (e) {
      console.warn('[clip]', scene, e);
    }
    await sleep(ms);
  }
  timeline.push({ scene: 'end', start: Date.now() - t0 });
  writeDoc('clip-timeline.json', JSON.stringify(timeline));
  writeDoc('clip-done', '1');
}

/** Waits for the app to land on Today, then opens the requested screen. */
export function ScreenshotDirector(): null {
  const pathname = usePathname();
  currentPath = pathname;
  const started = useRef(false);
  const { t } = useTranslation();
  const tRef = useRef<T>(t);
  tRef.current = t;
  useEffect(() => {
    if (started.current || pathname !== '/today') return;
    started.current = true;
    setTimeout(() => {
      if (CLIP.length) {
        runClip(tRef.current).catch((e) => console.warn('[clip]', e));
        return;
      }
      openShot(tRef.current)
        .catch((e) => console.warn('[screenshot]', e))
        .then(settle)
        .then(markReady);
    }, 1500);
  }, [pathname]);
  return null;
}
