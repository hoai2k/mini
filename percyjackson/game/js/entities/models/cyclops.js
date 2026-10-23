// The cyclops: a one-eyed giant (champions.js builds Gorgos at its density).
import { Rig, PX, HOLD_PITCH } from '../character.js';
import { paintPerson } from '../mortals.js';
import { skinMat, group } from '../parts.js';
import { kit, dropMeshes, BUILD, voxDensity, legScale, reshape, applyShape } from '../voxkit.js';
import { markTip, markHeadCore, keepAbove } from '../rigContract.js';

// Cyclops (vox-bosses-2, top left): a hulking giant with one huge blue eye
// under a single heavy brow, a curly black mane and a bushy beard, a mouth
// open in a roar, a white wool fleece over the left shoulder belted with gold
// into a ragged knee-length kilt, a ram's skull on that shoulder, leather
// bracers banded in gold, sandals and a studded wooden club.
// Built at the heroes' voxel size (parts.js density): the Rig keeps its
// scale (so the champions' add-ons and the animations still land) but every
// part is sculpted from cells one hero pixel across: rounded muscle masses,
// curls, wool and leather, no stretched skin. Skin boxes are dropped.
// pal: { wool: [fleece tones], iris, ram (false: no ram's skull) } for a champion
export const cycDensity = (rig) => voxDensity(rig) * 0.88 / Math.sqrt(BUILD.k);
export function buildCyclops({ id = 'cyclops', pal = {} } = {}) {
  const SK = [0xcc7a46, 0xc2703e, 0xd6884f], skinD = 0xa05a30, wool = pal.wool ?? [0xece4d0, 0xd8cfb8, 0xf4ecdc, 0xc8bea4];
  const gold = 0xd8a026, goldL = 0xf0c650, goldD = 0x9a6a14, leather = 0x6a4224, leatherD = 0x4a2c16, iris = pal.iris ?? 0x2a6ad0;
  const HAIR = [0x1e140c, 0x2a1c10, 0x140c06, 0x34241a];
  const mat = skinMat(id, (S) => paintPerson(S, { skin: SK[0], hair: HAIR[0], mouth: false, top: SK[0], sleeve: SK[0], hand: SK[0], pants: SK[0], shoes: false }), { emit: 0.6 });
  const rig = new Rig({ material: mat, scale: 2.55, bodyW: 11, bodyD: 6, armW: 5, headS: 9, legH: 10 });
  for (const g of [rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL]) dropMeshes(rig, g);
  rig.handR.position.y = rig.handL.position.y = -11 * PX;
  rig.legR.position.x = -3 * PX; rig.legL.position.x = 3 * PX;
  // (head and leg proportions: a giant near twice a hero's height has a
  // giant's head and legs, not a hero's. The head is reshaped to 0.84 (his
  // sheet, vox-bosses-2, draws the head about 0.22 of his height, and
  // design/sizes.json "headSheet" holds him to it), the eye kept wide in it;
  // the legs stretch from 10 to 16.4 pixels over the same feet, the kilt with
  // them, the shoulders broaden and the arms reach down the thigh:
  // proportions.js reshape)
  const HF = 0.84, L1 = 16.4, ANK = -8.2;
  reshape(rig, rig.head, HF);
  reshape(rig, rig.torso, [1.1, 1, 1.05]);
  reshape(rig, rig.hips, [1.1, L1 / 10, 1.05]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1.05, legScale(10, L1, ANK), 1.05], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [1.05, 1.3, 1.05]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  // (the head sits 2.2 pixels low between the shoulders, as on the sheet, a
  // touch forward of the chest, so his legs keep their share of his height:
  // design/sizes.json)
  rig.neck.position.y = (12 - 2.2) * PX; rig.neck.position.z = 0.5 * PX;
  rig.crownY = 10 * HF;   // (a champion's crown sits on the mane, down in the curls: champions.js crownAny)
  // (its triangle budget: cells 0.88 of a hero pixel's density, and a champion
  // built bigger, BUILD.k, gains density with the square root of its size,
  // so the cyclops stays near 20k triangles and Gorgos under 25k)
  const K = kit(rig, mat, { seed: 53, density: cycDensity(rig) * (pal.dk ?? 1), ao: 0.22 });   // (pal.dk: a champion's trim to its budget)
  const T = rig.torso, Hd = rig.head, H = rig.hips;
  const skin = () => () => SK[Math.floor(K.r() * 3)];   // (a few flat tones, so runs of cells merge)
  // ---- trunk: a deep barrel chest, heavy pecs, a hard belly, traps rising
  // round a short neck (the head sits low between the shoulders)
  // (round masses, pw near 2, so the chest tapers to the waist as on the sheet)
  K.blob(T, [0, 7.6, 0.2], [5.4, 4.8, 3.3], 1, (x, y, z) => (z > 0.55 && y < -0.05 && y > -0.32 ? skinD : z > 0.7 && Math.abs(x) < 0.08 ? skinD : SK[Math.floor(K.r() * 3)]), { pw: 2.2, run: [2, 5] });
  K.blob(T, [0, 3, 0.4], [4, 3.4, 2.9], 1, (x, y, z) => (z > 0.6 && (Math.abs(x) < 0.07 || Math.abs(y - 0.2) < 0.08) ? skinD : SK[Math.floor(K.r() * 3)]), { pw: 2.2 });
  K.blob(T, [0, 11.2, -0.7], [4.6, 1.9, 2.6], 1, skin(), { pw: 2.2 });
  // the fleece: wool over the left shoulder and chest, falling across the
  // belly to the right hip (the right breast bare), curls standing out
  K.blob(T, [0.3, 6.6, 0.25], [5.7, 5.4, 3.7], 1, () => wool[Math.floor(K.r() * wool.length)], { pw: 2.2, run: [1, 2], keep: (x, y) => x * 0.95 - y * 0.75 > -0.25 });
  K.blob(T, [3.6, 11, -0.4], [3.3, 2.4, 3.3], 1, () => wool[Math.floor(K.r() * wool.length)], { run: [1, 2] });
  K.clumps(T, [2.6, 9.5, 0], [6, 5, 7.6], { n: 9, size: [1, 1.6], cols: wool, faces: 'tfkr', out: 0.3 });
  K.clumps(T, [0, 4.5, 3.7], [8, 5, 1], { n: 4, size: [0.9, 1.4], cols: wool, faces: 'f', out: 0.2, keep: (x, y) => x * 0.95 - (y - 6.6) * 0.75 * 6 / 5.4 > -1.4 });
  // a gold strap over the right shoulder, the belt with its round bosses
  for (let i = 0; i < 7; i++) { const t = i / 6; K.box(T, -3.4 + t * 1.2, 12 - t * 9.6, 3.2 + Math.sin(t * Math.PI) * 0.6, 1.3, 1.7, 0.5, i % 2 ? gold : goldL, 0.15, 0, 0.12); }
  K.box(T, -3.4, 12.1, -0.5, 1.3, 0.6, 7, gold);
  K.box(T, 0, 1.6, 0.4, 9.4, 1.6, 6.8, gold); K.box(T, 0, 1.6, 0.4, 9.6, 0.4, 7, goldD);
  for (const x of [-3.4, 0, 3.4]) { const r = x ? 1.3 : 1.8; K.box(T, x, 1.6, 3.95, r * 2, r * 1.6, 0.5, goldL); K.box(T, x, 1.6, 4.05, r * 1.6, r * 2, 0.5, goldL); K.box(T, x, 1.6, 4.2, r, r, 0.4, goldD); }
  // ---- the kilt: ragged wool strips from the belt to the knee, a gold
  // tongue hanging down the front
  const NS = 34;
  for (let i = 0; i < NS; i++) {
    const a = i / NS * Math.PI * 2, x = Math.sin(a) * 4.9, z = Math.cos(a) * 3.5 + 0.4, L = 5.4 + K.r() * 1.8 - (Math.abs(Math.cos(a)) > 0.8 ? 0 : 0.5);
    K.flare(H, x, 1.6 - L / 2, z, 1.15, L, 0.9, K.tone(wool, 0.1), a, 0.16);
    if (K.r() < 0.5) K.flare(H, x * 1.04, 1.6 - L - 0.3, z * 1.04, 0.6, 0.8, 0.6, K.tone(wool, 0.1), a, 0.16);   // a tattered end
  }
  for (let i = 0; i < 4; i++) K.box(H, 0, 0.6 - i * 1.3, 4.35 + i * 0.2, 1.5, 1.4, 0.4, i % 2 ? gold : goldL, -0.14);
  // ---- head: a big jaw under one huge eye, a heavy brow, a broad nose, a
  // roaring mouth; a curly mane and a beard down onto the chest
  const fz = 4.3;
  markHeadCore(rig, [0, 4.4, 0.4], [7.8, 9, 7.8]);   // (the skull and face: mane, brow hair and beard aside)
  K.blob(Hd, [0, 4.4, 0.4], [3.9, 4.5, 3.9], 1, (x, y, z) => (z > 0.6 && y > 0.25 && y < 0.62 && Math.abs(x) > 0.55 ? skinD : SK[Math.floor(K.r() * 3)]), { pw: 2.5 });
  K.box(Hd, 0, 7.9, fz - 0.4, 6.8, 1.3, 1.6, HAIR[0], -0.1); K.box(Hd, 0, 7.4, fz - 0.1, 5.6, 0.6, 1.2, skinD);                 // the single brow
  // (the eye drawn wide: it stays the face's one big feature on the smaller head)
  K.box(Hd, 0, 6.1, fz - 0.15, 5.6, 3.6, 0.8, 0x3a1a0e);                                                                            // socket
  K.box(Hd, 0, 6.1, fz + 0.1, 5, 3, 0.6, 0xf4f0e6); K.box(Hd, 0, 6, fz + 0.3, 2.9, 2.7, 0.5, iris);
  K.box(Hd, 0, 6, fz + 0.45, 1.45, 1.6, 0.4, 0x0a0a14); K.box(Hd, -0.75, 6.7, fz + 0.6, 0.6, 0.6, 0.2, 0xffffff);
  K.box(Hd, 0, 4.2, fz + 0.3, 1.7, 2, 1.2, SK[1]); K.box(Hd, 0, 3.5, fz + 0.65, 2.3, 0.8, 0.8, skinD);                              // the nose
  K.box(Hd, 0, 2.1, fz - 0.1, 3.6, 2.1, 1, 0x4a0e0c); K.box(Hd, 0, 1.8, fz - 0.15, 2.2, 1, 0.8, 0xc0303a);                          // the roaring mouth
  for (let x = -1.35; x <= 1.36; x += 0.9) { K.box(Hd, x, 2.95, fz + 0.2, 0.75, 0.6, 0.5, 0xf4f0e0); K.box(Hd, x, 1.2, fz + 0.2, 0.75, 0.45, 0.5, 0xe8e0d0); }
  for (const sx of [-1, 1]) { K.box(Hd, sx * 4, 4.8, 0.4, 0.9, 2.2, 1.6, SK[1]); K.box(Hd, sx * 4.3, 4.6, 0.5, 0.3, 1, 0.8, skinD); }      // ears
  // (pal.hood: a champion's hood covers the crown, so only the mane below it is built)
  K.blob(Hd, [0, 6.2, -0.6], [4.9, 4.7, 4.7], 1, () => HAIR[Math.floor(K.r() * 4)], { run: [1, 2], keep: (x, y, z) => !(z > 0.15 && y < 0.72 && Math.abs(x) < 0.8) && !(pal.hood && y > -0.1) });
  if (!pal.hood) K.blob(Hd, [0, 3.4, 0.6], [4.9, 2.6, 3.4], 1, () => HAIR[Math.floor(K.r() * 4)], { run: [1, 2], keep: (x, y, z) => Math.abs(x) > 0.82 });   // side locks down to the jaw (a hood's flaps cover them)
  // (the curls seated on the mane, on: none hangs in the air off a corner of the box they are scattered over)
  const mane = [[0, 6.2, -0.6], [4.9, 4.7, 4.7]];
  if (!pal.hood) K.clumps(Hd, [0, 6.6, -0.6], [9.4, 8.6, 9], { n: 14, size: [1, 1.8], cols: HAIR, faces: 'tklr', out: 0.1, on: mane });
  if (!pal.hood) K.clumps(Hd, [0, 9.4, 2], [8.4, 1.6, 4.4], { n: 5, size: [1, 1.6], cols: HAIR, faces: 'tf', out: 0.1, on: mane });
  // (the beard a little fuller and longer than the smaller head alone would give it, as on the sheet)
  K.blob(Hd, [0, 0.7, 2.3], [4.9, 3.7, 2.6], 1, () => HAIR[Math.floor(K.r() * 4)], { run: [1, 2], keep: (x, y, z) => !(z > 0.3 && y > 0.12 && Math.abs(x) < 0.44) });
  K.blob(Hd, [0, -2, 2.8], [3.6, 3, 2.1], 1, () => HAIR[Math.floor(K.r() * 4)], { run: [1, 2] });
  K.clumps(Hd, [0, 0, 3.4], [8, 6, 2], { n: 9, size: [0.9, 1.6], cols: HAIR, faces: 'flrb', out: 0.25, keep: (x, y) => !(y > 1.1 && Math.abs(x) < 2.2), on: [[0, 0.7, 2.3], [4.9, 3.7, 2.6]] });   // (seated on the beard)
  // ---- the ram's skull with curled horns on the left shoulder
  const ram = reshape(rig, group(T, 6.6, 12.4, 0.6, 0, -0.35, 0), 0.8); ram.visible = pal.ram !== false;   // (a little smaller, beside the smaller head)
  const bone = [0xe8e0c8, 0xd8d0b8, 0xf0ead8];
  K.blob(ram, [0, 0, 0.8], [1.8, 1.7, 2], 1, () => K.tone(bone, 0.06));
  K.box(ram, 0, -0.7, 2.9, 1.8, 1.6, 1.8, bone[1]); K.box(ram, 0, -1.2, 3.7, 1.2, 0.8, 0.5, 0x2a2014);
  for (const sx of [-1, 1]) {
    K.box(ram, sx * 0.75, 0.3, 2.6, 0.8, 0.8, 0.3, 0x1a1410);
    for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 1.7, r = 1.9 - k * 0.07; K.box(ram, sx * (1.7 + Math.sin(a) * 0.25 + k * 0.08), 0.6 + Math.cos(a) * r, 0.2 - Math.sin(a) * r, 1.1 - k * 0.04, 1.1 - k * 0.04, 1.1 - k * 0.04, k % 2 ? 0xb8a888 : 0xc8b898); }
  }
  // ---- arms: a round shoulder, a thick upper arm, a heavier forearm in a
  // gold-banded leather bracer, a big blocky fist
  for (const arm of [rig.armR, rig.armL]) {
    // (a round deltoid, a bicep bulging forward over a slimmer arm,
    // a narrow elbow, then the forearm swelling into the bracer: defined, not a column)
    K.blob(arm, [0, 0.5, 0], [3.3, 3.1, 3], 1, skin(), { pw: 2 });
    K.blob(arm, [0, -3.4, 0], [2.1, 3.4, 2.1], 1, skin(), { pw: 2.1 });
    K.blob(arm, [0, -3, 0.8], [1.8, 2.4, 1.6], 1, skin(), { pw: 2 });
    K.blob(arm, [0, -7.8, 0.2], [2.6, 3, 2.5], 1, skin(), { pw: 2.2 });
    K.vox(arm, 0, -8.6, 0.2, 5.6, 2.6, 5.4, [leather, leatherD, 0x7a4c2a], { relief: 0.15 });
    K.box(arm, 0, -7.3, 0.2, 5.8, 0.5, 5.6, gold); K.box(arm, 0, -9.9, 0.2, 5.8, 0.5, 5.6, gold);
    K.blob(arm, [0, -11.5, 0.4], [2.7, 2.2, 2.7], 1, skin(), { pw: 3 });
    for (let i = 0; i < 4; i++) K.box(arm, -1.8 + i * 1.2, -12.4, 2.6, 1.1, 1.3, 1, i % 2 ? SK[1] : SK[2]);   // knuckles
    K.box(arm, (arm === rig.armR ? 1 : -1) * 2.4, -11, 1.4, 1, 2, 1.6, SK[1]);                                   // the thumb
  }
  // ---- legs: thick thighs under the kilt, heavy calves bound with leather,
  // broad feet on strapped sandals
  for (const leg of [rig.legR, rig.legL]) {
    K.blob(leg, [0, -2.6, 0], [2.8, 3.4, 2.8], 1, skin(), { pw: 2.2 });
    K.blob(leg, [0, -6.6, -0.2], [2.4, 3, 2.5], 1, skin(), { pw: 2.2 });
    for (const y of [-5.6, -7.6]) K.vox(leg, 0, y, -0.2, 5.4, 1, 5.6, [leather, leatherD], {});
    // (the foot stops a hair above the leg's end and short of a long toe: a long foot's tip dipped through the floor as the leg swung in the run)
    K.blob(leg, [0, -9, 0.6], [2.5, 0.85, 3.1], 1, skin(), { pw: 3 });
    K.box(leg, 0, -9.6, 0.6, 5.4, 0.5, 6.4, leatherD);
    for (let i = 0; i < 4; i++) K.box(leg, -1.65 + i * 1.1, -9.15, 3.6, 1, 0.9, 0.9, i % 2 ? SK[1] : SK[2]);         // toes
    for (const z of [-1, 1.6]) K.box(leg, 0, -8.7, z, 5.4, 0.5, 0.6, leather);
    K.box(leg, 0, -8.8, 0.3, 0.6, 1.6, 5.4, leather);
  }
  // ---- the club: a knotted log thickening to a studded head
  const club = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);   // (along +y, angled forward at the foe: see the hand-axis convention in character.js)
  const WOOD = [0x5a3418, 0x6a3e1e, 0x7a4a24, 0x4a2a12];
  K.blob(club, [0, 5, 0], [1.3, 7, 1.3], 1, () => K.tone(WOOD, 0.1), { pw: 2.6 });
  K.blob(club, [0, 15.6, 0], [2.6, 5.4, 2.6], 1, () => K.tone(WOOD, 0.1), { pw: 2.4 });
  for (const [x, y, z] of [[1.6, 9, 0.6], [-1.5, 6.6, -0.4], [0.2, 11.6, 1.6]]) K.box(club, x, y, z, 1, 1.4, 1, WOOD[3]);   // knots
  for (const [x, y, z] of [[2.6, 15, 0], [-2.6, 17.5, 0], [0, 16.5, 2.6], [0, 14, -2.6], [2.2, 19, 0.8], [-1.4, 13.5, 2.3], [0.6, 19, -2.2], [-1.9, 15.2, -1.8]]) { K.box(club, x, y, z, 1.3, 1.3, 1.3, 0x8a8a94); K.box(club, x * 1.08, y + 0.3, z * 1.08, 0.6, 0.6, 0.6, 0xb8b8c4); }
  K.vox(club, 0, -1.6, 0, 3, 2.2, 3, [leather, leatherD], {});
  markTip(club, 0, 20.8, 0, 'club'); rig.extras.club = club;
  applyShape(rig);
  K.done();
  rig.hunch = 0.3;
  keepAbove(rig, club, { reset: true });   // (a slam that ends low strikes the floor with the club instead of driving it through)
  return rig;
}
