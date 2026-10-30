import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';

/** Height of the floating tab bar pill (app/(tabs)/_layout.tsx). */
export const TAB_BAR_HEIGHT = 66;
/** Open iPhone Duo side by side: slimmer islands, the screen is short. */
export const INNER_TAB_BAR_HEIGHT = 56;
/** Gap between the page content and the top of the bar on the open Duo. */
const BAND_GAP = 8;

/**
 * Open iPhone Duo: the tab bar gets its own band at the bottom and pages end
 * above it (app/(tabs)/_layout.tsx pads every scene by this much). The big
 * screens there show whole cards side by side, and a floating bar sitting on
 * top of them hid buttons (water, recent workouts). 0 = the bar floats.
 */
export function tabBandHeight(kind: string, bottomInset: number) {
  const bottom = Math.max(bottomInset, 12);
  if (kind === 'inner') return INNER_TAB_BAR_HEIGHT + bottom + BAND_GAP;
  if (kind === 'innerTall') return TAB_BAR_HEIGHT + bottom + BAND_GAP;
  return 0;
}

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
  // The scene already ends above the bar.
  if (tabBandHeight(kind, insets.bottom) > 0) return extra;
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + extra;
}
