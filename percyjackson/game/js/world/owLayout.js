// The open world around Camp Half-Blood: its size, where the camp sits in it,
// and the regions you can walk to (the Minecraft Dungeons feel: one big map,
// each region its own look, monsters and level, waystones to teleport between).
// Pure data and helpers (no Three.js), so the node tests can check them;
// world/openworld.js builds it, openworld/runtime.js runs it.
//
// Axes: +x east, +z south (as in camp.js). The sea runs down the west edge.
//
//            x 0          116        210  250                 400
//   z   0    +-------- North Shore ----+---- Mount Othrys ------+
//            |  (cliffs, lighthouse,    |   (titan ruins,        |
//   z 120    +--+-- sea caves) ---------+-+-- cyclops camps) ---+
//            |C |  Strawberry Fields      |                      |
//            |A |  (farms, the orchard)   |   The Canyon         |
//   z 220    |M +-------------------------+   (desert mesas,     |
//            |P |  The Camp Woods          |   Medusa's garden)   |
//   z 290    |  |  (deep forest, Zeus's    +----------+-----------+
//   z 304    +--+   Fist, Bunker 9)        |  Fields of Asphodel  |
//   z 330    +---- The Labyrinth ---+------+  (the Underworld's   |
//            |   (ruined maze,      |       ash plains, the gate)|
//   z 400    +--- Daedalus) --------+----------------------------+
export const WORLD = { sx: 400, sy: 40, sz: 400 };
// Camp Half-Blood (camp.js, with the Road West strip) is copied in here.
export const CAMP_AT = { x: 0, z: 120, sx: 116, sz: 184 };

// rects: [x0, z0, x1, z1) half-open. level: [first, last] monster level.
// kinds: roaming monsters as [kind, weight], about three quarters of the weight
// fodder (world/roamZones.js FODDER_KINDS: they come in hordes) and the tough
// ones rare. fodder: the crowd round a monster camp (openworld/runtime.js).
// biome: the look (world/biomes.js).
// The first region whose rect holds a spot owns it.
export const REGIONS = [
  { id: 'camp', rects: [[0, 120, 116, 304]], level: [1, 2], safe: true, biome: 'camp' },
  { id: 'fields', rects: [[116, 120, 250, 220]], level: [1, 3], biome: 'ow_fields',
    kinds: [['karpos', 4.5], ['karpos_slinger', 2], ['rat', 1.5], ['colchis_calf', 2.5]], fodder: ['karpos', 'karpos', 'karpos_slinger', 'rat'] },
  { id: 'woods', rects: [[116, 220, 250, 330], [0, 304, 116, 330]], level: [2, 4], biome: 'ow_woods',
    kinds: [['myrmex', 4], ['myrmex_spitter', 2], ['pup', 2], ['boarlet', 2.5]], fodder: ['myrmex', 'myrmex', 'myrmex_spitter', 'pup'] },
  { id: 'shore', rects: [[0, 0, 210, 120]], level: [3, 5], biome: 'ow_shore',
    kinds: [['crab', 5], ['telekhine', 2], ['harpy', 2], ['king_crab', 0.8]], fodder: ['crab', 'crab', 'crab', 'telekhine'] },
  { id: 'canyon', rects: [[250, 130, 400, 290]], level: [5, 7], biome: 'ow_canyon',
    kinds: [['myrmex', 3.5], ['basilisk', 2.5], ['spartoi', 2], ['stymphalian', 1], ['scorpion', 0.4], ['earthborn', 0.9]], fodder: ['myrmex', 'basilisk', 'spartoi'] },
  { id: 'labyrinth', rects: [[0, 330, 170, 400]], level: [6, 8], biome: 'ow_labyrinth',
    kinds: [['spartoi', 4], ['spider', 2.5], ['daedalus_drone', 2], ['automaton', 2.2]], fodder: ['spartoi', 'spartoi', 'spider', 'daedalus_drone'] },
  { id: 'othrys', rects: [[210, 0, 400, 130]], level: [8, 10], biome: 'ow_othrys',
    kinds: [['spartoi', 4], ['telekhine', 2.5], ['harpy', 2], ['laistrygonian', 0.8]], fodder: ['spartoi', 'spartoi', 'telekhine'] },
  { id: 'asphodel', rects: [[250, 290, 400, 400], [170, 330, 250, 400]], level: [9, 12], biome: 'ow_asphodel',
    kinds: [['shade', 4.5], ['keres', 2.5], ['spartoi', 1.5], ['ghost', 2.4]], fodder: ['shade', 'shade', 'keres', 'spartoi'] },
];
export const REGION = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const REGION_IDS = REGIONS.map((r) => r.id);

