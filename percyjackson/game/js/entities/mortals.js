// Mortal disguises: what the Mist shows in place of a monster. Blocky people
// built on the shared Skin/Rig in the chunky voxel style of the hero sheets
// (design/concept/vox-*.png): a fine 128 × 128 painted skin (two-pixel eyes
// with glints, noses, lips, knits, florals, checks and stitching), grid-voxel
// hair (buns, perms, pompadours, beards) and block clothing and props (hats,
// collars, lapels, skirts, shoes, bags) merged into one vertex-coloured mesh
// per limb. Skins, materials and geometry are built once per look and shared,
// so spawning a crowd never compiles a shader or rebuilds a mesh.
//
// The cast: a sour maths teacher in a black leather jacket (Mrs. Dodds), a
// student, a tourist, a farmer, an old lady, a Lotus Casino bellhop and a
// salesman. paintPerson is also used by the humanoid monsters and bosses.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX, mergeChildren } from './character.js';
import { cellMesh, footwear, beads } from './herovox.js';
import { mulberry32 } from '../util.js';
import { t as txt } from '../text_config.js';
import { markHeadwear, reshape, applyShape } from './proportions.js';

const shadeOf = (c, k) => { const x = new THREE.Color(c); x.r = Math.min(1, x.r * k); x.g = Math.min(1, x.g * k); x.b = Math.min(1, x.b * k); return x.getHex(); };
const mixC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();

// Skin layout (Minecraft-style): head (0,0) with hat layer (32,0); torso
// (16,16) with jacket layer (16,32); right arm (40,16)/(40,32); left arm
// (32,48)/(48,48); right leg (0,16); left leg (16,48).
const ARMS = [[40, 16], [32, 48]], ARM_OVER = [[40, 32], [48, 48]], LEGS = [[0, 16], [16, 48]];

