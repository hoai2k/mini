// The small springtails stand on the moss, never in it (stand.js; the owner,
// 2026-11-04: "are the springtails and similar ambient creatures clipping
// through the ground?"). Without a browser: the grazing groups (life.js) and
// the thickets' crowd (thicket.js) are posed over minutes of their clock and
// many places, every vertex of every drawn springtail is put through its
// instance matrix, and none may dip below the ground under it by more than
// TOL µm. Before stand.js the groups sank 52 µm on average (68-87 at worst)
// and the crowd's downhill feet 19 µm.
//   node --test micro/game/mite/stand.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { createAmbient } from './life.js';
import { createThickets, springtailGeometry } from './thicket.js';
import { floorH } from './world.js';
import { CLUSTERS } from './layout.js';
import { standSpringtail, createGround, createKeepOut, SPRINGTAIL } from './stand.js';

const TOL = 1; // µm
const scene = { add() {}, remove() {} };
const tex = { cuticle: null };
const geo = springtailGeometry();
const P = geo.attributes.position;
const verts = Array.from({ length: P.count }, (_, i) => new THREE.Vector3(P.getX(i), P.getY(i), P.getZ(i)));
const _m = new THREE.Matrix4(), _v = new THREE.Vector3();
/** The deepest any vertex of instance k dips below ground (µm; negative: clear), and how high its lowest vertex floats. */
function dip(mesh, k, ground) {
  mesh.getMatrixAt(k, _m);
  let pen = -Infinity, gap = Infinity;
  for (const v of verts) {
    _v.copy(v).applyMatrix4(_m);
    const d = ground(_v.x, _v.z) - _v.y;
    if (d > pen) pen = d;
    if (-d < gap) gap = -d;
  }
  return { pen, gap };
}

test('the anatomy matches the mesh: its lowest vertices are the feet, at -stand', () => {
  const low = Math.min(...verts.map((v) => v.y));
  assert.ok(Math.abs(low + SPRINGTAIL.stand) < 1.5, `lowest vertex ${low.toFixed(1)} vs stand ${SPRINGTAIL.stand}`);
});

test('the grazing groups stand on the moss floor, on their feet, through hops and leaps', () => {
  const amb = createAmbient({ scene, tex });
  let worst = -Infinity, n = 0, floating = 0;
  for (let s = 0; s < 60; s++) {
    const t = s * 0.31;
    const f = { x: -20000 + s * 730, z: 9000 - s * 410 };
    // a body walking through one group now and then (the shy push), and a bite's scatter
    amb.update(t, [{ x: f.x + 300, z: f.z }], [f]);
    if (s % 10 === 3 && amb.live[0]) amb.nip(amb.live[0].key, amb.live[0].x - 200, amb.live[0].z);
    for (let k = 0; k < amb.mesh.count; k++) {
      const { pen, gap } = dip(amb.mesh, k, floorH);
      worst = Math.max(worst, pen); n++;
      if (gap > 160) floating++; // a hop is at most ~165 µm up; standing ones are on their feet
    }
  }
  assert.ok(n > 1000, `posed ${n}`);
  assert.ok(worst <= TOL, `worst dip ${worst.toFixed(1)} µm`);
  assert.equal(floating, 0);
});

test('the thickets crowd stands square to the slope, no foot in the moss', () => {
  const th = createThickets({ scene, tex, clusters: CLUSTERS.slice(0, 3) });
  let worst = -Infinity;
  for (let s = 0; s < 45; s++) {
    const cl = th.clusters[s % 3];
    th.update(1 / 30, [{ position: new THREE.Vector3(cl.x + 150, 200, cl.z - 100), radius: 190, slot: 0 }]);
    for (let k = 0; k < cl.mesh.count; k++) {
      cl.mesh.getMatrixAt(k, _m);
      if (Math.abs(_m.elements[0]) + Math.abs(_m.elements[2]) < 1e-4) continue; // gone
      worst = Math.max(worst, dip(cl.mesh, k, floorH).pen);
    }
  }
  assert.ok(worst <= TOL, `worst dip ${worst.toFixed(1)} µm`);
});

test('over grains and litter (a bumpy ground) the feet and the underside stay out of it', () => {
  // domes and a ledge on the floor, standing in for the grains and a flake
  const bumps = [[0, 0, 60, 45], [140, 60, 40, 30], [-120, -80, 90, 55]];
  const ground = (x, z) => {
    let h = floorH(x, z) + (x > 300 && x < 700 ? 22 : 0);
    for (const [bx, bz, r, ht] of bumps) { const d = Math.hypot(x - bx, z - bz); if (d < r) h = Math.max(h, floorH(x, z) + ht * Math.sqrt(1 - (d / r) ** 2)); }
    return h;
  };
  const out = { y: 0, q: new THREE.Quaternion(), pen: 0, n: new THREE.Vector3() };
  let worst = -Infinity;
  for (let i = 0; i < 400; i++) {
    const x = -300 + (i % 20) * 50, z = -250 + Math.floor(i / 20) * 25, yaw = i * 0.7;
    standSpringtail(ground, x, z, yaw, 1, 1, 1, 0, 0, out);
    _m.compose(_v.set(x, out.y, z), out.q, new THREE.Vector3(1, 1, 1));
    // the points it checks: feet and underside (between them a steep grain may still graze the flank)
    for (const [u, w] of SPRINGTAIL.feet) { const p = new THREE.Vector3(u, -SPRINGTAIL.stand, w).applyMatrix4(_m); worst = Math.max(worst, ground(p.x, p.z) - p.y); }
    for (const [u, v, w] of SPRINGTAIL.under) { const p = new THREE.Vector3(u, v, w).applyMatrix4(_m); worst = Math.max(worst, ground(p.x, p.z) - p.y); }
  }
  assert.ok(worst <= 0.01, `worst dip ${worst.toFixed(2)} µm`);
});

test('createGround: casts each lattice point once and interpolates between', () => {
  let casts = 0;
  // a flat slab 30 µm thick over x in [0, 100)
  const cast = (o, d, far) => { casts++; return o.x >= 0 && o.x < 100 ? { point: { y: floorH(o.x, o.z) + 30 } } : null; };
  const g = createGround(cast, { cell: 20 });
  assert.ok(Math.abs(g(40, 40) - (floorH(40, 40) + 30)) < 1e-9);
  assert.ok(Math.abs(g(-50, 40) - floorH(-50, 40)) < 1e-9);
  const c0 = casts;
  for (let i = 0; i < 50; i++) g(40 + i * 0.1, 40);
  assert.equal(casts, c0, 'cached');
});

test('createKeepOut: a point in a disc is moved to its edge, in every copy of the tile', () => {
  const ko = createKeepOut([{ x: 100, z: -4700, r: 200 }], 9600);
  for (const [x, z] of [[150, -4650], [150, 4900], [100 + 9600, -4700 + 3 * 9600]]) {
    const p = ko.push(x, z);
    const dx = p.x - 100 - 9600 * Math.round((p.x - 100) / 9600), dz = p.z + 4700 - 9600 * Math.round((p.z + 4700) / 9600);
    assert.ok(Math.hypot(dx, dz) >= 200 - 1e-6, `${x},${z} -> ${p.x},${p.z}`);
  }
  assert.deepEqual(ko.push(2000, 2000), { x: 2000, z: 2000 });
});
