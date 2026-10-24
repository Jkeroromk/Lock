import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import * as LockWorkout from '@/modules/lock-workout';
import type { NativeSnapshot } from '@/modules/lock-workout';
import { useWorkoutStore, num } from '@/store/useWorkoutStore';
import { useStore } from '@/store/useStore';
import { translations, type LanguageCode } from '@/i18n/locales';
import { exerciseName, getExercise } from '@/constants/exercises';
import { fmtWeight } from '@/lib/units';

/**
 * Keeps the open workout in sync with the native side: the Live Activity on the
 * Lock Screen / Dynamic Island and the Apple Watch app. Changes made there come
 * back as actions, which are applied to the workout store here, so it works
 * whichever screen is open. Renders nothing.
 */

type WorkoutState = ReturnType<typeof useWorkoutStore.getState>;

function labelsFor(language: LanguageCode): Record<string, string> {
  return ((translations[language] ?? translations['en-US']) as any).live ?? {};
}

/** The workout as the native side sees it: empty boxes take last time's numbers. */
function buildSnapshot(st: WorkoutState, language: LanguageCode): NativeSnapshot | null {
  const a = st.active;
  if (!a) return null;
  const unit = a.unit ?? 'kg';
  return {
    id: a.id,
    title: a.title ?? (translations[language] as any)?.train?.freeTitle ?? 'Workout',
    startedAt: Date.parse(a.startedAt) || Date.now(),
    unit,
    current: Math.max(0, Math.min(a.current, a.exercises.length - 1)),
    exercises: a.exercises.map((e) => {
      const last = st.history.last[e.id] ?? [];
      return {
        id: e.id,
        name: exerciseName(e.id, language),
        bw: getExercise(e.id)?.equipment === 'bodyweight',
        sets: e.sets.map((s, si) => {
          const ph = last[si] ?? last[last.length - 1];
          const w = s.weight.trim() ? num(s.weight) : ph && ph.weight > 0 ? Number(fmtWeight(ph.weight, unit)) : 0;
          const r = s.reps.trim() ? Math.round(num(s.reps)) : ph ? ph.reps : 0;
          return { w: Math.max(0, w), r: Math.max(0, r), done: s.done };
        }),
      };
    }),
    restEndsAt: a.restEndsAt,
    restTotal: a.restTotal,
    restSec: st.restSec,
    applied: [],
    finishing: false,
  };
}

export default function WorkoutBridge() {
  useEffect(() => {
    if (!LockWorkout.isAvailable) return;

    let ack = 0;
    let lastKey = '';
    let resultAtStart: unknown = undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ready = false;

    const push = () => {
      if (!ready) return;
      const st = useWorkoutStore.getState();
      const language = useStore.getState().language;
      const snapshot = buildSnapshot(st, language);
      const labels = labelsFor(language);
      const key = JSON.stringify([snapshot, labels, ack]);
      if (key === lastKey) return;
      lastKey = key;
      let reason = '';
      if (snapshot) {
        if (resultAtStart === undefined) resultAtStart = st.lastResult;
      } else {
        reason = resultAtStart !== undefined && st.lastResult !== resultAtStart ? 'finished' : 'discarded';
        resultAtStart = undefined;
      }
      LockWorkout.sync(snapshot, labels, ack, reason);
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(push, 120);
    };

    const finishFromRemote = async () => {
      const st = useWorkoutStore.getState();
      const a = st.active;
      if (!a) return;
      const anyDone = a.exercises.some((e) => e.sets.some((s) => s.done && num(s.reps) >= 1));
      if (!anyDone) {
        st.discard();
        return;
      }
      try {
        await st.finish();
        // Let an open workout screen close itself first.
        setTimeout(() => {
          try { router.push('/workout/done'); } catch {}
        }, 80);
      } catch {
        // Offline or the save failed: open the workout so it can be retried there.
        try { router.push('/workout/session'); } catch {}
      }
    };

    const drain = () => {
      if (!ready) return;
      const list = LockWorkout.getPending();
      let finish = false;
      for (const p of list) {
        if (p.seq <= ack) continue;
        useWorkoutStore.getState().applyRemote(p.action);
        if (p.action.kind === 'finish') finish = true;
        ack = p.seq;
      }
      push();
      if (finish) finishFromRemote();
    };

    // Wait for both persisted stores, or an empty store would end the workout
    // that's still open on the watch and the Lock Screen.
    const start = () => {
      if (ready || !useWorkoutStore.persist.hasHydrated() || !useStore.persist.hasHydrated()) return;
      ready = true;
      drain();
    };

    const unsubs = [
      useWorkoutStore.persist.onFinishHydration(start),
      useStore.persist.onFinishHydration(start),
      useWorkoutStore.subscribe(schedule),
      useStore.subscribe((s, prev) => {
        if (s.language !== prev.language) schedule();
      }),
    ];
    const sub = LockWorkout.addActionListener(drain);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') drain();
    });
    start();

    return () => {
      unsubs.forEach((u) => u());
      sub.remove();
      appState.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
