// The scene: a thin layer of bog-pond water over sediment and biofilm, seen
// at 1000×. Oxygen falls toward the sediment; food comes in patches; two
// peritrich grazers draw feeding currents; an amoeba's edge creeps; phages
// drift; other bacteria run and tumble or sit in the biofilm.
// Units: µm and seconds. +y is toward the air (the meniscus), −y into the sediment.

// The level is placed as you go (design/encounter-pattern.md, "Placed as you
// go"; shared/director.js; main.js `director`): a short warm-up in the meadow
// round the start, where kin and prey are plentiful, then the gates in order
// (an enemy your army must push through: the peritrich, the Bdellovibrio pack,
// the phage cloud, the amoeba's edge, the bigger peritrich), each put by the
// director in water nobody has seen, a little ahead of whoever is furthest
// along, with a calm break between; last the host cell (the way on) guarded by
// Stentor. Until placed, every gate is parked far off (PARK) and invisible.
// What a player has seen never changes. Scenery stays where it is: the
// biofilm and sediment along the bottom edge of the world, clay grains with
// microcolonies on them scattered everywhere. Kin and prey are ambient: some
// in the meadow, the rest kept near every player in water they haven't seen
// (collective.js keep, main.js keepAmbient).
export const WORLD = { x0: -560, x1: 560, y0: -560, y1: 560, slabY: -548 };
export const START = { x: 0, y: 0 };
/** Where a gate waits before the director places it: far off the field (drawn nowhere, acting on nothing). */
export const PARK = { x: 1e6, y: 0 };
/** The meadow round the start (where kin and prey begin), and the gates in the director's order. */
export const ROUTE = {
  meadow: 60,
  gates: [
    { id: 'grazer1', name: 'Peritrich' },
    { id: 'bdello', name: 'Bdellovibrio pack', r: 20 },
    { id: 'phage', name: 'Phage cloud', r: 16 },
    { id: 'amoeba', name: 'Amoeba' },
    { id: 'grazer2', name: 'Peritrich' },
  ],
};
/** The host (the way on) before it is placed: parked; moved by setPortal. */
export const LANDMARK = { x: PARK.x, y: PARK.y };
export const distFromStart = (x, y) => Math.hypot(x - START.x, y - START.y);
export const bearingFromStart = (x, y) => Math.atan2(y - START.y, x - START.x);
export const ringPoint = (r, a) => ({ x: START.x + Math.cos(a) * r, y: START.y + Math.sin(a) * r });
/** The Paramecium (the backdoor, the way back) and the water round it, kept clear of encounters. */
export const BACKDOOR = { x: -166, y: 116, r: 38 };

