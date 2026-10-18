import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating tab bar pill (app/(tabs)/_layout.tsx). */
export const TAB_BAR_HEIGHT = 66;

/**
 * Bottom padding for scrolling content on tab screens. The tab bar floats
 * over the content (no band behind it), so the last item needs room to scroll
 * clear of the pill.
 */
export function useTabBarInset(extra = 16) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + extra;
}
