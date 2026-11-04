// The pond drop's scenery for the 2D slide (pure: no three.js). Laid out once
// in a square tile (TILE µm) that repeats in every direction, so the field is
// as full far out as at the start; each thing has a depth (z, µm) or, for a
// filament or a stalk, runs through the depth from one end to the other, so
// the drop reads as one connected volume seen from above.
//
// Styled after the world's card (assets/cards/paramecium.webp): green
// Spirogyra filaments with spiral chloroplast ribbons crossing the field,
// golden-brown detritus clumps, bell-shaped Vorticella on coiled stalks
// rising from them, pennate and ribbon diatoms, loose golden flocs and fine
// glittering specks. draw.js draws them; swim.js collides with the solid
// ones (filaments, clumps, diatoms, stalks: all of them `weave`, so the cell
// winds over or under them on its own).
//
// Everything here can be moved (the owner, 2026-11-03: "Everything should be
// interactable if possible"): each copy of a thing in each tile keeps its own
// state (`dynOf`: a diatom's shove and spin, a clump's wobble and whether it
// has crumbled, a filament's bends, a floc's drift), made the first time
// something touches it and stepped by stir.js. A Vorticella's contraction is
// kept per colony member (every copy of it snaps together: one place,
// repeated).
//
// The gradient toward the portal (the owner: "slowly vary the environment as
// we get closer to the portal, so you know which track to take"): a second,
// richer layer of filaments, clumps with Vorticella colonies, diatoms and
// flocs, each with a rank in 0..1, shows wherever `rich(x, y)` (0 in open
// water .. 1 at the leaf, from the distance to the portal: setRichRef) is
// above its rank, fading in over a fifth of the range. With no reference set
// it is 0 everywhere, the old drop exactly.
import { START, DEPTH, ZK, BACK } from './route.js';

export const TILE = 2400;
const MAXREACH = 1700; // the longest thing's half-extent from its tile-local position (filaments)
/**
 * The gradient toward the portal (µm from the leaf): 0 beyond far, rising to 1 at near (eased, shape the
 * exponent); within leaf[0]..leaf[1] the slide turns to leaf litter (its cell net). The way back: within
 * back[0]..back[1] of the amoeba's patch, its slime trails and egested vacuoles thicken.
 */
export const RICH = { far: 29000, near: 1200, shape: 1.2, leaf: [5200, 1400], back: [2400, 300] }; // (far 44 mm before the food trail shortened the way to 25.6 mm)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
/** The gradient at distance d from the portal (0 open water .. 1 at the leaf). */
export const richAt = (d) => Math.pow(clamp01(1 - (d - RICH.near) / (RICH.far - RICH.near)), RICH.shape);

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mod = (v, m) => ((v % m) + m) % m;

