// Held weapons for every weapon item in loot.js, in the Minecraft Dungeons
// way: the weapon a hero has equipped is the weapon in their hand.
//
// Each item has a look (WEAPON_LOOKS): its family (sword, dagger, twin
// knives, spear, axe, great axe, club, hammer, mace, staff, whip, horn) and
// its own colours and features, from its name, description and rarity:
// Common items are plain bronze, wood and leather; Rare ones celestial
// bronze, a glow or a charm; Legendary ones (and the bosses' signatures)
// have models of their own (Backbiter's two-tone blade, the Horn of the
// Minotaur, the burning Sword of Ares, Procrustes's cleaver, ...).
//
// Built the way the heroes' own weapons are (models.js buildRiptide): along
// the hand's +z, grip at the origin, so at rest it points forward of the
// fist, a little above level, and every attack style cocks it forward
// (character.js "holding things"); markTip names the point for
// perf/weapons.cjs. A weapon is ONE mesh (gearmesh.js): one draw.
//
// The family also says how it is held and swung (FAMILY):
//   hands  'one' (right hand), 'two' (right hand, the left joins it:
//          Rig.twoHand), 'twin' (a blade in each hand)
//   styles the hero's combo steps re-posed for the weapon (Rig.restyle):
//          a combo keeps its damage, reach and timing, only the pose changes,
//          so a heavy axe chops where a dagger stabs.
import * as THREE from 'three/webgpu';
import { PX, markTip } from '../character.js';
import { gearMesh, gearMaterial, box, shade } from './gearmesh.js';

// ---- colours
const BRONZE = 0xc9963a, BRONZE_D = 0x8a5a1e, CELESTIAL = 0xe0b04a, GOLD = 0xe8c060, IGOLD = 0xf0c040;
const STEEL = 0xb8c0c8, SILVER = 0xd8e0e8, IRON = 0x4a4a52, STYGIAN = 0x1c1626;
const LEATHER = 0x5a3218, LEATHER_D = 0x2e1a0e, WOOD = 0x7a4a26, WOOD_D = 0x4a2c16, ASH = 0xa88050, OLIVE = 0x6a5a2a;
const BONE = 0xe8dcc0, IVORY = 0xf0e4c8, RED = 0xb8201c, PURPLE = 0x6a2a9a;

// how each family is held and how the hero's combo styles are re-posed
// (in: the kit's style; out: the pose the weapon swings with). backhand:
// the right hand swung back across the body (character.js attackPose), so a
// one-handed weapon cuts on the combo's left swing instead of the empty hand.
export const FAMILY = {
  sword: { hands: 'one', styles: { swingL: 'backhand' } },
  dagger: { hands: 'one', styles: { swingL: 'backhand', slam: 'punch' } },
  twin: { hands: 'twin', styles: {} },
  spear: { hands: 'one', styles: { swingL: 'punch', swingR: 'swingR', slam: 'punch' } },
  axe: { hands: 'one', styles: { swingL: 'backhand', punch: 'slam' } },
  greataxe: { hands: 'two', styles: { swingL: 'backhand', punch: 'slam' } },
  club: { hands: 'one', styles: { swingL: 'backhand', punch: 'slam' } },
  greatclub: { hands: 'two', styles: { swingL: 'backhand', punch: 'slam' } },
  hammer: { hands: 'two', styles: { swingL: 'backhand', punch: 'slam', swingR: 'slam' } },
  mace: { hands: 'one', styles: { swingL: 'backhand', punch: 'slam' } },
  staff: { hands: 'one', styles: { swingL: 'backhand' } },
  whip: { hands: 'one', styles: { swingL: 'backhand', punch: 'swingR' } },
  horn: { hands: 'one', styles: { swingL: 'backhand' } },
};

