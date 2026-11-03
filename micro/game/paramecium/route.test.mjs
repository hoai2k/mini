// The paramecium's encounters, placed as you go, without a browser: the
// director (route.js: the Dileptus, the Chlamydomonas bloom, the giant
// amoeba, the two Didinium, then the bladderwort trap guarding the biofilm)
// as a cell rushes out in 16 directions, stands still at the start, heads out
// and turns back, or follows the default path. The view is the 2D slide's:
// a rectangle FIELD wide round the cell (16:9), with main.js's 1.2 margin.
//   node micro/game/paramecium/route.test.mjs
import assert from 'node:assert/strict';
import { createDirector } from '../shared/director.js';
import { DIRECTOR, DEFAULT_PATH, ENCOUNTERS, MET, DRIFT_TO, canPlace, START, BACK, FIELD, RUSH, didiniumHomes, trapAt, bandDist } from './route.js';

const ORDER = ['dileptus', 'bloom', 'giant', 'didinium', 'portal'];
assert.deepEqual(ENCOUNTERS.map((e) => e.id), ORDER, 'the order');
assert.ok(ENCOUNTERS.at(-1).final);
assert.equal(DIRECTOR.mode, '2d', 'a 2D slide');
assert.ok(Math.hypot(BACK.x - START.x, BACK.y - START.y) > 2000, 'the way back stays a fixed place');

