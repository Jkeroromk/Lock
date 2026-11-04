import { forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, advance, useFrame, useStore, type RootState } from '@react-three/fiber/native';
import { useReducedMotion } from 'react-native-reanimated';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CoachPose } from '@/constants/pets';
import { FloatFx, type Fx, type PetSpriteHandle } from './PetSprite';
import { recordJsError } from '@/lib/crashlog';

/**
 * The bichon coach in real-time 3D (Tripo model v3, animated in Blender).
 *
 * coach_v3.glb: meshes body / eye_L / eye_R / nose / tongue / headband /
 * whistle / collar on one rig, clips idle, walk, sit (sits down, holds, stands
 * up), hop. The body has a "mouth_closed" morph target.
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
 * Until the model is ready — or if anything fails — `fallback` (the 2D
 * PetSprite) is shown, so the tab never looks empty. This module is only
 * required at runtime by Coach3D.tsx, which guards it.
 */

const MODEL = require('@/assets/pet/3d/coach_v3.glb');
const EYE_FACES = ['open', 'closed', 'happy', 'sad', 'sleepy', 'determined', 'love', 'star'] as const;
type Face = (typeof EYE_FACES)[number];
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
function shims() {
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

async function localUri(mod: number) {
  const a = await Asset.fromModule(mod).downloadAsync();
  const uri = a.localUri || a.uri;
  if (!uri) throw new Error('asset has no uri');
  return uri;
}

/** A texture expo-gl uploads from a local file (no DOM image needed). */
async function loadTexture(mod: number, srgb: boolean, size: number) {
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

interface Loaded {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  eyes: { L: THREE.MeshStandardMaterial; R: THREE.MeshStandardMaterial };
  eyeTex: Record<'L' | 'R', Record<Face, THREE.Texture>>;
  bodyMat: THREE.MeshStandardMaterial;
  bodyTex: { open: THREE.Texture; closed: THREE.Texture };
  body: THREE.SkinnedMesh | null;
  mouthMorph: number; // index of mouth_closed, -1 if missing
  tongueBone: THREE.Object3D | null;
}

let cache: Promise<Loaded> | null = null;
function loadCoach(): Promise<Loaded> {
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

    const std = (map: THREE.Texture | null, roughness: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ map, roughness, metalness: 0, ...extra });
    const bodyMat = std(part.body, 0.9);
    const eyes = { L: std(eyeTex.L.open, 0.35), R: std(eyeTex.R.open, 0.35) };
    const mats: Record<string, THREE.Material> = {
      body: bodyMat,
      eye_L: eyes.L,
      eye_R: eyes.R,
      // glossy black button nose (linear colour from the Blender material)
      nose: std(null, 0.3, { color: new THREE.Color().setRGB(0.018, 0.014, 0.013, THREE.LinearSRGBColorSpace) }),
      tongue: std(part.tongue, 0.55),
      headband: std(part.headband, 0.8),
      whistle: std(part.whistle, 0.45),
      collar: std(part.collar, 0.7),
    };

    // The idle clip's head turns read as head-shaking on a phone-sized view:
    // tone the head/neck rotation down and let it play a little slower.
    for (const clip of gltf.animations as THREE.AnimationClip[]) if (clip.name === 'idle') soften(clip, 0.55);

    const scene: THREE.Group = gltf.scene;
    let body: THREE.SkinnedMesh | null = null;
    scene.traverse((o: any) => {
      if (!o.isMesh) return;
      const m = mats[o.name];
      if (m) o.material = m;
      if (o.name === 'body') body = o;
      o.frustumCulled = false; // skinned bounds don't follow the pose
    });
    const b = body as THREE.SkinnedMesh | null;
    const mouthMorph = b?.morphTargetDictionary?.mouth_closed ?? -1;
    return {
      scene, clips: gltf.animations, eyes, eyeTex, bodyMat, bodyTex: { open: part.body, closed: part.bodyClosed },
      body: b, mouthMorph, tongueBone: scene.getObjectByName('tongue01') ?? null,
    };
  })();
  cache.catch(() => { cache = null; });
  return cache;
}

/**
 * Diagnostics (temporary): the first on-device crash was a TypeError inside
 * three's WebGLState.drawBuffers ("WeakMap key must be an Object"), which only
 * runs when a render target is set — and this scene sets none. Record what
 * three was given so the recorded error says which render target / framebuffer
 * it was.
 */
