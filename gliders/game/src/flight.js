// The flight model: a glider with real lift. Lift grows with the square of the
// airspeed and with the angle of attack (how far the nose is above the flight
// path), up to a structural limit, and it pulls along the wing's up axis. So a
// fast glider pulling up feels heavy G and swoops high, while a slow one mushes,
// sinks and, past the stall angle, drops its nose and falls until it has speed
// again. Banking tilts the lift and turns you; the nose follows the airflow.
//
// The stick commands angle of attack around a trim angle, so hands off the
// glider settles into a steady glide of about 35 m/s, and pushing over dives
// steeply. Drag rises with angle of attack, so hard pulls bleed energy.
//
// Body axes: forward is local +Z, up +Y, the glider's right wing local -X.
// Inputs: pitch +1 nose up, roll +1 roll right, yaw +1 nose right,
// tuck 0..1 (fold in and dive), flare 0..1 (spread out and brake).
// After each step, f.g is the felt G-load (lift over gravity) and f.aoa the
// angle of attack.

import * as THREE from '../vendor/three.module.min.js';

export const FLIGHT = {
  gravity: 17,
  cl: 0.15, // lift per (m/s)^2 per radian of angle of attack
  maxLift: 112, // m/s^2: about 6.6 G
  stallAoa: 0.42,
  cd0: 0.0011,
  cdi: 0.03,
  trimAoa: 0.09,
  pullAoa: 0.38, // added at full back stick
  pushAoa: 0.3, // taken away at full forward stick
  pitchStiff: 6.5,
  yawStiff: 4,
  rollRate: 3.3,
  yawRate: 0.8,
  levelAssist: 1.5,
  tuckLift: 0.72,
  tuckDrag: 0.55,
  flareLift: 1.25,
  flareDrag: 3.4,
  radius: 0.5,
  launchSpeed: 38,
  maxSpeed: 165,
};

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion();
const _d = new THREE.Vector3();

export function createFlyer() {
  return {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    speed: 0,
    forward: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(-1, 0, 0),
    bank: 0,
    aoa: 0,
    g: 1,
    accel: new THREE.Vector3(),
    smoothIn: { pitch: 0, roll: 0, yaw: 0, tuck: 0, flare: 0 },
  };
}

export function placeFlyer(f, pos, yaw, pitch, speed = FLIGHT.launchSpeed) {
  f.pos.set(pos[0], pos[1], pos[2]);
  f.quat.setFromAxisAngle(Y, yaw).multiply(_q.setFromAxisAngle(X, pitch));
  updateAxes(f);
  f.vel.copy(f.forward).multiplyScalar(speed);
  f.speed = speed;
  f.smoothIn = { pitch: 0, roll: 0, yaw: 0, tuck: 0, flare: 0 };
}

export function updateAxes(f) {
  f.forward.copy(Z).applyQuaternion(f.quat);
  f.up.copy(Y).applyQuaternion(f.quat);
  f.right.set(-1, 0, 0).applyQuaternion(f.quat);
  // Bank: positive with the right wing down.
  f.bank = Math.atan2(-f.right.y, f.up.y);
}

function rotateLocal(f, axis, angle) {
  if (angle) f.quat.multiply(_q.setFromAxisAngle(axis, angle));
}

const _l = new THREE.Vector3();

