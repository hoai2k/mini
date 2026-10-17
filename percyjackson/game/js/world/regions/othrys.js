// Mount Othrys (open world, north-east): grey mountains and the black-marble
// ruins of the Titans' fortress. Levels 8-10.
import { B } from '../blocks.js';

export const terrain = {
  height: (x, z, n) => n.ridge(x, z, 60) * 18 - 4 + (n.fbm(x, z, 24) - 0.5) * 3,
  surface: (x, z, h) => (h > 9 ? B.rock : h > 4 ? B.basalt : B.grass),
};

export function build(c) {
  const { add, scatter } = c;
  add.waystone('othrys_pass', 245, 105);
  add.waystone('othrys_summit', 330, 50);
  scatter([B.grass], ['grass', 'dry_grass'], 0.1);
}
