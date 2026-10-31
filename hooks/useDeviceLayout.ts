import { useWindowDimensions } from 'react-native';
import { useHingeSummary } from '@/lib/hinge';

/**
 * Which screen the app is drawn on.
 * - phone: a normal iPhone (or a foldable's narrow screen we treat like one)
 * - outer: iPhone Duo closed, on its short and wide outer display → tab rail on the right
 * - inner: iPhone Duo open, fold running top to bottom → left and right panes,
 *          bottom tab bar
 * - innerTall: iPhone Duo open and turned a quarter, fold running across the
 *          middle (held like a laptop / stood on a table) → top and bottom panes
 * - wide:  a wide window without a fold (e.g. a phone in landscape) → two panes
 *
 * Decided from the window size (which follows folding and Split View) plus
 * whether the device has a hinge.
 */
export type ScreenKind = 'phone' | 'outer' | 'inner' | 'innerTall' | 'wide';

/** Window width from which two panes fit side by side. */
export const WIDE_MIN_WIDTH = 700;
/** Width of the fold region in the middle of the open Duo (simulator: 40pt). */
export const FOLD_WIDTH = 40;
/**
 * Open Duo side by side: page margin added around every tab page (the status
 * bar is a column on the right, so there is almost no top inset).
 */
export const INNER_PAGE_TOP = 28;
export const INNER_PAGE_SIDE = 10;
/** Outer display: tab rail width. */
export const RAIL_WIDTH = 66;
/** Smallest right-hand column that fits the rail with some room. */
const RAIL_COLUMN_MIN = RAIL_WIDTH + 16;
/**
 * Height of the Duo's vertical status bar at the top of the right-hand column
 * (time, signal, battery). The rail starts below it.
 */
export const STATUS_COLUMN_HEIGHT = 170;

/**
 * Width of the right-hand column on the outer display: the status-bar column
 * (the right safe-area inset), widened if needed so the rail fits in it.
 */
export function railColumnWidth(rightInset: number) {
  return Math.max(rightInset, RAIL_COLUMN_MIN);
}

export type DeviceLayout = {
  kind: ScreenKind;
  width: number;
  height: number;
  /** Two panes (inner, wide, or innerTall stood up like a laptop). */
  twoPane: boolean;
  /**
   * The fold region. axis 'vertical': a column at x = start (inner);
   * 'horizontal': a band at y = start (innerTall). Window coordinates.
   */
  fold: { axis: 'vertical' | 'horizontal'; start: number; width: number } | null;
  /** Open but folded part-way like a book (inner only). */
  book: boolean;
  /** Open, turned a quarter and folded part-way, standing like a laptop (innerTall only). */
  tabletop: boolean;
};

export function useDeviceLayout(): DeviceLayout {
  const { width, height } = useWindowDimensions();
  const hinge = useHingeSummary();
  const wide = width >= WIDE_MIN_WIDTH;

  let kind: ScreenKind;
  if (hinge.foldable) {
    const tall = height >= WIDE_MIN_WIDTH;
    if (hinge.closed) kind = width >= 450 ? 'outer' : 'phone';
    else if (wide) kind = 'inner';
    else if (tall) kind = 'innerTall';
    // Open status not reported yet / Split View: a phone-sized window.
    else if (width >= 450) kind = 'outer';
    else kind = 'phone';
  } else {
    kind = wide ? 'wide' : 'phone';
  }

  const fold =
    kind === 'inner'
      ? { axis: 'vertical' as const, start: Math.round(width / 2 - FOLD_WIDTH / 2), width: FOLD_WIDTH }
      : kind === 'innerTall'
        ? { axis: 'horizontal' as const, start: Math.round(height / 2 - FOLD_WIDTH / 2), width: FOLD_WIDTH }
        : null;
  return {
    kind,
    width,
    height,
    // Turned a quarter and lying flat, the fold runs across the middle and
    // scrolling content passes over it smoothly: one page, like a tall phone.
    // Split into top and bottom only when stood up like a laptop.
    twoPane: kind === 'inner' || kind === 'wide' || (kind === 'innerTall' && hinge.book),
    fold,
    book: kind === 'inner' && hinge.book,
    tabletop: kind === 'innerTall' && hinge.book,
  };
}
