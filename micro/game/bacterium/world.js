// The scene: a drop of bog-pond water under a coverslip, over sediment and biofilm, seen
// at 1000×. Food comes in patches; a peritrich grazer draws a feeding current; an
// amoeba's edge creeps; phages drift; other bacteria run and tumble or sit in the biofilm.
// Units: µm and seconds. +y is up the screen; −y toward the sediment bank.

// The drop (the owner, 2026-11-03: "It should not be an invisible wall, either there should be
// no border, or the border should be visibly something ... like the edge of a water droplet in a
// slide including some visual light bending as you approach the very edge"): the world is a round
// drop DROP.R across round the start; its edge is the meniscus, drawn by the optics (a darkening,
// a bright refracted line, the background bent near it: bacterium-fluorescence.js), and anything
// swimming at it is slowed to a stop by surface tension (rimMove), never stopped dead. The only
// other barrier is the sediment bank along the bottom (the biofilm slab): visible, and its EPS
// thickens until a cell can go no deeper (filmK).
//
// The way (the owner: "a progressive path to the final portal ... specific enemies that block your
// way"): a route laid out from the start along ROUTE_BEARING (DEFAULT_PATH), the meadow of kin
// round the start, then a gate (an enemy your swarm must drill through: the peritrich, the
// Bdellovibrio pack, the amoeba), a colony of kin and food behind it, the next gate, and so on,
// to the host cell guarded by Stentor. The edge of the drop is more than twice as far out as the
// host in every direction. Toward the host the sediment thickens (more clay grains and
// microcolonies) and the host's signal shows as a haze (the optics' uHost).
// Placed as you go (design/encounter-pattern.md; shared/director.js; main.js `director`): the
// gates are pre-placed on the route from the first frame, and placed ahead of whoever leads if
// they leave it. Until placed, every gate is parked far off (PARK) and invisible.
// What a player has seen never changes. Scenery (clay grains, their microcolonies, matrix
// strands, the sediment bank) is laid out once over the whole drop and never moves (except the
// water cleared round the host, where nobody has looked). The ambient specks, phages and
// bacteria live in a window round the players (recycled out of view); kin and prey are kept
// near every player (collective.js, main.js keepAmbient).

/** The drop under the coverslip: centre, radius, and the band at its edge where surface tension slows you. */
export const DROP = { x: 0, y: 0, R: 4300, soft: 30 };
export const WORLD = { x0: -DROP.R, x1: DROP.R, y0: -DROP.R, y1: DROP.R, slabY: -548 };
export const START = { x: 0, y: 0 };
/** Where a gate waits before the director places it: far off the field (drawn nowhere, acting on nothing). */
export const PARK = { x: 1e6, y: 0 };

/** The route: from the start along ROUTE_BEARING (right and a little up, away from the Paramecium and the sediment). */
export const ROUTE_BEARING = 0.25;
const RUX = Math.cos(ROUTE_BEARING), RUY = Math.sin(ROUTE_BEARING);
/** A point `d` µm along the route from the start, `lat` µm to its left. */
export const routePoint = (d, lat = 0) => ({ x: START.x + RUX * d - RUY * lat, y: START.y + RUY * d + RUX * lat });
/** How far along the route (x, y) is, and how far to its left. */
export const routeAlong = (x, y) => ({ d: (x - START.x) * RUX + (y - START.y) * RUY, lat: -(x - START.x) * RUY + (y - START.y) * RUX });
/** The beats along the route, µm from the start: the gates, the colonies behind them, the host. */
export const BEATS = { grazer1: 400, colony1: 680, bdello: 980, colony2: 1260, amoeba: 1560, colony3: 1830, host: 2100 };
/** The host on the route (the gradient toward the host: denser sediment, its haze). */
export const HOST0 = routePoint(BEATS.host);

/** The meadow round the start (where kin and prey begin), and the gates in the director's order. */
export const ROUTE = {
  meadow: 60,
  gates: [
    { id: 'grazer1', name: 'Peritrich' },
    { id: 'bdello', name: 'Bdellovibrio pack', r: 26 },
    { id: 'amoeba', name: 'Amoeba' },
  ],
};
/**
 * The kin colonies along the route (the owner: "allow the group to keep growing and growing"): a
 * microcolony of your own species round a big clay grain, with food (a patch and prey rods), behind
 * each gate, each bigger than the last, so the swarm can grow fast. kin: free kin cells; prey: rods.
 */
export const COLONIES = [
  { id: 'colony1', ...routePoint(BEATS.colony1, 34), r: 46, kin: 90, prey: 26 },
  { id: 'colony2', ...routePoint(BEATS.colony2, -40), r: 60, kin: 180, prey: 34 },
  { id: 'colony3', ...routePoint(BEATS.colony3, 38), r: 78, kin: 320, prey: 40 },
];
/** The host (the way on) before it is placed: parked; moved by setPortal. */
export const LANDMARK = { x: PARK.x, y: PARK.y };
export const distFromStart = (x, y) => Math.hypot(x - START.x, y - START.y);
export const bearingFromStart = (x, y) => Math.atan2(y - START.y, x - START.x);
export const ringPoint = (r, a) => ({ x: START.x + Math.cos(a) * r, y: START.y + Math.sin(a) * r });
/** The Paramecium (the backdoor, the way back) and the water round it, kept clear of encounters. */
export const BACKDOOR = { x: -166, y: 116, r: 38 };

/** How far inside the drop's edge (x, y) is (negative: beyond it, under the coverslip's air). */
export const rimDist = (x, y) => DROP.R - Math.hypot(x - DROP.x, y - DROP.y);
/**
 * Surface tension at the drop's edge: o has just moved from (px, py). Within DROP.soft of the edge
 * the outward part of the move is scaled down, to nothing at the edge itself, so a cell pushing at
 * the meniscus eases to a stop against it (and slides along it) instead of hitting a wall. Returns
 * true when it acted.
 */
export function rimMove(o, px, py) {
  const dx = o.x - DROP.x, dy = o.y - DROP.y, r2 = dx * dx + dy * dy, Rin = DROP.R - DROP.soft;
  if (r2 < Rin * Rin) return false;
  const qx = px - DROP.x, qy = py - DROP.y, rp = Math.sqrt(qx * qx + qy * qy) || 1;
  const nx = qx / rp, ny = qy / rp, mx = o.x - px, my = o.y - py, out = mx * nx + my * ny;
  if (out > 0) {
    const k = Math.max(0, Math.min(1, (DROP.R - 1 - rp) / DROP.soft));
    const cut = out * (1 - k * k * (3 - 2 * k));
    o.x -= nx * cut; o.y -= ny * cut;
  }
  const r = Math.hypot(o.x - DROP.x, o.y - DROP.y), Rmax = DROP.R - 1;
  if (r > Rmax) { o.x = DROP.x + ((o.x - DROP.x) / r) * Rmax; o.y = DROP.y + ((o.y - DROP.y) / r) * Rmax; }
  return true;
}