export function createWorld(seed = 11) {
  const r = rng(seed);
  const R = (a, b) => a + (b - a) * r();
  const zr = (lo = DEPTH.min + 25, hi = DEPTH.max - 25) => R(lo, hi);
  const sx = mod(START.x, TILE), sy = mod(START.y, TILE);
  // the start stays open (a calm place to begin), and so does the way back
  const clearOfStart = (x, y, rad) => {
    for (const [ox, oy] of [[0, 0], [TILE, 0], [-TILE, 0], [0, TILE], [0, -TILE]]) if (Math.hypot(x + ox - sx, y + oy - sy) < 170 + rad) return false;
    return true;
  };
  const segClear = (x0, y0, x1, y1, rad) => {
    for (let k = 0; k <= 12; k++) { const t = k / 12; if (!clearOfStart(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rad)) return false; }
    return true;
  };

  // Spirogyra: long unbranched filaments of cells, each with its spiral chloroplast ribbon.
  // The opening view is composed after the card: two filaments crossing to the right of the start
  // (below you), a clump of detritus with a Vorticella colony up to the left, diatoms between.
  const filaments = [
    { x0: sx + 40, y0: sy - 900, x1: sx + 420, y1: sy + 900, r: 19, z0: -55 * ZK, z1: -25 * ZK, cell: 150, pitch: 74, turns: 2, phase: 0.4, shade: 1.05 },
    { x0: sx + 900, y0: sy - 465, x1: sx - 520, y1: sy + 510, r: 17, z0: 30 * ZK, z1: 70 * ZK, cell: 135, pitch: 66, turns: 1, phase: 2.0, shade: 0.95 },
  ].map((f) => { const L = Math.hypot(f.x1 - f.x0, f.y1 - f.y0); return { ...f, L, cx: (f.x0 + f.x1) / 2, cy: (f.y0 + f.y1) / 2, ang: Math.atan2(f.y1 - f.y0, f.x1 - f.x0) }; });
  for (let tries = 0; filaments.length < 7 && tries < 300; tries++) {
    const L = R(1500, 3000), a = R(0, Math.PI), cx = R(0, TILE), cy = R(0, TILE);
    const x0 = cx - Math.cos(a) * L / 2, y0 = cy - Math.sin(a) * L / 2, x1 = cx + Math.cos(a) * L / 2, y1 = cy + Math.sin(a) * L / 2;
    if (!segClear(x0, y0, x1, y1, 30)) continue;
    // keep filaments apart where they would lie on top of one another
    if (filaments.some((f) => Math.abs(Math.sin(f.ang - a)) < 0.25 && Math.hypot(f.cx - cx, f.cy - cy) < 380)) continue;
    const rad = R(16, 21);
    filaments.push({ x0, y0, x1, y1, cx, cy, ang: a, L, r: rad, z0: zr(-110 * ZK, 110 * ZK), z1: zr(-110 * ZK, 110 * ZK), cell: R(120, 170), pitch: R(62, 88), turns: r() < 0.5 ? 1 : 2, phase: R(0, 6.28), shade: R(0.8, 1.15) });
  }
  // detritus clumps: golden-brown flocs of granules; some carry Vorticella
  const clumps = [];
  const clumpAt = (x, y, rad, z) => {
    const g = [];
    for (let i = 0, n = Math.round(rad * 2.4); i < n; i++) { const aa = R(0, 6.28), d = rad * Math.pow(r(), 0.55); g.push({ dx: Math.cos(aa) * d * R(0.8, 1.2), dy: Math.sin(aa) * d, dz: R(-0.2, 0.2) * rad, r: R(0.8, 2.8) * (r() < 0.12 ? 1.6 : 1), gold: r(), tw: R(0, 6.28) }); }
    clumps.push({ x, y, z, r: rad, h: rad * 0.55, g });
  };
  clumpAt(sx - 215, sy + 20, 60, -10 * ZK);
  clumpAt(sx - 260, sy - 150, 46, -30 * ZK);
  clumpAt(sx - 300, sy + 190, 40, -50 * ZK);
  for (let tries = 0; clumps.length < 36 && tries < 900; tries++) {
    const x = R(0, TILE), y = R(0, TILE), rad = R(26, 66);
    if (!clearOfStart(x, y, rad)) continue;
    if (clumps.some((c) => Math.hypot(c.x - x, c.y - y) < c.r + rad + 90)) continue;
    clumpAt(x, y, rad, zr(-120 * ZK, 60 * ZK));
  }
  // Vorticella colonies on some clumps: bells on coiling stalks, fanning out from the clump
  const vorticella = [];
  for (const c of clumps.filter((_, i) => i === 0 || i % 4 === 1)) {
    const base = c === clumps[0] ? 0.75 : R(0, 6.28), n = c === clumps[0] ? 4 : 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * R(0.35, 0.55);
      const stalk = c === clumps[0] ? R(55, 95) : R(70, 150);
      vorticella.push({ clump: c, ax: c.x + Math.cos(a) * c.r * 0.7, ay: c.y + Math.sin(a) * c.r * 0.7, az: c.z, a: a + R(-0.15, 0.15), stalk, bz: c.z + R(-50, 70) * ZK, bell: R(15, 20), phase: R(0, 6.28), next: R(3, 14), g: Array.from({ length: 14 }, () => ({ u: R(0.15, 0.9), v: R(-0.7, 0.7), r: R(1.3, 2.6), gold: r() })) });
    }
  }
  // diatoms: pennate (pointed boats with golden chloroplasts) and Fragilaria ribbons
  const diatoms = [
    { x: sx + 150, y: sy - 100, z: 10 * ZK, a: 0.35, L: 90, W: 19, rect: false, n: 0, drift: 3 },
    { x: sx - 110, y: sy - 160, z: -20 * ZK, a: 2.6, L: 66, W: 14, rect: false, n: 0, drift: -4 },
  ];
  for (let tries = 0; diatoms.length < 30 && tries < 600; tries++) {
    const x = R(0, TILE), y = R(0, TILE), rect = r() < 0.25;
    const L = rect ? R(60, 120) : R(45, 115), W = rect ? R(32, 55) : L * R(0.16, 0.26);
    if (!clearOfStart(x, y, L)) continue;
    diatoms.push({ x, y, z: zr(), a: R(0, Math.PI), L, W, rect, n: rect ? Math.round(L / 9) : 0, drift: R(-6, 6) });
  }
  // flocs: small loose golden clusters (texture to swim through)
  const flocs = Array.from({ length: 130 }, () => {
    const rad = R(6, 22);
    return { x: R(0, TILE), y: R(0, TILE), z: zr(), r: rad, g: Array.from({ length: Math.round(4 + rad * 0.5) }, () => ({ dx: R(-1, 1) * rad, dy: R(-1, 1) * rad, r: R(0.8, 2.2), gold: r() })) };
  });
  // the fine glitter: tiny specks that twinkle (bacteria, mineral grains, droplets)
  const glitter = Array.from({ length: 1400 }, () => ({ x: R(0, TILE), y: R(0, TILE), z: zr(DEPTH.min, DEPTH.max), r: R(0.5, 1.5), k: r(), ph: R(0, 6.28), w: R(0.6, 2.4) }));

  // ---- what the old layout did not have (its own random stream, so the layout above is unchanged)
  const r2 = rng(seed * 7 + 3);
  const R2 = (a, b) => a + (b - a) * r2();
  // diatoms: a few are empty frustules (dead: glass only, no chloroplasts; a strong hit cracks one); the
  // live pennate ones glide slowly to and fro along their raphe (real: secreted mucilage, a few µm/s)
  diatoms.forEach((d, i) => {
    d.id = i; d.empty = i === 1 ? true : i === 0 ? false : !d.rect && r2() < 0.3;
    d.glide = d.empty || d.rect ? 0 : R2(14, 34); d.gspd = R2(7, 13); d.gph = R2(0, 4);
    d.m = (d.L * d.W) / 1100 * (d.rect ? 1.6 : 1); // its mass (µm² of glass, roughly), for shoves
  });
  filaments.forEach((f, i) => { f.id = i; });
  clumps.forEach((c, i) => { c.id = i; c.colony = vorticella.some((v) => v.clump === c); });
  flocs.forEach((f, i) => { f.id = i; });
  // the richer layer (ranked: shown where rich(x, y) is above the rank)
  const rank = () => R2(0.04, 1);
  for (let tries = 0, n = 0; n < 8 && tries < 400; tries++) {
    const L = R2(1200, 2600), a = R2(0, Math.PI), cx = R2(0, TILE), cy = R2(0, TILE);
    const x0 = cx - Math.cos(a) * L / 2, y0 = cy - Math.sin(a) * L / 2, x1 = cx + Math.cos(a) * L / 2, y1 = cy + Math.sin(a) * L / 2;
    if (!segClear(x0, y0, x1, y1, 30)) continue;
    if (filaments.some((f) => Math.abs(Math.sin(f.ang - a)) < 0.25 && Math.hypot(f.cx - cx, f.cy - cy) < 300)) continue;
    filaments.push({ id: filaments.length, rank: rank(), x0, y0, x1, y1, cx, cy, ang: a, L, r: R2(15, 21), z0: R2(-140 * ZK, 60 * ZK), z1: R2(-140 * ZK, 60 * ZK), cell: R2(120, 170), pitch: R2(62, 88), turns: r2() < 0.5 ? 1 : 2, phase: R2(0, 6.28), shade: R2(0.9, 1.2) });
    n++;
  }
  for (let tries = 0, n = 0; n < 26 && tries < 900; tries++) {
    const x = R2(0, TILE), y = R2(0, TILE), rad = R2(28, 62);
    if (!clearOfStart(x, y, rad)) continue;
    if (clumps.some((c) => Math.hypot(c.x - x, c.y - y) < c.r + rad + 60)) continue;
    const g = [];
    for (let i = 0, m = Math.round(rad * 1.8); i < m; i++) { const aa = R2(0, 6.28), d = rad * Math.pow(r2(), 0.55); g.push({ dx: Math.cos(aa) * d * R2(0.8, 1.2), dy: Math.sin(aa) * d, dz: R2(-0.2, 0.2) * rad, r: R2(0.8, 2.8) * (r2() < 0.12 ? 1.6 : 1), gold: r2(), tw: R2(0, 6.28) }); }
    const c = { id: clumps.length, rank: rank(), x, y, z: R2(-150 * ZK, 20 * ZK), r: rad, h: rad * 0.55, g, colony: r2() < 0.55 };
    clumps.push(c);
    n++;
    // Vorticella colonies grow on the surfaces near the biofilm (most of these clumps carry one)
    if (c.colony) {
      const base = R2(0, 6.28), m = 3 + Math.floor(r2() * 4);
      for (let i = 0; i < m; i++) {
        const a = base + (i - (m - 1) / 2) * R2(0.35, 0.55);
        vorticella.push({ clump: c, rank: c.rank, ax: c.x + Math.cos(a) * c.r * 0.7, ay: c.y + Math.sin(a) * c.r * 0.7, az: c.z, a: a + R2(-0.15, 0.15), stalk: R2(70, 150), bz: c.z + R2(-30, 90) * ZK, bell: R2(15, 20), phase: R2(0, 6.28), next: R2(3, 14), g: Array.from({ length: 14 }, () => ({ u: R2(0.15, 0.9), v: R2(-0.7, 0.7), r: R2(1.3, 2.6), gold: r2() })) });
      }
    }
  }
  for (let tries = 0, n = 0; n < 14 && tries < 400; tries++) {
    const x = R2(0, TILE), y = R2(0, TILE), L = R2(45, 115), W = L * R2(0.16, 0.26);
    if (!clearOfStart(x, y, L)) continue;
    const empty = r2() < 0.3;
    diatoms.push({ id: diatoms.length, rank: rank(), x, y, z: zr(), a: R2(0, Math.PI), L, W, rect: false, n: 0, drift: 0, empty, glide: empty ? 0 : R2(14, 34), gspd: R2(7, 13), gph: R2(0, 4), m: (L * W) / 1100 });
    n++;
  }
  for (let i = 0; i < 70; i++) {
    const rad = R2(6, 22);
    flocs.push({ id: flocs.length, rank: rank(), x: R2(0, TILE), y: R2(0, TILE), z: R2(DEPTH.min + 25, 40), r: rad, g: Array.from({ length: Math.round(4 + rad * 0.5) }, () => ({ dx: R2(-1, 1) * rad, dy: R2(-1, 1) * rad, r: R2(0.8, 2.2), gold: r2() })) });
  }
  vorticella.forEach((v, i) => { v.id = i; });

  // bounding boxes (tile-local) for culling and queries
  for (const f of filaments) f.box = [Math.min(f.x0, f.x1) - f.r, Math.min(f.y0, f.y1) - f.r, Math.max(f.x0, f.x1) + f.r, Math.max(f.y0, f.y1) + f.r];
  for (const c of clumps) c.box = [c.x - c.r * 2.6, c.y - c.r * 2.6, c.x + c.r * 2.6, c.y + c.r * 2.6]; // (room for its crumbs and a shove)
  for (const v of vorticella) {
    const tx = v.ax + Math.cos(v.a) * (v.stalk + v.bell * 2.2), ty = v.ay + Math.sin(v.a) * (v.stalk + v.bell * 2.2);
    v.box = [Math.min(v.ax, tx) - 30, Math.min(v.ay, ty) - 30, Math.max(v.ax, tx) + 30, Math.max(v.ay, ty) + 30];
  }
  for (const d of diatoms) { const m = d.L + (d.glide || 0) + 160; d.box = [d.x - m, d.y - m, d.x + m, d.y + m]; } // (room for its glide and a shove)
  for (const f of flocs) f.box = [f.x - f.r - 120, f.y - f.r - 120, f.x + f.r + 120, f.y + f.r + 120];

  /** Call fn(item, ox, oy) for every copy of every item in `list` whose box meets the rect. */
  function eachIn(list, x0, y0, x1, y1, fn, reach = MAXREACH) {
    const i0 = Math.floor((x0 - reach) / TILE), i1 = Math.floor((x1 + reach) / TILE);
    const j0 = Math.floor((y0 - reach) / TILE), j1 = Math.floor((y1 + reach) / TILE);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const ox = i * TILE, oy = j * TILE;
      for (const it of list) {
        const b = it.box;
        if (b[2] + ox < x0 || b[0] + ox > x1 || b[3] + oy < y0 || b[1] + oy > y1) continue;
        fn(it, ox, oy);
      }
    }
  }
  /** The glitter copies in the rect (each speck once per tile copy). */
  function glitterIn(x0, y0, x1, y1, fn) {
    const i0 = Math.floor(x0 / TILE), i1 = Math.floor(x1 / TILE), j0 = Math.floor(y0 / TILE), j1 = Math.floor(y1 / TILE);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const ox = i * TILE, oy = j * TILE;
      for (const g of glitter) { const x = g.x + ox, y = g.y + oy; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) fn(g, x, y); }
    }
  }
  // ---- the gradient toward the portal (and the way back)
  const ref = { x: 0, y: 0, on: false };
  /** Where the gradient is measured from (the portal's leaf; main.js eases it after the portal when that moves). */
  function setRichRef(x, y) { ref.x = x; ref.y = y; ref.on = true; }
  /** The gradient at (x, y): 0 open water .. 1 at the leaf (0 everywhere with no reference). */
  const rich = (x, y) => (ref.on ? richAt(Math.hypot(x - ref.x, y - ref.y)) : 0);
  /** The leaf litter showing on the slide near the portal: 0 .. 1. */
  const leafK = (x, y) => (ref.on ? smooth(RICH.leaf[0], RICH.leaf[1], Math.hypot(x - ref.x, y - ref.y)) : 0);
  /** The amoeba's trails thickening toward the way back: 0 .. 1. */
  const backK = (x, y) => smooth(RICH.back[0], RICH.back[1], Math.hypot(x - BACK.x, y - BACK.y));
  /** How much of a thing shows (1 for the old layout; a ranked one fades in as the gradient passes its rank). */
  function vis(it, ox, oy) {
    if (it.rank === undefined) return 1;
    const x = (it.cx ?? it.ax ?? it.x) + ox, y = (it.cy ?? it.ay ?? it.y) + oy;
    return clamp01((rich(x, y) - it.rank) * 5);
  }

  // ---- each copy's own state (made the first time it is touched; stir.js steps them)
  const active = new Set(); // the states still moving: { kind, it, s }
  const tileKey = (ox, oy) => Math.round(ox / TILE) * 65536 + Math.round(oy / TILE);
  /** The state of item `it` in the tile copy at (ox, oy); made (by make) when asked and missing. */
  function dynOf(it, ox, oy, make = null) {
    let m = it.dyn;
    if (!m) { if (!make) return null; m = it.dyn = new Map(); }
    const k = tileKey(ox, oy);
    let s = m.get(k);
    if (!s && make) { s = make(); s.ox = ox; s.oy = oy; m.set(k, s); }
    return s || null;
  }
  const tri = (u) => { const f = u - Math.floor(u); return f < 0.5 ? f * 4 - 1 : 3 - f * 4; }; // a triangle wave, -1..1
  /** A diatom where it is now: its shove and spin, its glide along the raphe; cracked, its two halves. */
  function diatomPose(d, ox, oy, time) {
    const s = dynOf(d, ox, oy);
    const a = d.a + (s ? s.a : 0);
    let x = d.x + ox + (s ? s.x : 0), y = d.y + oy + (s ? s.y : 0);
    // the glide: to and fro along its long axis (reversing, as pennate diatoms do), unless cracked
    if (d.glide && !(s && s.cracked)) { const g = d.glide * tri(time * d.gspd / (4 * d.glide) + d.gph); x += Math.cos(a) * g; y += Math.sin(a) * g; }
    else if (d.drift && !d.glide) { const g = Math.sin(time * 0.2 + d.drift) * d.drift; x += Math.cos(a) * g; y += Math.sin(a) * g; }
    return { x, y, z: d.z + (s ? s.z || 0 : 0), a, s };
  }
  /** A clump where it is now (its wobble), and its crumble (seconds since, or -1). */
  function clumpPose(c, ox, oy) {
    const s = dynOf(c, ox, oy);
    return { x: c.x + ox + (s ? s.x : 0), y: c.y + oy + (s ? s.y : 0), z: c.z, cr: s ? s.cr : -1, s };
  }
  function flocPose(f, ox, oy) {
    const s = dynOf(f, ox, oy);
    return { x: f.x + ox + (s ? s.x : 0), y: f.y + oy + (s ? s.y : 0), sp: s ? s.sp : 0, gone: !!(s && s.gone), s };
  }
  /** A filament's sideways bend at u (µm along it): its springy bends (anchored at its ends, it springs back). */
  function bendAt(s, u) {
    if (!s) return 0;
    let o = 0;
    for (const b of s.b) { const q = (u - b.u) / 120; o += b.d * Math.exp(-q * q); }
    return o;
  }

  const stalkState = new Map(); // a Vorticella's contraction: shared by every copy of it (it is one place, repeated)
  /** A Vorticella's stalk as an obstacle (its coiled length now) and where its bell is. */
  function vortPose(v, ox, oy, time) {
    let st = stalkState.get(v);
    if (!st) { st = { c: 0, t: v.next }; stalkState.set(v, st); }
    const k = 1 - 0.62 * st.c; // contracted: the stalk coils up to ~40 % of its length
    const L = v.stalk * k;
    const sway = Math.sin(time * 0.6 + v.phase) * 0.06 * (1 - st.c);
    // the recoil: knocked, the bell jerks and wobbles on its coiling stalk
    const a = v.a + sway + (st.wob || 0) * Math.sin((st.wt || 0) * 19);
    const bx = v.ax + ox + Math.cos(a) * L, by = v.ay + oy + Math.sin(a) * L, bz = v.az + (v.bz - v.az) * k;
    return { x0: v.ax + ox, y0: v.ay + oy, z0: v.az, x1: bx, y1: by, z1: bz, a, c: st.c, L };
  }
  /** Step the Vorticella: each contracts now and then on its own, and at once when something swims close. */
  /** Returns the Vorticellae a swimmer startled this step (contracted by near(), not already contracted). */
  function stepVorticella(dt, near) {
    const startled = [];
    for (const v of vorticella) {
      let st = stalkState.get(v);
      if (!st) { st = { c: 0, t: v.next }; stalkState.set(v, st); }
      st.t -= dt;
      if (st.c > 0.5 || st.t > 0) st.c = Math.max(0, st.c - dt * 0.55); // re-extends slowly
      if (st.t <= 0 && st.c < 0.05) { st.c = 1; st.t = 6 + (v.phase * 7) % 9; }
      if (st.wob) { st.wt = (st.wt || 0) + dt; st.wob *= Math.exp(-dt * 3.2); if (st.wob < 0.004) st.wob = 0; }
      if (st.spit > 0) st.spit -= dt;
      if (near && near(v)) { if (st.c < 0.5) startled.push(v); st.c = 1; st.t = Math.max(st.t, 4); }
    }
    return startled;
  }
  /**
   * Knock Vorticella v (a jab's wave, a bump): it snaps its stalk shut at once and the bell recoils.
   * Returns { open } (was it open, feeding, when struck) or null when it was already shut.
   */
  function snapVort(v, k = 1) {
    let st = stalkState.get(v);
    if (!st) { st = { c: 0, t: v.next }; stalkState.set(v, st); }
    const open = st.c < 0.5;
    st.c = 1; st.t = Math.max(st.t, 4 + k); st.wob = Math.min(0.35, (st.wob || 0) + 0.22 * k); st.wt = 0;
    return open ? { open, st } : null;
  }
  /** Is v open and feeding (its cilia drawing a current into the bell)? */
  const vortOpen = (v) => { const st = stalkState.get(v); return !st || st.c < 0.3; };


  /** The solid things near (x, y): obstacles for swim.js (each with ref: what it is, for the shoves). */
  function near(x, y, R0 = 160, time = 0) {
    const out = [];
    const x0 = x - R0, y0 = y - R0, x1 = x + R0, y1 = y + R0;
    eachIn(filaments, x0, y0, x1, y1, (f, ox, oy) => {
      if (vis(f, ox, oy) < 0.5) return;
      out.push({ kind: 'seg', x0: f.x0 + ox, y0: f.y0 + oy, z0: f.z0, x1: f.x1 + ox, y1: f.y1 + oy, z1: f.z1, r: f.r, weave: true, what: 'spirogyra', ref: { kind: 'filament', it: f, ox, oy } });
    });
    eachIn(clumps, x0, y0, x1, y1, (c, ox, oy) => {
      if (vis(c, ox, oy) < 0.5) return;
      const p = clumpPose(c, ox, oy);
      if (p.cr >= 0) return; // crumbled: loose particles now
      if (p.x + c.r < x0 || p.x - c.r > x1 || p.y + c.r < y0 || p.y - c.r > y1) return; // (its box has room for a shove)
      out.push({ kind: 'disc', x: p.x, y: p.y, z: c.z, r: c.r * 0.8, h: c.h, weave: true, what: 'detritus', ref: { kind: 'clump', it: c, ox, oy } });
    });
    eachIn(diatoms, x0, y0, x1, y1, (d, ox, oy) => {
      if (vis(d, ox, oy) < 0.5) return;
      const p = diatomPose(d, ox, oy, time);
      if (p.s && (p.s.cracked || p.s.gone)) return;
      if (p.x + d.L < x0 || p.x - d.L > x1 || p.y + d.L < y0 || p.y - d.L > y1) return;
      const hx = Math.cos(p.a) * (d.L / 2 - d.W / 4), hy = Math.sin(p.a) * (d.L / 2 - d.W / 4);
      out.push({ kind: 'seg', x0: p.x - hx, y0: p.y - hy, z0: p.z, x1: p.x + hx, y1: p.y + hy, z1: p.z, r: d.W / 2, weave: true, what: 'diatom', ref: { kind: 'diatom', it: d, ox, oy } });
    });
    eachIn(vorticella, x0, y0, x1, y1, (v, ox, oy) => {
      if (vis(v, ox, oy) < 0.5) return;
      const p = vortPose(v, ox, oy, time);
      out.push({ kind: 'seg', x0: p.x0, y0: p.y0, z0: p.z0, x1: p.x1, y1: p.y1, z1: p.z1, r: 3, weave: true, what: 'stalk', vort: v, ref: { kind: 'vort', it: v, ox, oy } });
    });
    return out;
  }

  return {
    filaments, clumps, vorticella, diatoms, flocs, glitter, eachIn, glitterIn, near, vortPose, stepVorticella, stalkState, snapVort, vortOpen,
    dynOf, active, diatomPose, clumpPose, flocPose, bendAt, vis, rich, leafK, backK, setRichRef, ref,
  };
}
