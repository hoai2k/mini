// Armour on the heroes, in the Minecraft Dungeons way: every armour item
// changes the hero's outfit, with pieces hung on the rig's own bones so they
// follow every pose: a cuirass, a vest or a coat on the torso; shoulder
// plates, sleeves, bracers and gloves on the arms; greaves and ankle wings on
// the legs; pteruges, a robe or an apron on the swinging skirt panels at the
// hips (character.js swingSkirt: the front panel follows the leading leg,
// the back the trailing one, so no leg walks through it); a helmet, a hood or
// a hat on the head; a cape, a pelt or wings on the cape chain (the rig's
// spring physics).
//
// Families (ARMOUR_LOOKS[id].fam): clothes (the camp shirt, a uniform, a
// vest, a jacket), linen, bronze plate, scale, robes, cloaks, pelts and the
// legendary sets. Each look is a function of the hero's build that returns
// the boxes per bone (gearmesh.js box lists, skin pixels of the bone; head
// pieces in head pixels):
//   { torso, armR, armL, legR, legL, front, back (the skirt panels), head,
//     cape: { segs: [list, ...], len }, hair: 'helmet' | 'hood' | 'cap',
//     covers: true (the torso is covered: a hero's own collar is hidden) }
// The camp shirt is the heroes' own clothes: no pieces.
//
// The rules the pieces keep (perf/gear.cjs checks them on every hero):
//   - the face stays clear (helmets and hoods frame it; the fringe shows
//     under a hood: herovox.js heroHair 'hood'), and hair is cut to fit
//     under a helmet, a hood or a hat;
//   - nothing floats: every piece overlaps the body or another piece;
//   - no clipping through the body in walk, run and the attacks: torso
//     pieces keep within the arms' swing (4.5 px from the middle), leg
//     pieces within the other leg's, skirts on the swinging panels, capes
//     short of the legs' back swing.
import { box, shade, blend } from './gearmesh.js';

// ---- colours
const BRONZE = 0xc9963a, BRONZE_D = 0x8a5a1e, GOLD = 0xe8c060, GOLD_D = 0xa8822a, SILVER = 0xd8dee6;
const LEATHER = 0x6a3a1e, LEATHER_D = 0x3e2210, LINEN = 0xe8dcc0, LINEN_D = 0xc8b898;
const CRIMSON = 0xa8181e, NAVY = 0x22305a, ROYAL = 0x2a5ab8;

