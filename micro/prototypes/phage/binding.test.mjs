import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { attachmentForward, aimedProtein } from './binding.js';
const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const protein = (position, compatible = true) => ({ position, compatible, host: {} });
const pick = (items, q = new THREE.Quaternion()) => aimedProtein(v(0, 0), attachmentForward(q), items, (p) => p.position.clone());

test('attachment end leads in every steering direction', () => {
  for (const direction of [v(1, 0), v(-1, 0), v(0, 1), v(0, -1), v(1, 1).normalize()]) {
    const q = new THREE.Quaternion().setFromUnitVectors(v(0, 1), direction.clone().negate());
    assert.ok(attachmentForward(q).distanceTo(direction) < 1e-8);
  }
});
test('grab selects the aimed protein regardless of whether it fits', () => {
  const wrong = protein(v(0, -17), false), right = protein(v(10, -20));
  assert.equal(pick([right, wrong]), wrong);
  assert.equal(pick([right]), right);
});
test('proteins behind, sideways, too far away or on unavailable hosts cannot latch', () => {
  const locked = protein(v(0, -12)); locked.host.locked = true;
  const burst = protein(v(0, -15)); burst.host.burst = true;
  assert.equal(pick([protein(v(0, 14)), protein(v(20, -10)), protein(v(0, -32)), locked, burst]), null);
  assert.equal(pick([protein(v(0, -15, 20))]), null);
});
test('turning the phage changes the aim cone rather than allowing a backwards grab', () => {
  const right = protein(v(18, 0)), below = protein(v(0, -18));
  const q = new THREE.Quaternion().setFromUnitVectors(v(0, 1), v(-1, 0));
  assert.equal(pick([below, right], q), right);
});
