// Los Angeles (the Road West, chapters 9 and 10). Where the taxi stops at the
// edge of the desert: a truck stop with a diner across the road from Crusty's
// Water Bed Palace (a heap of waterbeds across the road beyond it is the
// roadblock). Then the city: big white letters on the hills, palms, a
// freeway overpass you can climb, shops, a motel, the Star Tours bus and DOA
// Recording Studios (black marble, gold letters, the elevator down to the
// Underworld) and, at the west end, a wall of shadow across the road (the
// roadblock) before the beach.
import { B } from '../blocks.js';
import { roadside } from './vegas.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 40, 2) - 0.4) * 3 + (z < 24 ? ((24 - z) * 0.75 + (n.fbm(x, z, 18, 2) - 0.5) * 4) * Math.max(0, Math.min(1, (168 - x) / 10)) : 0),
  surface: (x, z, h, n) => (x > 170 ? B.desert_sand : h > 2 || n.value(x * 0.3, z * 0.3) > 0.6 ? B.grass : B.sidewalk),
};

// the big letters on the hill (5 rows; X = a panel)
const FONT = {
  L: ['X...', 'X...', 'X...', 'X...', 'XXXX'], O: ['XXXX', 'X..X', 'X..X', 'X..X', 'XXXX'], S: ['XXXX', 'X...', 'XXXX', '...X', 'XXXX'],
  A: ['.XX.', 'X..X', 'XXXX', 'X..X', 'X..X'], N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X'], G: ['XXXX', 'X...', 'X.XX', 'X..X', 'XXXX'],
  E: ['XXXX', 'X...', 'XXX.', 'X...', 'XXXX'], ' ': ['..', '..', '..', '..', '..'],
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, top, rand } = ctx;
  const R = roadside(ctx), { S, P, bar, fill, board, COL } = R;

  // ------------------------------------------------------------ the truck stop (north) where the taxi pulls in
  ctx.flatten(177, 20, 198, 37, FY, B.asphalt);
  R.building(178, 21, 189, 29, 4, B.steel_panel, { trim: B.neon_pink, floor: B.floor_boards, doors: [{ side: 's', at: 183, width: 2, height: 3 }], windows: ['s', 'e'], win: B.window });
  for (const [x, z] of [[180, 23], [184, 23], [180, 26]]) { P('table', x, z, { rot: 0 }, FY); bar(x, z, 1, FY); }
  W.set(188, FY, 22, B.vending);
  board(183, 30, S('momsDiner'), { y: FY + 3.6, post: 0.2, w: 5, h: 1, ...COL.neon });
  W.addLight(183.5, FY + 3, 25.5, 0xffe0b0, 2.5, 9);
  R.semi(186, 31, B.barn_red, B.corrugated);
  R.car(193, 24, 0x2a4a9a, Math.PI / 2);
  board(196, 28, S('truckersWelcome'), { w: 3.4, h: 1.2, post: 3.2, rot: 0.3, ...COL.yellow }); bar(195, 28, 4); bar(197, 27, 4);
  R.hwy(179, 37, S('laMilesNear'));
  add.landmark({ id: 'rt_truckstop_la', x: 184, z: 26 });

  // ------------------------------------------------------------ Crusty's Water Bed Palace (south)
  const x0 = 177, x1 = 197, z0 = 57, z1 = 70;
  ctx.flatten(177, 51, 198, 74, FY, B.sidewalk);
  R.building(x0, z0, x1, z1, 6, B.pink_plaster, { trim: B.white_trim, roof: B.corrugated, floor: B.carpet_red, cut: 4, doors: [{ side: 'n', at: 187, width: 3, height: 3 }] });
  for (let x = x0 + 1; x < x1; x++) if (Math.abs(x - 187) > 1) W.set(x, FY + 1, z0, B.shop_window);
  for (let x = x0; x <= x1; x++) W.set(x, FY + 4, z0, x % 2 ? B.teal_panel : B.white_trim);
  board(187, z0 + 1, S('crustys'), { y: FY + 7, post: 0.6, w: 9, h: 1.6, rot: 0, bg: '#f2efe6', fg: '#c4302a', border: '#2ab0c8' });
  W.addLight(187.5, FY + 8, z0 - 1.5, 0xffe8c0, 3, 12);
  // waterbeds in the yard (the anchor's spot in front of the doors stays clear)
  for (const [x, z, c] of [[179, 52, 0x2ab0c8], [182, 52, 0xd8327a], [192, 52, 0x6a3ab0], [195, 52, 0x3ab05a]]) { P('waterbed', x, z, { color: c, rot: 0 }, FY); bar(x, z, 1, FY); bar(x, z + 1, 1, FY); }
  // inside: rows of beds, the swan, and the one with straps
  for (const [x, z, o] of [[180, 61, {}], [184, 61, { color: 0xd8327a }], [190, 61, { swan: true }], [194, 61, {}], [180, 66, { color: 0x6a3ab0 }], [194, 66, { straps: true, color: 0x8a2a2a }]]) { P('waterbed', x, z, { rot: 0, ...o }, FY); bar(x, z, 1, FY); bar(x, z + 1, 1, FY); }
  P('couch', 187, 68, { color: 0x2ab0c8 }, FY);
  for (const [x, z] of [[181, 63], [193, 63], [187, 66]]) W.addLight(x + 0.5, FY + 4.5, z + 0.5, 0xffe0c8, 2, 9);
  add.landmark({ id: 'rt_crustys', x: 187, z: 63 });
  add.chest({ id: 'rt_la_crustys', x: x1 - 1, z: z1 - 1, y: FY, rarity: 'rare', hidden: true });

  // ------------------------------------------------------------ the hills and the big white letters
  const word = 'LOS ANGELES', zL = 9;
  let lx = 96;
  for (const ch of word) {
    const g = FONT[ch], w = g[0].length;
    if (ch !== ' ') {
      const base = top(lx + (w >> 1), zL) + 1;
      for (let c = 0; c < w; c++) {
        const gy = top(lx + c, zL);
        for (let y = gy; y < base; y++) W.set(lx + c, y, zL, B.dark_planks);   // (the struts down to the hill)
        for (let r = 0; r < 5; r++) if (g[4 - r][c] === 'X') for (let d = 0; d < 2; d++) W.set(lx + c, base + r * 2 + d, zL, B.marble_white);
      }
    }
    lx += w + 1;
  }
  add.landmark({ id: 'rt_la_letters', x: 122, z: zL });
  add.camp({ id: 'rt_la_hills', x: 140, z: 16, kinds: ['ghost', 'skeleton', 'ghost'], count: 6, chest: 'common' });
  add.chest({ id: 'rt_la_hills', x: 98, z: zL - 2, rarity: 'common', hidden: true });
  for (let i = 0; i < 30; i++) { const x = 88 + Math.floor(rand() * 80), z = 2 + Math.floor(rand() * 18); if (x >= 94 && x <= 150 && Math.abs(z - zL) < 2) continue; const y = top(x, z); if (isFinite(y) && !W.get(x, y, z)) { P('palm', x, z, { h: 5 + Math.floor(rand() * 3) }, y); W.set(x, y, z, B.barrier); } }

  // ------------------------------------------------------------ DOA Recording Studios
  const dx0 = 100, dx1 = 124, dz0 = 18, dz1 = 32, dh = 12;
  ctx.flatten(dx0 - 2, dz0, dx1 + 2, 37, FY, B.sidewalk);
  R.building(dx0, dz0, dx1, dz1, dh, B.black_marble, { trim: B.gold_trim, floor: B.black_marble, cut: 4, doors: [{ side: 's', at: 112, width: 3, height: 3 }] });
  for (let x = dx0 + 1; x < dx1; x++) { if (Math.abs(x - 112) > 1) W.set(x, FY + 1, dz1, B.glass); for (const y of [FY + 6, FY + 9]) if (x % 2) W.set(x, y, dz1, B.steel_window); W.set(x, FY + 3, dz1, B.gold_trim); }
  for (const x of [dx0, dx1]) for (let y = FY; y < FY + dh; y++) W.set(x, y, dz1, B.gold_trim);
  // the gold record on its face, as big as a garage door
  for (let x = 116; x <= 124; x++) for (let y = FY + 3; y <= FY + 12; y++) {
    const d = Math.hypot(x + 0.5 - 120.5, y + 0.5 - (FY + 8));
    if (d > 4.4) continue;
    W.set(x, y, dz1 + 1, d > 3.5 ? B.gold_plate : d < 0.6 ? B.obsidian : d < 1.6 ? B.gold_trim : d > 2.3 && d < 2.8 ? B.black_marble : B.obsidian);
  }
  W.addLight(120.5, FY + 8, dz1 + 3, 0xe8c870, 2, 7);
  board(112, dz1 + 1, S('doa'), { y: FY + 4, post: 0, w: 10, h: 1.4, rot: 0, bg: '#0a0a0e', fg: '#e8c870', border: '#c9963a' });
  // the lobby: Charon's desk, the couches, the waiting dead, the elevator down
  fill(107, FY, 24, 117, FY, 24, B.black_marble); fill(107, FY + 1, 24, 117, FY + 1, 24, B.gold_trim);
  fill(111, FY, dz0, 113, FY + 3, dz0, B.elevator_door);
  W.set(110, FY + 3, dz0 + 1, B.lantern); W.set(114, FY + 3, dz0 + 1, B.lantern);
  for (const [x, z, r] of [[103, 28, Math.PI / 2], [121, 28, -Math.PI / 2], [103, 22, Math.PI / 2]]) { P('couch', x, z, { color: 0x2a2a2e, rot: r }, FY); bar(x, z, 1, FY); }
  for (const [x, z] of [[104, 26], [102, 30], [120, 25], [122, 30], [106, 21], [118, 21]]) P('ghost', x, z, { rot: rand() * 6 }, FY);
  for (const [x, z, c] of [[106, 26, 0x6affb0], [118, 26, 0x6affb0], [112, 21, 0xe8c870]]) W.addLight(x + 0.5, FY + 5, z + 0.5, c, 2.5, 10);
  W.addLight(112.5, FY + 5, dz1 + 2.5, 0xe8c870, 3, 10);
  add.landmark({ id: 'rt_doa', x: 112, z: ROAD_Z - 10 });
  add.chest({ id: 'rt_la_doa', x: 116, z: 23, y: FY, rarity: 'rare', hidden: true });

  // ------------------------------------------------------------ the freeway overpass (climb the ramp at the south end)
  const ox0 = 146, ox1 = 150, oy = FY + 7;
  for (let z = 20; z <= 84; z++) for (let x = ox0; x <= ox1; x++) { W.set(x, oy, z, B.concrete); if (x === ox0 + 2 && z % 4 < 2) W.set(x, oy, z, B.asphalt_line); }
  for (let z = 20; z <= 84; z++) for (const x of [ox0, ox1]) if (!(x === ox0 && z >= 76 && z <= 78)) W.set(x, oy + 1, z, B.guardrail);
  for (const z of [24, 32, 56, 68, 82]) for (const x of [ox0, ox1]) fill(x, FY, z, x, oy - 1, z, B.concrete_pillar);
  for (let i = 0; i <= 6; i++) fill(139 + i, FY, 76, 139 + i, FY + i, 78, B.concrete);
  W.addRoof([ox0, oy, 20], [ox1, oy + 1, 84], [[ox0, FY - 1, 20], [ox1, oy - 1, 84]]);
  for (const [z, c] of [[28, 0x2a6ad8], [50, 0xc4302a], [64, 0xf2efe6]]) { P('car', 148, z, { color: c, rot: Math.PI / 2 }, oy + 1); for (let d = -1; d <= 2; d++) bar(148, z + d, 2, oy + 1); }
  board(ox1 + 1, ROAD_Z, S('freeway'), { y: oy - 0.1, post: 0, w: 5, h: 1.2, rot: Math.PI / 2, ...COL.green });
  add.camp({ id: 'rt_la_underpass', x: 148, z: 62, y: FY, kinds: ['skeleton', 'hellhound', 'skeleton'], count: 6, chest: 'rare' });
  add.chest({ id: 'rt_la_overpass', x: 148, z: 22, y: oy + 1, rarity: 'rare' });
  add.landmark({ id: 'rt_overpass', x: 148, z: 70 });

  // ------------------------------------------------------------ the cross street, the lights, the palms
  for (const [za, zb] of [[20, 37], [51, 86]]) for (let z = za; z <= zb; z++) for (let x = 130; x <= 134; x++) { const g = top(x, z); if (g <= FY + 1) { for (let y = g; y <= FY; y++) W.set(x, y, z, 0); W.set(x, FY - 1, z, x === 132 && z % 4 < 2 ? B.asphalt_line : B.asphalt); } }
  P('traffic_light', 129, 37, { rot: -Math.PI / 2 }); bar(129, 37, 3);
  P('traffic_light', 135, 51, { rot: Math.PI / 2 }); bar(135, 51, 3);
  R.palms(88, 166, 8, [37, 51], 7, (x, z) => (x >= 126 && x <= 152) || (z === 37 && x >= 98 && x <= 126) || (z === 51 && x >= 152));
  R.lights(90, 166, 12, [1]);

  // ------------------------------------------------------------ shops along the south side, the alley behind
  ctx.flatten(86, 51, 128, 78, FY, B.sidewalk);
  const shops = [['shopBurgers', B.red_brick, B.awning], ['shopPets', B.clapboard, B.teal_panel], ['shopMaps', B.pink_plaster, B.awning], ['shopSurf', B.brownstone, B.teal_panel]];
  shops.forEach(([key, wall, awn], i) => {
    const sx0 = 87 + i * 10, sx1 = sx0 + 8;
    R.building(sx0, 53, sx1, 63, 5, wall, { trim: B.cornice, floor: B.floor_boards, doors: [{ side: 'n', at: sx0 + 4, width: 1, height: 3 }], windows: ['n'] });
    fill(sx0, FY + 3, 52, sx1, FY + 3, 52, awn);
    board(sx0 + 4, 52, S(key), { y: FY + 4.05, post: 0, w: 7.6, h: 0.9, rot: 0, ...[COL.red, COL.blue, COL.yellow, COL.retro][i] });
    P('table', sx0 + 4, 58, {}, FY); bar(sx0 + 4, 58, 1, FY);
    W.addLight(sx0 + 4.5, FY + 3, 58.5, 0xffe0b0, 1.5, 7);
  });
  for (const [x, z] of [[89, 66], [99, 67], [113, 66], [123, 67]]) { P('dumpster', x, z, { rot: 0 }, FY); bar(x, z, 2, FY); bar(x + 1, z, 2, FY); }
  P('car_flipped', 108, 72, { color: 0x3a3a42, rot: 0.3 }); bar(107, 72, 2); bar(108, 72, 2); bar(109, 72, 2);
  add.champion({ id: 'rt_la_nighthound', x: 116, z: 73, kind: 'hellhound', level: 10, elite: 'shadow' });
  add.chest({ id: 'rt_la_alley', x: 88, z: 74, rarity: 'common' });

  // ------------------------------------------------------------ the Sunset Palms Motel (south, past the overpass)
  R.motel(153, 54, 166, 76, S('sunsetPalms'), 'n', { signX: 166, wall: B.clapboard, trim: B.awning });
  add.chest({ id: 'rt_la_motel', x: 155, z: 66, rarity: 'common' });

  // ------------------------------------------------------------ the Star Tours bus stop (north) and a parking lot
  ctx.flatten(86, 24, 98, 37, FY, B.asphalt);
  for (let x = 87; x <= 97; x += 3) for (const z of [27, 28, 29]) W.set(x, FY - 1, z, B.asphalt_line);
  for (const [x, c] of [[88, 0xf2efe6], [94, 0x2a2a30]]) R.car(x, 28, c, Math.PI / 2);
  R.car(92, 34, 0xd8327a, 0);
  deco.prop('greyhound', 140.5, FY, 33.5, { rot: 0 }); for (let x = 136; x <= 144; x++) for (const z of [33, 34]) bar(x, z, 3, FY);
  board(143, 36, S('starTours'), { w: 3.6, h: 1.1, post: 2.2, rot: 0.2, ...COL.yellow });
  // a drive-in across the road from the motel
  ctx.flatten(153, 24, 167, 37, FY, B.asphalt);
  R.building(156, 25, 165, 31, 4, B.white_trim, { trim: B.neon_pink, floor: B.floor_boards, doors: [{ side: 's', at: 160, width: 2, height: 3 }], windows: ['s'] });
  board(154, 35, S('driveIn'), { w: 4, h: 1.6, post: 3.6, rot: 0.3, ...COL.neon }); bar(153, 35, 4); bar(156, 34, 4);
  R.car(162, 35, 0x2a6ad8, 0);
  W.addLight(160.5, FY + 3, 33.5, 0xff6ad0, 2.5, 9);

  // ------------------------------------------------------------ Trudy the tour guide and her star maps
  add.npc({ id: 'rt_la_guide', x: 139, z: 36, model: 'npc:rt_la_guide', yaw: 0 });
  for (const [i, x, z] of [[1, 92, 31], [2, 118, 75], [3, 165, 66], [4, 128, 14]]) add.item({ id: `rt_la_map${i}`, quest: 'rt_la_guide_maps', x, z });

  ctx.scatter([B.grass], ['grass', 'flower_red'], 0.04);
  ctx.scatter([B.desert_sand], ['dry_grass'], 0.03);
  add.waystone('rt_crustys', 192, ROAD_Z - 8);
  add.waystone('rt_la', 132, ROAD_Z + 8);
}

export const QUESTS = [
  { id: 'rt_la_guide_maps', giver: 'rt_la_guide',
    steps: [{ type: 'collect', count: 4 }, { type: 'return' }], reward: { xp: 950, coins: 270, item: 'common' } },
  { id: 'rt_la_guide_hills', giver: 'rt_la_guide', requires: ['rt_la_guide_maps'],
    steps: [{ type: 'reach', x: 122, z: 12, radius: 7 }, { type: 'camp', id: 'rt_la_hills' }, { type: 'return' }], reward: { xp: 1150, coins: 330, item: 'rare' } },
  { id: 'rt_la_guide_hound', giver: 'rt_la_guide', requires: ['rt_la_guide_hills'],
    steps: [{ type: 'champion', id: 'rt_la_nighthound' }, { type: 'chest', id: 'rt_la_alley' }, { type: 'return' }], reward: { xp: 1450, coins: 420, item: 'unique' } },
];