// Paint a humanoid skin. o: { skin, hair, hairVolume, fringe, hairSide, hairBack,
// top, sleeve, collar, trim, buttons, dots, plaid, overalls, pants, legR, legL,
// shoes, skirt, tights, eye, eyeWhite, brow, scowl, mouth, fangs, wrinkles,
// beard, glasses, lipstick, blush, face(S), body(S) }
// On a fine skin (Skin res 2) the face is drawn at half-pixel detail: eyes
// with irises, pupils and glints under a lash line, a shaded nose, lips and
// ears; the mouth sits a row lower (eyeRow 3 gives eyes, nose, mouth and chin).
// Fine-skin extras: squint, browUp, smile, nose (tip colour), moustache,
// goldTooth, knit, floral [petal, centre, leaf], vneck (shirt colour),
// tie (colour inside the V), pocket, straps, zip, check, socks, sockLen,
// legStripe. Every skin: shade (limbs darken toward the bottom; default on
// for fine skins only, so glowing monster pixels keep their glow), saturate.
export function paintPerson(S, o) {
  const fine = S.res > 1, k = S.dres;
  const D = (x, y, c, n = 1, m = 1) => S.dot(x, y, c, n, m);
  const M = (x, y, c, n = 1, m = 1) => { D(x, y, c, n, m); D(24 - x - n / k, y, c, n, m); };   // mirrored across the face
  const skin = o.skin ?? 0xf0c8a8, skinD = shadeOf(skin, 0.84), skinDD = shadeOf(skin, 0.7);
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
    if (fine) {
      // strands: light and dark flecks, and a ragged hairline
      const hl = shadeOf(hair, 1.25), hd = shadeOf(hair, 0.7);
      for (let i = 0; i < 70; i++) { const x = 8 + Math.floor(S.r() * 16) / 2; D(x, Math.floor(S.r() * 16) / 2, S.r() < 0.5 ? hl : hd, 1, 2); }
      for (const [u, h] of [[0, o.hairSide ?? 3], [16, o.hairSide ?? 3], [24, o.hairBack ?? 6], [8, o.fringe ?? 2]]) {
        for (let x = u; x < u + 8; x += 0.5) { if (S.r() < 0.45) D(x, 8 + h, hair, 1, 1 + Math.floor(S.r() * 2)); if (S.r() < 0.3) D(x, 8 + Math.floor(S.r() * h * 2) / 2, S.r() < 0.5 ? hl : hd, 1, 2); }
      }
    }
  }
  // face
  const ey = 8 + (o.eyeRow ?? 4);
  const eye = o.eye ?? 0x3a2a1a, white = o.eyeWhite ?? 0xffffff;
  const brow = o.brow ?? hair ?? 0x3a2a1a;
  const my = fine ? ey + 3 : ey + 2;
  if (fine) {
    // ears on the head's sides, a shadow under the chin
    S.rect(16, 0, 8, 8, skinD, 0.04);
    if (ey + 2 < 16) for (const x of [2.5, 19.5]) { D(x, ey, skinD, 4, 5); D(x + 0.5, ey + 0.5, skinDD, 2, 3); }
    // brows
    if (o.scowl) { M(8.5, ey - 2.5, brow, 2, 2); M(9.5, ey - 2, brow, 2, 2); M(10.5, ey - 1.5, brow, 2, 2); }
    else if (o.browUp) { M(8.5, ey - 2.5, brow, 5, 1); M(8.5, ey - 2, brow, 1, 1); M(9, ey - 3, brow, 3, 1); }
    else M(8.5, ey - 2, brow, 5, 2);
    // eyes: white, iris to the inside with a pupil and a glint, lash line, lower lid
    const lash = o.lash ?? mixC(brow, 0x0a0806, 0.5);
    if (eye === white) M(9, ey - 0.5, eye, 4, 4);
    else {
      M(9, ey, white, 4, 3);
      D(10, ey, eye, 2, 3); D(13, ey, eye, 2, 3);
      D(10.5, ey + 0.5, o.pupil ?? 0x0c0a0a, 1, 2); D(13, ey + 0.5, o.pupil ?? 0x0c0a0a, 1, 2);
      D(10, ey, 0xffffff, 1, 1); D(13.5, ey, 0xffffff, 1, 1);
      M(9, ey - 0.5, lash, 4, 1); M(8.5, ey - 0.5, lash, 1, 1);
      if (o.squint) { M(9, ey, mixC(skin, lash, 0.25), 4, 1); M(9, ey + 0.5, lash, 4, 1); }
      M(9, ey + 1.5, skinD, 4, 1);
    }
    // nose: a shaded bridge and tip
    D(11.5, ey + 0.5, skinD, 1, 2); D(11.5, ey + 1.5, o.nose ?? shadeOf(skin, 0.92), 2, 1); D(11.5, ey + 2, o.nose ? shadeOf(o.nose, 0.85) : skinDD, 2, 1);
    if (o.blush) { M(8.5, ey + 2, o.blush, 3, 1); M(9, ey + 2.5, o.blush, 2, 1); }
    if (o.wrinkles) { const w = o.wrinkles; M(8, ey, w, 1, 1); M(8, ey + 1, w, 1, 1); D(10, ey - 3.5, w, 8, 1); M(9.5, ey + 2.5, w, 1, 2); M(9.5, ey + 2, w, 2, 1); }
    if (o.beard) {
      const b = o.beard;
      D(8, my - 0.5, b, 16, (16 - my + 0.5) * k); S.rect(0, 13, 8, 3, b, 0.15); S.rect(16, 13, 8, 3, b, 0.15);
      for (let i = 0; i < 18; i++) D(8 + Math.floor(S.r() * 16) / 2, my + Math.floor(S.r() * (16 - my) * 2) / 2, shadeOf(b, S.r() < 0.5 ? 0.75 : 1.2), 1, 1);
    }
    if (o.moustache) { D(10.5, my - 0.5, o.moustache, 6, 1); M(10, my, o.moustache, 1, 1); }
    // mouth
    if (o.mouth !== false) {
      const mc = o.lipstick ?? mixC(skin, 0x8a2a2a, 0.45), dark = 0x2a0a0a, teeth = 0xf6f2e6;
      if (o.frown) { D(11, my, mc, 4, 1); M(10.5, my + 0.5, mc, 1, 1); M(9.5, ey + 2.5, skinD, 1, 2); }
      else if (o.grin) {
        D(10, my, dark, 8, 2); D(10.5, my, teeth, 6, 1); M(9.5, my - 0.5, mc, 1, 1); D(10.5, my + 1, mc, 6, 1);
        if (o.goldTooth) D(12.5, my, o.goldTooth, 1, 1);
      } else if (o.smile) { D(11, my + 0.5, mc, 4, 1); M(10.5, my, mc, 1, 1); M(10, my - 0.5, skinD, 1, 1); }
      else { D(11, my, mc, 4, 1); D(11.5, my + 0.5, o.lipstick ? shadeOf(mc, 1.2) : skinD, 2, 1); }
      if (o.lipstick && !o.grin && !o.frown) D(11.5, my - 0.5, mc, 2, 1);
    }
    if (o.fangs) { D(10.5, my + 1, o.fangs, 1, 2); D(13, my + 1, o.fangs, 1, 2); }
    if (my + 1.5 < 16 && !o.beard) D(10.5, 15.5, skinD, 6, 1);
    if (o.glasses) { const g = o.glasses; M(8.5, ey - 0.5, g, 6, 1); M(8.5, ey + 1.5, g, 6, 1); M(8.5, ey - 0.5, g, 1, 5); M(11, ey - 0.5, g, 1, 5); D(11.5, ey, g, 2, 1); }
  } else {
    S.px(9, ey, white); S.px(10, ey, eye); S.px(13, ey, eye); S.px(14, ey, white);
    if (o.scowl) { S.px(9, ey - 2, brow); S.px(10, ey - 1, brow); S.px(14, ey - 2, brow); S.px(13, ey - 1, brow); }
    else { S.px(9, ey - 1, brow); S.px(10, ey - 1, brow); S.px(13, ey - 1, brow); S.px(14, ey - 1, brow); }
    S.px(11, ey + 1, shadeOf(skin, 0.88)); S.px(12, ey + 1, shadeOf(skin, 0.94));   // nose
    if (o.glasses) { for (const x of [9, 13]) { S.px(x - 0, ey - 1, o.glasses); S.px(x + 1, ey - 1, o.glasses); S.px(x, ey + 1, o.glasses); S.px(x + 1, ey + 1, o.glasses); } S.px(11, ey, o.glasses); S.px(12, ey, o.glasses); }
    if (o.wrinkles) { S.px(8, ey + 1, o.wrinkles); S.px(15, ey + 1, o.wrinkles); S.px(11, ey + 1, o.wrinkles); S.px(12, ey + 1, o.wrinkles); }
    if (o.blush) { S.px(9, ey + 1, o.blush); S.px(14, ey + 1, o.blush); }
    if (o.mouth !== false) {
      const mc = o.lipstick ?? 0xa86a5a;
      if (o.frown) { S.px(10, my + 1, mc); S.px(11, my, mc); S.px(12, my, mc); S.px(13, my + 1, mc); }
      else if (o.grin) { S.rect(10, my, 4, 1, 0x2a0a0a, 0); S.px(10, my, 0xf4f0e0); S.px(13, my, 0xf4f0e0); }
      else { S.px(11, my, mc); S.px(12, my, mc); }
    }
    if (o.fangs) { S.px(10, my + 1, o.fangs); S.px(13, my + 1, o.fangs); }
    if (o.beard) { S.rect(8, my, 8, 8 + 8 - my, o.beard, 0.15); S.rect(0, 13, 8, 3, o.beard, 0.15); S.rect(16, 13, 8, 3, o.beard, 0.15); S.rect(10, my, 4, 1, 0x5a3a2a, 0); }
  }
  o.face?.(S, ey);
  // torso
  const top = o.top ?? 0x3a5a8a;
  S.box(16, 16, 8, 12, 4, top, 0.08);
  if (o.jacket) { S.box(16, 32, 8, 12, 4, o.jacket, 0.08); if (fine && o.check) for (let x = 16; x < 40; x += 2) { D(x, 36, o.check, 1, 24); } }
  if (fine && o.check && o.jacket) for (let y = 37; y < 48; y += 2) D(16, y, o.check, 48, 1);
  if (fine && o.knit) { const kd = shadeOf(top, 0.86); for (let y = 20; y < 32; y++) D(16, y + 0.5, kd, 48, 1); for (let x = 16; x < 40; x += 2) D(x, 20, shadeOf(top, 0.93), 1, 24); }
  if (fine && o.floral) {
    const [pet, cen, leaf] = o.floral;
    const flower = (x, y) => { D(x, y - 0.5, pet); D(x - 0.5, y, pet); D(x + 0.5, y, pet); D(x, y + 0.5, pet); D(x, y, cen); if (leaf != null) D(x + 1, y + 0.5, leaf, 1, 1); };
    for (let i = 0; i < 40; i++) flower(16.5 + Math.floor(S.r() * 46) / 2, 20.5 + Math.floor(S.r() * 22) / 2);
    for (const [u, v] of ARMS) for (let i = 0; i < 7; i++) flower(u + 0.5 + Math.floor(S.r() * 30) / 2, v + 4.5 + Math.floor(S.r() * 8) / 2);
  }
  if (o.dots) for (let i = 0; i < 26; i++) S.px(16 + Math.floor(S.r() * 24), 20 + Math.floor(S.r() * 12), o.dots);
  if (o.plaid) { for (let x = 16; x < 40; x += 3) S.rect(x, 20, 1, 12, o.plaid, 0.05); for (let y = 21; y < 32; y += 3) S.rect(16, y, 24, 1, o.plaid, 0.05); if (fine) for (let x = 17.5; x < 40; x += 3) D(x, 20, shadeOf(top, 1.25), 1, 24); }
  if (fine && o.vneck != null) { for (let i = 0; i < 4; i++) D(21 + i * 0.5, 20 + i, o.vneck, (7 - i * 2) * 1 + 1, 2); if (o.tie != null) { D(23.5, 20.5, o.tie, 2, 6); } D(20.5, 20, shadeOf(top, 0.7), 1, 1); D(27, 20, shadeOf(top, 0.7), 1, 1); }
  if (o.trim) S.rect(23, 20, 2, 12, o.trim, 0.05);
  if (o.buttons) for (let y = 22; y < 32; y += 3) S.px(24, y, o.buttons);
  if (o.collar) S.rect(20, 20, 8, 2, o.collar, 0.05);
  if (fine && o.pocket != null) { D(25, 22, o.pocket, 4, 1); D(25, 22, o.pocket, 1, 4); D(26.5, 22, o.pocket, 1, 4); D(25, 23.5, o.pocket, 4, 1); }
  if (fine && o.straps != null) { D(20.5, 20, o.straps, 2, 24); D(26.5, 20, o.straps, 2, 24); }
  if (o.overalls) {
    S.rect(21, 23, 6, 9, o.overalls, 0.08); S.rect(32, 26, 8, 6, o.overalls, 0.08); S.px(21, 20, o.overalls); S.px(21, 21, o.overalls); S.px(21, 22, o.overalls); S.px(26, 20, o.overalls); S.px(26, 21, o.overalls); S.px(26, 22, o.overalls); S.px(22, 23, 0xd8c8a0); S.px(25, 23, 0xd8c8a0);
    if (fine) { const st = 0xe0b050; for (let y = 23.5; y < 32; y += 1) { D(21.5, y, st, 1, 1); D(26, y, st, 1, 1); } for (let x = 22; x < 26; x += 1) D(x, 23.5, st, 1, 1); D(22.5, 25.5, shadeOf(o.overalls, 0.75), 6, 1); }
  }
  if (fine && !o.overalls && o.hem !== false) S.rect(16, 31, 24, 1, shadeOf(top, 0.8), 0.04);
  // jacket layer (the outer 'jacket' box): an open leather jacket shows the top beneath
  if (o.jacket) {
    S.ctx.clearRect(22, 36, 4, 12);
    if (o.lapel) { S.rect(21, 36, 1, 5, o.lapel, 0.05); S.rect(26, 36, 1, 5, o.lapel, 0.05); }
    if (fine) {
      S.rect(16, 47, 24, 1, shadeOf(o.jacket, 0.78), 0.04);
      if (o.zip) { D(21.5, 36, o.zip, 1, 24); D(26, 36, o.zip, 1, 24); }
      D(20, 43, shadeOf(o.jacket, 0.7), 3, 1); D(26.5, 43, shadeOf(o.jacket, 0.7), 3, 1);   // pocket welts
      for (let i = 0; i < 20; i++) D(16 + Math.floor(S.r() * 48) / 2, 36 + Math.floor(S.r() * 24) / 2, shadeOf(o.jacket, S.r() < 0.5 ? 1.35 : 0.8), 1, 1);
    }
  }
  // arms
  const sleeve = o.sleeve ?? top;
  S.box(40, 16, 4, 12, 4, sleeve, 0.08); S.box(32, 48, 4, 12, 4, sleeve, 0.08);
  if (o.jacket) { S.box(40, 32, 4, 12, 4, o.jacket, 0.08); S.box(48, 48, 4, 12, 4, o.jacket, 0.08); if (fine && o.check) for (const [u, v] of ARM_OVER) { for (let x = u; x < u + 16; x += 2) D(x, v + 4, o.check, 1, 20); for (let y = v + 5; y < v + 14; y += 2) D(u, y, o.check, 32, 1); } }
  if (fine && o.knit && !o.jacket) for (const [u, v] of ARMS) for (let y = v + 4; y < v + 13; y++) D(u, y + 0.5, shadeOf(sleeve, 0.86), 32, 1);
  const hand = o.hand ?? skin;
  for (const [u, v] of [[40, 16], [32, 48]]) {
    if (fine && !o.jacket) S.rect(u, v + 4 + (o.shortSleeve ? 4 : 8), 16, 1, shadeOf(sleeve, 0.78), 0.04);   // cuff or hem
    S.rect(u, v + 4 + (o.shortSleeve ? 5 : 9), 16, o.shortSleeve ? 7 : 3, hand, 0.04); S.rect(u + 8, v, 4, 4, hand, 0.04);
    if (fine) { D(u, v + 4 + 10.5, shadeOf(hand, 0.88), 32, 1); D(u + 4, v + 4 + 11.5, shadeOf(hand, 0.9), 8, 1); }
  }
  if (o.jacket) for (const [u, v] of [[40, 32], [48, 48]]) { S.ctx.clearRect(u, v + 4 + 10, 16, 2); if (fine) S.rect(u, v + 4 + 9, 16, 1, shadeOf(o.jacket, 0.75), 0.04); }
  // legs
  const legR = o.legR ?? o.pants ?? 0x2a2a3a, legL = o.legL ?? o.pants ?? 0x2a2a3a;
  S.box(0, 16, 4, 12, 4, legR, 0.08); S.box(16, 48, 4, 12, 4, legL, 0.08);
  for (const [u, v] of [[0, 16], [16, 48]]) {
    const pc = u === 0 ? legR : legL;
    if (fine) {
      D(u + 5.75, v + 5, shadeOf(pc, 0.85), 1, 18); D(u + 13.75, v + 5, shadeOf(pc, 0.85), 1, 18);   // creases
      if (o.check) { for (let x = u; x < u + 16; x += 2) D(x, v + 4, o.check, 1, 24); for (let y = v + 5; y < v + 16; y += 2) D(u, y, o.check, 32, 1); }
      if (o.legStripe) D(u === 0 ? 1.5 : 25.5, v + 4, o.legStripe, 2, 20);
    }
    if (o.shorts) S.rect(u, v + 4 + 5, 16, 7, skin, 0.04);
    if (o.tights) S.rect(u, v + 4 + 5, 16, 7, o.tights, 0.05);
    if (o.skirt) S.rect(u, v + 4, 16, o.skirtLen ?? 5, o.skirt, 0.06);
    if (fine && o.socks) S.rect(u, v + 4 + 10 - (o.sockLen ?? 3), 16, o.sockLen ?? 3, o.socks, 0.05);
    if (o.shoes !== false) {
      S.rect(u, v + 4 + 10, 16, 2, o.shoes ?? 0x1a1a1a, 0.05); S.rect(u + 8, v, 4, 4, o.shoes ?? 0x1a1a1a, 0.05);
      S.rect(u, v + 4 + 11, 16, 1, shadeOf(o.shoes ?? 0x1a1a1a, 0.7), 0.04);   // sole
    }
  }
  if (o.shade ?? fine) S.shadeLimbs(undefined, 1, 0.86);
  if (o.saturate) S.saturate(o.saturate);
  o.body?.(S);
}

