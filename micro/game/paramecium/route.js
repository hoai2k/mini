// The pond drop's encounters, placed as you go (the owner, 2026-11-01;
// ../../design/encounter-pattern.md, "Placed as you go"), for the 2D slide
// (the owner, 2026-11-02: "more like a 2D slide where the paramecium is quick
// and you battle other protists ... including trying to avoid a giant
// amoeba"). Pure data, no three.js: main.js adds what each encounter does,
// route.test.mjs runs the director with these settings in node.
//
// The slide is seen from straight above: x to the right, y up the screen,
// µm. Depth (z, µm) is a shallow continuous range under the coverslip, the
// microscope's focus following you through it (DEPTH): it never enters the
// director, which works in the plane (mode '2d': the director's z is our y).
//
// The scenery (Spirogyra, detritus, Vorticella, diatoms, glitter) repeats in
// a tile in every direction (world.js); the way back is a fixed place. The
// director places the rest one at a time, in this order, in water nobody has
// seen, a little ahead of whoever is furthest along: the Dileptus, the
// Chlamydomonas bloom, the giant amoeba, the two Didinium, and last the
// biofilm on a leaf (the portal) with the bladderwort trap on guard.

/** Where play starts (µm). */
export const START = { x: 0, y: 0 };
/**
 * The drop's depth: one continuous water volume, the slide (floor) below, the
 * coverslip above, z = 0 the middle (µm). Four body lengths deep (the owner,
 * 2026-11-02: "not 3 depth levels, just a continuous depth. I want it to feel
 * 3D"); it was 300 µm, and ZK scales the depths laid out for that drop.
 */
export const DEPTH = { min: -240, max: 240 };
export const ZK = (DEPTH.max - DEPTH.min) / 300;
/**
 * Near in depth: two things meet (eat, bite, block, catch) only when their
 * depths are within this of each other (µm, about a body's thickness), on top
 * of their own half-thicknesses where they have one.
 */
export const ZTOL = 40;
/** The view's width at zoom 1 (µm, landscape): the old closest zoom, the Paramecium (120 µm) about a fifth of it. */
export const FIELD = 560;
/**
 * The zoom: the field is FIELD x zoom. LT zooms out and RT in, analogue: rate is the e-folding per second at
 * a full trigger, ease the time constant the view follows it with.
 *
 * Recalibrated (the owner, 2026-11-03: "can we start the zoom from the current furthest zoom, and
 * recalibrate to be able to go further out or in from there?"): play starts at 3 (1.68 mm across, the
 * widest it used to go), the closest is 0.9 (504 µm, a little closer than the old closest, 1), and the
 * widest 5.6 (3.1 mm, 1.9x the old widest; the far detail thins: draw.js lod). It was min 1, start 1.6,
 * max 3 (2026-11-02: "start at the further zoomed out level and have the current default be the furthest
 * in you can zoom, but allow zooming further out").
 */
export const ZOOM = { min: 0.9, start: 3, max: 5.6, rate: 1.1, ease: 0.14 };
/** Rushing: full speed with a dash as often as it recharges (swim.js; measured ~850 µm/s). */
export const RUSH = 850;
/**
 * The world's forward (the owner, 2026-11-03: the view's turn is locked with the slide's +y up the
 * screen): straight up the screen, the bearing π/2 (atan2(dy, dx)).
 */
export const FORWARD = Math.PI / 2;
/**
 * The default path's bearing from the start (radians, atan2(dy, dx)): straight ahead, up the screen (the
 * owner, 2026-11-03: "with the new camera, we should have the default path be straight forward
 * essentially ... make the forward path the one of discovery"; it was 0.62, up and to the right).
 */
export const BEARING = FORWARD;
/** The way back (the amoeba's patch of slide): a fixed place behind the start, down and to the left (where it always was). */
const BACK_BEARING = 0.62 + Math.PI;
export const BACK = { x: START.x + Math.cos(BACK_BEARING) * 2600, y: START.y + Math.sin(BACK_BEARING) * 2600 };
/** The dish: far bigger than a game ever goes (a labelled departure). */
export const DROP_R = 60000;

