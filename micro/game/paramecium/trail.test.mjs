// The food trail (trail.js) with the director (route.js), without a browser:
// the clusters lead monotonically to the portal; a player who wanders off gets
// a rejoin cluster toward it, where nobody has looked, and seen clusters never
// move; the hunters lie between the clusters, never on one; the encounters
// come every ~15-25 s of following the food; following the food (eating every
// cluster, stopping for each fight) reaches the portal in ~2-3 minutes, and
// holding the stick up in about a minute.
//   node --test micro/game/paramecium/trail.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirector } from '../shared/director.js';
import { createTrail, stepTrail, settle, aheadOf, nextFrom, nearCluster, live } from './trail.js';
import { TRAIL, trailLine, PORTAL_DIST, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, MET, canPlace, START, FIELD, ZOOM, RUSH, FORWARD, squadHomes, bandDist, trapAt, PATH_GAPS } from './route.js';

const DT = 1 / 30;
const WALK = RUSH * 0.6; // full stick, no dashes (~510 µm/s)
// the view at the start zoom (3x: 1680 x 945 µm), with main.js's 1.2 margin for the director
const HW = (FIELD * ZOOM.start / 2) * 1.2, HH = (FIELD * ZOOM.start / 2) * (9 / 16) * 1.2;
const view = (x, y) => ({ frustum: [[-1, 0, 0, x + HW], [1, 0, 0, -x + HW], [0, 0, -1, y + HH], [0, 0, 1, -y + HH]], focus: { x, y: 0, z: y } });
const hyp = Math.hypot;
const PLANNED = { x: START.x + Math.cos(FORWARD) * PORTAL_DIST, y: START.y + Math.sin(FORWARD) * PORTAL_DIST };

/**
 * A game: the director (default path, every entry single, as main.js) and the trail, a player moved by
 * `move(t, p, G)`; returns the log. G: { D, T, H (where each encounter is), met: {id: t}, placedAt: [{id, x, y, clusters}] }.
 */
function game({ seconds, move, path = true }) {
  const G = { H: {}, met: {}, placedAt: [], bad: [], fightUntil: 0, t: 0 };
  const T = createTrail({ target: PLANNED });
  G.T = T;
  const line = trailLine();
  const fits = (x, z) => !nearCluster(T, x, z, 0, line);
  const place = (id) => (x, z, b) => {
    const homes = id === 'portal' ? [[x, z]] : id === 'bloom' ? [[x, z]] : squadHomes(id, x, z, b);
    G.H[id] = { x, z, b, homes };
    G.placedAt.push({ id, x, z, b, t: G.t, clusters: T.clusters.filter((c) => live(c)).map((c) => [c.x, c.y]) });
    return G.H[id];
  };
  const met = (id) => (h, [p]) => (id === 'bloom' ? bandDist(p.x, p.z, h.x, h.z, h.b) < MET.bloom : h.homes.some(([hx, hz]) => hyp(p.x - hx, p.z - hz) < MET[id]));
  const D = createDirector({ ...DIRECTOR, canPlace, ...(path ? { defaultPath: DEFAULT_PATH } : {}), entries: ENCOUNTERS.map((e) => ({ ...e, single: true, fits, place: place(e.id), met: met(e.id) })) });
  G.D = D;
  const p = { id: 0, x: START.x, z: START.y, y: START.y };
  G.p = p;
  for (let t = 0; t < seconds; t += DT) {
    G.t = t;
    move(t, p, G);
    p.y = p.z;
    const ev = D.update(DT, [p], [view(p.x, p.z)]);
    for (const e of ev) if (e.type === 'met') G.met[e.id] = +t.toFixed(1);
    const ps = D.portals();
    stepTrail(T, { dt: DT, players: [{ id: 0, x: p.x, y: p.z }], target: ps.length ? { x: ps[0].x, y: ps[0].z } : null, seen: (x, y) => D.seenAt(x, y), inView: (x, y, r) => D.visibleNow(x, 0, y, r),
      blocked: (x, y) => Object.entries(G.H).some(([id, h]) => !(id in G.met) && h.homes.some(([hx, hz]) => hyp(hx - x, hz - y) < TRAIL.clear)) });
    for (const c of T.clusters) if (!c.active && hyp(c.x - p.x, c.y - p.z) < TRAIL.activate) c.active = true;
    settle(T);
    if (G.met.portal !== undefined) break;
  }
  return G;
}
const swim = (p, a, v) => { p.x += Math.cos(a) * v * DT; p.z += Math.sin(a) * v * DT; };
const toward = (p, q) => Math.atan2(q.y - p.z, q.x - p.x);

