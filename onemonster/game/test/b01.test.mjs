// Board 1 (Faddle Street): its own rules. A scurry wakes the dog and the dog
// catches him on the lane but not up on the fence; a lookout's look shoos him
// when he moves in the open, not when he is ducked in a bush or frozen far
// off; being caught costs time, spills stamps and loses the feat; the snatch
// only happens at the mailbox; the sprinkler soaks him on the lane; Gentle
// mode gives more time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, idle } from '../test/harness.mjs';
import create, { autopilot, G, DOG, SPRINKLER, MAILBOX, COVER, LOOKOUTS } from '../src/adventure/b01.js';

const DT = 1 / 30;
const inp = (o = {}) => ({ ...idle, ...o });
const step = (ch, i, n) => { for (let k = 0; k < n; k++) ch.update(DT, typeof i === 'function' ? i() : i, null); };

// Put him on the lane at x, standing still, with every lookout resting a long while.
function place(ch, x) {
  ch.b.x = x; ch.b.y = G; ch.b.vx = 0; ch.b.vy = 0; ch.b.onGround = true;
  for (const L of ch.look) { L.state = 'rest'; L.t = 0; L.restFor = 1000; }
  ch.pl.safeT = 0;
}

test('b01: a scurry near the kennel wakes the dog, and the dog catches him on the lane', () => {
  const ch = create(makeEnv());
  place(ch, DOG.x - DOG.rope + 60);
  step(ch, inp({ x: 1, sprint: true }), 15);
  assert.equal(ch.dog.state, 'awake', 'the noise woke it');
  step(ch, inp({ x: 1, sprint: true }), 90);
  assert.equal(ch.caught, 1, 'caught by the dog');
  assert.ok(ch.time < ch.total - 3 - 90 * DT + 0.01, 'the catch cost time');
});

test('b01: a tiptoe past the kennel leaves the dog asleep', () => {
  const ch = create(makeEnv());
  place(ch, DOG.x - DOG.rope + 60);
  step(ch, inp({ x: 1 }), 60);
  assert.equal(ch.dog.state, 'asleep');
  assert.equal(ch.caught, 0);
});

test('b01: up on the fence the dog cannot reach him', () => {
  const ch = create(makeEnv());
  const fence = ch.solids.find((s) => s.kind === 'fence' && s.x > DOG.x - DOG.rope && s.x < DOG.x);
  place(ch, fence.x + 200);
  ch.b.y = fence.y; ch.b.ground = fence;
  ch.wakeDog();
  step(ch, idle, 90);
  assert.ok(Math.abs(ch.dog.x - ch.b.x) < 120, 'the dog ran to him');
  assert.equal(ch.caught, 0);
});

test('b01: a lookout shoos him when he moves in the open, costs time, spills stamps and loses the feat', () => {
  const ch = create(makeEnv());
  const L = ch.look[0];
  place(ch, L.zone[0] + 200);
  ch.stamps.items[0].got = true; ch.stamps.items[1].got = true; ch.stamps.items[2].got = true;
  // Three stamps in the bag.
  ch.stamps.update(0, -9999, -9999);
  step(ch, inp({ x: 1 }), 1);
  const gotBefore = ch.got;
  L.state = 'look'; L.t = 1.5; L.lookFor = 1.5; L.judged = false;
  const before = ch.time;
  step(ch, inp({ x: 1 }), 3);
  assert.equal(ch.caught, 1);
  assert.equal(ch.pl.mode, 'shoo');
  assert.ok(ch.time <= before - 3, 'costs three seconds');
  assert.equal(ch.spills.length, Math.min(2, gotBefore), 'stamps spill');
  // He scuttles back to the signpost.
  step(ch, idle, 120);
  assert.equal(ch.pl.mode, 'free');
  assert.ok(ch.b.x <= L.zone[0], 'back before her stretch');
  // The spilled stamps can be picked up again.
  const sp = ch.spills[0];
  if (sp) { place(ch, sp.x); step(ch, idle, 5); assert.equal(ch.spills.length, Math.min(2, gotBefore) - 1); }
});

test('b01: ducked in a bush he is hidden; frozen far off he fools her; frozen close up he does not', () => {
  const L = LOOKOUTS[0];
  const bush = COVER.find((k) => k.x > L.zone[0] && Math.abs(k.x - L.x) > 700);
  // Hidden.
  let ch = create(makeEnv());
  place(ch, bush.x);
  step(ch, inp({ y: 1 }), 2);
  assert.ok(ch.pl.hidden);
  ch.look[0].state = 'look'; ch.look[0].t = 1.5; ch.look[0].lookFor = 1.5; ch.look[0].judged = false;
  step(ch, inp({ y: 1 }), 30);
  assert.equal(ch.caught, 0);
  // Frozen, far off.
  ch = create(makeEnv());
  place(ch, L.zone[0] + 60);
  step(ch, idle, 20);
  assert.ok(ch.pl.frozen);
  ch.look[0].state = 'look'; ch.look[0].t = 1.5; ch.look[0].lookFor = 1.5; ch.look[0].judged = false;
  step(ch, idle, 30);
  assert.equal(ch.caught, 0, 'a twig');
  // Frozen, close up.
  ch = create(makeEnv());
  place(ch, L.x - 300);
  step(ch, idle, 20);
  assert.ok(ch.pl.frozen);
  ch.look[0].state = 'look'; ch.look[0].t = 1.5; ch.look[0].lookFor = 1.5; ch.look[0].judged = false;
  step(ch, idle, 30);
  assert.equal(ch.caught, 1, 'not fooled');
});

test('b01: the sprinkler soaks him on the lane and costs time, but is not a catch', () => {
  const ch = create(makeEnv());
  place(ch, SPRINKLER.x - 400);
  const before = ch.time;
  step(ch, inp({ x: 1 }), 150);
  assert.ok(ch.time < before - 150 * DT - 1.5, 'soaked at least once');
  assert.equal(ch.caught, 0);
});

test('b01: Action snatches only at the mailbox', () => {
  const ch = create(makeEnv());
  place(ch, MAILBOX.x - 1200);
  step(ch, inp({ action: true, actionPressed: true }), 1);
  assert.equal(ch.done, false);
  place(ch, MAILBOX.x - 60);
  step(ch, idle, 2);
  step(ch, inp({ action: true, actionPressed: true }), 1);
  assert.equal(ch.done, true);
  assert.equal(ch.outcome, 'snatched');
  assert.deepEqual(ch.marks(), [2, 0], 'the snatch and the feat, not the stamps');
  for (let i = 0; i < 90; i++) ch.update(DT, idle, null);
});

test('b01: Gentle mode gives more time', () => {
  const a = create(makeEnv({ gentle: [false, false] }));
  const b = create(makeEnv({ gentle: [true, false] }));
  assert.ok(b.time > a.time + 30);
});

test('b01: the autopilot is never caught and gathers most of the stamps', () => {
  for (let seed = 1; seed <= 4; seed++) {
    const ch = create(makeEnv({ seed }));
    let t = 0;
    while (!ch.done && t < 300) { ch.update(DT, autopilot(ch), null); t += DT; }
    assert.equal(ch.outcome, 'snatched');
    assert.equal(ch.caught, 0, `seed ${seed}`);
    assert.ok(ch.got / ch.placed >= 0.6, `seed ${seed}: ${ch.got}/${ch.placed}`);
    assert.deepEqual(ch.marks(), [3, 0]);
    assert.ok(ch.time > ch.total * 0.2 && ch.time < ch.total * 0.5, `seed ${seed}: ${ch.time.toFixed(0)} s left of ${ch.total}`);
  }
});
