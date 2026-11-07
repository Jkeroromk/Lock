import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * The couple room's plush look, made with ChatGPT (images) → Tripo (models):
 * the room shell, the furniture and the two people. Loaded by plushAssets.ts;
 * until (or unless) that works the room keeps its toon look.
 *
 * Each piece's colour texture is a linear-encoded JPEG; a furniture style is a
 * colour multiplied over it (HomeItem.tint), so one model gives every style.
 */

/** One mesh of couple.glb with its colour texture. */
export interface PlushPiece { geometry: THREE.BufferGeometry; map: THREE.Texture }

/** A rigged person (Tripo's humanoid rig: mixamorig bone names). */
export interface PlushPersonModel { scene: THREE.Object3D; map: THREE.Texture }

export interface PlushAssets {
  /** room_floor / room_left / room_back (already in room units), sofa, rug, lamp_base, lamp_shade, table, bed, plant_pot, plant_leaves, shelf, pouf, board_frame, photo_frame, door, wall_shelf. */
  pieces: Record<string, PlushPiece>;
  people: { boy: PlushPersonModel; girl: PlushPersonModel };
}

/** A textured plush mesh; its own material, so a style can tint it. */
export function plushMesh(p: PlushPiece, opts: { shadow?: boolean; receive?: boolean } = {}) {
  const m = new THREE.Mesh(p.geometry, new THREE.MeshStandardMaterial({ map: p.map, roughness: 0.92, metalness: 0 }));
  m.castShadow = opts.shadow ?? true;
  m.receiveShadow = opts.receive ?? true;
  return m;
}

const PERSON_HEIGHT = 1.58; // the toon villagers' height

type BoneKey = 'hips' | 'spine' | 'chest' | 'neck' | 'head' | 'upLegL' | 'legL' | 'upLegR' | 'legR' | 'shoulderL' | 'armL' | 'foreL' | 'shoulderR' | 'armR' | 'foreR';
const BONES: Record<BoneKey, string> = {
  hips: 'Hips', spine: 'Spine', chest: 'Spine2', neck: 'Neck', head: 'Head',
  upLegL: 'LeftUpLeg', legL: 'LeftLeg', upLegR: 'RightUpLeg', legR: 'RightLeg',
  shoulderL: 'LeftShoulder', armL: 'LeftArm', foreL: 'LeftForeArm', shoulderR: 'RightShoulder', armR: 'RightArm', foreR: 'RightForeArm',
};

interface Joint { bone: THREE.Bone; rest: THREE.Quaternion; restPos: THREE.Vector3; parentQ: THREE.Quaternion; parentInv: THREE.Quaternion }

/** What the villager wants the body to do this frame (all in radians / units). */
export interface Pose {
  /** Walk cycle: legs and arms swing ± this. */
  swing: number;
  bob: number;
  roll: number;
  /** 0..1 how far into the seated pose. */
  sit: number;
  /** Waving with the right hand (t drives the hand). */
  wave: boolean;
  t: number;
  headYaw: number;
  headRoll: number;
}

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

/**
 * A plush person: Tripo's model posed in code (like the toon villagers), so
 * there are no clips to make — each joint turns about the body's own axes
 * (x: forward/back, y: turn, z: sideways; the model faces +z).
 */
export class PlushPerson {
  readonly root = new THREE.Group();
  private j = {} as Record<BoneKey, Joint>;
  /** The hips' rest height (units, after scaling): seated, the hips sit on the cushion. */
  readonly hipY: number;
  /** +1 when the model's left side is +x. */
  private side = 1;
  readonly material: THREE.MeshStandardMaterial;