// One fixed step. opts.assist 0..1 scales the auto-levelling; opts.updraft is
// extra upward acceleration (m/s^2) from rising air.
export function stepFlight(f, input, dt, opts = {}) {
  const P = FLIGHT;
  const s = f.smoothIn;
  // Smooth the raw inputs a little so digital keys feel analogue.
  const k = 1 - Math.exp(-dt * 14);
  s.pitch += (input.pitch - s.pitch) * k;
  s.roll += (input.roll - s.roll) * k;
  s.yaw += (input.yaw - s.yaw) * k;
  const kt = 1 - Math.exp(-dt * 6);
  s.tuck += (input.tuck - s.tuck) * kt;
  s.flare += (input.flare - s.flare) * kt;

  let speed = f.vel.length();
  if (speed < 0.01) f.vel.copy(f.forward).multiplyScalar((speed = 0.01));
  _d.copy(f.vel).divideScalar(speed);
  updateAxes(f);
  // Angle of attack (velocity below the nose is positive) and sideslip.
  const aoa = Math.atan2(-_d.dot(f.up), _d.dot(f.forward));
  const slip = Math.atan2(_d.dot(f.right), _d.dot(f.forward));
  f.aoa = aoa;
  const authority = THREE.MathUtils.clamp(speed / 24, 0.2, 1.4);

  // Pitch: the stick asks for an angle of attack; the airflow turns the nose to it.
  const bankComp = Math.min(0.12, 0.05 * (1 / Math.max(0.35, Math.cos(f.bank)) - 1));
  let cmd = P.trimAoa + bankComp - s.tuck * 0.06 + s.flare * 0.1;
  cmd += s.pitch > 0 ? s.pitch * P.pullAoa : s.pitch * P.pushAoa;
  const q = P.pitchStiff * authority * (cmd - aoa) + s.pitch * 0.5 * (1.4 - authority);
  rotateLocal(f, X, -q * dt);
  // Roll is direct; the nose weathervanes into the sideslip.
  rotateLocal(f, Z, s.roll * P.rollRate * dt);
  rotateLocal(f, Y, (-s.yaw * P.yawRate + P.yawStiff * authority * slip * -1) * dt);
  updateAxes(f);

  // Optional level assist: gently roll the wings level when not rolling.
  const assist = opts.assist ?? 1;
  if (assist > 0 && Math.abs(input.roll) < 0.15 && Math.abs(f.forward.y) < 0.85) {
    rotateLocal(f, Z, -f.bank * P.levelAssist * assist * dt);
  }
  f.quat.normalize();
  updateAxes(f);

  // Forces: lift along the wing's up (square to the airflow), drag against it.
  const a = Math.atan2(-_d.dot(f.up), _d.dot(f.forward));
  const stall = Math.abs(a) <= P.stallAoa ? 1 : Math.max(0.25, 1 - (Math.abs(a) - P.stallAoa) * 3);
  const clMul = (1 - s.tuck * (1 - P.tuckLift)) * (1 + s.flare * (P.flareLift - 1));
  let lift = P.cl * clMul * stall * speed * speed * a;
  lift = THREE.MathUtils.clamp(lift, -P.maxLift * 0.6, P.maxLift);
  _l.copy(f.up).addScaledVector(_d, -f.up.dot(_d));
  const ll = _l.length();
  if (ll > 1e-6) _l.divideScalar(ll);
  const cdMul = (1 - s.tuck * (1 - P.tuckDrag)) * (1 + s.flare * (P.flareDrag - 1));
  const drag = (P.cd0 + P.cdi * a * a) * cdMul * speed * speed;

  f.accel.set(0, -P.gravity + (opts.updraft || 0), 0).addScaledVector(_l, lift).addScaledVector(_d, -drag);
  f.vel.addScaledVector(f.accel, dt);
  speed = f.vel.length();
  if (speed > P.maxSpeed) f.vel.multiplyScalar(P.maxSpeed / speed);
  f.speed = Math.min(speed, P.maxSpeed);
  // Felt G: lift plus any updraft push, over gravity (1 in a level glide).
  f.g = (lift + (opts.updraft || 0) * Math.max(0, f.up.y)) / P.gravity;
  f.pos.addScaledVector(f.vel, dt);
}

// Advance by dt in substeps small enough not to tunnel through thin beams,
// stopping at the first contact. Returns true on a crash.
export function advance(f, input, dt, world, opts = {}) {
  const steps = Math.max(1, Math.ceil((f.speed * dt) / 0.35), Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  const probe = opts.probe;
  for (let i = 0; i < steps; i++) {
    stepFlight(f, input, h, opts);
    if (world) {
      const d = world.nearest(f.pos.x, f.pos.y, f.pos.z, 4, probe);
      if (d < FLIGHT.radius) return true;
    }
  }
  return false;
}
