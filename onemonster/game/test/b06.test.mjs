// Board 6 (KER-PLOP): the goo curtains stick unless he rolls, a long roll ends
// dizzy, a boat on the head dazes him and costs the feat, a hole sends him
// back to the signpost, the bottle is caught only standing and munched before
// the clock runs out, and Gentle mode gives more time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create, { autopilot } from '../src/adventure/b06.js';

const g = stubContext();
const DT = 1 / 30;
const run = (ch, inp, secs) => { for (let t = 0; t < secs; t += DT) { ch.update(DT, inp, null); ch.draw(g, t); } };
const walk = { ...idle, x: 1 };
const roll = { ...idle, x: 1, sprint: true };
// Keep the cloud from letting go of anything on its own.
const quiet = (ch) => { ch.cloud.next = 999; };

test('b06: Gentle mode gives more time', () => {
  assert.equal(create(makeEnv()).time, 120);
  assert.equal(create(makeEnv({ gentle: [true, false] })).time, 156);
});

test('b06: a goo curtain sticks to a trundling Yalapappus but not to a rolling one', () => {
  const ch = create(makeEnv());
  const c = ch.curtains[0];
  ch.player.x = c.x - 450;
  run(ch, walk, 1.2);
  assert.ok(ch.player.x > c.x - 350, 'he is into the drips');
  assert.ok(ch.player.sticky > 0, 'and sticky');
  assert.ok(Math.abs(ch.player.vx) < 250, `slowed to ${ch.player.vx.toFixed(0)}`);
  const ch2 = create(makeEnv());
  ch2.player.x = c.x - 450;
  run(ch2, roll, 1.6);
  assert.equal(ch2.player.mode, 'ball');
  assert.ok(ch2.player.x > c.x + 100, 'rolled on through');
  assert.equal(ch2.player.sticky, 0, 'no goo stuck to the ball');
});

test('b06: rolling too long leaves him dizzy', () => {
  const ch = create(makeEnv());
  run(ch, roll, 0.5);
  assert.equal(ch.player.mode, 'ball');
  let dizzy = false;
  for (let t = 0; t < 4; t += DT) { ch.update(DT, roll, null); if (ch.player.mode === 'dizzy') { dizzy = true; break; } }
  assert.ok(dizzy, 'unrolled dizzy on his own');
  assert.ok(ch.player.dazeT > 1, 'a long dizzy spell');
});

test('b06: a boat on the head dazes him and costs the feat; the bottle alone does not', () => {
  const ch = create(makeEnv());
  const p = ch.player;
  p.x = ch.OPEN_X + 600;
  ch.cloud.x = p.x;
  ch.dropItem('boat', p.x);
  let dazed = false;
  for (let t = 0; t < 2; t += DT) { quiet(ch); ch.update(DT, idle, null); if (p.mode === 'dazed') dazed = true; }
  assert.ok(dazed, 'dazed by the boat');
  assert.equal(ch.bonks, 1);
  // Now the bottle: KER-PLOP, then munching, then the snatch, with no feat.
  ch.cloud.x = p.x;
  ch.dropItem('bottle', p.x);
  for (let t = 0; t < 3 && p.mode !== 'kerplop' && p.mode !== 'munch'; t += DT) { quiet(ch); ch.update(DT, idle, null); }
  assert.ok(p.mode === 'kerplop' || p.mode === 'munch', 'caught it on the head');
  let n = 0;
  while (!ch.done && n++ < 600) { quiet(ch); ch.update(DT, autopilot(ch), null); ch.draw(g, n * DT); }
  assert.equal(ch.outcome, 'snatched');
  assert.deepEqual(ch.marks(), [1, 0], 'the snatch, no feat, not enough paper');

  const clean = create(makeEnv());
  clean.player.x = clean.OPEN_X + 600;
  clean.cloud.x = clean.player.x;
  clean.dropItem('bottle', clean.player.x);
  n = 0;
  while (!clean.done && n++ < 600) { quiet(clean); clean.update(DT, autopilot(clean), null); }
  assert.equal(clean.outcome, 'snatched');
  assert.equal(clean.bonks, 0);
  assert.equal(clean.marks()[0], 2, 'the snatch and the feat');
});

test('b06: the bottle is not caught while dazed: it bounces off and lands in the sand', () => {
  const ch = create(makeEnv());
  const p = ch.player;
  p.x = ch.OPEN_X + 600;
  ch.cloud.x = p.x;
  p.mode = 'dazed'; p.dazeT = 6;
  const b = ch.dropItem('bottle', p.x);
  run(ch, idle, 3);
  assert.notEqual(p.mode, 'kerplop');
  assert.equal(ch.climax.caught, false);
  assert.ok(ch.items.includes(b) && b.state === 'lying', 'the bottle lies in the sand');
});

test('b06: falling into a hole sends him back to the last signpost', () => {
  const ch = create(makeEnv());
  const hole = ch.segs.find((s) => s.hole);
  const sign = ch.cps.list.filter((x) => x <= hole.x0).pop();
  ch.player.x = hole.x0 - 60;
  const before = ch.time;
  run(ch, walk, 0.4);
  assert.ok(ch.player.y > ch.GY, 'falling');
  let secs = 0;
  while (ch.player.mode !== 'fell' && secs < 3) { ch.update(DT, walk, null); secs += DT; }
  assert.equal(ch.player.mode, 'fell');
  run(ch, idle, 1.5);
  assert.equal(ch.fell, 1);
  assert.equal(ch.player.mode, 'walk');
  assert.ok(Math.abs(ch.player.x - (sign + 80)) < 2, `back at the signpost (${ch.player.x} vs ${sign})`);
  assert.ok(before - ch.time > 1.5, 'it cost time');
});

test('b06: time running out during the munch keeps the letter', () => {
  const ch = create(makeEnv());
  const p = ch.player;
  p.x = ch.OPEN_X + 600;
  ch.cloud.x = p.x;
  ch.time = 2.5;
  ch.dropItem('bottle', p.x);
  run(ch, idle, 4);
  assert.ok(ch.done);
  assert.equal(ch.outcome, 'kept');
  assert.deepEqual(ch.marks(), [0, 0]);
});
