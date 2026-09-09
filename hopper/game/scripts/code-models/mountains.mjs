/** Thunderhead Range: code-built crag column (M-036) and ledge shelf (M-037).
 * Sizes and landings follow the stand-ins in hopper/3d/standins/src/structures.js;
 * rock is the mountains cliff painting, turf the ground painting.
 * Reference: design/references/kits/mountains.png.
 */
import * as THREE from 'three';
import { faceted, landing, model, piece, rand, roughen } from './lib.mjs';

const ROCK = { kind: 'terrain', file: 'cliff.png', repeat: 2 };
const ROCK_FINE = { kind: 'terrain', file: 'cliff.png', repeat: 4 };
const TURF = { kind: 'terrain', file: 'ground.png', repeat: 3 };
const TIMBER = { kind: 'trim', band: 'timber', repeat: 1 };
const IRON = { kind: 'trim', band: 'iron', repeat: 1 };

/** A slate block: a faceted, roughened low-sided prism. */
function slab(rx, h, rz, sides, seed, amount = 0.8) {
  const geo = new THREE.CylinderGeometry(1, 1.08, h, sides, 1);
  geo.scale(rx, 1, rz);
  return faceted(roughen(geo, amount, seed, 0.25));
}

/** Tilted stack of slate blocks with a turf cap; 57 × 94 × 57 m, landing at y = 91. */
export function cragColumn(lod = 0) {
  const r = 14,
    h = 90,
    tilt = 0.08;
  const g = model('structure.mountains.cragColumn', [r * 2.6, h + 4, r * 2.6], 'mountains');
  const rnd = rand(36);
  const sides = lod ? 6 : 9;
  // Three main blocks, as the stand-in stacks them, each split into two courses.
  for (let i = 0; i < 3; i++) {
    const x = i * tilt * h * 0.3,
      y = (h / 3) * (2 - i) + h / 6,
      rTop = r * (0.75 + i * 0.1),
      rBot = r * (1.1 + i * 0.15);
    const block = new THREE.Group();
    block.name = `Block${i}`;
    block.position.set(x, y, 0);
    block.rotation.set(0, i * 0.4, tilt);
    g.add(block);
    const courses = lod ? 1 : 2;
    for (let c = 0; c < courses; c++) {
      const ch = h / 3 / courses;
      const t0 = c / courses,
        t1 = (c + 1) / courses;
      const geo = new THREE.CylinderGeometry(rTop + (rBot - rTop) * (1 - t1), rTop + (rBot - rTop) * (1 - t0), ch, sides, 1);
      geo.rotateY(c * 0.35);
      piece(block, faceted(roughen(geo, 1.1, 10 + i * 3 + c, 0.22)), ROCK, { name: `Course${i}.${c}`, position: [0, -h / 6 + ch * (c + 0.5), 0] });
    }
    // Ledge slabs jut from the joints: the wall-kick rests and the strata read.
    if (lod === 0)
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + i * 0.7;
        const len = rBot * (0.5 + rnd() * 0.4);
        piece(block, slab(len * 0.5, 2.2, 3.5, 5, 40 + i * 5 + k, 0.5), ROCK_FINE, { name: `Ledge${i}.${k}`, position: [Math.cos(a) * rBot * 0.9, -h / 6 + 3 + rnd() * (h / 3 - 6), Math.sin(a) * rBot * 0.9], rotation: [0, -a, (rnd() - 0.5) * 0.2], detail: true });
      }
  }
  // Turf cap on the top block, its surface at y = 91 with a thin soil edge under it.
  piece(g, faceted(roughen(new THREE.CylinderGeometry(r * 0.72, r * 0.8, 1.6, sides, 1), 0.3, 77, 0.4)), TURF, { name: 'Cap', position: [0, h + 0.2, 0] });
  piece(g, new THREE.CylinderGeometry(r * 0.8, r * 0.86, 0.9, sides, 1), { color: '#5a4a3a' }, { name: 'CapSoil', position: [0, h - 0.6, 0], detail: true });
  landing(g, h + 1, r * 0.55, r * 0.55, 0, 0, 'top');
  // A cairn and a bent iron survey pin mark the top; off the landing's centre.
  if (lod === 0) {
    for (let k = 0; k < 3; k++) piece(g, faceted(new THREE.DodecahedronGeometry(1.1 - k * 0.2, 0)), ROCK_FINE, { name: `Cairn${k}`, position: [r * 0.62, h + 1.4 + k * 1.1, -r * 0.2], rotation: [k * 0.4, k * 0.9, 0], detail: true });
    piece(g, new THREE.CylinderGeometry(0.12, 0.12, 2.4, 5), IRON, { name: 'Pin', position: [-r * 0.6, h + 1.9, r * 0.25], rotation: [0.2, 0, 0.15], detail: true });
  }
  // Scree skirt: boulders around the foot bring the footprint to 57 m.
  const boulders = lod ? 4 : 9;
  for (let k = 0; k < boulders; k++) {
    const a = (k / boulders) * Math.PI * 2 + rnd() * 0.4;
    const dist = r * (1.3 + rnd() * 0.3),
      s = 2.5 + rnd() * 3.5;
    piece(g, faceted(roughen(new THREE.IcosahedronGeometry(s, 1), 0.5, 90 + k, 0.5)), ROCK, { name: `Scree${k}`, position: [Math.cos(a) * dist, s * 0.95, Math.sin(a) * dist], rotation: [rnd(), rnd() * 3, rnd()], detail: k % 2 === 1 });
  }
  // Two low outcrops fix the overall 57 m envelope on X and Z.
  piece(g, slab(3, 5, 3, 6, 5, 0.4), ROCK, { name: 'OutcropX', position: [r * 1.75, 2.8, 0] });
  piece(g, slab(3, 5, 3, 6, 6, 0.4), ROCK, { name: 'OutcropZ', position: [0, 2.8, -r * 1.75] });
  return g;
}

