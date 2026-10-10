/**
 * Home-screen icon switching (iOS alternate app icons).
 *
 * The default icon ("Open Lock") is the one in app.json `icon`; the others are
 * registered as alternates by the expo-alternate-app-icons plugin. Their
 * `native` names must match the plugin's `name` entries in app.json.
 *
 * The native module isn't present in Expo Go, so it's required lazily and every
 * call degrades to "not supported" instead of crashing.
 */
import type { ImageSourcePropType } from 'react-native';

export type AppIconId = 'OpenLock' | 'RingL' | 'StickerL' | 'KeyholeDial';

export interface AppIconOption {
  id: AppIconId;
  /** Alternate icon name passed to iOS; null = the primary icon. */
  native: string | null;
  labelKey: string;
  preview: ImageSourcePropType;
}

export const DEFAULT_APP_ICON: AppIconId = 'OpenLock';

export const APP_ICONS: AppIconOption[] = [
  { id: 'OpenLock', native: null, labelKey: 'settings.appIconOpenLock', preview: require('@/assets/icons/preview-open-lock.png') },
  { id: 'RingL', native: 'RingL', labelKey: 'settings.appIconRingL', preview: require('@/assets/icons/preview-ring-l.png') },
  { id: 'StickerL', native: 'StickerL', labelKey: 'settings.appIconStickerL', preview: require('@/assets/icons/preview-sticker-l.png') },
  { id: 'KeyholeDial', native: 'KeyholeDial', labelKey: 'settings.appIconKeyholeDial', preview: require('@/assets/icons/preview-keyhole-dial.png') },
];

type NativeModule = {
  supportsAlternateIcons: boolean;
  setAlternateAppIcon: (name: string | null) => Promise<string | null>;
  getAppIconName: () => string | null;
};

let cached: NativeModule | null | undefined;
function nativeModule(): NativeModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = require('expo-alternate-app-icons') as NativeModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function supportsAppIconSwitching(): boolean {
  try {
    return !!nativeModule()?.supportsAlternateIcons;
  } catch {
    return false;
  }
}

export function getCurrentAppIcon(): AppIconId {
  try {
    const name = nativeModule()?.getAppIconName() ?? null;
    return APP_ICONS.find((icon) => icon.native === name)?.id ?? DEFAULT_APP_ICON;
  } catch {
    return DEFAULT_APP_ICON;
  }
}

export function getAppIconOption(id: AppIconId): AppIconOption {
  return APP_ICONS.find((icon) => icon.id === id) ?? APP_ICONS[0];
}

/** Throws if the device can't switch icons or iOS rejects the change. */
export async function setAppIcon(id: AppIconId): Promise<void> {
  const mod = nativeModule();
  if (!mod || !mod.supportsAlternateIcons) throw new Error('App icon switching is not supported');
  await mod.setAlternateAppIcon(getAppIconOption(id).native);
}
