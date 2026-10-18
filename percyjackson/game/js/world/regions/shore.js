// The North Shore (open world, north of camp): Long Island Sound, white chalk
// sea cliffs, beaches and dunes, a red-and-white lighthouse on its bluff, an
// old Greek trireme wrecked on the sand, sea caves with a glowing pool, tide
// pools, a fishing pier and boathouse, harpy nests on the cliff tops, a
// shrine to Poseidon, and Queen Gale, the harpy queen. Levels 3-5.
//
// Map (x east, z south; the sea along the north and west):
//   x  20-60   the wreck of the trireme on the beach, the dunes behind it
//   x  60-96   tide pools, the pier and boathouse, Poseidon's shrine in the dunes
//   x  98-126  Lighthouse Point: the bluff, the lighthouse, the keeper's cottage
//   x 128-209  Gull Cliffs: a chalk wall over the beach (the Echo Caves in it),
//              harpy nests and Queen Gale's eyrie on top
//   inland     pine woods, the ruined watchtower; the gravel road from camp
//
// The cliffs and the bluff are real walls: the world builder softens every
// slope to one-block steps, and build() raises the steep columns back to
// their full height (`unlip`), so the chalk stands sheer over the sand; their
// tops are reached from inland, where the ground rises gently.
import { B } from '../blocks.js';
import { coastAt, WORLD } from '../owLayout.js';
import { gable } from '../rooms.js';

const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// 1 inside [a, b], easing to 0 over w blocks outside it
const band = (v, a, b, w) => sm((v - a + w) / w) * sm((b - v + w) / w);

// The north waterline: z below this is the Sound (pushed out round the bluff).
export const seaLine = (x, n) => 10 + n.fbm(x, 7, 26) * 6 - 9 * band(x, 100, 124, 4);
const headland = (x, z) => 10 * band(x, 100, 124, 1) * (z < 26 ? 1 : sm(1 - (z - 26) / 18));
const cliffTop = (x, z, n) => (10 + n.ridge(x, z, 30) * 5) * band(x, 132, 240, 3) * (z < 46 ? 1 : sm(1 - (z - 46) / 34));

export const terrain = {
  height: (x, z, n) => {
    const s = seaLine(x, n), d = z - s;
    if (d < 0) return d < -3 ? -3 : -1;                                      // the Sound (shallows by the beach)
    const inland = 1.4 + (n.fbm(x, z, 34) - 0.45) * 6;
    let h = Math.min(1, d * 0.15) * (1 - sm((d - 5) / 7)) + inland * sm((d - 5) / 7);
    const dune = band(x, 24, 96, 8) * band(z, s + 4, 60, 8);
    if (dune > 0) h += dune * n.fbm(x + 40, z, 12) ** 2 * 9;
    if (d >= 8) h = Math.max(h, cliffTop(x, z, n));                          // the chalk wall starts 8 blocks up the beach
    return Math.max(h, headland(x, z));
  },
  surface: (x, z, h, n) => {
    if (h <= 1 && z < seaLine(x, n) + 12) return B.sand;
    if (x > 22 && x < 98 && z < 62 && h < 7 && n.value(x * 0.21, z * 0.21) < 0.78) return B.sand;
    return n.value(x * 0.13 + 50, z * 0.13) > 0.83 ? B.rock : B.grass;
  },
};

// The quests (openworld/quests.js): Galene the Nereid at the tide pools, Lee Fletcher at the lighthouse.
export const QUESTS = [
  { id: 'shore_pearls', giver: 'shore_nereid', steps: [{ type: 'collect', count: 5 }, { type: 'return' }], reward: { xp: 200, coins: 70 } },
  { id: 'shore_wreck', giver: 'shore_nereid', requires: ['shore_pearls'], steps: [{ type: 'camp', id: 'shore_wreck_crew' }, { type: 'chest', id: 'shore_c_wreck' }, { type: 'return' }], reward: { xp: 280, coins: 90, item: 'rare' } },
  { id: 'shore_trident', giver: 'shore_nereid', requires: ['shore_wreck'], steps: [{ type: 'kill', kind: 'skeleton', count: 6, region: 'shore' }, { type: 'shrine', id: 'shore_poseidon' }, { type: 'return' }], reward: { xp: 360, coins: 120, item: 'rare' } },
  { id: 'shore_harpies', giver: 'shore_lee', steps: [{ type: 'kill', kind: 'harpy', count: 8, region: 'shore' }, { type: 'return' }], reward: { xp: 200, coins: 70 } },
  { id: 'shore_light', giver: 'shore_lee', requires: ['shore_harpies'], steps: [{ type: 'collect', count: 4 }, { type: 'reach', x: 112, z: 13, radius: 2.4 }, { type: 'return' }], reward: { xp: 300, coins: 100, item: 'rare' } },
  { id: 'shore_queen', giver: 'shore_lee', requires: ['shore_light'], steps: [{ type: 'camp', id: 'shore_roost' }, { type: 'champion', id: 'shore_queen_gale' }, { type: 'return' }], reward: { xp: 450, coins: 160, item: 'unique' } },
];

