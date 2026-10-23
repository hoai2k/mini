// The small creatures: the sewer rat, the telekhine and the Greek-fire
// automaton.
import * as THREE from 'three/webgpu';
import { PX } from '../character.js';
import { QuadRig, paintQuad } from '../quad.js';
import { solid, skinMat, prop, group, fur } from '../parts.js';
import { addFlames } from '../flames.js';
import { kit, dropMeshes, BUILD } from '../voxkit.js';

// A New York sewer rat (the prologue): grey-brown fur, a pink nose, ears
// and tail, and eyes a little too red. The Mist says "just rats".
export function buildRat() {
  const rig = new QuadRig({ material: skinMat('rat', (S) => paintQuad(S, { base: 0x6a5e54, dark: 0x3e352e, belly: 0xa89a8a, back: 0x564a40, eye: 0xff2a1a, eyeLow: 0xff8a6a, nose: 0xe88a9a, teeth: 0xfff4d8, speckles: 50,
    custom: (s) => { fur(s, 0, 16, 40, 20, 40, 0x4a4038, 0x847466); s.rect(36, 4, 4, 2, 0xe88a9a, 0); } })), scale: 0.95, bodyL: 10, bodyW: 5.5, bodyH: 5, legH: 3.2, legW: 1.8, headS: 5, snoutS: 3.4, ears: true, tail: 4, tailLen: 8, tailW: 0.9, tailCurl: 0.12, gait: 1.7 });
  const pink = solid(0xe8a0a8);
  for (const e of rig.head.children.filter((m) => m.isMesh && m !== rig.headMesh && Math.abs(m.position.x) > 0.01)) prop(rig, rig.head, 2.6, 2.6, 0.6, pink, e.position.x / PX * 1.1, e.position.y / PX + 1.6, e.position.z / PX + 0.4);
  if (rig.tailTip) prop(rig, rig.tailTip, 0.9, 0.9, 3, pink, 0, 0, -1.4);
  for (const sx of [-1, 1]) prop(rig, rig.head, 0.2, 0.2, 3, solid(0xd8d0c8), sx * 2.2, -1.2, 5.4, 0, sx * 0.5, 0);   // whiskers
  return rig;
}

