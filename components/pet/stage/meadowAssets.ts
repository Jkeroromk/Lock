import { File } from 'expo-file-system';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadTexture, localUri, shims } from '../coachModel';

/**
 * The plush meadow props made with ChatGPT (images) → Tripo (models):
 * meadow.glb holds one mesh per prop (ground, three trees, bush, flowers,
 * grass, rock, cloud) with no images inside; each prop's colour texture is
 * its own linear-encoded JPEG, loaded the same way as 豆豆's (see
 * coachModel.ts). To improve a prop, regenerate it in Tripo and rebuild the
 * pack — the layout lives in outdoor.ts (MEADOW_LAYOUT).
 */
const MODEL = require('@/assets/pet/3d/meadow/meadow.glb');
const TEX: Record<string, [number, number]> = {
  ground: [require('@/assets/pet/3d/meadow/meadow_ground.jpg'), 1024],
  tree_round: [require('@/assets/pet/3d/meadow/meadow_tree_round.jpg'), 512],
  tree_fruit: [require('@/assets/pet/3d/meadow/meadow_tree_fruit.jpg'), 512],
  tree_pine: [require('@/assets/pet/3d/meadow/meadow_tree_pine.jpg'), 512],
  bush: [require('@/assets/pet/3d/meadow/meadow_bush.jpg'), 512],
  flowers: [require('@/assets/pet/3d/meadow/meadow_flowers.jpg'), 512],
  grass: [require('@/assets/pet/3d/meadow/meadow_grass.jpg'), 512],
  rock: [require('@/assets/pet/3d/meadow/meadow_rock.jpg'), 512],
  cloud: [require('@/assets/pet/3d/meadow/meadow_cloud.jpg'), 512],
};

export type MeadowProps = Record<string, { geometry: THREE.BufferGeometry; map: THREE.Texture }>;

let cache: Promise<MeadowProps> | null = null;
/** Load the props once (cached; retried after a failure). */
export function loadMeadow(): Promise<MeadowProps> {
  if (cache) return cache;
  cache = (async () => {
    shims();
    const bytes = await new File(await localUri(MODEL)).bytes();
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
    const out: MeadowProps = {};
    const meshes: THREE.Mesh[] = [];
    gltf.scene.traverse((o: any) => { if (o.isMesh) meshes.push(o); });
    await Promise.all(meshes.map(async (m) => {
      const t = TEX[m.name];
      if (!t) return;
      out[m.name] = { geometry: m.geometry, map: await loadTexture(t[0], true, t[1]) };
    }));
    return out;
  })();
  cache.catch(() => { cache = null; });
  return cache;
}

/**
 * Buddy kinds that have a Tripo plush model (the others keep the simple toy):
 * rigged by Tripo, clips (idle, walk, hop, sleep, sit) made in Blender; no
 * images inside — the colour texture is its own linear-encoded JPEG.
 */
const BUDDY_MODELS: Record<string, { model: number; tex: number; closed?: number }> = {
  cat: {
    model: require('@/assets/pet/3d/buddy_cat.glb'),
    tex: require('@/assets/pet/3d/buddy_cat.jpg'),
    closed: require('@/assets/pet/3d/buddy_cat_closed.jpg'),
  },
};
import type { RiggedModel } from './buddyCat';
export type BuddyModel = RiggedModel;
const buddyCache: Record<string, Promise<BuddyModel | null>> = {};

/** The buddy's plush model, or null when its kind has none yet. */
export function loadBuddyModel(kind: string): Promise<BuddyModel | null> {
  const src = BUDDY_MODELS[kind];
  if (!src) return Promise.resolve(null);
  if (buddyCache[kind]) return buddyCache[kind];
  const p = (async () => {
    shims();
    const bytes = await new File(await localUri(src.model)).bytes();
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
    if (!gltf.animations?.length) throw new Error('buddy model has no clips');
    const [map, mapClosed] = await Promise.all([
      loadTexture(src.tex, true, 1024),
      src.closed ? loadTexture(src.closed, true, 1024) : Promise.resolve(null),
    ]);
    return { scene: gltf.scene, clips: gltf.animations, map, mapClosed };
  })();
  buddyCache[kind] = p;
  p.catch(() => { delete buddyCache[kind]; });
  return p;
}
