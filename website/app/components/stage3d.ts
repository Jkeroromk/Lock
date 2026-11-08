/**
 * The Buddy tab's 3D meadow, for the website: the same Tripo models, textures,
 * layout, lights and camera as the app (components/pet/stage/outdoor.ts,
 * components/pet/coachModel.ts, components/pet/stage/buddyCat.ts), in plain
 * three.js. Loaded lazily by BuddyStage when the section scrolls near.
 *
 * Textures are stored linear-encoded (as in the app), so they load with no
 * colour space and the renderer encodes its output to sRGB.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BASE = '/3d/';

// [prop, x, y, z, scale, turn, height scale] — copied from MEADOW_LAYOUT in the app
const LAYOUT: [string, number, number, number, number, number, number?][] = [
  ['ground', 0, -0.075, -1.6, 9, 0, 0.12],
  ['tree_round', -2.35, 0, -2.4, 1.9, 0.3],
  ['tree_pine', 2.55, 0, -2.9, 2.1, 0],
  ['tree_fruit', 3.7, 0, -4.8, 1.7, -0.4],
  ['tree_round', -3.8, 0, -4.9, 1.6, 1.2],
  ['tree_pine', -1.3, 0, -6.6, 1.8, 0.5],
  ['tree_fruit', 0.9, 0, -7.6, 1.4, 0.2],
  ['tree_pine', 4.9, 0, -7.2, 1.9, 0.8],
  ['bush', -1.75, 0, -1.35, 0.85, 0.2],
  ['bush', 1.85, 0, -1.55, 0.8, -0.3],
  ['bush', -2.75, 0, -0.3, 0.7, 0.6],
  ['bush', 2.85, 0, -0.1, 0.72, -0.5],
  ['bush', 0.25, 0, -3.9, 1.0, 0],
  ['flowers', -1.45, 0, 0.55, 0.36, 0.3],
  ['flowers', 1.6, 0, 0.62, 0.32, -0.4],
  ['flowers', -0.15, 0, -1.25, 0.3, 0.9],
  ['flowers', 2.25, 0, -0.85, 0.3, 0.2],
  ['flowers', -2.3, 0, 0.95, 0.3, -0.6],
  ['grass', -1.05, 0, -0.55, 0.32, 0.4],
  ['grass', 1.2, 0, -0.45, 0.3, -0.2],
  ['grass', -2.0, 0, -2.0, 0.36, 0.1],
  ['grass', 2.35, 0, -2.25, 0.36, -0.7],
  ['grass', 0.35, 0, 0.95, 0.24, 0.2],
  ['rock', 1.45, 0, -1.05, 0.34, 0.6],
  ['rock', -2.85, 0, -1.8, 0.45, -0.3],
  ['cloud', -3.6, 2.7, -11, 1.8, 0.1],
  ['cloud', 0.9, 3.3, -12.5, 2.2, -0.2],
  ['cloud', 4.9, 2.5, -10.5, 1.5, 0.3],
  ['cloud', -0.9, 2.2, -9.5, 1.1, 0],
];

const COACH_X = -0.62;
const BUDDY_X = 0.68;
const buddyScale = (stage: number) => 0.78 + 0.1 * (Math.max(1, Math.min(3, Math.round(stage))) - 1);
const CAM = { fov: 42, dist: 3.0, elev: (10 * Math.PI) / 180, lookY: 0.62 };

export interface StageHandle {
  dispose: () => void;
}

export interface StageOptions {
  /** Called once the first frame with every model has been drawn. */
  onReady: () => void;
  /** Animate idle clips (off for prefers-reduced-motion). */
  animate: boolean;
}

