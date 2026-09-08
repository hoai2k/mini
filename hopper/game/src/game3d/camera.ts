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
}
export interface CameraSettings {
  sensitivity: number;
  invertY: boolean;
  reducedMotion: boolean;
}

export const CAMERA = {
  distance: 35,
  height: 12,
  pitch: 0.33,
  fov: 60,
  glideFov: 68,
  pullBackPerMetre: 0.25,
  maxPullBack: 20,
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
  return { yaw, pitch: CAMERA.pitch, distance: CAMERA.distance, fov: CAMERA.fov, eye: [at[0] - Math.sin(yaw) * 35, at[1] + 12, at[2] - Math.cos(yaw) * 35], target: [...at], idle: 10, mode: 'follow' };
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
    // Frame both: the target sits between Hopper and the shadow.
    target = [com[0] + dx * 0.35, com[1] + (input.lock[1] - com[1]) * 0.35, com[2] + dz * 0.35];
    wantDistance = Math.min(70, 30 + d * 0.5);
    wantPitch = CAMERA.pitch + Math.max(-0.2, Math.min(0.3, -(input.lock[1] - com[1]) * 0.004));
  } else {
    cam.mode = 'follow';
    // Orbit from the stick or the mouse.
    cam.yaw -= stickX * CAMERA.stickRate * sens * dt + input.mouseLookX * CAMERA.mouseRate * sens;
    cam.pitch += (stickY * CAMERA.stickRate * 0.6 * sens * dt + input.mouseLookY * CAMERA.mouseRate * 0.6 * sens) * invert;
    cam.pitch = Math.max(CAMERA.minPitch, Math.min(CAMERA.maxPitch, cam.pitch));
    if (input.resetPressed) {
      cam.yaw = h.yaw;
      cam.pitch = CAMERA.pitch;
      cam.idle = 10;
    }
    // Ease behind the direction of travel once the player lets the camera be.
    const speed = Math.hypot(h.vx, h.vz);
    if (cam.idle > CAMERA.returnDelay && speed > 6) {
      const heading = Math.atan2(h.vx, h.vz);
      const d = wrap(heading - cam.yaw);
      if (Math.abs(d) < Math.PI * 0.75) cam.yaw += d * Math.min(1, CAMERA.returnRate * dt * Math.min(1, speed / 20));
    }
    wantYaw = cam.yaw;
    // Height above the ground pulls back and tilts down; gliding flattens and widens.
    const pull = settings.reducedMotion ? 0.5 : 1;
    wantDistance = CAMERA.distance + Math.min(CAMERA.maxPullBack, h.height * CAMERA.pullBackPerMetre) * pull;
    wantPitch = cam.pitch + Math.min(CAMERA.maxTilt, h.height * CAMERA.tiltPerMetre) * pull;
    if (h.gliding) {
      wantDistance -= 6;
      wantPitch -= 0.12;
      if (!settings.reducedMotion) wantFov = CAMERA.glideFov;
    } else if (h.diving) {
      wantPitch += 0.35;
      wantDistance += 4;
    }
  }
  const k = 1 - Math.exp(-CAMERA.smoothing * dt);
  if (cam.mode !== 'follow') {
    cam.yaw += wrap(wantYaw - cam.yaw) * Math.min(1, k * 0.8);
    cam.pitch = ease(cam.pitch, wantPitch, k * 0.8);
  }
  const usePitch = cam.mode === 'follow' ? wantPitch : cam.pitch;
  cam.distance = ease(cam.distance, wantDistance, k * 0.6);
  cam.fov = ease(cam.fov, wantFov, k * 0.5);
  cam.target = [ease(cam.target[0], target[0], k), ease(cam.target[1], target[1], k), ease(cam.target[2], target[2], k)];
  const cp = Math.cos(usePitch),
    sp = Math.sin(usePitch);
  const eye: [number, number, number] = [cam.target[0] - Math.sin(cam.yaw) * cp * cam.distance, cam.target[1] + sp * cam.distance, cam.target[2] - Math.cos(cam.yaw) * cp * cam.distance];
  const clear = unblock(world, cam.target, eye);
  cam.eye = [ease(cam.eye[0], clear[0], k), ease(cam.eye[1], clear[1], k), ease(cam.eye[2], clear[2], k)];
}