export const solidMat = (() => { const c = new Map(); return (hex, emissive = 0, rough = 0.7, metal = 0) => { const k = [hex, emissive, rough, metal].join(':'); if (!c.has(k)) c.set(k, new THREE.MeshStandardNodeMaterial({ color: hex, roughness: rough, metalness: metal, emissive: emissive ? hex : 0, emissiveIntensity: emissive })); return c.get(k); }; })();

const mats = new Map();
function skinMaterial(id, paint, seed) {
  if (!mats.has(id)) {
    const S = new Skin(seed, 2);
    paintPerson(S, paint);
    const m = makeCharMaterial(S.texture(), { emitStrength: 0, fill: 0.08 }); m.alphaTest = 0.5;
    mats.set(id, m);
  }
  return mats.get(id);
}

// ---------------------------------------------------------------- voxel parts
// Boxes { at, size, col, rot? } (skin pixels, rot an Euler about the box's
// centre) baked into one vertex-coloured geometry: top faces lighter, bottoms
// darker, sides shaded gently top to bottom, as on the hero outfits.
const FACES = [
  [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], 0.9],
  [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], 0.9],
  [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], 1.1],
  [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], 0.62],
  [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], 1],
  [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], 0.84],
];
const _m = new THREE.Matrix4(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Color();
function boxGeometry(list, unit) {
  const P = [], N = [], C = [];
  for (const b of list) {
    const [x, y, z] = b.at, [w, h, d] = b.size;
    const c = b.col instanceof THREE.Color ? b.col : _c.set(b.col);
    const rot = b.rot ? _m.makeRotationFromEuler(_e.set(...b.rot)) : null;
    for (const [n, vs, sh] of FACES) {
      _n.set(...n); if (rot) _n.transformDirection(rot);
      for (const q of [0, 1, 2, 0, 2, 3]) {
        const v = vs[q];
        _v.set((v[0] - 0.5) * w, (v[1] - 0.5) * h, (v[2] - 0.5) * d); if (rot) _v.applyMatrix4(rot);
        P.push((x + _v.x) * unit, (y + _v.y) * unit, (z + _v.z) * unit); N.push(_n.x, _n.y, _n.z);
        const g = sh * (n[1] === 0 ? 0.94 + v[1] * 0.1 : 1);
        C.push(c.r * g, c.g * g, c.b * g);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
function mergeGeometries(geos) {
  geos = geos.filter((g) => g && g.attributes.position.count);
  if (!geos.length) return null;
  if (geos.length === 1) return geos[0];
  const out = new THREE.BufferGeometry();
  for (const a of ['position', 'normal', 'color']) {
    const arr = new Float32Array(geos.reduce((s, g) => s + g.attributes[a].array.length, 0));
    let o = 0; for (const g of geos) { arr.set(g.attributes[a].array, o); o += g.attributes[a].array.length; }
    out.setAttribute(a, new THREE.BufferAttribute(arr, 3));
  }
  return out;
}
const B = (at, size, col, rot) => ({ at, size, col, rot });
const mirrorX = (list) => list.flatMap((b) => [b, { ...b, at: [-b.at[0], b.at[1], b.at[2]], rot: b.rot ? [b.rot[0], -b.rot[1], -b.rot[2]] : undefined }]);
// Rotate a list of boxes about the origin (for props held at an angle).
function turn(list, rot) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot));
  return list.map((b) => { const p = new THREE.Vector3(...b.at).applyMatrix4(m); return { ...b, at: [p.x, p.y, p.z], rot }; });
}
const band = (y, h, c, w = 4.6) => B([0, y, 0], [w, h, w], c);

// Shoes on a leg (the leg runs from y 0 at the hip to y -12). kind: 'loafer'
// (dress shoe; toe: a two-tone toe cap), 'heel' (heeled ankle boot), 'sandal',
// 'granny' (strapped low shoe); 'hitop' and 'boot' come from herovox.
function shoes(kind, { upper, sole = 0x1a1410, toe = null, strap = null, lace }) {
  if (kind === 'hitop' || kind === 'boot') return footwear(kind, { upper, sole, lace });
  const L = [];
  if (kind === 'heel') {
    L.push(B([0, -11.6, 1.4], [4.7, 0.8, 3.6], sole), B([0, -11.2, -1.4], [2.8, 1.6, 1.8], sole));
    L.push(B([0, -9.9, 0.5], [4.7, 2.6, 5], upper), B([0, -7.6, 0], [4.6, 2, 4.6], upper), B([0, -6.6, 0], [4.7, 0.4, 4.7], shadeOf(upper, 0.7)));
    L.push(B([2.4, -8.7, -0.8], [0.2, 3.4, 0.4], 0xb8b8c0), B([2.5, -7.2, -0.8], [0.3, 0.6, 0.6], 0xd8d8e0));
    L.push(B([0, -10.6, 2.9], [4.4, 1.2, 0.6], shadeOf(upper, 1.5)));
    return L;
  }
  if (kind === 'sandal') {
    L.push(B([0, -11.6, 0.6], [4.9, 0.9, 6], sole), B([0, -11.05, 0.6], [4.95, 0.25, 6.05], shadeOf(sole, 1.35)));
    L.push(B([0, -10.5, 1.9], [4.75, 0.7, 1], upper), B([0, -10.5, -0.2], [4.75, 0.7, 1], upper), B([0, -10.2, -2.3], [4.75, 1.1, 0.4], upper));
    L.push(B([2.4, -10.5, 0.8], [0.3, 0.5, 0.5], 0xc9963a), B([-2.4, -10.5, 0.8], [0.3, 0.5, 0.5], 0xc9963a));
    return L;
  }
  // loafer / granny shoe
  L.push(B([0, -11.6, 0.6], [4.8, 0.8, 5.8], sole), B([0, -11.4, -1.6], [4.6, 1, 1.4], sole));
  L.push(B([0, -10.4, 0.4], [4.6, 1.8, 5.2], upper));
  L.push(B([0, -10.7, 2.6], [4.5, 1.2, 1.2], toe ?? shadeOf(upper, 1.25)));
  if (kind === 'granny') L.push(B([0, -9.7, 0.8], [4.75, 0.5, 1], strap ?? shadeOf(upper, 0.6)), B([2.45, -9.7, 0.8], [0.3, 0.6, 0.6], 0xd8b040));
  else L.push(B([0, -9.6, 1.6], [3, 0.4, 1.4], strap ?? shadeOf(upper, 0.7)), B([0, -9.5, 2.0], [1.6, 0.3, 0.4], 0xc9963a));
  return L;
}

// ---------------------------------------------------------------- voxel hair
// Grid-voxel hair after herovox.heroHair, with shapes for grown-ups: a tight
// cap of hair (shell), a lumpy ellipsoid (c, r, bump), curls pushed out
// (tuft, spike), a fringe line (fringe, jag), the lowest row at the sides and
// back (side, back), a cut under a hat (top), a parting (part: column), extra
// blobs (buns, quiffs: [{ c, r }]) and three tones [shade, base, light].
const h3 = (x, y, z, s) => { let n = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const sm = (t) => t * t * (3 - 2 * t);
function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
  const l = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz, s);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf), l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}
