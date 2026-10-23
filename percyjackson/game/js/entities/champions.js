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
import { Rig, PX, makeCharMaterial, HOLD_PITCH } from './character.js';
import { paintPerson } from './mortals.js';
import { skinMat, group, HS, bruteLimbs, sway } from './parts.js';
import { CHAMPION_LOOKS, championLook } from '../data/champions.js';
import { MONSTERS, HELLHOUND, buildMonsterModel, animateExtras, eagle, hound, buildScorpion, buildSkeleton, cycDensity } from './monsters.js';
import { kit, dropMeshes, withBuild, reshape, applyShape, legScale } from './voxkit.js';
import { addFlames, remapFlames } from './flames.js';
import { mergeRig, PART_MERGE } from './charmat.js';
import { markTip, markHeadCore, markHeadwear, keepAbove } from './rigContract.js';
export { CHAMPION_LOOKS, KIND_LOOKS, championLook, CHAMPION_SHOWCASE } from '../data/champions.js';

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
  return markHeadwear(g);   // (headwear: perf/bodysize.cjs measures the body under it)
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
// The Bronze Warden (labyrinth), after vox-ow-champions (bottom row, second
// from left): a hulking bronze automaton of stacked, riveted plates, warm
// bronze worn bright on the edges and crusted with teal-grey patina, dark
// works showing at every joint; a squared knight's helm with a dark visor and
// one glowing blue eye; huge stepped pauldrons; a glowing blue core at the
// waist; a skirt of hanging plates; stepped block boots; a broad bronze sword
// held point down; and a tall bronze tower shield, a Greek key at its
// corners, a patina-blue field and a great ring holding a sun-crowned face.
// Vines hang from its sword arm.
function buildBronzeWarden() {
  const B = 0xaa6006, BL = 0xe4a014, BD = 0x6e3604, BX = 0x24180e, VG = [0x3c645c, 0x48786e, 0x2e5250, 0x58807a], RUST = 0xa0482a, BC = [B, B, 0xba6c08, 0x904c04, 0xcc7c0c], EYE = 0x3ae8ff, EYE_C = 0xe8ffff;
  const FIELD = [0x3a5658, 0x445e5c, 0x324a4a, 0x4a6662], LEAF = [0x3a6a2a, 0x4a7a32, 0x2e5a22];
  const mat = skinMat('champ_bronze_warden', (S) => {
    paintPerson(S, { skin: B, eye: 0x0a1418, eyeWhite: 0x0a1418, brow: BD, mouth: false, top: B, sleeve: B, hand: B, pants: BD, shoes: BD });
    for (let i = 0; i < 60; i++) S.dot(S.r() * 64, S.r() * 64, VG[i % 4], 2, 2);
  }, { emit: 0.4, rough: 0.45, res: 2 });
  const rig = new Rig({ material: mat, scale: 1.55, bodyW: 10, bodyD: 6, armW: 5, legH: 11 });
  bruteLimbs(rig, { armLen: 1.05, armThick: 1.2, legThick: 1.3, legX: 3 });
  for (const g of [rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL]) dropMeshes(rig, g);   // (every plate is sculpted below: no skin boxes)
  const K = kit(rig, mat, { seed: 113, rough: 0.55, emit: 0.9 });   // (no metalness: a grey sky in it washed the bronze out to tan)
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  // (head and leg proportions, proportions.js: a giant automaton with the
  // helm reshaped to 0.62, on legs stretched from 11 to 14.8 pixels over the
  // same boots, broad across the shoulders and long in the arm)
  const L1 = 14.8, ANK = -9.5;
  reshape(rig, Hd, 0.62);
  reshape(rig, T, [1.08, 1, 1.04]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1.04, (L1 - 11 - ANK) / -ANK, 1.04], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [1.04, 1.15, 1.04]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  // patina: flat teal-grey patches and drips on the faces of a plate (centre
  // c, size s); rivets: bright studs along a plate's front edge
  const patina = (p, c, s, n, faces = 'fklrt', size = [0.8, 2.4]) => {
    for (let i = 0; i < n; i++) {
      const f = faces[Math.floor(K.r() * faces.length)], w = size[0] + K.r() * (size[1] - size[0]), h = K.r() < 0.35 ? w * (1.6 + K.r()) : w * (0.6 + K.r() * 0.6), col = K.r() < 0.08 ? RUST : K.tone(VG, 0.1);
      const u = (K.r() - 0.5), v = (K.r() - 0.5), t = 0.16;
      if (f === 't') K.box(p, c[0] + u * (s[0] - w), c[1] + s[1] / 2 + t / 2, c[2] + v * (s[2] - h), w, t, h, col);
      else if (f === 'f' || f === 'k') K.box(p, c[0] + u * (s[0] - w), c[1] + v * Math.max(0, s[1] - h), c[2] + (f === 'f' ? 1 : -1) * (s[2] / 2 + t / 2), w, Math.min(h, s[1]), t, col);
      else K.box(p, c[0] + (f === 'r' ? 1 : -1) * (s[0] / 2 + t / 2), c[1] + v * Math.max(0, s[1] - h), c[2] + u * (s[2] - w), t, Math.min(h, s[1]), w, col);
    }
  };
  const rivets = (p, x0, x1, y, z, n) => { for (let i = 0; i < n; i++) K.box(p, x0 + (x1 - x0) * (n === 1 ? 0.5 : i / (n - 1)), y, z, 0.55, 0.55, 0.35, BL); };
  // ---- the helm: a squared bronze helm with a stepped crest, a brow band,
  // cheek plates either side of a dark visor, and the one blue eye
  K.vox(Hd, 0, H8 / 2, -0.2, H8 + 0.6, H8 + 0.4, H8 + 0.6, BC, { cell: 1.6, faces: 'tlrk', j: 0.14 });
  markHeadCore(rig, [0, H8 / 2, -0.2], [H8 + 0.6, H8 + 0.4, H8 + 0.6]);   // (the helm; its crest aside)
  const crest = reshape(rig, markHeadwear(group(Hd, 0, 0, 0)), 0.62);   // (the stepped crest is headwear: measured apart from the helm)
  K.box(crest, 0, H8 + 0.9, -0.6, 4.4, 1.6, H8 - 0.4, BL); K.box(crest, 0, H8 + 2.3, -1, 2.6, 1.4, H8 - 2.4, B); K.box(crest, 0, H8 + 3.2, -1.4, 1.4, 0.8, H8 - 4, BD);
  K.box(Hd, 0, H8 * 0.8, H8 / 2 + 0.2, H8 + 1.2, 1.8, 1, BL);
  K.box(Hd, 0, H8 * 0.43, H8 / 2 + 0.15, H8 - 2.6, H8 * 0.5, 0.4, 0x0e1416);
  K.box(Hd, 0, H8 * 0.6, H8 / 2 + 0.38, H8 - 3.2, 0.7, 0.2, 0x2ab0c0);
  K.box(Hd, 0, H8 * 0.5, H8 / 2 + 0.45, 1.6, 3.2, 0.3, EYE); K.box(Hd, 0, H8 * 0.52, H8 / 2 + 0.6, 0.8, 2, 0.2, EYE_C);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * (H8 / 2 - 0.9), H8 * 0.36, H8 / 2 + 0.5, 2.6, H8 * 0.62, 0.9, B);
    K.box(Hd, sx * (H8 / 2 - 0.9), H8 * 0.36, H8 / 2 + 1, 1.6, H8 * 0.4, 0.2, BD);
    K.box(Hd, sx * (H8 / 2 + 0.5), H8 * 0.45, -0.2, 0.6, H8 * 0.7, H8 * 0.7, BD);
  }
  K.box(Hd, 0, 0.7, H8 / 2 + 0.3, H8 - 1.4, 1.4, 0.8, BD);
  patina(Hd, [0, H8 / 2, -0.2], [H8 + 0.6, H8 + 0.4, H8 + 0.6], 12, 'tlrk', [1, 2.6]);
  // ---- the trunk: dark works inside, a big plated chest with a collar
  // ridge, banded plates down the belly, the glowing core at the waist
  K.box(T, 0, 7, 0, 9.4, 12, 5.4, BX);
  K.vox(T, 0, 9.6, 0.2, 11.6, 5.4, 6.8, BC, { cell: 1, faces: 'tflr', j: 0.14, relief: 0.08 });
  K.box(T, 0, 9.6, 3.7, 0.5, 5, 0.3, BD);
  for (const sx of [-1, 1]) { K.box(T, sx * 3, 10.4, 3.75, 4.4, 2.8, 0.3, BL); K.box(T, sx * 3, 8.4, 3.75, 4.6, 0.5, 0.3, BD); }
  K.box(T, 0, 12.7, 0, 9.6, 1.2, 6.4, BL); K.box(T, 0, 13.3, -0.4, 6.4, 1, 5, BD);
  rivets(T, -5, 5, 7.2, 3.75, 6);
  for (let i = 0; i < 3; i++) { const w = 9.6 - i * 0.9; K.box(T, 0, 5.9 - i * 1.7, 0.2, w, 1.3, 6.4 - i * 0.3, i % 2 ? BD : B); K.box(T, 0, 6.5 - i * 1.7, 3.4 - i * 0.15, w - 0.6, 0.3, 0.3, BL); }
  K.box(T, 0, 0.9, 0.2, 9.8, 1.6, 6.6, BD); rivets(T, -4, 4, 0.9, 3.55, 5);
  const core = group(T, 0, 2.3, 3.4);
  K.box(core, 0, 0, 0, 3.2, 2.6, 0.6, BX); K.box(core, 0, 0, 0.3, 2, 1.6, 0.4, EYE); K.box(core, 0, 0, 0.5, 1, 0.8, 0.3, EYE_C);
  for (const sx of [-1, 1]) K.box(core, sx * 1.9, 0, 0.2, 0.6, 2.4, 0.5, BL);
  K.box(T, 0, 9, -3.6, 10, 8, 0.8, BD); K.box(T, 0, 9, -4.1, 7, 5, 0.4, B);   // the back plate
  patina(T, [0, 9.6, 0.2], [11.6, 5.4, 6.8], 20, 'fklrt');
  patina(T, [0, 4.2, 0.2], [9.6, 5, 6.4], 10, 'flr', [0.6, 1.6]);
  // ---- the skirt: hanging plates round the waist, patina dripping on them
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26, x = Math.sin(a) * 5.4, z = Math.cos(a) * 3.8 + 0.2, L = 4.4 + (i % 2) * 0.8;
    K.flare(rig.hips, x, -L / 2 + 0.6, z, 2.7, L, 0.8, i % 2 ? BD : B, a, 0.12);
    K.flare(rig.hips, x * 1.05, -L + 1.1, z * 1.05 + 0.04, 1.4, 1.6, 0.3, K.tone(VG, 0.1), a, 0.12);
  }
  // ---- shoulders: huge stepped pauldrons; banded upper arms over dark
  // joints; massive block gauntlets; blocky fists
  for (const arm of [rig.armR, rig.armL]) {
    const sd = arm === rig.armR ? -1 : 1;
    K.vox(arm, 0, 1.2, 0, 8.4, 3.2, 8, BC, { cell: 1, faces: sd > 0 ? 'tfkr' : 'tfkl', j: 0.14, relief: 0.08 }); K.box(arm, 0, -0.7, 0, 9, 1.4, 8.6, BD); K.box(arm, 0, 3.2, -0.2, 6.2, 1.2, 6.4, BL);
    K.box(arm, sd * 0.3, 4, -0.2, 4.2, 0.9, 4.8, B); K.box(arm, sd * 4.3, 1.2, 0, 0.6, 2.4, 6.6, BL);
    rivets(arm, -3, 3, 1.4, 4.1, 4);
    patina(arm, [0, 1.2, 0], [8.4, 3.2, 8], 9, 'tfkr'.replace('r', sd > 0 ? 'r' : 'l'));
    K.box(arm, 0, -2.6, 0, 4, 2.6, 4, BX);
    K.box(arm, 0, -4.6, 0, 5.6, 2.6, 5.6, B); K.box(arm, 0, -3.5, 0, 5.9, 0.5, 5.9, BL);
    K.box(arm, 0, -6.6, 0, 4.2, 1.4, 4.2, BX);
    K.vox(arm, 0, -9.4, 0.2, 7.2, 4.6, 7, BC, { cell: 1.15, faces: 'flrk', j: 0.14, relief: 0.08 }); K.box(arm, 0, -7.4, 0.2, 7.5, 0.7, 7.3, BL); K.box(arm, 0, -11.4, 0.2, 7.5, 0.6, 7.3, BD);
    K.box(arm, 0, -9.4, 3.8, 3.6, 2.6, 0.3, BD); K.box(arm, 0, -9.4, 3.95, 2.6, 1.6, 0.2, BL);
    patina(arm, [0, -9.4, 0.2], [7.2, 4.6, 7], 9, 'flrk');
    K.box(arm, 0, -12.8, 0.4, 5.6, 2.4, 5.6, BD);
    for (let i = 0; i < 4; i++) K.box(arm, -2 + i * 1.33, -13.6, 2.9, 1.2, 1.2, 0.9, i % 2 ? B : BL);
  }
  // vines hanging from the sword arm's pauldron
  for (const [x, z, n] of [[-3.4, 3.8, 7], [-4.4, 1.8, 5]]) for (let i = 0; i < n; i++) {
    K.box(rig.armR, x + (i % 2 ? 0.3 : -0.3), -0.4 - i * 1.3, z, 0.5, 1.4, 0.5, LEAF[i % 3]);
    if (i % 2 === 0) K.box(rig.armR, x + (i % 4 ? 0.8 : -0.8), -0.6 - i * 1.3, z + 0.2, 1, 0.5, 0.8, LEAF[(i + 1) % 3]);
  }
  // ---- legs: dark hip joints, thick plated thighs, knee caps over dark
  // knees, plated shins and stepped block boots
  for (const leg of [rig.legR, rig.legL]) {
    K.box(leg, 0, -1, 0, 4.6, 2.2, 4.6, BX);
    K.vox(leg, 0, -3.6, 0.2, 6.4, 3.6, 6.4, BC, { cell: 1.1, faces: 'flrk', j: 0.14 }); K.box(leg, 0, -2, 0.2, 6.6, 0.5, 6.6, BL);
    K.box(leg, 0, -5.9, 0, 4.6, 1.2, 4.6, BX); K.box(leg, 0, -5.9, 2.9, 3.2, 2.2, 1, BL); K.box(leg, 0, -5.9, 3.45, 1.8, 1.2, 0.2, BD);
    K.vox(leg, 0, -8.1, 0.2, 6.2, 3, 6.2, BC, { cell: 1.1, faces: 'flrk', j: 0.14 });
    patina(leg, [0, -3.6, 0.2], [6.4, 3.6, 6.4], 6, 'flrk'); patina(leg, [0, -8.1, 0.2], [6.2, 3, 6.2], 6, 'flrk');
    K.box(leg, 0, -9.7, 0.4, 6.6, 0.8, 6.8, BX);
    K.box(leg, 0, -10.25, 0.6, 7, 1.3, 7.2, B); K.box(leg, 0, -10.45, 3.9, 6.4, 0.9, 1, BL);   // (boots kept short of the toe: a long foot's tip dipped through the floor as the leg swung in the run)
    for (const x of [-2.2, 0, 2.2]) K.box(leg, x, -10.1, 4.5, 1.8, 0.9, 0.4, x ? B : BD);
    K.box(leg, 1.8, -10.15, 0.6, 0.2, 1.1, 7, K.tone(VG, 0.1));
  }
  // ---- the sword: a dark grip, a bronze guard, a broad bronze blade with
  // a dark fuller, held point down
  const sw = group(rig.handR, 0, -1, 1.4, HOLD_PITCH - Math.PI / 2, 0, 0);   // (built along +z: see the hand-axis convention in character.js)
  K.box(sw, 0, 0, -0.4, 1.3, 1.3, 3.6, 0x3a2414); K.box(sw, 0, 0, -2.5, 1.8, 1.8, 0.9, BL);
  K.box(sw, 0, 0, 1.8, 1.4, 5.4, 1, B); K.box(sw, 0, 0, 1.8, 1.6, 1.6, 1.2, BD);
  K.box(sw, 0, 0, 8.6, 0.7, 3, 12.6, BL); K.box(sw, 0, 0, 8.4, 0.8, 1.8, 12.2, B); K.box(sw, 0, 0, 8, 0.9, 0.5, 10.4, BD);
  K.box(sw, 0, 0, 15.4, 0.7, 2, 1.4, BL); K.box(sw, 0, 0, 16.4, 0.6, 1, 0.8, BL);
  patina(sw, [0, 0, 8.6], [0.7, 3, 12.6], 4, 'lr', [0.6, 1.4]);
  markTip(sw, 0, 0, 16.8, 'bronze sword'); rig.extras.sword = sw;
  // ---- the tower shield: a tall bronze frame, a Greek key in each corner,
  // a patina-blue field flecked with rust, a riveted ring and a sun face
  const sh = group(rig.armL, 1.4, -8.4, 4.8, 0, -0.25, 0), SW = 13, SHH = 20;
  K.box(sh, 0, 0, -0.2, SW, SHH, 0.9, BD);
  K.vox(sh, 0, 0, 0.35, SW - 2.2, SHH - 2.2, 0.4, [...FIELD, FIELD[0], RUST], { cell: 1.1, faces: 'f', j: 0.08 });
  for (const sy of [-1, 1]) { K.box(sh, 0, sy * (SHH / 2 - 0.6), 0.45, SW, 1.2, 0.7, B); K.box(sh, 0, sy * (SHH / 2 - 0.2), 0.75, SW, 0.4, 0.3, BL); }
  for (const sx of [-1, 1]) { K.box(sh, sx * (SW / 2 - 0.6), 0, 0.45, 1.2, SHH, 0.7, B); K.box(sh, sx * (SW / 2 - 0.2), 0, 0.75, 0.4, SHH, 0.3, BL); }
  const key = (cx, cy, fx, fy) => {   // a square spiral, opening toward the corner
    const bar = (x, y, w, h) => K.box(sh, cx + fx * x, cy + fy * y, 0.8, w, h, 0.4, BL);
    K.box(sh, cx, cy, 0.62, 3.4, 3.4, 0.3, B);
    bar(0, 1.3, 3, 0.45); bar(-1.3, 0, 0.45, 3); bar(0, -1.3, 3, 0.45); bar(1.3, -0.4, 0.45, 1.8); bar(0.4, 0.4, 1.8, 0.45); bar(-0.4, -0.1, 0.45, 1.4);
  };
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) key(sx * (SW / 2 - 2.4), sy * (SHH / 2 - 2.4), sx, sy);
  const R = 5.8, cy0 = 0.4;
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; K.box(sh, Math.cos(a) * R, cy0 + Math.sin(a) * R, 0.85, 1.6, 1.4, 0.7, i % 2 ? B : BL, 0, 0, a); }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; K.box(sh, Math.cos(a) * R, cy0 + Math.sin(a) * R, 1.25, 0.7, 0.7, 0.3, BD); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 3.9; K.box(sh, Math.cos(a) * r, cy0 + Math.sin(a) * r, 0.75, i % 2 ? 0.8 : 1.1, 1.9, 0.4, i % 2 ? B : BL, 0, 0, a - Math.PI / 2); }
  for (const sy of [-1, 1]) K.box(sh, 0, cy0 + sy * (R + 1.2), 0.8, 1.2, 1.6, 0.5, BL);   // a ray past the ring, top and bottom
  // the face: bronze locks round a calm face with blue eyes
  for (let y = -2.7; y <= 2.71; y += 0.9) { const hw = Math.sqrt(Math.max(0, 3.1 * 3.1 - y * y)); K.box(sh, 0, cy0 + y, 0.85, hw * 2, 0.95, 0.4, y > 1.2 ? BL : y > -1 ? B : 0xd6832a); }
  K.box(sh, 0, cy0 - 0.3, 1.1, 2.6, 3.4, 0.3, 0xc0703a); K.box(sh, 0, cy0 - 2.5, 0.9, 1.4, 1.4, 0.3, 0xb0602e);
  for (const sx of [-1, 1]) { K.box(sh, sx * 0.65, cy0 + 0.5, 1.28, 0.7, 0.4, 0.1, 0x3a8ad8); K.box(sh, sx * 0.65, cy0 + 0.9, 1.28, 0.8, 0.22, 0.1, 0x5a2e14); }
  K.box(sh, 0, cy0 - 0.3, 1.3, 0.4, 1.1, 0.1, 0x8a4a22); K.box(sh, 0, cy0 - 1.3, 1.28, 0.9, 0.22, 0.1, 0x5a2014);
  patina(sh, [0, 0, 0.45], [SW, SHH, 0.7], 10, 'f', [0.6, 1.6]);
  rig.extras.shield = sh;
  rig.extras.pot = core;    // (its Greek-fire vents puff from the core)
  applyShape(rig);
  K.done();
  rig.hunch = 0.12;
  return rig;
}
// Gorgos (othrys): the giant chieftain of Mount Othrys, after
// vox-ow-champions (bottom row, second from right): a huge two-eyed bear-man,
// not a cyclops. A bear's head worn as a hood, its upper jaw and fangs over
// his brow, its pelt over his shoulders and down his back; two burning
// orange-red eyes, a roaring mouth in a big black beard; a necklace of fangs
// and bones with skulls; a leather strap across the chest; a studded belt
// with a gold skull buckle, skulls and bones hanging from it; a ragged red
// loincloth over a short fur kilt; fur cuffs on the forearms (a skull on
// one), fur wrapped round the shins, bare feet; and a tree-trunk club
// studded with stones and grown over with moss and vines.
// His own builder at the heroes' voxel size (parts.js density), on the
// cyclops's giant frame and cell size, so the cyclops kind's attacks and slam
// fit him. The sheet holds the club
// in his left hand; here it is in the right, the hand every monster strikes
// with, and the trimmings are mirrored with it (the skull cuff and the
// necklace's big skull on the other side, the strap from the club shoulder).
function buildGorgos() {
  const SK = [0xd08a5a, 0xc47a4c, 0xdc9a68], skinD = 0x9e5a34, HAIR = [0x1c181c, 0x26202a, 0x121014, 0x302830];
  const PELT = [0x6e4222, 0x5c361a, 0x7e4e2a, 0x4a2a14], MUZ = [0xb07a4c, 0xa06a40], BONE = [0xece4cc, 0xd8ceb4, 0xf4eedc];
  const lea = 0x5a3a20, leaD = 0x3a2414, gold = 0xd8a030, goldL = 0xf4cc58, goldD = 0x8a5e14, RED = [0x9a3022, 0x8a2818, 0xae3e28, 0x6e1e14], EYE = 0xff4a10, EYE_C = 0xffd060;
  const WOOD = [0x5a3418, 0x6a3e1e, 0x7a4a24, 0x4a2a12], STONE = [0x8e8c86, 0x9e9c94, 0x7a7872], MOSS = [0x5a8a2a, 0x4a7a22, 0x6e9a34, 0x3a6a1e];
  const mat = skinMat('champ_gorgos', (S) => paintPerson(S, { skin: SK[0], hair: HAIR[0], mouth: false, top: SK[0], sleeve: SK[0], hand: SK[0], pants: SK[0], shoes: false }), { emit: 0.6 });
  // (the giant frame of the cyclops: the same rig scale, limbs and leg rule)
  const rig = new Rig({ material: mat, scale: 2.55, bodyW: 11, bodyD: 6, armW: 5, headS: 9, legH: 10 });
  for (const g of [rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL]) dropMeshes(rig, g);
  rig.handR.position.y = rig.handL.position.y = -11 * PX;
  rig.legR.position.x = -3 * PX; rig.legL.position.x = 3 * PX;
  // (head: the sheet draws his skull and face about a sixth of his height,
  // the bear hood on top; legs stretched from 10 to 16.4 pixels over the same
  // feet, the leg rule; broad shoulders and long arms, fists at mid-thigh)
  const HF = 0.68, L1 = 16.4, ANK = -8.2;
  reshape(rig, rig.head, HF);
  reshape(rig, rig.torso, [1.12, 1, 1.06]);
  reshape(rig, rig.hips, [1.1, L1 / 10, 1.05]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1.08, legScale(10, L1, ANK), 1.06], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [1.1, 1.3, 1.08]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  rig.crownY = 12 * HF;
  const K = kit(rig, mat, { seed: 127, rough: 0.85, emit: 0.9, density: cycDensity(rig) * 0.9, ao: 0.22 });   // (the cyclops's cell size, a touch coarser: the champions' 25k budget)
  const T = rig.torso, Hd = rig.head, H = rig.hips;
  const sk = () => SK[Math.floor(K.r() * 3)], pelt = () => PELT[Math.floor(K.r() * 4)], hair = () => HAIR[Math.floor(K.r() * 4)];
  // ---- trunk: a deep bare chest, heavy pecs, a hard belly, traps round a short neck
  K.blob(T, [0, 7.6, 0.3], [5.5, 4.8, 3.3], 1, (x, y, z) => (z > 0.55 && y < -0.05 && y > -0.3 ? skinD : z > 0.7 && Math.abs(x) < 0.08 ? skinD : sk()), { pw: 2.2, run: [2, 5] });
  K.blob(T, [0, 3, 0.4], [4.4, 3.4, 3], 1, (x, y, z) => (z > 0.6 && (Math.abs(x) < 0.07 || Math.abs(y - 0.2) < 0.08) ? skinD : sk()), { pw: 2.2 });
  K.blob(T, [0, 11.2, -0.7], [4.8, 1.9, 2.6], 1, sk, { pw: 2.2 });
  // the bear pelt: over both shoulders and down the back to the knees
  K.blob(T, [0, 11.6, -2.2], [6.4, 2.4, 2.4], 1, pelt, { run: [1, 2], keep: (x, y, z) => z < 0.35 });
  K.shag(T, [0, 12, -0.8], [12, 1.4, 6.4], { cols: PELT, step: 2, len: [2.2, 3.6], w: 1.1, low: 1, top: true, sides: true, sweep: 0.25, bristle: 0.35 });
  for (let x = -5.6; x <= 5.7; x += 1.4) { const L = 13 + K.r() * 6; K.box(T, x, 12.4 - L / 2, -3.9 - K.r() * 0.4, 1.5, L, 0.9, K.tone(PELT, 0.12)); }
  // a leather strap from the club shoulder to the other hip, gold studs on it
  for (let i = 0; i < 10; i++) { const t = i / 9; K.box(T, -4.6 + t * 9.2, 12.6 - t * 10, 3.3 + Math.sin(t * Math.PI) * 0.7, 1.4, 1.6, 0.6, i % 2 ? lea : leaD, 0, 0, 0.82); }
  for (const t of [0.2, 0.5, 0.8]) K.box(T, -4.6 + t * 9.2, 12.6 - t * 10, 3.75 + Math.sin(t * Math.PI) * 0.7, 0.6, 0.6, 0.4, goldL);
  // a necklace of fangs and bones round the neck, a skull on each side
  for (let i = 0; i < 13; i++) {
    const a = -1.25 + i * 0.208, x = Math.sin(a) * 5.2, y = 11.8 - Math.cos(a) * 2.6, L = i % 3 === 1 ? 2.6 : 1.8;
    K.box(T, x, y - L / 2 + 0.4, 3.7 - Math.abs(Math.sin(a)) * 0.6, 0.75, L, 0.75, BONE[i % 3], 0.1, 0, a * 0.5);
  }
  for (const [x, y, s] of [[3.6, 9.9, 1.25], [-3.2, 10.2, 0.95]]) {
    const z = 4.3 - Math.abs(x) * 0.12;
    K.box(T, x, y, z, 2 * s, 2 * s, 1.5 * s, BONE[0]); K.box(T, x, y - 1.15 * s, z + 0.1, 1.4 * s, 0.7 * s, 1.1 * s, BONE[1]);
    for (const sx of [-1, 1]) K.box(T, x + sx * 0.5 * s, y + 0.15 * s, z + 0.76 * s, 0.55 * s, 0.6 * s, 0.1, 0x1a1410);
    K.box(T, x, y - 0.4 * s, z + 0.76 * s, 0.3 * s, 0.4 * s, 0.1, 0x1a1410);
  }
  // ---- the belt: thick studded leather, a gold buckle with a skull's face,
  // little skulls and bones hanging from it
  K.vox(T, 0, 1.4, 0.4, 10.4, 2.2, 7.2, [lea, 0x6a4628, leaD], { relief: 0.1 }); K.box(T, 0, 2.55, 0.4, 10.6, 0.35, 7.4, leaD); K.box(T, 0, 0.25, 0.4, 10.6, 0.35, 7.4, leaD);
  for (const x of [-4.4, -2.6, 2.6, 4.4]) K.box(T, x, 1.4, 4.05, 0.6, 0.6, 0.3, gold);
  const bk = group(T, 0, 1.4, 4.1);
  K.box(bk, 0, 0, 0, 3.8, 2.6, 0.6, gold); K.box(bk, 0, 0, 0, 2.6, 3.8, 0.6, gold); K.box(bk, 0, 0, 0, 4.1, 0.5, 0.5, goldD); K.box(bk, 0, 0, 0, 0.5, 4.1, 0.5, goldD);
  K.box(bk, 0, 0.35, 0.35, 2.2, 1.9, 0.4, goldL); K.box(bk, 0, -0.85, 0.35, 1.4, 0.7, 0.4, goldL);
  for (const sx of [-1, 1]) K.box(bk, sx * 0.5, 0.45, 0.58, 0.55, 0.6, 0.1, 0x4a2a08);
  K.box(bk, 0, -0.15, 0.58, 0.3, 0.4, 0.1, 0x4a2a08); for (const x of [-0.4, 0, 0.4]) K.box(bk, x, -0.85, 0.58, 0.2, 0.4, 0.1, 0x4a2a08);
  for (const [x, s] of [[-2.6, 1], [-4.4, 0.85], [4.6, 0.85]]) {
    const y = -0.4 * s - 0.3;
    K.box(T, x, y, 4.2, 1.8 * s, 1.8 * s, 1.4 * s, BONE[0]); K.box(T, x, y - 1.1 * s, 4.25, 1.2 * s, 0.6 * s, 1 * s, BONE[1]);
    for (const sx of [-1, 1]) K.box(T, x + sx * 0.42 * s, y + 0.1, 4.2 + 0.72 * s, 0.45 * s, 0.5 * s, 0.1, 0x1a1410);
  }
  for (const [x, rz] of [[2.6, 0.15], [-0.9, -0.12], [5.6, -0.1]]) { K.box(T, x, -1.6, 4.1, 0.6, 3.2, 0.6, BONE[1], 0, 0, rz); K.box(T, x - rz * 3, -3.2, 4.1, 1.2, 0.6, 0.7, BONE[0], 0, 0, rz); }
  // ---- a ragged red loincloth to the knee, front and back, over a short fur kilt
  for (let x = -2; x <= 2.01; x += 0.8) { const L = 5.6 + K.r() * 1.2 - Math.abs(x) * 0.25; K.box(H, x, 1.4 - L / 2, 4.3, 0.85, L, 0.5, K.tone(RED, 0.1), -0.06); if (K.r() < 0.5) K.box(H, x, 1.4 - L - 0.3, 4.35 - (L + 0.3) * 0.06, 0.45, 0.6, 0.45, RED[3]); }
  for (let x = -1.6; x <= 1.61; x += 0.8) { const L = 5 + K.r(); K.box(H, x, 1.4 - L / 2, -3.7, 0.85, L, 0.5, K.tone(RED, 0.1), 0.06); }
  const NS = 30;
  for (let i = 0; i < NS; i++) {
    const a = i / NS * Math.PI * 2, x = Math.sin(a) * 5.1, z = Math.cos(a) * 3.6 + 0.4, L = 3.6 + K.r() * 1.6;
    if (Math.cos(a) > 0.82) continue;   // (the loincloth hangs there)
    K.flare(H, x, 1.6 - L / 2, z, 1.25, L, 0.9, K.tone(PELT, 0.12), a, 0.2);
  }
  // ---- head: a heavy brow over two burning eyes, a broad nose, a roaring
  // mouth with fangs, all in a big black beard
  const fz = 4.3;
  markHeadCore(rig, [0, 4.4, 0.4], [7.8, 9, 7.8]);   // (the skull and face: the hood, mane and beard aside)
  K.blob(Hd, [0, 4.4, 0.4], [3.9, 4.5, 3.9], 1, (x, y, z) => (z > 0.6 && y > 0.25 && y < 0.6 && Math.abs(x) > 0.55 ? skinD : sk()), { pw: 2.5 });
  K.box(Hd, 0, 6.9, fz - 0.2, 6.6, 1.1, 1.5, skinD);   // the brow ridge
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 1.6, 7.25, fz + 0.45, 2.6, 0.8, 0.6, HAIR[0], 0, 0, -sx * 0.3);   // a scowling brow
    K.box(Hd, sx * 1.55, 5.95, fz + 0.05, 2.3, 1.5, 0.6, 0x3a1208);                 // the socket
    K.box(Hd, sx * 1.55, 5.95, fz + 0.3, 1.9, 1.1, 0.5, EYE); K.box(Hd, sx * 1.5, 5.95, fz + 0.5, 0.9, 0.6, 0.3, EYE_C);
  }
  K.box(Hd, 0, 4.6, fz + 0.35, 1.9, 2.2, 1.2, SK[1]); K.box(Hd, 0, 3.75, fz + 0.75, 2.6, 0.8, 0.8, skinD);   // the nose
  K.box(Hd, 0, 2.2, fz - 0.1, 3.9, 2.3, 1, 0x4a0e0c); K.box(Hd, 0, 1.7, fz - 0.15, 2.2, 0.9, 0.8, 0xc0303a);   // the roaring mouth
  for (let x = -1.35; x <= 1.36; x += 0.9) K.box(Hd, x, 3.05, fz + 0.2, 0.75, 0.55, 0.5, 0xf4f0e0);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.55, 1.55, fz + 0.2, 0.7, 1.3, 0.5, 0xf4f0e0); K.box(Hd, sx * 0.5, 1.15, fz + 0.2, 0.6, 0.45, 0.5, 0xe8e0d0); }
  // the beard: from the cheekbones down over the chest, the mouth left open
  // (it juts forward as it falls, so it lies over the chest instead of sinking into it)
  K.blob(Hd, [0, 1.3, 2.6], [4.8, 3.6, 2.9], 1, hair, { run: [1, 2], keep: (x, y, z) => !(z > 0.2 && y > -0.1 && Math.abs(x) < 0.5) && !(z > 0.3 && y > 0.55) });
  K.blob(Hd, [0, -1.6, 4], [4.4, 3, 2.6], 1, hair, { run: [1, 2] });
  K.blob(Hd, [0, -4.2, 5.4], [3.4, 2.6, 2.1], 1, hair, { run: [1, 2] });
  K.blob(Hd, [0, -6.4, 6.1], [2.1, 1.9, 1.5], 1, hair, { run: [1, 2] });
  K.clumps(Hd, [0, -2.4, 5], [7.6, 8, 3.2], { n: 10, size: [0.9, 1.6], cols: HAIR, faces: 'flr', out: 0.25, keep: (x, y) => !(y > 0.6 && Math.abs(x) < 2.2) });
  K.blob(Hd, [0, 5.6, -1], [4.6, 3.8, 4], 1, hair, { run: [1, 2], keep: (x, y, z) => z < 0.1 || Math.abs(x) > 0.86 });   // black hair under the hood
  // ---- the bear's head worn as a hood: a furry skull over his own, its
  // upper jaw jutting over his brow with fangs hanging, a black nose, small
  // gold eyes, round ears, and the pelt falling past his cheeks
  const hood = markHeadwear(group(Hd, 0, 9.4, 0)); reshape(rig, hood, HF);   // (headwear: the body is measured to his own crown under it)
  K.blob(hood, [0, 0, -0.6], [5.6, 3.4, 5.8], 1.2, pelt, { pw: 2.2, lo: -0.4, run: [1, 2] });
  K.blob(hood, [0, 0.3, 3.4], [4.3, 2.5, 2.8], 1.1, pelt, { pw: 2.2, run: [1, 2] });
  K.blob(hood, [0, -0.5, 6.2], [2.7, 1.7, 2.6], 1, (x, y) => (y > 0.2 ? MUZ[0] : MUZ[1]), { pw: 2.2 });
  K.box(hood, 0, 0.1, 8.6, 2.4, 1.4, 1, 0x141010); K.box(hood, 0, 0.5, 9.1, 1.4, 0.5, 0.2, 0x3a3434);
  K.box(hood, 0, -1.95, 5.8, 4.2, 0.6, 4.4, 0x5a1a10);   // the roof of its mouth
  for (const sx of [-1, 1]) {
    K.box(hood, sx * 2.65, -3.1, 7.2, 0.8, 2.2, 0.8, BONE[0]); K.box(hood, sx * 2.65, -4.3, 7.2, 0.45, 0.5, 0.45, BONE[2]);   // the fangs, outside his eyes
    K.box(hood, sx * 0.7, -2.6, 7.7, 0.55, 1.1, 0.55, BONE[1]); K.box(hood, sx * 1.7, -2.55, 7.5, 0.5, 0.9, 0.5, BONE[1]);
    K.box(hood, sx * 2.5, 1.5, 5.2, 0.9, 0.7, 0.3, 0xffc020);   // the bear's eyes
    K.blob(hood, [sx * 4.4, 2.6, 0.2], [1.5, 1.5, 0.9], 1, () => PELT[1], { pw: 2 }); K.box(hood, sx * 4.4, 2.6, 0.9, 1.1, 1.1, 0.2, 0x3a2010);
    K.blob(hood, [sx * 5.2, -5.6, -0.8], [1.6, 5, 4], 1.2, pelt, { pw: 2.2, run: [1, 2] });
  }
  K.clumps(hood, [0, 0.4, -0.4], [10.6, 5.6, 10.4], { n: 12, size: [1, 1.7], cols: PELT, faces: 'tlrk', out: 0.1 });
  for (let i = 0; i < 9; i++) K.box(hood, -5 + i * 1.25, -4.4 - (i % 3) * 0.8, -5.4, 1.3, 7.6 + (i % 3) * 1.4, 1, PELT[i % 4]);
  // ---- arms: fur over the shoulders, bare muscled arms, fur cuffs bound
  // with studded leather on the forearms (a skull on the left one), big fists
  for (const arm of [rig.armR, rig.armL]) {
    const sd = arm === rig.armR ? -1 : 1;
    K.blob(arm, [0, 0.5, 0], [3.4, 3.1, 3.1], 1, sk, { pw: 2 });
    K.blob(arm, [sd * 0.2, 1.6, -0.2], [3.6, 2.6, 3.4], 1, pelt, { pw: 2, run: [1, 2], keep: (x, y) => y > -0.5 });
    K.clumps(arm, [sd * 0.2, 0, -0.2], [7, 3, 6.6], { n: 10, size: [1, 1.8], cols: PELT, faces: 'lrfk', out: 0.1, stretch: [1, 1.8, 1] });
    K.blob(arm, [0, -3.4, 0], [2.2, 3.4, 2.2], 1, sk, { pw: 2.1 });
    K.blob(arm, [0, -3, 0.8], [1.9, 2.4, 1.6], 1, sk, { pw: 2 });
    K.blob(arm, [0, -7.8, 0.2], [3, 2.6, 2.9], 1, pelt, { pw: 2.4, run: [1, 2] });
    K.clumps(arm, [0, -7.8, 0.2], [5.8, 4.6, 5.6], { n: 7, size: [0.9, 1.4], cols: PELT, faces: 'lrfk', out: 0.15 });
    for (const y of [-6.4, -9.2]) K.box(arm, 0, y, 0.2, 6.2, 0.7, 6, leaD);
    for (const [x, z] of [[-1.6, 3.2], [1.6, 3.2], [sd * 3.15, 0.2]]) K.box(arm, x, -6.4, z, 0.55, 0.55, 0.5, gold);
    K.blob(arm, [0, -11.5, 0.4], [2.8, 2.2, 2.8], 1, sk, { pw: 3 });
    for (let i = 0; i < 4; i++) K.box(arm, -1.8 + i * 1.2, -12.4, 2.7, 1.1, 1.3, 1, i % 2 ? SK[1] : SK[2]);
    K.box(arm, -sd * 2.4, -11, 1.4, 1, 2, 1.6, SK[1]);   // the thumb
  }
  const cs = group(rig.armL, 3.4, -7.8, 0.6, 0, Math.PI / 2, 0);   // the skull on the left cuff
  K.box(cs, 0, 0, 0, 2.2, 2.2, 1.6, BONE[0]); K.box(cs, 0, -1.25, 0.1, 1.5, 0.7, 1.2, BONE[1]);
  for (const sx of [-1, 1]) K.box(cs, sx * 0.55, 0.15, 0.82, 0.6, 0.65, 0.1, 0x1a1410);
  // ---- legs: thick bare thighs, shins wrapped in shaggy fur bound with
  // studded straps, broad bare feet with big toes
  for (const leg of [rig.legR, rig.legL]) {
    K.blob(leg, [0, -2.6, 0], [2.9, 3.4, 2.9], 1, sk, { pw: 2.2 });
    K.blob(leg, [0, -6.4, -0.1], [3.1, 2.6, 3.1], 1, pelt, { pw: 2.4, run: [1, 2] });
    K.clumps(leg, [0, -6.2, -0.1], [6, 4.4, 6], { n: 8, size: [0.9, 1.5], cols: PELT, faces: 'lrfk', out: 0.15 });
    K.box(leg, 0, -5.2, -0.1, 6.4, 0.7, 6.4, leaD); K.box(leg, 0, -7.6, -0.1, 6.4, 0.7, 6.4, lea);
    for (const x of [-1.4, 1.4]) K.box(leg, x, -5.2, 3.2, 0.6, 0.6, 0.4, gold);
    K.box(leg, 0.4, -7.6, 3.25, 1.3, 1.1, 0.4, goldL);
    // (the foot stops a hair above the leg's end and short of a long toe: a long foot's tip dipped through the floor as the leg swung in the run)
    K.blob(leg, [0, -9, 0.6], [2.6, 0.9, 3.2], 1, sk, { pw: 3 });
    for (let i = 0; i < 4; i++) K.box(leg, -1.65 + i * 1.1, -9.15, 3.6, 1, 0.9, 0.9, i % 2 ? SK[1] : SK[2]);
  }
  // ---- the club: a tree trunk, thickening to a head studded with stones,
  // a cut top, moss and a vine twined up it
  const club = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);   // (along +y, angled forward at the foe: see the hand-axis convention in character.js)
  K.blob(club, [0, 5, 0], [1.5, 7, 1.5], 1, () => K.tone(WOOD, 0.1), { pw: 2.6 });
  K.blob(club, [0, 15.4, 0], [2.9, 5.8, 2.9], 1, () => K.tone(WOOD, 0.1), { pw: 2.4 });
  K.box(club, 0, 20.9, 0, 3.8, 0.5, 3.8, 0xb08050); K.box(club, 0, 21, 0, 2.2, 0.5, 2.2, 0x8a6036);
  for (const [x, y, z] of [[1.7, 9, 0.6], [-1.6, 6.6, -0.4], [0.2, 11.6, 1.7]]) K.box(club, x, y, z, 1, 1.4, 1, WOOD[3]);   // knots
  for (const [x, y, z, s] of [[2.8, 15, 0, 2.2], [-2.8, 17.4, 0.4, 2], [0.2, 16.4, 2.8, 2.3], [0, 13.6, -2.8, 1.9], [2.2, 19, 1.2, 1.7], [-1.8, 13.4, 2.2, 1.7], [-2, 19.4, -1.6, 1.6], [2, 12.4, -1.8, 1.5]]) {
    K.box(club, x, y, z, s, s * 0.9, s, K.tone(STONE, 0.1)); K.box(club, x * 1.08, y + s * 0.3, z * 1.08, s * 0.5, s * 0.4, s * 0.5, STONE[1]);
  }
  K.clumps(club, [0, 16, 0], [5.6, 9, 5.6], { n: 10, size: [0.8, 1.3], cols: MOSS, faces: 'tlrfk', out: 0 });
  for (let i = 0; i < 14; i++) { const a = i * 0.85, r = i < 7 ? 1.55 : 2.9; K.box(club, Math.cos(a) * r, 2.6 + i * 1.3, Math.sin(a) * r, 0.7, 1.4, 0.7, MOSS[i % 4]); if (i % 3 === 1) K.box(club, Math.cos(a) * (r + 0.6), 2.9 + i * 1.3, Math.sin(a) * (r + 0.6), 1, 0.4, 0.8, MOSS[2]); }
  K.vox(club, 0, -1.6, 0, 3, 2.2, 3, [lea, leaD], {});
  markTip(club, 0, 21.2, 0, 'club'); rig.extras.club = club;
  applyShape(rig);   // (the hood, the buckle and the cuff skull to their places on the reshaped head, trunk and arm)
  K.done();
  rig.hunch = 0.3;
  keepAbove(rig, club, { reset: true });   // (a slam that ends low strikes the floor with the club instead of driving it through)
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
  const hf = rig.shape?.get(Hd)?.f[1] ?? 1;   // (the skeleton's skull is reshaped smaller for its grown body; the crown is sized to it)
  crown(K, Hd, { y: H8 + 0.6, w: (H8 + 0.4) * hf, d: (H8 + 0.4) * hf, h: 1.8, spike: 2.4, gold: 0xc89a30, dark: 0x7a5a18, gem: 0x3aff6a });   // (low spikes, so the crown stays under the leg rule's line)
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
  applyShape(rig);   // (the crown and the flame to their places on the reshaped skull)
  K.done();
  return rig;
}