  constructor(model: PlushPersonModel) {
    const scene = cloneSkinned(model.scene) as THREE.Object3D;
    this.material = new THREE.MeshStandardMaterial({ map: model.map, roughness: 0.92, metalness: 0 });
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isMesh) { m.material = this.material; m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; }
    });
    const box = new THREE.Box3().setFromObject(scene);
    const k = PERSON_HEIGHT / Math.max(0.01, box.max.y - box.min.y);
    scene.scale.setScalar(k);
    scene.position.y = -box.min.y * k;
    this.root.add(scene);
    this.root.updateMatrixWorld(true);

    const rootInv = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
    const byName = new Map<string, THREE.Bone>();
    scene.traverse((o) => { if ((o as THREE.Bone).isBone) byName.set(o.name.replace(/^mixamorig:?/, ''), o as THREE.Bone); });
    for (const key of Object.keys(BONES) as BoneKey[]) {
      const bone = byName.get(BONES[key]);
      if (!bone) throw new Error(`plush person: no ${BONES[key]} bone`);
      const parentQ = rootInv.clone().multiply(bone.parent!.getWorldQuaternion(new THREE.Quaternion()));
      this.j[key] = { bone, rest: bone.quaternion.clone(), restPos: bone.position.clone(), parentQ, parentInv: parentQ.clone().invert() };
    }
    const wp = (b: THREE.Bone) => this.root.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
    this.side = wp(this.j.armL.bone).x > wp(this.j.armR.bone).x ? 1 : -1;
    this.hipY = wp(this.j.hips.bone).y;
  }

  /** Turn joint key about body axis by angle (on top of whatever it already has this frame). */
  private turn(key: BoneKey, axis: THREE.Vector3, angle: number) {
    if (!angle) return;
    const jt = this.j[key];
    // body-space rotation, expressed in the parent's rest frame: P⁻¹ · q · P
    qa.setFromAxisAngle(axis, angle);
    qb.copy(jt.parentInv).multiply(qa).multiply(jt.parentQ);
    jt.bone.quaternion.premultiply(qb);
  }

  pose(p: Pose) {
    for (const key in this.j) { const jt = this.j[key as BoneKey]; jt.bone.quaternion.copy(jt.rest); jt.bone.position.copy(jt.restPos); }
    const s = this.side;
    const sit = p.sit;
    // legs: walking swing, or thighs forward and shins down when seated
    this.turn('upLegL', X, -p.swing * (1 - sit) - 1.45 * sit);
    this.turn('upLegR', X, p.swing * (1 - sit) - 1.45 * sit);
    this.turn('legL', X, Math.max(0, p.swing) * 0.5 * (1 - sit) + 1.35 * sit);
    this.turn('legR', X, Math.max(0, -p.swing) * 0.5 * (1 - sit) + 1.35 * sit);
    // arms: opposite to the legs; the right hand waves
    // (Tripo binds much of each sleeve to the shoulder bone, so swings start there)
    this.turn('shoulderL', X, p.swing * 0.4 * (1 - sit));
    this.turn('armL', X, p.swing * 0.5 * (1 - sit) - 0.25 * sit);
    if (p.wave) {
      this.turn('shoulderR', Z, -s * 0.75);
      this.turn('armR', Z, -s * 0.75);
      this.turn('armR', X, 0.5); // a little in front of the face, not behind the big head
      this.turn('foreR', Z, -s * (0.8 + Math.sin(p.t * 12) * 0.45));
    } else {
      this.turn('shoulderR', X, -p.swing * 0.4 * (1 - sit));
      this.turn('armR', X, -p.swing * 0.5 * (1 - sit) - 0.25 * sit);
    }
    // body: bob and lean while walking, breathing when still
    this.turn('spine', Z, p.roll);
    this.turn('chest', X, Math.sin(p.t * 2.2) * 0.02);
    this.turn('head', Y, p.headYaw);
    this.turn('head', Z, p.headRoll);
    this.j.hips.bone.position.y += p.bob / Math.max(1e-6, this.root.children[0].scale.y);
  }

  setTint(color: string) { this.material.color.set(color); }

  dispose() { this.material.dispose(); }
}
