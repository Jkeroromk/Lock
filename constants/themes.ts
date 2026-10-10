// Lock design system — "B×C": instrument-panel structure (B) with
// bold type, thick strokes, hard offset shadows and sticker accents (C).
//
// The original token names are kept so every existing screen picks up the
// new palette; the tokens at the bottom of each theme are new.

const INK = '#0A0A0A';
const PAPER = '#F2F1EC';
const ACCENT = '#FFD43B';

export const lightTheme = {
  // Backgrounds
  background: PAPER,
  backgroundPrimary: PAPER,
  cardBackground: '#FFFFFF',
  cardBackgroundSecondary: '#ECEAE3',
  cardBackgroundTertiary: '#E0DED5',

  // Text
  textPrimary: INK,
  textSecondary: '#55544F',
  textTertiary: '#8C8B86',

  // Borders — light mode outlines cards in ink (the "C" look)
  borderPrimary: INK,
  borderSecondary: '#CFCDC4',
  borderLight: '#E0DED5',

  // Progress (legacy names)
  progressWhite: INK,
  progressLightGray: '#3A3A37',
  progressMediumGray: '#6B6A65',
  progressDarkGray: '#8C8B86',
  progressVeryDarkGray: '#CFCDC4',

  active: INK,
  inactive: '#ECEAE3',

  proteinColor: INK,
  carbsColor: '#55544F',
  fatColor: '#8C8B86',

  switchOn: INK,
  switchOff: '#CFCDC4',

  shadowColor: INK,

  // ── B×C tokens ──────────────────────────────────────────
  accent: ACCENT,
  onAccent: INK,
  ink: INK,
  paper: PAPER,
  /** Border of the one "hero" card on a screen */
  borderStrong: INK,
  /** Hard offset shadow behind hero cards */
  cardShadow: INK,
  /** Inverted surface (e.g. the steps card) */
  surfaceInverse: INK,
  textInverse: PAPER,
  /** Track behind progress bars / rings */
  track: '#E6E4DC',
  /** Hairline dividers inside cards */
  divider: '#E0DED5',
  tabBar: INK,
  tabIconActive: PAPER,
  tabIconInactive: '#8C8B86',
  danger: '#D93A2B',
};

export const darkTheme: typeof lightTheme = {
  background: INK,
  backgroundPrimary: INK,
  cardBackground: '#141414',
  cardBackgroundSecondary: '#1F1F1F',
  cardBackgroundTertiary: '#2C2C2C',

  textPrimary: PAPER,
  textSecondary: '#9A9A95',
  textTertiary: '#5C5C58',

  borderPrimary: '#2C2C2C',
  borderSecondary: '#3A3A3A',
  borderLight: '#1A1A1A',

  progressWhite: PAPER,
  progressLightGray: '#D9D8D2',
  progressMediumGray: '#9A9A95',
  progressDarkGray: '#6B6A65',
  progressVeryDarkGray: '#3A3A3A',

  active: PAPER,
  inactive: '#141414',

  proteinColor: PAPER,
  carbsColor: '#D9D8D2',
  fatColor: '#9A9A95',

  switchOn: ACCENT,
  switchOff: '#2C2C2C',

  shadowColor: '#000000',

  accent: ACCENT,
  onAccent: INK,
  ink: INK,
  paper: PAPER,
  borderStrong: PAPER,
  cardShadow: ACCENT,
  surfaceInverse: PAPER,
  textInverse: INK,
  track: '#262626',
  divider: '#222222',
  tabBar: PAPER,
  tabIconActive: INK,
  tabIconInactive: '#8C8B86',
  danger: '#FF6B5B',
};

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark';
