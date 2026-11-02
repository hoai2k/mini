import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { pickGrabTarget, surfacePart, GRAB } from './grab.js';
const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const fwd = v(0, -1);
const mol = (x, y, z = 0) => ({ pos: v(x, y, z) });
const cell = (point, d) => ({ host: {}, point, normal: v(0, 1), d });

test('a sloppy aim still grabs a molecule within the reach (auto-aim)', () => {
  // well off the baseplate's line, beside it, even a little behind: all in reach, all taken
  for (const m of [mol(25, -10), mol(-30, 5), mol(0, 20), mol(18, -18, 18)]) assert.equal(pickGrabTarget(v(0, 0), fwd, [m], []).mol, m);
});
test('nothing beyond the reach', () => {
  assert.equal(pickGrabTarget(v(0, 0), fwd, [mol(0, -GRAB.reach - 1)], [cell(v(0, -50), 50)]), null);
});
test('ahead wins over beside or behind at a similar distance; much nearer wins anyway', () => {
  const ahead = mol(0, -20), behind = mol(0, 18);
  assert.equal(pickGrabTarget(v(0, 0), fwd, [behind, ahead], []).mol, ahead);
  const close = mol(0, 6);
  assert.equal(pickGrabTarget(v(0, 0), fwd, [close, mol(0, -30)], []).mol, close);
});
test('near a cell, a grab almost anywhere anchors: any surface point in reach', () => {
  for (const [p, d] of [[v(0, -30), 30], [v(30, 0), 30], [v(0, 25), 25], [v(-20, -20), 28]]) {
    const c = cell(p, d);
    const got = pickGrabTarget(v(0, 0), fwd, [], [c]);
    assert.equal(got.kind, 'cell'); assert.equal(got.cell, c);
  }
});
test('the surface part is stable for a point; a wrong host is all wall', () => {
  assert.equal(surfacePart(v(3, 4, 5)), surfacePart(v(3, 4, 5)));
  assert.equal(surfacePart(v(3, 4, 5), true), 'its thick wall');
});
