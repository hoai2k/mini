// The bog pool: a wide sheet of open water (1.9 x 1.24 m) ringed by a steep
// Sphagnum bank, with moss islands standing in it, sundew rosettes on some
// islands, floating debris (dead Sphagnum leaves, bark flakes, needles) and
// food on the film. The water is the ground everywhere the springtail can
// go; moss, leaves and debris are things on it. Units: mm; the water
// surface is y = 0.
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial, macroShared, MACRO_GLSL } from '../shared/techniques/springtail-macro.js';

// (1.5 x 0.9 m until the portals were fixed: the pool grew so that a portal's
// pondweed is ~30-60 s of rushing from the start whichever way you head.)
export const POOL = { a: 950, b: 620 };
/**
 * Where a game starts: mid-pool. The scenery (islands, sundews, debris, food,
 * the bog pondweed) and the portal rafts with their wolf spiders are laid out
 * before play, the same every game (`PORTALS`: seeded blue noise, not placed
 * by the player's moves); the encounters (Stenus, the strider and its Podura
 * mass, the rain) are placed as you go by the director (shared/director.js;
 * main.js `director`), in that order, in water nobody has seen yet, a little
 * ahead of whoever is furthest along. Until placed, each one is hidden and
 * parked (`ZONES[k].placed`).
 */
export const START = { x: -30, z: 12 };
export const distFromStart = (x, z) => Math.hypot(x - START.x, z - START.z);
export const bearingFromStart = (x, z) => Math.atan2(z - START.z, x - START.x);

/** Moss islands standing in the pool: centre and radius (mm). Hand-placed round the start, then the sundew clusters, then a few scattered. */
export const ISLANDS = [
  [15, -9, 4], [-24, 16, 5], [34, 20, 5.5], [-38, -20, 5], [62, -6, 7], [-66, 22, 6], [8, 44, 5], [86, 36, 6],
  [-18, -52, 6], [78, -30, 5], [-90, -8, 6.5], [44, -58, 5], [-60, -62, 5], [-50, 62, 5.5], [40, 78, 5], [128, 0, 5],
].map(([x, z, r]) => ({ x: x + START.x + 4, z: z + START.z - 2, r }));
/**
 * Sundews are scenery, not encounters (the owner, 2026-11-01: things you can
 * jump over or walk round can be anywhere, safe areas too, "because you can
 * just avoid them"): 16 small clusters scattered over the pool at every
 * distance from the start (from ~50 mm out to ~560 mm), each a short
 * band of three islands with a rosette on each, its glue-tipped leaves
 * reaching out over the gaps (`buildSundews`). Seeded, so every game has the
 * same pool.
 */
export const SUNDEW_CLUSTERS = 16;
export const SUNDEW_ISLANDS = [];
{
  let seed = 909;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const BAND = [[-4, -24, 4.5], [7, 0, 4], [-3, 24, 4.5]];
  for (let c = 0, tries = 0; c < SUNDEW_CLUSTERS && tries < 4000; tries++) {
    // spread over the distances: cluster c at about 50 + c/15 of the way to ~430 mm, in a golden-angle turn of bearings
    const a = c * 2.39996 + 0.5 + (rnd() - 0.5) * 0.6, D = 52 + ((c * 7) % SUNDEW_CLUSTERS) / (SUNDEW_CLUSTERS - 1) * 500 + (rnd() - 0.5) * 30;
    const t = a + Math.PI / 2 + (rnd() - 0.5) * 0.8; // along the band
    const isl = BAND.map(([dr, dt, r], k) => ({ x: Math.round((START.x + Math.cos(a) * (D + dr) + Math.cos(t) * dt) * 10) / 10, z: Math.round((START.z + Math.sin(a) * (D + dr) + Math.sin(t) * dt) * 10) / 10, r, sundew: true, cluster: c, t, k }));
    const clear = isl.every((I) => poolE(I.x, I.z) < 0.86 && [...ISLANDS, ...SUNDEW_ISLANDS].every((J) => Math.hypot(I.x - J.x, I.z - J.z) > I.r + J.r + 10));
    if (!clear || distFromStart(isl[1].x, isl[1].z) < 45) continue;
    SUNDEW_ISLANDS.push(...isl);
    c++;
  }
}
ISLANDS.push(...SUNDEW_ISLANDS);
{
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 12000 && ISLANDS.length < 72; k++) {
    const a = rnd() * Math.PI * 2, e = 0.24 + rnd() * 0.68;
    const x = Math.cos(a) * POOL.a * e, z = Math.sin(a) * POOL.b * e, r = 4 + rnd() * 4;
    if (distFromStart(x, z) < 135) continue;
    if (ISLANDS.every((I) => Math.hypot(I.x - x, I.z - z) > I.r + r + 40)) ISLANDS.push({ x: Math.round(x), z: Math.round(z), r: Math.round(r * 2) / 2 });
  }
}
export const ISLAND = ISLANDS[0];

/**
 * The encounters' water. Each predator keeps to its own water (radius r
 * round x, z) and gives up a chase `leash` mm beyond it; there is one of
 * each. The director (main.js) puts it where it meets the player
 * (`setZoneAt`); until then it is parked far off (`placed: false`) and the
 * predator hidden.
 */
const PARK = 1e5;
export const ZONES = {
  stenus: { x: PARK, z: PARK, a: 0, r: 40, leash: 25, placed: false },
  strider: { x: PARK, z: PARK, a: 0, r: 42, leash: 20, placed: false },
  // a mass of Podura (NPC springtails, shared/crowd.js) at the near edge of the strider's water, a little to one side
  crowd: { x: PARK, z: PARK, a: 0, back: 28, side: 20, r: 20, placed: false },
};
/** Where zone k goes when its centre is (x, z) and it is met coming along bearing a (the crowd sits beside the strider's water, toward you). */
export function zoneAt(k, x, z, a) {
  if (k !== 'crowd') return { x, z };
  const Z = ZONES.crowd;
  return { x: x - Math.cos(a) * Z.back + Math.cos(a + Math.PI / 2) * Z.side, z: z - Math.sin(a) * Z.back + Math.sin(a + Math.PI / 2) * Z.side };
}
/** Is (x, z) within zone k's reach (a predator's water and leash; the Podura mass and 30 mm round it: a screen from its edge)? */
export function inReach(k, x, z) { const Z = ZONES[k]; return Z.placed && Math.hypot(x - Z.x, z - Z.z) < Z.r + (k === 'crowd' ? 30 : Z.leash); }
/** Put zone k's centre at (x, z), met coming along bearing a (the crowd from the strider's centre). */
export function setZoneAt(k, x, z, a) { const p = zoneAt(k, x, z, a); Object.assign(ZONES[k], { x: p.x, z: p.z, a, placed: true }); return ZONES[k]; }
/** Park zone k far off (a new game: nothing placed yet). */
export function parkZone(k) { Object.assign(ZONES[k], { x: PARK, z: PARK, a: 0, placed: false }); }

/** Is (x, z) open pool water at least `m` mm from any island, inside poolE `e`? */
export const openAt = (x, z, m, e = 0.9) => poolE(x, z) < e && islandEdge(x, z).d > m;
/** Are eight points `r` mm round (x, z) all in the pool (room for an arena)? */
export function roomAt(x, z, r, e = 0.95) { for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; if (!(poolE(x + Math.cos(t) * r, z + Math.sin(t) * r) < e)) return false; } return true; }
/**
 * The director's settings and the encounters in order (main.js adds place
 * and met; route.test.mjs runs them without a browser). Distances in mm: a
 * full jump is 36, the 1x view 36 across; rushing with tap jumps is ~15 mm/s.
 *   size     clearance (its water and leash)
 *   parts    what can be seen of it when placed (the beetle where it starts,
 *            the strider and its mass): unseen water, out of view.
 *            Stenus and the strider start at the spot itself (main.js); their
 *            water is invisible, and walking on out of it later is behaviour
 *   min/maxAhead  how far ahead of the leader it goes; min/maxNear when they linger
 * The portals and their wolf spiders are not the director's: they are fixed
 * (`PORTALS`, below), and a portal stays closed until the director is done
 * (every encounter here met: main.js `sealed`).
 */
