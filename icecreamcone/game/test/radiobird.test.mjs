import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/radiobird.js';
import entry from '../src/more/radiobird.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A listener at the dial: sweeps through the static (or goes straight to the
// pencil mark, if the station asked for is already marked) until a station
// comes in; if it's the one asked for, it homes in and follows it as it
// drifts, otherwise it sweeps on. `skill` slows the sweep, makes the hand
// shakier and slower to correct, and lets it forget the pencil marks.
function tuner(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let dir = 1;
  let asked = -1;
  let remember = true;
  let shake = 0;
  return (game) => {
    if (game.asked !== asked) {
      asked = game.asked;
      remember = rnd() < 0.3 + 0.7 * skill;
    }
    if (rnd() < 0.05) shake = (rnd() - 0.5) * (1 - skill) * 0.6;
    const want = game.want;
    const tuned = game.tuned();
    const f = game.freq(want);
    // On it (or nearly): follow it.
    if (tuned === want || (tuned < 0 && Math.abs(f - game.n) < 0.03 && game.signal() > 0.4)) {
      const d = f - game.n;
      const x = Math.sign(d) * Math.min(1, Math.sqrt(Math.abs(d) * (4 + 12 * skill))) + shake;
      return { x, action: Math.abs(d) < 0.01 * skill };
    }
    const memo = game.marks[want];
    if (remember && memo !== undefined) {
      const d = memo - game.n;
      dir = Math.sign(d) || dir;
      return { x: Math.sign(d) * Math.min(1, Math.sqrt(Math.abs(d) * 8)) };
    }
    if (game.n >= 0.995) dir = -1;
    if (game.n <= 0.005) dir = 1;
    return { x: dir * (0.55 + 0.45 * skill) + shake };
  };
}

// Creeps along the dial very slowly, end to end, never stopping.
const creeper = () => {
  let dir = 1;
  return (game) => {
    if (game.n >= 0.99) dir = -1;
    if (game.n <= 0.01) dir = 1;
    return { x: dir * 0.5, action: true };
  };
};

// Sweeps the dial end to end without stopping.
const sweeper = () => {
  let dir = 1;
  return (game) => {
    if (game.n >= 0.99) dir = -1;
    if (game.n <= 0.01) dir = 1;
    return { x: dir };
  };
};

test('radiobird: a beginner reaches the score, a good tuner more; sweeping and idling do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: tuner(0.3, seed) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: tuner(1, seed) }).game.score);
  const sweep = [1, 2, 3].map((seed) => run(create, { seed, bot: sweeper() }).game.score);
  const idle = [1, 2, 3].map((seed) => run(create, { seed }).game.score);
  const creep = [1, 2, 3].map((seed) => run(create, { seed, bot: creeper() }).game.score);
  console.log('radiobird beginner', beginner, 'good', good, 'sweep', sweep, 'creep', creep, 'idle', idle, 'pass', pass);
  assert.ok(Math.max(...idle) < pass, `idle ${idle}`);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(beginner), `good ${good}`);
  assert.equal(Math.max(...sweep), 0, `sweep ${sweep}`);
  assert.ok(Math.max(...creep) < pass, `creep ${creep}`);
});

test('radiobird: holding the asked-for station plays its song and scores', () => {
  const game = create(env(1));
  const want = game.want;
  for (let i = 0; i < 60 * 4; i++) {
    game.n = game.freq(want);
    game.update(1 / 60, blank());
  }
  assert.equal(game.score, 1);
  assert.notEqual(game.want, want, 'they ask for another');
  assert.equal(game.marks[want] !== undefined, true, 'the station is pencilled on the dial');
});

test('radiobird: the wrong station plays no song, and drifting off loses it', () => {
  const game = create(env(2));
  const wrong = (game.want + 1) % 6;
  for (let i = 0; i < 60 * 4; i++) {
    game.n = game.freq(wrong);
    game.update(1 / 60, blank());
  }
  assert.equal(game.score, 0);
  const want = game.want;
  for (let i = 0; i < 60 * 2; i++) {
    game.n = game.freq(want);
    game.update(1 / 60, blank());
  }
  const mid = game.song;
  assert.ok(mid > 0.3);
  for (let i = 0; i < 60; i++) {
    game.n = Math.min(1, game.freq(want) + 0.2);
    game.update(1 / 60, blank());
  }
  assert.ok(game.song < mid, 'the song slips back');
});

test('radiobird: the dial turns with the stick, slower with the action, and with a spin', () => {
  const a = create(env(1));
  const b = create(env(1));
  const c = create(env(1));
  for (let i = 0; i < 30; i++) {
    a.update(1 / 60, blank({ x: 1 }));
    b.update(1 / 60, blank({ x: 1, action: true }));
    c.update(1 / 60, blank({ spin: 0.3 }));
  }
  assert.ok(a.n - 0.5 > 0.2);
  assert.ok(b.n - 0.5 < (a.n - 0.5) * 0.4);
  assert.ok(c.n > 0.6);
});
