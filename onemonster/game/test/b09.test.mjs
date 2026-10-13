// Board 9, FLIP-FLOP: the Grithix's own rules. The contract (idle, mashing,
// the autopilot) is covered by test/adventure.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create, { autopilot } from '../src/adventure/b09.js';

const g = stubContext();
const DT = 1 / 30;
const inp = (o = {}) => ({ ...idle, ...o });
const run = (ch, secs, input = idle) => { for (let t = 0; t < secs; t += DT) { ch.update(DT, typeof input === 'function' ? input() : input, null); } ch.draw(g, secs); };

// Clear the wood of hazards near x so a test can stand there in peace.
function stand(ch, x) {
  ch.body.x = x; ch.body.y = ch.GY; ch.body.vx = 0; ch.body.vy = 0; ch.body.onGround = true;
  run(ch, 1.0);
}

test('board 9: Gentle mode gives more time', () => {
  assert.equal(create(makeEnv()).time, 150);
  assert.equal(create(makeEnv({ gentle: [true, false] })).time, 195);
});

test('board 9: striding over a root trips him; a high step clears it', () => {
  const ch = create(makeEnv());
  const root = ch.ROOTS[0];
  stand(ch, root - 200);
  run(ch, 1.4, inp({ x: 1 }));
  assert.equal(ch.trips, 1, 'a plain stride over the root trips him');
  assert.ok(ch.body.x < root + 120, 'and he loses his way for a moment');
  const ch2 = create(makeEnv());
  stand(ch2, root - 200);
  run(ch2, 2.5, inp({ x: 1, y: -1 }));
  assert.equal(ch2.trips, 0, 'holding up steps high over it');
  assert.ok(ch2.body.x > root + 60, 'and he is past it');
});

test('board 9: the net reaches exactly where the hoop is drawn', () => {
  const ch = create(makeEnv());
  stand(ch, 300);
  // Wind up and sweep: the hoop is out in front during the sweep.
  ch.update(DT, inp({ actionPressed: true, action: true }), null);
  run(ch, 0.25, inp({ action: true }));
  assert.equal(ch.mode, 'sweep');
  const hp = ch.hoopAt();
  assert.ok(hp && hp.x > ch.body.x + 80 && hp.y < ch.body.y - 150, `the hoop is ahead and up: ${JSON.stringify(hp)}`);
  // A Bombanat parked in the hoop is netted; one well outside it is not.
  const a = ch.flock[0], b = ch.flock[1];
  a.x = hp.x; a.y = hp.y; a.cx = 0; a.cy = 0;
  b.x = hp.x + 200; b.y = hp.y; b.cx = 0; b.cy = 0;
  ch.update(DT, inp({ action: true }), null);
  assert.equal(a.got, true);
  assert.equal(b.got, false);
  assert.equal(ch.got, 1);
});

test('board 9: a low scoop reaches the ground, an overhead swing reaches higher', () => {
  const low = create(makeEnv());
  stand(low, 300);
  low.update(DT, inp({ actionPressed: true, action: true, y: 1 }), null);
  run(low, 0.25, inp({ action: true, y: 1 }));
  const hl = low.hoopAt();
  const up = create(makeEnv());
  stand(up, 300);
  up.update(DT, inp({ actionPressed: true, action: true, y: -1 }), null);
  run(up, 0.25, inp({ action: true, y: -1 }));
  const hu = up.hoopAt();
  assert.ok(hl.y > up.GY - 90, `the scoop is near the ground: ${hl.y}`);
  assert.ok(hu.y < hl.y - 150, `the overhead swing is well above it: ${hu.y}`);
});

