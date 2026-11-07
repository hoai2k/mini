import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSundews, mossTop } from './world.js';

let seed = 11;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const group = new THREE.Group();
const sundews = buildSundews(group, random, null);

test('every resting sundew blade touches the water or supporting moss', () => {
  assert.ok(sundews.leaves.length > 100);
  group.updateMatrixWorld(true);
  for (const leaf of sundews.leaves) {
    const ground = Math.max(0, mossTop(leaf.x, leaf.z));
    const bounds = new THREE.Box3().setFromObject(leaf.blade);
    assert.ok(Math.abs(bounds.min.y - ground) < 1e-6, 'no gap beneath the rendered blade');
    assert.equal(sundews.leafAt(leaf.x, ground, leaf.z), leaf, 'a walker at ground height touches the glue');
  }
});

test('jumping clear of a leaf stays safe, descending onto it still contacts glue', () => {
  for (const leaf of sundews.leaves) {
    assert.equal(sundews.leafAt(leaf.x, leaf.y + 2, leaf.z), null);
    assert.equal(sundews.leafAt(leaf.x, leaf.y, leaf.z), leaf);
  }
});