/** Scale the head/neck rotation of a clip towards its first pose (as in the app). */
function soften(clip: THREE.AnimationClip, factor: number) {
  const q0 = new THREE.Quaternion(), q = new THREE.Quaternion();
  for (const track of clip.tracks) {
    if (!/(Head|Neck)/i.test(track.name) || !track.name.endsWith('.quaternion')) continue;
    const v = track.values;
    q0.set(v[0], v[1], v[2], v[3]);
    for (let i = 0; i < v.length; i += 4) {
      q.set(v[i], v[i + 1], v[i + 2], v[i + 3]).slerp(q0, 1 - factor);
      v[i] = q.x; v[i + 1] = q.y; v[i + 2] = q.z; v[i + 3] = q.w;
    }
  }
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

class Rig {
  readonly root = new THREE.Group();
  readonly mixer: THREE.AnimationMixer;
  private actions: Record<string, THREE.AnimationAction> = {};
  private current: THREE.AnimationAction | null = null;
  private hopping = false;

  constructor(scene: THREE.Object3D, clips: THREE.AnimationClip[], private idleSpeed: number) {
    this.root.add(scene);
    this.mixer = new THREE.AnimationMixer(scene);
    for (const c of clips) this.actions[c.name] = this.mixer.clipAction(c);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.mixer as any).addEventListener('finished', (e: { action: THREE.AnimationAction }) => {
      if (e.action === this.actions.hop) { this.hopping = false; this.play('idle'); }
    });
    this.play('idle');
  }

  play(name: string) {
    const a = this.actions[name];
    if (!a || a === this.current) return;
    a.reset();
    a.timeScale = name === 'idle' ? this.idleSpeed : 1;
    if (name === 'hop') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    a.play();
    if (this.current) a.crossFadeFrom(this.current, 0.2, false);
    this.current = a;
  }

  hop() {
    if (this.hopping || !this.actions.hop) return;
    this.hopping = true;
    this.current = null;
    this.play('hop');
  }
}

