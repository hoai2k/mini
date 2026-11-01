// The tardigrade's moss (the encounter pattern, micro/design/encounter-pattern.md):
// a spoke of leaves every 30° out to the rim, each one walkable leaf to leaf,
// the scenery (rotifer meadows, dry patches) at the same distances on every
// spoke, and the director (encounters.js) placing Milnesium and then the pool
// with Prionchulus as a player rushes out along every spoke, lingers, or turns
// back. Builds the world in Node (no browser).
//   node --test micro/prototypes/tardigrade/route.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { World, RINGS, SPOKES, tipU, HANDOVER_GAP } from './world.js';
import { Walker } from './gait.js';
import { Creature } from './creature.js';
import { createDirector } from '../shared/director.js';
import { DIRECTOR, encounters, canPlace, wayOut } from './encounters.js';

const world = new World({ add() {} });
// gait.js considerTransfer: the claws reach 0.55 across directly (1.2 over a wet film)
const CLAW_REACH = 0.55, REACH_BUDGET = 0.4;
const S = world.start;
const deg = (a) => Math.round((a * 180) / Math.PI);

test('a spoke every 30°, each walkable leaf to leaf out to the portal ring', () => {
  assert.equal(world.spokes.length, SPOKES);
  for (const sp of world.spokes) {
    // the hand-over: a body at the end of one leaf (or the shoot's exit) has its head over the next,
    // close enough for the claws (gait.js considerTransfer: 0.55 directly, 1.2 across a wet film)
    const hand = (L, u, v, hu, hv, M) => {
      const body = L.toWorld(u, v, L.thick / 2 + 0.3), head = L.toWorld(u + 2 * hu, v + 2 * hv, L.thick / 2);
      const loc = M.toLocal(head, {});
      return { inside: M.inside(loc.u, loc.v, 0.35), gap: Math.abs(loc.n) - M.thick / 2, above: M.toLocal(body, {}).n > 0, film: world.filmAt(M, loc.u, loc.v), filmHere: world.filmAt(L, u, v) };
    };
    const e = sp.exit;
    let hu = Math.cos(sp.a) * e.L.U.x + Math.sin(sp.a) * e.L.U.z, hv = Math.cos(sp.a) * e.L.V.x + Math.sin(sp.a) * e.L.V.z;
    const l = Math.hypot(hu, hv); hu /= l; hv /= l;
    const steps = [hand(e.L, e.u, e.v, hu, hv, sp.leaves[0])];
    for (let j = 0; j + 1 < sp.leaves.length; j++) steps.push(hand(sp.leaves[j], tipU(sp.leaves[j]), 0, 1, 0, sp.leaves[j + 1]));
    steps.forEach((h, j) => {
      const where = `spoke ${sp.k} (${deg(sp.a)}°) hand-over ${j}`;
      assert.ok(h.inside && h.above, `${where}: the head is over the next leaf's upper face`);
      // within the claws' direct reach with room to spare (no leaning on the wet-film allowance)
      assert.ok(h.gap <= REACH_BUDGET, `${where}: gap ${h.gap.toFixed(2)} (claws reach ${CLAW_REACH})`);
    });
    // it keeps to its bearing, and its rim leaf's tip is on the portal ring
    for (const L of sp.leaves) for (let u = 1; u < L.len; u += 2) {
      const p = L.toWorld(u, 0, 0), off = Math.atan2(Math.sin(world.bearing(p) - sp.a), Math.cos(world.bearing(p) - sp.a));
      assert.ok(Math.abs(off) < 0.2 || world.radius(p) < 20, `spoke ${sp.k} strays ${deg(off)}° off its bearing at ${world.radius(p).toFixed(0)}`);
    }
    const rim = sp.leaves.at(-1);
    assert.ok(rim.pool && rim.kind === 'sphagnum', 'the rim leaf dips into the pool');
    const portal = world.radius(rim.toWorld(rim.len - 2.6, 0, 0));
    assert.ok(Math.abs(portal - RINGS.portal) < 1.5, `spoke ${sp.k}: portal at ${portal.toFixed(1)}`);
    // the boss's arena: its post and the leaf before it on the same rim leaf
    assert.ok(rim.len - 2.6 - RINGS.post - 8.5 > 0.5, `spoke ${sp.k}: room for Prionchulus to be lured off its post (${rim.len.toFixed(1)})`);
  }
});

