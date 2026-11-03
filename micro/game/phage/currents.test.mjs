import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { createCurrents, carriedPath, CURRENT } from './currents.js';

function seeded(seed = 7) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const DT = 1 / 60;
/** A free body at `at` carried by the water (eased toward its flow, as main.js does) vs one holding on. */
function ride(holding) {
  const c = createCurrents({ rng: seeded() });
  const p = new THREE.Vector3(0, 0, 0), v = new THREE.Vector3(), f = new THREE.Vector3();
  c.start(p, new THREE.Vector3(1, 0, 0));
  let firstFlow = null;
  for (let t = 0; c.active; t += DT) {
    c.update(DT);
    c.flowAt(p, f);
    if (firstFlow == null && f.length() > 0.5) firstFlow = t;
    if (holding) continue;
    v.lerp(f, 1 - Math.exp(-DT * 2.5));
    p.addScaledVector(v, DT);
  }
  return { moved: p.length(), firstFlow };
}

test('a current is seen coming: no flow where it is aimed for its first ~3 s', () => {
  const { firstFlow } = ride(false);
  assert.ok(firstFlow > 2.5 && firstFlow < CURRENT.warn + 1, `first flow at ${firstFlow}`);
});
test('it carries an unanchored body to a new area; holding on, nothing moves', () => {
  const free = ride(false), held = ride(true);
  assert.ok(free.moved > 150 && free.moved < 700, `carried ${free.moved}`);
  assert.equal(held.moved, 0);
});
test('occasional: one at a time, 30-60 s apart, and only when one can be sent fairly', () => {
  const c = createCurrents({ rng: seeded(3) });
  const starts = [];
  let fair = true;
  for (let t = 0; t < 600; t += DT) {
    if (c.update(DT, () => (fair ? { target: new THREE.Vector3(), dir: new THREE.Vector3(0, 1, 0) } : null)) === 'start') starts.push(t);
  }
  assert.ok(starts[0] >= CURRENT.first - 0.1);
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= 30, `gap ${starts[i] - starts[i - 1]}`);
  assert.ok(starts.length >= 6 && starts.length <= 20, `${starts.length} in 10 min`);
  // none when none is fair
  const d = createCurrents({ rng: seeded(3) }); fair = false;
  let n = 0; for (let t = 0; t < 300; t += DT) if (d.update(DT, () => null) === 'start') n++;
  assert.equal(n, 0);
});
test('the carried path runs from the target along the current', () => {
  const pts = carriedPath(new THREE.Vector3(1, 2, 3), new THREE.Vector3(0, 0, 1), 80, 40);
  assert.deepEqual(pts.map((p) => p.z), [3, 43, 83]);
});
