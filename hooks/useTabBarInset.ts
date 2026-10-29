import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';

/** Height of the floating tab bar pill (app/(tabs)/_layout.tsx). */
export const TAB_BAR_HEIGHT = 66;

/**
 * Bottom padding for scrolling content on tab screens. The tab bar floats
 * over the content (no band behind it), so the last item needs room to scroll
 * clear of the pill. On the Duo's outer display the tabs are a rail on the
 * right instead, so only the home indicator needs room.
 */
export function useTabBarInset(extra = 16) {
  const insets = useSafeAreaInsets();
  const { kind } = useDeviceLayout();
  if (kind === 'outer') return Math.max(insets.bottom, 12) + extra;
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + extra;
}