// The seven region champions' own models (their looks: data/champions.js CHAMPION_LOOKS)
const CHAMPION_BUILDS = {
  fields_bronzebeak: buildBronzebeak,
  woods_shadowfang: buildShadowfang,
  shore_queen_gale: buildQueenGale,
  canyon_red_king: buildRedKing,
  lab_bronze_warden: buildBronzeWarden,
  oth_gorgos: buildGorgos,
  asphodel_pale_king: buildPaleKing,
};


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
    // (a head its builder reshaped, proportions.js, wears a crown its size, at rig.crownY when it names one)
    const H = (rig.dims.headS ?? 8) * HS, f = rig.shape?.get(rig.head)?.f[1] ?? 1;
    crown(K, rig.head, { y: rig.crownY ?? (H + 1.2) * f, w: H * 0.95 * f, d: H * 0.95 * f, spike: 2.8 * f });
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

export const buildShowcase = (id) => (id.startsWith('kind:') ? buildChampionRig(null, id.slice(5)) : buildChampionRig(id, CHAMPION_LOOKS[id].kind));

let _ringGeo = null;
const ringGeo = () => (_ringGeo ??= new THREE.RingGeometry(0.78, 1, 40));
const ringMats = new Map();
function ringMat(color) {
  if (!ringMats.has(color)) {
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
    m.color = new THREE.Color(color).multiplyScalar(1.6);
    ringMats.set(color, m);
  }
  return ringMats.get(color);
}