const inHead = (i, j, k) => i >= -4 && i < 4 && j >= 0 && j < 8 && k >= -4 && k < 4;
function hairCells(h, seed) {
  const r = mulberry32(seed);
  const tones = h.tones.map((c) => new THREE.Color(c));
  const [cx, cy, cz] = h.c, [rx, ry, rz] = h.r;
  const fringe = new Map(); for (let i = -6; i < 6; i++) fringe.set(i, h.fringe + Math.floor(r() * ((h.jag ?? 1) + 1)));
  const blocked = (i, j, k) => {
    const x = i + 0.5, y = j + 0.5, z = k + 0.5;
    if (inHead(i, j, k)) return true;
    if (h.top != null && y > h.top + (z < -2 ? 0.6 : 0)) return true;
    if (Math.abs(x) < 4 && z > 3.6 && y < fringe.get(i)) return true;
    if (y < (z < -1.5 ? h.back : h.side)) return true;
    if (Math.abs(x) < 4.2 && z > 0 && y < 1.5) return true;
    return false;
  };
  const shell = h.shell ?? 1.2;
  const inside = (i, j, k) => {
    const x = i + 0.5, y = j + 0.5, z = k + 0.5;
    const n = noise3(x * 0.42, y * 0.42, z * 0.42, seed) - 0.5;
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 < 1 + h.bump * n * 2) return true;
    for (const b of h.blobs ?? []) if (((x - b.c[0]) / b.r[0]) ** 2 + ((y - b.c[1]) / b.r[1]) ** 2 + ((z - b.c[2]) / b.r[2]) ** 2 < 1 + (b.bump ?? 0.3) * n * 2) return 'blob';
    return Math.hypot(Math.max(0, Math.abs(x) - 4), Math.max(0, y - 8), Math.max(0, Math.abs(z) - 4)) < shell + n * (h.shellBump ?? 1.4);
  };
  const tone = (x, y, z) => {
    const n = noise3(x * 0.55 + 31, y * 0.55, z * 0.55, seed + 7);
    const c = (n < 0.36 ? tones[0] : n < 0.72 ? tones[1] : tones[2]).clone();
    if (y > 8.5) c.lerp(tones[2], 0.2);
    return c.multiplyScalar(0.9 + r() * 0.2);
  };
  const cells = new Map();
  for (let i = -11; i < 11; i++) for (let j = -4; j < 16; j++) for (let k = -11; k < 11; k++) {
    const inn = inside(i, j, k);
    if (!inn || (inn !== 'blob' && blocked(i, j, k)) || inHead(i, j, k)) continue;
    cells.set(`${i},${j},${k}`, tone(i + 0.5, j + 0.5, k + 0.5));
  }
  const out = [];
  for (const key of cells.keys()) {
    const [i, j, k] = key.split(',').map(Number);
    const dx = i + 0.5 - cx, dy = j + 0.5 - cy, dz = k + 0.5 - cz, ax = Math.abs(dx), ay = Math.abs(dy), az = Math.abs(dz);
    const step = ax >= ay && ax >= az ? [Math.sign(dx), 0, 0] : ay >= az ? [0, Math.sign(dy), 0] : [0, 0, Math.sign(dz)];
    if (step[1] < 0) continue;
    const a = [i + step[0], j + step[1], k + step[2]];
    if (cells.has(a.join(','))) continue;
    const roll = r();
    if (roll < (h.tuft ?? 0)) out.push([a, 1, step]); else if (roll < (h.tuft ?? 0) + (h.spike ?? 0)) out.push([a, 2, step]);
  }
  for (const [a, n, s] of out) for (let m = 0; m < n; m++) { const p = [a[0] + s[0] * m, a[1] + s[1] * m, a[2] + s[2] * m]; if (blocked(...p)) break; cells.set(p.join(','), tone(p[0] + 0.5, p[1] + 0.5, p[2] + 0.5)); }
  if (h.part != null) {
    // a parting: the top cube of each column along it, dark
    for (let k = -3; k < 6; k++) { let top = null; for (let j = 15; j >= 0; j--) if (cells.has(`${h.part},${j},${k}`)) { top = j; break; } if (top != null) cells.set(`${h.part},${top},${k}`, tones[0].clone().multiplyScalar(0.7)); }
  }
  return cells;
}
// A beard of voxels round the jaw and under the chin (head pixels), leaving
// the mouth (head row y 1..2) clear, with a moustache over it.
function beardCells(tones, seed, { full = true } = {}) {
  const r = mulberry32(seed), T = tones.map((c) => new THREE.Color(c)), cells = new Map();
  const put = (i, j, k) => { if (!inHead(i, j, k)) cells.set(`${i},${j},${k}`, T[Math.floor(r() * 3)].clone().multiplyScalar(0.9 + r() * 0.2)); };
  for (let i = -4; i < 4; i++) {
    put(i, 0, 4); if (i < -2 || i > 1) put(i, 1, 4);
    if (i >= -2 && i <= 1) put(i, 2, 4);               // moustache
    if (full) { for (let k = 1; k < 5; k++) put(i, -1, k); if (i > -4 && i < 3) for (let k = 2; k < 5; k++) if (r() < 0.85) put(i, -2, k); }
  }
  for (const i of [-5, 4]) for (let j = 0; j < 4; j++) for (let k = -1; k < 4; k++) if (j < 3 || k < 1) put(i, j, k);
  return cells;
}

