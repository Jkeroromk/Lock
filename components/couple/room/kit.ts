import * as THREE from 'three';

/**
 * The room's look: chunky toon shading plus black ink outlines (Lock's stroke).
 *
 * Outlines are the "inverted hull" trick: a slightly bigger copy of the mesh,
 * black, drawn back faces only. Materials are shared by colour inside one Kit
 * so the GPU switches state less; walls get their own Kit (scope) because
 * their pictures fade out on their own.
 */
export class Kit {
  private cache = new Map<string, THREE.MeshToonMaterial>();

  constructor(public ramp: THREE.Texture, public ink: THREE.MeshBasicMaterial) {}

  /** Same ramp, own material cache; optionally its own ink (a wall fades its outlines). */
  scope(ink: THREE.MeshBasicMaterial = this.ink) {
    return new Kit(this.ramp, ink);
  }

  /** Shared toon material for a plain colour. */
  toon(color: string): THREE.MeshToonMaterial {
    let m = this.cache.get(color);
    if (!m) {
      m = new THREE.MeshToonMaterial({ color, gradientMap: this.ramp });
      this.cache.set(color, m);
    }
    return m;
  }

  /** A one-off toon material (textured, transparent, double sided…). */
  toonWith(params: THREE.MeshToonMaterialParameters): THREE.MeshToonMaterial {
    return new THREE.MeshToonMaterial({ gradientMap: this.ramp, ...params });
  }

  mesh(
    geo: THREE.BufferGeometry,
    color: string,
    opts: { outline?: number; shadow?: boolean; receive?: boolean; mat?: THREE.Material } = {},
  ): THREE.Mesh {
    const { outline = 0.045, shadow = false, receive = false, mat } = opts;
    const m = new THREE.Mesh(geo, mat ?? this.toon(color));
    m.castShadow = shadow;
    m.receiveShadow = receive;
    if (outline) {
      const o = new THREE.Mesh(geo, this.ink);
      o.scale.setScalar(1 + outline);
      o.userData.outline = true;
      m.add(o);
    }
    return m;
  }
}

export const rbox = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** Flat unlit material (eyes, bulbs, sky). */
export const flat = (color: string, extra: THREE.MeshBasicMaterialParameters = {}) =>
  new THREE.MeshBasicMaterial({ color, ...extra });

/** Cast shadows from every real (non-outline) mesh below obj. */
export function castShadows(obj: THREE.Object3D, skip?: (m: THREE.Mesh) => boolean) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.outline && !(skip && skip(m))) m.castShadow = true;
  });
}

/** Free every geometry and material under obj (each once). Textures are freed by their owner. */
export function disposeTree(obj: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  obj.traverse((o) => {
    const m = o as THREE.Mesh | THREE.Sprite;
    if ((m as THREE.Mesh).isMesh || (m as THREE.Sprite).isSprite) {
      // sprites all share one built-in quad: leave it alone
      if ((m as THREE.Mesh).isMesh && m.geometry) geos.add(m.geometry);
      // outlines use the shared ink, freed by its owner
      if (o.userData.outline) return;
      const mm = m.material as THREE.Material | THREE.Material[];
      (Array.isArray(mm) ? mm : [mm]).forEach((x) => x && mats.add(x));
    }
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
}
