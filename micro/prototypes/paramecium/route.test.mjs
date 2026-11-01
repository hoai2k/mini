// The paramecium's encounters, placed as you go, without a browser: the
// director (route.js: the Dileptus, the Chlamydomonas bloom, the two
// Didinium, then the bladderwort trap guarding the biofilm) as a cell rushes
// out in 16 directions, stands still at the start, or heads out and turns
// back. The view is the chase camera's: ~280 µm behind the cell looking along
// its heading, 80° across (50° vertical at 16:9), fading out VIEW_FAR from the
// camera, as main.js's directorViews gives it.
//   node micro/prototypes/paramecium/route.test.mjs
import assert from 'node:assert/strict';
import { createDirector } from '../shared/director.js';
import { DIRECTOR, ENCOUNTERS, canPlace, START, BACK, DROP_R, VIEW_FAR, BLOOM_BAND, didiniumHomes, trapAt, bloomParts } from './route.js';

assert.deepEqual(ENCOUNTERS.map((e) => e.id), ['dileptus', 'bloom', 'didinium', 'portal'], 'the order');
assert.ok(ENCOUNTERS.at(-1).final);
assert.equal(DIRECTOR.mode, '2d', 'planar: the drop is 650 µm deep, the encounters millimetres apart');
assert.ok(Math.hypot(BACK.x - START.x, BACK.z - START.z) > 16000, 'the way back stays a fixed place');

