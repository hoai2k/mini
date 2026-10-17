// The Fields of Asphodel (open world, south-east): grey ash plains and pale
// flowers where the Underworld breaks through. Levels 9-12.
import { B } from '../blocks.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 50) - 0.5) * 5,
  surface: (x, z, h, n) => (n.value(x * 0.15, z * 0.15) > 0.7 ? B.underworld_rock : B.asphodel),
};

export function build(c) {
  const { add, scatter } = c;
  add.waystone('asphodel_ferry', 280, 330);
  add.waystone('asphodel_gate', 370, 380);
  scatter([B.asphodel], ['asphodel', 'asphodel', 'skull', 'dry_grass'], 0.08);
}
