import type { ScreenKind } from '@/hooks/useDeviceLayout';

/**
 * Settings as list + page side by side: the open iPhone Duo held side by side,
 * or a wide window. (Stood up like a laptop it stays one page at a time.)
 */
export function settingsSplit(kind: ScreenKind) {
  return kind === 'inner' || kind === 'wide';
}