const DT = 1 / 30, CAM_BACK = 282, HALF_FOV = Math.atan(Math.tan((25 * Math.PI) / 180) * (16 / 9));
/** The chase view of a cell at (x, z) heading (hx, hz): a wedge from the camera, out to VIEW_FAR. */
function view(x, z, hx, hz) {
  const cx = x - hx * CAM_BACK, cz = z - hz * CAM_BACK, a = Math.atan2(hz, hx);
  const side = (ang, k) => { const nx = -Math.sin(ang) * k, nz = Math.cos(ang) * k; return [nx, 0, nz, -(nx * cx + nz * cz)]; };
  return {
    frustum: [side(a - HALF_FOV, 1), side(a + HALF_FOV, -1), [hx, 0, hz, -(hx * cx + hz * cz) - 1], [-hx, 0, -hz, hx * cx + hz * cz + VIEW_FAR]],
    focus: { x, y: 300, z },
  };
}
const spec = (id) => ENCOUNTERS.find((e) => e.id === id);
const partsOf = (id, x, z, b) => (spec(id).parts ? spec(id).parts(x, z, b) : [[x, z, spec(id).visible ?? spec(id).size]]);
/** Which placed encounters cover each grid cell (the director's own test: cells round a disc). */
function coverage(D) {
  const m = new Map(), c = DIRECTOR.cell, B = DIRECTOR.bounds;
  for (const e of D.state().entries) {
    if (e.state !== 'placed' && e.state !== 'met') continue;
    for (const [px, pz, r] of partsOf(e.id, e.x, e.z, e.b)) {
      for (let i = Math.floor((px - r - B.x0) / c); i <= Math.floor((px + r - B.x0) / c); i++) for (let k = Math.floor((pz - r - B.z0) / c); k <= Math.floor((pz + r - B.z0) / c); k++) {
        if (Math.hypot(B.x0 + (i + 0.5) * c - px, B.z0 + (k + 0.5) * c - pz) > r + c * 0.71) continue;
        const key = `${i},${k}`;
        m.set(key, [...(m.get(key) || []), `${e.id}@${e.x},${e.z}`].sort().join(' '));
      }
    }
  }
  return m;
}
/** Distance from p to the bloom's band (middle x, z, lying across bearing b). */
function bandDist(p, h) {
  const ox = p.x - h.x, oz = p.z - h.z, c = Math.cos(h.b), s = Math.sin(h.b);
  const lx = ox * c + oz * s, lz = -ox * s + oz * c;
  return Math.hypot(Math.max(0, Math.abs(lx) - BLOOM_BAND.half), Math.max(0, Math.abs(lz) - BLOOM_BAND.across));
}
const HOME_R = 250;
function game({ seconds, move, check = false }) {
  const bad = [], changed = [];
  let D;
  const H = {};
  const place = (id) => (x, z, b) => {
    for (const [px, pz, r] of partsOf(id, x, z, b)) if (D.visibleNow(px, 300, pz, r)) bad.push(`${id} placed in view`);
    H[id] = id === 'didinium' ? didiniumHomes(x, z, b).map(([hx, hz]) => ({ x: hx, z: hz })) : id === 'portal' ? { x, z, b, trap: trapAt(x, z, b) } : { x, z, b };
    return H[id];
  };
  const near = (h, p, r) => Math.hypot(p.x - h.x, p.z - h.z) < r;
  const met = {
    dileptus: (h, [p]) => near(h, p, HOME_R + 450),
    bloom: (h, [p]) => bandDist(p, h) < 300,
    didinium: (h, [p]) => h.some((q) => near(q, p, HOME_R + 450)),
    portal: (h, [p]) => near(h, p, 230),
  };
  D = createDirector({ ...DIRECTOR, canPlace, entries: ENCOUNTERS.map((e) => ({ ...e, place: place(e.id), met: met[e.id] })) });
  const p = { id: 0, x: START.x, z: START.z, y: 300, hx: Math.cos(0.98), hz: Math.sin(0.98) };
  const ev = [];
  const frozen = new Map();
  const B = DIRECTOR.bounds, c = DIRECTOR.cell, nx = Math.ceil((B.x1 - B.x0) / c), nz = Math.ceil((B.z1 - B.z0) / c);
  let driftT = null;
  for (let t = 0; t < seconds; t += DT) {
    const x0 = p.x, z0 = p.z;
    move(t, p, D, H);
    const dx = p.x - x0, dz = p.z - z0, l = Math.hypot(dx, dz);
    if (l > 1e-6) { p.hx = dx / l; p.hz = dz / l; }
    ev.push(...D.update(DT, [p], [view(p.x, p.z, p.hx, p.hz)]));
    if (ev.some((e) => e.type === 'met' && e.id === 'portal')) break;
    // main.js driftEncounter: the current encounter, placed out of a lingering player's reach, comes over (350 µm/s, after 4 s)
    const s = D.state();
    if (s.current && s.current !== 'portal' && s.phase === 'placed' && H[s.current]) {
      driftT ??= t;
      if (t - driftT > 4 && !s.leader.moving) for (const h of [H[s.current]].flat()) {
        const d = Math.hypot(p.x - h.x, p.z - h.z);
        if (d > HOME_R + 300) { h.x += ((p.x - h.x) / d) * 350 * DT; h.z += ((p.z - h.z) / d) * 350 * DT; }
      }
    } else driftT = null;
    if (check && Math.round(t / DT) % 3 === 0) {
      const cov = coverage(D);
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const key = `${i},${k}`, now = cov.get(key) || '';
        if (frozen.has(key)) { if (frozen.get(key) !== now) changed.push(`${key}: '${frozen.get(key)}' -> '${now}' at ${t.toFixed(1)} s`); }
        else if (D.seenAt(B.x0 + (i + 0.5) * c, B.z0 + (k + 0.5) * c)) frozen.set(key, now);
      }
    }
  }
  return { ev, bad, changed, seen: frozen.size };
}
const at = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
const RUSH = 1500; // µm/s: full speed with a dash every 2.2 s (measured 1510)
function swim(p, a, v) {
  // round the way back (the amoeba's floor is not a place for encounters, but you can swim over it) and back off the meniscus
  if (Math.hypot(p.x - START.x, p.z - START.z) > DROP_R - 2500) a = Math.atan2(START.z - p.z, START.x - p.x);
  p.x += Math.cos(a) * v * DT; p.z += Math.sin(a) * v * DT;
}
const toward = (p, h) => Math.atan2(h.z - p.z, h.x - p.x);
const ORDER = ['dileptus', 'bloom', 'didinium', 'portal'];
const times = [];
for (let k = 0; k < 16; k++) {
  let a = (k / 16) * Math.PI * 2;
  const r = game({ seconds: 150, check: k % 4 === 0, move: (t, p, D, H) => { if (H.portal) a = toward(p, H.portal); swim(p, a, RUSH); } });
  const tag = `bearing ${k * 22.5}`;
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.changed, [], `${tag}: explored cells unchanged`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, `${tag}: every encounter, in order`);
  for (const e of r.ev.filter((x) => x.type === 'placed' || x.type === 'moved')) assert.ok(canPlace(e.x, e.z, spec(e.id).size), `${tag}: ${e.id} in the dish`);
  const T = { first: at(r.ev, 'placed', 'dileptus').t, dileptus: at(r.ev, 'met', 'dileptus').t, bloom: at(r.ev, 'met', 'bloom').t, didinium: at(r.ev, 'met', 'didinium').t, portalPlaced: at(r.ev, 'placed', 'portal').t, portal: at(r.ev, 'met', 'portal').t, how: r.ev.filter((e) => e.type === 'met').map((e) => e.how).join('/') };
  assert.ok(T.first >= 5, `${tag}: a warm-up first (${T.first} s)`);
  assert.ok(T.dileptus <= 18, `${tag}: the Dileptus within ~15 s (${T.dileptus} s)`);
  assert.ok(T.bloom - T.dileptus >= 5 && T.didinium - T.bloom >= 5, `${tag}: calm breaks between`);
  assert.ok(T.portal >= 40 && T.portal <= 65, `${tag}: the portal reached in about a minute (${T.portal} s)`);
  times.push(T);
}
const span = (k) => `${Math.min(...times.map((t) => t[k])).toFixed(1)}-${Math.max(...times.map((t) => t[k])).toFixed(1)} s`;

