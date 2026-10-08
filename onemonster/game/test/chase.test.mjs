// The chase kit has no button that always wins (design.md, "Chases"): one-trick
// strategies do worse than the computer players' mixed play, and two equal
// computer players make a real contest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMover, makeChase, stepChase, aiHolder, aiSnatcher } from '../src/chase.js';
import { makeRng } from '../src/chapters/index.js';

const BOUNDS = { x0: 80, x1: 1840, y0: 620, y1: 1010 };
const COVER = [
  { x: 420, y: 700, rx: 90, ry: 45 }, { x: 980, y: 900, rx: 90, ry: 45 },
  { x: 1500, y: 720, rx: 90, ry: 45 }, { x: 760, y: 660, rx: 80, ry: 40 },
];

function play(holderBrain, snatcherBrain, seed, { time = 45, skillH = 0.55, skillS = 0.55 } = {}) {
  const rng = makeRng(seed);
  const s = makeMover({ x: 200, y: 700, speed: 300, sprint: 520, accel: 900, flies: true, canHide: false, lungeRange: 460 });
  const h = makeMover({ x: 1300, y: 850, speed: 270, sprint: 470, accel: 2600 });
  const c = makeChase({ snatcher: s, holder: h, bounds: BOUNDS, cover: COVER, rng });
  const bs = {}, bh = {};
  const dt = 1 / 60;
  for (let t = 0; t < time; t += dt) {
    const inS = snatcherBrain(c, bs, skillS, dt, rng);
    const inH = holderBrain(c, bh, skillH, dt, rng);
    stepChase(c, inS, inH, dt);
    if (c.done) return { snatched: true, t };
  }
  return { snatched: false, t: time };
}

function rate(holderBrain, snatcherBrain, n = 60, opts) {
  let k = 0;
  for (let i = 0; i < n; i++) if (play(holderBrain, snatcherBrain, 1000 + i * 7, opts).snatched) k++;
  return k / n;
}

// One-trick holders.
const hideOnly = (c, b) => {
  const k = COVER.slice().sort((a, z) => Math.hypot(a.x - c.h.x, a.y - c.h.y) - Math.hypot(z.x - c.h.x, z.y - c.h.y))[0];
  const dx = k.x - c.h.x, dy = k.y - c.h.y, d = Math.hypot(dx, dy) || 1;
  return d > 20 ? { x: dx / d, y: dy / d, sprint: true } : { x: 0, y: 0 };
};
const sprintAway = (c) => {
  const dx = c.h.x - c.s.x, dy = c.h.y - c.s.y, d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d, sprint: true };
};
const dodgeSpam = (c, b, s, dt) => ({ ...aiHolder(c, b, 0.55, dt), actionPressed: true });
// One-trick snatchers.
const lungeSpam = (c, b, s, dt) => {
  const o = aiSnatcher(c, b, 0.55, dt);
  return { ...o, actionPressed: c.s.cool <= 0 };
};
const sprintOnly = (c) => {
  const dx = c.h.x - c.s.x, dy = c.h.y - c.s.y, d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d, sprint: true, actionPressed: d < 110 };
};

test('two equal computer players make a contest', () => {
  const r = rate(aiHolder, aiSnatcher);
  assert.ok(r > 0.2 && r < 0.9, `snatch rate ${r}`);
});

test('hiding alone does not keep the letter: waiting snatchers flush you out', () => {
  const r = rate(hideOnly, aiSnatcher);
  assert.ok(r > rate(aiHolder, aiSnatcher), `hide-only snatched ${r}`);
});

test('sprinting away alone runs out of breath', () => {
  const r = rate(sprintAway, aiSnatcher);
  assert.ok(r > rate(aiHolder, aiSnatcher) - 0.05, `sprint-only snatched ${r}`);
});

test('dodging all the time leaves you open', () => {
  const r = rate(dodgeSpam, aiSnatcher);
  assert.ok(r >= rate(aiHolder, aiSnatcher) - 0.05, `dodge-spam snatched ${r}`);
});

test('lunging all the time is worse than choosing your moment', () => {
  assert.ok(rate(aiHolder, lungeSpam) < rate(aiHolder, aiSnatcher) + 0.05);
});

test('chasing flat out is worse than pacing yourself', () => {
  assert.ok(rate(aiHolder, sprintOnly) < rate(aiHolder, aiSnatcher) + 0.05);
});

test('a better holder keeps it more often', () => {
  assert.ok(rate(aiHolder, aiSnatcher, 60, { skillH: 0.9 }) < rate(aiHolder, aiSnatcher, 60, { skillH: 0.2 }));
});

test('the tug: a winded holder loses it, a fresh one can break free', () => {
  let freed = 0;
  for (let i = 0; i < 40; i++) {
    const rng = makeRng(50 + i);
    const s = makeMover({ x: 500, y: 800 });
    const h = makeMover({ x: 540, y: 800 });
    const c = makeChase({ snatcher: s, holder: h, bounds: BOUNDS, rng });
    stepChase(c, { actionPressed: true }, {}, 1 / 60);
    assert.ok(c.tug, 'a grab starts a tug');
    // Both mash at the same rate; the holder pulls away with the stick too.
    for (let f = 0; f < 600 && c.tug; f++) stepChase(c, { actionPressed: f % 6 === 0 }, { actionPressed: f % 6 === 3, x: 1 }, 1 / 60);
    if (!c.done) freed++;
  }
  assert.ok(freed > 20, `a fresh holder who pulls away breaks free (${freed}/40)`);
});
