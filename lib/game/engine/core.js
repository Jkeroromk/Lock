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
let H = 320, TOP = 0, BOT = 0, SAFEB = 0, CARD_Y = 240, HZ = 146, BO = 0, GY = 170, CL = 334;

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
const cloud = (ramp = R.cloud) => spriteBufs(52, 22, [{ t: 'e', cx: 14, cy: 14, rx: 10, ry: 7, ramp }, { t: 'e', cx: 27, cy: 10, rx: 12, ry: 9, ramp }, { t: 'e', cx: 39, cy: 14, rx: 10, ry: 7, ramp }, { t: 'e', cx: 26, cy: 16, rx: 22, ry: 5, ramp }]);
const cloudS = (ramp = R.cloud) => spriteBufs(34, 16, [{ t: 'e', cx: 11, cy: 10, rx: 8, ry: 5, ramp }, { t: 'e', cx: 20, cy: 8, rx: 9, ry: 6.5, ramp }, { t: 'e', cx: 17, cy: 11, rx: 15, ry: 4, ramp }]);
const tree = () => spriteBufs(34, 34, [{ t: 'e', cx: 11, cy: 20, rx: 9, ry: 8, ramp: R.pine }, { t: 'e', cx: 23, cy: 19, rx: 9, ry: 8.5, ramp: R.pine }, { t: 'e', cx: 17, cy: 12, rx: 10, ry: 9, ramp: R.pine }, { t: 'e', cx: 17, cy: 24, rx: 13, ry: 6, ramp: R.pine }]);
const bush = () => spriteBufs(24, 16, [{ t: 'e', cx: 8, cy: 10, rx: 7, ry: 5.5, ramp: R.green }, { t: 'e', cx: 16, cy: 9, rx: 7, ry: 6, ramp: R.green }, { t: 'e', cx: 12, cy: 11, rx: 10, ry: 4, ramp: R.green }]);

const stampAt = (b, src, x, y, ax, ay) => b.stamp(src, Math.round(x - ax), Math.round(y - ay));

// ======================= home yard (side view) =======================
// The player's homestead: sky, hills and a tree line behind a fenced yard,
// with things to tap (mirror, incubator, dex board, wild gate) and the
// yard's edge dropping into a cliff under the tab bar.
const WOODR = ['#3b2219', '#5a3424', '#7a4a2c', '#a86d42', '#c78b55', '#e0a96e'];
const GLASS = ['#2f4f7c', '#4f7fb4', '#7fb2e0', '#b4daf6', '#e4f4ff'];
const HOME_PROPS = {
  incubator: () => spriteBufs(44, 58, [
    { t: 'e', cx: 22, cy: 51, rx: 19, ry: 6.5, rz: 6, p: 3, ramp: R.metal },
    { t: 'e', cx: 22, cy: 45, rx: 16, ry: 2.6, rz: 2.5, z: 5, ramp: R.yellow },
    { t: 'e', cx: 22, cy: 26, rx: 15.5, ry: 18.5, rz: 15, ramp: GLASS },
    { t: 'e', cx: 22, cy: 6.5, rx: 4, ry: 3, rz: 3, z: 13, ramp: R.yellow },
  ]),
  mirror: () => spriteBufs(36, 62, [
    { t: 'e', cx: 18, cy: 58, rx: 13, ry: 3.2, rz: 3, p: 3, ramp: WOODR },
    { t: 'e', cx: 18, cy: 48, rx: 2.2, ry: 10, rz: 2, ramp: WOODR },
    { t: 'f', ramp: R.gold, f: (X, Y) => { const o = ((X - 18) / 15) ** 2 + ((Y - 25) / 21) ** 2, i = ((X - 18) / 11.5) ** 2 + ((Y - 25) / 17.5) ** 2; return o <= 1 && i > 1 ? 3 + 2 * Math.sqrt(1 - o) : -1; } },
    { t: 'f', ramp: GLASS, f: (X, Y) => { const i = ((X - 18) / 11.5) ** 2 + ((Y - 25) / 17.5) ** 2; return i <= 1 ? 1.2 + 0.8 * (1 - i) : -1; } },
    { t: 'e', cx: 18, cy: 4, rx: 4.5, ry: 3, rz: 3, z: 4, ramp: R.sakura },
  ], a => { for (let k = 0; k < 9; k++) { a.px(11 + k, Math.round(33 - k * 1.7), '#ffffff', 0.75); a.px(12 + k, Math.round(34 - k * 1.7), '#ffffff', 0.4); } }),
  board: () => spriteBufs(50, 54, [
    { t: 'e', cx: 8, cy: 42, rx: 2.4, ry: 12, rz: 2.4, p: 4, ramp: WOODR },
    { t: 'e', cx: 42, cy: 42, rx: 2.4, ry: 12, rz: 2.4, p: 4, ramp: WOODR },
    { t: 'e', cx: 25, cy: 27, rx: 22, ry: 15, rz: 3, p: 8, z: 2, ramp: WOODR },
    { t: 'f', ramp: R.red, f: (X, Y) => { if (Y < 2 || Y > 12.5) return -1; const hw = 6 + (Y - 2) * 2.1; return Math.abs(X - 25) > hw ? -1 : 6 + (12 - Y) * 0.3; } },
  ]),
  gate: () => spriteBufs(56, 62, [
    { t: 'e', cx: 7, cy: 35, rx: 3.2, ry: 24, rz: 3, p: 4, ramp: WOODR },
    { t: 'e', cx: 49, cy: 35, rx: 3.2, ry: 24, rz: 3, p: 4, ramp: WOODR },
    { t: 'e', cx: 28, cy: 10, rx: 27, ry: 3.4, rz: 3, p: 4, z: 1, ramp: WOODR },
    { t: 'e', cx: 28, cy: 17, rx: 21, ry: 2, rz: 2, p: 4, ramp: WOODR },
    { t: 'f', ramp: R.green, f: (X, Y) => { if (Y < 40) return -1; for (let k = 0; k < 9; k++) { const sx = 2 + k * 6.5 + (k % 2) * 1.5, top = 40 + (k % 3) * 3; if (Y >= top && Math.abs(X - sx) <= (Y - top) * 0.34 + 0.5) return 4; } return Y > 54 ? 3 : -1; } },
  ]),
};

