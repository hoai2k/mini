import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { pickGrabTarget, kickPlan, kickVelocities, grabMotion, kickMotion, yawTurn, GRAB, MOVE, GRAB_MOTION } from './grab.js';
const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const fwd = v(0, -1);
const debris = (x, y, z = 0, rad = 3) => ({ kind: 'debris', item: {}, pos: v(x, y, z), rad });
const protein = (x, y, z = 0) => ({ kind: 'protein', item: {}, pos: v(x, y, z), rad: 3 });

test('a sloppy aim still grabs debris or a protein within the generous reach (the assist)', () => {
  for (const t of [debris(25, -10), debris(-30, 5), debris(18, -18, 18), protein(40, -30), protein(0, -55)]) assert.equal(pickGrabTarget(v(0, 0), fwd, [t]).item, t.item);
});
test('nothing beyond the reach, and nothing well behind the baseplate', () => {
  assert.equal(pickGrabTarget(v(0, 0), fwd, [debris(0, -GRAB.reach - 4)]), null);
  assert.equal(pickGrabTarget(v(0, 0), fwd, [protein(0, 40)]), null); // straight behind, far
  assert.ok(pickGrabTarget(v(0, 0), fwd, [protein(0, 8)])); // ... but right at the baseplate, anywhere
});
test('the flat membrane is never a target: with no protein or debris in reach, nothing is grabbed', () => {
  // a cell's surface right under the fibres is not in the list at all: only its proteins are
  assert.equal(pickGrabTarget(v(0, 0), fwd, []), null);
  assert.equal(pickGrabTarget(v(0, 0), fwd, [{ kind: 'protein', item: {}, pos: v(0, -80), rad: 3 }]), null);
});
test('ahead wins over beside at a similar distance; a protein a little over debris; much nearer wins anyway', () => {
  const ahead = protein(0, -30), beside = protein(28, 0);
  assert.equal(pickGrabTarget(v(0, 0), fwd, [beside, ahead]).item, ahead.item);
  const p = protein(0, -30), d = debris(0, -29, 0, 0);
  assert.equal(pickGrabTarget(v(0, 0), fwd, [d, p]).item, p.item);
  const close = debris(0, -6);
  assert.equal(pickGrabTarget(v(0, 0), fwd, [close, protein(0, -40)]).item, close.item);
});
test('Y: on a cell launches off it, with debris kicks it, otherwise a kick-swim', () => {
  assert.equal(kickPlan({ hold: 'protein' }), 'cell');
  assert.equal(kickPlan({ hold: 'debris' }), 'debris');
  assert.equal(kickPlan({ touching: {} }), 'debris');
  assert.equal(kickPlan({ wall: v(0, 1) }), 'cell');
  assert.equal(kickPlan({}), 'swim');
});
test('the kick off a cell launches you backwards, away from it, strongly', () => {
  // the baseplate faces the cell (forward -y), the cell's normal +y: you go up, away from it
  const { self } = kickVelocities('cell', fwd, { normal: v(0, 1) });
  assert.ok(self.y > 0.9 * self.length() && self.length() >= 200, `launch ${self.toArray()}`);
  assert.ok(self.length() > MOVE.drive * 3);
});
test('a kick sends debris flying along the baseplate and you back a little; heavier goes slower', () => {
  const light = kickVelocities('debris', fwd, { mass: 0.5 }), heavy = kickVelocities('debris', fwd, { mass: 3 });
  assert.ok(light.thing.y < -150 && heavy.thing.y < 0 && heavy.thing.length() < light.thing.length());
  assert.ok(light.self.y > 0 && heavy.self.y > light.self.y && heavy.self.length() < 60);
  const swim = kickVelocities('swim', fwd);
  assert.ok(swim.self.y > 0 && swim.self.length() < 80 && swim.thing === null);
});
test('speed: cruising about 1.5-2x what it was, the dash about 3x the cruise', () => {
  assert.ok(MOVE.drive / MOVE.oldDrive >= 1.5 && MOVE.drive / MOVE.oldDrive <= 2);
  assert.ok(MOVE.dashMul >= 2.8 && MOVE.dashMul <= 3.5 && MOVE.dashT <= 0.4);
});
test('RS right turns the view right (its forward swings toward its right)', () => {
  const q = new THREE.Quaternion();
  q.multiply(new THREE.Quaternion().setFromAxisAngle(v(0, 1, 0), yawTurn(1, 1.6, 0.1)));
  const f = v(0, 0, -1).applyQuaternion(q);
  assert.ok(f.x > 0.1, `forward after RS right: ${f.toArray()}`);
});
test('the grab motion opens, then closes inward (never ends pushed out), and ends', () => {
  const at = (s) => grabMotion(1, 0, s);
  const rest = at(0), open = at(GRAB_MOTION.open), shut = at((GRAB_MOTION.close + GRAB_MOTION.hold) / 2);
  assert.ok(open.x > rest.x, 'opens first');
  assert.ok(shut.x < rest.x * 0.3 && shut.y < rest.y, 'then clutches inward, under the baseplate');
  assert.equal(at(GRAB_MOTION.hold + 0.01), null);
  // the kick: drawn in, then out straight ahead
  assert.ok(kickMotion(1, 0, 0.3).y < -15 && kickMotion(1, 0, 0.3).x < 8);
});