// ---- torso pieces (torso frame: x ±4, y 0..12, z ±2; the jacket layer ±4.25 / ±2.25)
const HW = 4.4, HD = 2.55;
// a shell round the torso from y0 to y1: front, back and sides
function shell(L, c, f, y0, y1, { hw = HW, hd = HD, th = 0.6, front = true, open = 0 } = {}) {
  const h = y1 - y0, yc = (y0 + y1) / 2;
  if (front && !open) L.push(box(0, yc, hd - th / 2, hw * 2, h, th, c, f));
  if (open) for (const s of [-1, 1]) L.push(box(s * (open / 2 + (hw - open / 2) / 2), yc, hd - th / 2, hw - open / 2, h, th, c, f));
  L.push(box(0, yc, -hd + th / 2, hw * 2, h, th, c, f));
  for (const s of [-1, 1]) L.push(box(s * (hw - th / 2), yc, 0, th, h, hd * 2 - 0.02, c, f));
}
// bands round the shell (trim)
const band = (L, c, f, y, h = 0.7, { hw = HW + 0.06, hd = HD + 0.06 } = {}) => {
  L.push(box(0, y, hd - 0.3, hw * 2, h, 0.6, c, f)); L.push(box(0, y, -hd + 0.3, hw * 2, h, 0.6, c, f));
  for (const s of [-1, 1]) L.push(box(s * (hw - 0.3), y, 0, 0.6, h, hd * 2, c, f));
};
// over the shoulders: straps or a yoke
const straps = (L, c, f, w = 2.4, th = 0.6) => { for (const s of [-1, 1]) L.push(box(s * 2.6, 12.15, 0, w, th, HD * 2 - 0.1, c, f)); };
// a muscle cuirass's chest and belly, on the front plate
function muscles(L, c) {
  for (const s of [-1, 1]) { L.push(box(s * 1.9, 8.8, HD + 0.2, 3.4, 2.4, 0.5, shade(c, 1.12), 'metal')); L.push(box(s * 1.9, 7.5, HD + 0.15, 3.2, 0.4, 0.4, shade(c, 0.75), 'metal')); }
  for (const y of [4.2, 5.6]) for (const s of [-1, 1]) L.push(box(s * 1.05, y, HD + 0.15, 1.7, 1.1, 0.4, shade(c, 1.06), 'metal'));
  L.push(box(0, 3, HD + 0.15, 0.6, 0.6, 0.4, shade(c, 0.7), 'metal'));
}
// rows of overlapping scales on the front and back
function scales(L, cs, f, y0, y1, { hw = HW, hd = HD } = {}) {
  let row = 0;
  for (let y = y1 - 0.7; y > y0; y -= 1.15, row++) {
    for (let x = -hw + 0.8 + (row % 2) * 0.7; x < hw - 0.5; x += 1.45) {
      const c = cs[(row + Math.round(x * 3)) % cs.length];
      L.push(box(x, y, hd + 0.12, 1.35, 1.25, 0.45, c, f)); L.push(box(x, y, -hd - 0.12, 1.35, 1.25, 0.45, c, f));
    }
  }
}
const belt = (L, c, f = 'leather', y = 0.75, buckle = BRONZE) => { band(L, c, f, y, 1.5); L.push(box(0, y, HD + 0.5, 1.8, 1.5, 0.4, buckle, 'metal')); };
// ---- arm pieces (arm frame: x ±2, y 2..-10, z ±2; s: the outer side, -1 for the right arm)
function pauldron(L, s, c, f, { big = 1, layers = 2, trim = null } = {}) {
  L.push(box(s * 0.35, 2.55, 0, 4.5 * big, 1.1, 5.1 * big, c, f));
  L.push(box(s * 2.45, 1.2, 0, 0.7, 2.8 * big, 5 * big, c, f));
  for (let i = 1; i < layers; i++) L.push(box(s * 2.6, 1.2 - i * 1.6, 0, 0.6, 1.5, 4.6, shade(c, 0.9), f));
  if (trim) { L.push(box(s * 0.35, 3.05, 0, 4.6 * big, 0.4, 5.2 * big, trim, 'gold')); L.push(box(s * 2.75, 1.2, 0, 0.4, 2.6 * big, 5.1 * big, trim, 'gold')); }
}
const bracer = (L, c, f, { y = -6.8, h = 3.4, trim = null } = {}) => { L.push(box(0, y, 0, 4.8, h, 4.8, c, f)); if (trim) { L.push(box(0, y + h / 2 - 0.25, 0, 5, 0.5, 5, trim, 'gold')); L.push(box(0, y - h / 2 + 0.25, 0, 5, 0.5, 5, trim, 'gold')); } };
const sleeve = (L, c, f, y0 = 2.3, y1 = -3, w = 4.7) => L.push(box(0, (y0 + y1) / 2, 0, w, y0 - y1, w, c, f));
const glove = (L, c, f, cuff) => { L.push(box(0, -8.7, 0, 4.9, 3.2, 4.9, c, f)); L.push(box(0, -6.9, 0, 5.3, 1, 5.3, cuff ?? shade(c, 0.8), f)); };
// ---- leg pieces (leg frame: x ±2, y 0..-12, z ±2; s: the outer side, -1 for the right leg)
function greave(L, s, c, f, { y0 = -3, y1 = -8.4, trim = null, knee = true } = {}) {
  const h = y0 - y1, yc = (y0 + y1) / 2;
  L.push(box(0, yc, 2.25, 4.4, h, 0.7, c, f));
  L.push(box(s * 2.2, yc, 0.4, 0.6, h, 3.8, c, f)); L.push(box(-s * 2.15, yc, 0.4, 0.5, h, 3.8, c, f));
  if (knee) L.push(box(0, y0 + 0.2, 2.5, 3.6, 1.6, 0.6, shade(c, 1.12), f));
  if (trim) L.push(box(0, y1 + 0.3, 2.45, 4.5, 0.5, 0.6, trim, 'gold'));
}
// ---- the skirt panels (hips frame: the hip joint at y 0; the front panel at z > 2.3, the back at z < -2.3)
function strips(c, f, len, { trim = null, z = 2.6, n = 6, w = 8.8, alt = null } = {}) {
  const L = [], sw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + sw * (i + 0.5), l = len - (i % 2) * 0.5;
    L.push(box(x, 0.3 - l / 2, z, sw - 0.15, l, 0.5, alt && i % 2 ? alt : c, f));
    if (trim) L.push(box(x, 0.3 - l + 0.25, z + Math.sign(z) * 0.05, sw - 0.15, 0.5, 0.55, trim, 'gold'));
  }
  return L;
}
function panel(c, f, len, { trim = null, z = 2.65, w = 8.8, folds = null } = {}) {
  const L = [box(0, 0.3 - len / 2, z, w, len, 0.6, c, f)];
  if (folds) for (const x of [-2.6, 0, 2.6]) L.push(box(x, 0.3 - len / 2 - 0.4, z + Math.sign(z) * 0.32, 0.5, len - 1.2, 0.2, folds, f));
  if (trim) L.push(box(0, 0.3 - len + 0.35, z + Math.sign(z) * 0.05, w + 0.1, 0.7, 0.7, trim, f === 'cloth' ? 'cloth' : 'gold'));
  return L;
}
// ---- head pieces (head pixels: x ±4, y 0..8, z ±4; the face on +z, eyes at y 4)
function helmet(L, c, f, { crest = null, crest2 = null, tall = 1, cheek = true, ridge = null } = {}) {
  const d = shade(c, 0.72);
  L.push(box(0, 9, -0.2, 10, 3, 10, c, f)); L.push(box(0, 11, -0.3, 8.8, 1.2, 8.8, c, f)); L.push(box(0, 11.9, -0.3, 6.6, 0.8, 6.6, c, f));
  L.push(box(0, 7.8, -0.2, 10.2, 0.7, 10.2, d, f));
  L.push(box(0, 6.2, -4.8, 10, 4.4, 1.4, c, f));
  if (cheek) for (const s of [-1, 1]) { L.push(box(s * 4.8, 5.6, 1.4, 1.3, 5.4, 5.6, c, f)); L.push(box(s * 4.85, 3.2, 1.4, 1.4, 1, 5.8, d, f)); }
  L.push(box(0, 6.6, 4.8, 1.4, 3, 1.1, c, f));
  if (crest) for (let i = 0; i < 11; i++) { const a = i / 10 * Math.PI, hgt = (2.4 + Math.sin(a) * 3.2) * tall; L.push(box(0, 12 + hgt / 2 - 0.6 - (i < 2 || i > 9 ? 0.8 : 0), 4.2 - i * 1.05, 1.8, hgt, 1.1, i % 3 === 1 ? crest2 ?? shade(crest, 0.7) : crest, 'fur')); }
  if (ridge) for (let i = 0; i < 6; i++) L.push(box(0, 12.4 + (i % 2) * 0.5 + (i < 3 ? i * 0.4 : (5 - i) * 0.4), 3 - i * 1.4, 0.9, 1.6 + (i % 2), 1, ridge, f, [0.35, 0, 0]));
}
function hood(L, c, f, { rim = null, rf = 'fur', peak = true } = {}) {
  L.push(box(0, 8.6, -0.4, 10.6, 1.3, 10.2, c, f));                                // the crown
  for (const s of [-1, 1]) L.push(box(s * 4.95, 4.8, -0.6, 1.1, 8.2, 9.4, c, f));     // the sides
  L.push(box(0, 4.6, -4.9, 10.6, 8.4, 1.1, c, f));                                 // the back
  if (peak) L.push(box(0, 9.6, -2.8, 5, 1, 4.6, shade(c, 0.92), f));
  L.push(box(0, 0.4, -4.4, 10, 1.6, 2.2, shade(c, 0.9), f));                        // drape to the shoulders
  // the frame round the face: the forehead bar and the cheeks (the face stays clear: x ±3.8, y 0.6 .. 7.6)
  const r = rim ?? shade(c, 1.1), rff = rim ? rf : f;
  L.push(box(0, 8.4, 4.6, 10.2, 1.6, 1.2, r, rff));
  for (const s of [-1, 1]) L.push(box(s * 4.55, 4.4, 4.5, 1.5, 8.2, 1.2, r, rff));
}
function cap(L, c, { brim = null, logo = null } = {}) {
  const dk = shade(c, 0.72);
  L.push(box(0, 9.2, -0.3, 10.2, 2.4, 10, c, 'cloth')); L.push(box(0, 11, -0.4, 9, 1.2, 8.8, c, 'cloth')); L.push(box(0, 11.9, -0.5, 6.8, 0.8, 6.6, c, 'cloth'));
  L.push(box(0, 12.4, -0.5, 0.9, 0.5, 0.9, dk, 'cloth'));
  L.push(box(0, 8.3, 6.9, 9, 0.7, 4.8, brim ?? dk, 'cloth')); L.push(box(0, 8.1, -0.3, 10.3, 0.6, 10.1, dk, 'cloth'));
  if (logo) { L.push(box(0, 9.6, 4.75, 1.6, 1.4, 0.3, logo, 'gold')); for (const s of [-1, 1]) L.push(box(s * 1.5, 10, 4.75, 1.4, 0.7, 0.3, 0xf0f0f0, 'cloth')); }
}
// ---- capes (the chain hangs from the torso's back at the shoulders; segment lists are in the segment's frame, hanging down from y 0)
function cape(c, { trim = null, len = 13.5, w = 8.4, flare = 0.5, kind = 'cloth', f = 'cloth', alt = null } = {}) {
  const segs = [], n = 2, sh = len / n;
  for (let i = 0; i < n; i++) {
    const L = [], wi = w + flare * (i + 0.5);
    L.push(box(0, -sh / 2, -0.3, wi, sh + 0.1, 0.6, i % 2 && alt ? alt : c, f));
    if (kind === 'fur') for (let k = 0; k < 6; k++) L.push(box(-wi / 2 + 0.8 + k * (wi - 1.6) / 5, -sh * (0.25 + 0.5 * ((k + i) % 2)), -0.75, 1.4, 1.6, 0.5, shade(c, 0.85 + 0.1 * (k % 3)), 'fur'));
    if (kind === 'fleece') for (let k = 0; k < 5; k++) L.push(box(-wi / 2 + 1 + k * (wi - 2) / 4, -sh * (0.3 + 0.4 * ((k + i) % 2)), -0.8, 1.6, 1.6, 0.6, shade(c, 0.9 + 0.12 * (k % 2)), 'gem'));
    if (kind === 'wing') {
      // two wings folded down the back: a darker half each side, the finger bones fanning out from the middle
      for (const s of [-1, 1]) {
        L.push(box(s * wi / 4, -sh / 2, -0.62, wi / 2 - 0.3, sh - 0.2, 0.2, shade(c, s < 0 ? 1.15 : 0.9), f));
        for (const [x, r] of [[0.9, 0.08], [2.1, 0.18], [3.2, 0.25]]) L.push(box(s * x * wi / 8.4, -sh / 2, -0.78, 0.4, sh * 0.96, 0.3, alt ?? shade(c, 1.6), 'bone', [0, 0, s * r * (i ? 0.5 : 1)]));
      }
    }
    if (i === n - 1) {
      // the hem: blocks hanging from the cape's lower edge (each overlapping it), a wing's tips longest
      if (kind === 'wing') for (let k = 0; k < 4; k++) { const h = 1.6 + (k === 0 || k === 3 ? 1.2 : 0); L.push(box(-wi / 2 + wi / 8 + k * wi / 4, -sh + 0.4 - h / 2, -0.3, wi / 4 - 0.9, h, 0.5, c, f)); }
      else if (kind === 'fur') for (let k = 0; k < 5; k++) { const h = 1.6 + (k % 2) * 0.6; L.push(box(-wi / 2 + 0.9 + k * (wi - 1.8) / 4, -sh + 0.4 - h / 2, -0.3, 1.5, h, 0.6, shade(c, 0.85), 'fur')); }
      else if (trim) L.push(box(0, -sh + 0.4, -0.35, wi + 0.1, 0.8, 0.7, trim, f === 'cloth' ? 'cloth' : f));
    }
    segs.push(L);
  }
  return { segs, len, w };
}
// the bar the cape hangs from, across the back of the shoulders (torso frame)
const capeBar = (L, c, f = 'cloth', w = 8.6) => L.push(box(0, 11.5, -2.55, w, 1.1, 0.9, c, f));
// a quiver of arrows on the back, from the right hip to the left shoulder
function quiver(L, c, fletch) {
  L.push(box(1, 6.4, -3.4, 2.6, 9.5, 2.2, c, 'leather', [0, 0, -0.35]));
  L.push(box(1, 6.4, -2.6, 0.5, 11, 0.4, shade(c, 0.7), 'leather', [0, 0, -0.35]));
  for (const [x, y] of [[2.4, 11.4], [3.1, 11.2], [2, 10.6]]) L.push(box(x, y, -3.4, 0.6, 1.8, 0.6, fletch, 'cloth', [0, 0, -0.35]));
}

