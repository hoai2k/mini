// The labyrinth's fodder: the Daedalus drone.
import { Rig } from '../../character.js';
import { paintPerson } from '../../mortals.js';
import { HS, skinMat, group } from '../../parts.js';
import { kit } from '../../voxkit.js';
import { dropAll, noShadow, mix } from './parts.js';
import { finish } from './behaviour.js';

// ---- Daedalus drone ---------------------------------------------------------------------------
// (vox-ow-fodder-3, middle left) A bronze clockwork eagle as tall as a hero,
// on great spread wings of bronze and dark-steel feather plates with round
// joints at the wrists: a riveted bronze body, a glowing blue core ringed in
// steel on its breast (the accent), a crested eagle's head with a hooked gold
// beak and blue lens eyes, gold talons. It hovers and fires blue bolts.
export function buildDrone() {
  const brz = 0xc8902e, brzD = 0x6a4618, brzL = 0xf0c048, brzM = 0xa87424, steel = 0x6a6a74, steelD = 0x2e2e36, steelL = 0x9a9aa4, blue = 0x5ad8ff, blueL = 0xd0f8ff, gold = 0xf8d060;
  const BRZ = [brz, brzM, 0xb88028], FEATH = [brz, brzM, brzL, 0x8a6a3a], FDARK = [brzD, 0x4a3a2e, 0x5a4a3a];
  const mat = skinMat('daedalus_drone', (S) => paintPerson(S, { skin: brz, eye: blue, eyeWhite: blue, brow: brzD, mouth: false, top: brz, sleeve: brz, hand: brz, pants: brzD, shoes: false }), { rough: 0.35, emit: 1 });
  const rig = new Rig({ material: mat, scale: 1.55, legH: 7, bodyH: 11, bodyW: 9, bodyD: 7, armW: 2, headS: 7, jacket: false });
  const K = kit(rig, mat, { share: 'daedalus_drone', seed: 163, rough: 0.35, metal: 0.3, emit: 0.9, ao: 0.3 });
  const T = rig.torso, Hd = rig.head, H7 = 8 * HS * 7 / 8;
  dropAll(rig, T); dropAll(rig, Hd); dropAll(rig, rig.armR); dropAll(rig, rig.armL);
  // the body: a rounded barrel of bronze plates in bands, a steel-ringed blue core in the breast
  K.blob(T, [0, 5.6, 0], [4.6, 5.8, 3.8], 0.9, (x, y) => (Math.floor((y + 1) * 4.5) % 2 ? mix(K, BRZ, 0.1) : mix(K, [brzD, brzM], 0.1)), { pw: 2.4, run: [2, 4] });
  for (const [x, y, w, h] of [[0, 8.4, 5.6, 1], [0, 3.4, 5.6, 1], [-2.6, 5.9, 1, 4], [2.6, 5.9, 1, 4], [-2, 7.8, 1.2, 1.2], [2, 7.8, 1.2, 1.2], [-2, 4, 1.2, 1.2], [2, 4, 1.2, 1.2]]) K.box(T, x, y, 3.9, w, h, 0.8, steel);
  K.box(T, 0, 5.9, 3.8, 4.4, 4, 0.6, steelD); K.box(T, 0, 5.9, 4.1, 3, 3, 0.5, blue); K.box(T, 0, 5.9, 4.3, 1.8, 1.8, 0.4, blueL); for (const [x, y] of [[-2.6, 8.4], [2.6, 8.4], [-2.6, 3.4], [2.6, 3.4]]) K.box(T, x, y, 4.35, 0.5, 0.5, 0.3, gold);
  for (const sx of [-1, 1]) { K.box(T, sx * 4.2, 9, 0, 2.6, 2.6, 2.6, steel); K.box(T, sx * 5.4, 9, 0, 0.5, 1.6, 1.6, steelD); K.box(T, sx * 5.6, 9, 0, 0.4, 0.7, 0.7, blue); }
  // tail: a fan of stepped bronze plates
  for (let i = -3; i <= 3; i++) { K.box(T, i * 1.3, 0.6, -4.8, 1.3, 0.7, 6.4 - Math.abs(i) * 0.5, i % 2 ? brzD : brzL, 0.6, i * 0.16, 0); K.box(T, i * 1.3 + Math.sin(i * 0.16) * -3.4, -1.6, -7.8 + Math.abs(i) * 0.3, 1.3, 0.7, 1.4, steelD, 0.6, i * 0.16, 0); }
  // head: a crested eagle's head, blue lens eyes ringed in steel, a hooked gold beak
  K.blob(Hd, [0, H7 / 2, 0.2], [H7 / 2, H7 / 2, H7 / 2], 0.8, (x, y) => (y > 0.5 ? mix(K, [brzL, brz], 0.1) : mix(K, BRZ, 0.1)), { pw: 2.4, run: [1, 3] });
  K.box(Hd, 0, H7 * 0.68, H7 / 2 + 0.3, H7 + 0.4, 1.2, 1, brzD);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.9, H7 * 0.5, H7 / 2 + 0.3, 2.2, 2, 0.6, steel); K.box(Hd, sx * 1.9, H7 * 0.5, H7 / 2 + 0.55, 1.4, 1.2, 0.4, blue); K.box(Hd, sx * 1.7, H7 * 0.55, H7 / 2 + 0.75, 0.6, 0.5, 0.2, blueL); }
  for (const [y, z, w, h, d, rx] of [[H7 * 0.36, H7 / 2 + 1.4, 2.6, 2.2, 2.4, 0], [H7 * 0.24, H7 / 2 + 2.9, 2, 2, 1.6, 0.35], [H7 * 0.06, H7 / 2 + 3.6, 1.4, 1.8, 1.2, 0.7], [-0.4, H7 / 2 + 3.6, 0.8, 1.2, 0.8, 0.9]]) K.box(Hd, 0, y, z, w, h, d, z > H7 / 2 + 3.4 ? brzD : gold, rx);
  for (let i = 0; i < 5; i++) K.box(Hd, (i - 2) * 1.1, H7 + 0.8 + (2 - Math.abs(i - 2)) * 0.7, -0.6 - Math.abs(i - 2) * 0.3, 0.8, 3, 1.6, i % 2 ? brzL : brz, -0.4, 0, (i - 2) * -0.25);
  for (let i = 0; i < 3; i++) K.box(Hd, 0, H7 * 0.6 - i * 1.4, -H7 / 2 - 0.6 - i * 0.4, H7 - 1 - i, 1.2, 1.6, mix(K, FEATH, 0.1), 0.5);
  rig.extras.muzzle = group(T, 0, 6, 5);
  // legs: steel thighs, round knee joints, bronze shins, gold talons with dark points
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    K.box(leg, 0, -1.6, 0, 2.8, 3.4, 2.8, brzD); K.box(leg, 0, -3.6, 0, 2.6, 2, 2.6, steel); K.box(leg, 0, -3.6, 0, 3, 1.2, 1.2, steelD);
    K.box(leg, 0, -5.2, 0, 1.6, 2.4, 1.6, brz);
    for (const [dz, ry] of [[1.4, -0.35], [1.6, 0], [1.4, 0.35], [-1.2, Math.PI]]) { const cz = Math.cos(ry), sz = Math.sin(ry); K.box(leg, sz * 1.2, -6.6, cz * 1.2 * (dz > 0 ? 1 : 1), 0.7, 0.8, 2, gold, 0, ry, 0); K.box(leg, sz * 2.3, -6.9, cz * 2.3, 0.5, 0.7, 0.7, 0x3a2a10, 0.5, ry, 0); }
  }
  // wings: raised and spread; a jointed bone, covert plates in two layers, long stepped primaries
  const W = [];
  for (const side of [-1, 1]) {
    const root = group(T, side * 4.2, 9.4, -1.4), elbow = group(root, side * 9, 0, 0), X = (v) => side * v;
    K.box(root, X(4.5), 0, 0, 9, 1.8, 1.8, brzD); K.box(root, X(4.5), 0.9, 0.2, 8, 0.5, 1.4, gold);
    K.box(root, X(9), 0, 0, 2.8, 2.8, 2.8, steel); K.box(root, X(9), 0, 1.5, 1.6, 1.6, 0.4, steelD); K.box(root, X(9), 0, 1.7, 0.7, 0.7, 0.3, steelL);
    for (let i = 0; i < 6; i++) { const L = 7 + i * 0.9, x = X(1.4 + i * 1.4); K.box(root, x, -L / 2, -0.5, 1.5, L, 0.6, mix(K, FDARK, 0.1)); K.box(root, x, -L * 0.3, 0.1, 1.5, L * 0.6, 0.6, mix(K, FEATH, 0.1)); }
    K.box(elbow, X(3.6), 0.3, 0, 7.2, 1.5, 1.5, brzD);
    for (let i = 0; i < 9; i++) {
      const a = -0.05 - i * 0.11, L = 17 - Math.abs(i - 2) * 0.8, ux = Math.cos(a), uy = Math.sin(a), bx = 1 + i * 0.85;
      K.box(elbow, X(bx + ux * L * 0.32), uy * L * 0.32 - 0.6, -0.2 - i * 0.05, L * 0.64, 2.1, 0.6, mix(K, FEATH, 0.1), 0, 0, side * a);
      K.box(elbow, X(bx + ux * L * 0.8), uy * L * 0.8 - 0.6, -0.25 - i * 0.05, L * 0.36, 1.9, 0.55, mix(K, i % 2 ? FDARK : [brzL, brz], 0.1), 0, 0, side * a);
    }
    W.push({ root, elbow, side });
  }
  // a strong, even beat: wings raised in a V, the down-stroke driving, the hand trailing on the way up
  rig.extras.wings = W; rig.wingFlap = 1.5; rig.wingStroke = { base: 0.55, amp: 0.38, hand: 0.4, down: 0.4 };
  for (const w of W) w.root.rotation.y = w.side * 0.22;
  K.done();
  noShadow(rig, rig.legR, rig.legL, ...W.flatMap((w) => [w.root, w.elbow]));
  rig.float = 1.2;
  return finish(rig, 'daedalus_drone');
}
