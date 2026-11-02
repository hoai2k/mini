// The amoeba's slide and its encounters, without a browser: the scenery (easy
// prey patches and fungal traps scattered at every distance and on every side,
// the slide's objects in every direction), and the director placing the
// encounters (world.js ENCOUNTERS: a patch of fleeing ciliates, a patch with
// Paramecium caudatum, then Chaos on guard at the portal) as a cell rushes out
// in 16 directions, stands still at the start, or heads out and turns back.
// The view is the 20× field at 1280 × 720 (900 × 506 µm), centred a little
// ahead of the cell as main.js's camera is.
//   node micro/prototypes/amoeba/route.test.mjs
import assert from 'node:assert/strict';
import { createDirector } from '../shared/director.js';
import { SLIDE, PATCHES, PATCH, TRAP_CENTRES, trapLayout, buildWorld, leafDist, LEAF, segDist, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, canPlace, clearAt, portalParts, portalRoom } from './world.js';
import { CHAOS_R, CHAOS_WAKE } from './chaos.js';

const deg = (a) => `${Math.round((a * 180) / Math.PI)}°`;
assert.deepEqual(ENCOUNTERS.map((e) => e.id), ['ciliates', 'caudatum', 'portal'], 'the order');
assert.ok(ENCOUNTERS.at(-1).final);

// ---- the scenery: easy prey and traps on every side, near and far
const easy = PATCHES.filter((P) => P.ring === 'easy');
assert.ok(PATCHES[0].ring === 'start' && Math.hypot(PATCHES[0].x, PATCHES[0].y) === 0, 'food round the start');
const quad = (x, y) => Math.floor(((Math.atan2(y, x) + Math.PI) / (Math.PI / 2)) % 4);
for (let q = 0; q < 4; q++) {
  assert.ok(easy.some((P) => quad(P.x, P.y) === q), `easy prey in quadrant ${q}`);
  assert.ok(TRAP_CENTRES.some((C) => quad(C.x, C.y) === q), `traps in quadrant ${q}`);
}
const td = TRAP_CENTRES.map((C) => Math.hypot(C.x, C.y)), ed = easy.map((P) => Math.hypot(P.x, P.y));
assert.ok(Math.min(...td) < 1700 && Math.max(...td) > 3000, `traps from ${Math.min(...td).toFixed(0)} to ${Math.max(...td).toFixed(0)} µm`);
assert.ok(Math.min(...ed) < 1000 && Math.max(...ed) > 3000, `easy prey from ${Math.min(...ed).toFixed(0)} to ${Math.max(...ed).toFixed(0)} µm`);
const hy = trapLayout();
for (const h of hy) {
  assert.ok(Math.hypot(h.x, h.y) - h.L / 2 > SLIDE.warm, 'no trap in the warm-up');
  assert.ok(leafDist(h.x, h.y) > LEAF.W / 2 + 150, 'traps clear of the leaf');
}
// room to crawl between clusters (the cell is ~350 µm wide)
for (let i = 0; i < TRAP_CENTRES.length; i++) for (let j = i + 1; j < TRAP_CENTRES.length; j++) {
  let gap = Infinity;
  for (const h of hy.filter((x) => x.cluster === i)) for (let t = -h.L / 2; t <= h.L / 2; t += 10) for (const g of hy.filter((x) => x.cluster === j)) gap = Math.min(gap, segDist(h.x + Math.cos(h.ang) * t, h.y + Math.sin(h.ang) * t, g));
  assert.ok(gap > 400, `trap clusters ${i} and ${j} ${gap.toFixed(0)} µm apart`);
}
// the slide: calm glass in the warm-up, filaments in focus only beyond SLIDE.far, objects in every direction
const W = buildWorld(7);
const focus = W.obstacles.filter((o) => o.layer === 'focus' && o.type !== 'trap' && o.type !== 'leaf');
for (const o of focus) assert.ok(Math.hypot(o.x, o.y) > SLIDE.warm, `${o.type} in the warm-up at ${Math.hypot(o.x, o.y).toFixed(0)} µm`);
for (const o of focus.filter((o) => o.type === 'spiro')) for (let t = -o.L / 2; t <= o.L / 2; t += 50) assert.ok(Math.hypot(o.x + Math.cos(o.ang) * t, o.y + Math.sin(o.ang) * t) > SLIDE.far, 'filaments in focus only beyond SLIDE.far');
for (let s = 0; s < 12; s++) for (const [r0, r1] of [[SLIDE.warm, 1500], [1500, 2600], [2600, 3600], [3600, SLIDE.field]]) {
  const n = focus.filter((o) => { const a = (Math.atan2(o.y, o.x) + 2 * Math.PI) % (2 * Math.PI), d = Math.hypot(o.x, o.y); return a >= (s * Math.PI) / 6 && a < ((s + 1) * Math.PI) / 6 && d >= r0 && d < r1; }).length;
  assert.ok(n >= 1, `slide objects at ${s * 30}°-${s * 30 + 30}°, ${r0}-${r1} µm: ${n}`);
}
// Chaos and the portal fit somewhere near every bearing ~2-3 mm out, clear of the leaf
for (let k = 0; k < 72; k++) {
  const a = (k / 72) * Math.PI * 2;
  let ok = false;
  for (let i = 0; i < 25 && !ok; i++) { const b = a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.05; for (const d of [2200, 2600, 3000]) ok ||= portalRoom(Math.cos(b) * d, Math.sin(b) * d, b); }
  assert.ok(ok, `room for the portal within 35° of ${deg(a)}`);
}

