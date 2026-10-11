import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/shuttercluck.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'shuttercluck').pass;
const VALUE = [60, 100, 180];

// A good photographer: swing to the most valuable bird in view (or the
// rustling hiding place), and shoot once it is well framed, or as it leaves.
function photographer({ greed = 0.85, speed = 1 } = {}) {
  return (game) => {
    const live = game.birds.filter((b) => !b.snapped && b.state !== 'sink' && b.state !== 'startle');
    const shown = live.filter((b) => b.state !== 'rustle');
    const pick = (list) => list.sort((a, b) => VALUE[b.tier] - VALUE[a.tier])[0];
    const b = pick(shown) || pick(live);
    if (!b) return {};
    let tx;
    let ty;
    if (b.state === 'rustle') {
      // the bird is not out yet: aim where it will be
      const e = b.e;
      b.e = 1;
      const r = game.subject(b);
      b.e = e;
      if (!r) return {};
      tx = r.cx;
      ty = r.cy;
    } else {
      const r = game.subject(b);
      if (!r) return {};
      tx = r.cx;
      ty = r.cy;
    }
    const dx = tx - game.fx;
    const dy = ty - game.fy;
    const q = game.quality(b);
    const leaving = b.state === 'up' && b.t < 0.15;
    const shoot = b.state === 'up' && game.cool <= 0 && (q > greed || (leaving && q > 0.4));
    return { x: Math.max(-1, Math.min(1, dx / 50)) * speed, y: Math.max(-1, Math.min(1, dy / 50)) * speed, action: shoot };
  };
}

test('shuttercluck: a good photographer opens the next page; idle earns nothing', () => {
  const scores = [1, 2, 3, 4, 5].map((seed) => run(create, { seed, bot: photographer() }).game.score);
  const slow = [1, 2, 3].map((seed) => run(create, { seed, bot: photographer({ greed: 0.6, speed: 0.6 }) }).game.score);
  const idle = run(create, { seed: 1 });
  assert.equal(idle.game.score, 0);
  assert.ok(idle.game.done && idle.t <= 61, 'idle ends on the safety clock');
  assert.ok(Math.min(...scores) >= pass, `photographer ${scores}`);
  console.log('shuttercluck photographer scores', scores, 'slow', slow, 'pass', pass);
});

test('shuttercluck: ten shots end the game, and an empty frame scores nothing', () => {
  const game = create(env(3));
  let shots = 0;
  for (let i = 0; i < 2000 && !game.done; i++) {
    const press = i % 40 === 0;
    if (press) shots++;
    game.update(1 / 60, blank({ action: press, actionPressed: press }));
  }
  assert.ok(game.done);
  assert.equal(game.shots.length, 10);
  assert.equal(game.shotsLeft, 0);
  assert.ok(Number.isInteger(game.score));
  assert.equal(game.summary().length >= 1, true);
});

test('shuttercluck: a centred, whole bird is a perfect shot', () => {
  const game = create(env(1));
  // let a bird come fully out
  for (let i = 0; i < 600 && !game.birds.some((b) => b.state === 'up'); i++) game.update(1 / 60, blank());
  const b = game.birds.find((b) => b.state === 'up');
  assert.ok(b, 'a bird came out');
  const r = game.subject(b);
  game.fx = r.cx;
  game.fy = r.cy;
  assert.ok(game.quality(b) > 0.85, `quality ${game.quality(b)}`);
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.ok(game.score >= 90, `score ${game.score}`);
  assert.ok(game.shots[0].perfect);
});

// Once every page of the guide is open, only our own pocket birds are left
// to discover: the round is just as winnable, and mashing still is not.
test('shuttercluck: with only the pocket birds left, a good photographer still passes and mashing does not', async () => {
  const { SUBJECTS, SUBJECT_IDS } = await import('../src/subjects.js');
  const pocket = SUBJECT_IDS.filter((id) => SUBJECTS[id].pocket);
  assert.equal(pocket.length, 10);
  const only = (e) => create({ ...e, subjects: pocket });
  const scores = [1, 2, 3, 4, 5].map((seed) => run(only, { seed, bot: photographer() }).game.score);
  assert.ok(Math.min(...scores) >= pass, `photographer ${scores}`);
  for (const seed of [1, 2]) {
    let r = seed;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const mash = run(only, { seed, bot: () => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, action: rnd() < 0.5 }) });
    assert.ok(mash.game.score < pass, `mashing ${mash.game.score}`);
  }
  // and every bird it shows is one of them
  const game = only({ W: 1600, H: 900, rng: () => 0.3, sfx: () => {}, vibrate: () => {} });
  const seen = new Set();
  for (let i = 0; i < 3000 && !game.done; i++) {
    game.update(1 / 60, blank());
    for (const b of game.birds) seen.add(b.id);
  }
  assert.ok(seen.size > 0 && [...seen].every((id) => pocket.includes(id)), [...seen].join());
});

test('shuttercluck: a pool with a tier missing still finds birds', () => {
  const game = create({ ...env(2), subjects: ['spectaclesnipe'] });
  let peeked = false;
  for (let i = 0; i < 4000 && !game.done; i++) {
    game.update(1 / 60, blank());
    peeked ||= game.birds.some((b) => b.id === 'spectaclesnipe');
  }
  assert.ok(game.done && peeked);
});

test('shuttercluck: sees every bird in its pool before repeating one', async () => {
  const { SUBJECT_IDS, SUBJECTS } = await import('../src/subjects.js');
  const pool = SUBJECT_IDS.filter(id => SUBJECTS[id].pocket);
  const game = create(env(7, { subjects: pool }));
  const seenObjects = new Set();
  const appearances = [];
  for (let i = 0; i < 3600 && !game.done; i++) {
    game.update(1 / 60, blank());
    for (const bird of game.birds) {
      if (!seenObjects.has(bird)) {
        seenObjects.add(bird);
        appearances.push(bird.id);
      }
    }
  }
  assert.ok(appearances.length >= pool.length);
  for (let i = 0; i + pool.length <= appearances.length; i += pool.length) {
    assert.equal(new Set(appearances.slice(i, i + pool.length)).size, pool.length);
  }
  for (let i = 1; i < appearances.length; i++) assert.notEqual(appearances[i], appearances[i - 1]);
});
