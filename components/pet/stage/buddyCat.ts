import * as THREE from 'three';

/**
 * A stand-in for the buddy (圆圆) on the 3D stage until its Tripo model is in:
 * a round, matte toy cat built from spheres, tinted by kind (cat / corgi /
 * penguin) and sized by growth stage. It breathes, sways its head, wags its
 * tail, hops when tapped and curls down when asleep.
 */

interface Tint { fur: string; stripe: string; belly: string; ear: string }
const TINTS: Record<string, Tint> = {
  cat: { fur: '#F7A14A', stripe: '#D9752B', belly: '#FFF1DE', ear: '#FFB3C1' },
  corgi: { fur: '#E2A866', stripe: '#C4844A', belly: '#FFF6E8', ear: '#F2C9A0' },
  penguin: { fur: '#4A4F57', stripe: '#33373D', belly: '#F4F4F0', ear: '#4A4F57' },
};
export const buddyTint = (kind: string) => TINTS[kind] ?? TINTS.cat;
/** Stage 1 → 2 → 3 grows the buddy a little each time. */
export const buddyScale = (stage: number) => 0.78 + 0.1 * (Math.max(1, Math.min(3, Math.round(stage) || 1)) - 1);

export class BuddyCat {
  readonly root = new THREE.Group();
  private inner = new THREE.Group();
  private head = new THREE.Group();
  private tail = new THREE.Group();
  private eyesOpen: THREE.Object3D[] = [];
  private eyesShut: THREE.Object3D[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private mats: THREE.Material[] = [];
  private t = Math.random() * 10;
  private hopT = -1;
  private sleep = 0; // 0 awake … 1 curled up
  private nextBlink = 2 + Math.random() * 2;
  private blinkUntil = 0;
  asleep = false;

  constructor(kind: string, stage: number) {
    const c = buddyTint(kind);
    const lam = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) => {
      const m = new THREE.MeshLambertMaterial({ color, ...extra });
      this.mats.push(m);
      return m;
    };
    const basic = (color: string) => {
      const m = new THREE.MeshBasicMaterial({ color });
      this.mats.push(m);
      return m;
    };
    const geo = <T extends THREE.BufferGeometry>(g: T) => (this.geos.push(g), g);
    const fur = lam(c.fur), belly = lam(c.belly), stripe = lam(c.stripe), ear = lam(c.ear);
    const ball = geo(new THREE.SphereGeometry(1, 24, 18));
    const mesh = (m: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, parent: THREE.Object3D) => {
      const o = new THREE.Mesh(ball, m);
      o.scale.set(sx, sy, sz);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    };

    this.root.add(this.inner);
    const I = this.inner;
    mesh(fur, 0.3, 0.26, 0.4, 0, 0.31, -0.02, I); // body
    mesh(belly, 0.2, 0.19, 0.18, 0, 0.29, 0.22, I); // chest
    for (const s of [-1, 1]) for (const f of [-1, 1]) {
      mesh(fur, 0.085, 0.13, 0.085, s * 0.16, 0.12, f * 0.2, I); // legs
      mesh(belly, 0.08, 0.05, 0.095, s * 0.16, 0.035, f * 0.2 + 0.02, I); // paws
    }
    for (let k = 0; k < 3; k++) {
      const st = mesh(stripe, 0.035, 0.2, 0.05, 0, 0.5, -0.24 + k * 0.13, I); // back stripes
      st.rotation.z = Math.PI / 2;
      st.scale.set(0.035, 0.27, 0.05);
    }

    this.head.position.set(0, 0.64, 0.24);
    I.add(this.head);
    const H = this.head;
    mesh(fur, 0.32, 0.28, 0.28, 0, 0, 0, H);
    mesh(belly, 0.16, 0.11, 0.1, 0, -0.08, 0.22, H); // muzzle
    const earGeo = geo(new THREE.ConeGeometry(0.11, 0.2, 12));
    const earIn = geo(new THREE.ConeGeometry(0.065, 0.13, 10));
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(earGeo, fur);
      e.position.set(s * 0.19, 0.25, -0.02);
      e.rotation.z = -s * 0.32;
      H.add(e);
      const ei = new THREE.Mesh(earIn, ear);
      ei.position.set(s * 0.185, 0.235, 0.035);
      ei.rotation.z = -s * 0.32;
      H.add(ei);
      // open eyes: glossy dark balls with a white glint
      const eye = new THREE.Group();
      const ball2 = new THREE.Mesh(ball, lam('#2A1A12', { emissive: new THREE.Color('#1A0E08') }));
      ball2.scale.set(0.058, 0.07, 0.035);
      eye.add(ball2);
      const glint = new THREE.Mesh(ball, basic('#FFFFFF'));
      glint.scale.setScalar(0.018);
      glint.position.set(s * 0.012 + 0.012, 0.025, 0.03);
      eye.add(glint);
      eye.position.set(s * 0.12, 0.02, 0.245);
      H.add(eye);
      this.eyesOpen.push(eye);
      // shut eyes: a little arc
      const arc = new THREE.Mesh(geo(new THREE.TorusGeometry(0.045, 0.011, 6, 14, Math.PI)), basic('#2A1A12'));
      arc.position.set(s * 0.12, 0.0, 0.262);
      arc.rotation.z = Math.PI;
      arc.visible = false;
      H.add(arc);
      this.eyesShut.push(arc);
      const blush = mesh(lam('#FF9BB0'), 0.045, 0.028, 0.012, s * 0.2, -0.07, 0.235, H);
      blush.rotation.y = s * 0.5;
    }
    mesh(lam('#E06A7E'), 0.026, 0.02, 0.02, 0, -0.045, 0.32, H); // nose
    for (let k = 0; k < 3; k++) {
      const st = mesh(stripe, 0.025, 0.08, 0.02, (k - 1) * 0.07, 0.2, 0.18, H); // forehead stripes
      st.rotation.x = -0.6;
    }

