import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Keeps the last JS error that took the app down (or that a feature caught and
 * recovered from), so a tester can read it in Settings → About after a crash.
 *
 * In release builds an uncaught JS error closes the app with no message; the
 * TestFlight crash report only shows a native stack. Recording the error text
 * ourselves is the only way to see what actually threw.
 */

const KEY = 'lock.lastJsError';

export interface JsErrorRecord {
  at: string;        // ISO time
  where: string;     // 'fatal' | 'non-fatal' | a feature name, e.g. 'coach3d'
  message: string;
  stack?: string;
}

export function recordJsError(where: string, e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e));
  const rec: JsErrorRecord = {
    at: new Date().toISOString(),
    where,
    message: err.message || String(e),
    stack: (err.stack || '').split('\n').slice(0, 25).join('\n'),
  };
  // Fire and forget; storage may not be ready while the app is dying.
  AsyncStorage.setItem(KEY, JSON.stringify(rec)).catch(() => {});
}

export async function getLastJsError(): Promise<JsErrorRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as JsErrorRecord) : null;
  } catch {
    return null;
  }
}

export function clearLastJsError() {
  return AsyncStorage.removeItem(KEY).catch(() => {});
}

let installed = false;
/** Wraps React Native's global error handler so fatal errors get recorded first. Call once at startup. */
export function installCrashLog() {
  if (installed) return;
  installed = true;
  const utils = (globalThis as any).ErrorUtils;
  if (!utils?.setGlobalHandler) return;
  const prev = utils.getGlobalHandler?.();
  utils.setGlobalHandler((e: unknown, isFatal?: boolean) => {
    try { recordJsError(isFatal ? 'fatal' : 'non-fatal', e); } catch {}
    if (prev) prev(e, isFatal);
  });
}
