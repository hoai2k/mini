import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/gullfinch.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'gullfinch').pass;

// A player with human timing: aims at each note with a normally distributed
// error of `sd` seconds, now and then misses one outright (`lapse`), and
// winds the stick (two turns a second) when the spring is below `windBelow`
// and no note is due for a moment.
function player({ sd = 0.05, lapse = 0.04, windBelow = 0.5, seed = 7 } = {}) {
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  let aimFor = null;
  let aim = 0;
  return (game) => {
    const next = game.notes.find((n) => n.state === 'wait');
    let action = false;
    let spin = 0;
    if (next) {
      if (aimFor !== next) {
        aimFor = next;
        aim = rnd() < lapse ? -9 : gauss() * sd;
      }
      if (game.until(next) <= aim) action = true;
    }
    const gap = !next || game.until(next) > 0.6;
    if (gap && game.spring < windBelow) spin = 0.2;
    return { action, spin };
  };
}

test('gullfinch: a beginner opens the next page; idle earns nothing', () => {
  const scores = [1, 2, 3].map((seed) => run(create, { seed, bot: player({ sd: 0.09, lapse: 0.08, seed: seed * 11 }) }).game.score);
  const steady = [1, 2, 3].map((seed) => run(create, { seed, bot: player({ seed: seed * 13 }) }).game.score);
  const sharp = [1, 2, 3].map((seed) => run(create, { seed, bot: player({ sd: 0.03, lapse: 0.01, seed: seed * 5 }) }).game.score);
  const lazy = run(create, { seed: 1, bot: player({ windBelow: 0 }) }).game.score;
  const idle = run(create, { seed: 1 }).game.score;
  console.log('gullfinch beginner', scores, 'steady', steady, 'sharp', sharp, 'never winds', lazy, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...scores) >= pass, `beginner ${scores}`);
  const mean = steady.reduce((a, b) => a + b, 0) / steady.length;
  assert.ok(lazy < mean * 0.85, `winding pays: ${lazy} vs ${mean}`);
});

test('gullfinch: mashing the action plays nothing well', () => {
  let k = 0;
  const { game } = run(create, { seed: 2, bot: () => ({ action: k++ % 4 < 2 }) });
  assert.ok(game.score < pass, `mash ${game.score}`);
});

test('gullfinch: a tap far from any note winds the spring', () => {
  const game = create(env(1));
  game.spring = 0.5;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.ok(game.spring > 0.5);
  assert.equal(game.counts.miss, 0);
});

test('gullfinch: the song ends, and runs slower with the spring run down', () => {
  const full = run(create, { seed: 1, bot: () => ({ spin: 0.3 }) }).t;
  const idle = run(create, { seed: 1 }).t;
  assert.ok(full > 35 && full < 60, `song length ${full}`);
  assert.ok(idle > full, `${idle} > ${full}`);
});
