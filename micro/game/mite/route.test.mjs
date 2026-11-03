// The mite's moss and its encounters, without a browser: the scenery (the
// periodic moss tile, the two rings of hyphal thickets: every way out meets
// them, and you can walk round them), and the director placing the enemies
// and events (layout.js ENCOUNTERS: a box-mite family, the predatory mite, a
// falling drop, the predator again, a shower, the predator a third time, then
// the pseudoscorpion on guard at the wet leaf axil) as a player rushes out in 16
// directions, stands still, or turns back. The view is the SEM's own camera
// (main.js placeCamera: 12° vertical field, 16:9, 1.6 mm across at the mite,
// from rig.yaw at pitch 0.62) as a six-plane frustum.
//   node micro/game/mite/route.test.mjs
import assert from 'node:assert/strict';
import { createDirector } from '../shared/director.js';
import { RINGS, CLUSTERS, clusterRing, CLUSTER, PRED_GROUND, BOSS, BOUNDS, NPC_HOME, PORTAL_CLEAR, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, canPlace, portalAt, predZoneAt, clearOfThickets, distFromStart, DRIP, FAMILY, EDGE, insideEdge, HALF } from './layout.js';
import { floorH, TILE, wrapD, tileOf } from './world.js';

// Rushing speeds (µm/s, measured with rush scripts on the page, enemies passive; 2026-11-02 speeds):
// full tilt with every scramble the stamina allows ~1100 over open moss; in a thicket the drag
// (the scramble halves it) costs about a third.
const RUSH = 1100, THICK = 0.65;
const ORDER = ['mites', 'pred', 'drip', 'pred2', 'drips', 'pred3', 'portal'];
const PREDS = ['pred', 'pred2', 'pred3'];

// --- the scenery tile repeats seamlessly (the floor is periodic)
for (const [x, z] of [[0, 0], [123, -4567], [4799, 4800], [-12345, 6789]]) {
  for (const [kx, kz] of [[1, 0], [0, -1], [3, 2], [-2, 5]]) assert.ok(Math.abs(floorH(x, z) - floorH(x + kx * TILE, z + kz * TILE)) < 1e-6, `floor repeats at ${x}, ${z}`);
}
assert.equal(tileOf(TILE * 0.49), 0); assert.equal(tileOf(TILE * 0.51), 1);
assert.ok(Math.abs(wrapD(TILE * 1.25) - TILE * 0.25) < 1e-9);
assert.equal(TILE % 320, 0, 'a whole number of floor-texture repeats to the tile');

// --- the thickets (scenery): every way out meets each ring (passes within ~400 µm of a cluster: about a mite's length)
const t1 = clusterRing(0), t2 = clusterRing(1);
for (const [k, list] of [[0, t1], [1, t2]]) {
  for (let d = 0; d < 360; d += 0.5) {
    const a = (d * Math.PI) / 180, ux = Math.cos(a), uz = Math.sin(a);
    const near = Math.min(...list.map((c) => { const t = c.x * ux + c.z * uz; return Math.hypot(c.x - ux * t, c.z - uz * t) - c.r; }));
    assert.ok(near <= 400, `ring ${k + 1}: a way out at ${d}° passes ${near.toFixed(0)} µm from the nearest thicket`);
  }
  for (let i = 0; i < list.length; i++) {
    const a = list[i], b = list[(i + 1) % list.length];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.r + b.r + 300, `ring ${k + 1}: clusters ${i} and ${(i + 1) % list.length} stand apart (a way round)`);
  }
}
assert.equal(CLUSTERS.length, t1.length + t2.length);
assert.ok(CLUSTERS.length <= 70, `${CLUSTERS.length} thickets (each a few draws when in view)`);
for (const c of CLUSTERS) {
  assert.ok(distFromStart(c.x, c.z) - c.r >= RINGS.warm - 1, 'no thicket in the open moss round the start');
  assert.ok(Math.hypot(c.x - NPC_HOME.x, c.z - NPC_HOME.z) > c.r + 1400, 'the second box mite wanders clear of the thickets');
}
assert.deepEqual(ENCOUNTERS.map((e) => e.id), ORDER, 'the order (rising in threat)');
assert.ok(BOUNDS.half >= 400000, 'the walkable square is far beyond play (no wall in reach)');
assert.ok(ENCOUNTERS.at(-1).final);

