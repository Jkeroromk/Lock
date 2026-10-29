import { ReactNode } from 'react';
import { View } from 'react-native';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';

/**
 * Left and right panes for wide windows. On the open iPhone Duo the gap is
 * exactly the fold, so nothing sits on the crease; elsewhere the window is
 * split in half with a small gap.
 */
export default function TwoPane({ left, right, gap = 24 }: { left: ReactNode; right: ReactNode; gap?: number }) {
  const { width, fold } = useDeviceLayout();
  const leftWidth = fold ? fold.start : Math.floor((width - gap) / 2);
  const middle = fold ? fold.width : gap;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: leftWidth }}>{left}</View>
      <View style={{ width: middle }} />
      <View style={{ flex: 1, minWidth: 0 }}>{right}</View>
    </View>
  );
}
