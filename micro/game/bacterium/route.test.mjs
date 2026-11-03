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
import { createWorld, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, canPlace, inWater, START, WORLD } from './world.js';
import { createCollectives } from './collective.js';
import { createStentor } from './stentor.js';
import { createGuards } from './guards.js';

assert.deepEqual(ENCOUNTERS.map((e) => e.id), ['grazer1', 'bdello', 'phage', 'amoeba', 'grazer2', 'portal'], 'the order');
assert.ok(ENCOUNTERS.at(-1).final && ENCOUNTERS.every((e) => e.need > 0));

const DT = 1 / 30, SPEED = 45, ASPECT = 16 / 9;
const DRIFT = 6, DRIFT_WAIT = 4, ARMY_HOLD = 8; // main.js driftGate, armyHold

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
      Object.defineProperty(o, 'calm', { get: () => ({ sec: (i === 0 ? DIRECTOR.warmup : DIRECTOR.calm).sec + Math.max(0, Math.min(ARMY_HOLD, e.need - army(D))) }) });
      return o;
    }),
  });
  const ev = [];
  let idle = 0, t = 0;
  for (; t < seconds && !D.done; t += DT) {
    move(t, p, D, { guards, host });
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
  return { ev, bad, moved, movedN, D, guards, host, t, p, seen: (x, y) => seenPt(x, y) };
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
for (let k = 0; k < 16; k++) {
  const r = game({ seconds: 150, move: rusher((k / 16) * Math.PI * 2) });
  const tag = `bearing ${k * 22.5}`;
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.moved, [], `${tag}: seen scenery stays put`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), `${tag}: every gate, in order`);
  assert.ok(at(r.ev, 'placed', 'portal'), `${tag}: the portal placed`);
  for (const e of r.ev.filter((x) => x.type === 'placed' || x.type === 'moved')) {
    const spec = ENCOUNTERS.find((s) => s.id === e.id);
    assert.ok(!spec.fits || spec.fits(e.x, e.z, e.b), `${tag}: ${e.id} in open water`);
  }
  const T = { first: at(r.ev, 'placed', 'grazer1').t, portalPlaced: at(r.ev, 'placed', 'portal').t, portal: r.p.reached ?? Infinity, metHow: r.ev.filter((e) => e.type === 'met').map((e) => e.how) };
  for (const id of ORDER.slice(0, -1)) T[id] = at(r.ev, 'met', id).t;
  assert.ok(T.first >= 4.5, `${tag}: a warm-up first (${T.first} s)`);
  assert.ok(T.grazer1 <= 12, `${tag}: the first gate within ~10 s (${T.grazer1} s)`);
  for (let i = 1; i < ORDER.length - 1; i++) assert.ok(at(r.ev, 'placed', ORDER[i]).t - T[ORDER[i - 1]] >= 4.5, `${tag}: a calm break before ${ORDER[i]}`);
  // V=1 node route.test.mjs: each run's placements
  if (process.env.V) console.log(tag, JSON.stringify(T), r.ev.filter((e) => e.type !== 'met').map((e) => `${e.type} ${e.id} ${e.t} ${e.how} ${Math.hypot(e.x - START.x, e.z - START.y).toFixed(0)} µm out`).join('; '));
  assert.ok(T.portal <= 70, `${tag}: the portal reached within about a minute (${T.portal} s)`);
  times.push(T);
}
const span = (k) => `${Math.min(...times.map((t) => t[k])).toFixed(1)}-${Math.max(...times.map((t) => t[k])).toFixed(1)} s`;
const howMet = times.flatMap((t) => t.metHow).reduce((o, h) => ((o[h] = (o[h] || 0) + 1), o), {});

// the eyepiece field (180 µm, 320 across): still every gate, out of view, on unseen water
const wide = [0, 2, 4, 6].map((q) => game({ seconds: 150, fieldH: 180, move: rusher((q / 8) * Math.PI * 2) }));
for (const r of wide) {
  assert.deepEqual(r.bad, [], 'wide field');
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'wide field: every gate in order');
  assert.ok(r.p.reached !== undefined, 'wide field: the portal reached');
}