export const DIRECTOR = {
  cell: 10, seenDist: 60, nearSeen: 6, seed: 17,
  bounds: { x0: -POOL.a, x1: POOL.a, z0: -POOL.b, z1: POOL.b },
  // the warm-up: ~5 s of moving (a few jumps); then a calm break of ~8-10 s of moving clear of the last encounter
  // (rushing out with tap jumps, every encounter is met within ~30 s, before a portal's pondweed)
  warmup: { sec: 5 }, calm: { sec: 9 }, linger: 6, moveSpeed: 2.5,
  // seen but not gone to: met once everyone is ~3 screens off, or after 10 s in sight nearby (it is never moved)
  watchSec: 10,
};
export const ENCOUNTERS = [
  { id: 'stenus', size: 40, visible: 8, minAhead: 55, maxAhead: 95, minNear: 40, maxNear: 62,
    fits: (x, z) => openAt(x, z, 6) && roomAt(x, z, 30) },
  { id: 'strider', size: 62, minAhead: 72, maxAhead: 112, minNear: 50, maxNear: 80,
    parts: (x, z, b) => { const c = zoneAt('crowd', x, z, b); return [[x, z, 14], [c.x, c.z, ZONES.crowd.r + 2]]; },
    fits: (x, z, b) => { const c = zoneAt('crowd', x, z, b); return openAt(x, z, 10) && roomAt(x, z, 40) && openAt(c.x, c.z, ZONES.crowd.r + 3) && roomAt(c.x, c.z, ZONES.crowd.r); } },
  // an event, not a thing in the water
  { id: 'rain', size: 0, minAhead: 0, maxAhead: 0, virtual: true, calm: { sec: 8 } },
];
/** Encounters can go anywhere well inside the bank, but not onto a portal raft and its spider's post. */
export const canPlace = (x, z, r = 0) => poolE(x, z) < 0.93 && PORTALS.every((p) => Math.hypot(x - p.x, z - p.z) > PORTAL_R + 30 + Math.min(r, 30));

/**
 * The portals (the way on, design §0.6): floating rafts of Sphagnum crowned
 * with big capitula and the Limnozetes mite (landmarks.js), each with its
 * own pond wolf spider (boss.js) that hunts over the water round it, its
 * hunting ground (`GROUND`), and goes back to the raft between hunts. The
 * owner (2026-11-01): "place the portals ... in random noise generated
 * locations with a certain average distribution (so it's still random, but
 * not influenced by player behavior) and certain plants indicate that you're
 * coming close to a portal" (bog pondweed, `PONDWEED`), "the spiders hunt
 * within a certain radius and return to the portal, so you could follow the
 * spiders to their portal".
 *
 * Laid out once, the same every game (`PORTAL_SEED`): blue noise (dart
 * throwing, at least `PORTAL_SPACING` mm apart) over open water at least
 * `PORTAL_MIN_D` from the start (so its pondweed is ~30 s of rushing away at
 * the least) and inside poolE 0.88, then a coverage pass: a rusher heading
 * out on each of 64 bearings (`rushToGround`: 15 mm/s, round islands, along
 * the bank when it meets it) must reach some portal's ground within 60 s;
 * where one would not, a raft is added on its way at ~48 s (pulled in off
 * the bank) if it keeps 0.6 x the spacing. mossTop honours every raft, so
 * you land and walk on them like islands.
 */
export const PORTAL_R = 8;
/** A portal's hunting ground and pondweed zone: radius (mm) round the raft (~5 s of rushing). */
export const GROUND = { r: 80 };
export const PORTAL_SPACING = 340, PORTAL_MIN_D = 450 + GROUND.r, PORTAL_SEED = 44;
export const PORTALS = [];
/** The portal in focus (the one nearest the players: its raft's glow, its spider in the fight; main.js `focusPortal`). */
export const PORTAL = { placed: true, i: 0, x: 0, z: 0, a: 0, r: PORTAL_R, reach: 11 };
export function focusPortal(i) { Object.assign(PORTAL, PORTALS[i]); return PORTAL; }
/** The nearest portal to (x, z): { p, d }. */
export function nearestPortal(x, z) {
  let p = null, d = Infinity;
  for (const q of PORTALS) { const e = Math.hypot(x - q.x, z - q.z); if (e < d) { d = e; p = q; } }
  return { p, d };
}
/** Height (mm) of a raft's top at distance d from its centre (it floats: ~0.4 mm proud at the rim, 1.5 mm in the middle). */
export const raftTop = (d) => 0.4 + 1.1 * sm(0, -PORTAL_R * 0.75, d - PORTAL_R);

/** Normalised pool radius: < 1 inside the pool (matches POOL_GLSL). */
export function poolE(x, z) {
  const a = Math.atan2(z, x);
  return Math.hypot(x / POOL.a, z / POOL.b) * (1 + 0.05 * Math.sin(3 * a + 0.5) + 0.035 * Math.sin(5 * a + 1.3));
}
/** Distance (mm) from the nearest island's edge: negative on the island. */
export function islandEdge(x, z) {
  const list = islandCandidates(x, z);
  let d = Infinity, best = null;
  for (const I of list) { const v = Math.hypot(x - I.x, z - I.z) - I.r; if (v < d) { d = v; best = I; } }
  return { d, island: best };
}
// A grid over the pool: each cell keeps (in ISLANDS order) only the islands
// that can be the nearest edge to some point in it, i.e. those whose nearest
// possible edge distance is not beyond the cell's best farthest-point
// distance. The rest are strictly farther, so islandEdge finds the same
// distance and the same island as a loop over all of them. Built on first use
// (ISLANDS is final once this module has loaded).
const EDGE_CELL = 40;
let edgeGrid = null;
function islandCandidates(x, z) {
  if (!edgeGrid) {
    const x0 = -POOL.a * 1.2, z0 = -POOL.b * 1.2, nx = Math.ceil((POOL.a * 2.4) / EDGE_CELL), nz = Math.ceil((POOL.b * 2.4) / EDGE_CELL);
    const cells = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const ax = x0 + i * EDGE_CELL, az = z0 + j * EDGE_CELL, bx = ax + EDGE_CELL, bz = az + EDGE_CELL;
      const near = (I) => Math.hypot(Math.max(ax - I.x, 0, I.x - bx), Math.max(az - I.z, 0, I.z - bz)) - I.r;
      const far = (I) => Math.hypot(Math.max(I.x - ax, bx - I.x), Math.max(I.z - az, bz - I.z)) - I.r;
      const lim = Math.min(...ISLANDS.map(far)) + 1e-6;
      cells.push(ISLANDS.filter((I) => near(I) <= lim));
    }
    edgeGrid = { x0, z0, nx, nz, cells };
  }
  const g = edgeGrid, i = Math.floor((x - g.x0) / EDGE_CELL), j = Math.floor((z - g.z0) / EDGE_CELL);
  return i >= 0 && j >= 0 && i < g.nx && j < g.nz ? g.cells[i + j * g.nx] : ISLANDS;
}
export const inPool = (x, z) => poolE(x, z) < 1 && islandEdge(x, z).d > 0;

// ---------------------------------------------------------------- the portals and the pondweed (laid out once)
function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/**
 * A rusher from the start along bearing b (15 mm/s, the speed of tap jumps):
 * straight on, round islands, until it is within GROUND.r of a portal in
 * `list` or meets the bank; then along the bank, toward the nearer portal
 * (both ways are tried: `t` is the nearer, `far` the other). Returns
 * { t, far, bank (time it met the bank, or null), path } with path its
 * position every 0.1 s on the way out (and on along the bank the near way).
 */