function instrument(gl: THREE.WebGLRenderer) {
  const describe = (v: any) => {
    if (v == null) return String(v);
    if (typeof v !== 'object') return `${typeof v}:${String(v)}`;
    return `${v.constructor?.name ?? 'object'}{${Object.keys(v).slice(0, 8).join(',')}}`;
  };
  let lastSet = 'none';
  const origSet = gl.setRenderTarget.bind(gl);
  gl.setRenderTarget = (rt: any, ...rest: any[]) => {
    if (rt) lastSet = `${describe(rt)} isRT=${!!rt.isRenderTarget} tex=${rt.texture?.name ?? '-'} samples=${rt.samples} @ ${(new Error().stack || '').split('\n').slice(2, 6).join(' | ')}`;
    return origSet(rt, ...rest);
  };
  const state: any = (gl as any).state;
  if (state?.drawBuffers) {
    const od = state.drawBuffers;
    state.drawBuffers = (rt: any, fb: any) => {
      try {
        return od(rt, fb);
      } catch (e: any) {
        e.message = `${e.message} [drawBuffers rt=${describe(rt)} fb=${describe(fb)} lastSetRenderTarget=${lastSet} shadow=${gl.shadowMap.enabled} caps=${JSON.stringify({ ms: (gl.capabilities as any).maxSamples, v2: (gl.capabilities as any).isWebGL2 })}]`;
        throw e;
      }
    };
  }
}

/* --------------------------------- scene --------------------------------- */
/** What each app pose looks like: body clip, eyes, and whether the tongue is out. */
interface Look { clip: 'idle' | 'sit'; face: Face; tongue: 'out' | 'in' | 'auto'; blink: boolean }
const LOOKS: Record<CoachPose, Look> = {
  idle: { clip: 'idle', face: 'open', tongue: 'auto', blink: true },
  blink: { clip: 'idle', face: 'open', tongue: 'auto', blink: true },
  cheer: { clip: 'idle', face: 'happy', tongue: 'out', blink: false },
  wave: { clip: 'idle', face: 'happy', tongue: 'out', blink: false },
  think: { clip: 'idle', face: 'determined', tongue: 'in', blink: true },
  sad: { clip: 'sit', face: 'sad', tongue: 'in', blink: true },
  sleep: { clip: 'sit', face: 'closed', tongue: 'in', blink: false },
};
const SIT_HOLD = 1.2; // seconds into "sit" where the dog is fully seated

interface Ctl { hop: () => void; love: () => void; yaw: { current: number }; state: () => RootState }

