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
// (world.js TILE); the walkable ground is a corridor running "north" along the
// world's forward (FORWARD: straight up the screen with the locked camera;
// the owner, 2026-11-04: "make it a bit more linear ... we basically know the
// direction we have to go"): the start near its south wall, the side walls
// either side of the straight route, the portal up north and the north wall
// past it, each so many seconds of walking away (micro/game_config.js
// `mite.*WallSeconds`). Its edge is the edge of the moss cushion: a wall of
// tall, close-packed Sphagnum shoots (EDGE; edge.js draws it) that the walker
// stops against (mite.js clamps the body inside its faces: clampInside).
import { section } from '../shared/config.js';

/** game_config.js `mite.*` (with the defaults this world was built with). */
export const M = section('mite');

/** Distance from the start (µm). */
export const distFromStart = (x, z) => Math.hypot(x, z);
/** Bearing from the start (radians, atan2(z, x)). */
export const bearingFromStart = (x, z) => Math.atan2(z, x);
/** A point `r` µm from the start at bearing `a`. */
export const ringPoint = (r, a) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });

/**
 * The world's forward (the owner, 2026-11-03: the camera's turn is locked to it). The camera looks along
 * -(cos, sin) of FORWARD_YAW (main.js), so straight ahead on the screen is the bearing FORWARD from the
 * start (~2.02 rad: toward -x and +z, a little left of the opening view's OPENING). "North" is FORWARD.
 */
export const FORWARD_YAW = -0.6 - Math.PI / 6;
export const FORWARD = FORWARD_YAW + Math.PI;

/**
 * The encounters' pacing (game_config.js `mite.warmupSeconds` ...): the calm break before each (s), and how
 * far ahead of the leader each is placed (µm; min/max). The default path lays them out at the distances a
 * rush meets them at (DEFAULT_PATH below), so the portal's distance up the corridor follows from these.
 */
export const PACE = {
  warmup: M('warmupSeconds', 4), calm: M('calmSeconds', 4.5), drop: M('calmBeforeDropSeconds', 3), portal: M('calmBeforePortalSeconds', 6),
};
const AHEAD = { mites: [3000, 4600], pred: [3800, 5800], drip: [2600, 3800], drips: [3000, 4400], portal: [5200, 7800] };
const ORDER_SPEC = [['mites', 'warmup'], ['pred', 'calm'], ['drip', 'drop'], ['pred2', 'calm', 'pred'], ['drips', 'drop'], ['pred3', 'calm', 'pred'], ['portal', 'portal']];
/** A rush between encounters (µm/s; shared/director.js `defaultPath.rush`): full tilt with every scramble. */
export const RUSH = 1100;
/** Each encounter's distance up the default path (µm from the start; shared/director.js's own rule: each break at RUSH, then the middle of its ahead range). */
export const PATH_DISTS = (() => { let d = 0; return ORDER_SPEC.map(([id, calm, as]) => { const [a, b] = AHEAD[as || id]; d += RUSH * PACE[calm]; return (d += (a + b) / 2); }); })();
/** How far up the corridor the water (the portal) lies, µm from the start. */
export const PORTAL_ALONG = PATH_DISTS[PATH_DISTS.length - 1];

/**
 * The corridor (the owner, 2026-11-04: "we start kind of close to the south side of the world, where we could
 * hit the south wall by walking south for 10 seconds or so, and then the east and west walls are somewhere
 * around 10 seconds out in each direction, and the final north wall is 10 seconds past the portal").
 * Coordinates along it: `a` µm north of the start (along FORWARD), `c` µm across (west: to the left of the
 * route on the screen, looking north; so (c, a) is a turn of (x, z), not a mirror). The faces of its walls stand at a = -south and a = north, and c = ±side, each the
 * seconds in game_config.js times WALK_FOR_WALLS (the stick at full tilt).
 */
export const WALK_FOR_WALLS = M('walkingSpeedForWallSeconds', 878);
export const WALL_SECONDS = { south: M('southWallSeconds', 10), side: M('sideWallSeconds', 10), north: M('northWallSecondsPastPortal', 10) };
const UX = Math.cos(FORWARD), UZ = Math.sin(FORWARD); // north
const PX = UZ, PZ = -UX;                               // west, screen-left (so (west, north) is a rotation of (x, z))
/** Corridor coordinates of a world point: { a (north of the start), c (west of the route, screen-left) }. */
export const toCorridor = (x, z, out = { a: 0, c: 0 }) => { out.a = x * UX + z * UZ; out.c = x * PX + z * PZ; return out; };
/** The world point at corridor coordinates (a north, c west). */
export const fromCorridor = (a, c, out = { x: 0, z: 0 }) => { out.x = UX * a + PX * c; out.z = UZ * a + PZ * c; return out; };

