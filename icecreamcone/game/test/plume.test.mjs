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

// A beginner: waters the tallest Plume until it blooms or starts to sweat,
// then moves on to the next tallest.
function focus() {
  let target = null;
  return (game) => {
    if (!target || !ok(target)) target = game.plants.filter(ok).sort((a, b) => b.growth - a.growth)[0] || null;
    return target ? steer(game, target) : {};
  };
}

// A gardener: finishes Plumes close to bloom, and otherwise goes round
// giving a sip to any that are drying out, so they keep growing by themselves.
function juggler(finishAt = 0.8, sipAt = 0.3) {
  let target = null;
  let sipping = false;
  return (game) => {
    if (target && (!ok(target) || (sipping && target.dry < 0.02 && target.growth < finishAt))) target = null;
    if (!target) {
      const cands = game.plants.filter(ok);
      const fin = cands.filter((p) => p.growth >= finishAt).sort((a, b) => b.growth - a.growth)[0];
      const sip = cands.filter((p) => p.dry > sipAt).sort((a, b) => Math.abs(a.x - game.x) - Math.abs(b.x - game.x))[0];
      target = fin || sip || cands.sort((a, b) => b.growth - a.growth)[0] || null;
      sipping = !fin && !!sip;
    }
    return target ? steer(game, target) : {};
  };
}

test('plume: a beginner earns bronze, a juggling gardener gold; idle earns nothing', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: focus() }).game.score);
  const gardener = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: juggler() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('plume beginner', beginner, 'gardener', gardener, 'idle', idle, 'medals', medals);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= medals[0], `beginner ${beginner}`);
  assert.ok(Math.max(...gardener) >= medals[2], `gardener ${gardener}`);
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
