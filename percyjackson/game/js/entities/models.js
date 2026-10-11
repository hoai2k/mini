// Appearance of every hero: procedurally painted 64x64 skins (Camp
// Half-Blood T-shirts, jeans, goat legs, a Cyclops eye), hair strands and
// caps, and signature props (Riptide, Annabeth's dagger, Grover's reed
// pipes, Tyson's watch shield, Clarisse's electric spear and boar shield),
// built on the shared Rig.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';
import { hashStr } from '../util.js';

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
    S.px(9, ey, o.eyeWhite ?? 0xffffff); S.px(10, ey, o.eye ?? 0x3a2a1a);
    S.px(13, ey, o.eye ?? 0x3a2a1a); S.px(14, ey, o.eyeWhite ?? 0xffffff);
    S.px(9, ey - 1, brow); S.px(10, ey - 1, brow); S.px(13, ey - 1, brow); S.px(14, ey - 1, brow);
    S.px(11, ey + 2, 0xc89a88); S.px(12, ey + 2, 0xc89a88);
    if (o.smile) { S.px(10, ey + 3, 0x9a5a4a); S.px(11, ey + 3, 0x9a5a4a); S.px(12, ey + 3, 0x9a5a4a); S.px(13, ey + 3, 0x9a5a4a); }
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
  bx(g, 9.4, 2.6, 9.4, 0, 8.4, 0, m, H);
  bx(g, 8, 1.2, 1, 0, 9.6, 0, m, H);
  bx(g, 7.4, 0.6, 4.2, 0, 7.4, 6.2, m, H);
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

export const HERO_LOOKS = {
  percy: {
    paint: { skinTone: 0xf2cdb0, hair: 0x14141a, hairVolume: true, messy: true, fringe: 3, hairSide: 4, hairBack: 7, eye: 0x2e8b6e, smile: true, ...TEE, ...JEANS },
    hair: (m) => [
      { x: -2.5, y: 8, z: 1, w: 3, h: 3, d: 3, rx: 0.5, rz: 0.6, material: m },
      { x: 0.5, y: 8.5, z: 0.5, w: 3, h: 3.5, d: 3, rx: 0.3, rz: -0.2, material: m },
      { x: 2.8, y: 8, z: 1, w: 3, h: 3, d: 3, rx: 0.4, rz: -0.7, material: m },
      { x: -1.5, y: 8, z: -2.5, w: 3, h: 3, d: 3, rx: -0.7, rz: 0.3, material: m },
      { x: 1.8, y: 8, z: -2.2, w: 3, h: 3, d: 3, rx: -0.8, rz: -0.3, material: m },
      { x: 0, y: 7.4, z: 3.6, w: 6, h: 2, d: 2, rx: 1.0, material: m },
    ],
    hairColor: 0x14141a, accent: 0x2fd0d8,
  },
  annabeth: {
    paint: { skinTone: 0xeec6a4, hair: 0xe8b84a, hairVolume: true, curls: 0xc8902a, long: 7, fringe: 2, hairSide: 6, hairBack: 8, eye: 0x8c96a3, brow: 0xb8862a, beads: true, belt: 0x4a2e1a, ...TEE, pants: 0x6a6a3e, shorts: 4, socks: 0xf0ece0, shoes: 0x1e2a4a, sole: 0xf0ece0 },
    hair: (m) => [
      { x: -4, y: 4, z: 0.5, w: 2.5, h: 5, d: 6, hang: true, material: m, stiff: 35 },
      { x: 4, y: 4, z: 0.5, w: 2.5, h: 5, d: 6, hang: true, material: m, stiff: 35 },
      { x: 0, y: 6, z: -4.6, w: 5, h: 8, d: 3, hang: true, rx: 0.15, material: m, stiff: 25 },   // ponytail
      { x: 0, y: 4, z: -5, w: 4, h: 4, d: 2.5, hang: true, rx: 0.4, material: m, stiff: 30 },
    ],
    hairColor: 0xe8b84a, accent: 0xe0b04a, cap: 0x1e2a4a,
  },
  grover: {
    paint: { skinTone: 0xeec6a4, hair: 0x6a3a1e, hairVolume: true, curls: 0x4a2814, fringe: 3, hairSide: 5, hairBack: 7, eye: 0x4a2a14, goatee: 0x4a2814, smile: true, beads: true, ...TEE, pants: 0x5a5a32, shorts: 3, goat: [0x7a5030, 0x5a3a20], belt: 0x3a2414 },
    hair: (m) => [
      { x: -3.5, y: 6, z: 1, w: 2.5, h: 3, d: 3, rz: 0.9, material: m },
      { x: 3.5, y: 6, z: 1, w: 2.5, h: 3, d: 3, rz: -0.9, material: m },
      { x: -2, y: 5, z: -3.5, w: 3, h: 3, d: 2.5, rx: -0.9, material: m },
      { x: 2, y: 5, z: -3.5, w: 3, h: 3, d: 2.5, rx: -0.9, material: m },
    ],
    hairColor: 0x6a3a1e, accent: 0x5fae4a, cap: 0x2a3a4a,
  },
  tyson: {
    paint: { skinTone: 0xe2b48c, hair: 0x5a3a20, hairVolume: true, long: 4, fringe: 4, hairSide: 6, hairBack: 8, cyclops: true, eye: 0x7a4a1a, brow: 0x3a2414, top: 0xa8322a, plaid: [0x6a1a14, 0x2a1a14], collar: false, shortSleeve: 9, pants: 0x3d5a8a, torn: true, shoes: 0x3a2a1e, sole: 0xc8b8a0 },
    hair: (m) => [
      { x: -3.5, y: 6, z: 1.5, w: 2.5, h: 4, d: 3, rz: 0.5, hang: true, material: m, stiff: 40 },
      { x: 3.5, y: 6, z: 1.5, w: 2.5, h: 4, d: 3, rz: -0.5, hang: true, material: m, stiff: 40 },
      { x: 0, y: 8.6, z: 0, w: 7, h: 1.6, d: 7, rx: 0.1, material: m },
      { x: -1.5, y: 8, z: 3, w: 3, h: 2, d: 2, rx: 1.1, rz: 0.3, material: m },
      { x: 1.8, y: 8, z: 3, w: 3, h: 2, d: 2, rx: 1.2, rz: -0.3, material: m },
      { x: 0, y: 6, z: -4.4, w: 7, h: 6, d: 2, hang: true, material: m, stiff: 40 },
    ],
    hairColor: 0x5a3a20, accent: 0xff8a2a, scale: 1.45, wide: 1.3,
  },
  clarisse: {
    paint: { skinTone: 0xd8a682, hair: 0x5a3018, hairVolume: true, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x3a2214, brow: 0x3a2010, ...TEE, jacket: 0x5a6238, camo: [0x3a3f22, 0x7a7448, 0x2a2a1a], jacketSleeve: 9, belt: 0x3a2a1a, pants: 0x55552e, shorts: 5, socks: 0x1a1a1a, shoes: 0x141414, wrist: 0x1a1a1a },
    hair: (m) => [
      { x: 0, y: 8.5, z: -3.5, w: 3.5, h: 3, d: 3, rx: -0.6, material: m },
      { x: 0, y: 8, z: -5, w: 3.5, h: 9, d: 3, hang: true, rx: 0.25, material: m, stiff: 22 },   // ponytail
      { x: -3.6, y: 6, z: 1.5, w: 1.5, h: 4, d: 2, hang: true, material: m, stiff: 40 },
      { x: 3.6, y: 6, z: 1.5, w: 1.5, h: 4, d: 2, hang: true, material: m, stiff: 40 },
    ],
    hairColor: 0x5a3018, accent: 0xffd84a,
  },
  thalia: {
    paint: { skinTone: 0xf2d4c0, hair: 0x101014, hairVolume: true, messy: true, fringe: 3, hairSide: 5, hairBack: 6, eye: 0x3a7aff, top: 0x22222a, sleeve: 0x22222a, collar: false, jacket: 0x101012, jacketSleeve: 12, pants: 0x1a1a22, shoes: 0x101010, sole: 0x3a3a3a, wrist: 0xc0c0c8 },
    hair: (m) => [
      { x: -2.5, y: 8, z: 1, w: 3, h: 3, d: 3, rx: 0.4, rz: 0.7, material: m },
      { x: 2.5, y: 8, z: 1, w: 3, h: 3, d: 3, rx: 0.4, rz: -0.7, material: m },
      { x: 0, y: 8.5, z: -1.5, w: 4, h: 3.5, d: 4, rx: -0.6, material: m },
    ],
    hairColor: 0x101014, accent: 0x4a8aff,
  },
  nico: {
    paint: { skinTone: 0xe8d4c8, hair: 0x0e0e12, hairVolume: true, messy: true, fringe: 4, hairSide: 5, hairBack: 7, eye: 0x2a1a14, top: 0x2a2a30, collar: false, jacket: 0x14141a, jacketSleeve: 12, pants: 0x18181e, shoes: 0x101010 },
    hair: (m) => [
      { x: -2.5, y: 7.6, z: 2, w: 3, h: 3, d: 3, rx: 0.9, rz: 0.3, material: m },
      { x: 2.5, y: 7.6, z: 2, w: 3, h: 3, d: 3, rx: 0.9, rz: -0.3, material: m },
      { x: 0, y: 8, z: -2, w: 5, h: 3, d: 3, rx: -0.7, material: m },
    ],
    hairColor: 0x0e0e12, accent: 0x8a5aff,
  },
};

