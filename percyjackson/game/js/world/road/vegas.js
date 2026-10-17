// Las Vegas (the Road West, chapter 8): the Strip at dusk, neon casinos, the
// Lotus Hotel and Casino and, at the west end, its gate across the road (the
// roadblock) and the taxi rank beyond it.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 40, 2) - 0.4) * 3,
  surface: (x, z, h, n) => (n.value(x * 0.25, z * 0.25) > 0.7 ? B.sand : B.desert_sand),
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, sign, rand } = ctx;
  add.waystone('rt_vegas', 420, ROAD_Z - 8);
  add.waystone('rt_taxirank', 334, ROAD_Z + 9);
  // the Lotus: a tall casino with a neon lotus over its doors
  const x0 = 360, x1 = 386, z0 = ROAD_Z - 26, z1 = ROAD_Z - 10;
  ctx.flatten(354, z0 - 2, 392, ROAD_Z - 6, FY, B.sidewalk);
  k.room(x0, z0, x1, z1, FY, 12, B.lotus_panel, { trim: B.gold_trim, doors: [{ side: 's', at: 373, width: 4, height: 4 }] });
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) W.set(x, FY + 12, z, B.roof);
  for (let x = x0 + 2; x < x1; x += 3) for (let y = FY + 5; y < FY + 11; y += 2) W.set(x, y, z1, B.neon_green);
  for (let x = x0 + 1; x < x1; x++) W.set(x, FY + 4, z1, B.neon_bulbs);
  for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) W.set(x, FY - 1, z, B.casino_carpet);
  for (let i = 0; i < 6; i++) { deco.prop('slot', x0 + 3.5 + i * 3.5, FY, z0 + 3.5, { rot: 0 }); W.set(x0 + 3 + Math.floor(i * 3.5), FY, z0 + 3, B.barrier); }
  sign(373, ROAD_Z - 7, t('rt.signs.lotus'), { w: 5, h: 2, post: 3.4, bg: '#0a3a2a', fg: '#4affa0', border: '#d6aa4a', glow: true });
  W.addLight(373.5, FY + 5, z1 + 2, 0x4affa0, 5, 14);
  add.landmark({ id: 'rt_lotus', x: 373, z: ROAD_Z - 9 });
  // other casinos down the Strip, their neon
  const neon = [B.neon_pink, B.neon_green, B.neon_bulbs];
  for (let i = 0; i < 4; i++) { const bx = 394 + i * 10, h = 7 + (i % 2) * 4; k.room(bx, ROAD_Z + 9, bx + 7, ROAD_Z + 18, FY, h, i % 2 ? B.pink_plaster : B.gold_marble, { doors: [{ side: 'n', at: bx + 3, width: 2, height: 3 }] }); for (let x = bx; x <= bx + 7; x++) { for (let z = ROAD_Z + 9; z <= ROAD_Z + 18; z++) W.set(x, FY + h, z, B.roof); W.set(x, FY + h - 1, ROAD_Z + 9, neon[i % 3]); } W.addLight(bx + 4, FY + h - 1, ROAD_Z + 7.5, [0xff4ab0, 0x4affa0, 0xffd04a][i % 3], 3, 10); }
  for (let i = 0; i < 10; i++) { const x = 340 + i * 9, z = ROAD_Z + (i % 2 ? 7 : -7); deco.prop('palm', x + 0.5, FY, z + 0.5, { h: 6 }); W.set(x, FY, z, B.barrier); }
  ctx.scatter([B.desert_sand], ['dry_grass'], 0.03);
  add.camp({ id: 'rt_vegas_lot', x: 404, z: ROAD_Z - 24, kinds: ['empousa', 'skeleton', 'harpy'], count: 6, chest: 'rare' });
  add.chest({ id: 'rt_vegas_lotus', x: 383, z: z0 + 2, rarity: 'rare' });
  add.chest({ id: 'rt_vegas_alley', x: 428, z: ROAD_Z + 22, rarity: 'common' });
}
export const QUESTS = [];
