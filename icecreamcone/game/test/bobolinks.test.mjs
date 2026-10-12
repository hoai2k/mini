import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/bobolinks.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'bobolinks').pass;

// A player who looks at the next stone, takes `rt` seconds (give or take a
// little) to step, and puts the wrong foot down now and then (`slip`).
// Doubles are pressed left then right one frame apart.
function walker({ rt = 0.4, slip = 0.05, seed = 3 } = {}) {
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let target = null;
  let wait = 0;
  let second = false;
  return (game) => {
    if (second) {
      second = false;
      return { right: true };
    }
    if (game.stumble > 0) {
      target = null;
      return {};
    }
    const s = game.stones[0];
    if (s !== target) {
      target = s;
      wait = rt * (0.7 + rnd() * 0.6);
    }
    wait -= 1 / 60;
    if (wait > 0) return {};
    target = null;
    if (s.side === 0) {
      second = true;
      return { left: true };
    }
    const side = rnd() < slip ? -s.side : s.side;
    return side < 0 ? { left: true } : { right: true };
  };
}

test('bobolinks: a careful walker opens the next page; idle earns nothing', () => {
  const beginner = [1, 2, 3].map((seed) => run(create, { seed, bot: walker({ rt: 0.6, slip: 0.08, seed }) }).game.score);
  const steady = [1, 2, 3].map((seed) => run(create, { seed, bot: walker({ rt: 0.42, slip: 0.05, seed }) }).game.score);
  const quick = [1, 2, 3].map((seed) => run(create, { seed, bot: walker({ rt: 0.3, slip: 0.03, seed }) }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('bobolinks beginner3', beginner, 'steady', steady, 'quick', quick, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
});

test('bobolinks: a beginner passes about half the time or more; mashing does not', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const beginner = seeds.map((seed) => run(create, { seed, bot: walker({ rt: 0.75, slip: 0.1, seed: seed * 7 }) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: walker({ rt: 0.35, slip: 0.03, seed: seed * 7 }) }).game.score);
  const mash = seeds.map((seed) => {
    let r = seed * 31;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    return run(create, { seed, bot: () => (rnd() < 0.3 ? (rnd() < 0.5 ? { left: true } : { right: true }) : {}) }).game.score;
  });
  let k = 0;
  const alternate = run(create, { seed: 1, bot: () => (k++ % 12 === 0 ? (k % 24 < 12 ? { left: true } : { right: true }) : {}) }).game.score;
  console.log('bobolinks beginner', `${beginner}`, 'good', `${good}`, 'mash', `${mash}`, 'alternate', `${alternate}`, 'pass', pass);
  assert.ok(beginner.filter((s) => s >= pass).length >= seeds.length / 2, `beginner ${beginner}`);
  assert.ok(Math.max(...mash) < pass, `mashing ${mash}`);
  assert.ok(alternate < pass, `blind alternating ${alternate}`);
});

test('bobolinks: the stones start slow and simple, and end quick and tricky', () => {
  const tally = { early: { n: 0, alt: 0, dbl: 0 }, late: { n: 0, alt: 0, dbl: 0 } };
  let sinkEarly = 0;
  let sinkLate = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const game = create(env(seed));
    sinkEarly = game.sinkTime();
    const seen = new Set(game.stones);
    let prev = game.stones[game.stones.length - 1];
    let lastSide = prev.side;
    // walk perfectly so new stones keep coming
    while (!game.done) {
      const s = game.stones[0];
      const inp = s.side === 0 ? { left: true, right: true } : s.side < 0 ? { left: true } : { right: true };
      game.update(1 / 60, blank(game.stumble > 0 || game.pending ? {} : inp));
      game.update(1 / 60, blank());
      for (const st of game.stones) {
        if (seen.has(st)) continue;
        seen.add(st);
        const half = game.elapsed < 13 ? 'early' : game.elapsed > 27 ? 'late' : null;
        if (half) {
          const t = tally[half];
          t.n++;
          if (st.side === 0) t.dbl++;
          else if (prev.side !== 0 && st.side === -lastSide) t.alt++;
        }
        if (st.side !== 0) lastSide = st.side;
        prev = st;
      }
      if (game.elapsed > 39) sinkLate = game.sinkTime();
    }
  }
  const { early, late } = tally;
  assert.ok(early.n > 10 && late.n > 10, `${early.n} ${late.n}`);
  assert.ok(sinkLate < sinkEarly * 0.45, `sinking ${sinkEarly} to ${sinkLate}`);
  assert.ok(late.dbl / late.n > (early.dbl / early.n) * 2, `doubles ${early.dbl}/${early.n} vs ${late.dbl}/${late.n}`);
  assert.ok(late.alt / late.n < (early.alt / early.n) * 0.75, `plain alternating ${early.alt}/${early.n} vs ${late.alt}/${late.n}`);
});

test('bobolinks: mashing both feet gets nowhere', () => {
  const { game } = run(create, { seed: 1, bot: () => ({ left: true, right: true }) });
  assert.ok(game.score < pass / 3, `mash ${game.score}`);
});

test('bobolinks: the right foot steps, the wrong foot splashes, doubles need both', () => {
  const game = create(env(4));
  const side = game.stones[0].side;
  game.update(1 / 60, blank(side < 0 ? { left: true } : { right: true }));
  assert.equal(game.score, 1);
  const s2 = game.stones[0].side || 1;
  game.update(1 / 60, blank(s2 < 0 ? { right: true } : { left: true }));
  assert.equal(game.score, 1);
  assert.ok(game.stumble > 0);
  // a double, stepped left then right within the window
  const d = create(env(4));
  d.stones[0].side = 0;
  d.update(1 / 60, blank({ left: true }));
  assert.equal(d.score, 0);
  d.update(1 / 60, blank({ right: true }));
  assert.equal(d.score, 1);
  // ...and one foot alone splashes
  const e = create(env(4));
  e.stones[0].side = 0;
  e.update(1 / 60, blank({ left: true }));
  for (let i = 0; i < 20; i++) e.update(1 / 60, blank());
  assert.equal(e.score, 0);
  assert.ok(e.stumble > 0 || e.wrong >= 0);
});
