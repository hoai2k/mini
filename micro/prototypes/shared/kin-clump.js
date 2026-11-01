// The kin clump: the Paramecium → bacterium continuous transition dives into
// it (micro/game/README.md "The continuous transition"). The owner
// (2026-11-01): "if the light changes first then you see a dark mass and as
// you zoom in it becomes apparent that it's a bunch of bacteria and you zoom
// in to that one".
//
// One fixed layout, shared by both worlds so they line up through the
// crossfade: the Paramecium world draws it on the biofilm round the glimpsed
// spirillum (a dark smudge at 20×, once the light has turned to phase
// contrast), and the bacterium world arranges its opening field round your
// cell the same way (its own kin, prey rods and biofilm cocci), so the clump
// resolves into the cells you start among.
//
//   import { clumpLayout, placeInFrame } from '../shared/kin-clump.js';
//   for (const c of clumpLayout()) { const p = placeInFrame(c, x, y, heading); … }
//
// Every entry is in the frame of the player's cell, in µm: `u` ahead along its
// heading, `v` to its left as the screen shows it (counter-clockwise, the
// screen's up as +y), `da` its own heading relative to the cell's
// (counter-clockwise on screen), `L` its length (0 for a coccus), `r` its
// radius. Kinds: 'kin' (a magnetotactic spirillum like you: kin in the
// bacterium world), 'rod' (a prey rod), 'coccus' and 'film' (attached biofilm
// cells: a coccus and a short rod).

export const CLUMP = {
  seed: 0x5eed17,
  R: 17,        // µm: the clump's outer radius (the dense core is about half of it)
  clear: 2.6,   // µm kept clear round your cell
  kin: 22, rod: 34, coccus: 30, film: 26,
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

let cached = null;
/** The layout (the same every call; do not mutate the entries). */
export function clumpLayout() {
  if (cached) return cached;
  const r = rng(CLUMP.seed);
  const out = [];
  const gauss = () => { const a = Math.max(1e-9, r()), b = r(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(6.283185 * b); };
  // a few microcolonies (where the cocci and attached rods bunch), inside the clump
  const cols = [0, 1, 2, 3, 4].map((i) => { const a = i * 1.257 + r() * 0.8, d = 5 + r() * 8; return { u: Math.cos(a) * d, v: Math.sin(a) * d }; });
  const free = (u, v, gap) => Math.hypot(u, v) > CLUMP.clear + gap && out.every((c) => Math.hypot(c.u - u, c.v - v) > gap + (c.r || 0.4));
  function add(kind, n, place, shape) {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 40; k++) {
        const [u, v] = place();
        const s = shape();
        if (!free(u, v, kind === 'kin' ? 1.9 : s.L ? 0.9 : 0.55)) continue;
        out.push({ kind, u: +u.toFixed(3), v: +v.toFixed(3), ...s });
        break;
      }
    }
  }
  // denser toward the middle: radius ∝ rand^0.75
  const disc = (R0, R1) => () => { const a = r() * 6.283185, d = R0 + (R1 - R0) * Math.pow(r(), 0.75); return [Math.cos(a) * d, Math.sin(a) * d]; };
  const nearCol = (spread) => () => { const c = cols[Math.floor(r() * cols.length)]; return [c.u + gauss() * spread, c.v + gauss() * spread]; };
  // your kin: magnetotactic, so they lie roughly the way you do (the field lines them up)
  add('kin', CLUMP.kin, disc(CLUMP.clear + 0.6, CLUMP.R * 0.9), () => ({ da: +(gauss() * 0.55).toFixed(3), L: +(2.5 + r() * 0.8).toFixed(3), r: 0.27 }));
  add('rod', CLUMP.rod, disc(CLUMP.clear, CLUMP.R), () => ({ da: +(r() * 6.283185).toFixed(3), L: +(1.8 + r() * 0.9).toFixed(3), r: 0.42 }));
  add('coccus', CLUMP.coccus, nearCol(1.8), () => ({ da: 0, L: 0, r: +(0.45 + r() * 0.15).toFixed(3) }));
  add('film', CLUMP.film, nearCol(2.6), () => ({ da: +(r() * 6.283185).toFixed(3), L: +(1.4 + r() * 1.2).toFixed(3), r: +(0.32 + r() * 0.1).toFixed(3) }));
  return (cached = out);
}

/**
 * An entry placed for a cell at (x, y) heading a, in a plane whose
 * counter-clockwise turn is the screen's (the bacterium's field: x right, y
 * up): { x, y, a }.
 */
export function placeInFrame(c, x, y, a) {
  const ca = Math.cos(a), sa = Math.sin(a);
  return { x: x + c.u * ca - c.v * sa, y: y + c.u * sa + c.v * ca, a: a + c.da };
}
