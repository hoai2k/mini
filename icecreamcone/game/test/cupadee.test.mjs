import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/cupadee.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const medals = BIRDS.find((b) => b.id === 'cupadee').medals;

// A pourer that watches the cup and the tea still falling, and lets go when
// the whole lot will reach the line. `err` is how far off its judgement is
// (in cup-fulls, a different miss for each cup), like a person's.
function pourer(err = 0, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const miss = new Map();
  return (game) => {
    const b = game.birds.find((b) => b.state === 'serve');
    if (!b) return { action: false };
    if (b.motion === 'stroll' && Math.abs(b.x - game.streamX) > (b.size / 400) * 84 - 18) return { action: false };
    if (!miss.has(b)) miss.set(b, (rnd() * 2 - 1) * err);
    const falling = game.parcels.reduce((s, p) => s + p.vol, 0) / b.cap;
    return { action: b.fill + falling + 0.03 / b.cap < b.line + miss.get(b) };
  };
}

test('cupadee: a decent pourer earns bronze, a sharp one gold; idle earns nothing', () => {
  const decent = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: pourer(0.14, seed) }).game.score);
  const sharp = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: pourer(0.04, seed) }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('cupadee decent', decent, 'sharp', sharp, 'idle', idle, 'medals', medals);
  assert.equal(idle, 0);
  assert.ok(Math.min(...decent) >= medals[0], `decent ${decent}`);
  assert.ok(Math.max(...sharp) >= medals[2], `sharp ${sharp}`);
});

test('cupadee: holding on too long spills the cup and breaks the combo', () => {
  const game = create(env(1));
  game.streak = 3;
  for (let i = 0; i < 60 * 12 && !game.spills; i++) game.update(1 / 60, blank({ action: true }));
  assert.equal(game.spills, 1);
  assert.equal(game.streak, 0);
  assert.equal(game.score, 0);
});

test('cupadee: a fill right on the line is Perfect', () => {
  const game = create(env(1));
  let t = 0;
  while (!game.birds.some((b) => b.state === 'serve') && t < 5) {
    game.update(1 / 60, blank());
    t += 1 / 60;
  }
  const b = game.birds.find((b) => b.state === 'serve');
  b.fill = b.line;
  for (let i = 0; i < 40; i++) game.update(1 / 60, blank());
  assert.equal(game.perfects, 1);
  assert.equal(game.score, 100);
  assert.ok(Number.isInteger(game.score));
});
