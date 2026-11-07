import * as THREE from 'three';

/**
 * Textures for the couple room, painted in code into DataTextures.
 *
 * Why not PNG files: on React Native there is no <img>/canvas to decode an
 * image for WebGL; image textures only work through react-three-fiber's native
 * polyfill (expo-asset + expo-file-system), whose file API changed in recent
 * Expo SDKs. A DataTexture is plain pixels handed to gl.texImage2D, which
 * expo-gl always supports — so the room never shows up untextured. All of
 * them are small (≤ 256 px) and built once when the room mounts (a few ms).
 *
 * Text is never baked in: names, days and captions are React Native views
 * laid over the 3D view (see Overlay.tsx).
 */

type RGB = [number, number, number];

function hex(c: string): RGB {
  const n = parseInt(c.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A w×h RGBA canvas in memory with a couple of drawing helpers. */
class Pixels {
  data: Uint8Array;
  constructor(public w: number, public h: number) {
    this.data = new Uint8Array(w * h * 4);
  }
  set(x: number, y: number, c: RGB, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const d = this.data, i = (y * this.w + x) * 4;
    if (a >= 255) {
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      return;
    }
    // blend over what's there (sprites keep soft transparent edges)
    const k = a / 255, old = d[i + 3] / 255, out = k + old * (1 - k);
    if (out <= 0) return;
    const keep = old * (1 - k);
    d[i] = Math.round((c[0] * k + d[i] * keep) / out);
    d[i + 1] = Math.round((c[1] * k + d[i + 1] * keep) / out);
    d[i + 2] = Math.round((c[2] * k + d[i + 2] * keep) / out);
    d[i + 3] = Math.round(out * 255);
  }
  rect(x0: number, y0: number, w: number, h: number, c: RGB) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
  }
  /** Fill wherever inside(x, y) holds, anti-aliased with 3×3 supersampling; only scans the box given. */
  shape(c: RGB, inside: (x: number, y: number) => boolean, x0 = 0, y0 = 0, x1 = this.w, y1 = this.h) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      let n = 0;
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) if (inside(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3)) n++;
      if (n) this.set(x, y, c, Math.round((n / 9) * 255));
    }
  }
  /** Filled anti-aliased circle. */
  circle(c: RGB, cx: number, cy: number, r: number) {
    const r2 = r * r;
    this.shape(c, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 < r2, Math.floor(cx - r), Math.floor(cy - r), Math.ceil(cx + r) + 1, Math.ceil(cy + r) + 1);
  }
  texture() {
    // We draw top-down; a DataTexture's first row is the bottom of the image
    // (flipY does nothing for raw data), so flip the rows once here.
    const row = this.w * 4, out = new Uint8Array(this.data.length);
    for (let y = 0; y < this.h; y++) out.set(this.data.subarray(y * row, (y + 1) * row), (this.h - 1 - y) * row);
    const t = new THREE.DataTexture(out, this.w, this.h, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }
}

/** Wooden floor planks (rows with staggered joints). */
function planks() {
  const p = new Pixels(256, 256);
  const a = hex('#EBD5A6'), b = hex('#E2C68F'), line = hex('#C9A86B');
  for (let i = 0; i < 8; i++) {
    p.rect(0, i * 32, 256, 32, i % 2 ? b : a);
    p.rect(0, i * 32, 256, 2, line);
    const off = (i * 79) % 128;
    p.rect(off, i * 32, 2, 32, line);
    p.rect(off + 128, i * 32, 2, 32, line);
  }
  return p.texture();
}

/** Striped wallpaper. */
function wallpaper(base: string, stripe: string) {
  const p = new Pixels(256, 64);
  p.rect(0, 0, 256, 64, hex(base));
  for (let x = 8; x < 256; x += 20) p.rect(x, 0, 6, 64, hex(stripe));
  return p.texture();
}

/** Sky with sun and a cloud, for the window. */
function sky() {
  const p = new Pixels(128, 128);
  const top = hex('#8FD3FF'), bottom = hex('#DFF3FF');
  for (let y = 0; y < 128; y++) {
    const k = y / 127;
    const c: RGB = [0, 1, 2].map((i) => Math.round(top[i] + (bottom[i] - top[i]) * k)) as RGB;
    p.rect(0, y, 128, 1, c);
  }
  p.circle(hex('#FFD43B'), 92, 38, 17);
  p.circle(hex('#FFFFFF'), 30, 62, 15);
  p.circle(hex('#FFFFFF'), 46, 56, 18);
  p.circle(hex('#FFFFFF'), 62, 64, 13);
  return p.texture();
}