/**
 * The edge of the cushion (edge.js): a band of tall Sphagnum shoots standing shoulder to shoulder all round
 * the corridor. Its inner faces are a = -south, a = north and c = ±side (µm, corridor coordinates): the front
 * row's stems touch them and nothing of the band reaches inside below `clear` µm up, so the walker's clamp
 * (mite.js: the body's centre kept its own reach inside the faces, on the ground and in the air) is exactly
 * where the mite meets the stems. The shoots stand `height` µm tall (several times a jump's ~1.1 mm apex and
 * taller than the camera stands at the default zoom), `depth` µm deep, and shed leaves lie on the floor for
 * `apron` µm in front of them, thickening toward the wall (the cue while it is still out of frame). The
 * corners are covered: the north and south bands run on past them. ux/uz is north, px/pz west (screen-left).
 */
export const EDGE = {
  south: WALL_SECONDS.south * WALK_FOR_WALLS,
  side: WALL_SECONDS.side * WALK_FOR_WALLS,
  north: PORTAL_ALONG + WALL_SECONDS.north * WALK_FOR_WALLS,
  depth: 2400, height: [6000, 9000], clear: 900, apron: 2200,
  ux: UX, uz: UZ, px: PX, pz: PZ,
};
const _cc = { a: 0, c: 0 };
/** How far (x, z) is inside the nearest wall face (µm; negative outside). */
export const edgeDist = (x, z) => { toCorridor(x, z, _cc); return Math.min(_cc.a + EDGE.south, EDGE.north - _cc.a, EDGE.side - Math.abs(_cc.c)); };
/** Is (x, z) inside the walls' faces by more than m µm? */
export const insideEdge = (x, z, m = 0) => edgeDist(x, z) > m;
/** (x, z) moved inside the faces by at least m µm (unchanged when it already is): { x, z }. */
export function clampInside(x, z, m = 0, out = { x: 0, z: 0 }) {
  toCorridor(x, z, _cc);
  const a = Math.min(EDGE.north - m, Math.max(-EDGE.south + m, _cc.a)), c = Math.min(EDGE.side - m, Math.max(-EDGE.side + m, _cc.c));
  if (a === _cc.a && c === _cc.c) { out.x = x; out.z = z; return out; }
  return fromCorridor(a, c, out);
}
/**
 * The walkable area's bounding square (the director's seen grid covers it; the floor repeats beyond it):
 * the corridor's corners, rounded out.
 */
const CORNERS = [[-EDGE.south, -EDGE.side], [-EDGE.south, EDGE.side], [EDGE.north, -EDGE.side], [EDGE.north, EDGE.side]].map(([a, c]) => fromCorridor(a, c, {}));
export const BOUNDS = {
  x0: Math.floor(Math.min(...CORNERS.map((p) => p.x)) - 1000), x1: Math.ceil(Math.max(...CORNERS.map((p) => p.x)) + 1000),
  z0: Math.floor(Math.min(...CORNERS.map((p) => p.z)) - 1000), z1: Math.ceil(Math.max(...CORNERS.map((p) => p.z)) + 1000),
};
BOUNDS.half = Math.max(-BOUNDS.x0, BOUNDS.x1, -BOUNDS.z0, BOUNDS.z1);
/** Half the bounding square's width (µm). */
export const HALF = BOUNDS.half;
/** Where the hidden, unplaced creatures wait (the predator, the family): behind the south wall, out of play. */
export const PARK = fromCorridor(-EDGE.south - EDGE.depth - 3000, 0, {});

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
/**
 * Thickets along the forward route (the owner, 2026-11-03: "I went forward a long way ... I saw lots of
 * springtails, but that was about it"): past the inner ring the forward line had nothing but springtail
 * groups and beads for ~15 mm, and past the outer ring for ~45 mm. These stand in the gaps between the
 * default path's encounters, to alternate sides of the line, their edges ~0.6 mm off it: a walker going
 * straight ahead skirts each one (the hyphae and their springtails at the side of the view).
 */