/**
 * Following the food: to the nearest unfinished cluster on the way, gulping each clump (0.35 s each), then
 * the next; a stop for each fight once met (a hunter 7 s, the giant 10, the bloom 3); at the end, the leaf
 * (the trap's fight: 12 s). Walks at full stick without dashes.
 */
const FIGHT = { dileptus: 7, didinium: 7, pair: 9, giant: 10, pack: 10, bloom: 3 };
function follower(speed = WALK) {
  let eating = 0, lastMet = 0, trapT = 0;
  return (t, p, G) => {
    const n = Object.keys(G.met).length;
    if (n > lastMet) { const id = Object.keys(G.met).at(-1); G.fightUntil = t + (FIGHT[id] || 0); lastMet = n; }
    if (t < G.fightUntil) return;
    if (eating > 0) { eating -= DT; return; }
    const ps = G.D.portals(), P = ps.length && { x: ps[0].x, y: ps[0].z };
    const c = aheadOf(G.T, p.x, p.z)[0];
    if (c) {
      const it = c.items.filter((i) => !(i.dying > 0)).sort((a, b) => hyp(a.x - p.x, a.y - p.z) - hyp(b.x - p.x, b.y - p.z))[0];
      if (it && hyp(it.x - p.x, it.y - p.z) < 40) { it.dying = 0.001; it.by = p; eating = 0.35; return; }
      if (it) { swim(p, toward(p, it), Math.min(speed, hyp(it.x - p.x, it.y - p.z) / DT)); return; }
    }
    if (P) {
      if (hyp(P.x - p.x, P.y - p.z) < 900 && G.D.state().current === 'portal' && trapT < 12) { trapT += DT; return; } // the trap's fight
      swim(p, toward(p, P), speed);
    }
  };
}

test('the trail: clusters from the start to the portal, each a step nearer, the first in the opening view', () => {
  const T = createTrail({ target: PLANNED });
  stepTrail(T, { dt: DT, players: [{ id: 0, x: 0, y: 0 }], target: PLANNED });
  const cs = T.clusters;
  assert.ok(cs.length >= 15 && cs.length <= 21, `roughly 15-20 clusters (${cs.length})`);
  const dT = cs.map((c) => hyp(PLANNED.x - c.x, PLANNED.y - c.y));
  for (let i = 1; i < cs.length; i++) {
    assert.ok(dT[i] < dT[i - 1] - TRAIL.step * 0.9, `cluster ${i} is a step nearer the portal (${dT[i - 1].toFixed(0)} -> ${dT[i].toFixed(0)})`);
    const gap = hyp(cs[i].x - cs[i - 1].x, cs[i].y - cs[i - 1].y), sh = FIELD * ZOOM.start * 9 / 16;
    assert.ok(gap >= sh * 1 && gap <= sh * 1.5, `1-1.5 screen heights apart (${(gap / sh).toFixed(2)})`);
  }
  assert.ok(cs[0].y < FIELD * ZOOM.start * 9 / 32 - TRAIL.r, 'the first cluster is in the opening view');
  assert.ok(dT.at(-1) <= Math.hypot(TRAIL.last, TRAIL.wobble) + 1 && dT.at(-1) > TRAIL.endShort, `the last just short of the leaf (${dT.at(-1).toFixed(0)} µm)`);
  for (const c of cs) assert.ok(c.items.length >= TRAIL.items[0] && c.items.length <= TRAIL.items[1] && c.items.every((i) => hyp(i.x - c.x, i.y - c.y) <= TRAIL.r + 1 && Math.abs(i.z - c.z) <= TRAIL.zr), 'a little group of food, at one depth');
  // eaten to the last by a player: done, and the next is on the way from it
  cs[0].active = true;
  for (const i of cs[0].items) { i.dying = 0.001; i.by = {}; }
  const done = settle(T);
  assert.deepEqual(done.map((c) => c.id), [cs[0].id]);
  assert.equal(nextFrom(T, cs[0].x, cs[0].y), cs[1], 'the glint points at the next');
  // lost to the giant (none eaten by a player): gone, no chime
  cs[1].active = true;
  for (const i of cs[1].items) i.dying = 0.001;
  assert.deepEqual(settle(T), []);
  assert.ok(cs[1].gone && !cs[1].done);
});

