// Champion looks: the named monsters that guard each open-world region and
// the stops of the Road West (openworld/runtime.js wakeChampions). A champion
// is a monster of its kind with its own model variant: recoloured, crowned,
// chained or shielded after design/concept/vox-ow-champions.png, bigger than
// the ordinary kind, with an outline glow and an aura of particles in its
// colour so it reads at a glance as a named boss.
//
//   CHAMPION_LOOKS[id]  the seven region champions (one model each)
//   KIND_LOOKS[kind]    any other champion (the Road West): a crown, a
//                       colour scheme for its kind and a glow
//   buildChampionRig(id, kind)  the rig alone (the workbench uses it)
//   applyChampionLook(e, id)    swap a spawned Enemy's rig for its champion look
import * as THREE from 'three/webgpu';
import { Rig, PX, makeCharMaterial, HOLD_PITCH, markTip } from './character.js';
import { paintPerson } from './mortals.js';
import { skinMat, group, HS, bruteLimbs, sway, withBuild, voxDensity } from './parts.js';
import { MONSTERS, HELLHOUND, buildMonsterModel, animateExtras, kit, dropMeshes, eagle, hound, buildScorpion, buildSkeleton, buildCyclops, cycDensity } from './monsters.js';
import { blob } from './fodder.js';
import { addFlames, remapFlames } from './flames.js';

const GOLD = 0xf0b030, GOLD_D = 0xb87a14, GOLD_L = 0xffe070;

// ---- shared trimmings ---------------------------------------------------------
// A spiked crown: a band round (cx, y, cz) of width w and depth d, spikes on
// every side (taller at the front) and glowing gems.
function crown(K, parent, { cx = 0, y = 0, cz = 0, w = 8, d = 8, h = 1.6, spike = 2.6, gold = GOLD, dark = GOLD_D, gem = 0xff2a3a, rx = 0 } = {}) {
  const g = group(parent, cx, y, cz, rx);
  for (const [x, z, bw, bd] of [[0, d / 2, w + 0.8, 0.8], [0, -d / 2, w + 0.8, 0.8], [-w / 2, 0, 0.8, d], [w / 2, 0, 0.8, d]]) {
    K.box(g, x, 0, z, bw, h, bd, gold); K.box(g, x, -h / 2 + 0.2, z * 1.02, bw * 1.01, 0.4, bd * 1.05, dark);
  }
  const n = Math.max(2, Math.round(w / 2.4));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1), x = -w / 2 + 0.6 + t * (w - 1.2), mid = 1 - Math.abs(t - 0.5) * 1.2;
    const sh = spike * (0.7 + mid * 0.5);
    K.box(g, x, h / 2 + sh / 2, d / 2, 0.9, sh, 0.8, gold); K.box(g, x, h / 2 + sh + 0.3, d / 2, 0.5, 0.7, 0.5, GOLD_L);
    K.box(g, x, h / 2 + sh * 0.4, -d / 2, 0.8, sh * 0.8, 0.8, gold);
  }
  for (const sx of [-1, 1]) for (const z of [-d / 4, d / 4]) K.box(g, sx * w / 2, h / 2 + spike * 0.35, z, 0.8, spike * 0.7, 0.8, gold);
  K.box(g, 0, 0, d / 2 + 0.45, 1.2, 1, 0.3, gem);
  for (const sx of [-1, 1]) K.box(g, sx * w * 0.3, 0, d / 2 + 0.45, 0.7, 0.7, 0.3, gem);
  return g;
}
// A crackling bolt: a zigzag of glowing cells from a along dir (unit-ish
// [x, y, z]) for n steps, kinking sideways every step.
function bolt(K, parent, a, dir, n = 6, step = 1.6, col = 0xffe84a, core = 0xffffc0, kink = [1, 0, 0]) {
  let [x, y, z] = a;
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? 1 : -1, nx = x + dir[0] * step + kink[0] * s * 0.9, ny = y + dir[1] * step + kink[1] * s * 0.9, nz = z + dir[2] * step + kink[2] * s * 0.9;
    const mx = (x + nx) / 2, my = (y + ny) / 2, mz = (z + nz) / 2, L = Math.hypot(nx - x, ny - y, nz - z);
    const rz = Math.atan2(nx - x, ny - y), rx = Math.atan2(nz - z, Math.hypot(nx - x, ny - y));
    K.box(parent, mx, my, mz, 0.7, L + 0.4, 0.7, col, rx, 0, -rz); K.box(parent, mx, my, mz, 0.35, L + 0.2, 0.75, core, rx, 0, -rz);
    x = nx; y = ny; z = nz;
  }
}
// A hanging chain of iron links from a downward, alternating flat and edge-on.
function chain(K, parent, a, n, { dir = [0, -1, 0], cols = [0x5a5a64, 0x3c3c46, 0x7a7a84], step = 1.6 } = {}) {
  for (let i = 0; i < n; i++) {
    const x = a[0] + dir[0] * step * i, y = a[1] + dir[1] * step * i, z = a[2] + dir[2] * step * i;
    if (i % 2) K.box(parent, x, y, z, 0.6, 2, 1.5, cols[1]); else { K.box(parent, x, y, z, 1.5, 2, 0.6, cols[0]); K.box(parent, x, y + 0.6, z, 1.6, 0.4, 0.7, cols[2]); }
  }
}

