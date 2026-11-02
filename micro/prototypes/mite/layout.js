// Where things are in the mite's moss (µm). The start is the origin.
//
// Scenery is laid out before play (the moss tile everywhere, the two rings of
// hyphal thickets full of springtails, the second box mite, the giant
// springtail; and, everywhere, little groups of springtails and water beads
// that grow commoner as the water nears: life.js): you can walk round all of
// it. The enemies and events (a family of box mites, the predatory mite, a
// falling drop, the predatory mite hungrier, a shower of drops, the predatory
// mite at its hungriest, then the pseudoscorpion on guard at the portal, the
// wet leaf axil: rising in threat) are placed as you go by the encounter director
// (../shared/director.js; ../../design/encounter-pattern.md, "Placed as you
// go"): in order, in moss nobody has seen yet, a short way ahead of whoever
// leads, after a warm-up and a calm break each. DIRECTOR and ENCOUNTERS below
// are its settings (main.js adds place and met; route.test.mjs runs them
// without a browser). Rushing (full tilt with every scramble) meets them all
// and reaches the portal in a little over a minute; dealing with them, a few.
// The moss itself is one 9.6 mm scenery tile repeated in every direction
// (world.js TILE), so there is no edge to walk off; the walkable square
// (BOUNDS) is ~1 m across, many minutes of rushing from the start, and its
// edge says so when you reach it (main.js edgeNote).

/** Distance from the start (µm). */
export const distFromStart = (x, z) => Math.hypot(x, z);
/** Bearing from the start (radians, atan2(z, x)). */
export const bearingFromStart = (x, z) => Math.atan2(z, x);
/** A point `r` µm from the start at bearing `a`. */
export const ringPoint = (r, a) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });

/** The thickets' rings (µm from the start; scenery: every way out meets them, and you can walk round them). */
export const RINGS = {
  warm: 3800,             // the open moss round the start: the first thickets begin here
  thicket: [5000, 20300], // the two thicket rings (cluster centres; alternate clusters 350 µm in and out)
};
/** A thicket cluster: radius, and the spacing of clusters along their ring (µm of arc). */
export const CLUSTER = { r: 820, spacing: 2350, stagger: 350, posts: 34 };
/** The clusters of one thicket ring: [{ x, z, r, ring, i }] (deterministic). */
export function clusterRing(k) {
  const R = RINGS.thicket[k];
  const n = Math.max(6, Math.round((2 * Math.PI * R) / CLUSTER.spacing));
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + k * 0.37;
    const r = R + (i % 2 ? CLUSTER.stagger : -CLUSTER.stagger);
    out.push({ ...ringPoint(r, a), r: CLUSTER.r, ring: k, i, a });
  }
  return out;
}
/** Every thicket cluster. */
export const CLUSTERS = [...clusterRing(0), ...clusterRing(1)];

/** The predator's hunting ground: radius r round where it is placed; it gives up a chase `chase` past r. */
export const PRED_GROUND = { r: 1100, chase: 700 };
export const predZoneAt = (x, z) => ({ x, z, r: PRED_GROUND.r });

/**
 * The portal: the water in the leaf axil at (x, z), met coming along bearing
 * a (outward, from the player who leads), the pseudoscorpion's post 600 µm
 * before it and 500 µm to the side (its long abdomen lies alongside the
 * water, not over it), and how near its post wakes it.
 */
export const BOSS = { before: 600, side: -500, wake: 900, leash: 2600, lose: 3600 };
export function portalAt(a, x, z) {
  const ux = Math.cos(a), uz = Math.sin(a); // outward
  const sx = -uz, sz = ux;                  // to the right looking outward
  const post = { x: x - ux * BOSS.before + sx * BOSS.side, z: z - uz * BOSS.before + sz * BOSS.side };
  // it faces back toward the way you come; worn down it backs off into the moss to the side
  const home = { x: post.x + sx * 1300, z: post.z + sz * 1300 };
  return { a, x, z, ux, uz, post: { ...post, a: a + Math.PI, ux: -ux, uz: -uz }, home };
}
/** The moss kept clear round the portal (stems and leaves only; its arena), µm. */
export const PORTAL_CLEAR = 1500;

