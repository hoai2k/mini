import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { createKicks, KICK_KINDS } from './kicks.js';

function seeded(seed = 7) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const body = () => ({ a: new THREE.Vector3(0, 0, 0), b: new THREE.Vector3(0, 18, 0), r: 6 });
const run = (opts = {}, seconds = 30, dt = 1 / 60) => {
  const k = createKicks({ rate: 1.6, rng: seeded(opts.seed || 7) });
  const hits = []; let maxFlying = 0;
  for (let f = 0; f < seconds / dt; f++) { hits.push(...k.step(dt, body(), opts)); maxFlying = Math.max(maxFlying, k.flying.length); }
  return { hits, maxFlying };
};

test('molecules strike now and then: discrete hits at about the set rate', () => {
  const { hits, maxFlying } = run();
  // 1.6 a second for 30 s, a few lost to misses: well above none, well below continuous
  assert.ok(hits.length > 25 && hits.length < 70, `hits ${hits.length}`);
  assert.ok(maxFlying <= 8);
});

test('each kick is small and bounded, and pushes along the striking molecule', () => {
  const maxPush = Math.max(...KICK_KINDS.map((k) => k.push));
  for (const h of run().hits) {
    assert.ok(h.dv.length() <= maxPush + 1e-6);
    assert.ok(h.dw.length() < 1.5, `spin ${h.dw.length()}`);
    assert.ok(Math.abs(h.dir.length() - 1) < 1e-6);
  }
});

test('small molecules hit most often; proteins rarely but harder', () => {
  const { hits } = run({}, 120);
  const count = (k) => hits.filter((h) => h.kind === k).length;
  assert.ok(count('small') > count('globule') * 2);
  const avg = (k) => hits.filter((h) => h.kind === k).reduce((a, h) => a + h.dv.length(), 0) / Math.max(1, count(k));
  assert.ok(avg('globule') > avg('small'));
});

test('aiming softens the spin; off means no kicks', () => {
  const full = run({ seed: 3 }).hits, soft = run({ seed: 3, spinScale: 0.3 }).hits;
  const sum = (hs) => hs.reduce((a, h) => a + h.dw.length(), 0);
  assert.ok(sum(soft) < sum(full) * 0.35);
  assert.equal(run({ on: false }).hits.length, 0);
});