// a small army: the breaks last longer (up to ARMY_HOLD s) while it is short of the next gate's need
const small = game({ seconds: 200, army: () => 1, move: rusher(0.4) });
assert.deepEqual(small.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'small army: every gate in order all the same');
const firstSmall = at(small.ev, 'placed', 'grazer1').t;
assert.ok(firstSmall >= DIRECTOR.warmup.sec + ARMY_HOLD - 0.5, `small army: a longer warm-up (${firstSmall} s)`);

// lingering at the start: every gate still comes (placed round them, then coming over), then the portal near them
let lingerPortal = null;
const lin = game({ seconds: 400, move: (t, p, D, { host }) => {
  const s = D.state();
  if (s.current === 'portal' && s.phase === 'placed') {
    lingerPortal ??= t;
    if (t - lingerPortal > 2) { const a = Math.atan2(host.y - p.z, host.x - p.x), d = Math.hypot(host.x - p.x, host.y - p.z); if (d < 12) { p.reached ??= t; return; } p.x += Math.cos(a) * SPEED * DT; p.z += Math.sin(a) * SPEED * DT; }
  }
} });
assert.deepEqual(lin.bad, []);
assert.deepEqual(lin.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'lingering: every gate in order');
for (const e of lin.ev.filter((x) => x.type === 'placed')) assert.ok(['near', 'wider'].includes(e.how) && Math.hypot(e.x - START.x, e.z - START.y) < 300, `lingering: ${e.id} placed round them (${e.how}, ${Math.hypot(e.x - START.x, e.z - START.y).toFixed(0)} µm)`);
assert.ok(lin.p.reached !== undefined, 'lingering: the portal reached once they go to it');

// out and back: head out for 14 s, turn round to the start and on beyond: nothing placed where they had looked
const back = game({ seconds: 150, move: (() => { const go = rusher(0.9); const ret = rusher(0.9 + Math.PI); return (t, p, D, o) => (t < 14 ? go : ret)(t, p, D, o); })() });
assert.deepEqual(back.bad, [], 'turn back: nothing placed on seen water');
assert.deepEqual(back.moved, [], 'turn back: seen scenery stays put');
assert.deepEqual(back.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'turn back: every gate in order');

