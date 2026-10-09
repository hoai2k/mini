import test from 'node:test';
import assert from 'node:assert/strict';
import create, { BOX } from '../src/games/titthrush.js';
import entry from '../src/more/titthrush.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;
const TAU = Math.PI * 2;

// A hopper: it watches the hand come round and, a moment before the dotted
// line will cross a clock, presses, with its timing off by up to `noise`
// seconds either way (a person anticipates the sweep, but not exactly).
// `aim` is how near the middle it waits for (1 takes any line through the
// clock, 0.25 waits for a bullseye); `gold` goes for the gold watch first;
// `wait` is how long it takes to settle after landing; `skip` is the chance
// it lets a chance go by; `see` is how far it looks along the line (a
// beginner only trusts what the dotted line shows).
function hopper({ noise = 0.1, aim = 1, gold = false, wait = 0.3, skip = 0, see = true, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let t = 0;
  let since = 0;
  let pressAt = null;
  let decided = null;
  let pressed = false;
  return (game) => {
    t += 1 / 60;
    if (game.state !== 'ride') {
      since = 0;
      pressAt = null;
      decided = null;
      pressed = false;
      return { kind: 'controller' };
    }
    since += 1 / 60;
    if (pressAt !== null && t >= pressAt) {
      pressAt = null;
      pressed = true;
      return { kind: 'controller', action: true };
    }
    if (pressed) {
      pressed = false;
      return { kind: 'controller' };
    }
    if (pressAt === null && since > wait) {
      const lead = 0.15; // it presses this far ahead of the moment it judges right
      const w = (TAU / game.period()) * game.on.dir;
      const hit = game.aim(game.on.a + w * lead);
      const goldOut = gold && game.clocks.some((c) => c.kind === 4 && c !== game.on && c.fade <= 0);
      const ok = hit && hit.off <= aim && (!see || hit.dist <= game.aimLen() + hit.clock.r) && (!goldOut || hit.clock.kind === 4);
      if (ok && decided !== hit.clock) {
        decided = hit.clock;
        if (rnd() < skip) return { kind: 'controller' };
        const u = (rnd() + rnd() + rnd() - 1.5) / 1.5; // roughly bell-shaped, -1..1
        pressAt = t + lead + u * noise;
      } else if (!hit) decided = null;
    }
    return { kind: 'controller' };
  };
}

const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
const beginnerBot = (seed) => hopper({ noise: 0.11, aim: 0.85, wait: 0.5, skip: 0.25, seed });
const clumsyBot = (seed) => hopper({ noise: 0.16, aim: 0.9, wait: 0.7, skip: 0.35, seed });
const goodBot = (seed) => hopper({ noise: 0.035, aim: 0.3, gold: true, wait: 0.25, see: false, seed });

// Mashing: pressing every few frames (it never gets a grip, so never lets go).
const eager = () => {
  let k = 0;
  return () => ({ kind: 'controller', action: k++ % 4 < 2 });
};
// Pressing steadily three times a second without looking: it hops whenever it
// can, wherever the hand points.
const steady = () => {
  let k = 0;
  return () => ({ kind: 'controller', action: k++ % 20 === 0 });
};
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

test('titthrush: a beginner opens the next page, a good hopper far more; mashing, blind hopping and idling do not', () => {
  const beginner = seeds.map((seed) => run(create, { seed, bot: beginnerBot(seed) }).game.score);
  const clumsy = seeds.map((seed) => run(create, { seed, bot: clumsyBot(seed) }).game.score);
  const good = seeds.slice(0, 4).map((seed) => run(create, { seed, bot: goodBot(seed) }).game.score);
  const mash = seeds.slice(0, 4).map((seed) => run(create, { seed, bot: eager() }).game.score);
  const blind = seeds.map((seed) => run(create, { seed, bot: steady() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('titthrush beginner', beginner, 'clumsy', clumsy, 'good', good, 'mash', mash, 'blind', blind, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass + 2, `beginners pass with room: ${beginner}`);
  assert.ok(clumsy.filter((s) => s >= pass).length >= 6, `a clumsy player passes most rounds: ${clumsy}`);
  assert.ok(mean(good) >= mean(beginner) * 1.4 && Math.min(...good) > mean(beginner), `good ${good} vs beginner ${beginner}`);
  assert.ok(Math.max(...mash) <= 2, `mashing never gets a grip: ${mash}`);
  assert.ok(Math.max(...blind) < pass && mean(blind) <= pass / 2, `hopping blind stays below the pass: ${blind}`);
});

test('titthrush: letting go flies along the hand; lined up, it lands on that clock and scores', () => {
  const game = create(env(3));
  game.update(1 / 60, blank());
  const target = game.clocks.find((c) => c !== game.on);
  const start = game.on;
  // turn the hand to point straight at the target's middle
  start.a = Math.atan2(target.x - start.x, -(target.y - start.y));
  start.dir = 0; // hold the hand still for the test
  for (let i = 0; i < 45; i++) game.update(1 / 60, blank());
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.state, 'fly');
  for (let i = 0; i < 90 && game.state === 'fly'; i++) game.update(1 / 60, blank());
  assert.equal(game.on, target, 'it grabbed the clock it was lined up with');
  assert.equal(game.score, 2, 'through the middle: a bullseye, two points');
  assert.equal(game.bulls, 1);
  // the clock it left fades away, and another swings in to keep two to hop to
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.ok(!game.clocks.includes(start), 'the old clock has gone');
  assert.equal(game.clocks.filter((c) => c !== game.on && c.kind !== 4).length, 2);
});

test('titthrush: a hop that misses tumbles, costs no points, and flutters back to the clock it left', () => {
  const game = create(env(2));
  game.update(1 / 60, blank());
  const start = game.on;
  start.dir = 0;
  start.a = Math.PI; // straight down, at the cobbles
  for (let i = 0; i < 45; i++) game.update(1 / 60, blank());
  game.score = 5;
  game.streak = 3;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 60 && game.state === 'fly'; i++) game.update(1 / 60, blank());
  assert.equal(game.state, 'fall');
  assert.equal(game.misses, 1);
  assert.equal(game.score, 5, 'a miss costs only time');
  assert.equal(game.streak, 0);
  for (let i = 0; i < 200 && game.state !== 'ride'; i++) game.update(1 / 60, blank());
  assert.equal(game.state, 'ride');
  assert.equal(game.on, start);
  // pressing while it is still getting a grip does nothing
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.state, 'ride');
});

test('titthrush: the gold watch is worth three and leaves if not reached; every fifth hop in a row adds one', () => {
  const game = create(env(4));
  for (let i = 0; i < 60 * 25 && !game.clocks.some((c) => c.kind === 4); i++) game.update(1 / 60, blank());
  const gold = game.clocks.find((c) => c.kind === 4);
  assert.ok(gold, 'the gold watch shows up');
  for (let i = 0; i < 60 * 7; i++) game.update(1 / 60, blank());
  assert.ok(!game.clocks.includes(gold), 'it leaves when its time is up');

  const g2 = create(env(5));
  g2.update(1 / 60, blank());
  g2.streak = 4;
  const target = g2.clocks.find((c) => c !== g2.on);
  target.kind = 4;
  target.life = 99;
  g2.on.dir = 0;
  // aim a little off the middle: not a bullseye
  const d = Math.hypot(target.x - g2.on.x, target.y - g2.on.y);
  g2.on.a = Math.atan2(target.x - g2.on.x, -(target.y - g2.on.y)) + Math.asin((target.r * 0.7) / d);
  for (let i = 0; i < 45; i++) g2.update(1 / 60, blank());
  g2.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 90 && g2.state === 'fly'; i++) g2.update(1 / 60, blank());
  assert.equal(g2.on, target);
  assert.equal(g2.score, 4, 'three for the gold watch and one for five in a row');
  assert.equal(g2.golds, 1);
});

test('titthrush: it gets harder, and the clocks stay where a narrow screen can see them', () => {
  const game = create(env(6));
  const early = { period: game.period(), r: game.radius(), aim: game.aimLen() };
  const bot = hopper({ noise: 0.03, aim: 0.5, seed: 6 });
  let backwards = false;
  for (let i = 0; i < 60 * 44; i++) {
    const o = bot(game);
    game.update(1 / 60, blank({ ...o, actionPressed: !!o.action }));
    for (const c of game.clocks) {
      assert.ok(c.bx >= BOX.x0 - 1 && c.bx <= BOX.x1 + 1 && c.by >= BOX.y0 - 1 && c.by <= BOX.y1 + 1, 'clock in the box');
      if (c.dir < 0) backwards = true;
    }
  }
  assert.ok(game.period() < early.period * 0.7, 'the hands sweep faster');
  assert.ok(game.radius() < early.r * 0.8, 'the clocks get smaller');
  assert.ok(game.aimLen() < early.aim * 0.5, 'the dotted line gets shorter');
  assert.ok(backwards, 'the cuckoo clock (backwards) joins in');
  assert.equal(game.span, 1060);
  assert.ok(BOX.x1 - BOX.x0 + 2 * 100 * 1.2 <= game.span + 100);
});