// ---- the builders: each returns { boxes, tip: [x, y, z] } in skin pixels
// a hilt: pommel, grip, guard (o.gw guard width, o.guard, o.grip, o.pommel colours)
function hilt(L, o, len = 3.8) {
  L.push(box(0, 0, -len / 2 - 1.4, 1.4, 1.4, 1.4, o.pommel ?? GOLD, o.pf ?? 'gold'));
  L.push(box(0, 0, -0.9, 1.1, 1.1, len, o.grip ?? LEATHER, 'leather'));
  if (o.wrap) for (let z = -2.4; z < 0.8; z += 1.2) L.push(box(0, 0, z, 1.25, 1.25, 0.4, o.wrap, 'leather'));
  L.push(box(0, 0, 1.4, o.gw ?? 5, 1.1, 1.1, o.guard ?? BRONZE, o.gf ?? 'metal'));
  if (o.gem) L.push(box(0, 0.45, 1.4, 1, 0.6, 1.3, o.gem, 'gem'));
}
const PROFILE = {
  leaf: [0.55, 0.72, 0.88, 1, 0.98, 0.85, 0.66, 0.42],
  straight: [0.92, 0.95, 0.95, 0.95, 0.95, 0.95, 0.85, 0.6],
  gladius: [0.95, 0.88, 0.85, 0.88, 0.92, 0.9, 0.7, 0.4],
  broad: [1, 1, 1, 1, 1, 1, 0.92, 0.75],
  taper: [1, 0.92, 0.84, 0.76, 0.66, 0.54, 0.4, 0.26],
};
// a blade from z0 forward: o.len, o.w (widest), o.shape, o.blade / o.bf, o.curve (sideways bend),
// o.edge / o.ef (a lit or bright edge), o.fuller, o.split (a second colour on one half)
function blade(L, o, z0 = 2) {
  const len = o.len ?? 16, W = o.w ?? 2.4, prof = PROFILE[o.shape ?? 'straight'], n = prof.length, seg = len / n, th = o.th ?? 0.45;
  const xAt = (t) => (o.curve ?? 0) * Math.sin(t * Math.PI * 0.85) * (o.curveEnd ? t * t : 1);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, w = prof[i] * W, z = z0 + seg * (i + 0.5), x = xAt(t);
    if (o.split) { L.push(box(x - w / 4, 0, z, w / 2, th, seg + 0.06, o.blade, o.bf ?? 'metal')); L.push(box(x + w / 4, 0, z, w / 2, th, seg + 0.06, o.split, o.sf ?? 'iron')); }
    else L.push(box(x, 0, z, w, th, seg + 0.06, o.blade, o.bf ?? 'metal'));
    if (o.edge) { L.push(box(x - w / 2 - 0.1, 0, z, 0.32, th * 0.8, seg + 0.06, o.edge, o.ef ?? 'glow')); L.push(box(x + w / 2 + 0.1, 0, z, 0.32, th * 0.8, seg + 0.06, o.edge, o.ef ?? 'glow')); }
    if (o.fuller && i < n - 2) L.push(box(x, 0, z, 0.32, th + 0.12, seg + 0.06, o.fuller, o.ff ?? 'gold'));
  }
  const xe = xAt(1);
  L.push(box(xe, 0, z0 + len + 0.5, Math.max(0.35, prof[n - 1] * W * 0.45), th * 0.9, 1.1, o.blade, o.bf ?? 'metal'));
  return [xe, 0, z0 + len + 1.1];
}
function sword(o) {
  const L = []; hilt(L, o, o.gripLen ?? 3.8);
  const tip = blade(L, o, 2);
  o.extra?.(L);
  return { boxes: L, tip };
}
function dagger(o) {
  const L = []; hilt(L, { gw: 3.4, ...o }, 3.2);
  const tip = blade(L, { len: 7.5, w: 1.6, shape: 'taper', ...o }, 1.9);
  o.extra?.(L);
  return { boxes: L, tip };
}
// a pole: from -back to front, thickness th, bands
function shaft(L, o, back, front, th = 0.95) {
  const n = Math.max(2, Math.round((front + back) / 8)), seg = (front + back) / n;
  for (let i = 0; i < n; i++) L.push(box(0, 0, -back + seg * (i + 0.5), th, th, seg + 0.05, i % 2 && o.shaft2 ? o.shaft2 : o.shaft ?? WOOD, o.sf ?? 'wood'));
  for (const z of o.bands ?? []) L.push(box(0, 0, z, th + 0.35, th + 0.35, 0.7, o.band ?? BRONZE, o.bandf ?? 'metal'));
}
function spear(o) {
  const L = [], front = o.front ?? 26, back = o.back ?? 11;
  shaft(L, o, back, front, o.th ?? 0.9);
  L.push(box(0, 0, -back - 0.6, 1.3, 1.3, 1.6, o.butt ?? BRONZE, 'metal'));                 // the butt spike
  L.push(box(0, 0, front + 0.6, 1.4, 1.4, 1.4, o.collar ?? BRONZE, 'metal'));
  const tip = blade(L, { len: o.headLen ?? 7, w: o.headW ?? 2.4, shape: o.head ?? 'leaf', blade: o.blade ?? BRONZE, bf: o.bf, edge: o.edge, ef: o.ef, th: 0.6 }, front + 1.2);
  o.extra?.(L, front);
  return { boxes: L, tip };
}
// an axe: a haft and a head below its end (-y: carried edge down, a chop lands edge first)
function axe(o) {
  const L = [], len = o.len ?? 14, back = o.back ?? 3;
  shaft(L, o, back, len, o.th ?? 1);
  L.push(box(0, 0, -back - 0.5, 1.4, 1.4, 1.2, o.knob ?? LEATHER_D, 'leather'));
  const hz = len - 2.2, H = o.head ?? 5, B = o.bit ?? 5, c = o.blade ?? BRONZE, f = o.bf ?? 'metal';
  L.push(box(0, 0, hz, 1.6, 2.2, 3, o.socket ?? shade(c, 0.7), f));                       // the socket round the haft
  for (const s of o.double ? [-1, 1] : [-1]) {
    // the cheek widening into a curved bit
    for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4, h = H * 0.25, w = 2.6 + (B - 2.6) * t * t; L.push(box(0, s * (1.1 + h * (i + 0.5)), hz, 0.7, h + 0.05, w, c, f)); }
    L.push(box(0, s * (1.1 + H + 0.25), hz, 0.6, 0.6, B + 0.6, o.edge ?? shade(c, 1.25), o.edge ? o.ef ?? 'glow' : f));   // the edge
  }
  if (o.spike) L.push(box(0, 1.6, hz, 0.8, 2.4, 1.2, c, f));
  L.push(box(0, 0, len + 0.6, 1.2, 1.2, 1.2, o.cap ?? shade(c, 0.8), f));
  o.extra?.(L, len, hz);
  return { boxes: L, tip: [0, 0, len + 1.2] };
}
// a club, mace or hammer: a grip and a heavy head at the end
function club(o) {
  const L = [], len = o.len ?? 16;
  L.push(box(0, 0, -1.6, 1.4, 1.4, 1.6, o.knob ?? LEATHER_D, 'leather'));
  L.push(box(0, 0, 0.4, 1.2, 1.2, 4, o.grip ?? LEATHER, 'leather'));
  const n = 5;
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, w = (o.w0 ?? 1.4) + ((o.w1 ?? 3.2) - (o.w0 ?? 1.4)) * t, z = 2.4 + (len - 2.4) * t; L.push(box(0, 0, z, w, w, (len - 2.4) / n + 0.05, i % 2 ? o.wood2 ?? o.wood ?? WOOD : o.wood ?? WOOD, o.wf ?? 'wood')); }
  o.extra?.(L, len);
  return { boxes: L, tip: [0, 0, len + 0.5] };
}
function hammer(o) {
  const L = [], len = o.len ?? 15;
  shaft(L, { shaft: o.shaft ?? WOOD_D, bands: [0.5, len - 4.2], band: o.band ?? IRON, bandf: 'iron' }, 2.5, len - 2, 1.1);
  const c = o.head ?? IRON, f = o.hf ?? 'iron';
  L.push(box(0, 0, len - 1, o.hw ?? 3.6, o.hh ?? 7, 3.6, c, f));                       // the head across the haft
  L.push(box(0, 0, len - 1, (o.hw ?? 3.6) + 0.4, 0.8, 4, shade(c, 0.75), f));
  L.push(box(0, (o.hh ?? 7) / 2 + 0.3, len - 1, (o.hw ?? 3.6) + 0.5, 0.8, 4.1, o.face ?? shade(c, 1.2), f));   // the striking faces
  L.push(box(0, -(o.hh ?? 7) / 2 - 0.3, len - 1, (o.hw ?? 3.6) + 0.5, 0.8, 4.1, o.face ?? shade(c, 1.2), f));
  o.extra?.(L, len);
  return { boxes: L, tip: [0, 0, len + 1] };
}
function staff(o) {
  const L = [], front = o.front ?? 24, back = o.back ?? 9;
  shaft(L, o, back, front, o.th ?? 1);
  o.extra?.(L, front);
  return { boxes: L, tip: [0, 0, front + 0.5] };
}

