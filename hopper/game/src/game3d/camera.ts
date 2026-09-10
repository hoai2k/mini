/** The follow camera, its orbit, the high-leap pull-back, glide framing,
 * lock-on and Horizon View. Pure math over the world's colliders so it can
 * be tested in node; the renderer copies eye/target/fov each frame.
 */
import { World } from './world';
import type { HopperState } from './controller';

export interface CameraState {
  yaw: number;
  pitch: number;
  distance: number;
  fov: number;
  eye: [number, number, number];
  target: [number, number, number];
  /** Seconds since the player last moved the camera. */
  idle: number;
  mode: 'follow' | 'lock' | 'horizon';
  /** Eased state offsets (glide, dive, height) so state changes never pop. */
  tilt: number;
  pull: number;
  /** Forward direction of the route and the player's manual turn from it. */
  forward: number;
  turn: number;
}
export interface CameraInput {
  lookX: number;
  lookY: number;
  mouseLookX: number;
  mouseLookY: number;
  resetPressed: boolean;
  horizonHeld: boolean;
  /** World position of the locked shadow, if any. */
  lock?: [number, number, number] | null;
  landmark?: [number, number, number];
  /** The commander's centre while one is awake: the follow camera lifts its
   * look and pulls back so a boss overhead stays in frame. */
  boss?: [number, number, number] | null;
  /** The route's forward yaw where Hopper stands (its tangent a little way
   * ahead): the follow camera faces this, and only this. It is a direction,
   * not a point, so it never swings round as Hopper passes something. */
  forward?: number;
}
export interface CameraSettings {
  sensitivity: number;
  invertY: boolean;
  reducedMotion: boolean;
}

export const CAMERA = {
  distance: 48,
  height: 18,
  pitch: 0.36,
  fov: 64,
  glideFov: 71,
  /** Manual turn from the forward direction, either way. */
  maxTurn: Math.PI / 4,
  turnReturn: 1.2,
  forwardRate: 1.1,
  /** Fastest the forward direction may turn, so a bend is a pan, never a whip. */
  forwardTurnRate: 0.9,
  pullBackPerMetre: 0.25,
  maxPullBack: 20,
  /** Speed also opens the shot, so a sprint or a long leap keeps its landing
   * in frame: metres of pull-back per m/s over the walking pace, and its cap. */
  pullBackPerSpeed: 0.28,
  maxSpeedPull: 16,
  speedPullFrom: 58,
  /** Framing a commander: how much of the height between Hopper and the boss
   * the look rises by, how far that can go, and the extra pull-back. */
  bossLift: 0.42,
  maxBossLift: 34,
  bossPull: 22,
  tiltPerMetre: 0.004,
  maxTilt: 0.5,
  minPitch: -0.6,
  maxPitch: 1.2,
  stickRate: 2.6,
  mouseRate: 0.0035,
  returnRate: 1.6,
  returnDelay: 1.0,
  smoothing: 9,
};

export function createCamera(yaw: number, at: [number, number, number]): CameraState {
  return { yaw, pitch: CAMERA.pitch, distance: CAMERA.distance, fov: CAMERA.fov, eye: [at[0] - Math.sin(yaw) * 35, at[1] + 12, at[2] - Math.cos(yaw) * 35], target: [...at], idle: 10, mode: 'follow', tilt: 0, pull: 0, forward: yaw, turn: 0 };
}

