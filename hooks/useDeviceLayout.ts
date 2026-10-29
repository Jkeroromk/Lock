import { useWindowDimensions } from 'react-native';
import { useHingeSummary } from '@/lib/hinge';

/**
 * Which screen the app is drawn on.
 * - phone: a normal iPhone (or a foldable's narrow screen we treat like one)
 * - outer: iPhone Duo closed, on its short and wide outer display → tab rail on the right
 * - inner: iPhone Duo open → two panes either side of the fold, bottom tab bar
 * - wide:  a wide window without a fold (e.g. a phone in landscape) → two panes
 *
 * Decided from the window size (which follows folding and Split View) plus
 * whether the device has a hinge.
 */
export type ScreenKind = 'phone' | 'outer' | 'inner' | 'wide';

/** Window width from which two panes fit side by side. */
export const WIDE_MIN_WIDTH = 700;
/** Width of the fold region in the middle of the open Duo (simulator: 40pt). */
export const FOLD_WIDTH = 40;
/** Outer display: tab rail size and the space screens leave free for it. */
export const RAIL_WIDTH = 66;
export const RAIL_MARGIN = 10;
export const RAIL_SPACE = RAIL_WIDTH + RAIL_MARGIN + 6;

export type DeviceLayout = {
  kind: ScreenKind;
  width: number;
  height: number;
  /** Two panes (inner or wide). */
  twoPane: boolean;
  /** The fold region, in window x coordinates (inner only). */
  fold: { start: number; width: number } | null;
  /** Open but folded part-way like a book (inner only). */
  book: boolean;
};

export function useDeviceLayout(): DeviceLayout {
  const { width, height } = useWindowDimensions();
  const hinge = useHingeSummary();
  const wide = width >= WIDE_MIN_WIDTH;

  let kind: ScreenKind;
  if (hinge.foldable) {
    if (wide && !hinge.closed) kind = 'inner';
    else if (width >= 450) kind = 'outer';
    else kind = 'phone';
  } else {
    kind = wide ? 'wide' : 'phone';
  }

  const fold = kind === 'inner' ? { start: Math.round(width / 2 - FOLD_WIDTH / 2), width: FOLD_WIDTH } : null;
  return {
    kind,
    width,
    height,
    twoPane: kind === 'inner' || kind === 'wide',
    fold,
    book: kind === 'inner' && hinge.book,
  };
}
