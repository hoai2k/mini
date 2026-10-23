// The canyon's rare one: the six-armed Earthborn.
import { Rig, PX } from '../../character.js';
import { paintPerson } from '../../mortals.js';
import { HS, skinMat, group, sway } from '../../parts.js';
import { kit, voxDensity, legScale, reshape, applyShape } from '../../voxkit.js';
import { markHeadCore } from '../../rigContract.js';
import { dropAll, noShadow } from './parts.js';
import { finish } from './behaviour.js';

// ---- Earthborn ---------------------------------------------------------------------------
// (vox-ow-fodder-3, top right) A hulking six-armed giant of earth and stone,
// twice a hero's height: blocky brown stone in lumps and slabs mottled with
// green moss, glowing orange eyes under a heavy brow, a leather belt, and six
// arms with huge block fists, the top pair raised; it hurls balls of mud.
export function buildEarthborn() {
  const st = 0x8a6a4a, stD = 0x5e4630, stL = 0xa8865e, moss = 0x6a7a2a, mossL = 0x8a9a3a, glow = 0xffa030, lea = 0x4a3020, brz = 0xc08a2c;
  const STONE = [st, stD, stL, 0x7a5a3c, 0x9a7a54, 0x6a4e36], MOSS = [moss, mossL, 0x5a6a22, 0x7a8a30];
  const mat = skinMat('earthborn', (S) => paintPerson(S, { skin: st, eye: 0x2a1408, eyeWhite: 0x2a1408, brow: stD, mouth: false, top: st, sleeve: st, hand: stD, pants: stD, shoes: false,
    face: (s, ey) => { s.rect(8, ey - 2, 8, 2, stD, 0.1); for (const x of [9, 13]) s.rect(x, ey, 2, 1.5, glow, 0); s.rect(9, ey + 3, 6, 1.5, 0x2a1408, 0); for (const x of [9.5, 11.5, 13.5]) s.dot(x, ey + 3, 0xe8dcc0, 1, 1); },
    body: (s) => { for (let i = 0; i < 60; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, STONE[i % 4], 2, 2); } }), { emit: 1.2, scale: 2.3 });
  const rig = new Rig({ material: mat, scale: 2.3, legH: 9, bodyH: 13, bodyW: 12, bodyD: 7, armW: 4.4, headS: 7, jacket: false });
  const K = kit(rig, mat, { share: 'earthborn', seed: 157, rough: 0.95, emit: 0.9, ao: 0.35, density: voxDensity(rig) });
  const T = rig.torso, Hd = rig.head, H7 = 8 * HS * 7 / 8;
  dropAll(rig, T); dropAll(rig, Hd);
  rig.neck.position.y = 11.8 * PX;   // (the head sunk between the boulder shoulders)
  // (head and leg proportions, proportions.js: the craggy head reshaped to
  // 0.88, on legs stretched from 9 to 10 pixels over the same feet)
  const L1 = 10, ANK = -7.2;
  reshape(rig, Hd, 0.88);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1, legScale(9, L1, ANK), 1], [0, 0, 0], { ankle: ANK });
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  // stone in rounded lumps, mossy on top
  // (flat tones picked per run of cells, so runs merge; at the heroes' voxel size the lumps read as many small stones)
  const pick = (A) => A[Math.floor(K.r() * A.length)];
  // stones: patches a few cells across in one tone, dark seams between them, moss on the tops
  const hsh = (i, j, k) => { let h = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
  const stone = (m = 0.5) => (x, y, z) => {
    const u = x * 2.2 + 9, v = y * 2.2 + 9, w = z * 2.2 + 9, i = Math.floor(u), j = Math.floor(v), k = Math.floor(w);
    if (v - j < 0.13 || (u - i < 0.1 && K.r() < 0.7)) return stD;
    const h = hsh(i, j, k);
    if (y > m && h < 0.55) return MOSS[Math.floor(h * 7) % MOSS.length];
    return STONE[Math.floor(h * STONE.length) % STONE.length];
  };
  // the body: a barrel chest of boulders over a leather belt, a hunched mossy back, boulder shoulders
  K.blob(T, [0, 8, 0.2], [6, 5.4, 3.8], 1.1, stone(0.45), { pw: 2.4, run: [1, 2] });
  K.blob(T, [0, 3, 0], [4.8, 3.2, 3.3], 1.1, stone(0.9), { pw: 2.4, run: [1, 2] });
  K.blob(T, [0, 10.4, -2.6], [5, 3.4, 3], 1.1, stone(0.1), { run: [1, 2] });
  for (const sx of [-1, 1]) K.blob(T, [sx * 6.2, 11.6, 0], [2.8, 2.6, 3], 1.1, stone(0.2), { pw: 2.4, run: [1, 2] });
  for (const [x, y] of [[-2.2, 9.6], [2.2, 9.6], [0, 6.8]]) K.vox(T, x, y, 4.1, x ? 3.6 : 4.4, 2.6, 0.8, STONE, { faces: 'f', relief: 0.2 });   // the slabs of a stone chest
  K.box(T, 0, 1.6, 0, 12.4, 1.8, 7.8, lea); K.box(T, 0, 1.6, 4, 2.6, 2.4, 0.5, brz); K.box(T, 0, 1.6, 4.25, 1.2, 1, 0.3, 0x6a4a1a);
  for (const x of [-4.4, 4.4]) K.box(T, x, 1.6, 4, 0.8, 1.8, 0.4, 0x2a1a10);
  // the two lower pairs of arms: lumpy stone arms with block fists, swinging
  // (rig.extras.fists: all six, top to bottom, right then left, for the pummel)
  const fists = [{ arm: rig.armR, fist: rig.handR }, { arm: rig.armL, fist: rig.handL }];
  for (const [y, z, sx, ph, rz] of [[8.6, 1.6, -1, 0, 1.15], [8.6, 1.6, 1, 2, 1.15], [4.6, 1, -1, 1, 0.7], [4.6, 1, 1, 3, 0.7]]) {
    const a = group(T, sx * 6.6, y, z, 0, 0, sx * rz);
    K.blob(a, [0, -3.2, 0], [1.8, 3.4, 1.8], 1.1, stone(0.6), { pw: 2.6, run: [1, 2] });
    K.blob(a, [0, -8, 0.4], [2.5, 2.4, 2.5], 1.1, stone(0.7), { pw: 3, run: [1, 2] });
    K.box(a, sx * 1.9, -2.4, 0.6, 0.4, 2.4, 2, moss);
    sway(rig, a, 'x', 0.4, 2.2, ph);
    fists.push({ arm: a, fist: group(a, 0, -8, 0.4) });
  }
  // the top pair (the rig's own arms): a boulder shoulder, an arm in two stones, a huge knuckled fist
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.blob(arm, [0, -1.2, 0], [2.8, 2.8, 2.8], 1.1, stone(0.2), { run: [1, 2] });
    K.blob(arm, [0, -5.6, 0], [2.1, 2.6, 2.1], 1.1, stone(0.6), { pw: 2.6, run: [1, 2] });
    K.box(arm, 0, -7.8, 0, 4.2, 0.9, 4.2, lea);
    K.blob(arm, [0, -10.4, 0.4], [3.1, 2.6, 3.1], 1.1, stone(0.8), { pw: 3, run: [1, 2] });
    for (const x of [-1.6, -0.5, 0.6, 1.7]) K.box(arm, x, -12.6, 2, 1.1, 1.2, 1.4, pick(STONE));
  }
  // stone legs in stacked blocks, mossy feet
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    K.blob(leg, [0, -2.6, 0], [2.8, 3, 2.8], 1.1, stone(0.5), { pw: 2.6, run: [1, 2] });
    K.blob(leg, [0, -6.6, 0.2], [2.6, 2, 2.8], 1.1, stone(0.6), { pw: 3, run: [1, 2] });
    K.vox(leg, 0, -8.1, 0.6, 6.2, 1.5, 6.4, [stD, 0x6a4e36, stD], { faces: 'tfklr', relief: 0.15 }); K.clumps(leg, [0, -8.1, 0.6], [6.4, 1.5, 6.6], { n: 3, size: [1, 1.6], cols: MOSS, faces: 'tf', out: -0.3 });   // (the sole just above the leg's end, -9, and short of a long toe: at -9.4 the feet stood in the ground, and a long foot's tip dipped through it as the leg swung in the run)
  }
  rig.legR.position.x = -3.2 * PX; rig.legL.position.x = 3.2 * PX;
  // head: a small craggy stone head under a jutting brow, glowing eyes, a
  // grimace of stone teeth, moss on top
  K.blob(Hd, [0, 3.4, 0.3], [3.5, 3.6, 3.4], 1, stone(0.45), { pw: 2.6, run: [1, 2] });
  markHeadCore(rig, [0, 3.4, 0.3], [7, 7.2, 6.8]);   // (the stone skull; the moss aside)
  K.vox(Hd, 0, 5.3, 3.4, 7.6, 1.6, 1.8, [stD, 0x6a4e36], { relief: 0.25 });
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.5, 4.2, 3.55, 1.8, 1.1, 0.4, 0x2a1408); K.box(Hd, sx * 1.5, 4.2, 3.7, 1.3, 0.8, 0.3, glow); K.box(Hd, sx * 1.3, 4.3, 3.82, 0.5, 0.4, 0.2, 0xffe080); }
  K.box(Hd, 0, 3.2, 3.8, 1.4, 1.4, 0.8, stL);
  K.box(Hd, 0, 1.7, 3.5, 3.6, 1.2, 0.6, 0x2a1408); for (const x of [-1.2, -0.4, 0.4, 1.2]) K.box(Hd, x, 1.9, 3.75, 0.6, 0.6, 0.3, 0xe8dcc0);
  K.clumps(Hd, [0, 6.8, 0], [6.4, 1, 6], { n: 4, size: [1.4, 2.2], cols: [...MOSS, stL], faces: 't', out: -0.3, on: [[0, 3.4, 0.3], [3.5, 3.6, 3.4], 2.6] });   // (the moss seated on the rounded crown: monsters.js clumps on)
  applyShape(rig);
  K.done();
  noShadow(rig, Hd);
  rig.extras.fists = fists;
  for (const f of fists) { f.pz0 = f.arm.position.z; f.rz0 = f.arm === rig.armR || f.arm === rig.armL ? null : f.arm.rotation.z; }   // (the pummel's rest places)
  rig.hunch = 0.15; rig.armSpread = 0.45; rig.held = [-2.3, -2.3];
  return finish(rig, 'earthborn');
}
