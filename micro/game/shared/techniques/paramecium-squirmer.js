// paramecium-squirmer: low-Reynolds-number swimming helpers for any
// microswimmer. From the Micro Paramecium prototype. Self-contained; uses
// three's Vector3 only.
//
// HOW TO PLUG IT IN
//   import { lowRe, squirmerFlow, sink, helixPose } from '../shared/techniques/paramecium-squirmer.js';
//   speed = lowRe(speed, targetSpeed, dt, 0.035);   // no coasting: speed follows the beat
//   // flow a swimmer makes at point q (adds to `out`, µm/s):
//   squirmerFlow(q, axisA, axisB, U, 32, out);       // body axis segment, velocity U, radius
//   sink(q, mouth, strength, reach, out);             // a feeding current into a point
//   helixPose(axisPoint, fwd, phi, radius, tilt, outCentre, outQuat); // helical swim pose
//
// WHAT IT DOES
// - lowRe: at Re ≈ 0.1 viscous forces dominate (Lauga & Powers 2009), so a
//   swimmer's speed relaxes to what its cilia produce within milliseconds.
//   tau ≈ 0.03 s keeps a trace of the beat's own spin-up; a large tau gives the
//   (unphysical) gliding feel of a big animal, for comparison.
// - squirmerFlow: the lab-frame field of a neutral squirmer, a source dipole:
//   u = R³/(2r³) (3(U·r̂)r̂ − U). Fluid at the poles moves with the body, fluid
//   at the sides is swept backwards at half speed, decaying as 1/r³. Distances
//   are measured from the body's axis segment so an elongated cell gets an
//   elongated field.
// - sink: a smooth inward current toward a point (an oral groove, a peristome).
// - helixPose: a body on a left-handed helix around a travel axis, its long
//   axis tilted along the path and its oral side facing the helix axis.
import * as THREE from '../vendor/three.module.min.js';

const r = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();

export function lowRe(current, target, dt, tau = 0.035) {
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

/** Adds the squirmer's lab-frame flow at q to out (µm/s). */
export function squirmerFlow(q, a, b, U, R, out) {
  const Ul = U.length();
  if (Ul < 1) return out;
  d.subVectors(b, a);
  const t = Math.min(1, Math.max(0, r.subVectors(q, a).dot(d) / Math.max(d.lengthSq(), 1e-9)));
  c.copy(a).addScaledVector(d, t);
  r.subVectors(q, c);
  const rl = Math.max(r.length(), 1);
  if (rl < R * 0.8) return out;
  const k = (R * R * R) / (2 * rl * rl * rl);
  const ud = (U.x * r.x + U.y * r.y + U.z * r.z) / rl;
  out.x += k * (3 * ud * r.x / rl - U.x);
  out.y += k * (3 * ud * r.y / rl - U.y);
  out.z += k * (3 * ud * r.z / rl - U.z);
  return out;
}

/** Adds a feeding current toward `mouth`, strength µm/s near it, fading to 0 at `reach`. Returns the distance. */
export function sink(q, mouth, strength, reach, out) {
  const mx = mouth.x - q.x, my = mouth.y - q.y, mz = mouth.z - q.z;
  const md = Math.hypot(mx, my, mz);
  if (md < reach) {
    const s = strength * (1 - md / reach) ** 2 / Math.max(md, 1);
    out.x += mx * s; out.y += my * s; out.z += mz * s;
  }
  return md;
}

const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), rho = new THREE.Vector3(), drho = new THREE.Vector3();
const T = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), M = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0), XV = new THREE.Vector3(1, 0, 0);
/**
 * Pose on a helix. fwd: unit travel direction; phi: roll/helix phase (run it
 * negative for a left-handed helix); radius; tilt (rad) of the long axis along
 * the path. Writes the body centre and a quaternion whose +x is the long axis
 * and whose −y (oral side) faces the helix axis.
 */
export function helixPose(axisPoint, fwd, phi, radius, tilt, outCentre, outQuat) {
  const ref = Math.abs(fwd.y) > 0.98 ? XV : UP;
  e1.copy(ref).addScaledVector(fwd, -fwd.dot(ref)).normalize();
  e2.crossVectors(fwd, e1);
  rho.copy(e1).multiplyScalar(Math.cos(phi)).addScaledVector(e2, Math.sin(phi));
  drho.copy(e1).multiplyScalar(-Math.sin(phi)).addScaledVector(e2, Math.cos(phi));
  outCentre.copy(axisPoint).addScaledVector(rho, radius);
  T.copy(fwd).multiplyScalar(Math.cos(tilt)).addScaledVector(drho, -Math.sin(tilt)).normalize();
  Y.copy(rho).addScaledVector(T, -rho.dot(T)).normalize();
  Z.crossVectors(T, Y);
  M.makeBasis(T, Y, Z);
  outQuat.setFromRotationMatrix(M);
  return T;
}
