// The pond drop's encounters, placed as you go (the owner, 2026-11-01;
// ../../design/encounter-pattern.md, "Placed as you go"). Pure data, no
// three.js: main.js adds what each encounter does when placed and when it is
// met, and route.test.mjs runs the director with these settings in node.
//
// The scenery (Spirogyra, flakes, Vorticella colonies, diatoms, sunlit
// patches, the pond water's tiles) is laid out before play and repeats in
// every direction (world.js); the backdoor (the amoeba's floor) is a fixed
// place. The director (../shared/director.js) places the rest one at a time,
// in this order, in water nobody has seen, a little ahead of whoever is
// furthest along (or round them if they linger): the Dileptus, the
// Chlamydomonas bloom (a band of cells lying across the way), the two
// Didinium, and last the biofilm (the portal) with the bladderwort trap on
// guard in front of it.
//
// The play is effectively planar: the drop is 650 µm deep and the encounters
// tens of millimetres apart, so the director runs in 2D (cells 1 mm square
// over the plane, each covering the whole depth).
//
// µm. Rushing (full speed with a dash every 2.2 s) covers ~1.5 mm/s; the chase
// view's set pieces fade out ~7.5 mm from the camera (main.js cullFor: the depth
// of field's fade), the microscope's field is 0.45-1.8 mm.

export const START = { x: -150, z: 60 };
/** The direction the opening view looks (scenery is laid out along it). */
export const A0 = Math.atan2(0.833, 0.553);
/** The calm warm-up round the start (µm): only a label now (the stats say "calm waters"); the director's warm-up is time. */
export const WARM = 8000;
/** The dish: about 17 cm across (a labelled departure), the meniscus at its rim. */
export const DROP_R = 84000;
export const DEPTH = 650;
/** The way back (the amoeba's floor): a fixed place 17 mm from the start, the other way from the opening view. */
export const BACK = { x: START.x + Math.cos(A0 + Math.PI) * 17000, z: START.z + Math.sin(A0 + Math.PI) * 17000 };
/** How far the view sees (µm from the camera along its axis): beyond, set pieces are culled and the rest fades below ~5 %. */
export const VIEW_FAR = 7500;

// ---- the encounters' shapes (what can be seen of each when placed at x, z, met coming along bearing b)
const perp = (b) => [-Math.sin(b), Math.cos(b)];
/** The bloom: a band 2 × half deep (along b) and 2 × across wide, lying across the way. */
export const BLOOM_BAND = { half: 250, across: 900 };
/** The two Didinium: their homes this far either side of the spot, across the way. */
export const DIDINIUM_SIDE = 300;
export const didiniumHomes = (x, z, b) => { const [px, pz] = perp(b); return [[x - px * DIDINIUM_SIDE, z - pz * DIDINIUM_SIDE], [x + px * DIDINIUM_SIDE, z + pz * DIDINIUM_SIDE]]; };
/** The bladderwort trap's centre: this far short of the leaf, toward whoever comes (its door faces them). */
export const TRAP_IN = 430;
export const trapAt = (x, z, b) => [x - Math.cos(b) * TRAP_IN, z - Math.sin(b) * TRAP_IN];
export const bloomParts = (x, z, b) => { const [px, pz] = perp(b); return [-700, -350, 0, 350, 700].map((k) => [x + px * k, z + pz * k, BLOOM_BAND.half + 160]); };

/**
 * The director's settings and the encounters in order.
 *   size     clearance (between placed entries)
 *   visible / parts  what can be seen of it when placed (unseen water, out of view); top: the full depth
 *   min/maxAhead  how far ahead of the leader it goes; min/maxNear when they linger
 */
export const DIRECTOR = {
  mode: '2d', cell: 1000, groundY: 0, seenDist: VIEW_FAR, nearSeen: 800, seed: 23, moveSpeed: 150,
  bounds: { x0: START.x - DROP_R, x1: START.x + DROP_R, z0: START.z - DROP_R, z1: START.z + DROP_R },
  // the warm-up: ~6 s of swimming; a calm break of ~5 s of swimming clear of the last encounter
  warmup: { sec: 6 }, calm: { sec: 5 }, linger: 6,
  // seen but not gone to: met once everyone is 9 mm off (beyond the view), or after 10 s in sight nearby (it is never moved)
  passDist: 9000, watchSec: 10,
};
const TOP = DEPTH;
export const ENCOUNTERS = [
  // Dileptus: its trunk's slash; trichocysts drive it off
  { id: 'dileptus', size: 1500, visible: 650, top: TOP, minAhead: 9000, maxAhead: 12500, minNear: 3000, maxNear: 5000 },
  // the Chlamydomonas bloom: a band across the way to push and gulp through
  { id: 'bloom', size: 1600, top: TOP, minAhead: 9000, maxAhead: 12500, minNear: 3500, maxNear: 5500, parts: bloomParts },
  // the two Didinium, side by side across the way
  { id: 'didinium', size: 1500, top: TOP, minAhead: 9000, maxAhead: 12500, minNear: 3000, maxNear: 5000,
    parts: (x, z, b) => didiniumHomes(x, z, b).map(([hx, hz]) => [hx, hz, 480]) },
  // the boss and the way on: the biofilm on its leaf, the bladderwort trap on guard in front of it
  { id: 'portal', size: 1600, top: TOP, minAhead: 9500, maxAhead: 13000, minNear: 3500, maxNear: 5500, final: true,
    parts: (x, z, b) => { const [tx, tz] = trapAt(x, z, b); return [[x, z, 420], [tx, tz, 750]]; } },
];
/**
 * The default path (shared/director.js `defaultPath`; the owner, 2026-11-01: "a default path to a portal,
 * but just dynamically generate the other directions if the player goes off in another direction"): the
 * Dileptus, the bloom, the two Didinium and the biofilm with the trap laid along one bearing from the start
 * on the first frame, at the distances a rush (~1.5 mm/s) would meet them (~2, ~3.8, ~5.6 and ~7.5 cm out),
 * so the way on exists from the start. The bearing is square to the opening view's (A0, which the chase
 * camera looks along) and away from the way back (behind it). Off that bearing they are placed as you go,
 * as before (each is one thing: a hunter, the bloom, the pair of Didinium, the biofilm: `single`).
 */
export const DEFAULT_PATH = { from: { x: START.x, z: START.z }, bearing: A0 - Math.PI / 2, rush: 1500 };
/** Encounters go anywhere in the dish well inside the meniscus, and not on the way back. */
export const canPlace = (x, z, r) => Math.hypot(x - START.x, z - START.z) < DROP_R - 3000 - r && Math.hypot(x - BACK.x, z - BACK.z) > 2500 + r;
