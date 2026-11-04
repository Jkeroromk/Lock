import * as THREE from 'three';
import type { Gender, NudgeKind } from '@/services/couple';
import { Kit, castShadows, disposeTree, flat, rbox } from './kit';
import { separate } from './actor';
import { Villager, colorOf } from './villager';
import { Pet } from './pet';
import { smooth } from './physics';
import { makeTextures, disposeTextures, type RoomTextures } from './textures';
import { HOME_ITEM, HOME_SLOTS, equippedLooks, type LookBySlot, type HomeSlot } from '@/constants/coupleHome';

/**
 * The whole 3D room as plain three.js objects: floor, four cutaway walls,
 * furniture, the two villagers, the pet, particles and lights. React only
 * mounts `world.root` and calls update / project / tap each frame, so a prop
 * change never rebuilds the scene.
 */

const ROOM = 4; // half size: the room is 8 × 8
const WALL_H = 3.6;

/** Pixels per world unit the wall overlays (board, frame captions) are laid out at. */
export const DESIGN_PPU = 140;

/** Overlay slots: [x, y, alpha, scale, squash] each (STRIDE numbers), x/y in view pixels. */
export const SLOT = {
  tagMe: 0, tagPartner: 1, bubbleMe: 2, bubblePartner: 3, bubblePet: 4, bubbleObject: 5, board: 6, frame0: 7,
} as const;
export const SLOT_COUNT = 10;
export const STRIDE = 5;
export const MAX_FRAMES = 3;

/** Picture frames on the anniversary wall: where, frame colour, photo colour. */
const FRAME_SLOTS = [
  { x: 1.35, y: 2.35, rot: 0.05, border: '#0A0A0A', pic: '#BFE6FF' },
  { x: 2.6, y: 1.9, rot: -0.06, border: '#FFD43B', pic: '#FFE0E6' },
  { x: -2.4, y: 2.15, rot: 0.04, border: '#FFFFFF', pic: '#FFF1BF' },
];

export type TapHit =
  | { kind: 'person'; who: 'me' | 'partner' }
  | { kind: 'pet' }
  | { kind: 'board' }
  | { kind: 'frame'; index: number }
  | { kind: 'bottles' | 'window' | 'table' | 'sofa' | 'bed' | 'lamp' };

type TapKind = TapHit['kind'];

interface Wall {
  group: THREE.Group;
  lift: THREE.Group;
  decor: THREE.Group;
  ink: THREE.MeshBasicMaterial;
  axis: 'x' | 'z';
  sign: number;
  shown: number;
  alpha: number;
  lastAlpha: number;
  /** Decor materials and their full opacity, faded together. */
  mats: { m: THREE.Material; base: number }[];
}

interface Tappable { obj: THREE.Object3D; hit: TapHit; wall: Wall | null }

const PARTICLES = 32;
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const fwd = new THREE.Vector3();

export class World {
  readonly root = new THREE.Group();
  /** Scene background; the component hands this to the scene. */
  readonly bg = new THREE.Color('#F2F1EC');
  readonly tex: RoomTextures;
  private kit: Kit;
  private inks: THREE.Material[] = [];

  readonly me: Villager;
  readonly partner: Villager;
  readonly pet: Pet;
  private actors: (Villager | Pet)[];

  private walls: Wall[] = [];
  private tappables: Tappable[] = [];
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private lampLight!: THREE.PointLight;
  private lampShade!: THREE.MeshToonMaterial;
  private lampOn = true;
  private nightK = 0;
  private nightWant = 0;

  private bottleWater: THREE.Mesh[] = [];

  /** Materials and parts the furniture styles change (setFurniture). */
  private fx = {} as {
    floor: THREE.MeshToonMaterial; walls: THREE.MeshToonMaterial[];
    rugOuter: THREE.MeshToonMaterial; rugInner: THREE.MeshToonMaterial;
    sofaSeat: THREE.MeshToonMaterial; sofaBack: THREE.MeshToonMaterial; sofaPillow: THREE.MeshToonMaterial;
    tableTop: THREE.MeshToonMaterial; tableLeg: THREE.MeshToonMaterial;
    leaves: THREE.MeshToonMaterial; flowers: THREE.Group; oranges: THREE.Group;
    bedRing: THREE.MeshToonMaterial; bedInside: THREE.MeshToonMaterial;
  };
  private lampColors = { on: '#FFF1BF', light: '#FFD98A' };
  private furniture: Record<HomeSlot, string> = equippedLooks(null);
  private frames: THREE.Group[] = [];
  private frameCount = 0;
  private leftWall!: Wall;