// Telekhine (design/concept/vox-telekhine.png; the sea-demon smiths of
// Rhodes, Hephaestus's old forge hands): half dog, half seal, sitting up
// like a sea lion on wide front flippers, the body tapering back to a
// fluked tail. Grey-blue hide speckled teal, a cream throat and muzzle, a
// dog's head with a blunt seal snout, fangs and glowing orange eyes; a
// leather smith's apron, a harness with brass buckles and tools, and an
// iron cauldron of green-orange Greek fire on its back that it lobs at you.
export function buildTelekhine() {
  const hide = 0x4a5a7c, hideD = 0x2c3654, hideL = 0x6a7a9a, sp = 0x3a9a98, cream = 0xe8dcc0, creamD = 0xc8bca0;
  const HIDE = [hide, hideD, hideL, 0x3e4e70, sp, 0x2a7a84];
  const lea = 0x8a4a22, leaD = 0x5a2e14, brass = 0xd8a030, brassD = 0x8a5a14, iron = 0x2a2624, ironL = 0x46403a;
  const mat = skinMat('telekhine', (S) => paintQuad(S, { base: hide, dark: hideD, belly: cream, back: 0x3a4866, eye: 0xffa01a, eyeLow: 0xff5a10, nose: 0x14161c, teeth: 0xf4ecd8, speckles: 70, stripes: null,
    custom: (s) => { for (let i = 0; i < 50; i++) s.px(Math.floor(s.r() * 40), 16 + Math.floor(s.r() * 20), i % 2 ? sp : hideL); s.rect(32, 0, 16, 8, cream, 0.1); } }), { emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: 2.8, bodyL: 10, bodyW: 7, bodyH: 5, legH: 3.5, legW: 2.4, headS: 6, snoutS: 3.8, ears: false, tail: 2, tailLen: 3, tailW: 2.2, tailCurl: 0.1, neckUp: 8.4, headZ: -1.6, gait: 1.3, jawOpen: 0.3 });
  const K = kit(rig, mat, { seed: 89, rough: 0.7, emit: 0.8, density: BUILD.k * 1.8 });   // (adults are "at least seven feet tall" in The Battle of the Labyrinth; cells 1.45× a hero's to hold its triangles)
  const T = rig.torso;
  dropMeshes(rig, T);
  // the body: an upright chest, a sloping middle and a tapering hind end
  K.box(T, 0, 0.8, 3.4, 7.6, 9.4, 5.6, hide, -0.15);
  K.box(T, 0, 1, 6.1, 5, 8.4, 0.8, cream, -0.15);
  K.box(T, 0, 6.2, 2.8, 5.4, 3, 4.4, hide, -0.15); K.box(T, 0, 6, 4.9, 3.6, 2.6, 0.6, cream, -0.15);
  K.box(T, 0, -1.8, -1.4, 7.2, 5.6, 6.2, hide);
  K.box(T, 0, -3.3, -5.6, 5.8, 4.2, 4.6, hideD);
  K.box(T, 0, -4.4, -8.6, 4.2, 2.6, 3, hide);
  K.box(T, 0, -4.6, -1.5, 6.4, 1.4, 12, creamD);
  K.clumps(T, [0, 0.8, 3.2], [7.6, 9, 5], { n: 34, size: [0.8, 1.4], cols: HIDE, faces: 'lrk', out: -0.25 });
  K.clumps(T, [0, -1.8, -1.4], [7.2, 5.6, 6.2], { n: 30, size: [0.8, 1.4], cols: HIDE, faces: 'tlr', out: -0.25 });
  K.clumps(T, [0, -3.3, -5.6], [5.8, 4.2, 4.6], { n: 18, size: [0.8, 1.3], cols: HIDE, faces: 'tlr', out: -0.25 });
  // tail and hind flippers: a fan of two flukes splayed on the ground
  const t0 = rig.tail[0].parent; t0.position.set(0, -4.6 * PX, -9.8 * PX);
  for (const sx of [-1, 1]) {
    K.box(rig.tailTip, sx * 1.8, -0.2, -2.8, 2.4, 0.8, 5.2, hideD, 0, sx * 0.55, 0);
    K.box(rig.tailTip, sx * 3, -0.2, -4.6, 2, 0.85, 1.4, hide, 0, sx * 0.55, 0);
  }
  // front flippers: a short arm, then a wide flat flipper splayed outward
  for (const [i, leg] of rig.legs.entries()) {
    if (i > 1) { leg.visible = false; continue; }
    dropMeshes(rig, leg);
    const sx = leg.userData.side;
    K.box(leg, 0, -1.6, 0.4, 2.8, 3.8, 3, hide); K.box(leg, 0, -1.4, 1.95, 2, 3, 0.3, creamD);
    K.box(leg, sx * 1.4, -3.4, 1.6, 3.6, 0.8, 5.6, hideD, 0, sx * 0.55, 0);
    for (let k = 0; k < 4; k++) K.boxY(leg, [sx * 1.4, -3.4, 1.6], sx * 0.55, -1.35 + k * 0.9, 0, 3.1, 0.7, 0.85, 0.9, k % 2 ? hide : 0x384868);
  }
  // head: brow, glowing eyes, a blunt cream muzzle with a broad nose and fangs, small ears
  const Hd = rig.head, hs = rig.dims.hs, hz = hs * 0.35, front = hz + hs / 2, sn = 3.8, sy = -hs * 0.18, sz = hs * 0.85 + sn * 0.5;
  K.clumps(Hd, [0, 0, hz], [hs, hs, hs], { n: 26, size: [0.8, 1.3], cols: HIDE, faces: 'tlrk', out: -0.25 });
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * hs * 0.24, hs * 0.28, front + 0.3, hs * 0.4, 1, 0.8, hideD, 0, 0, sx * 0.25);
    K.box(Hd, sx * hs * 0.24, hs * 0.08, front + 0.1, 1.6, 1.2, 0.3, 0xff7a10); K.box(Hd, sx * hs * 0.2, hs * 0.08, front + 0.2, 0.7, 0.7, 0.3, 0xffd040);
    K.box(Hd, sx * hs * 0.36, hs * 0.5, -0.2, 1.6, 1.4, 1.2, hideD);
  }
  K.box(Hd, 0, sy - 0.1, sz - 0.2, sn + 1.4, sn * 0.8, sn + 0.4, 0xb8bccc);
  K.box(Hd, 0, sy - sn * 0.3, sz, sn + 1.5, sn * 0.35, sn + 0.5, cream);
  for (const sx of [-1, 1]) K.box(Hd, sx * hs * 0.42, -hs * 0.22, hz + 1.2, 1.2, hs * 0.5, hs * 0.5, hideL);
  K.box(Hd, 0, sy + sn * 0.45, sz + sn / 2 - 0.1, sn * 0.8, 1.2, 1.1, 0x101218);
  K.box(Hd, 0, sy + sn * 0.45, sz - 1, sn * 0.5, 0.8, sn * 0.9, hideL);
  for (const sx of [-1, 1]) {
    for (const [dy, dz] of [[0, 0], [-0.7, 0.6], [0.2, 1]]) K.box(Hd, sx * (sn / 2 + 0.75), sy + dy, sz + dz, 0.2, 0.35, 0.35, 0x3a3a44);
    K.box(Hd, sx * (sn / 2 - 0.1), sy - sn * 0.4 - 0.6, sz + sn / 2 - 0.4, 0.7, 1.4, 0.6, 0xf4ecd8);
    K.box(Hd, sx * (sn / 2 - 0.3), sy - sn * 0.4 - 0.3, sz + sn / 2 - 1.5, 0.5, 0.9, 0.5, 0xf4ecd8);
  }
  K.box(Hd, 0, sy - sn * 0.4, sz - 0.2, sn * 0.9, 0.4, sn * 0.8, 0xa82a2a);
  const M = rig.mouth;
  K.box(M, 0, -0.5, sn * 0.5, sn + 0.8, 1.2, sn, creamD);
  for (const sx of [-1, 1]) K.box(M, sx * (sn * 0.4), 0.6, sn - 0.3, 0.55, 1.1, 0.55, 0xf4ecd8);
  K.box(M, 0, 0.15, sn * 0.45, sn * 0.7, 0.3, sn * 0.7, 0xc84040);
  // the smith's apron on the chest, hung from a neck strap with brass buckles
  K.box(T, 0, -0.6, 6.75, 5.8, 6.4, 0.6, lea, -0.15);
  K.clumps(T, [0, -0.6, 6.8], [5.8, 6.4, 0.6], { n: 12, size: [0.8, 1.3], cols: [lea, leaD, 0x9a5a2a], faces: 'f', out: -0.3 });
  for (const sx of [-1, 1]) { K.box(T, sx * 2.5, 2.7, 6.45, 1.6, 1.6, 0.7, brass, -0.15); K.box(T, sx * 2.5, 2.7, 6.85, 0.7, 0.7, 0.3, brassD, -0.15); K.box(T, sx * 2.6, 5, 5.8, 0.9, 4.6, 0.5, leaD, -0.4); }
  // the harness: two bands round the body with brass rings, tools at the side
  for (const z of [0.6, -3.6]) {
    K.box(T, 0, z > 0 ? 2.4 : 1.2, z, 7.4, 0.9, 1.3, leaD);
    for (const sx of [-1, 1]) { K.box(T, sx * 3.75, z > 0 ? -0.6 : -1.6, z, 0.6, 5.8, 1.3, leaD); K.box(T, sx * 3.95, z > 0 ? 1.6 : 0.6, z, 0.5, 1.5, 1.5, brass); K.box(T, sx * 4.1, z > 0 ? 1.6 : 0.6, z, 0.3, 0.7, 0.7, brassD); }
  }
  for (const sx of [-1, 1]) K.box(T, sx * 3.6, 0.6, -1.5, 0.5, 0.9, 5, leaD);
  K.box(T, 4.4, -1.2, -1.6, 0.6, 4, 0.7, 0x6a3a1c); K.box(T, 4.4, 0.8, -1.6, 1.2, 1.6, 2.6, brass);        // hammer
  K.box(T, -4.3, -1, -1.2, 0.5, 4.4, 0.5, 0x9a9aa4, 0, 0, 0.12); K.box(T, -4.3, -1, -2, 0.5, 4.4, 0.5, 0x8a8a94, 0, 0, -0.12);   // tongs
  // the cauldron of Greek fire: iron with a bronze key-pattern band
  const pot = group(T, 0, 1.4, -2.4);
  K.box(pot, 0, 0.5, 0, 4.6, 1, 4.6, iron); K.box(pot, 0, 2, 0, 6.6, 2.2, 6.6, iron); K.box(pot, 0, 3.8, 0, 7.4, 1.6, 7.4, ironL);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; K.boxY(pot, [0, 3.8, 0], a, 0, 0, 3.75, 1.3, 1, 0.2, i % 2 ? brass : brassD); K.boxY(pot, [0, 3.8, 0], a, 0, i % 2 ? 0.3 : -0.3, 3.9, 0.5, 0.4, 0.15, iron); }
  K.box(pot, 0, 4.8, 0, 7.8, 0.6, 7.8, iron);
  for (const sx of [-1, 1]) { K.box(pot, sx * 4.3, 4, 0, 0.6, 1.8, 1.8, brass); K.box(pot, sx * 3.4, 0.5, 0, 0.6, 4, 1.2, leaD); }
  K.box(pot, 0, 4.9, 0, 6.4, 0.4, 6.4, 0xff6a00);
  const fire = group(pot, 0, 5, 0);
  const GF = [0xff5a00, 0xff9a10, 0xffd040, 0x7aff2a, 0x3aff1a];
  // (a low glowing bed of fire in the mouth; the flames over it are live, flames.js)
  for (let i = 0; i < 12; i++) { const t = K.r() * 0.35, a = K.r() * Math.PI * 2, r = (1 - t) * 2.6; const z = 1.6 - t * 0.9; K.box(fire, Math.cos(a) * r, t * 6, Math.sin(a) * r, z, z * 1.3, z, GF[Math.min(4, Math.floor(t * 3 + K.r() * 2))]); }
  fire.scale.set(1, 0.65, 1);
  rig.extras.pot = pot; rig.extras.fire = fire;
  K.done();
  addFlames(rig, { cap: 44, palette: 'forge', rise: 26, turb: 30 }).source(pot, { at: [0, 5.6, 0], r: 2.6, rate: 52, life: [0.4, 0.8], size: [1.1, 2], up: 8, spread: 2.5 });
  return rig;
}

