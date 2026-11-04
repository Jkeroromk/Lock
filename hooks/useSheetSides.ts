import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Side padding for a full-screen Modal's sheet container, so sheets and
 * dialogs stay clear of side safe areas. Matters on the iPhone Duo: closed
 * (outer display) and open side by side, the status bar and camera pill sit
 * in a column on the right, and a full-width sheet ran under them (header
 * buttons hidden behind the pill). On a phone held upright both are 0.
 */
export function useSheetSides() {
  const insets = useSafeAreaInsets();
  return { paddingLeft: insets.left, paddingRight: insets.right };
}