/**
 * The walkable square (the floor repeats beyond it; the walker keeps inside).
 * It was 87 mm across (the owner, 2026-11-02, walked into its edge: "a wall
 * where it didn't look like there was a wall"); now 0.96 m, over 7 minutes of
 * scrambling straight out, so in play the moss has no edge. The director's
 * seen grid covers it (0.5 mm cells: ~3.7 M bytes).
 */
export const HALF = 480000;
export const BOUNDS = { x0: -HALF, x1: HALF, z0: -HALF, z1: HALF, cx: 0, cz: 0, half: HALF };

/** Where the opening view looks (up and right on screen). */
const DX = -1500, DZ = 1030, DL = Math.hypot(DX, DZ);
export const OPENING = { ux: DX / DL, uz: DZ / DL };
/** The second box mite's patch (by the start). */
export const NPC_HOME = { x: OPENING.ux * 1300 - OPENING.uz * 200, z: OPENING.uz * 1300 + OPENING.ux * 200 };
/** The giant springtail (the backdoor), behind the start view: landmarks.js BACKDOOR. */
const BACK_AT = { x: 1450, z: -1000 };

/** Is a disc (x, z, r) clear of every thicket (by `pad` more)? */
export function clearOfThickets(x, z, r, pad = 0) {
  for (const c of CLUSTERS) if (Math.hypot(c.x - x, c.z - z) < r + c.r + pad) return false;
  return true;
}

/**
 * The director's settings (shared/director.js) and the encounters in order.
 * Distances in µm: the opening view is 1.6 mm across (its footprint on the
 * moss ~1.6 mm, up to 4.2 mm in a boss fight); rushing averages ~730 µm/s.
 *   size     clearance (the predator's ground and its chase; the portal's arena)
 *   visible  / parts: what can be seen of it when placed: unseen moss, out of view
 *   top      how tall (the axil's stem and the glow over it)
 *   min/maxAhead  how far ahead of the leader it goes; min/maxNear when they linger
 */
export const DIRECTOR = {
  cell: 500, seenDist: 4200, nearSeen: 450, seed: 29,
  bounds: { x0: -HALF + 2500, x1: HALF - 2500, z0: -HALF + 2500, z1: HALF - 2500 },
  // the warm-up: ~4 s of moving over open moss; a calm break of ~4.5 s of moving clear of the last
  // (the owner, 2026-11-02: "there should be more frequent encounters")
  warmup: { sec: 4 }, calm: { sec: 4.5 }, linger: 6, moveSpeed: 120,
  // seen but not gone to: met once everyone is ~2 screens past it, or after 12 s in sight nearby (it is never moved)
  watchSec: 12, passDist: 6000,
};
/**
 * The default path (shared/director.js `defaultPath`; the owner, 2026-11-01: "a default path to a portal,
 * but just dynamically generate the other directions if the player goes off in another direction"): the
 * predator's two grounds and the wet leaf axil with its pseudoscorpion are laid out along one bearing from
 * the start on the first frame, at the distances a rush (~730 µm/s) would meet them (~8, ~19 and ~32 mm
 * out), so the way on exists from the start. The bearing runs off to the side of the opening view (which
 * looks along OPENING, ~2.5 rad) and away from the giant springtail behind it. Off that bearing they are
 * placed as you go, as before (each is one object: `single`).
 */
export const DEFAULT_PATH = { from: { x: 0, z: 0 }, bearing: -2.6, rush: 1100 };
/** The predator's ground placed at (x, z): clear of the thickets (a chase may run into one: it eats springtails there), the giant springtail and the second box mite. */
const predFits = (x, z) => clearOfThickets(x, z, PRED_GROUND.r, 150)
  && Math.hypot(x - BACK_AT.x, z - BACK_AT.z) > 2600 && Math.hypot(x - NPC_HOME.x, z - NPC_HOME.z) > 2200;