const ROOF = ['#1e2f5a', '#2c4a86', '#3d68b0', '#5a8fd6', '#86b6f0'];
// The cottage behind the fence, bottom centre at (COT_X, GY + 6); windows glow at night.
const COT_X = 140, COT_WIN = [[19, 52], [67, 52]];
HOME_PROPS.cottage = () => spriteBufs(96, 86, [
  { t: 'e', cx: 48, cy: 63, rx: 35, ry: 22, rz: 4, p: 10, ramp: R.cream },
  { t: 'e', cx: 72, cy: 16, rx: 4.5, ry: 8, rz: 3, p: 6, z: 9, ramp: R.red },
  { t: 'f', ramp: ROOF, f: (X, Y) => { if (Y < 12 || Y > 45) return -1; const hw = 20 + (Y - 12) * 0.86; return Math.abs(X - 48) > hw ? -1 : (45 - Y) * 0.3 + 7; } },
], a => {
  a.rect(41, 62, 14, 23, '#7a4a2c'); a.rect(42, 63, 12, 22, '#a86d42'); a.rect(47, 63, 1, 22, '#7a4a2c'); a.rect(51, 73, 2, 2, '#ffd43b');
  for (const [wx, wy] of COT_WIN) { a.rect(wx - 1, wy - 1, 12, 11, '#5a3424'); a.rect(wx, wy, 10, 9, '#8fcbff'); a.rect(wx + 4, wy, 1, 9, '#5a3424'); a.rect(wx, wy + 4, 10, 1, '#5a3424'); a.rect(wx + 1, wy + 1, 2, 2, '#e4f4ff'); a.rect(wx - 2, wy + 10, 14, 2, '#c78b55'); }
  for (let x = 13; x <= 83; x++) if (a.isBody(x, 46)) a.px(x, 46, '#1e2f5a');
});
HOME_PROPS.bigTree = () => spriteBufs(76, 96, [
  { t: 'e', cx: 38, cy: 78, rx: 6, ry: 18, rz: 5, p: 3, ramp: WOODR },
  { t: 'e', cx: 22, cy: 50, rx: 18, ry: 15, ramp: R.green }, { t: 'e', cx: 54, cy: 48, rx: 19, ry: 16, ramp: R.green },
  { t: 'e', cx: 38, cy: 28, rx: 22, ry: 19, ramp: R.green }, { t: 'e', cx: 38, cy: 58, rx: 28, ry: 10, ramp: R.green },
], a => { for (const [x, y] of [[30, 20], [44, 30], [20, 46], [56, 40], [36, 52]]) { a.px(x, y, '#b8ee86'); a.px(x + 1, y, '#86c95e'); } for (const [x, y] of [[26, 36], [50, 56], [34, 44]]) { a.px(x, y, '#ff8158'); a.px(x + 1, y, '#de503e'); a.px(x, y + 1, '#ad2f38'); } });

const SKIES = {
  day: ['#4f9fe8', '#62b0f0', '#79c0f6', '#93cffa', '#b0ddfc', '#cfeafd', '#e8f5ff'],
  dusk: ['#2c2b62', '#4a3a78', '#7a4a86', '#b25a7e', '#e2786e', '#f7a46a', '#ffd08a'],
  night: ['#080b24', '#0d1233', '#131a42', '#1a2352', '#222d60', '#2c386e', '#37447c'],
};
const HILLS = {
  day: [['#9cc0dc', '#b8d4ea'], ['#7fb79a', '#9fcfb0']],
  dusk: [['#8a6a9a', '#a884ad'], ['#5f6f86', '#7a8aa0']],
  night: [['#26305e', '#323c70'], ['#1d2a48', '#28385a']],
};
const CLOUDS = {
  day: R.cloud,
  dusk: ['#7a4a7e', '#a8628a', '#d98a92', '#f4b3a6', '#ffd9c4'],
  night: ['#151c46', '#1c2556', '#252f66', '#2f3a74', '#3a4682'],
};
/** Sky follows the player's local time. */
export const phaseAt = (hour) => (hour >= 19 || hour < 5 ? 'night' : hour >= 17 || hour < 7 ? 'dusk' : 'day');