/** Turf-topped rock shelf that bolts onto a cliff face; 52 × 9 × 19 m, landing at y = 0.5.
 * The shelf hangs below its top (y from -8.5 to 0.5); the back face is at z = -9.5. */
export function ledgeShelf(lod = 0) {
  const w = 50,
    d = 18,
    thick = 7;
  const g = model('structure.mountains.ledgeShelf', [w + 2, thick + 1, d + 1], 'mountains');
  const rnd = rand(37);
  // The slab: a faceted box with a battered front and roughened faces.
  const body = new THREE.BoxGeometry(w, thick, d, lod ? 4 : 8, 2, lod ? 2 : 4);
  const p = body.attributes.position;
  for (let i = 0; i < p.count; i++) {
    // Undercut: the front lip overhangs, the base tucks back toward the cliff.
    const y = p.getY(i),
      z = p.getZ(i);
    if (z > 0) p.setZ(i, z + ((y + thick / 2) / thick) * 1.6 - 0.8);
  }
  piece(g, faceted(roughen(body, 0.45, 21, 0.3)), ROCK, { name: 'Shelf', position: [0, -thick / 2 + 0.2, 0] });
  // Turf on top, worn to soil along the front lip.
  piece(g, new THREE.BoxGeometry(w * 0.92, 0.5, d * 0.88), TURF, { name: 'Turf', position: [0, 0.25, -0.6] });
  piece(g, new THREE.BoxGeometry(w * 0.9, 0.3, 2.2), { color: '#5a4a3a' }, { name: 'LipSoil', position: [0, 0.15, d / 2 - 1.5], detail: true });
  landing(g, 0.5, w / 2, d / 2, 0, 0, 'shelf');
  // Rock chunks along the front lip and a couple of larger blocks at the ends bring the width to 52 m.
  const chunks = lod ? 3 : 7;
  for (let k = 0; k < chunks; k++) {
    const x = (k / (chunks - 1) - 0.5) * w * 0.9,
      s = 0.7 + rnd() * 0.8;
    piece(g, faceted(roughen(new THREE.IcosahedronGeometry(s, 1), 0.35, 50 + k, 0.7)), ROCK, { name: `Chunk${k}`, position: [x, s * 0.35, d / 2 - 2 - rnd() * 2], rotation: [rnd(), rnd() * 3, 0], detail: k % 2 === 1 });
  }
  for (const s of [-1, 1]) piece(g, faceted(roughen(new THREE.BoxGeometry(3.5, 4.5, 6), 0.3, s > 0 ? 3 : 4, 0.6)), ROCK, { name: `End${s > 0 ? 'R' : 'L'}`, position: [s * (w / 2 - 0.55), -3.2, -2] });
  // Bolt-on ironwork: two timber struts braced against the cliff under the shelf, with iron plates.
  for (const s of [-1, 1]) {
    piece(g, new THREE.BoxGeometry(0.7, 0.7, thick * 1.05), TIMBER, { name: `Strut${s > 0 ? 'R' : 'L'}`, position: [s * w * 0.3, -thick + 2.6, -d / 2 + 3.6], rotation: [-0.55, 0, 0] });
    piece(g, new THREE.BoxGeometry(2.4, 2.4, 0.3), IRON, { name: `Plate${s > 0 ? 'R' : 'L'}`, position: [s * w * 0.3, -thick + 1.6, -d / 2 + 0.2], detail: true });
    if (lod === 0) for (let k = 0; k < 4; k++) piece(g, new THREE.CylinderGeometry(0.16, 0.16, 0.5, 5), IRON, { name: `Bolt${s > 0 ? 'R' : 'L'}${k}`, position: [s * w * 0.3 + (k % 2 ? 0.8 : -0.8), -thick + 1.6 + (k < 2 ? 0.8 : -0.8), -d / 2 + 0.5], rotation: [Math.PI / 2, 0, 0], detail: true });
  }
  // Back plate: the slab reads as bolted to a cliff, so a rough rock face is behind it.
  piece(g, faceted(roughen(new THREE.BoxGeometry(w * 0.7, thick * 0.7, 1.0), 0.3, 8, 0.4)), ROCK_FINE, { name: 'Anchor', position: [0, -thick * 0.5, -d / 2 - 0.2] });
  return g;
}

export const mountainsBuilders = {
  'structure.mountains.cragColumn': cragColumn,
  'structure.mountains.ledgeShelf': ledgeShelf,
};
