import { forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, advance, useFrame, useStore, type RootState } from '@react-three/fiber/native';
import { useReducedMotion } from 'react-native-reanimated';
import * as THREE from 'three';
import type { CoachPose } from '@/constants/pets';
import { CoachInstance, loadCoachAssets, type CoachAssets, type CoachClip, type CoachLook } from './coachModel';
import { FloatFx, type Fx, type PetSpriteHandle } from './PetSprite';
import { recordJsError } from '@/lib/crashlog';

/**
 * The bichon coach in real-time 3D on the buddy tab. The model, textures and
 * expression / mouth logic live in coachModel.ts (shared with the couple room).
 *
 * Until the model is ready — or if anything fails — `fallback` (the 2D
 * PetSprite) is shown, so the tab never looks empty. This module is only
 * required at runtime by Coach3D.tsx, which guards it.
 */

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
const LOOKS: Record<CoachPose, CoachLook & { clip: CoachClip }> = {
  idle: { clip: 'idle', face: 'open', tongue: 'auto', blink: true },
  blink: { clip: 'idle', face: 'open', tongue: 'auto', blink: true },
  cheer: { clip: 'idle', face: 'happy', tongue: 'out', blink: false },
  wave: { clip: 'idle', face: 'happy', tongue: 'out', blink: false },
  think: { clip: 'idle', face: 'determined', tongue: 'in', blink: true },
  sad: { clip: 'sit', face: 'sad', tongue: 'in', blink: true },
  sleep: { clip: 'sit', face: 'closed', tongue: 'in', blink: false },
};

interface Ctl { hop: () => void; love: () => void; yaw: { current: number }; state: () => RootState }

function Coach({ data, pose, animate, ctl }: { data: CoachAssets; pose: CoachPose; animate: boolean; ctl: { current: Ctl | null } }) {
  const inst = useMemo(() => new CoachInstance(data), [data]);
  const root = useMemo(() => {
    const g = new THREE.Group();
    g.add(inst.root);
    return g;
  }, [inst]);
  const yaw = useRef(0.35);
  const store = useStore();
  const look = LOOKS[pose] ?? LOOKS.idle;

  useEffect(() => {
    inst.look = { face: look.face, tongue: look.tongue, blink: look.blink };
    inst.setBase(look.clip);
  }, [inst, look]);

  useEffect(() => {
    ctl.current = {
      hop: () => { if (animate && pose !== 'sleep') inst.hop(); },
      love: () => { if (pose !== 'sleep') inst.love(); },
      yaw,
      state: () => store.getState(),
    };
  }, [animate, pose, inst, ctl, store]);

  useEffect(() => () => inst.dispose(), [inst]);

  useFrame((_, dt) => {
    inst.update(dt, animate);
    // drag-to-turn eases back to a slight three-quarter view
    root.rotation.y += (yaw.current - root.rotation.y) * Math.min(1, Math.min(dt, 0.05) * 10);
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
  const [data, setData] = useState<CoachAssets | null>(null);
  const [failed, setFailed] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const ctl = useRef<Ctl | null>(null);
  const dragStart = useRef(0);
  const moved = useRef(false);

  useEffect(() => {
    let alive = true;
    loadCoachAssets().then((d) => alive && setData(d)).catch((e) => {
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
