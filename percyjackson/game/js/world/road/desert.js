// The Nevada desert (the Road West): a hundred blocks of sand, red mesas and
// cacti either side of the highway. Too hot and too far to walk: you drive it
// in the taxi (openworld/roadtrip.js), steering round what's on the road.
import { B } from '../blocks.js';

export const terrain = {
  height: (x, z, n) => { const m = n.fbm(x, z, 22, 2); return m > 0.62 ? 6 + (m - 0.62) * 30 : (n.fbm(x, z, 60, 2) - 0.4) * 3; },
  surface: (x, z, h) => (h > 4 ? B.red_rock : B.desert_sand),
};

export function build(ctx) {
  const { deco, ROAD_Z, FY, W, top, rand, add } = ctx;
  for (let i = 0; i < 70; i++) {
    const x = 206 + Math.floor(rand() * 110), z = Math.floor(2 + rand() * 84);
    if (Math.abs(z - ROAD_Z) < 6) continue;
    const y = top(x, z); if (!isFinite(y) || W.get(x, y, z)) continue;
    deco.prop('cactus', x + 0.5, y, z + 0.5, { h: 1.4 + rand() * 1.6, rot: rand() * 6 }); W.set(x, y, z, B.barrier);
  }
  ctx.scatter([B.desert_sand], ['dry_grass', 'bone'], 0.03);
  add.landmark({ id: 'rt_desert', x: 260, z: ROAD_Z });
  void FY;
}
export const QUESTS = [];
