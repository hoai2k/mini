import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/bobolinks.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'bobolinks').pass;

// A player who looks at the next stone, takes `rt` seconds (give or take a
// little) to step, and puts the wrong foot down now and then (`slip`).
// `habit`: how often it steps out of habit (the other foot from last time)
// when the stone is on the same side again, so a less regular path costs it
// more. Doubles are pressed left then right one frame apart.
function walker({ rt = 0.4, slip = 0.05, habit = 0, seed = 3 } = {}) {
  let lastStep = 0;
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
    const expect = lastStep ? -lastStep : s.side;
    const side = rnd() < slip ? -s.side : s.side !== expect && rnd() < habit ? expect : s.side;
    lastStep = s.side;
    return side < 0 ? { left: true } : { right: true };
  };
}

const masher = (seed) => {
  let r = seed * 31;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  return () => (rnd() < 0.3 ? (rnd() < 0.5 ? { left: true } : { right: true }) : {});
};
// Left, right, left... five steps a second without looking.
const alternator = () => {
  let k = 0;
  return () => (k++ % 12 === 0 ? (k % 24 < 12 ? { left: true } : { right: true }) : {});
};
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const BOTS = {
  idle: () => () => ({}),
  mash: (seed) => masher(seed),
  both: () => () => ({ left: true, right: true }),
  alternate: () => alternator(),
  clumsy: (seed) => walker({ rt: 0.75, slip: 0.06, habit: 0.3, seed: seed * 7 }),
  medium: (seed) => walker({ rt: 0.75, slip: 0.1, seed: seed * 7 }),
  good: (seed) => walker({ rt: 0.35, slip: 0.03, seed: seed * 7 }),
};
const TABLE = {};
for (const level of ['easier', 'normal', 'harder']) {
  TABLE[level] = {};
  for (const [name, bot] of Object.entries(BOTS)) TABLE[level][name] = SEEDS.map((seed) => run(create, { seed, bot: bot(seed), difficulty: level }).game.score);
}
const passRate = (a) => a.filter((s) => s >= pass).length / a.length;
console.log(`bobolinks pass ${pass}`);
for (const [level, row] of Object.entries(TABLE)) console.log(level, Object.entries(row).map(([n, a]) => `${n} ${Math.round(mean(a))} [${Math.min(...a)}-${Math.max(...a)}] ${Math.round(passRate(a) * 100)}%`).join(' · '));

test('bobolinks: at Normal a medium walker passes; idle and mashing do not, blind alternating seldom', () => {
  const t = TABLE.normal;
  assert.ok(passRate(t.medium) >= 0.75, `medium ${t.medium}`);
  assert.ok(passRate(t.clumsy) <= 0.5, `clumsy ${t.clumsy}`);
  assert.equal(Math.max(...t.idle), 0);
  for (const n of ['idle', 'mash', 'both']) assert.ok(Math.max(...t[n]) < pass, `${n} ${t[n]}`);
  // Blind alternating now and then gets a run of plain alternating stones and
  // scrapes past the mark, as it did before the curve.
  assert.ok(passRate(t.alternate) <= 0.2 && mean(t.alternate) < pass * 0.75, `alternate ${t.alternate}`);
});

// Stones crossed is limited mostly by how quickly a player steps, so the
// level changes the clumsy walker's score less than its stumbles.
test('bobolinks: Easier lets a clumsy walker pass more often; idle and mashing still fail', () => {
  const t = TABLE.easier;
  assert.ok(passRate(t.clumsy) > passRate(TABLE.normal.clumsy), `clumsy ${t.clumsy} vs ${TABLE.normal.clumsy}`);
  assert.ok(passRate(t.medium) >= 0.75, `medium ${t.medium}`);
  for (const n of ['idle', 'mash', 'both']) assert.ok(Math.max(...t[n]) < pass, `${n} ${t[n]}`);
  // the stones alternate more at Easier, so blind alternating does better there
  assert.ok(passRate(t.alternate) <= 0.3 && mean(t.alternate) < pass * 0.85, `alternate ${t.alternate}`);
});

test('bobolinks: Harder ends hard: the good walker scores clearly more; a clumsy one does worse', () => {
  const t = TABLE.harder;
  assert.ok(mean(t.good) > mean(t.medium) * 1.6, `good ${mean(t.good)} vs medium ${mean(t.medium)}`);
  assert.ok(mean(t.clumsy) < mean(TABLE.normal.clumsy), `clumsy ${mean(t.clumsy)}`);
  assert.ok(passRate(t.clumsy) < passRate(TABLE.normal.clumsy), `clumsy ${t.clumsy}`);
});

// The knobs by thirds of the round at Normal.
test('bobolinks: the knobs harden third by third at Normal', () => {
  const game = create(env(1));
  const look = () => ({ d: game.d(), sink: game.sinkTime(), alt: game.altChance(), dbl: game.doubleChance() });
  const step = (s) => { for (let i = 0; i < s * 60; i++) game.update(1 / 60, blank()); };
  const start = look();
  step(40 / 3);
  const third = look();
  step(40 / 3);
  const two = look();
  step(13.2);
  const end = look();
  console.log('bobolinks ramp', { start, third, two, end });
  for (const [a, b] of [[start, third], [third, two], [two, end]]) assert.ok(a.sink > b.sink && a.alt > b.alt && a.dbl < b.dbl);
  assert.ok(third.d < 0.3, 'the first third stays gentle');
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
  assert.ok(sinkLate < sinkEarly * 0.5, `sinking ${sinkEarly} to ${sinkLate}`);
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
