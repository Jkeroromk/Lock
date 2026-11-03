import * as THREE from 'three';
import { angleDiff, collide } from './physics';

/**
 * Something that walks about the floor: a villager or the pet. Holds the
 * walking state; the subclasses build the body and animate it.
 * Nothing here allocates per frame.
 */
export class Actor {
  /** Placed in the room; turned to face where it walks. */
  readonly root = new THREE.Group();
  radius = 0.32;
  speed = 0.9;
  /** The pet walks into its bed; people walk round it. */
  ignoreSoft = false;

  readonly target = new THREE.Vector3();
  hasTarget = false;
  idleUntil = 0;
  onArrive: (() => void) | null = null;

  // stuck check: if it barely moved in 1.2 s it gives up and picks somewhere else
  private checkT = -1;
  private checkX = 0;
  private checkZ = 0;

  get position() { return this.root.position; }

  goTo(x: number, z: number, onArrive: (() => void) | null = null) {
    this.target.set(x, 0, z);
    collide(this.target, this.radius, this.ignoreSoft);
    this.hasTarget = true;
    this.onArrive = onArrive;
    this.checkT = -1;
  }

  stop() {
    this.hasTarget = false;
    this.onArrive = null;
  }

  /** One step towards the target. Returns true once there (or stuck). */
  protected step(dt: number, t: number): boolean {
    const p = this.root.position;
    const dx = this.target.x - p.x, dz = this.target.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.12) return true;
    this.root.rotation.y += angleDiff(this.root.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 8);
    const move = Math.min(dist, this.speed * dt) / dist;
    p.x += dx * move;
    p.z += dz * move;
    collide(p, this.radius, this.ignoreSoft);
    if (this.checkT < 0 || t - this.checkT > 1.2) {
      const stuck = this.checkT >= 0 && Math.hypot(p.x - this.checkX, p.z - this.checkZ) < 0.15;
      this.checkT = t; this.checkX = p.x; this.checkZ = p.z;
      if (stuck) return true;
    }
    return false;
  }

  /** Walk; when arriving, clear the target and run onArrive. Returns true while moving. */
  protected walk(dt: number, t: number, idleFor: number): boolean {
    if (!this.step(dt, t)) return true;
    this.hasTarget = false;
    this.idleUntil = t + idleFor;
    const cb = this.onArrive;
    this.onArrive = null;
    cb?.();
    return false;
  }

  faceTo(x: number, z: number, k: number) {
    const p = this.root.position;
    this.root.rotation.y += angleDiff(this.root.rotation.y, Math.atan2(x - p.x, z - p.z)) * Math.min(1, k);
  }

  /** Sitting actors don't get pushed. */
  get pinned() { return false; }
}

/** Keep people and the pet out of each other (pinned ones stay put). */
export function separate(list: Actor[]) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const A = list[i], B = list[j];
    const pa = A.position, pb = B.position;
    const dx = pb.x - pa.x, dz = pb.z - pa.z;
    const dist = Math.hypot(dx, dz) || 0.0001, min = A.radius + B.radius;
    if (dist >= min) continue;
    const push = (min - dist) / 2, nx = dx / dist, nz = dz / dist;
    const fa = A.pinned ? 0 : B.pinned ? 2 : 1, fb = B.pinned ? 0 : A.pinned ? 2 : 1;
    if (fa) { pa.x -= nx * push * fa; pa.z -= nz * push * fa; collide(pa, A.radius, A.ignoreSoft); }
    if (fb) { pb.x += nx * push * fb; pb.z += nz * push * fb; collide(pb, B.radius, B.ignoreSoft); }
  }
}
