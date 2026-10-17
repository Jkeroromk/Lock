// Types for core.js (the engine is plain JS so the browser preview can load it without a build step).
export const W: number;
export const H: number;
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
  text(str: string, x: number, y: number, opts: { color: string; shadow?: string | null; size: number; weight: string }): void;
  measure(str: string, opts: { size: number; weight: string }): number;
  bigText(str: string, cx: number, y: number, fill: string, edge: string): void;
}
export type EngineCmd = { type: 'strings' | 'state' | 'look' | 'play'; [key: string]: unknown };
export interface Engine {
  cmd(c: EngineCmd): void;
  tap(): void;
  render(timeMs: number): void;
  W: number;
  H: number;
}
export function createEngine(gfx: Gfx<any>, hooks?: {
  onBusy?: (busy: boolean, kind: string) => void;
  onDone?: (kind: string) => void;
  sound?: (name: string) => void;
}): Engine;