export async function mountStage(host: HTMLElement, opts: StageOptions): Promise<StageHandle> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'stage3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe4f6ff, 7, 22);
  const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.05, 60);

  // lights: soft sky light plus a warm sun from the front left (app: outdoor.ts, DAY palette)
  const hemi = new THREE.HemisphereLight(0xffffff, 0xeef6e2, 1.1);
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.35);
  sun.position.set(-2.4, 4.2, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 16 });
  sun.shadow.bias = -0.0015;
  sun.shadow.normalBias = 0.02;
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(1.8, 1.4, -1.6);
  scene.add(hemi, sun, fill);

  const disposables: { dispose: () => void }[] = [];
  const texLoader = new THREE.TextureLoader();
  const tex = async (name: string) => {
    const t = await texLoader.loadAsync(BASE + name);
    t.flipY = false; // glTF UV convention
    t.colorSpace = THREE.NoColorSpace; // stored linear-encoded
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    disposables.push(t);
    return t;
  };
  const loader = new GLTFLoader();

  const shadowTex = blobTexture();
  disposables.push(shadowTex);
  const blob = (width: number, opacity: number, x: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x2f5a22, transparent: true, opacity, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.set(width, width * 0.7, 1);
    m.position.set(x, 0.006, 0);
    return m;
  };

  // ---------- meadow ----------
  const meadowP = (async () => {
    const gltf = await loader.loadAsync(BASE + 'meadow.glb');
    const geos: Record<string, THREE.BufferGeometry> = {};
    gltf.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) geos[m.name] = m.geometry; });
    const names = Object.keys(geos);
    const maps = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await tex(`meadow_${n}.jpg`)] as const)));
    const mats: Record<string, THREE.Material> = {};
    for (const n of names) {
      mats[n] = n === 'cloud'
        ? new THREE.MeshBasicMaterial({ map: maps[n], fog: false })
        : new THREE.MeshLambertMaterial({ map: maps[n] });
      disposables.push(mats[n], geos[n]);
    }
    const g = new THREE.Group();
    for (const [name, x, y, z, s, ry, sy] of LAYOUT) {
      if (!geos[name]) continue;
      const m = new THREE.Mesh(geos[name], mats[name]);
      m.position.set(x, y, z);
      m.scale.set(s, s * (sy ?? 1), name === 'ground' ? s * 0.62 : s);
      m.rotation.y = ry;
      if (name === 'ground') m.receiveShadow = true;
      else if (name !== 'cloud') m.castShadow = Math.abs(z) < 6;
      g.add(m);
    }
    return g;
  })();

  // ---------- 豆豆, the coach ----------
  const coachP = (async () => {
    const [gltf, body, collar, eyeL, eyeR, headband, tongue, whistle] = await Promise.all([
      loader.loadAsync(BASE + 'coach_v5.glb'),
      tex('body_base.jpg'), tex('collar.jpg'), tex('eyeL_open.jpg'), tex('eyeR_open.jpg'),
      tex('headband.jpg'), tex('tongue.jpg'), tex('whistle.jpg'),
    ]);
    const std = (map: THREE.Texture | null, roughness: number, color?: THREE.Color) => {
      const m = new THREE.MeshStandardMaterial({ map, roughness, metalness: 0 });
      if (color) m.color.copy(color);
      disposables.push(m);
      return m;
    };
    const byName: Record<string, THREE.Material> = {
      body: std(body, 0.92), collar: std(collar, 0.7), eye_L: std(eyeL, 0.35), eye_R: std(eyeR, 0.35),
      headband: std(headband, 0.85), tongue: std(tongue, 0.55), whistle: std(whistle, 0.4),
      nose_new: std(null, 0.3, new THREE.Color().setRGB(0.018, 0.014, 0.013, THREE.LinearSRGBColorSpace)),
    };
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (byName[m.name]) m.material = byName[m.name];
      m.castShadow = true;
      m.frustumCulled = false;
      disposables.push(m.geometry);
    });
    for (const clip of gltf.animations) if (clip.name === 'idle') soften(clip, 0.55);
    const rig = new Rig(gltf.scene, gltf.animations, 0.8);
    rig.root.position.set(COACH_X, 0, 0);
    rig.root.rotation.y = 0.3;
    const holder = new THREE.Group();
    holder.add(rig.root, blob(0.9, 0.22, COACH_X));
    return { rig, holder };
  })();

  // ---------- the buddy (圆圆, the cat) ----------
  const buddyP = (async () => {
    const [gltf, map] = await Promise.all([loader.loadAsync(BASE + 'buddy_cat.glb'), tex('buddy_cat.jpg')]);
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 });
    disposables.push(mat);
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = mat;
      m.castShadow = true;
      m.frustumCulled = false;
      disposables.push(m.geometry);
    });
    gltf.scene.scale.setScalar(1 / 0.977);
    const rig = new Rig(gltf.scene, gltf.animations, 1);
    rig.root.scale.setScalar(0.85 * (buddyScale(2) / buddyScale(1)));
    rig.root.position.set(BUDDY_X, 0, 0);
    rig.root.rotation.y = -0.45;
    const holder = new THREE.Group();
    holder.add(rig.root, blob(0.75, 0.2, BUDDY_X));
    return { rig, holder };
  })();

  const [meadow, coach, buddy] = await Promise.all([meadowP, coachP, buddyP]);
  scene.add(meadow, coach.holder, buddy.holder);

  // ---------- camera, drag to turn, tap to hop ----------
  let az = 0, azTarget = 0, lastTouch = 0;
  const placeCamera = () => {
    camera.position.set(
      Math.sin(az) * Math.cos(CAM.elev) * CAM.dist,
      CAM.lookY + Math.sin(CAM.elev) * CAM.dist,
      Math.cos(az) * Math.cos(CAM.elev) * CAM.dist,
    );
    camera.lookAt(0, CAM.lookY, 0);
  };
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep both characters in frame on narrow (phone) widths
    camera.fov = w / h < 1 ? CAM.fov * 1.35 : CAM.fov;
    camera.updateProjectionMatrix();
  };

  let down: { x: number; az: number; moved: boolean } | null = null;
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, az: azTarget, moved: false }; lastTouch = performance.now(); };
  const onMove = (e: PointerEvent) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 4) down.moved = true;
    azTarget = Math.max(-0.8, Math.min(0.8, down.az - dx * 0.005));
    lastTouch = performance.now();
  };
  const ray = new THREE.Raycaster();
  const onUp = (e: PointerEvent) => {
    const wasTap = down && !down.moved;
    down = null;
    lastTouch = performance.now();
    if (!wasTap) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    if (ray.intersectObject(coach.rig.root, true).length) coach.rig.hop();
    else if (ray.intersectObject(buddy.rig.root, true).length) buddy.rig.hop();
  };
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  host.appendChild(canvas);
  resize();
  placeCamera();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // ---------- loop: only while on screen ----------
  let visible = true, raf = 0, last = performance.now(), ready = false;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' });
  io.observe(host);
  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // drift back to the front a few seconds after the last drag
    if (!down && now - lastTouch > 2500) azTarget *= 0.97;
    az += (azTarget - az) * Math.min(1, dt * 8);
    placeCamera();
    if (opts.animate) { coach.rig.mixer.update(dt); buddy.rig.mixer.update(dt); }
    renderer.render(scene, camera);
    if (!ready) { ready = true; opts.onReady(); }
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener('visibilitychange', onVis);
  kick();

  return {
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
