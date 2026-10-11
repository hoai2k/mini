// Appearance of every hero: procedurally painted 64x64 skins (Camp
// Half-Blood T-shirts, jeans, goat legs, a Cyclops eye), hair strands and
// caps, and signature props (Riptide, Annabeth's dagger, Grover's reed
// pipes, Tyson's watch shield, Clarisse's electric spear and boar shield),
// built on the shared Rig.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';
import { hashStr } from '../util.js';
import { buildVoxelHair, ponytailCubes, voxelMesh, hairMaterial } from './voxhair.js';

export const CAMP_ORANGE = 0xf28c28;
const INK = 0x17130f;

// Skin layout (Minecraft-style): head (0,0) with hat layer (32,0); torso
// (16,16) with jacket layer (16,32); right arm (40,16)/(40,32); left arm
// (32,48)/(48,48); right leg (0,16); left leg (16,48). Each box's four side
// faces sit in one strip starting at (u, v + depth).
const ARMS = [[40, 16], [32, 48]], ARM_OVER = [[40, 32], [48, 48]];
const LEGS = [[0, 16], [16, 48]];

function paintHumanoid(S, o) {
  const skin = o.skinTone ?? 0xf0c8a8;
  // ---- head
  S.box(0, 0, 8, 8, 8, skin, 0.05);
  S.rect(8, 0, 8, 8, o.hair, 0.18);                          // top
  S.rect(24, 8, 8, o.hairBack ?? 6, o.hair, 0.18);           // back
  S.rect(0, 8, 8, o.hairSide ?? 3, o.hair, 0.18);            // right side
  S.rect(16, 8, 8, o.hairSide ?? 3, o.hair, 0.18);           // left side
  S.rect(8, 8, 8, o.fringe ?? 2, o.hair, 0.18);              // fringe
  if (o.messy) { for (const x of [8, 10, 13, 15]) S.px(x, 8 + (o.fringe ?? 2), o.hair); }
  if (o.sideburn) { S.rect(8, 8 + (o.fringe ?? 2), 1, 3, o.hair, 0.1); S.rect(15, 8 + (o.fringe ?? 2), 1, 3, o.hair, 0.1); }
  const ey = 8 + (o.eyeRow ?? 4);
  const brow = o.brow ?? o.hair;
  if (o.cyclops) {
    // one big central eye under a single heavy brow
    S.rect(10, ey - 2, 4, 1, brow, 0.1);
    S.rect(10, ey - 1, 4, 2, o.eyeWhite ?? 0xffffff, 0.02);
    S.px(11, ey - 1, o.eye ?? 0x6a3a1a); S.px(12, ey - 1, o.eye ?? 0x6a3a1a); S.px(11, ey, o.eye ?? 0x6a3a1a); S.px(12, ey, 0x111111);
    S.rect(11, ey + 2, 2, 1, 0xd89a88, 0.05);
    S.rect(10, ey + 3, 4, 1, 0x8a4a3a, 0.05);                 // big grin
  } else {
    // eyes two pixels tall: white + iris on top, iris + dark pupil below
    const iris = o.eye ?? 0x3a2a1a, pupil = o.pupil ?? 0x101014;
    S.px(9, ey, o.eyeWhite ?? 0xffffff); S.px(10, ey, iris); S.px(9, ey + 1, iris); S.px(10, ey + 1, pupil);
    S.px(13, ey, iris); S.px(14, ey, o.eyeWhite ?? 0xffffff); S.px(13, ey + 1, pupil); S.px(14, ey + 1, iris);
    S.rect(8, ey - 1, 3, 1, brow, 0.05); S.rect(13, ey - 1, 3, 1, brow, 0.05);
    if (o.scowl) { S.px(10, ey - 1, brow); S.px(13, ey - 1, brow); S.px(11, ey - 1, brow); S.px(12, ey - 1, brow); }
    S.px(11, ey + 2, 0xc89a88);
    const lip = o.lip ?? 0x9a5a4a;
    if (o.smile) { S.px(10, ey + 3, lip); S.px(11, ey + 3, 0xf4ece0); S.px(12, ey + 3, 0xf4ece0); S.px(13, ey + 3, lip); }
    else { S.px(11, ey + 3, lip); S.px(12, ey + 3, lip); }
  }
  if (o.blush) { S.px(9, ey + 1, 0xe8a0a0); S.px(14, ey + 1, 0xe8a0a0); }
  if (o.goatee) { S.px(11, ey + 3, o.goatee); S.px(12, ey + 3, o.goatee); S.px(11, 15, o.goatee); S.px(12, 15, o.goatee); }
  if (o.freckles) { S.px(9, ey + 2, o.freckles); S.px(14, ey + 2, o.freckles); }
  // hat layer: hair volume (transparent except painted cells)
  if (o.hairVolume) {
    S.rect(40, 0, 8, 8, o.hair, 0.2);
    S.rect(40, 8, 8, o.fringe ?? 2, o.hair, 0.2);
    S.rect(32, 8, 8, o.hairSide ?? 4, o.hair, 0.2); S.rect(48, 8, 8, o.hairSide ?? 4, o.hair, 0.2);
    S.rect(56, 8, 8, o.hairBack ?? 6, o.hair, 0.2);
    if (o.long) { S.rect(32, 8, 8, o.long, o.hair, 0.2); S.rect(48, 8, 8, o.long, o.hair, 0.2); S.rect(56, 8, 8, o.long, o.hair, 0.2); }
    if (o.curls) for (let i = 0; i < 14; i++) S.px(32 + Math.floor(S.r() * 32), 8 + (o.hairSide ?? 4) + Math.floor(S.r() * 2), o.curls);
  }
  // ---- torso: T-shirt / shirt
  S.box(16, 16, 8, 12, 4, o.top, 0.08);
  if (o.plaid) {
    const [a, b] = o.plaid;
    for (let y = 16; y < 32; y++) for (let x = 16; x < 40; x++) if (x % 3 === 0 || y % 3 === 0) S.px(x, y, (x % 3 === 0 && y % 3 === 0) ? b : a);
    S.rect(23, 20, 2, 12, b, 0.05);
    for (let y = 22; y < 32; y += 3) S.px(24, y, 0xd8c8a8);
  }
  if (o.collar !== false) S.rect(21, 20, 6, 1, o.collar ?? skin, 0.04);   // crew neck
  if (o.pegasus) {
    // small black pegasus mark on the chest (front face 20..27 × 20..31)
    const c = o.pegasus;
    [[24, 22], [25, 22], [23, 23], [24, 23], [25, 23], [26, 23], [27, 22], [23, 24], [26, 24], [22, 23]].forEach(([x, y]) => S.px(x, y, c));
  }
  if (o.beads) { for (let x = 21; x < 27; x++) S.px(x, 21, [0x8a2a1a, 0xe8e0c8, 0x2a5a8a, 0xe8e0c8][x % 4]); }
  if (o.belt) { S.rect(16, 30, 24, 2, o.belt, 0.1); S.px(23, 30, 0xc9963a); S.px(24, 30, 0xc9963a); }
  // jacket layer (open front so the camp shirt shows)
  if (o.jacket) {
    const j = o.jacket;
    S.rect(16, 36, 4, 12, j, 0.15); S.rect(28, 36, 4, 12, j, 0.15); S.rect(32, 36, 8, 12, j, 0.15);
    S.rect(20, 36, 2, 12, j, 0.15); S.rect(26, 36, 2, 12, j, 0.15); S.rect(20, 32, 8, 4, j, 0.15);
    if (o.jacketPlaid) {
      const [a, b] = o.jacketPlaid;
      for (let y = 32; y < 48; y++) for (let x = 16; x < 40; x++) { if (x >= 22 && x < 26 && y >= 36) continue; if (x % 3 === 0 || y % 3 === 0) S.px(x, y, (x % 3 === 0 && y % 3 === 0) ? b : a); }
      for (const [u, v] of ARM_OVER) for (let y = v + 4; y < v + 4 + (o.jacketSleeve ?? 9); y++) for (let x = u; x < u + 16; x++) if (x % 3 === 0 || y % 3 === 0) S.px(x, y, a);
    }
    if (o.studs) for (const [x, y] of [[21, 38], [21, 41], [26, 38], [26, 41], [21, 44], [26, 44]]) S.px(x, y, o.studs);
    if (o.camo) for (let i = 0; i < 70; i++) { const x = 16 + Math.floor(S.r() * 24), y = 36 + Math.floor(S.r() * 12); if (x >= 22 && x < 26) continue; S.rect(x, y, 2, 1, o.camo[i % o.camo.length], 0.1); }
    for (const [u, v] of ARM_OVER) {
      S.rect(u, v + 4, 16, o.jacketSleeve ?? 9, j, 0.15);
      if (o.camo) for (let i = 0; i < 18; i++) S.px(u + Math.floor(S.r() * 16), v + 4 + Math.floor(S.r() * (o.jacketSleeve ?? 9)), o.camo[i % o.camo.length]);
    }
  }
  // ---- arms: sleeves, skin, hands
  for (const [u, v] of ARMS) {
    S.box(u, v, 4, 12, 4, o.sleeve ?? o.top, 0.08);
    if (o.plaid) for (let y = v + 4; y < v + 16; y++) for (let x = u; x < u + 16; x++) if (x % 3 === 0 || y % 3 === 0) S.px(x, y, o.plaid[0]);
    const sl = o.shortSleeve ?? 12;
    if (sl < 12) S.rect(u, v + 4 + sl, 16, 12 - sl, skin, 0.05);
    S.rect(u, v + 4 + 9, 16, 3, skin, 0.04); S.rect(u + 8, v, 4, 4, skin, 0.04);
    if (o.wrist) S.rect(u, v + 4 + 8, 16, 1, o.wrist, 0.05);
  }
  // ---- legs: jeans / shorts / goat legs, then shoes or hooves
  for (const [u, v] of LEGS) {
    S.box(u, v, 4, 12, 4, o.pants, 0.12);
    if (o.shorts) S.rect(u, v + 4 + o.shorts, 16, 12 - o.shorts, o.legSkin ?? skin, 0.06);
    if (o.goat) {
      for (let y = v + 4 + (o.shorts ?? 4); y < v + 16; y++) for (let x = u; x < u + 16; x++) S.px(x, y, S.r() < 0.35 ? o.goat[1] : o.goat[0]);
      S.rect(u, v + 4 + 10, 16, 2, 0x2a1e18, 0.1); S.rect(u + 8, v, 4, 4, 0x2a1e18, 0.1);
      for (let x = u + 5; x < u + 16; x += 4) S.px(x, v + 4 + 11, 0x120c08);   // split hoof
      continue;
    }
    if (o.torn) { S.rect(u + 5, v + 4 + 5, 2, 1, o.legSkin ?? skin, 0.05); S.rect(u + 4, v + 4 + 6, 4, 1, 0xd8d0c0, 0.05); }
    if (o.socks) S.rect(u, v + 4 + 9, 16, 1, o.socks, 0.05);
    if (o.cuff) S.rect(u, v + 4 + 9, 16, 1, o.cuff, 0.05);
    S.rect(u, v + 4 + 10, 16, 2, o.shoes ?? 0x1a1a1a, 0.05); S.rect(u + 8, v, 4, 4, o.shoes ?? 0x1a1a1a, 0.05);
    if (o.sole) { S.rect(u, v + 4 + 11, 16, 1, o.sole, 0.03); S.px(u + 5, v + 4 + 10, o.sole); S.px(u + 6, v + 4 + 10, o.sole); }
  }
}

