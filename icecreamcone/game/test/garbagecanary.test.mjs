import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/garbagecanary.js';
import entry from '../src/more/garbagecanary.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A bin-minder: lifts the lid `lead` seconds before rubbish arrives and keeps
// it shut for anything else. It reacts `delay` seconds late (it sees the
// street as it was), and its sense of timing wobbles by `wobble` seconds.
function minder({ lead = 0.3, delay = 0, wobble = 0, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const queue = [];
  const n = Math.round(delay * 60);
  const err = new Map();
  return (game) => {
    const next = game.coming()[0];
    let want = false;
    if (next) {
      if (!err.has(next)) err.set(next, (rnd() - 0.5) * 2 * wobble);
      const eta = game.eta(next) + err.get(next);
      want = next.rub && eta < lead;
    }
    queue.push(want);
    const act = queue.length > n ? queue.shift() : false;
    return { action: act };
  };
}

const alwaysOpen = () => () => ({ action: true });
const masher = () => (game, t) => ({ action: Math.floor(t * 5) % 2 === 0 });

test('garbagecanary: a beginner opens the next page, a sharp minder more; holding the lid open, mashing and idling do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: minder({ lead: 0.45, delay: 0.25, wobble: 0.18, seed }) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: minder({ lead: 0.2, delay: 0.05, wobble: 0.03, seed }) }).game.score);
  const open = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: alwaysOpen() }).game.score);
  const mash = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: masher() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('garbagecanary beginner', beginner, 'good', good, 'open', open, 'mash', mash, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(beginner), `good ${good}`);
  assert.ok(Math.max(...open) < pass, `holding it open must not open the next page: ${open}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

function oneComing(kind) {
  const game = create(env(1));
  game.spawnT = 99;
  game.items.push({ kind, rub: ['paper', 'peel', 'tin', 'core', 'fishbone', 'boot'].includes(kind), x: 700, y: 0, vx: -400, t: 0, phase: 0, amp: 50, hop: 260, gust: null, state: 'come', rot: 0, spin: 0, vy: 0, life: 0 });
  return game;
}

test('garbagecanary: rubbish that finds the lid up goes in', () => {
  const game = oneComing('tin');
  for (let i = 0; i < 90; i++) game.update(1 / 60, blank({ action: true }));
  assert.equal(game.binned, 1);
  assert.equal(game.score, 1);
});

test('garbagecanary: something that is not rubbish gets spat out and costs two', () => {
  const game = oneComing('cat');
  game.score = 5;
  for (let i = 0; i < 90; i++) game.update(1 / 60, blank({ action: true }));
  assert.equal(game.swallowed, 1);
  assert.equal(game.score, 3);
});

test('garbagecanary: with the lid shut, a hat goes over the top and rubbish is lost', () => {
  const hat = oneComing('hat');
  for (let i = 0; i < 90; i++) hat.update(1 / 60, blank());
  assert.equal(hat.letPast, 1);
  assert.equal(hat.score, 0);
  const tin = oneComing('tin');
  for (let i = 0; i < 90; i++) tin.update(1 / 60, blank());
  assert.equal(tin.missed, 1);
  assert.equal(tin.score, 0);
});

test('garbagecanary: five in a row earns a bonus', () => {
  const game = create(env(1));
  game.spawnT = 99;
  for (let n = 0; n < 5; n++) {
    game.items.push({ kind: 'paper', rub: true, x: 700 + n * 200, y: 0, vx: -400, t: 0, phase: 0, amp: 50, hop: 260, gust: null, state: 'come', rot: 0, spin: 0, vy: 0, life: 0 });
  }
  for (let i = 0; i < 300; i++) game.update(1 / 60, blank({ action: true }));
  assert.equal(game.binned, 5);
  assert.equal(game.score, 6);
});

test('garbagecanary: things come faster and more of them are not rubbish later on', () => {
  const game = create(env(2));
  const early = [];
  const late = [];
  for (let i = 0; i < 45 * 60; i++) {
    const before = game.items.length;
    game.update(1 / 60, blank());
    if (game.items.length > before) (game.elapsed < 15 ? early : game.elapsed > 30 ? late : []).push(game.items[game.items.length - 1]);
  }
  const speed = (a) => a.reduce((s, it) => s + Math.abs(it.vx), 0) / a.length;
  assert.ok(late.length > early.length, `${late.length} > ${early.length}`);
  assert.ok(speed(late) > speed(early));
});
