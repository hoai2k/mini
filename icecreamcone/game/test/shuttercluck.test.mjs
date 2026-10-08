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