// ---- every weapon item's look ----------------------------------------------------
// fam: the family above; build: its boxes; L: Legendary (its own model)
export const WEAPON_LOOKS = {
  // swords
  training_sword: { fam: 'sword', build: () => sword({ len: 14, w: 2.2, shape: 'straight', blade: shade(BRONZE, 0.95), pommel: BRONZE_D, pf: 'metal', guard: BRONZE_D, grip: LEATHER, wrap: LEATHER_D, gw: 4.4 }) },
  xiphos: { fam: 'sword', build: () => sword({ len: 17, w: 2.7, shape: 'leaf', blade: CELESTIAL, fuller: 0xfff0b0, ff: 'glow', grip: 0x2a2a30, gw: 5.2 }) },
  kopis: { fam: 'sword', build: () => sword({ len: 16, w: 2.8, shape: 'taper', curve: 1.6, curveEnd: true, blade: STEEL, bf: 'silver', grip: 0x6a1a14, guard: IRON, gf: 'iron', pommel: IRON, pf: 'iron', gw: 3.6, edge: 0xe8eef4, ef: 'silver' }) },
  backbiter: { fam: 'sword', L: true, build: () => sword({ len: 19, w: 2.6, shape: 'straight', blade: CELESTIAL, bf: 'metal', split: 0x8a96a4, sf: 'silver', grip: 0x1a1a22, wrap: 0x3a3a46, guard: 0x2a2a30, gf: 'iron', pommel: 0x2a2a30, pf: 'iron', gw: 6, gem: 0x3a6a9a,
    // a hooked notch near the guard and a spiked crossguard
    extra: (L) => { L.push(box(1.7, 0, 4.5, 0.8, 0.5, 1.6, 0x8a96a4, 'silver')); L.push(box(-3.2, 0, 2, 0.8, 0.8, 1.6, 0x2a2a30, 'iron')); L.push(box(3.2, 0, 2, 0.8, 0.8, 1.6, 0x2a2a30, 'iron')); } }) },
  stygian_blade: { fam: 'sword', L: true, build: () => sword({ len: 19, w: 2.4, shape: 'straight', blade: STYGIAN, bf: 'iron', edge: 0x9a5aff, ef: 'glow', grip: 0x2a2020, guard: STYGIAN, gf: 'iron', pommel: 0x6a2aaa, pf: 'gem', gw: 5,
    extra: (L) => { L.push(box(0, 0, 9, 0.3, 0.6, 12, 0x6a2aaa, 'glow')); } }) },
  imperial_gladius: { fam: 'sword', L: true, build: () => sword({ len: 14, w: 2.8, shape: 'gladius', blade: IGOLD, bf: 'gold', fuller: 0xfff4c0, grip: 0x7a1a2a, wrap: IGOLD, guard: IGOLD, pommel: IGOLD, gw: 4,
    // an eagle's head pommel: a beak and wings
    extra: (L) => { L.push(box(0, 0.9, -3.4, 0.8, 0.8, 1.2, IGOLD, 'gold')); L.push(box(-1.4, 0.2, -3.2, 1.2, 0.5, 0.8, IGOLD, 'gold')); L.push(box(1.4, 0.2, -3.2, 1.2, 0.5, 0.8, IGOLD, 'gold')); } }) },
  harpe: { fam: 'sword', L: true, build: () => sword({ len: 17, w: 2.2, shape: 'straight', blade: SILVER, bf: 'silver', grip: 0x2a3a5a, guard: BRONZE, pommel: BRONZE, gw: 4,
    // the sickle: a curved hook off the spine, curling back toward the hilt
    extra: (L) => { for (const [x, z, r] of [[2, 12.5, 0.3], [3.3, 11.6, 0.8], [4, 10.2, 1.3], [3.9, 8.7, 1.9], [3.1, 7.7, 2.6]]) L.push(box(x, 0, z, 1.3, 0.45, 1.8, SILVER, 'silver', [0, r, 0])); L.push(box(2.3, 0, 7.6, 0.9, 0.4, 1, 0xe8f0ff, 'silver', [0, 2.9, 0])); } }) },
  ares_sword: { fam: 'sword', L: true, build: () => sword({ len: 21, w: 3.4, shape: 'broad', blade: 0x2a1410, bf: 'iron', edge: 0xff6a1a, ef: 'glow', grip: 0x1a0c0a, wrap: RED, guard: 0x5a1a10, gf: 'iron', pommel: RED, pf: 'gem', gw: 7, th: 0.6,
    // flames licking up from the guard, a red-hot core
    extra: (L) => { L.push(box(0, 0, 11.5, 0.5, 0.75, 17, 0xff3a0a, 'glow')); for (const [x, z, h] of [[-3, 3, 2], [3, 3, 2], [-2.2, 4.2, 1.4], [2.2, 4.2, 1.4]]) L.push(box(x, 0, z, 0.8, 0.6, h, 0xffa020, 'glow')); } }) },
  forge_sword: { fam: 'sword', build: () => sword({ len: 16, w: 2.6, shape: 'straight', blade: 0xff7a2a, bf: 'ember', edge: 0xffd060, ef: 'glow', grip: LEATHER_D, guard: IRON, gf: 'iron', pommel: IRON, pf: 'iron', gw: 4.6 }) },
  trident_blade: { fam: 'sword', build: () => sword({ len: 18, w: 2.6, shape: 'leaf', blade: 0x3aa8a0, bf: 'metal', fuller: 0xb8f4ff, ff: 'glow', grip: 0x1a3a5a, wrap: 0x2fd0d8, guard: 0x2a7a8a, gw: 5.6, pommel: 0x2fd0d8, pf: 'gem',
    // a crossguard of curling waves, a trident's prongs at the pommel
    extra: (L) => { L.push(box(-3.2, 0.6, 2.2, 1, 1, 1.4, 0xb8f4ff, 'silver')); L.push(box(3.2, 0.6, 2.2, 1, 1, 1.4, 0xb8f4ff, 'silver')); for (const x of [-0.9, 0, 0.9]) L.push(box(x, 0, -4.6, 0.4, 0.5, 1.4, 0x2fd0d8, 'gem')); } }) },
  // daggers
  bronze_dagger: { fam: 'dagger', build: () => dagger({ blade: BRONZE, grip: LEATHER, guard: BRONZE_D, pommel: BRONZE_D, pf: 'metal' }) },
  fang_dagger: { fam: 'dagger', build: () => dagger({ len: 8.5, w: 1.8, blade: IVORY, bf: 'bone', curve: -1.2, curveEnd: true, grip: 0x3a1a1a, guard: BRONZE, pommel: 0x9a2020, pf: 'gem', edge: 0xff4a4a, ef: 'gem' }) },
  // two knives (the left a mirror of the right)
  twin_daggers: { fam: 'twin', L: true, build: () => dagger({ len: 8.5, w: 1.6, blade: SILVER, bf: 'silver', curve: 0.9, curveEnd: true, grip: 0x2a3a6a, guard: SILVER, gf: 'silver', pommel: 0xe8f0ff, pf: 'gem', edge: 0xf0f8ff, ef: 'silver',
    extra: (L) => { L.push(box(0, 0.5, 1.5, 2.6, 0.4, 0.5, 0xe8f0ff, 'gem')); } }) },
  hunter_knives: { fam: 'twin', build: () => dagger({ len: 8, w: 1.7, shape: 'taper', blade: SILVER, bf: 'silver', grip: 0x5a3a20, wrap: 0x2a1a10, guard: SILVER, gf: 'silver', pommel: SILVER, pf: 'silver', gw: 3 }) },
  // spears
  camp_spear: { fam: 'spear', build: () => spear({ front: 24, back: 10, shaft: WOOD, bands: [-2, 22], blade: BRONZE }) },
  lamer: { fam: 'spear', build: () => spear({ front: 25, back: 12, shaft: 0x2a2420, sf: 'leather', bands: [0, 23], blade: BRONZE, edge: 0xffe24a, ef: 'glow',
    extra: (L, f) => { L.push(box(0.6, 0.5, f + 3.5, 0.35, 0.35, 2.4, 0xffe24a, 'glow', [0, 0.5, 0])); L.push(box(-0.4, 0.5, f + 5.6, 0.35, 0.35, 2.4, 0xffe24a, 'glow', [0, -0.5, 0])); } }) },
  dory: { fam: 'spear', build: () => spear({ front: 28, back: 14, shaft: ASH, shaft2: shade(ASH, 0.9), bands: [-1, 26], blade: BRONZE, headLen: 8.5, headW: 2.8, butt: BRONZE_D }) },
  pelian_spear: { fam: 'spear', L: true, build: () => spear({ front: 28, back: 14, shaft: 0x8a6a3a, bands: [-6, 0, 6, 12, 26], band: IGOLD, bandf: 'gold', blade: 0xe8d8a8, bf: 'gold', headLen: 10, headW: 3, head: 'leaf', collar: IGOLD, butt: IGOLD,
    // a pennant of Achilles' blue
    extra: (L, f) => { L.push(box(0, 1.6, f - 2.5, 0.25, 2.4, 3.4, 0x2a5ab8, 'cloth')); L.push(box(0, 2.2, f - 5, 0.25, 1.2, 1.8, 0x2a5ab8, 'cloth')); } }) },
  storm_spear: { fam: 'spear', L: true, build: () => spear({ front: 26, back: 12, shaft: 0x24283a, sf: 'iron', bands: [-4, 4, 12, 24], band: 0x8ab8ff, bandf: 'glow', blade: 0xd8e8ff, bf: 'silver', edge: 0x9ad0ff, ef: 'glow', headLen: 8,
    // forked lightning crackling round the head
    extra: (L, f) => { for (const [x, y, z, r] of [[1.6, 0.8, f + 2, 0.6], [2.2, -0.4, f + 3.8, -0.5], [-1.8, 0.6, f + 3, -0.6], [-2.2, -0.6, f + 5, 0.5]]) L.push(box(x, y, z, 0.35, 0.35, 2.2, 0xd8f0ff, 'glow', [0, r, 0])); } }) },
  chimera_fang: { fam: 'spear', L: true, build: () => spear({ front: 25, back: 11, shaft: 0x5a3a1a, bands: [-3, 23], band: 0x3a6a2a, blade: IVORY, bf: 'bone', edge: 0x6aff4a, ef: 'glow', headLen: 9, headW: 2.6, head: 'taper',
    // a lion's mane tassel under the fang, a snake's tail wound down the shaft
    extra: (L, f) => { for (const [x, y] of [[-1.2, -1.2], [1.2, -1.2], [0, -1.6], [-1, 1], [1, 1]]) L.push(box(x, y, f - 0.6, 1.2, 1.2, 1.6, 0xc87a1a, 'fur')); for (let i = 0; i < 5; i++) L.push(box(Math.sin(i * 1.6) * 0.75, Math.cos(i * 1.6) * 0.75, f - 4 - i * 2, 0.6, 0.6, 1.6, 0x3a7a2a, 'leather')); } }) },
  // axes
  bronze_axe: { fam: 'axe', build: () => axe({ len: 13, shaft: WOOD, head: 4, bit: 4.6, blade: BRONZE, bands: [3] }) },
  boreas_axe: { fam: 'greataxe', L: true, build: () => axe({ len: 17, back: 5, shaft: 0x5a6a80, sf: 'iron', bands: [-2, 6, 12], band: 0xbfe8ff, bandf: 'gem', head: 5.5, bit: 6.4, blade: 0x9ad8f0, bf: 'gem', edge: 0xe8f8ff, ef: 'glow',
    // ice crystals growing off the head and the cap
    extra: (L, len, hz) => { for (const [y, z, h] of [[2.2, hz, 3], [1.6, hz + 1.6, 2], [1.4, hz - 1.6, 1.8]]) L.push(box(0, y, z, 0.9, h, 0.9, 0xd8f4ff, 'gem', [0, 0, 0.25])); L.push(box(0, 0, len + 1.6, 0.8, 0.8, 1.8, 0xd8f4ff, 'gem')); } }) },
  labrys: { fam: 'greataxe', build: () => axe({ len: 17, back: 5, shaft: WOOD_D, bands: [-1, 8], band: BRONZE, head: 5, bit: 5.6, blade: BRONZE, double: true, cap: BRONZE, edge: 0xf0d080, ef: 'gold' }) },
  procrustes_axe: { fam: 'greataxe', L: true, build: () => {
    // a butcher's cleaver the size of a door: a broad slab with a notched spine and a measuring rule
    const L = [], len = 15, back = 4.5;
    shaft(L, { shaft: 0x3a2a1e, bands: [-2, 4], band: IRON, bandf: 'iron' }, back, len, 1.1);
    L.push(box(0, 0, -back - 0.6, 1.5, 1.5, 1.2, IRON, 'iron'));
    L.push(box(0, -4.4, len - 2.5, 0.8, 7.2, 9, 0x8a929a, 'iron'));                 // the slab
    L.push(box(0, -8.3, len - 2.5, 0.6, 0.7, 9.2, 0xd8e0e8, 'silver'));              // its edge
    for (let i = 0; i < 4; i++) L.push(box(0, -0.6, len - 6 + i * 2.2, 0.9, 0.9, 1.1, 0x5a626a, 'iron'));   // notched spine
    for (let i = 0; i < 5; i++) L.push(box(0.45, -2.2 - (i % 2) * 0.4, len - 6.2 + i * 1.8, 0.1, i % 2 ? 1.2 : 2, 0.25, 0x2a2a30, 'iron'));   // the rule's marks
    L.push(box(0, -4.4, len + 2.2, 0.9, 1.4, 1.2, 0x5a626a, 'iron'));                // a hook at the point
    return { boxes: L, tip: [0, 0, len + 2.4] };
  } },
  // clubs, maces and hammers
  club: { fam: 'club', build: () => club({ len: 16, w0: 1.6, w1: 2.6, wood: 0xa87a4a, wood2: 0x8a5e34, extra: (L, len) => { L.push(box(0, 0, len - 1, 3.4, 3.4, 2, 0xa87a4a, 'wood')); L.push(box(0, 0, 6, 2.4, 2.4, 1, 0x6a4424, 'wood')); L.push(box(0, 0, 11, 2.8, 2.8, 1, 0x6a4424, 'wood')); } }) },
  heracles_club: { fam: 'greatclub', L: true, build: () => club({ len: 19, w0: 1.8, w1: 4.4, wood: OLIVE, wood2: 0x5a4a20,
    // knots and bronze studs all over the head
    extra: (L, len) => { for (const [x, y, z] of [[2, 1, 9], [-2.2, -0.6, 12], [1.6, -1.8, 14.5], [-1.4, 2, 16.5], [2.4, 0.4, 17.5], [0, -2.4, 18]]) L.push(box(x, y, z, 1.2, 1.2, 1.2, 0xd8a840, 'metal')); L.push(box(0, 0, len + 0.2, 4, 4, 1.2, 0x4a3a18, 'wood')); L.push(box(1.8, 1.6, 7, 1.2, 1.4, 1.6, 0x4a3a18, 'wood')); } }) },
  ram_mace: { fam: 'mace', build: () => club({ len: 13, w0: 1.1, w1: 1.3, wood: IRON, wood2: 0x5a5a62, wf: 'iron',
    // a ram's head: two horns curling round from the crown
    extra: (L, len) => { L.push(box(0, 0, len, 2.6, 2.6, 3, 0xd8c8a0, 'bone')); for (const s of [-1, 1]) for (const [x, y, z] of [[1.6, 1, len + 0.8], [2.6, 0.2, len + 1.2], [3.1, -1, len + 0.4], [2.8, -1.9, len - 0.8], [2, -1.6, len - 1.8]]) L.push(box(s * x, y, z, 1.4, 1.4, 1.4, 0xb89a68, 'bone')); } }) },
  hammer: { fam: 'hammer', build: () => hammer({ len: 15, head: 0x4a4a52, face: 0x9aa0a8, band: BRONZE,
    extra: (L, len) => { L.push(box(1.9, 0, len - 1, 0.3, 1.4, 1.4, 0xff8a2a, 'glow')); L.push(box(-1.9, 0, len - 1, 0.3, 1.4, 1.4, 0xff8a2a, 'glow')); } }) },
  // staves
  shepherd_crook: { fam: 'staff', build: () => staff({ front: 22, back: 9, shaft: 0x8a6a3a, shaft2: 0x7a5a30,
    // the crook curls up and back at the top
    extra: (L, f) => { for (const [y, z] of [[1, f + 0.6], [2.2, f + 1.2], [3.4, f + 1.2], [4.4, f + 0.4], [4.6, f - 0.8], [3.8, f - 1.6]]) L.push(box(0, y, z, 0.95, 1.2, 1.2, 0x8a6a3a, 'wood')); } }) },
  reed_staff: { fam: 'staff', build: () => staff({ front: 23, back: 8, shaft: 0x8ab04a, shaft2: 0x7aa040, sf: 'wood', bands: [-4, 2, 8, 14, 20], band: 0x5a7a2a, bandf: 'wood',
    // leaves at the top, a set of reed pipes bound below them, a frost-blue charm (Freezing)
    extra: (L, f) => { for (const [x, y, z, r] of [[1, 1.2, f - 1, 0.6], [-1.2, 0.8, f - 2.6, -0.7], [0.8, -1, f - 4, 0.5]]) L.push(box(x, y, z, 2.4, 0.3, 1.2, 0x5aa83a, 'cloth', [0, 0, r])); for (let i = 0; i < 4; i++) L.push(box(1.1 + i * 0.7, 0, f - 8 - i * 0.6, 0.6, 0.6, 3 - i * 0.4, 0xd8b860, 'wood')); L.push(box(0, -1.1, f - 6, 0.9, 1.2, 0.9, 0x9ad8ff, 'gem')); } }) },
  // the Fury's lash: a handle and a rigid, flickering coil of fire held out forward
  fury_lash: { fam: 'whip', L: true, build: () => {
    const L = [];
    L.push(box(0, 0, -1.8, 1.4, 1.4, 1.4, 0x3a1a10, 'leather')); L.push(box(0, 0, 0.6, 1.2, 1.2, 4.4, 0x5a2a14, 'leather')); L.push(box(0, 0, 2.9, 1.6, 1.6, 0.6, BRONZE, 'metal'));
    let x = 0, y = 0, z = 3.4;
    for (let i = 0; i < 12; i++) {
      const t = i / 11, w = 1 - t * 0.55;
      x = Math.sin(t * Math.PI * 2.2) * 1.5 * t; y = Math.sin(t * Math.PI * 1.3) * 1.2; z += 1.75;
      L.push(box(x, y, z, w, w, 1.9, i % 3 === 2 ? 0xffd040 : 0xff5a14, 'glow'));
    }
    return { boxes: L, tip: [x, y, z + 1] };
  } },
  // the horn Percy tore from the Minotaur: held by its leather-bound root, curving up to a point
  minotaur_horn: { fam: 'horn', L: true, build: () => {
    const L = [];
    L.push(box(0, 0, -1.6, 1.8, 1.8, 1.4, 0x3a2414, 'leather'));
    for (let z = -0.6; z < 2.6; z += 1) L.push(box(0, 0, z, 2.1, 2.1, 0.8, z % 2 ? 0x5a3418 : 0x4a2a14, 'leather'));
    const n = 10;
    let tip = null;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), w = 2.5 - t * 1.9, y = Math.pow(t, 1.8) * 4.2, x = -Math.sin(t * Math.PI) * 0.9, z = 3.2 + t * 15;
      const c = t < 0.35 ? 0x6a4a30 : t < 0.7 ? 0xd8c8a0 : t < 0.92 ? 0xf0e8d0 : 0x2a2018;
      L.push(box(x, y, z, w, w, 1.9, c, 'bone', [-0.25 * t, 0, 0]));
      if (i % 3 === 1) L.push(box(x, y, z, w + 0.2, w + 0.2, 0.3, shade(c, 0.8), 'bone', [-0.25 * t, 0, 0]));   // growth rings
      tip = [x, y + 0.3, z + 1.1];
    }
    // a scrap of the bull's hide still on the root, blood-red cord
    L.push(box(0, 1.2, 2.6, 2.4, 0.5, 1.4, 0x3a2a24, 'fur')); L.push(box(1.2, 0, 1.6, 0.4, 2.2, 0.5, 0x9a1a14, 'cloth'));
    return { boxes: L, tip };
  } },
};
export const WEAPON_IDS = Object.keys(WEAPON_LOOKS);
export const familyOf = (id) => WEAPON_LOOKS[id]?.fam ?? null;

