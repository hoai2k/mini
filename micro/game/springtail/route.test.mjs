// The springtail's pool, its portals and its encounters, without a browser:
// the scenery (islands, sundews scattered at every distance), the fixed
// portals (world.js PORTALS: seeded blue noise, each with its pondweed and
// its wolf spider's hunting ground), and the director placing the encounters
// (world.js ENCOUNTERS: Stenus, the strider and its Podura mass, the rain)
// as a player rushes out or stands still. The view is a wedge like the low
// macro view (it sees the film from ~37 mm before the springtail to ~55 mm
// beyond, ~40 mm across), looking along the starting camera's yaw.
//   node micro/game/springtail/route.test.mjs
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { createDirector } from '../shared/director.js';
import { createWolfSpider, LEASH } from './boss.js';
import {
  START, POOL, ZONES, SUNDEW_ISLANDS, SUNDEW_CLUSTERS, ISLANDS, DIRECTOR, ENCOUNTERS, canPlace, inPool, poolE, islandEdge, distFromStart, setZoneAt, parkZone, inReach,
  PORTALS, PORTAL_R, PORTAL_SPACING, PORTAL_MIN_D, GROUND, layPortals, nearestPortal, PONDWEED, pondweedAt, pondweedDensity, mossTop,
} from './world.js';

assert.ok(inPool(START.x, START.z) && poolE(START.x, START.z) < 0.3, 'the start is on open water, mid-pool');
assert.ok(ISLANDS.length <= 72, `island count ${ISLANDS.length} (the water shader unrolls them)`);
assert.deepEqual(ENCOUNTERS.map((e) => e.id), ['stenus', 'strider', 'rain'], 'the order (the portals are fixed, not the director\'s)');
assert.ok(!ENCOUNTERS.some((e) => e.final), 'no final director entry');

// sundews are scenery, scattered at every distance and on every side
assert.equal(new Set(SUNDEW_ISLANDS.map((I) => I.cluster)).size, SUNDEW_CLUSTERS);
const mids = SUNDEW_ISLANDS.filter((I) => I.k === 1);
const ds = mids.map((I) => distFromStart(I.x, I.z));
assert.ok(Math.min(...ds) < 90 && Math.max(...ds) > 380, `sundews from ${Math.min(...ds).toFixed(0)} to ${Math.max(...ds).toFixed(0)} mm out`);
for (let q = 0; q < 4; q++) assert.ok(mids.some((I) => Math.floor(((Math.atan2(I.z - START.z, I.x - START.x) + Math.PI) / (Math.PI / 2)) % 4) === q), `sundews in quadrant ${q}`);
for (const I of SUNDEW_ISLANDS) {
  assert.ok(poolE(I.x, I.z) < 0.9, 'sundew islands well inside the bank');
  for (const J of ISLANDS) if (I !== J) assert.ok(Math.hypot(I.x - J.x, I.z - J.z) > I.r + J.r + 4, 'islands stand apart');
}
assert.ok(SUNDEW_ISLANDS.every((I) => distFromStart(I.x, I.z) > 30), 'no sundew on the start');

// ---- the portals: fixed blue noise, the same every game, on open water, clear of the start
assert.deepEqual(layPortals().map((p) => [p.x, p.z]), PORTALS.map((p) => [p.x, p.z]), 'the same portals every time (seeded)');
assert.ok(PORTALS.length >= 6 && PORTALS.length <= 20, `${PORTALS.length} portals`);
const nn = PORTALS.map((p) => Math.min(...PORTALS.filter((q) => q !== p).map((q) => Math.hypot(p.x - q.x, p.z - q.z))));
for (const p of PORTALS) {
  assert.ok(poolE(p.x, p.z) < 0.88 && islandEdge(p.x, p.z).d > PORTAL_R + 14, `portal ${p.i} on open water`);
  assert.ok(distFromStart(p.x, p.z) > PORTAL_MIN_D, `portal ${p.i} clear of the start (${distFromStart(p.x, p.z).toFixed(0)} mm)`);
  assert.ok(mossTop(p.x, p.z) > 1, `portal ${p.i}: you can stand on its raft`);
}
assert.ok(Math.min(...nn) > PORTAL_SPACING * 0.6 - 1, `portals at least ${(PORTAL_SPACING * 0.6).toFixed(0)} mm apart (${Math.min(...nn).toFixed(0)})`);
// hunting grounds never overlap, so each spider's ground and pondweed is its own
assert.ok(Math.min(...nn) > 2 * (GROUND.r + 10), 'grounds apart');