// --- the edge of the cushion (edge.js): a wall of moss at the square's edge, nothing placed in it or in front of it
assert.ok(EDGE.face < HALF && EDGE.face > HALF - 1000, 'the wall stands at the walkable square\'s edge');
assert.ok(EDGE.height[0] > 3 * 1100, 'the wall stands far over a jump (apex ~1.1 mm)');
assert.ok(EDGE.height[0] > 4280 * Math.sin(0.62), 'and over the camera at the default zoom');
for (const e of ENCOUNTERS) {
  // the furthest out the director may place it (canPlace), each of its parts' discs, stays short of the apron
  const lim = Math.max(...[0, 1].map((k) => { let lo = 0, hi = HALF; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (canPlace(m, k ? m : 0, e.size)) lo = m; else hi = m; } return lo; }));
  assert.ok(lim + e.size <= EDGE.face - EDGE.apron, `${e.id}: placed at most ${lim.toFixed(0)} out, clear of the wall and its shed leaves`);
  if (e.parts) for (const [px, pz, pr] of e.parts(lim, 0, 0)) assert.ok(insideEdge(px, pz, pr), `${e.id}: its parts clear of the wall`);
}

// --- the SEM view as a frustum (main.js placeCamera)
const VFOV = 12, ASPECT = 16 / 9, YAW = -0.6 - Math.PI / 6, PITCH = 0.62;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
function view(x, z, hfw = 1600) {
  const tanV = Math.tan((VFOV * Math.PI) / 360), tanH = tanV * ASPECT, d = hfw / (2 * tanH);
  const T = [x, 0, z], C = [x + Math.cos(YAW) * Math.cos(PITCH) * d, Math.sin(PITCH) * d, z + Math.sin(YAW) * Math.cos(PITCH) * d];
  const f = norm(sub(T, C)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const ray = (sx, sy) => f.map((v, i) => v + r[i] * tanH * sx + u[i] * tanV * sy);
  const planes = [];
  const side = (a, b) => { let n = norm(cross(a, b)); if (dot(n, f) < 0) n = n.map((v) => -v); planes.push([...n, -dot(n, C)]); };
  side(ray(-1, -1), ray(-1, 1)); side(ray(1, -1), ray(1, 1)); side(ray(-1, -1), ray(1, -1)); side(ray(-1, 1), ray(1, 1));
  const near = Math.max(20, d * 0.08), far = d + 9000;
  planes.push([...f, -dot(f, C) - near], [...f.map((v) => -v), dot(f, C) + far]);
  return { frustum: planes, focus: { x, y: 0, z } };
}
// sanity: the view sees the mite, not 3 mm ahead of it either way
{
  const v = view(0, 0), inside = (x, y, z) => v.frustum.every((p) => p[0] * x + p[1] * y + p[2] * z + p[3] >= 0);
  assert.ok(inside(0, 0, 0) && inside(500, 0, 0) && !inside(3000, 0, 0) && !inside(-3000, 0, 0) && !inside(0, 0, 3000), 'the SEM view frames ~1.6 mm round the mite');
}

// --- a game: the director with the mite's settings and a fake world
const DT = 1 / 30;
const LEAD_DRIFT = 200; // main.js driftPred: a predator placed out of a lingering player's reach wanders over
function game({ seconds, move, players = 1, path = false }) {
  const bad = [];
  let D;
  const at = {};
  const place = (id) => (x, z, b) => {
    const e = ENCOUNTERS.find((q) => q.id === id);
    const parts = e.parts ? e.parts(x, z, b) : [[x, z, e.visible ?? e.size]];
    for (const [px, pz, r] of parts) {
      if (D.visibleNow(px, (e.top || 0) / 2, pz, Math.max(r, (e.top || 0) / 2))) bad.push(`${id} placed in view`);
      for (let k = 0; k < 8; k++) if (D.seenAt(px + Math.cos(k) * r * 0.7, pz + Math.sin(k) * r * 0.7)) bad.push(`${id} placed on seen moss`);
    }
    if (e.fits && !e.fits(x, z, b)) bad.push(`${id} does not fit`);
    if (at[id] && at[id].seen) bad.push(`${id} moved after it was seen`);
    for (const [k, h] of Object.entries(at)) if (path && k !== id && h.seen && D.entry(k).state !== 'met' && D.entry(k).def?.handle === h && D.entry(k).def.state !== 'placed') bad.push(`${k} dropped after it was seen`);
    at[id] = { x, z, b, t: 0, seen: false, ...(id === 'portal' ? portalAt(b, x, z) : PREDS.includes(id) ? predZoneAt(x, z) : {}) };
    return at[id];
  };
  const reach = (h, p) => Math.hypot(p.x - h.x, p.z - h.z);
  // as main.js: the family within its range, a drop once someone comes within its trigger (it falls), a predator on its ground
  const met = {
    mites: (h, [p]) => reach(h, p) < FAMILY.r + 500,
    pred: (h, [p]) => reach(h, p) < PRED_GROUND.r + 900,
    drip: (h, [p]) => reach(h, p) < DRIP.trigger,
    pred2: (h, [p]) => reach(h, p) < PRED_GROUND.r + 900,
    drips: (h, [p]) => reach(h, p) < DRIP.trigger,
    pred3: (h, [p]) => reach(h, p) < PRED_GROUND.r + 900,
    portal: (h, [p]) => reach(h, p) < 360,
  };
  D = createDirector({ ...DIRECTOR, canPlace, ...(path ? { defaultPath: DEFAULT_PATH } : {}), entries: ENCOUNTERS.map((e) => ({ ...e, place: place(e.id), met: met[e.id], ...(path ? { single: true } : {}) })) });
  const ps = Array.from({ length: players }, (_, id) => ({ id, x: id * 300, z: 0 }));
  const ev = [];
  let t = 0;
  for (; t < seconds && !D.done; t += DT) {
    for (const p of ps) move(t, p, D, at);
    const views = ps.map((p) => view(p.x, p.z));
    ev.push(...D.update(DT, ps, views));
    // what has been seen is frozen (the check above); a placed predator out of a lingering player's reach wanders over
    for (const id of ORDER) {
      const S = D.entry(id), h = at[id];
      if (!h || S.state !== 'placed') continue;
      if (S.seenT !== null) h.seen = true;
      if (!PREDS.includes(id) && id !== 'mites') continue; // (main.js driftPred, stepFamily)
      h.t += DT;
      const L = D.leader && ps[D.leader.id];
      if (h.t > 5 && L && !D.leader.moving && reach(h, L) > (id === 'mites' ? FAMILY.r + 300 : PRED_GROUND.r + 300)) { const d = reach(h, L); h.x += ((L.x - h.x) / d) * LEAD_DRIFT * DT; h.z += ((L.z - h.z) / d) * LEAD_DRIFT * DT; }
    }
    // (a default-path instance seen: never moved after)
    if (path) for (const id of ORDER) { const S = D.entry(id); if (S.def && S.def.seenT !== null && at[id] === S.def.handle) at[id].seen = true; }
  }
  return { ev, bad, D, at, t };
}
const first = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
const inThicket = (x, z) => !clearOfThickets(x, z, 0);
const times = [];
for (let k = 0; k < 16; k++) {
  let a = (k / 16) * Math.PI * 2 + 0.1;
  const r = game({ seconds: 150, move: (t, p, D, at) => {
    // rush out (~730 µm/s, a third slower in a thicket); near the edge of the square turn; once the portal is placed, make for it
    if (at.portal) a = Math.atan2(at.portal.z - p.z, at.portal.x - p.x);
    else if (Math.max(Math.abs(p.x), Math.abs(p.z)) > BOUNDS.half - 4000) a = Math.atan2(-p.z, -p.x) + 0.6;
    const sp = RUSH * (inThicket(p.x, p.z) ? THICK : 1);
    p.x += Math.cos(a) * sp * DT; p.z += Math.sin(a) * sp * DT;
  } });
  const tag = `bearing ${(k * 22.5).toFixed(1)}`;
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, `${tag}: every encounter, in order`);
  const T = {};
  for (const id of ORDER) { T[`${id}Placed`] = first(r.ev, 'placed', id).t; T[id] = first(r.ev, 'met', id).t; }
  assert.ok(T.mitesPlaced >= 3.5, `${tag}: a warm-up first (${T.mitesPlaced} s)`);
  assert.ok(T.mites <= 10, `${tag}: the first encounter within ~10 s (${T.mites} s)`);
  for (let q = 1; q < ORDER.length; q++) {
    assert.ok(T[`${ORDER[q]}Placed`] - T[ORDER[q - 1]] >= 4, `${tag}: a calm break before ${ORDER[q]} (${(T[`${ORDER[q]}Placed`] - T[ORDER[q - 1]]).toFixed(1)} s)`);
    assert.ok(T[ORDER[q]] - T[ORDER[q - 1]] <= 16, `${tag}: ${ORDER[q]} met within 16 s of ${ORDER[q - 1]} (${(T[ORDER[q]] - T[ORDER[q - 1]]).toFixed(1)} s): nothing long and empty`);
  }
  assert.ok(T.portal >= 45 && T.portal <= 95, `${tag}: the portal reached in about a minute and a quarter (${T.portal} s)`);
  for (const e of r.ev.filter((x) => x.type === 'placed')) assert.ok(['ahead', 'around'].includes(e.how), `${tag}: ${e.id} placed ${e.how}`);
  times.push(T);
}
const span = (k) => `${Math.min(...times.map((t) => t[k])).toFixed(1)}-${Math.max(...times.map((t) => t[k])).toFixed(1)} s`;
const gapMax = Math.max(...times.map((T) => Math.max(T.mites, ...ORDER.slice(1).map((id, q) => T[id] - T[ORDER[q]]))));

