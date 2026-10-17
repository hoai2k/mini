// Strawberry Fields (open world, east of camp): rolling farmland, the camp's
// strawberry fields and orchards, barns and windmills, the first monsters
// past the border. Levels 1-3.
import { B } from '../blocks.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 46) - 0.45) * 7,
  surface: (x, z, h, n) => (n.value(x * 0.09, z * 0.09) > 0.82 ? B.dirt : B.grass),
};

export function build(c) {
  const { add, rand, bounds: b, trees, scatter, level } = c;
  add.waystone('fields_crossroads', 172, 168);
  add.waystone('fields_orchard', 225, 135);
  for (let i = 0; i < 70; i++) { const x = Math.floor(b.x0 + 4 + rand() * (b.x1 - b.x0 - 8)), z = Math.floor(b.z0 + 4 + rand() * (b.z1 - b.z0 - 8)); if (level(x, z, 3, 3, 1)) (rand() < 0.7 ? trees.oak : trees.pine)(x, z); }
  scatter([B.grass], ['grass', 'tall_grass', 'flower_yellow', 'flower_red', 'grass', 'flower_blue'], 0.14);
}
