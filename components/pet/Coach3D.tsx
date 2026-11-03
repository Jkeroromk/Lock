import { forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useReducedMotion } from 'react-native-reanimated';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CoachPose } from '@/constants/pets';
import { FloatFx, type Fx, type PetSpriteHandle } from './PetSprite';

/**
 * The bichon coach in real-time 3D (Tripo model, animated in Blender).
 *
 * Clips in coach.glb: idle (breathing, looking around, head tilts, tongue
 * pant), walk, sit (sits down, holds, stands up), hop. Facial expressions are
 * texture swaps on the head mesh — open / blink / happy (^ ^) — so the face
 * never tears.
 *
 * Loading avoids the parts of react-three-fiber's native polyfill that use the
 * old expo-file-system API (see couple/room/textures.ts): the GLB has no
 * embedded images and is read with the new File API; textures are separate
 * bundled JPEGs that expo-gl uploads straight from their local file.
 *
 * Until the model is ready — or if anything fails — `fallback` (the 2D
 * PetSprite) is shown, so the tab never looks empty.
 */

const MODEL = require('@/assets/pet/3d/coach.glb');
const TEX = {
  body: require('@/assets/pet/3d/body_base.jpg'),
  bodyN: require('@/assets/pet/3d/body_normal.jpg'),
  head: require('@/assets/pet/3d/head_base.jpg'),
  headN: require('@/assets/pet/3d/head_normal.jpg'),
  gear: require('@/assets/pet/3d/gear_base.jpg'),
  gearN: require('@/assets/pet/3d/gear_normal.jpg'),
  blink: require('@/assets/pet/3d/face_blink.jpg'),
  happy: require('@/assets/pet/3d/face_happy.jpg'),
};
type TexKey = keyof typeof TEX;

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
  // Colours stay as authored: the canvas renders `linear` (no sRGB decode or
  // encode), which also avoids sRGB internal formats expo-gl may not take.
  t.colorSpace = THREE.NoColorSpace;
  void srgb;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

interface Loaded {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  headMat: THREE.MeshStandardMaterial;
  faces: { open: THREE.Texture; blink: THREE.Texture; happy: THREE.Texture };
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
    const sizes: Record<TexKey, number> = { body: 2048, bodyN: 2048, head: 2048, headN: 2048, gear: 1024, gearN: 1024, blink: 2048, happy: 2048 };
    const keys = Object.keys(TEX) as TexKey[];
    const tex = Object.fromEntries(
      await Promise.all(keys.map(async (k) => [k, await loadTexture(TEX[k], !k.endsWith('N'), sizes[k])] as const)),
    ) as Record<TexKey, THREE.Texture>;
    const mats: Record<string, THREE.MeshStandardMaterial> = {
      body: new THREE.MeshStandardMaterial({ map: tex.body, normalMap: tex.bodyN, roughness: 0.85, metalness: 0 }),
      head: new THREE.MeshStandardMaterial({ map: tex.head, normalMap: tex.headN, roughness: 0.8, metalness: 0 }),
      gear: new THREE.MeshStandardMaterial({ map: tex.gear, normalMap: tex.gearN, roughness: 0.55, metalness: 0 }),
    };
    const scene: THREE.Group = gltf.scene;
    scene.traverse((o: any) => {
      if (!o.isMesh) return;
      const key = Object.keys(mats).find((k) => o.name.startsWith(k) || o.geometry?.name?.startsWith(k));
      if (key) o.material = mats[key];
      o.frustumCulled = false; // skinned bounds don't follow the pose
    });
    return { scene, clips: gltf.animations, headMat: mats.head, faces: { open: tex.head, blink: tex.blink, happy: tex.happy } };
  })();
  cache.catch(() => { cache = null; });
  return cache;
}

