import { Dimensions } from 'react-native';

// Spacing and type sizes scale with the phone width, read once at launch.
// The base is clamped to phone widths: on the open iPhone Duo (951pt) or a
// phone in landscape the app would otherwise start with everything twice as
// big, and it would keep those sizes after the window changes.
const PHONE_MIN_WIDTH = 360;
// 440 = the widest iPhone (Pro Max), so every phone keeps exactly the sizes it had.
const PHONE_MAX_WIDTH = 440;
const SCREEN_WIDTH = Math.min(Math.max(Dimensions.get('window').width, PHONE_MIN_WIDTH), PHONE_MAX_WIDTH);

export const DIMENSIONS = {
  SCREEN_WIDTH,
  CARD_PADDING: SCREEN_WIDTH * 0.04, // 4% of screen width
  SPACING: SCREEN_WIDTH * 0.05, // 5% spacing
} as const;
