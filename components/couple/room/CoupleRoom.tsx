import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import { useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type * as THREE from 'three';
import type { Gender, NudgeKind } from '@/services/couple';
import { useTranslation } from '@/i18n';
import Overlay from './Overlay';
import { Orbit } from './orbit';
import { SLOT_COUNT, STRIDE, World, type TapHit } from './world';
import { CoachInstance, loadCoachAssets } from '@/components/pet/coachModel';
import { loadCoupleAssets } from './plushAssets';

/**
 * The couple's 3D room: the two of you (Tripo plush dolls) and 豆豆 (the 3D
 * bichon) wander a plush little room (Tripo models, plush.ts); the walls
 * between you and the room sink away as you turn it. Until the plush pack has
 * loaded (or if it can't) the original toon room with ink outlines shows. Words (names, bubbles, the anniversary board, frame captions) are
 * React Native views over the 3D view — see Overlay.tsx.
 *
 * Files: world.ts builds and animates the scene, villager.ts / pet.ts the
 * characters, physics.ts the floor plan and collisions, textures.ts the
 * painted-in-code textures, orbit.ts the camera.
 */

export interface CoupleRoomProps {
  me: { name: string; gender: Gender };
  partner: { name: string; gender: Gender };
  /** Stand-in tint while 豆豆 loads (cat orange, corgi tan, penguin dark grey). */
  pet: { kind: string; stage: number };
  /** Furniture style per slot (constants/coupleHome.ts); missing slots use the free default. */
  furniture?: Record<string, string> | null;
  daysTogether: number;
  nextLabel: string; // e.g. "200 天纪念 · 还有 72 天"
  frames: { id: string; title: string; sub: string; emoji: string }[]; // up to 3
  waterLevels: { me: number; partner: number }; // 0..1 bottles
  event: { id: number; kind: NudgeKind } | null; // id increments → my villager walks to partner and plays nudge
  bubbles: { me?: string | null; partner?: string | null; pet?: string | null; object?: string | null };
  night?: boolean;
  onTapAnniversary: (id: string) => void; // 'together' for big board, else frame id
  onTapBottles: () => void;
  onTapPerson: (who: 'me' | 'partner') => void;
  onTapPet: () => void;
  onTapWindow?: () => void;
  onTapTable?: () => void;
  /** Optional extras: the room already reacts (sit together / nap / lamp); these just tell you. */
  onTapSofa?: () => void;
  onTapBed?: () => void;
  onTapLamp?: () => void;
  paused?: boolean;
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  /** Board header; defaults to the "our anniversaries" string. */
  boardTitle?: string;
  accessibilityLabel?: string;
}

/** Shared between the 3D loop (inside the Canvas) and the gestures (outside it). */
interface Link {
  camera: THREE.PerspectiveCamera | null;
  w: number;
  h: number;
}

export default function CoupleRoom(props: CoupleRoomProps) {
  const { me, partner, pet, daysTogether, nextLabel, frames, waterLevels, event, bubbles, night = false, paused = false, bottomInset = 0, style } = props;
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  // The scene is built once; props are pushed into it below.
  const world = useMemo(() => new World({ me: me.gender, partner: partner.gender, petKind: pet.kind, petStage: pet.stage }), []);
  const orbit = useMemo(() => new Orbit(), []);
  const link = useRef<Link>({ camera: null, w: 1, h: 1 }).current;
  const overlay = useSharedValue<number[]>(new Array(SLOT_COUNT * STRIDE).fill(0));
  useEffect(() => () => world.dispose(), [world]);
  // 豆豆 moves in once the model has loaded (the toon cat stands in until then, or if it fails)
  useEffect(() => {
    let alive = true;
    loadCoachAssets()
      .then((a) => { if (alive) world.pet.useCoach(new CoachInstance(a, { shadows: true })); })
      .catch((e) => { if (__DEV__) console.warn('[CoupleRoom] 豆豆 failed to load, keeping the cat:', e); });
    return () => { alive = false; };
  }, [world]);
  // the plush room (Tripo models) replaces the toon one once it has loaded
  useEffect(() => {
    let alive = true;
    loadCoupleAssets()
      .then((a) => { if (alive) world.usePlush(a); })
      .catch((e) => { if (__DEV__) console.warn('[CoupleRoom] plush room failed to load, keeping the toon room:', e); });
    return () => { alive = false; };
  }, [world]);

  // latest callbacks for the gesture handlers
  const propsRef = useRef(props);
  propsRef.current = props;

  world.reduced = reduced;

  const genders = useRef({ me: me.gender, partner: partner.gender });
  useEffect(() => {
    if (genders.current.me !== me.gender) world.me.setGender(me.gender);
    if (genders.current.partner !== partner.gender) world.partner.setGender(partner.gender);
    genders.current = { me: me.gender, partner: partner.gender };
    world.setGenders(me.gender, partner.gender);
  }, [me.gender, partner.gender]);
  useEffect(() => { world.pet.setKind(pet.kind); }, [pet.kind]);
  useEffect(() => { world.pet.setStage(pet.stage); }, [pet.stage]);
  useEffect(() => { world.setWater(waterLevels.me, waterLevels.partner); }, [waterLevels.me, waterLevels.partner]);
  useEffect(() => { world.setFrameCount(frames.length); }, [frames.length]);
  useEffect(() => { world.setNight(night); }, [night]);
  const furnitureKey = JSON.stringify(props.furniture ?? {});
  useEffect(() => { world.setFurniture(props.furniture); }, [furnitureKey]);

  // a new event id plays the nudge (the one present at mount is old news)
  const lastEvent = useRef(event?.id ?? null);
  useEffect(() => {
    if (!event || event.id === lastEvent.current) return;
    lastEvent.current = event.id;
    world.playEvent(event.kind);
  }, [event?.id]);

  const onHit = (hit: TapHit) => {
    const p = propsRef.current;
    Haptics.selectionAsync().catch(() => {});
    switch (hit.kind) {
      case 'person': p.onTapPerson(hit.who); break;
      case 'pet': p.onTapPet(); break;
      case 'board': p.onTapAnniversary('together'); break;
      case 'frame': { const f = p.frames[hit.index]; if (f) p.onTapAnniversary(f.id); break; }
      case 'bottles': p.onTapBottles(); break;
      case 'window': p.onTapWindow?.(); break;
      case 'table': p.onTapTable?.(); break;
      case 'sofa': p.onTapSofa?.(); break;
      case 'bed': p.onTapBed?.(); break;
      case 'lamp': p.onTapLamp?.(); break;
    }
  };

  // Gestures: gesture-handler on a transparent view above the GL view rather
  // than r3f's own pointer events. r3f's native events come from one RN
  // responder, which can't tell a one-finger turn from a pinch reliably and
  // fights the screen's scroll/back gestures; gesture-handler recognises pan,
  // pinch and tap natively and side by side. Taps are then raycast here
  // (world.tap) against the same camera the loop renders with.
  // Callbacks run on the JS thread (disableReanimated) because they drive the
  // three.js objects, which live there.
  const pan = usePanGesture({
    disableReanimated: true,
    maxPointers: 1,
    minDistance: 6,
    onActivate: () => orbit.dragStart(),
    onUpdate: (e) => orbit.drag(e.changeX, e.changeY),
    onDeactivate: (e) => orbit.dragEnd(e.velocityX, e.velocityY, reduced),
  });
  const pinch = usePinchGesture({
    disableReanimated: true,
    onActivate: () => orbit.pinchStart(),
    onUpdate: (e) => orbit.pinch(e.scale),
    onDeactivate: () => orbit.pinchEnd(),
  });
  const tap = useTapGesture({
    disableReanimated: true,
    maxDistance: 8,
    onDeactivate: (e) => {
      if (e.canceled || !link.camera) return;
      const hit = world.tap(e.x, e.y, link.w, link.h, link.camera);
      if (hit) onHit(hit);
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch, tap);

  const boardTitle = props.boardTitle ?? t('couple.annTitle');
  const boardDays = t('couple.together', { n: String(daysTogether) });

  return (
    <View style={[styles.wrap, style]}>
      <Canvas
        style={StyleSheet.absoluteFill}
        flat
        shadows="percentage"
        frameloop={paused ? 'never' : 'always'}
        camera={{ fov: 32, near: 0.1, far: 100, position: [12.5, 10.5, 12.5] }}
      >
        <Scene world={world} orbit={orbit} link={link} overlay={overlay} bottomInset={bottomInset} />
      </Canvas>
      <GestureDetector gesture={gesture}>
        <View
          collapsable={false}
          style={StyleSheet.absoluteFill}
          accessible
          accessibilityRole="image"
          accessibilityLabel={props.accessibilityLabel ?? t('couple.title')}
        />
      </GestureDetector>
      <Overlay
        pos={overlay}
        meName={me.name}
        partnerName={partner.name}
        bubbles={bubbles}
        boardTitle={boardTitle}
        boardDays={boardDays}
        nextLabel={nextLabel}
        frames={frames}
      />
    </View>
  );
}

/** Lives inside the Canvas: runs the loop and keeps the camera fitted to the view. */
function Scene({ world, orbit, link, overlay, bottomInset }: {
  world: World;
  orbit: Orbit;
  link: Link;
  overlay: SharedValue<number[]>;
  bottomInset: number;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  // the plush walls sink into the floor and are cut off there (plane clipping)
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);

  useEffect(() => {
    scene.background = world.bg;
    return () => { scene.background = null; };
  }, [scene, world]);

  // Fit the camera when the view or the sheet over it changes: a wider lens on
  // tall narrow views; the room drawn higher by half the covered height.
  useEffect(() => {
    const w = Math.max(1, size.width), h = Math.max(1, size.height);
    link.camera = camera;
    link.w = w;
    link.h = h;
    orbit.setViewHeight(h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.6 ? 40 : 32;
    if (bottomInset > 0) camera.setViewOffset(w, h, 0, bottomInset * 0.5, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, bottomInset]);

  const buf = useMemo(() => new Float32Array(SLOT_COUNT * STRIDE), []);
  const last = useMemo(() => new Float32Array(SLOT_COUNT * STRIDE).fill(-1), []);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    orbit.update(dt, camera);
    world.update(dt, camera, orbit.target);
    world.project(camera, link.w, link.h, buf);
    // Hand the overlay positions to the UI thread only when something moved
    // half a pixel (one small array then; nothing at all while still).
    let changed = false;
    for (let i = 0; i < buf.length; i++) {
      if (Math.abs(buf[i] - last[i]) > (i % STRIDE < 2 ? 0.5 : 0.005)) { changed = true; break; }
    }
    if (changed) {
      last.set(buf);
      overlay.value = Array.from(buf);
    }
  });

  return <primitive object={world.root} />;
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#F2F1EC' },
});