  /** Static anchors for overlays (world space). */
  private boardAnchor = new THREE.Vector3();
  private frameAnchors = FRAME_SLOTS.map(() => new THREE.Vector3());
  /** Where the object bubble points: the last thing tapped (bottles to start with). */
  readonly objectAnchor = new THREE.Vector3();
  private anchorsOf = new Map<THREE.Object3D, THREE.Vector3>();
  private board!: THREE.Object3D;
  private bottles!: THREE.Object3D;

  // particles: a fixed pool of sprites
  private sprites: THREE.Sprite[] = [];
  private pv = new Float32Array(PARTICLES * 3);
  private plife = new Float32Array(PARTICLES);
  private pdelay = new Float32Array(PARTICLES);
  private pnext = 0;

  private pops: { o: THREE.Object3D; t: number; x: number; y: number; z: number }[] = [];
  private later: { at: number; fn: () => void }[] = [];

  reduced = false;
  t = 0;

  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  constructor(opts: { me: Gender; partner: Gender; petKind: string; petStage: number }) {
    this.tex = makeTextures();
    const ink = new THREE.MeshBasicMaterial({ color: '#0A0A0A', side: THREE.BackSide });
    this.inks.push(ink);
    this.kit = new Kit(this.tex.ramp, ink);

    // lights
    this.hemi = new THREE.HemisphereLight('#FFF6E0', '#C9B88F', 1.35);
    this.sun = new THREE.DirectionalLight('#FFFFFF', 1.6);
    this.sun.position.set(5, 9, 6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 30;
    this.sun.shadow.bias = -0.0015;
    this.root.add(this.hemi, this.sun);

    this.buildFloor();
    this.buildWalls();
    this.buildFurniture();

    this.me = new Villager(this.kit, opts.me, 0);
    this.partner = new Villager(this.kit, opts.partner, 1);
    this.pet = new Pet(this.kit, opts.petKind, opts.petStage);
    this.me.position.set(-0.9, 0, 1.2);
    this.partner.position.set(1.4, 0, 0.9);
    this.pet.position.set(0.3, 0, -0.4);
    this.me.root.rotation.y = 0.6;
    this.partner.root.rotation.y = -0.6;
    this.root.add(this.me.root, this.partner.root, this.pet.root);
    this.actors = [this.me, this.partner, this.pet];
    this.setGenders(opts.me, opts.partner);

    for (let i = 0; i < PARTICLES; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.heart, transparent: true, depthWrite: false }));
      s.visible = false;
      this.sprites.push(s);
      this.root.add(s);
    }

    this.objectAnchor.copy(this.anchorsOf.get(this.bottles)!);
  }

  // ── building ──

  private buildFloor() {
    const k = this.kit;
    this.fx.floor = k.toonWith({ color: '#FFFFFF', map: this.tex.planks });
    const floor = k.mesh(new THREE.BoxGeometry(ROOM * 2, 0.2, ROOM * 2), '#E8CF9C', {
      outline: 0.01, receive: true, mat: this.fx.floor,
    });
    floor.position.y = -0.1;
    this.fx.rugOuter = k.toonWith({ color: '#FFD43B' });
    this.fx.rugInner = k.toonWith({ color: '#FFE58A' });
    const rug = k.mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.04, 48), '#FFD43B', { outline: 0.02, receive: true, mat: this.fx.rugOuter });
    rug.position.set(0.3, 0.02, 0.4);
    const rug2 = k.mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.05, 48), '#FFE58A', { outline: 0, receive: true, mat: this.fx.rugInner });
    rug2.position.set(0.3, 0.03, 0.4);
    this.root.add(floor, rug, rug2);
  }

  private tappable(obj: THREE.Object3D, kind: TapKind, wall: Wall | null = null, index = 0) {
    const hit = (kind === 'frame' ? { kind, index } : { kind }) as TapHit;
    this.tappables.push({ obj, hit, wall });
    return obj;
  }

  /**
   * One wall. As you turn the room, the walls between you and the room sink
   * to a low stub (a doll's-house cutaway), gradually with the angle, and
   * their pictures fade first, so nothing pops in or out.
   */
  private buildWall(axis: 'x' | 'z', sign: number, paper: THREE.Texture, decorate: (g: THREE.Group, k: Kit, w: Wall) => void) {
    const ink = (this.kit.ink as THREE.MeshBasicMaterial).clone();
    ink.transparent = true;
    this.inks.push(ink);
    const sk = this.kit.scope(ink); // structure
    const dk = this.kit.scope(ink); // pictures (fade on their own)

    const g = new THREE.Group();
    const lift = new THREE.Group(); // scaled from the floor up
    const paperMat = sk.toonWith({ color: '#FFFFFF', map: paper });
    (this.fx.walls ??= []).push(paperMat);
    const body = sk.mesh(new THREE.BoxGeometry(ROOM * 2 + 0.2, WALL_H, 0.2), '#FFF1BF', {
      outline: 0.008, receive: true, mat: paperMat,
    });
    body.position.y = WALL_H / 2;
    const cap = sk.mesh(new THREE.BoxGeometry(ROOM * 2 + 0.24, 0.08, 0.26), '#C77B4A', { outline: 0 });
    cap.position.y = WALL_H;
    lift.add(body, cap);
    const skirt = sk.mesh(new THREE.BoxGeometry(ROOM * 2 + 0.2, 0.28, 0.06), '#C77B4A', { outline: 0 });
    skirt.position.set(0, 0.14, 0.13);
    const decor = new THREE.Group();
    g.add(lift, skirt, decor);
    if (axis === 'x') { g.rotation.y = (Math.PI / 2) * -sign; g.position.x = sign * ROOM; }
    else { g.rotation.y = sign > 0 ? Math.PI : 0; g.position.z = sign * ROOM; }

    const wall: Wall = { group: g, lift, decor, ink, axis, sign, shown: 1, alpha: 1, lastAlpha: -1, mats: [] };
    decorate(decor, dk, wall);
    const seen = new Set<THREE.Material>();
    decor.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!m || o.userData.outline || seen.has(m)) return;
      seen.add(m);
      wall.mats.push({ m, base: m.opacity });
    });
    this.root.add(g);
    this.walls.push(wall);
    return wall;
  }

  private framed(k: Kit, w: number, h: number, pic: THREE.Material, border: string) {
    const f = new THREE.Group();
    const back = k.mesh(rbox(w + 0.16, h + 0.16, 0.08), border, { outline: 0.03 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pic);
    plane.position.z = 0.045;
    f.add(back, plane);
    return f;
  }

  private buildWalls() {
    // Left wall: the anniversary wall (words on it are React Native overlays).
    this.leftWall = this.buildWall('x', -1, this.tex.wallA, (g, k, wall) => {
      const board = this.framed(k, 1.5, 1.9, flat('#FFFFFF', { map: this.tex.board }), '#FFFFFF');
      board.position.set(-0.4, 2.0, 0.14);
      g.add(this.tappable(board, 'board', wall));
      this.board = board;

      const stripGeo = new THREE.PlaneGeometry(0.9, 0.26);
      const white = flat('#FFFFFF');
      FRAME_SLOTS.forEach((s, i) => {
        const f = this.framed(k, 0.9, 0.9, flat(s.pic), s.border);
        const strip = new THREE.Mesh(stripGeo, white);
        strip.position.set(0, -0.32, 0.05);
        f.add(strip);
        f.position.set(s.x, s.y, 0.14);
        f.rotation.z = s.rot;
        f.visible = false;
        g.add(this.tappable(f, 'frame', wall, i));
        this.frames.push(f);
      });

      // a string of fairy lights over the frames
      const bulbGeo = new THREE.SphereGeometry(0.06, 12, 8);
      const yellow = flat('#FFD43B'), pink = flat('#FF8FA3');
      for (let i = 0; i < 11; i++) {
        const bulb = new THREE.Mesh(bulbGeo, i % 2 ? yellow : pink);
        bulb.position.set(-3.2 + i * 0.64, 3.15 - Math.sin((i / 10) * Math.PI) * 0.25, 0.16);
        g.add(bulb);
      }
    });

    // Back wall: window + shelf with the two water bottles.
    this.buildWall('z', -1, this.tex.wallB, (g, k, wall) => {
      const win = this.framed(k, 1.6, 1.4, flat('#FFFFFF', { map: this.tex.sky }), '#FFFFFF');
      win.position.set(-1.6, 2.1, 0.14);
      g.add(this.tappable(win, 'window', wall));
      const bar = k.mesh(rbox(0.06, 1.4, 0.04), '#FFFFFF', { outline: 0.2 });
      bar.position.set(-1.6, 2.1, 0.22);
      g.add(bar);
      const shelf = k.mesh(rbox(1.8, 0.1, 0.45), '#FFFFFF', { outline: 0.04 });
      shelf.position.set(1.4, 1.75, 0.3);
      g.add(shelf);

      const bottles = new THREE.Group();
      const glassGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.6, 20);
      const waterGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.56, 20);
      const capGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16);
      const glass = k.toonWith({ color: '#FFFFFF', transparent: true, opacity: 0.55 });
      [0.95, 1.85].forEach((x) => {
        const bottle = k.mesh(glassGeo, '#FFFFFF', { outline: 0.05, mat: glass });
        bottle.position.set(x, 2.1, 0.3);
        const water = k.mesh(waterGeo, '#4DB6FF', { outline: 0, mat: k.toonWith({ color: '#4DB6FF' }) });
        water.position.set(x, 1.82, 0.3);
        water.scale.y = 0.02;
        const cap = k.mesh(capGeo, '#FFD43B', { outline: 0.08 });
        cap.position.set(x, 2.44, 0.3);
        bottles.add(bottle, water, cap);
        this.bottleWater.push(water);
      });
      g.add(this.tappable(bottles, 'bottles', wall));
      this.bottles = bottles;
    });

    // Right wall: door and the LOCK IN sign.
    this.buildWall('x', 1, this.tex.wallA, (g, k) => {
      const door = k.mesh(rbox(1.2, 2.3, 0.1), '#C77B4A', { outline: 0.03 });
      door.position.set(1.8, 1.15, 0.12);
      const knob = k.mesh(new THREE.SphereGeometry(0.07, 12, 8), '#FFD43B', { outline: 0.1 });
      knob.position.set(1.35, 1.15, 0.2);
      // the sign as blocks: a black frame with a yellow panel (no text texture)
      const sign = k.mesh(rbox(1.06, 0.56, 0.08), '#0A0A0A', { outline: 0.03 });
      sign.position.set(-1.2, 2.4, 0.14);
      const panel = k.mesh(rbox(0.9, 0.4, 0.04), '#FFD43B', { outline: 0 });
      panel.position.set(0, 0, 0.05);
      sign.add(panel);
      g.add(door, knob, sign);
    });

    // Front wall: bookcase.
    this.buildWall('z', 1, this.tex.wallB, (g, k) => {
      const shelf = k.mesh(rbox(2.2, 2.2, 0.5), '#FFFFFF', { outline: 0.02 });
      shelf.position.set(0.6, 1.1, 0.35);
      g.add(shelf);
      ['#FF8FA3', '#4DB6FF', '#FFD43B', '#0A0A0A', '#6CC27A'].forEach((col, i) => {
        const b = k.mesh(rbox(0.22, 0.6 - (i % 2) * 0.12, 0.35), col, { outline: 0.04 });
        b.position.set(-0.2 + i * 0.32, 1.55, 0.62);
        g.add(b);
      });
    });

    // overlay anchors never move: put them in world space once the walls are placed
    this.root.updateMatrixWorld(true);
    this.board.localToWorld(this.boardAnchor.set(0, 0, 0.05));
    this.frames.forEach((f, i) => f.localToWorld(this.frameAnchors[i].set(0, 0, 0.05)));
    // object bubbles sit just above the bottle caps / the table top
    this.anchorsOf.set(this.bottles, this.bottles.localToWorld(new THREE.Vector3(1.4, 2.5, 0.3)));
  }

  private buildFurniture() {
    const k = this.kit;
    // sofa against the left wall
    const sofa = new THREE.Group();
    const fx = this.fx;
    fx.sofaSeat = k.toonWith({ color: '#7FB8E8' });
    fx.sofaBack = k.toonWith({ color: '#5E9AD0' });
    fx.sofaPillow = k.toonWith({ color: '#FFD43B' });
    const seat = k.mesh(rbox(1.1, 0.45, 2.6), '', { mat: fx.sofaSeat }); seat.position.y = 0.3;
    const back = k.mesh(rbox(0.35, 0.8, 2.6), '', { mat: fx.sofaBack }); back.position.set(-0.45, 0.65, 0);
    const armL = k.mesh(rbox(1.1, 0.55, 0.3), '', { mat: fx.sofaBack }); armL.position.set(0, 0.45, -1.3);
    const armR = k.mesh(rbox(1.1, 0.55, 0.3), '', { mat: fx.sofaBack }); armR.position.set(0, 0.45, 1.3);
    const pillow = k.mesh(rbox(0.25, 0.42, 0.5), '', { mat: fx.sofaPillow }); pillow.position.set(-0.2, 0.75, 0.6); pillow.rotation.x = 0.2;
    sofa.add(seat, back, armL, armR, pillow);
    castShadows(sofa);
    sofa.position.set(-3.1, 0, 0.6);
    this.root.add(this.tappable(sofa, 'sofa'));

    // round table with two mugs
    const table = new THREE.Group();
    fx.tableTop = k.toonWith({ color: '#FFFFFF' });
    fx.tableLeg = k.toonWith({ color: '#C77B4A' });
    const top = k.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 28), '', { mat: fx.tableTop }); top.position.y = 0.62;
    const leg = k.mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 12), '', { mat: fx.tableLeg }); leg.position.y = 0.3;
    const mugGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.18, 14);
    const mug1 = k.mesh(mugGeo, '#FF8FA3'); mug1.position.set(-0.2, 0.76, 0.1);
    const mug2 = k.mesh(mugGeo, '#4DB6FF'); mug2.position.set(0.18, 0.76, -0.12);
    table.add(top, leg, mug1, mug2);
    castShadows(table);
    table.position.set(2.2, 0, -1.9);
    this.root.add(this.tappable(table, 'table'));
    this.anchorsOf.set(table, new THREE.Vector3(2.2, 1.0, -1.9));

    // plant in the corner
    const pot = k.mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 18), '#C77B4A'); pot.position.set(3.25, 0.28, -3.25);
    const leaves = new THREE.Group();
    fx.leaves = k.toonWith({ color: '#6CC27A' });
    ([[0, 0.95, 0, 0.42], [-0.22, 1.2, 0.1, 0.32], [0.2, 1.3, -0.1, 0.34], [0, 1.5, 0.05, 0.26]] as const).forEach(([x, y, z, r]) => {
      const l = k.mesh(new THREE.SphereGeometry(r, 16, 12), '', { mat: fx.leaves }); l.position.set(x, y, z); leaves.add(l);
    });
    // styles that grow something on the plant
    const dot = new THREE.SphereGeometry(0.075, 10, 8);
    const spots: [number, number, number][] = [[0.32, 1.05, 0.22], [-0.38, 1.25, 0.2], [0.05, 1.42, 0.3], [0.36, 1.4, -0.05], [-0.15, 0.9, 0.38], [-0.3, 1.55, -0.05]];
    fx.flowers = new THREE.Group();
    fx.oranges = new THREE.Group();
    spots.forEach(([x, y, z], i) => {
      const f = k.mesh(dot, i % 2 ? '#FFD43B' : '#FF8FA3', { outline: 0.12 }); f.position.set(x, y, z); fx.flowers.add(f);
      const o = k.mesh(dot, '#FFA53B', { outline: 0.12 }); o.position.set(x, y - 0.04, z); o.scale.setScalar(1.25); fx.oranges.add(o);
    });
    fx.flowers.visible = false;
    fx.oranges.visible = false;
    leaves.add(fx.flowers, fx.oranges);
    leaves.position.set(3.25, 0, -3.25);
    castShadows(pot); castShadows(leaves);
    this.root.add(pot, leaves);

    // pet bed + bowl
    fx.bedRing = k.toonWith({ color: '#FF8FA3' });
    fx.bedInside = k.toonWith({ color: '#FFE0E6' });
    // sized for 豆豆 (about 1 × 0.9 units)
    const bed = k.mesh(new THREE.TorusGeometry(0.62, 0.18, 10, 28), '', { mat: fx.bedRing }); bed.rotation.x = Math.PI / 2; bed.position.set(-1.6, 0.16, -2.6);
    const bedIn = k.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 24), '', { outline: 0, mat: fx.bedInside }); bedIn.position.set(-1.6, 0.05, -2.6);
    const bowl = k.mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.14, 16), '#FFFFFF'); bowl.position.set(-0.4, 0.07, -3.0);
    this.root.add(this.tappable(bed, 'bed'), bedIn, bowl);

    // floor lamp
    const pole = k.mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), '#0A0A0A', { outline: 0 }); pole.position.set(-3.3, 1.0, -3.2);
    this.lampShade = k.toonWith({ color: '#FFF1BF', side: THREE.DoubleSide });
    const shade = k.mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.4, 18, 1, true), '#FFF1BF', { mat: this.lampShade }); shade.position.set(-3.3, 2.05, -3.2);
    this.lampLight = new THREE.PointLight('#FFD98A', 1.1, 5);
    this.lampLight.position.set(-3.3, 1.9, -3.2);
    const lamp = new THREE.Group();
    lamp.add(pole, shade);
    this.root.add(this.tappable(lamp, 'lamp'), this.lampLight);
  }

  // ── props from React ──

  setGenders(me: Gender, partner: Gender) {
    this.bottleWater.forEach((w, i) => (w.material as THREE.MeshToonMaterial).color.set(colorOf(i === 0 ? me : partner)));
  }

  setWater(me: number, partner: number) {
    [me, partner].forEach((lv, i) => {
      const w = this.bottleWater[i];
      const k = Math.max(0.02, Math.min(1, lv || 0));
      w.scale.y = k;
      w.position.y = 1.82 + 0.28 * k;
    });
  }

  setFrameCount(n: number) {
    this.frameCount = Math.max(0, Math.min(MAX_FRAMES, n));
    this.frames.forEach((f, i) => { f.visible = i < this.frameCount; });
  }

  setNight(on: boolean) {
    this.nightWant = on ? 1 : 0;
    if (on && !this.lampOn) this.toggleLamp();
  }

  toggleLamp() {
    this.lampOn = !this.lampOn;
    this.lampLight.intensity = this.lampOn ? 1.1 : 0;
    this.lampShade.color.set(this.lampOn ? this.lampColors.on : '#B9B7AE');
  }

  /** Show the couple's furniture styles (slot → item id; missing slots use the free default). */
  setFurniture(equipped: Record<string, string> | null | undefined) {
    this.furniture = equippedLooks(equipped);
    const fx = this.fx;
    for (const slot of HOME_SLOTS) {
      const it = HOME_ITEM[this.furniture[slot]];
      if (!it) continue;
      switch (slot) {
        case 'sofa': { const l = it.look as LookBySlot['sofa']; fx.sofaSeat.color.set(l.seat); fx.sofaBack.color.set(l.back); fx.sofaPillow.color.set(l.pillow); break; }
        case 'rug': { const l = it.look as LookBySlot['rug']; fx.rugOuter.color.set(l.outer); fx.rugInner.color.set(l.inner); break; }
        case 'wall': { const l = it.look as LookBySlot['wall']; fx.walls.forEach((m) => m.color.set(l.tint)); break; }
        case 'floor': { const l = it.look as LookBySlot['floor']; fx.floor.color.set(l.tint); break; }
        case 'lamp': {
          const l = it.look as LookBySlot['lamp'];
          this.lampColors = { on: l.shade, light: l.light };
          this.lampLight.color.set(l.light);
          if (this.lampOn) this.lampShade.color.set(l.shade);
          break;
        }
        case 'plant': { const l = it.look as LookBySlot['plant']; fx.leaves.color.set(l.leaves); fx.flowers.visible = l.extra === 'flowers'; fx.oranges.visible = l.extra === 'oranges'; break; }
        case 'bed': { const l = it.look as LookBySlot['bed']; fx.bedRing.color.set(l.ring); fx.bedInside.color.set(l.inside); break; }
        case 'table': { const l = it.look as LookBySlot['table']; fx.tableTop.color.set(l.top); fx.tableLeg.color.set(l.leg); break; }
      }
    }
  }

  // ── things that happen ──

  /** Hearts / drops / bento / stars rising from a point. */
  burst(x: number, y: number, z: number, map: THREE.Texture, n: number) {
    for (let i = 0; i < n; i++) {
      const j = this.pnext;
      this.pnext = (this.pnext + 1) % PARTICLES;
      const s = this.sprites[j];
      const m = s.material as THREE.SpriteMaterial;
      m.map = map;
      m.opacity = 1;
      s.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
      s.scale.setScalar(0.3 + Math.random() * 0.15);
      this.pv[j * 3] = (Math.random() - 0.5) * 0.5;
      this.pv[j * 3 + 1] = 1.2 + Math.random() * 0.8;
      this.pv[j * 3 + 2] = (Math.random() - 0.5) * 0.5;
      this.plife[j] = 0;
      this.pdelay[j] = i * 0.08;
      s.visible = false;
      s.userData.live = true;
    }
  }

  private after(seconds: number, fn: () => void) { this.later.push({ at: this.t + seconds, fn }); }

  /** A nudge: my villager walks over to my partner, then the effect plays. */
  playEvent(kind: NudgeKind) {
    const me = this.me, ta = this.partner;
    me.standUp(); ta.standUp();
    me.busy = true;
    const arrive = () => {
      me.faceTo(ta.position.x, ta.position.z, 1);
      ta.faceTo(me.position.x, me.position.z, 1);
      me.busy = false;
      const p = ta.position;
      if (kind === 'water') {
        me.wave = 1;
        this.burst(p.x, 1.6, p.z, this.tex.drop, 4);
        this.after(0.9, () => { ta.wave = 1.2; });
      } else if (kind === 'eat') {
        this.burst(p.x, 1.6, p.z, this.tex.bento, 4);
      } else if (kind === 'train') {
        me.wave = 1;
        this.burst(p.x, 1.6, p.z, this.tex.star, 5);
        this.after(0.9, () => { ta.wave = 1.2; });
      } else {
        const mx = (me.position.x + p.x) / 2, mz = (me.position.z + p.z) / 2;
        this.burst(mx, 1.4, mz, this.tex.heart, 10);
        me.wave = 1.2; ta.wave = 1.2; this.pet.hop = 1;
      }
    };
    if (this.reduced) { arrive(); return; }
    // stop just in front of TA, on my side
    const dx = ta.position.x - me.position.x, dz = ta.position.z - me.position.z;
    const d = Math.hypot(dx, dz) || 1;
    me.goTo(ta.position.x - (dx / d) * 0.75, ta.position.z - (dz / d) * 0.75, arrive);
    ta.stop();
    ta.idleUntil = this.t + 6;
  }

  /** What's under view point (x, y) (view pixels), with the room's own reaction. */
  tap(x: number, y: number, w: number, h: number, camera: THREE.Camera): TapHit | null {
    this.ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    this.ray.setFromCamera(this.ndc, camera);
    const hit = (o: THREE.Object3D) => this.ray.intersectObject(o, true).length > 0;
    if (hit(this.pet.root)) {
      this.pet.hop = 1;
      this.pet.love();
      this.burst(this.pet.position.x, 1, this.pet.position.z, this.tex.heart, 5);
      return { kind: 'pet' };
    }
    if (hit(this.me.root)) { this.me.wave = 1.6; return { kind: 'person', who: 'me' }; }
    if (hit(this.partner.root)) { this.partner.wave = 1.6; return { kind: 'person', who: 'partner' }; }

    let best: Tappable | null = null, bestD = Infinity;
    for (const tp of this.tappables) {
      if (tp.wall && tp.wall.shown < 0.6) continue;
      if (!visible(tp.obj)) continue;
      const hits = this.ray.intersectObject(tp.obj, true);
      if (hits.length && hits[0].distance < bestD) { best = tp; bestD = hits[0].distance; }
    }
    if (!best) return null;
    this.pops.push({ o: best.obj, t: 0, x: best.obj.scale.x, y: best.obj.scale.y, z: best.obj.scale.z });
    const a = this.anchorsOf.get(best.obj);
    if (a) this.objectAnchor.copy(a);
    switch (best.hit.kind) {
      case 'sofa': this.me.sit(0.0, this.reduced); this.partner.sit(1.15, this.reduced); break;
      case 'bed': this.pet.nap(-1.6, -2.6, () => {}); break;
      case 'lamp': this.toggleLamp(); break;
      default: break;
    }
    return best.hit;
  }

  // ── per frame ──

  update(dt: number, camera: THREE.Camera, target: THREE.Vector3) {
    this.t += dt;
    const t = this.t;

    for (let i = this.later.length - 1; i >= 0; i--) {
      if (t >= this.later[i].at) { const fn = this.later[i].fn; this.later.splice(i, 1); fn(); }
    }

    this.me.update({ t, dt, reduced: this.reduced, other: this.partner, pet: this.pet });
    this.partner.update({ t, dt, reduced: this.reduced, other: this.me, pet: this.pet });
    this.pet.update(t, dt, this.reduced, [this.me, this.partner]);
    separate(this.actors);

    this.updateWalls(dt, camera.position, target);

    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      const k = 1 + Math.sin(Math.min(1, p.t / 0.35) * Math.PI) * 0.12;
      p.o.scale.set(p.x * k, p.y / k, p.z * k);
      if (p.t > 0.35) { p.o.scale.set(p.x, p.y, p.z); this.pops.splice(i, 1); }
    }

    for (let j = 0; j < PARTICLES; j++) {
      const s = this.sprites[j];
      if (!s.userData.live) continue;
      if (this.pdelay[j] > 0) { this.pdelay[j] -= dt; continue; }
      s.visible = true;
      this.plife[j] += dt;
      s.position.x += this.pv[j * 3] * dt;
      s.position.y += this.pv[j * 3 + 1] * dt;
      s.position.z += this.pv[j * 3 + 2] * dt;
      this.pv[j * 3 + 1] *= 0.985;
      (s.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - this.plife[j] / 1.6);
      if (this.plife[j] > 1.6) { s.visible = false; s.userData.live = false; }
    }

    // day ↔ night eases over about half a second
    if (this.nightK !== this.nightWant) {
      const d = this.nightWant - this.nightK;
      this.nightK = Math.abs(d) < 0.01 ? this.nightWant : this.nightK + d * Math.min(1, dt * 6);
      const k = this.nightK;
      this.hemi.intensity = 1.35 + (0.45 - 1.35) * k;
      this.sun.intensity = 1.6 + (0.2 - 1.6) * k;
      this.bg.copy(DAY).lerp(NIGHT, k);
    }
  }

  private updateWalls(dt: number, cam: THREE.Vector3, target: THREE.Vector3) {
    const vx = cam.x - target.x, vz = cam.z - target.z;
    const len = Math.hypot(vx, vz) || 1;
    for (const w of this.walls) {
      // how much this wall faces away from the camera: 1 behind the room, 0 in front
      const facing = (-(w.axis === 'x' ? vx : vz) / len) * w.sign;
      const want = smooth(-0.35, 0.25, facing);
      w.shown += (want - w.shown) * Math.min(1, dt * 7);
      // the wall sinks to a stub; its pictures fade out before it sinks
      w.lift.scale.y = 0.1 + 0.9 * w.shown;
      const alpha = smooth(0.45, 0.95, w.shown);
      w.alpha = alpha;
      w.decor.visible = alpha > 0.02;
      if (Math.abs(w.lastAlpha - alpha) < 0.01 && !(alpha === 1 && w.lastAlpha !== 1)) continue;
      w.lastAlpha = alpha;
      // fully shown walls stay opaque (cheaper, correct depth); fading ones blend
      const fading = alpha < 0.999;
      for (const { m, base } of w.mats) { m.transparent = fading || base < 1; m.opacity = base * alpha; }
      w.ink.transparent = fading;
      w.ink.opacity = alpha;
    }
  }

  /**
   * Where each overlay goes this frame, written into out (STRIDE numbers per
   * slot: x, y, alpha, scale, squash). Nothing is allocated.
   */
  project(camera: THREE.PerspectiveCamera, w: number, h: number, out: Float32Array) {
    this.put(out, SLOT.tagMe, camera, w, h, tmp.copy(this.me.position).setY(this.me.position.y + 1.75), 1, 1, 1);
    this.put(out, SLOT.tagPartner, camera, w, h, tmp.copy(this.partner.position).setY(this.partner.position.y + 1.75), 1, 1, 1);
    this.put(out, SLOT.bubbleMe, camera, w, h, tmp.copy(this.me.position).setY(this.me.position.y + 1.95), 1, 1, 1);
    this.put(out, SLOT.bubblePartner, camera, w, h, tmp.copy(this.partner.position).setY(this.partner.position.y + 1.95), 1, 1, 1);
    this.put(out, SLOT.bubblePet, camera, w, h, tmp.copy(this.pet.position).setY(this.pet.bubbleY), 1, 1, 1);
    this.put(out, SLOT.bubbleObject, camera, w, h, tmp.copy(this.objectAnchor).setY(this.objectAnchor.y + 0.15), 1, 1, 1);

    // wall overlays: size follows the distance, squashed sideways as the wall turns away
    const fovK = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    camera.getWorldDirection(fwd);
    this.wallItem(out, SLOT.board, camera, w, h, fovK, this.boardAnchor, true);
    for (let i = 0; i < MAX_FRAMES; i++) this.wallItem(out, SLOT.frame0 + i, camera, w, h, fovK, this.frameAnchors[i], i < this.frameCount);
  }

  private wallItem(out: Float32Array, slot: number, camera: THREE.PerspectiveCamera, w: number, h: number, fovK: number, a: THREE.Vector3, on: boolean) {
    const c = camera.position;
    const dx = a.x - c.x, dy = a.y - c.y, dz = a.z - c.z;
    const depth = Math.max(0.1, dx * fwd.x + dy * fwd.y + dz * fwd.z);
    const scale = h / (fovK * depth) / DESIGN_PPU;
    // the anniversary wall faces +x: how square-on we see it
    const squash = Math.max(0.25, -dx / (Math.hypot(dx, dy, dz) || 1));
    this.put(out, slot, camera, w, h, a, on ? this.leftWall.alpha : 0, scale, squash);
  }

  private put(out: Float32Array, slot: number, camera: THREE.Camera, w: number, h: number, v: THREE.Vector3, alpha: number, scale: number, squash: number) {
    tmp2.copy(v).project(camera);
    const i = slot * STRIDE;
    out[i] = (tmp2.x * 0.5 + 0.5) * w;
    out[i + 1] = (-tmp2.y * 0.5 + 0.5) * h;
    out[i + 2] = tmp2.z > -1 && tmp2.z < 1 ? alpha : 0; // behind the camera: hide
    out[i + 3] = scale;
    out[i + 4] = squash;
  }

  dispose() {
    this.me.dispose();
    this.partner.dispose();
    this.pet.dispose();
    disposeTree(this.root);
    this.inks.forEach((m) => m.dispose());
    disposeTextures(this.tex);
  }
}

const DAY = new THREE.Color('#F2F1EC');
const NIGHT = new THREE.Color('#2A2F45');

function visible(o: THREE.Object3D | null) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