// ---- every armour item's look ----------------------------------------------------
// fam: family; build(): the pieces. Mirror-pairs use s = -1 for the right side.
const both = (fn) => { const R = [], Lf = []; fn(R, -1); fn(Lf, 1); return [R, Lf]; };
export const ARMOUR_LOOKS = {
  camp_shirt: { fam: 'clothes', build: () => ({}) },
  bronze_breastplate: { fam: 'plate', build: () => {
    const T = []; shell(T, BRONZE, 'metal', 1.4, 11.6); muscles(T, BRONZE); straps(T, LEATHER, 'leather'); belt(T, LEATHER);
    return { torso: T, front: strips(LEATHER, 'leather', 3.2), back: strips(LEATHER, 'leather', 3.2, { z: -2.6 }), covers: true };
  } },
  hermes_uniform: { fam: 'clothes', build: () => {
    const T = []; shell(T, NAVY, 'cloth', 1, 11.8, { open: 2 }); band(T, 0xf0f0f0, 'cloth', 7.2, 0.8);
    T.push(box(-2.4, 9.6, HD + 0.15, 1.6, 1.2, 0.3, GOLD, 'gold'));                       // the winged badge
    for (const s of [-1, 1]) T.push(box(-2.4 + s * 1.3, 10, HD + 0.15, 1.2, 0.6, 0.3, 0xf0f0f0, 'cloth'));
    for (let i = 0; i < 7; i++) T.push(box(-2.6 + i * 0.9, 10.6 - i * 1.35, HD + 0.35, 1.2, 1.2, 0.4, LEATHER, 'leather'));   // the satchel strap across the chest
    T.push(box(-2.2, 2.4, -HD - 0.7, 4, 3.6, 1.6, 0x8a5a2a, 'leather')); T.push(box(-2.2, 3.9, -HD - 0.8, 4.2, 0.8, 1.8, 0x6a4020, 'leather'));   // the satchel on the back
    const H = []; cap(H, NAVY, { logo: GOLD });
    return { torso: T, head: H, hair: 'cap', covers: true };
  } },
  linothorax: { fam: 'linen', build: () => {
    const T = []; shell(T, LINEN, 'cloth', 1.2, 11.4);
    for (const y of [3.2, 5.6, 8]) band(T, LINEN_D, 'cloth', y, 0.35);
    band(T, 0x2a4a8a, 'cloth', 1.5, 0.7); band(T, 0x2a4a8a, 'cloth', 11.1, 0.6);
    for (const s of [-1, 1]) T.push(box(s * 2.6, 12.1, 0, 2.6, 0.7, HD * 2 + 0.1, LINEN, 'cloth'));   // the shoulder yoke
    const [aR, aL] = both((L, s) => { L.push(box(s * 0.3, 2.45, 0, 4.4, 0.8, 5, LINEN, 'cloth')); L.push(box(s * 2.4, 1.3, 0, 0.6, 2.4, 4.8, LINEN, 'cloth')); L.push(box(s * 2.45, 0.2, 0, 0.6, 0.5, 4.9, 0x2a4a8a, 'cloth')); });
    return { torso: T, armR: aR, armL: aL, front: strips(LINEN, 'cloth', 4.6, { trim: 0x2a4a8a, alt: LINEN_D }), back: strips(LINEN, 'cloth', 4.6, { z: -2.6, trim: 0x2a4a8a, alt: LINEN_D }), covers: true };
  } },
  biker_jacket: { fam: 'clothes', build: () => {
    const K = 0x1c1a1e, T = []; shell(T, K, 'leather', 0.6, 11.9, { open: 2.2 });
    for (const s of [-1, 1]) { T.push(box(s * 1.6, 10.6, HD + 0.25, 1.4, 2.6, 0.5, 0x2a282e, 'leather', [0, 0, s * 0.35])); T.push(box(s * 1.2, 6, HD + 0.05, 0.25, 9, 0.4, 0xb8bcc4, 'silver')); }   // lapels, zips
    for (const [x, y] of [[-3, 9], [3, 9], [-3, 4], [3, 4]]) T.push(box(x, y, HD + 0.05, 0.5, 0.5, 0.35, 0xc8ccd4, 'silver'));
    // the war god's flames up the back
    for (const [x, h] of [[-2.4, 3], [-0.8, 4.6], [0.8, 3.8], [2.4, 2.6]]) T.push(box(x, 1.4 + h / 2, -HD - 0.1, 1.2, h, 0.35, 0xe84a14, 'ember'));
    for (const [x, h] of [[-1.6, 2], [0, 3], [1.6, 1.6]]) T.push(box(x, 1.4 + h / 2, -HD - 0.18, 0.7, h, 0.3, 0xffb030, 'ember'));
    const [aR, aL] = both((L) => { sleeve(L, K, 'leather', 2.4, -8.4, 4.75); L.push(box(0, -8, 0, 5, 0.7, 5, 0xb8bcc4, 'silver')); });
    return { torso: T, armR: aR, armL: aL, covers: true };
  } },
  hunter_parka: { fam: 'clothes', build: () => {
    const S = 0xc8d0dc, W = 0xf4f6f8, T = []; shell(T, S, 'cloth', 0.4, 12);
    T.push(box(0, 6.2, HD + 0.1, 0.4, 11, 0.3, 0x9aa4b4, 'silver')); band(T, W, 'fur', 0.6, 1.2);
    quiver(T, 0x8a96a8, W);
    const [aR, aL] = both((L) => { sleeve(L, S, 'cloth', 2.4, -7.6, 4.75); L.push(box(0, -7.6, 0, 5.2, 1.2, 5.2, W, 'fur')); });
    const H = []; hood(H, S, 'cloth', { rim: W });
    return { torso: T, armR: aR, armL: aL, head: H, hair: 'hood', front: panel(S, 'cloth', 3.6, { trim: W }), back: panel(S, 'cloth', 3.6, { z: -2.65, trim: W }), covers: true };
  } },
  sea_armor: { fam: 'scale', build: () => {
    const cs = [0x2a9a8a, 0x3ab8a0, 0x1f7f78, 0x48c8b0], T = []; shell(T, 0x1f6f6a, 'metal', 1.2, 11.6); scales(T, cs, 'metal', 1.4, 11.4);
    band(T, 0x9af0e0, 'gem', 11.4, 0.5);
    T.push(box(0, 8.6, HD + 0.55, 2.4, 2, 0.4, GOLD, 'gold')); for (const x of [-0.8, 0, 0.8]) T.push(box(x, 9.9, HD + 0.55, 0.4, 0.9, 0.35, GOLD, 'gold'));   // a shell clasp, a trident mark
    // scallop-shell shoulder plates: ridged fans
    const [aR, aL] = both((L, s) => { for (let i = 0; i < 4; i++) L.push(box(s * (0.2 + i * 0.6), 2.7 - i * 0.55, 0, 1.2, 1, 5.2 - i * 0.4, i % 2 ? 0x3ab8a0 : 0x2a9a8a, 'metal')); L.push(box(s * 2.5, 0.8, 0, 0.6, 2.6, 4.8, 0x1f7f78, 'metal')); bracer(L, 0x1f7f78, 'metal', { trim: 0x9af0e0 }); });
    return { torso: T, armR: aR, armL: aL, front: strips(0x2a9a8a, 'metal', 3, { alt: 0x1f7f78 }), back: strips(0x2a9a8a, 'metal', 3, { z: -2.6, alt: 0x1f7f78 }), covers: true };
  } },
  hoplite_panoply: { fam: 'plate', build: () => {
    const T = []; shell(T, BRONZE, 'metal', 1.2, 11.7); muscles(T, BRONZE); band(T, BRONZE_D, 'metal', 1.5, 0.6); straps(T, BRONZE_D, 'metal');
    const [aR, aL] = both((L, s) => { pauldron(L, s, BRONZE, 'metal', { layers: 1 }); bracer(L, BRONZE, 'metal'); });
    const [lR, lL] = both((L, s) => greave(L, s, BRONZE, 'metal'));
    const H = []; helmet(H, BRONZE, 'metal', { crest: CRIMSON });
    return { torso: T, armR: aR, armL: aL, legR: lR, legL: lL, head: H, hair: 'helmet', front: strips(LEATHER, 'leather', 4, { trim: BRONZE }), back: strips(LEATHER, 'leather', 4, { z: -2.6, trim: BRONZE }), covers: true };
  } },
  spartan_cloak: { fam: 'cloak', build: () => {
    const T = []; for (const s of [-1, 1]) for (let i = 0; i < 7; i++) T.push(box(s * (-2.7 + i * 0.9), 10.8 - i * 1.4, HD + 0.2, 1.1, 1.1, 0.4, LEATHER, 'leather'));   // a harness crossed on the chest
    T.push(box(0, 6.6, HD + 0.4, 1.6, 1.6, 0.4, BRONZE, 'metal'));
    band(T, CRIMSON, 'cloth', 1, 1.6);
    capeBar(T, CRIMSON); for (const s of [-1, 1]) T.push(box(s * 3, 11.5, HD - 0.1, 1.6, 1.6, 0.8, BRONZE, 'metal'));   // the brooches
    T.push(box(0, 12.15, 0, 7.6, 0.6, HD * 2 + 1, CRIMSON, 'cloth'));
    const [aR, aL] = both((L) => bracer(L, LEATHER, 'leather', { trim: BRONZE_D }));
    return { torso: T, armR: aR, armL: aL, cape: cape(CRIMSON, { trim: 0x6a0c10, len: 14 }) };
  } },
  satyr_vest: { fam: 'clothes', build: () => {
    const G1 = 0x4a7a2a, G2 = 0x6a9a3a, T = []; shell(T, G1, 'cloth', 2, 11.8, { open: 2.6 });
    for (let y = 2.6; y < 11.4; y += 1.3) for (const x of [-3.6, -2.4, 2.4, 3.6]) T.push(box(x, y, HD + 0.08, 1, 0.5, 0.3, (Math.round(y) + x) % 2 ? G2 : 0x3a5a1e, 'cloth'));   // the weave
    for (const [x, y, z, r] of [[-3.4, 12.3, 1.4, 0.4], [3.4, 12.3, -1.4, -0.4], [-3.4, 2.2, HD + 0.2, 0.6], [3.4, 2.8, -HD - 0.2, -0.5], [-2, 2, HD + 0.3, 0.2]]) T.push(box(x, y, z, 1.8, 0.4, 1.2, 0x6ab83a, 'cloth', [0, 0, r]));   // leaves
    for (const [x, y, c] of [[-3, 10.4, 0xf06aa0], [3.2, 6, 0xf0d040], [-3.4, 5, 0xf0f0f0]]) T.push(box(x, y, HD + 0.35, 0.8, 0.8, 0.4, c, 'cloth'));   // flowers
    const [aR, aL] = both((L, s) => { L.push(box(0, -6.4, 0, 4.7, 1, 4.7, G1, 'cloth')); L.push(box(s * 2.5, -6.2, 1, 0.5, 1.2, 1.6, 0x6ab83a, 'cloth')); });
    return { torso: T, armR: aR, armL: aL, covers: true };
  } },
  nemean_pelt: { fam: 'pelt', build: () => {
    const F = 0xd8a030, M = 0xb87818, D = 0x8a5a14, T = [];
    // the mane round the shoulders and the forepaws knotted on the chest
    for (let i = 0; i < 9; i++) { const x = -4 + i; T.push(box(x, 11.9 + (i % 2) * 0.4, -HD - 0.3, 1.4, 1.6, 1.2, i % 2 ? M : D, 'fur')); }
    for (const s of [-1, 1]) { T.push(box(s * 3.4, 11.6, 0, 1.6, 1.4, HD * 2 + 0.6, M, 'fur')); for (let i = 0; i < 3; i++) T.push(box(s * (2.6 - i * 0.7), 10 - i * 1.4, HD + 0.3, 1.6, 1.6, 0.6, F, 'fur')); T.push(box(s * 0.6, 6.4, HD + 0.45, 1.4, 1.2, 0.6, F, 'fur')); }
    for (const x of [-0.9, -0.3, 0.3, 0.9]) T.push(box(x, 5.7, HD + 0.6, 0.3, 0.5, 0.3, 0xf0e8d0, 'bone'));   // claws
    capeBar(T, M, 'fur');
    // the lion's head as a hood: the brow and muzzle over the forehead, ears, the upper fangs
    const H = []; hood(H, F, 'fur', { rim: M });
    H.push(box(0, 9.6, 3.6, 7, 2.2, 3.4, F, 'fur')); H.push(box(0, 9.1, 5.6, 3.6, 1.8, 2, 0xc89028, 'fur')); H.push(box(0, 9.8, 6.7, 1.6, 1, 0.6, 0x3a2414, 'leather'));
    for (const s of [-1, 1]) { H.push(box(s * 2.2, 10.6, 4.9, 1.2, 0.9, 0.8, 0x1a1008, 'leather')); H.push(box(s * 1.2, 7.4, 5.2, 0.6, 1.6, 0.6, 0xf0e8d0, 'bone')); H.push(box(s * 3.9, 10, 0.6, 1.6, 1.8, 1, F, 'fur')); H.push(box(s * 3.9, 10.9, 0.6, 1, 0.8, 0.6, 0x8a5a14, 'fur')); }
    for (let i = 0; i < 7; i++) H.push(box(-4.8 + i * 1.6, 10, -4.6, 1.6, 2.2, 1.6, i % 2 ? M : D, 'fur'));
    return { torso: T, head: H, hair: 'hood', cape: cape(F, { kind: 'fur', len: 10.5, w: 8.6, flare: 0.8 }), covers: true };
  } },
  fleece_cloak: { fam: 'pelt', build: () => {
    const G = 0xf0c040, G2 = 0xe0a828, T = [];
    for (let i = 0; i < 6; i++) T.push(box(-3.5 + i * 1.4, 11.6 + (i % 2) * 0.5, HD + 0.2, 1.6, 1.8, 0.8, i % 2 ? G : G2, 'gem'));   // the woolly mantle
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) T.push(box(s * 3.6, 11.8 - i * 0.3, -1.6 + i * 1.6, 1.6, 1.6, 1.6, i % 2 ? G : G2, 'gem'));
    T.push(box(0, 10.6, HD + 0.7, 1.4, 1.4, 0.4, 0xfff0a0, 'glow'));
    capeBar(T, G2, 'gem');
    return { torso: T, cape: cape(G, { kind: 'fleece', len: 11.5, w: 8.4, flare: 0.6, f: 'gem', alt: G2 }) };
  } },
  forge_apron: { fam: 'clothes', build: () => {
    const A = 0x5a3a24, T = [];
    T.push(box(0, 6.6, HD - 0.25, 6.6, 9.6, 0.7, A, 'leather'));                        // the bib
    T.push(box(0, 4.4, HD + 0.2, 4, 2.6, 0.4, 0x4a2e1c, 'leather'));                    // its pocket, tongs in it
    T.push(box(-1, 6.6, HD + 0.25, 0.4, 2.6, 0.4, 0x5a5a62, 'iron')); T.push(box(-0.3, 6.6, HD + 0.25, 0.4, 2.4, 0.4, 0x5a5a62, 'iron'));
    for (const s of [-1, 1]) T.push(box(s * 2.6, 12.1, 0, 1.2, 0.6, HD * 2 + 0.2, A, 'leather'));   // straps over the shoulders
    band(T, A, 'leather', 1.4, 0.9);
    for (const [x, y] of [[2.2, 9.4], [-2.4, 3], [1.6, 2.4]]) T.push(box(x, y, HD + 0.15, 0.5, 0.5, 0.3, 0xff8a2a, 'glow'));   // embers in the leather
    const [aR, aL] = both((L) => glove(L, 0x4a2e1c, 'leather', 0x7a4a2a));
    return { torso: T, armR: aR, armL: aL, front: panel(A, 'leather', 7.4, { trim: 0x3a2214, w: 7.2 }) };
  } },
  amazon_armor: { fam: 'plate', build: () => {
    const R = 0x8a1a1a, T = []; shell(T, R, 'leather', 1.2, 11.6);
    scales(T, [GOLD, GOLD_D], 'gold', 6, 11, { hw: 3.6 });
    belt(T, GOLD_D, 'gold', 1.2, GOLD);
    quiver(T, R, 0xe8c060);
    const aR = [], aL = []; bracer(aR, GOLD, 'gold'); bracer(aL, GOLD, 'gold'); pauldron(aL, 1, GOLD, 'gold', { layers: 2 });   // one shoulder plate, on the shield arm
    const [lR, lL] = both((L) => { for (let y = -4; y > -9; y -= 1.4) L.push(box(0, y, 0, 4.6, 0.6, 4.6, LEATHER, 'leather')); });   // laced leg wraps
    return { torso: T, armR: aR, armL: aL, legR: lR, legL: lL, front: strips(R, 'leather', 3.8, { trim: GOLD }), back: strips(R, 'leather', 3.8, { z: -2.6, trim: GOLD }), covers: true };
  } },
  achilles_armor: { fam: 'legendary', build: () => {
    const G = 0xe0b040, T = []; shell(T, G, 'gold', 1.2, 11.7); muscles(T, G);
    band(T, ROYAL, 'gem', 1.6, 0.7); band(T, ROYAL, 'gem', 11.5, 0.5);
    // a gorgon's face on the chest: Hephaestus's work
    T.push(box(0, 8.2, HD + 0.55, 2.4, 2.4, 0.4, 0xf0d070, 'gold')); for (const s of [-1, 1]) { T.push(box(s * 0.5, 8.6, HD + 0.78, 0.4, 0.4, 0.2, 0xff3a2a, 'glow')); T.push(box(s * 1.5, 9.4, HD + 0.6, 0.8, 0.5, 0.4, 0x3a7a2a, 'metal', [0, 0, s * 0.6])); }
    capeBar(T, ROYAL);
    // lion-headed shoulder plates, gold bracers and greaves
    const [aR, aL] = both((L, s) => { pauldron(L, s, G, 'gold', { trim: 0xfff0b0 }); L.push(box(s * 2.95, 1.4, 0, 0.5, 1.4, 1.6, 0xb88a2a, 'gold')); bracer(L, G, 'gold', { trim: ROYAL }); });
    const [lR, lL] = both((L, s) => greave(L, s, G, 'gold', { trim: ROYAL }));
    const H = []; helmet(H, G, 'gold', { crest: 0xf4f4f0, crest2: ROYAL, tall: 1.25 });
    return { torso: T, armR: aR, armL: aL, legR: lR, legL: lL, head: H, hair: 'helmet', front: strips(ROYAL, 'cloth', 4.4, { trim: G }), back: strips(ROYAL, 'cloth', 4.4, { z: -2.6, trim: G }), cape: cape(ROYAL, { trim: G, len: 14, f: 'cloth' }), covers: true };
  } },
  hebe_robe: { fam: 'robe', build: () => {
    const P = 0xf0b0a8, P2 = 0xe09a92, T = []; shell(T, P, 'cloth', 0.4, 10.6);
    T.push(box(-2.6, 11.2, 0, 2.6, 1.6, HD * 2 + 0.1, P, 'cloth'));                   // draped over one shoulder
    for (let i = 0; i < 4; i++) T.push(box(-2.6 + i * 1.3, 10.4 - i * 0.6, HD + 0.1, 1.4, 1, 0.4, P2, 'cloth'));
    band(T, GOLD, 'gold', 7.2, 0.5); band(T, GOLD, 'gold', 0.7, 0.6);
    for (const x of [-2, 0, 2]) T.push(box(x, 3.8, HD + 0.1, 0.4, 5.5, 0.2, P2, 'cloth'));
    const [aR, aL] = both((L) => L.push(box(0, -1.6, 0, 4.7, 1, 4.7, GOLD, 'gold')));
    return { torso: T, armR: aR, armL: aL, front: panel(P, 'cloth', 8.4, { trim: GOLD, folds: P2 }), back: panel(P, 'cloth', 8.4, { z: -2.65, trim: GOLD, folds: P2 }), covers: true };
  } },
  wind_cloak: { fam: 'cloak', build: () => {
    const B = 0x9ac8f0, W = 0xf4f8ff, T = [];
    capeBar(T, B); T.push(box(0, 11.9, HD + 0.2, 2, 1.4, 0.5, 0xd8e0e8, 'silver')); for (const s of [-1, 1]) T.push(box(s * 1.4, 12.1, HD + 0.25, 1.2, 0.5, 0.4, W, 'cloth', [0, 0, s * 0.5]));   // a feather clasp
    for (const s of [-1, 1]) T.push(box(s * 3.4, 11.9, 0, 1.8, 0.7, HD * 2 + 0.6, B, 'cloth'));
    const [aR, aL] = both((L, s) => { bracer(L, B, 'cloth', { y: -6.6, h: 3 }); for (let i = 0; i < 3; i++) L.push(box(s * 2.5, -5.4 - i * 1.1, 1.4 - i * 1.3, 0.4, 0.5, 1.4, W, 'cloth')); });
    const C = cape(B, { trim: W, len: 14, flare: 1 }); C.segs[0].push(box(-2.4, -3.4, -0.65, 2.2, 0.5, 0.2, W, 'cloth', [0, 0, 0.5])); C.segs[1].push(box(2, -2.6, -0.65, 2.6, 0.5, 0.2, W, 'cloth', [0, 0, -0.5]));   // swirls of wind
    return { torso: T, armR: aR, armL: aL, cape: C };
  } },
  hermes_cap: { fam: 'cloak', build: () => {
    const B = 0x7a5a3a, W = 0xf6f6f2, T = []; capeBar(T, B); for (const s of [-1, 1]) T.push(box(s * 3.4, 11.9, 0, 1.8, 0.7, HD * 2 + 0.6, B, 'cloth'));
    T.push(box(0, 11.6, HD + 0.2, 1.4, 1.4, 0.4, GOLD, 'gold'));
    // the petasos: a low crown, a round brim, white wings at its sides
    const H = [box(0, 8.7, -0.2, 11.4, 0.6, 11.2, 0x8a6a3a, 'cloth'), box(0, 9.8, -0.3, 9, 1.8, 8.8, 0x9a7a48, 'cloth'), box(0, 10.9, -0.3, 6.6, 0.7, 6.6, 0x9a7a48, 'cloth')];
    for (const s of [-1, 1]) { H.push(box(s * 4.7, 10.6, -0.8, 0.6, 2, 3.2, W, 'cloth')); H.push(box(s * 4.8, 11.9, -1.6, 0.5, 1.6, 2.6, W, 'cloth')); H.push(box(s * 4.9, 12.9, -2.4, 0.5, 1.2, 1.8, 0xe8e8e0, 'cloth')); }
    // little wings at the ankles
    const [lR, lL] = both((L, s) => { L.push(box(0, -6.8, 0, 4.8, 0.8, 4.8, GOLD, 'gold')); L.push(box(s * 2.7, -6.2, -0.6, 0.5, 1.8, 2.4, W, 'cloth')); L.push(box(s * 2.8, -5.2, -1.6, 0.4, 1.4, 1.8, W, 'cloth')); });
    return { torso: T, legR: lR, legL: lL, head: H, hair: 'cap', cape: cape(B, { trim: GOLD, len: 11, flare: 0.4 }) };
  } },
  counsellor_vest: { fam: 'clothes', build: () => {
    const O = 0xf07a14, T = []; shell(T, O, 'cloth', 2, 11.7, { open: 2 });
    band(T, 0xe8eef0, 'silver', 4.4, 0.6); band(T, 0xe8eef0, 'silver', 6.4, 0.6);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) T.push(box(s * (2.2 - i * 0.35), 11.6 - i * 1.1, HD + 0.2, 0.5, 1.2, 0.3, 0x2a4a9a, 'cloth'));   // the lanyard
    T.push(box(0, 6, HD + 0.4, 0.9, 1.4, 0.7, 0xd8dee6, 'silver'));                 // the whistle
    T.push(box(2.6, 9.6, HD + 0.15, 1.6, 1, 0.3, 0xf8f8f8, 'cloth'));               // a name badge
    return { torso: T, covers: true };
  } },
  lotus_robe: { fam: 'robe', build: () => {
    const W = 0xf6f2ec, W2 = 0xe2dcd2, T = []; shell(T, W, 'fur', 0.4, 11.8);
    for (let i = 0; i < 5; i++) T.push(box(-1.6 + i * 0.4, 11 - i * 1.5, HD + 0.1, 1.6, 1.6, 0.5, W2, 'fur', [0, 0, 0.5]));   // the wrap's edge
    T.push(box(2.4, 8.6, HD + 0.15, 1.4, 1, 0.3, 0xf08aa8, 'cloth')); T.push(box(2.4, 9.3, HD + 0.15, 0.6, 0.6, 0.3, 0xf8b8c8, 'cloth'));   // the lotus
    band(T, 0xf08aa8, 'cloth', 3.6, 1);
    const [aR, aL] = both((L) => { sleeve(L, W, 'fur', 2.4, -7.2, 4.9); L.push(box(0, -7, 0, 5.3, 1.1, 5.3, W2, 'fur')); });
    return { torso: T, armR: aR, armL: aL, front: panel(W, 'fur', 8, { trim: W2 }), back: panel(W, 'fur', 8, { z: -2.65, trim: W2 }), covers: true };
  } },
  mist_cloak: { fam: 'cloak', build: () => {
    const G = 0x8a909a, G2 = 0xb8c0ca, T = []; capeBar(T, G);
    for (const s of [-1, 1]) T.push(box(s * 3, 11.6, 0, 3, 1.2, HD * 2 + 0.8, G, 'cloth'));   // the mantle
    for (const s of [-1, 1]) T.push(box(s * 3, 11.3, 3.05, 1.8, 0.4, 0.3, G2, 'gem'));
    const H = []; hood(H, G, 'cloth', { rim: shade(G, 0.85), rf: 'cloth' });
    H.push(box(-2, 9.4, -0.4, 3, 0.4, 3, G2, 'gem')); H.push(box(2.4, 6, -5.5, 2.4, 0.4, 0.3, G2, 'gem'));   // wisps of Mist
    const C = cape(G, { trim: G2, len: 14, flare: 1.2, alt: blend(G, G2, 0.3) }); C.segs[1].push(box(-1.8, -3, -0.65, 3, 0.4, 0.2, G2, 'gem')); C.segs[0].push(box(2, -4, -0.65, 2.6, 0.4, 0.2, G2, 'gem'));
    return { torso: T, head: H, hair: 'hood', cape: C };
  } },
  fury_wings: { fam: 'legendary', build: () => {
    const D = 0x2a1a2e, T = [];
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) T.push(box(s * (-2.7 + i * 0.9), 10.8 - i * 1.4, HD + 0.2, 1.1, 1.1, 0.4, 0x3a2a24, 'leather'));   // the harness
    T.push(box(0, 6.6, HD + 0.4, 1.8, 1.8, 0.5, 0xe8dcc0, 'bone'));
    capeBar(T, D, 'leather');
    for (const s of [-1, 1]) { T.push(box(s * 4.5, 12.6, -2.9, 1, 2.2, 1, 0xe8dcc0, 'bone')); T.push(box(s * 4.7, 14, -2.9, 0.7, 1, 0.7, 0x5a4a3a, 'bone')); }   // the wings' wrists above the shoulders (beside the head, not behind it)
    return { torso: T, cape: cape(D, { kind: 'wing', len: 12.5, w: 8.4, flare: 1.2, f: 'leather', alt: 0x8a7a72 }) };
  } },
  hellhound_hide: { fam: 'pelt', build: () => {
    const K = 0x1a1618, K2 = 0x2e2628, T = [];
    for (let i = 0; i < 9; i++) T.push(box(-4 + i, 11.8 + (i % 2) * 0.5, -HD - 0.3, 1.3, 1.6, 1.1, i % 2 ? K : K2, 'fur'));
    for (const s of [-1, 1]) { T.push(box(s * 3.3, 11.6, 0, 1.8, 1.5, HD * 2 + 0.7, K, 'fur')); for (let i = 0; i < 3; i++) T.push(box(s * (3.1 - i * 0.8), 10.4 - i * 1.2, HD + 0.3, 1.4, 1.4, 0.6, i % 2 ? K2 : K, 'fur')); }
    T.push(box(0, 8.6, HD + 0.2, 6, 0.6, 0.3, 0x5a3a24, 'leather'));
    capeBar(T, K, 'fur');
    const H = []; hood(H, K, 'fur', { rim: K2 });
    H.push(box(0, 9.4, 4.2, 6.4, 1.8, 2.4, K2, 'fur')); H.push(box(0, 9.2, 5.8, 3, 1.4, 1.6, K, 'fur')); H.push(box(0, 9.6, 6.7, 1.2, 0.8, 0.4, 0x0a0808, 'leather'));   // the hound's brow and snout
    for (const s of [-1, 1]) { H.push(box(s * 2, 10.4, 5.4, 1, 0.6, 0.4, 0xff2a1a, 'glow')); H.push(box(s * 3.3, 10.2, -0.6, 1.4, 2.4, 1.4, K, 'fur', [0, 0, s * 0.3])); H.push(box(s * 3.6, 11.6, -0.7, 0.9, 1.4, 0.9, K2, 'fur', [0, 0, s * 0.3])); }
    return { torso: T, head: H, hair: 'hood', cape: cape(K, { kind: 'fur', len: 11, w: 8.4, flare: 0.8 }), covers: true };
  } },
  drakon_scale: { fam: 'scale', build: () => {
    const cs = [0x2a4a2a, 0x3a5e32, 0x1e3a22, 0x4a6e3a], Y = 0xc8a83a, T = []; shell(T, 0x1e3a22, 'metal', 1, 11.8);
    scales(T, cs, 'metal', 1.2, 11.6);
    for (let i = 0; i < 4; i++) T.push(box(0, 2.6 + i * 2.2, HD + 0.5, 3.6 - i * 0.2, 1.8, 0.45, i % 2 ? Y : shade(Y, 0.85), 'gold'));   // the drakon's belly plates
    const [aR, aL] = both((L, s) => { pauldron(L, s, 0x2a4a2a, 'metal', { layers: 2 }); for (let i = 0; i < 3; i++) L.push(box(s * (0.6 + i * 0.9), 3.6, -1 + i, 0.7, 1.8, 0.7, 0xe8dcc0, 'bone', [0, 0, -s * 0.4])); bracer(L, 0x1e3a22, 'metal', { trim: Y }); });
    const [lR, lL] = both((L, s) => greave(L, s, 0x2a4a2a, 'metal', { trim: Y }));
    const H = []; helmet(H, 0x2a4a2a, 'metal', { ridge: 0xe8dcc0 });
    for (const s of [-1, 1]) H.push(box(s * 2.6, 8.6, 5.15, 0.8, 0.5, 0.3, 0xffd030, 'glow'));
    return { torso: T, armR: aR, armL: aL, legR: lR, legL: lL, head: H, hair: 'helmet', front: strips(0x2a4a2a, 'metal', 3.6, { alt: 0x1e3a22, trim: Y }), back: strips(0x2a4a2a, 'metal', 3.6, { z: -2.6, alt: 0x1e3a22, trim: Y }), covers: true };
  } },
};
export const ARMOUR_IDS = Object.keys(ARMOUR_LOOKS);
const cache = new Map();
// the pieces of an armour (cached: the lists are shared, never changed)
export function armourPieces(id) {
  if (!ARMOUR_LOOKS[id]) return null;
  if (!cache.has(id)) cache.set(id, ARMOUR_LOOKS[id].build());
  return cache.get(id);
}