const mat = (c, o = {}) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1 });
const BRONZE = () => mat(0xc9963a, { rough: 0.3, metal: 0.85, emissive: 0x5a3a08, ei: 0.6 });
const H = PX * 1.12;   // one head-skin pixel in head space

// Box helper for props (sizes/positions in skin pixels).
function bx(parent, w, h, d, x, y, z, m, unit = PX) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * unit, h * unit, d * unit), m);
  mesh.position.set(x * unit, y * unit, z * unit); mesh.castShadow = true; parent.add(mesh); return mesh;
}
// Baseball cap on the head (crown + brim pointing forward).
function cap(rig, color) {
  const m = mat(color, { rough: 0.85 });
  const g = new THREE.Group();
  bx(g, 10.6, 3, 10.6, 0, 9.2, 0, m, H);
  bx(g, 9, 1.4, 9, 0, 11.2, 0, m, H);
  bx(g, 8.4, 0.7, 4.6, 0, 8, 6.8, m, H);
  rig.head.add(g); return g;
}

// Riptide: celestial-bronze sword with a leaf-shaped blade, along +z of the hand.
export function buildRiptide() {
  const g = new THREE.Group();
  const bronze = BRONZE(), grip = mat(0x2a2a30, { rough: 0.6 }), gold = mat(0xe8c060, { rough: 0.3, metal: 0.9 });
  bx(g, 1.4, 1.4, 1.4, 0, 0, -3.4, gold);                // pommel
  bx(g, 1.1, 1.1, 4, 0, 0, -0.8, grip);                  // grip
  bx(g, 5.4, 1.2, 1.2, 0, 0, 1.6, gold);                 // crossguard
  // leaf blade: narrow at the guard, widest two-thirds up, tapering to a point
  [[1.4, 3, 3.6], [2.0, 3, 6.6], [2.5, 3.2, 9.6], [2.7, 3, 12.6], [2.2, 2.4, 15.3], [1.4, 2, 17.5], [0.6, 1.6, 19.2]]
    .forEach(([w, l, z]) => bx(g, w, 0.45, l, 0, 0, z, bronze));
  bx(g, 0.3, 0.55, 15, 0, 0, 10, gold);                  // fuller line
  g.position.set(0, -1 * PX, 1 * PX);
  return g;
}
function buildDagger() {
  const g = new THREE.Group();
  const bronze = BRONZE(), grip = mat(0x3a2a1a, { rough: 0.8 });
  bx(g, 1.1, 1.1, 3.2, 0, 0, -0.6, grip); bx(g, 3.4, 1, 1, 0, 0, 1.4, bronze);
  [[1.5, 3, 3.4], [1.2, 2.4, 6], [0.5, 1.6, 7.8]].forEach(([w, l, z]) => bx(g, w, 0.4, l, 0, 0, z, bronze));
  g.position.set(0, -1 * PX, 0.8 * PX);
  return g;
}
function buildPipes() {
  const g = new THREE.Group();
  const reed = mat(0xd8b860, { rough: 0.5 }), band = mat(0x6a3a1a);
  for (let i = 0; i < 6; i++) bx(g, 0.9, 7 - i * 0.8, 0.9, -2.5 + i, -(7 - i * 0.8) / 2 + 2, 0, reed);
  bx(g, 6.4, 0.8, 1.2, 0, 1, 0, band);
  g.position.set(0, -1.5 * PX, 1.6 * PX); g.rotation.y = 0.3;
  return g;
}
function buildSpear() {
  const g = new THREE.Group();
  const shaft = mat(0x2a2420, { rough: 0.6 }), bronze = BRONZE(), volt = mat(0xffe24a, { emissive: 0xffd84a, ei: 3 });
  bx(g, 0.9, 0.9, 40, 0, 0, 6, shaft);
  bx(g, 1.3, 1.3, 1.2, 0, 0, 25.5, bronze);
  [[2.2, 3, 27.5], [1.6, 2.4, 30], [0.7, 2, 32]].forEach(([w, l, z]) => bx(g, w, 0.6, l, 0, 0, z, bronze));
  // lightning zig-zag along the tip
  bx(g, 0.35, 0.35, 2.4, 0.6, 0.5, 28, volt).rotation.y = 0.5; bx(g, 0.35, 0.35, 2.4, -0.4, 0.5, 30.2, volt).rotation.y = -0.5;
  bx(g, 1.2, 1.2, 1.2, 0, 0, -14.5, bronze);
  g.position.set(0, -1 * PX, 0);
  g.userData.tip = new THREE.Vector3(0, -1 * PX, 32 * PX);
  return g;
}
function buildBoarShield() {
  const g = new THREE.Group();
  const wood = mat(0x6a3a22, { rough: 0.8 }), bronze = BRONZE(), dark = mat(0x2a1a14), tusk = mat(0xf0e8d0);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(7 * PX, 7 * PX, 1 * PX, 12), wood); disc.rotation.z = Math.PI / 2; disc.castShadow = true; g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(7 * PX, 0.7 * PX, 4, 12), bronze); rim.rotation.y = Math.PI / 2; g.add(rim);
  // boar head emblem
  bx(g, 0.6, 4, 5, -0.7, 0, 0, dark); bx(g, 0.6, 2, 2, -1, -1, 0, mat(0x8a5a4a));
  bx(g, 0.5, 2, 0.6, -1.1, -1.5, 1.6, tusk); bx(g, 0.5, 2, 0.6, -1.1, -1.5, -1.6, tusk);
  bx(g, 0.6, 1.4, 1, -0.9, 2.2, 2.2, dark); bx(g, 0.6, 1.4, 1, -0.9, 2.2, -2.2, dark);
  g.position.set(-1.6 * PX, -4 * PX, 0);
  return g;
}
function buildWatchShield() {
  const g = new THREE.Group();
  const bronze = BRONZE(), dark = mat(0x5a3a18, { rough: 0.4, metal: 0.8 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(11 * PX, 11 * PX, 1.2 * PX, 16), bronze); disc.rotation.x = Math.PI / 2; disc.castShadow = true; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8 * PX, 0.6 * PX, 4, 16), dark); g.add(ring);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * PX, 2.4 * PX, 2 * PX, 10), dark); boss.rotation.x = Math.PI / 2; g.add(boss);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; bx(g, 0.8, 3, 0.8, Math.cos(a) * 5, Math.sin(a) * 5, 0.6, dark).rotation.z = a + Math.PI / 2; }
  g.position.set(0, -2 * PX, 5 * PX);
  return g;
}
// Little white wings for Maia! (hidden until used).
function wings(parent, y) {
  const g = new THREE.Group(); const w = mat(0xffffff, { emissive: 0xffffff, ei: 0.4 });
  for (const s of [-1, 1]) { const f = new THREE.Group(); f.position.set(s * 2.2 * PX, y * PX, -1 * PX); bx(f, 4, 2.4, 0.4, s * 2, 1, 0, w); bx(f, 2.6, 1.6, 0.4, s * 2.6, 2.4, 0, w); f.userData.side = s; g.add(f); }
  g.visible = false; parent.add(g); return g;
}

