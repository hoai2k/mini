// The bacterium's encounters, without a browser: the real world and gates
// (world.js, guards.js) and the director (shared/director.js) with the
// world's settings (world.js DIRECTOR, ENCOUNTERS), as a player's flock
// rushes out in 16 directions, lingers at the start, or heads out and turns
// back (V=1 prints each rush's placements). The view is the field round the flock's middle (45 µm tall at the
// default zoom, 80 across at 16:9; one run at the eyepiece field, 180 x 320).
// An independent finer grid checks that nothing is ever placed (or moved)
// where a view has been, and that the scenery a view has seen never changes.
//   node micro/game/bacterium/route.test.mjs
import assert from 'node:assert/strict';
import { createDirector } from '../shared/director.js';
import { createWorld, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, canPlace, inWater, START, WORLD, DROP, BEATS, COLONIES, routeAlong, rimDist, FAR_OUT } from './world.js';
import { createCollectives } from './collective.js';
import { createStentor } from './stentor.js';
import { createGuards } from './guards.js';

assert.deepEqual(ENCOUNTERS.map((e) => e.id), ['grazer1', 'bdello', 'amoeba', 'portal'], 'the order: three gates, then the host with Stentor');
assert.ok(ENCOUNTERS.at(-1).final && ENCOUNTERS.every((e) => e.need > 0));
assert.ok(ENCOUNTERS.every((e, i) => i === 0 || e.need > ENCOUNTERS[i - 1].need), 'each gate wants a bigger swarm than the last');

// --- the drop: its edge is well beyond the host in every direction (the owner: "You should be able to find a portal long before you find the edge") ---
{
  const hostReach = BEATS.host + 122 + 128; // the host, Stentor's mouth beyond it, its oral disc
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2, far = { x: START.x + Math.cos(a) * 2 * BEATS.host, y: START.y + Math.sin(a) * 2 * BEATS.host };
    assert.ok(rimDist(far.x, far.y) > 0, `the edge is beyond twice the host's distance at ${(a * 57.3).toFixed(0)}°`);
  }
  assert.ok(DROP.R >= 2 * BEATS.host && DROP.R - hostReach > 1800, `the edge ${DROP.R} µm out, the host ${BEATS.host} (Stentor's disc ${hostReach}), so ${DROP.R - hostReach} µm beyond it`);
  // the beats in order along the route: gate, colony, gate, colony, gate, colony, host
  const along = ['grazer1', 'colony1', 'bdello', 'colony2', 'amoeba', 'colony3', 'host'].map((k) => BEATS[k]);
  assert.ok(along.every((d, i) => i === 0 || d > along[i - 1] + 150), `the beats are spaced along the route (${along.join(', ')} µm)`);
  for (const C of COLONIES) { const r = routeAlong(C.x, C.y); assert.ok(Math.abs(r.lat) < 60 && inWater(C.x, C.y, C.r), `${C.id} beside the route`); }
  assert.ok(COLONIES.every((C, i) => i === 0 || C.kin > COLONIES[i - 1].kin), 'each colony bigger than the last');
}

const DT = 1 / 30, SPEED = 45, ASPECT = 16 / 9;
const DRIFT = 6, DRIFT_WAIT = 4, ARMY_HOLD = 8; // main.js driftGate, armyHold (a second per 4 cells short, up to ARMY_HOLD)

