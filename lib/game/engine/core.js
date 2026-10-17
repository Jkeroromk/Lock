/*
 * Lockling game engine — platform independent.
 *
 * The engine owns the game rules for what is on screen (scenes, dialogue,
 * animation) and draws through a small `gfx` interface, so the same code runs
 * on React Native Skia in the app and on a 2D canvas in the browser preview
 * (game/preview.html).
 *
 *   const engine = createEngine(gfx, { onBusy, onDone, sound })
 *   engine.cmd({ type: 'strings' | 'state' | 'look' | 'play', ... })
 *   engine.tap()           // advance dialogue
 *   engine.render(timeMs)  // draw one frame through gfx (virtual 288×320)
 *
 * gfx: image(buf) → handle · rect(x,y,w,h,color,alpha) · rects(list,color,alpha)
 *      img(handle,x,y,alpha?) · imgScaled(handle,x,y,w,h) · imgClipped(handle,x,y,rects)
 *      poly(points,color,alpha) · text(str,x,y,opts) · measure(str,opts) · bigText(str,cx,y,fill,edge)
 */

export const W = 288;
export const BASE_H = 320;
// Layout, set per engine from the screen size (one engine runs at a time).
let H = 320, TOP = 0, CARD_Y = 246, BAR_Y = 274, HZ = 146, BO = 0;

// ======================= pixel buffer =======================
const colCache = new Map();
function rgb(hex) { let c = colCache.get(hex); if (!c) { const n = parseInt(hex.slice(1), 16); c = [n >> 16, (n >> 8) & 255, n & 255]; colCache.set(hex, c); } return c; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)] / 16;
const hash = (a, b = 0) => { const t = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return t - Math.floor(t); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

export class Buf {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  set(x, y, hex, a = 1) {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = rgb(hex), i = y * this.w + x;
    if (a >= 1) { this.d[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; return; }
    const o = this.d[i], oa = o >>> 24;
    if (!oa) { this.d[i] = ((Math.round(a * 255) << 24) | (b << 16) | (g << 8) | r) >>> 0; return; }
    const or = o & 255, og = (o >> 8) & 255, ob = (o >> 16) & 255;
    this.d[i] = ((oa << 24) | (Math.round(ob + (b - ob) * a) << 16) | (Math.round(og + (g - og) * a) << 8) | Math.round(or + (r - or) * a)) >>> 0;
  }
  stamp(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.d[y * src.w + x]; if (!(v >>> 24)) continue; const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue; this.d[Y * this.w + X] = v; } }
  clone() { const b = new Buf(this.w, this.h); b.d.set(this.d); return b; }
  /** Same pixels with every hue turned by `deg` (rare colours). */
  hueShift(deg) {
    const b = this.clone();
    for (let i = 0; i < b.d.length; i++) {
      const v = b.d[i], a = v >>> 24; if (!a) continue;
      let r = (v & 255) / 255, g = ((v >> 8) & 255) / 255, bl = ((v >> 16) & 255) / 255;
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), l = (mx + mn) / 2, d = mx - mn;
      if (d < 0.02) continue;
      const s = d / (1 - Math.abs(2 * l - 1));
      let h = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + deg + 360) % 360;
      const c = (1 - Math.abs(2 * l - 1)) * Math.min(1, s * 1.15), x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
      [r, g, bl] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
      b.d[i] = ((a << 24) | (Math.round((bl + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((r + m) * 255)) >>> 0;
    }
    return b;
  }
}

// ======================= ramps =======================
const R = {
  yellow: ['#4a2a10', '#8a4e14', '#c4801c', '#eaa826', '#ffcf3a', '#ffe580', '#fff8d6'],
  sakura: ['#4a1a30', '#8a2f55', '#c4567e', '#ee86a8', '#ffb3c9', '#ffdce7', '#fff4f8'],
  sky: ['#132a4d', '#1f4f8a', '#2f7bc4', '#52a6ec', '#8fcbff', '#cbe7ff', '#f0f8ff'],
  coral: ['#4a1a14', '#8a3424', '#c45a3a', '#ec7f52', '#ffab7d', '#ffd3b6', '#fff3ea'],
  metal: ['#22243a', '#3c4260', '#5f6a8c', '#8a95b6', '#b9c2dc', '#eef2ff'],
  gold: ['#4a2a10', '#8a5a14', '#c4901c', '#eab426', '#ffd84a', '#fff0a0'],
  onyx: ['#0b0b10', '#1b1c26', '#2c2e3e', '#45485e', '#686c88', '#9ea2c0'],
  green: ['#12332a', '#1b5639', '#287d43', '#40a64e', '#73cc5c', '#b8ee86'],
  leaf: ['#173f26', '#2d7a37', '#56b444', '#8ed95f', '#cdf59a'],
  red: ['#3a1220', '#721c2b', '#ad2f38', '#de503e', '#ff8158', '#ffc097'],
  cream: ['#45362a', '#7f6a52', '#b39d7c', '#dbc9a5', '#f3e8cd', '#fffaee'],
  blue: ['#121e4a', '#1b3a86', '#2865c0', '#4398ea', '#80c8ff', '#d6f2ff'],
  lav: ['#29224c', '#4a4486', '#7574bd', '#a2a8df', '#cfd8f7', '#ffffff'],
  cloud: ['#7a8bb5', '#a9b9dc', '#cfdaf1', '#ebf1fc', '#ffffff'],
  pine: ['#0c271f', '#14402b', '#1d5a35', '#2a743f', '#3f8f49'],
  straw: ['#45301a', '#7a5428', '#ad8241', '#d6ae67', '#f1d79a'],
  pink: ['#4a1d33', '#8a3456', '#c4577c', '#ec88a5', '#ffc4d4'],
  white: ['#5e5a72', '#a8a4b8', '#d6d3e2', '#f1eff7', '#ffffff'],
};
const DARK = '#1b1d2e';

// ======================= shaded sprite generator =======================
// Shapes are height fields (ellipsoids, superellipsoids, tori, custom). Light comes from the top-left;
// shading walks each material's ramp with ordered dithering; outlines use the material's darkest colour.
const LIGHT = (() => { const v = [-0.55, -0.7, 0.62], m = Math.hypot(...v); return v.map(c => c / m); })();
function primH(p, X, Y) {
  if (p.t === 'e') {
    const dx = (X - p.cx) / p.rx, dy = (Y - p.cy) / p.ry;
    const d2 = p.p ? Math.pow(Math.pow(Math.abs(dx), p.p) + Math.pow(Math.abs(dy), p.p), 2 / p.p) : dx * dx + dy * dy;
    if (d2 > 1) return -1;
    return (p.rz ?? Math.min(p.rx, p.ry)) * Math.sqrt(1 - d2) + (p.z || 0);
  }
  if (p.t === 't') { if (Y > p.maxY) return -1; const q = Math.hypot(X - p.cx, Y - p.cy), t = p.r * p.r - (q - p.R) ** 2; return t < 0 ? -1 : Math.sqrt(t) + (p.z || 0); }
  return p.f(X, Y);
}
/** Returns pixel buffers: { c, blink, white, ghost } (plus the size). */
function spriteBufs(w, h, prims, features) {
  const Hm = new Float32Array(w * h).fill(-1), M = new Int16Array(w * h).fill(-1);
  prims.forEach((p, k) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = primH(p, x + .5, y + .5); if (v >= 0 && v > Hm[y * w + x]) { Hm[y * w + x] = v; M[y * w + x] = k; } } });
  const hAt = (x, y, own) => { if (x < 0 || y < 0 || x >= w || y >= h) return 0; const v = Hm[y * w + x]; return v < 0 ? 0 : (M[y * w + x] === own ? v : Math.min(v, Hm[y * w + x])); };
  const base = new Buf(w, h), outline = new Uint8Array(w * h);
  const rampOf = (k, x, y) => { const p = prims[k]; return p.rampAt ? p.rampAt(x, y) : p.ramp; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = M[i]; if (k < 0) continue;
    const dhx = (hAt(x + 1, y, k) - hAt(x - 1, y, k)) / 2, dhy = (hAt(x, y + 1, k) - hAt(x, y - 1, k)) / 2;
    let nx = -dhx, ny = -dhy, nz = 1; const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
    const lam = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
    const ramp = rampOf(k, x, y), nf = ramp.length - 1;
    const v = clamp(0.18 + 0.82 * lam, 0, 1) * nf + (bay(x, y) - 0.5) * 0.85;
    let idx = 1 + clamp(Math.floor(v), 0, nf - 1);
    for (const [ax, ay] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const X = x + ax, Y = y + ay; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (M[j] >= 0 && M[j] !== k && Hm[j] > Hm[i] + 2.5) { idx = Math.max(1, idx - 2); break; } }
    base.set(x, y, ramp[idx]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (M[i] >= 0) continue;
    let k = -1, lit = false;
    for (const [ax, ay] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const X = x + ax, Y = y + ay; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; if (M[Y * w + X] >= 0) { k = M[Y * w + X]; lit = (ax > 0 || ay > 0); if (ax < 0 || ay < 0) { lit = false; break; } } }
    if (k >= 0) { const ramp = rampOf(k, x, y); base.set(x, y, lit ? ramp[1] : ramp[0]); outline[i] = 1; }
  }
  const isBody = (x, y) => x >= 0 && y >= 0 && x < w && y < h && M[y * w + x] >= 0;
  const make = blink => {
    const b = base.clone();
    const api = {
      px: (x, y, c, a) => b.set(x, y, c, a),
      rect: (x, y, ww, hh, c) => { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) b.set(x + i, y + j, c); },
      isBody, blink,
      eye(x, y, big = true) { if (blink) { api.rect(x, y + 2, 3, 1, DARK); return; } api.rect(x, y, 3, big ? 4 : 3, DARK); api.px(x, y, '#ffffff'); api.px(x + 2, y + (big ? 3 : 2), '#8fa2ff'); },
      blush(x, y) { api.px(x, y, '#ff8fa3'); api.px(x + 1, y, '#ff8fa3'); api.px(x + 2, y, '#ffb3c1'); },
    };
    if (features) features(api);
    return b;
  };
  const open = make(false), shut = make(true);
  const variant = fn => { const b = open.clone(); for (let i = 0; i < w * h; i++) if (b.d[i] >>> 24) { const [r, g, bl] = rgb(fn(outline[i])); b.d[i] = ((255 << 24) | (bl << 16) | (g << 8) | r) >>> 0; } return b; };
  return { w, h, c: open, blink: shut, white: variant(o => (o ? '#ffd43b' : '#ffffff')), ghost: variant(o => (o ? '#3a3e5e' : '#2b2e47')) };
}

