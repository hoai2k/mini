// The encounter director (director.js), in Node with a fake world: a player
// on a plane, a narrow wedge-shaped view behind them looking along their way
// (like the springtail's macro lens), and enemies that walk toward the
// nearest player once placed.
//   node micro/prototypes/shared/director.test.mjs
import assert from 'node:assert/strict';
import { createDirector } from './director.js';

const DT = 1 / 30;
/**
 * A view as planes: a wedge from a camera `back` units behind (x, z), looking
 * along `a`, half-angle `h`, seeing the ground from 0.6 back to `reach` past
 * the player (the springtail's low macro view sees the film ~40 mm before its
 * subject to ~55 mm beyond).
 */
function wedge(x, z, a, h = 0.2, back = 120, reach = 60) {
  const cx = x - Math.cos(a) * back, cz = z - Math.sin(a) * back;
  const plane = (ang) => { const nx = -Math.sin(ang), nz = Math.cos(ang); return [nx, 0, nz, -(nx * cx + nz * cz)]; };
  const L = plane(a - h), R = plane(a + h).map((v) => -v);
  const fx = Math.cos(a), fz = Math.sin(a);
  const near = [fx, 0, fz, -(fx * cx + fz * cz) - back * 0.6];
  const far = [-fx, 0, -fz, fx * cx + fz * cz + back + reach];
  return { frustum: [L, R, near, far], focus: { x, y: 0, z } };
}
const inWedge = (v, x, z, r = 0) => v.frustum.every((p) => p[0] * x + p[2] * z + p[3] >= -r);

function makeWorld({ walkers = true } = {}) {
  const things = [];
  const checks = { placedOnSeen: 0, placedInView: 0, movedSeen: 0, places: 0 };
  let dir = null;
  const mk = (id, size, extra = {}) => ({
    id, size, minAhead: size + 30, maxAhead: size + 70, minNear: size + 10, maxNear: size + 40, ...extra,
    place(x, z, b) {
      checks.places++;
      // what the director promises: unseen cells under it and out of every view
      for (let a = 0; a < 12; a++) for (const rr of [0, (this.visible ?? size) * 0.7]) if (dir.seenAt(x + Math.cos(a) * rr, z + Math.sin(a) * rr)) checks.placedOnSeen++;
      if (dir.visibleNow(x, 0, z, this.visible ?? size)) checks.placedInView++;
      let h = things.find((q) => q.id === id);
      if (h) { if (h.seen) checks.movedSeen++; Object.assign(h, { x, z }); } else things.push((h = { id, x, z, seen: false }));
      return h;
    },
    met: (h, [p]) => Math.hypot(h.x - p.x, h.z - p.z) < size * 0.7,
  });
  const entries = [mk('stenus', 30, { visible: 12 }), mk('strider', 40, { visible: 20 }), { id: 'rain', size: 0, minAhead: 0, maxAhead: 0, virtual: true, place: () => ({ rain: true }), met: () => true }, mk('portal', 20, { final: true, top: 60 })];
  dir = createDirector({ entries, bounds: { x0: -1000, x1: 1000, z0: -1000, z1: 1000 }, cell: 10, seenDist: 60, nearSeen: 6, warmup: { sec: 3 }, calm: { sec: 4 }, linger: 6, seed: 5 });
  // the enemies come for the nearest player once placed (the springtail's predators hunt)
  const stepThings = (players) => {
    if (!walkers) return;
    for (const h of things) {
      if (h.id === 'portal') continue;
      const p = players.reduce((a, q) => (!a || Math.hypot(q.x - h.x, q.z - h.z) < Math.hypot(a.x - h.x, a.z - h.z) ? q : a), null);
      const d = Math.hypot(p.x - h.x, p.z - h.z);
      if (d < 140 && d > 1) { h.x += ((p.x - h.x) / d) * 6 * DT; h.z += ((p.z - h.z) / d) * 6 * DT; }
    }
  };
  return { dir, things, checks, entries, stepThings };
}

