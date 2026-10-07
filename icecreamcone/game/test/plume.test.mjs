import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/plume.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const medals = BIRDS.find((b) => b.id === 'plume').medals;
const steer = (game, p) => {
  const d = p.x - game.x;
  return { x: Math.max(-1, Math.min(1, d / 40)), action: Math.abs(d) < 30 };
};
const ok = (p) => p.soggy <= 0 && p.bloomT <= 0 && p.soak < 0.85;

// A gardener: waters the tallest Plume until it blooms or starts to sweat,
// then moves on to the next tallest. `skill` slows its hand and sometimes
// sends it to a Plume at random.
function gardener(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let target = null;
  return (game) => {
    if (!target || !ok(target)) {
      const cands = game.plants.filter(ok).sort((a, b) => b.growth - a.growth);
      target = (rnd() < skill ? cands[0] : cands[Math.floor(rnd() * cands.length)]) || null;
    }
    if (!target) return {};
    const o = steer(game, target);
    return { ...o, x: o.x * (0.4 + 0.6 * skill) };
  };
}

// Holding the water on and sweeping back and forth along the bench.
const sweeper = () => {
  let d = 1;
  return (game) => {
    if (game.x > 1450) d = -1;
    if (game.x < 150) d = 1;
    return { x: d, action: true };
  };
};

test('plume: a beginner earns bronze, a good gardener more; sweeping and idling do not pay', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: gardener(0.3, seed) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: gardener(1, seed) }).game.score);
  const sweep = [1, 2].map((seed) => run(create, { seed, bot: sweeper() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('plume beginner', beginner, 'good', good, 'sweep', sweep, 'idle', idle, 'medals', medals);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= medals[0], `beginner ${beginner}`);
  assert.ok(Math.min(...good) > Math.max(...beginner) - 1, `good ${good}`);
  assert.ok(Math.max(...sweep) < Math.min(...good), `sweep ${sweep}`);
});

test('plume: watering one Plume too long makes it soggy', () => {
  const game = create(env(1));
  const p = game.plants[2]; // the rose starts above the middle one
  for (let i = 0; i < 60 * 8 && !game.soggies; i++) {
    p.growth = 0.3; // keep it from blooming, to test the soak alone
    game.update(1 / 60, blank({ action: true }));
  }
  assert.equal(game.soggies, 1);
  assert.ok(p.soggy > 0);
});

test('plume: a dry Plume wilts and loses its growth', () => {
  const game = create(env(1));
  const p = game.plants[0];
  p.growth = 0.7;
  p.dry = 1;
  for (let i = 0; i < 120; i++) game.update(1 / 60, blank());
  assert.ok(p.growth < 0.7, `growth ${p.growth}`);
  assert.ok(p.wilt > 0.5);
});