// --- lingering at the start: they come all the same, one by one, and the portal near them (then they go to it)
const r1 = game({ seconds: 300, move: (t, p, D, at) => {
  const S = D.entry('portal');
  if (S.state === 'placed') { S.goT ??= t; if (t - S.goT > 2) { const a = Math.atan2(at.portal.z - p.z, at.portal.x - p.x); p.x += Math.cos(a) * RUSH * 0.5 * DT; p.z += Math.sin(a) * RUSH * 0.5 * DT; } }
} });
assert.deepEqual(r1.bad, []);
assert.deepEqual(r1.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, 'lingering: every encounter in order');
const lp = first(r1.ev, 'placed', 'portal');
assert.ok(Math.hypot(lp.x, lp.z) < 10000, `lingering: the portal comes to them, just past the inner thickets (${Math.hypot(lp.x, lp.z).toFixed(0)} µm)`);
for (const e of r1.ev.filter((x) => x.type === 'placed')) assert.ok(['near', 'wider'].includes(e.how), `lingering: ${e.id} placed round them (${e.how})`);

// --- turning back: out 6 s, back the other way before the predator is in sight; it follows unseen, nothing seen changes
const r2 = game({ seconds: 150, move: (t, p, D, at) => {
  let a = t < 4.2 ? 0.4 : 0.4 + Math.PI;
  if (at.portal) a = Math.atan2(at.portal.z - p.z, at.portal.x - p.x);
  else if (Math.max(Math.abs(p.x), Math.abs(p.z)) > BOUNDS.half - 4000) a = Math.atan2(-p.z, -p.x) + 0.6;
  p.x += Math.cos(a) * RUSH * DT; p.z += Math.sin(a) * RUSH * DT;
} });
assert.deepEqual(r2.bad, [], 'turning back: nothing placed or moved where it was seen');
assert.ok(r2.ev.some((e) => e.type === 'moved'), 'turning back: an unseen encounter follows the turn');
assert.deepEqual(r2.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, 'turning back: every encounter in order');