// ---- the encounters' shapes (what can be seen of each when placed at x, y, met coming along bearing b)
const perp = (b) => [-Math.sin(b), Math.cos(b)];
/** The bloom: a band 2 × half deep (along the way) and 2 × across wide, lying across the way. */
export const BLOOM_BAND = { half: 200, across: 700 };
export const bloomParts = (x, y, b) => { const [px, py] = perp(b); return [-560, -280, 0, 280, 560].map((k) => [x + px * k, y + py * k, BLOOM_BAND.half + 140]); };
/** The two Didinium: their homes this far either side of the spot, across the way. */
export const DIDINIUM_SIDE = 220;
export const didiniumHomes = (x, y, b) => { const [px, py] = perp(b); return [[x - px * DIDINIUM_SIDE, y - py * DIDINIUM_SIDE], [x + px * DIDINIUM_SIDE, y + py * DIDINIUM_SIDE]]; };
/** The bladderwort trap's centre: this far short of the leaf, toward whoever comes (its door faces them). */
export const TRAP_IN = 520;
export const trapAt = (x, y, b) => [x - Math.cos(b) * TRAP_IN, y - Math.sin(b) * TRAP_IN];
/** The giant amoeba's resting radius (µm): it nearly fills the view at zoom 1. */
export const GIANT_R = 230;

/**
 * The director's settings (2D: its x, z are our x, y). One cell ≈ a third of
 * the view; seenDist ≈ two views; the warm-up and the calm breaks are the
 * rhythm (the owner: an obstacle, a calm break, the next).
 */
export const DIRECTOR = {
  mode: '2d', cell: 250, groundY: 0, seenDist: 1300, nearSeen: 260, seed: 41, moveSpeed: 60,
  bounds: { x0: START.x - DROP_R, x1: START.x + DROP_R, z0: START.y - DROP_R, z1: START.y + DROP_R },
  // the warm-up: ~4 s of swimming; a calm break of ~7.5 s of swimming clear of the last encounter
  warmup: { sec: 4 }, calm: { sec: 7.5 }, linger: 5,
  // seen but not gone to: met once everyone is 2.2 mm off, or after 8 s in sight nearby (it is never moved)
  passDist: 2200, watchSec: 8,
};
export const ENCOUNTERS = [
  // Dileptus: its trunk's slash; a trichocyst burst (B) drives it off
  { id: 'dileptus', size: 420, visible: 380, minAhead: 1800, maxAhead: 2400, minNear: 900, maxNear: 1300 },
  // the Chlamydomonas bloom: a band across the way to push and gulp through
  { id: 'bloom', size: 760, minAhead: 1500, maxAhead: 2100, minNear: 1000, maxNear: 1400, parts: bloomParts },
  // the giant amoeba: slow, huge, tall; it engulfs what it covers. Keep away (over it, round it)
  { id: 'giant', size: 520, visible: GIANT_R + 160, minAhead: 1600, maxAhead: 2200, minNear: 1000, maxNear: 1400 },
  // the two Didinium, side by side across the way
  { id: 'didinium', size: 480, minAhead: 1500, maxAhead: 2100, minNear: 900, maxNear: 1300,
    parts: (x, y, b) => didiniumHomes(x, y, b).map(([hx, hy]) => [hx, hy, 200]) },
  // the boss and the way on: the biofilm on its leaf, the bladderwort trap on guard in front of it
  { id: 'portal', size: 700, minAhead: 2300, maxAhead: 3000, minNear: 1100, maxNear: 1500, final: true,
    parts: (x, y, b) => { const [tx, ty] = trapAt(x, y, b); return [[x, y, 300], [tx, ty, 330]]; } },
];
/** How close counts as met (µm from the encounter's spot; the bloom: from its band). */
export const MET = { dileptus: 520, bloom: 220, giant: 600, didinium: 560, portal: 300 };
/** A lingering player: the current encounter comes over (main.js driftEncounter, 300 µm/s after 4 s) to this far from them. */
export const DRIFT_TO = { dileptus: 360, bloom: 120, giant: 430, didinium: 390 };
/**
 * The default path (shared/director.js `defaultPath`; the owner, 2026-11-01: "a default path to a portal,
 * but just dynamically generate the other directions"): every encounter laid along BEARING on the first
 * frame, at the distances a rush meets them, out of sight, so the way on exists from the start.
 */
export const DEFAULT_PATH = { from: { x: START.x, z: START.y }, bearing: BEARING, rush: RUSH, lateral: [0, 120, -120, 240, -240, 360, -360] };
/** Encounters go anywhere in the dish, not on the way back and not on the start. */
export const canPlace = (x, y, r) => Math.hypot(x - START.x, y - START.y) < DROP_R - 3000 - r && Math.hypot(x - BACK.x, y - BACK.y) > 900 + r && Math.hypot(x - START.x, y - START.y) > 700 + r;
/** Distance from (x, y) to the bloom's band (middle hx, hy, lying across bearing b). */
export function bandDist(x, y, hx, hy, b) {
  const ox = x - hx, oy = y - hy, c = Math.cos(b), s = Math.sin(b);
  const lx = ox * c + oy * s, ly = -ox * s + oy * c;
  return Math.hypot(Math.max(0, Math.abs(lx) - BLOOM_BAND.half), Math.max(0, Math.abs(ly) - BLOOM_BAND.across));
}
