import * as THREE from 'three';
import type { Gender } from '@/services/couple';
import { Actor } from './actor';
import { Kit, castShadows, disposeTree, flat } from './kit';
import { angleDiff, pickTarget } from './physics';
import { PlushPerson, type PlushAssets, type Pose } from './plush';

/**
 * A villager: big round head, short body (Animal Crossing proportions).
 * The look follows the person's gender: male short hair + blue shirt,
 * female long hair + pink dress, anything else a neutral bob + yellow top.
 */

interface Look { skin: string; hair: string; shirt: string; pants: string; shoes: string; hairStyle: 'short' | 'long' | 'bob'; dress: boolean }

const LOOKS: Record<'male' | 'female' | 'other', Look> = {
  male: { skin: '#FFE1C7', hair: '#3A2A22', shirt: '#4DB6FF', pants: '#2D3A55', shoes: '#0A0A0A', hairStyle: 'short', dress: false },
  female: { skin: '#FFE6D2', hair: '#5A3828', shirt: '#FF8FA3', pants: '#FFE6D2', shoes: '#FFFFFF', hairStyle: 'long', dress: true },
  other: { skin: '#FFE3CC', hair: '#6B4A35', shirt: '#FFD43B', pants: '#55607A', shoes: '#0A0A0A', hairStyle: 'bob', dress: false },
};

export const lookOf = (g: Gender): Look => LOOKS[g === 'male' || g === 'female' ? g : 'other'];
/** The colour that stands for this person in the room (shirt; also their water bottle). */
export const colorOf = (g: Gender) => lookOf(g).shirt;

interface Rig {
  group: THREE.Group;
  body: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  head: THREE.Group;
  eyes: THREE.Mesh[];
}

function buildRig(kit: Kit, look: Look): Rig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    const thigh = kit.mesh(new THREE.CapsuleGeometry(0.085, 0.16, 4, 10), look.pants);
    thigh.position.y = -0.12;
    const shoe = kit.mesh(new THREE.SphereGeometry(0.11, 12, 10), look.shoes);
    shoe.scale.set(1, 0.6, 1.35);
    shoe.position.set(0, -0.27, 0.04);
    leg.add(thigh, shoe);
    leg.position.set(s * 0.1, 0.32, 0);
    body.add(leg);
    legs.push(leg);
  }

  // torso: a dress flares out
  const torso = kit.mesh(look.dress ? new THREE.CylinderGeometry(0.17, 0.3, 0.46, 20) : new THREE.CapsuleGeometry(0.2, 0.18, 6, 16), look.shirt);
  torso.position.y = look.dress ? 0.56 : 0.55;
  body.add(torso);

  const arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    const sleeve = kit.mesh(new THREE.CapsuleGeometry(0.065, 0.2, 4, 10), look.shirt);
    sleeve.position.y = -0.13;
    const hand = kit.mesh(new THREE.SphereGeometry(0.07, 12, 10), look.skin);
    hand.position.y = -0.28;
    arm.add(sleeve, hand);
    arm.position.set(s * 0.25, 0.72, 0);
    arm.rotation.z = s * 0.25;
    body.add(arm);
    arms.push(arm);
  }

  const head = new THREE.Group();
  head.position.y = 1.08;
  body.add(head);
  const skull = kit.mesh(new THREE.SphereGeometry(0.36, 28, 20), look.skin, { outline: 0.035 });
  skull.scale.set(1, 0.94, 0.96);
  head.add(skull);

  const black = flat('#0A0A0A'), white = flat('#FFFFFF'), cheek = flat('#FF9BB0', { transparent: true, opacity: 0.8 });
  const eyes: THREE.Mesh[] = [];
  const eyeGeo = new THREE.CapsuleGeometry(0.035, 0.05, 4, 8);
  const shineGeo = new THREE.SphereGeometry(0.014, 8, 6);
  const blushGeo = new THREE.CircleGeometry(0.055, 16);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, black);
    eye.position.set(s * 0.13, 0.02, 0.33);
    head.add(eye);
    eyes.push(eye);
    const shine = new THREE.Mesh(shineGeo, white);
    shine.position.set(0.012, 0.03, 0.03);
    eye.add(shine);
    const blush = new THREE.Mesh(blushGeo, cheek);
    blush.position.set(s * 0.21, -0.09, 0.3);
    blush.lookAt(blush.position.x * 3, blush.position.y * 3, blush.position.z * 3);
    blush.userData.noShadow = true;
    head.add(blush);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12, Math.PI), black);
  mouth.position.set(0, -0.1, 0.345);
  mouth.rotation.z = Math.PI;
  head.add(mouth);

  // hair: a cap and a fringe for everyone, then the style
  const cap = kit.mesh(new THREE.SphereGeometry(0.385, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), look.hair, { outline: 0.03 });
  cap.rotation.x = -0.25;
  cap.position.set(0, 0.03, -0.02);
  head.add(cap);
  const fringe = kit.mesh(new THREE.SphereGeometry(0.2, 16, 10), look.hair, { outline: 0.04 });
  fringe.scale.set(1.5, 0.5, 0.7);
  fringe.position.set(0.05, 0.2, 0.26);
  fringe.rotation.z = 0.25;
  head.add(fringe);

  if (look.hairStyle === 'long') {
    for (const s of [-1, 1]) {
      const lock = kit.mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 10), look.hair);
      lock.position.set(s * 0.3, -0.22, -0.08);
      lock.rotation.z = s * 0.12;
      head.add(lock);
    }
    const back = kit.mesh(new THREE.CapsuleGeometry(0.28, 0.3, 6, 14), look.hair);
    back.position.set(0, -0.2, -0.2);
    head.add(back);
    const bow = kit.mesh(new THREE.SphereGeometry(0.09, 12, 8), '#FF5C7A', { outline: 0.08 });
    bow.scale.set(1.6, 0.9, 0.8);
    bow.position.set(0.25, 0.3, 0.12);
    head.add(bow);
  } else if (look.hairStyle === 'bob') {
    // chin-length bob: a rounded shell round the back and sides
    const shell = kit.mesh(new THREE.SphereGeometry(0.4, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), look.hair, { outline: 0.03 });
    shell.scale.set(1.05, 1, 1);
    shell.rotation.x = -0.55;
    shell.position.set(0, 0.02, -0.04);
    head.add(shell);
    for (const s of [-1, 1]) {
      const side = kit.mesh(new THREE.SphereGeometry(0.15, 14, 10), look.hair);
      side.scale.set(0.8, 1.2, 1);
      side.position.set(s * 0.31, -0.1, -0.02);
      head.add(side);
    }
    const clip = kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), '#4DB6FF', { outline: 0.1 });
    clip.scale.set(1.5, 0.8, 0.8);
    clip.position.set(-0.24, 0.27, 0.18);
    head.add(clip);
  } else {
    const tuft = kit.mesh(new THREE.ConeGeometry(0.08, 0.2, 8), look.hair);
    tuft.position.set(-0.05, 0.4, 0.05);
    tuft.rotation.z = 0.4;
    head.add(tuft);
  }

  castShadows(group, (m) => !!m.userData.noShadow);
  return { group, body, legs, arms, head, eyes };
}