export function rushToGround(list, b, limit = 120, speed = 15) {
  const DT = 0.1, near = (x, z) => list.some((p) => Math.hypot(p.x - x, p.z - z) < GROUND.r);
  const go = (x, z, a, t, turn, path) => {
    for (; t < limit; t += DT) {
      path.push([x, z]);
      if (near(x, z)) return { t, x, z };
      let moved = false;
      for (let i = 0; i < 24 && !moved; i++) {
        // out on the heading (rounding islands either way); along the bank, always turning the one way
        // (along the bank: from the bank side round, so it hugs the bank at poolE 0.895)
        const c = turn ? a - turn * 0.5 + turn * i * 0.12 : a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.15;
        const nx = x + Math.cos(c) * speed * DT, nz = z + Math.sin(c) * speed * DT;
        if (poolE(nx, nz) < (turn ? 0.895 : 0.93) && islandEdge(nx, nz).d > 0.5) {
          if (!turn && poolE(nx, nz) > 0.89) return { t, x, z, bank: true };
          x = nx; z = nz; moved = true; if (turn) a = c;
        }
      }
      if (!moved) a += turn || 0.5;
    }
    return { t: limit, x, z };
  };
  const path = [];
  const out = go(START.x, START.z, b, 0, 0, path);
  if (!out.bank) return { t: Math.min(out.t, limit), far: Math.min(out.t, limit), bank: null, path };
  const runs = [1, -1].map((turn) => { const p = []; return { ...go(out.x, out.z, b + turn * Math.PI / 2, out.t, turn, p), p }; }).sort((u, v) => u.t - v.t);
  return { t: Math.min(runs[0].t, limit), far: Math.min(runs[1].t, limit), bank: +out.t.toFixed(1), path: path.concat(runs[0].p) };
}
/** Can a raft go at (x, z): open water, away from the start, islands and the bank? */
const raftFits = (x, z) => poolE(x, z) < 0.88 && distFromStart(x, z) > PORTAL_MIN_D && islandEdge(x, z).d > PORTAL_R + 14 && roomAt(x, z, PORTAL_R + 20, 0.93);
/** Lay out the portals for a seed (blue noise, then the coverage pass). Exported for tests. */
export function layPortals(seed = PORTAL_SEED, { spacing = PORTAL_SPACING, bearings = 64, within = 58 } = {}) {
  const r = seeded(seed), list = [];
  for (let k = 0; k < 9000; k++) {
    const x = (r() * 2 - 1) * POOL.a, z = (r() * 2 - 1) * POOL.b;
    if (raftFits(x, z) && list.every((p) => Math.hypot(p.x - x, p.z - z) > spacing)) list.push({ x, z, fill: false });
  }
  for (let pass = 0; pass < 6; pass++) {
    let added = false;
    for (let k = 0; k < bearings; k++) {
      const run = rushToGround(list, (k / bearings) * Math.PI * 2, within + 1);
      if (run.t <= within) continue;
      for (const tt of [48, 44, 52, 40, 56, 36]) {
        let [x, z] = run.path[Math.min(run.path.length - 1, Math.round(tt * 10))];
        for (let q = 0; q < 40 && !raftFits(x, z); q++) { x = START.x + (x - START.x) * 0.985; z = START.z + (z - START.z) * 0.985; }
        if (raftFits(x, z) && list.every((p) => Math.hypot(p.x - x, p.z - z) > spacing * 0.6)) { list.push({ x, z, fill: true }); added = true; break; }
      }
    }
    if (!added) break;
  }
  // round to 0.1 mm; each raft turned so its mite's head faces the start
  return list.map((p, i) => {
    const x = Math.round(p.x * 10) / 10, z = Math.round(p.z * 10) / 10;
    return { i, x, z, a: Math.atan2(z - START.z, x - START.x), r: PORTAL_R, reach: 11, fill: p.fill };
  });
}
PORTALS.push(...layPortals());
focusPortal(0);

/**
 * Bog pondweed (Potamogeton polygonifolius): floating leaves, thick round
 * every portal raft (its spider's hunting ground: denser toward the raft,
 * thinning out at the ground's edge, GROUND.r) and only a stray leaf here
 * and there elsewhere, so a player learns "lots of these: a portal nearby".
 * Each leaf is a leathery ellipse lying on the film (solid footing, like the
 * debris: `pondweedAt`). Fixed, the same every game.
 *   { x, z, a (long axis), L, W, top, portal (index, or -1 for a stray) }
 */
export const PONDWEED = [];
{
  const r = seeded(31);
  const fits = (x, z, L) => poolE(x, z) < 0.93 && islandEdge(x, z).d > L * 0.55 + 1 && PORTALS.every((p) => Math.hypot(x - p.x, z - p.z) > PORTAL_R + L * 0.5 + 2.5) &&
    PONDWEED.every((w) => Math.hypot(w.x - x, w.z - z) > (w.L + L) * 0.36) && distFromStart(x, z) > 60;
  const add = (x, z, L, portal) => PONDWEED.push({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, a: r() * Math.PI, L, W: L * (0.36 + r() * 0.06), top: 0.14, portal, i: PONDWEED.length });
  for (const p of PORTALS) {
    // density falls from the raft to the ground's edge (and a little past it)
    for (let n = 0, k = 0; n < 34 && k < 900; k++) {
      const d = PORTAL_R + 4 + r() * (GROUND.r + 14 - PORTAL_R - 4), keep = 1 - sm(PORTAL_R + 8, GROUND.r + 14, d) * 0.92;
      if (r() > keep) continue;
      const t = r() * Math.PI * 2, L = 15 + r() * 13;
      const x = p.x + Math.cos(t) * d, z = p.z + Math.sin(t) * d;
      if (fits(x, z, L)) { add(x, z, L, p.i); n++; }
    }
  }
  // strays: single leaves well away from every portal's ground
  for (let n = 0, k = 0; n < 26 && k < 4000; k++) {
    const x = (r() * 2 - 1) * POOL.a, z = (r() * 2 - 1) * POOL.b, L = 14 + r() * 10;
    if (PORTALS.some((p) => Math.hypot(x - p.x, z - p.z) < GROUND.r + 120)) continue;
    if (fits(x, z, L)) { add(x, z, L, -1); n++; }
  }
}
/** Local offset of (x, z) from a leaf, normalised: < 1 on it. */
function onLeaf(w, x, z) {
  const dx = x - w.x, dz = z - w.z, c = Math.cos(w.a), s = Math.sin(w.a);
  return Math.hypot((dx * c + dz * s) / (w.L / 2), (-dx * s + dz * c) / (w.W / 2));
}
const LEAF_CELL = 40, leafGrid = new Map();
for (const w of PONDWEED) {
  const R = w.L / 2 + 1;
  for (let i = Math.floor((w.x - R) / LEAF_CELL); i <= Math.floor((w.x + R) / LEAF_CELL); i++)
    for (let k = Math.floor((w.z - R) / LEAF_CELL); k <= Math.floor((w.z + R) / LEAF_CELL); k++) {
      const key = i * 4096 + k;
      if (!leafGrid.has(key)) leafGrid.set(key, []);
      leafGrid.get(key).push(w);
    }
}
/** The pondweed leaf under (x, z), if any (a small margin so a landing on its rim holds). */
export function pondweedAt(x, z) {
  const list = leafGrid.get(Math.floor(x / LEAF_CELL) * 4096 + Math.floor(z / LEAF_CELL));
  if (list) for (const w of list) if (onLeaf(w, x, z) < 1.04) return w;
  return null;
}
/** How thick the pondweed is at (x, z): leaves per 1000 mm² within 30 mm (tests: it thickens toward a portal). */
export function pondweedDensity(x, z, R = 30) {
  let n = 0;
  for (const w of PONDWEED) if (Math.hypot(w.x - x, w.z - z) < R) n++;
  return (n / (Math.PI * R * R)) * 1000;
}
function sm(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
/** The bank is a steep wall of moss: the springtail cannot go past this. */
export const BANK_E = 0.995;
/** Height (mm) of the top of the moss (a bank or an island), or -Infinity over open water. */
export function mossTop(x, z) {
  const e = poolE(x, z);
  let h = -Infinity;
  if (e >= 1.0) h = 1.4 + 12 * sm(1.0, 1.08, e);
  const { d, island } = islandEdge(x, z);
  if (d <= 0.3) h = Math.max(h, 1.4 + 1.6 * sm(0, -island.r * 0.7, d));
  for (const p of PORTALS) { const dr = Math.hypot(x - p.x, z - p.z); if (dr <= PORTAL_R + 0.3) h = Math.max(h, raftTop(dr)); }
  return h;
}

const islandGlsl = ISLANDS.map((I) => `  di = min(di, length(p - vec2(${I.x.toFixed(1)}, ${I.z.toFixed(1)})) - ${I.r.toFixed(1)});`).join('\n');
const poolEGlsl = /* glsl */ `
float poolEG(vec2 p) {
  float a = atan(p.y, p.x);
  return length(p / vec2(${POOL.a.toFixed(1)}, ${POOL.b.toFixed(1)})) * (1.0 + 0.05 * sin(3.0 * a + 0.5) + 0.035 * sin(5.0 * a + 1.3));
}
float islandDist(vec2 p) {
  float di = 1e4;
${islandGlsl}
  return di;
}`;
export const POOL_GLSL = /* glsl */ `${poolEGlsl}
float poolDepth(vec2 p) {
  float e = poolEG(p);
  float di = islandDist(p);
  // a dark, deep bog pool (the tea hides the floor, so the film reads as a mirror); shallow by the shores
  float bed = 0.35 + 14.0 * smoothstep(1.0, 0.9, e) * smoothstep(0.0, 9.0, di);
  return bed * (0.85 + 0.3 * mFbm(p * 0.05));
}`;
/** GLSL `shoreDist(p)`: mm of open water between p and the nearest island or the bank. */
export const SHORE_GLSL = /* glsl */ `
float shoreDist(vec2 p) {
  return min(islandDist(p), (1.0 - poolEG(p)) * ${(POOL.b * 0.95).toFixed(1)});
}`;

// ---------------------------------------------------------------- geometry helpers
function tube(points, radii, sides, out) {
  const base = out.pos.length / 3;
  const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    t.subVectors(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]).normalize();
    n.crossVectors(t, Math.abs(t.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).normalize();
    b.crossVectors(t, n);
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      const dx = Math.cos(a) * n.x + Math.sin(a) * b.x, dy = Math.cos(a) * n.y + Math.sin(a) * b.y, dz = Math.cos(a) * n.z + Math.sin(a) * b.z;
      out.pos.push(p.x + dx * radii[i], p.y + dy * radii[i], p.z + dz * radii[i]);
      out.nrm.push(dx, dy, dz);
    }
  }
  for (let i = 0; i < points.length - 1; i++) for (let j = 0; j < sides; j++) {
    const a = base + i * sides + j, b2 = base + i * sides + ((j + 1) % sides), c = a + sides, d = b2 + sides;
    out.idx.push(a, c, b2, b2, c, d);
  }
}
function toGeo(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  g.setIndex(out.idx);
  g.computeBoundingSphere();
  return g;
}