// Every bearing from the start leads to a portal's ground (its pondweed thick round you) in ~30-60 s of
// rushing (15 mm/s, tap jumps): straight out, round islands; at the bank, along it toward the nearer
// portal (the other way is reported too). An independent rusher, not world.js's rushToGround.
function rush(b, limit = 150) {
  const DT = 1 / 15, V = 15;
  const inGround = (x, z) => nearestPortal(x, z).d < GROUND.r;
  let x = START.x, z = START.z, t = 0, a = b;
  for (; t < limit; t += DT) {
    if (inGround(x, z)) return { t, bank: null };
    let ok = false;
    for (let i = 0; i < 12 && !ok; i++) {
      const c = a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.3;
      const nx = x + Math.cos(c) * V * DT, nz = z + Math.sin(c) * V * DT;
      if (poolE(nx, nz) < 0.93 && islandEdge(nx, nz).d > 0.5) { if (poolE(nx, nz) > 0.89) { t = -t; break; } x = nx; z = nz; ok = true; }
    }
    if (t < 0) { t = -t; break; }
  }
  const bank = t;
  // along the bank both ways: along its tangent, steered back to poolE ~0.885, the nearer first
  const along = (turn) => {
    let px = x, pz = z, u = bank;
    for (; u < limit; u += DT) {
      if (inGround(px, pz)) return u;
      const e = poolE(px, pz), gx = poolE(px + 0.5, pz) - e, gz = poolE(px, pz + 0.5) - e, g = Math.hypot(gx, gz) || 1;
      // the tangent (the normal turned a quarter turn), turned in when out past 0.885 and out when in
      const h = Math.atan2(turn * gx / g, -turn * gz / g) + turn * (e - 0.885) * 30;
      for (let i = 0; i < 16; i++) {
        const c = h + turn * i * 0.2;
        const nx = px + Math.cos(c) * V * DT, nz = pz + Math.sin(c) * V * DT;
        if (poolE(nx, nz) < 0.93 && islandEdge(nx, nz).d > 0.5) { px = nx; pz = nz; break; }
      }
    }
    return limit;
  };
  const [n, f] = [along(1), along(-1)].sort((p, q) => p - q);
  return { t: n, far: f, bank };
}
const BEARINGS = 64;
const runs = Array.from({ length: BEARINGS }, (_, k) => ({ deg: (k * 360) / BEARINGS, ...rush((k / BEARINGS) * Math.PI * 2) }));
for (const r of runs) assert.ok(r.t >= 29 && r.t <= 61, `bearing ${r.deg}: a portal's ground after ${r.t.toFixed(1)} s${r.bank !== null ? ` (the bank at ${r.bank.toFixed(1)} s)` : ''}`);
const bankRuns = runs.filter((r) => r.bank !== null);