const PRED = {
  size: PRED_GROUND.r + PRED_GROUND.chase + 100, visible: 650,
  minAhead: 3800, maxAhead: 5800, minNear: 2600, maxNear: 4000, fits: predFits,
};
/** A drop of water falling into the moss (one, or a shower of three round the spot): where it lands and how far it splashes, µm. */
export const DRIP = { r: 230, splash: 520, trigger: 1500, height: 2600, shower: 3, spread: 700 };
/** The box-mite family: how many, how far they wander from their spot (µm). */
export const FAMILY = { n: 3, r: 700 };
const dripFits = (x, z) => clearOfThickets(x, z, 600, 100) && Math.hypot(x - BACK_AT.x, z - BACK_AT.z) > 1800;
// The order rises in threat (the owner, 2026-11-02: "more dangerous creatures indicating that you are closer
// to your goal"): harmless company, the predator, a drop, the predator hungrier and faster, a shower, the
// predator at its hungriest and fastest, then the pseudoscorpion at the water.
export const ENCOUNTERS = [
  // a family of box mites grazing (company: they close up as you come; placed round a lingering player, they wander over)
  { id: 'mites', size: FAMILY.r + 400, visible: FAMILY.r + 300, minAhead: 3000, maxAhead: 4600, minNear: 2400, maxNear: 3600, fits: (x, z) => clearOfThickets(x, z, FAMILY.r, 150) && Math.hypot(x - NPC_HOME.x, z - NPC_HOME.z) > 1600 && Math.hypot(x - BACK_AT.x, z - BACK_AT.z) > 2200 },
  // the predatory mite on its hunting ground (it starts at the spot itself; the ground is invisible)
  { id: 'pred', ...PRED },
  // a drop of water falls into the moss ahead (rain drips through a moss cushion); nothing shows until it falls (visible: its spot)
  { id: 'drip', calm: { sec: 3 }, size: DRIP.splash + 500, visible: 150, minAhead: 2600, maxAhead: 3800, minNear: 1000, maxNear: 1450, fits: dripFits },
  // and again, a way on (the same one: it has gone on through the moss, out of sight), hungrier
  { id: 'pred2', ...PRED },
  // a shower: three drops round the spot
  { id: 'drips', calm: { sec: 3 }, size: DRIP.splash + DRIP.spread + 500, visible: 150, minAhead: 3000, maxAhead: 4400, minNear: 1000, maxNear: 1450, fits: dripFits },
  // the third time, in the wetter moss toward the water: at its hungriest
  { id: 'pred3', ...PRED },
  // the boss and the way on: the wet leaf axil (its stem 1.5 mm tall, the glow over it) and the pseudoscorpion on its post
  { id: 'portal', size: PORTAL_CLEAR + 900, top: 2400, minAhead: 5200, maxAhead: 7800, minNear: 3600, maxNear: 5200, final: true, calm: { sec: 6 },
    parts: (x, z, b) => { const P = portalAt(b, x, z); return [[x, z, PORTAL_CLEAR], [P.post.x, P.post.z, 1100], [P.home.x, P.home.z, 700]]; },
    fits: (x, z, b) => { const P = portalAt(b, x, z); return clearOfThickets(x, z, PORTAL_CLEAR, 200) && clearOfThickets(P.post.x, P.post.z, 1100, 200) && clearOfThickets(P.home.x, P.home.z, 700, 100) && Math.hypot(x - BACK_AT.x, z - BACK_AT.z) > 4000; } },
];
/** Anything placed stays well inside the walkable square. */
export const canPlace = (x, z, r) => Math.abs(x) < HALF - 2000 - r * 0.5 && Math.abs(z) < HALF - 2000 - r * 0.5;
