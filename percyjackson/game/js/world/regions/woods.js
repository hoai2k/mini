// The Camp Woods (open world, south-east of camp): deep forest stocked with
// monsters for training, the creek, Zeus's Fist. Levels 2-4.
import { B } from '../blocks.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 38) - 0.42) * 9,
  surface: (x, z, h, n) => (n.value(x * 0.12, z * 0.12) > 0.7 ? B.grass : B.forest_floor),
};

export function build(c) {
  const { add, rand, bounds: b, trees, scatter, level } = c;
  add.waystone('woods_creek', 178, 262);
  add.waystone('woods_fist', 220, 312);
  for (let i = 0; i < 420; i++) { const x = Math.floor(b.x0 + 2 + rand() * (b.x1 - b.x0 - 4)), z = Math.floor(b.z0 + 2 + rand() * (b.z1 - b.z0 - 4)); if (c.inRegion(x, z) && level(x, z, 3, 3, 1)) (rand() < 0.65 ? trees.pine : trees.oak)(x, z); }
  scatter([B.forest_floor], ['fern', 'fern', 'leaf_litter', 'mushroom', 'grass'], 0.22);
  scatter([B.grass], ['grass', 'tall_grass', 'fern'], 0.18);
}
