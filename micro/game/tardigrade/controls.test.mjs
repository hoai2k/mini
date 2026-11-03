// The owner's controls (2026-11-02): the stick pointing behind the tardigrade
// backs it up (no turn) while the side turns it, and one press of X with food
// in reach starts a meal that runs to the end with X let go. Builds the world
// in Node (no browser).
//   node --test micro/game/tardigrade/controls.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { World } from './world.js';
import { Walker, wantsBack, BACK_IN, BACK_OUT, BACK_K, WALK_MAX } from './gait.js';
import { Creature } from './creature.js';
import { Life } from './life.js';

const world = new World({ add() {} });
const scene = { add() {}, remove() {} };
const deg = (d) => (d * Math.PI) / 180;
const heading = (w) => Math.atan2(w.hv, w.hu);
/** A stick on the leaf at `ang` from the walker's heading, as a world direction. */
const stick = (w, ang) => {
  const c = Math.cos(ang), s = Math.sin(ang);
  return w.leaf.dirWorld(w.hu * c - w.hv * s, w.hu * s + w.hv * c).normalize();
};
const spot = () => { const it = world.food.find((f) => f.side === 1 && f.u > 4 && f.u < f.leaf.len - 4); return it; };
function walker() {
  const c = new Creature(scene);
  const w = new Walker(world, c, { catch() {}, slip() {}, fall() {}, transfer() {} }, { backward: true, gravity: false });
  const it = spot();
  w.spawn(it.leaf, 1, it.u - 2.5, it.v, 1, 0);
  return { w, c };
}
const step = (w, dir, mag = 1) => w.update(1 / 30, { dir: dir || new THREE.Vector3(), mag: dir ? mag : 0, film: 1, energy: 1 });

test('the back cone: in at ±45° of straight behind, out past ±60° (hysteresis)', () => {
  assert.equal(wantsBack(Math.PI, false), true);
  assert.equal(wantsBack(Math.PI - BACK_IN + 0.01, false), true);
  assert.equal(wantsBack(Math.PI - deg(55), false), false, 'not backing yet: 55° off behind turns');
  assert.equal(wantsBack(Math.PI - deg(55), true), true, 'already backing: 55° keeps backing');
  assert.equal(wantsBack(Math.PI - BACK_OUT - 0.01, true), false);
  assert.equal(wantsBack(deg(90), false), false, 'the side turns');
  assert.equal(wantsBack(-Math.PI + deg(30), false), true);
});

test('stick behind: it backs up, slower than forward, its heading unchanged', () => {
  const { w } = walker();
  const h0 = heading(w), p0 = w.dispPos.clone(), f0 = w.forward.clone();
  let top = 0;
  for (let i = 0; i < 90; i++) { step(w, stick(w, Math.PI)); top = Math.max(top, w.speed); assert.ok(w.backing); }
  assert.ok(Math.abs(heading(w) - h0) < 1e-6, 'no turn');
  const along = w.dispPos.clone().sub(p0).dot(f0);
  assert.ok(along < -0.8, `moved backwards (${along.toFixed(2)})`);
  assert.ok(top <= WALK_MAX * BACK_K + 1e-6 && top > 0.3, `back speed ${top}`);
  // a little to one side curves the backward path gently
  const h1 = heading(w);
  for (let i = 0; i < 30; i++) step(w, stick(w, Math.PI - deg(30)));
  assert.ok(w.backing);
  const turned = Math.abs(heading(w) - h1);
  assert.ok(turned > deg(5) && turned < deg(35), `curved ${(turned * 180 / Math.PI).toFixed(1)}°`);
});

test('stick to the side: it turns, as before', () => {
  const { w } = walker();
  const h0 = heading(w);
  for (let i = 0; i < 30; i++) step(w, stick(w, deg(90)));
  assert.equal(w.backing, false);
  assert.ok(Math.abs(heading(w) - h0) > deg(25));
  // and the stick let go ends a backing
  for (let i = 0; i < 10; i++) step(w, stick(w, Math.PI));
  assert.ok(w.backing);
  step(w, null);
  assert.equal(w.backing, false);
});

test('one press of X with food in reach starts the meal; it runs to the end with X let go', () => {
  const c = new Creature(scene);
  const w = new Walker(world, c, { catch() {}, slip() {}, fall() {}, transfer() {} }, { backward: true, gravity: false });
  const toasts = [];
  const life = new Life(world, w, c, { toast: (s) => toasts.push(s), rumble() {} });
  const it = spot();
  // the item under the front quarter of the body (body x ≈ 1.4 of the 1.84 to the mouth)
  w.spawn(it.leaf, 1, it.u - 1.4, it.v, 1, 0);
  const idle = { yDown: false, yPressed: false, bitePressed: false, aPressed: false };
  life.update(1 / 30, idle);
  assert.equal(life.target, it, 'highlighted');
  life.update(1 / 30, { ...idle, bitePressed: true });
  assert.ok(life.feeding && life.feeding.item === it, 'eating on the press');
  let t = 0;
  while (life.feeding && t < 60) { w.update(1 / 30, { dir: new THREE.Vector3(), mag: 0, film: 1, energy: 1 }); life.update(1 / 30, idle); t += 1 / 30; }
  assert.equal(life.feeding, null);
  assert.ok(!world.food.includes(it), 'eaten');
  // a quick double tap does not spit out what the first press started
  const it2 = world.food.find((f) => f.side === 1 && f.leaf === it.leaf && f !== it) || spot();
  w.spawn(it2.leaf, 1, it2.u - 1.4, it2.v, 1, 0);
  life.update(1 / 30, idle);
  life.update(1 / 30, { ...idle, bitePressed: true });
  assert.ok(life.feeding);
  for (let i = 0; i < 6; i++) life.update(1 / 30, idle);
  life.update(1 / 30, { ...idle, bitePressed: true });
  assert.ok(life.feeding, 'still eating after a double tap');
});
