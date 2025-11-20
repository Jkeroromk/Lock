import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DIMENSIONS = {
  SCREEN_WIDTH,
  CARD_PADDING: SCREEN_WIDTH * 0.04, // 4% of screen width
  SPACING: SCREEN_WIDTH * 0.05, // 5% spacing
} as const;