/**
 * A Sphagnum capitulum (~10 mm across): a tight terminal bud of short
 * branches curving up and in, and spreading branches that arch out and droop.
 * Every branch is a tapered, slightly curved tube (leaves give it a ribbed
 * look in the shader).
 */
export function capitulumGeometry(rnd, { spreading = 22, bud = 14, sides = 5, segs = 5 } = {}) {
  const out = { pos: [], nrm: [], idx: [] };
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  for (let i = 0; i < bud; i++) {
    const a = i * 2.39996 + rnd() * 0.3, r0 = 0.3 + rnd() * 0.9;
    const L = 1.2 + rnd() * 1.0;
    const pts = [], rad = [];
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const r = r0 + Math.sin(u * 2.4) * L * 0.35 - u * u * r0 * 0.7;
      pts.push(P(Math.cos(a) * r, -0.6 + u * L * 0.9 + 0.5, Math.sin(a) * r));
      rad.push(0.26 * (1 - u * 0.75));
    }
    tube(pts, rad, sides, out);
  }
  for (let i = 0; i < spreading; i++) {
    const a = i * 2.39996 + rnd() * 0.4, L = 3.2 + rnd() * 1.8, rise = 0.6 + rnd() * 0.6;
    const pts = [], rad = [];
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const r = 0.6 + u * L;
      const y = 0.2 + Math.sin(u * 1.9) * rise - u * u * (1.1 + rnd() * 0.2);
      pts.push(P(Math.cos(a + u * 0.15) * r, y, Math.sin(a + u * 0.15) * r));
      rad.push(0.3 * (1 - u * 0.78));
    }
    tube(pts, rad, sides, out);
  }
  return toGeo(out);
}

export const MOSS_SURFACE = /* glsl */ `
uniform sampler2D uMossTex; uniform float uHasMossTex;
void surface(inout Surf s) {
  // imbricate leaves along each branch: fine ribbing and pale hyaline cells
  float rib = sin(vLocal.x * 18.0 + vLocal.z * 18.0 + vLocal.y * 25.0);
  float n = mFbm(vWorld.xz * 2.2 + vLocal.y);
  vec3 c = vColor * (0.55 + 0.6 * n);
  c = mix(c, vec3(0.55, 0.52, 0.3) * dot(vColor, vec3(0.6)), 0.25 * smoothstep(0.4, 0.9, rib * 0.5 + 0.5));
  if (uHasMossTex > 0.5) c = mix(c, texture2D(uMossTex, vWorld.xz / 18.0).rgb * (vColor / max(dot(vColor, vec3(0.333)), 0.05)) * 0.6, 0.65);
  s.N = normalize(s.N + vec3(rib * 0.12, 0.0, n - 0.5) * 0.3);
  // wet and dark down at the waterline, so each head stands out above it
  c *= mix(0.35, 1.0, smoothstep(0.1, 1.6, vWorld.y));
  s.albedo = c;
  s.rough = 0.6; s.f0 = 0.03; s.wrap = 0.5; s.trans = 0.9;
  // a bright backlit rim on every branch: the heads read as silhouettes against the water
  float nv = max(dot(s.N, normalize(cameraPosition - vWorld)), 0.0);
  s.sheen = 0.4; s.sheenCol = vColor * 2.5 + vec3(0.08, 0.09, 0.03);
  s.emit = (vColor * 1.2 + vec3(0.03, 0.035, 0.012)) * pow(1.0 - nv, 4.0) * (0.12 + uSunCol.g * 0.05);
}`;