// ---------------------------------------------------------------- the cast
const HS = 1.12; // head scale used by Rig
const GOLD = 0xe0b040, SILVER = 0xc8c8d0;

// A straw hat: a crown and a wide brim woven in two tones, a hat band and a
// frayed edge (head pixels).
function strawHat({ brim = 14, crown = 8.6, crownH = 3.2, y = 8.4, straw, band: bandC, frayed = true, seed = 3, dent = true }) {
  const r = mulberry32(seed), L = [], a = straw, b = shadeOf(straw, 0.82);
  const n = 7, s = brim / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = -brim / 2 + s * (i + 0.5), z = -brim / 2 + s * (j + 0.5);
    if (Math.abs(x) < crown / 2 - 0.5 && Math.abs(z) < crown / 2 - 0.5) continue;
    L.push(B([x, y + (Math.abs(x) > brim / 2 - s || Math.abs(z) > brim / 2 - s ? -0.15 : 0), z], [s, 0.9, s], (i + j) % 2 ? a : b));
  }
  for (let t = 0; t < 4; t++) { const w = crown - (t === 3 ? 1.6 : 0); L.push(B([0, y + 0.9 + t * (crownH / 4), 0], [w, crownH / 4, w], t % 2 ? a : b)); }
  if (dent) L.push(B([0, y + 1 + crownH, 0], [crown - 3.4, 0.4, crown - 4.6], b));
  L.push(B([0, y + 1.1, 0], [crown + 0.25, 0.9, crown + 0.25], bandC));
  if (frayed) for (let i = 0; i < 18; i++) {
    const side = Math.floor(r() * 4), t = (r() - 0.5) * brim, e = brim / 2 + 0.3;
    const [x, z] = [[t, e], [t, -e], [e, t], [-e, t]][side];
    L.push(B([x, y - 0.2, z], side < 2 ? [0.5, 0.4, 0.8] : [0.8, 0.4, 0.5], b));
  }
  return L;
}

