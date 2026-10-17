// The New Jersey Turnpike (the Road West's first stop, world/roadtrip.js):
// woods either side of the highway, Jersey Pike Plaza (a truck stop: gas,
// a diner, rigs parked up) and, at the west end, the burning Greyhound across
// the road (chapter 4's roadblock, openworld/roadtrip.js).
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 40, 3) - 0.3) * 10,
  surface: (x, z, h, n) => (n.value(x * 0.2, z * 0.2) > 0.75 ? B.forest_floor : B.grass),
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, trees, top, sign } = ctx;
  add.waystone('rt_truckstop', 1338, ROAD_Z - 8);
  // Jersey Pike Plaza: the diner, the pumps under their canopy, the rigs in the lot
  const x0 = 1318, x1 = 1336, z0 = ROAD_Z + 9, z1 = ROAD_Z + 17;
  ctx.flatten(1300, ROAD_Z + 6, 1360, ROAD_Z + 26, FY, B.asphalt);
  k.room(x0, z0, x1, z1, FY, 4, B.teal_panel, { trim: B.white_trim, doors: [{ side: 'n', at: 1327, width: 2, height: 3 }] });
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) W.set(x, FY + 4, z, B.roof);
  for (let x = x0 + 1; x < x1; x += 3) W.set(x, FY + 1, z0, B.window_day);
  sign(1327, ROAD_Z + 8, t('rt.signs.pikePlaza'), { w: 3.6, h: 1.0, post: 3.2, bg: '#c8282a', fg: '#ffffff', border: '#f2efe6' });
  for (let x = 1342; x <= 1354; x++) for (let z = ROAD_Z + 9; z <= ROAD_Z + 14; z++) W.set(x, FY + 5, z, B.steel_panel);
  for (const x of [1344, 1348, 1352]) { W.set(x, FY, ROAD_Z + 11, B.barrier); W.set(x, FY + 1, ROAD_Z + 11, B.barrier); deco.prop('gas_pump', x + 0.5, FY, ROAD_Z + 11.5, { rot: 0 }); for (let y = FY; y < FY + 5; y++) W.set(x, y, ROAD_Z + 9, B.steel_panel); }
  W.addLight(1348.5, FY + 4.5, ROAD_Z + 11.5, 0xfff4e0, 3, 12);
  for (const [x, z, c] of [[1306, ROAD_Z + 20, 0x8a2a2a], [1312, ROAD_Z + 22, 0x2a4a8a], [1302, ROAD_Z + 14, 0xd8d8d0]]) deco.prop('car', x + 0.5, FY, z + 0.5, { color: c, rot: Math.PI / 2 });
  add.landmark({ id: 'rt_pikeplaza', x: 1327, z: ROAD_Z + 13 });
  // the woods either side
  for (let i = 0; i < 90; i++) {
    const x = 1262 + Math.floor(ctx.rand() * 176), z = Math.floor(2 + ctx.rand() * 84);
    if (Math.abs(z - ROAD_Z) < 10 || (x > 1296 && x < 1362 && z > ROAD_Z) || Math.abs(z - 66) < 4) continue;
    const y = top(x, z); if (!isFinite(y) || W.get(x, y, z)) continue;
    (ctx.rand() < 0.6 ? trees.pine : trees.oak)(x, z);
  }
  ctx.scatter([B.grass, B.forest_floor], ['grass', 'tall_grass', 'fern', 'flower_yellow'], 0.08);
  add.camp({ id: 'rt_turnpike_woods', x: 1296, z: ROAD_Z - 22, kinds: ['pup', 'hellhound', 'pup'], count: 5 });
  add.chest({ id: 'rt_turnpike_diner', x: 1320, z: ROAD_Z + 19, rarity: 'common' });
  add.chest({ id: 'rt_turnpike_woods', x: 1288, z: ROAD_Z - 30, rarity: 'rare' });
}
export const QUESTS = [];
