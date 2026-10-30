// mite-gait: procedural legged walking pieces from the Micro mite prototype.
// Self-contained; any many-legged walker can use them.
//
// HOW TO PLUG IT IN
//   import { GAITS, legOffset, gaitTriggers, twoBoneIK, swingTarget } from '../shared/techniques/mite-gait.js';
//   - Give each leg { k: pair index from the front (0..n-1), side: 0 left | 1 right }.
//   - Keep one gait phase per animal and advance it by DISTANCE, not time:
//       dphi = (distanceMoved + |turnAngle| * leverArm) / stride
//     so stride length matches speed and planted feet never skate.
//   - gaitTriggers(phase, dphi, legs, gait) returns the legs whose swing
//     starts this frame. Swing duration = (1 - duty) * stride / speed.
//   - swingTarget(...) says where a swinging foot should land: where its rest
//     point will be at touchdown, plus half a stance ahead.
//   - twoBoneIK(...) places the knee for a hip-to-foot chain with the knee
//     bent toward a chosen direction (body up for arachnid legs: femur up,
//     tibia and tarsus down).
// INPUTS: three.js Vector3s in any units; nothing is allocated per call
// except where noted.
import * as THREE from '../vendor/three.module.min.js';

/**
 * Gaits. offset(k, side, n) is the leg's phase offset in cycles; a leg
 * swings during the first (1 - duty) of its own cycle.
 * - tetrapod: two alternating groups of four ({L1 R2 L3 R4}, {R1 L2 R3 L4}),
 *   with a small back-to-front metachronal lag inside each group. The usual
 *   walking gait of mites, spiders and other arachnids.
 * - wave: a back-to-front wave on each side, the right side an eighth of a
 *   cycle behind the left, so legs lift one or two at a time. Slow, very
 *   stable (high duty factor).
 * - tripod-like pairs (bound): left and right of each pair together. Not an
 *   arachnid gait; there to compare.
 */
export const GAITS = {
  tetrapod: { duty: 0.64, offset: (k, side, n) => ((k + side) % 2) * 0.5 + (n - 1 - k) * 0.035 },
  wave: { duty: 0.8, offset: (k, side, n) => side * (0.5 / n) + (n - 1 - k) / n },
  pairs: { duty: 0.6, offset: (k) => (k % 2) * 0.5 },
};

/** Phase offset for a leg under a gait (n = legs per side). */
export function legOffset(gait, k, side, n = 4) {
  return GAITS[gait].offset(k, side, n) % 1;
}

/** Legs (with .off) whose own cycle wraps between phase and phase + dphi. */
export function gaitTriggers(phase, dphi, legs) {
  const out = [];
  for (const L of legs) if (Math.floor(phase + L.off + dphi) > Math.floor(phase + L.off)) out.push(L);
  return out;
}

/**
 * Landing point for a swinging foot (allocates the returned vector).
 * @param rest the foot's rest point now (world)
 * @param vFoot velocity of that rest point (body velocity + turn)
 * @param remaining seconds of swing left
 * @param duty, stride the gait's duty factor and stride length
 * @param speed body speed (for the lead: half a stance ahead)
 */
export function swingTarget(rest, vFoot, remaining, duty, stride, speed, minSpeed = 45) {
  const ahead = (duty * stride * 0.5) / Math.max(speed, minSpeed);
  return rest.clone().addScaledVector(vFoot, remaining + ahead);
}

const _D = new THREE.Vector3(), _b = new THREE.Vector3();
/**
 * Two-bone IK. Root T, target F, bone lengths L1, L2, knee bent toward
 * `bendDir` (e.g. body up). Writes the knee to outK and the reachable foot
 * to outF (F, or the closest point on the reach sphere). Returns the
 * clamped root-foot distance. `straight` skips the bend (a stiff strut).
 */
export function twoBoneIK(T, F, L1, L2, bendDir, outK, outF, straight = false) {
  _D.subVectors(F, T);
  const d = Math.min(Math.max(_D.length(), Math.abs(L1 - L2) + 1e-3 * (L1 + L2) + 1), (L1 + L2) * 0.995);
  _D.normalize();
  outF.copy(T).addScaledVector(_D, d);
  if (straight) { outK.copy(T).addScaledVector(_D, d * L1 / (L1 + L2)); return d; }
  _b.copy(bendDir).addScaledVector(_D, -_D.dot(bendDir));
  if (_b.lengthSq() < 1e-6) _b.set(_D.y, -_D.x, 0);
  _b.normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  outK.copy(T).addScaledVector(_D, a).addScaledVector(_b, h);
  return d;
}
