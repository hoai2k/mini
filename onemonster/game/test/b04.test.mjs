// Board 4, SCRUNNCCCHHH!!: the Ice-Ferg's own rules. A charge smashes a crate
// but a drift only shoves it; a charge into a reef cracks a chunk off and a sea
// lion slides off; a sunk berg slips under the pier where a floating one bumps;
// warm water melts it; ramming the Peg is the snatch, a sunk charge is not;
// the feat needs eight sea lions aboard; Gentle mode gives more time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create, { autopilot, WL, HARBOUR_X, TUNE } from '../src/adventure/b04.js';

const g = stubContext();
const DT = 1 / 60;
const inp = (o = {}) => ({ ...idle, ...o });

// Run the board for `secs` with a fixed input (or a function of the board).
function run(ch, secs, input) {
  for (let t = 0; t < secs; t += DT) {
    ch.update(DT, typeof input === 'function' ? input(ch) : input, null);
  }
}
// Huff up for `hold` seconds, then let go, aimed the way `x` points.
function charge(ch, hold = 1.6, x = 1) {
  run(ch, hold, inp({ action: true, x }));
  ch.update(DT, inp({ x, actionReleased: true }), null);
  assert.equal(ch.ferg.mode, 'windup');
}
const thing = (ch, kind, near) => ch.things.filter((t) => t.kind === kind).sort((a, b) => Math.abs(a.x - near) - Math.abs(b.x - near))[0];

test('b04: a charge smashes a crate in splinters; a drift only shoves it along', () => {
  const ch = create(makeEnv());
  const crate = thing(ch, 'crate', 1200);
  ch.ferg.x = crate.x - 420;
  charge(ch);
  run(ch, 1.2, idle);
  assert.equal(crate.alive, false, 'smashed');
  // Drifting into the next one shoves it ahead instead.
  const crate2 = thing(ch, 'crate', 2900);
  ch.ferg.x = crate2.x - 300; ch.ferg.vx = 0; ch.ferg.mode = 'drift';
  const x0 = crate2.x;
  run(ch, 3, inp({ x: 1 }));
  assert.equal(crate2.alive, true, 'still afloat');
  assert.ok(crate2.x > x0 + 50, 'shoved along');
  ch.draw(g, 1);
});

test('b04: a charge into a reef cracks the ice and a sea lion slides off; risen it floats over', () => {
  const ch = create(makeEnv());
  const reef = thing(ch, 'reef', 3900);
  ch.ferg.riders = 3;
  for (let i = 0; i < 3; i++) ch.riders.push({ slot: i, state: 'doze', t: 0 });
  ch.ferg.x = reef.x - 400;
  charge(ch);
  run(ch, 0.8, idle);
  assert.equal(ch.ferg.mode, 'dazed', 'dazed by the crack');
  assert.equal(ch.ferg.riders, 2, 'one sea lion off');
  assert.equal(ch.strays.length, 1, 'it swims by to be picked up again');
  assert.ok(ch.ferg.x < reef.x, 'held back');
  // Risen, it drifts over the same reef.
  const ch2 = create(makeEnv());
  ch2.ferg.x = reef.x - 400;
  run(ch2, 2, inp({ y: -1 })); // rise first
  assert.ok(ch2.ferg.level > TUNE.reefLevel);
  run(ch2, 6, inp({ x: 1, y: -1 }));
  assert.ok(ch2.ferg.x > reef.x + 100, 'floated over');
  assert.equal(ch2.ferg.riders, 0);
});

test('b04: the pier blocks a floating berg; sunk, it slips under', () => {
  const ch = create(makeEnv());
  const pier = thing(ch, 'pier', 10000);
  ch.ferg.x = pier.x - pier.hw - 450;
  run(ch, 7, inp({ x: 1 }));
  assert.ok(ch.ferg.x < pier.x - pier.hw, 'bumped at the deck');
  const ch2 = create(makeEnv());
  ch2.ferg.x = pier.x - pier.hw - 450;
  run(ch2, 10, inp({ x: 1, y: 1 }));
  assert.ok(ch2.ferg.x > pier.x, 'under and through');
});

