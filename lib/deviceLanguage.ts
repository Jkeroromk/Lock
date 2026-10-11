import { Platform, Settings } from 'react-native';
import type { LanguageCode } from '@/i18n/locales';

/** Maps a BCP-47 tag (en-US, zh-Hans-CN, zh-Hant-TW, ja-JP, ...) to one of the app's languages. */
export function toAppLanguage(tag: string | null | undefined): LanguageCode | null {
  if (!tag) return null;
  const t = tag.replace(/_/g, '-').toLowerCase();
  if (t.startsWith('zh')) {
    return /hant|-tw|-hk|-mo/.test(t) ? 'zh-TW' : 'zh-CN';
  }
  if (t.startsWith('ja')) return 'ja-JP';
  if (t.startsWith('ko')) return 'ko-KR';
  if (t.startsWith('en')) return 'en-US';
  return null;
}

/** The phone's preferred language, if the app supports it; otherwise English. */
export function deviceLanguage(): LanguageCode {
  const tags: string[] = [];
  try {
    if (Platform.OS === 'ios') {
      const preferred = Settings.get('AppleLanguages');
      if (Array.isArray(preferred)) tags.push(...preferred);
      const locale = Settings.get('AppleLocale');
      if (typeof locale === 'string') tags.push(locale);
    }
  } catch {}
  try {
    tags.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {}
  for (const tag of tags) {
    const lang = toAppLanguage(tag);
    if (lang) return lang;
  }
  return 'en-US';
}
