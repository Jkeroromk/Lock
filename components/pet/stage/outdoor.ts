import * as THREE from 'three';

/**
 * The buddy tab's backdrop in 3D: a still, sunny meadow (Jason: "不需要移动
 * …户外吧草地") — sky, rolling hills, a few round trees, clouds, grass tufts
 * and flowers — in the same soft, matte, toy-like look as 豆豆. Nothing in it
 * moves, so it costs one draw of a few dozen small meshes per frame.
 *
 * At night (the buddy is asleep) the same meadow turns blue with a moon and
 * a few stars.
 *
 * Units: the characters stand at y = 0 around x = 0 (豆豆 is ~1 tall).
 */

const DAY = {
  skyTop: '#8FD3FF', skyLow: '#E4F6FF', ground: '#93D36B', patch: '#A7DE80',
  hills: ['#7FC75E', '#6CB851', '#8ACF68'], leaves: ['#5DAE4C', '#6FC05A'], trunk: '#B07D4F',
  cloud: '#FFFFFF', tuft: '#7CC45A', sun: 1.35, sky: 1.1,
};
const NIGHT = {
  skyTop: '#26346A', skyLow: '#5A6A9E', ground: '#4C7E58', patch: '#578A62',
  hills: ['#3F6B4E', '#365F45', '#467355'], leaves: ['#386848', '#427552'], trunk: '#6B5442',
  cloud: '#8E9AC4', tuft: '#467A55', sun: 0.75, sky: 0.85,
};
type Palette = typeof DAY;

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
  private shadowTex: THREE.DataTexture;
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly fill: THREE.DirectionalLight;
  private isNight = false;

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
    const ground = new THREE.Mesh(this.geo(new THREE.CircleGeometry(30, 48)), this.mat('ground'));
    ground.rotation.x = -Math.PI / 2;
    g.add(ground);
    const patch = new THREE.Mesh(this.geo(new THREE.CircleGeometry(1, 40)), this.mat('patch'));
    patch.rotation.x = -Math.PI / 2;
    patch.scale.set(2.3, 1.1, 1);
    patch.position.set(0.05, 0.002, 0.15);
    g.add(patch);

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
      g.add(t);
      this.shadow(x, z + 0.05, 0.9 * s, 0.32);
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
        g.add(b);
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
      g.add(tuft);
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
      g.add(f);
    }

    // clouds: puffs of three spheres
    for (const [x, y, z, s] of [[-3.6, 3.1, -11, 1.0], [0.8, 3.7, -12.5, 1.2], [4.8, 2.9, -10.5, 0.85], [-0.9, 2.5, -9.5, 0.6]] as const) {
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(crownGeo, this.mat('cloud'));
        c.scale.set(0.55 * s * (k === 1 ? 1.3 : 1), 0.38 * s * (k === 1 ? 1.3 : 1), 0.4 * s);
        c.position.set(x + (k - 1) * 0.6 * s, y + (k === 1 ? 0.12 * s : 0), z);
        g.add(c);
      }
    }

    // night: moon and stars (hidden by day)
    this.night = new THREE.Group();
    const moon = new THREE.Mesh(this.geo(new THREE.CircleGeometry(0.55, 32)), this.fixed('#FFF4C2'));
    moon.position.set(-3.2, 3.1, -15.5);
    this.night.add(moon);
    const starGeo = this.geo(new THREE.CircleGeometry(0.05, 5));
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Mesh(starGeo, this.fixed('#FFFFFF'));
      s.position.set((R() - 0.5) * 18, 2.3 + R() * 1.9, -15.6);
      s.scale.setScalar(0.6 + R() * 0.9);
      this.night.add(s);
    }
    this.night.visible = false;
    g.add(this.night);

    // lights: soft sky light plus a warm sun from the front left
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xeef6e2, DAY.sky);
    this.sun = new THREE.DirectionalLight(0xfff4e0, DAY.sun);
    this.sun.position.set(-1.6, 2.8, 2.4);
    this.fill = new THREE.DirectionalLight(0xffffff, 0.45);
    this.fill.position.set(1.8, 1.4, -1.6);
    g.add(this.hemi, this.sun, this.fill);

    this.shadowTex = blobTexture();
    this.apply(DAY);
  }

  /** A soft round shadow on the grass (for trees here; the characters get theirs from blob()). */
  private shadow(x: number, z: number, w: number, opacity: number) {
    const m = this.blob(w, opacity);
    m.position.set(x, 0.004, z);
    this.root.add(m);
    return m;
  }

  /** A soft contact shadow to put under a character (add it to the character's own group). */
  blob(width: number, opacity = 0.28) {
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

  setNight(on: boolean) {
    if (on === this.isNight) return;
    this.isNight = on;
    this.apply(on ? NIGHT : DAY);
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
    const set = (key: string, col: string) => this.mats.get(key)?.color.set(col);
    set('ground', p.ground); set('patch', p.patch); set('trunk', p.trunk); set('cloud', p.cloud); set('tuft', p.tuft);
    p.hills.forEach((col, i) => set(`hill${i}`, col));
    p.leaves.forEach((col, i) => set(`leaf${i}`, col));
    this.night.visible = p === NIGHT;
    this.hemi.intensity = p.sky;
    this.sun.intensity = p.sun;
    this.hemi.color.set(p === NIGHT ? '#AFC2FF' : '#FFFFFF');
    this.hemi.groundColor.set(p === NIGHT ? '#4A6A5A' : '#EEF6E2');
    const cloud = this.mats.get('cloud');
    if (cloud) cloud.emissive.set(p.cloud).multiplyScalar(0.6);
    this.fill.intensity = p === NIGHT ? 0.5 : 0.45;
    this.fill.color.set(p === NIGHT ? '#9DB4FF' : '#FFFFFF');
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
    this.shadowTex.dispose();
  }
}