test('board 9: a vault needs a run-up, clears a gap, and a fall sends him back to the signpost', () => {
  const ch = create(makeEnv());
  const s = ch.streams[0];
  // Standing still, Sprint does nothing.
  stand(ch, s.x0 - 300);
  ch.update(DT, inp({ sprint: true }), null);
  assert.notEqual(ch.mode, 'vault');
  // Striding, Sprint plants the pole; he comes down on the far bank.
  run(ch, 0.6, inp({ x: 1 }));
  let frames = 0;
  run(ch, 1.5, () => inp({ x: 1, sprint: frames++ === 0 }));
  assert.equal(ch.soaks, 0);
  assert.ok(ch.body.x > s.x1 && ch.body.y === ch.GY, `landed on the far bank at ${ch.body.x}`);
  // Walking into the stream splashes him back to the last signpost.
  const ch2 = create(makeEnv());
  stand(ch2, s.x0 - 100);
  run(ch2, 1.5, inp({ x: 1 }));
  assert.equal(ch2.soaks, 1);
  assert.ok(Math.abs(ch2.body.x - (ch2.cps.last + 80)) < 20, `back at the signpost: ${ch2.body.x}`);
});

test('board 9: Action posts only at the mailbox, only with the letter', () => {
  const ch = create(makeEnv());
  stand(ch, ch.MAIL_X);
  run(ch, 2, inp({ actionPressed: true, action: true }));
  assert.equal(ch.done, false, 'no letter yet: nothing to post');
  // Net the letter Bombanat: it comes to the net.
  stand(ch, ch.LOOP.x);
  ch.bomb.mode = 'loop';
  ch.update(DT, inp({ actionPressed: true, action: true }), null);
  run(ch, 0.25, inp({ action: true }));
  const hp = ch.hoopAt();
  ch.bomb.x = hp.x; ch.bomb.y = hp.y;
  ch.update(DT, inp({ action: true }), null);
  assert.equal(ch.phase, 'carry');
  assert.ok(ch.bag.has('bombanat'));
  stand(ch, ch.MAIL_X - 400);
  run(ch, 1.5, inp({ actionPressed: true, action: true }));
  assert.equal(ch.done, false, 'too far from the mailbox');
  stand(ch, ch.MAIL_X - 60);
  run(ch, 1.5, inp({ actionPressed: true, action: true }));
  assert.equal(ch.done, true);
  assert.equal(ch.outcome, 'snatched');
  assert.equal(ch.marks()[0], 1, 'the snatch, but few jars and not everybody netted');
  run(ch, 2.5); // the outro keeps drawing
});

test('board 9: the feat needs the Trollusk and the Yalapappus in the bag too', () => {
  for (const everybody of [false, true]) {
    const ch = create(makeEnv());
    for (const f of ch.flock) { f.got = true; f.t = 9; } // every jar full
    if (everybody) { ch.tro.netted = true; ch.bag.add('trollusk'); ch.yal.netted = true; ch.bag.add('yalapappus'); }
    // The phase turns to 'carry' only through a real catch in the hoop.
    stand(ch, ch.MAIL_X - 60);
    ch.bomb.mode = 'loop';
    ch.update(DT, inp({ actionPressed: true, action: true }), null);
    run(ch, 0.25, inp({ action: true }));
    const hp = ch.hoopAt();
    ch.bomb.x = hp.x; ch.bomb.y = hp.y;
    ch.update(DT, inp({ action: true }), null);
    run(ch, 1.0);
    assert.equal(ch.phase, 'carry');
    run(ch, 1.5, inp({ actionPressed: true, action: true }));
    assert.equal(ch.outcome, 'snatched');
    assert.equal(ch.marks()[0], everybody ? 3 : 2);
  }
});

test('board 9: the autopilot nets everybody and most of the jars', () => {
  const ch = create(makeEnv({ seed: 3 }));
  let t = 0;
  while (!ch.done && t < 400) { ch.update(DT, autopilot(ch), null); t += DT; }
  assert.equal(ch.outcome, 'snatched');
  assert.deepEqual(ch.marks(), [3, 0]);
  assert.ok(ch.time > 150 * 0.2 && ch.time < 150 * 0.5, `time left ${ch.time.toFixed(1)}`);
});
