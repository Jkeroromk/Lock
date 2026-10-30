import { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import { useTheme } from '@/hooks/useTheme';

/** How far content fades out before it reaches the fold. */
const FOLD_FADE = 28;
/** Corner radius of each half where it meets the fold. */
const FOLD_RADIUS = 28;

/**
 * Two panes for wide windows, split at the fold so nothing sits on the crease.
 * - Open iPhone Duo (fold top to bottom): left | right.
 * - Open Duo turned a quarter and stood up like a laptop (fold across the
 *   middle): first pane on top, second below. Each half is drawn as its own
 *   screen — rounded corners at the fold and content fading out before the
 *   edge — so cards aren't sliced off by the crease.
 * - Wide window without a fold: split in half with a small gap.
 */
export default function TwoPane({ left: firstPane, right: secondPane, gap = 24 }: { left: ReactNode; right: ReactNode; gap?: number }) {
  const { width, fold } = useDeviceLayout();
  const colors = useTheme();
  // Placed inside a SafeAreaView, so (0, 0) here is the top-left inset.
  const insets = useSafeAreaInsets();

  if (fold?.axis === 'horizontal') {
    const bg = colors.backgroundPrimary;
    const clear = `${bg}00`;
    return (
      <View style={{ flex: 1, flexDirection: 'column', backgroundColor: colors.track }}>
        <View style={{
          height: Math.max(0, fold.start - insets.top), overflow: 'hidden', backgroundColor: bg,
          borderBottomLeftRadius: FOLD_RADIUS, borderBottomRightRadius: FOLD_RADIUS,
        }}>
          {firstPane}
          <LinearGradient
            pointerEvents="none"
            colors={[clear, bg]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: FOLD_FADE }}
          />
        </View>
        <View style={{ height: fold.width }} />
        <View style={{
          flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: bg,
          borderTopLeftRadius: FOLD_RADIUS, borderTopRightRadius: FOLD_RADIUS,
        }}>
          {secondPane}
          <LinearGradient
            pointerEvents="none"
            colors={[bg, clear]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: FOLD_FADE }}
          />
        </View>
      </View>
    );
  }

  const firstWidth = fold ? fold.start - insets.left : Math.floor((width - insets.left - insets.right - gap) / 2);
  const middle = fold ? fold.width : gap;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: firstWidth }}>{firstPane}</View>
      <View style={{ width: middle }} />
      <View style={{ flex: 1, minWidth: 0 }}>{secondPane}</View>
    </View>
  );
}
