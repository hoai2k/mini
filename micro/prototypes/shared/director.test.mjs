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
console.log('ok: director (order, unseen and out-of-view placement, lingering, turning back, passing, multiplayer, determinism, 3D)');
