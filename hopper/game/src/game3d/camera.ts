/** The follow camera, its orbit, the high-leap pull-back, glide framing, the
 * aiming view and Horizon View. Aiming (LT) brings the camera in over
 * Hopper's shoulder and zooms, and changes nothing about where the view
 * points: the player aims it, and the crosshair at the centre of it does the
 * rest by drifting onto whatever it is near. Pure math over the world's colliders so it can
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
  /** Aiming is a modifier on the follow view, not a direction of its own, so
   * it is `aim` below rather than a mode: taking or losing a target can never
   * turn the picture. */
  mode: 'follow' | 'horizon';
  /** Eased state offsets (glide, dive, height) so state changes never pop. */
  tilt: number;
  pull: number;
  /** Forward direction of the route and the player's manual turn from it. */
  forward: number;
  turn: number;
  /** Hopper's velocity as the camera sees it: smoothed over a few tenths of
   * a second, so a landing or a dash changes the framing at the camera's
   * pace, not the body's. */
  flow: [number, number, number];
  /** How much of the eye's distance a solid in the way leaves (1 = all of
   * it): snaps in when something blocks the view, eases back out. */
  clip: number;
  /** The rate the picture follows Hopper's height at, itself eased so that
   * taking off and landing change it gradually rather than in a step. */
  riseRate: number;
  /** Seconds left of a stick-click recentre, which brings the view round
   * quickly but still as a turn, never a cut. */
  snap: number;
  /** How far into the climbing view the camera is, 0 to 1. */
  climb: number;
  /** How far into the aiming view the camera is, 0 to 1: in over the
   * shoulder, zoomed, levelled off, the look slowed. Eased, so holding and
   * releasing LT is a move of the shot, never a cut. */
  aim: number;
  /** The pitch the picture is actually taken at this frame, tilt and the
   * aim's levelling included: the direction the crosshair looks along. */
  viewPitch: number;
}
export interface CameraInput {
  lookX: number;
  lookY: number;
  mouseLookX: number;
  mouseLookY: number;
  resetPressed: boolean;
  /** LT: the aiming view. It moves the camera in and zooms; it never turns
   * it, and nothing about the target does either. */
  aimHeld?: boolean;
  /** The outward normal of the wall Hopper is climbing, while he is on one.
   * The view swings round to stand off that wall and watch his back, and its
   * pitch is held down so that climbing never points the camera at the sky. */
  climb?: [number, number] | null;
  horizonHeld: boolean;
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
  distance: 54,
  height: 18,
  pitch: 0.36,
  fov: 66,
  glideFov: 72,
  /** Manual turn from the forward direction, either way: far enough to look
   * back over a shoulder, short of facing the way Hopper came. */
  maxTurn: Math.PI * 0.8,
  /** Forward is the default, not a demand. A turned view stays where the
   * player left it; only after `turnReturnDelay` seconds without a touch on
   * the stick does it begin to drift back, coming up to speed over
   * `turnReturnRamp` seconds and never turning faster than `turnReturnSpeed`
   * (about 26°/s), settling proportionally at `turnReturn` near the end. */
  turnReturn: 1.0,
  turnReturnDelay: 2.0,
  turnReturnRamp: 2.0,
  turnReturnSpeed: 0.45,
  /** A stick click recentres at this rate, a quick pan rather than a cut. */
  snapRate: 6,
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
  /** Aiming: the camera comes in this close, zooms to this field of view,
   * steps this far over Hopper's shoulder and levels off to this pitch, all
   * eased at `aimRate`; the look slows to `aimSens` of its usual speed so a
   * distant shadow can be held. None of it touches the yaw. */
  aimDistance: 46,
  aimFov: 46,
  aimShoulder: 15,
  aimLift: 3,
  aimPitch: 0.04,
  aimRate: 5,
  aimSens: 0.55,
  /** Climbing: the view stands off the wall at this range and holds its
   * pitch between these, so the shot looks along the face at Hopper's back
   * rather than craning up after him. */
  climbDistance: 42,
  climbPitchMin: 0.08,
  climbPitchMax: 0.34,
  climbTurnRate: 1.6,
  /** The eye and the look point follow at this rate along the ground ... */
  smoothing: 8,
  /** ... and this much more slowly in height, so a hop is a hop of the body
   * and not of the whole picture; when Hopper is airborne slower still. A
   * gap beyond `catchUp` metres closes faster whatever the state. */
  riseRate: 4.5,
  airRiseRate: 2.4,
  catchUp: 26,
  /** How quickly the smoothed velocity and the height framing follow. */
  flowRate: 3,
  frameRate: 2,
  /** A blocked view pulls the eye in at this rate and lets it back out at
   * this slower one. */
  clipIn: 14,
  clipOut: 1.5,
};