function Coach({ data, pose, animate, ctl }: { data: Loaded; pose: CoachPose; animate: boolean; ctl: { current: Ctl | null } }) {
  const root = useMemo(() => {
    const g = new THREE.Group();
    g.add(data.scene);
    return g;
  }, [data]);
  const mixer = useMemo(() => new THREE.AnimationMixer(data.scene), [data]);
  const actions = useMemo(() => {
    const m: Record<string, THREE.AnimationAction> = {};
    for (const c of data.clips) m[c.name] = mixer.clipAction(c);
    return m;
  }, [data, mixer]);
  const look = LOOKS[pose] ?? LOOKS.idle;
  const current = useRef<THREE.AnimationAction | null>(null);
  const holdAt = useRef<number | null>(null);
  const hopping = useRef(false);
  const face = useRef<Face>('open');
  const loveUntil = useRef(0);
  const blinkUntil = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 2);
  const tongueOut = useRef(true);
  const nextTongue = useRef(6 + Math.random() * 5);
  const mouth = useRef(0); // 0 = open (tongue out) … 1 = closed
  const clock = useRef(0);
  const yaw = useRef(0.35);
  const store = useStore();

  const play = useCallback((name: string, opts: { once?: boolean; holdAt?: number } = {}) => {
    const a = actions[name];
    if (!a) return;
    const prev = current.current;
    a.reset();
    a.setLoop(opts.once || opts.holdAt != null ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.timeScale = name === 'idle' ? 0.8 : 1;
    a.clampWhenFinished = true;
    a.paused = false;
    holdAt.current = opts.holdAt ?? null;
    a.enabled = true;
    a.play();
    if (prev && prev !== a) a.crossFadeFrom(prev, 0.3, false);
    current.current = a;
  }, [actions]);

  const base = useCallback(() => {
    if (look.clip === 'sit') play('sit', { holdAt: SIT_HOLD });
    else play('idle'); // cheer = idle with a ^ ^ face; PetHome adds the celebration hop
  }, [look.clip, play]);

  useEffect(() => {
    if (!hopping.current) base();
  }, [base]);

  useEffect(() => {
    const onFinished = (e: any) => {
      if (e.action === actions.hop && hopping.current) {
        hopping.current = false;
        base();
      }
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer, actions, base]);

  useEffect(() => {
    ctl.current = {
      hop: () => {
        if (!animate || pose === 'sleep') return;
        hopping.current = true;
        play('hop', { once: true });
      },
      love: () => { if (pose !== 'sleep') loveUntil.current = clock.current + 1.6; },
      yaw,
      state: () => store.getState(),
    };
  }, [animate, pose, play, ctl, store]);

  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const t = (clock.current += d);
    mixer.update(animate ? d : 0);
    const a = current.current;
    if (a && holdAt.current != null && a.time >= holdAt.current) a.paused = true;

    // ---- eyes: pose face, ^ ^ while hopping, ♥ after a pat, blinks now and then
    let want: Face = look.face;
    if (t < loveUntil.current) want = 'love';
    else if (hopping.current && pose !== 'sleep') want = 'happy';
    else if (look.blink && animate) {
      if (t >= nextBlink.current) {
        blinkUntil.current = t + 0.13;
        nextBlink.current = t + 2.2 + Math.random() * 2.6;
        if (Math.random() < 0.25) nextBlink.current = t + 0.32; // double blink
      }
      if (t < blinkUntil.current) want = 'closed';
    }
    if (want !== face.current) {
      face.current = want;
      for (const side of ['L', 'R'] as const) {
        data.eyes[side].map = data.eyeTex[side][want];
        data.eyes[side].needsUpdate = true;
      }
    }

    // ---- mouth: tongue out (panting) or in with the mouth sealed
    let out: boolean;
    if (look.tongue === 'auto') {
      if (animate && t >= nextTongue.current) {
        tongueOut.current = !tongueOut.current;
        nextTongue.current = t + (tongueOut.current ? 5 + Math.random() * 6 : 3 + Math.random() * 4);
      }
      out = tongueOut.current;
    } else out = look.tongue === 'out';
    if (hopping.current || t < loveUntil.current) out = true;
    const target = out ? 0 : 1;
    mouth.current += (target - mouth.current) * Math.min(1, d * (animate ? 12 : 1000));
    const k = mouth.current;
    if (data.body && data.mouthMorph >= 0 && data.body.morphTargetInfluences) data.body.morphTargetInfluences[data.mouthMorph] = k;
    if (data.tongueBone) data.tongueBone.scale.multiplyScalar(Math.max(0.01, 1 - k));
    const bodyMap = k > 0.5 ? data.bodyTex.closed : data.bodyTex.open;
    if (data.bodyMat.map !== bodyMap) { data.bodyMat.map = bodyMap; data.bodyMat.needsUpdate = true; }

    // drag-to-turn eases back to a slight three-quarter view
    root.rotation.y += (yaw.current - root.rotation.y) * Math.min(1, d * 10);
  });

  return <primitive object={root} />;
}

/* -------------------------------- component -------------------------------- */
interface Props {
  pose: CoachPose;
  size: number;
  /** Shown while loading and if 3D fails (the 2D sprite). */
  fallback: ReactNode;
  /** The fallback sprite's handle, so hop/hearts still work before 3D is ready. */
  fallbackRef?: { current: PetSpriteHandle | null };
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Called when the render loop throws; the parent then switches to the 2D sprite. */
  onCrash?: (where: string, e: unknown) => void;
}

let fxId = 1;