export const MORTALS = {
  teacher: {
    name: txt('mortals.teacher.name'), blurb: txt('mortals.teacher.blurb'),
    paint: { skin: 0xe4c0a2, hair: 0x84848e, fringe: 2, hairSide: 3, hairBack: 7, eyeRow: 3, brow: 0x46464e, eye: 0x3a5038, scowl: true, squint: true, frown: true, wrinkles: 0xc49a80, lipstick: 0x84202e, top: 0x6a1226, knit: true, jacket: 0x1a181e, lapel: 0x2e2c36, zip: 0xa8a8b4, pants: 0x1c1a20, skirt: 0x1c1a20, skirtLen: 8, tights: 0x2a1e24, shoes: 0x0e0e10, saturate: 1.15 },
    hair: { c: [0, 7.6, -0.6], r: [4.9, 3.4, 5.1], bump: 0.3, shell: 1.05, shellBump: 0.7, fringe: 6.6, jag: 0, side: 4.4, back: 2.4, tuft: 0.07, part: -1, blobs: [{ c: [0, 9.8, -4.4], r: [3.1, 2.9, 2.7], bump: 0.35 }], tones: [0x5e5e66, 0x8e8e98, 0xbcbcc6] },
    parts() {
      const J = 0x1a181e, JL = 0x34323c;
      return {
        // a yellow pencil stuck through the bun
        head: [B([0.6, 10.6, -5], [0.6, 0.6, 7.4], 0xe8b020, [0.25, 0.9, 0]), B([3.3, 10.4, -2.9], [0.6, 0.6, 0.9], 0xe89aa0, [0.25, 0.9, 0])],
        torso: [
          B([0, 12, -1.5], [9, 1.5, 1.6], JL),
          ...mirrorX([B([-2.8, 10.2, 2.5], [1.9, 3.8, 0.5], JL, [0, 0, -0.3]), B([-3.3, 3.4, 2.45], [2.2, 0.5, 0.4], 0x2a2830), B([-3.1, 8.8, 2.75], [0.45, 0.45, 0.3], SILVER), B([-2.4, 7.1, 2.75], [0.45, 0.45, 0.3], SILVER)]),
          B([-2.1, 4.6, 2.55], [0.5, 1, 0.3], SILVER),
          B([1.4, 8.6, 2.2], [1.2, 1.2, 0.4], 0xd8d8e0), B([1.4, 8.6, 2.42], [0.6, 0.6, 0.3], 0x9a1a2e),   // a brooch
        ],
        hips: [B([0, 0.2, 0], [9, 1, 4.9], 0x0e0e10), B([0, 0.2, 2.5], [1.6, 0.8, 0.3], SILVER), B([0, -3.4, 0], [8.8, 7, 4.8], 0x1e1c22), B([0, -6.9, 0], [9, 0.6, 5], 0x141216), B([1.6, -5.6, 2.42], [0.4, 2.4, 0.2], 0x0e0e10)],
        armR: [band(-7.6, 1, 0x101014, 4.8), B([0, -9.2, 2.6], [0.5, 0.5, 4], 0xc81e1e, [0.4, 0, 0]), B([0, -8.4, 4.4], [0.6, 0.6, 0.8], 0x1a1a1a, [0.4, 0, 0])],
        armL: [band(-7.6, 1, 0x101014, 4.8), B([0, -10.8, 2.8], [4, 4.8, 1.2], 0x7a1420), B([0, -10.8, 2.3], [3.6, 4.4, 0.4], 0xf0ece0), B([0, -10.8, 3.45], [1.8, 1, 0.1], 0xe0c080)],
        legR: shoes('heel', { upper: 0x141216, sole: 0x0a0a0a }), legL: shoes('heel', { upper: 0x141216, sole: 0x0a0a0a }),
      };
    },
  },
  student: {
    name: txt('mortals.student.name'), blurb: txt('mortals.student.blurb'),
    scale: 1.14, kid: true,   // (Percy's classmates: the heroes are drawn at 1.18; at 0.92 they stood a head under him on the museum steps)
    paint: { skin: 0xeebc96, hair: 0x5a3418, fringe: 3, hairSide: 3, hairBack: 6, eyeRow: 3, eye: 0x3a7a2a, brow: 0x4a2a14, smile: true, blush: 0xe89480, top: 0x203470, knit: true, vneck: 0xf2eee4, tie: 0xb0202a, pocket: 0xd0a040, straps: 0x6a1414, pants: 0x34507e, shoes: 0xc8282e, saturate: 1.2 },
    hair: { c: [0, 7.3, -0.5], r: [6, 5.2, 6.2], bump: 0.34, shell: 1.4, fringe: 6.2, jag: 1.2, side: 3, back: 0.8, tuft: 0.16, spike: 0.04, tones: [0x3a200e, 0x5e3618, 0x86542a] },
    parts() {
      const red = 0xc8322a, dk = 0x8a1e1a, strap = 0x5a1212;
      return {
        torso: [
          B([0, 6, -3.8], [7.2, 8.4, 3.2], red), B([0, 10.4, -3.7], [6.4, 0.8, 2.8], shadeOf(red, 1.1)), B([0, 4.4, -5.75], [5.2, 3.6, 0.9], dk),
          B([0, 6.4, -5.5], [5.6, 0.3, 0.3], 0xb0b0b8), B([2.2, 5.9, -5.6], [0.4, 0.8, 0.3], 0xd0d0d8), B([0, 11.2, -3.7], [2.4, 0.6, 0.7], strap), B([-2.3, 3.3, -6.3], [0.9, 1.1, 0.4], 0xf2c230),
          ...mirrorX([B([-2.4, 7.4, 2.4], [1.3, 8.8, 0.4], strap), B([-2.4, 12.2, 0], [1.3, 0.5, 4.8], strap), B([-2.4, 4.6, 2.65], [1.4, 0.6, 0.3], 0xb0b0b8), B([-1.1, 11.7, 2.4], [1.6, 0.8, 0.4], 0xf2eee4, [0, 0, -0.45])]),
        ],
        legR: [...shoes('hitop', { upper: 0xc02828, sole: 0xf4f0e8, lace: 0xf4f0e8 }), band(-7.2, 1.3, 0x4a6a9a, 4.6)],
        legL: [...shoes('hitop', { upper: 0xc02828, sole: 0xf4f0e8, lace: 0xf4f0e8 }), band(-7.2, 1.3, 0x4a6a9a, 4.6)],
        armL: [band(-6.6, 1, 0x1a1a1e, 4.5), B([2.35, -6.6, 0], [0.3, 0.8, 0.8], 0x40a8e0)],
      };
    },
  },
  guard: {
    name: txt('mortals.guard.name'), blurb: txt('mortals.guard.blurb'),
    skullHeight: true,   // (measured to the skull, under a cap or hat or cropped hair: ADULT_SCALE_HAT)
    paint: { skin: 0xc89a78, hair: 0x2a2018, fringe: 1, hairSide: 2, eye: 0x2a1a0a, brow: 0x2a2018, top: 0xd8dce8, jacket: 0x1e2a4a, lapel: 0x16203a, pants: 0x1a2238, shoes: 0x0e0e0e },
    build(rig) {
      const navy = solidMat(0x1a2440);
      prop(rig, rig.head, 9.2, 2.4, 9.2, navy, 0, 9.0 * HS, 0);
      prop(rig, rig.head, 8, 0.6, 3, solidMat(0x0e0e10), 0, 8.0 * HS, 4.6 * HS);
      prop(rig, rig.head, 2, 1.4, 0.4, solidMat(0xd8b040, 0.4), 0, 9.2 * HS, 4.7 * HS);
      prop(rig, rig.torso, 1.6, 1.8, 0.6, solidMat(0xd8b040, 0.4), -2, 9, 2.2);   // badge
      prop(rig, rig.torso, 1.4, 3, 1.2, solidMat(0x1a1a1e), 2.4, 8, 2.4);          // radio
    },
  },
  tourist: {
    name: txt('mortals.tourist.name'), blurb: txt('mortals.tourist.blurb'),
    skullHeight: true,   // (measured to the skull, under a cap or hat or cropped hair: ADULT_SCALE_HAT)
    paint: { skin: 0xf2b490, hair: 0xd8a448, fringe: 1, hairSide: 3, hairBack: 5, eyeRow: 3, eye: 0x2a6ab0, brow: 0xb08030, browUp: true, grin: true, nose: 0xfaf6f0, blush: 0xf08068, top: 0xe85a14, floral: [0xfff4c8, 0xffc020, 0x1e8a50], shortSleeve: true, vneck: 0xf2b490, pants: 0xb89c64, shorts: true, socks: 0xf6f6f2, sockLen: 3, shoes: 0xf6f6f2, saturate: 1.2 },
    hair: { c: [0, 6.6, -0.6], r: [5, 4, 5.2], bump: 0.2, shell: 1.2, fringe: 6.6, jag: 1, side: 3, back: 1.6, top: 8.3, tuft: 0.1, tones: [0xa87420, 0xd8a448, 0xf4cc70] },
    parts() {
      const blk = 0x1a1a1e;
      return {
        hat: [...strawHat({ brim: 14.4, crown: 8.8, straw: 0xe8cc84, band: 0x0f7f83, seed: 5 }), B([3.2, 9.8, 4.55], [1.6, 1.4, 0.4], 0xf060a0), B([3.2, 9.8, 4.75], [0.6, 0.6, 0.2], 0xffe040)],
        torso: [
          ...mirrorX([B([-2.1, 9.6, 2.45], [0.5, 5.2, 0.4], blk, [0, 0, -0.5])]),
          B([0, 6.6, 3.0], [4.2, 2.8, 1.6], blk), B([0.5, 6.5, 4.1], [2, 2, 1.1], 0x3a3a42), B([0.5, 6.5, 4.7], [1.3, 1.3, 0.2], 0x4a82c8), B([-1.3, 7.7, 3.85], [1, 0.5, 0.3], 0xe8e8e8), B([1.5, 8.1, 3], [0.6, 0.4, 0.6], 0xc82020),
          B([0, 10.5, 2.5], [3.4, 0.8, 0.3], 0x141414), B([0, 10.5, 2.65], [0.5, 0.4, 0.2], 0xc9963a),
        ],
        hips: [B([0, 0.4, 0], [8.7, 0.7, 4.7], 0x146462), B([0.6, 0.1, 2.7], [5, 2.2, 1.4], 0x1a9a96), B([0.6, 0.7, 3.42], [4.2, 0.3, 0.2], 0xd8d8d8), B([2.7, 0.7, 3.5], [0.4, 0.6, 0.2], 0xd8d8d8)],
        legR: [...shoes('sandal', { upper: 0x7a4422, sole: 0x5a3018 }), band(-4.7, 1, 0x9a8250, 4.7), B([-2.4, -2.4, 0], [0.4, 2.2, 2.4], 0xa48a58)],
        legL: [...shoes('sandal', { upper: 0x7a4422, sole: 0x5a3018 }), band(-4.7, 1, 0x9a8250, 4.7), B([2.4, -2.4, 0], [0.4, 2.2, 2.4], 0xa48a58)],
        // a folded map in the left hand
        armL: [B([0, -11, 2.4], [4, 3.4, 0.4], 0xf0e6c0, [0.2, 0, 0]), B([0.6, -11, 2.65], [1.2, 2.8, 0.1], 0x4aa0d8, [0.2, 0, 0]), B([-1.2, -10.6, 2.65], [1, 1, 0.1], 0x6ab85a, [0.2, 0, 0])],
        armR: [band(-6.4, 0.9, 0x2a2a30, 4.5), B([0, -6.4, 2.35], [1.4, 1.2, 0.3], 0xd8d8e0)],
      };
    },
  },
  farmer: {
    name: txt('mortals.farmer.name'), blurb: txt('mortals.farmer.blurb'),
    skullHeight: true,   // (measured to the skull, under a cap or hat or cropped hair: ADULT_SCALE_HAT)
    paint: { skin: 0xd8946a, hair: 0x6e5e4c, fringe: 1, hairSide: 3, hairBack: 5, eyeRow: 3, eye: 0x3a5a7a, brow: 0x5a4a3a, smile: true, nose: 0xd27a5c, beard: 0x7e6e5a, wrinkles: 0xb47c5a, top: 0xb4281e, plaid: 0x4a100a, overalls: 0x2c5694, pants: 0x2c5694, shoes: 0x5a3820, saturate: 1.15 },
    hair: { c: [0, 6.4, -0.6], r: [4.8, 3.6, 5], bump: 0.2, shell: 1.2, fringe: 6.6, jag: 0, side: 2.6, back: 1.4, top: 8.3, tuft: 0.08, tones: [0x4e4234, 0x6e5e4c, 0x968672] },
    beard: [0x5e5040, 0x7e6e5a, 0xa09078],
    parts() {
      const denim = 0x2c5694, brass = 0xd8a840, wood = 0x8a643a, steel = 0x9aa0a8;
      const fork = turn([B([0, 4, 0], [1, 26, 1], wood), B([0, 16.6, 0], [4.6, 0.9, 0.9], steel), ...[-1.8, -0.6, 0.6, 1.8].map((x) => B([x, 19.4, 0], [0.5, 5, 0.5], steel)), B([0, 17.6, 0], [1.2, 1.4, 1.2], steel)], [-0.25, 0, 0]);
      return {
        hat: strawHat({ brim: 13, crown: 8.4, straw: 0xd4b468, band: 0x5a3018, seed: 9 }),
        head: [B([2.2, 1.6, 5.4], [0.35, 0.35, 3.4], 0xe8d070, [0, 0.7, 0.15])],
        torso: [
          B([0, 11.8, 0], [8.8, 1, 4.8], 0xc81e1e), B([1.6, 11.2, 2.5], [1.2, 1.2, 0.6], 0xa81818),
          ...mirrorX([B([-2.3, 10.4, 2.4], [1.1, 3.4, 0.4], denim), B([-2.3, 9, 2.68], [0.9, 0.9, 0.3], brass), B([-2.3, 11.6, 0], [1.1, 0.4, 4.6], denim)]),
          B([0, 6.8, 2.4], [3, 2.2, 0.3], 0x24467c), B([0.7, 7.6, 2.6], [0.4, 1.6, 0.3], 0xe0b010),
        ],
        armR: [band(-5.2, 1.2, 0x8a1810, 4.7), ...fork.map((b) => ({ ...b, at: [b.at[0], b.at[1] - 10, b.at[2] + 1.6] }))],
        armL: [band(-5.2, 1.2, 0x8a1810, 4.7)],
        legR: [...shoes('boot', { upper: 0x5a3820, sole: 0x2e1e12, lace: 0xc8a060 }), band(-6.2, 1.1, shadeOf(denim, 1.15), 4.8)],
        legL: [...shoes('boot', { upper: 0x5a3820, sole: 0x2e1e12, lace: 0xc8a060 }), band(-6.2, 1.1, shadeOf(denim, 1.15), 4.8)],
      };
    },
  },
  old_lady: {
    name: txt('mortals.old_lady.name'), blurb: txt('mortals.old_lady.blurb'),
    paint: { skin: 0xeac6ae, hair: 0xd4d0dc, fringe: 2, hairSide: 3, hairBack: 7, eyeRow: 3, eye: 0x5a4a8a, brow: 0xa8a4b0, wrinkles: 0xc49886, lipstick: 0xc04a78, blush: 0xf09aa4, smile: true, top: 0x5c2478, knit: true, collar: 0xf6eedc, buttons: 0xe0b040, pants: 0x46205a, skirt: 0x46205a, skirtLen: 10, tights: 0xd8b4a2, shoes: 0x3a1a26, saturate: 1.15 },
    hair: { c: [0, 7.4, -0.5], r: [5.8, 4.6, 5.9], bump: 0.42, shell: 1.4, fringe: 6.4, jag: 0.6, side: 3.4, back: 2, tuft: 0.3, tones: [0xa8a2b6, 0xd4d0de, 0xf4f2f8] },
    parts() {
      const g = 0xd0a038, plum = 0x6a1e44, purple = 0x5c2478;
      return {
        head: [
          ...mirrorX([B([-2, 5.55, 4.2], [2.8, 0.35, 0.3], g), B([-2, 3.35, 4.2], [2.8, 0.35, 0.3], g), B([-3.25, 4.45, 4.2], [0.35, 2.4, 0.3], g), B([-0.75, 4.45, 4.2], [0.35, 2.4, 0.3], g), B([-4.15, 5.2, 2.2], [0.3, 0.35, 4], g)]),
          B([0, 4.9, 4.2], [1.2, 0.35, 0.3], g),
          B([4.6, 8.6, 2.2], [1.6, 1.6, 1.6], 0xf06aa0), B([4.9, 8.6, 2.2], [0.9, 0.9, 1.9], 0xffe060), B([4.3, 7.7, 1], [1, 0.6, 1.2], 0x3a8a4a),
        ],
        torso: [
          ...beads([0xf8f4ec, 0xe8e0d8], { y: 11, z: 2.4, n: 9 }).map((b) => ({ ...b, size: [0.85, 0.85, 0.7] })),
          ...mirrorX([B([-1.6, 11.6, 2.35], [2.6, 1, 0.4], 0xf6eedc, [0, 0, -0.35]), B([-2.4, 2.8, 2.35], [2.4, 2.2, 0.4], shadeOf(purple, 0.8))]),
        ],
        hips: [B([0, -4.4, 0], [8.8, 9.6, 4.8], 0x46205a), B([0, -8.8, 0], [9.4, 1.6, 5.4], 0x46205a), B([0, -9.7, 0], [9.5, 0.4, 5.5], 0xf6eedc), B([0, 0.4, 0], [8.9, 0.8, 4.9], 0x2e1238)],
        armL: [
          B([2.6, -9.6, 0.6], [2, 4.4, 4.8], plum), B([2.6, -7.3, 0.6], [2.1, 0.5, 4.9], shadeOf(plum, 0.7)), B([3.7, -7.8, 0.6], [0.3, 0.8, 1.4], g),
          B([2.4, -6.4, -1.0], [0.5, 2.2, 0.5], shadeOf(plum, 0.7)), B([2.4, -6.4, 2.2], [0.5, 2.2, 0.5], shadeOf(plum, 0.7)), B([2.4, -5.4, 0.6], [0.5, 0.5, 3.6], shadeOf(plum, 0.7)),
          B([2.4, -7, 1.6], [1.8, 1.8, 1.8], 0xc82a3a), B([2.4, -7, 1.6], [1.9, 0.4, 1.9], 0xe85060),
        ],
        // knitting: crossed needles and a long striped sock
        armR: [
          B([0, -10.6, 2.6], [0.35, 0.35, 7], 0xd8d8e0, [0.5, 0.35, 0]), B([0, -10.6, 2.6], [0.35, 0.35, 7], 0xd8d8e0, [0.5, -0.35, 0]),
          B([0, -12.8, 3.6], [2.8, 3.6, 0.7], 0xc82a3a), B([0, -13.4, 3.6], [2.9, 0.8, 0.8], 0xf6eedc), B([0, -15.4, 4.2], [2.8, 1.6, 1.8], 0xc82a3a),
        ],
        legR: shoes('granny', { upper: 0x3a1a26, sole: 0x1a0c10 }), legL: shoes('granny', { upper: 0x3a1a26, sole: 0x1a0c10 }),
      };
    },
  },
  bellhop: {
    name: txt('mortals.bellhop.name'), blurb: txt('mortals.bellhop.blurb'),
    paint: { skin: 0xe0b08a, hair: 0x22140e, fringe: 1, hairSide: 2, hairBack: 5, eyeRow: 3, eye: 0x2a5a2a, brow: 0x22140e, grin: true, browUp: true, top: 0xb01a28, trim: 0x84101c, buttons: 0xf0c850, collar: 0xf0c850, sleeve: 0xb01a28, hand: 0xf6f6f2, pants: 0x18161e, legStripe: 0xb01a28, shoes: 0x0e0e10, saturate: 1.15,
      body: (s) => { s.rect(16, 30, 24, 1, 0xe8c060, 0); s.rect(40, 26, 16, 1, 0xe8c060, 0); s.rect(32, 58, 16, 1, 0xe8c060, 0); } },
    parts() {
      const red = 0xb01a28, gold = 0xf0c850, pink = 0xf4a0c8;
      return {
        head: [B([0.5, 9.9, 0.8], [6.4, 3, 6.4], red, [0, 0, 0.1]), B([0.4, 8.7, 0.8], [6.6, 0.8, 6.6], gold, [0, 0, 0.1]), B([0.75, 11.6, 0.8], [1, 0.6, 1], gold), B([0.5, 10, 4.05], [1.4, 1.4, 0.3], pink),
          ...mirrorX([B([-4.15, 5.2, 1.2], [0.3, 5, 0.5], 0x141414)])],
        torso: [
          B([0, 12, 0], [5.4, 1.2, 4.4], red), B([0, 12.65, 0], [5.5, 0.3, 4.5], gold),
          ...mirrorX([B([-3.4, 12.1, 0], [2.4, 0.7, 3.8], gold), ...[-1.3, 0, 1.3].map((z) => B([-4.55, 11.2, z], [0.4, 1.3, 0.4], gold)), ...[3.2, 5.6, 8].map((y) => B([-1.7, y, 2.42], [0.7, 0.7, 0.3], gold))]),
          B([2.6, 9.6, 2.5], [1.4, 1.4, 0.4], pink), B([2.6, 9.6, 2.7], [0.6, 0.6, 0.2], 0xfff0a0),
        ],
        armR: [band(-7.2, 0.9, 0xf6f6f2, 4.7)],
        armL: [band(-7.2, 0.9, 0xf6f6f2, 4.7), B([0, -11.4, 2.5], [9, 0.6, 7], 0xc8c8d4), B([0, -11.1, 2.5], [9.2, 0.3, 7.2], 0xe4e4ec),
          B([1.5, -9.9, 2.5], [1.6, 2.4, 1.6], pink), B([1.5, -8.6, 2.5], [2.4, 0.6, 2.4], 0xf6c0dc), B([-2, -10.4, 3.5], [1.6, 1.4, 1.6], 0xf4d0e0), B([-2, -10.6, 1], [1.2, 1.8, 1.2], 0xe8e4f0)],
        legR: shoes('loafer', { upper: 0x101012, sole: 0x060606 }), legL: shoes('loafer', { upper: 0x101012, sole: 0x060606 }),
      };
    },
    pose(rig) { rig.armL.rotation.x = -0.9; },
  },
  salesman: {
    name: txt('mortals.salesman.name'), blurb: txt('mortals.salesman.blurb'),
    paint: { skin: 0xdaa078, hair: 0x18100e, fringe: 1, hairSide: 2, hairBack: 5, eyeRow: 3, eye: 0x3a2410, brow: 0x18100e, grin: true, goldTooth: 0xf0c030, browUp: true, moustache: 0x24160e, top: 0xf4f0e4, jacket: 0xc8962e, lapel: 0x946a1a, check: 0xb4802a, collar: 0xffffff, trim: 0xb8202c, sleeve: 0xc8962e, pants: 0xb88a2a, shoes: 0x5a2e14, saturate: 1.15 },
    hair: { c: [0, 7.2, 0], r: [4.8, 3.6, 5], bump: 0.1, shell: 1.1, shellBump: 0.9, fringe: 7, jag: 0, side: 4.2, back: 2.4, tuft: 0.06, part: 2, blobs: [{ c: [-0.6, 9.4, 2.6], r: [3.8, 1.8, 2.6], bump: 0.2 }], tones: [0x0c0808, 0x1e1412, 0x4a3a36] },
    parts() {
      const red = 0xb8202c, lap = 0xa4741e, brown = 0x5a2e14, gold = 0xe8b830;
      return {
        torso: [
          B([0, 11.1, 2.45], [1.5, 1.1, 0.5], red), B([0, 8, 2.4], [1.5, 5.4, 0.4], red), B([0, 5.1, 2.4], [1.1, 1.1, 0.4], red, [0, 0, 0.785]),
          B([0, 9.4, 2.62], [1.5, 0.4, 0.2], 0x8a1018, [0, 0, 0.5]), B([0, 7.4, 2.62], [1.5, 0.4, 0.2], 0x8a1018, [0, 0, 0.5]), B([0, 8.6, 2.65], [2.2, 0.3, 0.2], gold),
          ...mirrorX([B([-2.8, 10, 2.5], [1.9, 4, 0.5], lap, [0, 0, -0.32]), B([-3.2, 3.6, 2.45], [2.2, 0.5, 0.4], 0xa47020), B([-1.1, 11.8, 2.3], [1.6, 0.8, 0.4], 0xffffff, [0, 0, -0.45])]),
          B([2.9, 9.2, 2.55], [1.4, 0.9, 0.4], 0xf4f0e4), B([2.6, 9.7, 2.6], [0.6, 0.6, 0.4], red, [0, 0, 0.785]), B([3.2, 9.8, 2.6], [0.6, 0.6, 0.4], 0xffffff, [0, 0, 0.785]),
          B([-2.9, 8.6, 2.55], [2.2, 1.3, 0.3], 0xf8f8f4), B([-2.9, 9.1, 2.72], [2.2, 0.35, 0.1], 0x2a4ab0),
          ...[2.6, 1.4].map((y) => B([0, y, 2.55], [0.6, 0.6, 0.3], 0x3a2410)),
        ],
        armR: [band(-7.2, 0.9, 0xf4f0e4, 4.7), band(-8.2, 0.9, gold, 4.65), B([0, -8.2, 2.4], [1.4, 1.2, 0.3], 0xf8f4e0)],
        armL: [band(-7.2, 0.9, 0xf4f0e4, 4.7),
          B([0, -15.4, 0.4], [2.4, 5.4, 7.4], brown), B([0, -15.4, 0.4], [2.5, 0.5, 7.5], shadeOf(brown, 0.7)), B([0, -12.5, 0.4], [0.7, 1, 2.8], 0x2a1608), B([0, -11.9, 0.4], [0.7, 0.4, 2.8], 0x2a1608),
          ...[-1.2, 1.2].flatMap((z) => [B([1.3, -13.6, z + 0.4], [0.2, 0.8, 0.8], gold), B([-1.3, -13.6, z + 0.4], [0.2, 0.8, 0.8], gold)])],
        legR: [...shoes('loafer', { upper: 0x5a2e14, sole: 0x2a160a, toe: 0xf0ece0 }), band(-8.8, 0.9, 0xa47a22, 4.7)],
        legL: [...shoes('loafer', { upper: 0x5a2e14, sole: 0x2a160a, toe: 0xf0ece0 }), band(-8.8, 0.9, 0xa47a22, 4.7)],
      };
    },
  },
};
export const MORTAL_IDS = Object.keys(MORTALS);
export const mortalId = (id) => (MORTALS[id] ? id : 'student');

