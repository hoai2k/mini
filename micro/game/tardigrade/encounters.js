// The tardigrade's enemies and events, placed as you go by the encounter
// director (../shared/director.js; ../../design/encounter-pattern.md, "Placed
// as you go"). Scenery stays laid out before play (world.js): the shoot, the
// spokes of leaves, the food, the rotifer meadows (a harmless crowd you push
// through) and the dry patches (bare cells you walk round). The director
// places, in order: Milnesium in its water, then the pool at a rim leaf's tip
// with Prionchulus on guard (the boss and the way on). The walkable world is
// the spokes, so every spot is snapped to a leaf: Milnesium to the centre line
// of a wet leaf ahead of whoever leads, the portal to the tip of a rim leaf
// (the pool dips there and nowhere else). Units of 100 µm; the default view
// (12.5×) is 14.4 across; rushing (full tilt, scrambling) averages ~1.6/s.
import { RINGS, SPOKES, tipU } from './world.js';
import { PORTAL_IN } from './landmarks.js';

export const DIRECTOR = {
  // a 3D grid: the leaves lie between y -3.5 and +22 (the west spokes climb with leaf D), and the
  // view looks down through them, so what is seen is kept at the leaves' own height (cells 3 units)
  mode: '3d', cell: 3, seenDist: 22, nearSeen: 3, seed: 31,
  bounds: { x0: -99, x1: 99, z0: -99, z1: 99, y0: -6, y1: 27 },
  // the warm-up: ~5 s of moving; then a long calm (the meadow and the dry patches, scenery, come in it) before the pool
  warmup: { sec: 4.5 }, calm: { sec: 8 }, linger: 6, moveSpeed: 0.5,
  // seen but not gone to: met once everyone is ~2 screens off, or after 12 s in sight nearby (it is never moved)
  watchSec: 12, passDist: 34,
};

/**
 * The walkable spots: points on every leaf you can walk out on (the shoot's
 * flat leaves and every spoke leaf), on and either side of the centre line,
 * every half unit along it, with a coarse grid to find the nearest.
 */
export function walkSlots(world) {
  const list = [];
  const leaves = [...world.shoot.filter((L) => Math.abs(L.N.y) >= 0.7), ...world.spokes.flatMap((sp) => sp.leaves)];
  for (const L of leaves) {
    const uEnd = tipU(L) - 0.8;
    for (let u = 1.2; u <= uEnd; u += 0.5) for (const f of [0, -0.4, 0.4]) {
      const v = f * L.hwAt(u);
      if (!L.inside(u, v, 0.8)) continue;
      const p = L.toWorld(u, v, 0);
      list.push({ leaf: L, u, v, p, r: world.radius(p), spoke: L.spoke, film: world.filmAt(L, u, v) });
    }
  }
  const G = 3, grid = new Map(), key = (i, k) => i * 4096 + k;
  for (const s of list) { const k = key(Math.floor(s.p.x / G), Math.floor(s.p.z / G)); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(s); }
  /** The nearest walkable spot to (x, z) horizontally within maxD (and passing ok), or null. */
  function near(x, z, maxD, ok = null) {
    let best = null, bd = maxD;
    const i0 = Math.floor((x - maxD) / G), i1 = Math.floor((x + maxD) / G), k0 = Math.floor((z - maxD) / G), k1 = Math.floor((z + maxD) / G);
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) {
      const a = grid.get(key(i, k));
      if (a) for (const s of a) { const d = Math.hypot(s.p.x - x, s.p.z - z); if (d < bd && (!ok || ok(s))) { bd = d; best = s; } }
    }
    return best;
  }
  return { list, near };
}

/** The portal at spoke k's rim: the tip (where you go through), the pool beyond it, Prionchulus's post. */
export function rimOf(world, k) {
  const L = world.spokes[k].leaves.at(-1);
  const spot = L.toWorld(L.len - PORTAL_IN, 0, 0);
  return { k, leaf: L, spot, pool: L.toWorld(L.len + 8, 0, 0), post: L.toWorld(L.len - PORTAL_IN - RINGS.post, 0, 0) };
}

/** Milnesium's water on spot s (its centre), and how far it reaches (its water and its leash). */
const MZ = RINGS.milnesium;

/**
 * The encounters in order, for this world. main.js adds place and met;
 * route.test.mjs runs them without a browser.
 *   size     clearance (Milnesium's water and leash; the pool's arena)
 *   parts    what can be seen of it when placed, at the leaf's own height: unseen, out of view
 *   min/maxAhead  how far ahead of the leader it goes; min/maxNear when they linger
 */