test('every bearing is within 15° of a spoke', () => {
  for (let d = 0; d < 360; d++) {
    const a = (d * Math.PI) / 180;
    const off = Math.min(...world.spokes.map((sp) => Math.abs(Math.atan2(Math.sin(a - sp.a), Math.cos(a - sp.a)))));
    assert.ok(off <= Math.PI / 12 + 1e-9, `${d}°`);
  }
});

test('the scenery at the same distances on every spoke, with calm stretches between', () => {
  for (const sp of world.spokes) {
    // the meadow band fits on one leaf at the meadow ring
    const mid = world.spokeAt(sp.k, (RINGS.meadow[0] + RINGS.meadow[1]) / 2, 2);
    assert.ok(mid && mid.leaf.spoke === sp.k && tipU(mid.leaf) - 1 - 1.4 >= RINGS.meadow[1] - RINGS.meadow[0], `spoke ${sp.k}: meadow leaf`);
    // two or three dry patches across the dry ring, staggered (a wet way between them)
    const dry = sp.leaves.flatMap((L) => L.dry.map((d) => ({ L, d, r: world.radius(L.toWorld(d.u, 0, 0)) })));
    assert.ok(dry.length >= 2, `spoke ${sp.k}: ${dry.length} dry patches`);
    for (const { L, d, r } of dry) {
      assert.ok(r > RINGS.dry[0] - 0.5 && r < RINGS.dry[1] + 0.5, `spoke ${sp.k}: dry patch at ${r.toFixed(1)}`);
      assert.ok(world.filmAt(L, d.u, d.v) < 0.03, 'a dry patch is dry');
      assert.ok(world.filmAt(L, d.u, -Math.sign(d.v) * L.hwAt(d.u) * 0.6) > 0.03, 'the other side of it is wet');
    }
  }
  const spans = [['meadow', RINGS.meadow[0], RINGS.meadow[1]], ['dry patches', RINGS.dry[0], RINGS.dry[1]], ['Prionchulus', RINGS.portal - RINGS.post - 6.5, RINGS.portal]];
  for (let i = 1; i < spans.length; i++) {
    const gap = spans[i][1] - spans[i - 1][2];
    assert.ok(gap >= 3 && gap <= 14, `${spans[i - 1][0]} -> ${spans[i][0]}: ${gap} calm`);
  }
});