test('b04: warm water melts it smaller and faster; it refreezes slowly', () => {
  const ch = create(makeEnv());
  const zone = ch.ZONES[0];
  ch.ferg.x = zone.x0 + 50;
  run(ch, 3, inp({ x: 0 }));
  assert.ok(ch.ferg.size < 0.9, `melted to ${ch.ferg.size}`);
  assert.ok(ch.ferg.size >= TUNE.ferg.minSize);
  const small = ch.ferg.size;
  ch.ferg.x = 300;
  run(ch, 4, idle);
  assert.ok(ch.ferg.size > small, 'refreezes out of the warm water');
  // Sunk under the current, it does not melt.
  const ch2 = create(makeEnv());
  ch2.ferg.x = zone.x0 + 50;
  run(ch2, 2, inp({ y: 1 }));
  const before = ch2.ferg.size;
  run(ch2, 3, inp({ y: 1 }));
  assert.ok(ch2.ferg.size >= before - 0.01, 'no melt under the surface');
});

test('b04: ramming the Peg is the snatch; a sunk charge slips under; the feat needs eight sea lions', () => {
  for (const riders of [8, 3]) {
    const ch = create(makeEnv());
    ch.peg.x = 6000; ch.peg.sp = 0; ch.peg.steamCd = 99;
    ch.ferg.x = 5600;
    ch.ferg.riders = riders;
    charge(ch);
    run(ch, 1.5, idle);
    assert.equal(ch.outcome, 'snatched');
    assert.ok(ch.done);
    assert.equal(ch.marks()[0], riders >= 8 ? 3 : 1); // few sea lions found: no collect mark
    assert.equal(ch.featDone, riders >= 8);
    for (let i = 0; i < 120; i++) { ch.update(DT, idle, null); ch.draw(g, i * DT); }
  }
  const ch = create(makeEnv());
  ch.peg.x = 6000; ch.peg.sp = 0; ch.peg.steamCd = 99;
  ch.ferg.x = 5600;
  run(ch, 2, inp({ y: 1 }));
  run(ch, 1.6, inp({ action: true, x: 1, y: 1 }));
  ch.update(DT, inp({ x: 1, y: 1, actionReleased: true }), null);
  run(ch, 1.5, inp({ y: 1 }));
  assert.equal(ch.outcome, null, 'slipped under, no snatch');
  assert.ok(ch.ferg.x > 6000, 'and came out the other side');
});

test('b04: the Peg reaching the harbour keeps the letter; Gentle mode gives more time', () => {
  const ch = create(makeEnv());
  ch.peg.x = HARBOUR_X - 60;
  run(ch, 2, idle);
  assert.ok(ch.done);
  assert.equal(ch.outcome, 'kept');
  assert.deepEqual(ch.marks(), [0, 0]);
  assert.equal(create(makeEnv({ gentle: [true, false] })).time, 156);
  assert.equal(create(makeEnv()).time, 120);
});

test('b04: sea lions hop aboard from floes and from the water; the autopilot gathers most', () => {
  const ch = create(makeEnv());
  assert.equal(ch.lions.total, 37);
  const floe = thing(ch, 'floe', 800);
  ch.ferg.x = floe.x - 500;
  run(ch, 6, inp({ x: 1 }));
  assert.ok(ch.ferg.riders >= 1, 'hopped aboard');
  assert.equal(ch.hud(), `Sea lions aboard ${ch.ferg.riders} · found ${ch.lions.count}/37`);
  const ch2 = create(makeEnv({ seed: 3 }));
  let t = 0;
  while (!ch2.done && t < 200) { ch2.update(1 / 30, autopilot(ch2), null); t += 1 / 30; }
  assert.equal(ch2.outcome, 'snatched');
  assert.ok(ch2.lions.count >= 0.6 * 37, `found ${ch2.lions.count}`);
  assert.ok(ch2.time > 25 && ch2.time < 60, `time left ${ch2.time}`);
  const f = ch2.focus()[0];
  assert.ok(f.y > 0 && f.y < WL + 200);
});
