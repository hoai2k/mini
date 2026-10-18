// Aunty Em's (the Road West, chapter 5): back-road New Jersey. East to west:
// Pete's Last Gas, the Pruitt farm across the road (farmhouse, red barn, silo
// and a corn field with something hissing in it), then Aunty Em's Garden
// Gnome Emporium: the big warehouse with its snack bar, rows of gnomes and two
// gardens full of frightened stone people. At the west end a wall of stone
// statues closes the road (the roadblock); beyond it, the Amtrak station.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';
import { gable } from '../rooms.js';
import { roadside, padMask, clearOf } from './turnpike.js';

const PADS = [
  [1160, 50, 1214, 86],   // the Emporium and its gardens
  [1218, 50, 1252, 66],   // Pete's Last Gas
  [1180, 10, 1220, 34],   // the farmhouse, barn and silo
  [1122, 50, 1145, 59],   // the station car park
];

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 56, 3) - 0.35) * 6 * (1 - padMask(PADS, x, z)),
  surface: (x, z, h, n) => (n.value(x * 0.3, z * 0.3) > 0.8 ? B.dirt : B.grass),
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, trees, rand } = ctx;
  const R = roadside(ctx), S = (key) => t('rt.signs.' + key);
  add.waystone('rt_auntyem', 1214, ROAD_Z - 8);
  add.waystone('rt_amtrak_east', 1128, ROAD_Z - 8);

  // ---------------- Aunty Em's Garden Gnome Emporium
  ctx.flatten(1160, ROAD_Z + 6, 1214, 86, FY, B.gravel_path);
  // the two statue gardens (hedged, open towards the road) and the back garden
  const garden = (x0, x1) => {
    R.fill(x0, FY - 1, ROAD_Z + 8, x1, FY - 1, 84, B.grass);
    for (let z = ROAD_Z + 8; z <= 84; z++) for (const x of [x0, x1]) { W.set(x, FY, z, B.leaves); W.set(x, FY + 1, z, B.leaves); }
    for (let x = x0; x <= x1; x++) { W.set(x, FY, 84, B.leaves); W.set(x, FY + 1, 84, B.leaves); }
    for (let x = x0 + 2; x <= x1 - 2; x += 3) for (let z = ROAD_Z + 11; z <= 81; z += 4) {
      if (rand() < 0.15) { deco.prop(rand() < 0.5 ? 'birdbath' : 'gazing_ball', x + 0.5, FY, z + 0.5); continue; }
      deco.prop('stone_person', x + 0.5, FY, z + 0.5, { pose: Math.floor(rand() * 5), rot: rand() * 6.28, scale: 1.05 });
      W.set(x, FY, z, B.barrier); W.set(x, FY + 1, z, B.barrier);
    }
  };
  garden(1161, 1171); garden(1203, 1213);
  R.fill(1172, FY - 1, 80, 1202, FY - 1, 84, B.grass);
  for (let x = 1172; x <= 1202; x++) { W.set(x, FY, 85, B.leaves); W.set(x, FY + 1, 85, B.leaves); }
  // the warehouse
  const wx0 = 1173, wx1 = 1201, wz0 = ROAD_Z + 18, wz1 = ROAD_Z + 33;
  R.building(wx0, wz0, wx1, wz1, {
    h: 6, wall: B.planks, trim: B.dark_planks, roof: B.shingle_green, eave: 1, roofH: 6, floor: B.floor_boards,
    windows: { id: B.window_day, every: 4, sides: 'nsew', y: 3 },
    doors: [{ side: 'n', at: 1187, width: 3, height: 4 }, { side: 's', at: 1180, width: 1, height: 3 }],
  });
  // its green gabled roof with the skylights lit, the timber posts at the corners
  gable(k, wx0, wz0, wx1, wz1, FY + 7, B.shingle_green, { axis: 'x', end: B.planks, run: 2, ridgeId: B.dark_planks });
  for (let x = wx0 + 4; x <= wx1 - 4; x += 6) for (const z of [wz0 + 1, wz0 + 2, wz1 - 2, wz1 - 1]) W.set(x, FY + 7 + Math.floor(Math.min(z - wz0 + 1, wz1 + 1 - z) / 2), z, B.window_day);
  for (const x of [wx0, wx1]) for (const z of [wz0, wz1]) for (let y = FY; y < FY + 6; y++) W.set(x, y, z, B.log);
  // the giant gnome on the lawn, waving the traffic in
  R.fill(1196, FY, ROAD_Z + 13, 1197, FY, ROAD_Z + 14, B.cobble);
  deco.prop('gnome', 1197, FY + 1, ROAD_Z + 14, { scale: 4, rot: -0.3, color: 0xd8322a });
  R.fill(1196, FY + 1, ROAD_Z + 13, 1197, FY + 4, ROAD_Z + 14, B.barrier);
  deco.prop('text_sign', 1187.5, FY + 7, wz0 - 1.7, { text: S('auntyEm'), w: 13, h: 2.4, post: 0.4, bg: '#f2efe6', fg: '#c4302a', border: '#3f8a34' });
  // inside: the snack bar (it smells of burgers), rows of gnomes, a few more statues, the photo corner
  for (let x = 1192; x <= 1200; x++) { W.set(x, FY, wz0 + 4, B.white_trim); W.set(x, FY, wz0 + 1, B.iron_plate); }
  deco.prop('text_sign', 1196.5, FY + 3, wz0 + 4.5, { text: S('aeBurgers'), w: 3.2, h: 0.8, post: 0, glow: true, bg: '#2a1a1a', fg: '#f2d040', border: '#c4302a' });
  for (const x of [1191, 1196]) deco.prop('table', x + 0.5, FY, wz0 + 8.5, { len: 3 });
  for (let x = 1175; x <= 1185; x += 2) for (let z = wz0 + 3; z <= wz1 - 2; z += 3) deco.prop('gnome', x + 0.5, FY, z + 0.5, { rot: rand() * 6, color: [0xd8322a, 0x2a6ad8, 0xffd84a][(x + z) % 3] });
  for (const [x, z, pose] of [[1189, wz1 - 3, 1], [1193, wz1 - 2, 3], [1176, wz1 - 1, 0]]) { deco.prop('stone_person', x + 0.5, FY, z + 0.5, { pose, rot: Math.PI, scale: 1.05 }); W.set(x, FY, z, B.barrier); W.set(x, FY + 1, z, B.barrier); }
  deco.prop('couch', 1197.5, FY, wz1 - 1.6, { color: 0x6a2a3a });
  deco.prop('text_sign', 1197.5, FY + 2.6, wz1 - 0.45, { text: S('aeSmile'), w: 2.4, h: 0.7, post: 0, bg: '#1a1a1e', fg: '#f2efe6', border: '#c4302a' });
  add.chest({ id: 'rt_auntyem_snackbar', x: 1200, z: wz0 + 2, y: FY, rarity: 'common' });
  // the gnomes out front (one of them by the road, where chapter 5 starts)
  for (let i = 0; i < 12; i++) deco.prop('gnome', 1172.5 + i * 2.6, FY, ROAD_Z + 9.5 + (i % 2), { rot: rand() * 6, color: [0xd8322a, 0x2a6ad8, 0xffd84a][i % 3] });
  deco.prop('birdbath', 1200.5, FY, ROAD_Z + 12.5, {}); deco.prop('gazing_ball', 1173.5, FY, ROAD_Z + 13.5, {});
  deco.prop('text_sign', 1178.5, FY, ROAD_Z + 7.5, { text: S('aeAuntyEmRoad'), w: 3.6, h: 1.4, post: 3, bg: '#3f8a34', fg: '#f2efe6', border: '#f2d040' });
  R.car(1206, ROAD_Z + 10, 0x1a1a1e, Math.PI / 2);
  add.landmark({ id: 'rt_emporium', x: 1186, z: ROAD_Z + 12 });

  // ---------------- Pete's Last Gas: a rusty canopy, two pumps, a little shop, cars that never left
  ctx.flatten(1218, ROAD_Z + 6, 1252, ROAD_Z + 22, FY, B.asphalt);
  R.canopy(1220, ROAD_Z + 8, 1234, ROAD_Z + 14, [1223, 1230], { roof: B.rust_metal, stripe: B.barn_red, pillar: B.rust_metal });
  R.building(1237, ROAD_Z + 9, 1247, ROAD_Z + 16, { h: 4, wall: B.white_trim, trim: B.barn_red, roof: B.rust_metal, windows: { id: B.shop_window, sides: 'n', every: 2 }, doors: [{ side: 'n', at: 1242, width: 1, height: 3 }] });
  W.set(1238, FY, ROAD_Z + 10, B.vending);
  deco.prop('text_sign', 1219.5, FY, ROAD_Z + 7.5, { text: S('aePetesGas'), w: 3.4, h: 2, post: 4.2, bg: '#f2efe6', fg: '#c4302a', border: '#c4302a' });
  deco.prop('car_flipped', 1249.5, FY, ROAD_Z + 20.5, { color: 0x7a4a2a });
  R.car(1240, ROAD_Z + 20, 0x5a6a4a, 0.3);
  for (const [x, z] of [[1250, ROAD_Z + 10], [1251, ROAD_Z + 11], [1250, ROAD_Z + 12]]) W.set(x, FY, z, B.barrel);
  add.chest({ id: 'rt_auntyem_gas', x: 1245, z: ROAD_Z + 14, y: FY, rarity: 'common' });
  add.landmark({ id: 'rt_petesgas', x: 1227, z: ROAD_Z + 11 });

  // ---------------- the Pruitt farm (north side): farmhouse, red barn, silo, the corn
  ctx.flatten(1180, 10, 1220, 34, FY, B.grass);
  // farmhouse: white clapboard, a gabled roof, a porch
  R.building(1182, 18, 1192, 26, { h: 4, wall: B.white_trim, roof: B.roof_slate, roofH: 7, light: 0xffe0b0, windows: { id: B.window_day, every: 2, sides: 'nsew' }, doors: [{ side: 's', at: 1187, width: 1, height: 3 }] });
  gable(k, 1182, 18, 1192, 26, FY + 5, B.roof, { axis: 'x' });
  for (let x = 1182; x <= 1192; x++) { W.set(x, FY - 1, 27, B.floor_boards); W.set(x, FY - 1, 28, B.floor_boards); }
  for (const x of [1182, 1186, 1188, 1192]) for (let y = FY; y < FY + 3; y++) W.set(x, y, 28, B.white_trim);
  for (let x = 1181; x <= 1193; x++) for (const z of [27, 28]) W.set(x, FY + 3, z, B.roof_slate);
  deco.prop('mailbox', 1188.5, FY, 35.5);
  // the red barn with its hayloft
  const bx0 = 1198, bx1 = 1212, bz0 = 15, bz1 = 28;
  R.building(bx0, bz0, bx1, bz1, { h: 6, wall: B.barn_red, trim: B.white_trim, roof: B.barn_red, roofH: 9, floor: B.dirt, light: 0xffc890, doors: [{ side: 's', at: 1205, width: 3, height: 4 }] });
  gable(k, bx0, bz0, bx1, bz1, FY + 6, B.roof_slate, { axis: 'x', end: B.barn_red });
  R.fill(bx0 + 1, FY + 3, bz0 + 1, bx1 - 1, FY + 3, bz0 + 5, B.floor_boards);
  for (let i = 0; i < 4; i++) for (let y = FY; y <= FY + i; y++) W.set(bx1 - 2, y, bz0 + 9 - i, B.hay);
  for (const [x, z] of [[1200, 17], [1201, 17], [1200, 18], [1206, 17]]) W.set(x, FY + 4, z, B.hay);
  for (const [x, z] of [[1199, 26], [1200, 26], [1199, 25], [1211, 26]]) W.set(x, FY, z, B.hay);
  add.chest({ id: 'rt_auntyem_hayloft', x: 1203, z: 17, y: FY + 4, rarity: 'rare', hidden: true });
  // the silo
  for (let y = FY; y < FY + 11; y++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const d = dx * dx + dz * dz; if (d > 5) continue;
    if (d >= 3 || y === FY + 10) W.set(1216 + dx, y, 20 + dz, y === FY + 10 ? B.iron_plate : B.stone_brick);
  }
  W.set(1216, FY + 11, 20, B.iron_plate);
  // the corn: soil rows, tall stalks, a rail fence round it
  for (let z = 10; z <= 32; z++) for (let x = 1222; x <= 1254; x++) {
    const y = ctx.top(x, z); if (!isFinite(y) || W.get(x, y, z)) continue;
    W.set(x, y - 1, z, z % 3 ? B.farm_soil : B.mud);
    if (z % 3 && rand() < 0.7) deco.add('tall_grass', x + 0.5, y, z + 0.5, { scale: 1.7, sway: 1 });
  }
  deco.prop('fence', 1238.5, ctx.top(1238, 34), 34.5, { len: 32 });
  // the farm stand by the road
  R.fill(1232, FY - 1, ROAD_Z - 9, 1236, FY - 1, ROAD_Z - 7, B.floor_boards);
  deco.prop('table', 1234.5, FY, ROAD_Z - 7.5, { len: 3 });
  for (let x = 1232; x <= 1236; x++) W.set(x, FY + 3, ROAD_Z - 8, B.awning);
  for (const x of [1232, 1236]) for (let y = FY; y < FY + 3; y++) W.set(x, y, ROAD_Z - 9, B.dark_planks);
  deco.prop('text_sign', 1234.5, FY, ROAD_Z - 6.4, { text: S('aeCorn'), w: 3, h: 0.8, post: 0.6, bg: '#f2d040', fg: '#2a2a1e', border: '#3f8a34' });
  add.landmark({ id: 'rt_pruittfarm', x: 1205, z: 30 });

  // ---------------- west of the statues: the Amtrak station's car park
  ctx.flatten(1124, ROAD_Z + 6, 1144, ROAD_Z + 14, FY, B.asphalt);
  for (let x = 1126; x <= 1144; x += 4) for (let z = ROAD_Z + 11; z <= ROAD_Z + 13; z++) W.set(x, FY - 1, z, B.asphalt_line);
  R.car(1128, ROAD_Z + 12, 0xf2d040, Math.PI / 2); R.car(1136, ROAD_Z + 12, 0x2a4a8a, Math.PI / 2); R.car(1140, ROAD_Z + 12, 0xd8d8d0, Math.PI / 2);
  deco.prop('newsstand', 1125.5, FY, ROAD_Z + 8.5, { rot: Math.PI / 2 });
  deco.prop('hotdog_cart', 1132.5, FY, ROAD_Z + 7.5);
  deco.prop('bench', 1138.5, FY, ROAD_Z + 7.5);
  for (const x of [1124, 1144]) R.lamp(x, ROAD_Z + 7);
  add.chest({ id: 'rt_auntyem_station', x: 1124, z: ROAD_Z + 12, rarity: 'rare', hidden: true });

  // ---------------- billboards, signs, mile markers
  R.gantry(1256, S('aeGantryL'), S('aeGantryR'));
  R.billboard(1216, ROAD_Z - 16, S('aeBbPhoto'), { bg: '#1a1a1e', fg: '#f2efe6', border: '#c4302a' });
  R.billboard(1158, ROAD_Z + 18, S('aeBbHungry'), { bg: '#f2d040', fg: '#c4302a', border: '#2a2a1e' });
  R.billboard(1136, ROAD_Z - 14, S('aeBbTrain'), { bg: '#1e3a8a', fg: '#ffffff', border: '#c8282a' });
  [[1252, 131], [1196, 136], [1140, 142]].forEach(([x, n]) => R.mile(x, n));

  // ---------------- trees, grass
  const keep = clearOf([[1143, 0, 1157, 88], [1158, 50, 1216, 87], [1216, 50, 1254, 68], [1178, 8, 1220, 36], [1220, 8, 1256, 34], [1120, 50, 1146, 70], [1212, 26, 1218, 34], [1154, 56, 1160, 67], [1132, 26, 1140, 34], [1104, 58, 1140, 70]]);
  R.woods(70, 1112, 1258, 2, 86, keep, (x, z) => (rand() < 0.7 ? trees.oak : trees.pine)(x, z));
  ctx.scatter([B.grass], ['grass', 'tall_grass', 'flower_yellow', 'flower_blue'], 0.08);

  // ---------------- monsters, treasure, Mrs. Pruitt and her wandering gnomes
  add.camp({ id: 'rt_auntyem_garden', x: 1236, z: ROAD_Z + 32, kinds: ['gorgon_statue', 'pup', 'spider'], count: 5 });
  add.camp({ id: 'rt_auntyem_barn', x: 1205, z: 31, kinds: ['spider', 'spider', 'dracaena'], count: 5, chest: 'rare' });
  add.champion({ id: 'rt_auntyem_hissy', x: 1242, z: 20, kind: 'dracaena', level: 5, elite: 'swift' });
  add.chest({ id: 'rt_auntyem_back', x: 1200, z: 82, rarity: 'rare' });
  add.chest({ id: 'rt_auntyem_field', x: 1252, z: 12, rarity: 'common', hidden: true });
  add.npc({ id: 'rt_auntyem_pruitt', x: 1238, z: ROAD_Z - 8, model: 'npc:rt_auntyem_pruitt', yaw: Math.PI / 2 });
  for (const [i, x, z] of [[1, 1166, 30], [2, 1253, ROAD_Z + 19], [3, 1209, 83], [4, 1226, 14], [5, 1194, 31]]) add.item({ id: 'rt_auntyem_gnome_' + i, quest: 'rt_auntyem_gnomes', x, z, look: 'gnome' });
}

export const QUESTS = [
  { id: 'rt_auntyem_gnomes', giver: 'rt_auntyem_pruitt',
    steps: [{ type: 'collect', count: 5 }, { type: 'return' }],
    reward: { xp: 240, coins: 80, item: 'common' } },
  { id: 'rt_auntyem_barn', giver: 'rt_auntyem_pruitt', requires: ['rt_auntyem_gnomes'],
    steps: [{ type: 'camp', id: 'rt_auntyem_barn' }, { type: 'kill', kind: 'spider', count: 4, region: 'rt_auntyem' }, { type: 'return' }],
    reward: { xp: 300, coins: 100, item: 'common' } },
  { id: 'rt_auntyem_corn', giver: 'rt_auntyem_pruitt', requires: ['rt_auntyem_barn'],
    steps: [{ type: 'reach', x: 1238, z: 22, radius: 7 }, { type: 'champion', id: 'rt_auntyem_hissy' }, { type: 'return' }],
    reward: { xp: 400, coins: 150, item: 'unique' } },
];