/** Run a scripted player; returns the events. move(t, p) mutates p. */
function run({ seconds, players, move, view = true, walkers = true, untilDone = true }) {
  const W = makeWorld({ walkers });
  const ev = [];
  let snapshot = null;
  for (let t = 0; t < seconds; t += DT) {
    for (const p of players) move(t, p);
    const views = view ? players.map((p) => wedge(p.x, p.z, p.look ?? p.a ?? 0)) : [];
    // seen things are frozen in place: record the world in seen cells
    for (const h of W.things) for (const v of views) if (inWedge(v, h.x, h.z) && Math.hypot(h.x - v.focus.x, h.z - v.focus.z) < 60) h.seen = true;
    ev.push(...W.dir.update(DT, players, views));
    W.stepThings(players);
    if (untilDone && W.dir.done) break;
    if (snapshot === null && t > seconds / 2) snapshot = W.dir.state();
  }
  return { ...W, ev };
}
const order = (ev) => ev.filter((e) => e.type === 'met').map((e) => e.index);
const placedAt = (ev, i) => ev.find((e) => e.type === 'placed' && e.index === i);
const metAt = (ev, i) => ev.find((e) => e.type === 'met' && e.index === i);

// ---- rushing out in four directions: each met in order, placed out of view and ahead
for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
  const p = { id: 0, x: 0, z: 0, a };
  const r = run({ seconds: 120, players: [p], move: (t, q) => { q.x += Math.cos(a) * 15 * DT; q.z += Math.sin(a) * 15 * DT; } });
  assert.deepEqual(order(r.ev), [0, 1, 2], `bearing ${a}: met in order`);
  assert.ok(placedAt(r.ev, 3), 'the portal is placed last');
  for (let i = 1; i < 4; i++) assert.ok(placedAt(r.ev, i).t >= metAt(r.ev, i - 1).t, `entry ${i} only after ${i - 1} is met`);
  assert.equal(r.checks.placedOnSeen, 0, 'never placed on a seen cell');
  assert.equal(r.checks.placedInView, 0, 'never placed in view');
  assert.equal(r.checks.movedSeen, 0, 'nothing seen is moved');
  const first = placedAt(r.ev, 0);
  assert.ok(first.t >= 3 && first.t < 4, `first placed after the warm-up (${first.t})`);
  assert.ok(metAt(r.ev, 0).t < 10, `first met within ~10 s (${metAt(r.ev, 0).t})`);
  for (const i of [0, 1, 3]) {
    const e = placedAt(r.ev, i);
    // ahead: in the half-plane in front of the player's way
    const s = r.things.find((h) => h.id === r.entries[i].id);
    assert.ok(e.how === 'ahead' || e.how === 'around', `${r.entries[i].id} placed ${e.how}`);
    assert.ok(Math.cos(e.b - a) > 0, `${r.entries[i].id} placed ahead (bearing ${e.b.toFixed(2)} vs ${a.toFixed(2)})`);
    assert.ok(s);
  }
}

// ---- lingering: a player who never moves still gets every encounter, one by one, then the portal near them
{
  const p = { id: 0, x: 10, z: 20, a: 0.3 };
  const r = run({ seconds: 200, players: [p], move: () => {} });
  assert.deepEqual(order(r.ev), [0, 1, 2], 'lingering: met in order');
  const portal = placedAt(r.ev, 3);
  assert.ok(portal, 'lingering: the portal comes in the end');
  assert.ok(Math.hypot(portal.x - p.x, portal.z - p.z) < 100, `lingering: the portal near them (${Math.hypot(portal.x - p.x, portal.z - p.z).toFixed(0)})`);
  assert.equal(r.checks.placedInView, 0);
  assert.equal(r.checks.placedOnSeen, 0);
  for (const e of r.ev.filter((x) => x.type === 'placed' && !r.entries[x.index].virtual)) assert.equal(e.how, 'near', 'lingering: placed near');
}

