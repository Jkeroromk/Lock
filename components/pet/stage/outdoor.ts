import * as THREE from 'three';

/**
 * The buddy tab's backdrop in 3D: a still, sunny meadow (Jason: "不需要移动
 * …户外吧草地") — sky, rolling hills, a few round trees, clouds, grass tufts
 * and flowers — in the same soft, matte, toy-like look as 豆豆. Nothing in it
 * moves, so it costs one draw of a few dozen small meshes per frame.
 *
 * The sky follows the phone's local time (setHour): pink dawn, blue day,
 * golden sunset, blue night with the moon and stars. The sun and the moon
 * cross the sky, and the light — and so the shadows — follows them.
 *
 * Units: the characters stand at y = 0 around x = 0 (豆豆 is ~1 tall).
 */

interface Palette {
  skyTop: string; skyLow: string; ground: string; patch: string;
  hills: string[]; leaves: string[]; trunk: string; cloud: string; tuft: string;
  /** sun/moon light colour and strength, sky light colours and strength */
  light: string; sun: number; hemi: string; hemiGround: string; sky: number;
  fill: string; fillI: number;
  /** multiplies the plush props' own colours */
  tint: string;
  /** 0 day … 1 full night (moon and stars) */
  night: number;
}
const DAY: Palette = {
  skyTop: '#8FD3FF', skyLow: '#E4F6FF', ground: '#93D36B', patch: '#A7DE80',
  hills: ['#7FC75E', '#6CB851', '#8ACF68'], leaves: ['#5DAE4C', '#6FC05A'], trunk: '#B07D4F',
  cloud: '#FFFFFF', tuft: '#7CC45A',
  light: '#FFF4E0', sun: 1.35, hemi: '#FFFFFF', hemiGround: '#EEF6E2', sky: 1.1, fill: '#FFFFFF', fillI: 0.45,
  tint: '#FFFFFF', night: 0,
};
const DAWN: Palette = {
  skyTop: '#8FA8E8', skyLow: '#FFC7B0', ground: '#8CC86E', patch: '#9FD47E',
  hills: ['#86B96A', '#76AC60', '#92C276'], leaves: ['#5FA352', '#70B45E'], trunk: '#A97A55',
  cloud: '#FFE3E0', tuft: '#7CBB5E',
  light: '#FFD2B8', sun: 1.05, hemi: '#FFE6F0', hemiGround: '#E6EED8', sky: 1.0, fill: '#C8D4FF', fillI: 0.45,
  tint: '#FFF0EC', night: 0.15,
};
const SUNSET: Palette = {
  skyTop: '#6F86D8', skyLow: '#FFB070', ground: '#9AC468', patch: '#ABCF78',
  hills: ['#8FB45E', '#7FA655', '#9BBE68'], leaves: ['#64A04A', '#76B055'], trunk: '#B0784A',
  cloud: '#FFD6B0', tuft: '#85B85A',
  light: '#FFC07A', sun: 1.15, hemi: '#FFE2C4', hemiGround: '#E8E2C8', sky: 1.0, fill: '#B8C4FF', fillI: 0.5,
  tint: '#FFEBD8', night: 0.1,
};
const NIGHT: Palette = {
  skyTop: '#26346A', skyLow: '#5A6A9E', ground: '#4C7E58', patch: '#578A62',
  hills: ['#3F6B4E', '#365F45', '#467355'], leaves: ['#386848', '#427552'], trunk: '#6B5442',
  cloud: '#8E9AC4', tuft: '#467A55',
  light: '#C8D6FF', sun: 0.75, hemi: '#AFC2FF', hemiGround: '#4A6A5A', sky: 0.85, fill: '#9DB4FF', fillI: 0.5,
  tint: '#7F8DB8', night: 1,
};
/** The sky through the day (local hours). */
const DAY_KEYS: [number, Palette][] = [
  [0, NIGHT], [5, NIGHT], [6.3, DAWN], [8, DAY], [16.3, DAY], [18.2, SUNSET], [19.6, NIGHT], [24, NIGHT],
];

