/** Sunseed Fields: code-built terrace step (M-024) and windbreak row (M-027).
 * Sizes and landings follow the stand-ins in hopper/3d/standins/src/structures.js
 * (the game derives its colliders from those), painted with the fields trim
 * sheet bands and terrain set. Reference: design/references/kits/fields.png.
 */
import * as THREE from 'three';
import { faceted, landing, lathe, model, piece, rand, roughen } from './lib.mjs';

const GRASS = { kind: 'terrain', file: 'ground.png', repeat: 3 };
const SOIL = { kind: 'terrain', file: 'path.png', repeat: 2 };
const STONE = { kind: 'trim', band: 'concrete', repeat: 2 };
const TIMBER = { kind: 'trim', band: 'timber', repeat: 1 };
const BARK = { color: '#6b4a2c' };
const LEAF = { kind: 'terrain', file: 'ground.png', repeat: 2 };
const LEAF_DEEP = { color: '#3f6b33' };

/** Three planted tiers, one hop apart, with irrigation lips and stone risers.
 * Tier tops at y = 6.6, 12.6, 18.6 (stand-in landings); 62 × 19 × 41 m. */
export function terraceStep(lod = 0) {
  const w = 60,
    d = 40,
    h = 6,
    tiers = 3;
  const g = model('structure.fields.terraceStep', [w, h * tiers + 1, d], 'fields');
  const r = rand(24);
  for (let i = 0; i < tiers; i++) {
    const tw = w - i * (w / tiers) * 0.6,
      td = d - i * (d / tiers) * 0.4,
      y0 = h * i,
      top = h * (i + 1) + 0.6;
    // Earth body, slightly battered (wider at the foot).
    const body = new THREE.CylinderGeometry(1, 1.06, h, 4, 1);
    body.rotateY(Math.PI / 4);
    body.scale(tw / Math.SQRT2, 1, td / Math.SQRT2);
    piece(g, faceted(body), SOIL, { name: `Tier${i}`, position: [0, y0 + h / 2, 0] });
    // Stone riser band along the front and sides.
    piece(g, new THREE.BoxGeometry(tw + 0.4, 1.4, td + 0.4), STONE, { name: `Riser${i}`, position: [0, y0 + 0.7, 0] });
    // Planted top: a grass slab with a raised soil bed and crop rows.
    piece(g, new THREE.BoxGeometry(tw, 0.6, td), GRASS, { name: `Top${i}`, position: [0, top - 0.3, 0] });
    piece(g, new THREE.BoxGeometry(tw - 6, 0.5, td - 8), SOIL, { name: `Bed${i}`, position: [0, top + 0.2, 0] });
    if (lod === 0) {
      const rows = Math.max(3, Math.floor((td - 10) / 3.2));
      for (let k = 0; k < rows; k++) {
        const z = (k - (rows - 1) / 2) * 3.2;
        piece(g, new THREE.BoxGeometry(tw - 9, 0.7, 1.1), LEAF_DEEP, { name: `Crop${i}.${k}`, position: [0, top + 0.75, z], detail: true });
      }
    }
    // Irrigation lip: a stone channel along the front edge with two outlets.
    piece(g, new THREE.BoxGeometry(tw - 2, 0.8, 1.6), STONE, { name: `Lip${i}`, position: [0, top + 0.3, td / 2 - 1.2] });
    for (const s of [-1, 1]) piece(g, new THREE.CylinderGeometry(0.5, 0.5, 1.6, lod ? 5 : 7), STONE, { name: `Outlet${i}.${s > 0 ? 'R' : 'L'}`, position: [s * (tw * 0.3), top - 0.6, td / 2 + 0.3], rotation: [Math.PI / 2, 0, 0], detail: true });
    // Wooden stakes and a rail on the back edge.
    if (i < tiers - 1) {
      if (lod === 0)
        for (let k = 0; k < 4; k++) {
          const x = (k - 1.5) * (tw / 4);
          piece(g, new THREE.BoxGeometry(0.5, 2.4, 0.5), TIMBER, { name: `Stake${i}.${k}`, position: [x, top + 1.2, -td / 2 + 1.2], detail: true });
        }
      piece(g, new THREE.BoxGeometry(tw - 2, 0.35, 0.35), TIMBER, { name: `Rail${i}`, position: [0, top + 2.1, -td / 2 + 1.2], detail: true });
    }
    landing(g, top, tw / 2, td / 2, 0, 0, `tier${i}`);
    // A few boulders at the riser feet break the straight line.
    if (lod === 0)
      for (let k = 0; k < 3; k++) {
        const x = (r() - 0.5) * tw * 0.9,
          s = 0.8 + r() * 1.1;
        piece(g, roughen(new THREE.IcosahedronGeometry(s, 1), 0.3, 3 + k + i * 7), STONE, { name: `Boulder${i}.${k}`, position: [x, y0 + s * 0.6, td / 2 - s * 0.2], detail: true });
      }
  }
  // Side steps up the left edge join the tiers for anyone on foot.
  for (let i = 0; i < tiers - 1; i++)
    for (let k = 0; k < 3; k++) {
      const tw = w - i * (w / tiers) * 0.6;
      piece(g, new THREE.BoxGeometry(4, 2, 3), STONE, { name: `Step${i}.${k}`, position: [-tw / 2 + 2 - k * 1.2, h * (i + 1) + 1 + k * 2, 0], detail: k > 0 });
    }
  return g;
}

