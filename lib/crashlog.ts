import { File, Paths } from 'expo-file-system';

/**
 * Keeps the last JS error that took the app down (or that a feature caught and
 * recovered from), so a tester can read it in Settings → About after a crash.
 *
 * In release builds an uncaught JS error closes the app with no message; the
 * TestFlight crash report only shows a native stack. Recording the error text
 * ourselves is the only way to see what actually threw.
 *
 * Written with the synchronous File API: the app is usually aborted a few
 * milliseconds after a fatal error, so an async store (AsyncStorage) may never
 * get to flush.
 */

export interface JsErrorRecord {
  at: string;        // ISO time
  where: string;     // 'fatal' | 'non-fatal' | a feature name, e.g. 'coach3d'
  message: string;
  stack?: string;
}

function file() {
  return new File(Paths.document, 'last-js-error.json');
}

export function recordJsError(where: string, e: unknown) {
  try {
    const err = e instanceof Error ? e : new Error(String(e));
    const rec: JsErrorRecord = {
      at: new Date().toISOString(),
      where,
      message: err.message || String(e),
      stack: (err.stack || '').split('\n').slice(0, 25).join('\n'),
    };
    file().write(JSON.stringify(rec));
  } catch {}
}

export async function getLastJsError(): Promise<JsErrorRecord | null> {
  try {
    const f = file();
    if (!f.exists) return null;
    return JSON.parse(f.textSync()) as JsErrorRecord;
  } catch {
    return null;
  }
}

export async function clearLastJsError() {
  try { const f = file(); if (f.exists) f.delete(); } catch {}
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
    recordJsError(isFatal ? 'fatal' : 'non-fatal', e);
    if (prev) prev(e, isFatal);
  });
}
