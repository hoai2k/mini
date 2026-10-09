import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/waterglassgoose.js';
import entry from '../src/more/waterglassgoose.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A listener: remembers the tune, but each note it plays back may slip to a
// wrong glass, more often the longer the tune (`slip` per note of length).
// It takes `react` seconds before each tap and steps with the stick.
function listener({ slip = 0, react = 0.3, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let want = null;
  let ready = 0;
  let pos = -1;
  let round = -1;
  return (game, t) => {
    if (game.phase !== 'play') return {};
    if (game.pos !== pos || game.round !== round) {
      pos = game.pos;
      round = game.round;
      want = game.tune[pos];
      if (rnd() < slip * game.tune.length) want = (want + 1 + Math.floor(rnd() * (game.glasses.length - 1))) % game.glasses.length;
      ready = t + react;
    }
    if (game.sel !== want) {
      const flip = Math.floor(t * 60) % 2 === 0;
      return { x: flip ? Math.sign(want - game.sel) : 0 };
    }
    return { action: t >= ready && Math.floor(t * 60) % 2 === 0 };
  };
}

// Taps any glass, as fast as it can, moving about.
const masher = (game, t) => ({ x: Math.sin(t * 3), action: Math.floor(t * 60) % 6 < 3 });

test('waterglassgoose: a beginner opens the next page, a good ear more; idling and mashing do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6];
  const beginner = seeds.map((seed) => run(create, { seed, bot: listener({ slip: 0.035, react: 0.6, seed }) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: listener({ slip: 0.008, seed }) }).game.score);
  const perfect = run(create, { seed: 1, bot: listener() }).game;
  const mash = [1, 2, 3].map((seed) => run(create, { seed, bot: masher }).game.score);
  const idle = run(create, { seed: 1 }).game;
  console.log('waterglassgoose beginner', beginner, 'good', good, 'perfect', perfect.score, 'mash', mash, 'idle', idle.score, 'pass', pass);
  assert.equal(idle.score, 0);
  assert.ok(idle.done);
  assert.equal(perfect.tunes, 8);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((x, y) => x + y) / a.length;
  assert.ok(avg(good) > avg(beginner) + 5, `good ${good}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

// Plays until it is the player's turn.
function toPlay(game) {
  for (let i = 0; i < 60 * 20 && game.phase !== 'play'; i++) game.update(1 / 60, blank());
}
const tapAt = (game, i) => {
  game.sel = i;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  game.update(1 / 60, blank());
};

test('waterglassgoose: the right glasses in order score a point each and a bonus for the tune', () => {
  const game = create(env(2));
  toPlay(game);
  const tune = [...game.tune];
  for (const k of tune) tapAt(game, k);
  assert.equal(game.score, tune.length + 3);
  assert.equal(game.tunes, 1);
  assert.equal(game.phase, 'good');
});

test('waterglassgoose: a wrong glass cracks it and ends the tune; three cracks end the concert', () => {
  const game = create(env(3));
  for (let c = 1; c <= 3; c++) {
    toPlay(game);
    tapAt(game, (game.tune[0] + 1) % game.glasses.length);
    assert.equal(game.cracks, c);
    assert.equal(game.phase, 'oops');
  }
  for (let i = 0; i < 60 * 4; i++) game.update(1 / 60, blank());
  assert.ok(game.done);
  assert.equal(game.score, 0);
});

test('waterglassgoose: waiting too long counts as a crack', () => {
  const game = create(env(4));
  toPlay(game);
  for (let i = 0; i < 60 * 5.2; i++) game.update(1 / 60, blank());
  assert.equal(game.cracks, 1);
});

test('waterglassgoose: the pointer picks the glass under it, and the stick steps one at a time', () => {
  const game = create(env(5));
  toPlay(game);
  const x = game.glassX(2);
  game.update(1 / 60, blank({ pointer: { active: true, x, y: 500, down: false, pressed: false } }));
  assert.equal(game.sel, 2);
  game.update(1 / 60, blank({ x: -1 }));
  assert.equal(game.sel, 1);
  game.update(1 / 60, blank({ x: -1 }));
  assert.equal(game.sel, 1); // held: waits before repeating
});