// ======================= creatures =======================
const CREATURES = {
  sprig: () => spriteBufs(56, 56, [
    { t: 'e', cx: 18, cy: 51, rx: 5, ry: 3, rz: 3, ramp: R.green }, { t: 'e', cx: 38, cy: 51, rx: 5, ry: 3, rz: 3, ramp: R.green },
    { t: 'e', cx: 28, cy: 37, rx: 18, ry: 14.5, rz: 15, ramp: R.green }, { t: 'e', cx: 28, cy: 20, rx: 1.8, ry: 6, rz: 2, z: 10, ramp: R.green },
    { t: 'e', cx: 19.5, cy: 13, rx: 8.5, ry: 4.2, rz: 3, z: 12, ramp: R.leaf }, { t: 'e', cx: 36.5, cy: 12, rx: 8.5, ry: 4.2, rz: 3, z: 12, ramp: R.leaf },
  ], a => { for (let x = 13; x <= 25; x++) a.px(x, 13, '#cdf59a', 0.55); for (let x = 31; x <= 43; x++) a.px(x, 12, '#cdf59a', 0.55); a.eye(20, 34); a.eye(33, 34); a.blush(15, 40); a.blush(38, 40); a.px(26, 41, DARK); a.px(27, 42, DARK); a.px(28, 42, DARK); a.px(29, 41, DARK); }),
  brawn: () => spriteBufs(56, 56, [
    { t: 'e', cx: 20, cy: 51, rx: 5.5, ry: 3, rz: 3, ramp: R.red }, { t: 'e', cx: 36, cy: 51, rx: 5.5, ry: 3, rz: 3, ramp: R.red },
    { t: 'e', cx: 28, cy: 34, rx: 16, ry: 16, rz: 14, p: 3.2, ramp: R.red }, { t: 'e', cx: 9, cy: 37, rx: 6.5, ry: 6.5, z: 6, ramp: R.cream }, { t: 'e', cx: 47, cy: 37, rx: 6.5, ry: 6.5, z: 6, ramp: R.cream },
  ], a => {
    for (let x = 12; x <= 44; x++) if (a.isBody(x, 23)) { a.px(x, 22, '#f6f1e6'); a.px(x, 23, '#f6f1e6'); a.px(x, 24, '#c9c2b4'); }
    a.px(45, 21, '#f6f1e6'); a.px(46, 20, '#f6f1e6'); a.px(47, 20, '#c9c2b4'); a.px(45, 25, '#f6f1e6'); a.px(46, 26, '#c9c2b4');
    a.px(20, 28, DARK); a.px(21, 28, DARK); a.px(22, 29, DARK); a.px(23, 29, DARK); a.px(36, 28, DARK); a.px(35, 28, DARK); a.px(34, 29, DARK); a.px(33, 29, DARK);
    a.eye(20, 31, false); a.eye(33, 31, false); a.rect(25, 39, 6, 2, DARK); a.rect(26, 39, 4, 1, '#ffffff'); a.blush(15, 36); a.blush(38, 36);
  }),
  grano: () => spriteBufs(56, 56, [
    { t: 'e', cx: 22, cy: 51, rx: 4, ry: 2.5, rz: 2.5, ramp: R.straw }, { t: 'e', cx: 34, cy: 51, rx: 4, ry: 2.5, rz: 2.5, ramp: R.straw },
    { t: 'e', cx: 28, cy: 31, rx: 13.5, ry: 20, rz: 13, ramp: R.cream }, { t: 'e', cx: 32, cy: 10, rx: 6, ry: 2.6, rz: 2, z: 10, ramp: R.leaf },
  ], a => { a.eye(22, 29, false); a.eye(32, 29, false); a.blush(18, 35); a.blush(34, 35); a.rect(27, 37, 2, 2, DARK); for (const [x, y] of [[20, 18], [21, 17], [35, 44], [36, 43], [24, 46]]) a.px(x, y, '#fffaee'); }),
  drip: () => spriteBufs(56, 56, [
    { t: 'e', cx: 28, cy: 36, rx: 17, ry: 16, rz: 16, ramp: R.blue },
    { t: 'f', ramp: R.blue, f: (X, Y) => { if (Y < 5 || Y > 36) return -1; const r = 16.5 * Math.pow((Y - 5) / 31, 0.85); const dx = X - 28; if (Math.abs(dx) > r) return -1; return Math.sqrt(r * r - dx * dx) * 0.95; } },
  ], a => { a.rect(18, 26, 2, 6, '#ffffff'); a.rect(20, 23, 2, 3, '#ffffff'); a.px(18, 33, '#d6f2ff'); a.px(23, 21, '#d6f2ff'); a.eye(21, 36); a.eye(32, 36); a.blush(17, 42); a.blush(36, 42); a.px(26, 43, DARK); a.px(27, 44, DARK); a.px(28, 44, DARK); a.px(29, 43, DARK); }),
  puff: () => spriteBufs(56, 56, [
    { t: 'e', cx: 17, cy: 35, rx: 11, ry: 9, ramp: R.lav }, { t: 'e', cx: 39, cy: 35, rx: 11, ry: 9, ramp: R.lav },
    { t: 'e', cx: 28, cy: 26, rx: 12.5, ry: 11.5, rz: 12, ramp: R.lav }, { t: 'e', cx: 28, cy: 39, rx: 16, ry: 9, rz: 9, ramp: R.lav },
  ], a => { a.eye(21, 31); a.eye(32, 31); a.blush(16, 37); a.blush(37, 37); a.rect(27, 38, 2, 2, DARK); for (const [x, y] of [[1, 24], [2, 24], [3, 24], [4, 25], [2, 30], [3, 30], [52, 40], [53, 40], [54, 39], [51, 46], [52, 46]]) a.px(x, y, '#cfd8f7'); }),
};

// ======================= avatar =======================
const SKIN = {
  light: ['#4a2a1e', '#8a5238', '#c47e5a', '#e8a77f', '#f6c9a6', '#ffe6d2'],
  pale: ['#4e3530', '#9a6e62', '#d9a896', '#f2c8b6', '#ffe3d6', '#fff4ee'],
  tan: ['#3a2016', '#6e3e28', '#a5653f', '#c98656', '#e2a877', '#f4cda6'],
  deep: ['#1f120c', '#40261a', '#62392a', '#83513a', '#a46d4f', '#c48f70'],
};
const HAIR = {
  black: ['#08080d', '#15161f', '#252736', '#3a3d52', '#5a5e7a'],
  brown: ['#2a160e', '#4f2d1c', '#77452a', '#9c6440', '#c48b5e'],
  blonde: ['#5a3a10', '#9a6a1c', '#d1a02e', '#f2c84e', '#ffe597'],
  pink: R.sakura, blue: R.sky, silver: R.metal,
};
const TOPS = { yellow: R.yellow, white: R.white, black: R.onyx, red: R.red, blue: R.sky, green: R.green, gold: R.gold };
const BOTTOM = { denim: ['#121e3a', '#1e3a6a', '#2d5a9a', '#4a7cc0', '#78a6dc'], black: R.onyx, khaki: R.straw, pink: R.sakura };
const AH = 64, O = 8;
export const DEFAULT_LOOK = { gender: 'boy', skin: 'light', hair: 'short', hairColor: 'black', top: 'yellow', bottom: 'pants', bottomColor: 'denim', acc: 'none' };