// ---- lingering at the start: every encounter still comes (each swims over), then the portal near them (and they go to it)
const r1 = game({ seconds: 400, check: true, move: (t, p, D, H) => {
  const s = D.state();
  if (s.current === 'portal' && s.phase === 'placed' && t - s.entries[3].placedT > 2) swim(p, toward(p, H.portal), RUSH);
} });
assert.deepEqual(r1.bad, []);
assert.deepEqual(r1.changed, [], 'lingering: explored cells unchanged');
assert.deepEqual(r1.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, 'lingering: every encounter in order');
for (const e of r1.ev.filter((x) => x.type === 'placed')) assert.ok(['near', 'wider'].includes(e.how) && Math.hypot(e.x - START.x, e.z - START.z) < 12000, `lingering: ${e.id} placed round them (${e.how})`);

// ---- out and back: rush out for 12 s, then turn round and swim back past the start and on
const turns = [];
for (const a0 of [0.98, 2.6, 4.4]) {
  let a = a0;
  const r = game({ seconds: 200, check: true, move: (t, p, D, H) => {
    if (H.portal) a = toward(p, H.portal); else if (t > 12) a = a0 + Math.PI;
    swim(p, a, RUSH);
  } });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.changed, [], `turn-back ${a0}: explored cells unchanged`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, `turn-back ${a0}: every encounter in order`);
  turns.push(`${a0}: ${r.ev.map((e) => `${e.id} ${e.type}${e.how && e.type !== 'met' ? ` (${e.how})` : ''} ${e.t} s`).join(', ')}; ${r.seen} cells seen`);
}
void bloomParts;
console.log(`rushing (${RUSH} µm/s) in 16 directions: Dileptus placed ${span('first')}, met ${span('dileptus')}; bloom ${span('bloom')}; Didinium ${span('didinium')}; portal placed ${span('portalPlaced')}, reached ${span('portal')}; met by ${[...new Set(times.map((t) => t.how))].join(', ')}`);
console.log(`lingering: ${r1.ev.filter((e) => e.type === 'placed' || e.type === 'met').map((e) => `${e.id} ${e.type} ${e.t} s${e.how && e.type === 'placed' ? ` (${e.how})` : ''}`).join(', ')}`);
console.log(`turning back:\n  ${turns.join('\n  ')}`);