function buildHome(phase) {
  const b = new Buf(W, H), sky = SKIES[phase], n = sky.length - 1, end = GY + 2;
  for (let y = 0; y < end; y++) for (let x = 0; x < W; x++) b.set(x, y, sky[clamp(Math.floor((y / end) * n + bay(x, y) * 0.9 - 0.1), 0, n)]);
  const glow = (cx, cy, core, rim, halo, r0, r1, r2) => {
    for (let y = cy - r2; y <= cy + r2; y++) for (let x = cx - r2; x <= cx + r2; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < r0) b.set(x, y, core); else if (d < r1) b.set(x, y, rim); else if (d < r2 && bay(x, y) < (r2 - d) / (r2 * 1.1)) b.set(x, y, halo);
    }
  };
  if (phase === 'night') {
    for (let k = 0; k < 110; k++) {
      const x = (hash(k, 31) * W) | 0, y = (hash(k, 37) * (GY - 50)) | 0;
      b.set(x, y, hash(k, 41) > 0.75 ? '#ffffff' : hash(k, 43) > 0.45 ? '#cfd8f7' : '#6f7ab4');
      if (hash(k, 47) > 0.92) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, '#6f7ab4');
    }
    const mx = 222, my = TOP + 96;
    for (let y = -26; y <= 26; y++) for (let x = -26; x <= 26; x++) {
      const d = Math.hypot(x, y), X = mx + x, Y = my + y;
      if (d < 11 && Math.hypot(x + 5, y - 3) > 9) b.set(X, Y, d > 9.6 ? '#e6dca8' : '#fff6cf');
      else if (d < 26 && d >= 11 && bay(X, Y) < (26 - d) / 46) b.set(X, Y, '#34407e');
    }
  } else if (phase === 'day') glow(230, TOP + 82, '#fffbe6', '#fff0b0', '#e6f5ff', 10, 13, 32);
  else glow(68, GY - 44, '#fff0c0', '#ffd08a', '#ffb98a', 15, 19, 48);
  const cl = cloud(CLOUDS[phase]), cs = cloudS(CLOUDS[phase]), skyH = GY - TOP;
  stampAt(b, cl.c, 64, TOP + skyH * 0.22, 26, 11);
  stampAt(b, cs.c, 176, TOP + skyH * 0.38, 17, 8);
  stampAt(b, cl.c, 250, TOP + skyH * 0.56, 26, 11);
  stampAt(b, cs.c, 30, TOP + skyH * 0.66, 17, 8);
  // Hills and a tree line along the horizon.
  const [far, mid] = HILLS[phase];
  for (let x = 0; x < W; x++) {
    const h1 = GY - 58 + Math.sin(x * 0.026 + 0.7) * 10 + Math.sin(x * 0.071 + 1) * 4;
    for (let y = Math.floor(h1); y < GY; y++) b.set(x, y, y < h1 + 1.5 ? far[1] : far[0]);
    const h2 = GY - 38 + Math.sin(x * 0.043 + 2) * 7;
    for (let y = Math.floor(h2); y < GY; y++) b.set(x, y, y < h2 + 1.5 ? mid[1] : mid[0]);
  }
  const tr = tree();
  for (let k = 0; k < 16; k++) {
    const x = Math.round(k * 19 - 10 + hash(k, 51) * 8), y = Math.round(GY - 34 + hash(k, 52) * 8);
    b.stamp(tr.c, x, y);
  }
  // Grass.
  const GR = ['#22512f', '#2d6838', '#3a8040', '#4d9a48', '#66b352', '#86c95e'], depth = Math.max(1, CL - GY);
  for (let y = GY - 4; y < Math.min(H, CL + 8); y++) for (let x = 0; x < W; x++) b.set(x, y, GR[clamp(Math.floor(4.6 - ((y - GY) / depth) * 2.6 + bay(x, y) * 0.9 - 0.4), 0, 5)]);
  const ct = HOME_PROPS.cottage(), bt = HOME_PROPS.bigTree();
  stampAt(b, bt.c, 26, GY + 8, 38, 96);
  stampAt(b, ct.c, COT_X, GY + 6, 48, 86);
  // Fence along the back of the yard (the gate stands in its gap).
  const fy = GY - 2;
  for (let x = 0; x < 226; x++) {
    for (const ry of [fy + 5, fy + 11]) { b.set(x, ry, WOODR[4]); b.set(x, ry + 1, WOODR[2]); }
    if (x % 16 === 4) for (let y = fy; y < fy + 17; y++) { b.set(x, y, WOODR[4]); b.set(x + 1, y, WOODR[3]); b.set(x + 2, y, WOODR[1]); }
  }
  const patch = (cx, cy, rx, ry) => {
    const D = ['#5a3c26', '#7a5434', '#9a6e44', '#bb8d5a', '#d5ab76'];
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d > 1) continue; b.set(x, y, D[clamp(Math.floor(3.2 - d * 1.6 - (y - cy) / ry * 0.6 + (bay(x, y) - .5) * .8), 0, 4)]); }
    for (let x = cx - rx; x <= cx + rx; x += 2) { const e = cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)); b.set(x, Math.round(e), '#86c95e'); b.set(x + 1, Math.round(e) - 1, '#66b352'); }
  };
  const plaza = [144, GY + 86, 64, 13], lane = [252, GY + 40, 28, 7];
  patch(...plaza); patch(...lane);
  const onDirt = (x, y, m) => ((x - plaza[0]) / (plaza[2] + m)) ** 2 + ((y - plaza[1]) / (plaza[3] + m)) ** 2 < 1 || ((x - lane[0]) / (lane[2] + m)) ** 2 + ((y - lane[1]) / (lane[3] + m)) ** 2 < 1;
  for (let k = 0; k < 420; k++) {
    const x = (hash(k, 11) * W) | 0, y = GY + 18 + ((hash(k, 13) * Math.max(1, CL - GY - 22)) | 0);
    if (onDirt(x, y, 2)) continue;
    b.set(x, y, '#9bd96a'); b.set(x - 1, y + 1, '#66b352'); b.set(x + 1, y + 1, '#66b352'); b.set(x, y + 1, '#4d9a48'); b.set(x, y + 2, '#2d6838');
  }
  const FL = ['#ffffff', '#ffd43b', '#ff9ec0', '#b7a6ff', '#ffffff'];
  for (let k = 0; k < 70; k++) {
    const x = (hash(k, 21) * W) | 0, y = GY + 20 + ((hash(k, 23) * Math.max(1, CL - GY - 26)) | 0);
    if (onDirt(x, y, 3)) continue;
    const c = FL[(hash(k, 25) * FL.length) | 0];
    b.set(x, y, c); b.set(x - 1, y, c); b.set(x + 1, y, c); b.set(x, y - 1, c); b.set(x, y, '#ffcf3a'); b.set(x, y + 1, '#2d6838');
  }
  const bu = bush();
  for (const [x, y] of [[4, GY + 22], [272, GY + 70], [192, GY + 62]]) b.stamp(bu.c, x - 12, y - 10);
  // The yard ends in a cliff; below it is dark, so the tab bar reads clearly.
  if (CL < H) {
    const CLIFF = ['#6a4630', '#5a3a26', '#4a2e1e', '#3a2418', '#2a1a12', '#1c120e'];
    for (let x = 0; x < W; x++) {
      const edge = CL + Math.round(Math.sin(x * 0.11) * 2 + hash(x >> 3, 5) * 3);
      for (let y = edge; y < H; y++) {
        const d = y - edge;
        let c;
        if (d < 2) c = '#2d6838'; else if (d < 4) c = '#22512f';
        else if (d < 56) { c = CLIFF[clamp(Math.floor(d / 11 + bay(x, y) * 0.9 - 0.3), 0, 5)]; if ((y - edge) % 10 === 9 || ((x + ((y - edge) / 10 | 0) * 7) % 23 === 0 && d > 6)) c = '#1c120e'; }
        else c = bay(x, y) < Math.min(1, (d - 56) / 30) ? '#0d0f1c' : '#1c120e';
        b.set(x, y, c);
      }
      if (hash(x, 9) > 0.86) { const len = 4 + (hash(x, 10) * 14 | 0); for (let k = 0; k < len; k++) b.set(x, edge + 2 + k, k % 3 === 2 ? '#3a8040' : '#2d6838'); }
    }
  }
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
const disc = (cx, cy, r) => { const list = []; for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)) + 0.35); list.push([cx - hw, cy + y, hw * 2 + 1, 1]); } return list; };

