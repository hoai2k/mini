import test from 'node:test';
import assert from 'node:assert/strict';
import create, { words, digits } from '../src/games/titthrush.js';
import entry from '../src/more/titthrush.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;
const MIN_PER_RAD = 60 / (Math.PI * 2);
const off = (game) => {
  let d = (((game.target - game.m) % 720) + 720) % 720;
  if (d > 360) d -= 720;
  return d;
};

// A spinner: after `delay` seconds reading the new time, spins the stick
// towards it (no faster than `max` radians a frame), slows as it gets close,
// and presses once the hands rest on it. `slip` is the chance it presses a
// little early, near enough but not right.
function spinner({ max = 0.3, delay = 0.5, slip = 0, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let seen = -1;
  let since = 0;
  let pressed = false;
  return (game) => {
    if (game.round !== seen || game.target !== game._t) {
      seen = game.round;
      game._t = game.target;
      since = 0;
    }
    since += 1 / 60;
    if (since < delay || game.nextT > 0) {
      pressed = false;
      return { kind: 'controller' };
    }
    const d = off(game);
    const spin = Math.max(-max, Math.min(max, (d / MIN_PER_RAD) * 0.25));
    const ready = Math.abs(d) <= 0.5 || (Math.abs(d) < 6 && rnd() < slip / 30);
    const action = ready && !pressed && game.jam <= 0;
    pressed = action;
    return { kind: 'controller', spin: Math.abs(d) <= 0.5 ? 0 : spin, action };
  };
}

// The keyboard: ↑ / ↓ for the hours, hold ← / → for the minutes, tap the last
// few.
function keys({ delay = 1.2 } = {}) {
  let since = 0;
  let seen = -1;
  let k = 0;
  let pressed = false;
  return (game) => {
    k++;
    if (game.round !== seen) {
      seen = game.round;
      since = 0;
    }
    since += 1 / 60;
    if (since < delay || game.nextT > 0) return { kind: 'keyboard' };
    const d = off(game);
    if (Math.abs(d) > 45) return { kind: 'keyboard', y: k % 12 < 6 ? (d > 0 ? -1 : 1) : 0 };
    if (Math.abs(d) > 6) return { kind: 'keyboard', x: Math.sign(d) };
    if (Math.abs(d) > 0.5) return { kind: 'keyboard', x: k % 12 < 6 ? Math.sign(d) : 0 };
    const action = !pressed && game.jam <= 0;
    pressed = action;
    return { kind: 'keyboard', action };
  };
}

// Spinning round and round and pressing all the while.
const whirl = (every = 6) => {
  let k = 0;
  return () => ({ kind: 'controller', spin: 0.25, action: k++ % every < every / 2 });
};

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

test('titthrush: a beginner opens the next page, a good player more; whirling, mashing and idling do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: spinner({ max: 0.1, delay: 1.6, slip: 0.3, seed }) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: spinner({ max: 0.3, delay: 0.6, seed }) }).game.score);
  const keyboard = [1, 2].map((seed) => run(create, { seed, bot: keys() }).game.score);
  const whirls = [2, 6, 20].map((every, i) => run(create, { seed: i + 1, bot: whirl(every) }).game.score);
  const mash = run(create, { seed: 1, bot: (() => { let k = 0; return () => ({ action: k++ % 4 < 2 }); })() }).game.score;
  const idle = run(create, { seed: 1 }).game.score;
  console.log('titthrush beginner', beginner, 'good', good, 'keyboard', keyboard, 'whirl', whirls, 'mash', mash, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(Math.min(...keyboard) >= pass, `keyboard ${keyboard}`);
  assert.ok(mean(good) > mean(beginner) + 2, `good ${good}`);
  assert.ok(Math.max(...whirls, mash) < pass / 2, `whirling and mashing: ${whirls} ${mash}`);
});

test('titthrush: the time in words', () => {
  assert.equal(words(600), 'ten o’clock');
  assert.equal(words(3 * 60 + 30), 'half past three');
  assert.equal(words(11 * 60 + 45), 'quarter to twelve');
  assert.equal(words(0 + 15), 'quarter past twelve');
  assert.equal(words(4 * 60 + 20), 'twenty past four');
  assert.equal(words(8 * 60 + 35), 'twenty-five to nine');
  assert.equal(words(7 * 60 + 43), '7:43');
  assert.equal(digits(9 * 60 + 5), '9:05');
});

test('titthrush: one turn of the stick is an hour, and the hour hand follows', () => {
  const game = create(env(1));
  const m0 = game.m;
  for (let i = 0; i < 40; i++) game.update(1 / 60, blank({ kind: 'controller', spin: (Math.PI * 2) / 40 }));
  const turned = (((game.m - m0) % 720) + 720) % 720;
  assert.ok(Math.abs(turned - 60) < 1, `turned ${turned}`);
});

test('titthrush: the right time sets the clock; a wrong one jams the crown', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  game.m = (game.target + 30) % 720;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.score, 0);
  assert.ok(game.jam > 0);
  assert.equal(game.wrong, 1);
  for (let i = 0; i < 70; i++) game.update(1 / 60, blank());
  game.m = game.target;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.score, 1);
});

test('titthrush: a clock kept waiting gives up and the next one calls', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const first = game.round;
  for (let i = 0; i < 60 * 14; i++) game.update(1 / 60, blank());
  assert.ok(game.gaveUp >= 1);
  assert.ok(game.round > first);
});

test('titthrush: with a finger, dragging round the face turns the hands and a tap sets', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const touch = (x, y, down, pressed = false, released = false) =>
    blank({ kind: 'pointer', action: down, actionPressed: pressed, actionReleased: released, pointer: { active: true, x, y, down, pressed, released } });
  const m0 = game.m;
  // a quarter turn clockwise round the face, from 12 to 3
  const R = 200;
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * (Math.PI / 2);
    game.update(1 / 60, touch(640 + Math.sin(a) * R, 470 - Math.cos(a) * R, true, i === 0));
  }
  game.update(1 / 60, touch(640 + R, 470, false, false, true));
  const turned = (((game.m - m0) % 720) + 720) % 720;
  assert.ok(Math.abs(turned - 15) < 1.5, `turned ${turned}`);
  assert.equal(game.wrong, 0, 'a drag does not set');
  game.m = game.target;
  game.update(1 / 60, touch(900, 800, true, true));
  game.update(1 / 60, touch(900, 800, false, false, true));
  assert.equal(game.score, 1);
});
