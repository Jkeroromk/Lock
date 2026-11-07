import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

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
 * The buddy as its Tripo plush model, rigged by Tripo and animated in Blender
 * (圆圆 the cat for now): clips idle, walk, hop, sleep (curled up like a loaf,
 * tail round the side) and sit. The eyes are painted into the texture, so
 * closing them (asleep, blinking) swaps in a second texture where the eyes
 * are filled with the fur around them and a little ︶ line — same idea as
 * 豆豆's closed mouth: no lids, no seams.
 */
export interface RiggedModel { scene: THREE.Group; clips: THREE.AnimationClip[]; map: THREE.Texture; mapClosed: THREE.Texture | null }
export type BuddyMood = 'awake' | 'sad' | 'asleep';


export class RiggedBuddy {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions: Record<string, THREE.AnimationAction> = {};
  private current: THREE.AnimationAction | null = null;
  private mats: THREE.Material[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private mat: THREE.MeshStandardMaterial;
  private maps: { open: THREE.Texture; closed: THREE.Texture | null };
  private base = 'idle';
  private hopping = false;
  private t = Math.random() * 10;
  private nextBlink = 2 + Math.random() * 2;
  private blinkUntil = 0;
  private shutFor = 0; // seconds into the sleep clip (the eyes close once it has settled)
  mood: BuddyMood = 'awake';

  constructor(model: RiggedModel, stage: number, height = 0.85) {
    const inner = cloneSkinned(model.scene) as THREE.Group;
    const mat = (this.mat = new THREE.MeshStandardMaterial({ map: model.map, roughness: 0.92, metalness: 0 }));
    this.maps = { open: model.map, closed: model.mapClosed };
    this.mats.push(mat);
    inner.traverse((o: any) => {
      if (!o.isMesh) return;
      o.material = mat;
      o.castShadow = true;
      o.frustumCulled = false;
    });
    inner.scale.setScalar(1 / 0.977);
    this.root.add(inner);
    this.root.scale.setScalar(height * (buddyScale(stage) / buddyScale(1)));

    this.mixer = new THREE.AnimationMixer(inner);
    for (const c of model.clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.mixer.addEventListener('finished', (e: any) => {
      if (e.action === this.actions.hop) { this.hopping = false; this.play(this.base); }
    });
    this.play('idle');
  }

  /** Kept for the stage: asleep curls up, otherwise awake. */
  set asleep(v: boolean) { this.setMood(v ? 'asleep' : this.mood === 'asleep' ? 'awake' : this.mood); }

  setMood(m: BuddyMood) {
    this.mood = m;
    const clip = m === 'asleep' ? 'sleep' : m === 'sad' ? 'sit' : 'idle';
    if (clip === this.base) return;
    this.base = clip;
    this.shutFor = 0;
    if (!this.hopping) this.play(clip);
  }

  private play(name: string, once = false) {
    const a = this.actions[name];
    if (!a) return;
    const prev = this.current;
    if (prev === a && !once) return;
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    a.timeScale = name === 'sleep' ? 0.8 : 1;
    a.enabled = true;
    a.play();
    if (prev && prev !== a) a.crossFadeFrom(prev, name === 'sleep' || name === 'sit' ? 0.6 : 0.2, false);
    this.current = a;
  }

  hop() {
    if (this.mood === 'asleep') return;
    this.hopping = true;
    this.play('hop', true);
  }

  update(dt: number, animate: boolean) {
    const d = Math.min(dt, 0.05);
    const t = (this.t += d);
    this.mixer.update(animate ? d : 0); // reduced motion: hold the clip's first pose
    let shut = false;
    if (this.mood === 'asleep') {
      this.shutFor += d;
      shut = this.shutFor > 0.4 || !animate;
    } else if (this.hopping) {
      shut = false;
    } else if (animate) {
      if (t >= this.nextBlink) {
        this.blinkUntil = t + 0.13;
        this.nextBlink = t + 2.4 + Math.random() * 2.8;
        if (Math.random() < 0.2) this.nextBlink = t + 0.35;
      }
      shut = t < this.blinkUntil;
    }
    const map = shut && this.maps.closed ? this.maps.closed : this.maps.open;
    if (this.mat.map !== map) { this.mat.map = map; this.mat.needsUpdate = true; }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mats.forEach((m) => m.dispose());
    this.geos.forEach((g) => g.dispose());
  }
}
