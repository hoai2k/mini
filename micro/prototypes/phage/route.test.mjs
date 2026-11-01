// The phage world's encounters, without a browser: the director (shared/director.js) with the world's
// settings and encounters (world.js DIRECTOR, encounterSpecs: Host B, the wrong host, then Host A and
// the amoeba), as a phage drifts out in the six directions (across the view, up and down it, into and
// out of it), lingers at the start, or heads out and turns back. The view is the game's camera (35°,
// 16:9, 110 units behind the phage, looking down -z as at the start), seeing 700 units past the phage.
// An independent check confirms nothing is ever placed where a view has looked.
//   node micro/prototypes/phage/route.test.mjs        (V=1 prints each run's placements)
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { createDirector } from '../shared/director.js';
import { DIRECTOR, encounterSpecs, canPlace, START, FIELD_R, HOST_GEO, sideOf, amoebaAt, clayAt, AMOEBA_R, FLOCS, UV_SHAFTS, uvClear, CALM_R } from './world.js';

const DT = 1 / 30, SPEED = 30, DIST = 110;
const ORDER = ['B', 'W', 'portal'];
assert.deepEqual(encounterSpecs({ x: 0, y: 0, z: 0 }).map((e) => e.id), ORDER, 'the order');
// scenery everywhere but the start's calm water
assert.ok(UV_SHAFTS.every((s) => uvClear(START) > CALM_R - 60) && FLOCS.every((f) => Math.hypot(f[0], f[1], f[2]) > CALM_R), 'no hazard in the calm water at the start');
for (const [k, list] of [['flocs', FLOCS.map((f) => new THREE.Vector3(f[0], f[1], f[2]))], ['shafts', UV_SHAFTS.map((s) => s.c)]]) {
  const oct = new Set(list.map((p) => `${p.x > 0}${p.y > 0}${p.z > 0}`));
  assert.equal(oct.size, 8, `${k} in every octant`);
  assert.ok(Math.max(...list.map((p) => p.length())) > 800, `${k} far out too`);
}

const cam = new THREE.PerspectiveCamera(35, 16 / 9, 2, 3000);
const _pm = new THREE.Matrix4(), _f = new THREE.Vector3();
function view(p, look) {
  cam.position.copy(p).addScaledVector(look, -DIST); cam.lookAt(p); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const fr = new THREE.Frustum().setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  cam.getWorldDirection(_f);
  fr.planes[4].normal.copy(_f).negate(); fr.planes[4].constant = _f.dot(cam.position) + DIST + DIRECTOR.seenDist;
  return { frustum: fr, focus: p.clone() };
}
/** Distance from p to a host capsule at c, its long axis turned `ang` about z. */
function sdHost(id, c, ang, p) {
  const g = HOST_GEO[id], d = p.clone().sub(c), ca = Math.cos(-ang), sa = Math.sin(-ang);
  const lx = d.x * ca - d.y * sa, ly = d.x * sa + d.y * ca;
  return Math.hypot(lx - Math.max(-g.half, Math.min(g.half, lx)), ly, d.z) - g.r;
}