/** The bank's ground height (mm) at normalised radius e: dips under the water just inside e = 1, then climbs steeply. */
const bankY = (e) => (e < 1 ? -1.2 * sm(1.0, 0.99, e) : 12 * sm(1.0, 1.08, e));
function bankGeometry() {
  const E = [0.99, 0.996, 1.0, 1.003, 1.007, 1.012, 1.02, 1.03, 1.042, 1.055, 1.07, 1.085, 1.11, 1.15, 1.22, 1.32, 1.45, 1.65, 1.9, 2.3, 3.0];
  const A = 900;
  const pos = [], idx = [];
  for (let i = 0; i <= A; i++) {
    const a = (i / A) * Math.PI * 2;
    const f = Math.hypot(Math.cos(a) / POOL.a, Math.sin(a) / POOL.b) * (1 + 0.05 * Math.sin(3 * a + 0.5) + 0.035 * Math.sin(5 * a + 1.3));
    for (const e of E) { const r = e / f; pos.push(Math.cos(a) * r, bankY(e), Math.sin(a) * r); }
  }
  const m = E.length;
  for (let i = 0; i < A; i++) for (let j = 0; j < m - 1; j++) {
    const k = i * m + j;
    idx.push(k, k + m, k + 1, k + 1, k + m, k + m + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildWorld({ mossTex = null, sundewTex = null, leafTex = null } = {}) {
  const group = new THREE.Group();
  const mossTexU = { value: mossTex }, hasMossTexU = { value: mossTex ? 1 : 0 };
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // sky dome: always far out of focus
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { ...macroShared },
    vertexShader: 'varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `${MACRO_GLSL}\nvarying vec3 vWorld;\nvoid main() { vec3 d = normalize(vWorld - cameraPosition); gl_FragColor = vec4(envSky(d) * 0.9, 2000.0); }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  group.add(sky);

  // the peat/moss bank under the capitula: a ring that follows the pool's
  // outline exactly, meeting the water at e = 1 and rising steeply
  const groundGeo = bankGeometry();
  const groundMat = litMaterial({ surface: `
    float n = mFbm(vWorld.xz * 0.9);
    s.albedo = mix(vec3(0.06, 0.08, 0.025), vec3(0.18, 0.1, 0.04), n);
    s.rough = 0.8; s.wrap = 0.3;` });
  group.add(new THREE.Mesh(groundGeo, groundMat));
  // the islands' domes: a carpet of moss (MP-S02 when delivered), wet and dark at the waterline
  const domeMat = litMaterial({ uniforms: { uMossTex: mossTexU, uHasMossTex: hasMossTexU }, surface: `uniform sampler2D uMossTex; uniform float uHasMossTex;
    void surface(inout Surf s) {
      float n = mFbm(vWorld.xz * 1.3);
      vec3 c = mix(vec3(0.05, 0.09, 0.02), vec3(0.16, 0.08, 0.03), n);
      if (uHasMossTex > 0.5) c = mix(c, texture2D(uMossTex, vWorld.xz / 9.0).rgb * 0.55, 0.8);
      s.albedo = c * mix(0.35, 1.0, smoothstep(-0.2, 1.2, vWorld.y));
      s.rough = 0.7; s.wrap = 0.4; s.trans = 0.3;
    }` });
  // each island: a low dome of peat and moss rising out of the water
  for (const I of ISLANDS) {
    const dome = new THREE.SphereGeometry(1, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const dp = dome.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i) * (I.r + 0.4), z = dp.getZ(i) * (I.r + 0.4);
      const d = Math.hypot(x, z) - I.r;
      dp.setXYZ(i, I.x + x, d > 0 ? -0.6 * (d / 0.4) : mossTop(I.x + x, I.z + z) - 0.9, I.z + z);
    }
    dome.computeVertexNormals();
    group.add(new THREE.Mesh(dome, domeMat));
  }

  // capitula
  const mossMat = litMaterial({ surface: MOSS_SURFACE, uniforms: { uMossTex: mossTexU, uHasMossTex: hasMossTexU } });
  const variants = [capitulumGeometry(rnd, { sides: 4 }), capitulumGeometry(rnd, { spreading: 18, bud: 12, sides: 4 }), capitulumGeometry(rnd, { spreading: 12, bud: 8, sides: 4, segs: 4 })];
  // far moss: the same heads with fewer, coarser branches (their ribs are under
  // a pixel or deep in the bokeh out there)
  const farVariant = capitulumGeometry(rnd, { spreading: 10, bud: 4, sides: 3, segs: 2 });
  const palette = [[0.06, 0.16, 0.025], [0.11, 0.18, 0.02], [0.2, 0.03, 0.03], [0.24, 0.14, 0.03], [0.09, 0.13, 0.02], [0.16, 0.05, 0.03]];
  const spots = [[], [], []];
  const tryPlace = (x, z, v, s) => {
    const h = mossTop(x, z);
    if (h === -Infinity) return;
    spots[v].push({ x, z, y: h - 1.3 * s, s, rot: rnd() * 6.28, c: palette[Math.floor(rnd() * palette.length)] });
  };
  // the bank: a rim of heads (the lighter variant: it is mostly seen from afar)
  const near = [];
  for (let i = 0; i < 12000 && near.length < 400; i++) {
    const a = rnd() * Math.PI * 2, e = 1.0 + rnd() * 0.1;
    const x = Math.cos(a) * POOL.a * e, z = Math.sin(a) * POOL.b * e;
    if (poolE(x, z) < 1.0) continue;
    if (near.every((p) => Math.hypot(p.x - x, p.z - z) > 11)) { near.push({ x, z }); tryPlace(x, z, 2, 1.2 + rnd() * 0.5); }
  }
  // islands: a tuft of heads packed over each dome
  for (const I of ISLANDS) {
    const n = Math.round((I.r * I.r) / 3.2);
    for (let i = 0; i < n; i++) {
      const u = Math.sqrt((i + 0.5) / n) * (I.r - 0.6), a = i * 2.39996 + rnd() * 0.3;
      tryPlace(I.x + Math.cos(a) * u, I.z + Math.sin(a) * u, i % 2, 0.85 + rnd() * 0.3);
    }
  }
  // the lawn beyond the bank, far out of focus
  for (let i = 0; i < 5000 && spots[2].length < 400; i++) {
    const a = rnd() * Math.PI * 2, e = 1.08 + rnd() * 0.6;
    const x = Math.cos(a) * POOL.a * e, z = Math.sin(a) * POOL.b * e;
    const ok = spots[2].every((p) => Math.hypot(p.x - x, p.z - z) > 22);
    if (ok) tryPlace(x, z, 2, 1.8 + rnd() * 0.8);
  }
  // Chunked by tiles of the pool, so the renderer frustum-culls whole tiles
  // per view (the macro lens sees a narrow cone), and each tile is an LOD:
  // full heads near the focal plane, the coarse variant beyond `lodDistance`
  // (set per view from the focus distance: setLodDistance()).
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  const TILE = 64;
  const lods = [];
  const tiles = new Map();
  variants.forEach((geo, v) => {
    for (const p of spots[v]) {
      const key = `${Math.floor(p.x / TILE)},${Math.floor(p.z / TILE)}`;
      let t = tiles.get(key);
      if (!t) tiles.set(key, (t = [[], [], []]));
      t[v].push(p);
    }
  });
  for (const t of tiles.values()) {
    const all = t.flat();
    const cx = all.reduce((a, p) => a + p.x, 0) / all.length, cz = all.reduce((a, p) => a + p.z, 0) / all.length;
    const lod = new THREE.LOD();
    lod.position.set(cx, 0, cz);
    const near = new THREE.Group(), far = new THREE.Group();
    t.forEach((list, v) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(variants[v], mossMat, list.length);
      list.forEach((p, i) => {
        q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.25, p.rot, (rnd() - 0.5) * 0.25));
        m4.compose(new THREE.Vector3(p.x - cx, p.y, p.z - cz), q, new THREE.Vector3(p.s, p.s, p.s));
        im.setMatrixAt(i, m4);
        im.setColorAt(i, col.setRGB(...p.c));
      });
      im.computeBoundingSphere();
      near.add(im);
      // the far tile shares the instance data
      const fm = new THREE.InstancedMesh(farVariant, mossMat, list.length);
      fm.instanceMatrix = im.instanceMatrix; fm.instanceColor = im.instanceColor;
      fm.boundingSphere = im.boundingSphere;
      far.add(fm);
    });
    lod.addLevel(near, 0);
    lod.addLevel(far, 60, 0.05);
    lods.push(lod);
    group.add(lod);
  }
  const lodDistance = (d) => { for (const l of lods) l.levels[1].distance = d; };

  const sundews = buildSundews(group, rnd, sundewTex);
  const food = buildFood(group, rnd);
  const debris = buildDebris(group, rnd);
  const pondweed = buildPondweed(group, leafTex);

  return { group, sundews, food, debris, pondweed, mossMat, domeMat, sky, mossTiles: lods, setLodDistance: lodDistance, setMossTex(t) { mossMat.uniforms.uMossTex.value = t; mossMat.uniforms.uHasMossTex.value = t ? 1 : 0; } };
}

// ---------------------------------------------------------------- sundews
const GLUE_SURFACE = /* glsl */ `
  float nv = max(dot(s.N, normalize(cameraPosition - vWorld)), 0.0);
  s.albedo = vec3(0.05, 0.004, 0.004);
  s.rough = 0.04; s.f0 = 0.04;
  // light through the clear mucilage, tinted by the red gland beneath
  s.emit = vec3(0.9, 0.08, 0.06) * (0.25 + 0.75 * pow(1.0 - nv, 2.0)) * (uSunCol.r * 0.25 + 0.15);`;

