// Mortal disguises: what the Mist shows in place of a monster. Blocky people
// built on the shared Skin/Rig (one cached material per look, so spawning a
// crowd never compiles shaders): a sour maths teacher (Mrs. Dodds), a
// student, a tourist, a farmer, an old lady, a Lotus Casino bellhop and a
// salesman. paintPerson is also used by the humanoid monsters and bosses.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';

// Paint a humanoid skin. o: { skin, hair, hairVolume, fringe, hairSide, hairBack,
// top, sleeve, collar, trim, buttons, dots, plaid, overalls, pants, legR, legL,
// shoes, skirt, tights, eye, eyeWhite, brow, scowl, mouth, fangs, wrinkles,
// beard, glasses, lipstick, blush, face(S), body(S) }
export function paintPerson(S, o) {
  const skin = o.skin ?? 0xf0c8a8;
  S.box(0, 0, 8, 8, 8, skin, 0.05);
  // hair
  const hair = o.hair;
  if (hair != null) {
    S.rect(8, 0, 8, 8, hair, 0.12);
    S.rect(24, 8, 8, o.hairBack ?? 6, hair, 0.12);
    S.rect(0, 8, 8, o.hairSide ?? 3, hair, 0.12);
    S.rect(16, 8, 8, o.hairSide ?? 3, hair, 0.12);
    S.rect(8, 8, 8, o.fringe ?? 2, hair, 0.12);
    if (o.hairVolume) {
      S.rect(40, 0, 8, 8, hair, 0.15); S.rect(40, 8, 8, o.fringe ?? 2, hair, 0.15);
      S.rect(32, 8, 8, o.hairSide ?? 4, hair, 0.15); S.rect(48, 8, 8, o.hairSide ?? 4, hair, 0.15);
      S.rect(56, 8, 8, o.hairBack ?? 6, hair, 0.15);
    }
  }
  // face
  const ey = 8 + (o.eyeRow ?? 4);
  const eye = o.eye ?? 0x3a2a1a, white = o.eyeWhite ?? 0xffffff;
  S.px(9, ey, white); S.px(10, ey, eye); S.px(13, ey, eye); S.px(14, ey, white);
  const brow = o.brow ?? hair ?? 0x3a2a1a;
  if (o.scowl) { S.px(9, ey - 2, brow); S.px(10, ey - 1, brow); S.px(14, ey - 2, brow); S.px(13, ey - 1, brow); }
  else { S.px(9, ey - 1, brow); S.px(10, ey - 1, brow); S.px(13, ey - 1, brow); S.px(14, ey - 1, brow); }
  if (o.glasses) { for (const x of [9, 13]) { S.px(x - 0, ey - 1, o.glasses); S.px(x + 1, ey - 1, o.glasses); S.px(x, ey + 1, o.glasses); S.px(x + 1, ey + 1, o.glasses); } S.px(11, ey, o.glasses); S.px(12, ey, o.glasses); }
  if (o.wrinkles) { S.px(8, ey + 1, o.wrinkles); S.px(15, ey + 1, o.wrinkles); S.px(11, ey + 1, o.wrinkles); S.px(12, ey + 1, o.wrinkles); }
  if (o.blush) { S.px(9, ey + 1, o.blush); S.px(14, ey + 1, o.blush); }
  const my = ey + 2;
  if (o.mouth !== false) {
    const mc = o.lipstick ?? 0xa86a5a;
    if (o.frown) { S.px(10, my + 1, mc); S.px(11, my, mc); S.px(12, my, mc); S.px(13, my + 1, mc); }
    else if (o.grin) { S.rect(10, my, 4, 1, 0x2a0a0a, 0); S.px(10, my, 0xf4f0e0); S.px(13, my, 0xf4f0e0); }
    else { S.px(11, my, mc); S.px(12, my, mc); }
  }
  if (o.fangs) { S.px(10, my + 1, o.fangs); S.px(13, my + 1, o.fangs); }
  if (o.beard) { S.rect(8, my, 8, 8 + 8 - my, o.beard, 0.15); S.rect(0, 13, 8, 3, o.beard, 0.15); S.rect(16, 13, 8, 3, o.beard, 0.15); S.rect(10, my, 4, 1, 0x5a3a2a, 0); }
  o.face?.(S, ey);
  // torso
  const top = o.top ?? 0x3a5a8a;
  S.box(16, 16, 8, 12, 4, top, 0.08);
  if (o.jacket) S.box(16, 32, 8, 12, 4, o.jacket, 0.08);
  if (o.dots) for (let i = 0; i < 26; i++) S.px(16 + Math.floor(S.r() * 24), 20 + Math.floor(S.r() * 12), o.dots);
  if (o.plaid) { for (let x = 16; x < 40; x += 3) S.rect(x, 20, 1, 12, o.plaid, 0.05); for (let y = 21; y < 32; y += 3) S.rect(16, y, 24, 1, o.plaid, 0.05); }
  if (o.trim) S.rect(23, 20, 2, 12, o.trim, 0.05);
  if (o.buttons) for (let y = 22; y < 32; y += 3) S.px(24, y, o.buttons);
  if (o.collar) S.rect(20, 20, 8, 2, o.collar, 0.05);
  if (o.overalls) { S.rect(21, 23, 6, 9, o.overalls, 0.08); S.rect(32, 26, 8, 6, o.overalls, 0.08); S.px(21, 20, o.overalls); S.px(21, 21, o.overalls); S.px(21, 22, o.overalls); S.px(26, 20, o.overalls); S.px(26, 21, o.overalls); S.px(26, 22, o.overalls); S.px(22, 23, 0xd8c8a0); S.px(25, 23, 0xd8c8a0); }
  // jacket layer (the outer 'jacket' box): an open leather jacket shows the top beneath
  if (o.jacket) { S.ctx.clearRect(22, 36, 4, 12); if (o.lapel) { S.rect(21, 36, 1, 5, o.lapel, 0.05); S.rect(26, 36, 1, 5, o.lapel, 0.05); } }
  // arms
  const sleeve = o.sleeve ?? top;
  S.box(40, 16, 4, 12, 4, sleeve, 0.08); S.box(32, 48, 4, 12, 4, sleeve, 0.08);
  if (o.jacket) { S.box(40, 32, 4, 12, 4, o.jacket, 0.08); S.box(48, 48, 4, 12, 4, o.jacket, 0.08); }
  const hand = o.hand ?? skin;
  for (const [u, v] of [[40, 16], [32, 48]]) { S.rect(u, v + 4 + (o.shortSleeve ? 5 : 9), 16, o.shortSleeve ? 7 : 3, hand, 0.04); S.rect(u + 8, v, 4, 4, hand, 0.04); }
  if (o.jacket) for (const [u, v] of [[40, 32], [48, 48]]) S.ctx.clearRect(u, v + 4 + 10, 16, 2);
  // legs
  const legR = o.legR ?? o.pants ?? 0x2a2a3a, legL = o.legL ?? o.pants ?? 0x2a2a3a;
  S.box(0, 16, 4, 12, 4, legR, 0.08); S.box(16, 48, 4, 12, 4, legL, 0.08);
  for (const [u, v] of [[0, 16], [16, 48]]) {
    if (o.shorts) S.rect(u, v + 4 + 5, 16, 7, skin, 0.04);
    if (o.tights) S.rect(u, v + 4 + 5, 16, 7, o.tights, 0.05);
    if (o.skirt) S.rect(u, v + 4, 16, o.skirtLen ?? 5, o.skirt, 0.06);
    if (o.shoes !== false) { S.rect(u, v + 4 + 10, 16, 2, o.shoes ?? 0x1a1a1a, 0.05); S.rect(u + 8, v, 4, 4, o.shoes ?? 0x1a1a1a, 0.05); }
  }
  o.body?.(S);
}

