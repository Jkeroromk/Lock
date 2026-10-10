import type { TextStyle } from 'react-native';

/**
 * Font files bundled in assets/fonts (static instances of the OFL-licensed
 * Bricolage Grotesque and Geist Mono). Keys are the fontFamily names.
 */
export const FONT_FILES = {
  'BricolageGrotesque-Regular': require('../assets/fonts/BricolageGrotesque-Regular.ttf'),
  'BricolageGrotesque-Medium': require('../assets/fonts/BricolageGrotesque-Medium.ttf'),
  'BricolageGrotesque-SemiBold': require('../assets/fonts/BricolageGrotesque-SemiBold.ttf'),
  'BricolageGrotesque-Bold': require('../assets/fonts/BricolageGrotesque-Bold.ttf'),
  'BricolageGrotesque-ExtraBold': require('../assets/fonts/BricolageGrotesque-ExtraBold.ttf'),
  'GeistMono-Regular': require('../assets/fonts/GeistMono-Regular.ttf'),
  'GeistMono-Medium': require('../assets/fonts/GeistMono-Medium.ttf'),
  'GeistMono-SemiBold': require('../assets/fonts/GeistMono-SemiBold.ttf'),
};

/** Use `fontFamily: FONTS.mono` for labels / numbers-as-data. Everything else is Bricolage. */
export const FONTS = {
  display: 'display',
  mono: 'mono',
} as const;

const weightNumber = (w: TextStyle['fontWeight']): number => {
  if (w === undefined || w === 'normal') return 400;
  if (w === 'bold') return 700;
  const n = Number(w);
  return Number.isFinite(n) ? n : 400;
};

/**
 * Picks the bundled font file for a style. Each weight is its own file, so
 * the caller's fontWeight selects the file and must not also be applied
 * (iOS would otherwise fake-bold it or fall back to the system font).
 */
export function resolveFontFamily(family: string | undefined, weight: TextStyle['fontWeight']): string | undefined {
  const w = weightNumber(weight);
  if (family === FONTS.mono) {
    if (w >= 600) return 'GeistMono-SemiBold';
    if (w >= 500) return 'GeistMono-Medium';
    return 'GeistMono-Regular';
  }
  if (!family || family === FONTS.display || family === 'Nunito') {
    if (w >= 800) return 'BricolageGrotesque-ExtraBold';
    if (w >= 700) return 'BricolageGrotesque-Bold';
    if (w >= 600) return 'BricolageGrotesque-SemiBold';
    if (w >= 500) return 'BricolageGrotesque-Medium';
    return 'BricolageGrotesque-Regular';
  }
  return undefined; // an explicit font (e.g. an icon font) — leave it alone
}