function avatarBufs(look) {
  const L = Object.assign({}, DEFAULT_LOOK, look || {});
  const skin = SKIN[L.skin] || SKIN.light, hair = HAIR[L.hairColor] || HAIR.black, top = TOPS[L.top] || R.yellow, bot = BOTTOM[L.bottomColor] || BOTTOM.denim;
  const girl = L.gender === 'girl', sw = girl ? 8.5 : 9.6;
  const legRamp = (x, y) => (L.bottom === 'pants' ? (y < O + 50 ? bot : skin) : L.bottom === 'shorts' ? (y < O + 44 ? bot : skin) : skin);
  const prims = [];
  if (L.hair === 'long') prims.push({ t: 'f', ramp: hair, f: (X, Y) => { const y = Y - O; if (y < 12 || y > 37) return -1; const d = Math.abs(X - 28); if (d < 9 || d > 14.6 - Math.max(0, y - 30) * 0.4) return -1; return 1.2; } });
  if (L.hair === 'pony') prims.push({ t: 'e', cx: 41.5, cy: O + 19, rx: 4.2, ry: 9, rz: 2, ramp: hair });
  prims.push({ t: 'e', cx: 24.4, cy: O + 46.5, rx: 3.2, ry: 6.5, rz: 3, ramp: bot, rampAt: legRamp });
  prims.push({ t: 'e', cx: 31.6, cy: O + 46.5, rx: 3.2, ry: 6.5, rz: 3, ramp: bot, rampAt: legRamp });
  prims.push({ t: 'e', cx: 23.8, cy: O + 52.6, rx: 4.3, ry: 2.4, rz: 2.2, z: 1, ramp: R.white });
  prims.push({ t: 'e', cx: 32.2, cy: O + 52.6, rx: 4.3, ry: 2.4, rz: 2.2, z: 1, ramp: R.white });
  if (L.bottom === 'skirt') prims.push({ t: 'f', ramp: bot, f: (X, Y) => { const y = Y - O; if (y < 39 || y > 46.5) return -1; const hw = 8.2 + (y - 39) * 0.75; const d = Math.abs(X - 28); if (d > hw) return -1; return 4.5 * Math.sqrt(1 - (d / hw) ** 2) + 2; } });
  prims.push({ t: 'e', cx: 28, cy: O + 36.5, rx: sw, ry: 7.6, rz: 6, p: 2.6, ramp: top });
  for (const sx of [-1, 1]) prims.push({ t: 'e', cx: 28 + sx * (sw + 2.1), cy: O + 36, rx: 2.8, ry: 6.3, rz: 3, z: 1, ramp: top, rampAt: (x, y) => (y > O + 39.5 ? skin : top) });
  prims.push({ t: 'e', cx: 28, cy: O + 28.6, rx: 3, ry: 2.4, rz: 2, ramp: skin });
  prims.push({ t: 'e', cx: 15.9, cy: O + 19.5, rx: 2, ry: 2.7, rz: 2, ramp: skin });
  prims.push({ t: 'e', cx: 40.1, cy: O + 19.5, rx: 2, ry: 2.7, rz: 2, ramp: skin });
  prims.push({ t: 'e', cx: 28, cy: O + 18, rx: 12.5, ry: 11.5, rz: 11, ramp: skin });
  const fringe = (X) => {
    const d = Math.abs(X - 28), zig = ((Math.floor(X / 3)) & 1) * 1.5;
    if (L.hair === 'buzz') return 11.5;
    if (L.hair === 'short' || L.hair === 'spiky') return d > 10 ? 21 : 14 + zig;
    return d > 9.5 ? 25 : 13.5 + zig;
  };
  const capRy = L.hair === 'buzz' ? 10.2 : 11.9, capCy = L.hair === 'buzz' ? 16 : 16.6;
  prims.push({ t: 'f', ramp: hair, f: (X, Y) => { const y = Y - O; const dx = (X - 28) / 13.7, dy = (y - capCy) / capRy, d2 = dx * dx + dy * dy; if (d2 > 1 || y > fringe(X)) return -1; return 12.6 * Math.sqrt(1 - d2) + 0.6; } });
  if (L.hair === 'spiky') for (const [sx, sy] of [[17, 6], [23, 3], [29, 2.5], [35, 4], [40, 8]]) prims.push({ t: 'f', ramp: hair, f: (X, Y) => { const y = Y - O; if (y < sy || y > sy + 6) return -1; const hw = (y - sy) * 0.55 + 0.4; return Math.abs(X - sx) > hw ? -1 : 9.5; } });
  if (L.hair === 'bun') prims.push({ t: 'e', cx: 28, cy: O + 4.2, rx: 5.2, ry: 4.4, rz: 4, z: 7, ramp: hair });
  if (L.acc === 'cap') {
    prims.push({ t: 'f', ramp: R.red, f: (X, Y) => { const y = Y - O; const dx = (X - 28) / 14, dy = (y - 12) / 8.2, d2 = dx * dx + dy * dy; if (d2 > 1 || y > 12.6) return -1; return 13.5 * Math.sqrt(1 - d2) + 1.5; } });
    prims.push({ t: 'e', cx: 31, cy: O + 13.4, rx: 10.5, ry: 2.6, rz: 1.6, z: 13.2, ramp: R.red });
  }
  if (L.acc === 'headphones') {
    prims.push({ t: 't', cx: 28, cy: O + 19, R: 14.6, r: 1.7, maxY: O + 17, z: 12, ramp: R.onyx });
    prims.push({ t: 'e', cx: 14.4, cy: O + 20, rx: 2.9, ry: 4.2, z: 11, ramp: R.coral });
    prims.push({ t: 'e', cx: 41.6, cy: O + 20, rx: 2.9, ry: 4.2, z: 11, ramp: R.coral });
  }
  const s = spriteBufs(56, AH, prims, a => {
    const ey = O + 19;
    if (a.blink) { a.rect(22, ey + 2, 3, 1, DARK); a.rect(31, ey + 2, 3, 1, DARK); }
    else { a.eye(22, ey); a.eye(31, ey); }
    if (girl && !a.blink) { a.px(21, ey, DARK); a.px(34, ey, DARK); }
    a.blush(18, ey + 5); a.blush(35, ey + 5);
    a.px(26, ey + 5, DARK); a.px(27, ey + 6, DARK); a.px(28, ey + 6, DARK); a.px(29, ey + 5, DARK);
    if (L.acc === 'glasses') {
      for (const x of [21, 30]) { a.rect(x - 1, ey - 1, 6, 1, DARK); a.rect(x - 1, ey + 4, 6, 1, DARK); a.rect(x - 1, ey - 1, 1, 6, DARK); a.rect(x + 4, ey - 1, 1, 6, DARK); a.px(x, ey, '#ffffff', 0.6); }
      a.rect(26, ey, 4, 1, DARK);
    }
    if (L.acc === 'headband') { for (let x = 15; x <= 41; x++) if (a.isBody(x, O + 9)) { a.px(x, O + 8, '#ff8fa3'); a.px(x, O + 9, '#ec6a8a'); } a.rect(37, O + 5, 3, 3, '#ff8fa3'); a.rect(41, O + 5, 3, 3, '#ff8fa3'); a.px(40, O + 6, '#c4577c'); }
    if (L.top === 'gold') { a.px(28, O + 34, '#ffffff'); a.px(27, O + 35, '#fff8d6'); a.px(29, O + 35, '#fff8d6'); a.px(28, O + 36, '#fff8d6'); }
    else { a.rect(26, O + 33, 5, 4, top[1]); a.rect(27, O + 34, 3, 2, '#ffd43b'); }
  });
  if (L.acc === 'crown') {
    const crown = spriteBufs(20, 14, [{ t: 'f', ramp: R.gold, f: (X, Y) => { if (X < 1 || X > 19 || Y > 13) return -1; if (Y >= 8) return 2.5; return [[3, 2], [10, 0], [17, 2]].some(([sx, sy]) => Y >= sy && Math.abs(X - sx) <= (Y - sy) * 0.55 + 0.6) ? 2 : -1; } }], a => { a.px(10, 10, '#de503e'); a.px(4, 10, '#4398ea'); a.px(15, 10, '#40a64e'); });
    for (const k of ['c', 'blink', 'white', 'ghost']) { const b = s[k].clone(); b.stamp(crown[k], 18, 0); s[k] = b; }
  }
  return s;
}

