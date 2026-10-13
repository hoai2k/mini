// Board 8 (SNIP!): the Bombanat's dive against the Trollusk's dodge, the
// Yalapappus's throws and the feat, the rain, the warm air and the net.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create from '../src/adventure/b08.js';

const g = stubContext();
const DT = 1 / 30;
const DOWN = { ...idle, y: 1 };
const run = (ch, inp, secs) => { for (let t = 0; t < secs; t += DT) { ch.update(DT, inp); } };

// A Trollusk standing still in the open, fresh, with the Bombanat straight
// above him by `above` px, about to dive.
function setUp(above, opts = {}) {
  const ch = create(makeEnv({ seed: 3, ...opts }));
  ch.draw(g, 0);
  const { b, h } = ch;
  h.speed = 0; h.sprint = 0; h.vx = 0; h.x = 3000;
  b.x = h.x; b.y = ch.GROUND - 95 - above; b.vx = 0; b.vy = 0; b.mode = 'fly'; b.modeT = 1;
  ch.y.x = 100; ch.y.throwT = 99; // the Yalapappus keeps out of it
  return ch;
}

test('board 8: Gentle mode gives more time', () => {
  assert.equal(create(makeEnv()).time, 90);
  assert.ok(create(makeEnv({ gentle: [true, false] })).time > 90);
});

test('board 8: a fresh Trollusk dodges a dive from low down', () => {
  const ch = setUp(330);
  run(ch, DOWN, 1.2);
  assert.ok(!ch.done, 'no snatch');
  assert.ok(ch.h.dodges >= 1, 'he hopped clear');
});

test('board 8: a dive from the top of the sky is too fast to dodge', () => {
  const ch = setUp(ch0 => 0, {});
  ch.b.y = ch.CEILING;
  run(ch, DOWN, 1.5);
  assert.equal(ch.outcome, 'snatched');
  assert.equal(ch.h.dodges, 0);
});

test('board 8: a winded Trollusk cannot dodge even a low dive', () => {
  const ch = setUp(330);
  ch.h.st = 0; ch.h.winded = 3;
  run(ch, DOWN, 1.2);
  assert.equal(ch.outcome, 'snatched');
});

test('board 8: drifting into him is no snatch: he shoos the Bombanat off', () => {
  const ch = setUp(0);
  ch.b.x = ch.h.x - 60; ch.b.vx = 60;
  run(ch, idle, 0.3);
  assert.ok(!ch.done);
  assert.equal(ch.b.mode, 'tumble');
});

test('board 8: a thrown rock is a hit, and a hit costs the feat', () => {
  const ch = setUp(0);
  ch.b.y = 500;
  ch.shots.push({ kind: 'rock', x: ch.b.x, y: ch.b.y + 10, vx: 0, vy: -100, r: 36, t: 0, rot: 0, spin: 0 });
  run(ch, idle, 0.1);
  assert.equal(ch.hits, 1);
  assert.equal(ch.b.mode, 'tumble');
  // The snatch still happens, with one postmark fewer than a clean one.
  run(ch, idle, 1.2);
  ch.b.x = ch.h.x; ch.b.y = ch.CEILING; ch.b.vx = 0; ch.b.vy = 0; ch.b.mode = 'fly';
  run(ch, DOWN, 1.5);
  assert.equal(ch.outcome, 'snatched');
  assert.deepEqual(ch.marks(), [1, 0]);
  const clean = setUp(0); clean.b.y = clean.CEILING; run(clean, DOWN, 1.5);
  assert.deepEqual(clean.marks(), [2, 0]);
});

test('board 8: rain soaks his wings and he sinks faster', () => {
  const ch = setUp(0);
  const c = ch.clouds[0];
  ch.b.x = c.x; ch.b.y = c.y + 250; ch.b.vy = 0;
  run(ch, idle, 1.0);
  assert.ok(ch.b.soaked > 0, 'soaked');
  assert.ok(ch.b.vy > 180, `sinks fast: ${ch.b.vy}`);
  const dry = setUp(0); dry.b.x = 5000; dry.b.y = 600; dry.b.vy = 0;
  run(dry, idle, 1.0);
  assert.ok(dry.b.vy < 150, `dry sink: ${dry.b.vy}`);
});

test('board 8: warm air lifts him for free', () => {
  const ch = setUp(0);
  ch.b.x = ch.THERMALS[0]; ch.b.y = 650; ch.b.vy = 0;
  run(ch, idle, 0.5);
  assert.ok(ch.b.vy < -250, `rising: ${ch.b.vy}`);
});

test('board 8: the net in the bushes holds him a moment, then lets go', () => {
  const ch = setUp(0);
  const bu = ch.bushes[0];
  ch.b.x = bu.x; ch.b.y = ch.GROUND - 520; ch.b.vy = 0;
  bu.active = true; bu.netT = 0;
  run(ch, idle, 0.4);
  assert.equal(ch.b.mode, 'netted');
  assert.ok(ch.hits === 0, 'a net is not a hit');
  run(ch, idle, 1.6);
  assert.notEqual(ch.b.mode, 'netted');
});

test('board 8: time running out keeps the letter with the Trollusk', () => {
  const ch = create(makeEnv());
  run(ch, idle, 95);
  assert.equal(ch.outcome, 'kept');
  assert.deepEqual(ch.marks(), [0, 0]);
});
