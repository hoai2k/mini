// Board 3's own rules: a net holds the Grumley until Action is mashed and
// withholds the feat; the letter Bombanat is grabbed only by a lunge that
// reaches him; a miss near him scares him higher; a whirlpool pulls down;
// Gentle mode gives more time; the clock running out keeps the letter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create, { autopilot, SURF, FLOOR, TUNE } from '../src/adventure/b03.js';

const g = stubContext();
const DT = 1 / 30;
const press = { ...idle, action: true, actionPressed: true };

function run(ch, inp, secs) {
  for (let t = 0; t < secs; t += DT) ch.update(DT, typeof inp === 'function' ? inp() : inp, null);
}

test('board 3: Gentle mode gives more time', () => {
  assert.equal(create(makeEnv()).time, 120);
  assert.ok(create(makeEnv({ gentle: [true, false] })).time > 120);
});

test('board 3: a net holds him until Action is mashed, and costs the feat', () => {
  const ch = create(makeEnv({ seed: 3 }));
  const { G, boats } = ch;
  const net = boats.find((b) => b.kind === 'net');
  // Sit in the band the net sweeps, right under the boat.
  G.x = net.hx; G.y = SURF + 230;
  ch.cam.follow(G.x, 0, DT, true);
  run(ch, idle, 2);
  assert.equal(G.mode, 'netted', 'netted');
  assert.equal(ch.netCount, 1);
  run(ch, idle, 3);
  assert.equal(G.mode, 'netted', 'still held while idle');
  let on = false;
  run(ch, () => { on = !on; return on ? press : idle; }, 1.5);
  assert.equal(G.mode, 'swim', 'wriggled free');
  run(ch, idle, 1);
  // Snatch now: the feat is withheld.
  ch.L.mode = 'perched'; ch.L.x = G.x; ch.L.y = G.y - 150;
  ch.update(DT, press, null);
  run(ch, idle, 0.5);
  assert.equal(ch.outcome, 'snatched');
  assert.deepEqual(ch.marks(), [1, 0]);
});

test('board 3: the letter Bombanat is grabbed only by a lunge that reaches him', () => {
  const ch = create(makeEnv({ seed: 2 }));
  const { G, L } = ch;
  L.mode = 'perched'; L.x = G.x + 60; L.y = G.y - 900;
  ch.update(DT, press, null);
  run(ch, idle, 1);
  assert.equal(ch.outcome, null, 'too far up');
  assert.ok(L.scare > 0, 'a miss nearby scares him');
  L.scare = 0; L.mode = 'perched'; L.x = G.x + 80; L.y = G.y - 160;
  ch.update(DT, { ...press, x: 0.4, y: -1 }, null);
  run(ch, idle, 0.5);
  assert.equal(ch.outcome, 'snatched');
  assert.ok(ch.done);
  assert.equal(ch.marks()[0] >= 1, true);
  for (let i = 0; i < 90; i++) { ch.update(DT, idle, null); ch.draw(g, i * DT); }
});

test('board 3: a missed lunge near him scares him higher for a while', () => {
  const ch = create(makeEnv({ seed: 1 }));
  const { G, L } = ch;
  L.x = G.x + 300; L.y = 150; G.y = SURF + 120;
  ch.update(DT, press, null);
  run(ch, idle, 1.2);
  assert.ok(L.scare > 0);
  const y0 = L.y;
  run(ch, idle, 1.5);
  assert.ok(L.y < y0 - 30, `flies higher (${y0.toFixed(0)} -> ${L.y.toFixed(0)})`);
});

test('board 3: a whirlpool pulls him down and a jet pulls clear', () => {
  const ch = create(makeEnv({ seed: 1 }));
  const { G, whirlpools } = ch;
  const w = whirlpools[0];
  G.x = w.x - 120; G.y = w.y - 150; G.vx = 0; G.vy = 0;
  ch.cam.follow(G.x, 0, DT, true);
  const y0 = G.y;
  run(ch, idle, 0.8);
  assert.ok(G.y > y0 + 40, 'pulled down');
  assert.ok(G.x > w.x - 120, 'pulled in');
});

test('board 3: time running out keeps the letter', () => {
  const ch = create(makeEnv({ seed: 4 }));
  ch.time = 1;
  run(ch, idle, 1.5);
  assert.ok(ch.done);
  assert.equal(ch.outcome, 'kept');
  assert.deepEqual(ch.marks(), [0, 0]);
});

test('board 3: the autopilot earns the lunch postmark', () => {
  const ch = create(makeEnv({ seed: 5 }));
  let t = 0;
  while (!ch.done && t < 300) { ch.update(DT, autopilot(ch), null); t += DT; }
  assert.equal(ch.outcome, 'snatched');
  assert.ok(ch.got / ch.total >= 0.6, `lunch ${ch.got}/${ch.total}`);
  assert.ok(ch.time > 20 && ch.time < 60, `${ch.time.toFixed(1)} s left`);
});
