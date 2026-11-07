import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * The bichon coach in real-time 3D (Tripo model v3, animated in Blender).
 *
 * coach_v4.glb: meshes body / eye_L / eye_R / nose / tongue / headband /
 * whistle / collar on one rig, clips idle, walk, hop, sit (a dog sit: sits
 * down, then holds and breathes) and lie (lying on the belly, chin on the
 * front paws, breathing — for sleep). The body has a "mouth_closed" morph
 * target. v4 replaced v3's sit, which kept the torso upright like a person
 * (it read as standing on the hind legs), and added lie.
 *
 * Faces never deform: blinking and expressions are texture swaps on the two
 * eye meshes (open, closed, happy, sad, sleepy, determined, love, star). When
 * the tongue goes in, the tongue bone shrinks to nothing, the mouth_closed
 * morph seals the mouth and the body switches to a texture with the inside of
 * the mouth painted as fur — so a closed mouth has no seam at all.
 *
 * Loading avoids the parts of react-three-fiber's native polyfill that use the
 * old expo-file-system API (see couple/room/textures.ts): the GLB has no
 * embedded images and is read with the new File API; textures are separate
 * bundled JPEGs (stored linear-encoded) that expo-gl uploads straight from
 * their local file.
 *
 * Shared by the buddy tab (Coach3DScene) and the couple room (room/pet.ts):
 * assets load once; each place makes its own CoachInstance (a skeleton clone
 * with its own materials), so expressions never leak between them.
 */


const MODEL = require('@/assets/pet/3d/coach_v4.glb');
export const EYE_FACES = ['open', 'closed', 'happy', 'sad', 'sleepy', 'determined', 'love', 'star'] as const;
export type Face = (typeof EYE_FACES)[number];
const EYE_TEX: Record<'L' | 'R', Record<Face, number>> = {
  L: {
    open: require('@/assets/pet/3d/eyeL_open.jpg'), closed: require('@/assets/pet/3d/eyeL_closed.jpg'),
    happy: require('@/assets/pet/3d/eyeL_happy.jpg'), sad: require('@/assets/pet/3d/eyeL_sad.jpg'),
    sleepy: require('@/assets/pet/3d/eyeL_sleepy.jpg'), determined: require('@/assets/pet/3d/eyeL_determined.jpg'),
    love: require('@/assets/pet/3d/eyeL_love.jpg'), star: require('@/assets/pet/3d/eyeL_star.jpg'),
  },
  R: {
    open: require('@/assets/pet/3d/eyeR_open.jpg'), closed: require('@/assets/pet/3d/eyeR_closed.jpg'),
    happy: require('@/assets/pet/3d/eyeR_happy.jpg'), sad: require('@/assets/pet/3d/eyeR_sad.jpg'),
    sleepy: require('@/assets/pet/3d/eyeR_sleepy.jpg'), determined: require('@/assets/pet/3d/eyeR_determined.jpg'),
    love: require('@/assets/pet/3d/eyeR_love.jpg'), star: require('@/assets/pet/3d/eyeR_star.jpg'),
  },
};
const PART_TEX = {
  body: require('@/assets/pet/3d/body_base.jpg'),
  bodyClosed: require('@/assets/pet/3d/body_closed.jpg'),
  tongue: require('@/assets/pet/3d/tongue.jpg'),
  headband: require('@/assets/pet/3d/headband.jpg'),
  whistle: require('@/assets/pet/3d/whistle.jpg'),
  collar: require('@/assets/pet/3d/collar.jpg'),
};
type PartKey = keyof typeof PART_TEX;