const TEE = { top: CAMP_ORANGE, shortSleeve: 5, pegasus: INK, collar: 0xe07a1a };
const JEANS = { pants: 0x3d5a8a, shoes: 0x1c1c22, sole: 0xf0ece0 };

// Looks follow the 3D hero sheets (design/concept/vox-*.png): voxel hair is
// the main silhouette (see voxhair.js), outfits are painted on the skin and
// helmets, caps, collars and props are small block models.
export const HERO_LOOKS = {
  percy: {
    paint: { skinTone: 0xf2cdb0, hair: 0x14141a, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2fae9a, pupil: 0x0e3a34, smile: true, ...TEE, ...JEANS, cuff: 0x6a88b8 },
    vox: { style: 'mop', base: 0x1c1c26, shade: 0x0c0c12, light: 0x34344a, seed: 11 },
    accent: 0x2fd0d8,
  },
  annabeth: {
    paint: { skinTone: 0xeec6a4, hair: 0xe8b84a, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x7c8ea8, pupil: 0x2a3444, brow: 0xb8862a, beads: true, belt: 0x4a2e1a, ...TEE, pants: 0x6a6a3e, shorts: 4, socks: 0xf0ece0, shoes: 0x1e2a4a, sole: 0xf0ece0 },
    vox: { style: 'curls', base: 0xe8b84a, shade: 0xb07a22, light: 0xffe08a, seed: 23, cap: true },
    tail: { base: 0xe8b84a, shade: 0xb07a22, light: 0xffe08a, length: 9, width: 5 },
    accent: 0xe0b04a, cap: 0x1e2a4a,
  },
  grover: {
    paint: { skinTone: 0xeec6a4, hair: 0x6a3a1e, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x6a4020, goatee: 0x4a2814, smile: true, ...TEE, pants: 0x5a5a32, shorts: 3, goat: [0x7a5030, 0x5a3a20], belt: 0x3a2414 },
    vox: { style: 'afro', base: 0x6a3a1e, shade: 0x40220e, light: 0x9a6034, seed: 37 },
    accent: 0x5fae4a, horns: true,
  },
  tyson: {
    paint: { skinTone: 0xe2b48c, hair: 0x5a3a20, fringe: 3, hairSide: 5, hairBack: 8, cyclops: true, eye: 0x7a4a1a, brow: 0x3a2414, ...TEE, jacket: 0xa8322a, jacketPlaid: [0x6a1a14, 0x2a1a14], jacketSleeve: 9, pants: 0x3d5a8a, torn: true, shoes: 0x5a3a20, sole: 0x3a2414 },
    vox: { style: 'shaggy', base: 0x5a3a20, shade: 0x3a2414, light: 0x8a5a30, seed: 41 },
    accent: 0xff8a2a, scale: 1.45, wide: 1.3,
  },
  clarisse: {
    paint: { skinTone: 0xd8a682, hair: 0x5a3018, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x4a2a14, brow: 0x3a2010, scowl: true, ...TEE, jacket: 0x5a6238, camo: [0x3a3f22, 0x7a7448, 0x2a2a1a], jacketSleeve: 9, belt: 0x3a2a1a, pants: 0x55552e, shorts: 5, socks: 0x1a1a1a, shoes: 0x141414, wrist: 0x1a1a1a },
    vox: { style: 'long', base: 0x6a3a1c, shade: 0x40220e, light: 0x8a5228, seed: 53, helmet: true },
    tail: { base: 0x6a3a1c, shade: 0x40220e, light: 0x8a5228, length: 10, width: 4 },
    accent: 0xffd84a, helmet: 0xc9963a, crest: 0xc8281e,
  },
  thalia: {
    paint: { skinTone: 0xf2d4c0, hair: 0x101014, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x3a8aff, pupil: 0x10204a, freckles: 0xd8a080, top: 0x22222a, sleeve: 0x22222a, collar: false, jacket: 0x16161c, jacketSleeve: 12, studs: 0xc0c0c8, pants: 0x1e1e26, torn: true, legSkin: 0xf2d4c0, shoes: 0x101010, sole: 0x3a3a3a, wrist: 0xc0c0c8 },
    vox: { style: 'spiky', base: 0x16161e, shade: 0x08080c, light: 0x2c3448, seed: 61 },
    accent: 0x4a8aff,
  },
  nico: {
    paint: { skinTone: 0xe8d4c8, hair: 0x0e0e12, fringe: 3, hairSide: 4, hairBack: 7, eye: 0x2a1a14, top: 0x1c1c22, collar: false, jacket: 0x5a3a22, jacketSleeve: 12, pants: 0x18181e, shoes: 0x101010, sole: 0x2a2a2a },
    vox: { style: 'messy', base: 0x16161c, shade: 0x08080c, light: 0x2a2a3a, seed: 73 },
    accent: 0x8a5aff, fleece: 0xd8c8a8,
  },
};

