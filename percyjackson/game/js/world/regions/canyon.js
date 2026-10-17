// The Canyon (open world, east): red-rock mesas and dry washes, a desert of
// sand and stone. Levels 5-7.
import { B } from '../blocks.js';

export const terrain = {
  // flat-topped mesas (terraced ridges) over sandy flats
  height: (x, z, n) => { const r = n.ridge(x, z, 52); return r > 0.62 ? Math.round((r - 0.62) * 40 / 3) * 3 : (n.fbm(x, z, 30) - 0.5) * 2; },
  surface: (x, z, h) => (h > 2 ? B.red_rock : B.desert_sand),
};

export function build(c) {
  const { add, scatter } = c;
  add.waystone('canyon_wash', 285, 200);
  add.waystone('canyon_mesa', 360, 260);
  scatter([B.desert_sand], ['dry_grass', 'bone', 'dry_grass'], 0.05);
}
