import * as THREE from 'three';
import { Actor } from './actor';
import { Kit, castShadows, disposeTree, flat } from './kit';
import { pickTarget } from './physics';
import type { CoachInstance } from '@/components/pet/coachModel';

/**
 * The room's dog: 豆豆, the same 3D bichon as the buddy tab (useCoach), walking,
 * idling, napping in its bed and hopping when tapped. Until that model has
 * loaded — or if it can't — a round toon cat stands in.
 */
const COACH_SCALE = 1.0; // the bichon is ~1 unit tall, people ~1.6 (Jason: 0.62 was far too small)
const AWAKE_LOOK = { face: 'open', tongue: 'auto', blink: true } as const;
const NAP_LOOK = { face: 'closed', tongue: 'in', blink: false } as const;

interface Tint { fur: string; stripe: string; belly: string }
const TINTS: Record<string, Tint> = {
  cat: { fur: '#F7A14A', stripe: '#D9752B', belly: '#FFF1DE' },
  corgi: { fur: '#D9A066', stripe: '#B9783E', belly: '#FFF6E8' },
  penguin: { fur: '#4A4F57', stripe: '#33373D', belly: '#F4F4F0' },
};
const tintOf = (kind: string) => TINTS[kind] ?? TINTS.cat;
const scaleOf = (stage: number) => 0.8 + 0.1 * (Math.max(1, Math.min(3, Math.round(stage) || 1)) - 1);

interface Rig { group: THREE.Group; inner: THREE.Group; head: THREE.Group; tail: THREE.Group }

function buildRig(kit: Kit, c: Tint): Rig {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);
  const body = kit.mesh(new THREE.SphereGeometry(0.34, 22, 16), c.fur);
  body.scale.set(1, 0.8, 1.3);
  body.position.y = 0.3;
  inner.add(body);
  const belly = kit.mesh(new THREE.SphereGeometry(0.25, 16, 12), c.belly, { outline: 0 });
  belly.scale.set(0.9, 0.7, 1.0);
  belly.position.set(0, 0.25, 0.14);
  inner.add(belly);

  const head = new THREE.Group();
  head.position.set(0, 0.62, 0.32);
  inner.add(head);
  const skull = kit.mesh(new THREE.SphereGeometry(0.3, 22, 16), c.fur);
  skull.scale.set(1.12, 0.95, 1);
  head.add(skull);
  const black = flat('#0A0A0A'), cheek = flat('#FF9BB0');
  const eyeGeo = new THREE.TorusGeometry(0.04, 0.014, 6, 12, Math.PI);
  const blushGeo = new THREE.CircleGeometry(0.045, 14);
  for (const s of [-1, 1]) {
    const ear = kit.mesh(new THREE.ConeGeometry(0.11, 0.2, 4), c.fur, { outline: 0.06 });
    ear.position.set(s * 0.19, 0.27, -0.02);
    ear.rotation.z = -s * 0.3;
    head.add(ear);
    const eye = new THREE.Mesh(eyeGeo, black);
    eye.position.set(s * 0.11, 0.03, 0.28);
    head.add(eye);
    const blush = new THREE.Mesh(blushGeo, cheek);
    blush.position.set(s * 0.19, -0.06, 0.25);
    blush.lookAt(blush.position.x * 3, blush.position.y * 3, blush.position.z * 3);
    blush.userData.noShadow = true;
    head.add(blush);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), flat('#FF5C7A'));
  nose.position.set(0, -0.03, 0.3);
  head.add(nose);
  const stripe = kit.mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16, Math.PI), c.stripe, { outline: 0 });
  stripe.position.set(0, 0.2, 0.08);
  stripe.rotation.x = -0.4;
  head.add(stripe);
  const pawGeo = new THREE.SphereGeometry(0.08, 10, 8);
  for (const s of [-1, 1]) for (const f of [-1, 1]) {
    const paw = kit.mesh(pawGeo, c.belly, { outline: 0.06 });
    paw.scale.y = 0.6;
    paw.position.set(s * 0.18, 0.04, f * 0.25);
    inner.add(paw);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.32, -0.42);
  inner.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.2, -0.15), new THREE.Vector3(0.1, 0.45, -0.12), new THREE.Vector3(0.15, 0.55, 0.02),
  ]);
  tail.add(kit.mesh(new THREE.TubeGeometry(curve, 16, 0.06, 8, false), c.fur, { outline: 0.15 }));
  castShadows(group, (m) => !!m.userData.noShadow);
  return { group, inner, head, tail };
}