// ======================= props =======================
const eggPrim = (cx, cy, rx, ry) => ({ t: 'e', cx, cy, rx, ry, ramp: R.cream, rampAt: (x, y) => { const band = Math.round(cy) + 1 + (((x >> 1) & 1) ? 1 : 0); if (y >= band && y <= band + 1) return R.yellow; if (hash(x >> 1, y >> 1) > 0.93 && y < cy - 2) return R.leaf; return R.cream; } });
const PROPS = {
  egg: () => spriteBufs(22, 26, [eggPrim(11, 14, 9, 11.5)]),
  eggBig: () => spriteBufs(40, 48, [eggPrim(20, 25, 16.5, 21)]),
  iconEgg: () => spriteBufs(10, 12, [eggPrim(5, 6.5, 4, 5)]),
  lockC: () => spriteBufs(18, 20, [{ t: 't', cx: 9, cy: 8, R: 5, r: 1.8, maxY: 9, ramp: R.metal }, { t: 'e', cx: 9, cy: 13.5, rx: 7.5, ry: 5.5, rz: 5, p: 3, ramp: R.yellow }], a => { a.rect(8, 12, 2, 2, DARK); a.px(8, 14, DARK); a.px(9, 14, DARK); a.px(8, 15, DARK); }),
  lockO: () => spriteBufs(18, 20, [{ t: 't', cx: 9, cy: 5, R: 5, r: 1.8, maxY: 6, ramp: R.metal }, { t: 'e', cx: 13.5, cy: 8, rx: 1.6, ry: 2.6, rz: 1.6, ramp: R.metal }, { t: 'e', cx: 9, cy: 13.5, rx: 7.5, ry: 5.5, rz: 5, p: 3, ramp: R.yellow }], a => { a.rect(8, 12, 2, 2, DARK); a.px(8, 14, DARK); a.px(9, 14, DARK); }),
  lockMini: () => spriteBufs(9, 10, [{ t: 't', cx: 4.5, cy: 4, R: 2.5, r: 1, maxY: 4.5, ramp: R.metal }, { t: 'e', cx: 4.5, cy: 6.8, rx: 3.8, ry: 2.8, rz: 2.5, p: 3, ramp: R.yellow }]),
};
const cloud = () => spriteBufs(52, 22, [{ t: 'e', cx: 14, cy: 14, rx: 10, ry: 7, ramp: R.cloud }, { t: 'e', cx: 27, cy: 10, rx: 12, ry: 9, ramp: R.cloud }, { t: 'e', cx: 39, cy: 14, rx: 10, ry: 7, ramp: R.cloud }, { t: 'e', cx: 26, cy: 16, rx: 22, ry: 5, ramp: R.cloud }]);
const cloudS = () => spriteBufs(34, 16, [{ t: 'e', cx: 11, cy: 10, rx: 8, ry: 5, ramp: R.cloud }, { t: 'e', cx: 20, cy: 8, rx: 9, ry: 6.5, ramp: R.cloud }, { t: 'e', cx: 17, cy: 11, rx: 15, ry: 4, ramp: R.cloud }]);
const tree = () => spriteBufs(34, 34, [{ t: 'e', cx: 11, cy: 20, rx: 9, ry: 8, ramp: R.pine }, { t: 'e', cx: 23, cy: 19, rx: 9, ry: 8.5, ramp: R.pine }, { t: 'e', cx: 17, cy: 12, rx: 10, ry: 9, ramp: R.pine }, { t: 'e', cx: 17, cy: 24, rx: 13, ry: 6, ramp: R.pine }]);
const bush = () => spriteBufs(24, 16, [{ t: 'e', cx: 8, cy: 10, rx: 7, ry: 5.5, ramp: R.green }, { t: 'e', cx: 16, cy: 9, rx: 7, ry: 6, ramp: R.green }, { t: 'e', cx: 12, cy: 11, rx: 10, ry: 4, ramp: R.green }]);
const foliage = () => spriteBufs(28, 28, [{ t: 'e', cx: 9, cy: 16, rx: 7, ry: 6, ramp: R.leaf }, { t: 'e', cx: 19, cy: 15, rx: 7, ry: 6.5, ramp: R.leaf }, { t: 'e', cx: 14, cy: 9, rx: 7.5, ry: 7, ramp: R.leaf }, { t: 'e', cx: 14, cy: 20, rx: 10, ry: 5, ramp: R.leaf }]);
const bowl = () => spriteBufs(20, 14, [{ t: 'e', cx: 7, cy: 6, rx: 4, ry: 3, ramp: R.leaf }, { t: 'e', cx: 12, cy: 5, rx: 4, ry: 3.2, ramp: R.leaf }, { t: 'e', cx: 10, cy: 4, rx: 2.4, ry: 2, z: 3, ramp: R.red }, { t: 'f', ramp: R.white, f: (X, Y) => { if (Y < 7 || Y > 13) return -1; const r = 9 * Math.sqrt(Math.max(0, 1 - ((Y - 7) / 6.2) ** 2)); const dx = X - 10; return Math.abs(dx) > r ? -1 : 5 * Math.sqrt(Math.max(0, 1 - (dx / Math.max(r, .01)) ** 2)); } }]);

