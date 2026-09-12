/** Hopper's movement in three dimensions: the jump family, glide, dive,
 * crouch charge, wall kick, ledge mantle, spring pads, thermals and wind.
 * Pure simulation over the World's colliders; no rendering, no three.js
 * objects, so it runs in node tests at the same fixed 120 Hz as the game.
 */
import type { InputFrame } from '../game/input';
import { World, type Collider } from './world';

export const MOVE = {
  height: 14,
  radius: 5,
  gravity: 120,
  /** Falling pulls harder than rising: the arc peaks and comes down sharp. */
  fallGravity: 1.25,
  run: 66,
  groundAccel: 420,
  airAccel: 215,
  turnRate: Math.PI * 5,
  tapJump: 72,
  /** A short variable-height window after takeoff: thrust against gravity, a few metres, no boost. */
  holdWindow: 0.2,
  holdThrust: 40,
  /** Hover: A held in the air holds altitude on beating wings for this long. */
  hoverFuel: 1.8,
  hoverLift: 2.5,
  hoverGrip: 9,
  /** Moving against the facing is slower: backpedal and strafe factors. */
  backpedal: 0.55,
  strafe: 0.85,
  /** Forward lunge added at takeoff, along the way Hopper is already going
   * (or the stick, from standing). A leap travels; it does not just rise. */
  leap: 24,
  glideSink: 7,
  glideSpeed: 80,
  glideTurn: Math.PI * 0.6,
  chargeTime: 0.8,
  chargeApexMin: 21,
  chargeApexMax: 140,
  springApex: 168,
  diveGravity: 2.5,
  diveTerminal: 190,
  wallKickUp: 62,
  wallKickAway: 26,
  wallGrace: 0.12,
  wallCommit: 0.16,
  /** Climbing. Push into a wall and Hopper takes hold of it and goes up it
   * on six feet; the stick steers along the face, A kicks off it, and a lip
   * within reach is mantled as it always was. Letting go of the stick leaves
   * him hanging and sliding slowly, which is a rest, not a fall. */
  climbUp: 27,
  climbDown: 22,
  climbSide: 19,
  climbSlide: 3.5,
  climbGrip: 7,
  climbEnter: 0.35,
  climbLetGo: 0.72,
  climbGrace: 0.16,
  mantleReach: 6,
  mantleTime: 0.5,
  bounceApex: 56,
  bounceApexHeld: 84,
  hopBack: 64,
  hopBackTime: 0.22,
  coyote: 0.12,
  buffer: 0.14,
  stompLag: 0.35,
  brake: 120,
  sprint: 1.6,
  dashSpeed: 170,
  dashTime: 0.28,
  dashCooldown: 0.55,
};

export type Move = 'idle' | 'run' | 'crouch' | 'jump' | 'fall' | 'hover' | 'glide' | 'dive' | 'mantle' | 'land' | 'stomp' | 'hopBack' | 'dash' | 'climb';

export interface HopperState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Facing yaw in radians; +Z forward at 0, turning toward +X is positive. */
  yaw: number;
  grounded: boolean;
  groundY: number;
  move: Move;
  /** Seconds since takeoff while A is still held (thrust window). */
  hold: number;
  holding: boolean;
  gliding: boolean;
  diving: boolean;
  charge: number;
  coyote: number;
  buffer: number;
  wallTimer: number;
  wallNx: number;
  wallNz: number;
  /** On a wall: hanging from it and climbing it, and its outward normal. */
  climbing: boolean;
  climbNx: number;
  climbNz: number;
  climbTimer: number;
  /** Seconds since the feet last left a surface: the air pose grows over it. */
  airTime: number;
  commit: number;
  mantle: number;
  mantleFrom: [number, number, number];
  mantleTo: [number, number, number];
  landTimer: number;
  stompTimer: number;
  hopBackTimer: number;
  /** Height above the surface below, kept for the HUD and the landing guide. */
  height: number;
  /** Speed at impact when landing; the landing guide and camera use it. */
  landedFrom: number;
  /** Set by the step for one frame: what happened. */
  events: MoveEvent[];
  gravityScale: number;
  invuln: number;
  hitstun: number;
  /** Seconds A has been held while airborne; a glide needs a moment of it. */
  glideHold: number;
  /** Hovering on beating wings; fuel in seconds, refilled on the ground. */
  hovering: boolean;
  hoverFuel: number;
  hoverT: number;
  dashTimer: number;
  dashCooldown: number;
  /** LB held with no direction: the dash fires when the stick moves. */
  dashArmed: boolean;
  dashX: number;
  dashZ: number;
  sprinting: boolean;
}
export type MoveEvent =
  | { kind: 'jump'; charged: boolean }
  | { kind: 'land'; speed: number; stomp: boolean }
  | { kind: 'wallKick' }
  | { kind: 'climbStart' }
  | { kind: 'climbEnd' }
  | { kind: 'mantle' }
  | { kind: 'spring' }
  | { kind: 'glideStart' }
  | { kind: 'glideEnd' }
  | { kind: 'hoverStart' }
  | { kind: 'hoverEnd' }
  | { kind: 'dive' }
  | { kind: 'hopBack' }
  | { kind: 'dash' };