/* ---------- small runtime shims for three's GLTFLoader on Hermes ---------- */
export function shims() {
  const g = globalThis as any;
  if (typeof g.navigator !== 'undefined' && typeof g.navigator.userAgent !== 'string') {
    try { g.navigator.userAgent = 'ReactNative'; } catch {}
  }
  if (typeof g.TextDecoder === 'undefined') {
    g.TextDecoder = class {
      decode(input?: ArrayBuffer | ArrayBufferView) {
        if (!input) return '';
        const b = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        let out = '';
        for (let i = 0; i < b.length;) {
          const c = b[i++];
          if (c < 0x80) out += String.fromCharCode(c);
          else if (c < 0xe0) out += String.fromCharCode(((c & 0x1f) << 6) | (b[i++] & 0x3f));
          else if (c < 0xf0) out += String.fromCharCode(((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f));
          else {
            const cp = (((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f)) - 0x10000;
            out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
          }
        }
        return out;
      }
    };
  }
}

export async function localUri(mod: number) {
  const a = await Asset.fromModule(mod).downloadAsync();
  const uri = a.localUri || a.uri;
  if (!uri) throw new Error('asset has no uri');
  return uri;
}

/** A texture expo-gl uploads from a local file (no DOM image needed). */
export async function loadTexture(mod: number, srgb: boolean, size: number) {
  const uri = await localUri(mod);
  const t = new THREE.Texture();
  t.image = { data: { localUri: uri }, width: size, height: size } as any;
  (t as any).isDataTexture = true; // force EXGL's non-DOM upload path
  t.flipY = false; // glTF UV convention
  // Colour textures are stored already linear-encoded (converted at build
  // time), so no sRGB texture format is needed from expo-gl; the renderer
  // still encodes its output to sRGB, which keeps lighting correct and the
  // fur white instead of muddy grey.
  t.colorSpace = THREE.NoColorSpace;
  void srgb;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Scale the head/neck rotation of a clip towards its first pose (1 = unchanged). */
function soften(clip: THREE.AnimationClip, factor: number) {
  const q0 = new THREE.Quaternion(), q = new THREE.Quaternion();
  for (const track of clip.tracks) {
    if (!/(Head|Neck)/i.test(track.name) || !track.name.endsWith('.quaternion')) continue;
    const v = track.values;
    q0.set(v[0], v[1], v[2], v[3]);
    for (let i = 0; i < v.length; i += 4) {
      q.set(v[i], v[i + 1], v[i + 2], v[i + 3]).slerp(q0, 1 - factor);
      v[i] = q.x; v[i + 1] = q.y; v[i + 2] = q.z; v[i + 3] = q.w;
    }
  }
}


/* ------------------------------- shared assets ------------------------------- */
export interface CoachAssets {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  eyeTex: Record<'L' | 'R', Record<Face, THREE.Texture>>;
  part: Record<PartKey, THREE.Texture>;
}

let cache: Promise<CoachAssets> | null = null;
/** Parse the model and load every texture once (cached; retried after a failure). */
export function loadCoachAssets(): Promise<CoachAssets> {
  if (cache) return cache;
  cache = (async () => {
    shims();
    const uri = await localUri(MODEL);
    const bytes = await new File(uri).bytes();
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
    const part = Object.fromEntries(await Promise.all((Object.keys(PART_TEX) as PartKey[]).map(async (k) =>
      [k, await loadTexture(PART_TEX[k], true, k === 'body' || k === 'bodyClosed' ? 2048 : 512)] as const))) as Record<PartKey, THREE.Texture>;
    const eyeTex = { L: {}, R: {} } as Record<'L' | 'R', Record<Face, THREE.Texture>>;
    await Promise.all((['L', 'R'] as const).flatMap((side) => EYE_FACES.map(async (f) => {
      eyeTex[side][f] = await loadTexture(EYE_TEX[side][f], true, 512);
    })));
    // The idle clip's head turns read as head-shaking on a phone-sized view:
    // tone the head/neck rotation down.
    for (const clip of gltf.animations as THREE.AnimationClip[]) if (clip.name === 'idle') soften(clip, 0.55);
    return { scene: gltf.scene, clips: gltf.animations, eyeTex, part };
  })();
  cache.catch(() => { cache = null; });
  return cache;
}

/* --------------------------------- instance --------------------------------- */
export type TongueMode = 'out' | 'in' | 'auto';
export interface CoachLook { face: Face; tongue: TongueMode; blink: boolean }
export type CoachClip = 'idle' | 'walk' | 'sit' | 'lie' | 'hop';

/**
 * One 豆豆 in one scene: its own skeleton, materials and mixer. The owner
 * picks the base clip (setBase) and the look (eyes / tongue); hop() and love()
 * are one-off reactions. Call update(dt) every frame.
 */
export class CoachInstance {
  readonly root: THREE.Group;
  readonly mixer: THREE.AnimationMixer;
  private actions: Record<string, THREE.AnimationAction> = {};
  private eyes: { L: THREE.MeshStandardMaterial; R: THREE.MeshStandardMaterial };
  private bodyMat: THREE.MeshStandardMaterial;
  private body: THREE.SkinnedMesh | null = null;
  private mouthMorph = -1;
  private tongueBone: THREE.Object3D | null;
  private materials: THREE.Material[] = [];

  look: CoachLook = { face: 'open', tongue: 'auto', blink: true };
  private base: CoachClip = 'idle';
  private current: THREE.AnimationAction | null = null;
  private holdAt: number | null = null;
  private hopping = false;
  private faceNow: Face = 'open';
  private t = 0;
  private loveUntil = 0;
  private blinkUntil = 0;
  private nextBlink = 2 + Math.random() * 2;
  private tongueOut = true;
  private nextTongue = 6 + Math.random() * 5;
  private mouth = 0; // 0 = open (tongue out) … 1 = closed
  /** Playback speed of the walk clip (match it to how fast the owner moves the root). */
  walkSpeed = 1;
  /** Playback speed of the idle clip: slower reads as tired / asleep. */
  private idleSpeed = 0.8;

  constructor(private assets: CoachAssets, opts: { shadows?: boolean } = {}) {
    this.root = cloneSkinned(assets.scene) as THREE.Group;
    const std = (map: THREE.Texture | null, roughness: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
      const m = new THREE.MeshStandardMaterial({ map, roughness, metalness: 0, ...extra });
      this.materials.push(m);
      return m;
    };
    const { part, eyeTex } = assets;
    this.bodyMat = std(part.body, 0.9);
    this.eyes = { L: std(eyeTex.L.open, 0.35), R: std(eyeTex.R.open, 0.35) };
    const mats: Record<string, THREE.Material> = {
      body: this.bodyMat,
      eye_L: this.eyes.L,
      eye_R: this.eyes.R,
      // glossy black button nose (linear colour from the Blender material)
      nose: std(null, 0.3, { color: new THREE.Color().setRGB(0.018, 0.014, 0.013, THREE.LinearSRGBColorSpace) }),
      tongue: std(part.tongue, 0.55),
      headband: std(part.headband, 0.8),
      whistle: std(part.whistle, 0.45),
      collar: std(part.collar, 0.7),
    };
    this.root.traverse((o: any) => {
      if (!o.isMesh) return;
      const m = mats[o.name];
      if (m) o.material = m;
      if (o.name === 'body') this.body = o;
      o.frustumCulled = false; // skinned bounds don't follow the pose
      if (opts.shadows) o.castShadow = true;
    });
    this.mouthMorph = this.body?.morphTargetDictionary?.mouth_closed ?? -1;
    this.tongueBone = this.root.getObjectByName('tongue01') ?? null;
    this.mixer = new THREE.AnimationMixer(this.root);
    for (const c of assets.clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.mixer.addEventListener('finished', (e: any) => {
      if (e.action === this.actions.hop && this.hopping) {
        this.hopping = false;
        this.playBase();
      }
    });
    this.playBase();
  }

  private play(name: string, opts: { once?: boolean; holdAt?: number } = {}) {
    const a = this.actions[name];
    if (!a) return;
    const prev = this.current;
    if (prev === a && !opts.once) return;
    a.reset();
    a.setLoop(opts.once || opts.holdAt != null ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.timeScale = name === 'idle' ? this.idleSpeed : name === 'walk' ? this.walkSpeed : 1;
    a.clampWhenFinished = true;
    a.paused = false;
    this.holdAt = opts.holdAt ?? null;
    a.enabled = true;
    a.play();
    // lying down / getting up takes a moment; everything else blends quickly
    if (prev && prev !== a) a.crossFadeFrom(prev, name === 'lie' || prev === this.actions.lie ? 0.8 : 0.25, false);
    this.current = a;
  }

  private playBase() {
    if (this.base === 'sit') this.play('sit', { holdAt: SIT_HOLD });
    else this.play(this.base);
  }

  /** The clip to fall back to: idle, walk (looping) or sit (sits down and stays). */
  setBase(clip: CoachClip, idleSpeed = 0.8) {
    if (idleSpeed !== this.idleSpeed) {
      this.idleSpeed = idleSpeed;
      if (this.actions.idle && this.current === this.actions.idle) this.actions.idle.timeScale = idleSpeed;
    }
    if (clip === this.base) return;
    this.base = clip;
    if (!this.hopping) this.playBase();
  }

  hop() { this.hopping = true; this.play('hop', { once: true }); }
  love() { this.loveUntil = this.t + 1.6; }
  get isHopping() { return this.hopping; }

  update(dt: number, animate = true) {
    const d = Math.min(dt, 0.05);
    const t = (this.t += d);
    this.mixer.update(animate ? d : 0);
    const a = this.current;
    if (a && this.holdAt != null && a.time >= this.holdAt) a.paused = true;

    // eyes: the look's face, ^ ^ while hopping, ♥ after a pat, blinks now and then
    const look = this.look;
    let want: Face = look.face;
    if (t < this.loveUntil) want = 'love';
    else if (this.hopping && look.face !== 'closed') want = 'happy';
    else if (look.blink && animate) {
      if (t >= this.nextBlink) {
        this.blinkUntil = t + 0.13;
        this.nextBlink = t + 2.2 + Math.random() * 2.6;
        if (Math.random() < 0.25) this.nextBlink = t + 0.32; // double blink
      }
      if (t < this.blinkUntil) want = 'closed';
    }
    if (want !== this.faceNow) {
      this.faceNow = want;
      for (const side of ['L', 'R'] as const) {
        this.eyes[side].map = this.assets.eyeTex[side][want];
        this.eyes[side].needsUpdate = true;
      }
    }

    // mouth: tongue out (panting) or in with the mouth sealed
    let out: boolean;
    if (look.tongue === 'auto') {
      if (animate && t >= this.nextTongue) {
        this.tongueOut = !this.tongueOut;
        this.nextTongue = t + (this.tongueOut ? 5 + Math.random() * 6 : 3 + Math.random() * 4);
      }
      out = this.tongueOut;
    } else out = look.tongue === 'out';
    if (this.hopping || t < this.loveUntil) out = true;
    const target = out ? 0 : 1;
    this.mouth += (target - this.mouth) * Math.min(1, d * (animate ? 12 : 1000));
    const k = this.mouth;
    if (this.body && this.mouthMorph >= 0 && this.body.morphTargetInfluences) this.body.morphTargetInfluences[this.mouthMorph] = k;
    if (this.tongueBone) this.tongueBone.scale.multiplyScalar(Math.max(0.01, 1 - k));
    const bodyMap = k > 0.5 ? this.assets.part.bodyClosed : this.assets.part.body;
    if (this.bodyMat.map !== bodyMap) { this.bodyMat.map = bodyMap; this.bodyMat.needsUpdate = true; }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.materials.forEach((m) => m.dispose());
  }
}

/** Seconds into "sit" where the dog is fully seated. */
export const SIT_HOLD = 1.2;
