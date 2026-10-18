import { useSyncExternalStore } from 'react';

/**
 * Whether the Buddy tab is playing a scene. The tab bar floats over the game
 * there and steps aside while a scene runs, so taps reach the dialogue.
 */
let hidden = false;
const subs = new Set<() => void>();

export function setGameNavHidden(next: boolean) {
  if (next === hidden) return;
  hidden = next;
  subs.forEach((f) => f());
}

export function useGameNavHidden() {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => hidden,
  );
}