export function build(c) {
  const { W, deco, add, rand, trees, scatter, level, top, n, FY } = c;
  const S = (x) => Math.round(seaLine(x, n));
  const put = (x, y, z, id) => W.set(x, y, z, id);
  const fill = (x0, y0, z0, x1, y1, z1, id) => W.fill(x0, y0, z0, x1, y1, z1, id);
  const disc = (cx, cz, r0, r1, fn) => { const R = Math.ceil(r1); for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const d = Math.hypot(dx, dz); if (d > r0 && d <= r1) fn(cx + dx, cz + dz, d, Math.atan2(dz, dx)); } };
  const prop = (kind, x, y, z, o) => deco.prop(kind, x + 0.5, y, z + 0.5, o);
  const sprite = (type, x, y, z, o = {}) => deco.add(type, x + 0.5, y, z + 0.5, { scale: 0.9, sway: 1, ...o });
  // register a place inside a cave or a hold: open its column for at() to find the floor, then close it again
  const under = (x, z, y, fn) => { const keep = []; for (let yy = y; yy < WORLD.sy; yy++) { keep.push(W.get(x, yy, z)); W.set(x, yy, z, 0); } fn(); keep.forEach((id, i) => W.set(x, y + i, z, id)); };

  // ------------------------------------------------------------ cliffs: stand the chalk up again
  // the engine's height for a column (its fade to the borders and the coast included)
  const rawH = (x, z) => {
    let h = terrain.height(x, z, n) * sm(Math.min(119 - z, 209 - x, 26) / 22);
    const cz = coastAt(z);
    if (x < cz) h = Math.min(h, -Math.min(3, Math.ceil((cz - x) / 2))); else if (x < cz + 4) h = Math.min(h, 0);
    return Math.max(FY - 4, Math.min(WORLD.sy - 10, Math.round(FY + h)));
  };
  for (let z = 0; z < 100; z++) for (let x = 96; x < 210; x++) {
    const want = rawH(x, z), g = top(x, z);
    if (want - g < 2 || (z - seaLine(x, n) > 24 && (x < 98 || x > 126))) continue;      // only the sea faces (the plateaus' own bumps stay soft)
    for (let y = Math.max(1, g - 5); y < want; y++) {
      const layer = (y + ((x * 7 + z * 3) >> 4)) % 5;
      W.data[W.idx(x, y, z)] = (y === want - 1 ? B.grass : y === want - 2 ? B.dirt : layer === 0 ? B.marble_white : layer === 3 && ((x + z) & 3) === 0 ? B.stone : B.plaster);
    }
  }

  // ------------------------------------------------------------ waystones
  add.waystone('shore_dunes', 70, 60);
  add.waystone('shore_lighthouse', 113, 30);
  add.waystone('shore_cliffs', 168, 62);

  // ------------------------------------------------------------ paths: a boardwalk to the pier, the coast road east
  c.road([[70, 57], [74, 44], [79, S(79) + 4]], B.planks, 3);
  c.road([[72, 62], [92, 50], [106, 36], [113, 33]], B.gravel_path, 3);
  c.road([[118, 34], [140, 52], [160, 60], [168, 64]], B.gravel_path, 3);
  c.road([[168, 64], [150, 82], [140, 90]], B.dirt_path, 2);
  c.road([[70, 62], [52, 52], [44, 44]], B.dirt_path, 2);

  // ------------------------------------------------------------ Lighthouse Point
  {
    const cx = 112, cz = 13;
    const y0 = top(cx, cz);
    c.flatten(cx - 8, cz - 6, cx + 8, cz + 9, y0, B.grass);
    // the tower: red and white bands, solid stone inside
    for (let y = y0; y < y0 + 13; y++) disc(cx, cz, -1, 3.6, (x, z) => put(x, y, z, Math.floor((y - y0) / 3) % 2 ? B.barn_red : B.marble_white));
    // the gallery and its rail, the glass lamp room, the lamp
    disc(cx, cz, -1, 5.6, (x, z) => put(x, y0 + 13, z, B.dark_planks));
    disc(cx, cz, 5.0, 5.6, (x, z, d, a) => { if (Math.abs(Math.atan2(Math.sin(a - 1.3), Math.cos(a - 1.3))) > 0.45) put(x, y0 + 14, z, B.white_trim); });
    disc(cx, cz, 1.7, 2.8, (x, z, d, a) => { const door = Math.abs(Math.atan2(Math.sin(a - 1.3), Math.cos(a - 1.3))) < 0.5; for (let y = y0 + 14; y <= y0 + 16; y++) if (!door || y === y0 + 16) put(x, y, z, B.glass); });
    put(cx, y0 + 14, cz, B.lantern); put(cx, y0 + 15, cz, B.gold_plate);
    W.addLight(cx + 0.5, y0 + 15.5, cz + 0.5, 0xfff0b0, 6, 26);
    add.chest({ id: 'shore_c_lighthouse', x: cx - 1, z: cz - 1, rarity: 'rare' });
    disc(cx, cz, -1, 3.3, (x, z) => put(x, y0 + 17, z, B.barn_red));
    disc(cx, cz, -1, 2.2, (x, z) => put(x, y0 + 18, z, B.barn_red));
    disc(cx, cz, -1, 1.2, (x, z) => put(x, y0 + 19, z, B.barn_red));
    put(cx, y0 + 20, cz, B.gold_plate);
    W.addRoof([cx - 4, y0 + 17, cz - 4], [cx + 4, y0 + 20, cz + 4], [[cx - 3, y0 + 14, cz - 3], [cx + 3, y0 + 16, cz + 3]]);
    // the outside stair: one turn round the tower, from the south-east up to the gallery
    const a0 = 1.3 + 0.35;
    disc(cx, cz, 5.6, 7.1, (x, z, d, a) => {
      let f = (a - a0) / (Math.PI * 2); f -= Math.floor(f);
      const hf = Math.round(f * 14);
      if (hf <= 0) return;
      if (d > 6.4 && (x + z) % 3 === 0) fill(x, y0, z, x, y0 + hf - 2, z, B.log);             // posts under the outer edge
      put(x, y0 + hf - 1, z, B.planks);
      fill(x, y0 + hf, z, x, y0 + hf + 3, z, 0);
    });
    add.landmark({ id: 'shore_lighthouse', x: cx, z: cz + 8 });
    // the keeper's cottage, white boards and a red roof, a lamp-oil chest inside
    const kx0 = 101, kz0 = 19, kx1 = 107, kz1 = 24, ky = top(104, 21);
    c.flatten(kx0 - 1, kz0 - 1, kx1 + 1, kz1 + 1, ky, B.grass);
    c.k.floor(kx0, kz0, kx1, kz1, ky, B.floor_boards, 1);
    c.k.room(kx0, kz0, kx1, kz1, ky, 4, B.white_trim, { doors: [{ side: 's', at: 104, width: 1, height: 3 }] });
    for (const [x, z] of [[kx0, 21], [kx1, 22], [102, kz0], [106, kz0]]) put(x, ky + 1, z, B.window_day);
    prop('table', 104, ky, 21, { len: 2 });
    add.chest({ id: 'shore_c_cottage', x: 106, z: 20, rarity: 'common' });
    c.k.floor(kx0, kz0, kx1, kz1, ky + 4, B.dark_planks, 1);
    for (let i = 0; i < 4; i++) fill(kx0 - 1 + i, ky + 4 + i, kz0 - 1, kx1 + 1 - i, ky + 4 + i, kz1 + 1, B.barn_red);
    W.addRoof([kx0 - 1, ky + 4, kz0 - 1], [kx1 + 1, ky + 8, kz1 + 1], [[kx0, ky, kz0], [kx1, ky + 3, kz1]]);
    prop('signpost', 109, top(109, 26), 26);
    add.npc({ id: 'shore_lee', x: 108, z: 27, model: 'npc:shore_lee', yaw: Math.PI });
  }

  // ------------------------------------------------------------ the wreck of the trireme
  {
    const x0 = 28, x1 = 56, cxw = 42, zc = S(42);
    const half = (x) => Math.round(3.2 * Math.sqrt(Math.max(0, 1 - ((x - cxw) / 14.5) ** 2)));
    const deckY = FY + 2;
    for (let x = x0; x <= x1; x++) {
      const w = half(x); if (w < 1) continue;
      for (let dz = -w; dz <= w; dz++) {
        const z = zc + dz, edge = Math.abs(dz) === w;
        // the keel and the floor of the hold
        put(x, FY - 3, z, B.dark_planks); put(x, FY - 2, z, Math.abs(dz) >= w - 1 ? B.dark_planks : B.sand);
        for (let y = FY - 1; y <= deckY; y++) put(x, y, z, edge ? ((y + x) % 3 ? B.dark_planks : B.old_plank) : 0);
        put(x, deckY + 1, z, edge ? ((x & 3) ? B.dark_planks : B.old_plank) : 0);
      }
    }
    // the bronze ram at the bow (east, on the sand), a carved eye, the curled stern post
    fill(x1 + 1, FY - 1, zc, x1 + 3, FY, zc, B.bronze); put(x1 + 4, FY - 1, zc, B.bronze);
    fill(x0, deckY + 1, zc, x0, deckY + 4, zc, B.dark_planks); put(x0 + 1, deckY + 4, zc, B.dark_planks);
    // a hole in the hull on the beach side: the way into the hold (the chest is down there)
    for (let x = 45; x <= 47; x++) { fill(x, FY - 1, zc + half(x), x, FY + 1, zc + half(x), 0); put(x, FY - 2, zc + half(x), B.sand); }
    for (const [x, z, h] of [[27, zc - 2, 2], [26, zc + 1, 1], [58, zc - 2, 2], [60, zc + 1, 1], [35, zc - 5, 1], [49, zc - 5, 2], [44, zc - 6, 1]]) if (!W.get(x, FY, z)) for (let y = FY - 3; y < FY + h; y++) put(x, y, z, y >= FY && (x + y) % 2 ? B.sea_stone : B.rock);
    add.chest({ id: 'shore_c_wreck', x: 38, z: zc, rarity: 'rare' });
    add.item({ id: 'shore_lens_wreck', quest: 'shore_light', x: 50, z: zc - 1 });
    // the deck, with broken boards
    for (let x = x0 + 1; x < x1; x++) { const w = half(x) - 1; for (let dz = -w; dz <= w; dz++) if (!((x === 50 || x === 51) && dz <= 0) && !(x === 33 && dz === 1)) put(x, deckY, zc + dz, (x + dz) % 4 ? B.planks : B.old_plank); }
    // a snapped mast, a torn sail, oars over the side, a rope ladder (stacked crates) up from the beach
    fill(41, deckY + 1, zc, 41, deckY + 8, zc, B.pine_log); fill(39, deckY + 7, zc, 44, deckY + 7, zc, B.log);
    for (let y = deckY + 2; y <= deckY + 6; y++) for (let x = 38; x <= 45; x++) if (x !== 41 && !(y === deckY + 2 && (x === 38 || x === 45)) && (x + y * 3) % 17) put(x, y, zc + 1, (x >> 1) & 1 ? B.white_trim : B.barn_red);
    put(42, deckY + 9, zc, B.pine_log); put(42, deckY + 10, zc, B.barn_red);
    for (let x = 32; x <= 52; x += 4) { put(x, deckY - 1, zc - half(x) - 1, B.log); put(x, deckY - 2, zc - half(x) - 2, B.log); put(x + 1, deckY - 1, zc + half(x + 1) + 1, B.log); }
    // crates stacked up the beach side, to climb aboard
    const sw = zc + half(53);
    put(53, FY, sw + 2, B.crate); fill(53, FY, sw + 1, 53, FY + 1, sw + 1, B.crate); put(53, deckY + 1, sw, 0); put(53, deckY, sw, B.planks);
    prop('fire', 35, deckY + 1, zc - 1, { smoke: true }); W.addLight(35.5, deckY + 2, zc - 0.5, 0xff8a40, 3, 9);
    for (let i = 0; i < 6; i++) sprite(rand() < 0.5 ? 'bone' : 'skull', 32 + Math.floor(rand() * 18), deckY + 1, zc - 1 + Math.floor(rand() * 3));
    add.camp({ id: 'shore_wreck_crew', x: 46, z: zc + 1, kinds: ['skeleton', 'skeleton', 'skeleton', 'harpy'], count: 6, chest: 'rare', radius: 9 });
    add.landmark({ id: 'shore_wreck', x: 42, z: zc + 4 });
  }

  // ------------------------------------------------------------ the tide pools (Galene the Nereid)
  {
    const zs = S(66);
    for (let z = zs; z <= zs + 7; z++) for (let x = 58; x <= 74; x++) {
      const v = n.value(x * 0.45, z * 0.45);
      if (v < 0.25) continue;
      const g = top(x, z);
      if (v > 0.62 && x > 59 && x < 73 && z > zs && z < zs + 7) { put(x, g - 1, z, B.water); put(x, g - 2, z, B.sea_stone); if (rand() < 0.2) sprite(rand() < 0.5 ? 'starfish' : 'kelp', x, g - 1, z, { scale: 0.7 }); }
      else { put(x, g, z, v > 0.45 ? B.rock : B.sea_stone); if (v > 0.55 && rand() < 0.3) put(x, g + 1, z, B.rock); if (rand() < 0.12) sprite(rand() < 0.5 ? 'shell' : 'starfish', x, g + 1, z, { scale: 0.7 }); }
    }
    // a little rock arch with a chest tucked under it
    const ax = 72, az = zs + 5, ay = top(ax, az);
    add.chest({ id: 'shore_c_pools', x: ax, z: az, rarity: 'common' });
    fill(ax - 1, ay, az - 1, ax - 1, ay + 1, az + 1, B.rock); fill(ax + 1, ay, az - 1, ax + 1, ay + 1, az + 1, B.rock); fill(ax - 1, ay + 2, az - 1, ax + 1, ay + 2, az + 1, B.rock); fill(ax, ay, az + 1, ax, ay + 1, az + 1, B.rock);
    add.npc({ id: 'shore_nereid', x: 64, z: zs + 7, model: 'npc:shore_nereid', yaw: Math.PI });
    add.landmark({ id: 'shore_pools', x: 66, z: zs + 4 });
    for (const [i, x, z] of [[0, 61, zs + 2], [1, 69, zs + 6], [2, 63, zs + 1], [3, 52, S(52) + 3], [4, 26, S(26) + 5]]) add.item({ id: 'shore_pearl_' + i, quest: 'shore_pearls', x, z });
  }

  // ------------------------------------------------------------ the fishing pier and the boathouse
  {
    const zs = S(79), px0 = 78, px1 = 80;
    for (let z = 1; z <= zs + 3; z++) for (let x = px0; x <= px1; x++) put(x, FY, z, (z % 5) ? B.planks : B.old_plank);
    for (let z = 1; z <= 5; z++) for (let x = px0 - 2; x <= px1 + 2; x++) put(x, FY, z, B.planks);           // the platform at the end
    for (let z = 2; z <= zs + 3; z += 4) for (const x of [px0 - (z <= 5 ? 2 : 0), px1 + (z <= 5 ? 2 : 0)]) { fill(x, FY - 4, z, x, FY - 1, z, B.log); put(x, FY + 1, z, B.log); }
    put(px0 - 2, FY + 1, 1, B.barrel); put(px1 + 2, FY + 1, 1, B.crate); put(px1 + 2, FY + 1, 2, B.barrel);
    c.k.lanternPost(px0 - 2, 5, FY + 1);
    for (let z = 8; z <= zs; z += 5) { put(px1 + 1, FY, z, B.log); c.k.lanternPost(px1 + 1, z, FY + 1); }
    for (const [x, z, r] of [[75, 4, 0.2], [83, 7, -0.15], [75, 9, 0.1]]) prop('canoe', x, FY - 0.25, z, { color: 0x7a4a2a, rot: Math.PI / 2 + r });
    add.chest({ id: 'shore_c_pier', x: px1 + 1, z: 2, rarity: 'common' });
    add.landmark({ id: 'shore_pier', x: 79, z: zs + 1 });
    // the boathouse: half over the water on posts, a canoe inside, a lookout deck on the roof
    const bx0 = 86, bx1 = 94, bz0 = S(90) - 4, bz1 = S(90) + 3, by = FY + 1;
    for (let z = bz0; z <= bz1; z++) for (let x = bx0; x <= bx1; x++) { put(x, by - 1, z, B.floor_boards); if (top(x, z) < by - 1) fill(x, top(x, z), z, x, by - 2, z, (x + z) % 3 ? B.water : B.log); }
    for (let x = bx0 + 2; x <= bx1 - 2; x++) for (let z = bz0 + 1; z <= bz0 + 4; z++) put(x, by - 1, z, B.water);       // the slip
    c.k.room(bx0, bz0, bx1, bz1, by, 4, B.barn_red, { trim: B.white_trim, doors: [{ side: 's', at: 90, width: 3, height: 3 }, { side: 'n', at: 90, width: 5, height: 3 }] });
    put(bx0, by + 1, bz0 + 4, B.window_day); put(bx1, by + 1, bz0 + 4, B.window_day);
    const rt = gable(c.k, bx0, bz0, bx1, bz1, by + 4, B.dark_planks, { axis: 'x', end: B.barn_red });
    W.addRoof([bx0 - 1, by + 4, bz0 - 1], [bx1 + 1, rt, bz1 + 1], [[bx0, by, bz0], [bx1, by + 3, bz1]]);
    prop('canoe', 90, by - 0.6, bz0 + 2, { color: 0x2a6aa0, rot: Math.PI / 2 });
    for (const [x, z] of [[bx1 + 2, bz1], [bx1 + 2, bz1 - 1], [bx1 + 3, bz1]]) put(x, by, z, (x + z) % 2 ? B.crate : B.barrel);
    for (const z of [bz0 + 1, bz1 - 1]) c.k.torch(bx1, by + 1, z, [1, 0]);
    add.chest({ id: 'shore_c_boathouse', x: 92, z: bz0 + 1, rarity: 'common' });
    under(88, bz1 - 1, by, () => add.item({ id: 'shore_lens_boathouse', quest: 'shore_light', x: 88, z: bz1 - 1 }));
    prop('umbrella', 84, top(84, bz1 + 4), bz1 + 4, { color: 0x2a8ad8 }); prop('deck_chair', 85, top(85, bz1 + 5), bz1 + 5);
  }

  // ------------------------------------------------------------ Poseidon's shrine in the dunes
  {
    const sx = 90, sz = 44, sy = top(sx, sz);
    c.flatten(sx - 5, sz - 5, sx + 5, sz + 5, sy, B.sea_stone);
    for (let z = sz - 4; z <= sz + 4; z++) for (let x = sx - 4; x <= sx + 4; x++) put(x, sy - 1, z, (Math.abs(x - sx) + Math.abs(z - sz)) % 3 ? B.sea_stone : B.marble_floor);
    for (const [x, z] of [[sx - 4, sz - 4], [sx + 4, sz - 4], [sx - 4, sz + 4], [sx + 4, sz + 4]]) { put(x, sy, z, B.marble_white); fill(x, sy + 1, z, x, sy + 3, z, B.column); put(x, sy + 4, z, B.marble_white); }
    fill(sx - 4, sy + 5, sz - 4, sx + 4, sy + 5, sz - 4, B.key_frieze);
    // the bronze trident behind the altar
    const tz = sz - 3;
    fill(sx, sy, tz, sx, sy + 5, tz, B.bronze); fill(sx - 1, sy + 5, tz, sx + 1, sy + 5, tz, B.bronze);
    for (const dx of [-1, 0, 1]) { put(sx + dx, sy + 6, tz, B.bronze); put(sx + dx, sy + 7, tz, B.gold_plate); }
    for (const x of [sx - 2, sx + 2]) { prop('brazier', x, sy, sz - 2); W.addLight(x + 0.5, sy + 1.6, sz - 1.5, 0x60d0ff, 3, 8); }
    sprite('em_poseidon', sx, sy + 3, sz - 4, { mode: 'wall', facing: [0, 1], scale: 1.2, sway: 0 });
    add.shrine({ id: 'shore_poseidon', x: sx, z: sz, waves: [['skeleton', 'skeleton', 'harpy'], ['harpy', 'skeleton', 'stymphalian', 'skeleton'], ['skeleton', 'skeleton', 'harpy', 'harpy', 'stymphalian']] });
  }

  // ------------------------------------------------------------ Gull Cliffs: the Echo Caves
  {
    const ex = 147, zw = S(147) + 8, fy = FY + 1;     // the cave floor: the beach's height
    // the mouth and tunnel (3 wide, 4 high) south into the chalk
    for (let z = zw - 1; z <= zw + 10; z++) { fill(ex - 1, fy, z, ex + 1, fy + 3, z, 0); fill(ex - 1, fy - 1, z, ex + 1, fy - 1, z, B.sand); }
    for (let z = zw - 1; z <= zw + 2; z++) { const w = z <= zw ? 3 : 2; fill(ex - w, fy, z, ex + w, fy + 3 + (w - 1), z, 0); fill(ex - w, fy - 1, z, ex + w, fy - 1, z, B.sand); }   // a wide arched mouth
    for (const x of [ex - 3, ex + 3]) put(x, fy + 4, zw, B.marble_white);
    // the chamber
    const z0 = zw + 10, z1 = zw + 21;
    for (let z = z0; z <= z1; z++) for (let x = ex - 8; x <= ex + 8; x++) {
      const e = ((x - ex) / 8.5) ** 2 + ((z - (z0 + z1) / 2) / 6.2) ** 2;
      if (e > 1) continue;
      fill(x, fy, z, x, fy + (e < 0.6 ? 5 : 4), z, 0); put(x, fy - 1, z, B.sea_stone);
    }
    // the glowing pool, lit from below
    for (let z = z0 + 3; z <= z0 + 7; z++) for (let x = ex - 4; x <= ex + 3; x++) { if (((x - ex + 0.5) / 4.5) ** 2 + ((z - z0 - 5) / 2.6) ** 2 > 1) continue; put(x, fy - 1, z, B.water); put(x, fy - 2, z, B.water); put(x, fy - 3, z, B.sea_stone); }
    for (const [x, z] of [[ex - 2, z0 + 5], [ex + 1, z0 + 4], [ex - 1, z0 + 6]]) put(x, fy - 3, z, B.blue_energy);
    W.addLight(ex + 0.5, fy + 1.5, z0 + 5.5, 0x40c8ff, 5, 14);
    W.addLight(ex + 0.5, fy + 2.5, zw + 3, 0x6ab8d8, 2.5, 9);
    for (let i = 0; i < 10; i++) { const x = ex - 6 + Math.floor(rand() * 13), z = z0 + 1 + Math.floor(rand() * 10); if (W.get(x, fy - 1, z) === B.sea_stone && !W.get(x, fy, z)) sprite(rand() < 0.5 ? 'kelp' : 'shell', x, fy, z, { scale: 0.7 }); }
    // the back wall: a curtain of falling water, and a hollow behind it
    const wz = z1 - 1;
    for (let x = ex - 1; x <= ex + 1; x++) { fill(x, fy, wz + 1, x, fy + 3, wz + 3, 0); put(x, fy - 1, wz + 1, B.sea_stone); put(x, fy - 1, wz + 2, B.sea_stone); put(x, fy - 1, wz + 3, B.sea_stone); }
    under(ex, wz + 2, fy, () => add.chest({ id: 'shore_c_caves', x: ex, z: wz + 2, rarity: 'epic', hidden: true }));
    for (let x = ex - 1; x <= ex + 1; x++) fill(x, fy, wz, x, fy + 4, wz, B.water);
    W.addLight(ex + 0.5, fy + 1, wz + 2.5, 0x80e0ff, 2, 5);
    under(ex + 5, z0 + 8, fy, () => add.item({ id: 'shore_lens_caves', quest: 'shore_light', x: ex + 5, z: z0 + 8 }));
    add.landmark({ id: 'shore_caves', x: ex, z: zw - 2 });
  }

  // ------------------------------------------------------------ harpy nests on the cliff tops, the roost, the queen's eyrie
  const nest = (x, z, R = 2.2, big = false) => {
    const y = top(x, z);
    c.flatten(Math.floor(x - R - 1), Math.floor(z - R - 1), Math.ceil(x + R + 1), Math.ceil(z + R + 1), y);
    disc(x, z, -1, R + 0.6, (xx, zz, d) => { if (d > R - 0.6) { put(xx, y, zz, (xx + zz) % 2 ? B.old_plank : B.log); if (big && (xx * 3 + zz) % 4) put(xx, y + 1, zz, B.old_plank); } else put(xx, y - 1, zz, B.hay); });
    for (let i = 0; i < (big ? 6 : 2); i++) sprite(rand() < 0.4 ? 'bone' : 'paper', x - 1 + Math.floor(rand() * 3), y, z - 1 + Math.floor(rand() * 3), { scale: 0.7 });
    return y;
  };
  for (const [x, z] of [[136, 34], [158, 30], [172, 44], [196, 36], [142, 44], [180, 34]]) nest(x, z);
  {
    const rx = 152, rz = 40, y = top(rx, rz);
    c.flatten(rx - 9, rz - 6, rx + 9, rz + 6, y, B.grass);
    nest(rx - 5, rz - 2, 2.6); nest(rx + 5, rz + 3, 2.6);
    prop('campfire', rx, y, rz); W.addLight(rx + 0.5, y + 1, rz + 0.5, 0xff8a40, 3.5, 10);
    for (const [x, z] of [[rx - 5, rz + 4], [rx + 6, rz - 3]]) { fill(x, y, z, x, y + 2, z, B.bone_block); sprite('skull', x, y + 3, z, { sway: 0 }); }
    add.camp({ id: 'shore_roost', x: rx, z: rz, kinds: ['harpy', 'harpy', 'stymphalian'], count: 6, chest: 'rare', radius: 9 });
    add.landmark({ id: 'shore_roost', x: rx, z: rz });
  }
  {
    const qx = 188, qz = 26;
    const y = nest(qx, qz, 5, true);
    fill(qx, y, qz - 4, qx, y + 4, qz - 4, B.log); put(qx, y + 5, qz - 4, B.gold_plate);           // a driftwood throne post with a crown on it
    add.champion({ id: 'shore_queen_gale', x: qx, z: qz, kind: 'harpy', elite: 'swift' });
    add.chest({ id: 'shore_c_eyrie', x: qx + 2, z: qz - 2, rarity: 'rare' });
  }

  // ------------------------------------------------------------ the ruined watchtower inland, in a grove of dead pines
  {
    const tx0 = 138, tz0 = 88, tx1 = 144, tz1 = 94, ty = top(141, 91);
    c.flatten(tx0 - 1, tz0 - 1, tx1 + 1, tz1 + 1, ty, B.cobble);
    c.k.room(tx0, tz0, tx1, tz1, ty, 9, B.cobble, { alt: B.mossy_brick, altP: 0.35, doors: [{ side: 's', at: 141, width: 1, height: 3 }] });
    for (let x = tx0; x <= tx1; x++) for (let z = tz0; z <= tz1; z++) if (x === tx0 || x === tx1 || z === tz0 || z === tz1) { if ((x + z) % 2 === 0) put(x, ty + 9, z, B.cobble); if (rand() < 0.25) put(x, ty + 8, z, 0); }
    fill(tx0 + 1, ty + 7, tz0 + 1, tx1 - 1, ty + 7, tz1 - 1, B.dark_planks);                    // the lookout floor
    fill(tx0 + 2, ty + 8, tz0, tx0 + 2, ty + 8, tz0, B.cobble);
    c.k.stairs(tx0 - 1, tz0 + 8, ty, 8, [0, -1], 1, B.stone_brick);                              // up the west wall, in over the top
    put(tx0, ty + 7, tz0 + 1, B.cobble); fill(tx0, ty + 8, tz0 + 1, tx0, ty + 10, tz0 + 1, 0);
    add.chest({ id: 'shore_c_tower', x: tx1 - 1, z: tz0 + 1, rarity: 'rare' });
    prop('rubble', 146, top(146, 92), 92); prop('rubble', 136, top(136, 95), 95);
    for (const [x, z] of [[130, 84], [133, 98], [148, 86], [150, 97], [128, 92], [146, 101]]) {
      const y = top(x, z), h = 5 + Math.floor(rand() * 4);
      fill(x, y, z, x, y + h, z, B.pine_log); put(x + 1, y + h - 2, z, B.pine_log); put(x, y + h - 3, z - 1, B.pine_log);
    }
    c.campDressing(134, 92, { tents: 1, bones: 6, crates: 1 });
    add.camp({ id: 'shore_tower_camp', x: 134, z: 92, kinds: ['stymphalian', 'stymphalian', 'harpy'], count: 5, chest: 'common', radius: 8 });
    add.landmark({ id: 'shore_tower', x: 141, z: 96 });
  }

  // ------------------------------------------------------------ the dune camp: hide tents, a bone totem, a fire
  {
    const dx = 44, dz = 42, y = top(dx, dz);
    c.flatten(dx - 6, dz - 5, dx + 6, dz + 5, y, B.sand);
    c.campDressing(dx, dz, { tents: 3, bones: 8, ground: null, stakes: 6 });
    add.camp({ id: 'shore_dune_camp', x: dx, z: dz, kinds: ['scorpion', 'skeleton', 'harpy'], count: 5, chest: 'common', radius: 8 });
    add.item({ id: 'shore_lens_dunes', quest: 'shore_light', x: dx - 2, z: dz + 1 });
    // a chest hidden behind a big dune boulder
    trees.boulder(33, 30, 2.2, B.sea_stone);
    add.chest({ id: 'shore_c_dunes', x: 31, z: 32, rarity: 'common', hidden: true });
  }

  // ------------------------------------------------------------ a reedy pond in the meadows, oaks round it
  {
    const px = 100, pz = 84, y = top(px, pz);
    c.flatten(px - 7, pz - 5, px + 7, pz + 5, y, B.grass);
    c.k.pond(px - 4, pz - 2, px + 4, pz + 2, y, B.water, 2, B.sand);
    for (let z = pz - 4; z <= pz + 4; z++) for (let x = px - 6; x <= px + 6; x++) if (W.get(x, y - 1, z) === B.sand && rand() < 0.5) sprite(rand() < 0.7 ? 'reeds' : 'tall_grass', x, y, z);
    prop('canoe', px + 6, y, pz + 3, { color: 0xc8a040, rot: 0.4 });
    for (const [x, z] of [[px - 9, pz - 6], [px + 9, pz + 5], [px - 8, pz + 7], [px + 10, pz - 4]]) if (level(x, z, 3, 3, 1)) trees.oak(x, z);
  }

  // ------------------------------------------------------------ sea stacks and a chalk arch off the cliffs; chalk at the cliff edges
  {
    const stack = (x, z, R, h, chalk) => {
      disc(x, z, -1, R, (xx, zz, d) => {
        if (top(xx, zz) > FY) return;                                                   // only out in the water
        const hh = Math.round(h - d * 1.2 + (rand() - 0.5) * 1.5);
        for (let y = FY - 4; y < FY + hh; y++) put(xx, y, zz, y === FY + hh - 1 && d < R - 0.8 ? B.grass : chalk ? ((y + xx) % 4 ? B.plaster : B.marble_white) : ((y + zz) % 3 ? B.rock : B.sea_stone));
      });
    };
    for (const [x, z, R, h, chalk] of [[134, 4, 2.2, 8, 1], [146, 2, 1.6, 6, 1], [176, 5, 2.4, 9, 1], [198, 3, 1.8, 7, 1], [205, 9, 1.4, 4, 0], [22, 5, 1.6, 4, 0], [64, 3, 1.5, 3, 0], [96, 6, 1.4, 3, 0], [126, 8, 1.3, 3, 0]]) stack(x, z, R, h, chalk);
    // the arch: two chalk legs in the water and a span between them
    { const ax = 160, az = 4;
      for (const dx of [-3, 3]) disc(ax + dx, az, -1, 1.5, (xx, zz) => { for (let y = FY - 4; y < FY + 7; y++) put(xx, y, zz, (y + xx) % 4 ? B.plaster : B.marble_white); });
      for (let x = ax - 4; x <= ax + 4; x++) for (let z = az - 1; z <= az + 1; z++) { for (let y = FY + 5; y < FY + 8; y++) put(x, y, z, (x + y) % 3 ? B.plaster : B.marble_white); put(x, FY + 8, z, B.grass); }
    }
    // white chalk breaking through the turf along the cliff tops' sea edge
    for (let x = 132; x < 208; x++) {
      const zs = S(x) + 8;
      for (let z = zs; z < zs + 6; z++) { const y = top(x, z); if (y < FY + 6 || W.get(x, y, z)) continue; if (rand() < 0.55 - (z - zs) * 0.09) put(x, y - 1, z, rand() < 0.7 ? B.plaster : B.marble_white); }
    }
  }

  // ------------------------------------------------------------ trees, beach grass, driftwood
  const PATHS = new Set([B.gravel_path, B.dirt_path, B.planks, B.dirt_road]);
  const nearPath = (x, z) => { for (let dz = -4; dz <= 4; dz += 2) for (let dx = -4; dx <= 4; dx += 2) if (PATHS.has(W.get(x + dx, top(x + dx, z + dz) - 1, z + dz))) return true; return false; };
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(20 + rand() * 186), z = Math.floor(48 + rand() * 66);
    if (x > 54 && x < 78 && z > 64) continue;                                          // the road from camp
    if (x > 124 && x < 152 && z > 80 && z < 104) continue;                             // the watchtower's dead grove
    if (nearPath(x, z)) continue;
    if (level(x, z, 3, 3, 1) && W.get(x, top(x, z) - 1, z) === B.grass) { if (z > 78 && rand() < 0.35) trees.oak(x, z); else trees.pine(x, z, { h: 6 + Math.floor(rand() * 4) }); }
  }
  for (let i = 0; i < 26; i++) {                                                       // wind-bent pines along the cliff tops
    const x = Math.floor(130 + rand() * 76), z = Math.floor(30 + rand() * 30);
    if (level(x, z, 3, 3, 1) && W.get(x, top(x, z) - 1, z) === B.grass) trees.pine(x, z, { h: 5 + Math.floor(rand() * 2), R: 2 });
  }
  for (let i = 0; i < 14; i++) {                                                       // driftwood logs on the sand
    const x = Math.floor(22 + rand() * 180), z = S(x) + 1 + Math.floor(rand() * 5), y = top(x, z);
    if (W.get(x, y - 1, z) !== B.sand || W.get(x, y, z)) continue;
    put(x, y, z, B.log); if (rand() < 0.6) put(x + 1, y, z, B.log);
  }
  scatter([B.sand], ['tall_grass', 'dry_grass', 'shell', 'tall_grass', 'starfish', 'reeds', 'dry_grass', 'tall_grass'], 0.11, 0.6);
  scatter([B.grass], ['tall_grass', 'grass', 'dry_grass', 'flower_yellow', 'grass'], 0.11);
}
