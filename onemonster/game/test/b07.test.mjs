// Board 7's own rules: the look catches movement in the open but not a frozen
// or hidden Trollusk; the snatch only beside him while he is not looking; a
// low branch bumps a running Trollusk and lets a sliding one under; a hole
// costs time and stamps, never the board; the tug decides the feat; Gentle
// mode gives more time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create, { autopilot, profileY } from '../src/adventure/b07.js';

const g = stubContext();
const DT = 1 / 60;
const run = (ch, inp, secs) => { for (let t = 0; t < secs; t += DT) { ch.update(DT, typeof inp === 'function' ? inp() : inp, null); } };
const right = { ...idle, x: 1 };

test('board 7: moving in the open while he looks shoos you back; frozen or hidden is safe', () => {
  const ch = create(makeEnv({ seed: 2 }));
  const p = ch._.player;
  run(ch, right, 1.2); // into the open past the start
  const x0 = p.x;
  ch._.set({ look: 'look', nextLook: 2 });
  run(ch, right, 0.3);
  assert.equal(ch._.look, 'alarm', 'caught moving in the open');
  assert.ok(p.x < x0, 'sent back');
  // Frozen in the open: safe.
  run(ch, idle, 3);
  run(ch, right, 1.2);
  const x1 = p.x;
  ch._.set({ look: 'look', nextLook: 1 });
  run(ch, idle, 0.6);
  assert.equal(ch._.look, 'look');
  assert.ok(Math.abs(p.x - x1) < 12, 'stood still');
  // Ducked behind a fern: creeping on is safe.
  const fern = ch._.cover[0];
  p.x = fern.x - 60; p.vx = 0;
  ch._.set({ look: 'look', nextLook: 1 });
  run(ch, { ...right, y: 1 }, 0.5);
  assert.equal(ch._.look, 'look', 'not seen behind the fern');
  assert.ok(p.x > fern.x - 60, 'crept on');
});

test('board 7: the snatch happens only beside him while he is not looking', () => {
  const press = { ...idle, actionPressed: true, action: true };
  let ch = create(makeEnv({ seed: 3 }));
  let p = ch._.player;
  p.x = 1200;
  run(ch, press, DT);
  assert.equal(ch.phase, 'sneak', 'too far away');
  p.x = ch._.yal.x - 150; p.vx = 0;
  ch._.set({ look: 'look', nextLook: 2 });
  run(ch, press, 0.3);
  assert.equal(ch.phase, 'sneak', 'not while he looks');
  assert.equal(ch._.look, 'alarm', 'that press was a hop, and he saw it');
  ch = create(makeEnv({ seed: 3 }));
  p = ch._.player;
  p.x = ch._.yal.x - 150; p.vx = 0;
  ch._.set({ look: 'munch', nextLook: 5 });
  run(ch, idle, 0.1);
  run(ch, press, DT);
  assert.equal(ch.phase, 'getaway', 'snatched');
  assert.equal(ch._.yState, 'surprised');
});

test('board 7: a low branch bumps a running Trollusk and spills stamps; sliding passes under', () => {
  for (const slide of [false, true]) {
    const ch = create(makeEnv({ seed: 4 }));
    const p = ch._.player;
    ch._.set({ phase: 'getaway', yState: 'dazed', protect: 99 });
    const branch = ch._.solids.find((s) => s.kind === 'branch');
    p.x = branch.x - 520; p.y = profileY(p.x);
    for (const s of ch._.pickups.items.slice(0, 6)) s.got = true;
    let spilled = 0;
    run(ch, () => { spilled += ch._.pickups.items.filter((s) => s.fly && s.fly.t < DT).length; return { ...right, y: slide && p.x > branch.x - 260 ? 1 : 0 }; }, 3);
    if (slide) {
      assert.ok(p.x > branch.x + branch.w, 'slid under and out the far side');
      assert.equal(spilled, 0, 'no stamps lost');
    } else {
      assert.ok(p.x < branch.x + 40, 'stopped at the branch');
      assert.ok(spilled > 0, 'stamps spilled by the branch');
    }
  }
});

test('board 7: falling in a hole puts you back at its edge, dazed, and the board goes on', () => {
  const ch = create(makeEnv({ seed: 5 }));
  const p = ch._.player;
  ch._.set({ phase: 'getaway', yState: 'dazed', protect: 99 });
  p.x = 3650; p.y = profileY(p.x);
  run(ch, { ...idle, x: 0.3 }, 2.5); // a dawdle straight into the hole at 3700
  assert.ok(p.x < 3700 && p.x > 3400, `back at the edge (${p.x.toFixed(0)})`);
  assert.equal(ch.done, false);
  assert.equal(p.y, profileY(p.x));
});

test('board 7: a tug costs the feat; winning it leaves him dizzy, losing it flings you on', () => {
  const ch = create(makeEnv({ seed: 6 }));
  const p = ch._.player;
  ch._.set({ phase: 'getaway', yState: 'chase' });
  p.x = 3300; p.y = profileY(p.x); ch._.yal.x = 3250;
  run(ch, idle, 0.2);
  assert.ok(ch._.tug, 'grabbed');
  assert.equal(ch._.caught, true);
  // Mash: break free.
  let n = 0;
  for (let t = 0; t < 4 && ch._.tug; t += DT) ch.update(DT, { ...right, actionPressed: n++ % 2 === 0, action: true }, null);
  assert.equal(ch._.tug, null);
  assert.equal(ch._.yState, 'dazed');
  // Lose one: flung on with stamps spilled.
  for (const s of ch._.pickups.items.slice(0, 8)) s.got = true;
  const before = ch._.pickups.count;
  ch._.set({ protect: 0, yState: 'chase' });
  ch._.yal.x = p.x - 40;
  run(ch, idle, 0.2);
  assert.ok(ch._.tug);
  ch._.set({ tugV: 0.999 });
  const x0 = p.x;
  run(ch, idle, 0.5);
  assert.equal(ch._.tug, null);
  assert.ok(ch._.pickups.count < before, 'stamps spilled');
  assert.ok(ch._.dazed > 0 && p.x > x0, 'flung on, dazed');
  // Reaching the open ground: snatched, with no feat.
  p.x = ch.FINISH_X + 1; ch._.set({ protect: 99 });
  run(ch, idle, DT);
  assert.equal(ch.outcome, 'snatched');
  assert.deepEqual(ch.marks(), [1, 0]);
});

test('board 7: never caught in the getaway earns the feat', () => {
  const ch = create(makeEnv({ seed: 7 }));
  ch._.set({ phase: 'getaway', yState: 'chase', protect: 99 });
  for (const s of ch._.pickups.items) s.got = true;
  ch._.player.x = ch.FINISH_X + 1;
  run(ch, idle, DT);
  assert.equal(ch.outcome, 'snatched');
  assert.deepEqual(ch.marks(), [3, 0]);
});

test('board 7: Gentle mode gives more time', () => {
  assert.ok(create(makeEnv({ gentle: [true, false] })).time > create(makeEnv()).time);
});

test('board 7: the autopilot gets away with time to spare', () => {
  const ch = create(makeEnv({ seed: 1 }));
  let t = 0;
  while (!ch.done && t < 200) { ch.update(DT, autopilot(ch), null); t += DT; }
  assert.equal(ch.outcome, 'snatched');
  assert.ok(ch.time > 15 && ch.time < 50, `time left ${ch.time.toFixed(1)}`);
  assert.ok(ch._.pickups.count / ch._.pickups.total >= 0.6);
});