export const Coach3DScene = forwardRef<PetSpriteHandle, Props>(function Coach3DScene(
  { pose, size, fallback, fallbackRef, onPress, accessibilityLabel, style, onCrash },
  ref,
) {
  const reduce = useReducedMotion();
  const animate = !reduce;
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const ctl = useRef<Ctl | null>(null);
  const dragStart = useRef(0);
  const moved = useRef(false);

  useEffect(() => {
    let alive = true;
    loadCoach().then((d) => alive && setData(d)).catch((e) => {
      recordJsError('coach3d:load', e);
      if (__DEV__) console.warn('[Coach3D] falling back to 2D:', e);
      if (alive) setFailed(true);
    });
    return () => { alive = false; };
  }, []);

  const addFx = useCallback((kind: Fx['kind'], n: number) => {
    const items: Fx[] = Array.from({ length: n }, (_, i) => ({
      id: fxId++, kind,
      dx: kind === 'z' ? size * 0.25 : (i - (n - 1) / 2) * size * 0.18 + (Math.random() - 0.5) * size * 0.1,
      rot: (Math.random() - 0.5) * 40,
    }));
    setFx((p) => [...p, ...items]);
    const ids = new Set(items.map((x) => x.id));
    setTimeout(() => setFx((p) => p.filter((x) => !ids.has(x.id))), kind === 'heart' ? 1600 : 2600);
  }, [size]);

  const ready = !!data && !failed;

  // Drive react-three-fiber's frame loop ourselves (frameloop="never"): an
  // error thrown while rendering — in three, in a useFrame callback — would
  // otherwise escape requestAnimationFrame and take the whole app down.
  const crashed = useRef(false);
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let alive = true;
    const tick = (t: number) => {
      if (!alive) return;
      try {
        const st = ctl.current?.state();
        // frameloop="never": r3f takes the timestamp in seconds (rAF gives milliseconds)
        if (st) advance(t / 1000, true, st);
      } catch (e) {
        if (!crashed.current) {
          crashed.current = true;
          recordJsError('coach3d:frame', e);
          onCrash?.('coach3d:frame', e);
          setFailed(true);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [ready, onCrash]);

  const hop = useCallback(() => (ready ? ctl.current?.hop() : fallbackRef?.current?.hop()), [ready, fallbackRef]);
  const hearts = useCallback((n = 3) => {
    if (!ready) return fallbackRef?.current?.hearts(n);
    if (!reduce) addFx('heart', n);
  }, [ready, fallbackRef, addFx, reduce]);
  const grow = useCallback(() => (ready ? ctl.current?.hop() : fallbackRef?.current?.grow()), [ready, fallbackRef]);
  useImperativeHandle(ref, () => ({ hop, hearts, grow }), [hop, hearts, grow]);

  useEffect(() => {
    if (pose !== 'sleep' || reduce || !data) return;
    addFx('z', 1);
    const id = setInterval(() => addFx('z', 1), 1500);
    return () => clearInterval(id);
  }, [pose, reduce, data, addFx]);

  const pan = useMemo(() => PanResponder.create({
    // capture: the tap layer above is the responder on touch-down, so take over only once it is a horizontal drag
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { dragStart.current = ctl.current?.yaw.current ?? 0.35; moved.current = true; },
    onPanResponderMove: (_, g) => { if (ctl.current) ctl.current.yaw.current = dragStart.current + g.dx / (size * 0.4); },
    onPanResponderRelease: () => {
      moved.current = false;
      setTimeout(() => { if (ctl.current && !moved.current) ctl.current.yaw.current = 0.35; }, 2500);
    },
  }), [size]);

  if (!ready || !data) return <>{fallback}</>;

  // The canvas is taller than the slot so ears and hops never clip.
  return (
    <View style={[{ width: size, height: size }, style]} {...pan.panHandlers}>
      {/* r3f's native Canvas puts its own PanResponder on the view that claims
          every touch, so taps never reached a Pressable around it. The canvas
          takes no touches; a transparent layer on top handles tap and drag. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -size * 0.1, right: -size * 0.1, bottom: 0, height: size * 1.25 }}>
        <Canvas
          style={{ flex: 1 }}
          flat
          gl={{ alpha: true, antialias: true }}
          camera={{ fov: 30, near: 0.05, far: 20, position: [0, 0.62, 2.55] }}
          onCreated={({ gl, camera }) => {
            try {
              gl.setClearColor(0xfff3c4, 0);
              camera.lookAt(0, 0.5, 0);
              instrument(gl);
            } catch (e) {
              recordJsError('coach3d:created', e);
              onCrash?.('coach3d:created', e);
            }
          }}
          frameloop="never"
        >
          <hemisphereLight args={[0xffffff, 0xf3e6c2, 1.0]} />
          <directionalLight position={[-1.5, 2.5, 2.2]} intensity={1.2} />
          <directionalLight position={[1.8, 1.4, -1.6]} intensity={0.5} />
          <Suspense fallback={null}>
            <Coach data={data} pose={pose} animate={animate} ctl={ctl} />
          </Suspense>
        </Canvas>
      </View>
      <Pressable
        onPress={() => { hop(); ctl.current?.love(); hearts(3); onPress?.(); }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{ position: 'absolute', left: 0, right: 0, top: -size * 0.15, bottom: 0 }}
      />
      {fx.map((f) => <FloatFx key={f.id} fx={f} size={size} />)}
    </View>
  );
});