// Bronze Greek helmet with a red horsehair crest (Clarisse; Annabeth in battle).
function helmet(rig, color, crest) {
  const g = new THREE.Group();
  const m = mat(color, { rough: 0.35, metal: 0.8, emissive: 0x3a2408, ei: 0.4 });
  const c = mat(crest, { rough: 0.9 });
  bx(g, 9.6, 3.2, 9.6, 0, 8.9, 0, m, H);                   // crown
  bx(g, 9.8, 4, 1.2, 0, 6.6, -4.4, m, H);                   // back guard
  for (const sx of [-1, 1]) bx(g, 1.2, 5.6, 6, sx * 4.4, 5.8, 1.2, m, H);   // cheek guards
  bx(g, 1.6, 2.4, 1, 0, 6.6, 4.6, m, H);                    // nose guard
  for (let i = 0; i < 9; i++) bx(g, 1.6, 2.2 + Math.sin(i / 8 * Math.PI) * 2.2, 1.4, 0, 11 + Math.sin(i / 8 * Math.PI) * 1.1, -4.8 + i * 1.2, c, H);
  rig.head.add(g); return g;
}
// Fleece collar on an aviator jacket (Nico).
function fleeceCollar(rig, color) {
  const g = new THREE.Group(), m = mat(color, { rough: 1 });
  const y = (rig.dims.bodyH - 1) * PX;
  bx(g, 8.6, 1.6, 1.2, 0, 0, -2.3, m).position.y = y;
  for (const sx of [-1, 1]) { const b = bx(g, 1.6, 1.8, 3.6, sx * 3.4, 0, 0.2, m); b.position.y = y - 0.2 * PX; b.rotation.z = sx * 0.2; }
  rig.torso.add(g); return g;
}

