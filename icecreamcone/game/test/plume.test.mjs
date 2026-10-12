import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/plume.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'plume').pass;
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

test('plume: a beginner opens the next page, a good gardener more; sweeping and idling do not pay', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: gardener(0.3, seed) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: gardener(1, seed) }).game.score);
  const sweep = [1, 2].map((seed) => run(create, { seed, bot: sweeper() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('plume beginner4', beginner, 'good', good, 'sweep', sweep, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(Math.min(...good) > Math.max(...beginner) - 1, `good ${good}`);
  assert.ok(Math.max(...sweep) < Math.min(...good), `sweep ${sweep}`);
  assert.ok(Math.max(...sweep) < pass, `sweeping must not open the next page: ${sweep}`);
});

test('plume: a beginner passes about half the time or more; mashing does not', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const beginner = seeds.map((seed) => run(create, { seed, bot: gardener(0.15, seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: gardener(1, seed) }).game.score);
  const mash = seeds.map((seed) => {
    let r = seed * 31;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    let d = 0;
    return run(create, { seed, bot: () => {
      if (rnd() < 0.03) d = rnd() * 2 - 1;
      return { x: d, action: rnd() < 0.5 };
    } }).game.score;
  });
  console.log('plume beginner', `${beginner}`, 'good', `${good}`, 'mash', `${mash}`, 'pass', pass);
  assert.ok(beginner.filter((s) => s >= pass).length >= seeds.length / 2, `beginner ${beginner}`);
  assert.ok(Math.max(...mash) < pass, `mashing ${mash}`);
});

test('plume: the pots dry slowly at first and fast at the end', () => {
  const game = create(env(1));
  const dryness = () => game.plants.reduce((s, p) => s + p.dry, 0);
  let d0 = dryness();
  for (let i = 0; i < 120; i++) game.update(1 / 60, blank());
  const early = dryness() - d0;
  while (game.elapsed < 42) game.update(1 / 60, blank());
  for (const p of game.plants) p.dry = 0;
  d0 = dryness();
  for (let i = 0; i < 120; i++) game.update(1 / 60, blank());
  const late = dryness() - d0;
  assert.ok(late > early * 3, `two seconds' drying: ${early} early vs ${late} late`);
  assert.ok(game.dryRate() > 4 * 0.06);
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
