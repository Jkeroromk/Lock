import { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';

/**
 * Two panes for wide windows, split at the fold so nothing sits on the crease.
 * - Open iPhone Duo (fold top to bottom): left | right.
 * - Open Duo turned a quarter (fold across the middle): first pane on top,
 *   second below — the lower half also holds the tab bar.
 * - Wide window without a fold: split in half with a small gap.
 */
export default function TwoPane({ left: firstPane, right: secondPane, gap = 24 }: { left: ReactNode; right: ReactNode; gap?: number }) {
  const { width, fold } = useDeviceLayout();
  // Placed inside a SafeAreaView, so (0, 0) here is the top-left inset.
  const insets = useSafeAreaInsets();

  if (fold?.axis === 'horizontal') {
    return (
      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={{ height: Math.max(0, fold.start - insets.top) }}>{firstPane}</View>
        <View style={{ height: fold.width }} />
        <View style={{ flex: 1, minHeight: 0 }}>{secondPane}</View>
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