// Add voxel hair (and a swinging ponytail) to a rig.
function addHair(rig, look) {
  const hm = hairMaterial();
  const hs = (rig.dims.headS / 8) * 1.12;
  const cubes = buildVoxelHair(look.vox);
  const mesh = voxelMesh(cubes, PX * hs, hm);
  mesh.userData.baseMat = hm; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.hair = mesh;
  if (look.tail) {
    const piv = new THREE.Group(); piv.position.set(0, 6.2 * PX * hs, -4.6 * PX * hs);
    const tail = voxelMesh(ponytailCubes({ ...look.tail, seed: look.vox.seed + 1 }), PX * hs, hm);
    tail.userData.baseMat = hm; rig.meshes.push(tail); piv.add(tail); rig.head.add(piv);
    rig.strands.push({ g: piv, ax: 0, az: 0, vx: 0, vz: 0, stiff: 26, base: [0, 0] });
  }
}

export function buildHeroModel(id) {
  const look = HERO_LOOKS[id] ?? HERO_LOOKS.percy;
  const S = new Skin(hashStr(id));
  paintHumanoid(S, look.paint);
  const map = S.texture();
  const material = makeCharMaterial(map, { emitStrength: 0 });
  material.alphaTest = 0.5;
  const rig = new Rig({ material, scale: look.scale ?? 1.18 });
  // a broad build: widen the torso and set the arms and legs further apart
  if (look.wide) {
    const w = look.wide;
    for (const m of rig.torso.children) if (m.isMesh) m.scale.set(w, 1, 1 + (w - 1) * 0.6);
    rig.armR.position.x *= w; rig.armL.position.x *= w;
    rig.legR.position.x *= 1 + (w - 1) * 0.6; rig.legL.position.x *= 1 + (w - 1) * 0.6;
    for (const arm of [rig.armR, rig.armL]) for (const m of arm.children) if (m.isMesh) m.scale.set(1.15, 1, 1.15);
  }
  if (look.vox) addHair(rig, look);
  if (look.cap) rig.extras.cap = cap(rig, look.cap);
  if (look.helmet) rig.extras.helmet = helmet(rig, look.helmet, look.crest);
  if (look.fleece) rig.extras.collar = fleeceCollar(rig, look.fleece);
  // signature props
  if (id === 'percy') { const s = buildRiptide(); rig.handR.add(s); rig.extras.weapon = s; }
  if (id === 'annabeth') { const d = buildDagger(); rig.handR.add(d); rig.extras.weapon = d; }
  if (id === 'grover') {
    const p = buildPipes(); rig.handL.add(p); rig.extras.pipes = p;
    const horn = mat(0xd8c8a0, { rough: 0.6 });
    for (const s of [-1, 1]) { const h = bx(rig.head, 1.6, 3.2, 1.6, s * 3.0, 12.4, 2.2, horn, H); h.rotation.z = -s * 0.35; h.rotation.x = -0.2; }
    rig.extras.wings = [wings(rig.legR, -10.5), wings(rig.legL, -10.5)];
  }
  if (id === 'tyson') {
    const watch = new THREE.Group(); bx(watch, 4.6, 1.6, 4.6, 0, -6.5, 0, BRONZE()); rig.armL.add(watch);
    const sh = buildWatchShield(); sh.visible = false; rig.handL.add(sh); rig.extras.shield = sh;
  }
  if (id === 'clarisse') {
    const s = buildSpear(); rig.handR.add(s); rig.extras.weapon = s;
    const b = buildBoarShield(); rig.armL.add(b); rig.extras.shield = b;
  }
  if (id === 'thalia') {
    const s = buildSpear(); rig.handR.add(s); rig.extras.weapon = s;
    const band = new THREE.Group(); bx(band, 4.6, 1.4, 4.6, 0, -6.5, 0, mat(0xc0c0c8, { rough: 0.3, metal: 0.9 })); rig.armL.add(band);
  }
  if (id === 'nico') {
    const g = new THREE.Group(), stygian = mat(0x1a1424, { rough: 0.3, metal: 0.7, emissive: 0x3a1a6a, ei: 0.8 });
    bx(g, 1.1, 1.1, 3.2, 0, 0, -0.6, mat(0x2a2020)); bx(g, 4, 1, 1, 0, 0, 1.4, stygian);
    [[1.8, 3, 3.6], [1.8, 3, 6.6], [1.5, 3, 9.6], [0.8, 2, 12]].forEach(([w, l, z]) => bx(g, w, 0.5, l, 0, 0, z, stygian));
    g.position.set(0, -1 * PX, 1 * PX); rig.handR.add(g); rig.extras.weapon = g;
  }
  rig.look = look;
  return rig;
}