test('a player who wanders off gets a rejoin cluster toward the portal, where nobody has looked; seen ones never move', () => {
  for (const off of [0.6, -0.9, 1.3, Math.PI]) {
    const seenPos = new Map();
    let firstRejoin = null;
    const G = game({ seconds: 40, move: (t, p, G) => {
      // wander off for 14 s, then look for the trail: go to the nearest cluster on the way, round and round
      if (t < 14) { swim(p, FORWARD + off, WALK); return; }
      const c = aheadOf(G.T, p.x, p.z)[0];
      if (c && !firstRejoin) firstRejoin = { c, p: { x: p.x, y: p.z }, t };
      if (c) swim(p, toward(p, c), WALK);
      for (const q of G.T.clusters) {
        if (q.seenT === null) continue;
        const k = seenPos.get(q.id);
        if (!k) seenPos.set(q.id, [q.x, q.y]); else assert.deepEqual(k, [q.x, q.y], 'a seen cluster never moves');
        assert.ok(!q.dropped, 'a seen cluster is never taken back');
      }
    } });
    const tag = `off by ${off.toFixed(2)} rad`;
    assert.ok(firstRejoin, `${tag}: a cluster on the way`);
    const { c, p } = firstRejoin;
    const P = G.D.portals()[0], tx = P.x, ty = P.z;
    assert.ok(hyp(tx - c.x, ty - c.y) < hyp(tx - p.x, ty - p.y) - 300, `${tag}: nearer the portal than the player`);
    assert.ok(hyp(c.x - p.x, c.y - p.y) < TRAIL.ahead, `${tag}: near them`);
    const rejoins = G.T.log.filter((e) => e.type === 'placed' && G.T.clusters[e.id].kind === 'rejoin');
    assert.ok(rejoins.length >= 1, `${tag}: rejoins placed (${rejoins.length})`);
    // following them, each next one nearer the portal
    const chain = G.T.clusters.filter((q) => q.kind === 'rejoin' && !q.dropped);
    for (const q of chain) assert.ok(!nearCluster({ laid: true, clusters: G.T.clusters.filter((r) => r !== q && !r.dropped && !r.done && hyp(r.x - q.x, r.y - q.y) < TRAIL.step * 0.5) }, q.x, q.y, -TRAIL.clear), `${tag}: rejoins do not pile up`);
  }
});

test('a rejoin is placed out of sight: never in view, never on seen water', () => {
  const T = createTrail({ target: PLANNED });
  const seen = new Set();
  const key = (x, y) => `${Math.floor(x / 250)},${Math.floor(y / 250)}`;
  // everything within 1.5 mm of the player is seen, the player 6 mm off the line
  const px = 6000, py = 4000;
  for (let x = px - 1500; x <= px + 1500; x += 125) for (let y = py - 1500; y <= py + 1500; y += 125) if (hyp(x - px, y - py) < 1500) seen.add(key(x, y));
  stepTrail(T, { dt: DT, players: [{ id: 0, x: 0, y: 0 }], target: PLANNED }); // (the chain)
  const before = T.clusters.length;
  T.tryT = 0;
  stepTrail(T, { dt: DT, players: [{ id: 0, x: px, y: py }], target: PLANNED, seen: (x, y) => seen.has(key(x, y)), inView: (x, y, r) => Math.abs(x - px) < 1008 + r && Math.abs(y - py) < 567 + r });
  const added = T.clusters.slice(before);
  assert.equal(added.length, 1, 'one rejoin');
  const c = added[0];
  assert.ok(!seen.has(key(c.x, c.y)) && hyp(c.x - px, c.y - py) >= 1350, `placed past what has been seen (${hyp(c.x - px, c.y - py).toFixed(0)} µm)`);
  assert.ok(hyp(PLANNED.x - c.x, PLANNED.y - c.y) < hyp(PLANNED.x - px, PLANNED.y - py), 'toward the portal');
});

