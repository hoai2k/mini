// Tests for the procedural glider creatures (run: node --test gliders/game/test/creatures.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { GLIDERS, VARIANTS, createGlider } from '../src/creatures.js';

const IDS = ['squirrel', 'microraptor', 'flyingfish', 'draco', 'frog', 'snake'];
const MAX_MESHES = 16;
const MAX_TRIANGLES = 12000;

const STATES = [
  { dt: 1 / 60, time: 0.5, speed: 15 },
  { dt: 1 / 60, time: 1.0, speed: 120, tuck: 1 },
  { dt: 1 / 30, time: 2.0, speed: 40, flare: 1, roll: 1, pitch: -1, yaw: 1 },
  { dt: 0.1, time: 3.3, speed: 70, tuck: 0.5, flare: 0.5, roll: -1, pitch: 1, yaw: -1, boost: 1 },
  { dt: 0, time: 4 },
  {},
  { dt: 1 / 144, time: 5, speed: 60, tuck: 0.3 },
];

function meshes(obj) {
  const out = [];
  obj.traverse((o) => { if (o.isMesh) out.push(o); });
  return out;
}

function triangles(obj) {
  let n = 0;
  for (const m of meshes(obj)) {
    const g = m.geometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  }
  return n;
}

function bounds(obj) {
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj, true);
}

function assertNoNaN(obj, label) {
  for (const m of meshes(obj)) {
    for (const name of ['position', 'normal']) {
      const a = m.geometry.attributes[name];
      if (!a) continue;
      for (let i = 0; i < a.array.length; i++) {
        if (!Number.isFinite(a.array[i])) assert.fail(`${label}: non-finite ${name} in ${m.name || 'mesh'}`);
      }
    }
  }
}

test('GLIDERS lists the six gliders in order with names, latin names and blurbs', () => {
  assert.deepEqual(GLIDERS.map((g) => g.id), IDS);
  for (const g of GLIDERS) {
    for (const k of ['name', 'latin', 'blurb']) assert.ok(typeof g[k] === 'string' && g[k].length > 2, `${g.id}.${k}`);
    assert.equal(g.variantNames.length, VARIANTS);
  }
  assert.equal(VARIANTS, 4);
});

test('unknown glider id throws', () => {
  assert.throws(() => createGlider('dragonfly'), /Unknown glider/);
});

test('runs in Node without a document', () => {
  assert.equal(typeof document, 'undefined');
});

for (const id of IDS) {
  for (let v = 0; v < VARIANTS; v++) {
    test(`${id} variant ${v}: structure, budget, scale, animation, dispose`, () => {
      const g = createGlider(id, v);
      assert.ok(g.object instanceof THREE.Group);
      assert.equal(typeof g.update, 'function');
      assert.equal(typeof g.dispose, 'function');
      for (const k of ['primary', 'secondary', 'accent']) assert.match(g.palette[k], /^#[0-9a-f]{6}$/i);

      const ms = meshes(g.object);
      assert.ok(ms.length > 0 && ms.length <= MAX_MESHES, `mesh count ${ms.length}`);
      const tris = triangles(g.object);
      assert.ok(tris > 500 && tris <= MAX_TRIANGLES, `triangles ${tris}`);

      // wingtips: two markers in the object's hierarchy, left (+X) and right (-X)
      assert.equal(g.wingtips.length, 2);
      const check = (label) => {
        g.object.updateMatrixWorld(true);
        const l = g.wingtips[0].getWorldPosition(new THREE.Vector3());
        const r = g.wingtips[1].getWorldPosition(new THREE.Vector3());
        assert.ok(l.x > 0 && r.x < 0, `${label}: wingtips on opposite sides (${l.x}, ${r.x})`);
        let root = g.wingtips[0];
        while (root.parent) root = root.parent;
        assert.equal(root, g.object);
      };
      check('rest');

      // scale: glide pose size limits, roughly centred on the origin
      const b = bounds(g.object);
      const size = b.getSize(new THREE.Vector3());
      const c = b.getCenter(new THREE.Vector3());
      const span = size.x;
      const length = size.z;
      if (id === 'snake') {
        assert.ok(length >= 2.4 && length <= 3.0, `snake length ${length}`);
        assert.ok(span >= 0.4 && span <= 1.0, `snake span ${span}`);
      } else {
        assert.ok(length >= 1.5 && length <= 2.5, `length ${length}`);
        assert.ok(span >= 1.7 && span <= 2.6, `span ${span}`);
      }
      assert.ok(size.y < 1.0, `height ${size.y}`);
      assert.ok(Math.abs(c.x) < 0.1, `centre x ${c.x}`);
      assert.ok(Math.abs(c.y) < 0.25, `centre y ${c.y}`);
      assert.ok(Math.abs(c.z) < 0.5, `centre z ${c.z}`);
      assert.ok(b.containsPoint(new THREE.Vector3(0, 0, 0)), 'origin inside the body bounds');

      // animation: no NaNs, no new geometries or attribute arrays, sizes stay sane
      const geos = ms.map((m) => m.geometry);
      const arrays = geos.map((geo) => geo.attributes.position.array);
      for (const s of STATES) {
        g.update(s);
        assertNoNaN(g.object, JSON.stringify(s));
        const bb = bounds(g.object).getSize(new THREE.Vector3());
        assert.ok(bb.x <= 2.7 && bb.z <= 3.0 && bb.y <= 1.2, `animated size ${bb.toArray()}`);
      }
      for (let i = 0; i < 120; i++) g.update({ dt: 1 / 60, time: 6 + i / 60, speed: 50, roll: Math.sin(i / 10) });
      check('animated');
      const after = meshes(g.object);
      assert.equal(after.length, ms.length);
      after.forEach((m, i) => {
        assert.equal(m.geometry, geos[i], 'same geometry object');
        assert.equal(m.geometry.attributes.position.array, arrays[i], 'same position array');
      });

      // dispose frees every geometry and material
      let disposed = 0;
      for (const m of after) m.geometry.addEventListener('dispose', () => disposed++);
      g.dispose();
      assert.equal(disposed, after.length);
    });
  }
}

test('animation is frame-rate independent for the smoothed pose', () => {
  const run = (hz) => {
    const g = createGlider('squirrel', 0);
    for (let t = 0; t < 1; t += 1 / hz) g.update({ dt: 1 / hz, time: t, speed: 40, flare: 1 });
    g.object.updateMatrixWorld(true);
    const p = g.wingtips[0].getWorldPosition(new THREE.Vector3());
    g.dispose();
    return p;
  };
  const a = run(30);
  const b = run(144);
  assert.ok(a.distanceTo(b) < 0.03, `30 Hz vs 144 Hz wingtip differ by ${a.distanceTo(b)}`);
});
