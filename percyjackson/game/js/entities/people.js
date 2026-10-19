// The open world's side-quest people: the campers, nymphs, hunters, gods'
// servants and shades who hand out quests in the regions (world/regions/*.js)
// and the locals at the Road West's stops (world/road/*.js). After the sheets
// design/concept/vox-ow-people-1.png (Katie, Travis, Juniper, Beckendorf, Lee,
// the Nereid), vox-ow-people-2.png (Coach Hedge, Zoë, Rachel, Quintus,
// Phoebe, Bianca, Charon, Sisyphus) and vox-ow-people-3.png (Argus, Silena and
// the seven Road West locals).
//
// Built like the mortals (mortals.js): a fine 128 × 128 painted skin, grid
// voxel hair, and block clothing and props merged into one vertex-coloured
// mesh per rig slot. The young ones (campers, nymphs, hunters) are painted
// like the heroes (models.js paintHumanoid: big eyes, the camp T-shirt and its
// pegasus); the grown-ups like the mortals (mortals.js paintPerson). Skins and
// geometry are built once per person and shared.
//
// A person: { painter: 'hero' | 'person', paint, body(S, D)?, hair (mortal hair
// shape) | vox (hero hair style), beard (three tones), tail ({ pivot, ...heroTail }),
// parts() { head, torso, hips, armR, armL, legR, legL: [boxes] }, glow
// ({ color, ei, parts() }: boxes that shine), scale, wide, rig (Rig spec), accent,
// tip ([slot, x, y, z, label]: where a held weapon points, for perf/weapons.cjs) }.
// Units: skin pixels (head parts in head pixels; the head runs y 0..8, front +z).
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX, markTip, mergeChildren } from './character.js';
import { cellMesh, heroHair, heroTail, footwear, beads } from './herovox.js';
import { paintHumanoid } from './models.js';
import { paintPerson, ADULT_SCALE, B, mirrorX, turn, band, shoes, strawHat, hairCells, beardCells, boxGeometry, mergeGeometries, inHead, shadeOf } from './mortals.js';
import { mulberry32 } from '../util.js';
import { markHeadwear } from './proportions.js';
import { t as txt } from '../text_config.js';

const HS = 1.12;   // the Rig's head scale
const KID = 1.18;  // the heroes' scale (the campers are their age)
const INK = 0x17130f, GOLD = 0xd8a840, BRONZE = 0xc9963a, SILVER = 0xc8c8d0;
const TEE = { top: 0xd84a04, shortSleeve: 4, pegasus: INK, collar: 0xb03e04, hem: 0x9a3604 };

// ---------------------------------------------------------------- helpers
const at = (list, [dx, dy, dz]) => list.map((b) => ({ ...b, at: [b.at[0] + dx, b.at[1] + dy, b.at[2] + dz] }));
// lumps of fur or foam round a limb's cross-section (w: half-width) at height y
function ring(y, w, cols, seed, { size = 1.3, step = 1.1, h = 1.6 } = {}) {
  const r = mulberry32(seed), L = [];
  for (let s = -w; s <= w + 0.01; s += step) {
    for (const [x, z] of [[s, w], [s, -w], [w, s], [-w, s]]) {
      const k = size * (0.8 + r() * 0.5);
      L.push(B([x + (r() - 0.5) * 0.3, y + (r() - 0.5) * 0.6, z + (r() - 0.5) * 0.3], [k, h * (0.8 + r() * 0.4), k], cols[Math.floor(r() * cols.length)]));
    }
  }
  return L;
}
// scale a list of boxes about a point
const grow = (list, k, [cx, cy, cz]) => list.map((b) => ({ ...b, at: [cx + (b.at[0] - cx) * k, cy + (b.at[1] - cy) * k, cz + (b.at[2] - cz) * k], size: b.size.map((v) => v * k) }));
// a line of lumps from p to q (fur trims, vines, braids)
function line(p, q, n, cols, seed, size = 1.2, jit = 0.25) {
  const r = mulberry32(seed), L = [];
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 0, s = size * (0.85 + r() * 0.3);
    L.push(B([p[0] + (q[0] - p[0]) * k + (r() - 0.5) * jit, p[1] + (q[1] - p[1]) * k + (r() - 0.5) * jit, p[2] + (q[2] - p[2]) * k + (r() - 0.5) * jit], [s, s, s], cols[Math.floor(r() * cols.length)]));
  }
  return L;
}
// a strap across the chest from the right shoulder to the left hip (back and front)
const sash = (col, w = 1.2) => [B([0.2, 6.6, 2.42], [w, 13, 0.4], col, [0, 0, 0.52]), B([0.2, 6.6, -2.42], [w, 13, 0.4], col, [0, 0, 0.52]), B([-2.4, 12.15, 0], [w, 0.4, 4.9], col)];
// a quiver on the back with fletched arrows over the right shoulder
function quiver(leather, fletch, { arrows = 4, tip = null } = {}) {
  const L = [B([0, 0, 0], [2.8, 9, 2.6], leather), B([0, 4.4, 0], [3, 0.8, 2.8], shadeOf(leather, 0.7)), B([0, -2, 1.35], [2.2, 0.5, 0.2], shadeOf(leather, 1.3))];
  for (let i = 0; i < arrows; i++) { const x = -0.9 + i * 0.6, z = (i % 2 ? 0.5 : -0.4); L.push(B([x, 5.6, z], [0.35, 3, 0.35], 0x8a6a3a), B([x, 7.4, z], [0.5, 1.8, 0.9], fletch)); if (tip) L.push(B([x, 8.5, z], [0.3, 0.5, 0.3], tip)); }
  return at(turn(L, [0, 0, -0.45]), [1.2, 7, -3.5]);
}
// a bow held in a hand, beside the arm on its outer side (s: -1 right, +1 left)
function bow(s, wood, grip, string = 0xf0ece0, { len = 8, bend = 2.6 } = {}) {
  const L = [];
  for (let i = -len; i <= len; i += 1) {
    const k = i / len, z = 0.6 - bend * k * k;
    L.push(B([s * 2.9, -9.8 + i, z], [0.8, 1.15, 0.9], Math.abs(i) <= 1 ? grip : wood));
  }
  L.push(B([s * 2.9, -9.8 + len + 0.6, 0.6 - bend], [0.7, 0.6, 1.2], grip), B([s * 2.9, -9.8 - len - 0.6, 0.6 - bend], [0.7, 0.6, 1.2], grip));
  L.push(B([s * 2.9, -9.8, 0.6 - bend], [0.15, len * 2, 0.15], string));
  return L;
}
// eyes drawn on the skin (Argus): white, a blue iris and a pupil under a lid
function eyeAt(D, x, y, skin, iris = 0x2a74e0) {
  D(x, y - 0.5, shadeOf(skin, 0.6), 3, 1);
  D(x, y, 0xfafaf6, 3, 2); D(x + 0.5, y, iris, 2, 2); D(x + 1, y + 0.5, 0x0c0c14, 1, 1); D(x + 0.5, y, 0xffffff, 1, 1);
}
// Hunters of Artemis: a silver-grey parka trimmed with white fur over dark
// clothes, a crescent moon on the left shoulder, belts, knee pads, fur-topped boots
const FUR = [0xf4f0e8, 0xe4ded2, 0xfaf8f2, 0xd8d2c4];
function hunterPaint(skin) {
  return { top: 0x2a2630, collar: false, jacket: 0x8e8e9a, jacketSleeve: 12, pants: 0x26242c, shoes: 0x18161a, sole: 0x3a3a3a, legSkin: skin };
}
function hunterBody(S, D) {
  const r = mulberry32(31);
  for (let i = 0; i < 90; i++) { const x = 16 + Math.floor(r() * 48) / 2, y = 36 + Math.floor(r() * 24) / 2; if (x >= 21.5 && x < 26.5 && y >= 36) continue; D(x, y, r() < 0.5 ? 0xb0b0ba : 0x70707c, 1, 1); }
  for (const [u, v] of [[40, 32], [48, 48]]) for (let i = 0; i < 30; i++) D(u + Math.floor(r() * 32) / 2, v + 4 + Math.floor(r() * 24) / 2, r() < 0.5 ? 0xb0b0ba : 0x70707c, 1, 1);
  // laced dark top: a silver chain and a darker V
  D(22.5, 20, 0x1a1820, 6, 6); D(23, 22, 0xa8a8b0, 4, 1);
}
function hunterParts({ seed = 1, belt = 0x5a3418, buckle = GOLD, bowSide = 0, quiverOn = true } = {}) {
  const leather = 0x6a3a1e;
  const parts = {
    torso: [
      // fur collar round the neck and down the open front
      ...line([-4, 12.2, -2.4], [4, 12.2, -2.4], 8, FUR, seed, 1.5), ...line([-4.3, 12.2, 0], [-4.3, 12.2, 2], 2, FUR, seed + 1, 1.5), ...line([4.3, 12.2, 0], [4.3, 12.2, 2], 2, FUR, seed + 2, 1.5),
      ...line([-2.4, 12, 2.6], [-2.2, 5, 2.6], 7, FUR, seed + 3, 1.2), ...line([2.4, 12, 2.6], [2.2, 5, 2.6], 7, FUR, seed + 4, 1.2),
      // belt and pouch, a strap over the chest
      B([0, 1.2, 0], [8.8, 1.2, 4.8], belt), B([0, 1.2, 2.5], [1.6, 1.3, 0.4], buckle), B([3.2, 0.6, 2.6], [1.8, 2, 0.8], leather), B([-3.4, 2, 2.5], [1.4, 1.6, 0.6], leather),
      ...sash(leather, 1),
      ...(quiverOn ? quiver(leather, 0xf0ece4, { tip: SILVER }) : []),
    ],
    hips: [
      // the parka's skirt to mid-thigh, open at the front, trimmed with fur
      ...mirrorX([B([-3, -2.2, 0], [3, 4.4, 4.9], 0x8a8a96), B([-3.4, -4.6, 0], [2.4, 0.9, 5], FUR[1])]), B([0, -2.2, -2.3], [8.6, 4.4, 0.6], 0x8a8a96), B([0, -4.6, -2.4], [8.8, 0.9, 0.8], FUR[1]),
      B([0, -1, 2.4], [8.6, 0.8, 0.4], shadeOf(belt, 0.8)),
    ],
    armL: [
      // the crescent moon on the left shoulder
      B([2.4, -0.5, 0], [0.3, 3, 3], 0x6a6a74), ...[[-1.1, 0.9], [-0.2, 1.3], [0.8, 1], [1.3, 0.1], [1.1, -0.9], [0.3, -1.4], [-0.6, -1.1]].map(([z, y]) => B([2.6, -0.5 + y, z], [0.2, 0.7, 0.7], 0xf4f0e8)),
      ...ring(-6.4, 2.2, FUR, seed + 5), B([0, -8.6, 0], [4.6, 2.2, 4.6], 0x1e1c22), B([1.2, -9.6, 2.2], [1.6, 0.6, 0.4], 0x2a2830),
    ],
    armR: [...ring(-6.4, 2.2, FUR, seed + 6), B([0, -8.6, 0], [4.6, 2.2, 4.6], 0x1e1c22), B([-1.2, -9.6, 2.2], [1.6, 0.6, 0.4], 0x2a2830)],
    legR: [...shoes('boot', { upper: 0x1a181c, sole: 0x3a3836, lace: 0x5a5650 }), ...ring(-6.2, 2.3, FUR, seed + 7, { h: 1.8 }), B([0, -4.2, 2.3], [3.2, 2.2, 0.8], 0x1c1a20), B([0, -1.6, 0], [4.7, 0.6, 4.7], leather), B([-2.4, -1.6, 0.6], [0.4, 1.8, 1.6], leather)],
    legL: [...shoes('boot', { upper: 0x1a181c, sole: 0x3a3836, lace: 0x5a5650 }), ...ring(-6.2, 2.3, FUR, seed + 8, { h: 1.8 }), B([0, -4.2, 2.3], [3.2, 2.2, 0.8], 0x1c1a20)],
  };
  if (bowSide) parts[bowSide < 0 ? 'armR' : 'armL'].push(...bow(bowSide, 0xd8d4cc, 0x6a3a1e, 0xf4f0e8));
  return parts;
}
// a laurel circlet of silver leaves round the head, a gem at the front
function circlet(col = SILVER, { y = 7.3, gem = null, r = 6.8 } = {}) {
  // (only the front arc: round the back it would sit inside the hair)
  const L = [];
  for (let i = -5; i <= 5; i++) {
    const a = i * 0.2, x = Math.sin(a) * r, z = Math.cos(a) * r - 0.6;
    L.push(B([x, y + 0.8 + (i % 2 ? 0.4 : 0), z], [1.5, 0.9, 1.1], i % 2 ? col : shadeOf(col, 0.8), [0, a, i % 2 ? 0.45 : -0.45]));
  }
  if (gem) L.push(B([0, y + 1.2, r - 0.2], [1.4, 1.4, 0.5], col), B([0, y + 1.2, r + 0.05], [0.7, 0.7, 0.3], gem));
  return L;
}