// --- two players heading apart: the leader meets them; nothing is placed in either view
const r3 = game({ seconds: 150, players: 2, move: (t, p, D, at) => {
  let a = p.id ? 2.6 : 0.3;
  if (at.portal) a = Math.atan2(at.portal.z - p.z, at.portal.x - p.x);
  p.x += Math.cos(a) * RUSH * (p.id ? 0.4 : 1) * DT; p.z += Math.sin(a) * RUSH * (p.id ? 0.4 : 1) * DT;
} });
assert.deepEqual(r3.bad, []);
assert.deepEqual(r3.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, 'two players: every encounter in order');

// --- the default path (main.js passes layout.js DEFAULT_PATH; each encounter one object: `single`):
// the whole order laid out along one bearing on the first frame, the portal among it
const pathRows = [];
{
  // following the bearing (rushing to each in turn): the pre-placed ones met in order, the pre-placed portal reached; nothing generated
  const r = game({ seconds: 150, path: true, move: (t, p, D, at) => {
    const s = D.state(), cur = s.entries[s.index];
    let a = DEFAULT_PATH.bearing;
    if (cur && at[cur.id]) a = Math.atan2(at[cur.id].z - p.z, at[cur.id].x - p.x);
    const sp = RUSH * (inThicket(p.x, p.z) ? THICK : 1);
    p.x += Math.cos(a) * sp * DT; p.z += Math.sin(a) * sp * DT;
  } });
  assert.deepEqual(r.bad, [], 'default path: nothing placed in view or on seen moss');
  const placed = r.ev.filter((e) => e.type === 'placed');
  assert.deepEqual(placed.map((e) => `${e.id} ${e.how}`), ORDER.map((id) => `${id} default`), 'default path: all pre-placed, nothing generated');
  assert.ok(placed.every((e) => e.t < 0.1), 'default path: from the first frame');
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.instance}`), ORDER.map((id) => `${id} default`), 'default path: met in order on it');
  const pm = first(r.ev, 'met', 'portal');
  assert.ok(pm.t >= 35 && pm.t <= 95, `default path: the portal reached in about a minute and a quarter (${pm.t} s)`);
  pathRows.push(`followed: ${placed.map((e) => `${e.id} at ${(Math.hypot(e.x, e.z) / 1000).toFixed(1)} mm`).join(', ')}; met ${r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.t} s`).join(', ')}`);
}
for (const off of [Math.PI, Math.PI / 2, -Math.PI / 2]) {
  // heading off another way: each leaves the path while nobody has seen it and is placed as you go, in order
  const b0 = DEFAULT_PATH.bearing + off, tag = `off the path (${(off * 180 / Math.PI).toFixed(0)}°)`;
  const r = game({ seconds: 150, path: true, move: (t, p, D, at) => {
    let a = b0;
    if (D.entry('portal').state === 'placed') a = Math.atan2(at.portal.z - p.z, at.portal.x - p.x);
    else if (Math.max(Math.abs(p.x), Math.abs(p.z)) > BOUNDS.half - 4000) a = Math.atan2(-p.z, -p.x) + 0.6;
    const sp = RUSH * (inThicket(p.x, p.z) ? THICK : 1);
    p.x += Math.cos(a) * sp * DT; p.z += Math.sin(a) * sp * DT;
  } });
  assert.deepEqual(r.bad, [], `${tag}: nothing placed in view or on seen moss, nothing seen moved`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER, `${tag}: every encounter, in order`);
  for (const id of ORDER) {
    const e = r.ev.find((x) => x.type === 'placed' && x.id === id && x.how !== 'default');
    assert.ok(e && e.from === 'default' && ['ahead', 'around'].includes(e.how), `${tag}: ${id} taken off the path and placed as you go (${e && e.how})`);
  }
  assert.ok(r.ev.filter((e) => e.type === 'met').every((e) => e.instance === 'dynamic'), `${tag}: met where they were placed as you go`);
  pathRows.push(`${tag}: met ${r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.t} s`).join(', ')}`);
}

// --- the portal and its arena: the boss's post before the water, beside the way in
const q = portalAt(0.7, 12000, -8000);
assert.ok(Math.hypot(q.post.x - q.x, q.post.z - q.z) < BOSS.wake + 200, 'its post is beside the way in');
assert.ok((q.post.x - q.x) * q.ux + (q.post.z - q.z) * q.uz < 0, 'the boss waits on the near side of the water');
assert.ok(PORTAL_CLEAR >= 1200, 'an arena round the water');

console.log(`default path: ${pathRows.join('; ')}`);
console.log(`ok: tile ${TILE} µm; ${CLUSTERS.length} thickets (${t1.length} + ${t2.length}, scenery, ${CLUSTER.r * 2 / 1000} mm across); rushing in 16 directions: ${ORDER.map((id) => `${id} met ${span(id)}`).join(', ')}; longest wait between encounters ${gapMax.toFixed(1)} s; lingering: ${r1.ev.filter((e) => e.type === 'placed' || e.type === 'met').map((e) => `${e.id} ${e.type} ${e.t} s${e.how && e.type === 'placed' ? ` (${e.how})` : ''}`).join(', ')}; turning back: ${r2.ev.filter((e) => e.type !== 'met').map((e) => `${e.id} ${e.type} ${e.t} s (${e.how})`).join(', ')}`);