/** Six poplars in a line, 52 × 24 × 6 m. Not a landing; trunks at x = ±22.5, ±13.5, ±4.5. */
export function windbreak(lod = 0) {
  const count = 6,
    spacing = 9,
    height = 24;
  const g = model('structure.fields.windbreak', [spacing * count - 2, height, 6], 'fields');
  const r = rand(27);
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * spacing;
    const hh = height * (0.9 + r() * 0.1);
    const tree = new THREE.Group();
    tree.name = `Tree${i}`;
    tree.position.set(x, 0, 0);
    tree.rotation.y = r() * Math.PI * 2;
    g.add(tree);
    // Trunk with a flared root and a slight lean.
    const trunk = lathe(
      [
        [1.1, 0],
        [0.75, 0.8],
        [0.55, hh * 0.3],
        [0.4, hh * 0.6],
        [0.25, hh * 0.85],
        [0.08, hh * 0.98],
        [0, hh],
      ],
      lod ? 5 : 7,
    );
    piece(tree, trunk, BARK, { name: `Trunk${i}`, rotation: [0, 0, (r() - 0.5) * 0.05] });
    // Columnar canopy: three stacked layered tiers, widest a third of the way up.
    const layers = lod ? 3 : 5;
    for (let k = 0; k < layers; k++) {
      const t = (k + 0.5) / layers;
      const y0 = hh * (0.2 + t * 0.78);
      const rad = 1.7 * Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.15)) + 0.4;
      const geo = roughen(new THREE.ConeGeometry(rad, hh * (0.62 / layers) * 1.9, lod ? 6 : 8, 1), 0.35, 11 + k + i * 5, 0.9);
      piece(tree, geo, k % 2 ? LEAF_DEEP : LEAF, { name: `Canopy${i}.${k}`, position: [0, y0, 0], rotation: [0, k * 0.5, 0] });
    }
    // Three short boughs poke out of the lower canopy.
    if (lod === 0)
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + r();
        piece(tree, new THREE.CylinderGeometry(0.12, 0.25, 3.2, 5), BARK, { name: `Bough${i}.${k}`, position: [Math.cos(a) * 1.1, hh * 0.32 + k * 0.6, Math.sin(a) * 1.1], rotation: [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1], detail: true });
      }
  }
  // A low grass verge ties the row to the ground, and the line of stakes it was planted along.
  piece(g, new THREE.BoxGeometry(spacing * count - 2, 0.4, 5.4), GRASS, { name: 'Verge', position: [0, 0.2, 0] });
  if (lod === 0)
    for (let i = 0; i < count - 1; i++) {
      const x = (i - (count - 2) / 2) * spacing;
      piece(g, new THREE.BoxGeometry(0.35, 1.6, 0.35), TIMBER, { name: `Post${i}`, position: [x, 1, 2.4], detail: true });
    }
  return g;
}

export const fieldsBuilders = {
  'structure.fields.terraceStep': terraceStep,
  'structure.fields.windbreak': windbreak,
};