function game({ seconds, move, fieldH = 45, army = () => 30, check = true, path = false }) {
  const world = createWorld();
  const stentor = createStentor();
  world.stentor = stentor;
  const coll = createCollectives(world);
  world.coll = coll;
  const guards = createGuards(world, coll, stentor);
  for (const q of guards.list) if (q.kind !== 'stentor') guards.park(q);
  const fw = fieldH * ASPECT, pad = 6;
  // an independent seen grid (5 µm cells): everything every view has framed
  const G = 5, gx = (x) => Math.floor((x - WORLD.x0) / G), gy = (y) => Math.floor((y - WORLD.slabY) / G), NX = gx(WORLD.x1) + 1, NY = gy(WORLD.y1) + 1;
  let maxOut = 0;
  const mine = new Uint8Array(NX * NY);
  const markRect = (x0, y0, x1, y1) => { for (let j = Math.max(0, gy(y0)); j <= Math.min(NY - 1, gy(y1)); j++) for (let i = Math.max(0, gx(x0)); i <= Math.min(NX - 1, gx(x1)); i++) mine[i + NX * j] = 1; };
  const discSeen = (x, y, r) => { for (let j = Math.max(0, gy(y - r)); j <= Math.min(NY - 1, gy(y + r)); j++) for (let i = Math.max(0, gx(x - r)); i <= Math.min(NX - 1, gx(x + r)); i++) { const cx = WORLD.x0 + (i + 0.5) * G, cy = WORLD.slabY + (j + 0.5) * G; if (Math.hypot(cx - x, cy - y) < r - G && mine[i + NX * j]) return true; } return false; };
  const seenPt = (x, y) => { const i = gx(x), j = gy(y); return i >= 0 && j >= 0 && i < NX && j < NY && !!mine[i + NX * j]; };
  const bad = [], moved = [];
  const movedN = { n: 0 };
  const p = { id: 0, x: START.x, z: START.y };
  let lastLeader = null;
  // the gates' places, and the portal (main.js placePortal: the host, its water cleared, Stentor beyond)
  const host = { placed: false, x: 0, y: 0 };
  const stentorGrain = { x: 1e6, y: 0, r: 14 };
  const verify = (id, x, y, b, how) => {
    const spec = ENCOUNTERS.find((e) => e.id === id);
    const parts = spec.parts ? spec.parts(x, y, b) : [[x, y, spec.visible ?? spec.size]];
    if (check) for (const [px, py, r] of parts) if (discSeen(px, py, r)) bad.push(`${id} ${how}: part at (${px.toFixed(0)}, ${py.toFixed(0)}) r ${r} on seen water`);
  };
  const ENC = {};
  for (const q of guards.list) if (q.kind !== 'stentor') ENC[q.id] = {
    place: (x, y, b, info) => { verify(q.id, x, y, b, 'placed'); guards.placeGate(q, x, y, b); return q; },
    met: (h, [P]) => { const c = guards.centre(q); return Math.hypot(P.x - c.x, P.z - c.y) < q.zone + 8; },
  };
  ENC.portal = {
    place: (x, y, b) => {
      verify('portal', x, y, b, 'placed');
      // the host's water is cleared (grains and biofilm moved off): none of it where a view has been
      const g0 = world.grains.map((g) => [g.x, g.y, g.r]), f0 = world.film.map((c) => [c.x, c.y]);
      world.setPortal(x, y, b); world.clearHostWater(x, y, stentorGrain); stentor.place(x, y, b); Object.assign(host, { placed: true, x, y });
      world.grains.forEach((g, i) => { if (g.x !== g0[i][0] || g.y !== g0[i][1]) { movedN.n++; if (discSeen(g0[i][0], g0[i][1], g.r + G) || discSeen(g.x, g.y, g.r + G)) moved.push(`grain ${i}`); } });
      world.film.forEach((c, i) => { if (c.x !== f0[i][0] || c.y !== f0[i][1]) { movedN.n++; if (seenPt(f0[i][0], f0[i][1]) || seenPt(c.x, c.y)) moved.push(`film ${i}`); } });
      return host;
    },
    met: () => false,
  };
  const D = createDirector({
    ...DIRECTOR,
    ...(path ? { defaultPath: DEFAULT_PATH } : {}),
    canPlace: (x, y, r, o) => canPlace(x, y, r) && guards.list.every((q) => !q.placed || q.id === o.entry.id || Math.hypot(guards.centre(q).x - x, guards.centre(q).y - y) > r * 0.5 + q.zone),
    entries: ENCOUNTERS.map((e, i) => {
      const o = { ...e, ...ENC[e.id], ...(path ? { single: true } : {}) };
      Object.defineProperty(o, 'calm', { get: () => (Math.hypot(p.x - START.x, p.z - START.y) > FAR_OUT ? { sec: 1 } : { sec: (i === 0 ? DIRECTOR.warmup : DIRECTOR.calm).sec + Math.max(0, Math.min(ARMY_HOLD, (e.need - army(D)) / 4)) }) });
      return o;
    }),
  });
  const ev = [];
  let idle = 0, t = 0;
  for (; t < seconds && !D.done; t += DT) {
    move(t, p, D, { guards, host });
    maxOut = Math.max(maxOut, Math.hypot(p.x - START.x, p.z - START.y));
    const x0 = p.x - fw / 2 - pad, x1 = p.x + fw / 2 + pad, y0 = p.z - fieldH / 2 - pad, y1 = p.z + fieldH / 2 + pad;
    const view = { frustum: [[1, 0, 0, -x0], [-1, 0, 0, x1], [0, 0, 1, -y0], [0, 0, -1, y1]], focus: { x: p.x, y: 0, z: p.z } };
    const out = D.update(DT, [p], [view]);
    markRect(x0, y0, x1, y1);
    ev.push(...out);
    // main.js driftGate: a gate placed out of a lingering player's reach comes over to them
    const L = D.leader;
    idle = L && !L.moving ? idle + DT : 0;
    const e = ENCOUNTERS[D.index], q = e && guards.byId[e.id], S = e && D.entry(e.id);
    if (q && q.placed && idle > DRIFT_WAIT && S.state === 'placed' && D.state().t - S.placedT > DRIFT_WAIT) {
      const c = guards.centre(q), dx = p.x - c.x, dy = p.z - c.y, d = Math.hypot(dx, dy);
      if (d > q.zone) { const k = Math.min(d - q.zone + 1, DRIFT * DT) / d; guards.shift(q, dx * k, dy * k); }
    }
    lastLeader = L;
  }
  return { ev, bad, moved, movedN, D, guards, host, t, p, maxOut, seen: (x, y) => seenPt(x, y) };
}
const at = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
const ORDER = ENCOUNTERS.map((e) => e.id);

