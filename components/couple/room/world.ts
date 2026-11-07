import * as THREE from 'three';
import type { Gender, NudgeKind } from '@/services/couple';
import { Kit, castShadows, disposeTree, flat, rbox } from './kit';
import { separate } from './actor';
import { Villager, colorOf } from './villager';
import { Pet } from './pet';
import { OBSTACLES, smooth } from './physics';
import { plushMesh, type PlushAssets } from './plush';
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
  /** The toon wall itself (paper, cap, skirt): hidden once the plush room is in. */
  toon: THREE.Object3D[];
  /** Plush room: the wall is either standing or sunk (never resting half way). */
  up: boolean;
  /** The plush wall (two mirrored halves): slides down into the floor (cut off there) instead of squashing. */
  plush?: THREE.Mesh[];
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
  private lampShade!: THREE.MeshToonMaterial | THREE.MeshStandardMaterial;
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
  private equipped: Record<string, string> | null | undefined = null;
  /** The toon room shows the anniversary words on its wall; the plush room keeps them in the sheet. */
  private wordsOnWalls = true;
  private frames: THREE.Group[] = [];
  /** Toon pieces the plush room replaces (hidden by usePlush). */
  private toonOnly: THREE.Object3D[] = [];
  private doorAt = new THREE.Vector3();
  /** The plush room's four corners (see usePlush). */
  private corners: { wx: Wall; wz: Wall; corner: THREE.Mesh; capX: THREE.Mesh; capZ: THREE.Mesh }[] = [];
  /** Plush materials per style slot (set by usePlush); null while the room is toon. */
  private plush: Partial<Record<HomeSlot, THREE.MeshStandardMaterial[]>> | null = null;
  private plushExtras: { flowers: THREE.Group; oranges: THREE.Group } | null = null;
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
    this.toonOnly.push(floor, rug, rug2);
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

    const wall: Wall = { group: g, lift, decor, ink, axis, sign, shown: 1, up: true, alpha: 1, lastAlpha: -1, mats: [], toon: [body, cap, skirt] };
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
    f.userData.toonBorder = back;
    f.userData.size = [w, h];
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
      this.toonOnly.push(win, bar);
      const shelf = k.mesh(rbox(1.8, 0.1, 0.45), '#FFFFFF', { outline: 0.04 });
      this.toonOnly.push(shelf);
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
      // the shelf rides with the bottles (usePlush moves both clear of the round window)
      g.remove(shelf);
      bottles.add(shelf);
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
      this.toonOnly.push(door, knob, sign);
      this.doorAt.copy(door.position);
    });

    // Front wall: bookcase.
    this.buildWall('z', 1, this.tex.wallB, (g, k) => {
      const shelf = k.mesh(rbox(2.2, 2.2, 0.5), '#FFFFFF', { outline: 0.02 });
      shelf.position.set(0.6, 1.1, 0.35);
      g.add(shelf);
      this.toonOnly.push(shelf);
      ['#FF8FA3', '#4DB6FF', '#FFD43B', '#0A0A0A', '#6CC27A'].forEach((col, i) => {
        const b = k.mesh(rbox(0.22, 0.6 - (i % 2) * 0.12, 0.35), col, { outline: 0.04 });
        b.position.set(-0.2 + i * 0.32, 1.55, 0.62);
        g.add(b);
        this.toonOnly.push(b);
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
    this.toonOnly.push(sofa);

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
    this.toonOnly.push(table);
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
    this.toonOnly.push(pot, leaves);

    // pet bed + bowl
    fx.bedRing = k.toonWith({ color: '#FF8FA3' });
    fx.bedInside = k.toonWith({ color: '#FFE0E6' });
    // sized for 豆豆 (about 1 × 0.9 units)
    const bed = k.mesh(new THREE.TorusGeometry(0.62, 0.18, 10, 28), '', { mat: fx.bedRing }); bed.rotation.x = Math.PI / 2; bed.position.set(-1.6, 0.16, -2.6);
    const bedIn = k.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 24), '', { outline: 0, mat: fx.bedInside }); bedIn.position.set(-1.6, 0.05, -2.6);
    const bowl = k.mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.14, 16), '#FFFFFF'); bowl.position.set(-0.4, 0.07, -3.0);
    this.root.add(this.tappable(bed, 'bed'), bedIn, bowl);
    this.toonOnly.push(bed, bedIn, bowl);

    // floor lamp
    const pole = k.mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), '#0A0A0A', { outline: 0 }); pole.position.set(-3.3, 1.0, -3.2);
    this.lampShade = k.toonWith({ color: '#FFF1BF', side: THREE.DoubleSide });
    const shade = k.mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.4, 18, 1, true), '#FFF1BF', { mat: this.lampShade }); shade.position.set(-3.3, 2.05, -3.2);
    this.lampLight = new THREE.PointLight('#FFD98A', 1.1, 5);
    this.lampLight.position.set(-3.3, 1.9, -3.2);
    const lamp = new THREE.Group();
    lamp.add(pole, shade);
    this.root.add(this.tappable(lamp, 'lamp'), this.lampLight);
    this.toonOnly.push(lamp);
  }

  /**
   * Move into the plush room (Tripo models): the shell's floor and walls, the
   * furniture and the two people replace their toon versions. The walls still
   * sink as the room turns: the shell has a back and a left wall, the front and
   * right ones are mirror copies. Called once, after plushAssets has loaded.
   */
  usePlush(a: PlushAssets) {
    if (this.plush) return;
    const P = a.pieces;
    const mats: Partial<Record<HomeSlot, THREE.MeshStandardMaterial[]>> = {};
    const add = (slot: HomeSlot | null, m: THREE.Mesh) => {
      if (slot) (mats[slot] ??= []).push(m.material as THREE.MeshStandardMaterial);
      return m;
    };
    const place = (o: THREE.Object3D, x: number, z: number, s: number | [number, number, number], ry = 0) => {
      o.position.set(x, 0, z);
      if (Array.isArray(s)) o.scale.set(...s); else o.scale.setScalar(s);
      o.rotation.y = ry;
      return o;
    };

    // shell: built from the model's back-left quarter, mirrored (seamless joins).
    // A sinking wall slides into the floor and is cut off there.
    // (cut a little below the boards, so a sunk wall's rim still covers the slab's rough edge under it)
    const cut = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.14)];
    const shellMat = (piece: PlushAssets['pieces'][string]) =>
      // double-sided: where the floor cuts a sunk wall open, its inside shows (soft cream), not the gaps behind it
      new THREE.MeshStandardMaterial({ map: piece.map, roughness: 0.92, metalness: 0, clippingPlanes: cut, side: THREE.DoubleSide });
    const wallMat = shellMat(P.room_back_half);
    (mats.wall ??= []).push(wallMat);
    const floorMat = new THREE.MeshStandardMaterial({ map: P.room_floor_q.map, roughness: 0.92, metalness: 0 });
    (mats.floor ??= []).push(floorMat);
    const mirrored = (piece: PlushAssets['pieces'][string], mat: THREE.Material, mx: number, mz: number) => {
      const m = new THREE.Mesh(piece.geometry, mat);
      m.scale.set(mx, 1, mz); // negative scale: three flips the winding for us
      m.receiveShadow = true;
      this.root.add(m);
      return m;
    };
    for (const mx of [1, -1]) for (const mz of [1, -1]) mirrored(P.room_floor_q, floorMat, mx, mz);
    for (const w of this.walls) {
      // halves: the left wall's is at -x (z ≤ 0), the back wall's at -z (x ≤ 0)
      const f = w.sign > 0 ? -1 : 1;
      w.plush = w.axis === 'x'
        ? [mirrored(P.room_left_half, wallMat, f, 1), mirrored(P.room_left_half, wallMat, f, -1)]
        : [mirrored(P.room_back_half, wallMat, 1, f), mirrored(P.room_back_half, wallMat, -1, f)];
      w.toon.forEach((o) => { o.visible = false; });
      w.decor.position.z = 0.08; // in front of the plush wall's bumps
    }
    // corners: the corner piece while both walls stand; when only one does,
    // that wall's own rounded end (the model's open ends) finishes it instead
    for (const X of [-1, 1]) for (const Z of [-1, 1]) {
      const wx = this.walls.find((w) => w.axis === 'x' && w.sign === X)!;
      const wz = this.walls.find((w) => w.axis === 'z' && w.sign === Z)!;
      this.corners.push({
        wx, wz,
        corner: mirrored(P.room_corner, wallMat, -X, -Z),
        capX: mirrored(P.room_cap_left, wallMat, -X, Z), // the x-wall's end at this corner
        capZ: mirrored(P.room_cap_back, wallMat, X, -Z), // the z-wall's end at this corner
      });
    }
    this.toonOnly.forEach((o) => { o.visible = false; });

    // the round window in the back wall (tap target only; the shell has the window)
    const back = this.walls.find((w) => w.axis === 'z' && w.sign < 0)!;
    const winHit = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), new THREE.MeshBasicMaterial({ visible: false }));
    winHit.position.set(0.3, 1.95, 0.25);
    back.decor.add(this.tappable(winHit, 'window', back));
    this.bottles.position.set(0.75, 0.6, 0); // shelf + bottles between the window and the corner, above the plant
    this.root.updateMatrixWorld(true);
    const was = this.anchorsOf.get(this.bottles)!;
    const now = this.bottles.localToWorld(new THREE.Vector3(1.4, 2.5, 0.3));
    if (this.objectAnchor.equals(was)) this.objectAnchor.copy(now);
    this.anchorsOf.set(this.bottles, now);

    // wall decor: plush wooden frames round the board and the photos, a plush door and shelf
    const fit = (piece: PlushAssets['pieces'][string], w: number, h: number, wall: Wall) => {
      const g = piece.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox!;
      const m = plushMesh(piece, { shadow: false });
      const sx = w / (bb.max.x - bb.min.x), sy = h / (bb.max.y - bb.min.y), sz = Math.min(sx, sy);
      m.scale.set(sx, sy, sz);
      m.position.set(-((bb.min.x + bb.max.x) / 2) * sx, -bb.min.y * sy, -bb.min.z * sz);
      wall.mats.push({ m: m.material as THREE.Material, base: 1 });
      return { mesh: m, depth: (bb.max.z - bb.min.z) * sz };
    };
    const left = this.leftWall;
    const framePlush = (f: THREE.Group, piece: PlushAssets['pieces'][string], border: number) => {
      const [w, h] = f.userData.size as [number, number];
      (f.userData.toonBorder as THREE.Object3D).visible = false;
      const { mesh, depth } = fit(piece, w + border, h + border, left);
      mesh.position.y -= (h + border) / 2;
      mesh.position.z -= 0.06;
      f.add(mesh);
      // the picture card sits just in front of the plush frame's own canvas
      f.children.forEach((c) => {
        const g = (c as THREE.Mesh).geometry;
        // the caption strip (shorter than the picture) stays just in front of it
        if (g instanceof THREE.PlaneGeometry) c.position.z = depth - 0.05 + (g.parameters.height < h * 0.5 ? 0.006 : 0);
      });
    };
    framePlush(this.board as THREE.Group, P.board_frame, 0.4);
    const boardMat = (this.board.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    boardMat.map = this.tex.boardSoft;
    boardMat.needsUpdate = true;
    this.wordsOnWalls = false;
    this.frames.forEach((f, i) => {
      framePlush(f, P.photo_frame, 0.3);
      // no caption strip (words live in the anniversary sheet): the picture fills the frame
      f.children.forEach((c) => {
        const g = (c as THREE.Mesh).geometry;
        if (!(g instanceof THREE.PlaneGeometry)) return;
        if (g.parameters.height < 0.5) c.visible = false;
        else { const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial; m.map = this.tex.framePics[i]; m.color.set('#FFFFFF'); m.needsUpdate = true; }
      });
    });
    const right = this.walls.find((w) => w.axis === 'x' && w.sign > 0)!;
    const door = fit(P.door, 1.35, 2.45, right).mesh;
    door.position.x += this.doorAt.x;
    door.position.z += 0.02;
    right.decor.add(door);
    const wallShelf = fit(P.wall_shelf, 1.9, 0.42, back).mesh;
    wallShelf.position.add(new THREE.Vector3(1.4, 1.81 - 0.42, 0.06));
    this.bottles.add(wallShelf);
    this.bottles.traverse((o) => { if (o.userData.outline) o.visible = false; });

    // the bookshelf stands against the front wall (sinks and fades with it)
    const front = this.walls.find((w) => w.axis === 'z' && w.sign > 0)!;
    const shelf = plushMesh(P.shelf);
    shelf.position.set(2.55, 0, 0.42); // the front wall is turned round: world x -2.55, clear of its window
    shelf.scale.setScalar(2.3);
    front.decor.add(shelf);
    front.mats.push({ m: shelf.material as THREE.Material, base: 1 });

    // furniture
    const rug = place(add('rug', plushMesh(P.rug, { shadow: false })), 0.3, 0.4, [4.3, 0.9, 4.3]);
    const sofa = place(new THREE.Group().add(add('sofa', plushMesh(P.sofa))), -2.95, 0.6, 2.4, Math.PI / 2);
    const table = place(new THREE.Group().add(add('table', plushMesh(P.table))), 2.2, -1.9, 1.25);
    const mugGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.18, 14);
    ([['#FF8FA3', -0.16, 0.08], ['#4DB6FF', 0.15, -0.1]] as const).forEach(([c, x, z]) => {
      const mug = new THREE.Mesh(mugGeo, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
      mug.position.set(x / 1.25, 0.735, z / 1.25);
      mug.scale.setScalar(1 / 1.25);
      mug.castShadow = true;
      table.add(mug);
    });
    // big enough for 豆豆 to lie in (~1 unit long); its cushion top is 0.21 × scale up
    const BED = 2.4;
    const bed = place(new THREE.Group().add(add('bed', plushMesh(P.bed))), -1.6, -2.6, BED);
    this.pet.bedLift = 0.21 * BED;
    const bowl = place(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.14, 16), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5 })), 0.2, -3.3, 1);
    bowl.position.y = 0.07;
    const plant = place(new THREE.Group(), 3.15, -3.15, 1.6);
    plant.add(plushMesh(P.plant_pot), add('plant', plushMesh(P.plant_leaves)));
    // the plant's styles grow flowers or oranges among the leaves
    const dot = new THREE.SphereGeometry(0.045, 12, 8);
    const flowers = new THREE.Group(), oranges = new THREE.Group();
    const pink = new THREE.MeshStandardMaterial({ color: '#FF8FA3', roughness: 0.8 });
    const yellow = new THREE.MeshStandardMaterial({ color: '#FFD43B', roughness: 0.8 });
    const orange = new THREE.MeshStandardMaterial({ color: '#FFA53B', roughness: 0.6 });
    ([[0.22, 0.72, 0.18], [-0.26, 0.68, 0.14], [0.05, 0.9, 0.2], [0.3, 0.86, -0.08], [-0.12, 0.6, 0.3], [-0.24, 0.92, -0.06]] as const).forEach(([x, y, z], i) => {
      const f = new THREE.Mesh(dot, i % 2 ? yellow : pink); f.position.set(x, y, z); flowers.add(f);
      const o = new THREE.Mesh(dot, orange); o.position.set(x, y - 0.02, z); o.scale.setScalar(1.3); o.castShadow = true; oranges.add(o);
    });
    flowers.visible = oranges.visible = false;
    plant.add(flowers, oranges);
    this.plushExtras = { flowers, oranges };
    const lamp = place(new THREE.Group(), -3.3, -3.2, 2.3);
    lamp.add(plushMesh(P.lamp_base), add('lamp', plushMesh(P.lamp_shade)));
    const pouf = place(plushMesh(P.pouf), 2.95, -0.55, 1.0);
    this.root.add(rug, sofa, table, bed, bowl, plant, lamp, pouf);
    this.tappable(sofa, 'sofa');
    this.tappable(table, 'table');
    this.tappable(bed, 'bed');
    this.tappable(lamp, 'lamp');
    this.anchorsOf.set(table, new THREE.Vector3(2.2, 1.2, -1.9));
    this.lampShade = (lamp.children[1] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    this.lampLight.position.set(-3.3, 1.8, -3.2);

    // where things stand (the plush pieces are chunkier than the toon ones)
    const set = (name: string, x0: number, x1: number, z0: number, z1: number) => {
      const o = OBSTACLES.find((b) => b.name === name);
      if (o) Object.assign(o, { x0, x1, z0, z1 }); else OBSTACLES.push({ name, x0, x1, z0, z1 });
    };
    set('sofa', -3.95, -2.05, -0.55, 1.75);
    set('table', 1.6, 2.8, -2.5, -1.3);
    set('plant', 2.55, 3.95, -3.95, -2.55);
    set('lamp', -3.7, -2.9, -3.6, -2.8);
    set('bookcase', -3.7, -1.45, 2.9, 3.95);
    set('pouf', 2.5, 3.4, -1.0, -0.1);
    set('bed', -2.75, -0.45, -3.75, -1.45);
    set('bowl', -0.1, 0.5, -3.6, -3.0);
    // the seat cushions' top is 0.61 up, from x -2.6 (back cushions) to -2.0 (front edge)
    for (const v of [this.me, this.partner]) { v.seatX = -2.5; v.seatY = 0.61; v.standX = -1.75; }

    this.plush = mats;
    this.me.usePlush(a);
    this.partner.usePlush(a);
    this.setFurniture(this.equipped);
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
    this.equipped = equipped;
    this.furniture = equippedLooks(equipped);
    const fx = this.fx;
    for (const slot of HOME_SLOTS) {
      const it = HOME_ITEM[this.furniture[slot]];
      if (!it) continue;
      if (this.plush) {
        this.plush[slot]?.forEach((m) => m.color.set(it.tint));
        if (slot === 'lamp') { const l = it.look as LookBySlot['lamp']; this.lampColors = { on: it.tint, light: l.light }; this.lampLight.color.set(l.light); }
        if (slot === 'plant' && this.plushExtras) { const l = it.look as LookBySlot['plant']; this.plushExtras.flowers.visible = l.extra === 'flowers'; this.plushExtras.oranges.visible = l.extra === 'oranges'; }
        continue;
      }
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
      case 'sofa': this.me.sit(this.plush ? 0.05 : 0.0, this.reduced); this.partner.sit(1.15, this.reduced); break;
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
      if (w.plush) {
        // plush walls are up or down, never half way (a half-sunk plush wall is
        // cut open by the floor): flip past a threshold, with a little slack so
        // they don't flicker, and slide there in about a third of a second
        if (w.up && facing < -0.12) w.up = false;
        else if (!w.up && facing > 0.02) w.up = true;
        const goal = w.up ? 1 : 0;
        w.shown = this.reduced ? goal : w.shown + Math.sign(goal - w.shown) * Math.min(Math.abs(goal - w.shown), dt / 0.32);
      } else {
        const want = smooth(-0.35, 0.25, facing);
        w.shown += (want - w.shown) * Math.min(1, dt * 7);
      }
      // the wall sinks to a stub; its pictures fade out before it sinks
      if (w.plush) {
        // only the rounded top stays above the floor, like a doll's-house rim
        w.lift.scale.y = 1;
        for (const m of w.plush) m.position.y = sunk(w.shown);
        w.decor.position.y = sunk(w.shown); // pictures go down with their wall (and fade)
      } else w.lift.scale.y = 0.1 + 0.9 * w.shown;
      const alpha = w.plush ? smooth(0.55, 0.95, w.shown) : smooth(0.45, 0.95, w.shown);
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
    for (const c of this.corners) {
      const sx = c.wx.shown, sz = c.wz.shown;
      c.corner.position.y = sunk(Math.min(sx, sz));
      // one wall up, the other down: the standing wall ends in its own rounded end
      c.capX.visible = sx >= 0.5 && sz < 0.5;
      c.capZ.visible = sz >= 0.5 && sx < 0.5;
      c.capX.position.y = sunk(sx);
      c.capZ.position.y = sunk(sz);
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
    this.wallItem(out, SLOT.board, camera, w, h, fovK, this.boardAnchor, this.wordsOnWalls);
    for (let i = 0; i < MAX_FRAMES; i++) this.wallItem(out, SLOT.frame0 + i, camera, w, h, fovK, this.frameAnchors[i], this.wordsOnWalls && i < this.frameCount);
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

/** How far a plush wall has slid into the floor when shown (0..1) — its rounded top stays out. */
const sunk = (shown: number) => -(1 - shown) * (WALL_H - 0.3);

const DAY = new THREE.Color('#F2F1EC');
const NIGHT = new THREE.Color('#2A2F45');

function visible(o: THREE.Object3D | null) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
