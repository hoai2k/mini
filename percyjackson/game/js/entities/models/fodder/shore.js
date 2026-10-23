// The shore's fodder: the crab and the rare king crab.
import { PX } from '../../character.js';
import { QuadRig } from '../../quad.js';
import { skinMat, group } from '../../parts.js';
import { kit, voxDensity } from '../../voxkit.js';
import { keepAbove } from '../../rigContract.js';
import { dropAll, noShadow, flatQuad, mix } from './parts.js';
import { finish } from './behaviour.js';

// ---- crab -----------------------------------------------------------------------------
// (vox-ow-fodder, bottom left) A shore crab a little wider than a hero is
// tall: a domed red shell with an orange rim, crusted with white barnacles
// and hung with green weed, a cream face, two eyes on stalks with glowing
// orange tips, two big orange claws with cream teeth held out in front (the
// lower fingers are the rig's jaw: the bite snaps them), and eight jointed
// legs. It scuttles sideways and turns to face you to pinch.
export function buildCrab() {
  const P = { red: 0xd04020, redM: 0xb83218, redD: 0x8a1e10, org: 0xf08a3a, orgL: 0xffa860, pale: 0xf8d0a8, tip: 0x2a1410, barn: 0xf0ece0, barnL: 0xfffaf0, barnD: 0x9a9284 };
  const cream = 0xf8e4c0, eyeT = 0xffa020, SHELL = [0xd04020, 0xc03418, 0xe0502a, 0xa82a14], RIM = [0xf08a3a, 0xe8702a, 0xffa050], BEIGE = [0xf0d8b0, 0xe0c498, 0xd0b088];
  const CLAW = [0xe04a24, 0xd0381c], CLAWM = [0xf06a30, 0xff7a3a], CLAWL = [0xff9a50, 0xffb070], WEED = [0x2a8a4a, 0x1a5a2a, 0x3a9a5a];
  const mat = skinMat('crab', flatQuad(P.red, P.redD, cream, 0x0a0a0a), { rough: 0.45, emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: 1.65, bodyL: 8, bodyW: 12, bodyH: 5, legH: 5, legW: 1.5, headS: 4, legs: 8, splay: 0.01, legSpread: -2.4, snout: false, neckUp: -1.6, headZ: -0.4, gait: 2.4, ears: false, jawOpen: 0.15 });
  const K = kit(rig, mat, { share: 'crab', seed: 109, rough: 0.45, emit: 0.85, ao: 0.3 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth;
  dropAll(rig, T); dropAll(rig, Hd);
  const clawCol = (y) => mix(K, y > 0.3 ? CLAW : y > -0.35 ? CLAWM : CLAWL, 0.1);
  // a pale underside, an orange rim and a domed red shell, mottled darker on top
  K.blob(T, [0, -0.4, 0.4], [5, 2.8, 3.8], 1, () => mix(K, BEIGE, 0.1), { hi: 0.4, run: [1, 3] });
  K.blob(T, [0, 0.4, 0], [6.8, 1, 4.8], 1, () => mix(K, RIM, 0.1), { run: [1, 3] });
  K.blob(T, [0, 0.8, 0], [6.4, 4.8, 4.6], 0.9, (x, y) => (y < 0.2 ? mix(K, RIM, 0.1) : K.r() < 0.15 ? P.redD : mix(K, SHELL, 0.12)), { lo: 0, run: [1, 2] });
  const dome = (a, e) => [6.4 * Math.cos(e) * Math.sin(a), 0.8 + 4.8 * Math.sin(e), 4.6 * Math.cos(e) * Math.cos(a)];
  for (const [a, e, sz] of [[0.6, 0.6, 1.2], [-0.9, 0.7, 1.1], [2.2, 0.6, 1.2], [-2.4, 0.5, 1.1], [0, 1.1, 1], [1.5, 0.9, 0.9]]) { const [x, y, z] = dome(a, e); barnacle(K, T, x, y, z, sz, P); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.2, L = 1.6 + K.r() * 2.6; K.box(T, Math.sin(a) * 6.6, 0.2 - L / 2, Math.cos(a) * 4.7, 0.8, L, 0.5, mix(K, WEED, 0.1)); }
  // the face under the front edge: a dark mouth and pale mouth parts
  K.box(T, 0, -0.6, 4.1, 3, 1, 0.4, P.tip); for (const sx of [-1, 1]) K.box(T, sx * 1.3, -1.4, 4, 1, 1.2, 0.5, cream);
  // eyes on stalks with glowing tips
  for (const sx of [-1, 1]) { K.box(T, sx * 1.6, 5, 3, 0.8, 3.4, 0.8, P.redD, 0.15); K.box(T, sx * 1.6, 7, 3.3, 1.4, 1.4, 1.4, P.tip); K.box(T, sx * 1.6, 7.1, 3.75, 1, 1, 0.6, eyeT); }
  // the claws, held out in front: an arm, a round palm and a fixed upper finger; the jaw carries the lower fingers
  M.position.set(0, -1.6 * PX, 4.2 * PX);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 4.4, 0, 0.2, 2.2, 2.2, 3.4, P.redM, 0, sx * -0.3, 0); K.box(Hd, sx * 5.2, 0.2, 1.8, 2.6, 2.6, 1, P.org);
    K.blob(Hd, [sx * 5.8, 0.4, 4.4], [3, 3.4, 3.6], 0.9, (x, y) => clawCol(y), { run: [1, 2] });
    for (const [y, z, w, h, d, col] of [[1.2, 8, 2.4, 2.2, 2.4, CLAWM], [0.6, 9.8, 1.8, 1.8, 1.8, CLAWL], [-0.3, 11, 1.2, 1.4, 1.2, [cream]]]) K.box(Hd, sx * 5.8, y, z, w, h, d, mix(K, col, 0.08));
    for (const z of [7.6, 9.2]) K.box(Hd, sx * 5.8, -0.1, z, 0.9, 0.9, 0.7, cream);
    barnacle(K, Hd, sx * 6.8, 2.6, 4, 1, P);
    for (const [y, z, w, h, d, col] of [[-0.3, 5.6, 2, 1.6, 2.4, CLAWM], [0, 7.4, 1.4, 1.3, 1.6, CLAWL], [0.6, 8.4, 1, 1.1, 1, [cream]]]) K.box(M, sx * 5.8, y, z, w, h, d, mix(K, col, 0.08));
    K.box(M, sx * 5.8, 0.8, 6.6, 0.8, 0.8, 0.6, cream);
  }
  crabLegs(K, rig, P);
  K.done();
  noShadow(rig, M, ...rig.legs);
  rig.sideways = true;
  finish(rig, 'crab');
  keepAbove(rig, rig.head);   // (the claws ride the head: it pitches up rather than drive them into the floor)
  return rig;
}
// eight legs at the sides: up and out to a knee, then down in tapering
// segments to a pointed tip, red over orange with a pale underside
function crabLegs(K, rig, P, spikes = 0) {
  // each leg arches out from the shell to a high knee, then reaches down and
  // out to a dark pointed tip on the ground (the sheets' spider-like stance),
  // in segments with pale joints and a pale stripe along the top
  const seg = (p, a, b, w, col, stripe = true) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), rz = Math.atan2(dy, dx);
    K.box(p, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, L + w * 0.3, w, w, col, 0, 0, rz);
    if (stripe) K.box(p, (a[0] + b[0]) / 2 - Math.sin(rz) * w * 0.45, (a[1] + b[1]) / 2 + Math.cos(rz) * w * 0.45, 0, L * 0.7, w * 0.25, w * 0.55, P.pale, 0, 0, rz);
  };
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    const s = leg.userData.side, row = leg.userData.row, L = rig.dims.legH, w = rig.dims.legW;
    leg.rotation.y = -s * (0.75 - row * 0.5);
    const X = (v) => s * v, knee = [X(L * 0.62), L * 0.42], ank = [X(L * 0.98), -L * 0.42], tip = [X(L * 1.06), -L + 0.2];
    seg(leg, [X(0.6), 0.4], knee, w + 0.3, row % 2 ? P.red : P.redM);
    K.box(leg, knee[0], knee[1], 0, w + 0.7, w + 0.7, w + 0.7, P.org);
    seg(leg, knee, ank, w, row % 2 ? P.redM : P.red);
    K.box(leg, ank[0], ank[1], 0, w + 0.3, w + 0.3, w + 0.3, P.org);
    seg(leg, ank, [tip[0] - X(0.1), tip[1] + 1.2], w * 0.7, P.org, false);
    K.box(leg, tip[0], tip[1] + 0.9, 0, w * 0.4, 1.2, w * 0.4, P.tip);   // (a pointed tip clear of the floor: a wide end's corner dipped through it in the walk)
    for (let k = 0; k < spikes; k++) K.box(leg, knee[0] + X(0.4 + k * 1.2), knee[1] + 0.9 - k * 0.6, 0, 0.5, 0.8, 0.5, P.pale, 0, 0, -s * 0.5);
  }
}
// a barnacle: a pale knobbed cone with a dark mouth on top
function barnacle(K, p, x, y, z, sz, P) {
  K.box(p, x, y, z, sz, sz * 0.8, sz, mix(K, [P.barn, P.barnL], 0.08)); K.box(p, x, y + sz * 0.45, z, sz * 0.62, sz * 0.25, sz * 0.62, P.barnD); K.box(p, x, y + sz * 0.5, z, sz * 0.3, sz * 0.2, sz * 0.3, 0x2a2420);
  K.box(p, x, y - sz * 0.1, z, sz * 1.3, sz * 0.35, sz * 0.5, P.barn); K.box(p, x, y - sz * 0.1, z, sz * 0.5, sz * 0.35, sz * 1.3, P.barnL);
}