// ---- the director with the amoeba's settings and a fake slide
const DT = 1 / 30, HW = 450, HH = 253, LEAD = 60, CELL_R = 175;
function view(x, z, hx, hz) {
  const cx = x + hx * LEAD, cz = z + hz * LEAD;
  return { frustum: [[1, 0, 0, -(cx - HW)], [-1, 0, 0, cx + HW], [0, 0, 1, -(cz - HH)], [0, 0, -1, cz + HH]], focus: { x: cx, y: 0, z: cz } };
}
const spec = (id) => ENCOUNTERS.find((e) => e.id === id);
const partsOf = (id, x, z, b) => (spec(id).parts ? spec(id).parts(x, z, b) : [[x, z, spec(id).visible ?? spec(id).size]]);
/** Which placed encounters cover each grid cell (the cells' contents as far as the director goes). */
function coverage(D) {
  const m = new Map(), c = DIRECTOR.cell, B = DIRECTOR.bounds;
  const list = [];
  for (const e of D.state().entries) {
    if ((e.state === 'placed' || e.state === 'met') && e.placedT !== null) list.push(e);
    // (a default-path instance: there from the first frame until met or taken off the path)
    if (e.def && (e.def.state === 'placed' || e.def.state === 'met')) list.push({ ...e, x: e.def.x, z: e.def.z, b: D.entry(e.id).def.b, id: e.id, path: true });
  }
  for (const e of list) {
    for (const [px, pz, r] of partsOf(e.id, e.x, e.z, e.b)) {
      for (let i = Math.floor((px - r - B.x0) / c); i <= Math.floor((px + r - B.x0) / c); i++) for (let k = Math.floor((pz - r - B.z0) / c); k <= Math.floor((pz + r - B.z0) / c); k++) {
        if (Math.hypot(B.x0 + (i + 0.5) * c - px, B.z0 + (k + 0.5) * c - pz) > r + c * 0.71) continue; // the director's own test (cells round a disc)
        const key = `${i},${k}`;
        m.set(key, [...(m.get(key) || []), `${e.id}@${e.x},${e.z}`].sort().join(' '));
      }
    }
  }
  return m;
}
function game({ seconds, move, check = false, path = false }) {
  const bad = [], changed = [];
  let D;
  const handles = {};
  const place = (id) => (x, z, b) => {
    for (const [px, pz, r] of partsOf(id, x, z, b)) if (D.visibleNow(px, 0, pz, r)) bad.push(`${id} placed in view`);
    return (handles[id] = { id, x, y: z, b });
  };
  const met = {
    ciliates: (h, [p]) => Math.hypot(p.x - h.x, p.z - h.y) < PATCH.ciliates.r + CELL_R + 120,
    caudatum: (h, [p]) => Math.hypot(p.x - h.x, p.z - h.y) < PATCH.ciliates.r + CELL_R + 120,
    portal: (h, [p]) => Math.hypot(p.x - h.x, p.z - h.y) < 120,
  };
  D = createDirector({ ...DIRECTOR, canPlace, ...(path ? { defaultPath: DEFAULT_PATH } : {}), entries: ENCOUNTERS.map((e) => ({ ...e, place: place(e.id), met: met[e.id], ...(path ? { single: true } : {}) })) });
  const p = { id: 0, x: 0, z: 0, hx: 1, hz: 0 };
  const ev = [];
  const frozen = new Map(); // cell -> what the director had put there when it was first seen
  const B = DIRECTOR.bounds, c = DIRECTOR.cell, nx = Math.ceil((B.x1 - B.x0) / c), nz = Math.ceil((B.z1 - B.z0) / c);
  let patchT = null;
  for (let t = 0; t < seconds && !D.done; t += DT) {
    const x0 = p.x, z0 = p.z;
    move(t, p, D, handles);
    const dx = p.x - x0, dz = p.z - z0, l = Math.hypot(dx, dz);
    if (l > 1e-6) { p.hx = dx / l; p.hz = dz / l; }
    ev.push(...D.update(DT, [p], [view(p.x, p.z, p.hx, p.hz)]));
    if (ev.some((e) => e.type === 'met' && e.id === 'portal')) break;
    // main.js driftPatch: a patch placed out of a lingering player's reach swims over (30 µm/s, after 5 s)
    const cur = D.state();
    const h = cur.current && cur.current !== 'portal' && cur.phase === 'placed' && D.entry(cur.current).handle === handles[cur.current] ? handles[cur.current] : null;
    if (h) {
      patchT ??= t;
      const d = Math.hypot(p.x - h.x, p.z - h.y);
      if (t - patchT > 5 && !cur.leader.moving && d > PATCH.ciliates.r + CELL_R + 60) { h.x += ((p.x - h.x) / d) * 30 * DT; h.y += ((p.z - h.y) / d) * 30 * DT; }
    } else patchT = null;
    if (check && Math.round(t / DT) % 3 === 0) {
      // explored stays constant: what the director has put in a seen cell never changes
      const cov = coverage(D);
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const key = `${i},${k}`, now = cov.get(key) || '';
        if (frozen.has(key)) { if (frozen.get(key) !== now) changed.push(`${key}: '${frozen.get(key)}' -> '${now}' at ${t.toFixed(1)} s`); }
        else if (D.seenAt(B.x0 + (i + 0.5) * c, B.z0 + (k + 0.5) * c)) frozen.set(key, now);
      }
    }
  }
  return { ev, bad, D, changed, seen: frozen.size, p };
}
const at = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
/** Crawl at v µm/s toward bearing a, round the leaf. */
function crawl(p, a, v) {
  for (let i = 0; i < 12; i++) {
    const b = a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.35;
    const nx = p.x + Math.cos(b) * v * DT, nz = p.z + Math.sin(b) * v * DT;
    if (leafDist(nx, nz) > LEAF.W / 2 + CELL_R) { p.x = nx; p.z = nz; return; }
  }
}
const toward = (p, h) => Math.atan2(h.y - p.z, h.x - p.x);
const RUSH = 50; // µm/s: crawling with the surge used whenever it is ready, snags and all (scripted runs in the browser average 40-55)
const times = [];
for (let k = 0; k < 16; k++) {
  let a = (k / 16) * Math.PI * 2;
  const r = game({ seconds: 140, check: k % 4 === 0, move: (t, p, D, H) => {
    // rush out; once the portal is placed, make for it; at the slide's edge turn back in
    if (H.portal) a = toward(p, H.portal);
    else if (Math.hypot(p.x, p.z) > SLIDE.field - 300) a += Math.PI * 0.75;
    crawl(p, a, RUSH);
  } });
  const tag = `bearing ${k * 22.5}`;
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.changed, [], `${tag}: explored cells unchanged`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ['ciliates', 'caudatum', 'portal'], `${tag}: every encounter, in order`);
  for (const e of r.ev.filter((x) => x.type === 'placed' || x.type === 'moved')) assert.ok(spec(e.id).fits(e.x, e.z, e.b), `${tag}: ${e.id} on clear glass`);
  const T = { ciliatesPlaced: at(r.ev, 'placed', 'ciliates').t, ciliates: at(r.ev, 'met', 'ciliates').t, caudatum: at(r.ev, 'met', 'caudatum').t, portalPlaced: at(r.ev, 'placed', 'portal').t, portal: at(r.ev, 'met', 'portal').t, how: r.ev.filter((e) => e.type === 'met').map((e) => e.how).join('/') };
  assert.ok(T.ciliatesPlaced >= 4.5, `${tag}: a warm-up first (${T.ciliatesPlaced} s)`);
  assert.ok(T.ciliates <= 25, `${tag}: the ciliates within ~20 s (${T.ciliates} s)`);
  assert.ok(T.caudatum - T.ciliates >= 4, `${tag}: a calm break before P. caudatum`);
  assert.ok(T.portal <= 70, `${tag}: the portal reached within ~a minute (${T.portal} s)`);
  times.push(T);
}
const span = (k) => `${Math.min(...times.map((t) => t[k])).toFixed(1)}-${Math.max(...times.map((t) => t[k])).toFixed(1)} s`;