export function buildHeroModel(id) {
  const look = HERO_LOOKS[id] ?? HERO_LOOKS.percy;
  const S = new Skin(hashStr(id));
  paintHumanoid(S, look.paint);
  const map = S.texture();
  const material = makeCharMaterial(map, { emitStrength: 0 });
  material.alphaTest = 0.5;
  const hm = new THREE.MeshStandardNodeMaterial({ color: look.hairColor, roughness: 0.8 });
  const spec = { material, hair: look.hair(hm), hairMaterial: hm, scale: look.scale ?? 1.18 };
  const rig = new Rig(spec);
  // a broad build: widen the torso and set the arms and legs further apart
  if (look.wide) {
    const w = look.wide;
    for (const m of rig.torso.children) if (m.isMesh) m.scale.set(w, 1, 1 + (w - 1) * 0.6);
    rig.armR.position.x *= w; rig.armL.position.x *= w;
    rig.legR.position.x *= 1 + (w - 1) * 0.6; rig.legL.position.x *= 1 + (w - 1) * 0.6;
    for (const arm of [rig.armR, rig.armL]) for (const m of arm.children) if (m.isMesh) m.scale.set(1.15, 1, 1.15);
  }
  if (look.cap) rig.extras.cap = cap(rig, look.cap);
  // signature props
  if (id === 'percy') { const s = buildRiptide(); rig.handR.add(s); rig.extras.weapon = s; }
  if (id === 'annabeth') { const d = buildDagger(); rig.handR.add(d); rig.extras.weapon = d; }
  if (id === 'grover') {
    const p = buildPipes(); rig.handL.add(p); rig.extras.pipes = p;
    const horn = mat(0xd8c8a0, { rough: 0.6 });
    for (const s of [-1, 1]) { const h = bx(rig.head, 1.4, 2.2, 1.4, s * 4.4, 7.6, 1.2, horn, H); h.rotation.z = -s * 0.5; }
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
  rig.look = look;
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
