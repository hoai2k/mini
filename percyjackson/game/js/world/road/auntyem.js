// Aunty Em's Garden Gnome Emporium (the Road West, chapter 5): New Jersey
// farmland, the warehouse with its statue garden and rows of gnomes and, at
// the west end, a wall of stone statues across the road (the roadblock) and
// the Amtrak station beyond it.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 56, 3) - 0.35) * 6,
  surface: (x, z, h, n) => (n.value(x * 0.3, z * 0.3) > 0.8 ? B.dirt : B.grass),
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, RAIL_Z, FY, W, trees, top, sign, rand } = ctx;
  add.waystone('rt_auntyem', 1214, ROAD_Z - 8);
  add.waystone('rt_amtrak_east', 1128, ROAD_Z - 8);
  // the Emporium: a long warehouse, its sign, the garden of statues and gnomes
  const x0 = 1176, x1 = 1196, z0 = ROAD_Z + 14, z1 = ROAD_Z + 24;
  ctx.flatten(1170, ROAD_Z + 6, 1204, ROAD_Z + 30, FY, B.gravel_path);
  k.room(x0, z0, x1, z1, FY, 5, B.corrugated, { trim: B.white_trim, doors: [{ side: 'n', at: 1186, width: 3, height: 3 }] });
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) W.set(x, FY + 5, z, B.roof_slate);
  sign(1186, z0 - 1, t('rt.signs.auntyEm'), { w: 4.4, h: 1.2, post: 4.2, bg: '#f2efe6', fg: '#c4302a', border: '#3f8a34' });
  for (let i = 0; i < 12; i++) deco.prop('gnome', 1172.5 + i * 2.6, FY, ROAD_Z + 9.5 + (i % 2), { rot: rand() * 6, color: [0xd8322a, 0x2a6ad8, 0xffd84a][i % 3] });
  for (let i = 0; i < 8; i++) { const x = 1172 + i * 4, z = ROAD_Z + 27; deco.prop('stone_person', x + 0.5, FY, z + 0.5, { pose: i % 5, rot: Math.PI + (rand() - 0.5), scale: 1.05 }); W.set(x, FY, z, B.barrier); W.set(x, FY + 1, z, B.barrier); }
  deco.prop('birdbath', 1200.5, FY, ROAD_Z + 12.5, {}); deco.prop('gazing_ball', 1172.5, FY, ROAD_Z + 13.5, {});
  add.landmark({ id: 'rt_emporium', x: 1186, z: ROAD_Z + 12 });
  // farmland: fields, a red barn, a few trees
  for (let z = ROAD_Z - 26; z <= ROAD_Z - 12; z++) for (let x = 1226; x <= 1252; x++) if (isFinite(top(x, z))) W.set(x, top(x, z) - 1, z, (z % 3) ? B.farm_soil : B.mud);
  for (let i = 0; i < 40; i++) { const x = 1112 + Math.floor(rand() * 146), z = Math.floor(2 + rand() * 84); if (Math.abs(z - ROAD_Z) < 10 || Math.abs(z - RAIL_Z) < 8 || (x > 1166 && x < 1208 && z > ROAD_Z)) continue; const y = top(x, z); if (isFinite(y) && !W.get(x, y, z)) trees.oak(x, z); }
  ctx.scatter([B.grass], ['grass', 'tall_grass', 'flower_yellow', 'flower_blue'], 0.08);
  add.camp({ id: 'rt_auntyem_garden', x: 1236, z: ROAD_Z + 22, kinds: ['gorgon_statue', 'pup', 'spider'], count: 5 });
  add.chest({ id: 'rt_auntyem_back', x: 1198, z: ROAD_Z + 28, rarity: 'rare' });
  add.chest({ id: 'rt_auntyem_field', x: 1250, z: ROAD_Z - 24, rarity: 'common' });
}
export const QUESTS = [];