// The champion's rig, scaled and with its outline glow and aura tick.
// The champion is built at its size (look.scale, voxkit.js withBuild), so its
// skin, voxel detail and blobs come out finer, not as the kind enlarged.
export function buildChampionRig(id, kind) {
  const look = championLook(id, kind), ks = look.scale ?? 1.3, build = look === CHAMPION_LOOKS[id] ? CHAMPION_BUILDS[id] : null;
  PART_MERGE.defer++;   // (merged once it is recoloured and crowned: charmat.js)
  let rig;
  try {
    rig = withBuild({ k: ks, key: `c:${id ?? kind}` }, () => {
      if (build) return build();
      const r = buildMonsterModel(MONSTERS[kind]?.model ?? kind);
      if (look.remap) remapRig(r, `champ:${kind}`, look.remap);
      crownAny(r);
      return r;
    });
  } finally { PART_MERGE.defer--; }
  mergeRig(rig);
  rig.baseScale *= ks;
  rig.root.scale.setScalar(rig.baseScale);
  // the glow: an emissive tint over its own skin and detail (only when the
  // material is the champion's own, never a kind's shared one) and a ring of
  // light on the ground under it that breathes
  if (build || look.remap) rig.material.userData.glow?.value.set(look.shell).multiplyScalar(look.glow ?? 0.03);
  const k = look.size ?? look.scale ?? 1.3, R = (MONSTERS[look.kind ?? kind]?.radius ?? 0.8) * Math.min(1.5, k) * 1.5 / rig.baseScale;
  const ring = new THREE.Mesh(ringGeo(), ringMat(look.shell));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04 / rig.baseScale; ring.scale.setScalar(R); ring.renderOrder = 2;
  rig.root.add(ring); rig.extras.ring = ring;
  rig.championLook = look;
  // (rig.onTick is the kind's own behaviour, fodder.js: the champion keeps it)
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