// ---- the pondweed: thick round every portal (its spider's hunting ground), rare elsewhere
const strays = PONDWEED.filter((w) => w.portal < 0);
for (const p of PORTALS) {
  const own = PONDWEED.filter((w) => w.portal === p.i);
  assert.ok(own.length >= 25, `portal ${p.i}: ${own.length} leaves round it`);
  for (const w of own) assert.ok(Math.hypot(w.x - p.x, w.z - p.z) < GROUND.r + 16, 'its leaves in its ground');
  // thicker toward the raft
  const inner = own.filter((w) => Math.hypot(w.x - p.x, w.z - p.z) < 45).length / (Math.PI * (45 ** 2 - PORTAL_R ** 2));
  const outer = own.filter((w) => Math.hypot(w.x - p.x, w.z - p.z) >= 45).length / (Math.PI * ((GROUND.r + 14) ** 2 - 45 ** 2));
  assert.ok(inner > outer * 1.8, `portal ${p.i}: denser toward the raft (${(inner * 1e4).toFixed(1)} vs ${(outer * 1e4).toFixed(1)} per cm²)`);
}
for (const w of strays) assert.ok(nearestPortal(w.x, w.z).d > GROUND.r + 100, 'strays well away from the grounds');
const ground = PORTALS.reduce((a, p) => a + PONDWEED.filter((w) => w.portal === p.i).length, 0) / (PORTALS.length * Math.PI * (GROUND.r + 14) ** 2);
// the open water where strays may be (inside the bank, well away from every ground), counted on a 10 mm grid
let poolArea = 0;
for (let x = -POOL.a; x < POOL.a; x += 10) for (let z = -POOL.b; z < POOL.b; z += 10) if (poolE(x, z) < 0.93 && nearestPortal(x, z).d > GROUND.r + 100) poolArea += 100;
const elsewhere = strays.length / poolArea;
assert.ok(ground > elsewhere * 20, `pondweed ${(ground / elsewhere).toFixed(0)}x as thick in a ground as elsewhere`);
for (const w of PONDWEED) {
  assert.ok(poolE(w.x, w.z) < 0.93 && islandEdge(w.x, w.z).d > w.L * 0.5, 'leaves on open water');
  assert.ok(pondweedAt(w.x, w.z) === w || pondweedAt(w.x, w.z), 'a leaf is footing');
}
assert.equal(pondweedAt(START.x, START.z), null, 'no leaf on the start');
// what a rusher sees on the way in: the pondweed thickens ~5 s out
const thick = PORTALS.map((p) => [GROUND.r + 10, GROUND.r / 2, 20].map((d) => pondweedDensity(p.x - Math.cos(p.a) * d, p.z - Math.sin(p.a) * d)));
assert.ok(thick.every(([o, m, i]) => i > o && m > o), 'thicker on the way in toward each raft');

// ---- a spider's rounds: out over its ground and back to its post, never far (follow it home)
{
  const L = PORTALS[0], ux = Math.cos(L.a), uz = Math.sin(L.a);
  const post = { x: L.x - ux * (PORTAL_R - 3), z: L.z - uz * (PORTAL_R - 3), a: L.a + Math.PI };
  const s = createWolfSpider(new THREE.Scene(), { post, home: { x: L.x + ux * 12, z: L.z + uz * 12 }, ground: { x: L.x, z: L.z, r: GROUND.r - 6 }, seed: 1 });
  const field = { drop() {} };
  let maxD = 0, out = 0, at = 0;
  const ev = [];
  for (let t = 0; t < 180; t += 1 / 30) {
    for (const e of s.update(1 / 30, { awake: false, field, inPool, ripples: [], players: [] })) ev.push(e.type);
    const d = Math.hypot(s.st.x - L.x, s.st.z - L.z);
    maxD = Math.max(maxD, d);
    if (d > 25) out++; else at++;
  }
  assert.ok(ev.filter((e) => e === 'wander').length >= 4 && ev.filter((e) => e === 'guard').length >= 4, `rounds out and home (${ev.join(' ')})`);
  assert.ok(maxD < GROUND.r && maxD > GROUND.r * 0.5, `keeps to its ground (${maxD.toFixed(0)} mm out at most)`);
  assert.ok(out / (out + at) > 0.4, `out on its ground much of the time (${((100 * out) / (out + at)).toFixed(0)}%)`);
  // a springtail that follows it (8-14 mm behind) ends up at its raft when it goes home
  s.release();
  for (let t = 0; t < 60 && s.st.state !== 'wander'; t += 1 / 30) s.update(1 / 30, { awake: false, field, inPool, ripples: [], players: [] });
  let fx = s.st.x, fz = s.st.z, home = null;
  for (let t = 0; t < 60; t += 1 / 30) {
    const before = s.st.state;
    s.update(1 / 30, { awake: false, field, inPool, ripples: [], players: [] });
    const d = Math.hypot(s.st.x - fx, s.st.z - fz);
    if (d > 11) { const k = Math.min(1, (15 / 30) / d) * (d - 11) / d * 30; fx += (s.st.x - fx) * Math.min(1, k); fz += (s.st.z - fz) * Math.min(1, k); }
    if (before === 'return' && s.st.state === 'dormant') { home = Math.hypot(fx - L.x, fz - L.z); break; }
  }
  assert.ok(home !== null && home < 25, `following it home ends at its raft (${home && home.toFixed(1)} mm off)`);
  // awake, it gives chase to a springtail close by on its ground, and gives up past its leash
  s.release();
  for (let t = 0; t < 60 && s.st.state !== 'wander'; t += 1 / 30) s.update(1 / 30, { awake: false, field, inPool, ripples: [], players: [] });
  const P = { slot: 0, x: s.st.x + 15, z: s.st.z, alive: true, heading: 0 };
  const e2 = s.update(1 / 30, { awake: true, field, inPool, ripples: [], players: [P] });
  assert.ok(e2.some((e) => e.type === 'wake') && s.st.state === 'stalk', 'it hunts a springtail close by on its ground');
  assert.ok(LEASH >= GROUND.r, 'its leash covers its ground');
}