// Greek-fire automaton: a squat six-legged bronze walker in riveted plates
// gone green with verdigris (after the bronze Talos of vox-bosses-2), one
// glowing green eye in a crested head, pincers, and on its back a black-
// figure amphora of Greek fire with green flames licking out of the neck.
export function buildAutomaton() {
  const B = [0xa05a0c, 0x884a08, 0xbc7014], BD = [0x3a2008, 0x2a1606], VG = [0x2a8a6a, 0x1a6a50, 0x4aa880];
  const mat = skinMat('automaton', (S) => {
    paintQuad(S, { base: 0x985208, dark: 0x3a2008, belly: 0x2a1606, eye: 0x8aff5a, eyes: [[9, 11], [13, 11]], plates: 0xe0a030, teeth: false, nose: 0x3a2a10, noise: 0.22,
      custom: (s) => { for (let i = 0; i < 40; i++) s.dot(s.r() * 56, s.r() * 40, VG[i % 3], 2, 2); } });
    S.saturate(1.2);
  }, { rough: 0.4, emit: 1.2 });
  const rig = new QuadRig({ material: mat, scale: 1.05, bodyL: 10, bodyW: 9, bodyH: 5, legH: 4, legW: 1.8, headS: 5, legs: 6, splay: 0.7, snout: false, neckUp: -1.5, gait: 1.4 });
  const K = kit(rig, mat, { seed: 73, rough: 0.45, metal: 0.15, emit: 0.8 });
  const T = rig.torso;
  // riveted plates and a skirt of armour round the body, patches of verdigris
  K.box(T, 0, 2.8, 0, 9.6, 1, 10.4, B[2]);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) K.box(T, sx * 4.9, -0.6, -3.6 + i * 2.4, 0.8, 4, 2.2, B[i % 2], 0, 0, sx * 0.15);
  for (const sz of [-1, 1]) K.box(T, 0, -0.6, sz * 5.3, 8.6, 4, 0.8, B[1], -sz * 0.15, 0, 0);
  for (const [x, z] of [[-3.8, 4.4], [3.8, 4.4], [-3.8, -4.4], [3.8, -4.4], [0, 4.4], [0, -4.4], [-3.8, 0], [3.8, 0]]) K.box(T, x, 3.4, z, 0.7, 0.4, 0.7, BD[0]);
  K.clumps(T, [0, 0.5, 0], [9.6, 5, 10.4], { n: 14, size: [0.8, 1.5], cols: VG, faces: 'tlrfk', out: -0.35 });
  // legs: thigh plates and claw feet
  for (const leg of rig.legs) { K.box(leg, 0, -1.2, 0, 2.6, 2.4, 2.6, B[2]); K.box(leg, 0, -4, 0.6, 2.4, 0.8, 3.2, BD[0]); }
  // head: a crested bronze helm with a single green eye and mandible pincers
  const Hd = rig.head, hz = 5 * 0.35;
  K.box(Hd, 0, 2.8, hz, 1, 2.2, 6, B[2]); K.box(Hd, 0, 2.9, hz - 2.6, 1, 2.6, 1.6, 0xb02a10);
  K.box(Hd, 0, 0.3, hz + 2.6, 2.2, 1.6, 0.4, 0x8aff3a); K.box(Hd, 0, 0.3, hz + 2.8, 0.9, 0.7, 0.3, 0xe0ffa0);
  K.box(Hd, 0, 1.4, hz + 2.6, 5.4, 0.8, 0.6, BD[0]);
  for (const sx of [-1, 1]) { K.box(rig.mouth, sx * 1.6, 0, 1.6, 1, 1, 4, B[2], 0, -sx * 0.4, 0); K.box(rig.mouth, sx * 0.9, 0, 3.4, 0.8, 0.8, 1.4, BD[0], 0, sx * 0.6, 0); }
  // the amphora of Greek fire: stepped rings with a black-figure band
  const pot = new THREE.Group(); pot.position.set(0, 3.5 * PX, -1 * PX); rig.torso.add(pot);
  const ter = 0xc8641e, blk = 0x1a1210;
  K.box(pot, 0, 0.6, 0, 4.4, 1.2, 4.4, ter);
  K.box(pot, 0, 2.2, 0, 6.2, 2, 6.2, ter); K.box(pot, 0, 3.9, 0, 6.6, 1.6, 6.6, ter); K.box(pot, 0, 3.9, 0, 6.8, 0.9, 6.8, blk);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.boxY(pot, [0, 3.9, 0], a, 0, 0, 3.42, 0.7, 0.7, 0.2, i % 2 ? ter : 0xe0a040); }
  K.box(pot, 0, 5.4, 0, 6.2, 1.6, 6.2, ter); K.box(pot, 0, 6.5, 0, 4.6, 0.8, 4.6, blk);
  K.box(pot, 0, 7.3, 0, 3, 1.2, 3, ter); K.box(pot, 0, 8.1, 0, 3.8, 0.6, 3.8, blk);
  for (const sx of [-1, 1]) { K.box(pot, sx * 3.6, 6.2, 0, 0.8, 3.4, 0.8, ter); K.box(pot, sx * 2.8, 7.6, 0, 1.8, 0.8, 0.8, ter); }
  K.box(pot, 0, 0, 0, 7, 0.6, 7, B[1]); for (const sx of [-1, 1]) K.box(pot, sx * 3.3, 3, 0, 0.4, 6, 0.8, B[2]);
  // the Greek fire itself: a small glowing core in the neck, and live green
  // flames (flames.js) licking up out of it; in the wind-up before it bursts
  // the fire leaks from the seams of its plates too
  const fire = group(pot, 0, 8.2, 0);
  const GF = [0x3aff1a, 0x8aff3a, 0xd8ff8a];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, r = i % 2 ? 0.7 : 0.3; K.box(fire, Math.cos(a) * r, 0.3 + (i % 3) * 0.35, Math.sin(a) * r, 1.3 - (i % 3) * 0.25, 1.2, 1.3 - (i % 3) * 0.25, GF[i % 3]); }
  fire.scale.set(1.02, 0.6, 1.02);
  rig.extras.pot = pot; rig.extras.fire = fire;
  K.done();
  const F = addFlames(rig, { cap: 44, palette: 'greek', rise: 30, turb: 34 });
  F.source(pot, { at: [0, 8.6, 0], r: 1.3, rate: 50, life: [0.4, 0.8], size: [1.1, 2], up: 9, spread: 2.5 });
  for (const sx of [-1, 1]) F.source(T, { at: [sx * 4.7, 2.9, -4], to: [sx * 4.7, 2.9, 4], r: 0.3, rate: 14, life: [0.25, 0.45], size: [0.5, 0.9], up: 6, spread: 1.5, when: (e) => (e?.state === 'windup' ? 1 : 0) });
  return rig;
}