export function encounters(world) {
  const slots = walkSlots(world);
  const rims = Array.from({ length: SPOKES }, (_, k) => rimOf(world, k));
  // The spoke whoever leads is heading out along (main.js sets it each step:
  // their leaf's spoke, or on the shoot the spoke nearest their heading), or
  // null (idle, or heading back in): "ahead" on a spoke is along that spoke.
  const E = { prefer: null };
  const onWay = (k) => E.prefer === null || k === E.prefer;
  /** Where Milnesium can browse: a wet leaf, out past the shoot's middle, short of the rims (the boss's arena). */
  const okMil = (s) => s.film > 0.3 && s.r > 9 && s.r < RINGS.portal - RINGS.post - 9 && onWay(s.spoke);
  const milAt = (x, z) => slots.near(x, z, 1.8, okMil);
  const rimAt = (x, z) => { let best = null, bd = 4; for (const R of rims) { const d = Math.hypot(R.spot.x - x, R.spot.z - z); if (d < bd && onWay(R.k)) { bd = d; best = R; } } return best; };
  return Object.assign(E, {
    slots, rims, milAt, rimAt,
    list: [
      { id: 'milnesium', size: MZ.r + MZ.leash, minAhead: 12, maxAhead: 18, minNear: 10, maxNear: 16,
        fits: (x, z) => !!milAt(x, z),
        // its body (~5 long) as three slim discs along the leaf, at the leaf's height
        parts: (x, z) => { const s = milAt(x, z); if (!s) return [[x, z, 1.4]]; const U = s.leaf.U; return [-1.7, 0, 1.7].map((k) => [s.p.x + U.x * k, s.p.z + U.z * k, 1.4, s.p.y + U.y * k + 0.5]); } },
      // the boss and the way on: the pool beyond a rim leaf's tip, the golden sparkle over it, Prionchulus on its post
      { id: 'portal', size: 12, minAhead: 14, maxAhead: 40, minNear: 14, maxNear: 40, final: true, calm: { sec: 16 },
        fits: (x, z) => !!rimAt(x, z),
        parts: (x, z) => { const R = rimAt(x, z); if (!R) return [[x, z, 4]]; const g = R.spot; return [[g.x, g.z, 3, g.y + 0.5], [g.x, g.z, 3, g.y + 5], [R.pool.x, R.pool.z, 8, R.pool.y], [R.post.x, R.post.z, 2.6, R.post.y + 0.5]]; } },
    ],
  });
}
/**
 * The spoke a walker heading out is on its way along: its leaf's spoke, or on
 * the shoot the spoke whose exit it is heading for; null when it is idle or
 * heading back in.
 */
export function wayOut(world, leaf, p, vx, vz) {
  const sp = Math.hypot(vx, vz);
  if (sp < 0.3) return null;
  const rx = p.x - world.start.x, rz = p.z - world.start.z, r = Math.hypot(rx, rz);
  if (r > 3 && (rx * vx + rz * vz) / (r * sp) < 0.2) return null; // heading back in, or across
  if (leaf && leaf.spoke >= 0) return leaf.spoke;
  // on the shoot: the spoke whose way off the shoot (its exit) it is heading for
  let best = null, bc = -2;
  for (const s of world.spokes) {
    const dx = s.exit.p.x - p.x, dz = s.exit.p.z - p.z, d = Math.hypot(dx, dz);
    const c = d < 1.5 ? Math.cos(s.a - Math.atan2(vz, vx)) : (dx * vx + dz * vz) / (d * sp);
    if (c > bc) { bc = c; best = s.k; }
  }
  return best;
}
/**
 * The world's forward (the owner, 2026-11-03: the camera's turn is locked to it). main.js's camera sits
 * at (sin, cos) of FORWARD_YAW (5π/3) from its target, so it looks along -(sin, cos): straight ahead on the
 * screen is the bearing FORWARD (atan2(z, x): -30°, i.e. 330°), out along the start leaf's spoke.
 */
export const FORWARD_YAW = Math.atan2(1, 0) + Math.PI + Math.PI / 6;
export const FORWARD = Math.atan2(-Math.cos(FORWARD_YAW), -Math.sin(FORWARD_YAW));
/**
 * The default path (shared/director.js `defaultPath`; the owner, 2026-11-01: "a default path to a portal,
 * but just dynamically generate the other directions if the player goes off in another direction"): the
 * walkable world is the spokes, so the path runs out along one of them, PATH_SPOKE: the spoke straight
 * ahead, along the forward (the owner, 2026-11-03: "with the new camera, we should have the default path
 * be straight forward essentially ... make the forward path the one of discovery"; it was the 240° spoke,
 * across the view). Milnesium ~2.2 mm out on one of its wet leaves (where a rush meets it), the pool at its
 * rim (8.4 mm), both from the first frame. main.js (and route.test.mjs) set E.prefer to that spoke while
 * the path is laid, so both snap to it. The cone (0.4 rad) keeps the neighbouring spokes (0.52 rad off)
 * off the path.
 */
export const PATH_SPOKE = ((Math.round(FORWARD / ((2 * Math.PI) / SPOKES)) % SPOKES) + SPOKES) % SPOKES;
export function defaultPathFor(world, k = PATH_SPOKE) {
  const S = world.start, R = rimOf(world, k), g = R.spot;
  const h = Math.hypot(g.x - S.x, g.z - S.z), d = Math.hypot(h, g.y - S.y);
  return { from: { x: S.x, y: S.y, z: S.z }, bearing: world.spokes[k].a, elevation: Math.atan2(g.y - S.y, h), dists: [22, d], cone: 0.4, spoke: k };
}
/** Anything placed stays inside the patch. */
export const canPlace = (x, z) => Math.hypot(x, z) < 96;