// ---- the director (encounters.js) with the tardigrade's settings, the view as the microscope's camera
// (main.js placeViewCamera: 22° vertical field, 16:9, 14.4 units across at the animal, pitch 1.18)
const DT = 1 / 30, RUSH = 1.6;
const YAW = Math.atan2(1, 0) + Math.PI + Math.PI / 6, PITCH = 1.18, FOV = 22, ASPECT = 16 / 9;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
function view(p, field = 14.4) {
  const tanV = Math.tan((FOV * Math.PI) / 360), tanH = tanV * ASPECT, d = field / 2 / tanV / ASPECT;
  const T = [p.x, p.y, p.z], C = [p.x + d * Math.cos(PITCH) * Math.sin(YAW), p.y + d * Math.sin(PITCH), p.z + d * Math.cos(PITCH) * Math.cos(YAW)];
  const f = norm(sub(T, C)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const ray = (sx, sy) => f.map((v, i) => v + r[i] * tanH * sx + u[i] * tanV * sy);
  const planes = [];
  const side = (a, b) => { let n = norm(cross(a, b)); if (dot(n, f) < 0) n = n.map((v) => -v); planes.push([...n, -dot(n, C)]); };
  side(ray(-1, -1), ray(-1, 1)); side(ray(1, -1), ray(1, 1)); side(ray(-1, -1), ray(1, -1)); side(ray(-1, 1), ray(1, 1));
  planes.push([...f, -dot(f, C) - 0.5], [...f.map((v) => -v), dot(f, C) + 200]);
  return { frustum: planes, focus: { x: p.x, y: p.y, z: p.z } };
}
/** The way out along spoke k: the start, the shoot's exit, then each leaf's centre line to its tip. */
function spokePath(k) {
  const sp = world.spokes[k], pts = [S.clone(), sp.exit.p.clone()];
  for (const L of sp.leaves) for (let u = 1.2; u <= tipU(L); u += 0.5) pts.push(L.toWorld(u, 0, 0));
  return pts;
}
function game({ seconds, plan }) {
  const E = encounters(world);
  const bad = [], at = {};
  let D;
  const place = (id) => (x, z, b, info) => {
    const e = E.list.find((q) => q.id === id);
    for (const [px, pz, r, py] of e.parts(x, z, b, info.y)) {
      if (D.visibleNow(px, py, pz, r)) bad.push(`${id} placed in view`);
      for (let q = 0; q < 6; q++) if (D.seenAt(px + Math.cos(q) * r * 0.7, py, pz + Math.sin(q) * r * 0.7)) bad.push(`${id} placed on seen leaves`);
    }
    if (at[id] && at[id].seen) bad.push(`${id} moved after it was seen`);
    if (id === 'milnesium') { const s = E.milAt(x, z); if (!s) bad.push('Milnesium off the leaves'); at[id] = { p: s.p.clone(), s, t: 0 }; }
    else { const R = E.rimAt(x, z); if (!R) bad.push('the portal off the rims'); at[id] = { p: R.spot, R }; }
    return at[id];
  };
  const met = {
    milnesium: (h, [p]) => Math.hypot(p.x - h.p.x, p.y - h.p.y, p.z - h.p.z) < RINGS.milnesium.r,
    portal: (h, [p]) => Math.hypot(p.x - h.p.x, p.y - h.p.y, p.z - h.p.z) < 1.7,
  };
  D = createDirector({ ...DIRECTOR, canPlace, entries: E.list.map((e) => ({ ...e, place: place(e.id), met: met[e.id] })) });
  const pl = { id: 0, x: S.x, y: S.y, z: S.z };
  const ev = [];
  const walk = { path: null, i: 0, f: 0 };
  for (let t = 0; t < seconds && !D.done; t += DT) {
    plan(t, walk, at, D);
    if (walk.path) {
      let left = RUSH * DT;
      while (left > 0 && walk.i < walk.path.length - 1) {
        const a = walk.path[walk.i], b = walk.path[walk.i + 1], seg = a.distanceTo(b), rest = seg * (1 - walk.f);
        if (left < rest) { walk.f += left / seg; left = 0; } else { left -= rest; walk.i++; walk.f = 0; }
      }
      const a = walk.path[walk.i], b = walk.path[Math.min(walk.i + 1, walk.path.length - 1)];
      pl.x = a.x + (b.x - a.x) * walk.f; pl.y = a.y + (b.y - a.y) * walk.f; pl.z = a.z + (b.z - a.z) * walk.f;
    }
    // the spoke the leader is heading out along (main.js: wayOut from its leaf and velocity)
    const v = walk.path && walk.last ? { x: (pl.x - walk.last.x) / DT, z: (pl.z - walk.last.z) / DT } : { x: 0, z: 0 };
    walk.last = { x: pl.x, z: pl.z };
    E.prefer = wayOut(world, walk.path ? { spoke: walk.i > 1 ? walk.k : -1 } : null, pl, v.x, v.z);
    ev.push(...D.update(DT, [pl], [view(pl)]));
    // main.js driftMilnesium: placed out of a lingering player's reach, its water drifts over (0.8/s, after 5 s)
    const M = D.entry('milnesium');
    if (M.state === 'placed') {
      if (M.seenT !== null) at.milnesium.seen = true;
      const h = at.milnesium; h.t += DT;
      const d = Math.hypot(pl.x - h.p.x, pl.y - h.p.y, pl.z - h.p.z);
      if (h.t > 5 && !D.leader.moving && d > RINGS.milnesium.r - 1) { h.p.x += ((pl.x - h.p.x) / d) * 0.8 * DT; h.p.y += ((pl.y - h.p.y) / d) * 0.8 * DT; h.p.z += ((pl.z - h.p.z) / d) * 0.8 * DT; }
    }
    if (at.portal && D.entry('portal').seenT !== null) at.portal.seen = true;
  }
  return { ev, bad, D, at };
}
const first = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
/** Head out along spoke k; once the portal is placed, make for it (back along this spoke and out its own if it is on another). */
const rushPlan = (k) => (t, walk, at) => {
  if (!walk.path) { walk.path = spokePath(k); walk.k = k; }
  if (at.portal && walk.k !== at.portal.R.k && !walk.back) { walk.back = true; const here = walk.path.slice(0, walk.i + 1).reverse(); walk.path = [...here, ...spokePath(at.portal.R.k).slice(1)]; walk.i = 0; walk.f = 0; walk.k = at.portal.R.k; }
};

test('the director: rushing out along every spoke meets Milnesium, then the pool, in about a minute', () => {
  const times = [];
  for (let k = 0; k < SPOKES; k++) {
    const r = game({ seconds: 120, plan: rushPlan(k) });
    const tag = `spoke ${k} (${deg(world.spokes[k].a)}°)`;
    assert.deepEqual(r.bad, [], tag);
    assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ['milnesium', 'portal'], `${tag}: in order`);
    const T = { milPlaced: first(r.ev, 'placed', 'milnesium').t, mil: first(r.ev, 'met', 'milnesium').t, portalPlaced: first(r.ev, 'placed', 'portal').t, portal: first(r.ev, 'met', 'portal').t };
    assert.ok(T.milPlaced >= 4, `${tag}: a warm-up first (${T.milPlaced} s)`);
    assert.ok(T.mil <= 12, `${tag}: Milnesium within ~10 s (${T.mil} s)`);
    assert.ok(T.portalPlaced - T.mil >= 14, `${tag}: a long calm (the meadow, the dry patches) before the pool`);
    assert.ok(T.portal >= 45 && T.portal <= 62, `${tag}: the pool reached in about a minute (${T.portal} s)`);
    assert.equal(r.at.portal.R.k, k, `${tag}: the pool at this spoke's rim`);
    for (const e of r.ev.filter((x) => x.type === 'placed')) assert.ok(['ahead', 'around', 'wider'].includes(e.how), `${tag}: ${e.id} placed ${e.how}`);
    times.push(T);
  }
  const span = (key) => `${Math.min(...times.map((t) => t[key])).toFixed(1)}-${Math.max(...times.map((t) => t[key])).toFixed(1)} s`;
  console.log(`rushing out on 12 spokes: Milnesium placed ${span('milPlaced')}, met ${span('mil')}; the pool placed ${span('portalPlaced')}, reached ${span('portal')}`);
});