export function createHopperState(x = 0, y = 0, z = 0, yaw = 0): HopperState {
  return {
    x, y, z, vx: 0, vy: 0, vz: 0, yaw, grounded: true, groundY: y, move: 'idle', hold: 0, holding: false, gliding: false, diving: false, charge: 0, coyote: MOVE.coyote, buffer: 0, wallTimer: 0, wallNx: 0, wallNz: 0, climbing: false, climbNx: 0, climbNz: 0, climbTimer: 0, airTime: 0, commit: 0, mantle: 0, mantleFrom: [0, 0, 0], mantleTo: [0, 0, 0], landTimer: 0, stompTimer: 0, hopBackTimer: 0, height: 0, landedFrom: 0, events: [], gravityScale: 1, invuln: 0, hitstun: 0, glideHold: 0, hovering: false, hoverFuel: MOVE.hoverFuel, hoverT: 0, dashTimer: 0, dashCooldown: 0, dashArmed: false, dashX: 0, dashZ: 0, sprinting: false,
  };
}

/** Movement intent for one step: stick in world XZ plus button states. */
export interface MoveIntent {
  /** Desired world-space direction and magnitude 0..1 (camera-relative already). */
  dx: number;
  dz: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  divePressed: boolean;
  diveHeld: boolean;
  chargeHeld: boolean;
  guardHeld: boolean;
  /** Y tapped on the ground: a quick hop backward. */
  hopBackPressed?: boolean;
  dashPressed?: boolean;
  dashHeld?: boolean;
  sprintHeld?: boolean;
  /** Strafe: keep facing while moving (lock-on). */
  faceX?: number;
  faceZ?: number;
  /** The forward to hold when nothing else claims the facing (the camera's). */
  faceYaw?: number;
}

export function intentFromInput(f: InputFrame, cameraYaw: number): MoveIntent {
  // Stick up (moveY negative) is away from the camera.
  const sin = Math.sin(cameraYaw),
    cos = Math.cos(cameraYaw);
  const forwardX = sin,
    forwardZ = cos,
    rightX = -cos,
    rightZ = sin;
  const dx = forwardX * -f.moveY + rightX * f.moveX,
    dz = forwardZ * -f.moveY + rightZ * f.moveX;
  const len = Math.hypot(dx, dz);
  const k = len > 1 ? 1 / len : 1;
  return { dx: dx * k, dz: dz * k, jumpPressed: f.jumpPressed, jumpHeld: f.jumpHeld, divePressed: f.divePressed, diveHeld: f.diveHeld, chargeHeld: f.chargeHeld, guardHeld: f.blockHeld, dashPressed: f.dashPressed, dashHeld: f.dashHeld, sprintHeld: f.sprintHeld, faceYaw: cameraYaw };
}

const apexSpeed = (apex: number, g: number) => Math.sqrt(2 * g * apex);
const turnToward = (yaw: number, target: number, max: number) => {
  let d = target - yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return yaw + Math.max(-max, Math.min(max, d));
};

/** Horizontal push-out against every nearby solid the body overlaps.
 * Returns the wall normal of the strongest contact, or null. */