export function createCamera(yaw: number, at: [number, number, number]): CameraState {
  return { yaw, pitch: CAMERA.pitch, distance: CAMERA.distance, fov: CAMERA.fov, eye: [at[0] - Math.sin(yaw) * 35, at[1] + 12, at[2] - Math.cos(yaw) * 35], target: [...at], idle: 10, mode: 'follow', tilt: 0, pull: 0, forward: yaw, turn: 0, flow: [0, 0, 0], clip: 1, riseRate: CAMERA.riseRate, snap: 0, climb: 0, aim: 0, viewPitch: CAMERA.pitch };
}

const ease = (a: number, b: number, k: number) => a + (b - a) * k;
const wrap = (d: number) => {
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** How much of the way from the target to the eye is clear of structures:
 * 1 when the eye is free, else the fraction just short of the first solid.
 * Terrain is not a solid here; the eye is lifted over it instead, which
 * keeps the distance steady across rolling ground. */
function clearance(world: World, target: [number, number, number], eye: [number, number, number]): number {
  const inside = (x: number, y: number, z: number) => {
    for (const c of world.near(x, z, 2)) {
      if (y < c.y0 - 1 || y > c.y1 + 1) continue;
      const [lx, lz] = World.local(c, x, z);
      if (Math.abs(lx) <= c.hx + 1 && Math.abs(lz) <= c.hz + 1) return true;
    }
    return false;
  };
  if (!inside(...eye)) return 1;
  let lo = 0.15,
    hi = 1;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    if (inside(target[0] + (eye[0] - target[0]) * mid, target[1] + (eye[1] - target[1]) * mid, target[2] + (eye[2] - target[2]) * mid)) hi = mid;
    else lo = mid;
  }
  return lo;
}