// ---- turning back: placed ahead, then the player turns round before seeing it: it is moved, never in view;
// what was seen never changes
{
  const p = { id: 0, x: 0, z: 0, a: 0 };
  let turned = false;
  const r = run({ seconds: 80, players: [p], walkers: false, move: (t, q) => {
    if (!turned && t > 3) { turned = true; q.a = Math.PI; } // turn round as the first is placed, before it is in sight
    q.x += Math.cos(q.a) * 15 * DT; q.z += Math.sin(q.a) * 15 * DT;
  } });
  assert.ok(r.ev.some((e) => e.type === 'moved' && e.index === 0), 'the unseen first encounter follows the turn');
  assert.equal(r.checks.movedSeen, 0);
  assert.equal(r.checks.placedOnSeen, 0);
  assert.deepEqual(order(r.ev).slice(0, 2), [0, 1]);
}

// ---- seen but avoided: it stays where it is, and counts once everyone has left it behind
{
  const W = makeWorld({ walkers: false });
  const p = { id: 0, x: 0, z: 0 };
  const ev = [];
  for (let t = 0; t < 40; t += DT) {
    p.x += 15 * DT;
    const s = W.dir.entry('stenus');
    // the player swerves round it (keeping 40 units off) and the view sees it
    if (s.state === 'placed' && Math.abs(p.x - s.x) < 50) p.z = s.z + 40;
    ev.push(...W.dir.update(DT, [p], [wedge(p.x, p.z, 0, 0.6)]));
  }
  const m = ev.find((e) => e.type === 'met' && e.index === 0);
  assert.ok(m && m.how === 'passed', `a seen, avoided encounter is passed (${m && m.how})`);
  assert.equal(W.checks.movedSeen, 0);
}

// ---- multiplayer: the leader places; the others follow the shared order
{
  const ps = [{ id: 0, x: 0, z: 0, a: 0 }, { id: 1, x: 0, z: 30, a: Math.PI / 2 }];
  const r = run({ seconds: 140, players: ps, move: (t, q) => { const sp = q.id ? 4 : 15; q.x += Math.cos(q.a) * sp * DT; q.z += Math.sin(q.a) * sp * DT; } });
  assert.deepEqual(order(r.ev), [0, 1, 2]);
  assert.ok(placedAt(r.ev, 3));
  assert.equal(r.checks.placedInView, 0);
  assert.equal(r.checks.placedOnSeen, 0);
}

// ---- deterministic: the same run gives the same log
{
  const go = () => run({ seconds: 90, players: [{ id: 0, x: 0, z: 0, a: 1 }], move: (t, q) => { q.a = 1 + Math.sin(t * 0.3); q.x += Math.cos(q.a) * 12 * DT; q.z += Math.sin(q.a) * 12 * DT; } }).ev;
  assert.deepEqual(go(), go());
}

// ---- debug hooks and the 3D grid
{
  const W = makeWorld();
  assert.equal(W.dir.state().phase, 'warmup');
  W.dir.update(DT, [{ id: 0, x: 0, z: 0 }], []);
  assert.ok(W.dir.seenAt(0, 0), 'a player stands on seen ground');
  assert.ok(!W.dir.seenAt(200, 0));
  assert.ok(W.dir.placeNow());
  const ev = W.dir.update(DT, [{ id: 0, x: 0, z: 0 }], []);
  assert.equal(ev[0].type, 'placed', 'placeNow ends the break');
  assert.equal(W.dir.state().current, 'stenus');
  W.dir.force('portal', 100, 0, 0);
  assert.equal(W.dir.state().current, 'portal');
  assert.equal(W.dir.state().entries[1].how, 'forced');
  W.dir.reset();
  assert.equal(W.dir.state().seenCells, 0);

  const D = createDirector({ mode: '3d', bounds: { x0: -200, x1: 200, z0: -200, z1: 200, y0: -200, y1: 200 }, cell: 20, seenDist: 60, warmup: { sec: 1 },
    entries: [{ id: 'a', size: 15, minAhead: 50, maxAhead: 90, place: (x, z, b, { y }) => ({ x, y, z }), met: (h, [p]) => Math.hypot(h.x - p.x, h.y - p.y, h.z - p.z) < 20, final: true }] });
  const p = { id: 0, x: 0, y: 0, z: 0 };
  let placed = null;
  for (let t = 0; t < 3 && !placed; t += DT) { p.y += 10 * DT; for (const e of D.update(DT, [p], [])) if (e.type === 'placed') placed = e; }
  assert.ok(placed, '3D: placed');
  assert.ok(D.seenAt(0, 5, 0), '3D: seen where the player swam');
  assert.ok(!D.seenAt(150, 150, 150));
}

