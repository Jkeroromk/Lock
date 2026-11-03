import * as THREE from 'three';

/**
 * Turning the room with a finger, like the prototype's OrbitControls but fed
 * by gesture-handler events: one finger turns (all the way round sideways,
 * up/down clamped so you never look under the floor or straight down), two
 * fingers pinch to zoom (clamped), and a flick keeps turning a little.
 * The camera eases towards where the finger puts it every frame (damping).
 */
export class Orbit {
  readonly target = new THREE.Vector3(0, 0.9, 0);
  // where the finger wants the camera …
  theta = Math.PI / 4;
  phi = 1.073;
  radius = 20.1;
  // … and where it is now
  private cTheta = this.theta;
  private cPhi = this.phi;
  private cRadius = this.radius;
  // flick: angular speed (rad/s) that decays after the finger lifts
  private vTheta = 0;
  private vPhi = 0;
  private pinchBase = this.radius;
  private dragging = false;
  pinching = false;

  static readonly PHI_MIN = 0.55;
  static readonly PHI_MAX = 1.22;
  static readonly R_MIN = 8;
  static readonly R_MAX = 25;

  /** Radians per point dragged (OrbitControls: 2π·rotateSpeed / view height). */
  private perPoint = 0.0055;

  setViewHeight(h: number) { this.perPoint = (2 * Math.PI * 0.7) / Math.max(200, h); }

  dragStart() { this.dragging = true; this.vTheta = this.vPhi = 0; }

  /** Finger moved by (dx, dy) points since the last event. */
  drag(dx: number, dy: number) {
    if (this.pinching) return;
    this.theta -= dx * this.perPoint;
    this.phi = clamp(this.phi - dy * this.perPoint, Orbit.PHI_MIN, Orbit.PHI_MAX);
  }

  /** Finger lifted with velocity (points/s): keep turning a little. */
  dragEnd(vx: number, vy: number, reduced: boolean) {
    this.dragging = false;
    if (reduced || this.pinching) return;
    this.vTheta = clamp(-vx * this.perPoint, -4, 4);
    this.vPhi = clamp(-vy * this.perPoint, -2, 2);
  }

  pinchStart() { this.pinching = true; this.pinchBase = this.radius; this.vTheta = this.vPhi = 0; }
  pinch(scale: number) { this.radius = clamp(this.pinchBase / Math.max(0.05, scale), Orbit.R_MIN, Orbit.R_MAX); }
  pinchEnd() { this.pinching = false; }

  /** Ease the camera towards the goal and point it at the room. */
  update(dt: number, camera: THREE.Camera) {
    if (!this.dragging && (this.vTheta !== 0 || this.vPhi !== 0)) {
      this.theta += this.vTheta * dt;
      this.phi = clamp(this.phi + this.vPhi * dt, Orbit.PHI_MIN, Orbit.PHI_MAX);
      const decay = Math.exp(-dt * 4);
      this.vTheta *= decay;
      this.vPhi *= decay;
      if (Math.abs(this.vTheta) < 0.01 && Math.abs(this.vPhi) < 0.01) this.vTheta = this.vPhi = 0;
    }
    const k = Math.min(1, dt * 10);
    this.cTheta += (this.theta - this.cTheta) * k;
    this.cPhi += (this.phi - this.cPhi) * k;
    this.cRadius += (this.radius - this.cRadius) * k;
    const s = Math.sin(this.cPhi) * this.cRadius;
    camera.position.set(
      this.target.x + s * Math.sin(this.cTheta),
      this.target.y + Math.cos(this.cPhi) * this.cRadius,
      this.target.z + s * Math.cos(this.cTheta),
    );
    camera.lookAt(this.target);
  }
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
