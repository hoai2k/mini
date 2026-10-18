// Santa Monica (the Road West's end, chapters 11 and 12): the end of the
// trail. Ocean Avenue with its palms and shops, the arch over the way onto the
// pier ("Santa Monica Yacht Harbor"), the pier itself with its Ferris wheel,
// a little roller coaster and the Playland Arcade, the beach where Ares waits
// (umbrellas, a lifeguard tower, a volleyball net), a wreck on the north
// beach and, at the end of the pier, the way home to Olympus (a model of the
// Empire State Building in the clouds).
import { B } from '../blocks.js';
import { roadside } from './vegas.js';

export const terrain = {
  height: (x) => (x < 40 ? -Math.max(0, (40 - x) / 14) : 0),
  surface: (x) => (x < 52 ? B.sand : B.sidewalk),
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, top, rand } = ctx;
  const R = roadside(ctx), { S, P, bar, fill, board, COL } = R;

  // ------------------------------------------------------------ the pier: planks out over the water, rails along both sides
  for (let x = 4; x <= 46; x++) for (let dz = -3; dz <= 3; dz++) {
    const z = ROAD_Z - 2 + dz; W.set(x, FY - 1, z, B.planks);
    for (let y = FY; y < FY + 4; y++) if (W.get(x, y, z) === B.barrier) W.set(x, y, z, 0);
    if (dz === 3 || (dz === -3 && (x < 14 || x > 40))) W.set(x, FY, z, B.dark_planks);
    if (x % 6 === 0 && Math.abs(dz) === 3) for (let y = 1; y < FY - 1; y++) W.set(x, y, z, B.log);
  }
  // the wide deck on the north side: the Ferris wheel, the coaster, the arcade
  for (let x = 14; x <= 40; x++) for (let z = 26; z <= 38; z++) {
    W.set(x, FY - 1, z, (x + z) % 7 ? B.planks : B.dark_planks); for (let y = FY; y < FY + 6; y++) W.set(x, y, z, 0);
    if (x % 6 === 2 && z % 6 === 2) for (let y = 1; y < FY - 1; y++) W.set(x, y, z, B.log);
    if (z === 26 || x === 14) W.set(x, FY, z, B.dark_planks);
  }
  deco.prop('ferris_wheel', 24.5, FY, ROAD_Z - 9.5, { r: 5 });
  for (let y = FY; y < FY + 3; y++) for (const x of [22, 27]) W.set(x, y, ROAD_Z - 10, B.barrier);
  W.addLight(24.5, FY + 6, ROAD_Z - 8, 0xffd84a, 3, 12);
  add.landmark({ id: 'rt_pier', x: 30, z: ROAD_Z - 2 });
  // the coaster: a loop of track on stilts
  for (let a = 0; a < Math.PI * 2; a += 0.06) {
    const x = Math.round(17 + Math.cos(a) * 2.2), z = Math.round(30.5 + Math.sin(a) * 3.6), y = FY + 3 + Math.round(1.5 + Math.sin(a * 2) * 1.5);
    W.set(x, y, z, B.red_plank);
    if (Math.round(a / 0.06) % 9 === 0) for (let yy = FY; yy < y; yy++) W.set(x, yy, z, B.steel_panel);
  }
  deco.prop('tram_pod', 19.5, FY + 6, 30.5, {});
  board(17, 36, S('coaster'), { w: 2.8, h: 0.8, post: 1.8, rot: 0.2, ...COL.red });
  add.chest({ id: 'rt_sm_coaster', x: 17, z: 30, y: FY, rarity: 'common', hidden: true });
  // the Playland Arcade
  R.building(31, 27, 39, 34, 4, B.pink_plaster, { trim: B.neon_bulbs, floor: B.floor_boards, doors: [{ side: 's', at: 35, width: 2, height: 3 }], windows: ['s', 'w'] });
  for (let i = 0; i < 3; i++) { P('arcade', 33 + i * 2, 28, { rot: 0 }, FY); bar(33 + i * 2, 28, 2, FY); }
  P('arcade', 38, 31, { rot: -Math.PI / 2 }, FY); bar(38, 31, 2, FY);
  board(35, 35, S('arcade'), { y: FY + 3.7, post: 0, w: 6, h: 1, ...COL.neon });
  W.addLight(35.5, FY + 3, 30.5, 0xff6ad0, 2.5, 9);
  add.chest({ id: 'rt_sm_arcade', x: 32, z: 32, y: FY, rarity: 'rare' });
  // the end of the trail
  board(44, 38, S('route66'), { w: 2.6, h: 1.6, post: 1.6, rot: 0.3, bg: '#f2efe6', fg: '#1a1a1e', border: '#1a1a1e' });
  // the arch onto the pier
  for (const z of [37, 51]) fill(48, FY, z, 48, FY + 8, z, B.steel_panel);
  fill(48, FY + 8, 37, 48, FY + 8, 51, B.steel_panel);
  board(49, ROAD_Z, S('yachtHarbor'), { y: FY + 7.4, post: 0, w: 12, h: 1.4, rot: Math.PI / 2, bg: '#1e3a6a', fg: '#ffe08a', border: '#ff8a3a', glow: true });
  W.addLight(50, FY + 7, ROAD_Z + 0.5, 0xffd08a, 3, 12);

  // ------------------------------------------------------------ Grandma Mae, who fishes off the pier
  add.npc({ id: 'rt_sm_fisher', x: 30, z: ROAD_Z + 0, model: 'npc:rt_sm_fisher', yaw: Math.PI });
  P('bench', 28, ROAD_Z, { rot: 0 }, FY);
  for (const [i, x, z] of [[1, 38, 64], [2, 55, 76], [3, 62, 58], [4, 44, 22]]) add.item({ id: `rt_sm_lure${i}`, quest: 'rt_sm_fisher_lures', x, z });

  // ------------------------------------------------------------ the end of the pier: the way home
  deco.prop('empire_state', 8.5, FY, ROAD_Z - 1.5, { h: 12, glow: true });
  for (let y = FY; y < FY + 6; y++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) W.set(8 + dx, y, ROAD_Z - 2 + dz, B.barrier);
  W.addLight(8.5, FY + 8, ROAD_Z - 1.5, 0xffe8a0, 5, 14);
  board(14, ROAD_Z + 1, S('santaMonica'), { w: 3.6, h: 0.9, post: 2.4, bg: '#2ab0c8', fg: '#ffffff', border: '#f2efe6' });
  add.landmark({ id: 'rt_olympus', x: 8, z: ROAD_Z - 2 });
  add.chest({ id: 'rt_sm_pier', x: 6, z: ROAD_Z - 4, rarity: 'epic' });

  // ------------------------------------------------------------ the beach (Ares waits by the water: his spot stays clear)
  for (const [x, z, c] of [[48, 58, 0xd8322a], [36, 62, 0x2a6ad8], [50, 66, 0xffd84a], [30, 66, 0x3ab05a], [58, 70, 0xff6ad0]]) { P('umbrella', x, z, { color: c }); P('deck_chair', x + 1, z + 1, { color: c, rot: 0.3 }); }
  deco.prop('lifeguard_tower', 34.5, FY, ROAD_Z + 28.5, { rot: Math.PI / 2 }); bar(34, ROAD_Z + 28, 1); bar(35, ROAD_Z + 28, 1);
  add.chest({ id: 'rt_sm_beach', x: 40, z: ROAD_Z + 26, rarity: 'rare' });
  // the volleyball net
  for (const z of [76, 82]) { fill(42, FY, z, 42, FY + 2, z, B.log); }
  P('chain_fence', 42, 79, { len: 6, h: 1, screen: false, rot: Math.PI / 2 }, FY + 1.6);
  // surfboards stuck in the sand, a beached rowboat, driftwood
  [[60, 62, B.teal_panel], [61, 62, B.pink_plaster], [62, 62, B.gold_plate]].forEach(([x, z, id]) => fill(x, FY, z, x, FY + 2, z, id));
  P('canoe', 26, 74, { rot: 0.5 }); bar(25, 74, 1); bar(26, 74, 1); bar(27, 74, 1);
  add.camp({ id: 'rt_sm_dunes', x: 52, z: 79, kinds: ['skeleton', 'ghost', 'harpy'], count: 6, radius: 7, chest: 'rare' });

  // ------------------------------------------------------------ the wreck on the north beach
  const wx = 37, wz = 13;
  for (let i = -7; i <= 7; i++) for (let j = -3; j <= 3; j++) {
    const half = 3 * Math.sqrt(Math.max(0, 1 - (i / 7.6) ** 2)); if (Math.abs(j) > half + 0.3) continue;
    const x = wx + i, z = wz + j, g = top(x, z), edge = Math.abs(j) > half - 0.9 || Math.abs(i) === 7;
    const tilt = Math.round(j * 0.4);
    W.set(x, g - 1, z, B.dark_planks);
    if (edge) for (let y = g; y < g + 3 + tilt; y++) if (!(i >= -1 && i <= 1 && j > 0 && y < g + 2)) W.set(x, y, z, (i + y) % 3 ? B.dark_planks : B.old_plank);
  }
  const wg = top(wx, wz);
  for (let y = wg; y < wg + 8; y++) W.set(wx - 2, y, wz, B.log);
  fill(wx - 2, wg + 6, wz - 2, wx - 2, wg + 6, wz + 2, B.log);
  fill(wx - 2, wg + 3, wz - 1, wx - 2, wg + 5, wz + 1, B.white_trim);   // what's left of the sail
  add.camp({ id: 'rt_sm_wreck_camp', x: 40, z: 20, kinds: ['harpy', 'harpy', 'skeleton'], count: 6, chest: 'common' });
  add.champion({ id: 'rt_sm_captain', x: 34, z: 17, kind: 'skeleton', level: 12, elite: 'armored' });
  add.chest({ id: 'rt_sm_wreck', x: wx + 3, z: wz, y: wg, rarity: 'epic', hidden: true });
  add.landmark({ id: 'rt_sm_wreck', x: wx, z: wz });

  // ------------------------------------------------------------ Ocean Avenue: shops, a hotel, palms, lights
  ctx.flatten(52, 8, 69, 37, FY, B.sidewalk);
  R.building(52, 28, 59, 36, 4, B.clapboard, { trim: B.teal_panel, floor: B.floor_boards, doors: [{ side: 's', at: 55, width: 1, height: 3 }], windows: ['s'] });
  board(55, 37, S('surfShack'), { y: FY + 3.7, post: 0, w: 6, h: 0.9, ...COL.blue });
  R.building(61, 28, 68, 36, 4, B.pink_plaster, { trim: B.white_trim, floor: B.floor_boards, doors: [{ side: 's', at: 64, width: 1, height: 3 }], windows: ['s'] });
  board(64, 37, S('sodaFountain'), { y: FY + 3.7, post: 0, w: 6, h: 0.9, ...COL.retro });
  R.building(53, 10, 68, 22, 9, B.white_trim, { cut: 4, trim: B.roof_terracotta, floor: B.carpet_red, doors: [{ side: 's', at: 60, width: 2, height: 3 }], windows: ['s', 'w'], win: B.window });
  for (let y = FY + 4; y < FY + 8; y += 3) for (let x = 55; x < 67; x += 2) W.set(x, y, 22, B.window);
  board(60, 23, S('oceanHotel'), { y: FY + 3.6, post: 0, w: 6, h: 0.9, ...COL.retro });
  for (const [x, z] of [[52, 25], [57, 25], [64, 25]]) { P('palm', x, z, { h: 7 + (x % 3) }); bar(x, z, 2); }
  R.palms(52, 68, 8, [51], 7);
  R.lights(54, 66, 12, [-1]);
  R.hwy(60, 38, S('endOfRoad'));
  add.chest({ id: 'rt_sm_hotel', x: 67, z: 11, y: FY, rarity: 'common' });

  ctx.scatter([B.sand], ['dry_grass'], 0.012);
  add.waystone('rt_santamonica', 56, ROAD_Z + 8);
}

export const QUESTS = [
  { id: 'rt_sm_fisher_lures', giver: 'rt_sm_fisher',
    steps: [{ type: 'collect', count: 4 }, { type: 'return' }], reward: { xp: 1300, coins: 380, item: 'common' } },
  { id: 'rt_sm_fisher_harpies', giver: 'rt_sm_fisher', requires: ['rt_sm_fisher_lures'],
    steps: [{ type: 'kill', kind: 'harpy', count: 6, region: 'rt_santamonica' }, { type: 'camp', id: 'rt_sm_wreck_camp' }, { type: 'return' }], reward: { xp: 1650, coins: 460, item: 'rare' } },
  { id: 'rt_sm_fisher_captain', giver: 'rt_sm_fisher', requires: ['rt_sm_fisher_harpies'],
    steps: [{ type: 'champion', id: 'rt_sm_captain' }, { type: 'chest', id: 'rt_sm_wreck' }, { type: 'return' }], reward: { xp: 2100, coins: 580, item: 'unique' } },
];
