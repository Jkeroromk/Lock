import type { ScreenKind } from '@/hooks/useDeviceLayout';

/**
 * Settings as page + list: the open iPhone Duo (side by side: page on the
 * left, list on the right; turned a quarter: page on top, list below), or a
 * wide window. Phones and the outer display show one page at a time.
 */
export function settingsSplit(kind: ScreenKind) {
  return kind === 'inner' || kind === 'innerTall' || kind === 'wide';
}

/**
 * Height of the back-button row on Settings pages (components/settings/SettingsPage).
 * The list and the profile page leave the same space so all titles line up.
 */
export const SETTINGS_TOP_ROW = 48;