// ---- the director (shared/director.js): its settings and the encounters in order ----
// main.js adds place and met; route.test.mjs runs them without a browser. Units µm; the
// director's ground plane is the field (its z is our y). The default field is 45 µm tall
// (about 80 across), the eyepiece field 180 (320 across); the flock cruises at ~45 µm/s.
//   size     clearance (the gate's zone, where the army fights it)
//   parts    what can be seen of it when placed: unseen water, out of every view
//   min/maxAhead  how far ahead of the leader it goes; min/maxNear when they linger
//   need     the army that beats it (README "The way"): while the leader's army is
//            smaller, the calm break before it lasts longer (main.js) and kin are kept
//            closer round them (collective.js keep)
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
/** Is (x, y) in open water inside the world, `m` µm clear of its edges and the backdoor? */
export function inWater(x, y, m = 0) {
  return x > WORLD.x0 + 20 + m && x < WORLD.x1 - 20 - m && y > WORLD.slabY + 30 + m && y < WORLD.y1 - 15 - m;
}
const allIn = (parts, m = 0) => parts.every(([x, y]) => inWater(x, y, m));
export const DIRECTOR = {
  cell: 20, seenDist: 200, nearSeen: 14, seed: 23,
  bounds: { x0: WORLD.x0, x1: WORLD.x1, z0: WORLD.slabY, z1: WORLD.y1 },
  // ~5 s of moving to warm up (the meadow: call your first kin); a calm break of ~5 s of moving clear of
  // each gate (longer while the army is short of the next gate's need: main.js armyHold)
  warmup: { sec: 5 }, calm: { sec: 5 }, linger: 6, moveSpeed: 6,
  // seen but not gone to: met once everyone is ~200 µm off for 1.5 s, or after 10 s in sight nearby
  passDist: 200, watchSec: 10,
};
export const ENCOUNTERS = [
  { id: 'grazer1', need: 12, size: 70, minAhead: 100, maxAhead: 170, minNear: 75, maxNear: 130,
    parts: (x, y, b) => grazerParts(x, y, b), fits: (x, y, b) => allIn(grazerParts(x, y, b)) },
  { id: 'bdello', need: 8, size: 60, visible: 44, minAhead: 95, maxAhead: 165, minNear: 70, maxNear: 125, fits: (x, y) => inWater(x, y, 30) },
  { id: 'phage', need: 6, size: 50, visible: 40, minAhead: 95, maxAhead: 165, minNear: 70, maxNear: 125, fits: (x, y) => inWater(x, y, 25) },
  { id: 'amoeba', need: 16, size: 110, minAhead: 130, maxAhead: 210, minNear: 95, maxNear: 160,
    parts: (x, y, b) => amoebaParts(x, y, b), fits: (x, y, b) => allIn(amoebaParts(x, y, b)) },
  { id: 'grazer2', need: 14, size: 70, minAhead: 100, maxAhead: 170, minNear: 75, maxNear: 130,
    parts: (x, y, b) => grazerParts(x, y, b), fits: (x, y, b) => allIn(grazerParts(x, y, b)) },
  // the boss and the way on: the host cell and Stentor beyond it (its oral disc ~250 µm across)
  { id: 'portal', need: 24, size: 140, minAhead: 150, maxAhead: 260, minNear: 110, maxNear: 220, final: true,
    parts: (x, y, b) => portalParts(x, y, b), fits: (x, y, b) => inWater(x, y, 20) && allIn(portalParts(x, y, b).slice(1), -10) },
];
/**
 * The default path (shared/director.js `defaultPath`; the owner, 2026-11-01: "a default path to a portal,
 * but just dynamically generate the other directions if the player goes off in another direction"): the
 * host with Stentor laid out across the field from the start (0.25 rad: right and a little up, away from
 * the Paramecium on the left; ~440 µm out, as far as Stentor beyond it leaves room) on the first frame, so
 * the way on exists from the start. The gates are not laid along it: the field (~1.1 mm) has room for one
 * break at a rush (5 s at ~45 µm/s plus the gate's ahead range is ~360 µm), and each gate must wait for its
 * break and for the army it needs (the army-size hold), so every gate is still placed as you go (dists
 * null), on the way to the host or wherever you go. Off the bearing the host, while nobody has seen it,
 * leaves the path and is placed ahead of you after the last gate, as before (one thing: `single`).
 */
export const DEFAULT_PATH = { from: { x: START.x, z: START.y }, bearing: 0.25, dists: [null, null, null, null, null, 440], cone: 0.6 };
/** Encounters go in open water, clear of the backdoor (the Paramecium and the water round it). */
export const canPlace = (x, y, r) => inWater(x, y) && Math.hypot(x - BACKDOOR.x, y - BACKDOOR.y) > BACKDOOR.r + 90 + r * 0.5;
/** How far out from the start (kept for the stats line). */
export function progress(x, y) { return distFromStart(x, y) / 500; }
/** (Kept for old callers.) */
export const HALF_X = 250;

// Oxygen in % of air saturation: falls roughly exponentially from the
// meniscus and is used up by the biofilm, reaching zero just above it.
export function oxygen(y) {
  return Math.max(0, 100 * Math.exp((y - WORLD.y1) / 38) - 1);
}
export function oxygenY(pct) { return WORLD.y1 + 38 * Math.log((pct + 1) / 100); }

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

