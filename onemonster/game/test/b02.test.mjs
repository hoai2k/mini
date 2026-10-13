// Board 2 rules: the snap only lands on a Trollusk out in the open (never
// under the canopy or in cover), the feat is the early clearings only, a
// cobweb holds until the flaps run out, a bump tumbles, a perch refills the
// stamina ring, Gentle mode gives more time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create, { autopilot, FLOOR } from '../src/adventure/b02.js';

const g = stubContext();
const DT = 1 / 30;
const inp = (o = {}) => ({ ...idle, ...o });
const run = (ch, n, f = () => idle) => { for (let i = 0; i < n; i++) ch.update(DT, f(i), null); };

// Fly the Bombanat straight down onto the Trollusk's head, jaws first.
function diveOnto(ch, frames = 60) {
  const { b, h } = ch.S;
  b.mode = 'fly'; b.x = h.x + (h.mode === 'dash' ? 60 : 0); b.y = h.mode === 'dash' ? 560 : 430; b.vx = 0; b.vy = 0; b.facing = 1; b.hitT = 0;
  run(ch, frames, () => inp({ x: 1, y: 1 }));
}

test('no snap under the canopy, in cover or on a feint; a snap in the open', () => {
  const ch = create(makeEnv());
  const { h } = ch.S;
  // Running in the deep wood: hidden by the leaves, whatever the jaws do.
  assert.equal(h.mode, 'run');
  assert.ok(h.hidden);
  diveOnto(ch);
  assert.equal(ch.done, false);
  // In a clearing, tucked in a bush: a dive bumps off the bush.
  const c = ch.S.clearings[0];
  h.x = c.covers[0].x; h.mode = 'hide'; h.modeT = 0; h.hideT = 99; h.clearing = c; h.cover = c.covers[0]; h.coverI = 0;
  diveOnto(ch);
  assert.equal(ch.done, false);
  assert.ok(h.hidden);
  // Dashing in the open: the jaws reach him.
  h.mode = 'dash'; h.modeT = 0; h.target = c.covers[1].x; h.hideT = 1;
  diveOnto(ch);
  assert.equal(ch.outcome, 'snatched');
  assert.equal(ch.snapClearing, 0);
  assert.equal(ch.marks()[0], 1 + 1, 'the snatch and the feat (few scraps)');
});

test('a skid flat to the ground dodges jaws that stop short of the floor', () => {
  const ch = create(makeEnv());
  const { b, h } = ch.S;
  const c = ch.S.clearings[0];
  h.x = c.covers[0].x + 200; h.mode = 'skid'; h.modeT = -99; h.clearing = c; h.hidden = false;
  // Jaws at hat height: a miss while he is flat.
  b.mode = 'fly'; b.x = h.x - 110; b.y = 650; b.facing = 1; b.diving = true;
  ch.update(DT, inp({ x: 1, y: 1 }), null);
  assert.equal(ch.done, false);
  // Jaws right down at the floor: a snap.
  b.y = FLOOR - 170; b.vy = 0;
  ch.update(DT, inp({ x: 1, y: 1 }), null);
  assert.equal(ch.outcome, 'snatched');
});

test('the feat is withheld for a snap in the last clearing', () => {
  const ch = create(makeEnv());
  const { h } = ch.S;
  const c = ch.S.clearings[3];
  h.x = c.covers[0].x + 200; h.mode = 'dash'; h.modeT = 0; h.target = c.covers[1].x; h.clearing = c; h.coverI = 0;
  diveOnto(ch);
  assert.equal(ch.outcome, 'snatched');
  assert.equal(ch.snapClearing, 3);
  assert.equal(ch.marks()[0], 1);
});

test('a cobweb holds until four flaps (three in Gentle mode) and then tears', () => {
  for (const gentle of [false, true]) {
    const ch = create(makeEnv({ gentle: [gentle, false] }));
    const { b, webs } = ch.S;
    const w = webs[0];
    b.mode = 'fly'; b.x = w.x - 150; b.y = w.y; b.vx = 300; b.vy = 0; b.hitT = 0;
    run(ch, 20, () => inp({ x: 1 }));
    assert.equal(b.mode, 'web', 'caught');
    assert.equal(b.webHold, gentle ? 3 : 4);
    const need = b.webHold;
    for (let i = 0; i < need - 1; i++) { ch.update(DT, inp({ actionPressed: true, action: true }), null); ch.update(DT, idle, null); }
    assert.equal(b.mode, 'web', 'still held');
    ch.update(DT, inp({ actionPressed: true, action: true }), null);
    assert.equal(b.mode, 'fly', 'free');
    assert.ok(w.torn);
    // A torn web never holds again.
    b.x = w.x; b.y = w.y; b.hitT = 0;
    run(ch, 5, () => inp({ x: 1 }));
    assert.notEqual(b.mode, 'web');
  }
});

test('flying into a trunk tumbles him; a slow glide onto a branch perches and refills stamina', () => {
  const ch = create(makeEnv());
  const { b, solids } = ch.S;
  const trunk = solids.find((s) => s.kind === 'trunk');
  b.mode = 'fly'; b.x = trunk.x - 200; b.y = trunk.y + 120; b.vx = 400; b.vy = 0;
  run(ch, 20, () => inp({ x: 1 }));
  assert.equal(b.mode, 'tumble');
  // A branch: come down slowly on its top.
  const branch = solids.find((s) => s.kind === 'branch');
  b.mode = 'fly'; b.hitT = 0; b.x = branch.x + branch.w / 2; b.y = branch.y - 200; b.vx = 0; b.vy = 100; b.st = 0.2;
  run(ch, 60);
  assert.equal(b.mode, 'perched');
  run(ch, 45);
  assert.ok(b.st > 0.9, `stamina refilled to ${b.st}`);
  // Sprint drains it and a flap takes off.
  ch.update(DT, inp({ actionPressed: true, action: true }), null);
  assert.equal(b.mode, 'fly');
  run(ch, 30, () => inp({ x: 1, sprint: true }));
  assert.ok(b.st < 0.9);
});

test('Gentle mode gives more time and the autopilot still snatches', () => {
  const a = create(makeEnv());
  const b = create(makeEnv({ gentle: [true, false] }));
  assert.equal(a.time, 120);
  assert.ok(b.time > a.time);
  let t = 0;
  while (!b.done && t < 400) { b.update(DT, autopilot(b), null); t += DT; }
  assert.equal(b.outcome, 'snatched');
  b.draw(g, t);
});

test('a dropped stamp snapped up is worth two seconds', () => {
  const ch = create(makeEnv());
  const { b, stamps } = ch.S;
  stamps.push({ x: 3000, y: FLOOR, item: 1, t: 0, got: false });
  const before = ch.time;
  b.mode = 'fly'; b.x = 3000; b.y = FLOOR - 80; b.vx = 0; b.vy = 0;
  ch.update(DT, idle, null);
  assert.ok(stamps[0].got);
  assert.ok(ch.time > before + 1.5);
});