/**
 * Drosera rotundifolia rosettes: round leaf blades on petioles, each with
 * ~90 red glandular tentacles (longer at the rim) tipped with glue drops.
 */
function buildSundews(group, rnd, sundewTex) {
  // the sundew clusters: a rosette on each island of every cluster, its leaves held
  // out along the band, over the gaps between the islands
  const rosettes = SUNDEW_ISLANDS.map((I) => ({ x: I.x, z: I.z, n: 4 + (I.k % 2), R: I.r, a0: I.t + (I.k % 2 ? 0 : Math.PI), cluster: I.cluster }));
  const leafMat = litMaterial({
    uniforms: { uLeafTex: { value: sundewTex }, uHasLeafTex: { value: sundewTex ? 1 : 0 } },
    surface: `uniform sampler2D uLeafTex; uniform float uHasLeafTex;
    void surface(inout Surf s) {
      float r = length(vLocal.xz);
      s.albedo = mix(vec3(0.16, 0.3, 0.05), vec3(0.42, 0.05, 0.04), smoothstep(0.2, 1.0, r));
      // MP-S04: the blade in the middle of the plate (its glands and tentacle bases)
      if (uHasLeafTex > 0.5) { vec4 t = texture2D(uLeafTex, vec2(0.5 + vLocal.x * 0.2, 0.6 - vLocal.z * 0.2)); s.albedo = mix(s.albedo, t.rgb * 0.8, 0.75 * t.a); }
      s.rough = 0.45; s.wrap = 0.4; s.trans = 0.6; s.sheen = 0.1;
    }`,
  });
  const stalkMat = litMaterial({ surface: `s.albedo = mix(vec3(0.2, 0.28, 0.06), vec3(0.4, 0.08, 0.05), smoothstep(0.3, 1.2, vWorld.y)); s.rough = 0.45; s.wrap = 0.4; s.trans = 0.6;` });
  const tentMat = litMaterial({ surface: `s.albedo = mix(vec3(0.38, 0.03, 0.03), vec3(0.5, 0.2, 0.05), smoothstep(0.0, 0.3, vLocal.y) * 0.2); s.rough = 0.4; s.wrap = 0.5; s.trans = 0.8;` });
  const glueMat = litMaterial({ surface: GLUE_SURFACE, shadow: false });
  const tentGeo = new THREE.CylinderGeometry(0.028, 0.05, 1, 5, 1).translate(0, 0.5, 0);
  const dropGeo = new THREE.SphereGeometry(1, 10, 7);
  const bladeGeo = new THREE.SphereGeometry(1, 20, 8);
  { const p = bladeGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y > 0 ? y * 0.12 : y * 0.1); } bladeGeo.computeVertexNormals(); }
  const leaves = [];
  // one patch per cluster: its petioles merged into one mesh, its tentacles and
  // glue drops instanced, so each view draws (and culls) only the clusters it sees
  const patches = [];
  for (const ro of rosettes) {
    let P = patches[ro.cluster];
    if (!P) P = patches[ro.cluster] = { leaves: [], tents: [], stalks: { pos: [], nrm: [], idx: [] } };
    const baseY = Math.max(mossTop(ro.x, ro.z), 0.6);
    const a0 = ro.a0 ?? rnd() * Math.PI * 2;
    for (let i = 0; i < ro.n; i++) {
      // alternate leaves to either side along the band, fanned
      const a = a0 + (i % 2 ? Math.PI : 0) + (Math.floor(i / 2) / Math.max(1, Math.ceil(ro.n / 2) - 1) - 0.5) * 1.6 + (rnd() - 0.5) * 0.25;
      const L = ro.R + 1.8 + rnd() * 2.2, R = 2.0 + rnd() * 0.6;
      const cx = ro.x + Math.cos(a) * L, cz = ro.z + Math.sin(a) * L;
      const under = Math.max(mossTop(cx, cz), 0);
      const cy = Math.max(under + 0.35, 0.55 + rnd() * 0.4);
      // petiole
      const pts = [], rad = [];
      for (let s = 0; s <= 6; s++) {
        const u = s / 6;
        pts.push(new THREE.Vector3(ro.x + Math.cos(a) * (L - R) * u, baseY + (cy - baseY) * u + Math.sin(u * Math.PI) * 0.5, ro.z + Math.sin(a) * (L - R) * u));
        rad.push(0.22 - u * 0.08);
      }
      tube(pts, rad, 6, P.stalks);
      const blade = new THREE.Mesh(bladeGeo, leafMat);
      blade.position.set(cx, cy, cz);
      blade.scale.set(R, R, R);
      blade.rotation.set(0, -a, (rnd() - 0.5) * 0.15);
      group.add(blade);
      const leaf = { x: cx, y: cy + 0.12 * R, z: cz, r: R, a, curl: 0, target: null, tent: [], blade, grip: 0, close: 0, closeW: 0, shake: 0, shakeW: 0, rz0: blade.rotation.z, patch: P, i0: P.tents.length };
      // tentacles: rim ones long and splayed outward, inner ones short and upright
      const n = 90;
      for (let k = 0; k < n; k++) {
        const u = Math.sqrt((k + 0.5) / n), th = k * 2.39996;
        const lx = Math.cos(th) * u * R * 0.95, lz = Math.sin(th) * u * R * 0.95;
        const base = new THREE.Vector3(cx + lx, cy + 0.12 * R * Math.sqrt(Math.max(0, 1 - u * u)) * 0.9, cz + lz);
        const out2 = new THREE.Vector3(lx, 0, lz).normalize();
        const tilt = u * u * 1.15;
        const dir = new THREE.Vector3(out2.x * Math.sin(tilt), Math.cos(tilt), out2.z * Math.sin(tilt)).normalize();
        const len = 0.3 + u * u * 1.4 + rnd() * 0.15;
        const t = { base, dir0: dir, dir: dir.clone(), len, drop: 0.07 + rnd() * 0.04 + u * 0.03 };
        leaf.tent.push(t);
        P.tents.push(t);
      }
      P.leaves.push(leaf);
      leaves.push(leaf);
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), tip = new THREE.Vector3(), one = new THREE.Vector3();
  const write = (P, t, i) => {
    q.setFromUnitVectors(Y, t.dir);
    m4.compose(t.base, q, one.set(1, t.len, 1));
    P.tentIM.setMatrixAt(i, m4);
    tip.copy(t.dir).multiplyScalar(t.len).add(t.base);
    m4.compose(tip, q, one.set(t.drop, t.drop, t.drop));
    P.dropIM.setMatrixAt(i, m4);
  };
  for (const P of patches) {
    if (!P) continue;
    group.add(new THREE.Mesh(toGeo(P.stalks), stalkMat));
    P.tentIM = new THREE.InstancedMesh(tentGeo, tentMat, P.tents.length);
    P.dropIM = new THREE.InstancedMesh(dropGeo, glueMat, P.tents.length);
    group.add(P.tentIM, P.dropIM);
    P.tents.forEach((t, i) => write(P, t, i));
    // culled as one patch: the bounds of every tentacle, padded for the curl
    for (const im of [P.tentIM, P.dropIM]) { im.computeBoundingSphere(); im.boundingSphere.radius += 4; }
  }
  const want = new THREE.Vector3();
  return {
    leaves,
    /** Which leaf blade (if any) is under the point, within its glue. */
    leafAt(x, y, z) {
      for (const l of leaves) if (Math.hypot(x - l.x, z - l.z) < l.r + 0.25 && y < l.y + 0.9 && y > l.y - 0.6) return l;
      return null;
    },
    /** The nearest sundew island's centre to (x, z) and its distance (mm). */
    nearest(x, z) {
      let best = null, bd = Infinity;
      for (const I of SUNDEW_ISLANDS) { const d = Math.hypot(I.x - x, I.z - z); if (d < bd) { bd = d; best = I; } }
      return { island: best, d: bd };
    },
    /**
     * Curl the tentacles of a leaf toward a target (real: minutes; here seconds).
     * A leaf's `grip` (0..1, set during a capture) folds every tentacle over the
     * target, and `close` (0..1) cups the blade round it; `shake` wobbles the blade.
     */
    update(dt) {
      for (const l of leaves) {
        const goal = l.target ? 1 : 0;
        const before = l.curl;
        l.curl += (goal - l.curl) * Math.min(1, dt * (goal ? 0.35 : 0.6));
        const active = Math.abs(l.curl - before) > 1e-5 || l.target || l.grip > 0;
        if (l.close !== l.closeW) {
          const c = l.close;
          l.blade.scale.set(l.r * (1 - 0.35 * c), l.r * (1 + 1.3 * c), l.r * (1 - 0.35 * c));
          l.closeW = c;
        }
        // a struggling springtail shakes the blade (radians of wobble)
        if (l.shake !== l.shakeW) { l.blade.rotation.z = l.rz0 + l.shake; l.blade.rotation.x = l.shake * 0.7; l.shakeW = l.shake; }
        if (!active) continue;
        let i = l.i0;
        for (const t of l.tent) {
          if (l.target) {
            want.subVectors(l.target, t.base);
            const d = want.length();
            want.normalize();
            let w = Math.min(1, l.curl * 1.4) * Math.max(0, 1 - d / (l.r * 2.3));
            if (l.grip > 0) w = Math.max(w, l.grip * Math.max(0.45, 1 - d / (l.r * 2.8)));
            t.dir.copy(t.dir0).lerp(want, w).normalize();
          } else t.dir.copy(t.dir0).lerp(t.dir, l.curl).normalize();
          write(l.patch, t, i++);
        }
        l.patch.tentIM.instanceMatrix.needsUpdate = true; l.patch.dropIM.instanceMatrix.needsUpdate = true;
      }
    },
    setTexture(t) { leafMat.uniforms.uLeafTex.value = t; leafMat.uniforms.uHasLeafTex.value = t ? 1 : 0; },
  };
}