export function createWorld() {
  const r = rng(51);
  const W = WORLD;
  const opts = { grazers: true, phages: true, hunters: true, amoeba: true, npcRun: true, brownian: true, field: 20 };
  // which predators are hungry right now (main.js runs their hunger: shared/predation.js)
  const hunt = { phage: true, bdello: true, amoeba: true };
  const slab = { amp: 4, seed: 1.3 };
  const surfaceY = (x) => W.slabY + slabEdge(x, slab.amp, slab.seed);

  // --- sediment grains (clay and silt, bigger than any bacterium), static ---
  const grains = [];
  for (let i = 0; i < 90; i++) {
    const big = i < 40;
    let x = 0, y = 0;
    for (let k = 0; k < 8; k++) { x = W.x0 + r() * (W.x1 - W.x0); y = W.slabY + 6 + r() * (W.y1 - W.slabY - 10); if (distFromStart(x, y) > 30) break; }
    const rad = big ? 6 + r() * 10 : 1.6 + r() * 3;
    grains.push({ x, y, r: rad, wob: 0.18 + r() * 0.12, seed: r() * 50, cap: big ? 7 : 2.5, ang: r() * 6.28, z: big ? -0.5 + r() : (r() - 0.5) * 2.4 });
  }
  // small clay specks and colloids: Brownian
  const specks = [];
  for (let i = 0; i < 640; i++) specks.push({ x: W.x0 + r() * (W.x1 - W.x0), y: W.slabY + 4 + r() * (W.y1 - W.slabY - 4), r: 0.12 + r() * 0.3, z: (r() - 0.5) * 2.5, seed: r() * 9 });

  // --- matrix (EPS) strands in and above the biofilm ---
  const eps = [];
  for (let i = 0; i < 140; i++) {
    const G = grains[i % 40], a = r() * 6.283, x = G.x + Math.cos(a) * (G.r + 1 + r() * 4);
    eps.push({ x, y: G.y + Math.sin(a) * (G.r + 1 + r() * 4), a: (r() - 0.5) * 2.2, L: 8 + r() * 22, amp: 0.4 + r() * 1.2, wl: 6 + r() * 10, ph: r() * 6, z: (r() - 0.5) * 1.2 });
  }

  // --- biofilm cells: attached rods, cocci in clusters, below the surface ---
  const film = [];
  for (let i = 0; i < 1040; i++) {
    // microcolonies on the clay grains (and a few along the sediment at the bottom edge)
    const G = grains[i % 40], a = r() * 6.283, d = G.r * 0.92 + 0.4 + Math.pow(r(), 1.6) * 3.5;
    const x = i % 7 === 6 ? W.x0 + 4 + r() * (W.x1 - W.x0 - 8) : G.x + Math.cos(a) * d;
    const y = i % 7 === 6 ? surfaceY(x) - 0.8 - Math.pow(r(), 1.6) * 26 : G.y + Math.sin(a) * d;
    const coccus = r() < 0.3;
    film.push({ kind: coccus ? 'coccus' : 'rod', x, y, a: r() * 6.28, L: coccus ? 0 : 1.4 + r() * 1.6, r: coccus ? 0.45 + r() * 0.15 : 0.32 + r() * 0.1, z: (r() - 0.5) * 1.6, gramNeg: !coccus, bdelloplast: 0, ghost: false, prey: !coccus });
  }

  /** A spot in the meadow round the start (where prey and kin begin). */
  function preySpot() {
    const p = ringPoint(14 + Math.sqrt(r()) * (ROUTE.meadow - 14), r() * 6.283);
    p.zone = 0;
    return p;
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
  const anywhere = () => ({ x: W.x0 + 10 + r() * (W.x1 - W.x0 - 20), y: W.slabY + 8 + r() * (W.y1 - W.slabY - 16) });
  for (let i = 0; i < 160; i++) { const q = anywhere(); addCell('rod', q.x, q.y); }
  for (let i = 0; i < 120; i++) { const q = anywhere(); addCell('coccus', q.x, q.y); }
  for (let i = 0; i < 45; i++) { const q = anywhere(); addCell('chain', q.x, q.y); }
  // prey for the army (X lyses rods in reach): plentiful in the meadow; the rest are ambient, kept near
  // every player in water they haven't seen (main.js keepAmbient). Lysed, a rod is parked until wanted.
  for (let i = 0; i < 200; i++) {
    if (i < 60) { const q = preySpot(); addCell('rod', q.x, q.y).zone = 0; continue; }
    const c = addCell('rod', PARK.x, PARK.y); c.zone = 1; c.parked = true;
  }
  // the Bdellovibrio pack: four predators that keep to their gate (guards.js; parked until the director places it)
  const pack = ROUTE.gates[1];
  for (let i = 0; i < 4; i++) { const c = addCell('bdello', PARK.x, PARK.y); c.home = { x: PARK.x, y: PARK.y, r: pack.r }; c.hp = 1; c.parked = true; }

  // --- food patches: dissolved organic matter round decaying detritus or a lysed cell ---
  const patches = [];
  const addPatch = (x, y, lysis = false) => {
    const p = { x, y, r: 10 + r() * 9, amt: 0.8 + r() * 0.4, flake: { a: r() * 6.28, seed: r() * 40, r: 1.2 + r() * 1.8 }, lysis };
    patches.push(p);
    if (lysis) for (let i = 0; i < 35; i++) phages.push(newPhage(x + gauss(r) * 5, y + gauss(r) * 5));
    return p;
  };

  // --- phages ---
  const phages = [];
  function newPhage(x, y) { return { x, y, z: (r() - 0.5) * 1.6, stuck: null }; }
  for (let i = 0; i < 300; i++) { const q = anywhere(); phages.push(newPhage(q.x, q.y)); }
  // the phage cloud gate: a lysed host's progeny hanging together (guards.js; parked until placed)
  const cloud = { x: PARK.x, y: PARK.y, r: ROUTE.gates[2].r };
  for (let i = 0; i < 80; i++) { const p = newPhage(cloud.x + gauss(r) * cloud.r * 0.6, cloud.y + gauss(r) * cloud.r * 0.8); p.z = (r() - 0.5) * 0.6; p.cloud = cloud; phages.push(p); }

  for (let i = 0; i < 12; i++) { const q = i < 3 ? ringPoint(20 + r() * 40, r() * 6.283) : anywhere(); addPatch(q.x, q.y, i % 3 === 1); }

  // --- grazers: two peritrichs (Vorticella-like) on stalks from the biofilm ---
  const grazers = [
    // gates 1 and 5 (ROUTE): each on a stalk from a clay grain (its anchor) beyond it, the bell
    // toward whoever comes and its funnel turned aside, so you meet it side-on and see its current
    { x: 0, base: 0, dir: Math.PI, ang: 1.1, R: 17, ext: 1, contract: 0, next: 18 + r() * 10, seed: 3.1 },
    { x: 0, base: 0, dir: Math.PI, ang: -1.1, R: 15, ext: 1, contract: 0, next: 26 + r() * 10, seed: 7.7 },
  ];
  const STALK = 46;
  for (const g of grazers) { g.stalk = STALK; g.anchor = { x: 0, y: 0, r: 9, wob: 0.25, seed: g.seed * 7, cap: 6, ang: 0, z: -0.3 }; grains.push(g.anchor); }
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

  // --- the amoeba's edge: gate 4, a wall across the way (its body beyond; guards.js) ---
  // ang: the edge runs along (cos, sin); its normal (−sin, cos) faces whoever comes
  const amoeba = { x: 0, y: 0, ang: 0, width: AMOEBA.width, depth: AMOEBA.depth, amp: 5, seed: 2.2, speed: 1.4, home: { x: 0, y: 0 }, beaten: false, bearing: 0 };
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
    if (opts.grazers) for (const g of grazers) if (g.contract <= 0 && g.feeding !== false) feedingNow.push(g);
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
    for (const p of patches) { const d2 = (x - p.x) ** 2 + (y - p.y) ** 2; const w = Math.exp(-d2 / (p.r * p.r)); const take = Math.min(p.amt, amount * w); p.amt -= take; tot += take; }
    return tot;
  }

  function insideAmoeba(x, y, t) {
    if (!opts.amoeba || amoeba.beaten) return -1; // beaten, it withdraws and engulfs nothing more
    const c = Math.cos(amoeba.ang), s = Math.sin(amoeba.ang);
    const dx = x - amoeba.x, dy = y - amoeba.y;
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    if (Math.abs(lx) > amoeba.width * 0.45 || ly < -amoeba.depth) return -1;
    return amoebaEdge(lx, amoeba.amp, amoeba.seed, t) - ly; // depth inside (positive inside)
  }

  function pushOutOfGrains(o, rad) {
    // (o's position read once: o is a cell, a kin cell, a speck or a player, so these reads are megamorphic and box)
    const ox = o.x, oy = o.y;
    for (const g of grains) {
      // a grain more than its reach away along either axis can't touch (Math.hypot >= |dx|, |dy|): skipping it
      // first saves a Math.hypot, which V8 doesn't inline and which boxes its result (~1 MB a step)
      const m = g.r * 0.92 + rad, ex = ox - g.x, ey = oy - g.y;
      if (ex >= m || ex <= -m || ey >= m || ey <= -m) continue;
      const dx = ex, dy = ey, d = Math.hypot(dx, dy);
      if (d < m && d > 1e-6) { o.x = g.x + (dx / d) * m; o.y = g.y + (dy / d) * m; return true; }
    }
    return false;
  }

  // --- the landmarks of the Micro Zoom chain ---
  // Forward (to the phage level): a host cell on the far right, in the band,
  // swollen and studded with phages landing on it. Phages are 60 nm: phase
  // contrast shows only the swollen host; fluorescence (SYBR) and darkfield
  // show the phages as spots. Backdoor (up to the pool): the looming
  // Paramecium in the open water at the top left, its cilia sweeping the edge
  // of the field.
  const landmarks = {
    forward: { x: LANDMARK.x, y: LANDMARK.y, a: 0.5, L: 4.4, r: 0.72, reach: 1.6, phages: [], incoming: [] },
    back: { x: -166, y: 116, r: 38, edge: { x: -183, y: 132, ang: Math.atan2(-0.62, -0.78), L: 150, depth: 90, amp: 3, seed: 4.4 } },
  };
  {
    const F = landmarks.forward;
    for (let i = 0; i < 16; i++) F.phages.push({ u: (r() - 0.5) * F.L * 0.95, side: r() < 0.5 ? -1 : 1, tilt: (r() - 0.5) * 0.6 });
    for (let i = 0; i < 10; i++) F.incoming.push({ ang: r() * 6.28, d: 2 + r() * 6, v: 0.6 + r() * 1.2 });
  }

  const world = {
    landmarks, start: START, halfX: HALF_X, progress, route: ROUTE, cloud, ringPoint, distFromStart, bearingFromStart, placeGrazer, parkGrazer, placeAmoeba, preySpot, anywhere, inWater,
    /** Put the host cell (the way on) at (x, y): main.js placePortal. */
    setPortal(x, y, a) { const F = landmarks.forward; F.x = x; F.y = y; F.a = a + 0.5; F.placed = true; },
    /**
     * Clear the host's water at (x, y): clay grains within 30 µm of it and biofilm cells within 48 are moved
     * off (to ~90 µm at most). The director places the host only where all of that is unseen (portalParts).
     */
    clearHostWater(x, y, keep = null) {
      for (const g of grains) { const dx = g.x - x, dy = g.y - y, d = Math.hypot(dx, dy); if (d < 30 + g.r && g !== keep) { const k = (36 + g.r) / (d || 1); g.x = x + (dx || 1) * k; g.y = y + dy * k; } }
      for (const c of film) { const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy); if (d < 48) { const k = (d + 40) / (d || 1); c.x = x + (dx || 1) * k; c.y = y + dy * k; } }
    },
    /** Where kin begin: the meadow (a disc round the start); the rest are ambient (collective.js keep). */
    zones: [{ r0: 12, r1: ROUTE.meadow }],
    /** The y of a given oxygen level (% air saturation). */
    bandY: oxygenY,
    /** Is (x, y) within √r2 µm of a feeding grazer's mouth? (members and kin are eaten there) */
    grazerMouthAt(x, y, r2 = 9) {
      for (let i = 0; i < feedingNow.length; i++) { const M = feedingNow[i].pose.mouth; if ((x - M.x) ** 2 + (y - M.y) ** 2 < r2) return true; }
      return false;
    },
    PARK, opts, hunt, grains, specks, eps, film, cells, phages, patches, grazers, amoeba, slab, surfaceY,
    oxygen, food, eat, insideAmoeba, pushOutOfGrains, grazerPose,
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
      for (const g of grazers) {
        g.pose = grazerPose(g);
        // stalk contraction: the spasmoneme coils in milliseconds, re-extends over seconds
        if (g.beaten) { g.contract = 1; g.ext = Math.max(0.12, g.ext - dt * 3); continue; } // beaten (guards.js): coiled on its stalk for good
        if (g.contract > 0) { g.contract -= dt; g.ext = Math.min(1, g.ext + dt / 3); if (g.contract <= 0) g.ext = 1; }
        else if (t > g.next) { g.contract = 3; g.ext = 0; g.next = t + 20 + r() * 15; }
      }
      // the amoeba's edge holds its gate: it slides a little toward the nearest player (≈1.4 µm/s,
      // leashed to its place); beaten (guards.js), it withdraws down into the sediment and stays there
      if (opts.amoeba && !amoeba.parked) {
        const H = amoeba.home;
        if (amoeba.beaten) {
          const tx = H.x + Math.cos(amoeba.bearing) * 90, ty = H.y + Math.sin(amoeba.bearing) * 90, dx = tx - amoeba.x, dy = ty - amoeba.y, d = Math.hypot(dx, dy);
          if (d > 0.5) { amoeba.x += (dx / d) * Math.min(d, 25 * dt); amoeba.y += (dy / d) * Math.min(d, 25 * dt); }
        } else {
          const dx = player.x - amoeba.x, dy = player.y - amoeba.y, d = Math.hypot(dx, dy);
          if (d < 90 && player.alive && hunt.amoeba) { amoeba.x += (dx / d) * amoeba.speed * dt; amoeba.y += (dy / d) * amoeba.speed * dt; }
          amoeba.x = Math.max(H.x - 12, Math.min(H.x + 12, amoeba.x));
          amoeba.y = Math.max(H.y - 25, Math.min(H.y + 25, amoeba.y));
        }
      }
      const sq = Math.sqrt(dt);
      const br = opts.brownian ? 1 : 0;
      // specks: Brownian (D = kT / 6πηr ≈ 0.22/r µm²/s) and carried by the feeding currents
      for (const p of specks) {
        const D = 0.22 / p.r;
        const f = feedingNow.length ? grazerFlow(p.x, p.y, tmpF) : (tmpF.x = tmpF.y = 0, tmpF);
        p.x += f.x * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
        p.y += f.y * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
        if (eatenByGrazer(p)) respawnFar(p, player);
      }
      // phages: D ≈ 4 µm²/s (a 60 nm head and tail)
      if (opts.phages) for (const p of phages) {
        if (p.stuck) continue;
        const f = feedingNow.length ? grazerFlow(p.x, p.y, tmpF) : (tmpF.x = tmpF.y = 0, tmpF);
        p.x += f.x * dt + br * 2.9 * sq * gauss(r);
        p.y += f.y * dt + br * 2.9 * sq * gauss(r);
        // the cloud hangs together (a game value: a real cloud would spread over minutes)
        if (p.cloud) { p.x += (p.cloud.x - p.x) * 0.25 * dt; p.y += (p.cloud.y - p.y) * 0.25 * dt; continue; }
        if (eatenByGrazer(p) || p.x < W.x0 || p.x > W.x1 || p.y < W.slabY - 10 || p.y > W.y1) respawnFar(p, player);
      }
      // free cells
      for (const c of cells) stepCell(c, dt, t, sq, br, player);
      // depleted patches are replaced by a new one elsewhere (a new lysis or decaying flake)
      for (let i = patches.length - 1; i >= 0; i--) {
        if (patches[i].amt < 0.06) {
          patches.splice(i, 1);
          let q = anywhere();
          for (let k = 0; k < 6 && Math.hypot(q.x - player.x, q.y - player.y) < 120; k++) q = anywhere();
          addPatch(q.x, q.y, r() < 0.4);
        }
      }
      if (phages.length > 260) phages.splice(0, phages.length - 260);
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
  function respawnFar(p, player) {
    for (let k = 0; k < 6; k++) {
      p.x = W.x0 + r() * (W.x1 - W.x0); p.y = W.slabY + r() * (W.y1 - W.slabY);
      if (Math.hypot(p.x - player.x, p.y - player.y) > 40) break;
    }
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
    const f = grazerFlow(c.x, c.y, tmpF);
    if (c.bdelloplast > 0 || c.attachedBy) {
      // a prey cell with a predator attached stops swimming; a bdelloplast is a sphere
      c.stopped = 1;
      if (c.bdelloplast > 0 && c.bdelloplast < 1) c.bdelloplast = Math.min(1, c.bdelloplast + dt / 1.5);
      c.x += f.x * dt * 0.3; c.y += f.y * dt * 0.3;
      return;
    }
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
    if (c.y < surfaceY(c.x) + 1) { c.y = surfaceY(c.x) + 1; c.a = -c.a; }
    if (c.y > W.y1 - 2) { c.y = W.y1 - 2; c.a = -c.a; }
    if (c.x < W.x0) c.x += W.x1 - W.x0;
    if (c.x > W.x1) c.x -= W.x1 - W.x0;
    // the pack keeps to its gate: beyond its reach a Bdellovibrio turns home
    if (c.home && Math.hypot(c.x - c.home.x, c.y - c.home.y) > c.home.r + 18) c.a = Math.atan2(c.home.y - c.y, c.home.x - c.x);
    pushOutOfGrains(c, c.r);
    if (feedingNow.length && eatenByGrazer(c)) { if (c.home) { c.x = c.home.x; c.y = c.home.y; } else { c.x = W.x0 + r() * (W.x1 - W.x0); c.y = W.slabY + 20 + r() * 150; } }
    void player; void t;
  }

  for (const g of grazers) g.pose = grazerPose(g);
  listFeeding();
  return world;
}
