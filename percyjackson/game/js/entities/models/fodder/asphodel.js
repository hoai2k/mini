// The Asphodel Fields' fodder: the shade and the keres.
import { Rig } from '../../character.js';
import { paintPerson } from '../../mortals.js';
import { HS, skinMat, group, sway } from '../../parts.js';
import { kit, voxDensity } from '../../voxkit.js';
import { dropAll, dropOne, hatOf, noShadow, mix } from './parts.js';
import { finish } from './behaviour.js';

// ---- shade -------------------------------------------------------------------------------
// (vox-ow-fodder, bottom right) A tall wraith of the dead: a pointed hood
// and a robe of dark slate-blue tatters that thin into cold cyan motes at
// the hem, a dark face with glowing cyan eyes and a gaping mouth, bony white
// hands reaching out. Drifts slowly, a little see-through, in crowds.
export function buildShade() {
  const SH = [0x3a4458, 0x2a3242, 0x4a5670, 0x5a6a84], dark = 0x0a0e16, cyan = 0x7ae8ff, cyanL = 0xd8ffff, bone = 0xe8e4dc, boneD = 0xb8b4ac;
  const mat = skinMat('shade', (S) => {
    paintPerson(S, { skin: 0x1a2030, eye: dark, eyeWhite: dark, brow: 0x1a2230, mouth: false, top: SH[0], sleeve: SH[0], hand: bone, pants: SH[1], shoes: false,
      face: (s, ey) => { s.rect(8, ey - 3, 8, 8, 0x0e1420, 0.1); for (const x of [9, 13]) { s.rect(x, ey - 0.5, 2, 1.5, cyan, 0); s.dot(x + 0.5, ey, cyanL, 1, 1); } s.rect(10, ey + 2.5, 4, 2.5, 0x04060a, 0); s.rect(10.5, ey + 2.5, 3, 0.5, 0xc8d0d8, 0); } });
  }, { emit: 2, fill: 0.4, dissolve: 0.18, scale: 1.48 });
  // (round 10, the owner: the dead were grown people, so a shade stands as an
  // adult, about 1.25x Percy's body: rig scale 1.15 → 1.48, its robe, hood
  // and motes sculpted in cells of a hero's voxel size, voxDensity)
  const rig = new Rig({ material: mat, scale: 1.48, armW: 2.6, bodyW: 8, bodyH: 13, jacket: false });
  const K = kit(rig, mat, { share: 'shade', seed: 113, fill: 0.4, emit: 0.9, ao: 0.35, density: voxDensity(rig) });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS, FADE = [0x4a6a88, 0x5a7a98, 0x3a5a78], MOTE = [cyan, 0x9af0ff, cyanL];
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // the robe: a rounded body of slate tatters hanging in long strips that pale into cold cyan motes
  K.blob(T, [0, 7, 0], [4.6, 7, 2.8], 0.9, (x, y) => (K.r() < 0.05 ? cyan : mix(K, y > 0.6 ? [SH[1], SH[0]] : SH, 0.14)), { pw: 2.4, run: [1, 2] });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, L = 7 + K.r() * 5, x = Math.sin(a) * 4.2, z = Math.cos(a) * 2.6, col = K.tone(SH, 0.15);
    K.flare(T, x, 2 - L / 2, z, 1.8, L, 0.6, col, a, 0.12);
    K.flare(T, x * 1.12, 2 - L - 1.6, z * 1.12, 1.3, 3.4, 0.5, K.tone(FADE, 0.1), a, 0.2);
    if (i % 2) K.box(T, x * 1.25, 2 - L - 4.2 - K.r() * 1.5, z * 1.25, 0.9, 0.9, 0.9, MOTE[i % 3]);
  }
  for (let i = 0; i < 16; i++) { const a = K.r() * Math.PI * 2, r = 3.4 + K.r() * 3.4; K.box(T, Math.sin(a) * r, -5 - K.r() * 8 + (i < 5 ? 14 : 0), Math.cos(a) * r * 0.8, 0.8, 0.8, 0.8, MOTE[i % 3]); }
  // the pointed hood, leaning forward round the dark face
  K.blob(Hd, [0, H8 * 0.5, -0.4], [H8 / 2 + 1.4, H8 / 2 + 1.2, H8 / 2 + 1.4], 0.9, () => mix(K, [SH[2], SH[0], SH[3]], 0.12), { lo: -0.85, run: [1, 2], keep: (x, y, z) => !(z > -0.1 && Math.abs(x) < 0.66 && y < 0.55) });
  for (const [y, w, z] of [[H8 + 1.4, H8 - 1.4, -1.4], [H8 + 2.6, H8 - 3.6, -2.6], [H8 + 3.6, 2.6, -3.8], [H8 + 4.4, 1.4, -4.8]]) K.box(Hd, 0, y, z, w, 1.4, w, mix(K, [SH[2], SH[3]], 0.1), -0.35);
  for (let x = -H8 / 2; x <= H8 / 2; x += 1.2) K.box(Hd, x, H8 - 0.2 - Math.abs(x) * 0.15, H8 / 2 + 0.7, 1.3, 1.8 + K.r() * 1.2, 1, K.tone(SH, 0.12));
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.9, H8 * 0.5, H8 / 2 + 0.1, 1.9, 1.4, 0.3, cyan); K.box(Hd, sx * 1.7, H8 * 0.53, H8 / 2 + 0.25, 0.7, 0.6, 0.2, cyanL); }
  K.box(Hd, 0, H8 * 0.2, H8 / 2 + 0.1, 3.2, 2.4, 0.3, 0x04060a); for (const x of [-1.1, -0.35, 0.35, 1.1]) { K.box(Hd, x, H8 * 0.2 + 1, H8 / 2 + 0.2, 0.45, 0.6, 0.2, 0xc8d0d8); K.box(Hd, x, H8 * 0.2 - 1, H8 / 2 + 0.2, 0.45, 0.5, 0.2, 0xa8b0b8); }
  // ragged sleeves, bare bone forearms, long bony fingers reaching out
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -2.6, 0, 3.6, 6.4, 3.6, SH[2]);
    for (let i = 0; i < 4; i++) K.box(arm, -1.2 + i * 0.8, -6.4 - K.r() * 1.6, -0.4 + (i % 2) * 0.8, 1, 2.6 + K.r() * 2.4, 1, K.tone([...SH, FADE[0]], 0.12));
    K.box(arm, -0.45, -8.4, 0.3, 0.7, 3.6, 0.7, bone); K.box(arm, 0.45, -8.4, 0.3, 0.6, 3.6, 0.6, boneD); K.box(arm, 0, -6.8, 0.3, 1.4, 0.8, 1.2, boneD);
    K.box(arm, 0, -10.6, 0.5, 2.2, 1.2, 1.6, bone);
    // (the joints tip forward, a negative turn about x, so each meets the one above: perf/islands.cjs)
    for (const dx of [-0.8, -0.27, 0.27, 0.8]) { K.box(arm, dx, -12.2, 0.8, 0.35, 2.2, 0.35, bone, -0.25, 0, dx * -0.3); K.box(arm, dx * 1.1, -13.8, 1.6, 0.3, 1.6, 0.3, boneD, -0.8, 0, dx * -0.3); }
    K.box(arm, -1.2, -11, 1, 0.35, 1.8, 0.35, bone, 0.6, 0, 0.7);
  }
  // wisps trailing from the hem, one swaying group
  const w = group(rig.hips, 0, -7, -0.6);
  for (let i = 0; i < 5; i++) { const x = -3 + i * 1.5; for (let k = 0; k < 3; k++) K.box(w, x + (K.r() - 0.5) * 0.6, -1.4 - k * 2 - (i % 2), 0, 1.8 - k * 0.45, 2.2, 1.8 - k * 0.45, k === 2 ? MOTE[i % 3] : K.tone(k ? FADE : SH, 0.12)); }
  sway(rig, w, 'x', 0.3, 2.4);
  K.done();
  noShadow(rig, rig.armR, rig.armL, w);
  rig.float = 0.35; rig.hunch = 0.3; rig.held = [-1.25, -1.1];
  return finish(rig, 'shade');
}