export interface VillagerContext {
  t: number;
  dt: number;
  reduced: boolean;
  /** The other villager and the pet, to look at when idle. */
  other: Actor;
  pet: Actor;
}

export class Villager extends Actor {
  private rig: Rig;
  /** Per-villager phase so the two don't move in step. */
  private phase: number;
  private walkT = 0;
  wave = 0;
  private blinkAt = 2 + Math.random() * 3;
  private blinkUntil = 0;
  /** Doing something scripted (walking to the partner, the sofa): don't wander. */
  busy = false;
  /** On the sofa: seat position and when to stand up. */
  private seat: THREE.Vector3 | null = null;
  private seatZ = 0;
  private seatUntil = 0;
  private sitPending = false;
  private seatVec = new THREE.Vector3();
  private lookAtPet = false;
  private gender: Gender;
  /** The plush (Tripo) body, once loaded; the toon rig is hidden then. */
  private plush: PlushPerson | null = null;
  private plushAssets: PlushAssets | null = null;
  private sitK = 0;
  private pose: Pose = { swing: 0, bob: 0, roll: 0, sit: 0, wave: false, t: 0, headYaw: 0, headRoll: 0 };
  /** Where people sit on the sofa (x, cushion height) and stand up to (x); the room sets these for its sofa. */
  seatX = -2.85;
  seatY = 0.18;
  standX = -2.15;

  constructor(private kit: Kit, gender: Gender, phase: number) {
    super();
    this.radius = 0.32;
    this.speed = 0.9;
    this.phase = phase;
    this.gender = gender;
    this.rig = buildRig(kit.scope(), lookOf(gender));
    this.root.add(this.rig.group);
  }

  /** Swap the toon body for the plush one: the girl for female, the boy otherwise. */
  usePlush(assets: PlushAssets) {
    this.plushAssets = assets;
    this.dropPlush();
    const model = this.gender === 'female' ? assets.people.girl : assets.people.boy;
    this.plush = new PlushPerson(model);
    this.root.add(this.plush.root);
    this.rig.group.visible = false;
  }

  private dropPlush() {
    if (!this.plush) return;
    this.root.remove(this.plush.root);
    this.plush.dispose();
    this.plush = null;
    this.rig.group.visible = true;
  }

  /** Swap the look (gender changed); keeps position and state. */
  setGender(gender: Gender) {
    this.gender = gender;
    this.root.remove(this.rig.group);
    disposeTree(this.rig.group);
    this.rig = buildRig(this.kit.scope(), lookOf(gender));
    this.root.add(this.rig.group);
    if (this.plushAssets) this.usePlush(this.plushAssets);
  }

