import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';
import zhTW from './locales/zh-TW';
import jaJP from './locales/ja-JP';
import koKR from './locales/ko-KR';

export type LanguageCode = 'zh-CN' | 'en-US' | 'zh-TW' | 'ja-JP' | 'ko-KR';

export const translations: Record<LanguageCode, typeof zhCN> = {
  'zh-CN': zhCN,
  'en-US': enUS as any,
  'zh-TW': zhTW as any,
  'ja-JP': jaJP as any,
  'ko-KR': koKR as any,
};

export const languageNames: Record<LanguageCode, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'zh-TW': '繁體中文',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
};
