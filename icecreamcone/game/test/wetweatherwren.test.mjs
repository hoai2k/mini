import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/wetweatherwren.js';
import entry from '../src/more/wetweatherwren.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;
const FOOT = 22;

// A walker who watches the next puddle and hops it. `lead` is how early it
// presses (jittered by `slop`); it floats over the puddle and lets go once
// past; it keeps the umbrella shut near awnings and taps a low hop for a
// puddle beneath one; it opens over a little bird when it remembers to.
function walker({ lead = 70, slop = 0, kind = 0.9, miss = 0, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let tap = 0;
  let jitter = 0;
  let target = null;
  return (game) => {
    const d = game.d;
    const next = game.puddles.filter((p) => !p.hit && !p.counted && p.x1 - FOOT > d).sort((a, b) => a.x0 - b.x0)[0];
    const awn = game.awnings.find((a) => !a.hit && a.x1 > d - 160 && a.x0 < d + 260);
    if (tap > 0) {
      tap--;
      return { action: true };
    }
    if (next !== target) {
      target = next;
      jitter = rnd() < miss ? -1e4 : (rnd() - 0.5) * 2 * slop;
    }
    if (game.grounded) {
      if (next && next.x0 - d < lead + jitter + game.speed * 0.05 && next.x0 - d > -FOOT) {
        if (awn || next.under) {
          tap = 1;
          return { action: true };
        }
        return { action: true };
      }
      const chick = game.chicks.find((c) => c.state === 'wait' && Math.abs(c.x - d) < 45);
      if (chick && !awn && rnd() < kind) return { action: true };
      return {};
    }
    // In the air: float over the puddle, drop once past it or near an awning.
    if (awn) return {};
    if (next && d < next.x1 + 10) return { action: true };
    const chick = game.chicks.find((c) => c.state === 'wait' && Math.abs(c.x - d) < 60);
    return { action: !!chick };
  };
}

// Mashing: press, let go, press, let go.
const masher = (every = 6) => {
  let k = 0;
  return () => ({ action: k++ % every < every / 2 });
};

test('wetweatherwren: a beginner opens the next page, a good walker more; idling, holding and mashing do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: walker({ lead: 90, slop: 70, kind: 0.4, miss: 0.15, seed }) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: walker({ lead: 60, slop: 10, kind: 1, seed }) }).game.score);
  const mash = [2, 4, 6, 10, 20, 40].map((every, i) => run(create, { seed: i + 1, bot: masher(every) }).game.score);
  const hold = run(create, { seed: 1, bot: () => ({ action: true }) }).game.score;
  const idle = run(create, { seed: 1 }).game.score;
  console.log('wetweatherwren beginner', beginner, 'good', good, 'mash', mash, 'hold', hold, 'idle', idle, 'pass', pass);
  assert.ok(idle < 3, `idle ${idle}`);
  assert.ok(hold < pass, `hold ${hold}`);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  assert.ok(mean(good) > mean(beginner) + 2, `good ${good}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

test('wetweatherwren: walking into a puddle splashes and stops the Wren', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const p = game.puddles[0];
  for (let i = 0; i < 60 * 6 && !game.splashes; i++) game.update(1 / 60, blank());
  assert.equal(game.splashes, 1);
  assert.ok(p.hit);
  assert.equal(game.speed, 0);
  assert.equal(game.score, 0);
});

test('wetweatherwren: hopping over a puddle with the umbrella open scores', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const p = game.puddles[0];
  while (p.x0 - game.d > 50) game.update(1 / 60, blank());
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.ok(!game.grounded && game.open);
  for (let i = 0; i < 60 * 3 && game.d < p.x1 + 20; i++) game.update(1 / 60, blank({ action: true }));
  assert.equal(game.splashes, 0);
  assert.equal(game.score, 1);
});

test('wetweatherwren: an open umbrella catches on an awning; a furled one walks under', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  game.awnings.push({ x0: game.d + 100, x1: game.d + 500, color: 0 });
  game.puddles = [];
  game.nextX = game.d + 5000;
  for (let i = 0; i < 60 * 3; i++) game.update(1 / 60, blank());
  assert.equal(game.snags, 0, 'walking under, furled');
  game.awnings.push({ x0: game.d + 200, x1: game.d + 600, color: 0 });
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 60 * 2 && !game.snags; i++) game.update(1 / 60, blank({ action: true }));
  assert.equal(game.snags, 1);
  assert.ok(!game.open);
});

test('wetweatherwren: an open canopy over a little bird keeps it dry', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  game.puddles = [];
  game.chicks.push({ x: game.d + 300, state: 'wait', t: 0, color: '#fff' });
  game.nextX = game.d + 5000;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 60 * 2; i++) game.update(1 / 60, blank({ action: game.grounded ? false : true, actionPressed: false }));
  // walking with it open from the ground works too
  const c2 = { x: game.d + 300, state: 'wait', t: 0, color: '#fff' };
  game.chicks.push(c2);
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 60 * 2; i++) game.update(1 / 60, blank({ action: true }));
  assert.equal(game.sheltered, 2);
  assert.equal(c2.state, 'dry');
});