// ---------------------------------------------------------------- the people
export const PEOPLE = {
  // ------------------------------------------------ vox-ow-people-1
  // Katie Gardner, daughter of Demeter: a brown braid under a straw hat, green
  // overalls over the camp shirt, a trowel and a basket of strawberries
  fields_katie: {
    painter: 'hero', scale: KID, accent: 0x5fae4a,
    paint: { skinTone: 0xe6a070, hair: 0x6a3818, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x6a3a1a, pupil: 0x1a0c06, brow: 0x5a2a10, lashes: true, mouth: 'smile', lip: 0xc0645a, freckles: 0xc4805a, ...TEE, pants: 0x5a6c38, shorts: 4, shoes: 0x6a3a1a, sole: 0xd8c8a0 },
    body(S, D) {
      // overall bib and straps over the shirt, front and back
      const g = 0x5a6c38, gd = 0x44542a;
      S.rect(21, 23, 6, 9, g, 0.08); S.rect(21, 20, 1, 3, g, 0.05); S.rect(26, 20, 1, 3, g, 0.05);
      S.rect(33, 25, 6, 7, g, 0.08); S.rect(33, 20, 1, 5, g, 0.05); S.rect(38, 20, 1, 5, g, 0.05);
      S.rect(16, 29, 24, 3, g, 0.08);
      D(22, 25, gd, 8, 1); D(22, 25, gd, 1, 6); D(25.5, 25, gd, 1, 6); D(22, 27.5, gd, 8, 1);   // bib pocket
      for (let y = 23.5; y < 32; y += 1) { D(21, y, 0xe0b050, 1, 1); D(26.5, y, 0xe0b050, 1, 1); }
    },
    vox: { style: 'long', base: 0x6a3818, shade: 0x40200c, light: 0x8e5028, seed: 101, shape: { helmetFront: false, top: 8, side: 1, back: -1, r: [5.8, 6, 5.8] } },
    parts() {
      const braid = [0x6a3818, 0x40200c, 0x8e5028];
      const B2 = [];
      // the braid: from behind her right ear, over the shoulder and down the front
      for (let i = 0; i < 10; i++) { const k = i / 9, x = -4.7 + k * 1.3 + (i % 2) * 0.45, z = i < 3 ? 1 + i * 0.6 : 2.6; B2.push(B([x, 3 - i * 1.3, z], [1.8, 1.6, 1.6], braid[i % 3])); }
      B2.push(B([-3.2, -10.2, 2.7], [1.4, 0.6, 1.4], 0xe8c040), B([-3.2, -11.2, 2.7], [1.7, 1.4, 1.5], braid[2]));
      return {
        hat: [
          ...strawHat({ brim: 17.6, crown: 9.4, crownH: 3, straw: 0xe4c27a, band: 0x3e7a3a, seed: 4 }),
          B([-2.8, 10.4, 5.05], [2.4, 0.8, 0.5], 0xf8f6ee), B([-2.8, 10.4, 5.05], [0.8, 2.4, 0.5], 0xf8f6ee), B([-2.8, 10.4, 5.35], [0.9, 0.9, 0.3], 0xf0c020), B([-1.2, 10, 4.9], [1.6, 0.8, 0.5], 0x3a8a3a), B([-4.2, 9.9, 4.8], [1.4, 0.8, 0.6], 0x3a8a3a),
        ],
        head: [
          ...B2,
          ...mirrorX([B([-4.3, 3, 1.4], [0.4, 1, 0.5], 0x4a9a4a)]),
        ],
        torso: [
          ...beads([GOLD, 0xe8c060], { y: 11.4, z: 2.4, n: 7 }).map((b) => ({ ...b, size: [0.55, 0.55, 0.5] })),
          ...mirrorX([B([-2.25, 10.8, 2.42], [0.9, 2.4, 0.4], 0x5a6c38), B([-2.25, 9.6, 2.65], [0.7, 0.7, 0.3], GOLD), B([-2.25, 12.15, 0], [0.9, 0.4, 4.8], 0x5a6c38)]),
          B([0, 1.2, 0], [8.8, 1, 4.8], 0x5a3418), B([0, 1.2, 2.5], [1.4, 1.1, 0.3], GOLD),
          // tool pouch on the left hip with a pencil and a trowel handle
          B([3.6, 0.2, 2.2], [2, 2.6, 1.2], 0x8a6a3a), B([3.3, 1.8, 2.2], [0.4, 1.4, 0.4], 0x3a6ad8), B([3.9, 1.9, 2.4], [0.4, 1.6, 0.4], 0xe0b020),
        ],
        armR: [
          // a trowel, blade up, in front of the fist
          B([0, -10, 2.4], [1.1, 3.4, 1.1], 0x2e6a3a), B([0, -8.1, 2.4], [1.2, 0.6, 1.2], 0xa8a8b0), B([0, -7.4, 2.5], [0.5, 1, 0.5], 0xa8a8b0),
          B([0, -5.2, 2.6], [2.8, 3.6, 0.4], 0x9a9aa4), B([0, -3, 2.6], [1.8, 1, 0.4], 0x9a9aa4), B([0, -2.3, 2.6], [0.8, 0.6, 0.4], 0xb8b8c0), B([0, -5.2, 2.85], [0.4, 3.2, 0.1], 0x7a7a84),
        ],
        armL: [
          band(-6.4, 1.2, 0x3e6a3a, 4.6),
          // a wicker basket of strawberries and daisies hanging from the hand
          ...grow([
          ...[-2.4, 2.4].map((z) => B([0, -11.4, 1.2 + z * 0.9], [0.6, 3.6, 0.6], 0x9a6a30)), B([0, -10, 1.2], [0.7, 0.6, 4.6], 0x9a6a30),
          ...Array.from({ length: 4 }, (_, i) => B([0, -13.5 - i * 0.9, 1.2], [5.6 - (i === 3 ? 0.6 : 0), 0.9, 5.4 - (i === 3 ? 0.6 : 0)], i % 2 ? 0xb88a48 : 0x9a6a30)),
          B([0, -12.9, 1.2], [5.8, 0.5, 5.6], 0x7a5228),
          ...[[-1.4, 0.2], [1, -0.6], [0.2, 1.8], [-1.6, 2.4], [1.6, 1.6]].map(([x, z]) => B([x, -12.3, 1.2 + z], [1.4, 1.5, 1.4], 0xd8202a)),
          ...[[-1.4, 0.2], [1, -0.6], [0.2, 1.8]].map(([x, z]) => B([x, -11.5, 1.2 + z], [0.9, 0.4, 0.9], 0x3a8a2a)),
          B([-2, -12.2, -0.6], [1.6, 0.8, 1.6], 0x3a8a2a), B([1.8, -12.2, 3], [1.6, 0.8, 1.4], 0x4a9a3a), B([1.2, -11.9, 0.4], [1.2, 0.4, 1.2], 0xf8f6ee), B([1.2, -11.7, 0.4], [0.5, 0.3, 0.5], 0xf0c020), B([-1.8, -11.9, 3.3], [1.2, 0.4, 1.2], 0xf8f6ee),
          ], 1.3, [0, -10, 1.2]),
        ],
        legR: [...shoes('boot', { upper: 0x7a4a24, sole: 0xd8c8a0, lace: GOLD }), band(-6.1, 1.6, 0xf0ead8, 4.7), band(-5.8, 0.5, 0x3e7a3a, 4.8)],
        legL: [...shoes('boot', { upper: 0x7a4a24, sole: 0xd8c8a0, lace: GOLD }), band(-6.1, 1.6, 0xf0ead8, 4.7), band(-5.8, 0.5, 0x3e7a3a, 4.8), B([2.5, -8.4, 1.4], [0.4, 1.2, 1.2], 0x3a8a3a)],
      };
    },
  },
  // Travis Stoll, son of Hermes: a lanky prankster, curly brown hair and a
  // grin, torn jeans and high-tops, a satchel full of something not his
  fields_travis: {
    painter: 'hero', scale: KID, rig: { legH: 13 }, accent: 0x4ad0ff,
    paint: { skinTone: 0xe6a676, hair: 0x5a3018, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x1f9a6a, pupil: 0x0a3020, brow: 0x3a1c0a, scowl: true, mouth: 'grin', ...TEE, pants: 0x3a5888, torn: true, legSkin: 0xe6a676, shoes: 0x1c1a20, sole: 0xf0ece0 },
    body(S, D) {
      // more rips in the jeans, and their faded knees
      for (const [u, v] of [[0, 16], [16, 48]]) { D(u + 4.5, v + 4 + 2, 0xd8d0c0, 4, 2); D(u + 5, v + 4 + 2.5, 0xe6a676, 2, 1); D(u + 9, v + 4 + 8, 0xd8d0c0, 3, 1); }
    },
    vox: { style: 'mop', base: 0x6e3818, shade: 0x3e1c0a, light: 0x9a5a2c, warm: 0xb06a34, seed: 113, shape: { r: [6.6, 5.6, 6.6], tuft: 0.36, spike: 0.16, bump: 0.5, fringe: 6 } },
    parts() {
      const strap = 0x4a2a14, bag = 0x6a4420;
      return {
        torso: [
          ...beads([0x2ab0a0, 0xe86a2a, 0xf0e0b0, 0x2a8a6a, 0xd84a1a], { y: 11.4, z: 2.4, n: 7 }),
          ...sash(strap, 1.1),
          B([0, 1.2, 0], [8.8, 1, 4.8], 0x4a2a14), B([-1.4, 1.2, 2.5], [1.4, 1.1, 0.3], GOLD),
          // the satchel on his left hip, a rolled scroll poking out, a gold winged charm
          B([4.8, 0.4, 0.8], [2.2, 4.2, 4.6], bag), B([4.9, 2.2, 0.8], [2.4, 1, 4.8], shadeOf(bag, 0.75)), B([6, 1.2, 0.8], [0.3, 0.9, 0.9], GOLD),
          B([4.6, 3.4, -0.6], [1.2, 2.6, 1.2], 0xf0e6c8, [0.4, 0, 0]), B([4.6, 4.6, -1.1], [1.3, 0.4, 1.3], 0xd8c8a0, [0.4, 0, 0]),
          B([1.4, 4, 2.65], [1, 1.6, 0.3], 0xf0c040), B([0.8, 4.4, 2.65], [0.6, 0.9, 0.3], 0xf0c040), B([2, 4.4, 2.65], [0.6, 0.9, 0.3], 0xf0c040),
        ],
        armR: [band(-6.6, 1.6, 0x2a2420, 4.6), B([-2.4, -6.6, 0], [0.3, 1, 1], 0x5a5048)],
        armL: [band(-6.6, 0.9, 0x2a7a8a, 4.6)],
        legR: [...footwear('hitop', { upper: 0x1c1a20, sole: 0xf0ece0, lace: 0xe8dcc0 }), band(-7.4, 1.4, 0x4a6898, 4.8)],
        legL: [...footwear('hitop', { upper: 0x1c1a20, sole: 0xf0ece0, lace: 0xe8dcc0 }), band(-7.4, 1.4, 0x4a6898, 4.8)],
      };
    },
  },
  // Juniper, a dryad: green-tinged skin, leaf-green hair with berries and
  // flowers, a dress of juniper needles bound with vines, vine sandals
  woods_juniper: {
    painter: 'hero', scale: KID, accent: 0x6ad04a,
    paint: { skinTone: 0xb4c470, hair: 0x3a6a2a, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x1f9a4a, pupil: 0x0a3018, brow: 0x2e5a1e, lashes: true, mouth: 'smile', lip: 0x8a9a4a, cheeks: 0xc8b070, top: 0x3e6e2a, sleeve: 0xb4c470, shortSleeve: 0, collar: false, pants: 0xb4c470, shoes: 0xb4c470 },
    body(S, D) {
      for (const [u, v] of [[0, 16], [16, 48]]) { S.rect(u, v + 4, 16, 10, 0xb4c470, 0.04); S.rect(u + 8, v, 4, 4, 0xb4c470, 0.04); }   // bare legs (no jeans seams)
      // needle-leaves over the bodice and a vine across it
      const r = mulberry32(5), greens = [0x2e5a1e, 0x4e8a32, 0x6aa040, 0x24461a];
      for (let i = 0; i < 160; i++) D(16 + Math.floor(r() * 48) / 2, 20 + Math.floor(r() * 24) / 2, greens[Math.floor(r() * 4)], 1, 2);
      S.rect(16, 20, 24, 1, 0xb4c470, 0.04);
      for (let i = 0; i < 14; i++) D(20.5 + i * 0.5, 21 + i * 0.75, 0x6a4020, 1, 2);
      // vines wound round the legs
      for (const [u, v] of [[0, 16], [16, 48]]) for (let y = v + 6; y < v + 15; y += 2.5) { D(u, y, 0x6a4020, 32, 1); D(u, y + 0.5, 0x4a8a2a, 8, 1); }
    },
    vox: { style: 'long', base: 0x3e6e2a, shade: 0x22441a, light: 0x6a9a3a, warm: 0x8aa040, seed: 127, shape: { helmetFront: false, tuft: 0.28, spike: 0.12, bump: 0.5, c: [0, 4, -1.2], r: [6.6, 7.4, 6.4], side: -4, back: -5, top: 10.6 } },
    parts() {
      const r = mulberry32(17), leaves = [0x2e5a1e, 0x3e7a2a, 0x5a9636, 0x24461a, 0x4a8a2a], L = [];
      // a crown of berries and little flowers in the hair
      for (let i = 0; i < 9; i++) { const a = -1.4 + i * 0.35, x = Math.sin(a) * 5, z = Math.cos(a) * 4.6; L.push(B([x, 9.4 + r() * 0.8, z - 0.6], [1, 1, 1], i % 3 === 1 ? 0xf4f0e0 : [0x3a3a9a, 0x5a3a8a, 0x2a4aa8][i % 3])); }
      L.push(B([1.8, 10.2, 3.2], [0.8, 0.8, 0.8], 0xf0c030));
      // the skirt: overlapping leaf blades in rings to a jagged hem
      const skirt = [];
      for (let ringI = 0; ringI < 3; ringI++) {
        const y = -0.6 - ringI * 2.2, w = 4.6 + ringI * 0.45, d = 2.6 + ringI * 0.4;
        for (let s = -w; s <= w; s += 1.2) for (const z of [d, -d]) skirt.push(B([s, y - r() * 0.8, z], [1.3, 2.8 + r() * 1.2, 0.7], leaves[Math.floor(r() * 5)], [0, 0, (r() - 0.5) * 0.4]));
        for (let s = -d; s <= d; s += 1.2) for (const x of [w, -w]) skirt.push(B([x, y - r() * 0.8, s], [0.7, 2.8 + r() * 1.2, 1.3], leaves[Math.floor(r() * 5)], [(r() - 0.5) * 0.4, 0, 0]));
      }
      skirt.push(B([0, -2.8, 0], [8.6, 5.6, 4.6], 0x2e5a1e));
      skirt.push(B([-1, -2.2, 3.4], [1.2, 1.2, 0.6], 0xf4f0e0), B([-1, -2.2, 3.7], [0.5, 0.5, 0.3], 0xf0c030), B([2.6, -5.2, 3.6], [0.9, 0.9, 0.9], 0x3a3a9a));
      return {
        head: [...L, ...mirrorX([B([-4.5, 4.4, 0.6], [0.8, 1.6, 1.4], 0xb4c470), B([-4.9, 5.4, 0.2], [0.6, 1, 0.8], 0xb4c470)])],
        torso: [...line([-4.2, 11.6, 2.4], [4.2, 3, 2.4], 9, [0x6a4020, 0x5a3418], 3, 0.8, 0.15), ...line([3.6, 12, 2.3], [3.6, 12, -2.3], 4, leaves, 4, 1.4)],
        hips: skirt,
        // a sprig of juniper with berries in her right hand
        armR: [band(-6, 0.7, 0x6a4020, 4.6), ...line([0, -10.5, 2.4], [0, -5, 7], 8, [0x6a4020, 0x5a3418], 9, 0.9, 0.1), ...line([0.8, -8, 4], [1.6, -4.4, 7.6], 5, leaves, 10, 1.3), ...line([-0.8, -6.6, 5.6], [-1.6, -4, 7.2], 3, leaves, 11, 1.2), ...[[0.6, -5.4, 6.2], [-0.8, -4.6, 7.4], [1.4, -6.8, 5]].map((p) => B(p, [1, 1, 1], 0x4a4aa8))],
        armL: [band(-6, 0.7, 0x6a4020, 4.6), B([2.3, -6, 1], [0.4, 0.8, 0.8], 0x4a8a2a)],
        legR: [...shoes('sandal', { upper: 0x6a4020, sole: 0x4a2a14 }), B([0, -9.2, 0], [4.6, 0.5, 4.6], 0x6a4020)],
        legL: [...shoes('sandal', { upper: 0x6a4020, sole: 0x4a2a14 }), B([0, -9.2, 0], [4.6, 0.5, 4.6], 0x6a4020)],
      };
    },
  },
  // Charles Beckendorf, son of Hephaestus: big and broad, a leather smith's
  // apron and tool belt over the camp shirt, goggles up on his curls, a bronze wrench
  woods_beckendorf: {
    painter: 'hero', scale: 1.3, wide: 1.3, accent: 0xff8a2a,
    paint: { skinTone: 0x9a5a34, hair: 0x16100c, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a1a10, pupil: 0x0a0604, brow: 0x140c08, mouth: 'grin', lip: 0x6a2a1a, ...TEE, collar: 0xe8e0c8, pants: 0x5a5638, cargo: true, shoes: 0x4a2a14, sole: 0x2a1a10 },
    vox: { style: 'afro', base: 0x1e1612, shade: 0x0c0806, light: 0x3a2c22, seed: 131, shape: { r: [5.6, 4.6, 5.8], c: [0, 7.4, -0.6], tuft: 0.2, spike: 0.06, bump: 0.36 } },
    parts() {
      const lea = 0x6a3a1e, dk = 0x4a2814, bronze = 0xc08a24;
      return {
        head: [
          // goggles pushed up on the forehead, a strap round the head
          B([0, 8.3, 0], [9.2, 0.9, 9.2], 0x2a1a10),
          ...mirrorX([B([-1.9, 8.6, 4.6], [3, 2.6, 1.2], bronze), B([-1.9, 8.6, 5.25], [2, 1.6, 0.3], 0x1a2a30), B([-1.4, 9.1, 5.4], [0.6, 0.5, 0.1], 0x8ab8c8)]),
          B([0, 8.6, 4.8], [1, 0.8, 0.8], bronze),
        ],
        torso: [
          // the apron's bib, straps and buckles
          B([0, 6.6, 2.45], [6.4, 8.4, 0.5], lea), B([0, 10.6, 2.6], [6.4, 0.5, 0.3], dk), B([0, 7, 2.75], [3, 2.4, 0.2], dk), B([0, 8.1, 2.8], [3, 0.3, 0.2], shadeOf(lea, 1.3)),
          ...mirrorX([B([-2.8, 11.2, 2.4], [1.2, 2.2, 0.4], lea), B([-2.8, 12.2, 0], [1.2, 0.4, 4.8], lea), B([-2.8, 10.4, 2.7], [1, 1, 0.3], GOLD), B([-2.8, 8, -2.4], [1.2, 9, 0.4], lea, [0, 0, -0.3])]),
          B([0, 0.9, 0], [8.8, 1.6, 4.9], dk), B([0, 0.9, 2.55], [2, 1.5, 0.4], GOLD), B([0, 0.9, 2.75], [1, 0.7, 0.2], dk),
          B([3.8, -0.2, 2.6], [1.6, 2.4, 1], lea), B([3.8, 0.8, 3.15], [0.8, 0.6, 0.2], GOLD), B([-3.8, -0.4, 2.6], [1.6, 2.6, 1], lea), B([-3.9, 1.6, 2.7], [0.5, 1.6, 0.5], 0x9a9aa4),
          ...[-1.4, 1.4].map((x) => B([x, 12.25, -0.2], [2, 0.4, 2], 0xe8e0c8)),
        ],
        hips: [
          // the apron's skirt to the knee with a hammer loop and a hanging ring
          B([0, -4.3, 2.75], [7.4, 9, 0.6], lea), B([0, -8.7, 2.8], [7.4, 0.4, 0.6], dk), B([2.2, -2, 3.15], [2.2, 2.2, 0.3], dk),
          B([-1.6, -3.6, 3.2], [0.4, 1.8, 0.3], GOLD), B([-1.6, -4.6, 3.2], [1.4, 0.4, 0.3], GOLD), B([-1.6, -5.2, 3.2], [0.4, 0.8, 0.3], GOLD),
          B([4.8, -1.8, 1.6], [1.4, 3.4, 2], lea), B([-4.8, -1.8, 1.6], [1.4, 3.4, 2], lea),
        ],
        // leather gauntlets with brass studs; a big bronze wrench, jaws up, in his right hand
        armR: [band(-0.6, 1.2, 0xe8e0c8, 4.7), band(-7.6, 3.6, dk, 4.7), B([-2.4, -7, 1], [0.3, 0.8, 0.8], GOLD), B([0, -10, 2.6], [1.5, 4.4, 1.5], bronze), B([0, -6.2, 2.6], [1.6, 3.6, 1.6], bronze),
          B([0, -3.6, 2.6], [3.8, 2, 1.8], bronze), B([-1.2, -1.8, 2.6], [1.2, 2.4, 1.8], bronze), B([1.2, -1.8, 2.6], [1.2, 2.4, 1.8], bronze), B([0, -13, 2.6], [2.6, 1.6, 1.8], shadeOf(bronze, 0.8))],
        armL: [band(-0.6, 1.2, 0xe8e0c8, 4.7), band(-7.6, 3.6, dk, 4.7), B([2.4, -7, 1], [0.3, 0.8, 0.8], GOLD)],
        legR: [...shoes('boot', { upper: 0x5a3418, sole: 0x2a1a10, lace: GOLD }), B([0, -10.4, 2.6], [4.8, 1.8, 1.4], 0xd09624), band(-6.2, 1.4, 0x6a6448, 4.9), B([0, -8.2, 2.4], [1.2, 1, 0.4], GOLD)],
        legL: [...shoes('boot', { upper: 0x5a3418, sole: 0x2a1a10, lace: GOLD }), B([0, -10.4, 2.6], [4.8, 1.8, 1.4], 0xd09624), band(-6.2, 1.4, 0x6a6448, 4.9), B([0, -8.2, 2.4], [1.2, 1, 0.4], GOLD)],
      };
    },
  },
  // Lee Fletcher, son of Apollo: sandy curls with a laurel sprig, the camp
  // shirt and jeans, bracers, a sun medallion, a quiver and a shining golden bow
  shore_lee: {
    painter: 'hero', scale: KID, accent: 0xffd84a,
    paint: { skinTone: 0xe8a676, hair: 0xd8a44a, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x2a6ad8, pupil: 0x0a1a4a, brow: 0xb07a2a, mouth: 'smile', ...TEE, pants: 0x3a5a8e, shoes: 0xe8a676 },
    vox: { style: 'messy', base: 0xd8a44a, shade: 0xa8742a, light: 0xf4d27a, seed: 139, shape: { tuft: 0.22, spike: 0.06, r: [6.4, 5.6, 6.4] } },
    parts() {
      const lea = 0x6a3a1e;
      return {
        head: [...[[-4.6, 10.6, 4.4], [-3.4, 11.4, 4.8], [-2.2, 11.9, 5], [-5.4, 9.8, 3.6], [-1, 12.2, 5]].map((p, i) => B(p, [1.6, 0.7, 1], i % 2 ? 0x3a7a2a : 0x5a9a3a, [0, 0.5, 0.3]))],
        torso: [
          ...sash(lea, 1.1), B([-1.6, 9.3, 2.75], [2.2, 2.2, 0.4], GOLD), B([-1.6, 9.3, 2.95], [1.2, 1.2, 0.2], 0xf0c838),
          B([0, 1.2, 0], [8.8, 1.1, 4.8], lea), B([0.6, 1.2, 2.5], [1.6, 1.2, 0.3], GOLD),
          ...quiver(lea, 0xffd84a, { tip: GOLD }),
        ],
        hips: [B([-3.4, -1.6, 1.4], [1.4, 2.6, 2], lea), B([-3.4, -3.2, 1.4], [1.6, 0.5, 2.2], GOLD)],
        armR: [band(-6.8, 3.2, lea, 4.7), band(-5.4, 0.5, GOLD, 4.8), B([-2.45, -7.2, 0.6], [0.3, 0.8, 0.8], GOLD)],
        armL: [band(-6.8, 3.2, lea, 4.7), band(-5.4, 0.5, GOLD, 4.8)],
        legR: [...shoes('sandal', { upper: 0x6a3a1e, sole: 0x4a2a14 }), band(-8.4, 1.2, 0x6a3a1e, 4.7), B([0, -8.4, 2.4], [1.2, 1, 0.3], GOLD)],
        legL: [...shoes('sandal', { upper: 0x6a3a1e, sole: 0x4a2a14 }), band(-8.4, 1.2, 0x6a3a1e, 4.7), B([0, -8.4, 2.4], [1.2, 1, 0.3], GOLD)],
      };
    },
    glow: { color: 0xffb820, ei: 1.1, parts: () => ({ armL: bow(1, 0xe8b830, 0x8a5a20, 0xfff0a0, { len: 9, bend: 2.8 }) }) },
  },
  // Galene, a Nereid: long sea-green curls crowned with pearls and a shell, a
  // foam-white robe with a sea-green drape, pearls, and the sea curling round her
  shore_nereid: {
    painter: 'hero', scale: ADULT_SCALE, accent: 0x4ad0ff,   // (round 9: a Nereid is a grown woman: an adult's size)
    paint: { skinTone: 0xe6a478, hair: 0x1a8a7a, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x1a8a9a, pupil: 0x0a2a30, brow: 0x147060, lashes: true, mouth: 'smile', lip: 0xd0705a, blush: true, top: 0xf2f0e8, sleeve: 0xe6a478, shortSleeve: 0, collar: false, pants: 0xe6a478, shoes: 0xe6a478 },
    body(S, D) { S.rect(16, 20, 24, 2, 0xe6a478, 0.04); D(16, 22, 0xd8d4c8, 48, 1); for (const [u, v] of [[0, 16], [16, 48]]) S.rect(u, v + 4, 16, 10, 0xe6a478, 0.04); },
    vox: { style: 'long', base: 0x1a8a7a, shade: 0x0e5a50, light: 0x3ab0a0, seed: 149, shape: { helmetFront: false, top: 9.8, c: [0, 3.6, -1.2], tuft: 0.24, spike: 0.08, bump: 0.46, r: [6.6, 7.6, 6.4], side: -5, back: -7 } },
    tail: { pivot: [0, 6, -4.4], base: 0x1a8a7a, shade: 0x0e5a50, light: 0x3ab0a0, length: 16, width: 4.4, back: 1 },
    parts() {
      const pearl = [0xf8f6ee, 0xe8e4dc], teal = 0x2a8a7a, foam = [0xf4f2ea, 0xe4f0ec, 0xfaf8f4];
      const robe = [], r = mulberry32(23);
      // the robe to the ankles, a sea-green drape over it, foam at the hem
      robe.push(B([0, -5.5, 0], [9.6, 11, 5.4], 0xeeece4), B([0, -9.4, 0], [10.4, 3.4, 6], 0xf2f0ea));
      robe.push(B([0, -4.4, 2.8], [6.4, 7.6, 0.4], teal), B([1.6, -8.4, 3.05], [3.2, 1.8, 0.4], teal), B([-2.4, -4, -2.8], [4, 7, 0.4], teal));
      for (let s = -5; s <= 5; s += 1.1) for (const z of [3, -3]) robe.push(B([s, -11.2 - r() * 0.6, z], [1.3, 1.2, 0.8], foam[Math.floor(r() * 3)]));
      for (let s = -2.8; s <= 2.8; s += 1.2) for (const x of [5.2, -5.2]) robe.push(B([x, -11.2 - r() * 0.6, s], [0.8, 1.2, 1.3], foam[Math.floor(r() * 3)]));
      robe.push(B([0, -0.2, 0], [9.8, 1, 5.6], 0xc9a040), B([0, -0.2, 2.9], [1.6, 1.6, 0.4], GOLD), B([-3, -0.5, 2.9], [1.6, 1.4, 0.3], 0xf0d0b8));
      for (let i = 0; i < 8; i++) robe.push(B([-4 + i * 1.2, -1 - Math.sin(i / 7 * Math.PI) * 1.4, 3.05], [0.7, 0.7, 0.5], pearl[i % 2]));
      return {
        head: [
          ...circlet(0xf8f6ee, { y: 8.2 }), B([0.6, 10.2, 2.4], [2.6, 2.2, 0.8], 0xf0d0b8), B([0.6, 10.2, 2.85], [2, 1.6, 0.2], 0xf8e4d0),
          ...mirrorX([B([-4.4, 2.6, 1.6], [0.6, 0.6, 0.6], 0xf8f6ee), B([-4.4, 1.8, 1.6], [0.5, 0.8, 0.5], 0x4ad0e0)]),
        ],
        torso: [
          ...beads(pearl, { y: 11.4, z: 2.35, n: 9 }).map((b) => ({ ...b, size: [0.7, 0.7, 0.6] })),
          B([0, 9.3, 2.45], [6.8, 0.5, 0.3], 0xd8d4c8), ...mirrorX([B([-2.6, 10.6, 2.3], [0.5, 2.4, 0.3], 0xf2f0e8)]),
        ],
        hips: robe,
        armR: [...ring(-7.4, 2.3, pearl, 41, { size: 0.9, step: 1.1, h: 0.9 }), ...ring(-1.6, 2.3, pearl, 42, { size: 0.8, step: 1.4, h: 0.8 })],
        armL: [...ring(-7.4, 2.3, pearl, 43, { size: 0.9, step: 1.1, h: 0.9 })],
        legR: [...shoes('sandal', { upper: 0xf0ece4, sole: 0x8a6a4a }), ...ring(-9.2, 2.3, pearl, 44, { size: 0.8, step: 1.4, h: 0.8 })],
        legL: [...shoes('sandal', { upper: 0xf0ece4, sole: 0x8a6a4a }), ...ring(-9.2, 2.3, pearl, 45, { size: 0.8, step: 1.4, h: 0.8 })],
      };
    },
    // the sea, curling round her in a spiral of glassy blue cubes
    glow: {
      color: 0x2a9aff, ei: 1.1,
      parts: () => {
        const L = [], r = mulberry32(61);
        for (let i = 0; i < 44; i++) { const k = i / 44, a = k * Math.PI * 3.4 + 0.6, rad = 6.6 + Math.sin(k * 9) * 0.6; L.push(B([Math.cos(a) * rad, -9 + k * 22, Math.sin(a) * rad * 0.8], [1.2, 1.2, 1.2], [0x8ad8ff, 0x5ab8ff, 0xc8f0ff][i % 3], [r() * 0.5, r(), 0])); }
        for (let i = 0; i < 8; i++) L.push(B([(r() - 0.5) * 16, -2 + r() * 18, (r() - 0.5) * 10], [0.8, 0.8, 0.8], 0xa8e4ff));
        return { hips: L };
      },
    },
  },
  // ------------------------------------------------ vox-ow-people-2
  // Coach Gleeson Hedge, satyr: a red tracksuit with white stripes, a whistle,
  // a cap with a red trident, a beard, horns, goat legs and a club
  canyon_hedge: {
    painter: 'hero', scale: 1.18, wide: 1.15, accent: 0xff4a2a,   // (round 9: a short grown satyr, his skull level with Percy's: 1.08 → 1.18)
    tip: ['armR', 0, 0.6, 2.6, 'club'],
    paint: { skinTone: 0xd8885a, hair: 0x3a2210, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x3a2414, brow: 0x2a1408, scowl: true, mouth: 'grin', top: 0xf0e4c8, collar: false, jacket: 0xc8241e, jacketSleeve: 12, pants: 0xc8241e, shorts: 8, goat: [0x6a4020, 0x4a2a14], belt: 0x3a2214 },
    body(S, D) {
      // white stripes down the sleeves and trouser legs, zip edges, cuffs
      for (const [u, v, s] of [[40, 32, 0], [48, 48, 8], [40, 16, 0], [32, 48, 8]]) { D(u + s + 1, v + 4, 0xf4f0e8, 1, 18); D(u + s + 2, v + 4, 0xf4f0e8, 1, 18); }
      for (const [u, v, s] of [[0, 16, 0], [16, 48, 8]]) { D(u + s + 1, v + 4, 0xf4f0e8, 1, 15); D(u + s + 2, v + 4, 0xf4f0e8, 1, 15); }
      D(21.5, 36, 0xf4f0e8, 1, 24); D(26, 36, 0xf4f0e8, 1, 24);
    },
    vox: { style: 'shaggy', base: 0x3a2210, shade: 0x1e1006, light: 0x5a3818, seed: 151, cap: true, beard: { length: 2.6, mouth: 0.6 }, shape: { side: 0, back: -2, r: [6.8, 5.6, 6.6] } },
    parts() {
      const red = 0xc8241e, white = 0xf4f0e8;
      const cap = [
        B([0, 9.2, -0.4], [9.8, 2.4, 9.6], red), B([0, 10.9, -0.5], [8.6, 1.2, 8.4], red), B([0, 11.8, -0.6], [6.4, 0.8, 6.2], red),
        B([0, 9.8, 4.4], [8.6, 3.4, 0.8], white), B([0, 8.2, 6.6], [9, 0.7, 4.8], red), B([0, 12.3, -0.6], [0.9, 0.5, 0.9], white),
        // the red trident on the cap's white front
        B([0, 9.7, 4.9], [0.5, 2.6, 0.2], red), B([0, 9.1, 4.9], [2.4, 0.5, 0.2], red), B([-1, 10, 4.9], [0.5, 1.4, 0.2], red), B([1, 10, 4.9], [0.5, 1.4, 0.2], red),
      ];
      const horn = [0x8a5a2a, 0x6a4020, 0x4a2a14];
      for (const s of [-1, 1]) cap.push(B([s * 4.8, 9.6, 0.8], [1.8, 2, 2], horn[0]), B([s * 5.6, 11, 0.2], [1.6, 1.8, 1.8], horn[1]), B([s * 5.9, 12.3, -0.9], [1.4, 1.4, 1.6], horn[1]), B([s * 5.6, 12.6, -2.2], [1.2, 1.2, 1.2], horn[2]), B([s * 5.2, 11.9, -3], [1, 1, 1], horn[2]));
      return {
        hat: cap,   // (the cap and the horns through it)
        head: mirrorX([B([-4.6, 4.4, 0.4], [1.2, 1.4, 1.2], 0xd8885a), B([-5.3, 4.8, 0.2], [0.8, 0.8, 0.8], 0xd8885a)]),
        torso: [
          // the jacket's collar, the whistle on its cord
          ...mirrorX([B([-2.8, 12.1, 0.6], [2.4, 1.2, 4], red), B([-2.6, 11.2, 2.5], [1.8, 2, 0.5], red, [0, 0, -0.3]), B([-2.25, 6, 2.5], [0.4, 11, 0.4], white)]),
          ...line([-1.6, 11.8, 2.45], [0, 7.4, 2.45], 5, [0x141414], 3, 0.4, 0), ...line([1.6, 11.8, 2.45], [0, 7.4, 2.45], 5, [0x141414], 4, 0.4, 0),
          B([0, 6.4, 2.65], [1.4, 1.8, 0.8], 0xe0b030), B([0, 7.4, 2.65], [0.8, 0.5, 0.5], 0xe0b030),
          B([0, 0.6, 2.5], [1.4, 1, 0.4], GOLD), B([-0.6, -0.3, 2.5], [0.3, 1.6, 0.3], white), B([0.6, -0.3, 2.5], [0.3, 1.6, 0.3], white),
        ],
        hips: [B([0, -1.6, -2.8], [1.4, 1.4, 1.6], 0x5a3418), B([0, -3, -3.6], [1.2, 1.8, 1.2], 0x4a2a14)],
        // a knobbly wooden club in his right fist
        armR: [band(-7.5, 1.4, white, 4.7), band(-8.3, 0.6, red, 4.75), B([0, -11.8, 2.6], [1.5, 4, 1.5], 0x6a4020), ...line([0, -9, 2.6], [0, 0, 2.6], 6, [0x8a5a2a, 0x7a4a22, 0x9a6a34], 7, 2.6, 0.3), ...[[1.4, -6, 2.6], [-1.4, -3.6, 2.4], [0.6, -1.4, 3.8], [-0.8, -7.8, 3.6], [1.2, -2.6, 1.4]].map((p) => B(p, [1, 1, 1], 0x5a3418))],
        armL: [band(-7.5, 1.4, white, 4.7), band(-8.3, 0.6, red, 4.75)],
        legR: [...footwear('hoof', { upper: 0x2a1c16, seed: 7 }), band(-3.6, 1.2, red, 4.8), band(-4.2, 0.4, white, 4.85)],
        legL: [...footwear('hoof', { upper: 0x2a1c16, seed: 8 }), band(-3.6, 1.2, red, 4.8), band(-4.2, 0.4, white, 4.85)],
      };
    },
  },
  // Zoë Nightshade, lieutenant of the Hunt: long dark curls under a silver
  // circlet, the Hunters' silver parka, a silver bow
  zoe: {
    painter: 'hero', scale: KID, accent: 0xc8d8ff,
    paint: { skinTone: 0xc68a60, hair: 0x1e1410, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x3a2214, pupil: 0x0a0604, brow: 0x1a100a, lashes: true, scowl: true, mouth: 'small', lip: 0x8a4a3a, ...hunterPaint(0xc68a60) },
    body: hunterBody,
    vox: { style: 'long', base: 0x24180e, shade: 0x0e0a06, light: 0x40301e, seed: 163, shape: { helmetFront: false, top: 9.6, c: [0, 3.8, -1.2], tuft: 0.2, spike: 0.06, bump: 0.44, r: [6.6, 7.4, 6.4], side: -4, back: -6 } },
    parts() { const p = hunterParts({ seed: 70, bowSide: 1 }); p.head = circlet(SILVER, { y: 7.6, gem: 0xe8f0ff }); return p; },
  },
  // Rachel Elizabeth Dare: a mass of red curls, freckles, the camp shirt,
  // paint-spattered jeans, red sneakers, a sketchbook and a backpack
  rachel: {
    painter: 'hero', scale: 1.14, accent: 0x4ae0a0,
    paint: { skinTone: 0xf0b88e, hair: 0xc8501a, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x6a3a1a, pupil: 0x1a0c06, brow: 0xa8401a, lashes: true, mouth: 'smile', lip: 0xd0705a, freckles: 0xd08a5a, ...TEE, pants: 0x4a6aa8, shoes: 0xc8282e, sole: 0xf0ece0 },
    body(S, D) {
      const r = mulberry32(9), cols = [0xf0c020, 0xe83a3a, 0x3ab06a, 0xe878b0, 0x3a8ae8, 0xf08a20];
      for (const [u, v] of [[0, 16], [16, 48]]) for (let i = 0; i < 16; i++) { const x = u + Math.floor(r() * 32) / 2, y = v + 4 + Math.floor(r() * 18) / 2, c = cols[Math.floor(r() * cols.length)]; D(x, y, c, 3, 3); D(x + 0.5, y - 0.5, c, 1, 1); D(x - 0.5, y + 0.5, c, 1, 1); D(x + 1, y + 1, c, 1, 1); }
      for (let i = 0; i < 4; i++) D(16 + Math.floor(r() * 48) / 2, 22 + Math.floor(r() * 18) / 2, cols[Math.floor(r() * cols.length)], 1, 1);
    },
    vox: { style: 'shaggy', base: 0xc8501a, shade: 0x8a2a0a, light: 0xe8803a, seed: 173, shape: { r: [7, 6.6, 6.8], c: [0, 6, -0.8], tuft: 0.26, spike: 0.1, bump: 0.46, side: -1, back: -3, fringe: 6.2 } },
    parts() {
      const olive = 0x5a6a34;
      return {
        torso: [
          // backpack straps and pack
          ...mirrorX([B([-2.6, 7.6, 2.42], [1.2, 8.8, 0.4], olive), B([-2.6, 12.15, 0], [1.2, 0.4, 4.8], olive), B([-2.6, 4.6, 2.65], [1.2, 0.6, 0.3], 0xb0b0b8)]),
          B([0, 6.4, -3.9], [7, 8.6, 3.4], olive), B([0, 10.2, -3.9], [7.2, 1.2, 3.6], shadeOf(olive, 0.75)), B([0, 4.4, -5.8], [5, 3.4, 0.8], shadeOf(olive, 0.85)), B([2.6, 7.6, -5.7], [0.8, 0.8, 0.3], GOLD),
          B([0, 1.2, 0], [8.8, 1, 4.8], 0x5a3418), B([-1, 1.2, 2.5], [1.4, 1, 0.3], 0xc8c8c8),
          ...beads([0xc8a060], { y: 11.4, z: 2.35, n: 5 }).map((b) => ({ ...b, size: [0.4, 0.4, 0.4] })),
        ],
        // a paintbrush in her right hand, the sketchbook under her left arm
        armR: [band(-6.6, 0.9, 0x2a3a6a, 4.6), B([0, -9.4, 2.6], [0.6, 0.6, 6], 0xe8e0d0, [0.6, 0, 0]), B([0, -7.6, 5.2], [0.7, 0.7, 1.2], 0xc8c8d0, [0.6, 0, 0]), B([0, -7, 6.2], [0.6, 0.6, 1], 0x3a8ae8, [0.6, 0, 0])],
        armL: [band(-6.6, 1.1, 0x1a1a1e, 4.6), B([2.4, -6.6, 0], [0.3, 1, 1.2], 0x8a8a90),
          B([0, -9.8, 3.1], [5.2, 6.4, 1.2], 0xf0e8d8), B([0, -9.8, 2.45], [5.3, 6.5, 0.3], 0x8a5a3a), ...[-2, -1, 0, 1, 2].map((x) => B([x * 1.2 - 0.2, -6.5, 3.1], [0.4, 0.6, 1.4], 0x2a2a2a)),
          B([-1, -10.4, 3.75], [1.4, 1.2, 0.1], 0xe83a3a), B([0.8, -9, 3.75], [1.2, 1.2, 0.1], 0xf0a020), B([0.6, -11.4, 3.75], [1.2, 0.8, 0.1], 0x3a8ae8)],
        legR: [...footwear('hitop', { upper: 0xc02828, sole: 0xf4f0e8, lace: 0xf4f0e8 }), band(-7.2, 1.4, 0x5a7ab8, 4.8)],
        legL: [...footwear('hitop', { upper: 0xc02828, sole: 0xf4f0e8, lace: 0xf4f0e8 }), band(-7.2, 1.4, 0x5a7ab8, 4.8)],
      };
    },
  },
  // Quintus, the swordmaster (Daedalus in disguise): grey hair and beard, a
  // long navy coat over a brown waistcoat, a rapier, a glint of bronze at his throat
  quintus: {
    painter: 'person', scale: ADULT_SCALE, accent: 0xff9a2a, tip: ['armR', 0, -1.9, 16.8, 'rapier'],
    paint: { skin: 0xdc9c74, hair: 0xb8b4b0, fringe: 1, hairSide: 3, hairBack: 6, eyeRow: 3, eye: 0x3a7a8a, brow: 0x6a6460, scowl: true, wrinkles: 0xb47c5a, beard: 0xc8c4c0, top: 0x8a4a1e, knit: true, vneck: 0xf0ece0, jacket: 0x1e2238, lapel: 0x2e3450, sleeve: 0x8a4a1e, pants: 0x4a2e1e, shoes: 0x3a2214, saturate: 1.12 },
    hair: { c: [0, 7, -0.6], r: [5.6, 4.4, 5.8], bump: 0.4, shell: 1.4, fringe: 6.6, jag: 1, side: 3, back: 0.4, tuft: 0.16, spike: 0.03, tones: [0x8a8684, 0xb8b4b0, 0xe0dcd8] },
    beard: [0x9a9692, 0xc8c4c0, 0xe8e4e0],
    parts() {
      const navy = 0x1e2238, navyL = 0x2e3450, br = 0x5a3418;
      return {
        torso: [
          B([0, 11.6, 2.3], [3, 1.4, 0.6], 0xf0ece0), ...mirrorX([B([-2.8, 9.8, 2.5], [2, 4.6, 0.5], navyL, [0, 0, -0.3]), B([-3.6, 12, 0], [1.6, 1.6, 4.9], navy)]),
          ...[9, 7.2, 5.4, 3.6].map((y) => B([0, y, 2.6], [0.6, 0.6, 0.3], GOLD)),
          B([0, 1.6, 0], [8.9, 1.2, 4.9], br), B([0, 1.6, 2.55], [1.6, 1.4, 0.4], GOLD), B([0, 0.4, 0], [8.9, 1, 4.9], br), B([1.6, 0.4, 2.55], [1.4, 1.2, 0.4], GOLD),
          B([-2.4, 0.2, 2.6], [1.2, 3, 0.6], br), B([-2.4, -0.8, 2.95], [0.8, 0.8, 0.3], GOLD),
        ],
        hips: [
          // the coat's long skirts, open at the front
          ...mirrorX([B([-3.2, -4.8, 0.3], [2.6, 9.6, 4.4], navy), B([-3.2, -9.4, 0.3], [2.7, 0.5, 4.5], navyL)]), B([0, -4.8, -2.3], [9, 9.6, 0.6], navy),
        ],
        // the rapier, its basket hilt in his right fist, blade raised
        armR: [band(-7.8, 1.4, 0xf0ece0, 4.8), B([0, -10, 0.6], [1.2, 1.2, 3], 0x3a2214), B([0, -10, 2.6], [3, 3, 1.4], 0xd8a840), B([0, -10, 3.3], [2.2, 2.2, 0.6], 0xe8c060), B([0, -10, -1.1], [1, 1, 1], 0xd8a840),
          ...turn([B([0, 0, 9], [0.5, 0.4, 14], 0xd8dce4), B([0, 0, 16.4], [0.35, 0.3, 1], 0xd8dce4)], [-0.5, 0, 0]).map((b) => ({ ...b, at: [b.at[0], b.at[1] - 10, b.at[2] + 2] }))],
        armL: [band(-7.8, 1.4, 0xf0ece0, 4.8)],
        legR: [...shoes('boot', { upper: 0x4a2a14, sole: 0x2a160a, lace: 0x8a6a3a }), band(-5.8, 1.2, 0x5a3418, 4.9), B([0, -5.8, 2.5], [1.2, 1, 0.3], GOLD)],
        legL: [...shoes('boot', { upper: 0x4a2a14, sole: 0x2a160a, lace: 0x8a6a3a }), band(-5.8, 1.2, 0x5a3418, 4.9), B([0, -5.8, 2.5], [1.2, 1, 0.3], GOLD)],
      };
    },
    glow: { color: 0xff8a1a, ei: 1.2, parts: () => ({ torso: [B([0, 12.2, 1.6], [2.4, 0.8, 1.2], 0xffb040), B([-0.6, 11.7, 2.2], [0.6, 0.6, 0.4], 0xffd060), B([0.8, 11.9, 2.1], [0.5, 0.5, 0.4], 0xffd060)] }) },
  },
  // Phoebe, Hunter of Artemis: blond curls pinned up under a silver laurel,
  // freckles, the Hunters' parka and a quiver
  canyon_phoebe: {
    painter: 'hero', scale: KID, accent: 0xc8d8ff,
    paint: { skinTone: 0xeab08a, hair: 0xe0b040, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x2a6aa8, pupil: 0x0a1a3a, brow: 0xb08020, lashes: true, mouth: 'smirk', lip: 0xc0645a, freckles: 0xd08a5a, ...hunterPaint(0xeab08a) },
    body: hunterBody,
    vox: { style: 'curls', base: 0xe0b040, shade: 0xa87818, light: 0xf8d870, seed: 181, shape: { top: 12, r: [6.2, 6, 6], c: [0, 6, -1.6], tuft: 0.26, spike: 0.08 } },
    parts() { const p = hunterParts({ seed: 80 }); p.head = [...circlet(SILVER, { y: 8.6 }), B([0, 11.4, -3.4], [4.4, 3.6, 3.6], 0xe0b040), B([0.6, 13, -3.6], [2.8, 1.6, 2.4], 0xf8d870)]; return p; },
  },
  // Bianca di Angelo: black curls in a bun under a silver laurel, the Hunters'
  // parka, fingerless gloves and a bow
  bianca: {
    painter: 'hero', scale: KID, accent: 0x8a5aff,
    paint: { skinTone: 0xd8a07a, hair: 0x141012, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x2a1a14, pupil: 0x0a0606, brow: 0x0e0a0a, lashes: true, scowl: true, mouth: 'small', lip: 0x9a5a4a, ...hunterPaint(0xd8a07a) },
    body: hunterBody,
    vox: { style: 'messy', base: 0x1a1416, shade: 0x080608, light: 0x34303a, seed: 191, shape: { top: 9.5, side: 0.5, back: 1, tuft: 0.2, spike: 0.08 } },
    parts() {
      const p = hunterParts({ seed: 90, bowSide: 1 });
      const bun = [], r = mulberry32(7), tones = [0x1a1416, 0x080608, 0x34303a];
      for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, e = r() * 1.2; bun.push(B([Math.cos(a) * (2.6 - e), 10.4 + (r() - 0.3) * 2.6, -2.2 + Math.sin(a) * (2.6 - e)], [1.5, 1.5, 1.5], tones[Math.floor(r() * 3)])); }
      bun.push(...mirrorX([B([-4.4, 3.4, 2.2], [0.9, 3, 0.9], 0x1a1416), B([-4.5, 1.8, 2.6], [0.9, 1.2, 0.9], 0x34303a)]));
      p.head = [...circlet(SILVER, { y: 8.4 }), ...bun];
      return p;
    },
  },
  // Charon, ferryman of the dead: a sharp black suit, gold chains,
  // sunglasses, a beard, and his oar wound with the ghost-light of the Styx
  asphodel_charon: {
    painter: 'person', scale: 1.45, accent: 0x4ae0ff,   // (round 9: a tall adult, 1.32 → 1.45, as every adult grew)
   
    paint: { skin: 0xb06c44, hair: 0x18100c, fringe: 1, hairSide: 3, hairBack: 6, eyeRow: 3, eye: 0x2a1a10, brow: 0x18100c, glasses: 0x0a0a0c, beard: 0x1a120c, top: 0x1c1a1e, vneck: 0xf4f4f0, tie: 0x141416, jacket: 0x161418, lapel: 0x262428, pants: 0x161418, shoes: 0x0a0a0c, saturate: 1.1,
      face: (S, ey) => { S.dot(9, ey - 0.5, 0x0a0a0c, 6, 4); S.dot(13, ey - 0.5, 0x0a0a0c, 6, 4); S.dot(11.5, ey, 0x0a0a0c, 2, 1); S.dot(9.5, ey, 0x3a3a40, 1, 1); S.dot(13.5, ey, 0x3a3a40, 1, 1); } },
    hair: { c: [0, 7, -1.2], r: [5, 3.8, 5.4], bump: 0.34, shell: 1.2, fringe: 7.2, jag: 0.4, side: 3.4, back: 0, tuft: 0.14, spike: 0.04, tones: [0x0c0806, 0x1e1612, 0x3a2e26] },
    beard: [0x0c0806, 0x1e1612, 0x2e241c],
    parts() {
      const blk = 0x161418, gold = 0xe0b040;
      return {
        head: [B([-2, 4.4, 4.4], [3.2, 2.2, 0.5], 0x0a0a0c), B([2, 4.4, 4.4], [3.2, 2.2, 0.5], 0x0a0a0c), B([0, 4.9, 4.4], [1.2, 0.5, 0.4], 0x0a0a0c), ...mirrorX([B([-4.3, 4.9, 2.2], [0.4, 0.5, 4], 0x0a0a0c)]), B([-2.6, 4.9, 4.7], [0.8, 0.5, 0.1], 0x5a5a64)],
        torso: [
          ...mirrorX([B([-2.8, 9.8, 2.5], [2, 4.6, 0.5], 0x262428, [0, 0, -0.3]), B([-1.1, 11.7, 2.3], [1.6, 0.8, 0.4], 0xf4f4f0, [0, 0, -0.45])]),
          B([0, 9.6, 2.45], [1.2, 3.4, 0.4], 0x0c0c0e), B([0, 11.2, 2.5], [1, 0.8, 0.4], 0x0c0c0e),
          ...line([-2.2, 11.6, 2.6], [0, 8.4, 2.6], 6, [gold, 0xc89a30], 5, 0.5, 0), ...line([2.2, 11.6, 2.6], [0, 8.4, 2.6], 6, [gold, 0xc89a30], 6, 0.5, 0), ...line([-2.4, 11.6, 2.62], [0, 7.2, 2.62], 7, [gold], 7, 0.45, 0), ...line([2.4, 11.6, 2.62], [0, 7.2, 2.62], 7, [gold], 8, 0.45, 0),
          ...[6.6, 5, 3.4].map((y) => B([0, y, 2.55], [0.6, 0.6, 0.3], 0x3a3a40)),
          B([0, 1.4, 0], [8.9, 1.2, 4.9], 0x3a2416), B([0, 1.4, 2.55], [1.8, 1.4, 0.4], gold), B([0, 1.4, 2.75], [1, 0.7, 0.2], 0x3a2416),
        ],
        hips: [...mirrorX([B([-3.2, -1.6, 0.3], [2.6, 3.4, 4.4], blk)]), B([0, -1.6, -2.3], [9, 3.4, 0.6], blk)],
        armR: [band(-7.8, 1.2, 0xf4f4f0, 4.8), B([0, -7.8, 2.45], [1, 1, 0.3], gold)],
        armL: [band(-7.8, 1.2, 0xf4f4f0, 4.8), band(-7, 0.6, gold, 4.85)],
        legR: shoes('loafer', { upper: 0x0e0e10, sole: 0x060606 }), legL: shoes('loafer', { upper: 0x0e0e10, sole: 0x060606 }),
      };
    },
    // his oar, taller than he is, and the ghost-light coiled round it
    glow: {
      color: 0x30d0ff, ei: 1.1,
      parts: () => {
        const L = [];
        for (let i = 0; i < 26; i++) { const k = i / 26, a = k * Math.PI * 5; L.push(B([Math.cos(a) * 2.2, -9.5 + k * 30, 2.4 + Math.sin(a) * 2.2], [1, 1, 1], i % 2 ? 0x7ae8ff : 0x40c8f0)); }
        return { armR: L };
      },
    },
    // (the oar held 6.5 higher than first built: its blade stood a third of a metre in the ground)
    extra: () => ({ armR: [B([0, 0.5, 2.4], [1.4, 34, 1.4], 0x6a3a1c), B([0, -17.9, 2.4], [2.6, 5, 0.8], 0x6a3a1c), B([0, -20.9, 2.4], [1.6, 1.2, 0.8], 0x5a3014), ...[8.5, 10.1].map((y) => B([0, y, 2.4], [1.7, 0.6, 1.7], 0x8a5a2a)), B([0, -3.5, 2.4], [1.7, 1.6, 1.7], 0x5a3014)] }),
  },
  // Sisyphus: an old strongman, grey curls and beard, a cream chiton over one
  // shoulder with a Greek-key hem, a rope belt, leather wrist straps, laced sandals
  asphodel_sisyphus: {
    painter: 'person', scale: ADULT_SCALE, wide: 1.22, accent: 0xd8b070,
    paint: { skin: 0xd88c5e, hair: 0xc8c4c0, fringe: 1, hairSide: 3, hairBack: 6, eyeRow: 3, eye: 0x3a2214, brow: 0x9a9690, scowl: true, frown: true, wrinkles: 0xb06c48, beard: 0xd0ccc8, top: 0xeee2c8, sleeve: 0xd88c5e, hand: 0xd88c5e, shortSleeve: true, pants: 0xd88c5e, shoes: false, saturate: 1.12,
      body: (S) => {
        // the chiton leaves his right shoulder and chest bare; muscle shading on the arms
        S.rect(16, 20, 4, 4, 0xd88c5e, 0.04); S.rect(20, 20, 2, 2, 0xd88c5e, 0.04); S.rect(38, 20, 2, 4, 0xd88c5e, 0.04); S.rect(16, 16, 4, 4, 0xd88c5e, 0.04);
        for (const [u, v] of [[40, 16], [32, 48]]) { S.dot(u + 4, v + 6, 0xb87048, 8, 2); S.dot(u + 4.5, v + 10, 0xb87048, 6, 1); S.rect(u, v, 16, 4, 0xd88c5e, 0.04); S.rect(u, v + 4, 16, 12, 0xd88c5e, 0.05); S.dot(u + 4, v + 6, 0xb87048, 8, 1); }
        for (const [u, v] of [[0, 16], [16, 48]]) { S.dot(u + 4.5, v + 9, 0xb87048, 6, 1); S.dot(u + 5, v + 7, 0xe8a070, 4, 2); }
      } },
    hair: { c: [0, 7, -0.6], r: [5.8, 4.6, 6], bump: 0.42, shell: 1.4, fringe: 6.8, jag: 1, side: 2.6, back: 0.4, tuft: 0.28, spike: 0.08, tones: [0x8a8684, 0xc0bcb8, 0xe8e4e0] },
    beard: [0xa8a4a0, 0xd0ccc8, 0xf0ece8],
    parts() {
      const cream = 0xeee2c8, creamD = 0xd8caa8, key = 0x8a5a30, rope = 0x6a4020;
      const hem = [], r = mulberry32(13);
      hem.push(B([0, -4, 0], [9, 8, 5], cream), B([0, -7.6, 0], [9.2, 1.4, 5.2], 0xe4d6b6));
      // the Greek-key border and a ragged edge
      for (let i = 0; i < 9; i++) { const x = -4 + i; for (const z of [2.62, -2.62]) hem.push(B([x, -7.6, z], [0.6, 0.9, 0.1], key), B([x + 0.35, -7.2, z], [0.3, 0.5, 0.1], key)); }
      for (let i = 0; i < 12; i++) hem.push(B([-4.4 + r() * 8.8, -8.5 - r() * 0.6, r() < 0.5 ? 2.5 : -2.5], [1, 1, 0.5], creamD));
      return {
        torso: [
          // the drape from his left shoulder across to the right hip
          B([1.2, 6.6, 2.35], [6, 13, 0.5], cream, [0, 0, 0.52]), B([1.2, 6.6, -2.35], [6, 13, 0.5], cream, [0, 0, 0.52]), B([3, 12.2, 0], [3.4, 0.8, 4.8], cream),
          B([0, 1.2, 0], [9, 1.2, 5], rope), B([-1.4, 1.2, 2.6], [1.6, 1.6, 0.6], rope), ...[-1.8, -1].map((x) => B([x, -1.4, 2.7], [0.5, 4, 0.5], rope)), B([-1.4, -3.6, 2.7], [1.2, 0.6, 0.6], GOLD),
        ],
        hips: hem,
        armR: [band(-7, 1.2, 0x5a3418, 4.7), band(-8.3, 0.7, 0x5a3418, 4.7), band(-1.4, 0.7, 0x5a3418, 4.7)],
        armL: [band(-7, 1.2, 0x5a3418, 4.7), band(-8.3, 0.7, 0x5a3418, 4.7)],
        legR: [...shoes('sandal', { upper: 0x5a3418, sole: 0x4a2a14 }), ...[-9, -7.4, -5.8, -4.2].map((y, i) => B([0, y, 0], [4.7, 0.5, 4.7], 0x5a3418, [0, 0, i % 2 ? 0.15 : -0.15]))],
        legL: [...shoes('sandal', { upper: 0x5a3418, sole: 0x4a2a14 }), ...[-9, -7.4, -5.8, -4.2].map((y, i) => B([0, y, 0], [4.7, 0.5, 4.7], 0x5a3418, [0, 0, i % 2 ? 0.15 : -0.15]))],
      };
    },
  },
  // ------------------------------------------------ vox-ow-people-3
  // Argus, camp's hundred-eyed head of security: huge, curly blond hair and
  // beard, blue eyes all over his arms and face, a white polo with a trident,
  // cargo khakis, a gold ring of big keys at his belt
  camp_argus: {
    painter: 'person', scale: 1.47, wide: 1.32, accent: 0x4a8aff,   // (round 9: huge Argus, 1.42 → 1.47, the tallest of the adults at the top of their band; any more and his hero-sized head breaks the head rule)
   
    paint: { skin: 0xf0b48a, hair: 0xd8b050, fringe: 1, hairSide: 3, hairBack: 6, eyeRow: 3, eye: 0x2a74e0, brow: 0xb8902a, smile: true, beard: 0xd0a848, top: 0xece6d8, shortSleeve: true, collar: 0xf6f2e8, buttons: 0xc8c0b0, pants: 0x7a6a40, shoes: 0x5a3418, saturate: 1.1,
      face: (S, ey) => { const D = (x, y, c, n, m) => S.dot(x, y, c, n, m); eyeAt(D, 11, ey - 2.4, 0xf0b48a); for (const x of [2, 5, 18, 21]) eyeAt(D, x, ey + 0.5, 0xf0b48a); eyeAt(D, 26.5, ey + 1, 0xf0b48a); eyeAt(D, 28.5, ey + 2, 0xf0b48a); },
      body: (S) => {
        const D = (x, y, c, n, m) => S.dot(x, y, c, n, m), r = mulberry32(3);
        // eyes all down both arms, under the polo's short sleeves too
        for (const [u, v] of [[40, 16], [32, 48]]) for (let i = 0; i < 12; i++) eyeAt(D, u + 0.5 + Math.floor(r() * 26) / 2, v + 4 + 5 + Math.floor(r() * 10) / 2, 0xf0b48a);
        for (const [u, v] of [[40, 16], [32, 48]]) eyeAt(D, u + 8.5, v + 1, 0xf0b48a);
        eyeAt(D, 22.5, 17, 0xf0b48a); eyeAt(D, 18, 21.5, 0xf0b48a);
      } },
    hair: { c: [0, 7, -0.6], r: [5.6, 4.4, 5.8], bump: 0.42, shell: 1.4, fringe: 7, jag: 0.8, side: 2.8, back: 0.6, tuft: 0.2, spike: 0.04, top: 10.4, tones: [0xa88428, 0xd8b050, 0xf4d888] },
    beard: [0xa88428, 0xd0a848, 0xf0d080],
    parts() {
      const white = 0xf6f2e8, khaki = 0x7a6a40, gold = 0xe0b030, eye = (x, y, z, s) => [B([x, y, z], [s ? 0.3 : 1.4, 1, s ? 1.4 : 0.3], 0xfafaf6), B([x + (s || 0) * 0.15, y, z + (s ? 0 : 0.15)], [s ? 0.3 : 0.7, 0.7, s ? 0.7 : 0.3], 0x2a74e0)];
      const keys = [B([-2.4, -1.2, 2.6], [0.5, 2.2, 0.5], gold), ...ring(-3.4, 1.1, [gold], 5, { size: 0.5, step: 0.7, h: 0.5 }).map((b) => ({ ...b, at: [b.at[0] - 2.4, b.at[1], b.at[2] + 2.6] }))];
      for (const [x, k] of [[-3.4, 0], [-2.6, 1], [-1.8, 2], [-3, 3]]) keys.push(B([x, -5.4 - (k % 2) * 0.6, 3 + (k % 2) * 0.3], [0.5, 2.6, 0.4], gold), B([x, -4.2 - (k % 2) * 0.6, 3 + (k % 2) * 0.3], [1, 1, 0.4], gold), B([x + 0.4, -6.2 - (k % 2) * 0.6, 3 + (k % 2) * 0.3], [0.5, 0.4, 0.4], gold));
      return {
        head: [eye(-4.15, 2.6, 0.6, -1), eye(4.15, 2.6, 0.6, 1)].flat(),
        torso: [
          ...mirrorX([B([-1.8, 12, 2.2], [2.6, 0.8, 1], white, [0, 0, -0.3])]),
          // the trident on the polo's left breast
          B([2.6, 8.8, 2.45], [0.4, 2.6, 0.2], 0xe08a20), B([2.6, 9.6, 2.45], [1.8, 0.4, 0.2], 0xe08a20), B([1.8, 10.2, 2.45], [0.4, 1, 0.2], 0xe08a20), B([3.4, 10.2, 2.45], [0.4, 1, 0.2], 0xe08a20),
          B([0, 1.2, 0], [8.9, 1.2, 4.9], 0x1e1c1c), B([0, 1.2, 2.5], [1.6, 1.1, 0.3], SILVER), B([3.6, 0.6, 2.5], [1.6, 2.2, 1], 0x2a2420), B([-4.4, 0.6, 1.6], [1, 2.4, 2], 0x2a2420),
        ],
        hips: keys,
        armR: [band(-1.4, 0.6, white, 4.7), ...eye(-2.4, -6.8, 0.6, -1), ...eye(0, -8.2, 2.4, 0)],
        armL: [band(-1.4, 0.6, white, 4.7), ...eye(2.4, -6.6, -0.4, 1), ...eye(0.6, -7, 2.4, 0)],
        legR: [...shoes('boot', { upper: 0x5a3418, sole: 0x2a1a10, lace: 0xc8a060 }), band(-6.4, 1, shadeOf(khaki, 0.9), 4.9), B([-2.45, -4, 0.4], [0.5, 2.6, 2.6], shadeOf(khaki, 0.85)), B([-2.6, -2.9, 0.4], [0.3, 0.4, 2.6], shadeOf(khaki, 0.7))],
        legL: [...shoes('boot', { upper: 0x5a3418, sole: 0x2a1a10, lace: 0xc8a060 }), band(-6.4, 1, shadeOf(khaki, 0.9), 4.9), B([2.45, -4, 0.4], [0.5, 2.6, 2.6], shadeOf(khaki, 0.85)), B([2.6, -2.9, 0.4], [0.3, 0.4, 2.6], shadeOf(khaki, 0.7))],
      };
    },
  },
  // Silena Beauregard, daughter of Aphrodite: long curly brown hair with a pink
  // flower, gold hoops, a pink scarf over the camp shirt, denim shorts, sandals,
  // gold bangles and a pink hand mirror
  camp_silena: {
    painter: 'hero', scale: KID, accent: 0xff7ab8,
    paint: { skinTone: 0xe8a878, hair: 0x4a2814, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x4a2a14, pupil: 0x140806, brow: 0x3a1c0a, lashes: true, mouth: 'smile', lip: 0xe0607a, blush: true, ...TEE, pants: 0x4a6a9a, shorts: 4, shoes: 0xe8a878 },
    vox: { style: 'long', base: 0x4a2814, shade: 0x2a140a, light: 0x6e3e20, seed: 211, shape: { helmetFront: false, top: 9.6, c: [0, 3.4, -1.2], tuft: 0.3, spike: 0.1, bump: 0.46, r: [6.6, 7.8, 6.2], side: -6, back: -7, fringe: 5.8 } },
    tail: { pivot: [0, 5, -4.6], base: 0x4a2814, shade: 0x2a140a, light: 0x6e3e20, length: 14, width: 4.4, back: 1 },
    parts() {
      const pink = 0xf088b0, pinkD = 0xd85a8a, pinkL = 0xf8b8d0;
      return {
        head: [
          // a pink flower over her right ear, gold hoops
          B([-4.9, 8, 2], [2.2, 2.2, 1], pink), B([-4.9, 8, 2.6], [1, 1, 0.4], 0xf8e070), B([-5.2, 6.8, 1.2], [1.4, 0.8, 1], 0x3a8a3a),
          ...mirrorX([B([-4.4, 1.8, 1.6], [0.4, 1.6, 1.6], 0xe0b030), B([-4.4, 1.8, 1.6], [0.5, 0.8, 0.8], 0xe8a878)]),
        ],
        torso: [
          // the scarf round the neck, both ends hanging, fringed
          B([0, 12.1, 0], [9.4, 1.6, 5.4], pink), ...mirrorX([B([-3.4, 11.2, 2.2], [2.4, 1.4, 1.4], pinkD)]),
          B([-3.2, 7.4, 2.7], [2, 7, 0.5], pink), B([3.2, 8.4, 2.7], [2, 5, 0.5], pink), B([-3.2, 6, 2.95], [2, 0.6, 0.1], pinkL), B([3.2, 8, 2.95], [2, 0.6, 0.1], pinkL),
          ...[-4, -3.4, -2.8, -2.4].map((x, i) => B([x, 3.6 - (i % 2) * 0.4, 2.7], [0.4, 0.9, 0.4], pinkD)), ...[2.4, 2.8, 3.4, 4].map((x, i) => B([x, 5.6 - (i % 2) * 0.4, 2.7], [0.4, 0.9, 0.4], pinkD)),
          B([0, 1.2, 0], [8.8, 1, 4.8], 0x6a3a1e), B([0, 1.2, 2.5], [1.4, 1, 0.3], GOLD),
        ],
        // a pink hand mirror in a gold frame in her left hand, gold bangles on the right wrist
        armL: [band(-7.2, 0.6, GOLD, 4.7), B([0, -9.5, 2.6], [1, 3, 1], 0xe0b030), B([0, -5.6, 2.6], [4.8, 5.6, 1], 0xe0b030), B([0, -5.6, 3.15], [3.6, 4.4, 0.2], 0xf090b8), B([-0.8, -4.6, 3.3], [1, 1, 0.1], 0xffe0f0)],
        armR: [band(-7.4, 0.5, GOLD, 4.7), band(-6.7, 0.5, 0xe0b030, 4.75), band(-6, 0.4, pink, 4.7)],
        legR: [...shoes('sandal', { upper: 0x6a3a1e, sole: 0x4a2a14 }), band(-8.6, 0.6, 0x6a3a1e, 4.6), band(-1.2, 1, shadeOf(0x4a6a9a, 1.15), 4.8)],
        legL: [...shoes('sandal', { upper: 0x6a3a1e, sole: 0x4a2a14 }), band(-8.6, 0.6, 0x6a3a1e, 4.6), band(-1.2, 1, shadeOf(0x4a6a9a, 1.15), 4.8)],
      };
    },
  },
  // Big Earl, trucker: a red-and-white trucker cap, a big dark beard, a red
  // plaid shirt with the sleeves rolled, suspenders, jeans, boots, a rubber chicken
  rt_turnpike_earl: {
    painter: 'person', scale: ADULT_SCALE, wide: 1.32, accent: 0xff5a2a,   // (round 9: an adult, 1.34 → ADULT_SCALE; any taller and his head, measured to the skull under his cap, breaks the head rule)
   
    paint: { skin: 0xd8946a, hair: 0x2a1a10, fringe: 1, hairSide: 3, hairBack: 5, eyeRow: 3, eye: 0x3a2414, brow: 0x1e120a, grin: true, nose: 0xd27a5c, beard: 0x2a1a10, top: 0xc0281e, plaid: 0x4a100a, vneck: 0xf0e8d8, sleeve: 0xc0281e, pants: 0x2c4a7a, shoes: 0x5a3820, saturate: 1.15 },
    hair: { c: [0, 6.4, -0.8], r: [5.6, 4, 5.8], bump: 0.4, shell: 1.4, fringe: 6.6, jag: 0.6, side: 1.4, back: 0, top: 8.2, tuft: 0.26, spike: 0.06, tones: [0x140c06, 0x2a1a10, 0x4a3020] },
    beard: [0x140c06, 0x2a1a10, 0x3e2818],
    parts() {
      const red = 0xc8281e, white = 0xf4f0e8, strap = 0x4a2a14;
      // the rubber chicken, held round the middle, head up, legs dangling
      const chicken = [B([0, -10.2, 3], [2.8, 4.4, 2.4], 0xf8d838), B([0, -7.4, 3], [1.8, 2.2, 1.8], 0xf8d838), B([0, -5.9, 3], [2, 1.8, 2], 0xf8e050), B([0, -6.1, 4.4], [0.8, 0.6, 1.4], 0xf08020),
        B([0, -4.6, 2.8], [0.5, 1.2, 1.6], 0xe02a2a), B([0, -6.9, 4.1], [0.5, 0.9, 0.5], 0xe02a2a), B([-1.05, -5.6, 3.4], [0.2, 0.5, 0.5], INK), B([1.05, -5.6, 3.4], [0.2, 0.5, 0.5], INK),
        ...mirrorX([B([-1.6, -10, 3], [0.6, 2.6, 1.8], 0xf0c828), B([-0.6, -13.4, 3], [0.4, 2.4, 0.4], 0xf08020), B([-0.6, -14.6, 3.4], [0.9, 0.3, 1.2], 0xf08020)])];
      return {
        hat: [
          B([0, 9.2, -0.4], [9.8, 2.4, 9.6], red), B([0, 10.9, -0.5], [8.6, 1.2, 8.4], red), B([0, 11.8, -0.6], [6.4, 0.8, 6.2], red),
          B([0, 9.8, 4.45], [8.6, 3.4, 0.7], white), B([0, 9.8, 4.85], [1.4, 1.4, 0.2], red), B([0, 9.8, 4.85], [2.6, 0.5, 0.2], red), B([0, 8.2, 6.6], [9, 0.7, 4.8], red), B([0, 12.3, -0.6], [0.9, 0.5, 0.9], white),
        ],
        torso: [
          B([0, 11.8, 0], [8.9, 0.8, 4.9], shadeOf(0xc0281e, 0.8)), ...mirrorX([B([-2, 11.3, 2.45], [2, 1.2, 0.5], 0xc0281e, [0, 0, -0.4])]),
          ...mirrorX([B([-2.5, 6, 2.5], [1.3, 12, 0.4], strap), B([-2.5, 6, -2.5], [1.3, 12, 0.4], strap), B([-2.5, 9.4, 2.75], [1, 1, 0.3], GOLD), B([-2.5, 1.8, 2.75], [1, 1, 0.3], GOLD)]),
          B([0, 0.8, 0], [8.9, 1.1, 4.9], 0x3a2416), B([0, 0.8, 2.5], [1.8, 1.3, 0.3], GOLD), B([3.6, 0.4, 2.6], [1.6, 2.2, 1], strap), B([-3.6, 0.4, 2.6], [1.6, 2.2, 1], strap),
        ],
        // sleeves rolled to the elbow
        armR: [band(-3.6, 1.8, 0xf0e0d0, 4.9), band(-3.1, 0.5, red, 5), ...chicken],
        armL: [band(-3.6, 1.8, 0xf0e0d0, 4.9), band(-3.1, 0.5, red, 5)],
        legR: [...shoes('boot', { upper: 0x6a4020, sole: 0x2e1e12, lace: 0xc8a060 }), band(-6.2, 1.1, 0x3a5a8a, 4.9)],
        legL: [...shoes('boot', { upper: 0x6a4020, sole: 0x2e1e12, lace: 0xc8a060 }), band(-6.2, 1.1, 0x3a5a8a, 4.9)],
      };
    },
  },
  // Mrs. Pruitt, a stout farm wife: a pink floral headscarf over curly brown
  // hair, a blue flowered dress under a white apron of pink roses, green gloves
  // and rubber boots, a garden gnome under her arm
  rt_auntyem_pruitt: {
    painter: 'person', scale: ADULT_SCALE, wide: 1.22, accent: 0xff7a9a,
    paint: { skin: 0xe8a880, hair: 0x5a3418, fringe: 1, hairSide: 4, hairBack: 7, eyeRow: 3, eye: 0x3a2414, brow: 0x4a2810, smile: true, blush: 0xf08a7a, top: 0x5a7ab8, floral: [0xdce6f4, 0xf0d060, null], shortSleeve: true, collar: 0x4a6aa8, hand: 0x4a7a3a, pants: 0x5a7ab8, skirt: 0x5a7ab8, skirtLen: 9, tights: 0xe8a880, shoes: 0x4a7a3a, saturate: 1.12 },
    hair: { c: [0, 6, -0.6], r: [6.2, 4.6, 6], bump: 0.46, shell: 1.4, fringe: 6.8, jag: 0.6, side: 0.6, back: -0.6, top: 8.4, tuft: 0.34, spike: 0.08, tones: [0x3a200c, 0x5a3418, 0x7e4c28] },
    parts() {
      const scarf = 0xe88aa0, rose = [0xe85a7a, 0xf09ab0], leaf = 0x5a9a4a, apron = 0xf6efe0, blue = 0x5a7ab8;
      const r = mulberry32(5), ap = [], skirtA = [];
      ap.push(B([0, 6.2, 2.45], [6.2, 8, 0.4], apron), ...mirrorX([B([-2.4, 11.2, 2.4], [1, 2.2, 0.4], apron), B([-3.2, 1.4, 0], [2, 0.9, 5], apron)]), B([0, 1.4, -2.5], [8.8, 0.9, 0.4], apron), B([0, 1.4, -2.9], [2, 1.6, 0.6], apron));
      const roseAt = (L, x, y, z) => L.push(B([x, y, z], [1.4, 1.4, 0.2], rose[0]), B([x, y, z + 0.1], [0.7, 0.7, 0.15], rose[1]), B([x + 0.9, y - 0.5, z], [0.8, 0.5, 0.15], leaf));
      for (const [x, y] of [[-1.6, 8.6], [1.4, 6.4], [-1, 4]]) roseAt(ap, x, y, 2.7);
      skirtA.push(B([0, -4.4, 2.75], [7.4, 8.8, 0.4], apron), B([0, -8.6, 2.8], [7.4, 0.5, 0.4], 0xe86a8a));
      for (const [x, y] of [[-2.2, -2], [1.6, -3.4], [-0.6, -5.6], [2.4, -6.6], [-2.6, -7.2]]) roseAt(skirtA, x, y, 3);
      // the gnome: red hat, white beard, blue coat, held against her left side
      const gnome = [B([0, -11, 1.6], [3, 3.4, 3], 0x3a5ab0), B([0, -8.6, 1.6], [2.4, 1.8, 2.4], 0xf0c4a0), B([0, -9.4, 2.9], [2.2, 2.4, 0.8], 0xf8f8f4), B([0, -6.8, 1.6], [2.8, 1.4, 2.8], 0xd02a2a), B([0, -5.6, 1.6], [1.8, 1.4, 1.8], 0xd02a2a), B([0, -4.6, 1.4], [0.9, 1, 0.9], 0xd02a2a), B([0, -12.9, 1.6], [3, 0.6, 3], 0x5a3418), B([0, -8.3, 2.95], [0.5, 0.5, 0.4], 0xe08a7a), B([-0.6, -8.1, 2.9], [0.3, 0.3, 0.2], INK), B([0.6, -8.1, 2.9], [0.3, 0.3, 0.2], INK)];
      const dots = [];
      for (let i = 0; i < 14; i++) dots.push(B([(r() - 0.5) * 9.2, 8.8 + r() * 1.8, (r() - 0.5) * 9], [0.8, 0.8, 0.8], i % 3 ? 0xf8e0e8 : 0xd84a6a));
      return {
        hat: [
          // the headscarf over the crown, knotted at the nape
          B([0, 9, -0.6], [9.8, 1.8, 9.4], scarf), B([0, 10.2, -0.8], [8.2, 1, 7.8], scarf), B([0, 7.2, -4.8], [9.4, 3.6, 0.8], scarf), ...mirrorX([B([-4.7, 7.6, -1.2], [0.8, 2.8, 6.4], scarf)]),
          B([0, 7.4, -5.6], [1.8, 1.6, 1.2], shadeOf(scarf, 0.85)), B([-0.8, 6, -5.8], [0.9, 2, 0.6], scarf), B([0.8, 6.2, -5.8], [0.9, 1.8, 0.6], scarf),
          ...dots.filter((b) => b.at[2] < 3.8 || b.at[1] > 9.9),
        ],
        head: mirrorX([B([-4.6, 2.2, 1.6], [0.4, 1.2, 1.2], 0xe0b030)]),
        torso: ap,
        hips: skirtA,
        armR: [band(-2.2, 1.2, blue, 4.8), band(-7.2, 0.8, 0x3a6a2a, 4.8)],
        armL: [band(-2.2, 1.2, blue, 4.8), band(-7.2, 0.8, 0x3a6a2a, 4.8), ...gnome.map((b) => ({ ...b, at: [b.at[0] + 0.6, b.at[1] + 3, b.at[2] + 0.6] }))],
        legR: [...shoes('boot', { upper: 0x4a7a3a, sole: 0x24461a, lace: 0x4a7a3a }), band(-6.6, 1.4, 0x3e6a30, 5), B([0, -9.4, 2.65], [0.8, 0.8, 0.2], 0xf09ab0), B([-2.65, -8.4, 0.6], [0.2, 0.8, 0.8], 0xf09ab0)],
        legL: [...shoes('boot', { upper: 0x4a7a3a, sole: 0x24461a, lace: 0x4a7a3a }), band(-6.6, 1.4, 0x3e6a30, 5), B([0, -8.6, 2.65], [0.8, 0.8, 0.2], 0xf09ab0), B([2.65, -9.2, -0.4], [0.2, 0.8, 0.8], 0xf09ab0)],
      };
    },
  },
  // Ranger Mae at the Gateway Arch: long curly hair under a flat ranger hat
  // with a gold badge, an olive uniform with patches and a badge, binoculars,
  // a belt of pouches, cargo pants and boots
  rt_stlouis_mae: {
    painter: 'hero', scale: ADULT_SCALE, accent: 0x6ab04a,   // (round 9: an adult, 1.2 → ADULT_SCALE)
   
    paint: { skinTone: 0xd89668, hair: 0x4a2814, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x3a2214, pupil: 0x0a0604, brow: 0x3a1c0a, lashes: true, mouth: 'grin', lip: 0xc0605a, blush: true, top: 0x7a7a48, sleeve: 0x7a7a48, shortSleeve: 6, collar: 0x6a6a3c, pants: 0x4e5a30, cargo: true, shoes: 0x4a2a14, sole: 0x2a160a },
    body(S, D) {
      // shoulder patches, pocket flaps and a placket
      for (const [u, v] of [[40, 16], [32, 48]]) { S.rect(u, v + 5, 4, 3, 0x2e5a2a, 0.04); D(u + 1, v + 5.5, 0xe0c060, 4, 2); }
      D(20, 22, 0x5e5e34, 6, 3); D(25, 22, 0x5e5e34, 6, 3); D(23.5, 20, 0x5e5e34, 1, 24);
    },
    vox: { style: 'long', base: 0x4a2814, shade: 0x2a140a, light: 0x6e3e20, seed: 233, shape: { helmetFront: false, top: 8.4, c: [0, 3.6, -1.2], tuft: 0.3, spike: 0.1, bump: 0.46, r: [6.8, 7.6, 6.4], side: -6, back: -7 } },
    parts() {
      const hat = 0x8a7a4c, band2 = 0x4a2a14, lea = 0x6a3a1e;
      return {
        hat: [
          // the ranger hat: a flat round brim and a pinched crown, a gold badge
          B([0, 8.4, 0], [15, 0.7, 15], hat), B([0, 8.4, 0], [11, 0.75, 16], hat), B([0, 8.4, 0], [16, 0.75, 11], hat),
          B([0, 9.6, 0], [8.6, 1.6, 8.6], band2), B([0, 11.2, 0], [7.8, 2, 7.8], hat), ...[[0, 3.2], [0, -3.2], [3.2, 0], [-3.2, 0]].map(([x, z]) => B([x, 12.4, z], [x ? 1.6 : 3.4, 1.2, z ? 1.6 : 3.4], shadeOf(hat, 0.85))), B([0, 12.6, 0], [3, 1.2, 3], hat),
          B([0, 10.6, 4.05], [1.6, 1.8, 0.4], 0xe0b030), B([-1, 11, 4.05], [0.8, 0.8, 0.3], 0xe0b030), B([1, 11, 4.05], [0.8, 0.8, 0.3], 0xe0b030),
        ],
        head: mirrorX([B([-4.6, 2.2, 1.6], [0.4, 1.4, 1.4], 0xe0b030)]),
        torso: [
          B([2.4, 9, 2.45], [1.6, 1.8, 0.4], 0xe0b030), B([2.4, 9, 2.65], [0.8, 0.8, 0.2], 0xf8e070), ...mirrorX([B([-1.6, 11.8, 2.3], [1.8, 0.8, 0.4], 0x6a6a3c, [0, 0, -0.45])]),
          // binoculars on a strap
          ...mirrorX([B([-1.8, 9.6, 2.4], [0.4, 4.4, 0.4], 0x2a2420, [0, 0, -0.6])]), B([-0.7, 6.6, 3], [1.3, 2.4, 1.4], 0x1e1e20), B([0.7, 6.6, 3], [1.3, 2.4, 1.4], 0x1e1e20), B([0, 7, 3], [0.6, 0.8, 0.8], 0x3a3a3a),
          B([0, 1.2, 0], [8.8, 1.2, 4.8], lea), B([0, 1.2, 2.5], [1.6, 1.2, 0.3], GOLD), B([3.4, 0.4, 2.6], [1.6, 2.2, 1], lea), B([-3.4, 0.4, 2.6], [1.6, 2.2, 1], lea), B([4.6, 0.2, 0.6], [1.2, 2.6, 2], lea),
        ],
        armR: [band(-4.6, 1, 0x6a6a3c, 4.8)],
        armL: [band(-4.6, 1, 0x6a6a3c, 4.8), band(-7.4, 0.6, 0x8a6a3a, 4.6)],
        legR: [...shoes('boot', { upper: 0x4a2a14, sole: 0x2a160a, lace: 0x8a6a3a }), band(-6.4, 1.2, shadeOf(0x4e5a30, 0.85), 4.9)],
        legL: [...shoes('boot', { upper: 0x4a2a14, sole: 0x2a160a, lace: 0x8a6a3a }), band(-6.4, 1.2, shadeOf(0x4e5a30, 0.85), 4.9)],
      };
    },
  },
  // Chad, sunburnt ex-lifeguard: a blond afro with sunglasses on top, shirtless,
  // a whistle, red swim shorts with a white cross, flip-flops, a flamingo ring
  rt_denver_chad: {
    painter: 'hero', scale: 1.16, accent: 0xff7aa8,
    paint: { skinTone: 0xf09470, hair: 0xe0b450, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x4a2a14, pupil: 0x140806, brow: 0xb88a30, mouth: 'grin', cheeks: 0xe86a5a, top: 0xf09470, sleeve: 0xf09470, shortSleeve: 0, collar: false, hem: 0xf09470, pants: 0xc8241e, shorts: 6, shoes: 0xf09470 },
    body(S, D) {
      // a bare, sunburnt chest: pecs, a belly line, redder shoulders
      D(20.5, 23.5, 0xd87850, 7, 1); D(25, 23.5, 0xd87850, 7, 1); D(23.5, 25, 0xd87850, 1, 10); D(22, 27.5, 0xe08860, 2, 1); D(25, 27.5, 0xe08860, 2, 1); D(22, 29.5, 0xe08860, 2, 1); D(25, 29.5, 0xe08860, 2, 1);
      for (const [u, v] of [[40, 16], [32, 48]]) S.rect(u, v + 4, 16, 2, 0xe87858, 0.05);
      // a white cross on the left leg of the shorts, a white stripe down the sides
      D(25, 54.5, 0xffffff, 3, 1); D(25.5, 54, 0xffffff, 1, 3);
      for (const [u, v, s] of [[0, 16, 0], [16, 48, 8]]) D(u + s + 1.5, v + 4, 0xf4f0e8, 1, 11);
    },
    vox: { style: 'afro', base: 0xe0b450, shade: 0xa87c24, light: 0xf8dc88, seed: 223, shape: { tuft: 0.26, spike: 0.08, bump: 0.36 } },
    parts() {
      const pink = 0xf27aa8, pinkD = 0xd85a8a, pinkL = 0xf8a8c8, L = [];
      // the flamingo ring under his left arm, on its side, the neck and head up at the front
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; L.push(B([4.2, -6 + Math.sin(a) * 4, 1 + Math.cos(a) * 4], [2.6, 2.6, 2.6], i % 3 === 0 ? pinkL : i % 2 ? pink : pinkD)); }
      L.push(B([4.2, -0.6, 4.2], [1.7, 3.6, 1.7], pink), B([4.2, 1.8, 4.6], [1.7, 1.8, 2.2], pink), B([4.2, 1.6, 6.2], [1.1, 1, 1.6], 0xf0d030), B([4.2, 1.2, 7], [0.9, 0.8, 0.8], INK), B([3.3, 2.2, 4.8], [0.2, 0.6, 0.6], 0xffffff), B([5.1, 2.2, 4.8], [0.2, 0.6, 0.6], 0xffffff), B([3.25, 2.2, 4.9], [0.15, 0.3, 0.3], INK), B([5.15, 2.2, 4.9], [0.15, 0.3, 0.3], INK));
      return {
        head: [
          // sunglasses pushed up on the afro
          B([0, 11.4, 5], [8.4, 0.6, 0.6], 0x141414), ...mirrorX([B([-2, 11.4, 5.4], [3.2, 2.2, 0.6], 0x141414), B([-2, 11.4, 5.75], [2.4, 1.4, 0.2], 0x2a4a5a), B([-4.2, 11.4, 2.4], [0.5, 0.5, 5.4], 0x141414)]),
          ...mirrorX([B([-4.4, 2.6, 1.4], [0.4, 0.8, 0.8], 0xe0b030)]),
        ],
        torso: [...line([-1.6, 11.9, 2.4], [0, 7.4, 2.4], 5, [0x1a1a1e], 3, 0.4, 0), ...line([1.6, 11.9, 2.4], [0, 7.4, 2.4], 5, [0x1a1a1e], 4, 0.4, 0), B([0, 6.4, 2.6], [1.4, 1.8, 0.8], 0xe8c040), B([0, 7.4, 2.6], [0.8, 0.5, 0.5], 0xe8c040)],
        hips: [B([0, 0.3, 0], [8.8, 0.8, 4.8], 0xa81c18), B([-0.5, -0.6, 2.5], [0.4, 1.8, 0.3], 0xf4f0e8), B([0.5, -0.6, 2.5], [0.4, 1.8, 0.3], 0xf4f0e8)],
        armL: [band(-6.4, 0.9, 0xe8c870, 4.6), ...L.map((b) => ({ ...b, at: [b.at[0] - 0.6, b.at[1] - 2, b.at[2] + 2.2] }))],
        armR: [band(-7, 0.7, 0x2a8ad8, 4.6)],
        legR: [B([0, -11.6, 0.6], [4.9, 0.9, 6], 0x1a1a1e), B([0, -11.1, 0.6], [4.95, 0.25, 6.05], 0xf4f0e8), B([0, -10.4, 1.4], [4.75, 0.6, 1], 0xc8241e), B([0, -10.4, 2.4], [0.6, 0.6, 0.8], 0xc8241e)],
        legL: [B([0, -11.6, 0.6], [4.9, 0.9, 6], 0x1a1a1e), B([0, -11.1, 0.6], [4.95, 0.25, 6.05], 0xf4f0e8), B([0, -10.4, 1.4], [4.75, 0.6, 1], 0xc8241e), B([0, -10.4, 2.4], [0.6, 0.6, 0.8], 0xc8241e)],
      };
    },
  },
  // Sal the valet: curly black hair under a maroon pillbox cap, a double-
  // breasted maroon jacket with gold buttons and braid, a bow tie, white gloves,
  // black trousers with a gold stripe, and a fistful of car keys
  rt_vegas_valet: {
    painter: 'person', scale: ADULT_SCALE, accent: 0xf0c850,
    paint: { skin: 0xdca078, hair: 0x18100e, fringe: 1, hairSide: 3, hairBack: 6, eyeRow: 3, eye: 0x3a2410, brow: 0x141010, smile: true, browUp: true, top: 0x7a1828, collar: 0xf6f6f2, sleeve: 0x7a1828, hand: 0xf6f6f2, pants: 0x241818, legStripe: 0xd8a830, shoes: 0x0e0e10, saturate: 1.15,
      body: (s) => { s.rect(16, 30, 24, 1, 0xd8a830, 0); for (const [u, v] of [[40, 16], [32, 48]]) s.rect(u, v + 11, 16, 1, 0xd8a830, 0); } },
    hair: { c: [0, 7, -0.6], r: [5.4, 4, 5.6], bump: 0.4, shell: 1.3, fringe: 6.8, jag: 0.8, side: 2.6, back: 0.6, top: 9.6, tuft: 0.26, spike: 0.06, tones: [0x080606, 0x18100e, 0x302422] },
    parts() {
      const m = 0x7a1828, md = 0x5a1020, gold = 0xe0b030;
      return {
        hat: [B([0, 10.4, -0.4], [6.6, 3, 6.6], m), B([0, 9.2, -0.4], [6.8, 0.6, 6.8], gold), B([0, 11.95, -0.4], [6.7, 0.3, 6.7], shadeOf(m, 0.8)), B([0, 10.6, 2.95], [0.9, 0.9, 0.3], gold)],
        torso: [
          // the double-breasted front: overlapping panel, two columns of buttons, gold edges
          B([0.6, 5.4, 2.45], [5.4, 10.8, 0.3], m), B([-2.1, 9.2, 2.65], [0.3, 3.2, 0.2], gold, [0, 0, -0.35]), B([3.3, 5.4, 2.65], [0.3, 10.8, 0.2], gold),
          ...[3, 5.4, 7.8].flatMap((y) => [B([-1.2, y, 2.65], [0.7, 0.7, 0.3], gold), B([2.2, y, 2.65], [0.7, 0.7, 0.3], gold)]),
          ...mirrorX([B([-1.2, 11.4, 2.3], [1.6, 0.8, 0.4], 0xf6f6f2, [0, 0, -0.45]), B([-3.6, 12.1, 0], [2.2, 0.7, 3.8], gold), B([-2.8, 2, 2.65], [1.8, 0.3, 0.2], gold)]),
          // the bow tie
          B([0, 11.1, 2.7], [0.8, 0.8, 0.4], 0x0e0e10), ...mirrorX([B([-0.9, 11.1, 2.65], [1.2, 1.2, 0.4], 0x141414)]),
          B([0, 0.4, 0], [8.9, 1, 4.9], md),
        ],
        hips: [B([0, -0.8, 2.3], [8, 1.6, 0.4], md), B([0, -0.8, -2.3], [8, 1.6, 0.4], md)],
        armR: [band(-6.6, 0.8, gold, 4.8), band(-7.6, 0.9, 0xf6f6f2, 4.7)],
        // a fistful of car keys and fobs on a gold ring
        armL: [band(-6.6, 0.8, gold, 4.8), band(-7.6, 0.9, 0xf6f6f2, 4.7), ...grow([...ring(-11, 1.2, [gold], 9, { size: 0.45, step: 0.8, h: 0.45 }).map((b) => ({ ...b, at: [b.at[0], b.at[1], b.at[2] + 2.4] })),
          ...[[-1, -12.8, 0x1a1a1e], [0, -13.4, 0x2a2a2e], [1, -12.6, 0x1a1a1e], [-0.4, -14, 0x141418]].map(([x, y, c]) => B([x, y, 2.8], [0.9, 1.8, 0.6], c)), ...[[-0.6, -12.2], [0.6, -12.4]].map(([x, y]) => B([x, y, 3.2], [0.4, 2, 0.3], 0xc8c8d0)), B([0, -12.9, 3.15], [0.4, 0.4, 0.1], 0xc82a2a)], 1.6, [0, -10.5, 2.4])],
        legR: [...shoes('loafer', { upper: 0x101012, sole: 0x060606 }), B([0, -10.2, 2.7], [1.6, 0.4, 0.3], gold)],
        legL: [...shoes('loafer', { upper: 0x101012, sole: 0x060606 }), B([0, -10.2, 2.7], [1.6, 0.4, 0.3], gold)],
      };
    },
  },
  // Trudy the tour guide: red curls in a ponytail, a white visor with sunglasses
  // on it, gold hoops, a hibiscus shirt, a lanyard, a fanny pack, khaki shorts,
  // high-tops, and her fold-out map of the stars' homes
  rt_la_guide: {
    painter: 'hero', scale: ADULT_SCALE, accent: 0xf0c840,   // (round 9: an adult, 1.2 → ADULT_SCALE)
   
    paint: { skinTone: 0xe8a478, hair: 0xb04a1a, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x4a2a14, pupil: 0x140806, brow: 0x8a3410, lashes: true, mouth: 'grin', freckles: 0xd08a5a, top: 0xf0602a, shortSleeve: 4, collar: 0xe0501a, hem: 0xc8481a, pants: 0x8a8050, shorts: 5, cargo: true, socks: 0xf4f4f0, shoes: 0x1a1a1e, sole: 0xf4f0e8 },
    body(S, D) {
      // hibiscus flowers on the shirt and sleeves
      const r = mulberry32(4), cols = [[0xf8d0e0, 0xf0e070], [0xffffff, 0xf0c040], [0xe83a6a, 0xf8e070]];
      const flower = (x, y, [p, c]) => { D(x - 0.5, y, p, 3, 1); D(x, y - 0.5, p, 1, 3); D(x - 0.5, y - 0.5, p, 1, 1); D(x + 0.5, y + 0.5, p, 1, 1); D(x, y, c, 1, 1); };
      for (let i = 0; i < 16; i++) flower(17 + Math.floor(r() * 44) / 2, 21 + Math.floor(r() * 20) / 2, cols[i % 3]);
      for (const [u, v] of [[40, 16], [32, 48]]) for (let i = 0; i < 4; i++) flower(u + 1 + Math.floor(r() * 28) / 2, v + 4.5 + Math.floor(r() * 5) / 2, cols[i % 3]);
    },
    vox: { style: 'shaggy', base: 0xb04a1a, shade: 0x782a0a, light: 0xd8702e, seed: 241, shape: { r: [6.4, 5.4, 6.4], tuft: 0.3, spike: 0.1, bump: 0.46, top: 9.4, side: 0, back: -2 } },
    tail: { pivot: [0, 7.6, -4.8], base: 0xb04a1a, shade: 0x782a0a, light: 0xd8702e, length: 10, width: 4, back: 1.4 },
    parts() {
      const white = 0xf6f4ee;
      return {
        hat: [
          // the visor: a white band and brim with a little yellow sun, sunglasses up on it
          B([0, 8.4, 0], [9.8, 1.6, 9.6], white), B([0, 8, 6.2], [9, 0.6, 4.6], white), B([0, 8.6, 4.85], [1.4, 1.4, 0.2], 0xf0c030), B([0, 8.6, 5], [0.6, 0.6, 0.1], 0xe86a20),
          B([0, 9.6, 3.2], [8, 0.5, 0.5], 0x141414), ...mirrorX([B([-2, 9.8, 3.4], [3, 1.8, 0.5], 0x141414)]),
        ],
        head: mirrorX([B([-4.5, 2.2, 1.6], [0.4, 1.6, 1.6], 0xe0b030), B([-4.5, 2.2, 1.6], [0.5, 0.8, 0.8], 0xe8a478)]),
        torso: [
          // a blue lanyard and badge, the fanny pack at her hip
          ...mirrorX([B([-1.6, 9.8, 2.4], [0.4, 4.6, 0.4], 0x2a6ad8, [0, 0, -0.35])]), B([0, 6.6, 2.55], [1.8, 2.4, 0.3], white), B([0, 7.2, 2.72], [1.4, 0.6, 0.1], 0x2a6ad8), B([0, 6.2, 2.72], [1, 0.8, 0.1], 0xe8b088),
          B([0, 0.8, 0], [8.9, 0.8, 4.9], 0x1a1a1e), B([1.6, 0.6, 2.9], [4, 2.2, 1.4], 0x2a2a2e), B([1.6, 1.4, 3.65], [3.6, 0.3, 0.2], 0xc8a040), B([3.2, 0.5, 3.65], [0.5, 0.8, 0.2], 0xc8a040),
          ...mirrorX([B([-1.4, 11.6, 2.3], [1.6, 0.8, 0.4], 0xe0501a, [0, 0, -0.45])]),
        ],
        // the fold-out star map, open in her right hand
        armR: [band(-7.2, 0.6, 0x2a2a2e, 4.6),
          ...[[0, 0xf4ead0], [2.8, 0xf0e4c4], [5.6, 0xf4ead0]].map(([x, c], i) => B([x, -9.4, 3.4 + (i === 1 ? 0.3 : 0)], [2.8, 5, 0.3], c)),
          ...[[-8.4, 0.4, 0xe0a020], [-10, 1.6, 0xe8606a], [-8.8, 3.4, 0x3a8ae8], [-10.6, 4.4, 0x5ab04a], [-8, 5.4, 0xe0a020], [-10.8, -0.6, 0x3a8ae8], [-9.4, 2.4, 0x40b0b0]].map(([y, x, c]) => B([x, y, 3.85], [0.9, 0.9, 0.1], c))],
        armL: [band(-7.2, 0.6, 0x5a3a20, 4.6), band(-6.6, 0.4, 0xe0b030, 4.7)],
        legR: [...footwear('hitop', { upper: 0x1a1a1e, sole: 0xf4f0e8, lace: 0xf4f0e8 }), band(-7.6, 1.4, 0xf4f4f0, 4.6), band(-0.6, 1, shadeOf(0x8a8050, 1.12), 4.8)],
        legL: [...footwear('hitop', { upper: 0x1a1a1e, sole: 0xf4f0e8, lace: 0xf4f0e8 }), band(-7.6, 1.4, 0xf4f4f0, 4.6), band(-0.6, 1, shadeOf(0x8a8050, 1.12), 4.8)],
      };
    },
  },
  // Grandma Mae, a tiny old fisherwoman: grey curls under a yellow bucket hat
  // with a white flower, a yellow raincoat over a striped sweater, olive
  // trousers, green rubber boots, a fishing rod with a bobber, a tackle box
  rt_sm_fisher: {
    painter: 'person', scale: 1.18, accent: 0xf0c020,   // (round 9: a tiny old woman stands about a twelve-year-old's height, her skull level with Percy's: 1.02 → 1.18)
   
    paint: { skin: 0xe8b090, hair: 0xb8b4b8, fringe: 2, hairSide: 3, hairBack: 6, eyeRow: 3, eye: 0x3a2414, brow: 0x9a969c, smile: true, wrinkles: 0xc49076, blush: 0xf09a94, top: 0x2e5a8a, knit: true, jacket: 0xf0c020, lapel: 0xd8a810, sleeve: 0xf0c020, pants: 0x5a5a34, shoes: 0x3e5a2e, saturate: 1.12,
      body: (S) => {
        // the sweater's stripes: navy, teal and cream
        const D = (x, y, c, n, m) => S.dot(x, y, c, n, m);
        for (let y = 20; y < 32; y += 3) { D(16, y, 0x3a8a9a, 48, 2); D(16, y + 1, 0xf0e8d0, 48, 1); }
      } },
    hair: { c: [0, 6.4, -0.6], r: [6.2, 4.4, 6], bump: 0.46, shell: 1.5, fringe: 6.8, jag: 0.6, side: 1.6, back: 0.6, top: 8.4, tuft: 0.36, spike: 0.08, tones: [0x8a8690, 0xb8b4b8, 0xe0dce0] },
    parts() {
      const y = 0xf0c020, yd = 0xc89a10, L = [];
      // the bucket hat: a crown and a sloping brim, a white flower on the band
      L.push(B([0, 9.4, 0], [9.8, 2.8, 9.8], y), B([0, 11.1, 0], [8.6, 0.8, 8.6], yd), B([0, 8.9, 0], [10, 0.6, 10], yd));
      for (const [x, z, w, d] of [[0, 5.5, 12, 2.2], [0, -5.5, 12, 2.2], [5.5, 0, 2.2, 10], [-5.5, 0, 2.2, 10]]) L.push(B([x, 8.1, z], [w, 0.6, d], y, [z ? Math.sign(z) * 0.35 : 0, 0, x ? -Math.sign(x) * 0.35 : 0]));
      L.push(B([2.4, 9.6, 4.95], [2, 0.7, 0.4], 0xf8f6ee), B([2.4, 9.6, 4.95], [0.7, 2, 0.4], 0xf8f6ee), B([2.4, 9.6, 5.2], [0.6, 0.6, 0.2], 0xf0c030));
      return {
        hat: L,
        torso: [B([0, 12, 0], [9.2, 1.4, 5.2], yd), ...[3, 6, 9].map((h) => B([-2.1, h, 2.5], [0.8, 0.8, 0.3], 0x5a4a2a)), ...mirrorX([B([-2.6, 4, 2.45], [1.6, 1.4, 0.3], yd)]),
          B([0.2, 6.6, 2.45], [1, 13, 0.4], 0x6a3a1e, [0, 0, 0.52]), B([0.2, 6.6, -2.45], [1, 13, 0.4], 0x6a3a1e, [0, 0, 0.52])],
        hips: [...mirrorX([B([-3, -2.6, 0.2], [3, 5.2, 4.8], y)]), B([0, -2.6, -2.3], [9, 5.2, 0.6], y), B([0, -5.3, 0], [9.2, 0.4, 5], yd), B([4.6, -1.4, 0.6], [1.4, 3, 3], 0x6a3a1e)],
        // the rod, upright in her right fist: a reel, a red-and-white bobber hanging from the tip
        armR: [band(-7.6, 1, yd, 4.8), B([0, -6, 2.4], [0.8, 34, 0.8], 0x6a4a2a), B([0, 11.6, 2.4], [0.5, 2, 0.5], 0x3a2a1a), B([0, -14, 2.4], [1.1, 4, 1.1], 0x3a2a1a),
          B([-1.6, -11.4, 2.4], [2.4, 2.4, 2.4], 0x2a2a2a), B([-2.9, -11.4, 2.4], [0.4, 1.6, 1.6], 0xb8b8c0), B([0, 0, 2.4], [1, 0.6, 1], 0xc8a040), B([0, 6, 2.4], [1, 0.6, 1], 0xc8a040),
          B([0, 6.4, 3.6], [0.15, 6, 0.15], 0xe0e0e0), B([0, 3.4, 3.6], [1.4, 0.8, 1.4], 0xf8f8f4), B([0, 2.6, 3.6], [1.4, 0.8, 1.4], 0xe02a2a), B([0, 4, 3.6], [0.3, 0.6, 0.3], 0xe02a2a)],
        // the green tackle box in her left hand
        armL: [band(-7.6, 1, yd, 4.8), B([0, -10.8, 1.2], [0.6, 1.2, 2.4], 0x2a2a2a), B([0, -13.6, 1.2], [3, 4, 5.6], 0x3e6a3a), B([0, -12.2, 1.2], [3.1, 0.4, 5.7], 0x2a4a28), B([1.55, -12.8, 0.2], [0.2, 0.8, 0.8], GOLD), B([1.55, -12.8, 2.2], [0.2, 0.8, 0.8], GOLD)],
        legR: [...shoes('boot', { upper: 0x3e5a2e, sole: 0x1a2a1a, lace: 0x3e5a2e }), band(-6.4, 1.4, 0x34502a, 5)],
        legL: [...shoes('boot', { upper: 0x3e5a2e, sole: 0x1a2a1a, lace: 0x3e5a2e }), band(-6.4, 1.4, 0x34502a, 5)],
      };
    },
  },
};
for (const id of Object.keys(PEOPLE)) { PEOPLE[id].name = txt(`people.${id}`); }
export const PEOPLE_IDS = Object.keys(PEOPLE);
export const isPerson = (id) => Object.prototype.hasOwnProperty.call(PEOPLE, id);

