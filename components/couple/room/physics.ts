/**
 * Where things stand on the floor (x/z rectangles, room is 8 × 8 centred on 0):
 * the two villagers and the pet walk round them and round each other instead
 * of through them. Everything here works on plain {x, z} objects and writes
 * into them, so nothing is allocated per frame.
 */

export interface Obstacle { x0: number; x1: number; z0: number; z1: number; name: string; soft?: boolean }

export const OBSTACLES: Obstacle[] = [
  { x0: -3.75, x1: -2.45, z0: -0.85, z1: 2.05, name: 'sofa' },
  { x0: 1.55, x1: 2.85, z0: -2.55, z1: -1.25, name: 'table' },
  { x0: 2.85, x1: 3.75, z0: -3.75, z1: -2.85, name: 'plant' },
  { x0: -3.6, x1: -3.0, z0: -3.5, z1: -2.9, name: 'lamp' },
  // the pet bed: people walk round it, the pet walks in
  { x0: -2.15, x1: -1.05, z0: -3.15, z1: -2.05, name: 'bed', soft: true },
  { x0: -0.85, x1: -0.35, z0: -3.15, z1: -2.65, name: 'bowl' },
  { x0: -1.8, x1: 0.6, z0: 3.3, z1: 3.75, name: 'bookcase' },
];

/** Inner half size of the room (walls are at ±4, minus their thickness and a margin). */
export const BOUND = 3.55;

type XZ = { x: number; z: number };

/** Keep a circle of radius r inside the room and out of the furniture (slides along edges). */
export function collide<T extends XZ>(pos: T, r: number, ignoreSoft = false): T {
  pos.x = Math.max(-BOUND + r, Math.min(BOUND - r, pos.x));
  pos.z = Math.max(-BOUND + r, Math.min(BOUND - r, pos.z));
  for (let i = 0; i < OBSTACLES.length; i++) {
    const o = OBSTACLES[i];
    if (ignoreSoft && o.soft) continue;
    const x0 = o.x0 - r, x1 = o.x1 + r, z0 = o.z0 - r, z1 = o.z1 + r;
    if (pos.x > x0 && pos.x < x1 && pos.z > z0 && pos.z < z1) {
      // push out the shortest way, so the walker slides along the edge
      const dl = pos.x - x0, dr = x1 - pos.x, dn = pos.z - z0, df = z1 - pos.z;
      const m = Math.min(dl, dr, dn, df);
      if (m === dl) pos.x = x0; else if (m === dr) pos.x = x1; else if (m === dn) pos.z = z0; else pos.z = z1;
    }
  }
  return pos;
}

export function free(x: number, z: number, r: number) {
  if (Math.abs(x) > BOUND - r || Math.abs(z) > BOUND - r) return false;
  for (let i = 0; i < OBSTACLES.length; i++) {
    const o = OBSTACLES[i];
    if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return false;
  }
  return true;
}

/** A random free spot on the floor, written into out. */
export function pickTarget<T extends XZ>(out: T, r = 0.35): T {
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() * 2 - 1) * (BOUND - r);
    const z = (Math.random() * 2 - 1) * (BOUND - r);
    if (free(x, z, r)) { out.x = x; out.z = z; return out; }
  }
  out.x = 0.3; out.z = 0.6;
  return out;
}

export const smooth = (e0: number, e1: number, x: number) => {
  const k = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
};

/** Shortest signed angle from a to b. */
export const angleDiff = (a: number, b: number) => {
  const d = b - a;
  return Math.atan2(Math.sin(d), Math.cos(d));
};