const DT = 1 / 30, HW = (FIELD / 2) * 1.2, HH = (FIELD / 2) * (9 / 16) * 1.2;
/** The 2D view round (x, y): a rectangle, as main.js directorViews gives it (the director's z is our y). */
const view = (x, y) => ({ frustum: [[-1, 0, 0, x + HW], [1, 0, 0, -x + HW], [0, 0, -1, y + HH], [0, 0, 1, -y + HH]], focus: { x, y: 0, z: y } });
const spec = (id) => ENCOUNTERS.find((e) => e.id === id);
const partsOf = (id, x, z, b) => (spec(id).parts ? spec(id).parts(x, z, b) : [[x, z, spec(id).visible ?? spec(id).size]]);
function coverage(D) {
  const m = new Map(), c = DIRECTOR.cell, B = DIRECTOR.bounds;
  const list = [];
  for (const e of D.state().entries) {
    if ((e.state === 'placed' || e.state === 'met') && e.placedT !== null) list.push(e);
    if (e.def && (e.def.state === 'placed' || e.def.state === 'met')) list.push({ ...e, x: e.def.x, z: e.def.z, b: D.entry(e.id).def.b });
  }
  for (const e of list) for (const [px, pz, r] of partsOf(e.id, e.x, e.z, e.b)) {
    for (let i = Math.floor((px - r - B.x0) / c); i <= Math.floor((px + r - B.x0) / c); i++) for (let k = Math.floor((pz - r - B.z0) / c); k <= Math.floor((pz + r - B.z0) / c); k++) {
      if (Math.hypot(B.x0 + (i + 0.5) * c - px, B.z0 + (k + 0.5) * c - pz) > r + c * 0.71) continue;
      const key = `${i},${k}`;
      m.set(key, [...(m.get(key) || []), `${e.id}@${e.x},${e.z}`].sort().join(' '));
    }
  }
  return m;
}
function game({ seconds, move, check = false, path = false }) {
  const bad = [], changed = [];
  let D;
  const H = {};
  const place = (id) => (x, z, b) => {
    for (const [px, pz, r] of partsOf(id, x, z, b)) if (D.visibleNow(px, 0, pz, r)) bad.push(`${id} placed in view`);
    H[id] = id === 'didinium' ? didiniumHomes(x, z, b).map(([hx, hz]) => ({ x: hx, z: hz })) : id === 'portal' ? { x, z, b, trap: trapAt(x, z, b) } : { x, z, b };
    return H[id];
  };
  const near = (h, p, r) => Math.hypot(p.x - h.x, p.z - h.z) < r;
  const met = {
    dileptus: (h, [p]) => near(h, p, MET.dileptus),
    bloom: (h, [p]) => bandDist(p.x, p.z, h.x, h.z, h.b) < MET.bloom,
    giant: (h, [p]) => near(h, p, MET.giant),
    didinium: (h, [p]) => h.some((q) => near(q, p, MET.didinium)),
    portal: (h, [p]) => near(h, p, MET.portal),
  };
  D = createDirector({ ...DIRECTOR, canPlace, ...(path ? { defaultPath: DEFAULT_PATH } : {}), entries: ENCOUNTERS.map((e) => ({ ...e, place: place(e.id), met: met[e.id], ...(path ? { single: true } : {}) })) });
  const p = { id: 0, x: START.x, z: START.y };
  const ev = [];
  const frozen = new Map();
  const B = DIRECTOR.bounds, c = DIRECTOR.cell;
  let driftT = null;
  for (let t = 0; t < seconds; t += DT) {
    move(t, p, D, H);
    ev.push(...D.update(DT, [p], [view(p.x, p.z)]));
    if (ev.some((e) => e.type === 'met' && e.id === 'portal')) break;
    // main.js driftEncounter: the current encounter, out of a lingering player's reach, comes over (300 µm/s, after 4 s, to DRIFT_TO)
    const s = D.state();
    if (s.current && s.current !== 'portal' && s.phase === 'placed' && H[s.current] && D.entry(s.current).handle === H[s.current]) {
      driftT ??= t;
      if (t - driftT > 4 && !s.leader.moving) for (const h of [H[s.current]].flat()) {
        const d = Math.hypot(p.x - h.x, p.z - h.z);
        if (d > DRIFT_TO[s.current]) { h.x += ((p.x - h.x) / d) * 300 * DT; h.z += ((p.z - h.z) / d) * 300 * DT; }
      }
    } else driftT = null;
    if (check && Math.round(t / DT) % 3 === 0) {
      const cov = coverage(D);
      // only the cells near the player can change: check those (and every one seen so far)
      for (const [key, val] of frozen) if ((cov.get(key) || '') !== val) changed.push(`${key}: '${val}' -> '${cov.get(key) || ''}' at ${t.toFixed(1)} s`);
      const i0 = Math.floor((p.x - 2000 - B.x0) / c), i1 = Math.floor((p.x + 2000 - B.x0) / c), k0 = Math.floor((p.z - 2000 - B.z0) / c), k1 = Math.floor((p.z + 2000 - B.z0) / c);
      for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) {
        const key = `${i},${k}`;
        if (!frozen.has(key) && D.seenAt(B.x0 + (i + 0.5) * c, B.z0 + (k + 0.5) * c)) frozen.set(key, cov.get(key) || '');
      }
    }
  }
  return { ev, bad, changed, seen: frozen.size };
}
const at = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
function swim(p, a, v) { p.x += Math.cos(a) * v * DT; p.z += Math.sin(a) * v * DT; }
const toward = (p, h) => Math.atan2(h.z - p.z, h.x - p.x);

// ---- rushing out in 16 directions: every encounter, in order, at the right rhythm
const times = [];
for (let k = 0; k < 16; k++) {
  let a = (k / 16) * Math.PI * 2;
  const r = game({ seconds: 150, check: k % 4 === 0, move: (t, p, D, H) => { if (H.portal) a = toward(p, H.portal); swim(p, a, RUSH); } });
  const tag = `bearing ${k * 22.5}`;
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.changed, [], `${tag}: explored cells unchanged`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, `${tag}: every encounter, in order`);
  for (const e of r.ev.filter((x) => x.type === 'placed' || x.type === 'moved')) assert.ok(canPlace(e.x, e.z, spec(e.id).size), `${tag}: ${e.id} in the dish`);
  const T = Object.fromEntries(ORDER.map((id) => [id, at(r.ev, 'met', id).t]));
  T.first = at(r.ev, 'placed', 'dileptus').t;
  assert.ok(T.first >= 3.5, `${tag}: a warm-up first (${T.first} s)`);
  assert.ok(T.dileptus >= 5 && T.dileptus <= 10.5, `${tag}: the Dileptus in ~5-10 s (${T.dileptus.toFixed(1)} s)`);
  for (let i = 1; i < ORDER.length; i++) assert.ok(T[ORDER[i]] - T[ORDER[i - 1]] >= 6, `${tag}: a calm break before ${ORDER[i]}`);
  assert.ok(T.portal >= 42 && T.portal <= 62, `${tag}: the portal in ~45-60 s (${T.portal.toFixed(1)} s)`);
  times.push(T);
}
const span = (k) => `${Math.min(...times.map((t) => t[k])).toFixed(1)}-${Math.max(...times.map((t) => t[k])).toFixed(1)} s`;