  dispose() { disposeTree(this.rig.group); this.dropPlush(); }

  /** Seated height of the body's origin: the plush hips rest on the cushion. */
  private get seatHeight() { return this.plush ? this.seatY - this.plush.hipY + 0.12 : this.seatY; }

  get pinned() { return this.seat !== null; }
  get sitting() { return this.seat !== null; }

  /** Sit on the sofa at seat (x, z) for a while; walks to the front of it first unless reduced. */
  sit(z: number, reduced: boolean) {
    this.seat = null;
    this.seatZ = z;
    if (reduced) { this.sitPending = true; return; }
    this.busy = true;
    this.goTo(this.standX + 0.1, z, () => { this.sitPending = true; });
  }

  /** Stand up if sitting. */
  standUp() {
    if (!this.seat) return;
    this.root.position.set(this.standX, 0, this.seat.z);
    this.seat = null;
    this.rig.head.rotation.y = 0;
  }

  update(c: VillagerContext) {
    const { t, dt, reduced } = c;
    const r = this.rig;

    if (this.sitPending) {
      this.sitPending = false;
      this.busy = false;
      this.stop();
      this.seat = this.seatVec.set(this.seatX, this.seatHeight, this.seatZ);
      this.seatUntil = t + 9;
    }

    if (this.seat) {
      // on the sofa: legs forward, a little sway; stand up after a while
      this.root.position.lerp(this.seat, Math.min(1, dt * 6));
      this.root.rotation.y += angleDiff(this.root.rotation.y, Math.PI / 2) * Math.min(1, dt * 6);
      r.legs[0].rotation.x = r.legs[1].rotation.x = -1.45;
      r.body.position.y = 0.2 + Math.sin(t * 1.6) * 0.01;
      r.head.rotation.y = Math.sin(t * 0.8 + this.phase) * 0.35 + (this.phase ? -0.3 : 0.3);
      if (t > this.seatUntil) { this.standUp(); this.idleUntil = t + 1; }
      this.blink(t);
      if (this.plush) {
        this.sitK = Math.min(1, this.sitK + dt * 4);
        const p = this.pose;
        p.swing = 0; p.bob = 0; p.roll = 0; p.sit = this.sitK; p.wave = this.wave > 0; p.t = t;
        if (this.wave > 0) this.wave -= dt;
        p.headYaw = r.head.rotation.y; p.headRoll = 0;
        this.plush.pose(p);
      }
      return;
    }
    this.sitK = 0;

    let moving = false;
    if (!reduced && this.hasTarget) {
      moving = this.walk(dt, t, 2 + Math.random() * 4);
      if (!moving) this.lookAtPet = Math.random() < 0.5;
    } else if (!reduced && t > this.idleUntil && !this.busy) {
      const p = this.target;
      pickTarget(p, this.radius);
      this.goTo(p.x, p.z);
    } else {
      const o = this.lookAtPet ? c.pet.position : c.other.position;
      this.faceTo(o.x, o.z, dt * 0.3 * 5);
    }

    this.walkT = moving ? this.walkT + dt * 10 : this.walkT * 0.85;
    const swing = Math.sin(this.walkT) * (moving ? 0.6 : 0);
    r.legs[0].rotation.x = swing;
    r.legs[1].rotation.x = -swing;
    r.body.position.y = moving ? Math.abs(Math.sin(this.walkT)) * 0.06 : Math.sin(t * 2.2) * 0.012;
    r.body.rotation.z = moving ? Math.sin(this.walkT) * 0.05 : 0;

    // arms swing while walking; the right one waves when greeted
    if (this.wave > 0) {
      this.wave -= dt;
      r.arms[1].rotation.z = -2.5 + Math.sin(t * 14) * 0.35;
      r.arms[1].rotation.x = 0;
      r.arms[0].rotation.z = -0.25;
    } else {
      r.arms[0].rotation.x = -swing * 0.8;
      r.arms[1].rotation.x = swing * 0.8;
      r.arms[0].rotation.z = -0.25;
      r.arms[1].rotation.z = 0.25;
    }
    r.head.rotation.z = Math.sin(t * 0.9 + this.phase * 2) * 0.06;
    this.blink(t);
    if (this.plush) {
      const p = this.pose;
      p.swing = swing; p.bob = r.body.position.y; p.roll = r.body.rotation.z; p.sit = 0;
      p.wave = r.arms[1].rotation.z < -1; p.t = t; p.headYaw = 0; p.headRoll = r.head.rotation.z;
      this.plush.pose(p);
    }
  }

  private blink(t: number) {
    if (t > this.blinkAt) { this.blinkAt = t + 2.5 + Math.random() * 3; this.blinkUntil = t + 0.12; }
    const y = t < this.blinkUntil ? 0.15 : 1;
    this.rig.eyes[0].scale.y = y;
    this.rig.eyes[1].scale.y = y;
  }
}
