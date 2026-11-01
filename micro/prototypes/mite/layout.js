// Where things are in the mite's moss (µm): rings round the start, the same in
// every direction (the encounter pattern, micro/design/encounter-pattern.md).
// The start is the origin. Whichever way you walk you meet, in turn:
//
//   from (µm)        what
//   0 - 3800         warm-up: open moss, spores and hyphal tips to graze, the second box mite
//   3800 - 6200      the first ring of hyphal thickets, full of springtails (the crowd)
//   ~10900 - 13100   the predatory mite's hunting ground (one predator, moved round its ring)
//   ~18600 - 21000   the second ring of thickets
//   ~26400 - 28600   the predatory mite again (the same one, moved out to its outer ring)
//   ~34500 on        the pseudoscorpion on guard (it wakes 0.9 mm from its post)
//   36000            the portal: a wet leaf axil (the way to the tardigrade's water film)
//
// with calm stretches of ~5-6 mm (7-9 s of hurrying) between. Rushing straight
// out (hurrying with every scramble) takes about a minute; dealing with them,
// about three. The moss itself is one 9.6 mm scenery tile repeated in every
// direction (world.js TILE), so there is no edge to walk off; the walkable
// square (BOUNDS) reaches 6 mm past the portal ring.

/** Distance from the start (µm). */
export const distFromStart = (x, z) => Math.hypot(x, z);
/** Bearing from the start (radians, atan2(z, x)). */
export const bearingFromStart = (x, z) => Math.atan2(z, x);
/** A point `r` µm from the start at bearing `a`. */
export const ringPoint = (r, a) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });

/** The portal ring: the wet leaf axil's water lies this far out, at the bearing it is placed on. */
export const PORTAL_R = 36000;
/** The rings (µm from the start). */
export const RINGS = {
  warm: 3800,          // warm-up ends: the first thickets begin
  thicket: [5000, 19800], // the two thicket rings (cluster centres; alternate clusters 350 µm in and out)
  pred: [12000, 27500],   // the predator's two rings (its hunting ground's centre)
  portal: PORTAL_R,
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

/** The predator's hunting ground on ring k at bearing a: { x, z, r } (its leash: `chase` past r). */
export const PRED_GROUND = { r: 1100, chase: 700 };
export function predZoneAt(k, a) { return { ...ringPoint(RINGS.pred[k], a), r: PRED_GROUND.r }; }

/**
 * The portal at bearing a: the water in the leaf axil, the pseudoscorpion's
 * post 600 µm before it and 500 µm to the side (its long abdomen lies
 * alongside the water, not over it), and how near its post wakes it.
 */
export const BOSS = { before: 600, side: -500, wake: 900, leash: 2600, lose: 3600 };
export function portalAt(a) {
  const ux = Math.cos(a), uz = Math.sin(a); // outward
  const sx = -uz, sz = ux;                  // to the right looking outward
  const w = ringPoint(PORTAL_R, a);
  const post = { x: w.x - ux * BOSS.before + sx * BOSS.side, z: w.z - uz * BOSS.before + sz * BOSS.side };
  // it faces back toward the start; worn down it backs off into the moss to the side
  const home = { x: post.x + sx * 1300, z: post.z + sz * 1300 };
  return { a, x: w.x, z: w.z, ux, uz, post: { ...post, a: a + Math.PI, ux: -ux, uz: -uz }, home };
}
/** When the portal is placed: the first player to get this far out (it appears out of everyone's view, on the ring). */
export const PORTAL_PLACE = PORTAL_R - 8000;
/** The moss kept clear round the portal (stems and leaves only; its arena), µm. */
export const PORTAL_CLEAR = 1500;

/** The walkable square (the floor repeats beyond it; the walker keeps inside). */
export const HALF = PORTAL_R + 6000;
export const BOUNDS = { x0: -HALF, x1: HALF, z0: -HALF, z1: HALF, cx: 0, cz: 0, half: HALF };

/** Where the opening view looks (up and right on screen): the old way on, kept for the start view. */
const DX = -1500, DZ = 1030, DL = Math.hypot(DX, DZ);
export const OPENING = { ux: DX / DL, uz: DZ / DL };
/** The second box mite's patch (in the warm-up). */
export const NPC_HOME = { x: OPENING.ux * 1300 - OPENING.uz * 200, z: OPENING.uz * 1300 + OPENING.ux * 200 };

/** Progress (0 at the start .. 1 on the portal ring) of a point. */
export const progressAt = (x, z) => distFromStart(x, z) / PORTAL_R;
