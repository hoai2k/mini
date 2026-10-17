// Los Angeles (the Road West, chapters 9 and 10): Crusty's Water Bed Palace
// on the edge of town, then palms, a freeway overpass, DOA Recording Studios
// (the way into the Underworld) and, at the west end, a wall of shadow across
// the road (the roadblock) before the beach.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 40, 2) - 0.4) * 4,
  surface: (x, z, h, n) => (x > 160 ? B.desert_sand : n.value(x * 0.3, z * 0.3) > 0.6 ? B.grass : B.sidewalk),
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, sign } = ctx;
  add.waystone('rt_crustys', 198, ROAD_Z - 8);
  add.waystone('rt_la', 132, ROAD_Z + 8);
  // Crusty's Water Bed Palace: a showroom with waterbeds in the window
  const x0 = 178, x1 = 194, z0 = ROAD_Z + 12, z1 = ROAD_Z + 22;
  ctx.flatten(174, ROAD_Z + 6, 198, ROAD_Z + 26, FY, B.sidewalk);
  k.room(x0, z0, x1, z1, FY, 5, B.pink_plaster, { trim: B.white_trim, doors: [{ side: 'n', at: 186, width: 3, height: 3 }] });
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) W.set(x, FY + 5, z, B.roof);
  for (let x = x0 + 1; x < x1; x += 2) W.set(x, FY + 1, z0, B.shop_window);
  for (const [x, z] of [[181, z0 + 4], [186, z0 + 6], [191, z0 + 4]]) deco.prop('waterbed', x + 0.5, FY, z + 0.5, { swan: x === 186, rot: 0 });
  sign(186, z0 - 2, t('rt.signs.crustys'), { w: 4.2, h: 1.1, post: 3.6, bg: '#f2efe6', fg: '#c4302a', border: '#2ab0c8' });
  add.landmark({ id: 'rt_crustys', x: 186, z: ROAD_Z + 10 });
  // DOA Recording Studios: a black marble front with gold letters
  const dx0 = 104, dx1 = 120, dz0 = ROAD_Z - 22, dz1 = ROAD_Z - 12;
  ctx.flatten(100, dz0 - 2, 124, ROAD_Z - 6, FY, B.sidewalk);
  k.room(dx0, dz0, dx1, dz1, FY, 7, B.black_marble, { trim: B.gold_trim, doors: [{ side: 's', at: 112, width: 2, height: 3 }] });
  for (let x = dx0; x <= dx1; x++) for (let z = dz0; z <= dz1; z++) W.set(x, FY + 7, z, B.roof);
  sign(112, ROAD_Z - 9, t('rt.signs.doa'), { w: 3.6, h: 0.9, post: 3, bg: '#0a0a0e', fg: '#e8c870', border: '#c9963a' });
  add.landmark({ id: 'rt_doa', x: 112, z: ROAD_Z - 10 });
  // the freeway overpass
  for (let x = 140; x <= 156; x++) for (let z = 1; z < 87; z++) { if (Math.abs(z - ROAD_Z) <= 6 && x > 142 && x < 154) continue; if (x === 140 || x === 156 || z % 10 === 0) { /* pillars */ } }
  for (let z = 2; z < 86; z++) for (let x = 146; x <= 150; x++) W.set(x, FY + 6, z, B.concrete);
  for (const z of [6, 20, 32, 56, 68, 80]) for (let y = FY; y < FY + 6; y++) for (const x of [146, 150]) W.set(x, y, z, B.concrete_pillar);
  for (let i = 0; i < 12; i++) { const x = 76 + i * 10, z = ROAD_Z + (i % 2 ? 7 : -7); if (x > 98 && x < 126 && z < ROAD_Z) continue; deco.prop('palm', x + 0.5, FY, z + 0.5, { h: 7 }); W.set(x, FY, z, B.barrier); }
  add.camp({ id: 'rt_la_underpass', x: 150, z: ROAD_Z + 24, kinds: ['skeleton', 'ghost', 'hellhound'], count: 6, chest: 'rare' });
  add.chest({ id: 'rt_la_crustys', x: 192, z: z1 - 1, rarity: 'rare' });
  add.chest({ id: 'rt_la_overpass', x: 148, z: 10, rarity: 'common' });
}
export const QUESTS = [];
