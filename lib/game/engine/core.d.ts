// Types for core.js (the engine is plain JS so the browser preview can load it without a build step).
export const W: number;
export const BASE_H: number;
export class Buf { w: number; h: number; d: Uint32Array; }
export const DEFAULT_LOOK: Record<string, string>;

export type Rect = [number, number, number, number];
export interface Gfx<Img = unknown> {
  image(buf: Buf): Img;
  rect(x: number, y: number, w: number, h: number, color: string, alpha?: number): void;
  rects(list: Rect[], color: string, alpha?: number): void;
  img(image: Img, x: number, y: number, alpha?: number): void;
  imgClipped(image: Img, x: number, y: number, keep: Rect[]): void;
  poly(points: number[], color: string, alpha?: number): void;
  text(str: string, x: number, y: number, opts: { color: string; shadow?: string | null; edge?: string; size: number; weight: string }): void;
  measure(str: string, opts: { size: number; weight: string }): number;
  bigText(str: string, cx: number, y: number, fill: string, edge: string): void;
}
export type EngineCmd = { type: 'strings' | 'state' | 'look' | 'play' | 'say'; [key: string]: unknown };
export interface Engine {
  cmd(c: EngineCmd): void;
  /** Tap at virtual coordinates; finishes/advances dialogue or presses a game button. */
  tap(x?: number, y?: number): void;
  render(timeMs: number): void;
  W: number;
  H: number;
}
export type GameAction = 'catch' | 'hatch' | 'dex' | 'dress' | 'log';
export function createEngine(gfx: Gfx<any>, hooks?: {
  onBusy?: (busy: boolean, kind: string) => void;
  onDone?: (kind: string) => void;
  onAction?: (action: GameAction) => void;
  sound?: (name: string) => void;
}, opts?: {
  height?: number;
  /** Status bar height (virtual px). */
  top?: number;
  /** Tab bar height floating over the bottom of the scene (virtual px). */
  bottom?: number;
  /** Home-indicator inset (virtual px); dialogue sits above it while the tab bar is hidden. */
  safeBottom?: number;
  /** Force 'day' | 'dusk' | 'night' (preview); otherwise follows the clock. */
  phase?: string;
}): Engine;
export function phaseAt(hour: number): 'day' | 'dusk' | 'night';