    this.tail.position.set(0, 0.36, -0.4);
    I.add(this.tail);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.18, -0.12), new THREE.Vector3(0.06, 0.38, -0.1), new THREE.Vector3(0.1, 0.48, 0.02),
    ]);
    this.tail.add(new THREE.Mesh(geo(new THREE.TubeGeometry(curve, 20, 0.05, 10, false)), fur));
    const tip = mesh(c === TINTS.cat ? belly : fur, 0.055, 0.055, 0.055, 0.1, 0.48, 0.02, this.tail);
    void tip;

    this.root.scale.setScalar(buddyScale(stage));
  }

  hop() { if (!this.asleep) this.hopT = 0; }

  update(dt: number, animate: boolean) {
    const d = Math.min(dt, 0.05);
    const t = (this.t += animate ? d : 0);
    this.sleep += ((this.asleep ? 1 : 0) - this.sleep) * Math.min(1, d * (animate ? 3 : 1000));
    const z = this.sleep;

    let hopY = 0;
    if (this.hopT >= 0) {
      this.hopT += d / 0.55;
      if (this.hopT >= 1) this.hopT = -1;
      else hopY = Math.sin(this.hopT * Math.PI) * 0.22;
    }
    const breathe = Math.sin(t * (2.2 - z)) * 0.02;
    this.inner.position.y = hopY - z * 0.06;
    this.inner.scale.set(1 + breathe, 1 - breathe - z * 0.1, 1);
    this.head.rotation.y = Math.sin(t * 0.7) * 0.22 * (1 - z);
    this.head.rotation.x = z * 0.12;
    this.head.position.y = 0.64 - z * 0.07;
    this.tail.rotation.z = Math.sin(t * (this.hopT >= 0 ? 9 : 3)) * 0.45 * (1 - z * 0.8);

    // blink now and then; eyes shut while asleep or mid-hop (happy squint)
    let shut = z > 0.5 || this.hopT >= 0;
    if (!shut && animate) {
      if (t >= this.nextBlink) { this.blinkUntil = t + 0.13; this.nextBlink = t + 2.4 + Math.random() * 2.8; }
      shut = t < this.blinkUntil;
    }
    this.eyesOpen.forEach((e) => { e.visible = !shut; });
    this.eyesShut.forEach((e) => { e.visible = shut; });
  }

  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
  }
}

/**
 * The buddy as its Tripo plush model (圆圆 the cat for now), before it has a
 * rig: the whole toy breathes, sways, hops when tapped and settles low and
 * slow when asleep. Same interface as BuddyCat so the stage can swap them.
 */
export class PlushBuddy {
  readonly root = new THREE.Group();
  private body: THREE.Mesh;
  private mat: THREE.MeshStandardMaterial;
  private t = Math.random() * 10;
  private hopT = -1;
  private sleep = 0;
  asleep = false;

  /** `height`: how tall the toy stands at stage 1, in world units. */
  constructor(geometry: THREE.BufferGeometry, map: THREE.Texture, stage: number, height = 0.85) {
    this.mat = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 });
    this.body = new THREE.Mesh(geometry, this.mat);
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const h = bb.max.y - bb.min.y || 1;
    this.body.position.y = -bb.min.y / h; // stand on y = 0
    const inner = new THREE.Group();
    inner.add(this.body);
    inner.scale.setScalar(1 / h);
    this.root.add(inner);
    this.root.scale.setScalar(height * (buddyScale(stage) / buddyScale(1)));
  }

  hop() { if (!this.asleep) this.hopT = 0; }

  update(dt: number, animate: boolean) {
    const d = Math.min(dt, 0.05);
    const t = (this.t += animate ? d : 0);
    this.sleep += ((this.asleep ? 1 : 0) - this.sleep) * Math.min(1, d * (animate ? 3 : 1000));
    const z = this.sleep;
    let hopY = 0, squash = 0;
    if (this.hopT >= 0) {
      this.hopT += d / 0.55;
      if (this.hopT >= 1) this.hopT = -1;
      else {
        hopY = Math.sin(this.hopT * Math.PI) * 0.22;
        squash = this.hopT < 0.12 ? Math.sin((this.hopT / 0.12) * Math.PI) * 0.08 : 0;
      }
    }
    const breathe = Math.sin(t * (2.1 - z * 1.2)) * (0.018 + z * 0.01);
    this.body.parent!.position.y = hopY;
    this.body.scale.set(1 + breathe + squash, 1 - breathe - squash - z * 0.06, 1 + breathe * 0.5);
    this.body.rotation.z = Math.sin(t * 0.9) * 0.04 * (1 - z);
    this.body.rotation.y = Math.sin(t * 0.55) * 0.12 * (1 - z);
  }

  dispose() { this.mat.dispose(); }
}