// ---------------------------------------------------------------- bog pondweed
/**
 * The floating leaves of bog pondweed (PONDWEED): one instanced mesh per
 * portal's patch (culled as one by the views that cannot see it) and one for
 * the strays. A leaf is a leathery ellipse lying flat on the film, a little
 * domed, olive green flushed wine red toward the rim, with a pale midrib and
 * fine parallel veins converging on the tip; glossy (a waxy cuticle). MP-S06,
 * when delivered, is laid over it from above.
 */
function buildPondweed(group, leafTex) {
  const N = 30, pos = [0, 0.14, 0], idx = [];
  for (const [k, y] of [[0.55, 0.11], [1, 0.02]]) for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; pos.push(Math.cos(t) * k, y, Math.sin(t) * k); }
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    idx.push(0, 1 + j, 1 + i);
    idx.push(1 + i, 1 + j, 1 + N + i, 1 + j, 1 + N + j, 1 + N + i);
  }
  // the rim turned down to the film
  for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; pos.push(Math.cos(t) * 1.02, -0.04, Math.sin(t) * 1.02); }
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; idx.push(1 + N + i, 1 + N + j, 1 + 2 * N + i, 1 + N + j, 1 + 2 * N + j, 1 + 2 * N + i); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = litMaterial({
    uniforms: { uLeafTex: { value: leafTex }, uHasLeafTex: { value: leafTex ? 1 : 0 } },
    surface: `uniform sampler2D uLeafTex; uniform float uHasLeafTex;
    void surface(inout Surf s) {
      float ex = clamp(1.0 - vLocal.x * vLocal.x, 0.03, 1.0);
      float u = vLocal.z / sqrt(ex);
      float vein = smoothstep(0.8, 1.0, abs(sin(u * 10.0)));
      float mid = 1.0 - smoothstep(0.025, 0.07, abs(vLocal.z) / sqrt(ex));
      float rim = smoothstep(0.7, 1.0, length(vLocal.xz));
      vec3 c = vColor * (0.82 + 0.3 * mNoise(vLocal.xz * 6.0 + vColor.r * 40.0));
      c = mix(c, vec3(0.26, 0.045, 0.03), rim * 0.6);
      c = mix(c, c * 1.6 + vec3(0.05, 0.05, 0.01), mid * 0.65);
      c *= 1.0 - 0.2 * vein;
      if (uHasLeafTex > 0.5) { vec4 t = texture2D(uLeafTex, vec2(0.5 + vLocal.x * 0.5, 0.5 - vLocal.z * 0.5)); c = mix(c, t.rgb, 0.85 * t.a); }
      // wet and dark where it lies on the water
      c *= mix(0.45, 1.0, smoothstep(-0.02, 0.06, vLocal.y));
      s.N = normalize(s.N + vec3(0.0, 0.0, (vein - 0.5) * 0.06));
      s.albedo = c; s.rough = 0.24; s.f0 = 0.045; s.wrap = 0.4; s.trans = 0.55; s.sheen = 0.12; s.sheenCol = vColor;
    }`,
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), e = new THREE.Euler();
  const palette = [[0.12, 0.15, 0.025], [0.16, 0.13, 0.03], [0.2, 0.07, 0.03], [0.1, 0.13, 0.03], [0.18, 0.1, 0.03]];
  let seed = 5150;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const patches = new Map();
  for (const w of PONDWEED) { if (!patches.has(w.portal)) patches.set(w.portal, []); patches.get(w.portal).push(w); }
  const meshes = [];
  for (const [portal, list] of patches) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((w, i) => {
      q.setFromEuler(e.set((rnd() - 0.5) * 0.04, -w.a, (rnd() - 0.5) * 0.04));
      m4.compose(new THREE.Vector3(w.x, 0, w.z), q, new THREE.Vector3(w.L / 2, 1, w.W / 2));
      im.setMatrixAt(i, m4);
      const p = palette[Math.floor(rnd() * palette.length)];
      im.setColorAt(i, col.setRGB(p[0], p[1], p[2]).multiplyScalar(0.85 + rnd() * 0.3));
    });
    im.computeBoundingSphere();
    im.userData.portal = portal;
    group.add(im);
    meshes.push(im);
  }
  return {
    meshes, material: mat,
    setTexture(t) { mat.uniforms.uLeafTex.value = t; mat.uniforms.uHasLeafTex.value = t ? 1 : 0; },
  };
}

// ---------------------------------------------------------------- food on the film
export const FOOD_TYPES = [
  { name: 'pine pollen', color: [0.85, 0.62, 0.16], grains: 22, r: 0.055, spread: 0.32, stretch: 1.3 },
  { name: 'fungal spores', color: [0.3, 0.17, 0.07], grains: 26, r: 0.04, spread: 0.24, stretch: 1.0 },
  { name: 'green algae', color: [0.16, 0.42, 0.07], grains: 16, r: 0.04, spread: 0.36, stretch: 3.2 },
];