// One vertex-colour material for every mortal's block detail, and the merged
// geometry of each mortal's parts per rig slot, built on first use.
let partM = null;
const kits = new Map();
const SLOTS = ['head', 'torso', 'hips', 'armR', 'armL', 'legR', 'legL'];
function kitFor(id, def) {
  if (kits.has(id)) return kits.get(id);
  const parts = def.parts?.() ?? {}, kit = {};
  let seed = 7; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  for (const slot of SLOTS) {
    const unit = slot === 'head' ? PX * HS : PX, geos = [];
    if (parts[slot]?.length) geos.push(boxGeometry(parts[slot], unit));
    if (slot === 'head') {
      if (def.hair) geos.push(cellMesh(hairCells(def.hair, seed), unit, null, inHead).geometry);
      if (def.beard) geos.push(cellMesh(beardCells(def.beard, seed + 1), unit, null, inHead).geometry);
    }
    kit[slot] = mergeGeometries(geos);
  }
  // (parts.hat: headwear on the head, its own mesh so perf/bodysize.cjs can leave it out; merged with the head in game)
  if (parts.hat?.length) kit.hat = boxGeometry(parts.hat, PX * HS);
  kits.set(id, kit);
  return kit;
}

// Grown-ups stand over the heroes (12-year-olds drawn at 1.18); at 1.0 every
// teacher, guard and tourist was shorter than Percy. (Round 10, the owner:
// adults are about 1.2-1.3x Percy's body, bigger but never giants. 1.4 →
// 1.62 with an adult's smaller head, ADULT_HEAD: measured to the top of the
// hair, as design/sizes.json measures bodies, an adult with a full head of
// hair stands about 1.25-1.3x. One in a hat, or with close-cropped hair, is
// measured to the skull, Percy's curls being a sixth of his height, so it
// takes ADULT_SCALE_HAT to stand 1.2x there, its skull level with the
// others' and its hat on top: about 1.3-1.35x overall.)
export const ADULT_SCALE = 1.62;
export const ADULT_SCALE_HAT = 1.72;
// A grown-up's head against its body: smaller than a twelve-year-old's
// Minecraft head (the owner's head rule, design/sizes.json "head"), so a
// grown-up reads as an adult rather than a big child. The head, its skin box,
// hair, beard and hat are reshaped together (proportions.js).
export const ADULT_HEAD = 0.88;
export function adultHead(rig, f = ADULT_HEAD) { reshape(rig, rig.head, f); applyShape(rig); return rig; }
// Build a mortal rig. Returns a Rig whose spec carries the mortal's id.
export function buildMortal(id) {
  id = mortalId(id);
  const def = MORTALS[id];
  let seed = 11; for (const ch of id) seed = (seed * 97 + ch.charCodeAt(0)) >>> 0;
  const rig = new Rig({ material: skinMaterial(id, def.paint, seed), mortal: id, scale: def.scale ?? (def.skullHeight ? ADULT_SCALE_HAT : ADULT_SCALE) });
  partM ??= new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const kit = kitFor(id, def);
  for (const slot of SLOTS) {
    if (!kit[slot]) continue;
    const m = rig.mesh(kit[slot], partM);
    rig[slot].add(m);
    rig.extras[slot === 'head' ? 'hair' : slot + 'Parts'] = m;
  }
  if (kit.hat) rig.head.add(markHeadwear(rig.mesh(kit.hat, partM)));
  if (!def.kid) adultHead(rig);
  def.pose?.(rig);
  rig.mortal = id;
  for (const b of [rig.hips, rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL]) mergeChildren(rig, b);   // (each limb's skin box and its overlay as one mesh: character.js)
  return rig;
}

// Building blocks shared with the open world's people (people.js).
export { B, mirrorX, turn, band, shoes, strawHat, hairCells, beardCells, boxGeometry, mergeGeometries, inHead, shadeOf, mixC };