// ---------------------------------------------------------------- building
const SLOTS = ['head', 'torso', 'hips', 'armR', 'armL', 'legR', 'legL'];
const seedOf = (id, k = 7) => { let s = k; for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return s; };
const mats = new Map(), kits = new Map(), glowMats = new Map();
let partM = null;

function skinFor(id, def) {
  if (mats.has(id)) return mats.get(id);
  const S = new Skin(seedOf(id, 11), 2), D = (x, y, c, n = 1, m = n) => S.dot(x, y, c, n, m);
  if (def.painter === 'hero') {
    paintHumanoid(S, { ...def.paint, shade: false });
    def.body?.(S, D);
    S.shadeLimbs(); S.saturate(def.paint.saturate ?? 1.2);
  } else {
    paintPerson(S, { ...def.paint, body: (s) => { def.paint.body?.(s); def.body?.(s, D); } });
  }
  const m = makeCharMaterial(S.texture(), { emitStrength: 0, fill: 0.08 }); m.alphaTest = 0.5;
  mats.set(id, m);
  return m;
}
function kitFor(id, def) {
  if (kits.has(id)) return kits.get(id);
  const parts = def.parts?.() ?? {}, extra = def.extra?.() ?? {}, glow = def.glow?.parts() ?? {}, seed = seedOf(id);
  const kit = { parts: {}, glow: {}, tail: null };
  for (const slot of SLOTS) {
    const unit = slot === 'head' ? PX * HS : PX, geos = [];
    const list = [...(parts[slot] ?? []), ...(extra[slot] ?? [])];
    if (list.length) geos.push(boxGeometry(list, unit));
    if (slot === 'head') {
      if (def.hair) geos.push(cellMesh(hairCells(def.hair, seed), unit, null, inHead).geometry);
      if (def.vox) { const { cells, solid } = heroHair(def.vox); geos.push(cellMesh(cells, unit, null, solid).geometry); }
      if (def.beard) geos.push(cellMesh(beardCells(def.beard, seed + 1), unit, null, inHead).geometry);
    }
    kit.parts[slot] = mergeGeometries(geos);
    if (glow[slot]?.length) kit.glow[slot] = boxGeometry(glow[slot], unit);
  }
  // (parts.hat: headwear, its own mesh so perf/bodysize.cjs can leave it out; merged with the head in game)
  if (parts.hat?.length) kit.hat = boxGeometry(parts.hat, PX * HS);
  if (def.tail) kit.tail = cellMesh(heroTail({ ...def.tail, seed: seed + 3 }), PX * HS, null).geometry;
  kits.set(id, kit);
  return kit;
}
function glowMat(color, ei) {
  const k = `${color}:${ei}`;
  if (!glowMats.has(k)) glowMats.set(k, new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1, emissive: color, emissiveIntensity: ei }));
  return glowMats.get(k);
}