function buildFood(group, rnd) {
  const COUNT = 110;
  const maxGrains = COUNT * 26;
  const mat = litMaterial({ surface: `s.albedo = vColor * (0.8 + 0.4 * mNoise(vLocal.xy * 9.0)); s.rough = 0.5; s.wrap = 0.4; s.trans = 0.4; s.sheen = 0.2; s.sheenCol = vColor;` });
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, maxGrains);
  im.frustumCulled = false;
  im.count = 0;
  group.add(im);
  const clumps = [];
  let gi = 0;
  const place = (c) => {
    for (let tries = 0; tries < 80; tries++) {
      // half round the start, the rest out across the pool in every direction (to ~620 mm)
      const near = rnd() < 0.5;
      const a = rnd() * Math.PI * 2, d = near ? 3 + Math.sqrt(rnd()) * 38 : 40 + rnd() * (620 - 40);
      const x = START.x + Math.cos(a) * d, z = START.z + Math.sin(a) * d;
      if (poolE(x, z) < 0.9 && islandEdge(x, z).d > 1.5 && Math.hypot(x - START.x, z - START.z) > 2.5) { c.x = x; c.z = z; return; }
    }
  };
  for (let i = 0; i < COUNT; i++) {
    const type = FOOD_TYPES[i % FOOD_TYPES.length];
    const c = { type, x: 0, z: 0, vx: 0, vz: 0, bites: 3, grains: [], spin: rnd() * 6.28 };
    place(c);
    for (let k = 0; k < type.grains; k++) {
      const a = rnd() * 6.28, r = Math.sqrt(rnd()) * type.spread;
      c.grains.push({ i: gi++, ox: Math.cos(a) * r, oz: Math.sin(a) * r, r: type.r * (0.75 + rnd() * 0.5), rot: rnd() * 6.28, tilt: (rnd() - 0.5) * 0.6 });
    }
    clumps.push(c);
  }
  const col = new THREE.Color();
  for (const c of clumps) for (const g of c.grains) g.col = col.setRGB(...c.type.color).multiplyScalar(0.8 + rnd() * 0.4).clone();
  im.setColorAt(0, col); // allocate the colour buffer
  const owner = new Array(maxGrains).fill(null);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    clumps, im,
    respawn(c) { place(c); c.bites = 3; c.chew = 0; c.vx = c.vz = 0; },
    /**
     * Float the grains on the film; hide eaten ones. Only clumps within
     * `range` mm of one of `near` ([{x, z}]: the players and the views) are
     * drawn: a grain is ~0.1 mm, under a pixel farther out. They are packed
     * into the first instances, so far food costs neither CPU nor GPU.
     */
    update(heightAt, near = null, range = 80) {
      let n = 0, recolour = false;
      for (const c of clumps) {
        if (c.respawnT > 0 || c.bites <= 0) continue;
        if (near && !near.some((p) => Math.abs(p.x - c.x) < range && Math.abs(p.z - c.z) < range)) continue;
        // a bite being eaten (c.chew 0..1) shrinks the clump's last grains away
        const shown = (c.grains.length * Math.max(0, c.bites - (c.chew || 0))) / 3;
        for (let k = 0; k < c.grains.length; k++) {
          const g = c.grains[k];
          const on = Math.max(0, Math.min(1, shown - k));
          if (on <= 0) continue;
          const x = c.x + g.ox, z = c.z + g.oz;
          v.set(x, heightAt(x, z) + g.r * 0.45, z);
          e.set(g.tilt, g.rot + c.spin, 0);
          q.setFromEuler(e);
          s.set(g.r * c.type.stretch * on, g.r * on, g.r * on);
          m4.compose(v, q, s);
          im.setMatrixAt(n, m4);
          if (owner[n] !== g) { owner[n] = g; im.setColorAt(n, g.col); recolour = true; }
          n++;
        }
      }
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
      if (recolour) im.instanceColor.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- floating debris
// Rafts you can stand on: dead Sphagnum leaves (pale, boat-shaped), flakes of
// birch bark (white with dark lenticels), pine needles and a heather twig.
export const DEBRIS_TYPES = [
  { name: 'dead Sphagnum leaf', color: [0.62, 0.52, 0.3], L: 1.9, W: 0.7, T: 0.12, n: 40 },
  { name: 'birch bark flake', color: [0.6, 0.55, 0.47], L: 3.4, W: 2.2, T: 0.16, n: 24 },
  { name: 'pine needle', color: [0.42, 0.26, 0.1], L: 7.5, W: 0.32, T: 0.2, n: 20 },
  { name: 'heather twig', color: [0.28, 0.16, 0.09], L: 6, W: 0.42, T: 0.3, n: 14 },
];
function buildDebris(group, rnd) {
  const mat = litMaterial({ surface: `
    float n = mNoise(vLocal.xz * vec2(3.0, 9.0));
    float len = smoothstep(0.75, 0.95, mNoise(vLocal.xz * vec2(2.0, 26.0) + 3.0));
    s.albedo = vColor * (0.55 + 0.35 * n) * (1.0 - 0.6 * len * step(0.55, vColor.r));
    // wet underside, dry pale top: the raft reads as lying on the water
    s.albedo *= mix(0.45, 1.0, smoothstep(-0.3, 0.6, vLocal.y));
    s.rough = 0.55; s.wrap = 0.35; s.trans = 0.35; s.sheen = 0.15; s.sheenCol = vColor;` });
  const geo = new THREE.SphereGeometry(1, 18, 8);
  { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y > 0 ? y : y * 0.5); } geo.computeVertexNormals(); }
  const pieces = [];
  for (const type of DEBRIS_TYPES) for (let k = 0; k < type.n; k++) {
    const d = { type, x: 0, z: 0, a: rnd() * Math.PI, vx: 0, vz: 0, va: (rnd() - 0.5) * 0.04, y: 0, top: 0, L: type.L * (0.8 + rnd() * 0.4), W: type.W * (0.8 + rnd() * 0.4), T: type.T, i: pieces.length };
    for (let t = 0; t < 80; t++) {
      const near = rnd() < 0.5;
      const x = near ? START.x + (rnd() - 0.5) * 80 : (rnd() - 0.5) * 2 * POOL.a, z = (rnd() - 0.5) * (near ? 60 : 2 * POOL.b);
      if (poolE(x, z) < 0.92 && islandEdge(x, z).d > d.L && Math.hypot(x - START.x, z - START.z) > 4) { d.x = x; d.z = z; break; }
    }
    pieces.push(d);
  }
  const im = new THREE.InstancedMesh(geo, mat, pieces.length);
  im.frustumCulled = false;
  const col = new THREE.Color();
  pieces.forEach((d) => im.setColorAt(d.i, col.setRGB(...d.type.color).multiplyScalar(0.85 + rnd() * 0.3)));
  group.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  /** Local frame offset of (x, z) from a piece, normalised: < 1 inside it. */
  const inside = (d, x, z) => {
    const dx = x - d.x, dz = z - d.z, c = Math.cos(d.a), s = Math.sin(d.a);
    const u = dx * c + dz * s, w = -dx * s + dz * c;
    return Math.hypot(u / (d.L / 2), w / (d.W / 2));
  };
  return {
    pieces, im,
    /** The piece under (x, z), if any (with a small margin so a landing on its rim holds). */
    at(x, z) { for (const d of pieces) if (inside(d, x, z) < 1.05) return d; return null; },
    /** Drift on the surface flow; ride the ripples. */
    update(dt, field, inPool) {
      for (const d of pieces) {
        const fl = field.flow(d.x, d.z);
        d.vx += (fl[0] * 1.5 - d.vx) * dt * 1.5; d.vz += (fl[1] * 1.5 - d.vz) * dt * 1.5;
        const nx = d.x + d.vx * dt, nz = d.z + d.vz * dt;
        if (inPool(nx, nz) && poolE(nx, nz) < 0.95 && islandEdge(nx, nz).d > d.L * 0.5) { d.x = nx; d.z = nz; } else { d.vx *= -0.5; d.vz *= -0.5; }
        d.a += d.va * dt;
        d.y = field.height(d.x, d.z);
        d.top = d.y + d.T * 0.6;
        v.set(d.x, d.y + d.T * 0.1, d.z);
        e.set(0, -d.a, 0);
        q.setFromEuler(e);
        sc.set(d.L / 2, d.T, d.W / 2);
        m4.compose(v, q, sc);
        im.setMatrixAt(d.i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    },
    /** Menisci climbing each piece's rim (a negative dimple: the film rises to it). */
    contacts(near, out) {
      for (const d of pieces) {
        if (Math.hypot(d.x - near.x, d.z - near.z) > 34) continue;
        const c = Math.cos(d.a), s = Math.sin(d.a);
        const n = Math.max(1, Math.round(d.L / d.W / 1.6));
        for (let k = 0; k < n; k++) {
          const u = n === 1 ? 0 : (k / (n - 1) - 0.5) * (d.L - d.W);
          out(d.x + c * u, d.z + s * u, d.W * 0.36, -0.05);
        }
      }
    },
  };
}