/** Anniversary board background: pink header, white card, yellow box (the words are an overlay). */
function board() {
  const p = new Pixels(128, 160);
  p.rect(0, 0, 128, 160, hex('#FFFFFF'));
  p.rect(0, 0, 128, 30, hex('#FF8FA3'));
  p.rect(10, 100, 108, 48, hex('#0A0A0A'));
  p.rect(12, 102, 104, 44, hex('#FFD43B'));
  // little calendar rings on the header
  p.circle(hex('#0A0A0A'), 34, 15, 5);
  p.circle(hex('#0A0A0A'), 94, 15, 5);
  return p.texture();
}

/** The plush room's board: the same layout in soft colours, no ink (it sits in a plush wooden frame). */
function boardSoft() {
  const p = new Pixels(128, 160);
  p.rect(0, 0, 128, 160, hex('#FFF8EC'));
  p.rect(0, 0, 128, 30, hex('#FFC9D3'));
  const r = 7, x0 = 12, y0 = 102, x1 = 116, y1 = 146;
  p.shape(hex('#FFE29A'), (x, y) => {
    const cx = Math.max(x0 + r, Math.min(x1 - r, x)), cy = Math.max(y0 + r, Math.min(y1 - r, y));
    return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
  }, x0, y0, x1, y1);
  p.circle(hex('#D9A27A'), 34, 15, 4.5);
  p.circle(hex('#D9A27A'), 94, 15, 4.5);
  return p.texture();
}

// ── particle sprites ──

function heart() {
  const p = new Pixels(64, 64);
  // classic implicit heart curve, scaled into the square (y up)
  p.shape(hex('#FF4D6D'), (x, y) => {
    const u = (x - 32) / 22, v = (30 - y) / 22;
    return (u * u + v * v - 1) ** 3 - u * u * v * v * v < 0;
  });
  p.circle(hex('#FFFFFF'), 22, 22, 4);
  return p.texture();
}

function drop() {
  const p = new Pixels(64, 64);
  p.shape(hex('#4DB6FF'), (x, y) => {
    const dx = x - 32, dy = y - 38;
    if (dx * dx + dy * dy < 17 * 17) return true; // round bottom
    // pointed top: a triangle from the tip to the circle's sides
    return y > 6 && y < 38 && Math.abs(dx) < ((y - 6) / 32) * 16.5;
  });
  p.circle(hex('#FFFFFF'), 26, 38, Math.sqrt(14));
  return p.texture();
}

function bento() {
  const p = new Pixels(64, 64);
  p.rect(6, 14, 52, 40, hex('#0A0A0A'));
  p.rect(9, 17, 46, 34, hex('#FF8FA3'));
  p.rect(12, 20, 18, 28, hex('#FFFFFF'));
  p.circle(hex('#6CC27A'), 42, 27, 6);
  p.circle(hex('#FFD43B'), 42, 41, 6);
  return p.texture();
}

function star() {
  const p = new Pixels(64, 64);
  p.shape(hex('#FFD43B'), (x, y) => {
    const dx = x - 32, dy = y - 33;
    const a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
    const k = Math.cos(5 * (a + Math.PI / 2)) * 0.5 + 0.5; // 5 points
    return r < 12 + 14 * k ** 2;
  });
  return p.texture();
}

/** The toon shading ramp: three hard steps. */
function toonRamp() {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

export type RoomTextures = ReturnType<typeof makeTextures>;

export function makeTextures() {
  return {
    planks: planks(),
    wallA: wallpaper('#FFF1BF', '#F6E2A2'),
    wallB: wallpaper('#F8E3A0', '#EED38A'),
    sky: sky(),
    board: board(),
    boardSoft: boardSoft(),
    heart: heart(),
    drop: drop(),
    bento: bento(),
    star: star(),
    ramp: toonRamp(),
  };
}

export function disposeTextures(t: RoomTextures) {
  Object.values(t).forEach((x) => x.dispose());
}
