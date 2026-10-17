// The North Shore (open world, north of camp): Long Island Sound, sea cliffs,
// beaches and dunes, a lighthouse, a wreck. Levels 3-5.
import { B } from '../blocks.js';

export const terrain = {
  // cliffs rise inland from the beach; the sea comes in along the north
  height: (x, z, n) => {
    const north = z < 14 + n.fbm(x, 3, 30) * 10 ? -3 : 0;
    const cliff = Math.min(1, Math.max(0, (z - 18) / 30)) * (n.ridge(x, z, 40) * 8 - 1);
    return north || cliff + (n.fbm(x, z, 30) - 0.5) * 3;
  },
  surface: (x, z, h) => (h <= 1 ? B.sand : h > 6 ? B.rock : B.grass),
};

export function build(c) {
  const { add, rand, bounds: b, trees, scatter, level } = c;
  add.waystone('shore_dunes', 70, 60);
  add.waystone('shore_cliffs', 160, 50);
  for (let i = 0; i < 90; i++) { const x = Math.floor(b.x0 + 20 + rand() * (b.x1 - b.x0 - 24)), z = Math.floor(30 + rand() * 85); if (level(x, z, 3, 3, 1) && c.W.get(x, c.top(x, z) - 1, z) === B.grass) trees.pine(x, z, { h: 6 + Math.floor(rand() * 3) }); }
  scatter([B.sand], ['shell', 'starfish', 'dry_grass'], 0.04, 0.5);
  scatter([B.grass], ['tall_grass', 'dry_grass', 'grass'], 0.12);
}
