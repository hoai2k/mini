import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/glovedove.js';
import entry from '../src/more/glovedove.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A scrubber: goes to the nearest dirty spot and rubs back and forth over it.
// `speed` is how hard it pushes the stick; `rub` how many frames each stroke
// lasts; it squirts soap on tough grime while the foam is low (`soapy`).
function scrubber({ speed = 1, rub = 5, soapy = 0.5, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let k = 0;
  let pressed = false;
  return (game) => {
    k++;
    if (game.phase !== 'wash') return {};
    const spots = game.dirty();
    if (!spots.length) return {};
    const at = spots.map((s) => ({ s, ...game.spotAt(s) })).sort((a, b) => Math.hypot(a.x - game.x, a.y - game.y) - Math.hypot(b.x - game.x, b.y - game.y))[0];
    const dx = at.x - game.x;
    const dy = at.y - game.y;
    const d = Math.hypot(dx, dy);
    let action = false;
    if (soapy && !pressed && game.soap <= 0 && game.foam < soapy && at.s.grime === 4 && rnd() < 0.2) action = true;
    pressed = action;
    if (d > 26) return { x: (dx / d) * speed, y: (dy / d) * speed, action };
    const dir = Math.floor(k / rub) % 2 ? 1 : -1;
    return { x: dir * speed, y: (dy / 40) * speed, action };
  };
}

// No aiming: the stick pushed about at random.
const wiggler = (seed = 1, mash = 0) => {
  let r = seed * 48271;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let x = 0;
  let y = 0;
  let k = 0;
  return () => {
    if (k++ % 15 === 0) {
      x = rnd() * 2 - 1;
      y = rnd() * 2 - 1;
    }
    return { x, y, action: mash ? k % mash < mash / 2 : false };
  };
};
// Spinning the stick round and round without steering.
const spinner = () => {
  let k = 0;
  return () => {
    k++;
    return { x: Math.cos(k * 0.2), y: Math.sin(k * 0.2), spin: 0.2 };
  };
};

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

test('glovedove: a beginner opens the next page, a good scrubber more; wiggling, spinning and idling do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: scrubber({ speed: 0.55, rub: 9, soapy: 0, seed }) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: scrubber({ speed: 1, rub: 8, soapy: 0.55, seed }) }).game.score);
  const wiggle = [1, 2, 3].map((seed) => run(create, { seed, bot: wiggler(seed) }).game.score);
  const mash = [1, 2, 3].map((seed) => run(create, { seed, bot: wiggler(seed, 8) }).game.score);
  const spin = run(create, { seed: 1, bot: spinner() }).game.score;
  const idle = run(create, { seed: 1 }).game.score;
  console.log('glovedove beginner', beginner, 'good', good, 'wiggle', wiggle, 'mash', mash, 'spin', spin, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(mean(good) > mean(beginner) + 1.5, `good ${good}`);
  assert.ok(Math.max(...wiggle, ...mash, spin) < pass, `aimless play must not open the next page: ${wiggle} ${mash} ${spin}`);
});

test('glovedove: rubbing over a spot wears it away; standing still does not', () => {
  const game = create(env(1));
  for (let i = 0; i < 40; i++) game.update(1 / 60, blank());
  assert.equal(game.phase, 'wash');
  const s = game.dish.spots[0];
  const at = game.spotAt(s);
  game.x = at.x;
  game.y = at.y;
  for (let i = 0; i < 30; i++) game.update(1 / 60, blank());
  assert.equal(s.dirt, 1, 'still');
  for (let i = 0; i < 20; i++) game.update(1 / 60, blank({ x: i % 6 < 3 ? 1 : -1 }));
  assert.ok(s.dirt < 1 && s.dirt >= 0, `dirt ${s.dirt}`);
});

test('glovedove: a clean dish goes up on the rack and scores', () => {
  const game = create(env(1));
  for (let i = 0; i < 40; i++) game.update(1 / 60, blank());
  for (const s of game.dish.spots) s.dirt = 0;
  game.update(1 / 60, blank());
  assert.equal(game.score, 1);
  assert.equal(game.phase, 'rack');
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.equal(game.phase, 'wash');
  assert.ok(game.dirty().length >= 2);
});

test('glovedove: soap scrubs twice as fast; too much foams over and stops the scrubbing', () => {
  const rubFor = (soap) => {
    const game = create(env(2));
    for (let i = 0; i < 40; i++) game.update(1 / 60, blank());
    const s = game.dish.spots[0];
    s.r = 40;
    s.grime = 4;
    if (soap) game.update(1 / 60, blank({ action: true, actionPressed: true }));
    const at = game.spotAt(s);
    game.x = at.x;
    game.y = at.y;
    for (let i = 0; i < 30; i++) game.update(1 / 60, blank({ x: i % 6 < 3 ? 1 : -1 }));
    return 1 - s.dirt;
  };
  const plain = rubFor(false);
  const soapy = rubFor(true);
  assert.ok(soapy > plain * 1.8, `plain ${plain} soapy ${soapy}`);
  const game = create(env(1));
  for (let i = 0; i < 3; i++) game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.overflows, 1);
  assert.ok(game.mop > 0);
});

test('glovedove: with a finger, only a tap on the bottle squirts soap', () => {
  const game = create(env(1));
  const touch = (x, y) => blank({ kind: 'pointer', action: true, actionPressed: true, pointer: { active: true, x, y, down: true, pressed: true } });
  game.update(1 / 60, touch(800, 500));
  assert.equal(game.squirts, 0);
  game.update(1 / 60, blank());
  game.update(1 / 60, touch(360, 250));
  assert.equal(game.squirts, 1);
});
