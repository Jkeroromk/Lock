import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/** Mirrors WorkoutModel.swift. Weights are in the workout's unit. */
export interface NativeSet { w: number; r: number; done: boolean }
export interface NativeExercise { id: string; name: string; bw: boolean; sets: NativeSet[] }
export interface NativeSnapshot {
  id: string;
  title: string;
  startedAt: number;
  unit: string;
  current: number;
  exercises: NativeExercise[];
  restEndsAt: number | null;
  restTotal: number;
  restSec: number;
  applied: string[];
  finishing: boolean;
}

export type RemoteKind = 'complete' | 'uncomplete' | 'rest' | 'skipRest' | 'select' | 'finish';

/** An action from the Live Activity or the watch, already resolved by the native reducer. */
export interface RemoteAction {
  id: string;
  workoutId: string;
  kind: RemoteKind;
  ei?: number;
  si?: number;
  w?: number;
  r?: number;
  delta?: number;
  at: number;
  restEndsAt?: number | null;
  restTotal?: number;
  current?: number;
  fill?: { si: number; w?: number; r?: number }[];
}

export interface PendingAction { seq: number; action: RemoteAction }

interface LockWorkoutNative {
  sync(snapshot: string | null, labels: string, ack: number, reason: string): void;
  getPending(): string;
  isWatchAppInstalled(): boolean;
  addListener(event: 'onAction', listener: () => void): { remove: () => void };
}

// Optional: builds without the native module (older binaries reached by an OTA,
// Android, web) simply skip the Live Activity and the watch.
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<LockWorkoutNative>('LockWorkout') : null;

export const isAvailable = !!native;

export function sync(snapshot: NativeSnapshot | null, labels: Record<string, string>, ack: number, reason = ''): void {
  native?.sync(snapshot ? JSON.stringify(snapshot) : null, JSON.stringify(labels), ack, reason);
}

export function getPending(): PendingAction[] {
  if (!native) return [];
  try {
    const list = JSON.parse(native.getPending());
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function isWatchAppInstalled(): boolean {
  try {
    return native?.isWatchAppInstalled() ?? false;
  } catch {
    return false;
  }
}

export function addActionListener(listener: () => void): { remove: () => void } {
  if (!native) return { remove: () => {} };
  return native.addListener('onAction', listener);
}