// ---- lingering at the start: the encounters still come, one by one (the patches swim over), and the portal near them (then they go to it)
const r1 = game({ seconds: 300, check: true, move: (t, p, D, H) => {
  const s = D.state();
  if (s.current === 'portal' && s.phase === 'placed' && t - s.entries[2].placedT > 2) crawl(p, toward(p, H.portal), RUSH);
} });
assert.deepEqual(r1.bad, []);
assert.deepEqual(r1.changed, [], 'lingering: explored cells unchanged');
assert.deepEqual(r1.ev.filter((e) => e.type === 'met').map((e) => e.id), ['ciliates', 'caudatum', 'portal'], 'lingering: every encounter in order');
const lp = at(r1.ev, 'placed', 'portal');
assert.ok(Math.hypot(lp.x, lp.z) < 2200, `lingering: the portal comes to them (${Math.hypot(lp.x, lp.z).toFixed(0)} µm)`);
for (const e of r1.ev.filter((x) => x.type === 'placed')) assert.ok(['near', 'wider'].includes(e.how), `lingering: ${e.id} placed round them (${e.how})`);

// ---- out and back: rush out for 15 s, then turn round and crawl back past the start and on
const turns = [];
for (const a0 of [0.4, 2.2, 4.0]) {
  let a = a0;
  const r = game({ seconds: 160, check: true, move: (t, p, D, H) => {
    if (H.portal) a = toward(p, H.portal);
    else if (t > 15 && t < 15 + DT * 1.5) a = a0 + Math.PI;
    else if (Math.hypot(p.x, p.z) > SLIDE.field - 300) a += Math.PI * 0.75;
    crawl(p, a, RUSH);
  } });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.changed, [], `turn-back ${a0}: explored cells unchanged`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ['ciliates', 'caudatum', 'portal'], `turn-back ${a0}: every encounter in order`);
  turns.push(`${a0}: ${r.ev.filter((e) => e.type !== 'met' || e.id === 'portal').map((e) => `${e.id} ${e.type}${e.how ? ` (${e.how})` : ''} ${e.t} s`).join(', ')}; ${r.seen} cells seen`);
}
// ---- the default path (main.js passes world.js DEFAULT_PATH; each encounter one thing: `single`):
// the whole order laid along one bearing on the first frame, the portal among it
const pathRows = [];
{
  // following the bearing (crawling to each in turn): the pre-placed ones met in order, the pre-placed portal reached; nothing generated
  const r = game({ seconds: 140, check: true, path: true, move: (t, p, D, H) => {
    const s = D.state(), cur = s.entries[s.index];
    crawl(p, cur && H[cur.id] ? toward(p, H[cur.id]) : DEFAULT_PATH.bearing, RUSH);
  } });
  assert.deepEqual(r.bad, [], 'default path: nothing placed in view');
  assert.deepEqual(r.changed, [], 'default path: explored cells unchanged');
  const placed = r.ev.filter((e) => e.type === 'placed');
  assert.deepEqual(placed.map((e) => `${e.id} ${e.how}`), ['ciliates default', 'caudatum default', 'portal default'], 'default path: all three pre-placed, nothing generated');
  assert.ok(placed.every((e) => e.t < 0.1), 'default path: from the first frame');
  for (const e of placed) assert.ok(spec(e.id).fits(e.x, e.z, e.b), `default path: ${e.id} on clear glass`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.instance}`), ['ciliates default', 'caudatum default', 'portal default'], 'default path: met in order on it');
  assert.ok(at(r.ev, 'met', 'portal').t <= 70, `default path: the portal reached within ~a minute (${at(r.ev, 'met', 'portal').t} s)`);
  pathRows.push(`followed: ${placed.map((e) => `${e.id} at ${Math.hypot(e.x, e.z).toFixed(0)} µm`).join(', ')}; met ${r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.t} s`).join(', ')}`);
}
for (const off of [Math.PI, Math.PI / 2, -Math.PI / 2]) {
  // heading off another way: each leaves the path while nobody has seen it and is placed as you go, in order; what was seen stays
  let a = DEFAULT_PATH.bearing + off;
  const tag = `off the path (${Math.round((off * 180) / Math.PI)}°)`;
  const r = game({ seconds: 160, check: true, path: true, move: (t, p, D, H) => {
    if (D.entry('portal').state === 'placed') a = toward(p, H.portal);
    else if (Math.hypot(p.x, p.z) > SLIDE.field - 300) a += Math.PI * 0.75;
    crawl(p, a, RUSH);
  } });
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.changed, [], `${tag}: explored cells unchanged`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.instance}`), ['ciliates dynamic', 'caudatum dynamic', 'portal dynamic'], `${tag}: every encounter in order, where placed as you go`);
  for (const id of ['ciliates', 'caudatum', 'portal']) {
    const e = r.ev.find((x) => x.type === 'placed' && x.id === id && x.how !== 'default');
    assert.ok(e && e.from === 'default' && spec(id).fits(e.x, e.z, e.b), `${tag}: ${id} taken off the path and placed as you go (${e && e.how})`);
  }
  pathRows.push(`${tag}: met ${r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.t} s`).join(', ')}`);
}
void CHAOS_R; void CHAOS_WAKE; void clearAt; void portalParts;
console.log(`ok: ${easy.length} easy patches ${Math.min(...ed).toFixed(0)}-${Math.max(...ed).toFixed(0)} µm out, ${TRAP_CENTRES.length} trap clusters ${Math.min(...td).toFixed(0)}-${Math.max(...td).toFixed(0)} µm out, ${focus.length} objects in focus`);
console.log(`rushing (${RUSH} µm/s) in 16 directions: ciliates placed ${span('ciliatesPlaced')}, met ${span('ciliates')}; P. caudatum met ${span('caudatum')}; portal placed ${span('portalPlaced')}, reached ${span('portal')}; met by ${[...new Set(times.map((t) => t.how))].join(', ')}`);
console.log(`lingering: ${r1.ev.filter((e) => e.type === 'placed' || e.type === 'met').map((e) => `${e.id} ${e.type} ${e.t} s${e.how && e.type === 'placed' ? ` (${e.how})` : ''}`).join(', ')}`);
console.log(`turning back:\n  ${turns.join('\n  ')}`);
console.log(`default path: ${pathRows.join('; ')}`);