// ======================= room =======================
const OX = 144, TW = 12, TH = 6, N = 8, WALL = 80;
let OY = 104;
const iso = (i, j, z = 0) => [OX + (i - j) * TW, OY + (i + j) * TH - z];
const WOOD = ['#4a2a1e', '#6a3d28', '#8a5434', '#a86d42', '#c78b55', '#e0a96e'];
function inQuad(px, py, q) { let s = 0; for (let k = 0; k < 4; k++) { const [x1, y1] = q[k], [x2, y2] = q[(k + 1) % 4]; const c = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1); if (c !== 0) { const sg = c > 0 ? 1 : -1; if (s && sg !== s) return false; s = sg; } } return true; }
function fillQuad(b, q, color) { const xs = q.map(p => p[0]), ys = q.map(p => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) if (inQuad(x + .5, y + .5, q)) { const c = typeof color === 'function' ? color(x, y) : color; if (c) b.set(x, y, c); } }
function isoBox(b, i0, j0, z0, i1, j1, z1, top, left, right) {
  fillQuad(b, [iso(i0, j1, z1), iso(i1, j1, z1), iso(i1, j1, z0), iso(i0, j1, z0)], left);
  fillQuad(b, [iso(i1, j0, z1), iso(i1, j1, z1), iso(i1, j1, z0), iso(i1, j0, z0)], right);
  fillQuad(b, [iso(i0, j0, z1), iso(i1, j0, z1), iso(i1, j1, z1), iso(i0, j1, z1)], top);
}
const inShaft = (i, j) => inQuad(i, j, [[3, 0], [5.4, 0], [6.9, 4.6], [4.5, 4.6]]);
const stampAt = (b, src, x, y, ax, ay) => b.stamp(src, Math.round(x - ax), Math.round(y - ay));
function wallColor(side, u, z, x, y) {
  const lit = side === 'R';
  if (z > WALL - 2) return '#fbe3d4';
  if (z > WALL - 6) return lit ? '#e9b8a2' : '#d9a28e';
  if (z < 6) return z < 1.5 ? '#6a3d28' : (lit ? '#a86d42' : '#8a5434');
  if (z < 7.5) return '#c78b55';
  if (lit && u >= 2.9 && u <= 5.5 && z >= 28 && z <= 66) {
    if (u < 3.05 || u > 5.35 || z < 29.5 || z > 64.5 || Math.abs(u - 4.2) < 0.09 || Math.abs(z - 47) < 0.9) return '#fff1e6';
    const sky = ['#7fc4f4', '#9ad3f8', '#b7e1fb', '#d6eefd'];
    if (Math.abs((u - 3) * 13 - (66 - z) * 0.9 - 6) < 1.6) return '#f2fbff';
    if (u > 4.4 && z > 58 && z < 62 && u < 5.0) return '#ffffff';
    return sky[clamp(Math.floor((66 - z) / 36 * 3.6 + bay(x, y) * 0.8), 0, 3)];
  }
  if (lit && ((u >= 2.45 && u < 2.9) || (u > 5.5 && u <= 5.95)) && z >= 22 && z <= 70) return (Math.floor(u * 22) & 1) ? '#ec88a5' : '#c4577c';
  if (lit && u >= 2.3 && u <= 6.1 && z > 70 && z <= 72) return '#4a2a1e';
  if (!lit && u >= 2.2 && u <= 4.2 && z >= 32 && z <= 62) {
    if (u < 2.3 || u > 4.1 || z < 33 || z > 61) return '#f6f1ec';
    const pu = (u - 3.2) * 13.4, pv = z - 47, d = Math.hypot(pu, pv), ang = Math.atan2(pv, pu);
    if (d > 6 && d < 10 && !(ang > -0.2 && ang < 0.75)) return d < 7.5 ? '#eaa826' : '#ffcf3a';
    return z > 58 ? '#2a2c44' : DARK;
  }
  if (!lit && u >= 5.2 && u <= 7.3 && z >= 44 && z <= 46) return z > 45.2 ? '#c78b55' : '#6a3d28';
  if (!lit && u >= 5.35 && u <= 7.1 && z > 46 && z <= 57) { const books = ['#4398ea', '#de503e', '#40a64e', '#ffcf3a', '#7574bd', '#ec88a5', '#f3e8cd']; const k = Math.floor((u - 5.35) * 6.2), hgt = 54 + (hash(k, 2) * 4 | 0); if (z <= hgt && (u - 5.35) * 6.2 - k > 0.12) return books[k % books.length]; }
  const stripe = Math.floor(u * 5) & 1, motif = ((Math.floor(u * 10) + Math.floor(z / 6)) % 4 === 0) && ((Math.floor(z) % 6) === 3);
  let tone = lit ? 2 : 1; if (stripe) tone -= 0.6; if (z < 16) tone -= 0.5 * (1 - z / 16);
  const ramp = ['#a8665a', '#c98f7c', '#e1a891', '#efbfa7', '#f8d5c1'];
  return motif ? '#f8d5c1' : ramp[clamp(Math.round(tone + (bay(x, y) - 0.5) * 0.6), 0, 4)];
}
function floorColor(i, j, x, y) {
  const lightUp = inShaft(i, j) ? 1 : 0, r = Math.hypot(i - 4.3, j - 4.5);
  if (r < 2.35) { let c; if (r > 2.12) c = ['#2a2c44', '#3a3d5c']; else if (r > 1.55 && r < 1.85) c = ['#eaa826', '#ffcf3a']; else if (r > 0.95 && r < 1.08) c = ['#c4577c', '#ec88a5']; else c = ['#e6d9c0', '#f6ecd8']; return c[lightUp]; }
  const pj = j * 3, plank = Math.floor(pj), fj = pj - plank, pi = i * 0.8 + hash(plank) * 3, seg = Math.floor(pi), fi = pi - seg;
  let tone = 3 + (hash(plank, seg) > 0.55 ? 1 : 0) - (hash(seg, plank * 3) > 0.82 ? 1 : 0);
  if (fj < 0.14) tone = 1; else if (fi < 0.03) tone = 2;
  if (i < 0.4 || j < 0.4) tone -= 1; tone += lightUp; if (hash(x, y) > 0.96 && tone > 1) tone -= 1;
  return WOOD[clamp(tone, 0, 5)];
}
function buildRoom() {
  const b = new Buf(W, H), BG = ['#151729', '#191b31', '#1e1f39', '#232240', '#2a2546'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.set(x, y, BG[clamp(Math.floor((y / H + Math.hypot(x - 144, y - 140) / 900) * 4.2 + bay(x, y) * 0.9), 0, 4)]);
  for (let k = 0; k < 70; k++) b.set((hash(k, 3) * W) | 0, (hash(k, 9) * H) | 0, hash(k, 5) > .7 ? '#8a86c4' : '#4a4874');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x + .5, Y = y + .5, jL = (OX - X) / TW, zL = OY + jL * TH - Y;
    if (jL >= 0 && jL <= N && zL >= 0 && zL <= WALL) { b.set(x, y, wallColor('L', jL, zL, x, y)); continue; }
    const iR = (X - OX) / TW, zR = OY + iR * TH - Y;
    if (iR >= 0 && iR <= N && zR >= 0 && zR <= WALL) b.set(x, y, wallColor('R', iR, zR, x, y));
  }
  for (let z = -8; z <= WALL; z++) { const [x, y] = iso(0, N, z); for (let k = 1; k <= 3; k++) b.set(x - k, y, z > WALL - 2 ? '#fbe3d4' : '#b9786a'); }
  for (let z = -8; z <= WALL; z++) { const [x, y] = iso(N, 0, z); for (let k = 0; k <= 2; k++) b.set(x + k, y, z > WALL - 2 ? '#fbe3d4' : '#c98f7c'); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = (x + .5 - OX) / TW, c = (y + .5 - OY) / TH, i = (a + c) / 2, j = (c - a) / 2; if (i < 0 || j < 0 || i >= N || j >= N) continue; b.set(x, y, floorColor(i, j, x, y)); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x + .5, Y = y + .5, jr = N - (X - OX) / TW, yr = OY + (N + jr) * TH;
    if (jr >= 0 && jr <= N && Y >= yr && Y < yr + 9) { b.set(x, y, Y < yr + 1.5 ? '#c78b55' : (bay(x, y) > 0.85 ? '#4a2a1e' : '#3b2219')); continue; }
    const il = (X - OX) / TW + N, yl = OY + (il + N) * TH;
    if (il >= 0 && il <= N && Y >= yl && Y < yl + 9) b.set(x, y, Y < yl + 1.5 ? '#e0a96e' : (bay(x, y) > 0.85 ? '#7a4a2c' : '#5a3424'));
  }
  isoBox(b, 0.08, 0.4, 0, 0.3, 3.7, 26, '#c78b55', '#8a5434', '#6a3d28');
  isoBox(b, 0.3, 0.4, 0, 2.7, 3.7, 8, '#a86d42', '#8a5434', '#6a3d28');
  isoBox(b, 0.3, 0.4, 8, 2.7, 3.7, 12, '#f6f1ec', '#d9d2de', '#bcb4c6');
  isoBox(b, 0.35, 0.8, 12, 0.95, 3.3, 16, '#ffffff', '#e4e0ea', '#c9c3d6');
  isoBox(b, 1.05, 0.4, 12, 2.7, 3.7, 14, (x, y) => (((x >> 1) + (y >> 1)) & 3) ? '#ec88a5' : '#ffc4d4', '#c4577c', '#8a3456');
  isoBox(b, 6.7, 0.35, 0, 7.5, 1.15, 12, '#d67850', '#b0553a', '#763823');
  stampAt(b, foliage().c, ...iso(7.1, 0.75, 12), 14, 24);
  isoBox(b, 6.3, 2.5, 0, 7.6, 3.8, 5, (x, y) => ((x + y) & 1) ? '#d6ae67' : '#ad8241', '#7a5428', '#45301a');
  isoBox(b, 0.35, 4.4, 0, 0.95, 5.0, 2, '#8a95b6', '#5f6a8c', '#3c4260');
  isoBox(b, 0.6, 4.65, 2, 0.7, 4.75, 34, '#b9c2dc', '#8a95b6', '#5f6a8c');
  isoBox(b, 0.25, 4.3, 34, 1.05, 5.1, 44, '#ffe580', '#ffcf3a', '#eaa826');
  for (const [i, j] of [[1.75, 6.15], [2.85, 6.15], [1.75, 7.25], [2.85, 7.25]]) isoBox(b, i, j, 0, i + 0.2, j + 0.2, 13, '#8a5434', '#6a3d28', '#4a2a1e');
  isoBox(b, 1.6, 6.0, 13, 3.2, 7.6, 16, '#e0a96e', '#a86d42', '#7a4a2c');
  stampAt(b, bowl().c, ...iso(2.4, 6.8, 16), 10, 12);
  return b;
}
function buildMeadow() {
  const b = new Buf(W, H), SKY = ['#4f9fe8', '#62b0f0', '#79c0f6', '#93cffa', '#b0ddfc', '#cfeafd', '#e8f5ff'];
  for (let y = 0; y < HZ + 4; y++) for (let x = 0; x < W; x++) b.set(x, y, SKY[clamp(Math.floor((y / (HZ - 6)) * 6 + bay(x, y) * 0.9 - 0.2), 0, 6)]);
  for (let y = 0; y < TOP + 90; y++) for (let x = 180; x < W; x++) { const d = Math.hypot(x - 240, y - TOP - 34); if (d < 10) b.set(x, y, '#fffbe6'); else if (d < 13) b.set(x, y, '#fff0b0'); else if (d < 30 && bay(x, y) < (30 - d) / 34) b.set(x, y, '#e6f5ff'); }
  const cl = cloud(), cs = cloudS(), tr = tree(), bu = bush();
  const cy = (y) => Math.round(TOP + (y - 0) * (HZ - TOP) / 146);
  stampAt(b, cl.c, 196, cy(52), 26, 11); stampAt(b, cs.c, 132, cy(78), 17, 8); stampAt(b, cs.c, 262, cy(94), 17, 8);
  if (HZ - TOP > 200) { stampAt(b, cs.c, 52, cy(30), 17, 8); stampAt(b, cl.c, 90, cy(118), 26, 11); }
  for (let x = 0; x < W; x++) {
    const h1 = HZ - 34 + Math.sin(x * 0.028) * 7 + Math.sin(x * 0.07 + 1) * 3;
    for (let y = Math.floor(h1); y < HZ + 4; y++) b.set(x, y, y < h1 + 1.5 ? '#a8d4c4' : (bay(x, y) > 0.92 ? '#8cc0b0' : '#7cb3a3'));
    const h2 = HZ - 22 + Math.sin(x * 0.045 + 2) * 6;
    for (let y = Math.floor(h2); y < HZ + 4; y++) b.set(x, y, y < h2 + 1.5 ? '#7fb79a' : '#5f9a84');
  }
  for (let k = 0; k < 15; k++) { const x = Math.round(k * 21 - 6 + hash(k, 1) * 8), y = Math.round(HZ - 28 + hash(k, 2) * 8); for (let t = 0; t < 6; t++) { b.set(x + 16, y + 29 + t, '#3a2418'); b.set(x + 17, y + 29 + t, '#2a1a12'); } b.stamp(tr.c, x, y); }
  const GR = ['#22512f', '#2d6838', '#3a8040', '#4d9a48', '#66b352', '#86c95e'];
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) b.set(x, y, GR[clamp(Math.floor(4.4 - ((y - HZ) / (H - HZ)) * 3 + bay(x, y) * 0.9 - 0.4), 0, 5)]);
  const patch = (cx, cy, rx, ry) => {
    const D = ['#5a3c26', '#7a5434', '#9a6e44', '#bb8d5a', '#d5ab76'];
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d > 1) continue; b.set(x, y, D[clamp(Math.floor(3.2 - d * 1.6 - (y - cy) / ry * 0.6 + (bay(x, y) - .5) * .8), 0, 4)]); }
    for (let x = cx - rx; x <= cx + rx; x += 2) { const e = cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)); b.set(x, Math.round(e), '#86c95e'); b.set(x + 1, Math.round(e) - 1, '#66b352'); }
  };
  patch(200, HZ + 34, 42, 10); patch(76, HZ + 96, 40, 9);
  const nearPatch = (x, y, m) => ((x - 200) / (44 + m)) ** 2 + ((y - HZ - 34) / (12 + m)) ** 2 < 1 || ((x - 76) / (42 + m)) ** 2 + ((y - HZ - 96) / (11 + m)) ** 2 < 1;
  for (let k = 0; k < 520; k++) { const x = (hash(k, 11) * W) | 0, y = HZ + 4 + ((hash(k, 13) * (H - HZ - 4)) | 0); if (nearPatch(x, y, 0)) continue; b.set(x, y, '#9bd96a'); b.set(x - 1, y + 1, '#66b352'); b.set(x + 1, y + 1, '#66b352'); b.set(x, y + 1, '#4d9a48'); if (y > HZ + 74) { b.set(x - 1, y - 1, '#b8ee86'); b.set(x + 1, y - 2, '#9bd96a'); } b.set(x, y + 2, '#2d6838'); }
  const FL = ['#ffffff', '#ffd43b', '#ff9ec0', '#b7a6ff', '#ffffff'];
  for (let k = 0; k < 90; k++) { const x = (hash(k, 21) * W) | 0, y = HZ + 6 + ((hash(k, 23) * (H - HZ - 14)) | 0); if (nearPatch(x, y, 2)) continue; const c = FL[(hash(k, 25) * FL.length) | 0]; b.set(x, y, c); if (y > HZ + 54) { b.set(x - 1, y, c); b.set(x + 1, y, c); b.set(x, y - 1, c); b.set(x, y, '#ffcf3a'); } b.set(x, y + 1, '#2d6838'); }
  for (const [x, y] of [[14, HZ + 14], [262, HZ + 68], [8, HZ + 142], [252, HZ + 154]]) if (y < H) b.stamp(bu.c, x - 12, y - 10);
  for (let y = 0; y < HZ + 84; y++) for (let x = 0; x < W; x++) { const v = ((x * 0.55 + y) % 74 + 74) % 74; if (v < 12 && (x + y) > 120) b.set(x, y, '#fff6d0', 0.07 + (12 - v) * 0.004); }
  return b;
}

