import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/store/useStore';
import { api } from '@/services/client';

/**
 * Food names in the app's language, for display only. Meals keep the language
 * they were logged in (苹果 · 1 个 stays that way in the database); after the
 * app is switched to English, Today, the calendar and recent foods show
 * "Apple · 1 piece". Translations come from /api/meals/translate-names (cached
 * on the server too) and are kept here per language.
 */
const HAN = /[㐀-鿿]/;
const KANA = /[぀-ヿ]/;
const HANGUL = /[가-힯]/;
const LATIN_WORD = /[A-Za-z]{3,}/;

/** True when a name already reads as `lang` (same rule as the server). */
export function nameIsIn(name: string, lang: string): boolean {
  switch (lang) {
    case 'en-US': return !HAN.test(name) && !KANA.test(name) && !HANGUL.test(name);
    case 'ja-JP': return KANA.test(name) && !LATIN_WORD.test(name);
    case 'ko-KR': return HANGUL.test(name) && !LATIN_WORD.test(name);
    default: return HAN.test(name) && !KANA.test(name) && !HANGUL.test(name) && !LATIN_WORD.test(name);
  }
}

interface NamesState {
  /** lang → original → translated. */
  byLang: Record<string, Record<string, string>>;
  merge: (lang: string, names: Record<string, string>) => void;
}

export const useFoodNameStore = create<NamesState>()(
  persist(
    (set) => ({
      byLang: {},
      merge: (lang, names) => set((s) => ({ byLang: { ...s.byLang, [lang]: { ...(s.byLang[lang] ?? {}), ...names } } })),
    }),
    { name: 'lock-food-names', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// Names asked for this session (per language), so a failing or untranslatable
// name isn't requested again on every render.
const asked = new Set<string>();
let queue: { lang: string; names: Set<string> } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const q = queue;
  queue = null;
  if (!q || q.names.size === 0) return;
  const names = Array.from(q.names).slice(0, 100);
  api.post<{ names: Record<string, string> }>('/api/meals/translate-names', { names, lang: q.lang }, { timeout: 60_000 })
    .then((res) => {
      const got = res.data?.names ?? {};
      if (Object.keys(got).length) useFoodNameStore.getState().merge(q.lang, got);
    })
    .catch(() => {});
}

function request(lang: string, names: string[]) {
  const store = useFoodNameStore.getState().byLang[lang] ?? {};
  for (const n of names) {
    const key = `${lang}\u0000${n}`;
    if (!n || asked.has(key) || store[n] || nameIsIn(n, lang)) continue;
    asked.add(key);
    if (!queue || queue.lang !== lang) queue = { lang, names: new Set() };
    queue.names.add(n);
  }
  // One request for everything a screen asks for in the same moment.
  if (queue?.names.size && !timer) timer = setTimeout(flush, 120);
}

/**
 * `display(name)` → the name in the app's language when we have it, otherwise
 * as logged. Pass the names on screen; missing translations are fetched in
 * the background and the list re-renders when they arrive.
 */
export function useFoodNames(names: string[]): (name: string) => string {
  const lang = useStore((s) => s.language) as string;
  const map = useFoodNameStore((s) => s.byLang[lang]);
  const key = names.join('\u0001');
  useEffect(() => {
    if (names.length) request(lang, names);
  }, [lang, key]);
  return (name: string) => map?.[name] ?? name;
}