// ---- the director (shared/director.js): its settings and the encounters in order ----
// main.js adds place and met; route.test.mjs runs them without a browser. Units µm; the
// director's ground plane is the field (its z is our y). The default field is 45 µm tall
// (about 80 across), wider as the swarm grows (main.js autoField); the flock cruises at ~45 µm/s.
//   size     clearance (the gate's zone, where the army fights it)
//   parts    what can be seen of it when placed: unseen water, out of every view
//   min/maxAhead  how far ahead of the leader it goes; min/maxNear when they linger
//   need     the swarm that beats it in a fair fight (README "The way"): while the leader's army is
//            smaller, the calm break before it lasts longer (main.js) and kin are kept closer
export const GRAZER_FOOT = 64; // the stalk's foot (and its clay grain) is this far beyond the bell
const u2 = (b) => [Math.cos(b), Math.sin(b), -Math.sin(b), Math.cos(b)]; // (ux, uy) along b, (px, py) across
/** Stentor and the host, as the director sees them: the host at (x, y), met along bearing b (stentor.js place). */
export function portalParts(x, y, b) {
  const [ux, uy, px, py] = u2(b);
  return [
    [x, y, 95], // the host and the water cleared round it (main.js placePortal moves grains and film off)
    [x + ux * 122 + px * 20, y + uy * 122 + py * 20, 128], // Stentor's oral disc and membranelles
    [x + ux * 78 - px * 35, y + uy * 78 - py * 35, 45], // its body
    [x + ux * 34 - px * 100, y + uy * 34 - py * 100, 26], // its foot on a clay grain
  ];
}
export function grazerParts(x, y, b) {
  const [ux, uy] = u2(b);
  // the bell and its current (specks pour into the funnel from ~45 µm), the stalk, the foot's grain
  return [[x, y, 46], [x + ux * GRAZER_FOOT * 0.55, y + uy * GRAZER_FOOT * 0.55, 12], [x + ux * GRAZER_FOOT, y + uy * GRAZER_FOOT, 14]];
}
export const AMOEBA = { width: 190, depth: 46 };
export function amoebaParts(x, y, b) {
  // its edge runs across the way (along b + π/2), its body beyond it
  const [ux, uy, px, py] = u2(b), out = [];
  for (let k = -2; k <= 2; k++) out.push([x + px * k * 42 + ux * 22, y + py * k * 42 + uy * 22, 44]);
  return out;
}
/** Is (x, y) in open water inside the drop, `m` µm clear of its edge (and the soft band), the sediment bank and the backdoor? */
export function inWater(x, y, m = 0) {
  return rimDist(x, y) > DROP.soft + 20 + m && y > WORLD.slabY + 30 + m;
}
const allIn = (parts, m = 0) => parts.every(([x, y]) => inWater(x, y, m));
export const DIRECTOR = {
  cell: 20, seenDist: 200, nearSeen: 14, seed: 23,
  bounds: { x0: WORLD.x0, x1: WORLD.x1, z0: WORLD.slabY, z1: WORLD.y1 },
  // ~5 s of moving to warm up (the meadow: call your first kin); a calm break of ~4 s of moving clear of
  // each gate (longer while the army is short of the next gate's need: main.js armyHold, but never once
  // the leader is FAR_OUT from the start, so the host still comes long before the drop's edge)
  warmup: { sec: 5 }, calm: { sec: 4 }, linger: 6, moveSpeed: 6,
  // "ahead" is the way they have gone over the last 1.5 s, and a spot to the side counts more against it
  headingSec: 1.5, aheadBias: 2,
  // seen but not gone to: met once everyone is ~200 µm off for 1.5 s, or after 12 s in sight nearby
  passDist: 200, watchSec: 12,
};
/** Beyond this far from the start the breaks are cut short (main.js, route.test.mjs): off the route the host still comes well inside the drop. */
export const FAR_OUT = 1900;
export const ENCOUNTERS = [
  { id: 'grazer1', need: 14, size: 70, minAhead: 90, maxAhead: 160, minNear: 80, maxNear: 140,
    parts: (x, y, b) => grazerParts(x, y, b), fits: (x, y, b) => allIn(grazerParts(x, y, b)) },
  { id: 'bdello', need: 50, size: 70, visible: 50, minAhead: 90, maxAhead: 160, minNear: 80, maxNear: 140, fits: (x, y) => inWater(x, y, 30) },
  { id: 'amoeba', need: 150, size: 110, minAhead: 120, maxAhead: 200, minNear: 100, maxNear: 170,
    parts: (x, y, b) => amoebaParts(x, y, b), fits: (x, y, b) => allIn(amoebaParts(x, y, b)) },
  // the boss and the way on: the host cell and Stentor beyond it (its oral disc ~250 µm across)
  { id: 'portal', need: 300, size: 140, minAhead: 140, maxAhead: 240, minNear: 110, maxNear: 220, final: true,
    parts: (x, y, b) => portalParts(x, y, b), fits: (x, y, b) => inWater(x, y, 20) && allIn(portalParts(x, y, b).slice(1), -10) },
];
/**
 * The default path (shared/director.js `defaultPath`; the owner, 2026-11-01: "a default path to a
 * portal", and 2026-11-03: "make this world feel better by making a progressive path to the final
 * portal"): every gate and the host with Stentor laid out along the route on the first frame, each as
 * near the line as fits (`lateral`), at BEATS. Walk the route and you meet them in order, a colony of
 * kin behind each; go another way and, while nobody has seen it, the next one leaves the route and is
 * placed ahead of you (one thing each: `single`).
 */
export const DEFAULT_PATH = {
  from: { x: START.x, z: START.y }, bearing: ROUTE_BEARING,
  dists: [BEATS.grazer1, BEATS.bdello, BEATS.amoeba, BEATS.host],
  lateral: [0, 20, -20, 45, -45, 80, -80], cone: 0.45,
};
/** Encounters go in open water, clear of the backdoor (the Paramecium and the water round it) and of the colonies. */
export const canPlace = (x, y, r) => inWater(x, y) && Math.hypot(x - BACKDOOR.x, y - BACKDOOR.y) > BACKDOOR.r + 90 + r * 0.5
  && COLONIES.every((c) => Math.hypot(x - c.x, y - c.y) > c.r + r * 0.6 + 20);
/** How far along the way (kept for the stats line): 1 at the host. */
export function progress(x, y) { return Math.max(0, routeAlong(x, y).d) / BEATS.host; }
/** (Kept for old callers.) */
export const HALF_X = 250;

// Oxygen in % of air saturation: falls roughly exponentially from the water's top layer
// (OXY_TOP, above the start) and is used up by the biofilm, reaching zero just above it.
// Scenery and the cells' senses only (no meter: the owner's call).
const OXY_TOP = 560;
export function oxygen(y) {
  return Math.min(100, Math.max(0, 100 * Math.exp((y - OXY_TOP) / 38) - 1));
}
export function oxygenY(pct) { return OXY_TOP + 38 * Math.log((pct + 1) / 100); }

/**
 * 2.5D (the owner, 2026-11-03: "like controlling a flock in a 3d world but just moving through it on a
 * 2d path"): steering stays on the slide, but every cell that moves has a height hz (µm above the
 * sediment) in a thin water layer, LAYER.top deep: it wanders in height on its own random walk round
 * LAYER.mid, and rides up and over a clay grain (a dome LAYER-capped at the grain's thickness `cap`)
 * instead of being pushed round it, settling back after. Contact uses 3D distance with LAYER.tol of
 * slack (zGap), so play stays readable. The heights draw their own random stream (rng(909)), so the
 * world's other randomness is unchanged.
 */
export const LAYER = { top: 8, lo: 0.4, hi: 5, mid: 2, walk: 0.7, settle: 1.0, tol: 3 };
/** The height difference beyond the slack LAYER.tol (0 within it): add it to a 2D distance for contact in 3D. */
export const zGap = (a, b) => { const d = Math.abs((a || 0) - (b || 0)) - LAYER.tol; return d > 0 ? d : 0; };