// ---- the director with the springtail's settings and a fake world
const DT = 1 / 30;
const YAW = Math.PI - Math.PI / 6; // main.js rig.yaw: the camera sits this way from its target
function view(x, z) {
  const a = YAW + Math.PI, back = 183, h = 0.13, reach = 55;
  const cx = x - Math.cos(a) * back, cz = z - Math.sin(a) * back;
  const plane = (ang) => { const nx = -Math.sin(ang), nz = Math.cos(ang); return [nx, 0, nz, -(nx * cx + nz * cz)]; };
  const fx = Math.cos(a), fz = Math.sin(a);
  return { frustum: [plane(a - h), plane(a + h).map((v) => -v), [fx, 0, fz, -(fx * cx + fz * cz) - (back - 37)], [-fx, 0, -fz, fx * cx + fz * cz + back + reach]], focus: { x, y: 0, z } };
}
function game({ seconds, move }) {
  for (const k of ['stenus', 'strider', 'crowd']) parkZone(k);
  const bad = [];
  let D;
  const place = (id) => (x, z, b) => {
    if (id !== 'rain' && D.visibleNow(x, 0, z, ENCOUNTERS.find((e) => e.id === id).visible ?? 0)) bad.push(`${id} placed in view`);
    if (id !== 'rain' && !canPlace(x, z)) bad.push(`${id} on a raft`);
    if (id === 'stenus') setZoneAt('stenus', x, z, b);
    if (id === 'strider') { setZoneAt('strider', x, z, b); setZoneAt('crowd', x, z, b); }
    return { x, z };
  };
  const met = {
    stenus: (h, [p]) => inReach('stenus', p.x, p.z),
    strider: (h, [p]) => inReach('strider', p.x, p.z) || inReach('crowd', p.x, p.z),
    rain: () => true,
  };
  D = createDirector({ ...DIRECTOR, canPlace, entries: ENCOUNTERS.map((e) => ({ ...e, place: place(e.id), met: met[e.id] })) });
  const p = { id: 0, x: START.x, z: START.z };
  const ev = [];
  let striderT = null, raft = null, doneT = null, groundT = null;
  for (let t = 0; t < seconds; t += DT) {
    move(t, p, D);
    // main.js stepDirector: in a portal's ground with encounters left, the next one now
    const np = nearestPortal(p.x, p.z);
    if (np.d < GROUND.r) groundT ??= t;
    if (!D.done && np.d < GROUND.r) D.placeNow();
    const out = D.update(DT, [p], [view(p.x, p.z)]);
    ev.push(...out);
    if (D.done) doneT ??= t;
    if (np.d < np.p.reach) raft ??= { t, sealed: !D.done };
    // main.js driftStrider: a strider placed out of a lingering player's reach rows over (4 mm/s, after 5 s)
    const S = D.entry('strider');
    if (S.state === 'placed') {
      striderT ??= t;
      const Z = ZONES.strider, d = Math.hypot(p.x - Z.x, p.z - Z.z);
      if (t - striderT > 5 && !D.state().leader.moving && !inReach('strider', p.x, p.z)) { Z.x += ((p.x - Z.x) / d) * 4 * DT; Z.z += ((p.z - Z.z) / d) * 4 * DT; }
    }
    if (raft && D.done) break;
  }
  return { ev, bad, D, raft, doneT, groundT };
}
const at = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
/**
 * Rush along bearing a with tap jumps (~15 mm/s), round islands; at the bank,
 * along it toward the nearest portal; once in a ground, make for its raft.
 */