function game({ seconds, move, look = new THREE.Vector3(0, 0, -1) }) {
  const lead = { x: 0, y: 0, z: 0, hx: 1, hy: 0, hz: 0, moving: false }, vel = new THREE.Vector3(), prev = new THREE.Vector3();
  const specs = encounterSpecs(lead);
  const p = { id: 0, x: 0, y: 0, z: 0 }, P = new THREE.Vector3();
  const hosts = {}, bad = [];
  // the independent check: every view's frustum (out to its far plane), sampled on a 20-unit lattice round the phage
  const seen = new Set(), G = 20, key = (x, y, z) => `${Math.floor(x / G)},${Math.floor(y / G)},${Math.floor(z / G)}`;
  const mark = (v) => { const R = DIRECTOR.seenDist; for (let x = -R; x <= R; x += G) for (let y = -R; y <= R; y += G) for (let z = -R; z <= R; z += G) { const q = new THREE.Vector3(v.focus.x + x, v.focus.y + y, v.focus.z + z); if (q.distanceTo(v.focus) <= R && v.frustum.containsPoint(q)) seen.add(key(q.x, q.y, q.z)); } };
  const ballSeen = (c, r) => { for (let x = -r; x <= r; x += G) for (let y = -r; y <= r; y += G) for (let z = -r; z <= r; z += G) if (x * x + y * y + z * z < (r - G) ** 2 && seen.has(key(c.x + x, c.y + y, c.z + z))) return true; return false; };
  const mk = (id) => ({
    place: (x, z, b, info) => {
      const c = new THREE.Vector3(x, info.y, z), dir = c.clone().sub(new THREE.Vector3(lead.x, lead.y, lead.z)).normalize();
      const parts = id === 'portal' ? [[c, 150], [amoebaAt(c, dir), AMOEBA_R + 20]] : id === 'B' ? [[c, 105], [clayAt(c, dir), 52]] : [[c, 85]];
      for (const [q, r] of parts) if (ballSeen(q, r)) bad.push(`${id} placed on seen water`);
      hosts[id] = { c, ang: Math.atan2(dir.y, dir.x) + Math.PI / 2 };
      return id;
    },
    met: (h, [q]) => id !== 'portal' && sdHost(id, hosts[id].c, hosts[id].ang, P.set(q.x, q.y, q.z)) < 70,
  });
  const D = createDirector({ ...DIRECTOR, canPlace, entries: specs.map((e) => ({ ...e, ...mk(e.id) })) });
  const ev = [];
  let idle = 0, sampleT = 0;
  for (let t = 0; t < seconds && !D.done; t += DT) {
    move(t, p, D, hosts);
    // the leader's heading, as main.js keeps it (its drift velocity)
    vel.lerp(new THREE.Vector3(p.x, p.y, p.z).sub(prev).divideScalar(DT), 0.2); prev.set(p.x, p.y, p.z);
    Object.assign(lead, { x: p.x, y: p.y, z: p.z, moving: vel.length() > 6 });
    if (lead.moving) { const u = vel.clone().normalize(); Object.assign(lead, { hx: u.x, hy: u.y, hz: u.z }); }
    const v = view(new THREE.Vector3(p.x, p.y, p.z), look);
    if ((sampleT -= DT) <= 0) { mark(v); sampleT = 0.2; }
    ev.push(...D.update(DT, [p], [v]));
    // main.js: a lingering player's decoy swims over to them
    const L = D.leader; idle = L && !L.moving ? idle + DT : 0;
    const s = D.state(), cur = s.entries[s.index];
    if (cur && cur.id !== 'portal' && cur.state === 'placed' && idle > 4 && s.t - cur.placedT > 4) {
      const h = hosts[cur.id], d = sdHost(cur.id, h.c, h.ang, P.set(p.x, p.y, p.z));
      if (d > 60) h.c.add(P.clone().sub(h.c).setLength(Math.min(d - 59, 12 * DT)));
    }
    if (D.state().entries.at(-1).state === 'placed' && hosts.portal && P.set(p.x, p.y, p.z).distanceTo(hosts.portal.c) < 60) { p.reached ??= t; break; }
  }
  return { ev, bad, p, D };
}
const at = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
const soft = (p, d, dt) => { const n = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(d, SPEED * dt); if (n.length() > FIELD_R - 60) return false; p.x = n.x; p.y = n.y; p.z = n.z; return true; };
/** Drift out along d; once an encounter has been seen (the portal: once placed), head for it. */
function rusher(d0) {
  const d = d0.clone().normalize();
  return (t, p, D, hosts) => {
    const s = D.state(), cur = s.entries[s.index];
    // (the portal once placed: its golden light spills in from the edge of the view on its side)
    if (cur && cur.state === 'placed' && (cur.seenT !== null || cur.id === 'portal')) d.copy(hosts[cur.id].c).sub(new THREE.Vector3(p.x, p.y, p.z)).normalize();
    if (!soft(p, d, DT)) d.applyAxisAngle(new THREE.Vector3(0.3, 1, 0.2).normalize(), 2.2);
  };
}
const DIRS = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y (up)': [0, 1, 0], '-y (down)': [0, -1, 0], '-z (into the view)': [0, 0, -1], '+z (out of it)': [0, 0, 1] };
const rows = [];
for (const [name, v] of Object.entries(DIRS)) {
  const r = game({ seconds: 150, move: rusher(new THREE.Vector3(...v)) });
  if (process.env.V) console.log(name, r.ev.map((e) => `${e.type} ${e.id} ${e.t} ${e.how} d${Math.round(Math.hypot(e.x, e.z))}`).join('; '), 'reached', r.p.reached);
  assert.deepEqual(r.bad, [], name);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ['B', 'W'], `${name}: both decoys, in order`);
  const T = { first: at(r.ev, 'placed', 'B').t, B: at(r.ev, 'met', 'B').t, W: at(r.ev, 'met', 'W').t, portalPlaced: at(r.ev, 'placed', 'portal').t, reached: r.p.reached ?? Infinity };
  assert.ok(T.first >= 5.5, `${name}: a warm-up first (${T.first} s)`);
  assert.ok(at(r.ev, 'placed', 'W').t - T.B >= 4.5 && T.portalPlaced - T.W >= 4.5, `${name}: calm breaks`);
  // (drifting straight into the view, each encounter has to go past the haze straight ahead, ~450 units on: slower)
  const limit = name.startsWith('-z') ? 90 : 75;
  assert.ok(T.reached <= limit, `${name}: the portal reached in about a minute (${T.reached} s)`);
  rows.push(`${name}: B placed ${T.first}, met ${T.B}; W met ${T.W}; portal placed ${T.portalPlaced}, reached ${T.reached.toFixed(1)} s`);
}
// lingering at the start: the decoys come round (and swim over), then the portal near; they go to it
let lp = null;
const lin = game({ seconds: 300, move: (t, p, D, hosts) => {
  const s = D.state();
  if (s.current === 'portal' && s.phase === 'placed') { lp ??= t; if (t - lp > 2) soft(p, hosts.portal.c.clone().sub(new THREE.Vector3(p.x, p.y, p.z)).normalize(), DT); }
} });
assert.deepEqual(lin.bad, []);
assert.deepEqual(lin.ev.filter((e) => e.type === 'met').map((e) => e.id), ['B', 'W'], 'lingering: both decoys');
assert.ok(lin.p.reached !== undefined, 'lingering: the portal reached once they go to it');
for (const e of lin.ev.filter((x) => x.type === 'placed')) assert.ok(['near', 'wider'].includes(e.how), `lingering: ${e.id} placed round them (${e.how})`);
// out and back: nothing placed where they had looked
const back = game({ seconds: 150, move: (() => { const a = rusher(new THREE.Vector3(1, 0.2, 0)), b = rusher(new THREE.Vector3(-1, -0.2, 0)); return (t, ...r) => (t < 14 ? a : b)(t, ...r); })() });
assert.deepEqual(back.bad, [], 'turn back');
assert.deepEqual(back.ev.filter((e) => e.type === 'met').map((e) => e.id), ['B', 'W'], 'turn back: both decoys');
const evs = (r) => r.ev.filter((e) => e.type === 'placed' || e.type === 'met').map((e) => `${e.id} ${e.type} ${e.t}${e.type === 'placed' ? ` (${e.how})` : ''}`).join(', ');
console.log(`ok: ${FLOCS.length} flocs and ${UV_SHAFTS.length} UV shafts as scenery\n${rows.join('\n')}\nlingering: ${evs(lin)}; reached ${lin.p.reached.toFixed(1)} s\nturn back: ${evs(back)}; reached ${back.p.reached?.toFixed(1)} s`);