export class Pet extends Actor {
  private rig: Rig;
  private kind: string;
  private coach: CoachInstance | null = null;
  private hopFired = false;
  hop = 0;
  napping = false;

  /** Swap the stand-in cat for 豆豆. */
  useCoach(inst: CoachInstance) {
    if (this.coach) return;
    this.coach = inst;
    this.rig.group.visible = false;
    inst.root.scale.setScalar(COACH_SCALE);
    inst.walkSpeed = 1.1; // steps that roughly match the room's walking speed
    this.root.scale.setScalar(1);
    this.radius = 0.5;
    this.root.add(inst.root);
  }

  constructor(private kit: Kit, kind: string, stage: number) {
    super();
    this.radius = 0.36;
    this.speed = 0.7;
    this.ignoreSoft = true;
    this.kind = kind;
    this.rig = buildRig(kit.scope(), tintOf(kind));
    this.root.add(this.rig.group);
    this.setStage(stage);
  }

  setKind(kind: string) {
    if (tintOf(kind) === tintOf(this.kind)) { this.kind = kind; return; }
    this.kind = kind;
    this.root.remove(this.rig.group);
    disposeTree(this.rig.group);
    this.rig = buildRig(this.kit.scope(), tintOf(kind));
    this.root.add(this.rig.group);
  }

  setStage(stage: number) { if (!this.coach) this.root.scale.setScalar(scaleOf(stage)); }

  dispose() {
    disposeTree(this.rig.group);
    if (this.coach) {
      // the dog's geometry is shared with the buddy tab: take it out before the room frees its tree
      this.root.remove(this.coach.root);
      this.coach.dispose();
      this.coach = null;
    }
  }

  /** Where the pet's speech bubble starts (world units above the floor). */
  get bubbleY() { return this.coach ? COACH_SCALE * 1.15 : 1.1 * this.root.scale.y; }

  /** Heart eyes for a moment (the dog only). */
  love() { this.coach?.love(); }

  /** Go and nap in the bed. */
  nap(bedX: number, bedZ: number, onArrive: () => void) {
    this.napping = true;
    this.goTo(bedX, bedZ, onArrive);
  }

  update(t: number, dt: number, reduced: boolean, people: Actor[]) {
    let moving = false;
    if (!reduced && this.hasTarget) {
      moving = this.walk(dt, t, this.napping ? 9 : 3 + Math.random() * 5);
    } else if (!reduced && t > this.idleUntil) {
      // usually trots over to one of the two of you
      this.napping = false;
      if (Math.random() < 0.7) {
        const who = people[Math.random() < 0.5 ? 0 : 1].position;
        this.goTo(who.x + 0.7, who.z + 0.5);
      } else {
        pickTarget(this.target, this.radius);
        this.goTo(this.target.x, this.target.z);
      }
    }
    const c = this.coach;
    if (c) {
      const resting = this.napping && !this.hasTarget && t < this.idleUntil;
      if (this.hop > 0 && !this.hopFired && !resting) { this.hopFired = true; c.hop(); }
      if (this.hop <= 0) this.hopFired = false;
      this.hop = Math.max(0, this.hop - dt * 1.6);
      c.setBase(moving ? 'walk' : resting ? 'sit' : 'idle');
      c.look = resting ? NAP_LOOK : AWAKE_LOOK;
      try {
        c.update(dt, !reduced);
        return;
      } catch (e) {
        // never let the dog take the room (or the app) down: fall back to the cat
        if (__DEV__) console.warn('[room] 豆豆 update failed, back to the cat:', e);
        this.root.remove(c.root);
        this.coach = null;
        this.rig.group.visible = true;
      }
    }
    const r = this.rig;
    this.hop = Math.max(0, this.hop - dt * 1.6);
    const hopY = Math.sin(Math.min(1, this.hop) * Math.PI) * 0.7;
    r.inner.position.y = hopY + (moving ? Math.abs(Math.sin(t * 12)) * 0.05 : 0);
    r.inner.scale.set(1 + Math.sin(t * 2) * 0.02, 1 - Math.sin(t * 2) * 0.02, 1);
    r.tail.rotation.z = Math.sin(t * 3) * 0.45;
    r.head.rotation.y = Math.sin(t * 0.7) * 0.25;
  }
}