// Seeded random numbers so the scene is the same each visit.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Distance from point (px, py) to a segment centred at (x, y), angle a, length L. Returns [dist, s along]. */
export function segDist(px, py, x, y, a, L) {
  const c = Math.cos(a), s = Math.sin(a);
  const dx = px - x, dy = py - y;
  const u = Math.max(-L / 2, Math.min(L / 2, dx * c + dy * s));
  const qx = x + c * u - px, qy = y + s * u - py;
  return [Math.hypot(qx, qy), u];
}

// Matching the GLSL edge functions in bacterium-shapes.js.
const slabEdge = (x, amp, seed) => amp * (0.6 * Math.sin(0.04 * x + seed) + 0.4 * Math.sin(0.11 * x + 2 * seed));
const amoebaEdge = (x, amp, seed, t) => amp * (0.6 * Math.sin(0.07 * x + seed + 0.2 * t) + 0.4 * Math.sin(0.17 * x + 2 * seed - 0.13 * t));

// E. coli tumble angle: mean about 68° (Berg & Brown 1972), either way.
export function tumbleAngle(r) {
  const a = Math.max(0.15, Math.min(Math.PI, (68 + 36 * gauss(r)) * Math.PI / 180));
  return r() < 0.5 ? -a : a;
}

/**
 * A spatial grid of buckets over the drop (perf: the drop is ~40× the old field, so the scenery is
 * found by where it is, not by scanning all of it). add(o, r): o goes into every bucket its disc of
 * radius r touches (r 0: one bucket). at(x, y): the bucket there. each(x0, y0, x1, y1, fn): every
 * object in the buckets over that box, once each.
 */
function createBuckets(cell) {
  const x0 = WORLD.x0 - cell, y0 = WORLD.y0 - cell;
  const nx = Math.ceil((WORLD.x1 - x0) / cell) + 2, ny = Math.ceil((WORLD.y1 - y0) / cell) + 2;
  const cells = new Array(nx * ny);
  const EMPTY = [];
  const ix = (x) => Math.max(0, Math.min(nx - 1, Math.floor((x - x0) / cell)));
  const iy = (y) => Math.max(0, Math.min(ny - 1, Math.floor((y - y0) / cell)));
  let stamp = 1;
  function add(o, r = 0) {
    o._k = [];
    for (let j = iy(o.y - r); j <= iy(o.y + r); j++) for (let i = ix(o.x - r); i <= ix(o.x + r); i++) { const k = i + nx * j; (cells[k] || (cells[k] = [])).push(o); o._k.push(k); }
    o._r = r;
  }
  function remove(o) { if (!o._k) return; for (const k of o._k) { const a = cells[k], i = a ? a.indexOf(o) : -1; if (i >= 0) a.splice(i, 1); } o._k = null; }
  function move(o, x, y) { const r = o._r || 0; remove(o); o.x = x; o.y = y; add(o, r); }
  function at(x, y) { return cells[ix(x) + nx * iy(y)] || EMPTY; }
  function each(bx0, by0, bx1, by1, fn) {
    const s = ++stamp;
    for (let j = iy(by0); j <= iy(by1); j++) for (let i = ix(bx0); i <= ix(bx1); i++) {
      const a = cells[i + nx * j];
      if (a) for (let n = 0; n < a.length; n++) { const o = a[n]; if (o._s !== s) { o._s = s; fn(o); } }
    }
  }
  return { add, remove, move, at, each };
}

