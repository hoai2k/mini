// Checks for the character physics (js/physics.js), run against a tiny stub
// world: heroes slide round pillar corners instead of snagging, walls still
// stop them, a 1-block ledge is stepped up, and a position with no ground
// under it (y = -Infinity) returns instead of looping forever.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// physics.js imports the block table (which pulls in textures and Three.js);
// swap that import for a stub where block 1 is solid.
const code = readFileSync(resolve(GAME, 'js/physics.js'), 'utf8')
  .replace(/import \{ BLOCKS \} from '[^']+';/, 'const BLOCKS = [null, { solid: true }];');
const { moveEntity, platformAt } = await import('data:text/javascript,' + encodeURIComponent(code));

// floor at y = 0 everywhere; extra solid cells from a set "x,y,z"
function world(cells = []) {
  const s = new Set(cells);
  return { get: (x, y, z) => (y === 0 || s.has(`${x},${y},${z}`) ? 1 : 0), liquidAt: () => null };
}
const pillar = (x, z, h = 3) => Array.from({ length: h }, (_, i) => `${x},${i + 1},${z}`);
function walk(w, e, vx, vz, secs = 2) {
  for (let t = 0; t < secs; t += 1 / 60) { e.vel.x = vx; e.vel.z = vz; moveEntity(e, w, 1 / 60); }
  return e;
}
const body = (x, z, o = {}) => ({ pos: { x, y: 1, z }, vel: { x: 0, y: 0, z: 0 }, radius: 0.32, height: 1.8, grounded: true, ...o });

test('a hero slides round the corner of a pillar', () => {
  const w = world(pillar(5, 0));
  const hero = walk(w, body(3.5, 0.95, { cornerSlide: true }), 5, 0);
  assert.ok(hero.pos.x > 6.5, `hero should get past the pillar, stopped at x=${hero.pos.x.toFixed(2)}`);
  const enemy = walk(w, body(3.5, 0.95), 5, 0);
  assert.ok(enemy.pos.x < 5, 'without cornerSlide the pillar still stops a body');
});

test('a hero walking square into a wall still stops', () => {
  const w = world([...pillar(5, -1), ...pillar(5, 0), ...pillar(5, 1), ...pillar(5, 2)]);
  const hero = walk(w, body(3.5, 0.5, { cornerSlide: true }), 5, 0);
  assert.ok(hero.pos.x < 5 && Math.abs(hero.pos.z - 0.5) < 0.05, `hero at ${hero.pos.x.toFixed(2)}, ${hero.pos.z.toFixed(2)}`);
});

test('a one-block ledge is stepped up, a two-block one is not', () => {
  const step = [];
  for (let z = -3; z <= 3; z++) for (let x = 5; x <= 9; x++) step.push(`${x},1,${z}`);
  const up = walk(world(step), body(3.5, 0.5), 5, 0, 0.6);
  assert.equal(up.pos.y, 2);
  const wall = [];
  for (let z = -3; z <= 3; z++) for (let x = 5; x <= 9; x++) wall.push(`${x},1,${z}`, `${x},2,${z}`);
  const blocked = walk(world(wall), body(3.5, 0.5), 5, 0);
  assert.ok(blocked.pos.x < 5 && blocked.pos.y === 1);
});

test('no ground under a body (y = -Infinity) does not hang', () => {
  const e = body(3.5, 0.5); e.pos.y = -Infinity;
  moveEntity(e, world(), 1 / 60);
  assert.equal(e.pos.y, -Infinity);
});

test('a hero lands on a floating boat deck and rides it', async () => {

  const world = { get: () => 0, liquidAt: () => null, platforms: [{ x: 10, z: 10, rot: 0.4, hx: 1.55, hz: 0.42, top: 5, vel: 0, load: 0 }] };
  const b = world.platforms[0];
  // along the boat (rotated) is on deck; off its side is not
  const along = { x: 10 + Math.cos(0.4) * 1.2, z: 10 - Math.sin(0.4) * 1.2 };
  assert.equal(platformAt(world, along.x, along.z, 0.3), b);
  assert.equal(platformAt(world, 10 + Math.sin(0.4) * 1.5, 10 + Math.cos(0.4) * 1.5, 0.3), null);
  const e = { pos: { x: 10, y: 6, z: 10 }, vel: { x: 0, y: 0, z: 0 }, radius: 0.35, height: 1.8, grounded: false };
  for (let i = 0; i < 60; i++) moveEntity(e, world, 1 / 60);
  assert.equal(e.grounded, true);
  assert.ok(Math.abs(e.pos.y - 5) < 1e-6, 'stands on the deck');
  assert.equal(e.platform, b);
  assert.ok(b.vel < 0, 'the boat dips when the hero lands');
  b.top = 4.9; moveEntity(e, world, 1 / 60);
  assert.ok(Math.abs(e.pos.y - 4.9) < 1e-6, 'rides the deck down as it bobs');
});
