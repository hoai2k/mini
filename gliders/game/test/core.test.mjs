// Pure modules: the seeded levels, the collision world, flight and scoring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, STYLES, buildLevel, seededLevel, dailyLevel, rotY, rotX, mul, apply } from '../src/levels.js';
import { World } from '../src/world.js';
import { createFlyer, placeFlyer, stepFlight, advance, FLIGHT } from '../src/flight.js';
import { createScore, updateScore, crash, finish, portalBonus, SCORING } from '../src/scoring.js';
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
  test(`world ${def.id}: deterministic, vast, launch clear`, () => {
    const a = buildLevel(def), b = buildLevel(def);
    assert.equal(a.boxes.length, b.boxes.length);
    assert.deepEqual(a.boxes[1717], b.boxes[1717]);
    assert.ok(a.boxes.length > 20000 && a.boxes.length < 130000, `box count ${a.boxes.length}`);
    assert.ok(a.parts.length >= 25, `islands ${a.parts.length}`);
    // Vast: the islands spread over kilometres and a kilometre of height.
    const xs = a.parts.map((p) => p.cx), ys = a.parts.map((p) => p.cy);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 1600, 'field width');
    assert.ok(Math.max(...ys) - Math.min(...ys) > 600, 'field height');
    assert.ok(a.backdrop.length > 3000, 'distant islands');
    assert.ok(a.updrafts.length >= 6, 'updrafts');
    assert.ok(a.portals.length >= 2, 'portals');
    for (const box of a.boxes) for (const v of [...box.c, ...box.h]) assert.ok(Number.isFinite(v));
    // The first four seconds of a hands-off glide from the spawn hit nothing.
    const f = createFlyer();
    placeFlyer(f, a.spawn.pos, a.spawn.yaw, a.spawn.pitch);
    assert.equal(advance(f, I(), 4, a.world), false);
    assert.ok(a.world.nearest(...a.spawn.pos, 60) > 50);
    // Portals float in open air.
    for (const p of a.portals) assert.ok(a.world.nearest(p.x, p.y, p.z, 60) > 15);
  });
}

test('seeded and daily worlds build', () => {
  const lv = buildLevel(seededLevel('ABCDE'));
  assert.ok(lv.boxes.length > 20000);
  assert.equal(buildLevel(dailyLevel(new Date(2026, 9, 6))).boxes.length, buildLevel(dailyLevel(new Date(2026, 9, 6))).boxes.length);
  assert.ok(Object.keys(STYLES).length >= 5);
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

test('flight: hands off, the glider settles into a steady glide', () => {
  const f = createFlyer();
  placeFlyer(f, [0, 3000, 0], 0, 0);
  for (let t = 0; t < 30; t += 1 / 120) stepFlight(f, I(), 1 / 120);
  assert.ok(f.speed > 28 && f.speed < 45, `speed ${f.speed}`);
  assert.ok(Math.abs(f.g - 1) < 0.2, `G ${f.g}`);
  const drop = 3000 - f.pos.y;
  assert.ok(f.pos.z / drop > 6, `glide ratio ${f.pos.z / drop}`);
});

test('flight: diving gains speed, tucking more; pulling up at speed is heavy G and climbs', () => {
  const dive = (tuck) => {
    const f = createFlyer();
    placeFlyer(f, [0, 5000, 0], 0, 0);
    for (let t = 0; t < 6; t += 1 / 120) stepFlight(f, I({ pitch: -1, tuck }), 1 / 120);
    return f.speed;
  };
  assert.ok(dive(0) > 75, `dive ${dive(0)}`);
  assert.ok(dive(1) > dive(0) + 8, `tucked ${dive(1)}`);
  const f = createFlyer();
  placeFlyer(f, [0, 1000, 0], 0, 0, 80);
  let maxG = 0;
  for (let t = 0; t < 1.5; t += 1 / 120) {
    stepFlight(f, I({ pitch: 1 }), 1 / 120);
    maxG = Math.max(maxG, f.g);
  }
  assert.ok(maxG > 5, `max G ${maxG}`);
  assert.ok(f.pos.y > 1030, 'swoops up');
  assert.ok(f.speed < 70, 'spends speed');
});

test('flight: too slow, it stalls and the nose drops', () => {
  const f = createFlyer();
  placeFlyer(f, [0, 3000, 0], 0, -0.6, 20);
  let minFwdY = 1;
  for (let t = 0; t < 6; t += 1 / 120) {
    stepFlight(f, I({ pitch: 1 }), 1 / 120);
    minFwdY = Math.min(minFwdY, f.forward.y);
  }
  assert.ok(minFwdY < -0.2, `nose dropped to ${minFwdY}`);
});

test('flight: banking turns toward the low wing', () => {
  const f = createFlyer();
  placeFlyer(f, [0, 1000, 0], 0, 0);
  for (let t = 0; t < 0.35; t += 1 / 120) stepFlight(f, I({ roll: 1 }), 1 / 120);
  for (let t = 0; t < 1; t += 1 / 120) stepFlight(f, I({ pitch: 0.3 }), 1 / 120, { assist: 0 });
  // Right wing (-X) down: heading swings toward -X.
  assert.ok(f.forward.x < -0.3, `forward.x ${f.forward.x}`);
});

test('flight: an updraft lifts the glider', () => {
  const run = (updraft) => {
    const f = createFlyer();
    placeFlyer(f, [0, 1000, 0], 0, 0);
    for (let t = 0; t < 3; t += 1 / 120) stepFlight(f, I(), 1 / 120, { updraft });
    return f.pos.y;
  };
  assert.ok(run(14) > run(0) + 25);
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

test('scoring: a portal banks the combo and adds 1000 flat', () => {
  const s = createScore('best');
  s.pot = 100;
  s.mult = 3;
  const ev = portalBonus(s);
  assert.equal(s.score, 1300);
  assert.equal(s.pot, 0);
  assert.equal(s.mult, 1);
  assert.ok(ev.some((e) => e.type === 'bank') && ev.some((e) => e.type === 'portal'));
});