export function updateCamera(cam: CameraState, h: HopperState, world: World, input: CameraInput, settings: CameraSettings, dt: number): void {
  const sens = 0.4 + settings.sensitivity * 1.2;
  const invert = settings.invertY ? -1 : 1;
  const stickX = input.lookX,
    stickY = input.lookY;
  const looking = Math.abs(stickX) > 0.02 || Math.abs(stickY) > 0.02 || Math.abs(input.mouseLookX) > 0 || Math.abs(input.mouseLookY) > 0;
  // Aiming counts as a hand on the camera: the drift back toward forward
  // waits its usual couple of seconds after the trigger is released rather
  // than starting the moment the shot ends.
  if (looking || input.aimHeld) cam.idle = 0;
  else cam.idle += dt;

  // Desired framing by mode. The look point leads Hopper by his smoothed
  // velocity, never the instantaneous one: a landing, a dash or a wall kick
  // changes it over a few tenths of a second, not in a frame.
  const kf = 1 - Math.exp(-CAMERA.flowRate * dt);
  cam.flow = [ease(cam.flow[0], h.vx, kf), ease(cam.flow[1], h.vy, kf), ease(cam.flow[2], h.vz, kf)];
  // Aiming eases in and out. Horizon View is its own picture and wins.
  const aiming = !!input.aimHeld && !(input.horizonHeld && input.landmark);
  cam.aim = ease(cam.aim, aiming ? 1 : 0, 1 - Math.exp(-CAMERA.aimRate * dt));
  let wantYaw = cam.yaw,
    wantPitch = CAMERA.pitch,
    wantDistance = CAMERA.distance,
    wantFov = CAMERA.fov;
  const com: [number, number, number] = [h.x, h.y + 8.3, h.z];
  const lead = Math.min(1, 18 / (Math.hypot(cam.flow[0], cam.flow[2]) * 0.3 || 1));
  let target: [number, number, number] = [com[0] + cam.flow[0] * 0.3 * lead, com[1] + Math.max(-4, Math.min(4, cam.flow[1] * 0.1)), com[2] + cam.flow[2] * 0.3 * lead];

  if (input.horizonHeld && input.landmark) {
    cam.mode = 'horizon';
    wantYaw = Math.atan2(input.landmark[0] - h.x, input.landmark[2] - h.z);
    wantPitch = -0.02;
    wantDistance = 22;
    wantFov = 70;
    target = [h.x, h.y + 14, h.z];
  } else {
    // Coming back from Horizon View: the view it was left at becomes a manual
    // turn from forward, so the yaw the player is looking along carries over
    // unbroken, and the recentre below brings it round as a pan.
    if (cam.mode !== 'follow') {
      cam.turn = wrap(cam.yaw - cam.forward);
      cam.snap = 1;
      cam.idle = 10;
    }
    cam.mode = 'follow';
    // The camera faces the way forward along the trail. Hopper is free to turn
    // round and run back toward it; the view does not follow him, and it never
    // faces backward: the route's tangent always points onward.
    // Climbing: the way onward is off the wall, not along the trail, so the
    // view swings round to stand behind him and look at the face he is on.
    if (input.climb) {
      const want = Math.atan2(-input.climb[0], -input.climb[1]);
      const step = wrap(want - cam.forward);
      cam.forward += Math.max(-CAMERA.climbTurnRate * dt, Math.min(CAMERA.climbTurnRate * dt, step));
      cam.climb = Math.min(1, cam.climb + dt * 2.5);
    } else {
      cam.climb = Math.max(0, cam.climb - dt * 1.5);
    }
    if (input.forward !== undefined && !input.climb) {
      const was = cam.forward;
      const want = wrap(input.forward - cam.forward) * Math.min(1, CAMERA.forwardRate * dt);
      cam.forward += Math.max(-CAMERA.forwardTurnRate * dt, Math.min(CAMERA.forwardTurnRate * dt, want));
      // While the player is aiming, the trail bending under him must not drag
      // the shot off the shadow: the turn takes up the difference and the yaw
      // stands still. It is given back by the drift once LT is released.
      if (aiming) cam.turn -= cam.forward - was;
    }
    // A manual turn either way. It is not sprung: the view stays where it was
    // left, and only once the stick has been still for a while does it drift
    // back toward forward, starting imperceptibly and never faster than a
    // slow pan, so forward is where the view ends up, not something fought.
    // The stick turns up to `maxTurn` either way. A wider turn carried out of
    // Horizon View is allowed to stand and be wound back, never cut to the
    // limit: the limit only stops the stick from opening it further.
    const limit = Math.max(CAMERA.maxTurn, Math.abs(cam.turn));
    // Zoomed in, the same stick travel covers less sky, so a shadow at three
    // hundred metres can be held on the crosshair.
    const look = sens * (1 - cam.aim * (1 - CAMERA.aimSens));
    cam.turn -= stickX * CAMERA.stickRate * look * dt + input.mouseLookX * CAMERA.mouseRate * look;
    cam.turn = Math.max(-limit, Math.min(limit, cam.turn));
    cam.pitch += (stickY * CAMERA.stickRate * 0.6 * look * dt + input.mouseLookY * CAMERA.mouseRate * 0.6 * look) * invert;
    cam.pitch = Math.max(CAMERA.minPitch, Math.min(CAMERA.maxPitch, cam.pitch));
    if (input.resetPressed) {
      cam.snap = 1;
      cam.idle = 10;
    }
    if (looking) cam.snap = 0;
    if (cam.snap > 0) {
      const k = Math.min(1, CAMERA.snapRate * dt);
      cam.turn -= cam.turn * k;
      cam.pitch += (CAMERA.pitch - cam.pitch) * k;
      cam.snap -= dt;
    } else if (!looking && !aiming && cam.idle > CAMERA.turnReturnDelay) {
      const ramp = Math.min(1, (cam.idle - CAMERA.turnReturnDelay) / CAMERA.turnReturnRamp);
      const step = Math.min(Math.abs(cam.turn) * CAMERA.turnReturn * dt, CAMERA.turnReturnSpeed * ramp * ramp * dt);
      cam.turn -= Math.sign(cam.turn) * step;
      cam.pitch += (CAMERA.pitch - cam.pitch) * Math.min(1, 0.8 * ramp * dt);
    }
    cam.yaw = cam.forward + cam.turn;
    wantYaw = cam.yaw;
    // The pitch is held inside a band while he is on a wall: a climb straight
    // up must never tip the picture up after him. The eye stays above the
    // look point, a little way off the face, watching his back go up it.
    if (cam.climb > 0.001) {
      const held = Math.max(CAMERA.climbPitchMin, Math.min(CAMERA.climbPitchMax, cam.pitch));
      cam.pitch += (held - cam.pitch) * Math.min(1, cam.climb * 6 * dt);
    }
    // Height above the ground pulls back and tilts down; gliding flattens and
    // widens; diving looks down. All of it eased, so a tap never pops the view.
    const pull = settings.reducedMotion ? 0.5 : 1;
    const speed = Math.hypot(cam.flow[0], cam.flow[2]);
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
    const ks = 1 - Math.exp(-CAMERA.frameRate * dt);
    cam.pull = ease(cam.pull, wantPull, ks);
    cam.tilt = ease(cam.tilt, wantTilt, ks);
    wantDistance = CAMERA.distance + cam.pull;
    wantPitch = cam.pitch + cam.tilt;
    // Aiming: in over the shoulder and zoomed, and the picture levels off so
    // that the middle of the screen is a long way ahead at Hopper's height
    // rather than the ground at his feet. The yaw is untouched throughout.
    if (cam.climb > 0.001) wantDistance = ease(wantDistance, CAMERA.climbDistance, cam.climb);
    if (cam.aim > 0.001) {
      wantDistance = ease(wantDistance, CAMERA.aimDistance, cam.aim);
      wantFov = ease(wantFov, CAMERA.aimFov, cam.aim);
      wantPitch -= cam.aim * (CAMERA.pitch - CAMERA.aimPitch);
      // Over the right shoulder: the middle of the screen steps off Hopper's
      // flank so that the crosshair looks past him rather than through him.
      // The step is an angle, not a distance -- it is taken as a share of how
      // far the eye actually stands off, so a wall behind Hopper that brings
      // the eye in does not also shove him out of the frame.
      const reach = Math.min(1, (cam.distance * cam.clip) / CAMERA.aimDistance);
      const step = cam.aim * CAMERA.aimShoulder * reach;
      target[0] -= Math.cos(cam.yaw) * step;
      target[2] += Math.sin(cam.yaw) * step;
      target[1] += cam.aim * CAMERA.aimLift * reach;
    }
  }
  const k = 1 - Math.exp(-CAMERA.smoothing * dt);
  if (cam.mode !== 'follow') {
    cam.yaw += wrap(wantYaw - cam.yaw) * Math.min(1, k * 0.8);
    cam.pitch = ease(cam.pitch, wantPitch, k * 0.8);
  }
  const usePitch = cam.mode === 'follow' ? wantPitch : cam.pitch;
  cam.viewPitch = usePitch;
  cam.distance = ease(cam.distance, wantDistance, k * 0.6);
  cam.fov = ease(cam.fov, wantFov, Math.min(1, 3 * dt));
  // The look point follows at the camera's pace along the ground and more
  // slowly in height: the picture rides through a hop and its landing on
  // one smooth path, and only a real change of level (a roof, a fall) moves
  // it, faster once the gap is wide. Lock and horizon views track fully.
  const gap = Math.abs(target[1] - cam.target[1]);
  const wantRise = cam.mode !== 'follow' ? CAMERA.smoothing : (h.height > 0.5 ? CAMERA.airRiseRate : CAMERA.riseRate) + Math.max(0, gap - CAMERA.catchUp) * 0.5;
  cam.riseRate = ease(cam.riseRate, wantRise, 1 - Math.exp(-4 * dt));
  const ky = 1 - Math.exp(-cam.riseRate * dt);
  cam.target = [ease(cam.target[0], target[0], k), ease(cam.target[1], target[1], ky), ease(cam.target[2], target[2], k)];
  const cp = Math.cos(usePitch),
    sp = Math.sin(usePitch);
  const eye: [number, number, number] = [cam.target[0] - Math.sin(cam.yaw) * cp * cam.distance, cam.target[1] + sp * cam.distance, cam.target[2] - Math.cos(cam.yaw) * cp * cam.distance];
  // Something solid in the way pulls the eye in quickly and lets it back
  // out slowly; the ground lifts it rather than pulling it in, so a slope
  // behind Hopper never shortens the shot.
  const free = clearance(world, cam.target, eye);
  cam.clip = free < cam.clip ? ease(cam.clip, free, 1 - Math.exp(-CAMERA.clipIn * dt)) : ease(cam.clip, free, 1 - Math.exp(-CAMERA.clipOut * dt));
  const want: [number, number, number] = [cam.target[0] + (eye[0] - cam.target[0]) * cam.clip, cam.target[1] + (eye[1] - cam.target[1]) * cam.clip, cam.target[2] + (eye[2] - cam.target[2]) * cam.clip];
  want[1] = Math.max(want[1], world.heightAt(want[0], want[2]) + 3);
  cam.eye = [ease(cam.eye[0], want[0], k), ease(cam.eye[1], want[1], ky), ease(cam.eye[2], want[2], k)];
  // The slow height follow must never leave the eye under a rising slope.
  cam.eye[1] = Math.max(cam.eye[1], world.heightAt(cam.eye[0], cam.eye[2]) + 2.5);
}