export function createWorld() {
  const r = rng(51);
  const W = WORLD;
  const opts = { grazers: true, phages: true, hunters: true, amoeba: true, npcRun: true, brownian: true, field: 20 };
  // which predators are hungry right now (main.js runs their hunger: shared/predation.js)
  const hunt = { phage: false, bdello: true, amoeba: true };
  const slab = { amp: 4, seed: 1.3 };
  const surfaceY = (x) => W.slabY + slabEdge(x, slab.amp, slab.seed);
  // the players' whereabouts and what the views show (main.js sets world.watch each step; tests may not)
  const watch = { players: [{ x: START.x, y: START.y }], inView: null };

  // --- the scenery, laid out once over the drop in 100 µm tiles (each its own seeded stream) ---
  // Sediment grains (clay and silt, bigger than any bacterium), their microcolonies (attached rods and
  // cocci), matrix (EPS) strands; denser toward the host on the route (the gradient: hostK).
  const grainB = createBuckets(40), filmB = createBuckets(50), epsB = createBuckets(60);
  const grains = [], film = [], eps = [];
  /** 1 far off, up to 2.8 at the host: the sediment thickens toward it. */
  const hostK = (x, y) => 1 + 1.8 * Math.exp(-Math.hypot(x - HOST0.x, y - HOST0.y) / 420);
  const TILE = 100;
  const addGrain = (g) => { grains.push(g); grainB.add(g, g.r * 0.92 + 3); return g; };
  const addFilm = (c) => { film.push(c); filmB.add(c, 0); return c; };
  const makeFilm = (rr, x, y) => { const coccus = rr() < 0.3; return { kind: coccus ? 'coccus' : 'rod', x, y, a: rr() * 6.28, L: coccus ? 0 : 1.4 + rr() * 1.6, r: coccus ? 0.45 + rr() * 0.15 : 0.32 + rr() * 0.1, z: (rr() - 0.5) * 1.6, gramNeg: !coccus, bdelloplast: 0, ghost: false, prey: !coccus }; };
  function microcolony(rr, G, n) {
    for (let i = 0; i < n; i++) { const a = rr() * 6.283, d = G.r * 0.92 + 0.4 + Math.pow(rr(), 1.6) * 3.5; addFilm(makeFilm(rr, G.x + Math.cos(a) * d, G.y + Math.sin(a) * d)); }
    const ne = 2 + Math.floor(rr() * 3);
    for (let i = 0; i < ne; i++) { const a = rr() * 6.283, x = G.x + Math.cos(a) * (G.r + 1 + rr() * 4), y = G.y + Math.sin(a) * (G.r + 1 + rr() * 4); const e = { x, y, a: (rr() - 0.5) * 2.2, L: 8 + rr() * 22, amp: 0.4 + rr() * 1.2, wl: 6 + rr() * 10, ph: rr() * 6, z: (rr() - 0.5) * 1.2 }; eps.push(e); epsB.add(e, 0); }
  }
  const nT = Math.ceil(DROP.R / TILE);
  for (let tj = -nT; tj < nT; tj++) for (let ti = -nT; ti < nT; ti++) {
    const cx = DROP.x + (ti + 0.5) * TILE, cy = DROP.y + (tj + 0.5) * TILE;
    if (rimDist(cx, cy) < -TILE || cy < W.slabY - TILE) continue;
    const rr = rng(0x9e3779b1 ^ ((ti + 97) * 7919 + (tj + 97) * 104729));
    const k = hostK(cx, cy);
    // ~0.72 grains per tile far off (the old field's density), more toward the host; ~45 % big
    const lam = 0.72 * k;
    let n = Math.floor(lam); if (rr() < lam - n) n++;
    for (let i = 0; i < n; i++) {
      const x = cx + (rr() - 0.5) * TILE, y = cy + (rr() - 0.5) * TILE;
      if (rimDist(x, y) < 25 || y < W.slabY + 6 || distFromStart(x, y) < 30) continue;
      const big = rr() < 0.45 / k; // (toward the host: more grains, mostly small silt, and more microcolonies on the big ones)
      const rad = big ? 6 + rr() * 10 : 1.6 + rr() * 3;
      const G = addGrain({ x, y, r: rad, wob: 0.18 + rr() * 0.12, seed: rr() * 50, cap: big ? 7 : 2.5, ang: rr() * 6.28, z: big ? -0.5 + rr() : (rr() - 0.5) * 2.4 });
      if (big) microcolony(rr, G, Math.round(12 + 14 * (k - 1)));
    }
    // attached cells along the sediment bank
    if (Math.abs(cy - W.slabY) < TILE) for (let i = 0; i < 14; i++) { const x = cx + (rr() - 0.5) * TILE; addFilm(makeFilm(rr, x, surfaceY(x) - 0.8 - Math.pow(rr(), 1.6) * 26)); }
  }
  // each kin colony grows round a big clay grain (its microcolony: the colony's landmark)
  {
    const rr = rng(4242);
    for (const C of COLONIES) {
      for (const g of grains) if (Math.hypot(g.x - C.x, g.y - C.y) < C.r * 0.8 + g.r) grainB.move(g, g.x + (g.x - C.x >= 0 ? 1 : -1) * (C.r + 30), g.y); // (its middle cleared first)
      const G = addGrain({ x: C.x, y: C.y, r: 13, wob: 0.24, seed: rr() * 50, cap: 7, ang: rr() * 6.28, z: -0.3 });
      microcolony(rr, G, 40);
      C.grain = G;
    }
  }
  // small clay specks and colloids: Brownian; kept in a window round the players (recycled out of view)
  const WIN = 460;
  const near = (x, y, d) => watch.players.some((p) => Math.abs(p.x - x) < d && Math.abs(p.y - y) < d);
  /** A spot in the window round a player (between 140 and WIN µm off), in the water, out of every view. */
  function windowSpot(minD = 140) {
    const ps = watch.players;
    for (let k = 0; k < 12; k++) {
      const p = ps[Math.floor(r() * ps.length)] || START, a = r() * 6.283, d = minD + r() * (WIN - minD);
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (!inWater(x, y, -40) || (watch.inView && watch.inView(x, y, 6))) continue;
      return { x, y };
    }
    return null;
  }
  const startWindow = () => { for (let k = 0; k < 20; k++) { const x = START.x + (r() - 0.5) * 2 * WIN, y = START.y + (r() - 0.5) * 2 * WIN; if (inWater(x, y, -40)) return { x, y }; } return { x: START.x, y: START.y + 40 }; };
  const specks = [];
  for (let i = 0; i < 640; i++) { const q = startWindow(); specks.push({ x: q.x, y: q.y, r: 0.12 + r() * 0.3, z: (r() - 0.5) * 2.5, seed: r() * 9 }); }

  /** A spot in the meadow round the start (where prey and kin begin), or round colony C. */
  function preySpot(C = null) {
    if (C) { const a = r() * 6.283, d = 16 + Math.sqrt(r()) * (C.r - 10); return { x: C.x + Math.cos(a) * d, y: C.y + Math.sin(a) * d, zone: 0 }; }
    const p = ringPoint(14 + Math.sqrt(r()) * (ROUTE.meadow - 14), r() * 6.283);
    p.zone = 0;
    return p;
  }
  /** A spot along the route (the ambient kin's homes at the start): within 150 µm of it, from the start to the host. */
  function routeSpot() {
    for (let k = 0; k < 10; k++) { const p = routePoint(80 + r() * (BEATS.host - 80), (r() - 0.5) * 300); if (inWater(p.x, p.y, 10)) return p; }
    return routePoint(200, 0);
  }
  // --- free bacteria in the water ---
  const cells = [];
  const addCell = (kind, x, y) => {
    const c = { kind, x, y, a: r() * 6.28, z: (r() - 0.5) * 0.9, run: r() * 1.5, tumble: 0, stopped: 0, bdelloplast: 0, ghost: false, sense: r() < 0.5 ? 1 : -1, attachedBy: null, flPhase: r() * 6 };
    if (kind === 'rod') Object.assign(c, { L: 1.8 + r() * 0.9, r: 0.42, v: 18 + r() * 10, motile: r() < 0.65, gramNeg: true, prey: true });
    if (kind === 'coccus') Object.assign(c, { L: 0, r: 0.5, v: 0, motile: false, gramNeg: false });
    if (kind === 'chain') Object.assign(c, { L: 0, r: 0.42, n: 4 + Math.floor(r() * 6), bend: (r() - 0.5) * 0.25, v: 0, motile: false, gramNeg: false });
    if (kind === 'mtb') Object.assign(c, { L: 2.6 + r() * 0.8, r: 0.27, v: 35 + r() * 15, motile: true, gramNeg: true, prey: true, amp: 0.3, wl: 1.6 });
    if (kind === 'bdello') Object.assign(c, { L: 1.0, r: 0.19, v: 75, motile: true, gramNeg: true, curve: 0.7, hunter: true, cooldown: 0 });
    cells.push(c);
    return c;
  };
  const anywhere = () => windowSpot(0) || startWindow();
  // ambient life (rods, cocci, chains): in the window round the players, recycled out of view (amb)
  for (let i = 0; i < 160; i++) { const q = startWindow(); addCell('rod', q.x, q.y).amb = true; }
  for (let i = 0; i < 120; i++) { const q = startWindow(); addCell('coccus', q.x, q.y).amb = true; }
  for (let i = 0; i < 45; i++) { const q = startWindow(); addCell('chain', q.x, q.y).amb = true; }
  // prey for the army (X lyses rods in reach): plentiful in the meadow and in every colony; the rest are
  // ambient, kept near every player in water they haven't seen (main.js keepAmbient). Lysed, a rod is parked.
  for (let i = 0; i < 60; i++) { const q = preySpot(); addCell('rod', q.x, q.y).zone = 0; }
  for (const C of COLONIES) for (let i = 0; i < C.prey; i++) { const q = preySpot(C); const c = addCell('rod', q.x, q.y); c.zone = 0; c.colony = C.id; }
  for (let i = 0; i < 160; i++) { const c = addCell('rod', PARK.x, PARK.y); c.zone = 1; c.parked = true; }
  // the Bdellovibrio pack: predators that keep to their gate (guards.js; parked until the director places it)
  const pack = ROUTE.gates[1];
  for (let i = 0; i < 16; i++) { const c = addCell('bdello', PARK.x, PARK.y); c.home = { x: PARK.x, y: PARK.y, r: pack.r }; c.hp = 1; c.parked = true; }

  // the stranger strain: other magnetotactic cells (collective.js WAYLAY: they waylay your army's
  // members), parked until main.js keepAmbient brings a couple in near each player, where nobody has
  // looked. Never recruitable, and drawn so they read apart from your kin: longer and thinner, a
  // tighter helix and a faint amber tint (draw.js). Their own random stream.
  {
    const rs = rng(733);
    for (let i = 0; i < 8; i++) {
      cells.push({ kind: 'mtb', stranger: true, x: PARK.x, y: PARK.y, a: rs() * 6.28, z: (rs() - 0.5) * 0.9, run: rs() * 1.5, tumble: 0, stopped: 0, bdelloplast: 0, ghost: false, sense: rs() < 0.5 ? 1 : -1, attachedBy: null, flPhase: rs() * 6,
        L: 3.6 + rs() * 0.6, r: 0.22, v: 35 + rs() * 15, motile: true, gramNeg: true, prey: false, amp: 0.36, wl: 1.05, parked: true, zone: 1 });
    }
  }

  // --- food patches: dissolved organic matter round decaying detritus or a lysed cell ---
  const patches = [];
  const addPatch = (x, y, lysis = false) => {
    const p = { x, y, r: 10 + r() * 9, amt: 0.8 + r() * 0.4, flake: { a: r() * 6.28, seed: r() * 40, r: 1.2 + r() * 1.8 }, lysis };
    patches.push(p);
    if (lysis) for (let i = 0; i < 35; i++) phages.push(newPhage(x + gauss(r) * 5, y + gauss(r) * 5));
    return p;
  };

  // --- phages (ambient: in the window round the players) ---
  const phages = [];
  function newPhage(x, y) { return { x, y, z: (r() - 0.5) * 1.6, stuck: null }; }
  for (let i = 0; i < 300; i++) { const q = startWindow(); phages.push(newPhage(q.x, q.y)); }
  // (the old phage-cloud gate: kept parked, so its fights stay dormant)
  const cloud = { x: PARK.x, y: PARK.y, r: 16 };

  // food: three patches in the meadow, one in every colony, three more in the window
  for (let i = 0; i < 3; i++) { const q = ringPoint(20 + r() * 40, r() * 6.283); addPatch(q.x, q.y, i === 1); }
  for (const C of COLONIES) { const a = r() * 6.283; addPatch(C.x + Math.cos(a) * C.r * 0.5, C.y + Math.sin(a) * C.r * 0.5, false); }
  for (let i = 0; i < 3; i++) { const q = startWindow(); addPatch(q.x, q.y, i === 1); }

  // --- the grazer: a peritrich (Vorticella-like) on a stalk from a clay grain ---
  const grazers = [
    // gate 1 (ROUTE): on a stalk from a clay grain (its anchor) beyond it, the bell toward whoever
    // comes and its funnel turned aside, so you meet it side-on and see its current
    { x: 0, base: 0, dir: Math.PI, ang: 1.1, R: 17, ext: 1, contract: 0, next: 18 + r() * 10, seed: 3.1 },
  ];
  const STALK = 46;
  const movers = []; // grains that move with what holds them (the grazer's anchor; main.js adds Stentor's): checked as well as the buckets
  for (const g of grazers) { g.stalk = STALK; g.anchor = { x: 0, y: 0, r: 9, wob: 0.25, seed: g.seed * 7, cap: 6, ang: 0, z: -0.3 }; movers.push(g.anchor); }
  function grazerPose(g) {
    // g.lean (main.js, the wind-up): the bell tips its funnel toward its target
    const ang = g.ang + (g.lean || 0);
    // in the stalk's own frame (stalk up, from its foot at the origin): bell on top, oral opening along ang (0 = up)
    const L = g.stalk * (0.35 + 0.65 * g.ext);
    const lsx = Math.sin(ang * 0.6) * L * 0.5;
    const ltx = lsx + Math.sin(ang) * 2, lty = L;
    const lox = ltx - Math.sin(ang) * g.R * 1.9, loy = lty + Math.cos(ang) * g.R * 1.9;
    // then turned so the stalk points along g.dir (π/2: straight up)
    const th = (g.dir ?? Math.PI / 2) - Math.PI / 2, c = Math.cos(th), s = Math.sin(th);
    const tw = (lx, ly) => ({ x: g.x + c * lx - s * ly, y: g.base + s * lx + c * ly });
    const top = tw(ltx, lty), o = tw(lox, loy);
    const up = { x: -Math.sin(ang + th), y: Math.cos(ang + th) };
    const mouth = { x: o.x - up.x * g.R * 0.6, y: o.y - up.y * g.R * 0.6 };
    return { ox: o.x, oy: o.y, up, top, mouth, ang: ang + th, R: g.R };
  }
  /** Stand grazer g with its bell at (x, y), met along bearing b: the stalk from a grain GRAZER_FOOT beyond. */
  function placeGrazer(g, x, y, b) {
    const fx = x + Math.cos(b) * GRAZER_FOOT, fy = y + Math.sin(b) * GRAZER_FOOT;
    g.x = fx; g.base = fy; g.dir = b + Math.PI; g.bearing = b; g.parked = false;
    g.anchor.x = fx + Math.cos(b) * 4; g.anchor.y = fy + Math.sin(b) * 4;
    g.pose = grazerPose(g);
  }
  /** Park grazer g far off (a new game: not placed yet). */
  function parkGrazer(g) { placeGrazer(g, PARK.x, PARK.y, 0); g.parked = true; }
  for (const g of grazers) parkGrazer(g);

  // --- the amoeba's edge: gate 3, a wall across the way (its body beyond; guards.js) ---
  // ang: the edge runs along (cos, sin); its normal (−sin, cos) faces whoever comes. surge (guards.js,
  // its bite): the edge bulges forward by up to AMOEBA_SURGE µm in a wave as it engulfs.
  const amoeba = { x: 0, y: 0, ang: 0, width: AMOEBA.width, depth: AMOEBA.depth, amp: 5, seed: 2.2, speed: 1.4, home: { x: 0, y: 0 }, beaten: false, bearing: 0, surge: 0 };
  /** Stand the amoeba's edge at (x, y) across bearing b (met coming along b). */
  function placeAmoeba(x, y, b) {
    amoeba.x = amoeba.home.x = x; amoeba.y = amoeba.home.y = y; amoeba.ang = b + Math.PI / 2; amoeba.bearing = b; amoeba.parked = x === PARK.x;
  }
  placeAmoeba(PARK.x, PARK.y, 0);

  // The grazers whose feeding current is on, listed once per step (perf B1):
  // the sink and the "eaten" test then skip resting grazers and far points cheaply.
  const feedingNow = [];
  function listFeeding() {
    feedingNow.length = 0;
    if (opts.grazers) for (const g of grazers) if (g.contract <= 0 && g.feeding !== false && !g.parked) feedingNow.push(g);
  }
  function grazerFlow(x, y, out) {
    out.x = 0; out.y = 0;
    for (let i = 0; i < feedingNow.length; i++) {
      const g = feedingNow[i];
      const P = g.pose;
      const dx = P.mouth.x - x, dy = P.mouth.y - y;
      if (dx > 45 || dx < -45 || dy > 45 || dy < -45) continue;
      const d = Math.hypot(dx, dy) + 1e-6;
      if (d > 45) continue;
      // a sink at the oral funnel (1/r² in this thin layer), in a cone in front of the opening; to the
      // sides and behind only close to the bell, so the water round it (the calm breaks) is safe
      const cosF = -(dx * P.up.x + dy * P.up.y) / d;
      const front = Math.max(0, cosF) ** 1.5 + 0.3 * Math.max(0, 1 - d / 20);
      // g.pull (main.js, the fight): the current intensifies in the wind-up and surges in the strike
      const u = Math.min(260 * (g.pull || 1), 60 * (16 / Math.max(d, 4)) ** 2 * (g.pull || 1)) * front * g.ext;
      out.x += (dx / d) * u; out.y += (dy / d) * u;
    }
    return out;
  }
  const tmpF = { x: 0, y: 0 }, tmpS = { x: 0, y: 0 };

  function food(x, y) {
    let c = 0;
    for (const p of patches) { const d2 = (x - p.x) ** 2 + (y - p.y) ** 2; if (d2 < 9 * p.r * p.r) c += p.amt * Math.exp(-d2 / (p.r * p.r)); }
    return c;
  }
  function eat(x, y, amount) {
    let tot = 0;
    for (const p of patches) { const d2 = (x - p.x) ** 2 + (y - p.y) ** 2; if (d2 > 9 * p.r * p.r) continue; const w = Math.exp(-d2 / (p.r * p.r)); const take = Math.min(p.amt, amount * w); p.amt -= take; tot += take; }
    return tot;
  }

  const AMOEBA_SURGE = 7;
  function insideAmoeba(x, y, t) {
    if (!opts.amoeba || amoeba.beaten || amoeba.parked) return -1; // beaten, it withdraws and engulfs nothing more
    const c = Math.cos(amoeba.ang), s = Math.sin(amoeba.ang);
    const dx = x - amoeba.x, dy = y - amoeba.y;
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    if (Math.abs(lx) > amoeba.width * 0.45 || ly < -amoeba.depth) return -1;
    // (the surge: a bulge that runs across the edge as it engulfs)
    const bulge = amoeba.surge ? AMOEBA_SURGE * amoeba.surge * (0.6 + 0.4 * Math.cos(lx * 0.05 - t * 3)) : 0;
    return amoebaEdge(lx, amoeba.amp, amoeba.seed, t) + bulge - ly; // depth inside (positive inside)
  }

  /** The grains near (x, y): the bucket there, then the movers. fn(g) returns true to stop. */
  function grainsNear(x, y, fn) {
    const a = grainB.at(x, y);
    for (let i = 0; i < a.length; i++) if (fn(a[i])) return true;
    for (let i = 0; i < movers.length; i++) if (fn(movers[i])) return true;
    return false;
  }
  function pushOutOfGrains(o, rad) {
    // (o's position read once: o is a cell, a kin cell, a speck or a player, so these reads are megamorphic and box)
    const ox = o.x, oy = o.y, oh = o.hz;
    return grainsNear(ox, oy, (g) => {
      // a grain more than its reach away along either axis can't touch
      const m = g.r * 0.92 + rad, ex = ox - g.x, ey = oy - g.y;
      if (ex >= m || ex <= -m || ey >= m || ey <= -m) return false;
      const d = Math.hypot(ex, ey);
      // 2.5D: a cell with a height rides over the grain (stepHeight) instead of being pushed round it
      if (oh !== undefined && oh >= domeH(g, d) - 0.05) return false;
      if (d < m && d > 1e-6) { o.x = g.x + (ex / d) * m; o.y = g.y + (ey / d) * m; return true; }
      return false;
    });
  }
  /** A grain's top at distance d from its centre: a dome its thickness `cap` high (at most the layer's top). */
  function domeH(g, d) { const R = g.r * 0.92, q = d / R; return q >= 1 ? 0 : Math.min(LAYER.top - 1, g.cap || 2) * Math.sqrt(1 - q * q); }
  /** The sediment's height here: the top of any grain (0 on open floor). */
  function groundAt(x, y) {
    let h = 0;
    grainsNear(x, y, (g) => {
      const R = g.r * 0.92, ex = x - g.x, ey = y - g.y;
      if (ex >= R || ex <= -R || ey >= R || ey <= -R) return false;
      const v = domeH(g, Math.hypot(ex, ey));
      if (v > h) h = v;
      return false;
    });
    return h;
  }
  /** The grain under (x, y) whose top is highest there, with that height and the distance from its centre (or null). */
  function grainUnder(x, y) {
    let best = null, h = 0, bd = 0;
    grainsNear(x, y, (g) => {
      const R = g.r * 0.92, ex = x - g.x, ey = y - g.y;
      if (ex >= R || ex <= -R || ey >= R || ey <= -R) return false;
      const d = Math.hypot(ex, ey), v = domeH(g, d);
      if (v > h) { h = v; best = g; bd = d; }
      return false;
    });
    return best ? { g: best, h, d: bd } : null;
  }
  const rz = rng(909);
  /**
   * A moving cell's height (2.5D, LAYER): a random walk of where it likes to swim (o.hw), and o.hz eases
   * to it, but never below the ground under it plus its radius: up and over a grain, then settling back.
   */
  function stepHeight(o, dt, sq, rad = 0.3) {
    if (o.hz === undefined) { o.hw = LAYER.lo + rz() * (LAYER.hi - LAYER.lo); o.hz = o.hw; }
    o.hw += LAYER.walk * sq * gauss(rz) + (LAYER.mid - o.hw) * 0.08 * dt;
    o.hw = Math.max(LAYER.lo, Math.min(LAYER.hi, o.hw));
    const floor = groundAt(o.x, o.y) + rad + 0.25;
    if (o.hz < floor) o.hz = floor; // rides up the grain's side
    else o.hz += (Math.max(o.hw, floor) - o.hz) * (1 - Math.exp(-dt * LAYER.settle));
    if (o.hz > LAYER.top) o.hz = LAYER.top;
    return o.hz;
  }
  /**
   * The biofilm's EPS: 1 in open water; in the film, thicker the deeper you go (0.45 at its surface,
   * nothing FILM_DEEP µm in), so a cell eases to a stop in it rather than meeting a wall.
   */
  const FILM_DEEP = 24;
  function filmK(x, y) {
    const d = surfaceY(x) + 1 - y;
    if (d <= -3) return 1;
    if (d < 3) return 1 - 0.55 * (d + 3) / 6; // (eased in across its fuzzy surface)
    return Math.max(0, 0.45 * (1 - (d - 3) / (FILM_DEEP - 3)));
  }
  /**
   * The soft limits after a move from (px, py): surface tension at the drop's edge (rimMove), and the
   * biofilm, where the downward part of a move is cut the deeper it goes (never below FILM_DEEP).
   */
  function soften(o, px, py) {
    const floor = surfaceY(o.x) + 1;
    if (o.y < floor && o.y < py) {
      const k = Math.max(0, Math.min(1, 1 - (floor - py) / FILM_DEEP));
      o.y = py + (o.y - py) * k;
      if (o.y < floor - FILM_DEEP) o.y = floor - FILM_DEEP;
    }
    rimMove(o, px, py);
  }

  // --- the landmarks of the Micro Zoom chain ---
  // Forward (to the phage level): a host cell swollen and studded with phages landing on it. Phages
  // are 60 nm: phase contrast shows only the swollen host; fluorescence (SYBR) and darkfield show the
  // phages as spots. Backdoor (up to the pool): the looming Paramecium in the open water at the top
  // left, its cilia sweeping the edge of the field.
  const landmarks = {
    forward: { x: LANDMARK.x, y: LANDMARK.y, a: 0.5, L: 4.4, r: 0.72, reach: 1.6, phages: [], incoming: [] },
    back: { x: -166, y: 116, r: 38, edge: { x: -183, y: 132, ang: Math.atan2(-0.62, -0.78), L: 150, depth: 90, amp: 3, seed: 4.4 } },
  };
  {
    const F = landmarks.forward;
    for (let i = 0; i < 16; i++) F.phages.push({ u: (r() - 0.5) * F.L * 0.95, side: r() < 0.5 ? -1 : 1, tilt: (r() - 0.5) * 0.6 });
    for (let i = 0; i < 10; i++) F.incoming.push({ ang: r() * 6.28, d: 2 + r() * 6, v: 0.6 + r() * 1.2 });
  }

  let recycleT = 0;
  const world = {
    landmarks, start: START, halfX: HALF_X, progress, route: ROUTE, colonies: COLONIES, cloud, ringPoint, distFromStart, bearingFromStart, placeGrazer, parkGrazer, placeAmoeba, preySpot, routeSpot, anywhere, inWater, windowSpot,
    watch, rimDist, filmK, soften,
    /** Put the host cell (the way on) at (x, y): main.js placePortal. */
    setPortal(x, y, a) { const F = landmarks.forward; F.x = x; F.y = y; F.a = a + 0.5; F.placed = true; },
    /**
     * Clear the host's water at (x, y): clay grains within 30 µm of it and biofilm cells within 48 are moved
     * off (to ~90 µm at most). The director places the host only where all of that is unseen (portalParts).
     */
    clearHostWater(x, y, keep = null) {
      const hit = [];
      grainB.each(x - 60, y - 60, x + 60, y + 60, (g) => { const d = Math.hypot(g.x - x, g.y - y); if (d < 30 + g.r && g !== keep) hit.push(g); });
      for (const g of hit) { const dx = g.x - x, dy = g.y - y, d = Math.hypot(dx, dy), k = (36 + g.r) / (d || 1); grainB.move(g, x + (dx || 1) * k, y + dy * k); }
      const fh = [];
      filmB.each(x - 50, y - 50, x + 50, y + 50, (c) => { if (Math.hypot(c.x - x, c.y - y) < 48) fh.push(c); });
      for (const c of fh) { const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy), k = (d + 40) / (d || 1); filmB.move(c, x + (dx || 1) * k, y + dy * k); }
    },
    /** Move a grain (tests) or an attached cell (main.js arrangeClump) and keep the grid right. */
    moveGrain(g, x, y) { if (g._k) grainB.move(g, x, y); else { g.x = x; g.y = y; } },
    moveFilm(c, x, y) { filmB.move(c, x, y); },
    /** A grain that moves with what holds it (Stentor's foot): always checked. */
    addMover(g) { movers.push(g); },
    /** Every grain, attached cell and matrix strand over a box (draw.js, and searches near a point). */
    eachGrain(x0, y0, x1, y1, fn) { grainB.each(x0, y0, x1, y1, fn); for (const g of movers) if (g.x + g.r > x0 && g.x - g.r < x1 && g.y + g.r > y0 && g.y - g.r < y1) fn(g); },
    eachFilm(x0, y0, x1, y1, fn) { filmB.each(x0, y0, x1, y1, fn); },
    eachEps(x0, y0, x1, y1, fn) { epsB.each(x0, y0, x1, y1, fn); },
    /** Where kin begin: the meadow (a disc round the start); the colonies; the rest ambient (collective.js keep). */
    zones: [{ r0: 12, r1: ROUTE.meadow }],
    /** The y of a given oxygen level (% air saturation). */
    bandY: oxygenY,
    /** Is (x, y) within √r2 µm of a feeding grazer's mouth? (members and kin are eaten there) */
    grazerMouthAt(x, y, r2 = 9) {
      for (let i = 0; i < feedingNow.length; i++) { const M = feedingNow[i].pose.mouth; if ((x - M.x) ** 2 + (y - M.y) ** 2 < r2) return true; }
      return false;
    },
    /** Is any current flowing near (x, y)? (a cheap test: the members skip flowAt far from every current) */
    flowNear(x, y) {
      for (let i = 0; i < feedingNow.length; i++) { const M = feedingNow[i].pose.mouth; if (Math.abs(x - M.x) < 50 && Math.abs(y - M.y) < 50) return true; }
      const st = world.stentor;
      return !!(st && st.placed && Math.abs(x - st.mouth.x) < st.pullR + 5 && Math.abs(y - st.mouth.y) < st.pullR + 5);
    },
    PARK, opts, hunt, grains, specks, eps, film, cells, phages, patches, grazers, amoeba, slab, surfaceY,
    oxygen, food, eat, insideAmoeba, pushOutOfGrains, grazerPose, groundAt, grainUnder, stepHeight, hostK,
    /** The current at (x, y), µm/s. `out`, if given, is filled and returned instead of a new object. */
    flowAt(x, y, out = { x: 0, y: 0 }) {
      const f = grazerFlow(x, y, out);
      // the boss's vortex (main.js sets world.stentor)
      if (world.stentor) { const v = world.stentor.flow(x, y, tmpS); f.x += v.x; f.y += v.y; }
      return f;
    },
    /** Field direction (unit) and strength in µT. North points into the sediment (−y). */
    get field() { return { x: 0.12, y: -0.993, uT: opts.field }; },
    addPatch,
    newPhage,
    r,
    update(dt, t, player) {
      listFeeding();
      if (!world.watch.inView && player) watch.players = [{ x: player.x, y: player.y }];
      for (const g of grazers) {
        g.pose = grazerPose(g);
        // stalk contraction: the spasmoneme coils in milliseconds, re-extends over seconds
        if (g.beaten) { g.contract = 1; g.ext = Math.max(0.12, g.ext - dt * 3); g.fade = Math.min(1, (g.fade || 0) + dt / 4); continue; } // beaten (guards.js): coiled on its stalk, its bell dissolving
        if (g.battle) continue; // fighting your swarm (guards.js drives it)
        if (g.contract > 0) { g.contract -= dt; g.ext = Math.min(1, g.ext + dt / 3); if (g.contract <= 0) g.ext = 1; }
        else if (t > g.next) { g.contract = 3; g.ext = 0; g.next = t + 20 + r() * 15; }
      }
      // the amoeba's edge holds its gate: it slides toward the nearest player along its own line (blocking
      // the way, leashed to its place); beaten (guards.js), it withdraws down into the sediment and fades
      if (opts.amoeba && !amoeba.parked) {
        const H = amoeba.home;
        if (amoeba.beaten) {
          amoeba.fade = Math.min(1, (amoeba.fade || 0) + dt / 5);
          const tx = H.x + Math.cos(amoeba.bearing) * 90, ty = H.y + Math.sin(amoeba.bearing) * 90, dx = tx - amoeba.x, dy = ty - amoeba.y, d = Math.hypot(dx, dy);
          if (d > 0.5) { amoeba.x += (dx / d) * Math.min(d, 25 * dt); amoeba.y += (dy / d) * Math.min(d, 25 * dt); }
        } else {
          const dx = player.x - amoeba.x, dy = player.y - amoeba.y, d = Math.hypot(dx, dy);
          if (d < 160 && player.alive !== false && hunt.amoeba) {
            // along its edge (to stand across the way) faster, toward you slowly
            const c = Math.cos(amoeba.ang), s = Math.sin(amoeba.ang), lx = dx * c + dy * s;
            const v = Math.max(-9, Math.min(9, lx * 0.6));
            amoeba.x += c * v * dt + (dx / d) * amoeba.speed * dt; amoeba.y += s * v * dt + (dy / d) * amoeba.speed * dt;
          }
          const c = Math.cos(amoeba.ang), s = Math.sin(amoeba.ang);
          const ox = amoeba.x - H.x, oy = amoeba.y - H.y, along = Math.max(-70, Math.min(70, ox * c + oy * s)), across = Math.max(-25, Math.min(25, -ox * s + oy * c));
          amoeba.x = H.x + c * along - s * across; amoeba.y = H.y + s * along + c * across;
        }
      }
      const sq = Math.sqrt(dt);
      const br = opts.brownian ? 1 : 0;
      // the ambient life lives in a window round the players: what drifts out of it comes back elsewhere in it, out of view
      recycleT -= dt;
      const recycle = recycleT <= 0;
      if (recycle) recycleT = 0.5;
      // specks: Brownian (D = kT / 6πηr ≈ 0.22/r µm²/s) and carried by the feeding currents
      for (const p of specks) {
        const D = 0.22 / p.r;
        const f = feedingNow.length ? grazerFlow(p.x, p.y, tmpF) : (tmpF.x = tmpF.y = 0, tmpF);
        p.x += f.x * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
        p.y += f.y * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
        if (eatenByGrazer(p) || (recycle && !near(p.x, p.y, WIN + 40))) respawnFar(p);
      }
      // phages: D ≈ 4 µm²/s (a 60 nm head and tail)
      if (opts.phages) for (const p of phages) {
        if (p.stuck) continue;
        const f = feedingNow.length ? grazerFlow(p.x, p.y, tmpF) : (tmpF.x = tmpF.y = 0, tmpF);
        p.x += f.x * dt + br * 2.9 * sq * gauss(r);
        p.y += f.y * dt + br * 2.9 * sq * gauss(r);
        if (eatenByGrazer(p) || (recycle && !near(p.x, p.y, WIN + 40)) || rimDist(p.x, p.y) < 2 || p.y < surfaceY(p.x) - 10) respawnFar(p);
      }
      // free cells
      for (const c of cells) {
        if (recycle && c.amb && !c.parked && !c.attachedBy && !c.bdelloplast && !near(c.x, c.y, WIN + 40)) respawnFar(c);
        stepCell(c, dt, t, sq, br, player);
      }
      // depleted patches are replaced by a new one elsewhere (a new lysis or decaying flake)
      for (let i = patches.length - 1; i >= 0; i--) {
        if (patches[i].amt < 0.06) {
          patches.splice(i, 1);
          const q = windowSpot(120) || startWindow();
          addPatch(q.x, q.y, r() < 0.4);
        }
      }
      if (phages.length > 360) phages.splice(0, phages.length - 360);
      // phages diffusing in to land on the forward host, then starting again further out
      for (const q of landmarks.forward.incoming) {
        q.d -= q.v * dt * 0.6;
        q.ang += br * 0.4 * sq * gauss(r);
        if (q.d < 0.15) { q.d = 5 + r() * 4; q.ang = r() * 6.28; }
      }
    },
  };

  function eatenByGrazer(p) {
    for (let i = 0; i < feedingNow.length; i++) {
      const M = feedingNow[i].pose.mouth;
      if ((p.x - M.x) ** 2 + (p.y - M.y) ** 2 < 9) return true;
    }
    return false;
  }
  function respawnFar(p) {
    const q = windowSpot(140);
    if (q) { p.x = q.x; p.y = q.y; }
  }

  function stepCell(c, dt, t, sq, br, player) {
    if (c.parked) return; // (waiting off the field: main.js keepAmbient brings it in where nobody has looked)
    c.flPhase += dt * 30;
    // lysed by the army (collective.js eat): rounds up and bursts; then it is parked, and a rod comes in
    // again in water nobody has seen (main.js keepAmbient)
    if (c.lysed) {
      c.lysed += dt / 0.8;
      if (c.lysed >= 1) { c.lysed = 0; c.ghost = false; c.parked = true; c.x = PARK.x; c.y = PARK.y; }
      return;
    }
    if (c.dead) { c.dead += dt; return; } // a Bdellovibrio killed by the army: it rounds and fades (draw.js)
    if (c.ghost) return;
    if (c.waylay) return; // a stranger waylaying a flock: collective.js (WAYLAY) moves it
    if (c.drillLatch) return; // (a pack Bdellovibrio held by the members drilling into it: guards.js)
    const f = grazerFlow(c.x, c.y, tmpF);
    if (c.bdelloplast > 0 || c.attachedBy) {
      // a prey cell with a predator attached stops swimming; a bdelloplast is a sphere
      c.stopped = 1;
      if (c.bdelloplast > 0 && c.bdelloplast < 1) c.bdelloplast = Math.min(1, c.bdelloplast + dt / 1.5);
      c.x += f.x * dt * 0.3; c.y += f.y * dt * 0.3;
      return;
    }
    const px = c.x, py = c.y;
    let vx = 0, vy = 0;
    if (c.motile && opts.npcRun) {
      if (c.tumble > 0) {
        c.tumble -= dt;
        if (c.tumble <= 0) c.run = c.kind === 'mtb' ? 2 + r() * 3 : -Math.log(1 - r()) * (c.kind === 'bdello' ? 0.7 : 1.0);
      } else {
        c.run -= dt;
        if (c.run <= 0) {
          if (c.kind === 'mtb') { c.sense *= -1; c.a += Math.PI; c.tumble = 0.2; }
          else { c.a += tumbleAngle(r); c.tumble = c.kind === 'bdello' ? 0.12 : 0.1 + r() * 0.1; }
        }
        let v = c.v;
        if (c.kind === 'mtb') {
          // magneto-aerotaxis: aligned by the field, reversing on the oxygen sense
          const O = oxygen(c.y);
          const goingDown = Math.sin(c.a) < 0;
          if ((O > 5 && !goingDown) || (O < 0.4 && goingDown)) { c.run = Math.min(c.run, 0.05); }
          const mAng = c.sense > 0 ? c.a : c.a + Math.PI;
          const B = world.field;
          const bAng = Math.atan2(B.y, B.x);
          c.a -= Math.sin(mAng - bAng) * (B.uT / 20) * 0.75 * dt;
        }
        if (c.kind === 'bdello' && opts.hunters) {
          c.cooldown -= dt;
          // collide with prey: attach and enter (time-compressed)
          if (c.cooldown <= 0 && !c.home) for (const p of cells) {
            if (!p.prey || p === c || p.bdelloplast || p.ghost || p.attachedBy) continue;
            if (Math.abs(p.x - c.x) > 3 || Math.abs(p.y - c.y) > 3) continue;
            const [d] = segDist(c.x, c.y, p.x, p.y, p.a, p.L);
            if (d < p.r + 0.3) { p.attachedBy = c; c.prey = p; c.attachT = 0; break; }
          }
          if (c.prey) {
            c.attachT += dt;
            c.x = c.prey.x + Math.cos(c.prey.a) * c.prey.L * 0.3; c.y = c.prey.y + Math.sin(c.prey.a) * c.prey.L * 0.3;
            if (c.attachT > 3) { c.prey.bdelloplast = 0.01; c.prey.attachedBy = null; c.prey = null; c.cooldown = 8; c.hidden = 6; }
            return;
          }
          if (c.hidden > 0) { c.hidden -= dt; return; }
        }
        vx = Math.cos(c.a) * v; vy = Math.sin(c.a) * v;
        c.a += (c.kind === 'bdello' ? 1.1 : 0.45) * sq * gauss(r) * br;
      }
    }
    // Brownian translation: a 1–2 µm cell, D ≈ 0.2–0.4 µm²/s
    const D = c.motile ? 0.25 : c.kind === 'chain' ? 0.12 : 0.4;
    c.x += (vx + f.x) * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
    c.y += (vy + f.y) * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
    if (!c.motile) c.a += br * 0.3 * sq * gauss(r);
    // the sediment bank and the drop's edge turn a free cell back (soft: no wall)
    if (c.y < surfaceY(c.x) + 1) { c.y = surfaceY(c.x) + 1; c.a = -c.a; }
    if (rimDist(c.x, c.y) < DROP.soft * 0.5 && c.motile) c.a = Math.atan2(DROP.y - c.y, DROP.x - c.x) + (r() - 0.5);
    rimMove(c, px, py);
    // the pack keeps to its gate: beyond its reach a Bdellovibrio turns home
    if (c.home && Math.hypot(c.x - c.home.x, c.y - c.home.y) > c.home.r + 18) c.a = Math.atan2(c.home.y - c.y, c.home.x - c.x);
    if (c.motile) stepHeight(c, dt, sq, c.r); // 2.5D: moving cells swim at heights and ride over grains
    pushOutOfGrains(c, c.r);
    if (feedingNow.length && eatenByGrazer(c)) { if (c.home) { c.x = c.home.x; c.y = c.home.y; } else respawnFar(c); }
    void player; void t;
  }

  for (const g of grazers) g.pose = grazerPose(g);
  listFeeding();
  return world;
}