// ======================= engine =======================
const TYPE_COLOR = { sprig: '#40a64e', brawn: '#de503e', grano: '#b8885a', drip: '#4398ea', puff: '#7574bd', mystery: '#eaa826' };
const DEX_ORDER = ['sprig', 'brawn', 'grano', 'drip', 'puff', 'mystery'];
const fill = (str, vars) => String(str || '').replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));

export function createEngine(gfx, hooks = {}, opts = {}) {
  // Fill whatever screen we get: width is always 288 virtual pixels.
  H = Math.max(BASE_H, Math.round(opts.height || BASE_H));
  TOP = Math.max(0, Math.round(opts.top || 0));
  if (H > 420) { BAR_Y = H - 48; CARD_Y = BAR_Y - 76; } else { BAR_Y = H; CARD_Y = 246; }
  OY = Math.round((TOP + 50 + CARD_Y - 6) / 2 - 12);
  HZ = Math.max(146, CARD_Y - 112);
  BO = HZ - 146;
  const sound = (name) => { try { hooks.sound && hooks.sound(name); } catch (e) { /* optional */ } };

  // Images are made lazily and cached.
  const imgCache = new Map();
  const toImages = (bufs) => ({ w: bufs.w, h: bufs.h, c: gfx.image(bufs.c), blink: gfx.image(bufs.blink), white: gfx.image(bufs.white), ghost: gfx.image(bufs.ghost), _shinyBuf: bufs.c, _shinyBlinkBuf: bufs.blink });
  function creature(sp) { let s = imgCache.get('cr:' + sp); if (!s) { s = toImages(CREATURES[sp]()); imgCache.set('cr:' + sp, s); } return s; }
  function shinyOf(sp, blink) {
    const key = 'sh:' + sp + (blink ? ':b' : '');
    let im = imgCache.get(key);
    if (!im) { const s = creature(sp); im = gfx.image((blink ? s._shinyBlinkBuf : s._shinyBuf).hueShift(150)); imgCache.set(key, im); }
    return im;
  }
  function prop(name) { let s = imgCache.get('pr:' + name); if (!s) { s = toImages(PROPS[name]()); imgCache.set('pr:' + name, s); } return s; }
  function avatar() {
    const key = 'av:' + JSON.stringify(G.look || {});
    let s = imgCache.get(key);
    if (!s) { s = toImages(avatarBufs(G.look)); imgCache.set(key, s); }
    return s;
  }
  const ROOM = gfx.image(buildRoom());
  const MEADOW = gfx.image(buildMeadow());

  // ---------- state from the app ----------
  let S = {};
  let G = { name: '', level: 1, look: {}, egg: { progress: 0, target: 5000 }, today: { encounters: 0, cap: 3 }, pending: 0, dex: {}, total: 6 };
  const spName = sp => (S.species && S.species[sp] && S.species[sp].name) || sp;
  const spType = sp => (S.species && S.species[sp] && S.species[sp].type) || '';
  const dexCount = () => Object.keys(G.dex || {}).length;

  const view = { scene: 'home', box: null, enemy: null, lock: null, stars: [], fade: 0, flash: 0, fx: null, eggShake: 0, eggCrack: 0, hatched: null, banner: null, beam: 0, dim: 0 };

  // ---------- drawing helpers ----------
  const T = { size: 12, weight: '600' };
  const text = (str, x, y, color, chars = Infinity, shadow = null) => {
    if (!str || chars <= 0) return;
    const s = chars >= str.length ? str : Array.from(str).slice(0, chars).join('');
    gfx.text(s, x, y, { color, shadow, size: T.size, weight: T.weight });
  };
  const textW = (str) => Math.ceil(gfx.measure(str, T));
  const rect = (x, y, w, h, c, a = 1) => gfx.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c, a);
  function panel(x, y, w, h, fillC = DARK, border = '#f2ead8', alpha = 0.94) {
    rect(x + 2, y, w - 4, h, fillC, alpha); rect(x, y + 2, 2, h - 4, fillC, alpha); rect(x + w - 2, y + 2, 2, h - 4, fillC, alpha);
    if (border) { rect(x + 2, y, w - 4, 1, border); rect(x + 2, y + h - 1, w - 4, 1, border); rect(x, y + 2, 1, h - 4, border); rect(x + w - 1, y + 2, 1, h - 4, border); rect(x + 1, y + 1, 1, 1, border); rect(x + w - 2, y + 1, 1, 1, border); rect(x + 1, y + h - 2, 1, 1, border); rect(x + w - 2, y + h - 2, 1, 1, border); }
  }
  function shadowEllipse(cx, cy, rx, ry, a = 0.28, color = '#0b0c18') {
    const list = [];
    for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + .5)) ** 2))); list.push([Math.round(cx - hw), Math.round(cy + y), hw * 2, 1]); }
    gfx.rects(list, color, a);
  }
  const draw = (s, x, y, variant = 'c', alpha = 1) => gfx.img(s[variant] || s.c, Math.round(x), Math.round(y), alpha);

  // ---------- script helpers ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const tween = (ms, fn) => new Promise(res => { const t0 = now(); const step = () => { const t = Math.min(1, (now() - t0) / ms); fn(t); if (t < 1) setTimeout(step, 16); else res(); }; step(); });
  const ease = t => 1 - (1 - t) ** 3;
  let tapWaiter = null, busyNow = false;
  // Game buttons along the bottom (full-screen layout only).
  const buttons = () => { const w = 63, g = 6; return ['catch', 'hatch', 'dex', 'dress'].map((id, i) => ({ id, x: 8 + i * (w + g), y: BAR_Y, w, h: 36 })); };
  /** Tap at virtual (x, y): finishes or advances dialogue, otherwise presses a game button. */
  function tap(x, y) {
    const b = view.box;
    if (b && b.shown < b.total) { b.shown = b.total; return; }
    if (tapWaiter) { sound('tap'); const w = tapWaiter; tapWaiter = null; w(); return; }
    if (busyNow || view.scene !== 'home' || x == null || BAR_Y >= H) return;
    for (const btn of buttons()) if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y - 4 && y <= btn.y + btn.h + 6) { view.pressed = { id: btn.id, t0: now() }; sound('tap'); hooks.onAction && hooks.onAction(btn.id); return; }
  }
  function drawButtons(t) {
    if (BAR_Y >= H) return;
    const pending = G.pending || 0, eggReady = G.egg.progress >= G.egg.target;
    for (const b of buttons()) {
      let fillC = DARK, border = '#f2ead8', color = '#f6f1e6', label = S[b.id === 'catch' ? 'capture' : b.id] || b.id;
      if (b.id === 'catch') {
        if (pending) { label = `${label} ${pending}`; fillC = '#ffd43b'; border = Math.floor(t / 420) % 2 ? '#fff8d6' : '#8a4e14'; color = DARK; }
        else { color = '#6f7394'; border = '#3a3d5c'; }
      }
      if (b.id === 'hatch' && eggReady) { fillC = '#cfd8f7'; border = '#ffd43b'; color = DARK; }
      const down = view.pressed && view.pressed.id === b.id && now() - view.pressed.t0 < 140 ? 2 : 0;
      rect(b.x + 1, b.y + 3, b.w, b.h, '#05060c', 0.55);
      panel(b.x, b.y + down, b.w, b.h, fillC, border, 1);
      text(label, b.x + (b.w - textW(label)) / 2, b.y + 11 + down, color);
    }
  }
  async function say(l1, l2 = '', who = null) {
    const total = Array.from(l1).length + Array.from(l2).length;
    view.box = { l1, l2, who, shown: 0, total, waiting: false };
    while (view.box.shown < total) { await wait(26); if (view.box.shown < total) { view.box.shown++; if (view.box.shown % 3 === 0) sound('blip'); } }
    view.box.waiting = true;
    await new Promise(r => { tapWaiter = r; });
    view.box = null;
  }
  const fadeOut = () => tween(320, t => { view.fade = t; });
  const fadeIn = () => tween(320, t => { view.fade = 1 - t; });
  async function flashes(n = 2) { for (let i = 0; i < n; i++) { await tween(90, t => { view.flash = t; }); await tween(140, t => { view.flash = 1 - t; }); } view.flash = 0; }
  function burst(x, y, n = 10, colors = ['#ffffff', '#ffd43b', '#fff1a8']) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.3, s = 1.2 + Math.random() * 1.2; view.stars.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: 40 + (Math.random() * 14 | 0), c: colors[i % colors.length] }); } }

  let queue = Promise.resolve();
  function play(kind, fn) {
    queue = queue.then(async () => {
      busyNow = true; hooks.onBusy && hooks.onBusy(true, kind);
      try { await fn(); } catch (e) { /* keep the queue alive */ }
      view.box = null;
      busyNow = false; hooks.onBusy && hooks.onBusy(false, kind);
      hooks.onDone && hooks.onDone(kind);
    });
  }

  // ---------- scenes ----------
  async function encounterScene(p) {
    const name = spName(p.species), type = spType(p.species);
    sound('encounter'); await flashes(2); await fadeOut();
    view.scene = 'battle'; view.enemy = { sp: p.species, x: 330, y: 126 + BO, shiny: !!p.shiny, mode: 'c', dissolve: 0, visible: true }; view.lock = null; view.banner = null;
    await fadeIn();
    await tween(700, t => { view.enemy.x = 330 - (330 - 172) * ease(t); });
    if (p.shiny) { burst(200, 150 + BO, 14, ['#ffffff', '#b7a6ff', '#ffd43b']); sound('shiny'); await say(S.shinyA || '★', S.shinyB || ''); }
    await say(p.origin === 'WATER' ? (S.waterLine || '') : (S.mealLine || ''), fill(S.appear && S.appear[p.species], { name }));
    await say(S.throwA || '', S.throwB || '');
    sound('throw');
    const y0 = 196 + BO;
    view.lock = { x: 70, y: y0, open: true, shake: 0, spin: 1 };
    const tx = 191, ty = 112 + BO;
    await tween(560, t => { const L = view.lock; L.x = 70 + (tx - 70) * t; L.y = y0 + (ty - y0) * t - Math.sin(t * Math.PI) * 54; });
    view.lock.spin = 0; view.enemy.mode = 'white'; view.beam = 1;
    await tween(520, t => { view.enemy.dissolve = t; if (Math.random() < 0.6) view.stars.push({ x: 172 + Math.random() * 56, y: 128 + BO + Math.random() * 52, vx: (tx + 9 - 200) * 0.02, vy: (ty + 10 - 150 - BO) * 0.03, life: 22, c: '#fff1a8' }); });
    view.enemy.visible = false; view.beam = 0;
    await tween(260, t => { view.lock.y = ty + (162 + BO - ty) * t * t; });
    for (let i = 0; i < 3; i++) { await wait(340); sound('wobble'); await tween(280, t => { view.lock.shake = Math.round(Math.sin(t * Math.PI * 2) * 3); }); view.lock.shake = 0; }
    await wait(240);
    view.lock.open = false; sound('click'); await wait(120);
    burst(view.lock.x + 9, view.lock.y + 10, 16); sound('win');
    view.banner = { t0: now() };
    await wait(600);
    await say(fill(S.caughtA, { name }), fill(S.caughtB, { type }));
    if (p.isNew) await say(S.newA || '', fill(S.newB, { n: p.dexCount, total: G.total }));
    await fadeOut(); view.scene = 'home'; view.enemy = null; view.lock = null; view.banner = null; await fadeIn();
  }
  async function hatchScene(p) {
    const name = spName(p.species), type = spType(p.species);
    await say(S.hatchReadyA || '', S.hatchReadyB || '');
    view.scene = 'hatch'; view.eggCrack = 0; view.hatched = null;
    await tween(400, t => { view.dim = t; });
    for (let i = 1; i <= 3; i++) { await wait(380); sound('wobble'); await tween(340, t => { view.eggShake = Math.round(Math.sin(t * Math.PI * 4) * 3); }); view.eggShake = 0; view.eggCrack = i; }
    await wait(250); sound('hatch'); await flashes(2);
    view.hatched = p.species; view.hatchedShiny = !!p.shiny; burst(144, OY + 26, 18, ['#ffffff', '#cfd8f7', '#ffd43b']);
    await say(S.hatchA || '', fill(S.hatchB, { name, type }));
    await say(S.hatchNoteA || '', S.hatchNoteB || '');
    if (p.isNew) await say(S.newA || '', fill(S.newB, { n: p.dexCount, total: G.total }));
    await tween(400, t => { view.dim = 1 - t; });
    view.scene = 'home'; view.hatched = null;
    await say(S.newEggA || '', fill(S.newEggB, { steps: (G.egg.target || 5000).toLocaleString() }));
  }
  async function unlockScene(p) {
    await say(fill(S.unlockA, { days: p.days }), fill(S.unlockB, { name: G.name }));
    sound('evolve');
    view.fx = { rays: 0, swap: false };
    await tween(600, t => { view.fx.rays = t; });
    let d = 220;
    for (let i = 0; i < 8; i++) { view.fx.swap = i % 2 === 0; await wait(d); d = Math.max(60, d * 0.8); }
    await flashes(2);
    view.fx = null;
    burst(142, OY + 16, 20); sound('win');
    await say(fill(S.unlockedA, { item: p.item }), S.unlockedB || '');
  }
  async function dexScene() {
    await fadeOut(); view.scene = 'dex'; await fadeIn();
    await new Promise(r => { tapWaiter = r; });
    await fadeOut(); view.scene = 'home'; await fadeIn();
  }
  async function greetScene() { await say(fill(S.greet1a, { name: G.name }), S.greet1b || '', G.name); await say(S.greet2a || '', S.greet2b || '', G.name); }

  // ---------- drawing ----------
  const motes = Array.from({ length: 16 }, (_, k) => ({ x: 150 + hash(k, 1) * 70, y: OY - 34 + hash(k, 2) * 90, s: 0.1 + hash(k, 3) * 0.2, p: hash(k, 4) * 6 }));
  const pollen = Array.from({ length: 30 }, (_, k) => ({ x: hash(k, 7) * W, y: HZ - 6 + hash(k, 8) * (H - HZ), s: 0.15 + hash(k, 9) * 0.3, p: hash(k, 10) * 6 }));
  const blinkNow = (t, seed = 0) => ((t + seed * 977) % 3600) < 140;
  const inShaftScreen = (x, y) => { const a = (x + .5 - OX) / TW, c = (y + .5 - OY) / TH, i = (a + c) / 2, j = (c - a) / 2; return i > 2.6 && i < 6.2 && j > -0.5 && j < 4.2; };

  function drawHUD() {
    const days = fill(S.daysLogged, { n: G.level });
    panel(6, TOP + 6, textW(days) + 16, 18, DARK, null, 0.8); text(days, 14, TOP + 8, '#ffd43b');
    const steps = fill(S.steps, { a: Math.round(G.egg.progress).toLocaleString(), b: (G.egg.target || 5000).toLocaleString() });
    panel(6, TOP + 28, textW(steps) + 30, 18, DARK, null, 0.8); draw(prop('iconEgg'), 11, TOP + 31); text(steps, 25, TOP + 30, '#f6f1e6');
    const label = S.today || '', lw = textW(label);
    panel(W - lw - 52, TOP + 6, lw + 46, 18, DARK, null, 0.8); text(label, W - lw - 46, TOP + 8, '#a2a8df');
    const cap = G.today.cap || 3;
    for (let i = 0; i < cap; i++) draw(prop('lockMini'), W - 40 + i * 11, TOP + 8, 'c', i < cap - G.today.encounters ? 1 : 0.25);
  }
  function drawRoom(t, showHud) {
    gfx.img(ROOM, 0, 0);
    shadowEllipse(...iso(0.65, 4.7, 0), 28, 12, 0.10 + Math.sin(t / 700) * 0.02, '#ffd98a');
    const dust = [];
    for (const m of motes) { const y = m.y - ((t * m.s / 60) % 90), x = m.x + Math.sin(t / 900 + m.p) * 4; if (inShaftScreen(x, y)) dust.push([Math.round(x), Math.round(y), 1, 1]); }
    gfx.rects(dust, '#fff6d0', 0.85);
    const [ex, ey] = iso(6.95, 3.15, 5);
    const wig = G.egg.progress >= G.egg.target - 1000 && Math.floor(t / 260) % 4 === 0 ? 1 : 0;
    if (view.scene !== 'hatch') draw(prop('egg'), ex - 11 + wig, ey - 24);
    const [px, py] = iso(4.3, 4.5, 0), bob = Math.floor(t / 450) % 2;
    shadowEllipse(px, py - 1, 18, 4, 0.32);
    const fx = view.fx, av = avatar();
    if (fx) {
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + t / 900; gfx.poly([px, py - 26, px + Math.cos(a) * 160, py - 26 + Math.sin(a) * 160, px + Math.cos(a + 0.16) * 160, py - 26 + Math.sin(a + 0.16) * 160], '#ffe580', 0.22 * fx.rays); }
      draw(av, px - 28, py - 62, fx.swap ? 'white' : 'c');
    } else draw(av, px - 28, py - 62 + bob, blinkNow(t) ? 'blink' : 'c');
    if (showHud) drawHUD();
  }
  function drawHome(t) {
    drawRoom(t, true);
    if (!view.box) {
      const y = CARD_Y;
      panel(6, y, 276, 68);
      text(G.name, 16, y + 9, '#ffd43b');
      const nw = textW(G.name), lv = fill(S.lv, { n: G.level });
      panel(22 + nw, y + 8, textW(lv) + 12, 15, '#3a3d5c', null, 1); text(lv, 28 + nw, y + 9, '#f6f1e6');
      const dx = fill(S.dexShort, { n: dexCount(), total: G.total });
      text(dx, 272 - textW(dx), y + 9, '#a2a8df');
      if (G.pending > 0) { text(fill(S.cardPending, { n: G.pending }), 16, y + 29, '#ffd43b'); text(S.cardPendingHint || '', 16, y + 47, '#c9c3d6'); }
      else { text(S.cardHint1 || '', 16, y + 29, '#f6f1e6'); text(S.cardHint2 || '', 16, y + 47, '#c9c3d6'); }
    }
    if (!busyNow && !view.box) drawButtons(t);
  }
  function drawHatch(t) {
    drawRoom(t, false);
    rect(0, 0, W, H, '#0b0c18', 0.6 * view.dim);
    if (view.dim < 0.5) return;
    for (let r = 46; r > 0; r -= 6) shadowEllipse(144, OY + 56, r * 1.5, r * 0.42, 0.06, '#ffe9a8');
    shadowEllipse(144, OY + 56, 18, 4, 0.35);
    if (view.hatched) {
      if (view.hatchedShiny) gfx.img(shinyOf(view.hatched, false), 116, OY + 2);
      else draw(creature(view.hatched), 116, OY + 2 + Math.floor(t / 400) % 2, blinkNow(t, 3) ? 'blink' : 'c');
    } else {
      const x = 124 + view.eggShake, y = OY + 10;
      draw(prop('eggBig'), x, y);
      const cracks = [[[19, 10], [23, 16], [19, 21], [24, 26]], [[30, 24], [26, 30], [31, 34]], [[9, 22], [13, 28], [10, 33]]];
      const dark = [], glow = [];
      for (let i = 0; i < view.eggCrack; i++) { const c = cracks[i]; for (let k = 0; k < c.length - 1; k++) { const [x0, y0] = c[k], [x1, y1] = c[k + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let s = 0; s <= n; s++) { const X = x + Math.round(x0 + (x1 - x0) * s / n), Y = y + Math.round(y0 + (y1 - y0) * s / n); dark.push([X, Y, 1, 1]); glow.push([X + 1, Y, 1, 1]); } } }
      gfx.rects(dark, '#4a2a10', 1); gfx.rects(glow, '#ffe580', 1);
    }
  }
  function drawBattle(t) {
    gfx.img(MEADOW, 0, 0);
    gfx.rects(pollen.map(p => [Math.round((p.x + t * p.s / 40) % W), Math.round(p.y + Math.sin(t / 700 + p.p) * 5), 1, 1]), '#fff6c8', 0.8);
    const e = view.enemy;
    if (e && e.visible) {
      const bob = e.mode === 'white' ? 0 : Math.floor(t / 400) % 2;
      shadowEllipse(e.x + 28, 180 + BO, 20, 4, 0.3);
      const s = creature(e.sp), blink = blinkNow(t, 1);
      const src = e.mode === 'white' ? s.white : e.shiny ? shinyOf(e.sp, blink) : (blink ? s.blink : s.c);
      if (e.dissolve > 0) {
        const keep = [];
        for (let y = 0; y < 56; y += 2) for (let x = 0; x < 56; x += 2) if (bay(x >> 1, y >> 1) >= e.dissolve) keep.push([Math.round(e.x) + x, e.y + y, 2, 2]);
        gfx.imgClipped(src, Math.round(e.x), e.y, keep);
      } else gfx.img(src, Math.round(e.x), e.y + bob);
    }
    shadowEllipse(76, 242 + BO, 18, 4, 0.3);
    draw(avatar(), 48, 180 + BO + Math.floor(t / 450) % 2, blinkNow(t, 2) ? 'blink' : 'c');
    if (e) {
      const name = spName(e.sp), type = spType(e.sp), bx = 16 + textW(name) + 6;
      const py = TOP + 10;
      panel(8, py, Math.max(140, bx + textW(type) + 18), 42);
      text(name, 16, py + 6, '#f6f1e6');
      panel(bx, py + 6, textW(type) + 10, 15, TYPE_COLOR[e.sp], null, 1); text(type, bx + 5, py + 7, '#ffffff');
      text(e.shiny ? (S.shinyTag || '★') : fill(S.lv, { n: 3 + G.level }), 16, py + 24, e.shiny ? '#ffd43b' : '#a2a8df');
    }
    const L = view.lock;
    if (view.beam && L && e) gfx.poly([L.x + 9, L.y + 18, e.x + 4, e.y + 50, e.x + 52, e.y + 50], '#fff1a8', 0.35);
    if (L) {
      if (L.spin) gfx.rects([1, 2, 3, 4].map(k => [L.x + 9 - k * 6, L.y + 10 + k * 3, 2, 2]), '#ffe580', 0.35);
      if (!L.open) shadowEllipse(L.x + 9, 181 + BO, 9, 2, 0.3);
      draw(prop(L.open ? 'lockO' : 'lockC'), L.x + L.shake, L.y);
    }
    if (view.banner) { const k = Math.min(1, (now() - view.banner.t0) / 250); gfx.bigText('LOCKED IN!', 144, Math.round(Math.max(TOP + 64, HZ - 90) - (1 - k) * 20), '#ffd43b', '#1b1d2e'); }
  }
  function drawDex() {
    rect(0, 0, W, H, '#1c1f33');
    const dots = []; for (let y = 0; y < H; y += 6) for (let x = (y / 6 & 1) * 12; x < W; x += 24) dots.push([x, y, 1, 1]);
    gfx.rects(dots, '#2a2f55', 1);
    text(fill(S.dexTitle, { n: dexCount(), total: G.total }), 12, TOP + 10, '#ffd43b');
    const back = S.dexBack || ''; text(back, 276 - textW(back), TOP + 10, '#a2a8df');
    DEX_ORDER.forEach((sp, i) => {
      const col = i % 2, row = (i / 2) | 0, x = 8 + col * 138, y = TOP + 32 + row * 94;
      const d = G.dex && G.dex[sp], have = sp !== 'mystery' && d;
      panel(x, y, 134, 88, '#262a45', have ? TYPE_COLOR[sp] : '#3a3e5e', 1);
      rect(x + 8, y + 12, 62, 62, have ? TYPE_COLOR[sp] : '#20233a', have ? 0.22 : 1);
      text(String(i + 1).padStart(2, '0'), x + 78, y + 8, '#6f7394');
      if (have) {
        draw(creature(sp), x + 11, y + 15);
        if (d.shiny) text('★', x + 58, y + 8, '#ffd43b');
        text(spName(sp), x + 78, y + 26, '#f6f1e6');
        panel(x + 77, y + 46, textW(spType(sp)) + 10, 15, TYPE_COLOR[sp], null, 1); text(spType(sp), x + 82, y + 47, '#ffffff');
        text('×' + d.count, x + 78, y + 66, '#a2a8df');
      } else if (sp === 'mystery') {
        text('？', x + 33, y + 36, '#6f7394'); text(spType('mystery'), x + 78, y + 26, '#c9c3d6');
        text(S.mysteryHint1 || '', x + 78, y + 46, '#6f7394'); text(S.mysteryHint2 || '', x + 78, y + 64, '#6f7394');
      } else {
        draw(creature(sp), x + 11, y + 15, 'ghost'); text('？？', x + 78, y + 26, '#6f7394'); text(S.notMet || '', x + 78, y + 46, '#6f7394');
      }
    });
  }
  function textBox(b) {
    const y0 = CARD_Y;
    panel(6, y0, 276, 68);
    if (b.who) { panel(14, y0 - 11, textW(b.who) + 14, 17, '#ffd43b', null, 1); text(b.who, 21, y0 - 10, DARK); }
    const n1 = Array.from(b.l1).length;
    text(b.l1, 18, y0 + 14, '#f6f1e6', b.shown, '#0b0c18');
    text(b.l2, 18, y0 + 36, '#f6f1e6', Math.max(0, b.shown - n1), '#0b0c18');
    if (b.waiting && Math.floor(now() / 320) % 2) gfx.rects([[264, y0 + 52, 7, 1], [265, y0 + 53, 5, 1], [266, y0 + 54, 3, 1], [267, y0 + 55, 1, 1]], '#ffd43b', 1);
  }

  function render(t) {
    if (view.scene === 'home') drawHome(t); else if (view.scene === 'battle') drawBattle(t); else if (view.scene === 'hatch') drawHatch(t); else if (view.scene === 'dex') drawDex(t);
    view.stars = view.stars.filter(s => s.life > 0);
    const core = [], halo = [];
    for (const s of view.stars) { s.x += s.vx; s.y += s.vy; s.vy += 0.04; s.life--; const x = Math.round(s.x), y = Math.round(s.y); core.push([x, y, 1, 1, s.c]); if (s.life > 12) halo.push([x - 1, y, 1, 1, s.c], [x + 1, y, 1, 1, s.c], [x, y - 1, 1, 1, s.c], [x, y + 1, 1, 1, s.c]); }
    for (const [x, y, w, h, c] of core) gfx.rect(x, y, w, h, c, 1);
    for (const [x, y, w, h, c] of halo) gfx.rect(x, y, w, h, c, 0.6);
    if (view.box) textBox(view.box);
    if (view.flash > 0) rect(0, 0, W, H, '#ffffff', view.flash);
    if (view.fade > 0) {
      const cells = []; for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) if (bay(x >> 2, y >> 2) < view.fade) cells.push([x, y, 4, 4]);
      gfx.rects(cells, '#0b0c18', 1);
    }
  }

  function cmd(c) {
    if (!c || !c.type) return;
    if (c.type === 'strings') S = c.strings || {};
    else if (c.type === 'state') G = Object.assign({}, G, c.state || {});
    else if (c.type === 'look') { G.look = Object.assign({}, G.look, c.look || {}); if (c.name) G.name = c.name; }
    else if (c.type === 'play') {
      const p = c.payload || {};
      if (c.kind === 'encounter') play('encounter', () => encounterScene(p));
      else if (c.kind === 'hatch') play('hatch', () => hatchScene(p));
      else if (c.kind === 'unlock') play('unlock', () => unlockScene(p));
      else if (c.kind === 'dex') play('dex', dexScene);
      else if (c.kind === 'greet') play('greet', greetScene);
    }
  }

  return { cmd, tap, render, W, H };
}
