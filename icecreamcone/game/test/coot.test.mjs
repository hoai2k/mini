import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/coot.js';
import { BIRDS } from '../src/birds.js';
import { run } from './harness.mjs';

const medals = BIRDS.find((b) => b.id === 'coot').medals;

// A good player: run under the lowest good scoop, and lean against the stack.
function chaser(game) {
  const top = { x: game.x - 86 };
  const good = game.items.filter((i) => i.kind !== 'pickle' && i.kind !== 'sock').sort((a, b) => b.y - a.y)[0];
  const bad = game.items.filter((i) => (i.kind === 'pickle' || i.kind === 'sock') && i.y > 300).sort((a, b) => b.y - a.y)[0];
  let target = good ? good.x : top.x;
  if (bad && Math.abs(bad.x - top.x) < 90) target = top.x + (bad.x > top.x ? -200 : 200);
  const d = target - top.x;
  return { x: Math.max(-1, Math.min(1, d / 60)) };
}

test('coot: a careful chaser earns at least bronze; idle earns nothing', () => {
  const scores = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: chaser }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  assert.ok(idle < medals[0], `idle ${idle}`);
  assert.ok(Math.max(...scores) >= medals[0], `chaser best ${scores}`);
  console.log('coot chaser scores', scores, 'medals', medals);
});

test('coot: an off-centre stack topples', () => {
  const game = create({ W: 1600, H: 900, rng: () => 0.5, sfx: () => {} });
  for (let i = 0; i < 6; i++) game.stack.push({ dx: 30, color: '#fff', kind: 'scoop', count: 1 });
  game.update(1 / 60, { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, left: false, right: false, spin: 0, pointer: { active: false } });
  assert.equal(game.stack.length, 0);
});