test('the hunters lie between the clusters, never on one (on the path and placed as you go)', () => {
  // the default path: each in its gap
  const G = game({ seconds: 150, move: (t, p, G) => { const P = G.D.entry('portal').def; swim(p, G.D.state().current === 'portal' && P && hyp(P.x - p.x, P.z - p.z) < 900 ? Math.atan2(P.z - p.z, P.x - p.x) : FORWARD, RUSH); } });
  const line = trailLine();
  for (const e of G.placedAt) {
    for (const [cx, cy] of e.clusters.length ? e.clusters : line) assert.ok(hyp(cx - e.x, cy - e.z) >= TRAIL.clear, `${e.id}: clear of every cluster (${hyp(cx - e.x, cy - e.z).toFixed(0)} µm)`);
    if (e.id === 'portal') continue;
    const along = e.z - START.y, g = PATH_GAPS[e.id];
    assert.ok(along > line[g][1] + TRAIL.clear - 1 && along < line[g + 1][1] - TRAIL.clear + 1, `${e.id}: in the gap after cluster ${g}`);
  }
  // off the path, wandering: placed as you go, still never within TRAIL.clear of a cluster that is there
  for (const off of [0.9, -1.2, 2.4]) {
    const W = game({ seconds: 200, move: (t, p, G) => { if (t < 25) swim(p, FORWARD + off, RUSH); else follower(RUSH)(t, p, G); } });
    const dyn = W.placedAt.filter((e) => e.t > 0);
    assert.ok(dyn.length >= 2, `off by ${off}: encounters placed as you go (${dyn.length})`);
    for (const e of dyn) for (const [cx, cy] of e.clusters) assert.ok(hyp(cx - e.x, cy - e.z) >= TRAIL.clear, `off by ${off}: ${e.id} clear of the clusters`);
    // and no cluster laid on an unmet encounter
    for (const c of W.T.clusters.filter((q) => q.kind === 'rejoin')) for (const e of W.placedAt) {
      const metT = W.met[e.id];
      const placedT = W.T.log.find((l) => l.type === 'placed' && l.id === c.id).t;
      if (placedT > e.t && (metT === undefined || placedT < metT)) for (const [hx, hy] of squadHomes(e.id, e.x, e.z, e.b)) assert.ok(e.id === 'bloom' || e.id === 'portal' || hyp(hx - c.x, hy - c.y) >= TRAIL.clear - 1, `off by ${off}: rejoin clear of ${e.id}`);
    }
  }
});

test('following the food: an encounter every ~15-25 s, the portal in 2-3 minutes; holding the stick up, about a minute', () => {
  const G = game({ seconds: 300, move: follower() });
  const ids = ENCOUNTERS.map((e) => e.id);
  assert.deepEqual(Object.keys(G.met), ids, 'every encounter, in order');
  const T = ids.map((id) => G.met[id]);
  const gaps = T.slice(1).map((v, i) => v - T[i]);
  const mean = (T.at(-2) - T[0]) / (T.length - 2);
  assert.ok(T[0] >= 5 && T[0] <= 25, `the first after a warm-up (${T[0]} s)`);
  assert.ok(mean >= 15 && mean <= 25, `an encounter every ~15-25 s (mean ${mean.toFixed(1)} s; ${gaps.map((g) => g.toFixed(1)).join(', ')})`);
  for (const g of gaps.slice(0, -1)) assert.ok(g >= 8 && g <= 35, `no long stretch without one, none on top of another (${g.toFixed(1)} s)`);
  const done = G.T.clusters.filter((c) => c.done).length;
  assert.ok(done >= 15, `ate their way along the trail (${done} clusters)`);
  assert.ok(G.met.portal >= 120 && G.met.portal <= 180, `the portal in 2-3 minutes (${G.met.portal} s)`);
  // rushing: the stick held up (no dashes), the leaf steered for once it is in view
  const R = game({ seconds: 200, move: (t, p, G) => { const P = G.D.entry('portal').def; swim(p, G.D.state().current === 'portal' && P && hyp(P.x - p.x, P.z - p.z) < 900 ? Math.atan2(P.z - p.z, P.x - p.x) : FORWARD, WALK); } });
  assert.deepEqual(Object.keys(R.met), ids, 'rushing: every encounter, in order');
  assert.ok(R.met.portal >= 45 && R.met.portal <= 75, `rushing: about a minute (${R.met.portal} s)`);
  console.log(`following the food: ${ids.map((id) => `${id} ${G.met[id]} s`).join(', ')}; ${done} clusters eaten`);
  console.log(`holding the stick up: ${ids.map((id) => `${id} ${R.met[id]} s`).join(', ')}`);
});