const rusher = (a0) => {
  let a = a0, target = null, turn = 0;
  return (t, p) => {
    const np = nearestPortal(p.x, p.z);
    if (np.d < GROUND.r) target = np.p;
    if (target) a = Math.atan2(target.z - p.z, target.x - p.x);
    else if (turn) {
      const e = poolE(p.x, p.z), gx = poolE(p.x + 0.5, p.z) - e, gz = poolE(p.x, p.z + 0.5) - e, g = Math.hypot(gx, gz) || 1;
      a = Math.atan2(turn * gx / g, -turn * gz / g) + turn * (e - 0.885) * 30;
    }
    for (let i = 0; i < 12; i++) {
      const b = a + (turn && !target ? turn * i * 0.2 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5);
      const nx = p.x + Math.cos(b) * 15 * DT, nz = p.z + Math.sin(b) * 15 * DT;
      if (!target && !turn && poolE(nx, nz) > 0.89) {
        // the bank: along it, the way toward the nearest portal
        const e = poolE(p.x, p.z), gx = poolE(p.x + 0.5, p.z) - e, gz = poolE(p.x, p.z + 0.5) - e;
        turn = (-gz) * (np.p.x - p.x) + gx * (np.p.z - p.z) > 0 ? 1 : -1;
        return;
      }
      if (target && Math.hypot(nx - target.x, nz - target.z) < 2) return;
      if (poolE(nx, nz) < 0.97 && (islandEdge(nx, nz).d > 0.5 || (target && Math.hypot(target.x - nx, target.z - nz) < PORTAL_R))) { p.x = nx; p.z = nz; return; }
    }
  };
};
const times = [];
for (let k = 0; k < 16; k++) {
  const r = game({ seconds: 150, move: rusher((k / 16) * Math.PI * 2) });
  const tag = `bearing ${k * 22.5}`;
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ['stenus', 'strider', 'rain'], `${tag}: every encounter, in order`);
  for (const e of r.ev.filter((x) => x.type === 'placed' || x.type === 'moved')) {
    const spec = ENCOUNTERS.find((s) => s.id === e.id);
    if (spec.fits) assert.ok(spec.fits(e.x, e.z, e.b), `${tag}: ${e.id} on open water`);
  }
  const T = { stenusPlaced: at(r.ev, 'placed', 'stenus').t, stenus: at(r.ev, 'met', 'stenus').t, strider: at(r.ev, 'met', 'strider').t, rain: at(r.ev, 'met', 'rain').t, ground: r.groundT, raft: r.raft && r.raft.t };
  assert.ok(T.stenusPlaced >= 3, `${tag}: a warm-up first (${T.stenusPlaced} s)`);
  assert.ok(T.stenus <= 12, `${tag}: Stenus within ~10 s (${T.stenus} s)`);
  assert.ok(T.strider - T.stenus >= 4, `${tag}: a calm break before the strider`);
  assert.ok(r.raft && T.raft <= 75, `${tag}: a portal raft reached within ~a minute (${T.raft} s)`);
  assert.ok(r.doneT <= T.raft + 15, `${tag}: everything met by the raft, or soon after (${r.doneT} s, raft ${T.raft} s)`);
  times.push(T);
}
const span = (k) => `${Math.min(...times.map((t) => t[k])).toFixed(1)}-${Math.max(...times.map((t) => t[k])).toFixed(1)} s`;

// ---- don't skip: a beeline for the nearest portal gets there sealed or not, but every encounter is met first
const beeline = (speed) => (t, p) => {
  const { p: L } = nearestPortal(START.x, START.z);
  if (Math.hypot(L.x - p.x, L.z - p.z) < 3) return;
  const a = Math.atan2(L.z - p.z, L.x - p.x);
  for (const da of [0, 0.5, -0.5, 1, -1]) {
    const nx = p.x + Math.cos(a + da) * speed * DT, nz = p.z + Math.sin(a + da) * speed * DT;
    if (islandEdge(nx, nz).d > 0.5 || Math.hypot(L.x - nx, L.z - nz) < PORTAL_R) { p.x = nx; p.z = nz; return; }
  }
};
const bee = game({ seconds: 200, move: (t, p) => beeline(15)(t, p) });
assert.deepEqual(bee.ev.filter((e) => e.type === 'met').map((e) => e.id), ['stenus', 'strider', 'rain'], 'beeline: every encounter in order');
assert.ok(bee.raft && bee.doneT !== null, 'beeline: reached the raft and met everything');
// a sprinter (charged jumps, ~30 mm/s) beelines for the nearest raft and waits there: it is sealed when they
// arrive, and the encounters left come to them promptly (stepDirector's placeNow in a ground)
const sprint = game({ seconds: 200, move: beeline(30) });
assert.deepEqual(sprint.bad, []);
// (in its ground before the strider was met: the strider at once, then the rain)
const early = sprint.ev.filter((e) => e.type === 'placed' && e.t >= sprint.groundT);
assert.ok(early.length && early[0].t - sprint.groundT < 1, `sprinting: in a ground at ${sprint.groundT.toFixed(1)} s with encounters left, the next placed at once (${early.map((e) => `${e.id} ${e.t} s`).join(', ')})`);
assert.ok(sprint.raft && (sprint.raft.sealed || sprint.doneT <= sprint.raft.t), 'sprinting: the raft opens only once everything is met');
assert.deepEqual(sprint.ev.filter((e) => e.type === 'met').map((e) => e.id), ['stenus', 'strider', 'rain'], 'sprinting: every encounter in order all the same');
assert.ok(sprint.doneT - sprint.groundT < 30, `sprinting: the rest come to them soon after reaching the ground (${(sprint.doneT - sprint.groundT).toFixed(1)} s)`);