// ---- the seven region champions -------------------------------------------------
// Bronzebeak (fields): a huge Stymphalian bird in razor bronze feathers with
// red-tipped wings, a tall red crest, burning red eyes and knife-quills.
function buildBronzebeak() {
  const rig = eagle('champ_bronzebeak', { scale: 0.9, metal: true, pal: { main: 0xa05a14, light: 0xf0b030, dark: 0x5a280a, breast: 0xe8a42a, tip: 0xd83018, edge: 0xf0b838, eye: 0xff3010 } });
  const K = kit(rig, rig.material, { seed: 101, rough: 0.4, metal: 0.25 });
  const Hd = rig.head, hk = HS * 7 / 8, RED = [0xd82a14, 0xb81e10, 0xf04a1a, 0xff7a20];
  // the crest: a fan of red blades rising from the crown and sweeping back
  for (let i = 0; i < 7; i++) {
    const L = 5.5 - Math.abs(i - 2) * 0.55;
    K.box(Hd, 0, 7 * hk + L / 2 - 0.2, 2.2 - i * 1.1, 1.1, L, 1.2, RED[i % 3], -0.35 - i * 0.12);
    if (i % 2 === 0) for (const sx of [-1, 1]) K.box(Hd, sx * 1.2, 7 * hk + L * 0.35, 1.6 - i * 1.1, 0.8, L * 0.7, 1, RED[(i + 1) % 3], -0.4 - i * 0.12, 0, sx * 0.25);
  }
  // burning eyes and a red streaked breast of knife feathers
  for (const sx of [-1, 1]) K.box(Hd, sx * 2.4 * hk, 4.1 * hk, 4 * hk + 0.4, 2, 1.2, 0.3, 0xff2a0a);
  for (let i = 0; i < 6; i++) K.box(rig.torso, -2.5 + i, 7.4 - (i % 2) * 2, 4.3, 0.6, 3.4, 0.5, i % 2 ? 0xc82a14 : 0xf0c040, -0.25);
  for (let i = 0; i < 10; i++) K.box(rig.torso, -3.6 + i * 0.8, 12.6 + (i % 2) * 0.8, -1.8 - (i % 3) * 0.6, 0.5, 3.2, 0.5, i % 3 ? 0xf8d060 : 0xd8301a, -0.6, 0, (i - 4.5) * 0.1);
  // wing shards: loose razor feathers shed off the wing tips
  for (const w of rig.extras.wings ?? []) for (let i = 0; i < 4; i++) K.box(w.elbow, w.side * (6 + i * 2.2), -6 - i * 1.4, -0.4, 0.5, 2.6, 1, i % 2 ? 0xd83018 : 0xf0b030, 0, 0, w.side * 0.6);
  K.done();
  return rig;
}
// Shadowfang (woods): a scarred black hellhound, lava cracks all over, a
// broken iron collar trailing chains, and smoking red eyes.
function buildShadowfang() {
  const rig = hound('champ_shadowfang', HELLHOUND, { fur: 110, cracks: 20, collar: false });
  const K = kit(rig, rig.material, { seed: 103, rough: 0.6, metal: 0.3, emit: 0.7 });
  const { hs, H, L, W } = rig.dims, IRON = [0x5a5a64, 0x3c3c46, 0x7a7a84];
  // the broken collar: heavy riveted iron plates round the neck, one gap
  // (the full hellhound is built at the heroes' voxel size: its neck ring is fitted, not scaled from the head)
  const big = rig.spec.big, r = big ? 11.6 : hs * 0.78, n = big ? 16 : 12, col = big ? group(rig.neck, 0, -5.5, 1.5, -0.6) : group(rig.neck, 0, -1.2, 0.6, -0.3);
  for (let i = 0; i < n; i++) {
    if (i === 3) continue;
    const a = i / n * Math.PI * 2, x = Math.sin(a) * r, y = Math.cos(a) * r;
    K.box(col, x, y, 0, 2 * Math.PI * r / n + 0.4, big ? 3 : 1.8, big ? 3.4 : 2.4, IRON[i % 2], 0, 0, -a);
    K.box(col, Math.sin(a) * (r + 0.9), Math.cos(a) * (r + 0.9), 0.6, 0.7, 0.7, 0.7, IRON[2], 0, 0, -a);
  }
  K.box(col, 0, -r - 1.4, 0.4, 2.4, 2.4, 1.2, IRON[1]);
  chain(K, col, [0, -r - 3.2, 0.4], 6, { cols: IRON });
  chain(K, col, [r * 0.8, -r * 0.4, -0.8], 7, { dir: [0.35, -0.6, -0.7], cols: IRON });
  // more lava: glowing seams on the face and down the legs, a burning spine
  K.cracks(rig.head, [0, 0, hs * 0.35], [hs + 0.2, hs * 0.8, hs], { n: 6, cols: [0xff4a00, 0xff8a10], faces: 'lrt', len: [3, 6] });
  for (let i = 0; i < 6; i++) K.box(rig.torso, 0, H / 2 + 2.6, L / 2 - 2.5 - i * 1.8, 0.6, 1.4 + (i % 2), 0.6, i % 2 ? 0xffa000 : 0xff5a00, -0.5);
  // scars: pale gashes across the muzzle and flank
  for (const [x, y, z, w, rz] of [[hs * 0.35, hs * 0.1, hs * 0.85, 0.3, 0.7], [-hs * 0.35, hs * 0.2, hs * 0.75, 0.3, -0.6]]) K.box(rig.head, x, y, z, w, 3, 0.6, 0x9a6a6a, 0, 0, rz);
  for (const sx of [-1, 1]) K.box(rig.torso, sx * (W / 2 + 1.4), H * 0.1, -1, 0.4, 0.5, 6, 0x9a6a6a, 0.5, 0, 0);
  // the eyes burn hotter
  const front = hs * 0.35 + hs / 2;
  for (const sx of [-1, 1]) { K.box(rig.head, sx * hs * 0.24, hs * 0.05, front + 0.3, 2, 1.2, 0.3, 0xff1a00); K.box(rig.head, sx * hs * 0.24, hs * 0.05, front + 0.4, 0.8, 0.6, 0.2, 0xffe060); }
  K.done();
  rig.extras.eyes = rig.head;
  return rig;
}
// Queen Gale (shore): a storm-grey harpy queen with gold-tipped plumage, a
// crown of gold and white plumes, lightning crackling from her talons and
// along her wings.
function buildQueenGale() {
  const rig = eagle('champ_queen_gale', { scale: 1, pal: { main: 0x4a4c66, light: 0x9a9cb8, dark: 0x22243a, breast: 0xd4d0dc, tip: 0xf0c840, edge: 0xc8a040, gold: 0xf0c040, goldD: 0xb08a20, eye: 0xffe040, skin: 0xb4b8bc, hair: 0xd4d4dc } });
  const K = kit(rig, rig.material, { seed: 107, rough: 0.6, emit: 0.9 });
  const Hd = rig.head, hk = HS * 7 / 8;
  const c = crown(K, Hd, { y: 7.4 * hk, cz: -0.3, w: 7.4, d: 7, spike: 3, gem: 0x3ad8ff });
  for (let i = 0; i < 5; i++) K.box(c, -2 + i, 4.5 + (i % 2), -2.6 - (i % 2), 0.9, 4, 0.9, i % 2 ? 0xe8e8f0 : 0xc8c8d8, -0.5, 0, (i - 2) * 0.2);
  // a gold torque on the breast
  for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.225; K.box(rig.torso, Math.sin(a) * 4.2, 10.6 - Math.cos(a) * 1.6, 3.8, 1.2, 1, 0.8, i % 2 ? GOLD : GOLD_L, 0, 0, a); }
  K.box(rig.torso, 0, 8.8, 4.3, 1.6, 1.6, 0.4, 0x3ad8ff);
  // lightning held in the talons, and along the wings
  for (const leg of [rig.legR, rig.legL]) bolt(K, leg, [0, -6, 3.4], [0, -0.2, 1], 5, 1.5, 0xffe84a, 0xffffd0, [1, 0, 0]);
  for (const w of rig.extras.wings ?? []) bolt(K, w.elbow, [w.side * 2, -3, 0.8], [w.side, -0.4, 0], 6, 1.8, 0xffe84a, 0xffffd0, [0, 1, 0]);
  K.done();
  return rig;
}
// The Red King (canyon): a crimson giant scorpion in gold-edged plates, a
// crown of gold spines on its head, gold spikes down its back, gold-tipped
// pincers and a golden stinger.
function buildRedKing() {
  const rig = buildScorpion({ id: 'champ_red_king', pal: { C: [0xa81c14, 0xc42a1a, 0x82140e], CD: 0x3a0806, CL: GOLD, belly: 0xd84a2a, VEN: 0xffd040, sting: [0xc42a1a, GOLD, 0xf8d050] } });
  const K = kit(rig, rig.material, { seed: 109, rough: 0.35, metal: 0.3, emit: 0.8 });
  const T = rig.torso, Hd = rig.head;
  crown(K, Hd, { y: 2.6, cz: 1.4, w: 4.4, d: 4, h: 1.1, spike: 2.2, gem: 0xff3a1a });
  for (let i = 0; i < 5; i++) {
    const z = 4 - i * 2.1;
    for (const sx of i % 2 ? [-1, 1] : [0]) { const x = sx * 2; K.box(T, x, 3.1, z, 1.2, 1.4, 1.2, GOLD_D); K.box(T, x, 4.2, z - 0.2, 0.8, 1.4, 0.8, GOLD); K.box(T, x, 5.2, z - 0.4, 0.45, 1, 0.45, GOLD_L); }
  }
  for (const c of rig.extras.claws ?? []) { const pin = c.jawA.parent; K.box(pin, 0, 1.5, 1.8, 2.8, 0.6, 3.8, GOLD); for (const j of [c.jawA, c.jawB]) K.box(j, 0, 0.9, 0.6, 0.6, 0.6, 2.8, GOLD_L); }   // (on the fingers, which open and close)
  for (const seg of rig.tail) K.box(seg, 0, -2.1, -1.4, 0.6, 1.6, 0.6, GOLD, 0.3);   // (down the outside of the curl)
  K.done();
  return rig;
}
// The Bronze Warden (labyrinth): a hulking bronze automaton gone green with
// verdigris, one glowing blue eye in a crested helm, a furnace core in its
// chest, a war hammer and a huge round shield with a sun face.
function buildBronzeWarden() {
  const B = 0xc87a18, BD = 0x7a4408, BL = 0xf0b030, VG = [0x2a9a80, 0x3ab894, 0x1a7a62], EYE = 0x3ae8ff;
  const mat = skinMat('champ_bronze_warden', (S) => {
    paintPerson(S, { skin: B, eye: 0x0a1418, eyeWhite: 0x0a1418, brow: BD, mouth: false, top: B, sleeve: B, hand: B, pants: BD, shoes: BD });
    for (let i = 0; i < 60; i++) S.dot(S.r() * 64, S.r() * 64, VG[i % 3], 2, 2);
  }, { emit: 0.4, rough: 0.45, res: 2 });
  const rig = new Rig({ material: mat, scale: 1.55, bodyW: 10, bodyD: 6, armW: 5, legH: 11 });
  bruteLimbs(rig, { armLen: 1.05, armThick: 1.2, legThick: 1.3, legX: 3 });
  const K = kit(rig, mat, { seed: 113, rough: 0.45, metal: 0.35, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  // helm: a squared bronze helm with a crest ridge, a dark face plate and one blue eye
  K.box(Hd, 0, H8 / 2, 0, H8 + 1, H8 + 0.6, H8 + 1, B);
  K.box(Hd, 0, H8 + 0.6, 0, H8 - 1, 1, H8 - 1, BL);
  K.box(Hd, 0, H8 + 1.6, -0.5, 1.4, 2, H8 + 1, BD); K.box(Hd, 0, H8 + 2.8, -0.5, 1, 0.8, H8 - 1, BL);
  K.box(Hd, 0, H8 * 0.5, H8 / 2 + 0.55, H8 - 1.6, 2, 0.4, 0x14100c);
  K.box(Hd, 0, H8 * 0.5, H8 / 2 + 0.75, 2.2, 1.6, 0.3, EYE); K.box(Hd, 0, H8 * 0.5, H8 / 2 + 0.85, 1, 0.8, 0.3, 0xe0ffff);
  for (const sx of [-1, 1]) { K.box(Hd, sx * (H8 / 2 + 0.7), H8 * 0.4, 0.6, 0.6, H8 * 0.7, H8 * 0.6, BD); K.box(Hd, sx * 2.4, 1.4, H8 / 2 + 0.6, 2.6, 2.8, 0.4, BL); }
  K.clumps(Hd, [0, H8 / 2, 0], [H8 + 1, H8 + 0.6, H8 + 1], { n: 14, size: [0.8, 1.4], cols: VG, faces: 'tlrk', out: -0.3 });
  // body: a chest plate trimmed with a key pattern, a glowing core, plated belly
  K.box(T, 0, 8, 0, 11, 9, 7, B);
  K.box(T, 0, 2.6, 0, 10, 3, 6.6, BD);
  for (let x = -4.5; x <= 4.6; x += 1.5) { K.box(T, x, 12.2, 3.6, 1.2, 0.8, 0.4, BL); K.box(T, x + 0.4, 11.5, 3.6, 0.5, 0.8, 0.4, BL); }
  const core = group(T, 0, 7.6, 3.6);
  K.box(core, 0, 0, 0, 4, 4, 0.6, BD); K.box(core, 0, 0, 0.3, 2.8, 2.8, 0.4, EYE); K.box(core, 0, 0, 0.5, 1.2, 1.2, 0.3, 0xe0ffff);
  for (const [x, y] of [[-1.9, 0], [1.9, 0], [0, 1.9], [0, -1.9]]) K.box(core, x, y, 0.4, 0.6, 0.6, 0.4, BL);
  K.clumps(T, [0, 6, 0], [11, 12, 7], { n: 16, size: [0.9, 1.6], cols: VG, faces: 'fklr', out: -0.3 });
  for (const [x, z] of [[-4.6, 3.6], [4.6, 3.6], [-4.6, -3.6], [4.6, -3.6]]) for (const y of [4.5, 11]) K.box(T, x, y, z, 0.7, 0.7, 0.3, BL);
  // shoulders: big stepped pauldrons; arms in plated rings; blocky fists
  for (const arm of [rig.armR, rig.armL]) {
    K.box(arm, 0, 1.2, 0, 7.6, 3, 7.4, B); K.box(arm, 0, -0.8, 0, 8, 1.6, 7.8, BD); K.box(arm, 0, 3, 0, 5.6, 1, 5.6, BL);
    for (const y of [-5, -8.5]) K.box(arm, 0, y, 0, 6.4, 1.2, 6.4, BD);
    K.box(arm, 0, -11.4, 0, 6.6, 3.6, 6.6, B);
    K.clumps(arm, [0, -6, 0], [6, 10, 6], { n: 8, size: [0.8, 1.3], cols: VG, faces: 'lrfk', out: -0.3 });
  }
  for (const leg of [rig.legR, rig.legL]) {
    K.box(leg, 0, -2.6, 0, 6.2, 4.6, 6.2, B); K.box(leg, 0, -5.6, 0.6, 6, 1.6, 6.2, BL);
    K.box(leg, 0, -8.6, 0, 6, 4, 6, BD); K.box(leg, 0, -10.25, 0.6, 7, 1.3, 7.2, B); K.box(leg, 0, -10.45, 3.9, 6.4, 0.9, 1, BL);   // (boots kept short of the toe: a long foot's tip dipped through the floor as the leg swung in the run)
    K.clumps(leg, [0, -6, 0], [6, 10, 6], { n: 8, size: [0.8, 1.3], cols: VG, faces: 'lrfk', out: -0.3 });
  }
  // the war hammer
  const ham = group(rig.handR, 0, -1, 1.4, HOLD_PITCH - Math.PI / 2, 0, 0);   // (built along +z: see the hand-axis convention in character.js)
  K.box(ham, 0, 0, 3, 1.4, 1.4, 20, 0x4a3018); for (const z of [-5, 0, 5]) K.box(ham, 0, 0, z + 3, 1.8, 1.8, 0.8, BL);
  K.box(ham, 0, 0, 13.5, 4, 7.6, 5, B); K.box(ham, 0, 0, 13.5, 4.3, 1.2, 5.3, BL); for (const sy of [-1, 1]) K.box(ham, 0, sy * 4, 13.5, 3, 0.8, 3.6, BD);
  markTip(ham, 0, 0, 16, 'war hammer'); rig.extras.hammer = ham;
  // the sun shield: a big round bronze shield, a teal field, gold rays and a face
  const sh = group(rig.armL, 1, -7.6, 4.6, 0, -0.25, 0), R = 9.5;
  for (let y = -R + 0.5; y < R; y += 1) {
    const hw = Math.sqrt(R * R - y * y);
    K.box(sh, 0, y, 0, hw * 2, 1.05, 1.2, BD);
    if (hw > 1.5) K.box(sh, 0, y, 0.5, hw * 2 - 2, 1.05, 0.5, K.tone([0x2a7a6a, 0x34887a, 0x226a5c], 0.1));
  }
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; K.box(sh, Math.cos(a) * (R - 0.6), Math.sin(a) * (R - 0.6), 0.75, 1.2, 1.8, 0.5, i % 2 ? BL : B, 0, 0, a); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 5.4; K.box(sh, Math.cos(a) * r, Math.sin(a) * r, 0.85, i % 2 ? 1 : 1.4, 3.6, 0.4, GOLD, 0, 0, a - Math.PI / 2); }
  for (let y = -3.4; y <= 3.4; y += 1) { const hw = Math.sqrt(3.9 * 3.9 - y * y); K.box(sh, 0, y, 0.9, hw * 2, 1.02, 0.4, GOLD); }
  for (const sx of [-1, 1]) { K.box(sh, sx * 1.3, 0.8, 1.15, 1, 0.6, 0.2, GOLD_D); K.box(sh, sx * 1.4, 1.6, 1.15, 1.6, 0.4, 0.2, GOLD_D); }
  K.box(sh, 0, -0.2, 1.15, 0.6, 1.4, 0.2, GOLD_D); K.box(sh, 0, -1.6, 1.15, 2, 0.5, 0.2, GOLD_D);
  rig.extras.shield = sh;
  rig.extras.pot = core;    // (its Greek-fire vents puff from the core)
  K.done();
  rig.hunch = 0.12;
  return rig;
}
// Gorgos (othrys): a Cyclops chieftain in a bear pelt, the bear's head worn
// as a hood, a necklace of bones and skulls, a skull on his shoulder, a
// burning orange eye and a spiked tree-trunk club.
function buildGorgos() {
  const PELT = [0x6a4224, 0x5a3418, 0x7a4c28, 0x4a2a14];
  const rig = buildCyclops({ id: 'champ_gorgos', pal: { wool: PELT, iris: 0xff6a10, ram: false, hood: true, dk: 0.95 } });   // (dk: its hood and pelt keep it under 25k)
  const K = kit(rig, rig.material, { seed: 127, rough: 0.85, density: cycDensity(rig) });   // (at the cyclops's own voxel size)
  const T = rig.torso, Hd = rig.head, hs = (9 / 8) * HS, BONE = [0xe8e0c8, 0xd0c8b0];
  // the bear head hood: a furry dome on his head, a snout over his brow, ears and fangs
  // (pass 3: sculpted as on vox-ow-champions: a rounded bear's skull over his
  // mane, its muzzle jutting over his brow with fangs hanging down, round
  // ears, and the pelt falling down the sides and back of his head)
  const hood = group(Hd, 0, 10.4, 0);   // (on the mane: the rebuilt cyclops's head is sculpted, not the 8-pixel skin box)
  const pelt = () => K.tone(PELT, 0.1);
  blob(K, hood, [0, -0.8, -0.4], [6.2, 3.8, 6.2], 1.3, pelt, { pw: 2.2, lo: -0.3, run: [1, 2] });   // (a little coarser: a pelt, and the budget)
  blob(K, hood, [0, 0.4, 5.4], [3, 2, 3.2], 1, (x, y) => (y > 0.5 ? PELT[2] : pelt()), { pw: 2.1 });
  blob(K, hood, [0, -0.2, 7.6], [2.2, 1.4, 2], 1, () => PELT[2], { pw: 2 });
  K.box(hood, 0, 0.6, 9.4, 2.4, 1.4, 0.8, 0x1a1008); K.box(hood, 0, -1.4, 7.2, 3.6, 0.8, 2.6, 0x5a1a10);
  for (const sx of [-1, 1]) {
    blob(K, hood, [sx * 4.2, 2.4, 0.4], [1.4, 1.4, 0.9], 1, () => PELT[1], { pw: 2 }); K.box(hood, sx * 4.2, 2.4, 1.1, 1.2, 1.2, 0.2, 0x3a2010);
    for (const [x, L] of [[1.2, 1.4], [2.1, 1]]) K.box(hood, sx * x, -1.6 - L / 2, 7.8, 0.6, L, 0.6, BONE[0]);   // (above his brow: his eye stays clear)
    K.box(hood, sx * 1.9, 1.8, 6.1, 0.9, 0.7, 0.3, 0xffa020);
    blob(K, hood, [sx * 5.2, -5.2, -0.4], [1.5, 4.6, 3.8], 1.3, pelt, { pw: 2.2, run: [1, 2] });
  }
  for (let i = 0; i < 9; i++) K.box(hood, -5 + i * 1.25, -4 - (i % 3) * 0.8, -5.2, 1.3, 7 + (i % 3) * 1.4, 1, PELT[i % 4]);   // the pelt hanging down his back
  for (let i = 0; i < 9; i++) { const L = 6 + (i % 3) * 3; K.box(T, -5.4 + i * 1.35, 13 - L / 2, -3.6, 1.6, L, 1.2, PELT[i % 4]); }
  K.shag(T, [0, 12, -0.5], [11, 1.4, 6.6], { cols: PELT, step: 2.4, len: [1.8, 3], low: 1, top: true, sides: true });
  // a necklace of teeth and bones with three small skulls
  for (let i = 0; i < 11; i++) { const a = -1.1 + i * 0.22; K.box(T, Math.sin(a) * 4.8, 11.4 - Math.cos(a) * 2.6, 3.6, 0.8, 1.8, 0.8, BONE[i % 2], 0, 0, a); }
  for (const x of [-2.8, 0, 2.8]) {
    const y = x ? 9.6 : 8.6;
    K.box(T, x, y, 4, 2, 2, 1.4, BONE[0]); K.box(T, x, y - 1.1, 4.2, 1.4, 0.6, 1, BONE[1]);
    for (const sx of [-1, 1]) K.box(T, x + sx * 0.5, y + 0.2, 4.75, 0.5, 0.6, 0.1, 0x1a1410);
  }
  // a skull on the right shoulder and skulls on the belt
  const sk = group(T, -6, 12.8, 0.6, 0, 0.3, 0);
  K.box(sk, 0, 0.4, 0.6, 3.4, 3.2, 3.4, BONE[0]); K.box(sk, 0, -1.4, 1.2, 2.6, 1, 2.2, BONE[1]);
  for (const sx of [-1, 1]) K.box(sk, sx * 0.8, 0.6, 2.35, 0.8, 0.8, 0.1, 0x1a1410);
  for (const x of [-4, 4]) { K.box(T, x, 1.4, 3.8, 1.8, 1.8, 1.2, BONE[0]); for (const sx of [-1, 1]) K.box(T, x + sx * 0.4, 1.6, 4.45, 0.4, 0.4, 0.1, 0x1a1410); }
  // spikes of stone and a twist of vine on the club
  const club = rig.extras.club;
  if (club) {
    for (const [x, y, z, rx, rz] of [[3, 15, 0, 0, -1.2], [-3, 17, 0, 0, 1.2], [0, 16, 3, 1.2, 0], [0, 18, -3, -1.2, 0], [2.4, 19.5, 2, 0.8, -0.8], [-2.4, 14, -2, -0.8, 0.8], [0, 21, 0, 0, 0]]) K.box(club, x, y, z, 1.4, 2.6, 1.4, 0x9a968a, rx, 0, rz);
    for (let i = 0; i < 8; i++) { const a = i * 0.9; K.box(club, Math.cos(a) * 1.6, 3 + i * 1.3, Math.sin(a) * 1.6, 0.7, 1.3, 0.7, 0x4a6a2a); }
  }
  K.done();
  return rig;
}
// The Pale King (asphodel): a skeleton king in tarnished black armour, a
// gold crown with green gems, green fire in his eyes and over his crown, a
// tattered dark cloak and a black sword edged with green flame.
function buildPaleKing() {
  const IRON = 0x2c2e3a, IRON_D = 0x16171e;
  const rig = buildSkeleton({ id: 'champ_pale_king', helmet: false, gear: false, pal: { bone: 0xd8d4c4, boneD: 0xa8a494, olive: IRON, oliveD: IRON_D, khaki: 0x3a3428, camo: [IRON, 0x1c1d26, 0x3a3c4a, 0x6a5a2a], boot: { upper: IRON, sole: 0x101014, lace: 0x8a7a3a } } });
  const K = kit(rig, rig.material, { seed: 131, rough: 0.5, metal: 0.3, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS, GF = [0x3aff6a, 0x8affa0, 0x1ad84a];
  crown(K, Hd, { y: H8 + 0.6, w: H8 + 0.4, d: H8 + 0.4, h: 1.8, spike: 3.2, gold: 0xc89a30, dark: 0x7a5a18, gem: 0x3aff6a });
  for (const sx of [-1, 1]) { K.box(Hd, sx * 2.2 * HS, 4.3 * HS, H8 / 2 + 0.2, 1.6, 1.4, 0.3, GF[0]); K.box(Hd, sx * 2.2 * HS, 4.3 * HS, H8 / 2 + 0.3, 0.6, 0.6, 0.3, 0xe0ffe8); }
  // green flame licking up over the crown
  const flame = group(Hd, 0, H8 + 1, 0);
  for (let i = 0; i < 10; i++) { const t = K.r() * 0.35, a = K.r() * Math.PI * 2, r = 3.6 - t * 2; const z = 1.3 - t * 0.6; K.box(flame, Math.cos(a) * r, 1.5 + t * 5, Math.sin(a) * r, z, z * 1.4, z, GF[Math.floor(K.r() * 3)]); }
  rig.extras.flameHair = flame;
  addFlames(rig, { cap: 40, palette: 'greek', rise: 24, turb: 28 }).source(flame, { at: [0, 2.4, 0], r: 3.2, rate: 44, life: [0.35, 0.7], size: [0.9, 1.7], up: 7, spread: 2 });
  // armour: gold-trimmed pauldrons, a gorget, a skull-buckled belt
  for (const arm of [rig.armR, rig.armL]) { K.box(arm, 0, 1, 0, 5, 2.6, 5.4, IRON); K.box(arm, 0, -0.6, 0, 5.3, 1, 5.7, 0xa8842a); K.box(arm, 0, 2.4, 0, 3.6, 0.8, 4.2, 0xc89a30); for (const z of [-1.6, 0, 1.6]) K.box(arm, 0, 2.8, z, 0.6, 1.6, 0.6, 0xc89a30); }
  K.box(T, 0, 12.2, 0, 7, 1.4, 5.8, 0xa8842a);
  K.box(T, 0, 1.2, 0, 9.2, 1.6, 5.2, 0x8a6a20); K.box(T, 0, 1.2, 2.7, 2.4, 2.4, 0.6, 0xe0d8c0); for (const sx of [-1, 1]) K.box(T, sx * 0.5, 1.6, 3.05, 0.6, 0.6, 0.1, 0x101010);
  for (let i = 0; i < 4; i++) K.box(T, 0, 10.6 - i * 2, 2.9, 5.6 - i * 0.6, 0.5, 0.4, 0xc8c0a8);    // ribs gleaming through the plate
  // the cloak: tattered dark strips from the shoulders to the heels
  for (let x = -5.2; x <= 5.3; x += 1.3) { const L = 18 + K.r() * 5; K.box(T, x, 12.5 - L / 2, -3.2 - Math.abs(x) * 0.05, 1.4, L, 0.6, K.tone([0x1a1c2c, 0x24263a, 0x12131c, 0x2a2440], 0.1)); }
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const L = 8 + K.r() * 6; K.box(T, sx * 5.8, 12 - L / 2, -1.6 + i * 0.9, 0.6, L, 1, 0x1a1c2c); }
  // the black sword, edged in green flame (the muzzle is where his bolts leave)
  const sw = group(rig.handR, 0, -1, 1, HOLD_PITCH - Math.PI / 2, 0, 0);   // (built along +z)
  K.box(sw, 0, 0, -0.6, 1.2, 1.2, 3, 0x2a1a10); K.box(sw, 0, 0, -2.4, 1.6, 1.6, 1, 0xc89a30); K.box(sw, 0, 0, 1.2, 4.4, 1, 0.9, 0xc89a30);
  K.box(sw, 0, 0, 9, 0.6, 2, 15, 0x14141a); K.box(sw, 0, 0, 17, 0.6, 1.2, 1.4, 0x14141a);
  for (const sy of [-1, 1]) K.box(sw, 0, sy * 1.05, 9, 0.5, 0.3, 14, GF[0]);
  K.box(sw, 0, 0, 9, 0.7, 0.4, 13, 0x1ad84a);
  markTip(sw, 0, 0, 17.7, 'black sword'); rig.extras.blade = sw; rig.extras.muzzle = group(sw, 0, 0, 18);
  for (const hand of [rig.handL]) for (let i = 0; i < 6; i++) K.box(hand, (K.r() - 0.5) * 2.4, -1 + K.r() * 2.4, (K.r() - 0.5) * 2.4, 0.9, 1.2, 0.9, GF[i % 3]);
  K.done();
  return rig;
}

// look: { build, shell (outline colour), aura: { kind: 'embers'|'smoke'|'spark'|'wisp'|'dust', col: [r, g, b] HDR, at: 'head'|'body' }, scale (on top of the model's own), size (hit height and radius factor) }
export const CHAMPION_LOOKS = {
  fields_bronzebeak: { kind: 'stymphalian', build: buildBronzebeak, shell: 0xff6a1a, aura: { kind: 'embers', col: [2.6, 1.2, 0.3] }, scale: 2.1 },
  woods_shadowfang: { kind: 'hellhound', build: buildShadowfang, glow: 0, shell: 0xff2a0a, aura: { kind: 'smoke', col: [2.6, 0.6, 0.1], at: 'head' }, scale: 1.3 },
  shore_queen_gale: { kind: 'harpy', build: buildQueenGale, shell: 0xffe040, aura: { kind: 'spark', col: [2.6, 2.4, 0.8] }, scale: 1.85 },
  canyon_red_king: { kind: 'scorpion', build: buildRedKing, shell: 0xffb020, aura: { kind: 'dust', col: [2.4, 1.6, 0.3] }, scale: 2.4 },
  lab_bronze_warden: { kind: 'automaton', build: buildBronzeWarden, shell: 0x3ae8ff, aura: { kind: 'spark', col: [0.5, 2.2, 2.6] }, scale: 1.6, size: 2.4 },   // (size audit: a giant automaton, about 1.85× a hero; its hall is a 15-block open ring)
  oth_gorgos: { kind: 'cyclops', build: buildGorgos, shell: 0xff6a20, aura: { kind: 'embers', col: [2.6, 1, 0.2], at: 'head' }, scale: 1.12 },
  asphodel_pale_king: { kind: 'skeleton', build: buildPaleKing, glow: 0.008, shell: 0x3aff7a, aura: { kind: 'wisp', col: [0.5, 2.6, 1.0] }, scale: 1.45 },
};

// ---- any other champion: a crown, a colour scheme by kind and a glow -----------
// remap(hsl, hot): turn a colour (sRGB h, s, l in 0..1) in place.
const hueIn = (h, a, b) => (a < b ? h >= a && h <= b : h >= a || h <= b);
export const KIND_LOOKS = {
  // blue-flame hounds: the lava burns cyan
  hellhound: { shell: 0x3a9aff, aura: { kind: 'smoke', col: [0.4, 1.4, 2.6], at: 'head' }, scale: 1.25, remap: (c) => { if (hueIn(c.h, 0.97, 0.14) && c.s > 0.55 && c.l > 0.3) c.h = 0.55; } },
  pup: { shell: 0x3a9aff, aura: { kind: 'smoke', col: [0.4, 1.4, 2.6] }, scale: 1.4, remap: (c) => { if (hueIn(c.h, 0.97, 0.14) && c.s > 0.55 && c.l > 0.3) c.h = 0.55; } },
  // bone-white skeletons in crimson armour
  skeleton: { shell: 0xff3a3a, aura: { kind: 'wisp', col: [2.6, 0.5, 0.4] }, scale: 1.4, remap: (c) => { if (hueIn(c.h, 0.1, 0.32) && c.l < 0.58 && c.s > 0.12) { c.h = 0.99; c.s = Math.min(1, c.s + 0.35); c.l *= 0.85; } } },
  spartoi: { shell: 0xff3a3a, aura: { kind: 'wisp', col: [2.6, 0.5, 0.4] }, scale: 1.4, remap: (c) => { if (hueIn(c.h, 0.42, 0.55)) { c.h = 0.99; } } },
  // obsidian spiders with violet fire
  spider: { shell: 0xb05aff, aura: { kind: 'spark', col: [1.8, 0.6, 2.6] }, scale: 1.7, remap: (c, hot) => { if (hot) c.h = 0.8; else if (hueIn(c.h, 0.02, 0.16)) { c.h = 0.72; c.s *= 0.4; c.l *= 0.55; } } },
  // royal purple dracaenae
  dracaena: { shell: 0xd060ff, aura: { kind: 'spark', col: [2, 0.6, 2.6] }, scale: 1.3, remap: (c) => { if (hueIn(c.h, 0.25, 0.5)) c.h = 0.78; } },
  // blue-fire empousai
  empousa: { shell: 0x40c0ff, aura: { kind: 'embers', col: [0.4, 1.6, 2.6], at: 'head' }, scale: 1.3, remap: (c, hot) => { if (hueIn(c.h, 0.97, 0.12) && (hot || c.s > 0.75)) c.h = 0.56; } },
  harpy: { shell: 0xffd84a, aura: { kind: 'spark', col: [2.6, 2, 0.6] }, scale: 1.6 },
  stymphalian: { shell: 0xff8a2a, aura: { kind: 'embers', col: [2.6, 1.2, 0.3] }, scale: 1.4 },   // (size audit, round 4: the bird itself grew ×1.36, so the champion stays near its old size, a wingspan about 3× Percy)
  scorpion: { shell: 0xffb020, aura: { kind: 'dust', col: [2.4, 1.6, 0.3] }, scale: 2 },
  cyclops: { shell: 0xff6a20, aura: { kind: 'embers', col: [2.6, 1, 0.2] }, scale: 1.08 },
};
const DEFAULT_LOOK = { shell: 0xffd84a, aura: { kind: 'spark', col: [2.6, 2, 0.6] }, scale: 1.3 };

export function championLook(id, kind) {
  if (CHAMPION_LOOKS[id]) return CHAMPION_LOOKS[id];
  return KIND_LOOKS[kind] ?? DEFAULT_LOOK;
}

// Recolour a built rig: its painted skin (one new material per rig kind and
// key, cached so a respawn compiles nothing) and the vertex colours of its
// voxel detail (per instance). Glowing colours stay glowing.
const remapMats = new Map();
const _c = new THREE.Color(), _hsl = { h: 0, s: 0, l: 0 };
function remapColor(c, fn) {
  const hot = Math.max(c.r, c.g, c.b) >= 0.999;
  c.getHSL(_hsl, THREE.SRGBColorSpace); fn(_hsl, hot);
  c.setHSL(_hsl.h, Math.min(1, Math.max(0, _hsl.s)), Math.min(1, Math.max(0, _hsl.l)), THREE.SRGBColorSpace);
  const m = Math.max(c.r, c.g, c.b);
  if (hot && m > 0) c.multiplyScalar(1 / m); else if (!hot && m > 0.98) c.multiplyScalar(0.98 / m);
  return c;
}
function remapMaterial(mat, key, fn) {
  const k = `${key}:${mat.uuid}`;
  if (remapMats.has(k)) return remapMats.get(k);
  const src = mat.map.image, cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
  const ctx = cv.getContext('2d'); ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    _c.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, THREE.SRGBColorSpace); remapColor(_c, fn); _c.getRGB(_c, THREE.SRGBColorSpace);
    d[i] = Math.round(_c.r * 255); d[i + 1] = Math.round(_c.g * 255); d[i + 2] = Math.round(_c.b * 255);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false;
  const m = makeCharMaterial(tex, { emitStrength: mat.userData.emitMask?.value ?? 0.6, roughness: mat.roughness, fill: 0.14 });
  m.alphaTest = mat.alphaTest;
  remapMats.set(k, m);
  return m;
}
export function remapRig(rig, key, fn) {
  if (typeof document === 'undefined') return rig;
  for (const m of rig.meshes) {
    const mat = m.userData.baseMat ?? m.material;
    if (mat.map?.image) {
      const nm = remapMaterial(mat, key, fn);
      m.material = nm; m.userData.baseMat = nm;
      if (rig.material === mat) rig.material = nm;
    } else if (mat.vertexColors && m.geometry.attributes.color) {
      const g = m.geometry.clone(), col = g.attributes.color;
      for (let i = 0; i < col.count; i++) { _c.setRGB(col.getX(i), col.getY(i), col.getZ(i)); remapColor(_c, fn); col.setXYZ(i, _c.r, _c.g, _c.b); }
      m.geometry = g;
    }
  }
  remapFlames(rig, (c) => remapColor(c, fn));   // (live flames, flames.js: blue-fire empousai)
  return rig;
}
// a crown on any rig's head (Rig: on top of the head box; QuadRig: on its head cube)
function crownAny(rig) {
  const K = kit(rig, rig.material, { seed: 137, rough: 0.35, metal: 0.4 });
  if (rig.isQuad) {
    const hs = rig.dims.hs;
    crown(K, rig.head, { y: hs / 2 + 0.6, cz: hs * 0.3, w: hs * 0.7, d: hs * 0.7, h: 1.2, spike: Math.min(2.6, hs * 0.28) });
  } else {
    const H = (rig.dims.headS ?? 8) * HS;
    crown(K, rig.head, { y: H + 1.2, w: H * 0.95, d: H * 0.95, spike: 2.8 });
  }
  return K.done();
}

// ---- building and applying ------------------------------------------------------
const _p = new THREE.Vector3();
function auraTick(rig, look, dt, e) {
  const g = e?.game, a = look.aura;
  if (!g?.particles || !a || e.dead) return;
  rig.auraT = (rig.auraT ?? 0) - dt;
  if (rig.auraT > 0) return;
  rig.auraT = 0.07;
  const [r, gg, b] = a.col, p = e.pos, rad = e.radius ?? 1, h = e.height ?? 2;
  let x = p.x + (Math.random() - 0.5) * rad * 2, y = p.y + Math.random() * h, z = p.z + (Math.random() - 0.5) * rad * 2;
  if (a.at === 'head') { rig.head.getWorldPosition(_p); x = _p.x + (Math.random() - 0.5) * 0.5; y = _p.y + Math.random() * 0.4; z = _p.z + (Math.random() - 0.5) * 0.5; }
  const P = g.particles;
  if (a.kind === 'smoke') {
    P.smoke?.emit(x, y, z, (Math.random() - 0.5) * 0.3, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, 1.3, 0.05, 0.03, 0.04, 0.5, -0.3, 1.2, 2.6, 0);
    if (Math.random() < 0.5) P.glow?.emit(x, y, z, (Math.random() - 0.5) * 0.6, 1.2 + Math.random(), (Math.random() - 0.5) * 0.6, 0.6, r, gg, b, 0.14, -0.5, 1, 0.03, 0);
  } else if (a.kind === 'embers') P.glow?.emit(x, y, z, (Math.random() - 0.5) * 0.8, 1.4 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8, 0.7, r, gg, b, 0.16, -0.8, 1, 0.04, 0);
  else if (a.kind === 'spark') P.glow?.emit(x, y, z, (Math.random() - 0.5) * 2.4, 0.6 + Math.random() * 1.6, (Math.random() - 0.5) * 2.4, 0.3, r, gg, b, 0.1, 6, 0, 0.02, 1);
  else if (a.kind === 'wisp') P.glow?.emit(x, y, z, 0, 0.6 + Math.random() * 0.6, 0, 0.8, r, gg, b, 0.18, -0.3, 1, 0.05, 1);
  else if (a.kind === 'dust') P.glow?.emit(x, p.y + 0.2 + Math.random() * 0.6, z, (Math.random() - 0.5) * 1.6, 0.8 + Math.random(), (Math.random() - 0.5) * 1.6, 0.5, r, gg, b, 0.12, 3, 0, 0.03, 1);
}

// Every look, for the workbench: the seven by id, the rest as 'kind:<kind>'.
export const CHAMPION_SHOWCASE = [...Object.keys(CHAMPION_LOOKS), ...Object.keys(KIND_LOOKS).map((k) => `kind:${k}`)];
export const buildShowcase = (id) => (id.startsWith('kind:') ? buildChampionRig(null, id.slice(5)) : buildChampionRig(id, CHAMPION_LOOKS[id].kind));

let _ringGeo = null;
const ringGeo = () => (_ringGeo ??= new THREE.RingGeometry(0.78, 1, 40));
const ringMats = new Map();
function ringMat(color) {
  if (!ringMats.has(color)) {
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    m.color = new THREE.Color(color).multiplyScalar(1.6);
    ringMats.set(color, m);
  }
  return ringMats.get(color);
}

// The champion's rig, scaled and with its outline glow and aura tick.
// The champion is built at its size (look.scale, parts.js withBuild), so its
// skin, voxel detail and blobs come out finer, not as the kind enlarged.
export function buildChampionRig(id, kind) {
  const look = championLook(id, kind), ks = look.scale ?? 1.3;
  const rig = withBuild({ k: ks, key: `c:${id ?? kind}` }, () => {
    if (look.build) return look.build();
    const r = buildMonsterModel(MONSTERS[kind]?.model ?? kind);
    if (look.remap) remapRig(r, `champ:${kind}`, look.remap);
    crownAny(r);
    return r;
  });
  rig.baseScale *= ks;
  rig.root.scale.setScalar(rig.baseScale);
  // the glow: an emissive tint over its own skin and detail (only when the
  // material is the champion's own, never a kind's shared one) and a ring of
  // light on the ground under it that breathes
  if (look.build || look.remap) rig.material.userData.glow?.value.set(look.shell).multiplyScalar(look.glow ?? 0.03);
  const k = look.size ?? look.scale ?? 1.3, R = (MONSTERS[look.kind ?? kind]?.radius ?? 0.8) * Math.min(1.5, k) * 1.5 / rig.baseScale;
  const ring = new THREE.Mesh(ringGeo(), ringMat(look.shell));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04 / rig.baseScale; ring.scale.setScalar(R); ring.renderOrder = 2;
  rig.root.add(ring); rig.extras.ring = ring;
  rig.championLook = look;
  // (rig.onTick is the kind's own behaviour, fodder.js: it used to be lost here)
  rig.tick = (dt, e) => {
    animateExtras(rig, dt, e); rig.onTick?.(dt, e); auraTick(rig, look, dt, e);
    ring.visible = !e?.dead; ring.scale.setScalar(R * (1 + Math.sin((rig.t ?? 0) * 3) * 0.06));
  };
  return rig;
}

// Swap a freshly spawned Enemy's model for its champion look. Its hit height
// and (a little of) its radius grow with the model.
export function applyChampionLook(e, id) {
  const look = championLook(id, e.kind);
  const rig = buildChampionRig(id, e.kind);
  const old = e.object, parent = old.parent;
  parent?.remove(old);
  e.rig = rig; e.object = rig.root;
  e.object.position.copy(old.position); e.object.rotation.copy(old.rotation);
  parent?.add(e.object);
  const k = look.size ?? look.scale ?? 1.3;
  e.height = e.def.height * k; e.radius = e.def.radius * Math.min(1.5, k);
  // its hit height (and so its health bar, half a block over it) is the model's
  // own height, measured; its attacks keep the look's size (e.attackK, enemy.js sizeK)
  e.attackK = k;
  const top = modelTop(rig.root);
  if (top > 0.3) e.height = top;
  return e;
}

// The top of a rig's visible solid meshes over its feet, in world units at its
// own scale (glows, additive effects and hidden parts left out).
const _bx = new THREE.Box3(), _bm = new THREE.Box3(), _bv = new THREE.Vector3();
function modelTop(root) {
  root.updateWorldMatrix(true, true); const p = root.getWorldPosition(_bv).y; _bx.makeEmpty();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    for (let x = o; x; x = x.parent) if (!x.visible) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && (m.blending === THREE.AdditiveBlending || (m.transparent && !m.map && !m.vertexColors))) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _bx.union(_bm.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
  });
  return _bx.isEmpty() ? 0 : _bx.max.y - p;
}
