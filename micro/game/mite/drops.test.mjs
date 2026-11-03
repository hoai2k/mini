// The mite world's falling drops (life.js createDrops), without a browser: set
// falling, they land at random spots round the player who came near, never on
// anyone (the owner, 2026-11-02: "definitely don't aim them at the player"),
// a ring marking each spot first; the bead a drop leaves only slows a mite in
// it (wetAt), and soaks away.
//   node --test micro/game/mite/drops.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrops, scatterSpot } from './life.js';
import { DRIP, clearOfThickets } from './layout.js';

const scene = { add() {} };
// a seeded 0..1 source, so a failure repeats
const rng = (seed) => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;

test('scatterSpot: never within DRIP.clear of any player, within DRIP.scatter of the one who came near', () => {
  const rand = rng(7);
  for (let i = 0; i < 400; i++) {
    const p = { x: (rand() - 0.5) * 40000, z: (rand() - 0.5) * 40000 }, q = { x: p.x + 600, z: p.z - 300 };
    const s = scatterSpot(p, [p, q], rand);
    if (!s) continue;
    for (const o of [p, q]) assert.ok(Math.hypot(s.x - o.x, s.z - o.z) >= DRIP.clear, 'clear of every player');
    assert.ok(Math.hypot(s.x - p.x, s.z - p.z) <= DRIP.scatter + 1e-6, 'in sight of the one who came near');
    assert.ok(clearOfThickets(s.x, s.z, DRIP.r, 0), 'not in a thicket');
  }
});

test('a shower falls round the player, never on them, after its warning ring', () => {
  const D = createDrops({ scene, n: DRIP.shower, rand: rng(3) });
  D.arm([{ x: 3000, z: 0, delay: 0 }, { x: 3500, z: 500, delay: 0.55 }, { x: 3500, z: -500, delay: 1.1 }]);
  const me = { x: 1000, z: 0 };
  let fall = null; const splashes = [];
  for (let t = 0; t < 8; t += 1 / 30) {
    for (const e of D.update(1 / 30, [me])) {
      if (e.type === 'fall') { fall = t; for (const d of D.drops) if (d.state === 'armed') assert.ok(d.ring.visible, 'each spot is marked before it lets go'); }
      if (e.type === 'splash') splashes.push({ ...e, t });
    }
  }
  assert.ok(fall !== null, 'it fell');
  assert.equal(splashes.length, DRIP.shower);
  for (const s of splashes) {
    assert.ok(Math.hypot(s.x - me.x, s.z - me.z) >= DRIP.clear, `landed ${Math.round(Math.hypot(s.x - me.x, s.z - me.z))} µm away`);
    assert.ok(s.t - fall >= DRIP.warn, 'not before the warning');
  }
  assert.equal(D.state, 'done');
});

test('a drop landing on a mite only leaves a bead to climb out of', () => {
  const D = createDrops({ scene, n: 1 });
  D.fallAt([{ x: 0, z: 0, delay: 0 }]);
  let w = 0, t = 0;
  for (; t < 3 && !w; t += 1 / 30) { D.update(1 / 30, [{ x: 0, z: 0 }]); w = D.wetAt(0, 0, 175); }
  assert.ok(w > 0.9, 'in the bead once it lands');
  assert.ok(D.wetAt(1500, 0, 175) === 0, 'not far off');
  for (let i = 0; i < 6 * 30; i++) D.update(1 / 30, [{ x: 0, z: 0 }]);
  assert.equal(D.wetAt(0, 0, 175), 0, 'the bead soaks away');
});