// the default path (main.js passes world.js DEFAULT_PATH; the host one thing: `single`): the host laid at the
// far end of the field's diagonal on the first frame; the gates still placed as you go (breaks, army hold)
const pathRows = [];
const pathDyn = ORDER.filter((id, i) => DEFAULT_PATH.dists[i] == null);
{
  // following it (rushing at the host; each gate as it comes, then the host once open): the gates placed as you
  // go on the way and met in order, the pre-placed host reached; only the host pre-placed
  const r = game({ seconds: 200, path: true, move: (t, p, D, { guards, host }) => {
    const s = D.state(), cur = s.entries[s.index];
    if (!cur) return;
    let tgt = host;
    if (cur.id !== 'portal' && cur.state === 'placed') tgt = guards.centre(guards.byId[cur.id]);
    const a = Math.atan2(tgt.y - p.z, tgt.x - p.x), d = Math.hypot(tgt.x - p.x, tgt.y - p.z);
    if (cur.id === 'portal' && d < 12) { p.reached ??= t; return; }
    if (cur.id !== 'portal' && tgt === host && d < 60) return; // (at the sealed host: wait for the next gate)
    p.x += Math.cos(a) * SPEED * DT; p.z += Math.sin(a) * SPEED * DT;
  } });
  assert.deepEqual(r.bad, [], 'default path: nothing placed on seen water');
  assert.deepEqual(r.moved, [], 'default path: seen scenery stays put');
  const pre = r.ev.filter((e) => e.type === 'placed' && e.how === 'default');
  assert.deepEqual(pre.map((e) => e.id), ORDER.filter((id) => !pathDyn.includes(id)), 'default path: the host pre-placed');
  assert.ok(pre.every((e) => e.t < 0.1), 'default path: from the first frame');
  assert.ok(!r.ev.some((e) => e.type === 'placed' && e.id === 'portal' && e.how !== 'default'), 'default path: the host not generated again');
  for (const id of pathDyn) assert.ok(r.ev.some((e) => e.type === 'placed' && e.id === id && e.how !== 'default'), `default path: ${id} placed as you go`);
  for (let i = 1; i < pathDyn.length; i++) assert.ok(at(r.ev, 'placed', pathDyn[i]).t - at(r.ev, 'met', pathDyn[i - 1]).t >= 4.5, `default path: a calm break before ${pathDyn[i]}`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'default path: every gate met in order');
  assert.ok(r.p.reached !== undefined, 'default path: the host reached once open');
  pathRows.push(`followed: host pre-placed ${Math.hypot(pre.at(-1).x - START.x, pre.at(-1).z - START.y).toFixed(0)} µm out; gates placed ${pathDyn.map((id) => `${id} ${at(r.ev, 'placed', id).t}`).join(', ')}; met ${r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.t}`).join(', ')}; host reached ${r.p.reached.toFixed(1)} s`);
}
for (const off of [Math.PI, Math.PI / 2, -Math.PI / 2]) {
  // heading off another way: the gates placed as you go in order; the host, while nobody has seen it, leaves the path
  const tag = `off the path (${Math.round((off * 180) / Math.PI)}°)`;
  const r = game({ seconds: 200, path: true, move: rusher(DEFAULT_PATH.bearing + off) });
  assert.deepEqual(r.bad, [], `${tag}: nothing placed on seen water`);
  assert.deepEqual(r.moved, [], `${tag}: seen scenery stays put`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), `${tag}: every gate, in order`);
  const hp = r.ev.find((x) => x.type === 'placed' && x.id === 'portal' && x.how !== 'default'), seen = r.D.entry('portal').def.seenT;
  assert.ok(hp ? hp.from === 'default' : seen !== null, `${tag}: the host taken off the path (or, seen on it first, left there)`);
  assert.ok(r.p.reached !== undefined, `${tag}: the host reached`);
  pathRows.push(`${tag}: met ${r.ev.filter((e) => e.type === 'met').map((e) => `${e.id} ${e.t}`).join(', ')}; host ${hp ? `placed as you go ${hp.t} s (${hp.how})` : `seen on the path at ${seen.toFixed(1)} s, left there`}, reached ${r.p.reached.toFixed(1)} s`);
}
{
  // the army-size hold still applies with the path: with a small army the warm-up and each break are longer
  const r = game({ seconds: 300, path: true, army: () => 1, move: rusher(DEFAULT_PATH.bearing) });
  const g1 = at(r.ev, 'placed', 'grazer1');
  assert.ok(g1.t >= DIRECTOR.warmup.sec + ARMY_HOLD - 0.5, `default path, small army: a longer warm-up (${g1.t} s)`);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ORDER.slice(0, -1), 'default path, small army: every gate in order');
  pathRows.push(`small army: first gate placed ${g1.t} s`);
}

const evs = (r) => r.ev.filter((e) => e.type === 'placed' || e.type === 'met').map((e) => `${e.id} ${e.type} ${e.t}${e.how && e.type === 'placed' ? ` (${e.how})` : ''}`).join(', ');
console.log(`ok: rushing in 16 directions (default field): first gate placed ${span('first')}, met ${span('grazer1')}; bdello ${span('bdello')}, phage ${span('phage')}, amoeba ${span('amoeba')}, grazer2 ${span('grazer2')}; portal placed ${span('portalPlaced')}, reached ${span('portal')}; how met ${JSON.stringify(howMet)}
wide field (4 runs): portal reached ${wide.map((r) => r.p.reached.toFixed(1)).join(', ')} s
small army: warm-up ${firstSmall} s, portal placed ${at(small.ev, 'placed', 'portal').t} s
lingering: ${evs(lin)}; reached ${lin.p.reached.toFixed(1)} s
turn back: ${evs(back)}
default path: ${pathRows.join('\n  ')}`);