function resolveWalls(s: HopperState, world: World): { nx: number; nz: number; collider: Collider } | null {
  let best: { nx: number; nz: number; collider: Collider; depth: number } | null = null;
  const r = MOVE.radius;
  const bodyLow = s.y + 2.0,
    bodyHigh = s.y + MOVE.height - 1.5;
  for (const c of world.near(s.x, s.z, r + 2)) {
    if (c.y1 <= bodyLow || c.y0 >= bodyHigh) continue;
    // Standing on this box (feet on its top) is not a wall contact.
    if (s.grounded && Math.abs(c.y1 - s.y) < 0.6) continue;
    const [lx, lz] = World.local(c, s.x, s.z);
    const px = c.hx + r - Math.abs(lx),
      pz = c.hz + r - Math.abs(lz);
    if (px <= 0 || pz <= 0) continue;
    // Steps and lips the mantle handles are resolved by ground snapping instead.
    let nx: number, nz: number, depth: number;
    if (px < pz) {
      nx = Math.sign(lx) || 1;
      nz = 0;
      depth = px;
    } else {
      nx = 0;
      nz = Math.sign(lz) || 1;
      depth = pz;
    }
    // Rotate the normal back into world space.
    const cos = Math.cos(c.yaw),
      sin = Math.sin(c.yaw);
    const wx = nx * cos - nz * sin,
      wz = nx * sin + nz * cos;
    s.x += wx * depth;
    s.z += wz * depth;
    const into = s.vx * wx + s.vz * wz;
    if (into < 0) {
      s.vx -= wx * into;
      s.vz -= wz * into;
    }
    if (!best || depth > best.depth) best = { nx: wx, nz: wz, collider: c, depth };
  }
  return best;
}