export const FORWARD_THICKETS = [12600, 28800, 37900, 46200, 57500];
export function forwardClusters() {
  const ux = Math.cos(FORWARD), uz = Math.sin(FORWARD);
  return FORWARD_THICKETS.map((d, i) => {
    const side = (i % 2 ? -1 : 1) * (CLUSTER.r + 650);
    return { x: ux * d - uz * side, z: uz * d + ux * side, r: CLUSTER.r, ring: 2, i, a: FORWARD };
  });
}
/** A thicket stands inside the corridor (its whole disc and its springtails clear of the wall and its shed leaves). */
export const clusterInside = (c) => insideEdge(c.x, c.z, c.r + EDGE.apron * 0.5);
/** Every thicket cluster (those of the rings that fall inside the corridor, and the forward ones). */
export const CLUSTERS = [...clusterRing(0), ...clusterRing(1), ...forwardClusters()].filter(clusterInside);

/** The predator's hunting ground: radius r round where it is placed; it gives up a chase `chase` past r. */
export const PRED_GROUND = { r: 1100, chase: 1100 }; // (it notices a mite within 0.9 mm of the ground: predator.js)
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
  bounds: { x0: BOUNDS.x0, x1: BOUNDS.x1, z0: BOUNDS.z0, z1: BOUNDS.z1 },
  // the warm-up: ~4 s of moving over open moss; a calm break of ~4.5 s of moving clear of the last
  // (the owner, 2026-11-02: "there should be more frequent encounters"; game_config.js mite.warmupSeconds ...)
  warmup: { sec: PACE.warmup }, calm: { sec: PACE.calm }, linger: 6, moveSpeed: 120,
  // "ahead" is the way they have gone over ~2.5 s, straight ahead preferred (a step round a stem or a thicket
  // does not swing the next encounter off the line they are walking)
  headingSec: 2.5, aheadBias: 2,
  // seen but not gone to: met once everyone is ~2 screens past it, or after 12 s in sight nearby (it is never moved)
  watchSec: 12, passDist: 6000,
};
/**
 * The default path (shared/director.js `defaultPath`; the owner, 2026-11-01: "a default path to a portal,
 * but just dynamically generate the other directions if the player goes off in another direction"): the
 * whole order is laid out on the first frame at the distances a rush (~1100 µm/s) would meet them
 * (PATH_DISTS: the family ~8 mm out, the predator's grounds ~17, ~34 and ~51 mm, the drops ~24 and ~41 mm,
 * the water ~64 mm), so the way on exists from the start. It runs straight ahead along the world's forward
 * (FORWARD; the owner, 2026-11-03: "with the new camera, we should have the default path be straight
 * forward essentially ... make the forward path the one of discovery"), up the middle of the corridor, each
 * as near the line as it fits (`lateral`: up to 1.6 mm aside, nearer and farther along it first), so walking
 * screen-up meets them in turn. Off the line they are placed as you go, as before (each is one object:
 * `single`), inside the corridor; the water only ever up at its north end (its `fits`).
 */
export const DEFAULT_PATH = { from: { x: 0, z: 0 }, bearing: FORWARD, rush: RUSH, dists: PATH_DISTS, lateral: [0, 400, -400, 800, -800, 1200, -1200, 1600, -1600] };
/** The predator's ground placed at (x, z): clear of the thickets (a chase may run into one: it eats springtails there), the giant springtail and the second box mite. */
const predFits = (x, z) => clearOfThickets(x, z, PRED_GROUND.r, 150)
  && Math.hypot(x - BACK_AT.x, z - BACK_AT.z) > 2600 && Math.hypot(x - NPC_HOME.x, z - NPC_HOME.z) > 2200;
const PRED = {
  size: PRED_GROUND.r + PRED_GROUND.chase + 100, visible: 650,
  minAhead: AHEAD.pred[0], maxAhead: AHEAD.pred[1], minNear: 2600, maxNear: 4000, fits: predFits,
};
/**
 * A drop of water falling into the moss (one, or a shower of three), µm: its radius, how far its splash
 * reaches (the predator there staggers), how near someone must come to its spot to set it falling, the
 * height it falls from, the shower's size and the spread of its armed spots. Set falling, each drop lands
 * at a random spot round whoever came near, never aimed at anyone: at least `clear` from every player and
 * at most `scatter` from them (in sight); a ring marks the spot `warn` s before it lets go.
 * A mite in the bead it leaves moves at `slow` of its speed and struggles out (no daze, no harm).
 */