/* --------------------------------- scene --------------------------------- */
type Mode = 'idle' | 'cheer' | 'sit' | 'sleep';
const modeOf = (p: CoachPose): Mode => (p === 'cheer' ? 'cheer' : p === 'sleep' ? 'sleep' : p === 'sad' ? 'sit' : 'idle');

interface Ctl { hop: () => void; yaw: { current: number } }

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
  const current = useRef<THREE.AnimationAction | null>(null);
  const holdAt = useRef<number | null>(null);
  const hopping = useRef(false);
  const face = useRef<'open' | 'blink' | 'happy'>('open');
  const blinkUntil = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 2);
  const clock = useRef(0);
  const yaw = useRef(0.35);
  const mode = modeOf(pose);

  const play = useCallback((name: string, opts: { once?: boolean; holdAt?: number } = {}) => {
    const a = actions[name];
    if (!a) return;
    const prev = current.current;
    a.reset();
    a.setLoop(opts.once || opts.holdAt != null ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    a.paused = false;
    holdAt.current = opts.holdAt ?? null;
    a.enabled = true;
    a.play();
    if (prev && prev !== a) a.crossFadeFrom(prev, 0.3, false);
    current.current = a;
  }, [actions]);

  const base = useCallback(() => {
    if (mode === 'sit' || mode === 'sleep') play('sit', { holdAt: 1.7 });
    else play('idle'); // cheer = idle with a ^ ^ face; PetHome adds the celebration hop
  }, [mode, play]);

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
        if (!animate || mode === 'sleep') return;
        hopping.current = true;
        play('hop', { once: true });
      },
      yaw,
    };
  }, [animate, mode, play, ctl]);

  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    clock.current += d;
    if (animate) mixer.update(d);
    const a = current.current;
    if (a && holdAt.current != null && a.time >= holdAt.current) a.paused = true;

    // Face: sleeping = eyes shut; cheering/hopping = ^ ^; otherwise blink now and then.
    let want: 'open' | 'blink' | 'happy' = 'open';
    if (mode === 'sleep') want = 'blink';
    else if (mode === 'cheer' || hopping.current) want = 'happy';
    else if (animate) {
      const t = clock.current;
      if (t >= nextBlink.current) {
        blinkUntil.current = t + 0.13;
        nextBlink.current = t + 2.2 + Math.random() * 2.6;
        if (Math.random() < 0.25) nextBlink.current = t + 0.32; // double blink
      }
      if (t < blinkUntil.current) want = 'blink';
    }
    if (want !== face.current) {
      face.current = want;
      data.headMat.map = data.faces[want];
      data.headMat.needsUpdate = true;
    }
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
}

let fxId = 1;

export const Coach3D = forwardRef<PetSpriteHandle, Props>(function Coach3D(
  { pose, size, fallback, fallbackRef, onPress, accessibilityLabel, style },
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
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
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
      <Pressable
        onPress={() => { hop(); hearts(3); onPress?.(); }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{ position: 'absolute', left: -size * 0.1, right: -size * 0.1, bottom: 0, height: size * 1.25 }}
      >
        <Canvas
          style={{ flex: 1 }}
          linear
          flat
          gl={{ alpha: true, antialias: true }}
          camera={{ fov: 30, near: 0.05, far: 20, position: [0, 0.62, 2.55] }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(0xfff3c4, 0);
            camera.lookAt(0, 0.5, 0);
          }}
          frameloop={animate ? 'always' : 'demand'}
        >
          <hemisphereLight args={[0xffffff, 0xe8d9a8, 1.1]} />
          <directionalLight position={[-1.5, 2.5, 2.2]} intensity={1.6} />
          <directionalLight position={[1.8, 1.4, -1.6]} intensity={0.9} />
          <Suspense fallback={null}>
            <Coach data={data} pose={pose} animate={animate} ctl={ctl} />
          </Suspense>
        </Canvas>
      </Pressable>
      {fx.map((f) => <FloatFx key={f.id} fx={f} size={size} />)}
    </View>
  );
});
