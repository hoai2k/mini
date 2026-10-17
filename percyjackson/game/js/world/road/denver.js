// Denver (the Road West, chapter 7): the Rockies to the north, a diner,
// Waterland (closed for the season: pools, the Tunnel of Love's swan boats)
// and, at the west end, the rockslide across the pass (the roadblock) and the
// truck stop where the zoo truck waits.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

export const terrain = {
  height: (x, z, n) => (z < 30 ? 4 + (30 - z) * 0.5 : 0) + (n.fbm(x, z, 36, 3) - 0.35) * 8,
  surface: (x, z, h) => (h > 10 ? B.rock : h > 6 ? B.forest_floor : B.grass),
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, trees, top, sign, rand } = ctx;
  add.waystone('rt_denver', 660, ROAD_Z - 8);
  add.waystone('rt_truckstop_west', 576, ROAD_Z + 9);
  // Waterland: pools, a slide tower, the swan boats
  ctx.flatten(612, ROAD_Z + 8, 650, ROAD_Z + 34, FY, B.pool_tile);
  k.pond(616, ROAD_Z + 12, 630, ROAD_Z + 22, FY, B.water, 2, B.pool_tile);
  k.pond(634, ROAD_Z + 14, 646, ROAD_Z + 26, FY, B.water, 2, B.pool_tile);
  for (let y = FY; y < FY + 8; y++) for (const [x, z] of [[640, ROAD_Z + 30], [644, ROAD_Z + 30], [640, ROAD_Z + 32], [644, ROAD_Z + 32]]) W.set(x, y, z, B.steel_panel);
  for (let i = 0; i < 12; i++) W.set(638 - i, FY + 7 - Math.floor(i * 0.6), ROAD_Z + 31, B.slide_glass);
  deco.prop('swan_boat', 622.5, FY - 0.75, ROAD_Z + 17.5, { rot: 0.4 });
  deco.prop('water_tower', 652.5, FY, ROAD_Z + 30.5, { color: 0x6ac0e0 });
  sign(628, ROAD_Z + 8, t('rt.signs.waterland'), { w: 4, h: 1.1, post: 3, bg: '#2a8ac8', fg: '#ffffff', border: '#f2d040' });
  add.landmark({ id: 'rt_waterland', x: 630, z: ROAD_Z + 20 });
  // the diner where Ares waited
  k.room(668, ROAD_Z + 9, 680, ROAD_Z + 16, FY, 4, B.steel_panel, { trim: B.neon_pink, doors: [{ side: 'n', at: 674, width: 2, height: 3 }] });
  for (let x = 668; x <= 680; x++) for (let z = ROAD_Z + 9; z <= ROAD_Z + 16; z++) W.set(x, FY + 4, z, B.roof);
  deco.prop('car', 676.5, FY, ROAD_Z + 20.5, { color: 0x1a1a1e, rot: 0 });   // (the god of war's motorcycle is out back)
  add.landmark({ id: 'rt_diner', x: 674, z: ROAD_Z + 12 });
  // the truck stop by the pass
  ctx.flatten(560, ROAD_Z + 6, 584, ROAD_Z + 16, FY, B.asphalt);
  sign(572, ROAD_Z + 6, t('rt.signs.truckStop'), { w: 3, h: 0.9, post: 3, bg: '#2a2a30', fg: '#f2d040' });
  // pines up the mountainside
  for (let i = 0; i < 70; i++) { const x = 560 + Math.floor(rand() * 128), z = Math.floor(2 + rand() * 30); const y = top(x, z); if (isFinite(y) && !W.get(x, y, z) && Math.abs(z - ROAD_Z) > 9) trees.pine(x, z); }
  ctx.scatter([B.grass, B.forest_floor], ['grass', 'fern', 'flower_blue'], 0.07);
  add.camp({ id: 'rt_denver_slope', x: 600, z: ROAD_Z - 22, kinds: ['skeleton', 'hellhound', 'skeleton'], count: 6, chest: 'rare' });
  add.chest({ id: 'rt_denver_slide', x: 642, z: ROAD_Z + 31, rarity: 'rare' });
  add.chest({ id: 'rt_denver_diner', x: 678, z: ROAD_Z + 18, rarity: 'common' });
}
export const QUESTS = [];