// a heroic item (a Common or Rare base raised a tier, loot.js) carries a violet charm by the guard
const HEROIC = 0xb884ff;
const cache = new Map();
function boxesOf(id, tier) {
  const k = id + ':' + (tier === 'heroic' ? 'h' : '');
  if (!cache.has(k)) {
    const b = WEAPON_LOOKS[id].build();
    if (tier === 'heroic' && !WEAPON_LOOKS[id].L) b.boxes = [...b.boxes, box(0, -0.9, 1.4, 0.9, 0.9, 0.9, HEROIC, 'gem')];
    cache.set(k, b);
  }
  return cache.get(k);
}
// A weapon's model: a group on the hand (its offset there), one mesh, its tip marked.
// mirror: the left of a pair (x flipped).
export function buildWeapon(id, { material = gearMaterial(), tier = null, mirror = false } = {}) {
  const look = WEAPON_LOOKS[id]; if (!look) return null;
  const { boxes, tip } = boxesOf(id, tier);
  const list = mirror ? boxes.map((b) => ({ ...b, at: [-b.at[0], b.at[1], b.at[2]], r: b.r ? [b.r[0], -b.r[1], -b.r[2]] : undefined })) : boxes;
  const g = new THREE.Group(); g.name = 'weapon:' + id;
  g.add(gearMesh(list, material));
  markTip(g, mirror ? -tip[0] : tip[0], tip[1], tip[2], id);
  g.position.set(0, -1 * PX, 1 * PX);
  g.userData.gearWeapon = id;
  return g;
}
