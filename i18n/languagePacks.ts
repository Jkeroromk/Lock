/**
 * Language pack management.
 * All translations are bundled in the app binary. This module tracks which
 * packs the user has "installed" (activated) via AsyncStorage, mimicking the
 * game-style download/remove flow requested.
 *
 * English is always installed and cannot be removed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from './locales';

const STORAGE_KEY = 'lock_installed_language_packs';

export const ALWAYS_INSTALLED: LanguageCode = 'en-US';

/** Approximate size shown in the UI (purely cosmetic). */
export const PACK_SIZES: Record<LanguageCode, string> = {
  'en-US': '0 KB',
  'zh-CN': '48 KB',
  'zh-TW': '48 KB',
  'ja-JP': '50 KB',
  'ko-KR': '50 KB',
};

export async function getInstalledPacks(): Promise<LanguageCode[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const stored: LanguageCode[] = raw ? JSON.parse(raw) : [];
    if (!stored.includes(ALWAYS_INSTALLED)) stored.unshift(ALWAYS_INSTALLED);
    return stored;
  } catch {
    return [ALWAYS_INSTALLED];
  }
}

export async function installPack(lang: LanguageCode): Promise<void> {
  const current = await getInstalledPacks();
  if (!current.includes(lang)) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...current, lang]));
  }
}

export async function removePack(lang: LanguageCode): Promise<void> {
  if (lang === ALWAYS_INSTALLED) return;
  const current = await getInstalledPacks();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(current.filter((l) => l !== lang))
  );
}
