// Chapter 5 balance: a Typhoonigator that steers the vortex onto the bottle and
// sucks in short bursts usually gets it; one that sucks all the time while
// wandering fills up with junk, burps, and usually fails. Ducking keeps the
// bottle safe only now and then (it has a cooldown).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv } from './harness.mjs';
import create, { autopilot, HOWTO } from '../src/chapters/ch05.js';

const g = stubContext();
const DT = 1 / 30;
const K = 0.6;

function gd(a, b) { return Math.hypot(a.x - b.x, (a.y - b.y) / K); }

// Steer the cloud so its spout's foot lands on the bottle; suck in bursts once
// it is over it, let go while the bottle is ducked or the tummy is nearly full.
// Like a person, it sees a moment late (delay) and aims a little off (noise).
function burstBot(ch, rng, { delay = 0.25, noise = 40 } = {}) {
  let held = 0, rest = 0, ox = 0, oy = 0, nt = 0;
  const hist = [];
  return () => {
    const { p, foot, bottle } = ch;
    hist.push({ x: bottle.x, y: bottle.y, duck: bottle.duck });
    const seen = hist[Math.max(0, hist.length - 1 - Math.round(delay / DT))];
    nt -= DT;
    if (nt <= 0) { nt = 1; ox = (rng() - 0.5) * 2 * noise; oy = (rng() - 0.5) * 2 * noise * K; }
    const tx = seen.x + ox, ty = seen.y + oy;
    const dx = tx - p.x, dy = (ty - p.y) / K;
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.min(1, d / 90);
    const over = gd(foot, { x: tx, y: ty }) < 75;
    rest -= DT;
    let action = false;
    if (over && seen.duck <= 0 && rest <= 0 && ch.full < 0.85) {
      held += DT;
      action = held < 1.2;
      if (!action) { held = 0; rest = 0.35; }
    } else held = 0;
    return { x: (dx / d) * m, y: (dy / d) * m, sprint: d > 450, action, actionPressed: action && held <= DT + 1e-9, actionReleased: false };
  };
}

// Sucks the whole time and wanders about.
function greedyBot(rng) {
  let x = 0, y = 0, sprint = false, hold = 0;
  return () => {
    hold -= DT;
    if (hold <= 0) {
      hold = 1 + rng() * 1.5;
      const a = rng() * Math.PI * 2;
      x = Math.cos(a); y = Math.sin(a);
      sprint = rng() < 0.3;
    }
    return { x, y, sprint, action: true, actionPressed: false, actionReleased: false };
  };
}

function run(ch, bot) {
  let t = 0;
  while (!ch.done && t < 120) {
    ch.update(DT, bot(), null);
    if (Math.round(t / DT) % 10 === 0) ch.draw(g, t);
    t += DT;
  }
  return ch;
}

test('chapter 5: short bursts on the bottle usually get it; a sharp bottle sometimes keeps it', () => {
  const N = 20;
  for (const [skill, lo, hi] of [[0.55, 0.65, 1], [0.95, 0.15, 0.85]]) {
    let wins = 0, junk = 0, time = 0;
    for (let seed = 1; seed <= N; seed++) {
      const env = makeEnv({ seed, skill });
      const ch = create(env);
      run(ch, burstBot(ch, env.rng));
      if (ch.outcome === 'snatched') { wins++; time += 45 - ch.time; }
      junk += ch.junk;
    }
    console.log(`bursts vs skill ${skill}: ${wins}/${N} snatched in ${(time / Math.max(1, wins)).toFixed(1)} s, ${(junk / N).toFixed(1)} junk each`);
    assert.ok(wins >= N * lo && wins <= N * hi, `skill ${skill}: bursts won ${wins}/${N}`);
  }
});

test('chapter 5: sucking all the time while wandering fills up and usually fails', () => {
  let wins = 0, burps = 0;
  const N = 16;
  for (let seed = 1; seed <= N; seed++) {
    const env = makeEnv({ seed, skill: 0.6 });
    const ch = create(env);
    run(ch, greedyBot(env.rng));
    if (ch.outcome === 'snatched') wins++;
    burps += ch.burps;
  }
  console.log(`greedy: ${wins}/${N} snatched, ${(burps / N).toFixed(1)} burps each`);
  assert.ok(wins <= N * 0.3, `greedy won ${wins}/${N}`);
  assert.ok(burps >= N, 'greedy suckers fill up and burp');
});