const _a = new THREE.Color(), _b = new THREE.Color();
const mixCol = (x: string, y: string, k: number) => '#' + _a.set(x).lerp(_b.set(y), k).getHexString();
const mixNum = (x: number, y: number, k: number) => x + (y - x) * k;
function paletteAt(hour: number): Palette {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < DAY_KEYS.length - 2 && h >= DAY_KEYS[i + 1][0]) i++;
  const [h0, a] = DAY_KEYS[i], [h1, b] = DAY_KEYS[i + 1];
  const k = h1 > h0 ? Math.min(1, Math.max(0, (h - h0) / (h1 - h0))) : 0;
  const ks = k * k * (3 - 2 * k);
  const out: any = {};
  for (const key of Object.keys(a) as (keyof Palette)[]) {
    const x = a[key] as any, y = b[key] as any;
    out[key] = Array.isArray(x) ? x.map((v: string, j: number) => mixCol(v, y[j], ks))
      : typeof x === 'number' ? mixNum(x, y, ks) : mixCol(x, y, ks);
  }
  return out as Palette;
}

/**
 * Where the plush props go: [prop, x, y, z, scale, turn, height scale?].
 * The props come out of Tripo about 1 unit wide, standing on y = 0; 豆豆 is
 * ~1 tall and stands at x ≈ -0.7, the buddy at x ≈ 0.8, both at z = 0, so
 * the middle front stays clear.
 */
export const MEADOW_LAYOUT: [string, number, number, number, number, number, number?][] = [
  ['ground', 0, -0.075, -1.6, 9, 0, 0.12],
  // trees: one big one each side, more behind
  ['tree_round', -2.35, 0, -2.4, 1.9, 0.3],
  ['tree_pine', 2.55, 0, -2.9, 2.1, 0],
  ['tree_fruit', 3.7, 0, -4.8, 1.7, -0.4],
  ['tree_round', -3.8, 0, -4.9, 1.6, 1.2],
  ['tree_pine', -1.3, 0, -6.6, 1.8, 0.5],
  ['tree_fruit', 0.9, 0, -7.6, 1.4, 0.2],
  ['tree_pine', 4.9, 0, -7.2, 1.9, 0.8],
  // bushes framing the two of them
  ['bush', -1.75, 0, -1.35, 0.85, 0.2],
  ['bush', 1.85, 0, -1.55, 0.8, -0.3],
  ['bush', -2.75, 0, -0.3, 0.7, 0.6],
  ['bush', 2.85, 0, -0.1, 0.72, -0.5],
  ['bush', 0.25, 0, -3.9, 1.0, 0],
  // flowers, grass and stones
  ['flowers', -1.45, 0, 0.55, 0.36, 0.3],
  ['flowers', 1.6, 0, 0.62, 0.32, -0.4],
  ['flowers', -0.15, 0, -1.25, 0.3, 0.9],
  ['flowers', 2.25, 0, -0.85, 0.3, 0.2],
  ['flowers', -2.3, 0, 0.95, 0.3, -0.6],
  ['grass', -1.05, 0, -0.55, 0.32, 0.4],
  ['grass', 1.2, 0, -0.45, 0.3, -0.2],
  ['grass', -2.0, 0, -2.0, 0.36, 0.1],
  ['grass', 2.35, 0, -2.25, 0.36, -0.7],
  ['grass', 0.35, 0, 0.95, 0.24, 0.2],
  ['rock', 1.45, 0, -1.05, 0.34, 0.6],
  ['rock', -2.85, 0, -1.8, 0.45, -0.3],
  // clouds high up behind the hills
  ['cloud', -3.6, 2.7, -11, 1.8, 0.1],
  ['cloud', 0.9, 3.3, -12.5, 2.2, -0.2],
  ['cloud', 4.9, 2.5, -10.5, 1.5, 0.3],
  ['cloud', -0.9, 2.2, -9.5, 1.1, 0],
];

const FLOWER_COLORS = ['#FFFFFF', '#FFE066', '#FF9BB3', '#FFFFFF', '#C9B6FF'];

/** Seeded random so the meadow is laid out the same every time. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A soft round shadow texture (white → transparent), shared by the blob shadows. */
function blobTexture() {
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5) / n * 2 - 1, dy = (y + 0.5) / n * 2 - 1;
    const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    const a = Math.pow(1 - r, 1.6);
    const i = (y * n + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(a * 255);
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}

