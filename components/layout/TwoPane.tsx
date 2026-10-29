import { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';

/**
 * Left and right panes for wide windows. On the open iPhone Duo the gap is
 * exactly the fold, so nothing sits on the crease; elsewhere the window is
 * split in half with a small gap.
 */
export default function TwoPane({ left: leftPane, right: rightPane, gap = 24 }: { left: ReactNode; right: ReactNode; gap?: number }) {
  const { width, fold } = useDeviceLayout();
  // Placed inside a SafeAreaView, so x = 0 here is the left inset.
  const { left, right: rightInset } = useSafeAreaInsets();
  const leftWidth = fold ? fold.start - left : Math.floor((width - left - rightInset - gap) / 2);
  const middle = fold ? fold.width : gap;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: leftWidth }}>{leftPane}</View>
      <View style={{ width: middle }} />
      <View style={{ flex: 1, minWidth: 0 }}>{rightPane}</View>
    </View>
  );
}