test('the director: lingering at the start, Milnesium comes to them, then the pool at the nearest rim', () => {
  const r = game({ seconds: 300, plan: (t, walk, at) => { if (at.portal && !walk.path) { walk.path = spokePath(at.portal.R.k); walk.k = at.portal.R.k; } } });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ['milnesium', 'portal'], 'lingering: in order');
  assert.equal(first(r.ev, 'placed', 'milnesium').how, 'near');
  console.log(`lingering: ${r.ev.map((e) => `${e.id} ${e.type}${e.type !== 'met' ? ` (${e.how})` : ''} ${e.t} s`).join(', ')}`);
});

test('the director: turning back before Milnesium is in sight, it follows unseen; what was seen stays', () => {
  const r = game({ seconds: 150, plan: (t, walk, at) => {
    if (!walk.path) { walk.path = spokePath(0); walk.k = 0; }
    if (t > 6.5 && !walk.turned && !at.portal) { walk.turned = true; walk.path = [...walk.path.slice(0, walk.i + 1).reverse(), ...spokePath(6).slice(1)]; walk.i = 0; walk.f = 0; walk.k = 6; }
    rushPlan(6)(t, walk, at);
  } });
  assert.deepEqual(r.bad, [], 'turning back: nothing placed or moved where it was seen');
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ['milnesium', 'portal']);
  console.log(`turning back: ${r.ev.map((e) => `${e.id} ${e.type}${e.type !== 'met' ? ` (${e.how})` : ''} ${e.t} s`).join(', ')}`);
});

test('the start is calm and the film never runs out by itself', () => {
  assert.ok(world.radius(S) < 1e-9);
  assert.equal(world.dry, world.dry0);
  // nothing in the shoot round the start is dry
  for (const L of world.shoot) for (let u = 1; u < L.len - 1; u += 0.5) assert.ok(L.dry.length === 0 && world.filmAt(L, u, 0) > 0.03, `${L.name} is wet at ${u}`);
});

