// The Labyrinth (open world, south): the ruins of Daedalus's maze breaking
// through the ground, broken walls and courtyards. Levels 6-8.
import { B } from '../blocks.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 40) - 0.5) * 4,
  surface: (x, z, h, n) => (n.value(x * 0.2, z * 0.2) > 0.6 ? B.cobble : B.grass),
};

export function build(c) {
  const { add, scatter } = c;
  add.waystone('labyrinth_gate', 70, 352);
  add.waystone('labyrinth_heart', 140, 385);
  scatter([B.grass], ['grass', 'tall_grass', 'fern'], 0.12);
}
