import { forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, advance, useFrame, useStore, type RootState } from '@react-three/fiber/native';
import { useReducedMotion } from 'react-native-reanimated';
import * as THREE from 'three';
import type { CoachPose } from '@/constants/pets';
import { CoachInstance, loadCoachAssets, type CoachAssets, type CoachClip, type CoachLook } from './coachModel';
import { FloatFx, type Fx, type PetSpriteHandle } from './PetSprite';
import { Outdoor } from './stage/outdoor';
import { BuddyCat, PlushBuddy } from './stage/buddyCat';
import { loadBuddyModel, loadMeadow, type BuddyModel } from './stage/meadowAssets';
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
// Missing you (sad) sits like a dog (back legs folded, front legs straight);
// asleep lies on the belly with the chin on the front paws, eyes shut.
const LOOKS: Record<CoachPose, CoachLook & { clip: CoachClip; speed?: number }> = {
  idle: { clip: 'idle', face: 'open', tongue: 'auto', blink: true },
  blink: { clip: 'idle', face: 'open', tongue: 'auto', blink: true },
  cheer: { clip: 'idle', face: 'happy', tongue: 'out', blink: false },
  wave: { clip: 'idle', face: 'happy', tongue: 'out', blink: false },
  think: { clip: 'idle', face: 'determined', tongue: 'in', blink: true },
  sad: { clip: 'sit', face: 'sad', tongue: 'in', blink: true },
  sleep: { clip: 'lie', face: 'closed', tongue: 'in', blink: false },
};

interface Ctl { hop: () => void; love: () => void; yaw: { current: number }; state: () => RootState }