export function createEngine(gfx, hooks = {}, opts = {}) {
  // Fill whatever screen we get: width is always 288 virtual pixels.
  H = Math.max(BASE_H, Math.round(opts.height || BASE_H));
  TOP = Math.max(0, Math.round(opts.top || 0));
  BOT = Math.max(0, Math.round(opts.bottom || 0));
  SAFEB = Math.max(0, Math.round(opts.safeBottom || 0));
  CARD_Y = H - SAFEB - 80;
  HZ = Math.max(146, CARD_Y - 112);
  BO = HZ - 146;
  GY = Math.max(TOP + 130, H - BOT - 186);
  CL = H - BOT + 14;
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
  function prop(name) { let s = imgCache.get('pr:' + name); if (!s) { s = toImages((PROPS[name] || HOME_PROPS[name])()); imgCache.set('pr:' + name, s); } return s; }
  function avatar() {
    const key = 'av:' + JSON.stringify(G.look || {});
    let s = imgCache.get(key);
    if (!s) { s = toImages(avatarBufs(G.look)); imgCache.set(key, s); }
    return s;
  }
  const hourNow = () => new Date().getHours();
  let phase = opts.phase || phaseAt(hourNow()), phaseChecked = 0;
  let HOME = gfx.image(buildHome(phase));
  let MEADOW = null;
  const meadow = () => MEADOW || (MEADOW = gfx.image(buildMeadow()));

  // ---------- state from the app ----------
  let S = {};
  let G = { name: '', level: 1, days: 0, nextDays: null, prevDays: 0, look: {}, egg: { progress: 0, target: 5000 }, today: { encounters: 0, cap: 3 }, pending: 0, wild: [], dex: {}, total: 6 };
  const spName = sp => (S.species && S.species[sp] && S.species[sp].name) || sp;
  const spType = sp => (S.species && S.species[sp] && S.species[sp].type) || '';
  const dexCount = () => Object.keys(G.dex || {}).length;
  const eggReady = () => G.egg.progress >= G.egg.target;

  const view = { scene: 'home', box: null, enemy: null, lock: null, stars: [], fade: 0, flash: 0, fx: null, eggShake: 0, eggCrack: 0, hatched: null, banner: null, beam: 0, dim: 0, bubble: null, avJump: 0, pets: {} };

  // ---------- layout ----------
  // Things in the yard: x is the centre, f the y of their feet.
  const SPOTS = [
    { id: 'dress', sprite: 'mirror', x: 32, f: GY + 54, w: 36, h: 62, label: 'dress' },
    { id: 'hatch', sprite: 'incubator', x: 88, f: GY + 34, w: 44, h: 58, label: 'hatch' },
    { id: 'dex', sprite: 'board', x: 214, f: GY + 34, w: 50, h: 54, label: 'dex' },
    { id: 'catch', sprite: 'gate', x: 256, f: GY + 54, w: 56, h: 62, label: 'wild' },
  ];
  const AV = { x: 144, f: GY + 104 };
  const PET_SLOTS = [{ x: 76, f: GY + 118 }, { x: 214, f: GY + 118 }];
  const TRACK = { x: 6, y: H - BOT - 52, w: 184, h: 46 };
  const CY = Math.round(GY - 20);   // centre of the hatch spotlight

  // ---------- drawing helpers ----------
  const T = { size: 12, weight: '600' };
  const text = (str, x, y, color, chars = Infinity, shadow = null) => {
    if (!str || chars <= 0) return;
    const s = chars >= str.length ? str : Array.from(str).slice(0, chars).join('');
    gfx.text(s, x, y, { color, shadow, size: T.size, weight: T.weight });
  };
  const textW = (str) => Math.ceil(gfx.measure(str, T));
  /** Outlined text drawn straight on the scene (HUD, captions). */
  const label = (str, x, y, color = '#ffffff', size = 11, edge = '#141626', weight = '700') => { if (str) gfx.text(String(str), x, y, { color, size, weight, edge }); };
  const labelW = (str, size = 11, weight = '700') => Math.ceil(gfx.measure(String(str || ''), { size, weight }));
  const rect = (x, y, w, h, c, a = 1) => gfx.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c, a);
  function panel(x, y, w, h, fillC = DARK, border = '#f2ead8', alpha = 0.94) {
    rect(x + 2, y, w - 4, h, fillC, alpha); rect(x, y + 2, 2, h - 4, fillC, alpha); rect(x + w - 2, y + 2, 2, h - 4, fillC, alpha);
    if (border) { rect(x + 2, y, w - 4, 1, border); rect(x + 2, y + h - 1, w - 4, 1, border); rect(x, y + 2, 1, h - 4, border); rect(x + w - 1, y + 2, 1, h - 4, border); rect(x + 1, y + 1, 1, 1, border); rect(x + w - 2, y + 1, 1, 1, border); rect(x + 1, y + h - 2, 1, 1, border); rect(x + w - 2, y + h - 2, 1, 1, border); }
  }
  /** Soft rounded plate (HUD chips, quest tracker). */
  function plate(x, y, w, h, color = '#0b0c18', alpha = 0.55) {
    const r = Math.min(4, h >> 1), list = [];
    for (let k = 0; k < h; k++) { const e = k < r ? r - Math.round(Math.sqrt(r * r - (r - k - 0.5) ** 2)) : k >= h - r ? r - Math.round(Math.sqrt(r * r - (k - (h - r) + 0.5) ** 2)) : 0; list.push([x + e, y + k, w - e * 2, 1]); }
    gfx.rects(list, color, alpha);
  }
  function shadowEllipse(cx, cy, rx, ry, a = 0.28, color = '#0b0c18') {
    const list = [];
    for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + .5)) ** 2))); list.push([Math.round(cx - hw), Math.round(cy + y), hw * 2, 1]); }
    gfx.rects(list, color, a);
  }
  const draw = (s, x, y, variant = 'c', alpha = 1) => gfx.img(s[variant] || s.c, Math.round(x), Math.round(y), alpha);
  function badge(x, y) {
    gfx.rects(disc(x, y, 6), '#ffffff', 1); gfx.rects(disc(x, y, 5), '#e8433a', 1);
    rect(x, y - 3, 1, 4, '#ffffff'); rect(x, y + 2, 1, 1, '#ffffff');
  }
  function bookIcon(x, y) { rect(x, y + 1, 10, 8, '#f3e8cd'); rect(x, y, 4, 9, '#de503e'); rect(x + 5, y, 5, 1, '#f3e8cd'); rect(x + 6, y + 3, 3, 1, '#b39d7c'); rect(x + 6, y + 5, 3, 1, '#b39d7c'); }
  function speech(str, cx, bottom) {
    const w = labelW(str, 11, '600') + 14, h = 20, x = clamp(Math.round(cx - w / 2), 4, W - w - 4), y = bottom - h - 4;
    plate(x - 1, y - 1, w + 2, h + 2, '#141626', 1); plate(x, y, w, h, '#fffaf0', 1);
    gfx.poly([cx - 4, y + h - 1, cx + 4, y + h - 1, cx, y + h + 4], '#141626', 1);
    gfx.poly([cx - 3, y + h - 1, cx + 3, y + h - 1, cx, y + h + 3], '#fffaf0', 1);
    gfx.text(str, x + 7, y + 3, { color: '#1b1d2e', size: 11, weight: '600' });
  }

  // ---------- script helpers ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const tween = (ms, fn) => new Promise(res => { const t0 = now(); const step = () => { const t = Math.min(1, (now() - t0) / ms); fn(t); if (t < 1) setTimeout(step, 16); else res(); }; step(); });
  const ease = t => 1 - (1 - t) ** 3;
  let tapWaiter = null, busyNow = false;

  const pets = () => DEX_ORDER.filter(sp => sp !== 'mystery' && G.dex && G.dex[sp]).slice(0, PET_SLOTS.length);
  const petPos = (i, t) => { const s = PET_SLOTS[i]; return { x: s.x + Math.sin(t / 2600 + i * 2.1) * 10, f: s.f }; };
  const say1 = (str, ms = 2600) => { if (str) view.bubble = { text: str, until: now() + ms }; };

  function hitHome(x, y, t) {
    if (x >= TRACK.x && x <= TRACK.x + TRACK.w && y >= TRACK.y && y <= TRACK.y + TRACK.h) return y < TRACK.y + 23 ? (G.pending > 0 ? 'catch' : 'log') : 'hatch';
    const list = pets();
    for (let i = 0; i < list.length; i++) { const p = petPos(i, t); if (Math.abs(x - p.x) < 24 && y > p.f - 50 && y < p.f + 2) return 'pet:' + list[i]; }
    if (Math.abs(x - AV.x) < 22 && y > AV.f - 62 && y < AV.f + 4) return 'dress';
    for (const s of SPOTS) if (Math.abs(x - s.x) < s.w / 2 + 4 && y > s.f - s.h - 6 && y < s.f + 16) return s.id;
    if (Math.abs(x - COT_X) < 46 && y > GY - 80 && y < GY + 8) return 'home';
    return null;
  }
  /** Tap at virtual (x, y): finishes or advances dialogue, otherwise taps something in the yard. */
  function tap(x, y) {
    const b = view.box;
    if (b && b.shown < b.total) { b.shown = b.total; return; }
    if (tapWaiter) { sound('tap'); const w = tapWaiter; tapWaiter = null; w(); return; }
    if (busyNow || view.scene !== 'home' || x == null) return;
    const t = now(), hit = hitHome(x, y, t);
    if (!hit) return;
    sound('tap');
    if (hit.startsWith('pet:')) { const sp = hit.slice(4); view.pets[sp] = t; say1(fill(S.petHi, { name: spName(sp) }), 1800); return; }
    if (hit === 'catch' && !(G.pending > 0)) { say1(S.bubbleNoWild); return; }
    if (hit === 'home') { say1(S.bubbleHome); return; }
    if (hit === 'dress') view.avJump = t;
    view.pressed = { id: hit, t0: t };
    hooks.onAction && hooks.onAction(hit);
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
      busyNow = true; view.bubble = null; hooks.onBusy && hooks.onBusy(true, kind);
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
    view.hatched = p.species; view.hatchedShiny = !!p.shiny; burst(144, CY + 24, 18, ['#ffffff', '#cfd8f7', '#ffd43b']);
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
    burst(AV.x, AV.f - 40, 20); sound('win');
    await say(fill(S.unlockedA, { item: p.item }), S.unlockedB || '');
  }
  async function dexScene() {
    await fadeOut(); view.scene = 'dex'; await fadeIn();
    await new Promise(r => { tapWaiter = r; });
    await fadeOut(); view.scene = 'home'; await fadeIn();
  }
  async function greetScene() { await say(fill(S.greet1a, { name: G.name }), S.greet1b || '', G.name); await say(S.greet2a || '', S.greet2b || '', G.name); }

  // ---------- drawing ----------
  const pollen = Array.from({ length: 30 }, (_, k) => ({ x: hash(k, 7) * W, y: HZ - 6 + hash(k, 8) * (H - HZ), s: 0.15 + hash(k, 9) * 0.3, p: hash(k, 10) * 6 }));
  const fireflies = Array.from({ length: 14 }, (_, k) => ({ x: hash(k, 61) * W, y: GY - 10 + hash(k, 62) * 130, p: hash(k, 63) * 6 }));
  const birds = [{ y: 0.3, s: 0.012, p: 0 }, { y: 0.36, s: 0.009, p: 120 }, { y: 0.33, s: 0.010, p: 140 }];
  const blinkNow = (t, seed = 0) => ((t + seed * 977) % 3600) < 140;
  const jumpOf = (t0, t) => { const k = (t - t0) / 380; return k >= 0 && k < 1 ? Math.round(Math.sin(k * Math.PI) * 10) : 0; };

  function drawSpot(s, t) {
    const sp = prop(s.sprite), x0 = Math.round(s.x - sp.w / 2), y0 = s.f - sp.h;
    const down = view.pressed && view.pressed.id === s.id && t - view.pressed.t0 < 140 ? 1 : 0;
    shadowEllipse(s.x, s.f - 1, s.w / 2 - 2, 3, 0.22);
    if (s.id === 'catch' && G.pending > 0 && G.wild && G.wild[0] && CREATURES[G.wild[0]]) {
      const peek = Math.round(Math.sin(t / 380) * 3);
      draw(creature(G.wild[0]), s.x - 28, s.f - 50 + peek, 'ghost');
    }
    draw(sp, x0, y0 + down);
    if (s.id === 'hatch' && view.scene !== 'hatch') {
      const wig = G.egg.progress >= G.egg.target - 1000 && Math.floor(t / 260) % 4 === 0 ? 1 : 0;
      draw(prop('egg'), s.x - 11 + wig, y0 + 14 + down);
      gfx.rects([[x0 + 12, y0 + 12, 1, 6], [x0 + 13, y0 + 10, 1, 2], [x0 + 15, y0 + 8, 2, 1]], '#ffffff', 0.7);
    }
    if (s.id === 'dex') {
      rect(x0 + 6, y0 + 15, 38, 25, '#f3e8cd'); rect(x0 + 6, y0 + 39, 38, 1, '#b39d7c');
      DEX_ORDER.forEach((spc, i) => {
        const cx = x0 + 9 + (i % 3) * 12, cy = y0 + 18 + ((i / 3) | 0) * 11, have = spc !== 'mystery' && G.dex && G.dex[spc];
        rect(cx, cy, 9, 8, have ? TYPE_COLOR[spc] : '#c9c2b4');
        if (have) { rect(cx + 2, cy + 2, 2, 2, '#ffffff'); rect(cx + 5, cy + 2, 2, 2, '#ffffff'); } else rect(cx + 4, cy + 2, 1, 3, '#8a8296');
        rect(cx + 4, cy - 1, 1, 1, '#de503e');
      });
    }
  }
  function drawAvatar(t) {
    const av = avatar(), j = jumpOf(view.avJump, t), bob = Math.floor(t / 450) % 2;
    shadowEllipse(AV.x, AV.f - 1, 16 - Math.round(j / 3), 3, 0.3);
    const fx = view.fx;
    if (fx) {
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + t / 900; gfx.poly([AV.x, AV.f - 30, AV.x + Math.cos(a) * 170, AV.f - 30 + Math.sin(a) * 170, AV.x + Math.cos(a + 0.16) * 170, AV.f - 30 + Math.sin(a + 0.16) * 170], '#ffe580', 0.22 * fx.rays); }
      draw(av, AV.x - 28, AV.f - 62, fx.swap ? 'white' : 'c');
    } else draw(av, AV.x - 28, AV.f - 62 + bob - j, blinkNow(t) ? 'blink' : 'c');
  }
  function drawPet(sp, i, t) {
    const p = petPos(i, t), j = jumpOf(view.pets[sp] || 0, t), hop = Math.floor((t + i * 530) / 420) % 5 === 0 ? 2 : 0;
    shadowEllipse(Math.round(p.x), p.f - 1, 15, 3, 0.26);
    const s = creature(sp), blink = blinkNow(t, 4 + i), shiny = G.dex[sp] && G.dex[sp].shiny;
    gfx.img(shiny ? shinyOf(sp, blink) : (blink ? s.blink : s.c), Math.round(p.x - 28), p.f - 54 - hop - j);
  }
  function maybeRebuildSky(t) {
    if (opts.phase || t - phaseChecked < 60000) return;
    phaseChecked = t;
    const p = phaseAt(hourNow());
    if (p !== phase) { phase = p; HOME = gfx.image(buildHome(phase)); }
  }
  function drawYard(t, idle) {
    maybeRebuildSky(t);
    gfx.img(HOME, 0, 0);
    if (phase !== 'night') {
      const wing = [];
      for (const b of birds) { const bx = ((t * b.s + b.p) % (W + 40)) - 20, by = Math.round(TOP + (GY - TOP) * b.y + Math.sin(t / 900 + b.p) * 3), up = Math.floor(t / 260 + b.p) % 2; wing.push([Math.round(bx), by, 1, 1], [Math.round(bx) - 1, by - up, 1, 1], [Math.round(bx) - 2, by - 1, 1, 1], [Math.round(bx) + 1, by - up, 1, 1], [Math.round(bx) + 2, by - 1, 1, 1]); }
      gfx.rects(wing, '#2a2e4a', 0.8);
    }
    // Things further back first, then everyone standing in the yard.
    [...SPOTS].sort((a, b) => a.f - b.f).forEach(s => drawSpot(s, t));
    const actors = [{ f: AV.f, d: () => drawAvatar(t) }, ...pets().map((sp, i) => ({ f: PET_SLOTS[i].f, d: () => drawPet(sp, i, t) }))];
    actors.sort((a, b) => a.f - b.f).forEach(a => a.d());
    // Evening light over the yard (the sky is already painted for the hour).
    const tint = phase === 'night' ? ['#0a1030', 0.4] : phase === 'dusk' ? ['#4a2050', 0.16] : null;
    if (tint) {
      for (let k = 0; k < 10; k++) rect(0, GY - 110 + k * 4, W, 4, tint[0], tint[1] * (k + 1) / 11);
      rect(0, GY - 70, W, H - GY + 70, tint[0], tint[1]);
      if (phase === 'night') {
        for (const [wx, wy] of COT_WIN) { const x = COT_X - 48 + wx, yy = GY + 6 - 86 + wy; rect(x, yy, 10, 9, '#ffd77a', 0.95); rect(x + 4, yy, 1, 9, '#5a3424'); rect(x, yy + 4, 10, 1, '#5a3424'); shadowEllipse(x + 5, yy + 5, 14, 10, 0.08, '#ffe9a8'); }
        const inc = SPOTS[1];
        for (let r = 30; r > 0; r -= 6) shadowEllipse(inc.x, inc.f - 30, r, r, 0.05, '#ffe9a8');
        gfx.rects(fireflies.map(f => [Math.round(f.x + Math.sin(t / 1300 + f.p) * 8), Math.round(f.y + Math.cos(t / 1700 + f.p) * 5), 1, 1]).filter((_, k) => Math.sin(t / 500 + k) > -0.2), '#f6ff9a', 0.9);
      }
    }
    if (!idle) return;
    for (const s of SPOTS) {
      const name = S[s.label] || '', lw = labelW(name, 10, '800');
      label(name, Math.round(s.x - lw / 2), s.f + 1, '#ffffff', 10, '#141626', '800');
      if (s.id === 'hatch') {
        const k = clamp(G.egg.progress / (G.egg.target || 1), 0, 1), bx = s.x - 16, by = s.f + 15;
        rect(bx - 1, by - 1, 34, 5, '#141626'); rect(bx, by, 32, 3, '#3a3d5c'); rect(bx, by, Math.round(32 * k), 3, k >= 1 ? '#ffd43b' : '#8fcbff');
      }
      const bounce = Math.round(Math.abs(Math.sin(t / 260)) * -3);
      if ((s.id === 'catch' && G.pending > 0) || (s.id === 'hatch' && eggReady())) badge(s.x + s.w / 2 - 6, s.f - s.h + 4 + bounce);
    }
  }

  function drawHUD() {
    // Portrait with a ring that fills toward the next unlock.
    const px = 27, py = TOP + 27, r = 20;
    const span = G.nextDays ? Math.max(1, G.nextDays - (G.prevDays || 0)) : 1;
    const k = G.nextDays ? clamp(((G.days || 0) - (G.prevDays || 0)) / span, 0, 1) : 1;
    gfx.rects(disc(px, py, r + 2), '#141626', 0.9);
    gfx.rects(disc(px, py, r), '#3a3d5c', 1);
    const arc = [];
    for (let a = 0; a < k * 360; a += 4) { const rad = (a - 90) * Math.PI / 180; arc.push([Math.round(px + Math.cos(rad) * (r - 1.5)) - 1, Math.round(py + Math.sin(rad) * (r - 1.5)) - 1, 3, 3]); }
    gfx.rects(arc, '#ffd43b', 1);
    const inner = disc(px, py, r - 3);
    gfx.rects(inner, '#8fcbff', 1);
    gfx.imgClipped(avatar().c, px - 28, py - 24, inner);
    const lv = fill(S.lv, { n: G.level }), lw = labelW(lv, 9, '800') + 10;
    plate(px - lw / 2, py + r - 6, lw, 13, '#141626', 1); plate(px - lw / 2 + 1, py + r - 5, lw - 2, 11, '#ffd43b', 1);
    gfx.text(lv, px - lw / 2 + 5, py + r - 5, { color: '#1b1d2e', size: 9, weight: '800' });
    // Name and progress toward the next unlock.
    const nx = px + r + 8;
    label(G.name, nx, TOP + 8, '#ffffff', 13, '#141626', '800');
    const bw = 76, by = TOP + 29;
    rect(nx - 1, by - 1, bw + 2, 9, '#141626'); rect(nx, by, bw, 7, '#2a2d48'); rect(nx, by, Math.round(bw * k), 7, '#ffd43b'); rect(nx, by, Math.round(bw * k), 2, '#fff1a8');
    const nextTxt = G.nextDays ? fill(S.nextDays, { a: G.days || 0, b: G.nextDays }) : (S.allUnlocked || '');
    label(nextTxt, nx + bw + 6, by - 3, '#f6f1e6', 10, '#141626', '700');
    // Today's encounters and the dex, top right.
    const chip = (y, drawIcon, str) => {
      const w = labelW(str, 11, '800') + 28, x = W - 6 - w;
      plate(x, y, w, 18, '#0b0c18', 0.55); drawIcon(x + 5, y + 4); label(str, x + 20, y + 2, '#ffffff', 11, '#141626', '800');
    };
    const cap = G.today.cap || 3;
    chip(TOP + 6, (x, y) => draw(prop('lockMini'), x, y - 1), `${Math.max(0, cap - G.today.encounters)}/${cap}`);
    chip(TOP + 28, (x, y) => bookIcon(x, y), `${dexCount()}/${G.total}`);
  }
  function drawTracker(t) {
    const { x, y, w, h } = TRACK;
    plate(x, y, w, h, '#0b0c18', 0.62); rect(x, y + 4, 2, h - 8, '#ffd43b');
    const cap = G.today.cap || 3, wild = G.pending > 0;
    draw(prop('lockMini'), x + 8, y + 6);
    const l1 = wild ? fill(S.questWild, { n: G.pending }) : S.questMeal;
    label(l1, x + 22, y + 4, wild ? '#ffd43b' : '#ffffff', 11, '#141626', '700');
    if (!wild) { const c = `${G.today.encounters}/${cap}`; label(c, x + w - 14 - labelW(c, 11, '800'), y + 4, G.today.encounters >= cap ? '#86c95e' : '#ffd43b', 11, '#141626', '800'); }
    const arrowX = x + w - 9 + (Math.floor(t / 500) % 2);
    gfx.rects([[arrowX, y + 8, 1, 1], [arrowX + 1, y + 9, 1, 1], [arrowX + 2, y + 10, 1, 1], [arrowX + 1, y + 11, 1, 1], [arrowX, y + 12, 1, 1]], '#ffd43b', 1);
    draw(prop('iconEgg'), x + 8, y + 26);
    label(eggReady() ? S.questHatch : S.questWalk, x + 22, y + 24, eggReady() ? '#ffd43b' : '#ffffff', 11, '#141626', '700');
    const st = `${Math.round(G.egg.progress).toLocaleString()}/${(G.egg.target || 5000).toLocaleString()}`;
    label(st, x + w - 14 - labelW(st, 10, '700'), y + 25, '#cfd8f7', 10, '#141626', '700');
  }
  function drawHome(t) {
    const idle = !busyNow && !view.box;
    drawYard(t, idle);
    drawHUD();
    if (!idle) return;
    drawTracker(t);
    // Speech: a reply to a tap, otherwise a hint now and then.
    let str = null;
    if (view.bubble && now() < view.bubble.until) str = view.bubble.text;
    else if (t % 14000 < 4800) {
      const idleLines = [S.bubbleIdle1, S.bubbleIdle2, S.bubbleIdle3].filter(Boolean);
      str = G.pending > 0 ? S.bubbleWild : eggReady() ? S.bubbleEgg : idleLines[Math.floor(t / 14000) % Math.max(1, idleLines.length)];
    }
    if (str) speech(str, AV.x, AV.f - 64);
  }
  function drawHatch(t) {
    drawYard(t, false);
    rect(0, 0, W, H, '#0b0c18', 0.6 * view.dim);
    if (view.dim < 0.5) return;
    for (let r = 46; r > 0; r -= 6) shadowEllipse(144, CY + 54, r * 1.5, r * 0.42, 0.06, '#ffe9a8');
    shadowEllipse(144, CY + 54, 18, 4, 0.35);
    if (view.hatched) {
      if (view.hatchedShiny) gfx.img(shinyOf(view.hatched, false), 116, CY);
      else draw(creature(view.hatched), 116, CY + Math.floor(t / 400) % 2, blinkNow(t, 3) ? 'blink' : 'c');
    } else {
      const x = 124 + view.eggShake, y = CY + 8;
      draw(prop('eggBig'), x, y);
      const cracks = [[[19, 10], [23, 16], [19, 21], [24, 26]], [[30, 24], [26, 30], [31, 34]], [[9, 22], [13, 28], [10, 33]]];
      const dark = [], glow = [];
      for (let i = 0; i < view.eggCrack; i++) { const c = cracks[i]; for (let k = 0; k < c.length - 1; k++) { const [x0, y0] = c[k], [x1, y1] = c[k + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let s = 0; s <= n; s++) { const X = x + Math.round(x0 + (x1 - x0) * s / n), Y = y + Math.round(y0 + (y1 - y0) * s / n); dark.push([X, Y, 1, 1]); glow.push([X + 1, Y, 1, 1]); } } }
      gfx.rects(dark, '#4a2a10', 1); gfx.rects(glow, '#ffe580', 1);
    }
  }
  function drawBattle(t) {
    gfx.img(meadow(), 0, 0);
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
    else if (c.type === 'say') say1(c.text, c.ms || 2600);
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