/** One fixed step. Returns the state's events for this step. */
export function stepHopper(s: HopperState, world: World, intent: MoveIntent, dt: number): MoveEvent[] {
  s.events = [];
  const g = MOVE.gravity * s.gravityScale;
  if (s.invuln > 0) s.invuln -= dt;
  if (s.hitstun > 0) s.hitstun -= dt;
  const control = s.hitstun <= 0;
  const prevY = s.y;

  // Mantle: a scripted haul over a lip; nothing else runs.
  if (s.mantle > 0) {
    s.mantle -= dt;
    const t = 1 - Math.max(0, s.mantle) / MOVE.mantleTime;
    const e = t * t * (3 - 2 * t);
    s.x = s.mantleFrom[0] + (s.mantleTo[0] - s.mantleFrom[0]) * e;
    s.y = s.mantleFrom[1] + (s.mantleTo[1] - s.mantleFrom[1]) * Math.min(1, e * 1.4);
    s.z = s.mantleFrom[2] + (s.mantleTo[2] - s.mantleFrom[2]) * e;
    s.vx = s.vy = s.vz = 0;
    if (s.mantle <= 0) {
      s.grounded = true;
      s.groundY = s.y;
      s.move = 'idle';
    }
    return s.events;
  }

  // Timers.
  if (s.landTimer > 0) s.landTimer -= dt;
  if (s.stompTimer > 0) s.stompTimer -= dt;
  if (s.hopBackTimer > 0) s.hopBackTimer -= dt;
  if (s.dashCooldown > 0) s.dashCooldown -= dt;
  if (s.wallTimer > 0) s.wallTimer -= dt;
  if (s.climbTimer > 0) s.climbTimer -= dt;
  s.airTime = s.grounded ? 0 : s.airTime + dt;
  if (s.commit > 0) s.commit -= dt;
  if (s.buffer > 0) s.buffer -= dt;
  if (intent.jumpPressed) s.buffer = MOVE.buffer;
  const busy = s.stompTimer > 0 || s.hopBackTimer > 0;

  // Horizontal intent.
  const wantLen = Math.hypot(intent.dx, intent.dz);
  // Dash (LB): a burst in the stick direction, on the ground or in the air.
  // Held with no direction, it arms and fires the moment the stick moves.
  if (control && !busy && s.mantle <= 0 && s.dashCooldown <= 0 && s.dashTimer <= 0) {
    if (intent.dashPressed && wantLen < 0.2) s.dashArmed = true;
    if ((intent.dashPressed || (s.dashArmed && intent.dashHeld)) && wantLen >= 0.2) {
      s.dashArmed = false;
      s.dashTimer = MOVE.dashTime;
      s.dashCooldown = MOVE.dashCooldown + MOVE.dashTime;
      s.dashX = intent.dx / wantLen;
      s.dashZ = intent.dz / wantLen;
      s.gliding = false;
      s.hovering = false;
      s.holding = false;
      s.charge = 0;
      s.events.push({ kind: 'dash' });
    }
  }
  if (!intent.dashHeld) s.dashArmed = false;
  s.sprinting = !!intent.sprintHeld && s.grounded && s.charge <= 0 && !busy;
  const canSteer = control && !busy && s.commit <= 0 && s.charge <= 0 && !(s.grounded && intent.chargeHeld) && s.dashTimer <= 0;
  // On a wall. The stick's push into the face is the climb, its slide along
  // the face is the traverse, and nothing falls: he hangs where he is put.
  if (s.climbing && control) {
    const into = -(intent.dx * s.climbNx + intent.dz * s.climbNz);
    const tx = -s.climbNz,
      tz = s.climbNx;
    const along = intent.dx * tx + intent.dz * tz;
    if (into < -MOVE.climbLetGo || intent.diveHeld) {
      // Pulled hard away from the wall (or dived): he lets go.
      s.climbing = false;
      s.events.push({ kind: 'climbEnd' });
      s.vx = -s.climbNx * 14;
      s.vz = -s.climbNz * 14;
    } else {
      s.vy = Math.abs(into) < 0.15 ? -MOVE.climbSlide : into > 0 ? into * MOVE.climbUp : into * MOVE.climbDown;
      s.vx = tx * along * MOVE.climbSide - s.climbNx * MOVE.climbGrip;
      s.vz = tz * along * MOVE.climbSide - s.climbNz * MOVE.climbGrip;
      s.yaw = turnToward(s.yaw, Math.atan2(-s.climbNx, -s.climbNz), MOVE.turnRate * dt);
      s.move = 'climb';
      s.hoverFuel = MOVE.hoverFuel;
      s.gliding = false;
      s.hovering = false;
      s.holding = false;
      s.charge = 0;
    }
  } else if (s.dashTimer > 0) {
    s.dashTimer -= dt;
    s.vx = s.dashX * MOVE.dashSpeed;
    s.vz = s.dashZ * MOVE.dashSpeed;
    if (!s.grounded && s.vy < 0) s.vy = 0;
    s.move = 'dash';
  } else if (s.hopBackTimer > 0) {
    // A committed step backward; velocity was set when it started.
  } else if (s.gliding) {
    // Glide: hold speed, steer the heading with the stick, sink slowly.
    let heading = Math.atan2(s.vx, s.vz);
    if (canSteer && wantLen > 0.1) heading = turnToward(heading, Math.atan2(intent.dx, intent.dz), MOVE.glideTurn * dt * wantLen);
    const speed = Math.min(MOVE.glideSpeed, Math.hypot(s.vx, s.vz) + 60 * dt);
    s.vx = Math.sin(heading) * speed;
    s.vz = Math.cos(heading) * speed;
    s.yaw = turnToward(s.yaw, heading, MOVE.turnRate * dt);
  } else if (canSteer) {
    const accel = (s.grounded ? MOVE.groundAccel : MOVE.airAccel) * dt;
    // Airborne steering turns the leap; it never slows it. Without this a jump
    // taken at a sprint is dragged back to running speed in the air, which is
    // what makes an arc feel like a hop straight up.
    const carried = Math.hypot(s.vx, s.vz);
    // Hopper keeps facing forward: moving against the facing is a backpedal,
    // across it a strafe, both slower than a run.
    const fx = Math.sin(s.yaw),
      fz = Math.cos(s.yaw);
    const along = wantLen > 0.05 ? (intent.dx * fx + intent.dz * fz) / wantLen : 1;
    const across = wantLen > 0.05 ? Math.abs(intent.dx * fz - intent.dz * fx) / wantLen : 0;
    const shape = along < 0 ? 1 - (1 - MOVE.backpedal) * -along : 1 - (1 - MOVE.strafe) * across * (1 - Math.max(0, along));
    const sprint = along > 0.3 ? MOVE.sprint : 1;
    const top = s.grounded ? MOVE.run * (s.sprinting ? sprint : 1) * shape : Math.max(MOVE.run * (intent.sprintHeld ? sprint : 1) * shape, carried);
    const tx = intent.dx * top,
      tz = intent.dz * top;
    if (s.grounded || wantLen > 0.05) {
      const ex = tx - s.vx,
        ez = tz - s.vz,
        el = Math.hypot(ex, ez);
      if (el <= accel) {
        s.vx = tx;
        s.vz = tz;
      } else {
        s.vx += (ex / el) * accel;
        s.vz += (ez / el) * accel;
      }
    }
    // Facing: the locked target, else the camera's forward, else the stick.
    const faceTarget = intent.faceX !== undefined ? Math.atan2(intent.faceX, intent.faceZ!) : intent.faceYaw !== undefined ? intent.faceYaw : wantLen > 0.1 ? Math.atan2(intent.dx, intent.dz) : s.yaw;
    s.yaw = turnToward(s.yaw, faceTarget, MOVE.turnRate * dt);
  } else if (s.grounded && (busy || !control || s.charge > 0 || intent.chargeHeld)) {
    // Standing still while charging, stunned or recovering.
    const k = Math.max(0, 1 - 12 * dt);
    s.vx *= k;
    s.vz *= k;
  }
  // Air brake: guard in the air kills forward speed.
  if (!s.grounded && intent.guardHeld && !s.gliding) {
    const sp = Math.hypot(s.vx, s.vz);
    if (sp > 0) {
      const k = Math.max(0, sp - MOVE.brake * dt) / sp;
      s.vx *= k;
      s.vz *= k;
    }
  }

  // Crouch charge on the ground: hold RB to compress, release to launch.
  if (s.grounded && control && !busy) {
    if (intent.chargeHeld) {
      s.charge = Math.min(1, s.charge + dt / MOVE.chargeTime);
      s.move = 'crouch';
    } else if (s.charge > 0) {
      const apex = MOVE.chargeApexMin + (MOVE.chargeApexMax - MOVE.chargeApexMin) * s.charge;
      s.vy = apexSpeed(apex, g);
      s.vx += intent.dx * 26 * s.charge;
      s.vz += intent.dz * 26 * s.charge;
      s.grounded = false;
      s.coyote = 0;
      s.hold = MOVE.holdWindow; // no extra thrust on a charged leap
      s.holding = false;
      s.hovering = false;
      s.charge = 0;
      s.move = 'jump';
      s.events.push({ kind: 'jump', charged: true });
    }
  }

  // Jump, with coyote time and an input buffer.
  if (control && !busy && s.buffer > 0 && (s.grounded || s.coyote > 0) && s.charge <= 0 && !intent.chargeHeld) {
    s.buffer = 0;
    s.vy = MOVE.tapJump;
    // The lunge: a grasshopper's leap goes forward. It follows the stick when
    // one is pushed, otherwise the way Hopper is already running, and a jump
    // taken from a standstill with no stick is still straight up.
    const speed = Math.hypot(s.vx, s.vz);
    const lx = wantLen > 0.1 ? intent.dx / wantLen : speed > 6 ? s.vx / speed : 0,
      lz = wantLen > 0.1 ? intent.dz / wantLen : speed > 6 ? s.vz / speed : 0;
    const lunge = MOVE.leap * (wantLen > 0.1 ? 1 : Math.min(1, speed / MOVE.run));
    s.vx += lx * lunge;
    s.vz += lz * lunge;
    s.grounded = false;
    s.coyote = 0;
    s.hold = 0;
    s.holding = true;
    s.move = 'jump';
    s.events.push({ kind: 'jump', charged: false });
  }
  // Hop back on the ground (a tap of Y).
  if (control && s.grounded && !busy && intent.hopBackPressed && s.charge <= 0 && s.dashTimer <= 0) {
    s.hopBackTimer = MOVE.hopBackTime;
    s.invuln = Math.max(s.invuln, 0.2);
    s.vx = -Math.sin(s.yaw) * MOVE.hopBack;
    s.vz = -Math.cos(s.yaw) * MOVE.hopBack;
    s.move = 'hopBack';
    s.events.push({ kind: 'hopBack' });
  }

  // Vertical motion. A climb carries its own; gravity is not part of it.
  if (s.climbing) {
    // Held to the wall: no fall, and the wings rest.
  } else if (!s.grounded) {
    if (s.holding && intent.jumpHeld && s.hold < MOVE.holdWindow) {
      // A short variable-height window after takeoff: thrust against gravity, a few metres, no boost.
      s.vy += (MOVE.holdThrust - g) * dt;
      s.hold += dt;
    } else {
      s.holding = false;
      s.glideHold = intent.jumpHeld ? s.glideHold + dt : 0;
      const thermal = world.volumesAt(s.x, s.y, s.z).find((v) => v.kind === 'thermal');
      // Hover: A held in the air (past the takeoff window, or from a fall)
      // beats the wings and holds altitude while the fuel lasts.
      const wantHover = intent.jumpHeld && control && !s.diving && s.hoverFuel > 0 && (s.hovering || (s.glideHold > 0.06 && s.vy < 4));
      if (wantHover && !s.hovering) {
        s.hovering = true;
        s.hoverT = 0;
        if (s.gliding) {
          s.gliding = false;
          s.events.push({ kind: 'glideEnd' });
        }
        s.events.push({ kind: 'hoverStart' });
      } else if (!wantHover && s.hovering) {
        s.hovering = false;
        s.events.push({ kind: 'hoverEnd' });
      }
      // Gliding: fuel spent (or A held again after a hover) while falling.
      const wantGlide = !s.hovering && intent.jumpHeld && control && !s.diving && s.hoverFuel <= 0 && (s.gliding || s.glideHold > 0.12);
      if (wantGlide && !s.gliding && s.vy < 12) {
        s.gliding = true;
        s.events.push({ kind: 'glideStart' });
        const sp = Math.hypot(s.vx, s.vz);
        if (sp < 8) {
          s.vx = Math.sin(s.yaw) * 8;
          s.vz = Math.cos(s.yaw) * 8;
        }
      } else if (!wantGlide && s.gliding) {
        s.gliding = false;
        s.events.push({ kind: 'glideEnd' });
      }
      if (s.hovering) {
        // Wings bite: a small lift at first, then altitude held; a thermal lifts.
        s.hoverT += dt;
        s.hoverFuel = Math.max(0, s.hoverFuel - dt);
        const target = thermal ? thermal.lift! : s.hoverT < 0.35 ? MOVE.hoverLift : 0;
        s.vy += (target - s.vy) * Math.min(1, MOVE.hoverGrip * dt);
      } else if (s.gliding && thermal) {
        // Riding a thermal: the wings turn the updraft into climb.
        s.vy = s.vy < thermal.lift! ? Math.min(thermal.lift!, s.vy + 60 * dt) : Math.max(thermal.lift!, s.vy - 30 * dt);
      } else if (s.gliding) {
        s.vy = Math.max(s.vy - 60 * dt, -MOVE.glideSink);
        if (s.vy > -MOVE.glideSink) s.vy = Math.max(-MOVE.glideSink, s.vy - g * dt);
      } else if (s.diving) {
        s.vy = Math.max(-MOVE.diveTerminal, s.vy - g * MOVE.diveGravity * dt);
        const k = Math.max(0, 1 - 2.5 * dt);
        s.vx *= k;
        s.vz *= k;
      } else {
        s.vy -= g * (s.vy < 0 ? MOVE.fallGravity : 1) * dt;
      }
    }
    // Dive (Y in the air).
    if (control && intent.divePressed && !s.diving) {
      s.diving = true;
      s.gliding = false;
      s.hovering = false;
      s.holding = false;
      s.move = 'dive';
      s.events.push({ kind: 'dive' });
    }
    // Volumes: thermals slow a fall and lift a little without wings; wind pushes.
    for (const v of world.volumesAt(s.x, s.y, s.z)) {
      if (v.kind === 'thermal') {
        if (!s.gliding && !s.diving && s.vy < v.lift! * 0.5) s.vy = Math.min(v.lift! * 0.5, s.vy + (g + 20) * dt);
      } else if (v.kind === 'wind') {
        s.vx += v.dx! * v.push! * dt * 2;
        s.vz += v.dz! * v.push! * dt * 2;
      }
    }
  } else {
    s.vy = 0;
    s.gliding = false;
    s.hovering = false;
    s.diving = false;
    s.glideHold = 0;
    s.hoverFuel = MOVE.hoverFuel;
    s.coyote = MOVE.coyote;
  }
  if (!s.grounded && s.coyote > 0) s.coyote -= dt;

  // Integrate.
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.y += s.vy * dt;

  // Walls, wall kicks and the ledge mantle.
  const wall = resolveWalls(s, world);
  if (wall) {
    const lip = wall.collider.y1;
    const into = intent.dx * -wall.nx + intent.dz * -wall.nz;
    if (!s.grounded) {
      s.wallTimer = MOVE.wallGrace;
      s.wallNx = wall.nx;
      s.wallNz = wall.nz;
    }
    // Taking hold: push into a face with something above to climb, and he is
    // on it. It works from a standing start as well as out of the air, which
    // is what makes a wall a way up rather than something to bounce off.
    if (s.climbing) {
      s.climbTimer = MOVE.climbGrace;
      s.climbNx = wall.nx;
      s.climbNz = wall.nz;
    } else if (into > MOVE.climbEnter && control && !s.diving && !s.gliding && s.mantle <= 0 && s.dashTimer <= 0 && lip > s.y + 3) {
      s.climbing = true;
      s.grounded = false;
      s.vy = Math.min(s.vy, MOVE.climbUp);
      s.climbTimer = MOVE.climbGrace;
      s.climbNx = wall.nx;
      s.climbNz = wall.nz;
      s.wallNx = wall.nx;
      s.wallNz = wall.nz;
      s.move = 'climb';
      s.events.push({ kind: 'climbStart' });
    }
  }
  if (s.climbing && s.climbTimer <= 0) {
    // The wall ran out from under him -- around a corner, or off the top.
    s.climbing = false;
    s.events.push({ kind: 'climbEnd' });
  }
  if (wall && !s.grounded) {
    // Mantle: the lip is within reach and the stick pushes toward it.
    const lip = wall.collider.y1;
    const pushing = intent.dx * -wall.nx + intent.dz * -wall.nz > 0.3;
    if (pushing && (s.climbing || s.vy <= 8) && lip > s.y + 0.5 && lip <= s.y + MOVE.mantleReach && control && !s.diving) {
      if (s.climbing) {
        s.climbing = false;
        s.events.push({ kind: 'climbEnd' });
      }
      const over = 3.5 + MOVE.radius;
      s.mantle = MOVE.mantleTime;
      s.mantleFrom = [s.x, s.y, s.z];
      s.mantleTo = [s.x - wall.nx * over, lip, s.z - wall.nz * over];
      s.gliding = false;
      s.hovering = false;
      s.holding = false;
      s.move = 'mantle';
      s.events.push({ kind: 'mantle' });
      return s.events;
    }
  }
  if (control && !s.grounded && s.wallTimer > 0 && s.buffer > 0 && !s.diving) {
    s.buffer = 0;
    s.wallTimer = 0;
    if (s.climbing) {
      s.climbing = false;
      s.events.push({ kind: 'climbEnd' });
    }
    s.vy = MOVE.wallKickUp;
    s.vx = s.wallNx * MOVE.wallKickAway;
    s.vz = s.wallNz * MOVE.wallKickAway;
    s.commit = MOVE.wallCommit;
    s.hold = MOVE.holdWindow;
    s.holding = false;
    s.gliding = false;
    s.hovering = false;
    s.move = 'jump';
    s.events.push({ kind: 'wallKick' });
  }

  // Ground: land on the highest solid top crossed this step, else terrain.
  const ground = world.groundAt(s.x, s.z, Math.max(prevY, s.y) + 0.05);
  const surface = ground.y;
  if (s.grounded && ground.collider?.spring && s.mantle <= 0) {
    // Standing on a spring pad launches, as landing on one does.
    s.y = surface;
    s.vy = apexSpeed(MOVE.springApex, g);
    s.grounded = false;
    s.coyote = 0;
    s.hold = MOVE.holdWindow;
    s.holding = false;
    s.hovering = false;
    s.charge = 0;
    s.move = 'jump';
    s.events.push({ kind: 'spring' });
  } else if (s.grounded) {
    // Follow small steps down and up; leave the ground when it drops away.
    if (surface >= s.y - 2.5 && surface <= s.y + 2.5) {
      s.y = surface;
      s.groundY = surface;
    } else if (surface > s.y + 2.5) {
      // Ran into a rise the walls did not catch: snap up only if small.
      s.y = surface;
      s.groundY = surface;
    } else {
      s.grounded = false;
      s.move = 'fall';
    }
  } else if (s.climbing && s.vy > -1) {
    // On a wall with his feet by the floor: the floor is not a landing until
    // he climbs down onto it.
  } else if (s.vy <= 0 && s.y <= surface && prevY >= surface - 0.05) {
    // Landing.
    const impact = -s.vy;
    s.y = surface;
    s.groundY = surface;
    s.grounded = true;
    s.vy = 0;
    if (s.climbing) {
      s.climbing = false;
      s.events.push({ kind: 'climbEnd' });
    }
    if (ground.collider?.spring) {
      s.vy = apexSpeed(MOVE.springApex, g);
      s.grounded = false;
      s.hold = MOVE.holdWindow;
      s.holding = false;
      s.gliding = false;
      s.hovering = false;
      s.diving = false;
      s.move = 'jump';
      s.events.push({ kind: 'spring' });
    } else {
      const stomp = s.diving;
      s.diving = false;
      s.gliding = false;
      s.landedFrom = impact;
      if (stomp) {
        s.stompTimer = MOVE.stompLag;
        s.vx = s.vz = 0;
        s.move = 'stomp';
      } else {
        s.landTimer = impact > 65 ? 0.25 : 0.12;
        s.move = 'land';
      }
      s.events.push({ kind: 'land', speed: impact, stomp });
    }
  } else if (s.y < surface) {
    // Passed a surface from below or sideways (thin step): resolve upward.
    s.y = surface;
    if (s.vy < 0) s.vy = 0;
  }

  // Ceilings: stop rising into a solid.
  if (!s.grounded && s.vy > 0) {
    const top = s.y + MOVE.height;
    for (const c of world.near(s.x, s.z, MOVE.radius)) {
      if (c.y0 < top - 1 || c.y0 > top + s.vy * dt + 0.5) continue;
      const [lx, lz] = World.local(c, s.x, s.z);
      if (Math.abs(lx) <= c.hx + MOVE.radius * 0.6 && Math.abs(lz) <= c.hz + MOVE.radius * 0.6) {
        s.vy = 0;
        s.holding = false;
        s.y = Math.min(s.y, c.y0 - MOVE.height);
      }
    }
  }

  // Height above whatever is below (for the HUD and the landing guide).
  s.height = s.grounded ? 0 : Math.max(0, s.y - world.groundAt(s.x, s.z, s.y).y);

  // Move label for animation.
  if (s.grounded) {
    if (s.stompTimer > 0) s.move = 'stomp';
    else if (s.hopBackTimer > 0) s.move = 'hopBack';
    else if (s.landTimer > 0) s.move = 'land';
    else if (s.charge > 0 || (intent.chargeHeld && control)) s.move = 'crouch';
    else s.move = Math.hypot(s.vx, s.vz) > 2 ? 'run' : 'idle';
  } else if (s.dashTimer > 0) s.move = 'dash';
  else if (s.hovering) s.move = 'hover';
  else if (s.gliding) s.move = 'glide';
  else if (s.diving) s.move = 'dive';
  else s.move = s.vy > 0 ? 'jump' : 'fall';
  if (s.grounded && s.dashTimer > 0) s.move = 'dash';
  return s.events;
}

/** Predicted landing point for the current velocity (ballistic, no glide). */
export function predictLanding(s: HopperState, world: World, maxTime = 8): { x: number; y: number; z: number; t: number } {
  let x = s.x,
    y = s.y,
    z = s.z,
    vy = s.vy;
  const g = MOVE.gravity * s.gravityScale,
    dt = 1 / 30;
  for (let t = 0; t < maxTime; t += dt) {
    const ny = y + vy * dt;
    const ground = world.groundAt(x + s.vx * dt, z + s.vz * dt, Math.max(y, ny)).y;
    if (ny <= ground && vy <= 0) return { x: x + s.vx * dt, y: ground, z: z + s.vz * dt, t };
    x += s.vx * dt;
    z += s.vz * dt;
    y = ny;
    vy -= g * (vy < 0 ? MOVE.fallGravity : 1) * dt;
  }
  return { x, y: world.groundAt(x, z, y).y, z, t: maxTime };
}
