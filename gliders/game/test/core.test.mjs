// Pure modules: the seeded levels, the collision world, flight and scoring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, buildLevel, seededLevel, dailyLevel, FORMATION_KINDS, rotY, rotX, mul, apply } from '../src/levels.js';
import { World } from '../src/world.js';
import { createFlyer, placeFlyer, stepFlight, advance, FLIGHT } from '../src/flight.js';
import { createScore, updateScore, crash, finish, SCORING } from '../src/scoring.js';
import { createRng } from '../src/rng.js';

const I = (o = {}) => ({ pitch: 0, roll: 0, yaw: 0, tuck: 0, flare: 0, ...o });

test('rng is deterministic per seed', () => {
  const a = createRng('x'), b = createRng('x'), c = createRng('y');
  const sa = [a.next(), a.next(), a.next()];
  assert.deepEqual(sa, [b.next(), b.next(), b.next()]);
  assert.notDeepEqual(sa, [c.next(), c.next(), c.next()]);
});

test('rotation matrices are orthonormal and compose', () => {
  const M = mul(rotY(0.7), rotX(-0.3));
  const v = apply(M, [0, 0, 1]);
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  assert.ok(Math.abs(v[1] - Math.sin(0.3)) < 1e-9);
});

for (const def of LEVELS) {
  test(`level ${def.id}: deterministic, bounded, launch lane clear`, () => {
    const a = buildLevel(def), b = buildLevel(def);
    assert.equal(a.boxes.length, b.boxes.length);
    assert.deepEqual(a.boxes[17], b.boxes[17]);
    assert.ok(a.boxes.length > 300 && a.boxes.length < 4000, `box count ${a.boxes.length}`);
    assert.ok(a.formations.length >= def.count * 0.7, `formations ${a.formations.length}/${def.count}`);
    for (const box of a.boxes) {
      for (const v of [...box.c, ...box.h, ...box.m]) assert.ok(Number.isFinite(v));
      assert.ok(box.c[1] < a.bounds.top + 80 && box.c[1] > -60, `box at y ${box.c[1]}`);
    }
    const w = new World(a.boxes);
    // The first three seconds of a hands-off glide from the spawn hit nothing.
    const f = createFlyer();
    placeFlyer(f, a.spawn.pos, a.spawn.yaw, a.spawn.pitch);
    assert.equal(advance(f, I(), 3, w), false);
    assert.ok(w.nearest(...a.spawn.pos, 30) > 25);
  });
}

test('seeded and daily levels build', () => {
  const lv = buildLevel(seededLevel('ABCDE'));
  assert.ok(lv.boxes.length > 300);
  assert.equal(buildLevel(dailyLevel(new Date(2026, 9, 6))).boxes.length, buildLevel(dailyLevel(new Date(2026, 9, 6))).boxes.length);
  assert.ok(FORMATION_KINDS.length >= 10);
});

test('world distance and raycast agree with a rotated box', () => {
  const box = { c: [10, 0, 0], h: [2, 3, 4], m: rotY(Math.PI / 4) };
  const w = new World([box]);
  assert.ok(Math.abs(w.nearest(10, 8, 0, 20) - 5) < 1e-9);
  assert.ok(w.nearest(10, 0, 0, 20) < 0);
  const t = w.raycast(10, 20, 0, 0, -1, 0, 50);
  assert.ok(Math.abs(t - 17) < 1e-9);
  assert.equal(w.raycast(10, 20, 0, 0, 1, 0, 50), Infinity);
  assert.equal(w.nearest(500, 500, 500, 10), Infinity);
});

test('flight: a level glide settles to a steady speed and sinks gently', () => {
  const f = createFlyer();
  placeFlyer(f, [0, 2000, 0], 0, 0);
  for (let t = 0; t < 20; t += 1 / 120) stepFlight(f, I(), 1 / 120);
  assert.ok(f.speed > 18 && f.speed < 40, `speed ${f.speed}`);
  assert.ok(f.pos.z > 300, 'travels forward');
  assert.ok(2000 - f.pos.y < f.pos.z / 3, 'glide ratio better than 3');
});

test('flight: diving gains speed, tucking more, climbing spends it', () => {
  const dive = (tuck) => {
    const f = createFlyer();
    placeFlyer(f, [0, 3000, 0], 0, 1.2);
    for (let t = 0; t < 8; t += 1 / 120) stepFlight(f, I({ tuck }), 1 / 120);
    return f.speed;
  };
  assert.ok(dive(0) > 60);
  assert.ok(dive(1) > dive(0) + 10);
  const f = createFlyer();
  placeFlyer(f, [0, 1000, 0], 0, 0);
  for (let t = 0; t < 1.5; t += 1 / 120) stepFlight(f, I({ pitch: 1 }), 1 / 120);
  assert.ok(f.speed < FLIGHT.launchSpeed - 10);
  assert.ok(f.pos.y > 1000);
});

test('flight: banking turns toward the low wing', () => {
  const f = createFlyer();
  placeFlyer(f, [0, 1000, 0], 0, 0);
  for (let t = 0; t < 0.3; t += 1 / 120) stepFlight(f, I({ roll: 1 }), 1 / 120);
  for (let t = 0; t < 2; t += 1 / 120) stepFlight(f, I(), 1 / 120, { assist: 0 });
  // Right wing (-X) down: heading swings toward -X.
  assert.ok(f.forward.x < -0.3, `forward.x ${f.forward.x}`);
});

test('flight: crashing into a wall is detected without tunnelling', () => {
  const w = new World([{ c: [0, 0, 40], h: [50, 50, 0.6], m: rotY(0) }]);
  const f = createFlyer();
  placeFlyer(f, [0, 0, 0], 0, 0, 140);
  let hit = false;
  for (let i = 0; i < 60 && !hit; i++) hit = advance(f, I(), 1 / 60, w);
  assert.ok(hit);
  assert.ok(f.pos.z < 40);
});

test('scoring: proximity fills the pot, leaving banks it with the multiplier', () => {
  const s = createScore('best');
  const ev = [];
  for (let t = 0; t < 1; t += 0.01) updateScore(s, { dist: 1.5, speed: 40, probes: { left: 3, right: 3, up: Infinity, down: Infinity } }, 0.01, ev);
  assert.ok(s.pot > 50);
  assert.ok(s.mult >= 3, `mult ${s.mult} (thread + skim)`);
  assert.ok(ev.some((e) => e.kind === 'THREAD'));
  const pot = s.pot, mult = s.mult;
  for (let t = 0; t < SCORING.bankDelay + 0.05; t += 0.01) updateScore(s, { dist: 50, speed: 40, probes: {} }, 0.01, ev);
  const banked = ev.find((e) => e.type === 'bank');
  assert.ok(banked);
  assert.equal(banked.amount, Math.round(pot * mult));
  assert.equal(s.score, banked.amount);
  assert.equal(s.pot, 0);
  assert.equal(s.mult, 1);
});

test('scoring: a crash loses the pot; best mode keeps the best run', () => {
  const s = createScore('best');
  s.run = 500;
  s.pot = 100;
  s.mult = 4;
  const ev = crash(s);
  assert.equal(ev[0].lost, 400);
  assert.equal(s.best, 500);
  assert.equal(s.run, 0);
  assert.equal(s.score, 500);
  s.run = 300;
  finish(s);
  assert.equal(s.score, 500);
  const t = createScore('total');
  t.total = t.run = 500;
  t.pot = 10;
  crash(t);
  assert.equal(t.score, 500);
  t.pot = 10;
  t.mult = 2;
  finish(t);
  assert.equal(t.score, 520);
});
