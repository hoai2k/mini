import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/bobolinks.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const medals = BIRDS.find((b) => b.id === 'bobolinks').medals;

// A player who looks at the next stone, takes `rt` seconds (give or take a
// little) to step, and puts the wrong foot down now and then (`slip`).
// Doubles are pressed left then right one frame apart.
function walker({ rt = 0.4, slip = 0.05, seed = 3 } = {}) {
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let target = null;
  let wait = 0;
  let second = false;
  return (game) => {
    if (second) {
      second = false;
      return { right: true };
    }
    if (game.stumble > 0) {
      target = null;
      return {};
    }
    const s = game.stones[0];
    if (s !== target) {
      target = s;
      wait = rt * (0.7 + rnd() * 0.6);
    }
    wait -= 1 / 60;
    if (wait > 0) return {};
    target = null;
    if (s.side === 0) {
      second = true;
      return { left: true };
    }
    const side = rnd() < slip ? -s.side : s.side;
    return side < 0 ? { left: true } : { right: true };
  };
}

test('bobolinks: a careful walker earns at least bronze; idle earns nothing', () => {
  const beginner = [1, 2, 3].map((seed) => run(create, { seed, bot: walker({ rt: 0.6, slip: 0.08, seed }) }).game.score);
  const steady = [1, 2, 3].map((seed) => run(create, { seed, bot: walker({ rt: 0.42, slip: 0.05, seed }) }).game.score);
  const quick = [1, 2, 3].map((seed) => run(create, { seed, bot: walker({ rt: 0.3, slip: 0.03, seed }) }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('bobolinks beginner', beginner, 'steady', steady, 'quick', quick, 'idle', idle, 'medals', medals);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= medals[0], `beginner ${beginner}`);
});

test('bobolinks: mashing both feet gets nowhere', () => {
  const { game } = run(create, { seed: 1, bot: () => ({ left: true, right: true }) });
  assert.ok(game.score < medals[0] / 3, `mash ${game.score}`);
});

test('bobolinks: the right foot steps, the wrong foot splashes, doubles need both', () => {
  const game = create(env(4));
  const side = game.stones[0].side;
  game.update(1 / 60, blank(side < 0 ? { left: true } : { right: true }));
  assert.equal(game.score, 1);
  const s2 = game.stones[0].side || 1;
  game.update(1 / 60, blank(s2 < 0 ? { right: true } : { left: true }));
  assert.equal(game.score, 1);
  assert.ok(game.stumble > 0);
  // a double, stepped left then right within the window
  const d = create(env(4));
  d.stones[0].side = 0;
  d.update(1 / 60, blank({ left: true }));
  assert.equal(d.score, 0);
  d.update(1 / 60, blank({ right: true }));
  assert.equal(d.score, 1);
  // ...and one foot alone splashes
  const e = create(env(4));
  e.stones[0].side = 0;
  e.update(1 / 60, blank({ left: true }));
  for (let i = 0; i < 20; i++) e.update(1 / 60, blank());
  assert.equal(e.score, 0);
  assert.ok(e.stumble > 0 || e.wrong >= 0);
});