test('chapter 5: a ducked bottle cannot be pulled; ducking has a cooldown', () => {
  const env = makeEnv({ versus: true, seed: 3 });
  const ch = create(env);
  const still = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  ch.update(DT, still, { ...still, action: true, actionPressed: true });
  assert.ok(ch.bottle.duck > 0);
  const cd = ch.bottle.cd;
  assert.ok(cd > ch.bottle.duck);
  // Put the vortex right on it and suck.
  ch.p.x = ch.foot.x = ch.bottle.x; ch.p.y = ch.foot.y = ch.bottle.y;
  for (let i = 0; i < 15; i++) ch.update(DT, { ...still, action: true }, still);
  assert.equal(ch.bottle.state, 'float', 'ducked: not pulled');
  // Pressing again during the cooldown does nothing; once it surfaces it goes.
  let n = 0;
  while (!ch.done && n++ < 120) {
    ch.p.x = ch.bottle.x; ch.p.y = ch.bottle.y;
    ch.update(DT, { ...still, action: true }, { ...still, action: true, actionPressed: n % 3 === 0 });
  }
  assert.equal(ch.outcome, 'snatched');
});

// A human-ish holder for versus: drifts away from the spout's foot and ducks
// when the reach ring comes over it, a little late, then has to wait.
function holderBot(ch, rng) {
  let react = -1;
  return () => {
    const { foot, bottle } = ch;
    const d = gd(foot, bottle);
    const ux = bottle.x - foot.x, uy = (bottle.y - foot.y) / K, l = Math.hypot(ux, uy) || 1;
    const away = d < 500;
    let press = false;
    if (ch.power > 0.2 && d < ch.radius * 0.95 && bottle.duck <= 0 && bottle.cd <= 0 && react < 0) react = 0.15 + rng() * 0.25;
    if (react >= 0) { react -= DT; if (react < 0) press = true; }
    return { x: away ? ux / l : 0, y: away ? uy / l : 0, action: press, actionPressed: press, actionReleased: false, sprint: false };
  };
}

test('chapter 5: the autopilot snatches with time to spare on most seeds', () => {
  for (const skill of [0.45, 0.8]) {
    const N = 12;
    let wins = 0, left = 0, marks = 0;
    for (let seed = 1; seed <= N; seed++) {
      const env = makeEnv({ seed, skill });
      const ch = create(env);
      run(ch, () => autopilot(ch));
      if (ch.outcome === 'snatched') { wins++; left += ch.time; marks += ch.marks()[0]; }
    }
    console.log(`autopilot vs skill ${skill}: ${wins}/${N}, ${(left / Math.max(1, wins)).toFixed(1)} s left, ${(marks / Math.max(1, wins)).toFixed(1)} postmarks`);
    assert.ok(wins >= N * 0.75, `skill ${skill}: autopilot won ${wins}/${N}`);
    assert.ok(left / Math.max(1, wins) > 12, 'with time to spare');
  }
});

test('chapter 5: versus is fair both ways: a ducking holder keeps it sometimes, not always', () => {
  const N = 16;
  let wins = 0;
  for (let seed = 1; seed <= N; seed++) {
    const env = makeEnv({ seed, versus: true });
    const ch = create(env);
    const hold = holderBot(ch, env.rng);
    let t = 0;
    while (!ch.done && t < 120) { ch.update(DT, autopilot(ch), hold()); t += DT; }
  if (ch.outcome === 'snatched') wins++;
  }
  console.log(`versus: snatcher ${wins}/${N}`);
  assert.ok(wins >= N * 0.25 && wins <= N * 0.9, `snatcher won ${wins}/${N}`);
});

test('chapter 5: the how-to page has three captioned steps with the cloud in each', () => {
  assert.equal(HOWTO.length, 3);
  for (const st of HOWTO) {
    assert.ok(st.text.length > 10 && st.text.length < 70);
    assert.ok(st.items.some((it) => it.creature === 'typhoonigator'));
  }
  assert.ok(HOWTO[2].items.some((it) => it.sprite && it.sprite[1] === 0), 'step 3 shows the captain’s bottle');
});
