// St. Louis (the Road West, chapter 6): the Amtrak station, city blocks, the
// Gateway Arch over its park and, at the west end, the Mississippi with the
// lift bridge raised (the roadblock) and the westbound station beyond.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 48, 2) - 0.4) * 4,
  surface: () => B.grass,
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, trees, top, sign, rand } = ctx;
  add.waystone('rt_stlouis', 948, ROAD_Z - 8);
  add.waystone('rt_arch', 912, ROAD_Z + 8);
  add.waystone('rt_stl_west', 840, ROAD_Z - 8);
  // the Gateway Arch: a stainless-steel parabola 30 high and 30 wide
  const cx = 902, cz = ROAD_Z - 16, span = 15, hgt = 30;
  ctx.flatten(882, cz - 8, 922, cz + 6, FY, B.grass);
  for (let a = -span; a <= span; a += 0.25) {
    const y = Math.round(FY + hgt * (1 - (a / span) ** 2)), x = Math.round(cx + a);
    for (let dz = -1; dz <= 1; dz++) for (let dy = 0; dy < 2; dy++) W.set(x, Math.min(W.sy - 2, y + dy), cz + dz, B.steel_panel);
  }
  for (let y = FY; y < FY + 3; y++) for (let dz = -1; dz <= 1; dz++) for (const x of [cx - span, cx + span]) W.set(x, y, cz + dz, B.steel_panel);
  add.landmark({ id: 'rt_gatewayarch', x: cx, z: cz });
  sign(cx, cz + 5, t('rt.signs.arch'), { w: 3.6, h: 0.9, post: 2.0, bg: '#2a2a30', fg: '#e8e8f0', border: '#a0a8b0' });
  // city blocks: brownstones along both sides of the road
  const block = (x0, z0, w, d, h) => { k.room(x0, z0, x0 + w, z0 + d, FY, h, B.brownstone, { trim: B.cornice, doors: [{ side: z0 > ROAD_Z ? 'n' : 's', at: x0 + (w >> 1), width: 2, height: 3 }] }); for (let x = x0; x <= x0 + w; x++) for (let z = z0; z <= z0 + d; z++) W.set(x, FY + h, z, B.roof); for (let x = x0 + 1; x < x0 + w; x += 2) for (let y = FY + 1; y < FY + h - 1; y += 2) W.set(x, y, z0 > ROAD_Z ? z0 : z0 + d, B.window_day); };
  for (let i = 0; i < 6; i++) block(926 + i * 7, ROAD_Z + 8, 5, 8, 6 + (i % 3) * 2);
  for (let i = 0; i < 4; i++) block(876 + i * 7, ROAD_Z + 8, 5, 7, 5 + (i % 2) * 3);
  for (let i = 0; i < 5; i++) { const x = 928 + i * 8; deco.prop('streetlight', x + 0.5, FY, ROAD_Z - 6.5, { rot: Math.PI / 2 }); }
  for (let i = 0; i < 24; i++) { const x = 880 + Math.floor(rand() * 44), z = cz + 6 + Math.floor(rand() * 4); const y = top(x, z); if (isFinite(y) && !W.get(x, y, z)) trees.oak(x, z, { h: 4 }); }
  ctx.scatter([B.grass], ['grass', 'flower_red', 'flower_blue'], 0.06);
  add.camp({ id: 'rt_stlouis_rail', x: 892, z: ROAD_Z + 28, kinds: ['spider', 'skeleton', 'spider'], count: 6, chest: 'rare' });
  add.chest({ id: 'rt_stlouis_arch', x: cx, z: cz, rarity: 'rare' });
  add.chest({ id: 'rt_stlouis_alley', x: 934, z: ROAD_Z + 18, rarity: 'common' });
}
export const QUESTS = [];