// People of the camp: Chiron (a centaur) and Mr. D. Not playable.
export function buildNpc(id) {
  const S = new Skin(hashStr(id));
  if (id === 'chiron') {
    paintHumanoid(S, { skinTone: 0xe8c4a0, hair: 0x6a4a2a, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x4a3018, goatee: 0x6a4a2a, smile: true, top: 0x7a5a3a, jacket: 0x6a4a30, jacketSleeve: 12, collar: 0xe8e0d0, pants: 0xf0ece4, shoes: 0xf0ece4 });
    const rig = new Rig({ material: Object.assign(makeCharMaterial(S.texture()), { alphaTest: 0.5 }), scale: 1.25 });
    addHair(rig, { vox: { style: 'shaggy', base: 0x6a4a2a, shade: 0x4a3018, light: 0x8a6a42, seed: 5 } });
    // the horse body: white, behind and below the man
    rig.legL.visible = rig.legR.visible = false;
    const white = mat(0xf2eee6, { rough: 0.8 }), hoof = mat(0x3a2a1e);
    const horse = new THREE.Group(); horse.position.set(0, -2 * PX, -8 * PX);
    bx(horse, 11, 10, 22, 0, 2, 0, white); bx(horse, 9, 6, 6, 0, 3, 11, white);
    for (const [x, z] of [[-3.5, 8], [3.5, 8], [-3.5, -8], [3.5, -8]]) { bx(horse, 3, 12, 3, x, -7.5, z, white); bx(horse, 3.2, 1.6, 3.2, x, -13.2, z, hoof); }
    bx(horse, 2.4, 10, 2.4, 0, -1, -11.6, mat(0xd8d0c0)).rotation.x = 0.4;   // tail
    rig.hips.add(horse);
    rig.hips.position.y += 12 * PX;
    const bow = new THREE.Group(); bx(bow, 0.8, 18, 0.8, 0, 0, 0, mat(0x6a4a2a)); bow.position.set(2 * PX, 6 * PX, -3 * PX); bow.rotation.z = 0.5; rig.torso.add(bow);
    rig.look = { accent: 0xc9963a };
    return rig;
  }
  // Mr. D: short, round, curly black hair, a leopard-print Hawaiian shirt
  paintHumanoid(S, { skinTone: 0xe8b8a0, hair: 0x1a1414, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x6a2a6a, top: 0xd8a040, collar: 0xb07a20, pants: 0x3a2a4a, shoes: 0x2a1a14 });
  for (let i = 0; i < 40; i++) S.px(16 + Math.floor(S.r() * 24), 20 + Math.floor(S.r() * 12), 0x3a2414);
  const rig = new Rig({ material: Object.assign(makeCharMaterial(S.texture()), { alphaTest: 0.5 }), scale: 1.05, bodyW: 10 });
  addHair(rig, { vox: { style: 'afro', base: 0x1a1414, shade: 0x0a0808, light: 0x3a2a2a, seed: 9 } });
  const can = new THREE.Group(); bx(can, 1.8, 2.8, 1.8, 0, -1, 1, mat(0xc8c8d0, { metal: 0.8, rough: 0.3 })); rig.handR.add(can);
  rig.armR.rotation.x = -0.9;
  rig.look = { accent: 0x8a2a8a };
  return rig;
}

// Straw training dummy for the hub / test room.
export function buildDummy() {
  const S = new Skin(77);
  S.box(0, 0, 8, 8, 8, 0xd8c078, 0.2); S.rect(9, 12, 2, 2, 0x222222); S.rect(13, 12, 2, 2, 0x222222); S.rect(10, 14, 4, 1, 0x7a2a1a);
  S.box(16, 16, 8, 12, 4, 0xc9b070, 0.2); S.rect(20, 22, 8, 2, 0x9a3a2a);
  S.box(40, 16, 4, 12, 4, 0xc9b070, 0.2); S.box(32, 48, 4, 12, 4, 0xc9b070, 0.2);
  S.box(0, 16, 4, 12, 4, 0x6a4a2a, 0.1); S.box(16, 48, 4, 12, 4, 0x6a4a2a, 0.1);
  const material = makeCharMaterial(S.texture());
  material.alphaTest = 0.5;
  const rig = new Rig({ material, jacket: false });
  rig.armR.rotation.z = 1.4; rig.armL.rotation.z = -1.4;
  return rig;
}
