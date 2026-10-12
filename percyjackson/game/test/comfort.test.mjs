// Checks for play-comfort helpers, run against stub worlds:
//   - objective props and banners stand on the floor, not on a tree canopy
//     or a prop over it (js/objectives/common.js ground / openGround / roomSpot),
//   - boss health counts an AI companion for less than a player
//     (js/entities/bosses.js partyHpScale).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// common.js imports Three.js (from a CDN in the browser): a tiny Vector3 stands in.
const V3 = `class Vector3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vector3(this.x, this.y, this.z); } setY(y) { this.y = y; return this; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } copy(v) { return this.set(v.x, v.y, v.z); } }
const THREE = { Vector3 };`;
const common = readFileSync(resolve(GAME, 'js/objectives/common.js'), 'utf8')
  .replace(/import \* as THREE from '[^']+';/, V3)
  .replace(/import \{ mulberry32 \} from '[^']+';/, 'const mulberry32 = () => Math.random;');
const { ground, openGround, roomSpot } = await import('data:text/javascript,' + encodeURIComponent(common));
const { Vector3 } = new Function(`${V3}; return THREE;`)();

// floor top at y = 10 everywhere (solid below 10); extra solid cells "x,y,z"
function world(cells = []) {
  const s = new Set(cells);
  const solid = (x, y, z) => Math.floor(y) < 10 || s.has(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`);
  return {
    solidAt: solid,
    groundBelow(x, z, fromY) { for (let y = Math.floor(fromY); y >= 0; y--) if (solid(x, y + 0.5, z)) return y + 1; return -Infinity; },
  };
}
// a pine at (5, 5): trunk from 10 to 13, canopy (leaves) at 12..14 round it
const pine = [];
for (let y = 10; y <= 13; y++) pine.push(`5,${y},5`);
for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) for (let y = 12; y <= 13; y++) pine.push(`${5 + dx},${y},${5 + dz}`);

test('ground() searches from the feet, so a canopy overhead never takes the spot', () => {
  const g = { world: world(pine) };
  const p = ground(g, new Vector3(6.5, 10, 5.5));   // under the canopy, next to the trunk
  assert.equal(p.y, 10);
  // with the old search (3 blocks up) it landed on the leaves
  assert.equal(g.world.groundBelow(6.5, 5.5, 13), 14);
  // a one-block step is still found
  const step = { world: world(['8,10,8']) };
  assert.equal(ground(step, new Vector3(8.5, 10, 8.5)).y, 11);
});

test('openGround() refuses a trunk, a canopy and a deep drop', () => {
  const w = world(pine);
  assert.equal(openGround(w, 5.5, 10, 5.5), null);        // inside the trunk
  assert.equal(openGround(w, 6.5, 10, 5.5), 10);          // under the branches
  assert.equal(openGround(w, 8.5, 14, 8.5), null);        // floor expected at 14: the ground is 4 below
  assert.equal(openGround(world(['3,10,3', '3,11,3']), 3.5, 10, 3.5), null);   // a wall two high
  assert.equal(openGround(world(['2,10,2']), 2.5, 10, 2.5), 11);   // a step up is fine
});

test('roomSpot() skips spawn points a tree was planted on', () => {
  const g = { world: world(pine) };
  const room = { y: 10, center: new Vector3(8, 10, 8), spawns: [[5.5, 10, 5.5], [5.5, 14, 6.5], [9.5, 10, 9.5]] };
  for (let i = 0; i < 6; i++) {
    const r = () => i / 6;
    const p = roomSpot(g, room, r);
    assert.ok(Math.abs(p.y - 10) <= 1.5, `spot at ${p.x},${p.y},${p.z}`);
    assert.ok(!(p.x === 5.5 && p.z === 5.5), 'not in the trunk');
  }
  // farthest from `avoid`, among good spots
  const far = roomSpot(g, room, () => 0, new Vector3(9.5, 10, 9.5));
  assert.equal(far.y, 10);
});

test('boss health: an AI companion counts for 35%, a player for 60%', () => {
  const code = readFileSync(resolve(GAME, 'js/entities/bosses.js'), 'utf8');
  const fn = code.match(/export function partyHpScale[\s\S]*?\n\}/)[0].replace('export ', '');
  const partyHpScale = new Function(`${fn}; return partyHpScale;`)();
  const P = (h, a) => [...Array(h).fill({ ai: false }), ...Array(a).fill({ ai: true })];
  assert.equal(partyHpScale(P(1, 0)), 1);
  assert.ok(Math.abs(partyHpScale(P(1, 2)) - 1.7) < 1e-9);
  assert.ok(Math.abs(partyHpScale(P(2, 1)) - 1.95) < 1e-9);
  assert.ok(Math.abs(partyHpScale(P(4, 0)) - 2.8) < 1e-9);
  // the Mortal Minotaur for one player and two companions: 2200 * 1.7
  assert.equal(Math.round(2200 * partyHpScale(P(1, 2))), 3740);
});