/** Rush: swim straight out at full speed; at the water's edge turn; once something placed has been seen, go to it. */
function rusher(a0) {
  let a = a0;
  return (t, p, D, { guards, host }) => {
    const s = D.state(), cur = s.entries[s.index];
    // (a gate once seen; the portal once placed: its golden light spills in from the edge of the view on its side)
    // (with a default path: its instance too, once seen; the small field shows it often)
    if (cur && ((cur.state === 'placed' && (cur.seenT !== null || cur.id === 'portal')) || (cur.def && cur.def.state === 'placed' && cur.def.seenT !== null))) {
      const tgt = cur.id === 'portal' ? host : guards.centre(guards.byId[cur.id]);
      a = Math.atan2(tgt.y - p.z, tgt.x - p.x);
      if (cur.id === 'portal' && Math.hypot(tgt.x - p.x, tgt.y - p.z) < 12) { p.reached ??= t; return; }
    }
    for (let i = 0; i < 12; i++) {
      const b = a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5;
      const nx = p.x + Math.cos(b) * SPEED * DT, ny = p.z + Math.sin(b) * SPEED * DT;
      if (inWater(nx, ny, 25)) { p.x = nx; p.z = ny; if (i > 2) a = b; return; }
    }
    a += 2.2;
  };
}
const times = [];
// rushing out in 16 directions (the default path on, as main.js has it; off its bearing every gate is placed as you go)
for (let k = 0; k < 16; k++) {
  const r = game({ seconds: 200, path: true, move: rusher((k / 16) * Math.PI * 2) });
  const tag = `bearing ${k * 22.5}`;
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.moved, [], `${tag}: seen scenery stays put`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), `${tag}: every gate, in order`);
  for (const e of r.ev.filter((x) => x.type === 'placed' || x.type === 'moved')) {
    const spec = ENCOUNTERS.find((s) => s.id === e.id);
    assert.ok(!spec.fits || spec.fits(e.x, e.z, e.b), `${tag}: ${e.id} in open water`);
  }
  const T = { portal: r.p.reached ?? Infinity, metHow: r.ev.filter((e) => e.type === 'met').map((e) => e.how), out: Math.round(r.maxOut) };
  for (const id of ORDER.slice(0, -1)) T[id] = at(r.ev, 'met', id).t;
  assert.ok(T.grazer1 <= 18, `${tag}: the first gate within ~15 s (${T.grazer1} s)`);
  if (process.env.V) console.log(tag, JSON.stringify(T));
  assert.ok(T.portal <= 120, `${tag}: the host reached within two minutes of rushing (${T.portal} s)`);
  // and long before the edge: the furthest out they went is well inside the drop
  if (process.env.V) console.log(tag, r.ev.filter((e) => e.type !== "met").map((e) => `${e.type} ${e.id} ${e.t} ${e.how} ${Math.hypot(e.x - START.x, e.z - START.y).toFixed(0)}`).join("; "));
  assert.ok(r.maxOut < DROP.R * 0.65, `${tag}: the host long before the edge (furthest out ${T.out} µm of ${DROP.R})`);
  times.push(T);
}
const span = (k) => `${Math.min(...times.map((t) => t[k])).toFixed(1)}-${Math.max(...times.map((t) => t[k])).toFixed(1)} s`;
const howMet = times.flatMap((t) => t.metHow).reduce((o, h) => ((o[h] = (o[h] || 0) + 1), o), {});