// ---- walking it: the real gait (gait.js Walker, claws, grip and slips, leaf
// to leaf hand-overs, falls) driven in Node by a player who steers out along
// each spoke, aiming a little ahead on the leaf's centre line. (The pre-deploy
// audit drove the page the same way; there a walker ping-ponged between two
// leaves of the 210° spoke for minutes.)
function walker() {
  const creature = Object.create(Creature.prototype); // the pose only: nothing drawn
  creature.pose = { phase: 0, sway: 0, bob: 0, surge: 0, tun: 0, stylet: 0, pump: 0, wrinkle: 0, breath: 0, gape: 0, feet: Array.from({ length: 8 }, () => new THREE.Vector3()), footN: Array.from({ length: 8 }, () => new THREE.Vector3()), clawOpen: Array(8).fill(0) };
  const log = [];
  const w = new Walker(world, creature, { catch() {}, slip() { log.push('slip'); }, fall(t) { log.push(t); }, transfer(t) { log.push(t); } });
  return { w, log };
}
const input = (dir) => ({ dir, mag: 1, brace: false, frozen: false, film: 1, energy: 1, tun: false, dash: false });

test('the spokes are built to the hand-over budget', () => {
  assert.ok(HANDOVER_GAP <= REACH_BUDGET && REACH_BUDGET < CLAW_REACH);
});

test('steering out along every spoke, a walker reaches the rim leaf\'s tip in about a minute', () => {
  const { w, log } = walker();
  const times = [];
  for (const sp of world.spokes) {
    const rim = sp.leaves.at(-1), out = new THREE.Vector3(Math.cos(sp.a), 0, Math.sin(sp.a));
    w.spawn(sp.leaves[0], 1, 1.5, 0, 1, 0);
    log.length = 0;
    let t = 0, back = 0, at = 0;
    for (; t < 90 && !(w.leaf === rim && w.u > rim.len - 4); t += 1 / 30) {
      const L = w.leaf;
      const dir = sp.leaves.includes(L) && w.side > 0 ? L.toWorld(w.u + 3, 0, 0).sub(L.toWorld(w.u, w.v, 0)) : out.clone();
      w.update(1 / 30, input(dir.normalize()));
      const i = sp.leaves.indexOf(w.leaf);
      if (i >= 0 && i < at) back++;
      at = Math.max(at, i);
    }
    const tag = `spoke ${sp.k} (${deg(sp.a)}°)`;
    assert.ok(w.leaf === rim && w.u > rim.len - 4, `${tag}: not at the rim after ${t.toFixed(0)} s (${w.leaf.name}, u ${w.u.toFixed(1)}): ${log.join(' | ')}`);
    assert.equal(back, 0, `${tag}: carried back a leaf: ${log.join(' | ')}`);
    assert.ok(!log.some((e) => /fell|water bridge/i.test(e)), `${tag}: ${log.join(' | ')}`);
    times.push(t);
  }
  console.log(`walking out: the rim reached in ${Math.min(...times).toFixed(1)}-${Math.max(...times).toFixed(1)} s on 12 spokes`);
});

test('just over a hand-over, pushing into the new leaf\'s margin never carries a walker back to the leaf it left', () => {
  const { w, log } = walker();
  for (const sp of world.spokes) for (let j = 0; j + 1 < sp.leaves.length; j++) for (const sgn of [1, -1]) {
    const A = sp.leaves[j], B = sp.leaves[j + 1];
    w.spawn(A, 1, tipU(A) - 3, 0, 1, 0);
    log.length = 0;
    let over = false, back = false, tOver = 99;
    for (let t = 0; t < 25 && !back && t < tOver + 10; t += 1 / 30) {
      // out to the tip and over; then hard sideways (and a little on) into B's narrow base
      const dir = over ? B.V.clone().multiplyScalar(sgn).addScaledVector(B.U, 0.3) : w.leaf.U.clone();
      w.update(1 / 30, input(dir));
      if (w.leaf === B && !over) { over = true; tOver = t; }
      if (over && w.leaf === A) back = true;
    }
    const tag = `spoke ${sp.k} leaf ${j} -> ${j + 1}, pushed ${sgn > 0 ? 'left' : 'right'}`;
    assert.ok(over, `${tag}: never got over: ${log.join(' | ')}`);
    assert.ok(!back, `${tag}: carried back: ${log.join(' | ')}`);
  }
});