export class Outdoor {
  readonly root = new THREE.Group();
  private mats = new Map<string, THREE.MeshLambertMaterial>();
  private geos: THREE.BufferGeometry[] = [];
  private extra: THREE.Material[] = [];
  private skyColors: THREE.BufferAttribute;
  private skyGeo: THREE.PlaneGeometry;
  private skyMat: THREE.MeshBasicMaterial;
  private night: THREE.Group;
  private simple = new THREE.Group();
  private patch: THREE.Object3D | null = null;
  private ground: THREE.Mesh | null = null;
  private dressed: THREE.Group | null = null;
  private dressMats: (THREE.MeshLambertMaterial | THREE.MeshBasicMaterial)[] = [];
  private shadowTex: THREE.DataTexture;
  /** Distance haze (the owner puts it on the scene): far hills fade into the sky. */
  readonly fog = new THREE.Fog(0xe4f6ff, 7, 22);
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly fill: THREE.DirectionalLight;
  private hour = 12;
  private sunDisc!: THREE.Mesh;
  private moon!: THREE.Mesh;
  private stars!: THREE.MeshBasicMaterial;

  constructor() {
    const R = rng(7);
    const g = this.root;

    // sky: a big gradient wall far behind everything
    const skyGeo = (this.skyGeo = this.geo(new THREE.PlaneGeometry(60, 18, 1, 8)));
    this.skyColors = new THREE.BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3);
    skyGeo.setAttribute('color', this.skyColors);
    this.skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, depthWrite: false, fog: false });
    this.extra.push(this.skyMat);
    const sky = new THREE.Mesh(skyGeo, this.skyMat);
    sky.position.set(0, 5, -16);
    sky.renderOrder = -1;
    g.add(sky);

    // ground and a lighter patch where the two of them stand
    const ground = (this.ground = new THREE.Mesh(this.geo(new THREE.CircleGeometry(30, 48)), this.mat('ground')));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    g.add(ground);
    const patch = new THREE.Mesh(this.geo(new THREE.CircleGeometry(1, 40)), this.mat('patch'));
    patch.rotation.x = -Math.PI / 2;
    patch.scale.set(2.3, 1.1, 1);
    patch.position.set(0.05, 0.002, 0.15);
    g.add(patch);
    this.patch = patch;

    // rolling hills on the horizon
    const hillGeo = this.geo(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2));
    const hills: [number, number, number, number, number][] = [
      // x, z, width, height, colour
      [-6.5, -12, 7, 2.2, 0], [1.5, -13.5, 9, 2.8, 1], [8, -11.5, 6.5, 1.9, 2], [-1.8, -9.5, 5, 1.2, 2], [4.6, -8.8, 4, 0.9, 0],
    ];
    for (const [x, z, w, h, ci] of hills) {
      const m = new THREE.Mesh(hillGeo, this.mat(`hill${ci}`));
      m.scale.set(w, h, w * 0.55);
      m.position.set(x, 0, z);
      g.add(m);
    }

    // the simple built-in props (until the Tripo set is loaded: dress())
    const P = this.simple;
    g.add(P);

    // round "lollipop" trees: one cluster each side, a couple far away
    const trunkGeo = this.geo(new THREE.CylinderGeometry(0.07, 0.1, 1, 10));
    const crownGeo = this.geo(new THREE.SphereGeometry(1, 20, 14));
    const tree = (x: number, z: number, s: number, ci: number) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, this.mat('trunk'));
      trunk.scale.set(s, 0.7 * s, s);
      trunk.position.y = 0.35 * s;
      t.add(trunk);
      const c1 = new THREE.Mesh(crownGeo, this.mat(`leaf${ci}`));
      c1.scale.setScalar(0.48 * s);
      c1.position.y = 0.95 * s;
      t.add(c1);
      const c2 = new THREE.Mesh(crownGeo, this.mat(`leaf${1 - ci}`));
      c2.scale.setScalar(0.32 * s);
      c2.position.set(0.3 * s, 0.78 * s, 0.12 * s);
      t.add(c2);
      t.position.set(x, 0, z);
      P.add(t);
      P.add(this.shadow(x, z + 0.05, 0.9 * s, 0.32));
    };
    tree(-2.55, -2.6, 1.25, 0);
    tree(-3.4, -4.4, 1.0, 1);
    tree(2.75, -3.2, 1.35, 1);
    tree(4.2, -5.6, 1.1, 0);
    tree(-0.9, -7.4, 0.85, 1);
    tree(1.1, -8.2, 0.7, 0);

    // bushes near the edges of the frame
    for (const [x, z, s] of [[-1.85, -1.4, 0.32], [2.0, -1.6, 0.28], [-2.4, -0.4, 0.24], [2.5, -0.2, 0.3]] as const) {
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(crownGeo, this.mat(`leaf${k % 2}`));
        b.scale.setScalar(s * (k === 1 ? 1 : 0.75));
        b.position.set(x + (k - 1) * s * 0.9, s * (k === 1 ? 0.55 : 0.4), z + (k === 1 ? 0 : 0.05));
        P.add(b);
      }
    }

    // grass tufts: little three-blade clumps
    const bladeGeo = this.geo(new THREE.ConeGeometry(0.025, 0.14, 4));
    for (let i = 0; i < 46; i++) {
      const x = (R() - 0.5) * 6.4, z = 0.35 - R() * 3.6;
      if (Math.abs(x) < 1.6 && z > -0.5 && z < 0.7) continue; // keep the patch under them clear
      const tuft = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(bladeGeo, this.mat('tuft'));
        b.position.set((k - 1) * 0.03, 0.06, 0);
        b.rotation.z = (k - 1) * 0.35;
        tuft.add(b);
      }
      tuft.position.set(x, 0, z);
      tuft.rotation.y = R() * Math.PI;
      tuft.scale.setScalar(0.6 + R() * 0.45);
      P.add(tuft);
    }

    // flowers: a white/yellow/pink dot on a tiny stem, scattered around the edges
    const petalGeo = this.geo(new THREE.SphereGeometry(0.035, 10, 8));
    const heartGeo = this.geo(new THREE.SphereGeometry(0.016, 8, 6));
    for (let i = 0; i < 34; i++) {
      const x = (R() - 0.5) * 6.8, z = 1.0 - R() * 4.6;
      if (Math.abs(x) < 1.5 && z > -0.6 && z < 0.8) continue;
      const f = new THREE.Group();
      const col = FLOWER_COLORS[Math.floor(R() * FLOWER_COLORS.length)];
      for (let k = 0; k < 5; k++) {
        const p = new THREE.Mesh(petalGeo, this.fixed(col));
        const a = (k / 5) * Math.PI * 2;
        p.position.set(Math.cos(a) * 0.035, 0.05, Math.sin(a) * 0.035);
        p.scale.y = 0.45;
        f.add(p);
      }
      const h = new THREE.Mesh(heartGeo, this.fixed(col === '#FFE066' ? '#FF9F43' : '#FFD43B'));
      h.position.y = 0.06;
      f.add(h);
      f.position.set(x, 0, z);
      f.scale.setScalar(0.8 + R() * 0.5);
      P.add(f);
    }

    // clouds: puffs of three spheres
    for (const [x, y, z, s] of [[-3.6, 3.1, -11, 1.0], [0.8, 3.7, -12.5, 1.2], [4.8, 2.9, -10.5, 0.85], [-0.9, 2.5, -9.5, 0.6]] as const) {
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(crownGeo, this.mat('cloud'));
        c.scale.set(0.55 * s * (k === 1 ? 1.3 : 1), 0.38 * s * (k === 1 ? 1.3 : 1), 0.4 * s);
        c.position.set(x + (k - 1) * 0.6 * s, y + (k === 1 ? 0.12 * s : 0), z);
        P.add(c);
      }
    }

    // night: moon and stars (hidden by day)
    this.night = new THREE.Group();
    const moonMat = new THREE.MeshBasicMaterial({ color: '#FFF4C2', fog: false });
    const starMat = (this.stars = new THREE.MeshBasicMaterial({ color: '#FFFFFF', fog: false, transparent: true }));
    const sunMat = new THREE.MeshBasicMaterial({ color: '#FFE27A', fog: false });
    this.extra.push(moonMat, starMat, sunMat);
    // sun and moon live just in front of the sky wall, behind the hills (they rise from behind them)
    const moon = (this.moon = new THREE.Mesh(this.geo(new THREE.CircleGeometry(0.55, 32)), moonMat));
    g.add(moon);
    const sunDisc = (this.sunDisc = new THREE.Mesh(this.geo(new THREE.CircleGeometry(0.75, 32)), sunMat));
    g.add(sunDisc);
    const starGeo = this.geo(new THREE.CircleGeometry(0.05, 5));
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Mesh(starGeo, starMat);
      s.position.set((R() - 0.5) * 18, 2.3 + R() * 1.9, -15.6);
      s.scale.setScalar(0.6 + R() * 0.9);
      this.night.add(s);
    }
    g.add(this.night);

    // lights: soft sky light plus a warm sun from the front left
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xeef6e2, DAY.sky);
    this.sun = new THREE.DirectionalLight(0xfff4e0, DAY.sun);
    this.sun.position.set(-2.4, 4.2, 2.2);
    // real shadows sell the depth: everyone and every prop near the middle casts onto the grass
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -4.5; sc.right = 4.5; sc.top = 4.5; sc.bottom = -4.5; sc.near = 0.5; sc.far = 16;
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.normalBias = 0.02;
    this.fill = new THREE.DirectionalLight(0xffffff, 0.45);
    this.fill.position.set(1.8, 1.4, -1.6);
    g.add(this.hemi, this.sun, this.fill);

    this.shadowTex = blobTexture();
    this.setHour(12, true);
  }

  /** A soft round shadow on the grass (for trees here; the characters get theirs from blob()). */
  private shadow(x: number, z: number, w: number, opacity: number) {
    const m = this.blob(w, opacity);
    m.position.set(x, 0.004, z);
    return m;
  }

  /** A soft contact shadow to put under a character (add it to the character's own group). */
  blob(width: number, opacity = 0.2) {
    if (!this.blobGeo) this.blobGeo = this.geo(new THREE.PlaneGeometry(1, 1));
    const mat = new THREE.MeshBasicMaterial({ map: this.shadowTex, color: 0x2f5a22, transparent: true, opacity, depthWrite: false });
    this.extra.push(mat);
    const m = new THREE.Mesh(this.blobGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(width, width * 0.7, 1);
    m.position.y = 0.006;
    m.renderOrder = 1;
    return m;
  }
  private blobGeo: THREE.BufferGeometry | null = null;

  /**
   * Swap the simple built-in props for the Tripo-made plush set (meadow.glb):
   * the felt ground, trees, bushes, flowers, grass, stones and clouds, laid
   * out by MEADOW_LAYOUT. Geometry is shared; each prop kind has one material.
   */
  dress(props: Record<string, { geometry: THREE.BufferGeometry; map: THREE.Texture }>) {
    if (this.dressed) return;
    const g = new THREE.Group();
    const mats: Record<string, THREE.MeshLambertMaterial | THREE.MeshBasicMaterial> = {};
    for (const [name, p] of Object.entries(props)) {
      // clouds are far away and lit from the front: unlit keeps them white
      mats[name] = name === 'cloud' ? new THREE.MeshBasicMaterial({ map: p.map, fog: false }) : new THREE.MeshLambertMaterial({ map: p.map });
      this.dressMats.push(mats[name]);
    }
    for (const [name, x, y, z, s, ry, sy] of MEADOW_LAYOUT) {
      const p = props[name];
      if (!p) continue;
      const m = new THREE.Mesh(p.geometry, mats[name]);
      m.position.set(x, y, z);
      m.scale.set(s, s * (sy ?? 1), name === 'ground' ? s * 0.62 : s);
      m.rotation.y = ry;
      if (name === 'ground') m.receiveShadow = true;
      else if (name !== 'cloud') m.castShadow = Math.abs(z) < 6;
      g.add(m);
      if (name.startsWith('tree')) g.add(this.shadow(x, z + 0.05, 0.8 * s, 0.3));
      else if (name === 'bush' || name === 'rock') g.add(this.shadow(x, z + 0.03, 1.1 * s, 0.25));
    }
    this.simple.visible = false;
    if (this.patch) this.patch.visible = false;
    this.dressed = g;
    this.root.add(g);
    this.setHour(this.hour, true);
  }

  /** Local time of day, in hours (e.g. 18.5 = 6:30 pm). */
  setHour(hour: number, force = false) {
    const h = ((hour % 24) + 24) % 24;
    if (!force && Math.abs(h - this.hour) < 1 / 60) return;
    this.hour = h;
    const p = paletteAt(h);
    this.apply(p);
    // the sun crosses the sky 6:00 → 18:00, the moon 18:00 → 6:00; both start
    // and end low behind the hills
    const arc = (k: number, o: THREE.Object3D) => {
      o.visible = k > -0.05 && k < 1.05;
      o.position.set(-9 + 18 * k, 0.5 + 2.7 * Math.sin(Math.PI * Math.min(1, Math.max(0, k))), -15.4);
    };
    const sunK = (h - 6) / 12;
    const moonK = (((h - 18) % 24) + 24) % 24 / 12;
    arc(sunK, this.sunDisc);
    arc(moonK, this.moon);
    // the key light comes from whichever is up (low and from the side early and late: long shadows)
    const k = sunK >= 0 && sunK <= 1 ? sunK : Math.min(1, Math.max(0, moonK));
    const height = Math.sin(Math.PI * k);
    this.sun.position.set(-4 + 8 * k, 1.6 + 3.2 * height, 2.4);
    this.stars.opacity = Math.max(0, (p.night - 0.4) / 0.6);
    this.night.visible = this.stars.opacity > 0.01;
  }

  private apply(p: Palette) {
    // sky gradient: top colour above, horizon colour at the bottom
    const top = new THREE.Color(p.skyTop), low = new THREE.Color(p.skyLow), c = new THREE.Color();
    const pos = this.skyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = (pos.getY(i) + 9) / 18; // 0 bottom … 1 top
      c.copy(low).lerp(top, Math.pow(Math.min(1, Math.max(0, (k - 0.25) / 0.75)), 0.8));
      this.skyColors.setXYZ(i, c.r, c.g, c.b);
    }
    this.skyColors.needsUpdate = true;
    this.fog.color.copy(low);
    const set = (key: string, col: string) => this.mats.get(key)?.color.set(col);
    set('ground', p.ground); set('patch', p.patch); set('trunk', p.trunk); set('cloud', p.cloud); set('tuft', p.tuft);
    p.hills.forEach((col, i) => set(`hill${i}`, col));
    p.leaves.forEach((col, i) => set(`leaf${i}`, col));
    // the plush props carry their own colours: tint them with the light of the hour
    for (const m of this.dressMats) m.color.set(p.tint);
    this.hemi.intensity = p.sky;
    this.sun.intensity = p.sun;
    this.sun.color.set(p.light);
    this.hemi.color.set(p.hemi);
    this.hemi.groundColor.set(p.hemiGround);
    const cloud = this.mats.get('cloud');
    if (cloud) cloud.emissive.set(p.cloud).multiplyScalar(0.6);
    this.fill.intensity = p.fillI;
    this.fill.color.set(p.fill);
  }

  /** Recolourable matte material, shared by key. */
  private mat(key: string) {
    let m = this.mats.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: '#ffffff' });
      this.mats.set(key, m);
    }
    return m;
  }

  private fixedMats = new Map<string, THREE.MeshLambertMaterial>();
  /** Matte material with a fixed colour (flowers, moon, stars). */
  private fixed(color: string) {
    let m = this.fixedMats.get(color);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.25) });
      this.fixedMats.set(color, m);
    }
    return m;
  }

  private geo<T extends THREE.BufferGeometry>(g: T) {
    this.geos.push(g);
    return g;
  }

  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.fixedMats.forEach((m) => m.dispose());
    this.extra.forEach((m) => m.dispose());
    this.dressMats.forEach((m) => m.dispose());
    this.shadowTex.dispose();
  }
}