// a wide field (180 µm, 320 across: a big swarm's camera): still every gate, out of view, on unseen water
const wide = [0, 2, 4, 6].map((q) => game({ seconds: 200, fieldH: 180, path: true, move: rusher((q / 8) * Math.PI * 2 + 1) }));
for (const r of wide) {
  assert.deepEqual(r.bad, [], 'wide field');
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'wide field: every gate in order');
  assert.ok(r.p.reached !== undefined, 'wide field: the host reached');
}

// a small army off the route: the breaks last longer (up to ARMY_HOLD s) while it is short of the next gate's need
const small = game({ seconds: 300, army: () => 1, move: rusher(DEFAULT_PATH.bearing + Math.PI) });
assert.deepEqual(small.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'small army: every gate in order all the same');
const firstSmall = at(small.ev, 'placed', 'grazer1').t;
assert.ok(firstSmall >= DIRECTOR.warmup.sec + Math.min(ARMY_HOLD, (ENCOUNTERS[0].need - 1) / 4) - 0.5, `small army: a longer warm-up (${firstSmall} s)`);

// lingering at the start (no default path): every gate still comes (placed round them, then coming over), then the host near them
let lingerPortal = null;
const lin = game({ seconds: 500, move: (t, p, D, { host }) => {
  const s = D.state();
  if (s.current === 'portal' && s.phase === 'placed') {
    lingerPortal ??= t;
    if (t - lingerPortal > 2) { const a = Math.atan2(host.y - p.z, host.x - p.x), d = Math.hypot(host.x - p.x, host.y - p.z); if (d < 12) { p.reached ??= t; return; } p.x += Math.cos(a) * SPEED * DT; p.z += Math.sin(a) * SPEED * DT; }
  }
} });
assert.deepEqual(lin.bad, []);
assert.deepEqual(lin.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'lingering: every gate in order');
for (const e of lin.ev.filter((x) => x.type === 'placed')) assert.ok(['near', 'wider'].includes(e.how) && Math.hypot(e.x - START.x, e.z - START.y) < 400, `lingering: ${e.id} placed round them (${e.how}, ${Math.hypot(e.x - START.x, e.z - START.y).toFixed(0)} µm)`);
assert.ok(lin.p.reached !== undefined, 'lingering: the host reached once they go to it');

