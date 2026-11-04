// The phage's verbs as pure logic (three.js maths only, so they run in node tests: grab.test.mjs).
//
// The owner, 4 Nov 2026: "pressing grab looks like it's pushing outward when nothings there, instead it
// should do a grab motion ... You shouldn't be able to grab on the flat surface of the cell, but it should be
// easier to grab any of the proteins on the cell ... you should be able to grab onto various debris floating
// around ... In phage let's have Y be a kick action, so if you're on a cell you launch backwards, or if you
// have debris in you arm area you kick it off ... X to grab, B to retract, A dash, Y kick". And: "reverse the
// left/right camera direction", "you should move faster, and dash should make more of a difference".
import * as THREE from '../shared/vendor/three.module.min.js';

/**
 * The grab assist. reach: how far from the fibres' reach centre a target's surface may be (60 units,
 * 0.6 µm: a generous reach); cone: the cosine below which something is out of the fibres' cone (about 110°
 * either side of the baseplate's line), unless it is right at the baseplate (`close`); behind: how much
 * longer a thing beside or behind counts than one straight ahead; debris: debris counts a little farther
 * than a protein at the same distance (proteins first near a cell, as the owner asked).
 */
export const GRAB = { reach: 60, close: 14, cone: -0.35, behind: 0.9, debris: 1.15 };

/**
 * Movement and the kick. drive: full stick, units/s (it was 36: 1.8×); dashMul: the dash's burst as a
 * multiple of the cruise speed, held dashT s and then braked quickly; kickCell: the launch off a cell
 * (units/s, decaying with the water's drag); kickSwim: the small kick-swim in open water; kickDebris: the
 * speed a kick gives a thing of mass 1; touch: how far beyond its own size a free piece of debris counts as
 * in the fibres' arm area; yawSign: RS right turns the view right.
 */
export const MOVE = { drive: 64, oldDrive: 36, dashMul: 3, dashT: 0.3, dashCool: 1.6, kickCell: 240, kickSwim: 55, kickDebris: 240, touch: 26, yawSign: -1 };

/** The view's yaw (radians about its own up) for an RS x of `x` held `dt` s at `rate` rad/s: right turns right. */
export const yawTurn = (x, rate, dt) => MOVE.yawSign * x * rate * dt;

const _o = new THREE.Vector3();

/**
 * hand: the fibres' reach centre (world); forward: the baseplate's unit direction. targets: [{ kind:
 * 'protein' | 'debris', item, pos, rad }] (pos the grab point, rad its size: the distance is to its surface).
 * A cell's membrane is never a target: only the proteins standing on it and the debris in the water.
 * Returns { kind, item, point, d } | null: the nearest by distance, made up to (1 + behind) times longer for
 * something straight behind than straight ahead, debris a little longer than proteins.
 */
export function pickGrabTarget(hand, forward, targets, { reach = GRAB.reach, cone = GRAB.cone, close = GRAB.close, behind = GRAB.behind, debris = GRAB.debris } = {}) {
  let best = null, score = Infinity;
  for (const tg of targets) {
    _o.subVectors(tg.pos, hand);
    const len = _o.length(), d = Math.max(0, len - (tg.rad || 0));
    if (!(d <= reach)) continue;
    const cos = len > 1e-4 ? _o.dot(forward) / len : 1;
    if (cos < cone && d > close) continue;
    const s = d * (1 + behind * (1 - cos) * 0.5) * (tg.kind === 'debris' ? debris : 1);
    if (s < score) { score = s; best = { kind: tg.kind, item: tg.item, point: tg.pos.clone(), d }; }
  }
  return best;
}

/**
 * What Y does now. hold: what the fibres hold ('protein' | 'debris' | null); touching: a free piece of debris
 * in the fibres' arm area (or null); wall: the outward normal of a cell surface right at the baseplate (or
 * null). On a cell (holding a protein, or the baseplate against a membrane): launch off it ('cell'); holding or
 * touching debris: kick it away ('debris'); otherwise a small kick-swim ('swim').
 */
export function kickPlan({ hold = null, touching = null, wall = null } = {}) {
  if (hold === 'protein') return 'cell';
  if (hold === 'debris' || touching) return 'debris';
  if (wall) return 'cell';
  return 'swim';
}

/**
 * The kick's velocities. kind: kickPlan's answer; forward: the baseplate's unit direction (the fibres kick
 * along it); normal: the cell's outward normal ('cell'); mass: the debris' mass ('debris'). The phage goes
 * head first, away from what its fibres pushed: off the cell along its normal (and back from the baseplate),
 * recoiling a little from heavy debris, and a little forward-of-the-head in open water.
 * Returns { self: Vector3, thing: Vector3 | null } (units/s).
 */
export function kickVelocities(kind, forward, { normal = null, mass = 1 } = {}) {
  const back = forward.clone().negate();
  if (kind === 'cell') {
    const n = normal ? normal.clone() : back.clone();
    return { self: n.multiplyScalar(0.8).addScaledVector(back, 0.35).normalize().multiplyScalar(MOVE.kickCell), thing: null };
  }
  if (kind === 'debris') {
    const m = Math.max(0.2, mass);
    return { self: back.clone().multiplyScalar(60 * m / (1 + m)), thing: forward.clone().multiplyScalar(MOVE.kickDebris / (0.55 + 0.45 * m)) };
  }
  return { self: back.multiplyScalar(MOVE.kickSwim), thing: null };
}

/**
 * The fibres' grab motion, phage-local (the baseplate at the origin, forward -y), for a fibre whose radial
 * unit direction is (dx, 0, dz), at time `s` s into the motion: they reach out a little forward and open,
 * then close inward under the baseplate, clutching, and hold a moment; null when done (the fibres return to
 * their pose). Never a push: it moves nothing but the fibres.
 */
export const GRAB_MOTION = { open: 0.2, close: 0.4, hold: 0.55 };
export function grabMotion(dx, dz, s, out = new THREE.Vector3()) {
  const { open, close, hold } = GRAB_MOTION;
  if (s < 0 || s >= hold) return null;
  const ease = (x) => x * x * (3 - 2 * x);
  // rest (about where the extended fibres' tips are) → open (out and forward) → shut (together under the plate)
  let r, y;
  if (s < open) { const k = ease(s / open); r = 14 + 2.5 * k; y = -3.5 - 4.5 * k; }
  else if (s < close) { const k = ease((s - open) / (close - open)); r = 16.5 - 14 * k; y = -8 - 5 * k; }
  else { r = 2.5; y = -13; }
  return out.set(dx * r, y, dz * r);
}
/** The kick's fibre motion (as grabMotion): drawn in, then snapped out straight ahead; null when done. */
export const KICK_MOTION = { gather: 0.1, snap: 0.2, hold: 0.36 };
export function kickMotion(dx, dz, s, out = new THREE.Vector3()) {
  const { gather, snap, hold } = KICK_MOTION;
  if (s < 0 || s >= hold) return null;
  let r, y;
  if (s < gather) { const k = s / gather; r = 15 - 8 * k; y = -4 + 3 * k; }
  else if (s < snap) { const k = (s - gather) / (snap - gather); r = 7 - 1 * k; y = -1 - 19 * k; }
  else { r = 6; y = -20; }
  return out.set(dx * r, y, dz * r);
}
