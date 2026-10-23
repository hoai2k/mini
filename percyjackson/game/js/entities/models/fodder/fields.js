// The fields' fodder: the karpos and the karpos slinger (grain spirits), and
// the Colchis bull calf.
import { Rig, PX } from '../../character.js';
import { QuadRig } from '../../quad.js';
import { paintPerson } from '../../mortals.js';
import { HS, skinMat, group, sway } from '../../parts.js';
import { kit, voxDensity, legScale, reshape, applyShape } from '../../voxkit.js';
import { markHeld, markHeadwear } from '../../rigContract.js';
import { C, dropAll, dropOne, hatOf, noShadow, flatQuad, mix } from './parts.js';
import { finish } from './behaviour.js';

// ---- karpos and karpos slinger -----------------------------------------------------
// (vox-ow-fodder, top left; vox-ow-fodder-2, top left) A gangly spirit of the
// grain, about 0.8 of a hero's height (round 9), its plume over his head: a straw hood over a dark face with two
// glowing green eyes, a great spray of ripe wheat ears and green blades
// fanning up behind the head (its silhouette in a crowd), a body of bound
// stalks with green leaves woven in, long straw arms bound with twine at the
// wrists ending in four long clawed fingers, and legs of bundled stalks with
// root toes. The slinger swings a twine sling with a glowing golden seed pod
// and carries a string of more at its belt.
const KG = { gold: 0xe0b050, goldL: 0xf8d878, goldD: 0xa8782a, straw: 0xd0a048, leaf: 0x3a8a2a, leafD: 0x1e5a1a, twine: 0x7a4a22, eye: 0x8aff3a, pod: 0xffc030 };
function karposSkin() {
  const { goldD, eye } = KG;
  return skinMat('karpos', (S) => paintPerson(S, { skin: 0x2a1c0c, eye: 0x140c04, eyeWhite: 0x140c04, brow: 0x2a1c0c, mouth: false, top: KG.gold, sleeve: KG.gold, hand: KG.gold, pants: goldD, shoes: false,
    face: (s, ey) => { s.rect(8, ey - 3, 8, 8, 0x1e1408, 0.1); for (const x of [9, 13]) { s.rect(x, ey - 0.5, 2, 2, eye, 0); s.dot(x + 0.5, ey, 0xe8ffb0, 1, 1); } s.rect(10, ey + 3, 4, 1, 0x0e0804, 0); } }), { emit: 1.6, scale: 1.05 });
}
export function buildKarpos(slinger = false) {
  const kind = slinger ? 'karpos_slinger' : 'karpos';
  const { gold, goldL, goldD, straw, leaf, leafD, twine, pod } = KG, STRAW = [gold, goldL, goldD, straw, 0xc89038], LEAF = [leaf, leafD, 0x5aa03a, 0x2a7a2a];
  const mat = karposSkin();
  // (round 9: the owner found them tiny. Measured without the wheat spray
  // (headwear, its own kit: perf/bodysize.cjs had counted the plume as body,
  // 0.68x Percy, where the body under it was 0.44x) a karpos now stands about
  // 0.8x Percy, a gangly fodder that reads at a distance in a swarm: rig scale
  // 0.74 → 1.27, the legs 8 → 10 pixels over the same root toes, its straw
  // and leaves in cells of a hero's voxel size (voxDensity), so a bigger
  // karpos is more cells, not bigger ones)
  const rig = new Rig({ material: mat, scale: 1.27, legH: 8, bodyH: 9, bodyW: 8, bodyD: 5.4, armW: 2.8, headS: 8, jacket: false });
  const L1 = 10, ANK = -6.9;
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1, legScale(8, L1, ANK), 1], [0, 0, 0], { ankle: ANK });
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  const D = voxDensity(rig), K = kit(rig, mat, { share: kind, seed: slinger ? 131 : 101, rough: 0.85, emit: 0.9, ao: 0.3, density: D });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  // body: a sheaf of bound stalks, leaves woven in, a straw fringe hanging over the hips
  K.vox(T, 0, 5, 0, 7.2, 8, 4.6, [goldD, goldD, 0x98682a], { j: 0.1 });
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, L = 9 + K.r() * 4; K.flare(T, Math.sin(a) * 3.9, 9 - L / 2, Math.cos(a) * 2.7, 1.5, L, 0.8, K.tone(STRAW, 0.14), a, 0.12 + K.r() * 0.1); }
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, L = 5 + K.r() * 4; K.flare(T, Math.sin(a) * 4.3, 3.4 - L / 2, Math.cos(a) * 3, 1.2, L, 0.5, K.tone(LEAF, 0.1), a, 0.3); }
  for (const y of [3.4, 7.6]) K.box(T, 0, y, 0, 8.4, 0.9, 6, twine);
  K.box(T, 0, 3.4, 3.05, 1.4, 1.6, 0.6, 0x5a3418);
  // the hood: a rounded straw cowl round a dark face, streaked in stalks, a fringe over the brow
  K.blob(Hd, [0, H8 * 0.52, -0.4], [H8 / 2 + 1.6, H8 / 2 + 1.5, H8 / 2 + 1.6], 0.9, (x) => mix(K, [STRAW[(Math.floor((x + 1) * 6) + 8) % 5]], 0.1),
    { lo: -0.78, run: [1, 1], keep: (x, y, z) => !(z > -0.1 && Math.abs(x) < 0.66 && y < 0.5) });
  for (let x = -H8 / 2 + 0.4; x <= H8 / 2; x += 1.1) K.box(Hd, x, H8 - 0.3 - Math.abs(x) * 0.2, H8 / 2 + 0.6, 1.2, 2.2 + K.r() * 1.4, 0.9, K.tone(STRAW, 0.12));
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) K.box(Hd, sx * (H8 / 2 + 0.4 - i * 0.3), 2 - i * 1.2, H8 / 2 + 0.3 - i * 0.3, 1.2, 2.6, 1, K.tone(STRAW, 0.12));
  // the face: big glowing green eyes and a grin in the dark
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.7, H8 * 0.52, H8 / 2 + 0.1, 2, 1.8, 0.3, KG.eye); K.box(Hd, sx * 1.5, H8 * 0.56, H8 / 2 + 0.25, 0.8, 0.7, 0.2, 0xe8ffb0); }
  K.box(Hd, 0, H8 * 0.24, H8 / 2 + 0.1, 4, 1, 0.3, 0x0e0804); for (const x of [-1.4, -0.4, 0.6, 1.5]) K.box(Hd, x, H8 * 0.24 + 0.25, H8 / 2 + 0.2, 0.5, 0.5, 0.2, 0xe8d8a0);
  // the spray of wheat ears fanning up behind the head: stalks, ears of zigzag grains with awns, green blades
  const KP = kit(rig, mat, { share: kind + ':plume', seed: slinger ? 132 : 102, rough: 0.85, emit: 0.9, ao: 0.3, density: D });   // (the plume: headwear, drawn apart so perf/bodysize.cjs can leave it out)
  KP.box(Hd, 0, H8 + 2.2, -0.4, 2.4, 1.4, 2.4, goldL); KP.box(Hd, 0, H8 + 3, -0.6, 1.2, 1.2, 1.2, gold);
  const ears = slinger ? 9 : 11;
  for (let i = 0; i < ears; i++) {
    const tilt = (i - (ears - 1) / 2) * (slinger ? 0.26 : 0.23), L = 6 + (1 - Math.abs(tilt)) * 4 + KP.r() * 2, z = -1.8 - (i % 3) * 1.6;
    const sx = Math.sin(tilt), cy = Math.cos(tilt), bx = sx * 2.6;
    KP.box(Hd, bx + sx * L / 2, H8 * 0.7 + cy * L / 2, z, 0.7, L, 0.7, goldD, 0, 0, -tilt);
    for (let k = 0; k < 5; k++) { const d = L + 0.8 + k * 1.3, w = k === 4 ? 1.2 : 1.5; for (const o of [-0.6, 0.6]) KP.box(Hd, bx + sx * (d + (o > 0 ? 0.6 : 0)) + o * cy, H8 * 0.7 + cy * (d + (o > 0 ? 0.6 : 0)) - o * sx, z, w, 1.6, 1.5, KP.tone(k > 2 ? [goldL, gold] : [gold, straw], 0.1), 0, 0, -tilt); }
    KP.box(Hd, bx + sx * (L + 8.2), H8 * 0.7 + cy * (L + 8.2), z, 0.4, 2.4, 0.4, goldL, 0, 0, -tilt);   // (the awn sunk into the last grain, round 9: it hung off it by a corner)
  }
  for (const [x, rz, L] of [[-5, 1.2, 8], [5, -1.2, 8], [-3.4, 0.7, 9], [3.6, -0.7, 9], [-1.4, 0.3, 10], [1.6, -0.3, 9], [0, 0, 7]]) KP.box(Hd, x - Math.sin(rz) * L * 0.3, H8 * 0.6 + Math.cos(rz) * L * 0.45, -1.4, 1.5, L, 0.5, KP.tone(LEAF, 0.1), 0, 0, rz);
  // long straw arms in bundles, bound at the wrist, big hands of four long clawed fingers
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -0.6, 0, 3.4, 3, 3.4, goldD);
    for (const [dx, dz] of [[-0.6, -0.5], [0.6, -0.5], [0, 0.6]]) K.box(arm, dx, -5.4, dz, 1.4, 8.4, 1.4, K.tone(STRAW, 0.12));
    K.box(arm, 0, -4, 0, 3, 0.7, 3, twine); K.box(arm, 0, -9.4, 0, 3.2, 1.1, 3.2, twine);
    K.box(arm, 0, -11, 0.2, 3, 2.2, 2.4, gold);
    // (each joint tips its lower end forward, a negative turn about x, so it meets the one above: turned the other way they curled back and the fingertips floated in front of the hand, perf/islands.cjs)
    for (const [dx, rz] of [[-1.2, 0.3], [-0.4, 0.1], [0.4, -0.1], [1.2, -0.3]]) { K.box(arm, dx, -13.4, 0.4, 0.7, 3.2, 0.7, straw, -0.15, 0, rz); K.box(arm, dx * 1.25, -15.4, 1.2, 0.6, 2, 0.6, gold, -0.7, 0, rz); K.box(arm, dx * 1.3, -16.2, 2.2, 0.45, 1, 0.45, 0x8a5a20, -1.2, 0, rz); }
    K.box(arm, -1.6, -11.6, 1, 0.6, 2.4, 0.6, straw, 0.4, 0, 0.6);
  }
  if (slinger) {
    // the sling: two cords from the right hand to a glowing pod; a string of pods at the belt
    // (a sling hangs: no point to aim; short enough that its swing clears the ground)
    const s = markHeld(group(rig.handR, 0, -1.4, 0));
    K.box(s, -0.4, -1.8, 0, 0.35, 3.6, 0.35, twine, 0, 0, 0.12); K.box(s, 0.4, -1.8, 0, 0.35, 3.6, 0.35, twine, 0, 0, -0.12);
    K.box(s, 0, -3.8, 0, 2.6, 1, 1.8, twine); K.box(s, 0, -3, 0, 2, 2, 2, pod); K.box(s, 0, -3, 0, 1.2, 2.6, 1.2, 0xfff0a0);
    sway(rig, s, 'x', 0.6, 7);
    for (const [x, y] of [[-2.6, 2.6], [-0.9, 2], [0.9, 2], [2.6, 2.6]]) { K.box(T, x, y, 3.1, 0.3, 1.2, 0.3, twine); K.box(T, x, y - 1.3, 3.2, 1.3, 1.3, 1.3, pod); }
    K.box(T, -2.6, 6, 0, 0.6, 9, 6.4, twine, 0, 0, 0.7);   // the sling's strap
  }
  // legs: bundled stalks bound at the knee, splaying into root toes
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    for (const [dx, dz] of [[-0.6, -0.4], [0.6, -0.4], [0, 0.6]]) K.box(leg, dx, -3.6, dz, 1.6, 7.4, 1.6, K.tone(STRAW, 0.12));
    K.box(leg, 0, -3.8, 0, 3.4, 0.9, 3.4, twine);
    for (const [dx, ry] of [[-1.1, 0.5], [0, 0], [1.1, -0.5]]) { K.box(leg, dx, -7.5, 1.4, 1, 0.9, 3.2, goldD, 0, ry, 0); K.box(leg, dx * 1.4, -7.7, 3, 0.7, 0.6, 1.2, 0x8a5a20, 0, ry, 0); }
    K.box(leg, 0, -7.6, -1.4, 0.9, 0.8, 2, goldD);
  }
  applyShape(rig);
  K.done(); markHeadwear(rig, () => KP.done());
  noShadow(rig, rig.armR, rig.armL, rig.legR, rig.legL);
  rig.hunch = 0.12; rig.armSpread = 0.45;
  return finish(rig, kind);
}