// out and back: head out for 14 s, turn round to the start and on beyond: nothing placed where they had looked
const back = game({ seconds: 200, path: true, move: (() => { const go = rusher(2.4); const ret = rusher(2.4 + Math.PI); return (t, p, D, o) => (t < 14 ? go : ret)(t, p, D, o); })() });
assert.deepEqual(back.bad, [], 'turn back: nothing placed on seen water');
assert.deepEqual(back.moved, [], 'turn back: seen scenery stays put');
assert.deepEqual(back.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'turn back: every gate in order');

// --- the route (world.js DEFAULT_PATH): every gate and the host pre-placed along it on the first frame, in order; walking it meets them in order ---
const pathRows = [];
{
  const r = game({ seconds: 200, path: true, move: (t, p, D, { guards, host }) => {
    const s = D.state(), cur = s.entries[s.index];
    if (!cur) return;
    // walk the route; turn to each thing once it is in sight
    const tgt = cur.id === 'portal' ? host : guards.centre(guards.byId[cur.id]);
    const a = Math.atan2(tgt.y - p.z, tgt.x - p.x), d = Math.hypot(tgt.x - p.x, tgt.y - p.z);
    if (cur.id === 'portal' && d < 12) { p.reached ??= t; return; }
    p.x += Math.cos(a) * SPEED * DT; p.z += Math.sin(a) * SPEED * DT;
  } });
  assert.deepEqual(r.bad, [], 'the route: nothing placed on seen water');
  assert.deepEqual(r.moved, [], 'the route: seen scenery stays put');
  const pre = r.ev.filter((e) => e.type === 'placed' && e.how === 'default');
  assert.deepEqual(pre.map((e) => e.id), ORDER, 'the route: every gate and the host pre-placed');
  assert.ok(pre.every((e) => e.t < 0.1), 'the route: from the first frame');
  const along = pre.map((e) => routeAlong(e.x, e.z));
  assert.ok(along.every((q, i) => Math.abs(q.lat) <= 90 && Math.abs(q.d - DEFAULT_PATH.dists[i]) < DEFAULT_PATH.dists[i] * 0.3), `the route: each on the line at its beat (${along.map((q) => `${q.d.toFixed(0)}/${q.lat.toFixed(0)}`).join(', ')})`);
  assert.ok(along.every((q, i) => i === 0 || q.d > along[i - 1].d), 'the route: in order along it');
  // each colony lies between the gate before it and the next
  COLONIES.forEach((C, i) => { const c = routeAlong(C.x, C.y).d; assert.ok(c > along[i].d && c < along[i + 1].d, `${C.id} between ${ORDER[i]} and ${ORDER[i + 1]}`); });
  assert.ok(!r.ev.some((e) => e.type === 'placed' && e.how !== 'default'), 'the route: nothing generated again');
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'the route: every gate met in order');
  assert.ok(r.p.reached !== undefined, 'the route: the host reached once open');
  pathRows.push(`walked: pre-placed ${pre.map((e) => `${e.id} ${routeAlong(e.x, e.z).d.toFixed(0)} µm`).join(', ')}; met ${r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.t}`).join(', ')}; host reached ${r.p.reached.toFixed(1)} s (no fights)`);
}

const evs = (r) => r.ev.filter((e) => e.type === 'placed' || e.type === 'met').map((e) => `${e.id} ${e.type} ${e.t}${e.how && e.type === 'placed' ? ` (${e.how})` : ''}`).join(', ');
console.log(`ok: rushing in 16 directions: gates met ${span('grazer1')}, ${span('bdello')}, ${span('amoeba')}; host reached ${span('portal')}; furthest out ${Math.min(...times.map((t) => t.out))}-${Math.max(...times.map((t) => t.out))} µm (the edge ${DROP.R}); how met ${JSON.stringify(howMet)}
wide field (4 runs): host reached ${wide.map((r) => r.p.reached.toFixed(1)).join(', ')} s
small army: warm-up ${firstSmall} s, host placed ${at(small.ev, 'placed', 'portal').t} s
lingering: ${evs(lin)}; reached ${lin.p.reached.toFixed(1)} s
turn back: ${evs(back)}
route: ${pathRows.join('\n  ')}`);
