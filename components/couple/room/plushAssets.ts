import { File } from 'expo-file-system';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadTexture, localUri, shims } from '@/components/pet/coachModel';
import type { PlushAssets, PlushPersonModel, PlushPiece } from './plush';

/**
 * Loads the couple room's plush pack (see plush.ts): couple.glb holds the
 * room shell and furniture with no images inside, boy.glb / girl.glb the two
 * rigged people; every colour texture is its own linear-encoded JPEG, loaded
 * like 豆豆's. Built from the Tripo exports by a script (see the project doc
 * "couple-space"); to improve a piece, regenerate it in Tripo and rebuild.
 */
const PACK = require('@/assets/couple/3d/couple.glb');
const BOY = require('@/assets/couple/3d/boy.glb');
const GIRL = require('@/assets/couple/3d/girl.glb');
const TEX: Record<string, [number, number]> = {
  room: [require('@/assets/couple/3d/couple_room.jpg'), 1024],
  sofa: [require('@/assets/couple/3d/couple_sofa.jpg'), 512],
  rug: [require('@/assets/couple/3d/couple_rug.jpg'), 1024],
  lamp: [require('@/assets/couple/3d/couple_lamp.jpg'), 512],
  table: [require('@/assets/couple/3d/couple_table.jpg'), 512],
  bed: [require('@/assets/couple/3d/couple_bed.jpg'), 512],
  plant: [require('@/assets/couple/3d/couple_plant.jpg'), 512],
  shelf: [require('@/assets/couple/3d/couple_shelf.jpg'), 512],
  pouf: [require('@/assets/couple/3d/couple_pouf.jpg'), 512],
  board_frame: [require('@/assets/couple/3d/couple_board_frame.jpg'), 512],
  photo_frame: [require('@/assets/couple/3d/couple_photo_frame.jpg'), 512],
  door: [require('@/assets/couple/3d/couple_door.jpg'), 512],
  wall_shelf: [require('@/assets/couple/3d/couple_wall_shelf.jpg'), 512],
  boy: [require('@/assets/couple/3d/couple_boy.jpg'), 1024],
  girl: [require('@/assets/couple/3d/couple_girl.jpg'), 1024],
};
/** couple.glb mesh → its texture (split pieces share their model's). */
const texOf = (mesh: string) => mesh.replace(/^room_.*/, 'room').replace(/_(base|shade|pot|leaves)$/, '');

async function parse(mod: number) {
  const bytes = await new File(await localUri(mod)).bytes();
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Promise<any>((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
}

let cache: Promise<PlushAssets> | null = null;
/** Load everything once (cached; retried after a failure). */
export function loadCoupleAssets(): Promise<PlushAssets> {
  if (cache) return cache;
  cache = (async () => {
    shims();
    const maps = Object.fromEntries(await Promise.all(Object.entries(TEX).map(async ([k, [mod, size]]) => [k, await loadTexture(mod, true, size)] as const)));
    const [pack, boy, girl] = await Promise.all([parse(PACK), parse(BOY), parse(GIRL)]);
    const pieces: Record<string, PlushPiece> = {};
    pack.scene.traverse((o: any) => {
      if (o.isMesh && maps[texOf(o.name)]) pieces[o.name] = { geometry: o.geometry, map: maps[texOf(o.name)] };
    });
    for (const k of ['room_floor', 'room_left', 'room_back', 'sofa', 'rug', 'lamp_base', 'lamp_shade', 'table', 'bed', 'plant_pot', 'plant_leaves', 'shelf', 'pouf', 'board_frame', 'photo_frame', 'door', 'wall_shelf']) {
      if (!pieces[k]) throw new Error(`couple pack: no ${k}`);
    }
    const person = (g: any, map: any): PlushPersonModel => ({ scene: g.scene, map });
    return { pieces, people: { boy: person(boy, maps.boy), girl: person(girl, maps.girl) } };
  })();
  cache.catch(() => { cache = null; });
  return cache;
}