// ---- Colchis bull calf -----------------------------------------------------------
// (vox-ow-fodder-2, top right) A boxy bronze automaton bull calf, about a
// hero's height at the horns: big riveted bronze plates over a dark iron
// frame, round iron joints at shoulder and knee, two smoking vents on its
// back, a jointed iron tail with a bronze knob; a broad brown head with cream
// horns from bronze sockets, glowing orange eyes, a cream muzzle plate with
// glowing nostrils. It paws, then charges with a jet of fire.
// a riveted plate: a bronze slab with a lighter face, a dark lower lip and
// four gold rivets, facing out along x (side 1/-1), up (side 0) or forward
function plate(K, p, x, y, z, w, h, d, face, C) {
  // (the slab's outer face in hammered cells of the model's density, so a broad plate keeps a fine grain)
  K.vox(p, x, y, z, w, h, d, C.brz, { j: 0.06, faces: face === 'y' ? 't' : face === 'z' ? 'f' : face > 0 ? 'r' : 'l', relief: 0.08, out: 0.2 });
  if (face === 'y') { K.box(p, x, y + h / 2 + 0.1, z + 0.2, w - 0.8, 0.2, d - 1, C.brzL); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(p, x + a * (w / 2 - 0.5), y + h / 2 + 0.15, z + b * (d / 2 - 0.5), 0.5, 0.3, 0.5, C.gold); K.box(p, x, y - h / 2 + 0.1, z - d / 2 - 0.1, w, 0.5, 0.3, C.brzD); return; }
  if (face === 'z') { K.box(p, x, y + 0.2, z + d / 2 + 0.1, w - 0.8, h - 1, 0.2, C.brzL); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(p, x + a * (w / 2 - 0.5), y + b * (h / 2 - 0.5), z + d / 2 + 0.15, 0.5, 0.5, 0.3, C.gold); K.box(p, x, y - h / 2 + 0.25, z + d / 2 + 0.05, w, 0.5, 0.3, C.brzD); return; }
  const sx = face, fx = x + sx * (w / 2 + 0.1);
  K.box(p, fx, y + 0.2, z, 0.2, h - 1, d - 0.8, C.brzL);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(p, fx + sx * 0.05, y + a * (h / 2 - 0.5), z + b * (d / 2 - 0.5), 0.3, 0.5, 0.5, C.gold);
  K.box(p, fx - sx * 0.05, y - h / 2 + 0.25, z, 0.3, 0.5, d, C.brzD);
}
export function buildCalf() {
  // (darker than the old build: bronze-brown, copper and dark-iron plates in a
  // patchwork, dull brass rivets, nothing yellow)
  const C = { brz: [0x8a5a26, 0x6e4620, 0x94562c, 0x5e3c1c, 0x3a2e28], brzD: 0x34200e, brzL: 0xa0703a, gold: 0xb88840 };
  const iron = 0x2c221e, ironD = 0x1a120e, ironL = 0x3c3028, glow = 0xff8a1a, hot = 0xffd860, horn = 0xe8dcc0, hornD = 0xbcaa88, head = 0x5a3a22, headD = 0x3e2816, snout = 0xb8987a;
  const mat = skinMat('colchis_calf', flatQuad(0x7a5024, 0x3a2410, iron, glow), { rough: 0.4, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 2, bodyL: 12, bodyW: 8, bodyH: 7, legH: 7, legW: 3.2, headS: 5, snout: false, neckUp: -1.3, headZ: 2, gait: 1.2, ears: false, tail: 2, tailLen: 5, tailW: 1 });
  const K = kit(rig, mat, { share: 'colchis_calf', seed: 137, rough: 0.4, metal: 0.25, emit: 0.9, ao: 0.35, density: voxDensity(rig) / 1.25 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 5;
  dropAll(rig, T); dropAll(rig, Hd);
  // the iron frame, then overlapping riveted plates: a high shoulder, banded back, side panels
  K.box(T, 0, 0, 0, 7.4, 6.4, 11.4, iron); K.box(T, 0, -3.4, 0, 6, 0.8, 9.4, ironD);
  for (const sx of [-1, 1]) {
    plate(K, T, sx * 4.1, 1.4, 3.8, 1, 6, 3.6, sx, C); plate(K, T, sx * 4.4, 0.2, 0.2, 1, 5, 3, sx, C); plate(K, T, sx * 4, 0.8, -3.6, 1, 5.4, 3.6, sx, C);
    for (const z of [1.9, -1.6]) K.box(T, sx * 3.9, 0.6, z, 0.6, 6, 0.6, ironD); K.box(T, sx * 3.9, 3.6, 0, 0.6, 0.6, 11, ironD);
    K.box(T, sx * 4.2, -2.6, 1.8, 0.8, 1.4, 9, ironL); for (let z = -4; z <= 4.5; z += 1.6) K.box(T, sx * 4.6, -2.6, z, 0.3, 0.6, 0.6, C.gold);
  }
  for (const [y, z, w, d] of [[4.6, 3.8, 7.8, 3.2], [4.2, 0.9, 7.4, 2.8], [3.8, -1.9, 7, 2.8], [3.4, -4.6, 6.6, 2.6]]) { plate(K, T, 0, y, z, w, 1.4, d, 'y', C); K.box(T, 0, y - 0.3, z - d / 2 - 0.2, w - 0.4, 1, 0.6, ironD); }
  // the great rounded shoulder hump, rising above the head: rows of plates (bronze,
  // copper, dark iron) split by dark seams, studded with rivets
  const HUMP = [0x9a6a2e, 0x7a4e22, 0xa0602e, 0x8a5a26, 0x3e322a, 0x946a34];
  K.blob(T, [0, 3.4, 2.4], [5.3, 6, 5], 0.9, (x, y, z) => {
    const band = Math.floor((z + 1) * 2.2), row = Math.floor((y + 1) * 2.4);
    if ((z + 1) * 2.2 - band < 0.14) return ironD;
    if ((y + 1) * 2.4 - row < 0.12) return iron;
    if (K.r() < 0.06) return C.gold;
    return HUMP[(band * 3 + row * 2 + (x > 0 ? 1 : 0)) % HUMP.length];
  }, { lo: 0.02, pw: 2.3, run: [1, 3] });
  plate(K, T, 0, 0.6, 5.9, 7, 6, 0.8, 'z', C);
  K.box(T, 0, 0.2, 6.5, 3.6, 3, 0.4, ironD); for (const y of [-0.8, 0.2, 1.2]) K.box(T, 0, y, 6.7, 3, 0.5, 0.3, y > 0.5 ? hot : glow);   // the furnace grille
  K.box(T, 0, 1.4, -5.8, 6.8, 5, 0.6, mix(K, C.brz)); K.box(T, 0, 1.4, -6.1, 2.4, 2.4, 0.4, ironD);
  // two smoking vents on the back
  const vents = group(T, 0, 4.8, -2.9);
  for (const sx of [-1, 1]) { K.box(vents, sx * 1.8, 0.8, 0, 1.4, 2.4, 1.4, iron); K.box(vents, sx * 1.8, 2.1, 0, 1.8, 0.4, 1.8, C.brzD); K.box(vents, sx * 1.8, 2.25, 0, 0.9, 0.2, 0.9, 0x1a1210); K.box(vents, sx * 1.8, 0.2, 0, 2, 0.5, 2, C.gold); }
  rig.extras.vents = vents;
  // head: a broad brown head under a bronze brow plate, glowing eyes, a cream muzzle, curving horns from bronze sockets
  const hz = hs * 0.35, fz = hz + hs / 2;
  K.blob(Hd, [0, 0, hz], [hs / 2 + 0.8, hs / 2 + 0.2, hs / 2 + 0.2], 0.8, () => [head, headD, 0x5a3a20][Math.floor(K.r() * 3)], { pw: 3, run: [1, 2] }); for (const sx of [-1, 1]) plate(K, Hd, sx * (hs / 2 + 0.6), -0.4, hz + 0.6, 0.8, 2.6, 2.8, sx, C);
  K.box(Hd, 0, hs * 0.44, hz + 0.2, hs + 1.4, 1.4, hs + 0.4, mix(K, C.brz)); K.box(Hd, 0, hs * 0.44 + 0.3, fz + 0.4, hs - 1, 1, 0.4, C.brzL);
  for (const x of [-2.4, -0.8, 0.8, 2.4]) K.box(Hd, x, hs * 0.44 + 0.75, hz + 0.2, 0.4, 0.3, 0.4, C.gold);
  K.box(Hd, 0, -1.4, fz + 0.9, hs - 1, 3.4, 1.8, snout); K.box(Hd, 0, -2.9, fz + 0.7, hs - 2, 1, 1.4, 0x8a6a50); K.box(Hd, 0, 0.4, fz + 0.5, hs - 2.4, 0.8, 1, 0x8a6a50);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 1.1, -1.4, fz + 1.85, 1, 1.2, 0.3, ironD); K.box(Hd, sx * 1.1, -1.6, fz + 1.95, 0.6, 0.6, 0.3, glow);
    K.box(Hd, sx * 2.3, 1, fz + 0.05, 1.8, 1.3, 0.4, ironD); K.box(Hd, sx * 2.3, 1, fz + 0.2, 1.4, 0.9, 0.3, glow); K.box(Hd, sx * 2.1, 1.15, fz + 0.3, 0.6, 0.5, 0.2, hot);
    K.box(Hd, sx * (hs / 2 + 0.9), hs * 0.4, hz, 1.8, 2.2, 2.2, C.brzD); K.box(Hd, sx * (hs / 2 + 1.5), hs * 0.4, hz, 0.6, 1.6, 1.6, C.gold);
    for (const [x, y, z, w, h, d, col, rz] of [[2.4, 0.3, 0.2, 2.6, 1.7, 1.7, horn, 0.15], [4.3, 0.9, 0.4, 1.8, 1.5, 1.5, horn, 0.35], [5.2, 2.2, 0.6, 1.4, 1.8, 1.3, hornD, -0.1], [5.4, 3.7, 0.8, 1.1, 1.6, 1.1, horn, -0.25], [5.3, 4.9, 1, 0.8, 1, 0.8, 0xf4ecdc, -0.4]]) K.box(Hd, sx * (hs / 2 + x), hs * 0.4 + y, hz + z, w, h, d, col, 0, 0, sx * rz);
    K.box(Hd, sx * (hs / 2 + 0.3), hs * 0.1, hz - 1.4, 0.6, 2.2, 1.6, mix(K, C.brz));
  }
  rig.extras.nose = group(Hd, 0, -1.8, fz + 2.2);
  K.box(M, 0, -1, 1.6, hs - 2, 1.2, 2.2, head); K.box(M, 0, -1.6, 1.8, hs - 2.4, 0.4, 1.8, C.brzD);
  // legs: bronze thigh plates with rivets, round iron knees, shin guards, banded dark hooves
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    const sd = leg.userData.side;
    K.box(leg, 0, -1.4, 0, 3.6, 3.8, 3.8, mix(K, C.brz)); K.box(leg, sd * 1.9, -1.4, 0, 0.4, 3, 3, C.brzL); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(leg, sd * 2.1, -1.4 + a * 1.2, b * 1.2, 0.3, 0.5, 0.5, C.gold);
    K.box(leg, 0, -3.7, 0, 3, 1.6, 3, ironD); K.box(leg, 0, -3.7, 0, 3.4, 1, 2, ironL); K.box(leg, sd * 1.75, -3.7, 0, 0.3, 0.9, 0.9, C.gold);
    K.box(leg, 0, -5.2, 0, 2.5, 2, 2.5, iron); K.box(leg, 0, -5, 1.3, 2.2, 1.8, 0.5, mix(K, C.brz));
    K.box(leg, 0, -6.4, 0.2, 3.4, 0.6, 3.6, C.gold); K.box(leg, 0, -7, 0.2, 3.2, 0.8, 3.4, ironD); K.box(leg, 0, -7, 1.9, 0.5, 0.8, 0.3, 0x120c08);
  }
  for (const s of rig.tail) dropAll(rig, s);
  K.box(rig.tail[0], 0, 0, -1.4, 0.9, 0.9, 2.8, iron); K.box(rig.tail[0], 0, 0, -2.8, 1.3, 1.3, 0.8, C.gold); K.box(rig.tailTip, 0, 0, -1.6, 0.8, 0.8, 2.6, iron); K.box(rig.tailTip, 0, 0, -3.2, 1.8, 1.8, 1.4, C.brzL); K.box(rig.tailTip, 0, 0, -3.2, 1.2, 2.2, 0.8, C.gold);
  K.done();
  rig.head.scale.setScalar(1.18);   // a heavy head, held low under the hump
  noShadow(rig, M, rig.tailTip, rig.tail[0], ...rig.legs);
  return finish(rig, 'colchis_calf');
}
