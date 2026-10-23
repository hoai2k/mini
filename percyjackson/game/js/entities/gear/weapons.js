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
// (vox-gear-weapons-1/-2: a chunky cube pommel, a guard with a block at each end)
function hilt(L, o, len = 3.8) {
  L.push(box(0, 0, -len / 2 - 1.5, 1.7, 1.7, 1.6, o.pommel ?? GOLD, o.pf ?? 'gold'));
  L.push(box(0, 0, -0.9, 1.15, 1.15, len, o.grip ?? LEATHER, 'leather'));
  if (o.wrap) for (let z = -2.4; z < 0.8; z += 1.2) L.push(box(0, 0, z, 1.3, 1.3, 0.45, o.wrap, 'leather'));
  const gw = o.gw ?? 5, gc = o.guard ?? BRONZE, gf = o.gf ?? 'metal';
  L.push(box(0, 0, 1.4, gw, 1.15, 1.2, gc, gf));
  if (!o.plainGuard) for (const s of [-1, 1]) L.push(box(s * (gw / 2 - 0.4), 0, 1.4, 1.1, 1.5, 1.5, shade(gc, 1.08), gf));
  if (o.gem) L.push(box(0, 0.5, 1.4, 1.1, 0.7, 1.3, o.gem, 'gem'));
}
const PROFILE = {
  leaf: [0.55, 0.72, 0.88, 1, 0.98, 0.85, 0.66, 0.42],
  straight: [0.92, 0.95, 0.95, 0.95, 0.95, 0.95, 0.85, 0.6],
  gladius: [0.95, 0.88, 0.85, 0.88, 0.92, 0.9, 0.7, 0.4],
  broad: [1, 1, 1, 1, 1, 1, 0.92, 0.75],
  taper: [1, 0.92, 0.84, 0.76, 0.66, 0.54, 0.4, 0.26],
  kopis: [0.72, 0.8, 0.9, 1, 1.06, 1.02, 0.82, 0.45],   // the forward-curved blade widening to its belly
  fang: [1, 0.95, 0.88, 0.78, 0.66, 0.52, 0.38, 0.24],
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
  // swords (vox-gear-weapons-1 and -2: broad chunky blades, about a quarter as wide as they are long)
  training_sword: { fam: 'sword', build: () => sword({ len: 13, w: 3.1, shape: 'straight', blade: shade(BRONZE, 0.98), pommel: BRONZE, pf: 'metal', guard: BRONZE, grip: LEATHER_D, wrap: LEATHER, gw: 4.8 }) },
  xiphos: { fam: 'sword', build: () => sword({ len: 15, w: 3.5, shape: 'leaf', blade: CELESTIAL, bf: 'gold', fuller: 0xfff0b0, ff: 'glow', edge: 0xffe080, ef: 'glow', grip: LEATHER_D, wrap: LEATHER, guard: BRONZE, pommel: GOLD, gw: 5.4,
    // the faint celestial glow: sparks along the blade
    extra: (L) => { for (const [x, z] of [[-2.6, 7], [2.4, 11], [-2, 14.5]]) L.push(box(x, 0, z, 0.5, 0.5, 0.5, 0xffe8a0, 'glow')); } }) },
  kopis: { fam: 'sword', build: () => sword({ len: 14, w: 3.4, shape: 'kopis', curve: 1.8, curveEnd: true, blade: STEEL, bf: 'silver', edge: 0xe8eef4, ef: 'silver', grip: 0xa02018, wrap: 0x6a1410, guard: BRONZE, pommel: GOLD, gw: 4 }) },
  backbiter: { fam: 'sword', L: true, build: () => sword({ len: 17, w: 3.3, shape: 'straight', blade: CELESTIAL, bf: 'gold', split: 0x8a96a4, sf: 'silver', grip: LEATHER_D, wrap: LEATHER, guard: 0x3a2a30, gf: 'iron', pommel: GOLD, gw: 6, gem: 0xb050ff,
    // a dark spiked crossguard round a violet gem (half celestial bronze, half steel: it cuts mortals too)
    extra: (L) => { for (const s of [-1, 1]) { L.push(box(s * 3.3, 0, 2.6, 1, 1, 1.8, 0x3a2a30, 'iron', [0, s * 0.5, 0])); L.push(box(s * 3.4, 0, 0.3, 1, 1, 1.4, 0x3a2a30, 'iron', [0, -s * 0.5, 0])); } L.push(box(0, 0, 18.2, 0.4, 0.5, 0.6, 0xffe8a0, 'glow')); } }) },
  stygian_blade: { fam: 'sword', L: true, build: () => sword({ len: 17, w: 3.1, shape: 'straight', blade: STYGIAN, bf: 'iron', edge: 0x9a5aff, ef: 'glow', grip: 0x2a2020, wrap: 0x140e18, guard: STYGIAN, gf: 'iron', pommel: 0x241c2c, pf: 'iron', gw: 5.4, gem: 0xb050ff,
    // a violet seam down the middle; shadow motes drifting off it
    extra: (L) => { L.push(box(0, 0, 9, 0.3, 0.6, 12, 0x6a2aaa, 'glow')); for (const [x, y, z] of [[-2.8, 0.6, 6], [2.6, -0.4, 10], [-2.4, -0.6, 14], [2.2, 0.8, 17]]) L.push(box(x, y, z, 0.7, 0.7, 0.7, 0x3a1a5a, 'glow')); } }) },
  imperial_gladius: { fam: 'sword', L: true, build: () => sword({ len: 13, w: 3.4, shape: 'gladius', blade: IGOLD, bf: 'gold', fuller: 0xfff4c0, ff: 'glow', grip: 0x9a1a2a, wrap: 0x6a1020, guard: IGOLD, pommel: IGOLD, gw: 4.4,
    // an eagle's head on the guard (beak, eyes, a crest of feathers), the Roman way
    extra: (L) => { L.push(box(0, 1.4, 2, 1.6, 1.8, 1.8, IGOLD, 'gold')); L.push(box(0, 1.9, 3.1, 0.9, 0.8, 1, 0xffd860, 'gold')); L.push(box(0, 1.5, 3.7, 0.6, 0.5, 0.6, 0xc89020, 'gold')); for (const s of [-1, 1]) L.push(box(s * 0.85, 1.8, 2.6, 0.2, 0.3, 0.3, 0x2a1408, 'gem')); L.push(box(0, 2.5, 1.4, 1.2, 0.6, 1.2, IGOLD, 'gold')); } }) },
  harpe: { fam: 'sword', L: true, build: () => sword({ len: 16, w: 2.8, shape: 'straight', blade: SILVER, bf: 'silver', fuller: BRONZE, ff: 'gold', grip: LEATHER_D, wrap: LEATHER, guard: BRONZE, pommel: GOLD, gw: 4.4,
    // the sickle: a hook off the spine near the point, curving back toward the hilt
    extra: (L) => { for (const [x, z, r] of [[2.1, 17.4, 0.3], [3.3, 17.6, 0.9], [4.3, 16.8, 1.4], [4.7, 15.4, 1.9], [4.4, 14, 2.5]]) L.push(box(x, 0, z, 1.4, 0.5, 1.8, SILVER, 'silver', [0, r, 0])); L.push(box(3.6, 0, 13.3, 0.9, 0.45, 1, 0xe8f0ff, 'silver', [0, 2.9, 0])); } }) },
  ares_sword: { fam: 'sword', L: true, build: () => sword({ len: 19, w: 4, shape: 'broad', blade: 0x2a1410, bf: 'iron', edge: 0xff6a1a, ef: 'glow', grip: 0x8a1410, wrap: 0x4a0c08, guard: 0x5a1a10, gf: 'iron', pommel: GOLD, gw: 7, th: 0.65,
    // a red-hot core and flames licking up both edges from the guard
    extra: (L) => { L.push(box(0, 0, 11, 0.6, 0.8, 16, 0xff3a0a, 'glow')); for (const [x, z, h] of [[-3, 3, 2], [3, 3, 2], [-2.6, 6, 1.6], [2.8, 8.5, 1.8], [-2.8, 11, 1.6], [2.6, 14, 1.4], [-2.4, 16.5, 1.2]]) L.push(box(x, 0, z, 0.9, 0.6, h, x < 0 ? 0xffa020 : 0xff6a14, 'glow')); } }) },
  forge_sword: { fam: 'sword', build: () => sword({ len: 15, w: 3.3, shape: 'leaf', blade: 0xff7a2a, bf: 'ember', edge: 0xffd060, ef: 'glow', grip: LEATHER_D, wrap: LEATHER, guard: BRONZE, pommel: GOLD, gw: 4.8,
    extra: (L) => { for (const [x, z] of [[-2.4, 6], [2.3, 9], [-2, 12.5]]) L.push(box(x, 0, z, 0.7, 0.5, 1.2, 0xffc040, 'glow')); } }) },
  trident_blade: { fam: 'sword', build: () => sword({ len: 16, w: 3.3, shape: 'leaf', blade: 0x3ab8b0, bf: 'metal', fuller: 0xb8f4ff, ff: 'glow', edge: 0x9af0ff, ef: 'glow', grip: 0x1a4a5a, wrap: 0x0f6f73, guard: IGOLD, gf: 'gold', gw: 6, pommel: IGOLD,
    // a trident for a crossguard: the side prongs curving up beside the blade's root, a wave curling round it
    extra: (L) => { for (const s of [-1, 1]) { L.push(box(s * 2.9, 0, 2.8, 0.8, 0.7, 2.2, IGOLD, 'gold')); L.push(box(s * 2.6, 0, 4.2, 0.6, 0.6, 0.9, 0xffe080, 'gold')); } L.push(box(0, 0.6, 2.6, 0.9, 0.6, 1.6, IGOLD, 'gold'));
      for (const [x, z] of [[-3.4, 6], [3.6, 7.5], [-3.2, 9.5], [3.2, 12]]) L.push(box(x, 0, z, 1, 0.6, 1.4, 0x5ac8ff, 'gem')); } }) },
  // daggers
  bronze_dagger: { fam: 'dagger', build: () => dagger({ shape: 'leaf', w: 2.3, blade: BRONZE, grip: LEATHER_D, wrap: LEATHER, guard: BRONZE, pommel: GOLD }) },
  fang_dagger: { fam: 'dagger', build: () => dagger({ len: 9, w: 2.4, shape: 'fang', blade: IVORY, bf: 'bone', curve: -1.8, curveEnd: true, grip: LEATHER_D, wrap: LEATHER, guard: BRONZE, pommel: GOLD }) },
  // two knives (the left a mirror of the right)
  twin_daggers: { fam: 'twin', L: true, build: () => dagger({ len: 9, w: 2.2, shape: 'fang', blade: SILVER, bf: 'silver', curve: 3, curveEnd: true, grip: 0x1f5a6a, wrap: 0x123a46, guard: IGOLD, gf: 'gold', pommel: IGOLD, gw: 3,
    // a small gold crescent on the guard: the huntresses' moon
    extra: (L) => { for (const [x, z] of [[-1.2, 2.4], [-1.6, 3.2], [-1.2, 4]]) L.push(box(x, 0.6, z, 0.6, 0.5, 0.8, IGOLD, 'gold')); } }) },
  hunter_knives: { fam: 'twin', build: () => dagger({ len: 8.5, w: 2.2, shape: 'leaf', blade: SILVER, bf: 'silver', grip: 0x1f6a78, wrap: 0x124a56, guard: GOLD, gf: 'gold', pommel: GOLD, gw: 3.2 }) },
  // spears
  camp_spear: { fam: 'spear', build: () => spear({ front: 24, back: 10, shaft: WOOD, bands: [-2, 8, 22], band: 0xd8c098, bandf: 'cloth', blade: BRONZE, headW: 3 }) },
  lamer: { fam: 'spear', build: () => spear({ front: 25, back: 12, shaft: WOOD, bands: [-6, 0, 22], band: 0x1f7a80, bandf: 'cloth', blade: GOLD, bf: 'gold', edge: 0xffe24a, ef: 'glow', headW: 3,
    extra: (L, f) => { for (const [x, y, z, r] of [[0.9, 0.5, f + 3.5, 0.5], [-0.8, 0.5, f + 5.6, -0.5], [1.6, -0.4, f + 1.4, 0.8], [-1.6, 0.3, f + 2.6, -0.8]]) L.push(box(x, y, z, 0.35, 0.35, 2.4, 0xffe24a, 'glow', [0, r, 0])); } }) },
  dory: { fam: 'spear', build: () => spear({ front: 28, back: 14, shaft: ASH, shaft2: shade(ASH, 0.9), bands: [-1, 8, 26], band: 0xd8c098, bandf: 'cloth', blade: BRONZE, headLen: 9, headW: 3.4, butt: BRONZE_D, collar: 0x9a2018,
  }) },
  pelian_spear: { fam: 'spear', L: true, build: () => spear({ front: 28, back: 14, shaft: 0x22385a, shaft2: 0x2a4470, sf: 'cloth', bands: [-10, -6, -2, 2, 6, 10, 14, 18, 26], band: IGOLD, bandf: 'gold', blade: 0xf0d070, bf: 'gold', headLen: 10, headW: 3.4, head: 'leaf', collar: IGOLD, butt: IGOLD,
    // a pennant of Achilles' blue with a white wave
    extra: (L, f) => { L.push(box(0, 2, f - 3, 0.25, 3, 4.2, 0x2a5ab8, 'cloth')); L.push(box(0, 2.6, f - 6, 0.25, 1.8, 2, 0x2a5ab8, 'cloth')); L.push(box(0.15, 2, f - 3, 0.1, 1.2, 1.6, 0xf4ead5, 'cloth')); } }) },
  storm_spear: { fam: 'spear', L: true, build: () => spear({ front: 26, back: 12, shaft: 0x22385a, sf: 'cloth', bands: [-8, -2, 4, 10, 16, 24], band: IGOLD, bandf: 'gold', blade: 0xe8f0ff, bf: 'silver', edge: 0xffe24a, ef: 'glow', headLen: 8, collar: IGOLD, butt: IGOLD,
    // forked yellow lightning coiling down the shaft from the head
    extra: (L, f) => { for (let i = 0; i < 9; i++) { const a = i * 1.4, z = f + 3 - i * 3.4; L.push(box(Math.cos(a) * 1.4, Math.sin(a) * 1.4, z, 0.35, 0.35, 2.6, 0xffe24a, 'glow', [i % 2 ? 0.4 : -0.4, i % 2 ? -0.5 : 0.5, 0])); } } }) },
  chimera_fang: { fam: 'spear', L: true, build: () => spear({ front: 25, back: 11, shaft: 0x5a3a1a, bands: [-3, 23], band: IGOLD, bandf: 'gold', blade: IVORY, bf: 'bone', edge: 0x6aff4a, ef: 'glow', headLen: 10, headW: 3.4, head: 'fang', collar: IGOLD,
    // a lion's mane tassel under the fang, a green snake wound down the shaft, poison dripping
    extra: (L, f) => { for (const [x, y] of [[-1.2, -1.4], [1.2, -1.4], [0, -1.9], [-0.9, -2.4], [0.9, -2.4]]) L.push(box(x, y, f - 0.4, 1, 1.4, 1.2, 0xd8501a, 'fur')); for (let i = 0; i < 9; i++) L.push(box(Math.sin(i * 1.3) * 0.85, Math.cos(i * 1.3) * 0.85, f - 2 - i * 2.2, 0.75, 0.75, 1.9, i % 2 ? 0x2a6a2a : 0x3a8a3a, 'leather')); L.push(box(0, -1, f + 6, 0.5, 1.2, 0.5, 0x7aff4a, 'glow')); L.push(box(0.4, -1.4, f + 3.5, 0.5, 0.9, 0.5, 0x7aff4a, 'glow')); } }) },
  // axes
  bronze_axe: { fam: 'axe', build: () => axe({ len: 13, shaft: WOOD, bands: [-1, 1, 3], band: LEATHER_D, bandf: 'leather', head: 4.6, bit: 5.4, blade: BRONZE }) },
  boreas_axe: { fam: 'greataxe', L: true, build: () => axe({ len: 17, back: 5, shaft: 0x22304a, sf: 'cloth', bands: [-3, 2, 7, 12], band: IGOLD, bandf: 'gold', head: 6.2, bit: 7.2, blade: 0x9ad8f0, bf: 'gem', edge: 0xe8f8ff, ef: 'glow', knob: 0x5ac8ff,
    // ice crystals growing off the head and the cap, icicles under the bit
    extra: (L, len, hz) => { for (const [y, z, h] of [[2.2, hz, 3], [1.6, hz + 1.8, 2.2], [1.4, hz - 1.8, 2]]) L.push(box(0, y, z, 0.9, h, 0.9, 0xd8f4ff, 'gem', [0, 0, 0.25])); for (const z of [hz - 2.4, hz, hz + 2.4]) L.push(box(0, -8, z, 0.6, 1.4, 0.6, 0xd8f4ff, 'gem')); L.push(box(0, 0, len + 1.6, 0.8, 0.8, 1.8, 0xd8f4ff, 'gem')); L.push(box(0, 0, -6.2, 1.6, 1.6, 1.6, 0x5ac8ff, 'gem')); } }) },
  labrys: { fam: 'greataxe', build: () => axe({ len: 17, back: 5, shaft: WOOD_D, bands: [-3, -1, 1, 8], band: 0x0f6f73, bandf: 'cloth', head: 5.2, bit: 6, blade: GOLD, bf: 'gold', double: true, cap: GOLD, edge: 0xf0d080, ef: 'gold',
    // a teal Greek key inlaid in each bit
    extra: (L, len, hz) => { for (const s of [-1, 1]) for (const [y, z, w] of [[2.6, hz - 1, 2.4], [3.6, hz, 0.6], [3.4, hz + 1.2, 2]]) L.push(box(0, s * y, z, 0.8, 0.6, w, 0x0f8f93, 'gem')); } }) },
  procrustes_axe: { fam: 'greataxe', L: true, build: () => {
    // a butcher's cleaver the size of a door: a broad grey slab with a gold measuring rule, a red-wrapped haft
    const L = [], len = 15, back = 4.5;
    shaft(L, { shaft: 0x8a2018, shaft2: 0x6a1410, sf: 'leather', bands: [-2, 4], band: IGOLD, bandf: 'gold' }, back, len, 1.15);
    L.push(box(0, 0, -back - 0.8, 1.7, 1.7, 1.5, IGOLD, 'gold'));
    L.push(box(0, -4.4, len - 2.5, 0.8, 7.2, 9.4, 0x8a929a, 'iron'));                 // the slab
    L.push(box(0, -8.3, len - 2.5, 0.6, 0.7, 9.6, 0xd8e0e8, 'silver'));              // its edge
    L.push(box(0, -0.6, len - 2.5, 1, 1, 9.6, IGOLD, 'gold'));                       // a gold spine
    L.push(box(0.45, -2.6, len - 2.5, 0.12, 1.4, 8.6, 0xd8a840, 'gold'));            // the rule
    for (let i = 0; i < 8; i++) L.push(box(0.5, -2.2 - (i % 2) * 0.3, len - 6.4 + i * 1.1, 0.1, i % 2 ? 0.9 : 1.6, 0.22, 0x2a2a30, 'iron'));   // its marks
    L.push(box(0, -4.4, len + 2.4, 0.9, 1.4, 1.2, 0x5a626a, 'iron'));                // a hook at the point
    return { boxes: L, tip: [0, 0, len + 2.4] };
  } },
  // clubs, maces and hammers
  club: { fam: 'club', build: () => club({ len: 16, w0: 1.6, w1: 3, wood: 0x7a4a26, wood2: 0x6a3e1e, extra: (L, len) => { L.push(box(0, 0, len - 1, 3.8, 3.8, 2.2, 0x7a4a26, 'wood')); L.push(box(0, 0, 11.5, 3.4, 3.4, 1.2, 0x6a6a72, 'iron')); L.push(box(0, 0, 3.4, 1.9, 1.9, 1.2, 0xd8c098, 'cloth')); } }) },
  heracles_club: { fam: 'greatclub', L: true, build: () => club({ len: 19, w0: 1.8, w1: 4.6, wood: 0x6a3e1e, wood2: 0x5a321a,
    // knots and gold studs all over the head, a tan wrap at the grip
    extra: (L, len) => { for (const [x, y, z] of [[2.2, 1, 9], [-2.3, -0.6, 11], [1.8, -2, 13], [-1.6, 2.2, 14.5], [2.6, 0.6, 16], [0, -2.6, 16.5], [-2.6, 0.4, 17.5], [0.6, 2.6, 18]]) L.push(box(x, y, z, 1.3, 1.3, 1.3, 0xe8b440, 'gold')); L.push(box(0, 0, len + 0.2, 4.2, 4.2, 1.2, 0x4a2a14, 'wood')); L.push(box(0, 0, 3, 2, 2, 2.4, 0xd8c098, 'cloth')); } }) },
  ram_mace: { fam: 'mace', build: () => club({ len: 13, w0: 1.2, w1: 1.4, wood: WOOD, wood2: WOOD_D,
    // a ram's head of gold, two big cream horns curling round from the crown
    extra: (L, len) => { L.push(box(0, 0, len, 2.6, 2.6, 3, GOLD, 'gold')); L.push(box(0, 0, len - 2.4, 1.8, 1.8, 0.8, GOLD, 'gold')); for (const s of [-1, 1]) for (const [x, y, z] of [[1.8, 1.2, len + 1], [3, 0.4, len + 1.6], [3.8, -0.8, len + 0.8], [3.6, -2, len - 0.6], [2.8, -2, len - 1.8], [2.4, -0.8, len - 1.2]]) L.push(box(s * x, y, z, 1.6, 1.6, 1.6, 0xe0d0b0, 'bone')); } }) },
  hammer: { fam: 'hammer', build: () => hammer({ len: 15, head: 0x4a4a52, face: 0xff7a1a, band: BRONZE,
    extra: (L, len) => { L.push(box(1.95, 0, len - 1, 0.3, 4.6, 1.4, 0xff8a2a, 'glow')); L.push(box(-1.95, 0, len - 1, 0.3, 4.6, 1.4, 0xff8a2a, 'glow')); L.push(box(0, 0, 2, 1.5, 1.5, 3, 0xd8c098, 'cloth')); } }) },
  // staves
  shepherd_crook: { fam: 'staff', build: () => staff({ front: 22, back: 9, shaft: 0x7a4a26, shaft2: 0x6a3e1e, bands: [-2, 6], band: 0xd8c098, bandf: 'cloth',
    // the crook curls up and back at the top
    extra: (L, f) => { for (const [y, z] of [[1, f + 0.6], [2.2, f + 1.2], [3.4, f + 1.2], [4.4, f + 0.4], [4.6, f - 0.8], [3.8, f - 1.6]]) L.push(box(0, y, z, 1, 1.25, 1.25, 0x7a4a26, 'wood')); } }) },
  reed_staff: { fam: 'staff', build: () => staff({ front: 23, back: 8, shaft: 0x8ab04a, shaft2: 0x7aa040, sf: 'wood', bands: [-4, 2, 8, 14, 20], band: 0x2e7a3a, bandf: 'wood',
    // leaves and white flowers at the top, golden reed pipes bound below them, a frost-blue charm (Freezing)
    extra: (L, f) => { for (const [x, y, z, r] of [[1, 1.2, f - 1, 0.6], [-1.2, 0.8, f - 2.6, -0.7], [0.8, -1, f - 4, 0.5], [-1, -0.8, f - 9, -0.5]]) L.push(box(x, y, z, 2.4, 0.3, 1.2, 0x3a9a3a, 'cloth', [0, 0, r])); for (const [x, y, z] of [[0.9, 0.9, f - 2], [-0.9, 0.6, f - 6]]) { L.push(box(x, y, z, 1, 1, 1, 0xf8f4e8, 'cloth')); L.push(box(x, y + 0.3, z, 0.4, 0.5, 0.4, 0xffd84a, 'cloth')); } for (let i = 0; i < 4; i++) L.push(box(1.1 + i * 0.7, 0, f - 8 - i * 0.6, 0.6, 0.6, 3 - i * 0.4, 0xe0b850, 'wood')); L.push(box(0, -1.4, f - 6, 0.9, 1.2, 0.9, 0x9ad8ff, 'gem')); } }) },
  // the Fury's lash: a red-wrapped handle and a rigid coil of black leather in fire, held out forward
  fury_lash: { fam: 'whip', L: true, build: () => {
    const L = [];
    L.push(box(0, 0, -1.9, 1.6, 1.6, 1.5, GOLD, 'gold')); L.push(box(0, 0, 0.6, 1.2, 1.2, 4.4, 0x8a1410, 'leather')); L.push(box(0, 0, 2.9, 1.7, 1.7, 0.7, GOLD, 'gold'));
    let x = 0, y = 0, z = 3.4;
    for (let i = 0; i < 12; i++) {
      const t = i / 11, w = 1.1 - t * 0.5;
      x = Math.sin(t * Math.PI * 2.2) * 1.5 * t; y = Math.sin(t * Math.PI * 1.3) * 1.2; z += 1.75;
      L.push(box(x, y, z, w, w, 1.9, i % 2 ? 0x3a1a10 : 0x2a120a, 'leather'));
      L.push(box(x + (i % 2 ? 0.6 : -0.6), y + 0.5, z, w * 0.7, w * 0.7, 1.2, i % 3 === 2 ? 0xffd040 : 0xff5a14, 'glow'));   // the fire round it
    }
    return { boxes: L, tip: [x, y, z + 1] };
  } },
  // the horn Percy tore from the Minotaur: a great cream horn held by its leather-bound, gold-banded root
  minotaur_horn: { fam: 'horn', L: true, build: () => {
    const L = [];
    L.push(box(0, 0, -1.6, 2, 2, 1.4, 0x3a2414, 'leather'));
    for (let z = -0.6; z < 2.6; z += 1) L.push(box(0, 0, z, 2.3, 2.3, 0.8, z % 2 ? 0x5a3418 : 0x4a2a14, 'leather'));
    for (const z of [-1.2, 2.6]) L.push(box(0, 0, z, 2.6, 2.6, 0.6, IGOLD, 'gold'));
    const n = 10;
    let tip = null;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), w = 2.9 - t * 2.2, y = Math.pow(t, 1.8) * 4.6, x = -Math.sin(t * Math.PI) * 0.9, z = 3.4 + t * 15;
      const c = t < 0.3 ? 0xc8b088 : t < 0.75 ? 0xe0d0b0 : 0xf4ead5;
      L.push(box(x, y, z, w, w, 1.9, c, 'bone', [-0.25 * t, 0, 0]));
      if (i % 3 === 1) L.push(box(x, y, z, w + 0.2, w + 0.2, 0.3, shade(c, 0.85), 'bone', [-0.25 * t, 0, 0]));   // growth rings
      tip = [x, y + 0.3, z + 1.1];
    }
    // a scrap of the bull's hide still on the root, blood-red cord
    L.push(box(0, 1.3, 2.6, 2.6, 0.5, 1.4, 0x3a2a24, 'fur')); L.push(box(1.3, 0, 1.6, 0.4, 2.4, 0.5, 0x9a1a14, 'cloth'));
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