// ---- lingering at the start: every encounter still comes (each comes over), then the portal near them
const r1 = game({ seconds: 400, check: true, move: (t, p, D, H) => {
  const s = D.state();
  if (s.current === 'portal' && s.phase === 'placed' && t - s.entries[4].placedT > 2) swim(p, toward(p, H.portal), RUSH);
} });
assert.deepEqual(r1.bad, []);
assert.deepEqual(r1.changed, [], 'lingering: explored cells unchanged');
assert.deepEqual(r1.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, 'lingering: every encounter in order');
const lingerPortal = at(r1.ev, 'placed', 'portal').t;

// ---- out and back: rush out for 8 s, then turn round and swim back past the start and on
const turns = [];
for (const a0 of [0.3, 2.6, 4.4]) {
  let a = a0;
  const r = game({ seconds: 200, check: true, move: (t, p, D, H) => { if (H.portal) a = toward(p, H.portal); else if (t > 8) a = a0 + Math.PI; swim(p, a, RUSH); } });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.changed, [], `turning back (${a0}): explored cells unchanged`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, `turning back (${a0}): in order`);
  turns.push(at(r.ev, 'met', 'portal').t.toFixed(1));
}

// ---- the default path: following its bearing meets the pre-placed ones in order, nothing generated
const rp = game({ seconds: 200, path: true, check: true, move: (t, p, D) => {
  const s = D.state(), cur = s.entries.find((e) => e.id === s.current);
  const tgt = cur && cur.def && cur.def.state === 'placed' ? { x: cur.def.x, z: cur.def.z } : null;
  swim(p, tgt ? toward(p, tgt) : DEFAULT_PATH.bearing, RUSH);
} });
assert.deepEqual(rp.bad, []);
assert.deepEqual(rp.changed, [], 'default path: explored cells unchanged');
assert.deepEqual(rp.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, 'default path: in order');
assert.ok(rp.ev.filter((e) => e.type === 'met').every((e) => e.via === 'default' || e.instance === 'default' || e.how === 'met'), 'default path: met where they lie');
const pathPortal = at(rp.ev, 'met', 'portal').t;
assert.ok(pathPortal >= 40 && pathPortal <= 65, `default path: the portal in about a minute (${pathPortal.toFixed(1)} s)`);
// ---- off the path three other ways: each leaves the path while unseen and comes ahead of you
for (const a0 of [DEFAULT_PATH.bearing + Math.PI, DEFAULT_PATH.bearing + Math.PI / 2, DEFAULT_PATH.bearing - Math.PI / 2]) {
  let a = a0;
  const r = game({ seconds: 200, path: true, check: true, move: (t, p, D, H) => { if (H.portal && D.state().current === 'portal') a = toward(p, H.portal); swim(p, a, RUSH); } });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.changed, [], `off the path (${a0.toFixed(2)}): explored cells unchanged`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, `off the path (${a0.toFixed(2)}): in order`);
}

console.log(`ok: 16 rushes: first placed ${span('first')}, Dileptus met ${span('dileptus')}, bloom ${span('bloom')}, giant ${span('giant')}, Didinium ${span('didinium')}, portal reached ${span('portal')}`);
console.log(`ok: lingering: portal placed near them at ${lingerPortal.toFixed(1)} s; turning back: portal at ${turns.join(', ')} s; default path: portal at ${pathPortal.toFixed(1)} s`);
