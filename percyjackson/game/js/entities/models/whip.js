// The Furies' fiery whip: the model (addWhip) and its pose (whipPose, run
// every frame by animate.js animateExtras).
import * as THREE from 'three/webgpu';
import { PX } from '../character.js';
import { addFlames } from '../flames.js';
import { kit } from '../voxkit.js';
import { markHeld } from '../rigContract.js';

// Fiery whip from the right hand: a gold-capped handle and a chain of
// segments of voxel flame (a hot core with flickering cubes round it).
export function addWhip(rig, { segs = 7, len = 3.2, color = 0xff7a1a, hand = rig.handR, look = rig.material } = {}) {
  const chain = [];
  const K = kit(rig, look, { seed: 19, emit: 0.8 });
  let parent = markHeld(new THREE.Group()); parent.position.set(0, -1 * PX, 0); hand.add(parent);   // (a whip trails: no point to aim)
  rig.wrist = false;   // (the whip hangs from the fist: no wrist cock in the attacks, see character.js)
  K.box(parent, 0, -1, 0, 1.6, 4, 1.6, 0x3a2414); K.box(parent, 0, -3, 0, 2, 0.8, 2, 0xd8a028); K.box(parent, 0, 1.2, 0, 1.8, 0.7, 1.8, 0xd8a028);
  const c = new THREE.Color(color), hot = [c.clone(), new THREE.Color(0xff5a00), new THREE.Color(0xffb020)];
  for (const h of hot) { const m = Math.max(h.r, h.g, h.b); h.multiplyScalar(1 / m); }
  for (let i = 0; i < segs; i++) {
    const g = new THREE.Group(); g.position.y = (i === 0 ? -3 : -len) * PX; parent.add(g);
    const w = 1.1 - i * 0.06;
    K.box(g, 0, -len / 2, 0, w, len + 0.1, w, hot[i % 3 === 1 ? 2 : 0]);
    { const z = 0.4 + K.r() * 0.6; K.box(g, (K.r() - 0.5) * 1.6, -K.r() * len, (K.r() - 0.5) * 1.6, z, z, z, hot[Math.floor(K.r() * 3)]); }
    chain.push(g); parent = g;
  }
  K.done();
  // the fire on it: live flames (flames.js) off every segment, trailing the lash
  const F = addFlames(rig, { cap: 44, palette: 'fire', rise: 18, turb: 26, drag: 2.2 });
  for (const g of chain) F.source(g, { at: [0, 0, 0], to: [0, -len, 0], r: 0.7, rate: 90 / segs, life: [0.25, 0.5], size: [0.8, 1.6], up: 4, spread: 2 });
  rig.extras.whip = chain; rig.extras.whipTip = parent;
  rig.whip = { hand, base: chain[0].parent, chain, len, phi0: 0.25, bend: new Float32Array(segs).fill(-0.5) };   // (posed by whipPose)
  return chain;
}
// The whip's shape, worked out in the rig's own space so it no longer hangs
// from the fist wherever the arm points (it used to dangle straight down and
// trail up to 2 m through the floor). The handle is turned against the hand's
// own turn, so the chain lies in the body's upright plane (following the
// torso's twist), and each segment's angle there (0 straight down, + toward
// the front, -PI/2 straight back) eases toward one of four shapes:
//   coil    at rest: down from the fist, then curling back and up in a loop
//   trail   moving fast or swooping: streaming out behind and rising
//   windup  thrown back over the shoulder, the lash drooping behind
//   crack   lashed forward over the top in an arc and snapped out straight
// Then, segment by segment from the fist, any that would end below the floor
// (the entity's ground, e.visY, or else the rig's own soles) is bent up to
// lie along it, so no pose takes the whip through the ground.
const _wm = new THREE.Matrix4(), _wq = new THREE.Quaternion(), _wq2 = new THREE.Quaternion(), _wv = new THREE.Vector3(), _wE = new THREE.Euler();
const wrapA = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
function worldY(o) { let y = 0, s = 1; for (let p = o; p; p = p.parent) { y = p.position.y + p.scale.y * y; } for (let p = o; p; p = p.parent) s *= p.scale.y; return [y, s]; }
export function whipPose(rig, dt, e) {
  const W = rig.whip, t = rig.t ?? 0, root = rig.root, n = W.chain.length, L = W.len * PX;
  const anim = e?.anim, atk = anim?.type === 'attack';
  const mode = e?.whipCrack > 0 || e?.state === 'recover' || (atk && !e?.swooping && anim.t >= (anim.windup ?? 0.25)) ? 'crack'
    : e?.state === 'windup' || (atk && anim.t < (anim.windup ?? 0.25)) ? 'windup'
    : e?.swooping || (e?.vel && Math.hypot(e.vel.x, e.vel.z) > 1.5) ? 'trail' : 'coil';
  let p0, kb, kp;
  if (mode === 'crack') { p0 = 1.45; kp = 22; kb = 16; }
  else if (mode === 'windup') { p0 = -2.5; kp = 9; kb = 8; }
  else if (mode === 'trail') { p0 = -1.0 + Math.sin(t * 6) * 0.1; kp = 6; kb = 7; }
  else { p0 = 0.25 + Math.sin(t * 1.3) * 0.08; kp = 5; kb = 5; }
  W.phi0 = wrapA(W.phi0 + wrapA(p0 - W.phi0) * (1 - Math.exp(-kp * dt)));
  for (let i = 0; i < n; i++) {
    const b = mode === 'crack' ? 0.03 + Math.sin(t * 14 - i) * 0.05 : mode === 'windup' ? 0.12 + Math.sin(t * 5 - i * 0.8) * 0.08
      : mode === 'trail' ? -0.1 + Math.sin(t * 7 - i * 0.9) * 0.2 : -0.55 + Math.sin(t * 2.6 - i * 0.7) * 0.1;
    W.bend[i] += (b - W.bend[i]) * (1 - Math.exp(-kb / (1 + i * 0.12) * dt));   // (the tip lags the handle: the lash travels down the chain)
  }
  // the fist in the rig's own space
  _wm.identity(); _wq.identity();
  for (let o = W.hand; o && o !== root; o = o.parent) { o.updateMatrix(); _wm.premultiply(o.matrix); _wq.premultiply(o.quaternion); }
  _wv.set(0, -PX, 0).applyMatrix4(_wm);
  // the handle: upright plane of the body, turned with the torso
  _wE.set(-W.phi0, mode === 'crack' || mode === 'windup' ? (anim?.style === 'spin' ? rig.torso.rotation.y : 0) : rig.torso?.rotation.y ?? 0, 0, 'YXZ');   // (a lash aims where she faces; a spin sweeps it round)
  _wq2.setFromEuler(_wE);
  W.base.quaternion.copy(_wq.invert()).multiply(_wq2);
  // the floor in the rig's own space
  const [ry, rs] = worldY(root), floor = typeof e?.visY === 'number' ? e.visY : root.parent ? worldY(root.parent)[0] : 0;
  const minY = (floor - ry) / rs + 1.8 * PX;
  let y = _wv.y - 3 * PX * Math.cos(W.phi0), prev = W.phi0;
  for (let i = 0; i < n; i++) {
    let a = prev + W.bend[i], ny = y - L * Math.cos(a);
    if (ny < minY) { const c = Math.max(-1, Math.min(1, (y - minY) / L)); a = (Math.sin(a) >= 0 ? 1 : -1) * Math.acos(c); a += Math.PI * 2 * Math.round((prev - a) / (Math.PI * 2)); ny = y - L * Math.cos(a); }
    W.chain[i].rotation.set(-(a - prev), 0, Math.sin(t * 3.3 - i * 0.9) * 0.05);
    prev = a; y = ny;
  }
}