// Build a person's rig (an unknown id falls back to Katie).
export function buildPerson(id) {
  if (!isPerson(id)) id = 'fields_katie';
  const def = PEOPLE[id];
  const rig = new Rig({ material: skinFor(id, def), scale: def.scale ?? ADULT_SCALE, ...def.rig });
  partM ??= new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const kit = kitFor(id, def);
  for (const slot of SLOTS) {
    if (kit.parts[slot]) { const m = rig.mesh(kit.parts[slot], partM); rig[slot].add(m); rig.extras[slot === 'head' ? 'hair' : slot + 'Parts'] = m; }
    if (kit.glow[slot]) { const m = rig.mesh(kit.glow[slot], glowMat(def.glow.color, def.glow.ei)); rig[slot].add(m); rig.extras[slot + 'Glow'] = m; }
  }
  if (kit.hat) rig.head.add(markHeadwear(rig.mesh(kit.hat, partM)));
  if (kit.tail) {
    // long hair down the back on a spring, like Annabeth's ponytail
    const [x, y, z] = def.tail.pivot ?? [0, 7.6, -4.2], piv = new THREE.Group(); piv.position.set(x * PX * HS, y * PX * HS, z * PX * HS);
    piv.add(rig.mesh(kit.tail, partM)); rig.head.add(piv);
    rig.strands.push({ g: piv, ax: 0, az: 0, vx: 0, vz: 0, stiff: 26, base: [0, 0] });
  }
  // a broad build: a wider torso, arms and legs set further apart (as on Tyson)
  if (def.wide) {
    const w = def.wide;
    for (const m of rig.torso.children) if (m.isMesh) m.scale.set(w, 1, 1 + (w - 1) * 0.6);
    rig.armR.position.x *= w; rig.armL.position.x *= w;
    rig.legR.position.x *= 1 + (w - 1) * 0.6; rig.legL.position.x *= 1 + (w - 1) * 0.6;
    for (const arm of [rig.armR, rig.armL]) for (const m of arm.children) if (m.isMesh) m.scale.set(1 + (w - 1) * 0.5, 1, 1 + (w - 1) * 0.5);
    for (const leg of [rig.legR, rig.legL]) for (const m of leg.children) if (m.isMesh) m.scale.set(1 + (w - 1) * 0.4, 1, 1 + (w - 1) * 0.4);
    for (const m of rig.hips.children) if (m.isMesh) m.scale.set(w, 1, 1 + (w - 1) * 0.6);
  }
  // a weapon's tip (def.tip: [slot, x, y, z], skin pixels in that part), for perf/weapons.cjs
  if (def.tip) markTip(rig[def.tip[0]], def.tip[1], def.tip[2], def.tip[3], def.tip[4]);
  rig.person = id;
  rig.look = { accent: def.accent ?? 0xc9963a };
  for (const b of [rig.hips, rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL]) mergeChildren(rig, b);   // (each limb's skin box and its overlay as one mesh: character.js)
  return rig;
}
