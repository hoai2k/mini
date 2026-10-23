import * as THREE from 'three/webgpu';
import { Rig, PX } from '../../character.js';
import { paintPerson } from '../../mortals.js';
import { animateExtras } from '../animate.js';
import { skinMat, group, bruteLimbs } from '../../parts.js';
import { sculpt, along, hideSkin, hash3, legScale, reshape, applyShape } from '../../voxkit.js';
import { markHeadCore, markHeadwear } from '../../rigContract.js';
import { VD } from './parts.js';

// The Minotaur: a towering brown bull-man in white briefs with a gold belt
// medallion, cream horns, a gold nose ring and red eyes.
export function buildMinotaur() {
  // the skin boxes are hidden under the sculpt; the material still carries the hit flash and glow
  const m = skinMat('boss_minotaur', (S) => paintPerson(S, { skin: 0x86391c, hair: 0x341810, top: 0x86391c, pants: 0x86391c, shoes: 0x2a2424 }), { emit: 3 });
  const rig = new Rig({ material: m, scale: 2.1, bodyW: 13, bodyH: 13, bodyD: 7, armW: 6, headS: 7.5, legH: 15 });
  rig.vd = VD.minotaur;
  for (const [a, s] of [[rig.armR, -1], [rig.armL, 1]]) a.position.x = s * 11.2 * PX;
  bruteLimbs(rig, { armLen: 1.6, armThick: 1.15, legThick: 1.5, legX: 4 });
  rig.neck.position.z = 1.8 * PX;   // the head thrust forward, low between the shoulders
  rig.neck.position.y = 11.6 * PX;
  // (round 7, head and leg proportions, proportions.js: the bull's head
  // sculpted afresh at 0.8 of its old size, its horns kept near their old
  // sweep (HK), on legs grown from 15 to 20 pixels over the same hooves)
  const L1 = 20, ANK = -12, HK = 1.15;
  reshape(rig, rig.head, 0.8);
  reshape(rig, rig.hips, [1, 1.15, 1]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1, legScale(15, L1, ANK), 1], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [1, 1.12, 1]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  hideSkin(rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL);
  // deep red-brown hide, darker fur in the creases, lighter on the muscle tops
  const hide = [0x5e240c, 0x7a3010, 0x903c14, 0xa84a1a], hideL = [0x9a4416, 0xb0521e, 0xc06028], furD = [0x24100a, 0x341810, 0x4a2414];
  const muscle = (x, y, z, n) => (n > 0.6 ? 0xae5228 : null);
  const gold = [0xd8a032, 0xe8b444, 0xc48a26];
  // torso: a barrel chest, slabs of pecs, a hump of trapezius, ridged abs
  sculpt(rig, rig.torso, [
    // (pass 3: a V from broad shoulders to a narrow waist, two defined pecs
    // with a cleft and a shadow under them, a slimmer gut, as on vox-bosses-1)
    // (the gold belt and its medallion are on the hips now, round 8: the loincloth below)
    { e: [0, -0.6, 0.3, 5.7, 1.5, 4.1], col: [0xe8e0c8, 0xd8ccb0, 0xf4eedc], bump: 0.1 },
    { b: [-0.45, 7, 3.2, 0.45, 11.6, 6], col: 0x5a240e, bump: 0 },
    { e: [-2.9, 9.6, 2.4, 3.6, 2.9, 2.5], col: (x, y) => (y < 7.6 ? 0x6a2a10 : hideL[Math.floor(hash3(Math.floor(x), Math.floor(y), 2, 6) * 3)]) }, { e: [2.9, 9.6, 2.4, 3.6, 2.9, 2.5], col: (x, y) => (y < 7.6 ? 0x6a2a10 : hideL[Math.floor(hash3(Math.floor(x), Math.floor(y), 2, 6) * 3)]) },
    { e: [0, 3.6, 1, 4.1, 4.2, 3.3], col: (x, y, z) => z > 3 && (Math.abs(x) < 0.6 || (y > 2 && y < 3) || (y > 4.4 && y < 5.4)) ? 0x5a240e : y > 5.6 ? 0x8e401e : 0x9a4622 },
    { e: [0, 12.2, -0.8, 8.4, 3.2, 4.2], col: (x, y, z) => (z < -2.5 && Math.abs(x) < 3 ? furD[(Math.floor(x + y) & 1) + 1] : hide[Math.floor(hash3(Math.floor(x), Math.floor(y), Math.floor(z), 4) * 4)]) },
    { e: [0, 14, 1, 4, 2.2, 3.2], col: furD, fuzz: 0.4 },
    { e: [-4.6, 8.4, -0.8, 2.4, 4.2, 3], col: hide }, { e: [4.6, 8.4, -0.8, 2.4, 4.2, 3], col: hide },
    { e: [0, 8.6, -0.2, 5.6, 5, 3.6], col: hide },
    { e: [0, 4, 0, 4.3, 4, 3.2], col: hide },
  ], { v: 1, seed: 11, bump: 0.12, fuzz: 0.1 });
  // the loincloth (round 8, after vox-bosses-1, fitted tight in round 9):
  // white cloth wrapped round the waist under a gold belt with the medallion
  // in front. The belt hugs the torso's narrow waist (the sculpt measures
  // about +-4.7 wide and -3.3..4 deep at belt height, so the belt's ring is
  // 5.6 by 4.1 with the 1 px band standing just clear of it). The hem hangs
  // in fourteen panels, each on its own pivot under the belt that swings with
  // the thigh behind it (rig.tick below), so a striding leg carries its panel
  // along instead of passing through it. A panel falls straight from the
  // belt and only steps out where the hip and thigh swell (HIP below, read
  // off the thigh sculpt), so it lies on the thigh rather than flaring.
  const CLOTH = [0xece4cc, 0xe0d6bc, 0xf6f0de], CLOTHD = 0xcfc4a6, TAU = Math.PI * 2, Z0 = 0.3, BY = 3.1, BYS = BY * 1.15;   // (BYS: the belt's height after the hips' 1.15 stretch)
  const BRX = 5.6, BRZ = 4.1;   // the belt's ring, centre line of its 1 px band
  // a point on the waist's rounded oblong (half-widths Rx, Rz) in direction a (0: front)
  const ring = (a, Rx, Rz, pw = 3) => {
    const sa = Math.sin(a), ca = Math.cos(a), r = 1 / ((Math.abs(sa) / Rx) ** pw + (Math.abs(ca) / Rz) ** pw) ** (1 / pw), x = r * sa, z = r * ca;
    const nx = Math.sign(x) * Math.abs(x / Rx) ** (pw - 1) / Rx, nz = Math.sign(z) * Math.abs(z / Rz) ** (pw - 1) / Rz;
    return { x, z, yaw: Math.atan2(nx, nz) };
  };
  // how far out the hip and thigh reach (px, from the thigh sculpt) at a height on the hips
  const HIP = [[5, 5.2], [3.5, 6.3], [2.5, 7.1], [1.5, 7.3], [0.5, 8], [-1.5, 8.2], [-3, 9], [-14, 9]];
  const hipX = (y) => { for (let k = 1; k < HIP.length; k++) if (y >= HIP[k][0]) { const [y1, x1] = HIP[k - 1], [y0, x0] = HIP[k]; return x0 + (x1 - x0) * (y - y0) / (y1 - y0); } return HIP[HIP.length - 1][1]; };
  const NB = 28, beltBoxes = [];
  for (let i = 0; i < NB; i++) {
    const q = ring(i / NB * TAU, BRX, BRZ), q2 = ring((i + 1) / NB * TAU, BRX, BRZ), dx = q2.x - q.x, dz = q2.z - q.z;
    const at = [(q.x + q2.x) / 2, BY, (q.z + q2.z) / 2 + Z0], ry = Math.atan2(-dz, dx), len = Math.hypot(dx, dz) + 0.4;
    beltBoxes.push({ p: at, s: [len, 1.8, 1], c: gold[i % 3], m: 'm', r: [0, ry, 0] });
    beltBoxes.push({ p: [at[0], BY - 1.05, at[2]], s: [len, 0.4, 1.05], c: 0x9a6a1a, m: 'm', r: [0, ry, 0] });   // (its lower edge, darker)
  }
  const MZ = ring(0, BRX, BRZ).z + Z0 + 0.5;
  beltBoxes.push({ p: [0, BY, MZ], s: [3, 3, 0.8], c: 0xe8b444, m: 'm' }, { p: [0, BY, MZ], s: [3, 3, 0.8], c: 0xd8a032, m: 'm', r: [0, 0, Math.PI / 4] },
    { p: [0, BY, MZ + 0.5], s: [1.7, 1.7, 0.4], c: 0xffd860, m: 'm' }, { p: [0, BY, MZ + 0.7], s: [0.7, 0.7, 0.3], c: 0x9a6a1a, m: 'm' });
  for (const sx of [-1, 1]) {   // a short knotted tie at each hip, hanging 2-3 px tight to the belt
    beltBoxes.push({ p: [sx * (BRX + 0.9), BY - 0.3, Z0 + 0.9], s: [1.2, 1.4, 1.2], c: 0xd8cca8 },
      { p: [sx * (BRX + 1), BY - 2, Z0 + 1], s: [0.9, 2.2, 0.7], c: 0xece4cc });
  }
  sculpt(rig, rig.hips, [
    { e: [0, -1.4, 0.3, 5.4, 1.9, 4.1], col: CLOTH },
    { e: [0, BY + 0.6, Z0, BRX - 0.3, 1.6, BRZ - 0.2], col: CLOTH, bump: 0, fuzz: 0 },   // the cloth wound round the waist, showing a little over the belt's top edge
  ], { v: 1, seed: 12 }, beltBoxes);
  // a front apron and a back apron only (round 9: his thighs are far wider than his waist, so
  // cloth all round would flare over them into a skirt), each one flat piece of cloth hung from
  // inside the belt and tipped out just far enough to clear the thigh sculpt (4.7 px in front
  // and behind): between the thighs, a little narrower at the hem, with the ragged hem
  const kilt = [], PY = BYS;   // (the pivots sit high under the belt, so a swinging apron's top stays tucked in it)
  for (const [i, dir] of [[0, 1], [1, -1]]) {
    const L = i === 0 ? 9.5 : 8, WT = i === 0 ? 6.4 : 6, WB = i === 0 ? 4.6 : 4.4;
    const z0 = dir * (BRZ + 0.6) + Z0;   // the pivot's z, at the belt's outer face, so the apron hangs in front of (behind) the thighs
    const G = group(rig.hips, 0, PY, z0), I = new THREE.Group(); G.add(I);
    const tilt = 0.12;   // (just clears the thighs' front at rest. The owner: the aprons hang straight down and the legs may pass through them; they are there for modesty, not cloth physics)
    I.rotation.order = 'YXZ'; I.rotation.set(-tilt, i === 0 ? 0 : Math.PI, 0);
    const hem = (x, y, z, n, h) => (y < -L + 1.5 - Math.abs(Math.sin(x * 1.3 + i * 2.1)) * 0.9 - h * 1.2 ? null : y < -L + 2.6 ? CLOTHD : CLOTH[Math.floor(h * 3)]);
    const rows = [];
    for (let k = 0; k < Math.ceil(L + 0.8); k++) {
      const y1 = k === 0 ? 0.8 : -(k - 1), y0 = Math.max(-L, y1 - 1), w = WT + (WB - WT) * Math.min(1, Math.max(0, -(y0 + y1) / 2) / L);
      rows.push({ b: [-w / 2, y0, -0.5, w / 2, y1, 0.5], col: hem, bump: 0, fuzz: 0 });
    }
    sculpt(rig, I, rows, { v: 1, seed: 40 + i });
    kilt.push({ g: G, legs: [rig.legR, rig.legL], front: i === 0 ? 1 : 0, back: i === 0 ? 0 : 1, side: 0 });
  }
  rig.extras.kilt = kilt;
  // arms: a ball of shoulder, a bulging bicep, a forearm like a tree trunk, a knuckled fist
  for (const [arm, s] of [[rig.armR, -1], [rig.armL, 1]]) {
    sculpt(rig, arm, [
      // (pass 3: a rounder deltoid, a slimmer upper arm and elbow, the
      // forearm swelling to the fist, all longer so the fists hang low)
      { e: [s * 0.2, 0.6, 0, 4, 4.2, 4.1], col: hide },
      { e: [0, -4.4, 0.8, 2.5, 4.4, 2.8], col: (x, y, z, n) => (z > 1.8 && n > 0.45 ? 0xa44c24 : hide[Math.floor(n * 3.99)]) },
      { cap: [0, -9, 0.3, 0, -15, 0.7, 2.3, 3.3], col: (x, y, z, n) => (z < -2 ? furD[Math.floor(n * 2.99)] : hide[Math.floor(n * 3.99)]), fuzz: 0.2 },
      { e: [0, -18.2, 1, 3.7, 3.3, 3.9], col: (x, y, z, n) => (y < -20 && z > 2 ? 0x2a1610 : z > 3.2 && (Math.round(x) % 2 === 0) ? 0x9a4622 : 0x74301a), bump: 0.06 },
    ], { v: 1, seed: 20 + s, bump: 0.14 }, [-2.1, -0.7, 0.7, 2.1].map((dx) => ({ p: [dx * 1.1, -21.6, 3.2], s: [1.2, 1.4, 1.6], c: 0x1e1210, r: [0.5, 0, 0] })));
  }
  // legs: thick thighs, shaggy fetlocks and split dark hooves
  for (const [leg, s] of [[rig.legR, -1], [rig.legL, 1]]) {
    sculpt(rig, leg, [
      { b: [-0.4, -15, 1.2, 0.4, -13.2, 3.8], cut: true },
      { b: [-3.3, -15, -2.6, 3.3, -12.8, 3.6], col: [0x2a2424, 0x3a3232, 0x4a4040], bump: 0, fuzz: 0 },
      { e: [0, -12.2, 0.3, 3.7, 1.7, 3.9], col: furD, fuzz: 0.45, bump: 0.25 },
      { e: [0, -8.8, -0.6, 3, 4.2, 3.3], col: hide },
      { e: [s * 0.4, -3, 0.2, 3.9, 5.8, 4.3], col: (x, y, z, n) => (n > 0.62 ? 0xa44c24 : hide[Math.floor(n * 3.99)]) },
    ], { v: 1, seed: 30 + s, bump: 0.14 });
  }
  // the bull's head: shaggy forelock, heavy brow, burning eyes, a broad dark
  // muzzle with a gold ring, and great cream horns sweeping out and up
  const hornCol = (t) => (t > 0.82 ? [0xc8b48a, 0xb8a078] : [0xf2e8d0, 0xe6dac0, 0xd8c8a6]);
  const horn = (s) => along((t) => [s * (3.8 + HK * (8.4 * Math.sin(Math.min(1, t * 1.3) * 1.5) - 2.2 * t * t * t)), 6.4 + HK * (1.6 * t + 8 * t * t), 0.6 - HK * 2.2 * t], 18, 2.5 * 1.1, 1.05 * 1.1, hornCol);
  const muzzle = group(rig.head, 0, 2.2, 7.6);
  markHeadCore(rig, [0, 4.35, 1.4], [8.8, 8.9, 10.4]);   // (the bull's skull and muzzle: horns and forelock aside)
  sculpt(rig, rig.head, [
    { b: [-3, 4.3, 3.6, -1.4, 5.1, 4.9], col: 0xff1a00, m: 'e', bump: 0, fuzz: 0 }, { b: [1.4, 4.3, 3.6, 3, 5.1, 4.9], col: 0xff1a00, m: 'e', bump: 0, fuzz: 0 },
    { e: [0, 7.6, 0.6, 4.2, 1.8, 3.8], col: furD, fuzz: 0.5, bump: 0.3 },
    { b: [-3.8, 5.3, 3.6, 3.8, 6.2, 4.8], col: 0x341810, bump: 0 },
    { e: [0, 2.2, 5.2, 3.2, 2.3, 2.6], col: (x, y, z) => (z > 7.2 && y > 2.2 && Math.abs(Math.abs(x) - 1.4) < 0.6 ? 0x0e0806 : y < 1 ? 0x2e1a10 : [0x3e2214, 0x4a2a18][Math.floor(hash3(Math.floor(x * 2), Math.floor(y * 2), 3, 1) * 2)]), bump: 0.06, fuzz: 0.04 },
    { e: [-5.6, 5.6, -0.6, 2, 1, 1.3], col: 0x5a2812 }, { e: [5.6, 5.6, -0.6, 2, 1, 1.3], col: 0x5a2812 },
    { e: [-2.8, 3.2, 1.6, 2.4, 2.8, 2.8], col: hide }, { e: [2.8, 3.2, 1.6, 2.4, 2.8, 2.8], col: hide },
    { e: [0, 4.6, -0.6, 4.4, 4.2, 4.4], col: hide },
    { e: [0, 4.2, -3.6, 5, 4.6, 2.4], col: furD, fuzz: 0.45 },
  ], { v: 0.8, seed: 13, bump: 0.12 }, [
    { p: [0, -0.2, 7.9], s: [3.4, 0.8, 0.8], c: 0xe8b444, m: 'm' }, { p: [-1.5, 0.8, 7.9], s: [0.8, 2.4, 0.8], c: 0xd8a032, m: 'm' }, { p: [1.5, 0.8, 7.9], s: [0.8, 2.4, 0.8], c: 0xd8a032, m: 'm' },
  ]);
  // (round 9: the horns drawn apart from the head, as headwear: perf/bodysize.cjs measures him to the crown, horns aside)
  markHeadwear(rig, () => sculpt(rig, rig.head, [...horn(-1), ...horn(1)], { v: 0.8, seed: 14, bump: 0.12 }));
  rig.extras.muzzle = muzzle;
  applyShape(rig);
  rig.hunch = 0.32; rig.armSpread = 0.3;
  // (the aprons no longer swing with the thighs: the owner prefers them hanging still)
  rig.tick = (dt, e) => animateExtras(rig, dt, e);
  return rig;
}