// ---- king crab ------------------------------------------------------------------------------
// (vox-ow-fodder-fix, bottom row) A hulking crab twice a hero's height: a
// shell like a mossy hill, crusted with barnacles, sprouting red coral and
// hung all round with kelp, over a round pale underside; eyestalks with
// glowing orange tips, red-and-orange legs; one giant crusher claw, red
// fading to orange with cream teeth, held out low in front and raised high
// when it attacks (then slammed down), and a smaller second claw.
export function buildKingCrab() {
  const P = { red: 0xc8341a, redM: 0xb02a16, redD: 0x7a1e10, org: 0xf06a30, orgL: 0xff9a50, pale: 0xf8c8a0, tip: 0x3a1a10, barn: 0xe8e0d0, barnL: 0xfff8ec, barnD: 0x9a9080 };
  const cream = 0xf8e4c0, creamD = 0xe0c098, eyeT = 0xffa020;
  const MOSS = [0x4a7a2a, 0x6a8a3a, 0x3a6a2a, 0x5a8a3a, 0x7a9a4a, 0x2e5a26], DIRT = [0x8a7a5a, 0x6a5a40, 0x9a8a6a], KELP = [0x2a8a5a, 0x1a5a3a, 0x3a9a7a, 0x2a7a2a, 0x1e6a5a];
  const BEIGE = [0xe0c8a0, 0xd0b088, 0xc8a070, 0xf0dcb8, 0xb89060], CLAW = [0xd0381c, 0xb82a14, 0xe04a24], CLAWM = [0xf06a30, 0xe85a28, 0xff7a3a], CLAWL = [0xff9a50, 0xffb070, 0xf8c090];
  const mat = skinMat('king_crab', flatQuad(P.red, P.redD, cream, eyeT), { rough: 0.5, emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: 4.5, bodyL: 9, bodyW: 12, bodyH: 6, legH: 6.4, legW: 1.5, headS: 4, legs: 8, splay: 0.01, legSpread: -3, snout: false, neckUp: -1, headZ: -0.6, gait: 1.3, ears: false, jawOpen: 0.1 });
  const K = kit(rig, mat, { share: 'king_crab', seed: 149, rough: 0.5, emit: 0.85, ao: 0.35, density: voxDensity(rig) / 1.25 });   // (1.25 hero pixels a cell, to keep its triangle budget)
  const T = rig.torso, Hd = rig.head, M = rig.mouth;
  const mix = (K, cols) => cols[Math.floor(K.r() * cols.length)];   // (flat tones, so runs of the hero-sized cells merge)
  dropAll(rig, T); dropAll(rig, Hd);
  const clawCol = (y) => mix(K, y > 0.35 ? CLAW : y > -0.3 ? CLAWM : CLAWL, 0.1);
  // the round pale underside, a red rim, and the hill of a shell: moss over red, with patches of bare dirt
  K.blob(T, [0, 0, 0.6], [6.6, 4.8, 5.4], 1.1, () => mix(K, BEIGE, 0.1), { hi: 0.3, run: [1, 3] });
  K.blob(T, [0, 1.2, -0.2], [8.6, 1.4, 7], 1, () => mix(K, [P.red, P.redM, P.org], 0.1), { run: [1, 3] });
  K.blob(T, [0, 1.6, -0.3], [8.2, 6, 6.8], 0.9, (x, y) => (y < 0.22 ? mix(K, K.r() < 0.5 ? [P.red, P.redM] : MOSS, 0.1) : K.r() < 0.12 ? mix(K, DIRT) : K.r() < 0.03 ? (K.r() < 0.5 ? 0xffd040 : 0xff5a3a) : mix(K, MOSS, 0.16)), { lo: 0, run: [1, 2] });
  const dome = (a, e) => [8.2 * Math.cos(e) * Math.sin(a), 1.6 + 6 * Math.sin(e), -0.3 + 6.8 * Math.cos(e) * Math.cos(a)];
  K.clumps(T, [0, 5.4, -0.3], [11, 4, 9.4], { n: 7, size: [1, 1.8], cols: [...MOSS, ...DIRT], faces: 't', out: -0.3, keep: (x, y, z) => (x / 8) ** 2 + (z / 6.6) ** 2 < 0.55 });
  for (const [a, e, sz] of [[0.3, 0.5, 1.8], [-0.6, 0.35, 1.6], [1.2, 0.3, 1.7], [-1.4, 0.4, 1.8], [2.2, 0.45, 1.5], [-2.4, 0.3, 1.6], [3, 0.5, 1.4], [0.9, 0.95, 1.6], [-1, 1, 1.5], [2.6, 0.95, 1.4], [-0.1, 1.25, 1.3], [1.7, 0.7, 1.3], [-1.9, 0.75, 1.4], [0.5, 0.2, 1.4], [-0.3, 0.75, 1.2]]) { const [x, y, z] = dome(a, e); barnacle(K, T, x, y, z, sz, P); }
  for (const [a, e] of [[1.9, 0.9], [-2.1, 1], [0.2, 1.1]]) { const [x, y, z] = dome(a, e); K.box(T, x, y + 1.2, z, 0.6, 2.6, 0.6, 0xe8503a); K.box(T, x + 0.8, y + 2.2, z, 0.5, 1.6, 0.5, 0xff6a4a, 0, 0, -0.6); K.box(T, x - 0.7, y + 2, z + 0.2, 0.5, 1.4, 0.5, 0xe8503a, 0, 0, 0.6); K.box(T, x + 1.3, y + 3, z, 0.4, 0.4, 0.4, 0xff8a6a); }
  // kelp hanging all round the rim
  for (let i = 0; i < 56; i++) { const a = i / 56 * Math.PI * 2 + K.r() * 0.08, L = 3 + K.r() * 6, x = Math.sin(a) * 8.5, z = -0.2 + Math.cos(a) * 6.9, col = mix(K, KELP); K.box(T, x, 1.4 - L * 0.3, z, 0.55, L * 0.6, 0.45, col); K.box(T, x + (K.r() - 0.5) * 0.6, 1.4 - L * 0.75, z, 0.5, L * 0.5, 0.45, col); if (K.r() < 0.4) K.box(T, x, 1.4 - L, z, 0.7, 0.7, 0.5, mix(K, KELP)); }   // (kelp strands a hero pixel wide)
  // the face: a dark mouth slot and mouth parts under the rim
  K.box(T, 0, -0.2, 5.7, 3.6, 1.2, 0.6, 0x3a1a10); for (const sx of [-1, 1]) K.box(T, sx * 1.6, -1.2, 5.6, 1.2, 1.6, 0.8, creamD);
  // eyestalks with glowing tips
  for (const sx of [-1, 1]) { K.box(T, sx * 2, 7.6, 3.6, 1, 5, 1, P.redD, 0.15); K.box(T, sx * 2, 8, 3.7, 1.3, 0.5, 1.3, P.red, 0.15); K.box(T, sx * 2, 10.4, 4, 1.6, 1.6, 1.6, P.tip); K.box(T, sx * 2, 10.5, 4.45, 1.1, 1.1, 0.8, eyeT); }
  // the crusher, on a jointed arm: held out low in front, raised high to attack
  const arm = group(Hd, -5.4, -1.6, 0.4);
  K.box(arm, 0.6, 0.4, 0.6, 3, 3, 3.6, P.red); K.box(arm, 0.2, 0, 2.6, 3.4, 3.4, 1.2, P.org);
  K.blob(arm, [0, -1, 7], [3.8, 4.4, 5.6], 1, (x, y) => (K.r() < 0.04 ? cream : clawCol(y)), { run: [1, 2] });
  for (const [y, z] of [[2.6, 5.4], [2, 8.4], [0.2, 3.8]]) barnacle(K, arm, -3.4, y, z, 1.6, P);
  // the fixed upper finger, curving down to a point, with cream teeth
  for (const [y, z, w, h, d, col] of [[0.6, 12.2, 3.6, 3.4, 3, CLAWM], [-0.2, 14.4, 3, 3, 2.6, CLAWM], [-1.4, 16.2, 2.4, 2.6, 2.2, CLAWL], [-2.9, 17.3, 1.8, 2.2, 1.8, [cream]], [-4.2, 17.6, 1.2, 1.6, 1.2, [cream]]]) K.box(arm, 0, y, z, w, h, d, mix(K, col, 0.08));
  for (const z of [11, 12.8, 14.6]) K.box(arm, 0, -1.4 - (z - 11) * 0.1, z, 1.4, 1.4, 1, cream);
  // the movable lower finger
  const lo = group(arm, 0, -4.4, 10.4);
  for (const [y, z, w, h, d, col] of [[-0.6, 1, 3.2, 2.4, 3, CLAWM], [-0.4, 3.4, 2.6, 2.2, 2.4, CLAWL], [0.2, 5.4, 2, 2, 2, CLAWL], [1.2, 6.8, 1.4, 1.8, 1.4, [cream]]]) K.box(lo, 0, y, z, w, h, d, mix(K, col, 0.08));
  for (const z of [1.2, 3, 4.8]) K.box(lo, 0, 0.9, z, 1.1, 1.2, 0.9, cream);
  arm.scale.setScalar(0.9);
  rig.extras.crusherArm = arm; rig.extras.crusher = lo;
  // the smaller claw; its lower finger rides the jaw
  K.box(Hd, 4.6, -0.6, 0.4, 2.4, 2.4, 3, P.red, 0, -0.3, 0);
  K.blob(Hd, [6, -1.6, 3.8], [2.6, 3, 3.4], 1, (x, y) => clawCol(y), { run: [1, 2] });
  for (const [y, z, w, h, d, col] of [[-0.6, 7.4, 2.4, 2.2, 2.2, CLAWM], [-1.2, 9, 1.8, 1.8, 1.8, CLAWL], [-2.1, 10, 1.2, 1.4, 1.2, [cream]]]) K.box(Hd, 6, y, z, w, h, d, mix(K, col, 0.08));
  barnacle(K, Hd, 6.6, 1.4, 3.4, 1.3, P);
  M.position.set(0, -2.6 * PX, 3.8 * PX);
  for (const [y, z, w, h, d, col] of [[-0.8, 3.6, 2, 1.6, 2.4, CLAWM], [-0.4, 5.4, 1.4, 1.4, 1.6, CLAWL], [0.3, 6.4, 1, 1.2, 1, [cream]]]) K.box(M, 6, y, z, w, h, d, mix(K, col, 0.08));
  crabLegs(K, rig, P, 2);
  K.done();
  noShadow(rig, M, ...rig.legs);
  finish(rig, 'king_crab');
  keepAbove(rig, rig.head);   // (the claws ride the head: it pitches up rather than drive them into the floor)
  return rig;
}