export const inRects = (rects, x, z) => rects.some(([x0, z0, x1, z1]) => x >= x0 && x < x1 && z >= z0 && z < z1);
export function regionAt(x, z) {
  for (const r of REGIONS) if (inRects(r.rects, x, z)) return r;
  return null;
}
// The region of every column, as a grid of indices into REGIONS (-1 outside).
export function regionGrid() {
  const { sx, sz } = WORLD, g = new Int8Array(sx * sz).fill(-1);
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) { const r = regionAt(x, z); g[z * sx + x] = r ? REGIONS.indexOf(r) : -1; }
  return g;
}
// How far (in blocks, up to `cap`) each column is from a column of another
// region: terrain fades to the camp's ground height towards every border,
// so neighbouring regions always meet at the same level.
export function borderDistance(grid, cap = 24) {
  const { sx, sz } = WORLD, d = new Float32Array(sx * sz).fill(cap);
  const q = [];
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const i = z * sx + x, r = grid[i];
    if ((x > 0 && grid[i - 1] !== r) || (x < sx - 1 && grid[i + 1] !== r) || (z > 0 && grid[i - sx] !== r) || (z < sz - 1 && grid[i + sx] !== r)) { d[i] = 0; q.push(i); }
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % sx, z = (i / sx) | 0, nd = d[i] + 1;
    if (nd >= cap) continue;
    for (const j of [x > 0 ? i - 1 : -1, x < sx - 1 ? i + 1 : -1, z > 0 ? i - sx : -1, z < sz - 1 ? i + sx : -1]) if (j >= 0 && d[j] > nd) { d[j] = nd; q.push(j); }
  }
  return d;
}
// The west coast: the sea is west of x = coast(z) (the camp's own shore in its rows).
export const coastAt = (z) => 15 + Math.round(Math.sin(z * 0.13) * 1.6 + Math.sin(z * 0.37 + 1) * 0.8) + (z < 120 ? Math.max(0, (60 - Math.abs(z - 60)) * 0.12) : 0);

// Monster level for a spot: the region's range, rising with the distance
// from the camp side of the region; r() in [0, 1) adds a little spread.
export function levelAt(region, x, z, r = 0.5) {
  const [a, b] = region.level ?? [1, 1];
  const d = Math.hypot(x - (CAMP_AT.x + CAMP_AT.sx / 2), z - (CAMP_AT.z + CAMP_AT.sz / 2));
  const k = Math.min(1, Math.max(0, (d - 60) / 260));
  return Math.max(1, Math.min(b, Math.round(a + (b - a) * (k * 0.7 + r * 0.3))));
}
// The loot difficulty (1-4) that goes with a monster level (chests, champions' drops).
export const owDifficulty = (level = 1) => Math.max(1, Math.min(4, Math.ceil(level / 3)));

// The layout a world's systems read (openworld/runtime.js, quests, the map,
// roaming): this one for the open world, world/rtLayout.js's for the road trip.
export const OW_LAYOUT = { id: 'ow', area: 'camp', WORLD, REGIONS, REGION, regionAt, levelAt };