export const DRIP = { r: 230, splash: 520, trigger: 2600, height: 2600, shower: 3, spread: 700, clear: 900, scatter: 2000, warn: 0.8, slow: 0.4 };
/** The box-mite family: how many, how far they wander from their spot (µm). */
export const FAMILY = { n: 3, r: 700 };
const dripFits = (x, z) => clearOfThickets(x, z, 600, 100) && Math.hypot(x - BACK_AT.x, z - BACK_AT.z) > 1800;
/** The water stays at the corridor's north end (its distance north within these of PORTAL_ALONG), so the north wall is always its seconds past it. */
export const PORTAL_SPAN = [-1500, 600];
const portalNorth = (x, z) => { const a = toCorridor(x, z, {}).a - PORTAL_ALONG; return a >= PORTAL_SPAN[0] && a <= PORTAL_SPAN[1]; };
// The order rises in threat (the owner, 2026-11-02: "more dangerous creatures indicating that you are closer
// to your goal"): harmless company, the predator, a drop, the predator hungrier and faster, a shower, the
// predator at its hungriest and fastest, then the pseudoscorpion at the water.
export const ENCOUNTERS = [
  // a family of box mites grazing (company: they close up as you come; placed round a lingering player, they wander over)
  { id: 'mites', size: FAMILY.r + 400, visible: FAMILY.r + 300, minAhead: AHEAD.mites[0], maxAhead: AHEAD.mites[1], minNear: 2400, maxNear: 3600, fits: (x, z) => clearOfThickets(x, z, FAMILY.r, 150) && Math.hypot(x - NPC_HOME.x, z - NPC_HOME.z) > 1600 && Math.hypot(x - BACK_AT.x, z - BACK_AT.z) > 2200 },
  // the predatory mite on its hunting ground (it starts at the spot itself; the ground is invisible)
  { id: 'pred', ...PRED },
  // a drop of water falls into the moss round you (rain drips through a moss cushion), never on you; nothing shows until it falls (visible: its spot)
  { id: 'drip', calm: { sec: PACE.drop }, size: DRIP.splash + 500, visible: 150, minAhead: AHEAD.drip[0], maxAhead: AHEAD.drip[1], minNear: 1000, maxNear: 1450, fits: dripFits },
  // and again, a way on (the same one: it has gone on through the moss, out of sight), hungrier
  { id: 'pred2', ...PRED },
  // a shower: three drops scattered in the moss round you
  { id: 'drips', calm: { sec: PACE.drop }, size: DRIP.splash + DRIP.spread + 500, visible: 150, minAhead: AHEAD.drips[0], maxAhead: AHEAD.drips[1], minNear: 1000, maxNear: 1450, fits: dripFits },
  // the third time, in the wetter moss toward the water: at its hungriest
  { id: 'pred3', ...PRED },
  // the boss and the way on: the wet leaf axil (its stem 1.5 mm tall, the glow over it) and the pseudoscorpion on its post, at the corridor's north end
  { id: 'portal', size: PORTAL_CLEAR + 900, top: 2400, minAhead: AHEAD.portal[0], maxAhead: AHEAD.portal[1], minNear: 3600, maxNear: 5200, final: true, calm: { sec: PACE.portal },
    parts: (x, z, b) => { const P = portalAt(b, x, z); return [[x, z, PORTAL_CLEAR], [P.post.x, P.post.z, 1100], [P.home.x, P.home.z, 700]]; },
    fits: (x, z, b) => { const P = portalAt(b, x, z); return portalNorth(x, z) && clearOfThickets(x, z, PORTAL_CLEAR, 200) && clearOfThickets(P.post.x, P.post.z, 1100, 200) && clearOfThickets(P.home.x, P.home.z, 700, 100) && insideEdge(P.home.x, P.home.z, 700 + 400) && insideEdge(P.post.x, P.post.z, 1100 + 400) && Math.hypot(x - BACK_AT.x, z - BACK_AT.z) > 4000; } },
];
/** Anything placed stays inside the corridor, its whole clearance disc clear of the walls (and most of their shed leaves). */
export const canPlace = (x, z, r) => insideEdge(x, z, r + 1200);