const ease = (a: number, b: number, k: number) => a + (b - a) * k;
const wrap = (d: number) => {
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** Pull the eye toward the target until it is outside every solid. */
function unblock(world: World, target: [number, number, number], eye: [number, number, number]): [number, number, number] {
  const inside = (x: number, y: number, z: number) => {
    for (const c of world.near(x, z, 2)) {
      if (y < c.y0 - 1 || y > c.y1 + 1) continue;
      const [lx, lz] = World.local(c, x, z);
      if (Math.abs(lx) <= c.hx + 1 && Math.abs(lz) <= c.hz + 1) return true;
    }
    return y < world.heightAt(x, z) + 2.5;
  };
  if (!inside(...eye)) return eye;
  let lo = 0.15,
    hi = 1;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    const p: [number, number, number] = [target[0] + (eye[0] - target[0]) * mid, target[1] + (eye[1] - target[1]) * mid, target[2] + (eye[2] - target[2]) * mid];
    if (inside(...p)) hi = mid;
    else lo = mid;
  }
  return [target[0] + (eye[0] - target[0]) * lo, target[1] + (eye[1] - target[1]) * lo, target[2] + (eye[2] - target[2]) * lo];
}

export function updateCamera(cam: CameraState, h: HopperState, world: World, input: CameraInput, settings: CameraSettings, dt: number): void {
  const sens = 0.4 + settings.sensitivity * 1.2;
  const invert = settings.invertY ? -1 : 1;
  const stickX = input.lookX,
    stickY = input.lookY;
  const looking = Math.abs(stickX) > 0.02 || Math.abs(stickY) > 0.02 || Math.abs(input.mouseLookX) > 0 || Math.abs(input.mouseLookY) > 0;
  if (looking) cam.idle = 0;
  else cam.idle += dt;

  // Desired framing by mode.
  let wantYaw = cam.yaw,
    wantPitch = CAMERA.pitch,
    wantDistance = CAMERA.distance,
    wantFov = CAMERA.fov;
  const com: [number, number, number] = [h.x, h.y + 8.3, h.z];
  let target: [number, number, number] = [com[0] + h.vx * 0.3, com[1] + Math.max(-6, Math.min(6, h.vy * 0.15)), com[2] + h.vz * 0.3];

  if (input.horizonHeld && input.landmark) {
    cam.mode = 'horizon';
    wantYaw = Math.atan2(input.landmark[0] - h.x, input.landmark[2] - h.z);
    wantPitch = -0.02;
    wantDistance = 22;
    wantFov = 70;
    target = [h.x, h.y + 14, h.z];
  } else if (input.lock) {
    cam.mode = 'lock';
    const dx = input.lock[0] - h.x,
      dz = input.lock[2] - h.z,
      d = Math.hypot(dx, dz);
    wantYaw = Math.atan2(dx, dz);
    // Aiming view: over Hopper's shoulder, the shadow held near the centre.
    target = [input.lock[0], input.lock[1], input.lock[2]];
    wantDistance = Math.min(60, 26 + d * 0.35);
    wantPitch = Math.max(-0.25, Math.min(0.45, Math.atan2(com[1] + 6 - input.lock[1], Math.max(10, d)) + 0.12));
  } else {
    cam.mode = 'follow';
    // The camera faces the way forward along the trail. Hopper is free to turn
    // round and run back toward it; the view does not follow him, and it never
    // faces backward: the route's tangent always points onward.
    if (input.forward !== undefined) {
      const want = wrap(input.forward - cam.forward) * Math.min(1, CAMERA.forwardRate * dt);
      cam.forward += Math.max(-CAMERA.forwardTurnRate * dt, Math.min(CAMERA.forwardTurnRate * dt, want));
    }
    // A limited manual turn either way, springing back when released.
    cam.turn -= stickX * CAMERA.stickRate * sens * dt + input.mouseLookX * CAMERA.mouseRate * sens;
    cam.turn = Math.max(-CAMERA.maxTurn, Math.min(CAMERA.maxTurn, cam.turn));
    if (!looking) cam.turn -= cam.turn * Math.min(1, CAMERA.turnReturn * dt);
    cam.pitch += (stickY * CAMERA.stickRate * 0.6 * sens * dt + input.mouseLookY * CAMERA.mouseRate * 0.6 * sens) * invert;
    cam.pitch = Math.max(CAMERA.minPitch, Math.min(CAMERA.maxPitch, cam.pitch));
    if (!looking && cam.idle > CAMERA.returnDelay) cam.pitch += (CAMERA.pitch - cam.pitch) * Math.min(1, 0.8 * dt);
    if (input.resetPressed) {
      cam.turn = 0;
      cam.pitch = CAMERA.pitch;
      cam.idle = 10;
    }
    cam.yaw = cam.forward + cam.turn;
    wantYaw = cam.yaw;
    // Height above the ground pulls back and tilts down; gliding flattens and
    // widens; diving looks down. All of it eased, so a tap never pops the view.
    const pull = settings.reducedMotion ? 0.5 : 1;
    const speed = Math.hypot(h.vx, h.vz);
    let wantPull =
      (Math.min(CAMERA.maxPullBack, h.height * CAMERA.pullBackPerMetre) + Math.min(CAMERA.maxSpeedPull, Math.max(0, speed - CAMERA.speedPullFrom) * CAMERA.pullBackPerSpeed)) * pull,
      wantTilt = Math.min(CAMERA.maxTilt, h.height * CAMERA.tiltPerMetre) * pull;
    if (h.gliding) {
      wantPull -= 6;
      wantTilt -= 0.12;
      if (!settings.reducedMotion) wantFov = CAMERA.glideFov;
    } else if (h.hovering) {
      // Hovering settles the view: a little closer, level with Hopper.
      wantPull -= 3;
      wantTilt -= 0.06;
    } else if (h.diving) {
      wantTilt += 0.35;
      wantPull += 4;
    }
    // A commander in the air: lift the look toward it and stand further back,
    // so it is on screen while Hopper is fought around the arena floor.
    if (input.boss) {
      const above = input.boss[1] - com[1];
      const near = Math.max(0, 1 - Math.hypot(input.boss[0] - h.x, input.boss[2] - h.z) / 420);
      target[1] += Math.max(0, Math.min(CAMERA.maxBossLift, above * CAMERA.bossLift)) * near;
      wantPull += CAMERA.bossPull * near;
    }
    const ks = 1 - Math.exp(-3.5 * dt);
    cam.pull = ease(cam.pull, wantPull, ks);
    cam.tilt = ease(cam.tilt, wantTilt, ks);
    wantDistance = CAMERA.distance + cam.pull;
    wantPitch = cam.pitch + cam.tilt;
  }
  const k = 1 - Math.exp(-CAMERA.smoothing * dt);
  if (cam.mode !== 'follow') {
    cam.yaw += wrap(wantYaw - cam.yaw) * Math.min(1, k * 0.8);
    cam.pitch = ease(cam.pitch, wantPitch, k * 0.8);
  }
  const usePitch = cam.mode === 'follow' ? wantPitch : cam.pitch;
  cam.distance = ease(cam.distance, wantDistance, k * 0.6);
  cam.fov = ease(cam.fov, wantFov, Math.min(1, 3 * dt));
  cam.target = [ease(cam.target[0], target[0], k), ease(cam.target[1], target[1], k), ease(cam.target[2], target[2], k)];
  const cp = Math.cos(usePitch),
    sp = Math.sin(usePitch);
  // In lock mode the eye hangs behind Hopper, not behind the target.
  const anchor = cam.mode === 'lock' ? com : cam.target;
  const shoulder = cam.mode === 'lock' ? 9 : 0;
  const eye: [number, number, number] = [
    anchor[0] - Math.sin(cam.yaw) * cp * cam.distance - Math.cos(cam.yaw) * shoulder,
    anchor[1] + sp * cam.distance + (cam.mode === 'lock' ? 5 : 0),
    anchor[2] - Math.cos(cam.yaw) * cp * cam.distance + Math.sin(cam.yaw) * shoulder,
  ];
  const clear = unblock(world, cam.target, eye);
  cam.eye = [ease(cam.eye[0], clear[0], k), ease(cam.eye[1], clear[1], k), ease(cam.eye[2], clear[2], k)];
}
