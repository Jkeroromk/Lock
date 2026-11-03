import { useSyncExternalStore } from 'react';

/**
 * Hinge state for foldables (iPhone Duo, Android foldables), reduced to the
 * few facts the layout cares about so screens only re-render when one of them
 * changes, not on every degree while the user folds.
 *
 * expo-hinge needs iOS 27.1 and a build made with Xcode 27.1. On older
 * builds, on non-foldable phones and when the native module is missing (an
 * OTA bundle on an older binary), every value stays false.
 */

type HingeStatus = 'closed' | 'partiallyOpen' | 'fullyOpen' | 'unknown';
type Hinge = { angle: number; status: HingeStatus } | null;
type HingeModule = {
  getHinge(): Hinge;
  addHingeListener(listener: (event: { hinge: Hinge }) => void): { remove(): void };
};

let mod: HingeModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-hinge') as HingeModule;
} catch {
  mod = null;
}

/** Below this angle the open Duo counts as folded part-way (book or laptop pose). */
export const BOOK_ANGLE = 160;

export type HingeSummary = {
  /** The device has a hinge (stays true once seen). */
  foldable: boolean;
  /** Closed: the app is on the outer display. */
  closed: boolean;
  /** Open but folded part-way (held like a book, or stood like a laptop). */
  book: boolean;
};

const NONE: HingeSummary = { foldable: false, closed: false, book: false };

function read(): Hinge {
  try {
    return mod?.getHinge() ?? null;
  } catch {
    return null;
  }
}

function summarize(h: Hinge, prev: HingeSummary): HingeSummary {
  // A null hinge also means "updates stopped" (e.g. backgrounded): keep
  // knowing it is a foldable, but drop the fold posture.
  if (!h) return prev.foldable ? { foldable: true, closed: prev.closed, book: false } : NONE;
  return {
    foldable: true,
    closed: h.status === 'closed',
    book: h.status === 'partiallyOpen' && h.angle < BOOK_ANGLE,
  };
}

let current: HingeSummary = summarize(read(), NONE);
const listeners = new Set<() => void>();
let subscription: { remove(): void } | null = null;

function update(next: HingeSummary) {
  if (next.foldable === current.foldable && next.closed === current.closed && next.book === current.book) return;
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!subscription && mod) {
    update(summarize(read(), current));
    try {
      subscription = mod.addHingeListener((event) => update(summarize(event?.hinge ?? null, current)));
    } catch {
      subscription = null;
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && subscription) {
      subscription.remove();
      subscription = null;
    }
  };
}

const getSnapshot = () => current;

export function useHingeSummary(): HingeSummary {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