function Coach({ data, pose, animate, ctl, x = 0, shadow, castShadow = false }: {
  data: CoachAssets; pose: CoachPose; animate: boolean; ctl: { current: Ctl | null };
  /** Where 豆豆 stands (stage mode) and a contact shadow to stand on. */
  x?: number; shadow?: THREE.Object3D | null;
  /** Cast a real shadow (stage mode has a shadow-casting sun). */
  castShadow?: boolean;
}) {
  const inst = useMemo(() => new CoachInstance(data, { shadows: castShadow }), [data, castShadow]);
  const root = useMemo(() => {
    const g = new THREE.Group();
    g.add(inst.root);
    return g;
  }, [inst]);
  const place = useMemo(() => {
    const g = new THREE.Group();
    g.add(root);
    return g;
  }, [root]);
  useEffect(() => {
    place.position.x = x;
    if (shadow) place.add(shadow);
    return () => { if (shadow) place.remove(shadow); };
  }, [place, x, shadow]);
  const yaw = useRef(0.35);
  const store = useStore();
  const look = LOOKS[pose] ?? LOOKS.idle;

  useEffect(() => {
    inst.look = { face: look.face, tongue: look.tongue, blink: look.blink };
    inst.setBase(look.clip, look.speed);
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

  return <primitive object={place} />;
}

/* --------------------------------- stage --------------------------------- */
// Camera and spots on the stage (world units; 豆豆 is ~1 tall). A fairly wide
// lens from a little above, plus a camera that drifts, follows the phone's
// tilt and orbits on a drag: the parallax is what makes it read as 3D (a long
// lens straight on looked flat — Jason, 11-07).
const STAGE_CAM = { fov: 42, dist: 2.75, elev: (12 * Math.PI) / 180, lookY: 0.58 };
const DOG_X = -0.62;
const BUDDY_X = 0.68;

/** Lives in the Canvas: orbits the camera around the two of them. */
function CameraRig({ lookY, animate, orbit, tilt }: {
  lookY: number; animate: boolean;
  /** Drag offset (radians), set by the gesture outside the Canvas. */
  orbit: { current: number };
  /** Phone tilt −1…1 (accelerometer), 0 if unavailable. */
  tilt: { current: number };
}) {
  const t = useRef(0);
  const az = useRef(0);
  useFrame(({ camera }, dt) => {
    const d = Math.min(dt, 0.05);
    t.current += animate ? d : 0;
    const drift = animate ? Math.sin((t.current * Math.PI * 2) / 16) * 0.1 : 0; // ±6°, very slow
    const want = drift + tilt.current * 0.2 + orbit.current;
    az.current += (want - az.current) * Math.min(1, d * 4);
    const { dist, elev } = STAGE_CAM;
    camera.position.set(Math.sin(az.current) * Math.cos(elev) * dist, lookY + Math.sin(elev) * dist, Math.cos(az.current) * Math.cos(elev) * dist);
    camera.lookAt(0, lookY, 0);
  });
  return null;
}

interface BuddyCtl { hop: () => void }

/** The meadow and the buddy (the dog is added by <Coach>). */
function Meadow({ outdoor, x, asleep, buddyKind, buddyStage, animate, buddyCtl, plush }: {
  outdoor: Outdoor; x: number; asleep: boolean; buddyKind: string; buddyStage: number; animate: boolean;
  buddyCtl: { current: BuddyCtl | null };
  /** The buddy's Tripo plush model, when its kind has one (else the simple toy). */
  plush: BuddyModel | null;
}) {
  // the sky follows the phone's local time; checked every minute
  useEffect(() => {
    const now = () => { const d = new Date(); outdoor.setHour(d.getHours() + d.getMinutes() / 60); };
    now();
    const id = setInterval(now, 60_000);
    return () => clearInterval(id);
  }, [outdoor]);

  const buddy = useMemo(() => (plush ? new PlushBuddy(plush.geometry, plush.map, buddyStage) : new BuddyCat(buddyKind, buddyStage)), [plush, buddyKind, buddyStage]);
  const buddyRoot = useMemo(() => {
    const g = new THREE.Group();
    g.add(buddy.root);
    g.add(outdoor.blob(0.75));
    buddy.root.rotation.y = -0.45;
    return g;
  }, [buddy, outdoor]);
  useEffect(() => { buddyRoot.position.x = x; }, [buddyRoot, x]);
  useEffect(() => () => buddy.dispose(), [buddy]);
  useEffect(() => { buddy.asleep = asleep; }, [buddy, asleep]);
  useEffect(() => { buddyCtl.current = { hop: () => { if (animate) buddy.hop(); } }; }, [buddy, buddyCtl, animate]);

  useFrame((_, dt) => buddy.update(dt, animate));

  return (
    <>
      <primitive object={outdoor.root} />
      <primitive object={buddyRoot} />
    </>
  );
}

/**
 * Camera framing for a w × h stage whose characters stand `floor` px above
 * the bottom edge, and where things land on screen: px per world unit at the
 * characters' depth, the ground line (px from the top) and a world x → px.
 */
function stageMetrics(w: number, h: number, floor = h * 0.08, spots?: { dog: number; buddy: number }) {
  const unit = h / (2 * STAGE_CAM.dist * Math.tan((STAGE_CAM.fov / 2) * Math.PI / 180));
  const groundY = h - floor;
  // aimed at lookY the feet land ~8% above the bottom; aim lower to lift them
  const lookY = STAGE_CAM.lookY + (h * 0.08 - floor) / unit;
  const sx = (x: number) => w / 2 + x * unit;
  const toX = (f: number) => (f * w - w / 2) / unit;
  return { unit, groundY, sx, lookY, dogX: spots ? toX(spots.dog) : DOG_X, buddyX: spots ? toX(spots.buddy) : BUDDY_X };
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
  /**
   * Stage mode: one canvas fills the whole scene (width × height) with the
   * outdoor meadow, 豆豆 on the left and the buddy on the right. `fallback`
   * is then the whole 2D scene. Without it, just 豆豆 in a size × size box.
   */
  stage?: StageOpts;
}

export interface StageOpts {
  width: number;
  height: number;
  buddyKind: string;
  buddyStage: number;
  buddyLabel?: string;
  onBuddyPress?: () => void;
  /** Where the characters' feet are, in px above the bottom edge (default 15% of the height). */
  floor?: number;
  /** Where 豆豆 and the buddy stand, as fractions of the width (default: left and right of centre). */
  spots?: { dog: number; buddy: number };
}

let fxId = 1;

export const Coach3DScene = forwardRef<PetSpriteHandle, Props>(function Coach3DScene(
  { pose, size: boxSize, fallback, fallbackRef, onPress, accessibilityLabel, style, onCrash, stage },
  ref,
) {
  const reduce = useReducedMotion();
  const animate = !reduce;
  const [data, setData] = useState<CoachAssets | null>(null);
  const [failed, setFailed] = useState(false);
  const [fx, setFx] = useState<(Fx & { who?: 'buddy' })[]>([]);
  const ctl = useRef<Ctl | null>(null);
  const buddyCtl = useRef<BuddyCtl | null>(null);
  const staged = !!stage;
  const outdoor = useMemo(() => (staged ? new Outdoor() : null), [staged]);
  useEffect(() => () => outdoor?.dispose(), [outdoor]);
  // the plush Tripo props replace the simple built-in ones once loaded (if they fail, the simple ones stay)
  useEffect(() => {
    if (!outdoor) return;
    let alive = true;
    loadMeadow().then((p) => { if (alive) outdoor.dress(p); }).catch((e) => recordJsError('coach3d:meadow', e));
    return () => { alive = false; };
  }, [outdoor]);
  const buddyKind = stage?.buddyKind ?? '';
  const [plush, setPlush] = useState<BuddyModel | null>(null);
  useEffect(() => {
    if (!staged) return;
    let alive = true;
    setPlush(null);
    loadBuddyModel(buddyKind).then((b) => { if (alive) setPlush(b); }).catch((e) => recordJsError('coach3d:buddy', e));
    return () => { alive = false; };
  }, [staged, buddyKind]);
  const dogShadow = useMemo(() => outdoor?.blob(0.95) ?? null, [outdoor]);
  const m = stage ? stageMetrics(stage.width, stage.height, stage.floor, stage.spots) : null;
  // the dog's on-screen height: hearts and Zz are sized to it
  const size = m ? Math.round(m.unit * 1.05) : boxSize;
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

  const addFx = useCallback((kind: Fx['kind'], n: number, who?: 'buddy') => {
    const items: (Fx & { who?: 'buddy' })[] = Array.from({ length: n }, (_, i) => ({
      id: fxId++, kind, who,
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

  // Stage: a horizontal drag swings the camera around the meadow (springs
  // back after a moment); the phone's tilt nudges it too.
  const orbit = useRef(0);
  const tilt = useRef(0);
  const stageW = stage?.width ?? 0;
  useEffect(() => {
    if (!staged || reduce) return;
    let sub: { remove: () => void } | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Accelerometer } = require('expo-sensors');
      Accelerometer.setUpdateInterval(60);
      sub = Accelerometer.addListener(({ x }: { x: number }) => {
        tilt.current += (Math.max(-1, Math.min(1, x)) - tilt.current) * 0.2;
      });
    } catch {}
    return () => sub?.remove();
  }, [staged, reduce]);

  const pan = useMemo(() => PanResponder.create({
    // capture: the tap layer above is the responder on touch-down, so take over only once it is a horizontal drag
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => {
      dragStart.current = staged ? orbit.current : ctl.current?.yaw.current ?? 0.35;
      moved.current = true;
    },
    onPanResponderMove: (_, g) => {
      if (staged) orbit.current = Math.max(-0.75, Math.min(0.75, dragStart.current - (g.dx / Math.max(1, stageW)) * 1.6));
      else if (ctl.current) ctl.current.yaw.current = dragStart.current + g.dx / (size * 0.4);
    },
    onPanResponderRelease: () => {
      moved.current = false;
      setTimeout(() => {
        if (moved.current) return;
        if (staged) orbit.current = 0;
        else if (ctl.current) ctl.current.yaw.current = 0.35;
      }, 2500);
    },
  }), [size, staged, stageW]);

  if (!ready || !data) return <>{fallback}</>;

  if (stage && m && outdoor) {
    // One canvas for the whole scene: meadow, 豆豆 (left), the buddy (right).
    // Taps: left of the midpoint pats 豆豆, right of it the buddy.
    const { width: W, height: H } = stage;
    const dogX = m.sx(m.dogX), buddyX = m.sx(m.buddyX), mid = (dogX + buddyX) / 2;
    const fxBox = (cx: number) => ({ position: 'absolute' as const, left: cx - size / 2, top: m.groundY - size, width: size, height: size });
    return (
      <View style={[{ width: W, height: H, overflow: 'hidden' }, style]} {...pan.panHandlers}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          <Canvas
            style={{ flex: 1 }}
            flat
            shadows="percentage"
            gl={{ antialias: true }}
            camera={{ fov: STAGE_CAM.fov, near: 0.05, far: 60, position: [0, m.lookY + 0.6, STAGE_CAM.dist] }}
            onCreated={({ gl, camera, scene }) => {
              try {
                gl.setClearColor(0x8fd3ff, 1);
                camera.lookAt(0, m.lookY, 0);
                scene.fog = outdoor.fog;
                instrument(gl);
              } catch (e) {
                recordJsError('coach3d:created', e);
                onCrash?.('coach3d:created', e);
              }
            }}
            frameloop="never"
          >
            <Suspense fallback={null}>
              {outdoor ? <Meadow outdoor={outdoor} x={m.buddyX} asleep={pose === 'sleep'} buddyKind={stage.buddyKind} buddyStage={stage.buddyStage} animate={animate} buddyCtl={buddyCtl} plush={plush} /> : null}
              <Coach data={data} pose={pose} animate={animate} ctl={ctl} x={m.dogX} shadow={dogShadow} castShadow />
              <CameraRig lookY={m.lookY} animate={animate} orbit={orbit} tilt={tilt} />
            </Suspense>
          </Canvas>
        </View>
        <Pressable
          onPress={() => { hop(); ctl.current?.love(); hearts(3); onPress?.(); }}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: mid }}
        />
        <Pressable
          onPress={() => { buddyCtl.current?.hop(); if (!reduce && pose !== 'sleep') addFx('heart', 2, 'buddy'); stage.onBuddyPress?.(); }}
          accessibilityRole="button"
          accessibilityLabel={stage.buddyLabel}
          style={{ position: 'absolute', left: mid, top: 0, bottom: 0, right: 0 }}
        />
        <View pointerEvents="none" style={fxBox(dogX)}>
          {fx.filter((f) => !f.who).map((f) => <FloatFx key={f.id} fx={f} size={size} />)}
        </View>
        <View pointerEvents="none" style={fxBox(buddyX)}>
          {fx.filter((f) => f.who === 'buddy').map((f) => <FloatFx key={f.id} fx={f} size={Math.round(size * 0.8)} />)}
        </View>
      </View>
    );
  }

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