// ---- keres ------------------------------------------------------------------------------------
// (vox-ow-fodder-3, bottom) Death spirits of the battlefield: a mane of wild
// white hair, a pale skull-like face with glowing red eyes and bared fangs,
// a ragged black dress hanging in long strips with no feet, a red sash,
// long bony arms ending in long glowing red talons (the accent), and great
// black bat wings veined in glowing red. They hang in the air and drop to
// strike, trailing red.
export function buildKeres() {
  const blk = 0x1a1216, blkL = 0x3a2a30, hairC = [0xe8e4e0, 0xc8c4c0, 0xffffff], pale = 0xe0d8d0, red = 0xff2a2a, redD = 0xa81a1a, RAG = [blk, blkL, 0x2a1e24];
  const mat = skinMat('keres', (S) => paintPerson(S, { skin: pale, hair: 0xe8e4e0, fringe: 2, hairSide: 4, hairBack: 8, eye: 0x0a0406, eyeWhite: 0x0a0406, brow: 0x8a8070, mouth: false, top: blk, sleeve: blk, hand: pale, pants: blk, shoes: false,
    face: (s, ey) => { for (const x of [9, 13]) { s.rect(x, ey - 1, 2, 2, 0x2a0408, 0); s.rect(x + 0.5, ey - 0.5, 1, 1, red, 0); } s.rect(11, ey + 1.5, 2, 1, 0x6a5a5a, 0); s.rect(9.5, ey + 3, 5, 1.5, 0x2a0408, 0); for (let x = 9.5; x < 14.5; x += 1) s.dot(x, ey + 3, 0xfff8f0, 0.6, 1); } }), { emit: 1.6, scale: 1.64 });
  // (round 10, the owner: death spirits, part women, stand as grown women,
  // about 1.25x Percy's body: rig scale 1.3 → 1.64, the dress, mane, talons
  // and wings in cells of a hero's voxel size, voxDensity)
  const rig = new Rig({ material: mat, scale: 1.64, armW: 2.6, bodyW: 7, jacket: false });
  const K = kit(rig, mat, { share: 'keres', seed: 173, rough: 0.9, emit: 0.9, ao: 0.3, density: voxDensity(rig) });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // a ragged black dress hanging in long strips tipped with red, a red sash, a bone collar
  K.blob(T, [0, 6.4, 0], [3.8, 6, 2.2], 0.8, (x, y) => (Math.abs(y + 0.3) < 0.1 ? redD : mix(K, RAG, 0.12)), { pw: 2.4, run: [1, 2] });
  K.box(T, 0, 11.2, 1.85, 3.2, 1.2, 0.5, pale); for (const x of [-1, 0, 1]) K.box(T, x, 10.4, 2.1, 0.5, 0.9, 0.3, pale);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, L = 9 + K.r() * 8, x = Math.sin(a) * 3.4, z = Math.cos(a) * 2;
    K.flare(T, x, 2 - L / 2, z, 1.6, L, 0.5, K.tone(RAG, 0.12), a, 0.18);
    if (i % 3 === 0) K.flare(T, x * (1 + L * 0.03), 2 - L - 0.6, z * (1 + L * 0.03), 0.8, 1.6, 0.4, i % 2 ? red : redD, a, 0.18);
  }
  // the mane of wild white hair, spilling down the back
  K.clumps(Hd, [0, H8 * 0.7, -0.8], [H8 + 2, H8 * 0.8, H8 + 1], { n: 34, size: [1.6, 2.8], cols: hairC, faces: 'tlrk', out: 0.15, on: [[0, H8 / 2, 0], [H8 / 2 + 0.4, H8 / 2 + 0.4, H8 / 2 + 0.4], 6] });   // (on: each clump seated on the skull, which the finer clumps of round 10's density no longer reached)
  for (let i = 0; i < 10; i++) K.box(Hd, -4.6 + i * 1.02, H8 * 0.3 - (i % 3) * 1.2, -H8 / 2 - 1.2, 1.5, 5 + K.r() * 5, 1.5, K.tone(hairC, 0.08), 0.3, 0, (i - 4.5) * 0.12);
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) K.box(Hd, sx * (H8 / 2 + 1 + k * 0.8), H8 * 0.4 - k * 2, 0.4 - k, 1.5, 5, 2.6, K.tone(hairC, 0.08), 0, 0, sx * (0.2 + k * 0.25));
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.9 * HS, 4.4 * HS, 4 * HS + 0.2, 1.4, 1.2, 0.3, red); K.box(Hd, sx * 1.9 * HS, 4.4 * HS + 0.7, 4 * HS + 0.15, 1.8, 0.5, 0.4, 0x6a5a5a); }
  for (const x of [-1.2, -0.4, 0.4, 1.2]) K.box(Hd, x, 1.5, 4 * HS + 0.2, 0.4, 0.9, 0.2, 0xfff8f0);
  // long bony arms in ragged sleeves, long glowing red talons
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -2.4, 0, 2.8, 5, 2.8, blk); for (let i = 0; i < 3; i++) K.box(arm, -0.9 + i * 0.9, -5.6 - K.r() * 1.4, -0.3, 1, 2.6 + K.r() * 2, 1.4, K.tone(RAG, 0.1));
    K.box(arm, 0, -7.4, 0, 1.4, 5.4, 1.4, pale); K.box(arm, 0, -10.2, 0.2, 2.2, 1.2, 1.6, pale);
    // (the talons' joints tip forward, a negative turn about x, so each meets the one above: turned the other way they floated in front of the hand, perf/islands.cjs)
    for (const dx of [-0.9, -0.3, 0.3, 0.9]) { K.box(arm, dx, -12, 0.6, 0.5, 2.6, 0.5, redD, -0.25, 0, dx * -0.2); K.box(arm, dx * 1.1, -14, 1.5, 0.45, 2.2, 0.45, red, -0.6, 0, dx * -0.2); K.box(arm, dx * 1.15, -15.4, 2.8, 0.3, 1.4, 0.3, 0xff8a8a, -1, 0, dx * -0.2); }
  }
  rig.extras.claws = [rig.handR, rig.handL];
  // great bat wings: black membrane between bony fingers veined in glowing red, ragged at the trailing edge
  const W = [];
  for (const side of [-1, 1]) {
    const root = group(T, side * 2, 10.4, -2, 0, 0, side * -0.5), elbow = group(root, side * 10, 0, 0, 0, 0, side * -0.4), X = (v) => side * v;
    K.box(root, X(5), 0, 0, 10, 1.4, 1.4, blkL); K.box(root, X(5), -3.2, -0.2, 10, 5.4, 0.45, blk); K.box(root, X(5), -1.6, 0.1, 9, 0.4, 0.4, red);
    for (let i = 0; i < 5; i++) { const h = 4 + K.r() * 5; K.box(root, X(1 + i * 2), -5.6 - h / 2, -0.2, 1.6, h, 0.4, K.tone(RAG, 0.1)); }
    K.box(elbow, 0, 0, 0, 2.2, 2.2, 2.2, blkL); K.box(elbow, X(0.4), 1.4, 0, 0.8, 1.6, 0.8, pale);
    for (let i = 0; i < 7; i++) {
      const a = 0.32 - i * 0.2, L = 17 - Math.abs(i - 1) * 1.1 + K.r() * 2, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
      K.box(elbow, X(ux * L / 2), uy * L / 2, 0.1, L, 0.9, 0.5, blkL, 0, 0, side * a);   // the finger
      K.box(elbow, X(ux * L * 0.3 - px * 1.4), uy * L * 0.3 - py * 1.4, -0.15, L * 0.6, 2.8, 0.35, K.tone(RAG, 0.12), 0, 0, side * a);   // the membrane behind it, widening outward
      K.box(elbow, X(ux * L * 0.68 - px * 2.4), uy * L * 0.68 - py * 2.4, -0.17, L * 0.55, 4.8, 0.35, K.tone(RAG, 0.12), 0, 0, side * a);
      K.box(elbow, X(ux * L * 0.4 - px * 1), uy * L * 0.4 - py * 1, 0.05, L * 0.6, 0.35, 0.3, i % 2 ? redD : red, 0, 0, side * a);   // a red vein
      if (i > 2) K.box(elbow, X(ux * L * 0.7 - px * 3.6), uy * L * 0.7 - py * 3.6 - 1.5, -0.15, 0.9, 3 + K.r() * 3, 0.3, K.tone(RAG, 0.1));   // ragged strands at the trailing edge
    }
    W.push({ root, elbow, side });
  }
  // slow heavy beats with the wings held high in a V, the ragged membrane hanging off the fingers
  rig.extras.wings = W; rig.wingFlap = 1.1; rig.wingStroke = { base: 0.52, amp: 0.33, hand: 0.4, down: 0.38 };
  for (const w of W) w.root.rotation.y = w.side * 0.25;
  K.done();
  noShadow(rig, rig.armR, rig.armL, ...W.flatMap((w) => [w.root, w.elbow]));
  rig.float = 1.25; rig.hunch = 0.3;
  return finish(rig, 'keres');
}