export const solidMat = (() => { const c = new Map(); return (hex, emissive = 0, rough = 0.7, metal = 0) => { const k = [hex, emissive, rough, metal].join(':'); if (!c.has(k)) c.set(k, new THREE.MeshStandardNodeMaterial({ color: hex, roughness: rough, metalness: metal, emissive: emissive ? hex : 0, emissiveIntensity: emissive })); return c.get(k); }; })();

const mats = new Map();
function skinMaterial(id, paint, seed) {
  if (!mats.has(id)) {
    const S = new Skin(seed);
    paintPerson(S, paint);
    const m = makeCharMaterial(S.texture(), { emitStrength: 0, fill: 0.1 }); m.alphaTest = 0.5;
    mats.set(id, m);
  }
  return mats.get(id);
}

// A prop box hung on a rig group.
function prop(rig, parent, w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = rig.mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mat);
  m.position.set(x * PX, y * PX, z * PX); m.rotation.set(rx, ry, rz); parent.add(m); return m;
}
const HS = 1.12; // head scale used by Rig

export const MORTALS = {
  teacher: {
    name: 'Mrs. Dodds', blurb: 'A pre-algebra teacher who looks at you like you owe her homework.',
    paint: { skin: 0xead2bc, hair: 0x9a9a9e, hairVolume: true, fringe: 2, hairSide: 3, hairBack: 7, brow: 0x5a5a5e, eye: 0x2a2a2a, scowl: true, frown: true, wrinkles: 0xd0b29a, lipstick: 0x8a4a4a, top: 0x5a1a22, jacket: 0x161618, lapel: 0x2a2a2e, pants: 0x1e1e22, skirt: 0x1e1e22, skirtLen: 8, tights: 0x2a2224, shoes: 0x0e0e0e },
    build(rig, hairM) {
      const bun = prop(rig, rig.head, 4, 4, 3.5, hairM, 0, 8.6 * HS, -3.2 * HS);
      bun.rotation.x = 0.4;
    },
  },
  student: {
    name: 'Student', blurb: 'Just a kid on the field trip. Probably.',
    paint: { skin: 0xf0c8a8, hair: 0x5a3a22, hairVolume: true, fringe: 3, eye: 0x3a5a2a, top: 0x2a3a6a, trim: 0x1e2a50, collar: 0xe8e4d8, pants: 0x3a4a6a, shoes: 0xe8e8e8, blush: 0xe8b0a0 },
    build(rig) {
      const pack = prop(rig, rig.torso, 7, 8, 3, solidMat(0xd84a3a), 0, 6, -3.6);
      prop(rig, pack, 5, 2, 0.6, solidMat(0x9a2a2a), 0, -1, -1.6);
    },
  },
  tourist: {
    name: 'Tourist', blurb: 'Sun hat, camera, and a smile that is slightly too wide.',
    paint: { skin: 0xf4c8a8, hair: 0xc8a060, fringe: 1, eye: 0x2a5a8a, grin: true, top: 0xf28c28, dots: 0xfff2c0, shortSleeve: true, pants: 0xc8b88a, shorts: true, shoes: 0x8a5a3a, blush: 0xf0a090 },
    build(rig) {
      const straw = solidMat(0xe8d49a);
      prop(rig, rig.head, 14, 1, 14, straw, 0, 8.4 * HS, 0);
      prop(rig, rig.head, 8.6, 3, 8.6, straw, 0, 10 * HS, 0);
      prop(rig, rig.head, 8.8, 0.8, 8.8, solidMat(0x0f6f73), 0, 9.1 * HS, 0);
      const cam = prop(rig, rig.torso, 4, 3, 2, solidMat(0x1a1a1e), 0, 7, 2.6);
      prop(rig, cam, 1.6, 1.6, 1.4, solidMat(0x6a8aa8, 0.6), 0, 0, 1.4);
      prop(rig, rig.torso, 8.4, 0.5, 4.4, solidMat(0x1a1a1e), 0, 10.5, 0, 0, 0, 0.5);
    },
  },
  farmer: {
    name: 'Farmer', blurb: 'Out checking the fences in a thunderstorm. Odd.',
    paint: { skin: 0xe0b090, hair: 0x6a5a4a, fringe: 1, hairSide: 2, eye: 0x3a2a1a, beard: 0x7a6a5a, top: 0xb83a2a, plaid: 0x5a1a14, overalls: 0x3a5a8a, pants: 0x3a5a8a, shoes: 0x4a3020 },
    build(rig) {
      const straw = solidMat(0xd8c07a);
      prop(rig, rig.head, 12, 1, 12, straw, 0, 8.4 * HS, 0);
      prop(rig, rig.head, 8.4, 3, 8.4, straw, 0, 10 * HS, 0);
      const fork = new THREE.Group(); rig.handR.add(fork); fork.rotation.x = -0.2;
      prop(rig, fork, 1, 26, 1, solidMat(0x8a6a3a), 0, 4, 1.5);
      for (const x of [-1.5, 0, 1.5]) prop(rig, fork, 0.6, 5, 0.6, solidMat(0x9aa0a8, 0, 0.4, 0.6), x, 18.5, 1.5);
      prop(rig, fork, 4, 0.8, 0.8, solidMat(0x9aa0a8, 0, 0.4, 0.6), 0, 16, 1.5);
    },
  },
  old_lady: {
    name: 'Old Lady', blurb: 'Knitting socks. Very large socks. With very sharp scissors.',
    paint: { skin: 0xecd2c0, hair: 0xd8d8dc, hairVolume: true, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x4a3a5a, wrinkles: 0xd8b8a8, glasses: 0xb89a4a, lipstick: 0xb05a7a, top: 0x5a2a6a, collar: 0xf4ead5, buttons: 0xc9963a, pants: 0x4a2058, skirt: 0x4a2058, skirtLen: 10, tights: 0xc8b0a0, shoes: 0x2a1a20 },
    build(rig) {
      const lace = solidMat(0xf4ead5);
      prop(rig, rig.head, 10, 0.8, 10, lace, 0, 8.6 * HS, 0);
      prop(rig, rig.head, 6, 2.5, 6, lace, 0, 9.8 * HS, 0);
      prop(rig, rig.head, 6.2, 0.6, 6.2, solidMat(0xb05a7a), 0, 9.2 * HS, 0);
      const bag = prop(rig, rig.handL, 4, 4, 2, solidMat(0x7a2a4a), 0, -3, 0);
      prop(rig, bag, 2.5, 1.6, 0.4, solidMat(0xc9963a, 0, 0.4, 0.5), 0, 2.4, 0);
    },
  },
  bellhop: {
    name: 'Bellhop', blurb: 'Welcome to the Lotus! Your stay is on the house. For ever.',
    paint: { skin: 0xe8c0a0, hair: 0x2a1a12, fringe: 2, hairSide: 2, eye: 0x2a3a2a, grin: true, top: 0xb8232f, trim: 0x8a1a22, buttons: 0xe8c060, collar: 0xe8c060, sleeve: 0xb8232f, pants: 0x1a1a22, shoes: 0x0e0e0e,
      body: (s) => { s.rect(16, 30, 24, 1, 0xe8c060, 0); s.rect(40, 26, 16, 1, 0xe8c060, 0); s.rect(32, 58, 16, 1, 0xe8c060, 0); } },
    build(rig) {
      const red = solidMat(0xb8232f), gold = solidMat(0xe8c060, 0.2, 0.4, 0.6);
      prop(rig, rig.head, 6, 3, 6, red, 0, 9.6 * HS, 0.4 * HS);
      prop(rig, rig.head, 6.2, 0.6, 6.2, gold, 0, 8.4 * HS, 0.4 * HS);
      // a lotus-flower pin and a silver tray on the left hand
      prop(rig, rig.torso, 1.6, 1.6, 0.6, solidMat(0xf4a0c8, 0.6), 2.4, 9.5, 2.3);
      const tray = prop(rig, rig.handL, 9, 0.6, 7, solidMat(0xc8c8d0, 0, 0.3, 0.8), 0, -1.5, 2.5);
      prop(rig, tray, 1.6, 2.4, 1.6, solidMat(0xf4a0c8, 0.4), 1.5, 1.4, 0); prop(rig, tray, 1.4, 1.4, 1.4, solidMat(0xf4d0e0, 0.3), -2, 1, 1);
      rig.armL.rotation.x = -0.9;
    },
  },
  salesman: {
    name: 'Salesman', blurb: 'A big smile, a bigger handshake, and a deal you can’t refuse.',
    paint: { skin: 0xe0b08a, hair: 0x1a1414, fringe: 1, hairSide: 2, hairBack: 5, eye: 0x2a1a0a, grin: true, top: 0xf4f0e4, jacket: 0xc8a050, lapel: 0xa8803a, collar: 0xffffff, trim: 0xb8232f, sleeve: 0xc8a050, pants: 0xb8903a, shoes: 0x3a2214 },
    build(rig) {
      prop(rig, rig.torso, 1.6, 7, 0.6, solidMat(0xb8232f), 0, 5.5, 2.6);
      prop(rig, rig.torso, 2.4, 1.4, 0.4, solidMat(0xf4f0e4), -2.6, 9.4, 2.6);   // name tag
      const case_ = prop(rig, rig.handL, 6, 5, 2, solidMat(0x5a3a22), 0, -3.5, 0);
      prop(rig, case_, 2.4, 1, 1, solidMat(0xc9963a, 0, 0.4, 0.6), 0, 3, 0);
    },
  },
};
export const MORTAL_IDS = Object.keys(MORTALS);
export const mortalId = (id) => (MORTALS[id] ? id : 'student');

// Build a mortal rig. Returns a Rig whose spec carries the mortal's id.
export function buildMortal(id) {
  id = mortalId(id);
  const def = MORTALS[id];
  const hairM = solidMat(def.paint.hair ?? 0x5a3a22);
  const rig = new Rig({ material: skinMaterial(id, def.paint, id.length * 97 + 11), mortal: id, scale: id === 'student' ? 0.92 : 1 });
  def.build?.(rig, hairM);
  rig.mortal = id;
  return rig;
}
