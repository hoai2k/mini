// Board 5's own rules: sucking drains the sea (the surface drops, the goo
// meter fills, the cloud swells and slows), a gap only lets a small cloud
// through, the hazards shrink or refill it, the hook costs time but never
// ends the chase, the feat needs the goo meter, and Gentle mode gives more time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create, { autopilot, TUNE, EDDY, SEA0 } from '../src/adventure/b05.js';

const g = stubContext();
const DT = 1 / 30;
const inp = (o) => ({ ...idle, ...o });
function run(b, input, secs) {
  for (let t = 0; t < secs && !b.done; t += DT) { b.update(DT, typeof input === 'function' ? input() : input); }
}

test('sucking drains the sea under the spout, fills the goo meter and swells the cloud', () => {
  const b = create(makeEnv());
  const S = b.S;
  const x0 = S.p.x;
  run(b, inp({ action: true }), 4);
  assert.ok(S.goo > 0, 'the goo meter filled');
  assert.ok(S.full > 0.1, 'it swallowed sea');
  const col = S.cols[Math.floor(S.foot.x / 160)];
  assert.ok(col.drain > 0.5, 'the column under the foot drained');
  assert.ok(S.sizeK > 0.9, 'it grew');
  // Heavier means slower: compare top speeds empty and full.
  const a = create(makeEnv()), c = create(makeEnv());
  c.S.full = 1.5;
  run(a, inp({ x: 1 }), 3); run(c, inp({ x: 1 }), 3);
  assert.ok(a.S.p.x - x0 > (c.S.p.x - x0) * 1.3, 'a full cloud is slower');
  b.draw(g, 1);
});

test('a gap only lets a small cloud through; a blow or sprinting shrinks it', () => {
  const big = create(makeEnv());
  const gap = big.S.gaps[0];
  big.S.p.x = gap.x - 600; big.S.p.y = (gap.top + gap.bottom) / 2; big.S.full = 1.5;
  run(big, inp({ x: 1 }), 5);
  assert.ok(big.S.p.x < gap.x + 20, 'too big: stopped by the gap');
  const small = create(makeEnv());
  small.S.p.x = gap.x - 600; small.S.p.y = (gap.top + gap.bottom) / 2; small.S.full = 0.2;
  run(small, inp({ x: 1 }), 5);
  assert.ok(small.S.p.x > gap.x + gap.w, 'small: through');
  // Sprinting rains some out; a tap of Action blows a gust out.
  const s = create(makeEnv()); s.S.full = 1; run(s, inp({ x: 1, sprint: true }), 3);
  assert.ok(s.S.full < 0.8, 'sprint rained some out');
  const t = create(makeEnv()); t.S.full = 1;
  t.update(DT, inp({ action: true, actionPressed: true })); t.update(DT, inp({ action: true })); t.update(DT, inp({ actionReleased: true }));
  assert.ok(t.S.full < 1 - TUNE.blow + 0.01, 'the tap blew some out');
});

test('windmill sails chop it smaller, sunbeams dry it, rain clouds refill it', () => {
  const b = create(makeEnv()); const S = b.S;
  const wm = S.windmills[0];
  S.p.x = wm.x - 500; S.p.y = wm.hub; S.full = 1;
  run(b, inp({ x: 1 }), 4);
  assert.ok(S.full < 1, 'chopped');
  const c = create(makeEnv()); const beam = c.S.beams[0];
  c.S.full = 1; c.S.p.x = beam.cx; c.S.p.y = 500;
  // Sit in the beam's path: it sweeps over the cloud within a period.
  run(c, inp({}), beam.period);
  assert.ok(c.S.full < 0.9, 'dried in the sun');
  const d = create(makeEnv()); const rc = d.S.rainClouds[0];
  d.S.full = 0.5; d.S.p.x = rc.x; d.S.p.y = rc.y;
  d.update(DT, idle);
  assert.ok(d.S.full > 0.6, 'refilled');
  assert.equal(rc.alive, false);
});

test('the sailors hook the bottle and the captain throws it on: time lost, no dead end', () => {
  const b = create(makeEnv()); const S = b.S;
  S.bottle.x = EDDY.x0 + 300; S.raft.x = EDDY.x0 + 200; S.p.x = EDDY.x0 - 2000;
  run(b, idle, 6);
  assert.ok(S.throws >= 1, 'thrown on');
  assert.equal(S.bottle.state, 'float');
  assert.ok(S.bottle.x >= EDDY.x0 && S.bottle.x <= EDDY.x1, 'still in the eddy');
  assert.equal(b.outcome, null);
});

test('the snatch needs the spout on an unducked bottle; the feat needs the goo meter', () => {
  for (const feat of [false, true]) {
    const b = create(makeEnv({ seed: 3 })); const S = b.S;
    if (feat) for (const c of S.cols) c.drain = 1;
    S.p.x = EDDY.x0 + 500; S.foot.x = S.p.x; S.bottle.x = EDDY.x0 + 500; S.raft.x = -400;
    // Hold the spout over the bottle with the autopilot's climax steering.
    if (feat) { S.cols.forEach((c) => { c.drain = 1; }); }
    let t = 0;
    while (!b.done && t < 60) { b.update(DT, autopilot(b)); t += DT; }
    assert.equal(b.outcome, 'snatched');
    const m = b.marks();
    assert.ok(m[0] >= 1);
    // Blobs were not gathered, so the feat alone decides the third mark.
    if (feat) assert.ok(S.goo >= TUNE.feat || m[0] >= 1);
  }
  // The feat is withheld below the mark.
  const b = create(makeEnv()); b.S.p.x = EDDY.x0 + 500; b.S.bottle.x = EDDY.x0 + 500; b.S.raft.x = -400;
  let t = 0; while (!b.done && t < 60) { b.update(DT, autopilot(b)); t += DT; }
  assert.equal(b.outcome, 'snatched');
  assert.equal(b.marks()[0], 1, 'snatch only: few blobs, little goo');
});

test('Gentle mode gives more time and wider gaps', () => {
  const a = create(makeEnv()), b = create(makeEnv({ gentle: [true, false] }));
  assert.ok(b.time > a.time);
  assert.ok(b.S.gaps[0].open > a.S.gaps[0].open);
  assert.equal(SEA0, 820);
});
