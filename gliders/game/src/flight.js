// The flight model: an arcade glider with real energy. Diving trades height for
// speed and climbing spends it; lift steers the velocity toward where the nose
// points, faster the faster you go, so a slow glider mushes and stalls while a
// fast one carves. Bank to turn; pull up in a bank to turn tighter.
//
// Body axes: forward is local +Z, up +Y, the glider's right wing local -X.
// Inputs: pitch +1 nose up, roll +1 roll right, yaw +1 nose right,
// tuck 0..1 (fold in and dive), flare 0..1 (spread out and brake).

import * as THREE from '../vendor/three.module.min.js';

export const FLIGHT = {
  gravity: 14,
  lift: 3.2, // how fast the velocity swings toward the nose, at liftSpeed and above
  liftSpeed: 20,
  dragQ: 0.0015,
  dragL: 0.3,
  induced: 0.07, // speed lost per radian the path is bent
  pitchRate: 2.1,
  rollRate: 3.6,
  yawRate: 0.9,
  bankTurn: 1.25,
  levelAssist: 1.4,
  weathervane: 0.9,
  tuckLift: 0.55,
  tuckDrag: 0.5,
  flareLift: 1.45,
  flareDrag: 2.8,
  radius: 0.5,
  launchSpeed: 34,
  maxSpeed: 150,
};

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _d = new THREE.Vector3();
const _b = new THREE.Vector3();

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
    turnRate: 0,
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

// One fixed step. `opts.assist` 0..1 scales the auto-levelling.
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

  const speed = f.vel.length();
  const authority = THREE.MathUtils.clamp(speed / 26, 0.4, 1.15);

  // Steering in the body frame.
  rotateLocal(f, X, -s.pitch * P.pitchRate * authority * (1 + s.flare * 0.3) * dt);
  rotateLocal(f, Z, s.roll * P.rollRate * dt);
  rotateLocal(f, Y, -s.yaw * P.yawRate * authority * dt);
  updateAxes(f);

  // Banking turns the glider around the world's up axis.
  const lift01 = THREE.MathUtils.clamp(speed / P.liftSpeed, 0, 1);
  const turn = P.bankTurn * f.right.y * lift01 * (1 - Math.abs(f.forward.y) * 0.7);
  if (turn) f.quat.premultiply(_q.setFromAxisAngle(Y, turn * dt));
  f.turnRate = turn;

  // Optional level assist: gently roll the wings level when not rolling.
  const assist = opts.assist ?? 1;
  if (assist > 0 && Math.abs(input.roll) < 0.15 && Math.abs(f.forward.y) < 0.85) {
    rotateLocal(f, Z, -f.bank * P.levelAssist * assist * dt);
  }

  // Stall: below lift speed the nose falls toward where the glider is going.
  if (speed > 0.1) {
    _d.copy(f.vel).divideScalar(speed);
    const wv = P.weathervane * (1 - lift01) * (1 - lift01) * 3 * dt;
    updateAxes(f);
    _v.crossVectors(f.forward, _d);
    const sinA = _v.length();
    if (sinA > 1e-5) {
      _v.divideScalar(sinA);
      const ang = Math.min(Math.asin(Math.min(1, sinA)), wv);
      f.quat.premultiply(_q.setFromAxisAngle(_v, ang));
    }
  }
  f.quat.normalize();
  updateAxes(f);

  // Gravity.
  f.vel.y -= P.gravity * dt;
  let sp = f.vel.length();

  // Lift: swing the velocity toward the nose, costing a little speed.
  const liftK = P.lift * lift01 * lift01 * (1 - s.tuck * (1 - P.tuckLift)) * (1 + s.flare * (P.flareLift - 1));
  if (sp > 0.01) {
    _d.copy(f.vel).divideScalar(sp);
    _b.copy(_d);
    _d.lerp(f.forward, Math.min(1, liftK * dt)).normalize();
    const bent = _b.angleTo(_d);
    sp *= 1 - P.induced * bent;
    // Drag.
    const dragMul = (1 - s.tuck * (1 - P.tuckDrag)) * (1 + s.flare * (P.flareDrag - 1));
    sp -= (P.dragQ * sp * sp + P.dragL) * dragMul * dt;
    sp = THREE.MathUtils.clamp(sp, 0.5, P.maxSpeed);
    f.vel.copy(_d).multiplyScalar(sp);
  }
  f.speed = sp;
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