// ---- cheap: a minute of updates with four views
{
  const W = makeWorld();
  const ps = [0, 1, 2, 3].map((id) => ({ id, x: id * 20, z: 0, a: id }));
  const t0 = process.hrtime.bigint();
  let n = 0;
  for (let t = 0; t < 60; t += DT, n++) {
    for (const q of ps) { q.x += Math.cos(q.a) * 12 * DT; q.z += Math.sin(q.a) * 12 * DT; }
    W.dir.update(DT, ps, ps.map((q) => wedge(q.x, q.z, q.a)));
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n;
  console.log(`  update with 4 views: ${ms.toFixed(3)} ms a frame`);
  assert.ok(ms < 1, 'under a millisecond a frame');
}
// ---- the default path (opts.defaultPath): pre-placed along a bearing from the start; off it, placed as you go
function makePathWorld({ single = false, bearing = 0.6 } = {}) {
  const things = []; // every instance the world holds: { id, inst, x, z, seen, dropped, moves }
  const checks = { placedOnSeen: 0, placedInView: 0, movedSeen: 0, droppedSeen: 0 };
  let dir = null;
  const mk = (id, size, extra = {}) => ({
    id, size, minAhead: size + 30, maxAhead: size + 70, minNear: size + 10, maxNear: size + 40, single, ...extra,
    place(x, z, b, info) {
      if (dir) {
        for (let a = 0; a < 12; a++) for (const rr of [0, (this.visible ?? size) * 0.7]) if (dir.seenAt(x + Math.cos(a) * rr, z + Math.sin(a) * rr)) checks.placedOnSeen++;
        if (dir.visibleNow(x, 0, z, this.visible ?? size)) checks.placedInView++;
      }
      const h = { id, inst: info.instance, x, z, x0: x, z0: z, seen: false, dropped: false, moves: 0 };
      things.push(h);
      return h;
    },
    move(h, x, z, b, info) {
      if (h.seen) checks.movedSeen++;
      if (dir.seenAt(x, z)) checks.placedOnSeen++;
      if (dir.visibleNow(x, 0, z, this.visible ?? size)) checks.placedInView++;
      Object.assign(h, { x, z, inst: info.instance }); h.moves++;
      return h;
    },
    drop(h) { if (h.seen) checks.droppedSeen++; h.dropped = true; },
    met: (h, [p]) => !h.dropped && Math.hypot(h.x - p.x, h.z - p.z) < size * 0.7,
  });
  const entries = [mk('stenus', 30, { visible: 12 }), mk('strider', 40, { visible: 20 }), { id: 'rain', size: 0, minAhead: 0, maxAhead: 0, virtual: true, place: () => ({ rain: true }), met: () => true }, mk('portal', 20, { final: true, top: 60 })];
  dir = createDirector({ entries, bounds: { x0: -1000, x1: 1000, z0: -1000, z1: 1000 }, cell: 10, seenDist: 60, nearSeen: 6, warmup: { sec: 3 }, calm: { sec: 4 }, linger: 6, seed: 5,
    defaultPath: { from: { x: 0, z: 0 }, bearing, rush: 15, cone: 0.45 } });
  return { dir, things, checks, entries };
}
function runPath(W, { seconds, move, look }) {
  const p = { id: 0, x: 0, z: 0, a: 0 };
  const ev = [];
  for (let t = 0; t < seconds && !W.dir.done; t += DT) {
    move(t, p, W);
    const v = wedge(p.x, p.z, look ? look(p) : p.a);
    for (const h of W.things) if (!h.dropped && inWedge(v, h.x, h.z) && Math.hypot(h.x - p.x, h.z - p.z) < 60) h.seen = true;
    ev.push(...W.dir.update(DT, [p], [v]));
    const P = W.dir.portals().find((q) => q.open && Math.hypot(q.x - p.x, q.z - p.z) < 15);
    if (P) { p.reached = { t, instance: P.instance }; break; }
  }
  return { ev, p };
}
const stepTo = (p, x, z, sp = 15) => { const d = Math.hypot(x - p.x, z - p.z); if (d > 0.5) { p.a = Math.atan2(z - p.z, x - p.x); p.x += Math.cos(p.a) * Math.min(d, sp * DT); p.z += Math.sin(p.a) * Math.min(d, sp * DT); } };
{
  // from t = 0: the whole order is laid along the bearing, the portal among it, before anyone moves
  const W = makePathWorld();
  const P0 = W.dir.portals();
  assert.equal(P0.length, 1, 'portals() lists the default portal from t = 0');
  assert.equal(P0[0].instance, 'default');
  assert.equal(P0[0].open, false, 'sealed until every earlier entry is met');
  const S0 = W.dir.state();
  const defs = S0.entries.map((e) => e.def);
  assert.equal(defs[2], null, 'the virtual entry (the rain) has no place on the path');
  let last = 0;
  for (const i of [0, 1, 3]) {
    const d = defs[i], r = Math.hypot(d.x, d.z);
    assert.equal(d.state, 'placed');
    assert.ok(r > last, `entry ${i} farther along the path (${r.toFixed(0)})`);
    assert.ok(Math.abs(Math.atan2(Math.sin(Math.atan2(d.z, d.x) - 0.6), Math.cos(Math.atan2(d.z, d.x) - 0.6))) <= 0.45, `entry ${i} inside the cone`);
    last = r;
  }
  assert.ok(Math.hypot(defs[0].x, defs[0].z) > 60 + 30, 'the first is out of view at the start');
  W.dir.update(DT, [{ id: 0, x: 0, z: 0 }], [wedge(0, 0, 0.6)]);
  for (const i of [0, 1, 3]) assert.ok(!W.dir.visibleNow(defs[i].x, 0, defs[i].z, 10) || Math.hypot(defs[i].x, defs[i].z) > 60, `entry ${i} not in sight at the start`);
}
{
  // following the bearing: each pre-placed instance met in order, nothing placed as you go (but the rain, an event)
  const W = makePathWorld();
  const r = runPath(W, { seconds: 120, move: (t, p, W) => {
    const s = W.dir.state(), cur = s.entries[s.index];
    const tgt = cur && cur.def && cur.def.state === 'placed' ? cur.def : null;
    if (tgt) stepTo(p, tgt.x, tgt.z); else { p.a = 0.6; p.x += Math.cos(0.6) * 15 * DT; p.z += Math.sin(0.6) * 15 * DT; }
  } });
  assert.deepEqual(order(r.ev), [0, 1, 2], 'default path: met in order');
  assert.deepEqual(r.ev.filter((e) => e.type === 'met' && e.index !== 2).map((e) => e.instance), ['default', 'default'], 'default path: the pre-placed instances');
  assert.deepEqual(r.ev.filter((e) => e.type === 'placed' && !W.entries[e.index].virtual && e.how !== 'default'), [], 'default path: nothing generated');
  assert.ok(r.p.reached && r.p.reached.instance === 'default', 'default path: the default portal reached, open');
  assert.equal(W.dir.portals().length, 1);
  assert.deepEqual([W.checks.placedOnSeen, W.checks.placedInView, W.checks.movedSeen, W.checks.droppedSeen], [0, 0, 0, 0]);
  assert.ok(W.things.every((h) => h.moves === 0 && h.x === h.x0 && h.z === h.z0), 'default path: nothing moved');
}
for (const single of [false, true]) {
  // heading off the other way: generated as you go, in order; the default path stays where it was (unseen ones
  // dropped as their entry is met elsewhere; a single entry's one instance leaves the path while unseen)
  const W = makePathWorld({ single });
  const off = 0.6 + Math.PI;
  const r = runPath(W, { seconds: 160, move: (t, p, W) => {
    const P = W.dir.portals().find((q) => q.open && q.instance === 'dynamic');
    if (P) return stepTo(p, P.x, P.z);
    p.a = off; p.x += Math.cos(off) * 15 * DT; p.z += Math.sin(off) * 15 * DT;
  } });
  const tag = single ? 'off the path (single)' : 'off the path';
  assert.deepEqual(order(r.ev), [0, 1, 2], `${tag}: met in order`);
  for (const i of [0, 1, 3]) {
    const pe = r.ev.find((e) => e.type === 'placed' && e.index === i && e.how !== 'default');
    assert.ok(pe && pe.how !== 'default' && Math.cos(pe.b - off) > 0, `${tag}: entry ${i} placed ahead as you go`);
    if (single) assert.equal(pe.from, 'default', `${tag}: entry ${i}'s one instance taken off the path`);
  }
  assert.deepEqual(r.ev.filter((e) => e.type === 'met' && e.index !== 2).map((e) => e.instance), ['dynamic', 'dynamic']);
  assert.deepEqual([W.checks.placedOnSeen, W.checks.placedInView, W.checks.movedSeen, W.checks.droppedSeen], [0, 0, 0, 0], `${tag}: never on seen ground, in view, or a seen thing moved or dropped`);
  const ps = W.dir.portals();
  if (single) assert.equal(ps.length, 1, `${tag}: one portal (moved off the path while unseen)`);
  else {
    assert.deepEqual(ps.map((q) => q.instance).sort(), ['default', 'dynamic'], `${tag}: two portals, the default one still there`);
    assert.ok(ps.every((q) => q.open), `${tag}: both open once every encounter is met`);
    const dp = W.things.find((h) => h.id === 'portal' && h.inst === 'default');
    assert.ok(dp.x === dp.x0 && dp.z === dp.z0 && !dp.dropped, `${tag}: the default portal never moved`);
    assert.ok(W.things.filter((h) => h.inst === 'default' && h.id !== 'portal').every((h) => h.dropped && !h.seen), `${tag}: the unseen default encounters dropped once met elsewhere`);
  }
  assert.ok(r.p.reached && r.p.reached.instance === 'dynamic', `${tag}: the generated portal reached`);
}
{
  // seen, then left: a default instance someone has seen stays exactly where it is, and every cell seen stays seen
  const W = makePathWorld();
  const seenCells = [];
  const r = runPath(W, { seconds: 160, move: (t, p, W) => {
    const s = W.dir.state();
    const st0 = s.entries[0].def;
    if (!st0) return;
    if (st0.seenT === null && t < 30) return stepTo(p, st0.x, st0.z);
    if (!seenCells.length) for (let x = -200; x <= 200; x += 10) for (let z = -200; z <= 200; z += 10) if (W.dir.seenAt(x, z)) seenCells.push([x, z]);
    const P = W.dir.portals().find((q) => q.open && q.instance === 'dynamic');
    if (P) return stepTo(p, P.x, P.z);
    const a = -0.6 - 1.4; p.a = a; p.x += Math.cos(a) * 15 * DT; p.z += Math.sin(a) * 15 * DT;
  } });
  const seenDef = W.things.find((h) => h.id === 'stenus' && h.inst === 'default');
  const e0 = W.dir.state().entries[0];
  assert.ok(e0.def.seenT !== null, 'the default Stenus was seen (by the director\'s grid)');
  assert.equal(e0.via, 'dynamic', 'and the one met was placed as you go');
  assert.equal(e0.def.state, 'placed', 'the seen default instance is kept');
  assert.ok(seenDef.x === seenDef.x0 && seenDef.z === seenDef.z0 && !seenDef.dropped, 'seen: never moved or dropped');
  assert.ok(seenCells.length > 0 && seenCells.every(([x, z]) => W.dir.seenAt(x, z)), 'seen cells stay seen');
  assert.deepEqual(order(r.ev), [0, 1, 2], 'seen then left: still met in order');
  assert.deepEqual([W.checks.placedOnSeen, W.checks.placedInView, W.checks.movedSeen, W.checks.droppedSeen], [0, 0, 0, 0]);
}
// ---- deterministic with a default path too
{
  const go = () => runPath(makePathWorld(), { seconds: 60, move: (t, p) => { p.a = 2 + Math.sin(t * 0.3); p.x += Math.cos(p.a) * 12 * DT; p.z += Math.sin(p.a) * 12 * DT; } }).ev;
  assert.deepEqual(go(), go());
}
console.log('ok: director (order, unseen and out-of-view placement, lingering, turning back, passing, multiplayer, determinism, 3D, default path)');