// ---- lingering at the start: the encounters still come, one by one, round them (the portals stay where they are)
const r1 = game({ seconds: 300, move: () => {} });
assert.deepEqual(r1.bad, []);
assert.deepEqual(r1.ev.filter((e) => e.type === 'met').map((e) => e.id), ['stenus', 'strider', 'rain'], 'lingering: every encounter in order');
for (const e of r1.ev.filter((x) => x.type === 'placed' && x.id !== 'rain')) assert.ok(['near', 'wider'].includes(e.how) && Math.hypot(e.x - START.x, e.z - START.z) < 160, `lingering: ${e.id} placed round them (${e.how}, ${Math.hypot(e.x - START.x, e.z - START.z).toFixed(0)} mm)`);

const rt = runs.map((r) => r.t);
console.log(`ok: ${ISLANDS.length} islands, ${SUNDEW_CLUSTERS} sundew clusters ${Math.min(...ds).toFixed(0)}-${Math.max(...ds).toFixed(0)} mm out; ${PORTALS.length} portals (${PORTALS.filter((p) => p.fill).length} from the coverage pass), nearest neighbour ${Math.min(...nn).toFixed(0)}-${Math.max(...nn).toFixed(0)} mm (mean ${(nn.reduce((a, b) => a + b) / nn.length).toFixed(0)}), ${PORTALS.map((p) => distFromStart(p.x, p.z)).reduce((a, b) => Math.min(a, b), 1e9).toFixed(0)}-${PORTALS.map((p) => distFromStart(p.x, p.z)).reduce((a, b) => Math.max(a, b), 0).toFixed(0)} mm from the start; ` +
  `${BEARINGS} bearings: a ground after ${Math.min(...rt).toFixed(1)}-${Math.max(...rt).toFixed(1)} s (mean ${(rt.reduce((a, b) => a + b) / rt.length).toFixed(1)}; ${bankRuns.length} meet the bank first, the far way along it ≤ ${Math.max(...bankRuns.map((r) => r.far)).toFixed(0)} s); ` +
  `pondweed ${PONDWEED.length} leaves (${strays.length} strays), ${(ground / elsewhere).toFixed(0)}x as thick in a ground; ` +
  `rushing in 16 directions: Stenus placed ${span('stenusPlaced')}, met ${span('stenus')}, strider ${span('strider')}, rain ${span('rain')}, ground ${span('ground')}, raft ${span('raft')}; ` +
  `beeline to the nearest raft: there at ${bee.raft.t.toFixed(1)} s (${bee.raft.sealed ? 'sealed' : 'open'}), all met at ${bee.doneT.toFixed(1)} s; sprinting there (30 mm/s): in its ground at ${sprint.groundT.toFixed(1)} s, at the raft ${sprint.raft.t.toFixed(1)} s (${sprint.raft.sealed ? 'sealed' : 'open'}), all met at ${sprint.doneT.toFixed(1)} s (${sprint.ev.filter((e) => e.type === 'placed').map((e) => `${e.id} ${e.how} ${e.t} s`).join(', ')}); lingering: ${r1.ev.filter((e) => e.type === 'placed' || e.type === 'met').map((e) => `${e.id} ${e.type} ${e.t} s${e.how && e.type === 'placed' ? ` (${e.how})` : ''}`).join(', ')}`);
