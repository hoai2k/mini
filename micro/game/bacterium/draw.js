// Draws the world and the player into the shape renderer as optical
// properties (refractive index step, scatter, fluorescent stain, absorbance).
// Index steps: cytoplasm ≈ 1.38–1.39 in water 1.333 (Δn ≈ 0.05); flagellin
// and phage protein ≈ 1.45–1.5; clay ≈ 1.55; magnetite ≈ 2.4.
import { rng, WORLD, DROP } from './world.js';

// Stain amounts per µm of chord. Thin things carry a lot of dye for their
// volume (a filament is mostly surface), so their per-volume amount is high.
const MEMB = 1.0, FLAG = 260, MAG = 140, PHAGE = 650;

/**
 * Telling players apart (README "Telling players apart"): each player's strain
 * carries a fluorescent protein filling its cytoplasm, and kin that join a
 * player's flock by answering that player's beacon take the same label (their
 * daughters keep it). Player 1 is today's cell, unlabelled; then CFP (shown
 * cyan, the stain's blue channel), mCherry (red) and mTagBFP2 (violet), keyed
 * to the player colours (teal, rose, blue). Bright in fluorescence; in phase
 * contrast a faint tint of the player's colour (a labelled departure: these
 * proteins barely tint a cell in transmitted light); nothing in darkfield.
 * The label channels: fl's blue for CFP, lab's two (bacterium-shapes.js).
 */
const FP_AMT = 2.4; // label per µm of chord
const tintAb = (hex, k = 0.45) => {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => -Math.log(Math.max(0.05, v / 255)));
  const lo = Math.min(...c);
  return c.map((v) => (v - lo) * k);
};
export const LABELS = [
  null,
  { name: 'CFP', color: '#4fa89a', fl: [0, 0, FP_AMT * 0.8], lab: [0, 0] },
  { name: 'mCherry', color: '#c8697a', fl: [0, 0, 0], lab: [FP_AMT, 0] },
  { name: 'mTagBFP2', color: '#7f8fd0', fl: [0, 0, 0], lab: [0, FP_AMT] },
].map((L) => L && { ...L, ab: tintAb(L.color) });

export function createDrawer(world) {
  const chan = { memb: 1, flag: 1, mag: 1, phage: 1 };
  const opts = { flagella: true, slowBeat: true };
  const r = rng(99);
  const granules = Array.from({ length: 90 }, () => ({ lx: (r() - 0.5) * 80, ly: -4 - r() * 50, r: 0.25 + r() * 0.45, z: (r() - 0.5) * 2, k: r() }));
  const flakes = new WeakMap();

  const chanLab = { on: 1 };
  // 2.5D depth cues (world.js LAYER): a mover's height hz is drawn relative to the plane your cell swims in
  // (depth.focusH, set by main.js: the focus follows your cell), compressed by depth.zk into the optics'
  // own defocus (so a cell 4 µm above is softer, not lost), a slight scale (depth.scale per µm), and a faint
  // offset footprint on the sediment under anything well above it.
  const depth = { focusH: 1.8, zk: 0.15, scale: 0.015, shadow: true };
  // level of detail for a big swarm (perf; main.js sets px, the µm per screen pixel being drawn): a cell
  // shorter than lod.simple px on screen is drawn as its body alone (no flagella, magnetosome chain,
  // footprint or slime: none of them would show at that size), one instanced shape
  const lod = { px: 0.05, simple: 12, crowd: 200 };
  const zOf = (o, z0 = 0) => (o.hz === undefined ? z0 : z0 + (o.hz - depth.focusH) * depth.zk);
  const sizeOf = (o) => (o.hz === undefined ? 1 : 1 + depth.scale * (o.hz - depth.focusH));
  const shade = { dn: 0, scat: 0, ab: [0, 0, 0], z: 0 };
  // A cell riding on top of a clay grain: the grain's optical path is taken out under it (a cell-shaped
  // window of three soft discs along it), so the cell shows over the grain as a light shape with its own
  // image in it, instead of being lost in the grain. (The image adds every layer's optical path, so "on
  // top" needs this: a labelled stretch of the optics.)
  const win = { dn: -0.2, scat: -0.35, fl: [-0.006, -0.01, 0], ab: [-0.05, -0.065, -0.09], cap: 0, z: 0 };
  function overGrain(S, o, L) {
    if (o.hz === undefined || !world.grainUnder) return;
    const u = world.grainUnder(o.x, o.y);
    if (!u || u.h < 0.6 || o.hz < u.h) return;
    const g = u.g, thick = Math.min(g.cap, 2 * Math.sqrt(Math.max(0, g.r * g.r - u.d * u.d)));
    win.cap = thick; win.z = g.z;
    const ca = Math.cos(o.a || 0), sa = Math.sin(o.a || 0);
    for (const f of [-0.3, 0, 0.3]) S.disc(o.x + ca * L * f, o.y + sa * L * f, 0.8, win);
  }
  function footprint(S, o, L, r) {
    if (!depth.shadow || o.hz === undefined) return;
    const g = world.groundAt ? world.groundAt(o.x, o.y) : 0, up = o.hz - g;
    if (up < 1.2) return;
    const k = Math.min(1, (up - 1.2) / 3) * 0.8;
    shade.dn = 0.005 * k; shade.scat = 0.02 * k; shade.ab[0] = shade.ab[1] = 0.012 * k; shade.ab[2] = 0.016 * k;
    shade.z = (g - depth.focusH) * depth.zk;
    S.rod(o.x + 0.22 * up, o.y - 0.3 * up, o.a || 0, L * 0.9, r * 1.7, shade);
  }
  // The label's fill: drawn over the body with no index step or scatter, so only fluorescence (and a faint tint) shows it.
  const labMat = { dn: 0, scat: 0, fl: [0, 0, 0], lab: [0, 0], ab: [0, 0, 0], memb: 0, z: 0, centred: true, phase: 0, curve: 0, hk: 0 };
  function label(slot, k = 1, z = 0) {
    const L = LABELS[slot | 0];
    if (!L || !chanLab.on || k <= 0) return null;
    for (let i = 0; i < 3; i++) { labMat.fl[i] = L.fl[i] * k; labMat.ab[i] = L.ab[i] * k; }
    labMat.lab[0] = L.lab[0] * k; labMat.lab[1] = L.lab[1] * k; labMat.z = z;
    return labMat;
  }
  const cell = (fl = 1) => ({ dn: 0.05, scat: 0.12, fl: [MEMB * chan.memb * fl, 0, 0], memb: 0.85, ab: [0.002, 0.002, 0.003] });
  const flag = (k = 1) => ({ dn: 0.13, scat: 90, fl: [0, FLAG * chan.flag * k, 0], hk: 0.3 });

  function rodCell(S, c, t, mat = cell()) {
    const k = c.bdelloplast || 0;
    if (c.lysed) {
      // lysed by your army (X): the rod rounds up and swells, then bursts into a fading puff of its contents
      const e = c.lysed;
      if (e < 0.55) { const q = e / 0.55; S.rod(c.x, c.y, c.a, c.L * (1 - q), c.r * (1 + 0.9 * q), { ...mat, z: c.z }); }
      else { const q = (e - 0.55) / 0.45; S.disc(c.x, c.y, 0.9 + 1.6 * q, { dn: 0.02 * (1 - q), scat: 0.3 * (1 - q), fl: [0.3 * chan.memb * (1 - q), 0.05 * (1 - q), 0], ab: [0.004, 0.004, 0.004], z: c.z }); }
      return;
    }
    if (c.ghost) { S.disc(c.x, c.y, 0.8, { dn: 0.012, scat: 0.05, fl: [0.25 * chan.memb, 0, 0], memb: 1, z: c.z }); return; }
    if (k > 0) {
      // rounding into a bdelloplast: the rod becomes a sphere
      S.rod(c.x, c.y, c.a, c.L * (1 - k), c.r * (1 + 0.85 * k), { ...mat, z: c.z });
      return;
    }
    S.rod(c.x, c.y, c.a, c.L, c.r, { ...mat, curve: c.curve || 0, z: c.z });
  }

  function peritrichous(S, c, t) {
    // E. coli-like: ~5 flagella from all over the body; a bundle behind in a run, splayed in a tumble
    if (!opts.flagella || !c.motile || c.bdelloplast || c.attachedBy) return;
    const ph = c.flPhase * (opts.slowBeat ? 1 : 5);
    const bx = c.x - Math.cos(c.a) * c.L * 0.5, by = c.y - Math.sin(c.a) * c.L * 0.5;
    if (c.tumble > 0) {
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1;
        const u = (i / 3 - 0.5) * c.L;
        const px = c.x + Math.cos(c.a) * u - Math.sin(c.a) * c.r * side, py = c.y + Math.sin(c.a) * u + Math.cos(c.a) * c.r * side;
        S.strand(px, py, c.a + Math.PI + side * (0.9 + i * 0.35), 5.5, 0.01, 0.22, 2.3, { ...flag(), phase: ph + i, z: c.z });
      }
    } else {
      S.strand(bx, by, c.a + Math.PI, 6.5, 0.025, 0.22, 2.3, { ...flag(2.2), phase: ph, z: c.z });
    }
  }

  // Scratch materials for the spirillum and the collective's kin (up to 160 cells a frame with four
  // players): the shape renderer copies every field when a shape is pushed, so one reused object per
  // kind of part draws exactly what fresh ones did, without ~15 allocations per cell per frame.
  const spBody = { dn: 0.05, scat: 0.12, fl: [0, 0, 0], memb: 0.85, ab: [0.002, 0.002, 0.003], centred: true, phase: 0, z: 0 };
  const spChain = { dn: 1.0, scat: 2, fl: [0, 0, 0], ab: [2.5, 2.5, 2.5], z: 0, hk: 0.2 };
  const spFlag = { dn: 0.13, scat: 90, fl: [0, 0, 0], hk: 0.3, phase: 0, z: 0 };
  const NO_OPTS = {};
  function spirillum(S, x, y, a, L, rr, amp, wl, phase, z, flPh, o = NO_OPTS) {
    // body: cell(o.fl ?? 1), centred, with this phase and height
    spBody.fl[0] = MEMB * chan.memb * (o.fl ?? 1); spBody.phase = phase; spBody.z = z;
    S.strand(x, y, a, L, rr, amp, wl, spBody);
    // a magnetosome chain along the axis: ~15 magnetite crystals of ~45 nm
    if (o.chain !== false) { spChain.fl[2] = MAG * chan.mag; spChain.z = z; S.chain(x, y, a, L * 0.48, 0.024, 15, spChain); }
    if (opts.flagella && o.flagella !== false) {
      // one flagellum at each pole (flag())
      spFlag.fl[1] = FLAG * chan.flag; spFlag.z = z;
      for (let sgn = 1; sgn >= -1; sgn -= 2) {
        const px = x + Math.cos(a) * L * 0.5 * sgn, py = y + Math.sin(a) * L * 0.5 * sgn;
        const bend = o.tumbling ? sgn * 0.9 : 0;
        spFlag.phase = flPh * sgn;
        S.strand(px, py, a + (sgn > 0 ? 0 : Math.PI) + bend, 3.2, 0.011, 0.24, 1.25, spFlag);
      }
    }
  }

  function vibrio(S, x, y, a, L, rr, curve, z, flPh, flick, o = {}) {
    S.rod(x, y, a, L, rr, { ...cell(o.fl ?? 1), curve, z });
    if (opts.flagella && o.flagellum !== false) {
      const px = x - Math.cos(a) * L * 0.5, py = y - Math.sin(a) * L * 0.5;
      // sheathed polar flagellum (~28 nm with its sheath); a flick bends it ~90°
      S.strand(px, py, a + Math.PI + flick * 1.4, 3.2, 0.014, 0.2, 1.05, { ...flag(1.3), phase: flPh, z });
    }
  }

  function grazer(S, g, t) {
    const P = g.pose;
    const ext = g.ext;
    // its damage state (guards.js hpK): the bell shrinks and darkens as the drills wear it down; a hit
    // flashes it; beaten, the bell dissolves away (fade)
    const hp = g.hpK ?? 1, fade = 1 - (g.fade || 0), hit = g.hit ? 1 : 0;
    if (fade <= 0.01) return;
    const R = g.R * (0.82 + 0.18 * ext) * (0.8 + 0.2 * hp);
    // stalk: from the biofilm to the bell's base; coiled when contracted
    const bx = P.ox - P.up.x * R * 1.9, by = P.oy - P.up.y * R * 1.9;
    const sx = g.x, sy = g.base;
    const L = Math.hypot(bx - sx, by - sy);
    S.strand((sx + bx) / 2, (sy + by) / 2, Math.atan2(by - sy, bx - sx), L, 0.9, 0.3 + (1 - ext) * 3, 3 + ext * 30, { dn: 0.035 * fade, scat: 0.2 * fade, centred: true, fl: [0.15 * chan.memb * fade, 0, 0], memb: 1, z: 0.4 });
    const dmg = 1 - hp;
    S.bell(P.ox, P.oy, P.ang, R, 8, R * 0.32, g.seed, { dn: 0.028 * fade, scat: (0.06 + 0.12 * hit) * fade, fl: [(0.035 + 0.05 * hit) * chan.memb * fade, 0, 0], memb: 1, ab: [(0.004 + 0.02 * dmg) * fade, (0.003 + 0.022 * dmg) * fade, (0.006 + 0.016 * dmg) * fade], z: 0.2 });
    if (fade < 1) return;
    // food vacuoles and granules inside the bell
    const rr = rng(Math.floor(g.seed * 100));
    for (let i = 0; i < 26; i++) {
      const ang = rr() * 6.28, rad = Math.sqrt(rr()) * R * 0.75;
      const lx = Math.cos(ang + t * 0.05) * rad, ly = -R * 0.95 + Math.sin(ang + t * 0.05) * rad * 0.9;
      const wx = P.ox + Math.cos(P.ang) * lx - Math.sin(P.ang) * ly, wy = P.oy + Math.sin(P.ang) * lx + Math.cos(P.ang) * ly;
      S.disc(wx, wy, i < 6 ? 1.6 + rr() : 0.4 + rr() * 0.4, { dn: i < 6 ? 0.02 : 0.07, scat: 0.3, ab: i < 6 ? [0.02, 0.025, 0.04] : [0.01, 0.01, 0.01], z: (rr() - 0.5) * 3 });
    }
    // its feeding current, made visible (the encounter pattern: every danger shows): specks streaming
    // into the funnel along the front, faster and brighter as it pulls harder
    if (g.feeding !== false && g.contract <= 0 && !g.beaten) {
      const cur = g.cur || (g.cur = Array.from({ length: 46 }, () => ({ d: 6 + r() * 58, a: (r() - 0.5) * 2.4, sz: 0.2 + r() * 0.35 })));
      const pull = g.pull || 1, ua = Math.atan2(P.up.y, P.up.x);
      for (const q of cur) {
        q.d -= (60 * (16 / Math.max(q.d, 4)) ** 2 * pull * (0.25 + 0.75 * Math.cos(q.a) ** 2)) * (1 / 60) * 0.35 + 2 * (1 / 60);
        if (q.d < 3) { q.d = 40 + r() * 28; q.a = (r() - 0.5) * 2.4; }
        const x = P.mouth.x + Math.cos(ua + q.a) * q.d, y = P.mouth.y + Math.sin(ua + q.a) * q.d;
        if (S.inView(x, y, 2)) S.disc(x, y, q.sz, { dn: 0.05, scat: 0.5 + 0.6 * Math.min(2, pull - 1), fl: [0.02, 0.04 + 0.1 * Math.min(2, pull - 1), 0.02], ab: [0.01, 0.01, 0.012], z: 0 });
      }
    }
    if (g.contract > 0 && ext < 0.6) return; // cilia folded in while contracted
    // resting (not feeding): the oral cilia lie still, folded half in, and no current flows
    const feeding = g.feeding !== false;
    // the attack: cilia beat harder and faster as the current intensifies (g.pull, main.js)
    const beatK = feeding ? (g.gulping ? 2.2 : 1) * Math.pow(g.pull || 1, 0.8) : 0;
    // the peristomial wreath: oral cilia beating in a metachronal wave (shown slowed)
    const n = 34;
    const w = R * 0.32;
    for (let i = 0; i < n; i++) {
      const side = i < n / 2 ? -1 : 1;
      const k = (i % (n / 2)) / (n / 2 - 1);
      const lx = side * (w + k * (R * 0.92 - w));
      const ly = -0.95 * R + Math.sqrt(Math.max(R * R - lx * lx, 0)) / 0.92;
      const beat = beatK ? Math.sin(t * (opts.slowBeat ? 5 : 25) * beatK - i * 0.55) : -0.6;
      const out = side * (feeding ? 0.35 + 0.5 * k : 0.1 + 0.2 * k) + beat * 0.45 * side;
      const ca = Math.PI / 2 - out; // local angle from +x
      const wx = P.ox + Math.cos(P.ang) * lx - Math.sin(P.ang) * ly, wy = P.oy + Math.sin(P.ang) * lx + Math.cos(P.ang) * ly;
      S.strand(wx, wy, P.ang + ca, 7.5, 0.13, 0.4 + 0.3 * beat, 9, { dn: 0.045, scat: 1.2, fl: [0.6 * chan.memb, 0, 0], memb: 1, z: 0.1, phase: t * 2 + i });
    }
  }

  function amoeba(S, A, t) {
    // its damage state (guards.js hpK): the edge thins and its granules thin out as the drills wear it down;
    // the surge (its bite) bulges the edge forward; beaten, it withdraws and fades
    const hp = A.hpK ?? 1, fade = 1 - (A.fade || 0), hit = A.hit ? 1 : 0;
    if (fade <= 0.01) return;
    const k = fade * (0.55 + 0.45 * hp);
    const sx = A.surge ? -Math.sin(A.ang) * 5 * A.surge : 0, sy = A.surge ? Math.cos(A.ang) * 5 * A.surge : 0;
    S.edge(A.x + sx, A.y + sy, A.ang, A.width, A.depth, A.amp * (1 + 0.8 * (A.surge || 0)), A.seed, { dn: 0.03 * k, scat: (0.05 + 0.1 * hit) * k, fl: [(0.04 + 0.05 * hit) * chan.memb * k, 0, 0], memb: 1, ab: [0.003 * k, 0.003 * k, 0.004 * k], z: 0.2 });
    const c = Math.cos(A.ang), s = Math.sin(A.ang);
    const nG = Math.round(granules.length * (0.35 + 0.65 * hp) * fade);
    for (let gi = 0; gi < nG; gi++) {
      const g = granules[gi];
      // granules stream toward the advancing edge, and are recycled at the back
      g.ly += 0.6 * (1 / 60);
      const edge = A.amp * (0.6 * Math.sin(0.07 * g.lx + A.seed + 0.2 * t) + 0.4 * Math.sin(0.17 * g.lx + 2 * A.seed - 0.13 * t));
      if (g.ly > edge - 4) g.ly = -A.depth * (0.5 + 0.4 * g.k);
      const wx = A.x + c * g.lx - s * g.ly, wy = A.y + s * g.lx + c * g.ly;
      S.disc(wx, wy, g.r, { dn: 0.08, scat: 0.6, ab: [0.02, 0.02, 0.03], z: g.z });
    }
  }

  /** One free cell of the world (rods, cocci, chains, the stranger strain, Bdellovibrio). */
  function drawCell(S, c, t) {
    if (c.kind === 'rod') { rodCell(S, c, t); peritrichous(S, c, t); }
    else if (c.kind === 'coccus') S.disc(c.x, c.y, c.r, { ...cell(), z: c.z });
    else if (c.kind === 'chain') {
      for (let i = 0; i < c.n; i++) {
        const u = (i - (c.n - 1) / 2) * c.r * 1.9;
        const b = c.bend * u * u;
        S.disc(c.x + Math.cos(c.a) * u - Math.sin(c.a) * b, c.y + Math.sin(c.a) * u + Math.cos(c.a) * b, c.r, { ...cell(), z: c.z });
      }
    } else if (c.kind === 'mtb') {
      if (c.bdelloplast || c.ghost) rodCell(S, c, t);
      else {
        // the stranger strain: never your kin (it does not answer your beacon), so it never looks like it:
        // longer and thinner, a tighter helix, no magnetosome-chain stain, and always faintly amber
        spirillum(S, c.x, c.y, c.a, c.L, c.r, c.amp, c.wl, c.flPhase * 0.4 * c.sense, c.z, c.flPhase * (opts.slowBeat ? 1 : 5), { tumbling: c.tumble > 0, chain: !c.stranger });
        if (c.stranger && !c.waylay) tint(S, { x: c.x, y: c.y, a: c.a, L: c.L, r: c.r, amp: c.amp, wl: c.wl, bodyPhase: c.flPhase * 0.4 * c.sense }, c.z, 0.45);
      }
    } else if (c.kind === 'bdello') {
      vibrio(S, c.x, c.y, c.a, c.L, c.r, c.curve, c.z, c.flPhase * (opts.slowBeat ? 1 : 5), c.tumble > 0 ? 1 : 0, { flagellum: !c.prey });
      // lining up to ram (main.js: c.windup): its leading pole sharpens into a bright point
      if (c.windup > 0) S.disc(c.x + Math.cos(c.a) * c.L * 0.5, c.y + Math.sin(c.a) * c.L * 0.5, 0.12 + 0.12 * c.windup, { dn: 0.12, scat: 2.5, fl: [0.4 * chan.memb, 20 * chan.flag * c.windup, 0], z: c.z, hk: 0.5 });
    }
  }

  function draw(S, t, player, view) {
    const W = world;
    // the biofilm and sediment surface
    // centred on x = 0 (its wavy top edge is in local x, matching world.js surfaceY), wide enough for the whole level
    // the sediment bank: deep enough that you never see past it (its EPS slows you to a stop: world.js filmK)
    const B = S.box;
    if (B.y0 < WORLD.slabY + 20) S.slab(0, WORLD.slabY, 2 * DROP.R + 400, 320, W.slab.amp, W.slab.seed, { dn: 0.014, scat: 0.04, fl: [0.06 * chan.memb, 0, 0.0], ab: [0.012, 0.015, 0.024], z: -0.2, hk: 3 });
    // the scenery over the view only (world.js keeps it in a grid)
    W.eachEps(B.x0 - 35, B.y0 - 35, B.x1 + 35, B.y1 + 35, (e) => { if (S.inView(e.x, e.y, e.L + e.amp + 3)) S.strand(e.x, e.y, e.a, e.L, 0.14, e.amp, e.wl, { dn: 0.012, scat: 0.15, centred: true, fl: [0.35 * chan.memb, 0, 0.04], z: e.z, phase: e.ph }); });
    W.eachFilm(B.x0 - 5, B.y0 - 5, B.x1 + 5, B.y1 + 5, (c) => {
      if (!S.inView(c.x, c.y, 5)) return;
      if (c.kind === 'coccus') S.disc(c.x, c.y, c.r, { ...cell(), z: c.z });
      else rodCell(S, c, t);
    });
    W.eachGrain(B.x0 - 30, B.y0 - 30, B.x1 + 30, B.y1 + 30, (g) => S.disc(g.x, g.y, g.r, { wobble: g.wob, seed: g.seed, cap: g.cap, ang: g.ang, dn: 0.2, scat: 0.35, fl: [0.006, 0.01, 0.0], ab: [0.05, 0.065, 0.09], z: g.z }));
    for (const p of W.specks) if (S.inView(p.x, p.y, 3.5)) S.disc(p.x, p.y, p.r, { wobble: 0.2, seed: p.seed, dn: 0.2, scat: 0.5, fl: [0.01, 0.015, 0], ab: [0.06, 0.08, 0.11], z: p.z });
    for (const p of W.patches) {
      // a flake of decaying detritus at the patch's heart (the dissolved food itself is invisible)
      S.disc(p.x, p.y, p.flake.r * (0.6 + 0.4 * Math.min(1, p.amt)), { wobble: 0.35, seed: p.flake.seed, ang: p.flake.a, cap: 1.2, dn: 0.05, scat: 0.3, fl: [0.12, 0.14, 0.02], ab: [0.12, 0.16, 0.24], z: 0.3 });
    }
    if (W.opts.grazers) for (const g of W.grazers) if (!g.parked) grazer(S, g, t);
    if (W.opts.amoeba && !W.amoeba.parked) amoeba(S, W.amoeba, t);
    for (const c of W.cells) {
      if (c.dead) {
        // killed by your army: it rounds, darkens and fades
        if (c.dead < 1.5 && S.inView(c.x, c.y, 4)) { const e = c.dead / 1.5; S.rod(c.x, c.y, c.a, c.L * (1 - 0.8 * e), c.r * (1 + e), { dn: 0.05 * (1 - e), scat: 0.12, fl: [MEMB * chan.memb * (1 - e), 0, 0], memb: 0.85, ab: [0.002 + 0.05 * e, 0.002 + 0.045 * e, 0.003 + 0.03 * e], z: c.z }); }
        continue;
      }
      if (c.hidden > 0 || !S.inView(c.x, c.y, 12)) continue;
      // (2.5D: drawn at its height for this frame, then put back)
      const z0 = c.z, L0 = c.L, r0 = c.r;
      if (c.hz !== undefined) { const k = sizeOf(c); c.z = zOf(c, z0); c.L = L0 * k; c.r = r0 * k; footprint(S, c, L0, r0); overGrain(S, c, L0); }
      drawCell(S, c, t);
      c.z = z0; c.L = L0; c.r = r0;
    }
    if (W.opts.phages) for (const p of W.phages) {
      if (p.anim || p.homing || !S.inView(p.x, p.y, 3.1)) continue;
      // the cloud on the way (a gate) is drawn 3× so it reads in every look (a labelled stretch, as for a homing phage)
      // (2.5D: each particle at its own stable height in the layer, drawn round your cell's plane)
      if (p.cloud) { if (p.dh === undefined) p.dh = 0.6 + 5 * ((++phageN * 0.6180339) % 1); cloudPhage.z = (p.dh - depth.focusH) * depth.zk; S.disc(p.x, p.y, 0.09, cloudPhage); }
      else S.disc(p.x, p.y, 0.03, { dn: 0.15, scat: 18, fl: [0, PHAGE * chan.phage, 0], z: p.stuck ? 0 : p.z, hk: 1 });
    }
    // a phage homing in on a player (main.js): drawn 3× and denser so it reads in every look (a labelled
    // stretch, as in the catch); its long tail fibres splay as they catch the wall (the wind-up)
    if (W.opts.phages) for (const p of W.phages) if (p.homing) homingPhage(S, p, t);
    if (W.landmarks) landmarks(S, t, W.landmarks);
    if (W.stentor && W.stentor.placed) stentor(S, t, W.stentor);
    if (W.coll && W.coll.opts.on) kin(S, t, W.coll);
    // one player or a list of them (local multiplayer: every cell is drawn alike; main.js marks each in its colour)
    for (const p of Array.isArray(player) ? player : [player]) drawPlayer(S, t, p);
  }

  function homingPhage(S, p, t) {
    const a = p.dirA ?? 0, ca = Math.cos(a), sa = Math.sin(a);
    const pmat = { dn: 0.6, scat: 20, fl: [0, PHAGE * chan.phage * 0.15, 0], z: 0, hk: 1 };
    const tail = 0.36, hx = p.x - ca * (tail + 0.14), hy = p.y - sa * (tail + 0.14);
    S.disc(hx, hy, 0.17, { ...pmat, fl: [0, PHAGE * chan.phage * 0.3, 0] });
    S.rod(p.x - ca * tail * 0.5, p.y - sa * tail * 0.5, a, tail, 0.045, pmat);
    const sp = p.splay || 0;
    for (const k of [-1, -0.35, 0.35, 1]) {
      const fa = a + k * (0.25 + 1.05 * sp) + Math.sin(t * 9 + k * 3) * 0.08 * (1 - sp);
      S.strand(p.x, p.y, fa, 0.42 + 0.1 * sp, 0.012, 0.02, 0.2, { ...pmat, dn: 0.4, scat: 10 });
    }
  }

  // --- the boss: Stentor coeruleus (stentor.js; main.js runs it) ---
  // Partly off-frame: the rim of its oral disc with the membranelle band
  // beating round it, the vortex of specks drawn into the mouth (brighter in
  // the tell), the striped blue body tapering down to its foot on the biofilm.
  // After the delivered sheet (assets/reference-sheets/boss-stentor.webp): a trumpet flaring
  // from a narrow foot with a little flared holdfast to a wide oral disc, its rim ringed all
  // round by the membranelle band, spiral grooves on the disc running into the oral pouch,
  // longitudinal blue-green pigment stripes, the macronucleus a chain of beads down the body,
  // and green food vacuoles (zoochlorellae) inside. Here it stands as in the sheet's first
  // view: foot on the biofilm at the lower left, disc tilted to the upper right.
  const stR = rng(707);
  const vortex = Array.from({ length: 90 }, () => ({ a: stR() * 6.283, r: stR(), v: 0.4 + stR() * 0.8, sz: 0.25 + stR() * 0.5 }));
  const beads = Array.from({ length: 11 }, (_, i) => ({ u: 0.22 + i * 0.055, off: 0.18 + 0.05 * Math.sin(i * 1.7), r: 0.55 + 0.25 * stR() }));
  const vac = Array.from({ length: 16 }, () => ({ u: 0.45 + stR() * 0.5, v: (stR() - 0.5) * 1.4, r: 2.2 + stR() * 3, green: stR() < 0.55 }));
  function stentor(S, t, B) {
    const M = B.mouth, c = B.contract;
    const R = B.discR * (1 - 0.4 * c); // contracted: the disc pulls in
    const fx = B.foot.x, fy = B.foot.y;
    const ang = Math.atan2(M.y - fy, M.x - fx), L0 = Math.hypot(M.x - fx, M.y - fy);
    const L = L0 * (1 - 0.45 * c); // contracted: it shortens in a flash toward its foot
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const at = (u, v) => [fx + ca * u - sa * v, fy + sa * u + ca * v];
    // its damage state (guards.js hpK): paler as the drills wear it down, a flash where they hit
    const hp = B.hpK ?? 1, hit = B.hit ? 1 : 0, pale = 0.45 + 0.55 * hp;
    const blue = { dn: 0.03, scat: 0.12 + 0.15 * hit, fl: [(0.06 + 0.06 * hit) * chan.memb, 0, 0], memb: 1, ab: [0.014 * pale, 0.006 * pale, 0.002 * pale], z: 0.2, phase: B.phase * 0.15 };
    if (S.inView(fx + ca * L * 0.5, fy + sa * L * 0.5, L + R * 1.5)) S.trumpet(fx, fy, ang, L, R, 2.6, 6.1, blue);
    // the macronucleus: a chain of beads down the body (moniliform)
    for (const b of beads) {
      const u = b.u * L, w = 2.6 + (0.56 * R - 2.6) * Math.pow(b.u, 2.3);
      const [x, y] = at(u, w * b.off - w * 0.1);
      if (S.inView(x, y, 8)) S.disc(x, y, Math.max(1.4, w * 0.16 * b.r), { cap: 2.2, dn: 0.03, scat: 0.25, ab: [0.016, 0.014, 0.011], fl: [0.05, 0, 0], z: 0.1 });
    }
    // food vacuoles and green zoochlorellae in the wide part
    for (const g of vac) {
      const u = g.u * L, w = 2.6 + (0.56 * R - 2.6) * Math.pow(g.u, 2.3);
      const [x, y] = at(u, g.v * w * 0.6);
      if (S.inView(x, y, 10)) S.disc(x, y, g.r * (1 - 0.3 * c), g.green ? { cap: 2.5, dn: 0.02, scat: 0.3, ab: [0.07, 0.016, 0.07], fl: [0.02, 0.04, 0], z: 0.1 } : { cap: 2.5, dn: 0.015, scat: 0.3, ab: [0.02, 0.024, 0.034], z: 0.1 });
    }
    // the foot: a few holdfast threads into the biofilm
    for (let i = 0; i < 5; i++) S.strand(fx - ca * 1.5, fy - sa * 1.5, -Math.PI / 2 + (i - 2) * 0.35, 4 + (i % 3), 0.15, 0.4, 3, { dn: 0.04, scat: 0.6, fl: [0.3 * chan.memb, 0, 0], memb: 1, z: 0 });
    // the membranelle band: long compound cilia right round the disc's rim, beating in a wave (faster in the tell)
    const n = 72, ex = 0.42 * R;
    const [dx, dy] = at(L, 0);
    for (let i = 0; i < n; i++) {
      const q = (i / n) * Math.PI * 2;
      const lu = Math.cos(q) * ex, lv = Math.sin(q) * R; // on the rim ellipse, local to the disc centre
      const x = dx + ca * lu - sa * lv, y = dy + sa * lu + ca * lv;
      if (!S.inView(x, y, 22)) continue;
      const nrm = Math.atan2(Math.sin(q) / R, Math.cos(q) / ex) + ang; // outward normal
      const beat = Math.sin(B.phase * 2 - i * 0.45);
      S.strand(x, y, nrm + 0.5 * beat * (1 - c), (15 + 3 * beat) * (1 - 0.7 * c), 0.35, 0.6, 14, { dn: 0.05, scat: 1.4 + 2.5 * B.glow, fl: [0.6 * chan.memb, 0, 0], memb: 1, z: 0.1, phase: B.phase + i });
    }
    // the vortex: specks spiralling into the mouth, brighter and faster as it winds up
    if (B.flowK > 0.05) for (const p of vortex) {
      p.r -= 0.0025 * p.v * B.flowK * (1 - c);
      p.a += 0.012 * p.v * B.flowK / Math.max(0.2, p.r) * (1 - c);
      if (p.r < 0.1) { p.r = 1; p.a = stR() * 6.283; }
      const rr = B.catchR * 0.4 + p.r * (B.pullR - B.catchR * 0.4);
      const x = M.x + Math.cos(p.a) * rr, y = M.y + Math.sin(p.a) * rr;
      S.disc(x, y, p.sz, { dn: 0.06, scat: 0.6 + 4 * B.glow, fl: [0.02, 0.05 + 0.3 * B.glow, 0.02], ab: [0.01, 0.01, 0.012], z: 0 });
    }
  }

  let phageN = 0; // (each cloud phage's stable height, handed out in turn)
  const cloudPhage = { dn: 0.32, scat: 9, fl: [0, PHAGE * 0.12, 0], z: 0, hk: 1 };

  // --- your army (collective.js): kin cells, free or members, the beacon and answers, the slime, the toxin ---
  const KIN_MEMBER = { tumbling: false, fl: 1 }, KIN_FREE = { tumbling: false, fl: 0.8 };
  const KIN_SIMPLE = { tumbling: false, fl: 1, chain: false, flagella: false }, KIN_FREE_SIMPLE = { tumbling: false, fl: 0.8, chain: false, flagella: false };
  // the drill's pore: a bright speck at the nose of a member boring into an enemy, flickering
  const boreMat = { dn: -0.02, scat: 1.4, fl: [0, 0, 0], ab: [0, 0, 0], z: 0 };
  function bore(S, k, t) {
    const f = 0.6 + 0.4 * Math.sin(t * 31 + k.wa * 7);
    boreMat.scat = 1.6 * f; boreMat.fl[0] = 0.55 * f * chan.memb; boreMat.fl[1] = 0.25 * f; boreMat.dn = -0.025 * f;
    S.disc(k.x + Math.cos(k.a) * k.L * 0.55, k.y + Math.sin(k.a) * k.L * 0.55, 0.32 + 0.12 * f, boreMat);
  }
  const pulse = { dn: 0, scat: 0, fl: [0, 0, 0], ab: [0, 0, 0], z: 0 };
  /** A ring of soft spots: the beacon on the medium (autoinducer drawn so it shows: a labelled departure). */
  function ring(S, x, y, R, fade, size, n) {
    pulse.dn = 0.03 * fade; pulse.scat = 0.9 * fade;
    pulse.fl[0] = 0.12 * fade * chan.memb; pulse.fl[1] = 0.5 * fade; pulse.fl[2] = 0.08 * fade;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283;
      const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
      if (S.inView(px, py, 1)) S.disc(px, py, size, pulse);
    }
  }
  // waylaying (collective.js WAYLAY): the stranger's decoy pulse, a drifting member's amber tint and its
  // thin link back to the flock (fading as it drifts), and a member picked off swimming away
  const amber = { dn: 0, scat: 0, fl: [0, 0, 0], ab: [0, 0, 0], z: 0 };
  function amberMat(k) { amber.dn = 0.03 * k; amber.scat = 0.8 * k; amber.fl[0] = 0.55 * k * chan.memb; amber.fl[1] = 0.2 * k; amber.fl[2] = 0; amber.ab[0] = 0; amber.ab[1] = 0.025 * k; amber.ab[2] = 0.07 * k; return amber; }
  function amberRing(S, x, y, R, k, size, n) {
    const m = amberMat(k);
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R; if (S.inView(px, py, 1)) S.disc(px, py, size, m); }
  }
  const driftTint = { dn: 0, scat: 0, fl: [0, 0, 0], lab: [0, 0], ab: [0, 0, 0], memb: 0, z: 0, centred: true, phase: 0, curve: 0, hk: 0 };
  function tint(S, k, o, a) {
    driftTint.fl[0] = 0.9 * a * chan.memb; driftTint.fl[1] = 0.35 * a; driftTint.ab[1] = 0.12 * a; driftTint.ab[2] = 0.4 * a; driftTint.phase = k.bodyPhase; driftTint.z = o;
    S.strand(k.x, k.y, k.a, k.L, k.r, k.amp, k.wl, driftTint);
  }
  function waylays(S, coll, WAY) {
    // the strangers luring a flock: faintly amber, with their decoy pulse spreading to its reach
    for (const c of world.cells) {
      const Wl = c.waylay;
      if (!Wl || !S.inView(c.x, c.y, WAY.reach + 2)) continue;
      tint(S, { x: c.x, y: c.y, a: c.a, L: c.L, r: c.r, amp: c.amp, wl: c.wl, bodyPhase: c.flPhase * 0.4 * c.sense }, zOf(c, c.z), 0.7);
      if (Wl.ping >= 0 && Wl.ping < 1) { const e = Wl.ping ** 0.7; amberRing(S, c.x, c.y, 0.8 + (WAY.reach - 0.8) * e, (1 - Wl.ping) * 0.9, 0.26, Math.max(12, Math.round(6.283 * (0.8 + WAY.reach * e) / 1.2))); }
    }
    for (const C of coll.list) for (const m of C.members) {
      if (!m.drift || !S.inView(m.x, m.y, 60)) continue;
      // the link back to the flock: a thin dotted line to its middle's edge, fading as the drift goes on
      const left = Math.max(0, 1 - m.drift.t / WAY.lostT);
      const dx = C.cx - m.x, dy = C.cy - m.y, d = Math.hypot(dx, dy), run = d - C.R0 * 0.6;
      if (run > 1) {
        const n = Math.min(60, Math.floor(run / 1.1)), mat = amberMat(0.25 + 0.6 * left);
        for (let i = 1; i <= n; i++) { const u = (i * 1.1) / d; const px = m.x + dx * u, py = m.y + dy * u; if (S.inView(px, py, 1)) S.disc(px, py, 0.09 + 0.06 * left, mat); }
      }
    }
  }
  const kinTox = { dn: 0.004, scat: 0.05, ab: [0, 0, 0], z: 0 };
  const kinSlime = { dn: 0.003, scat: 0.02, fl: [0, 0.01, 0.03], z: 0.05 };
  function kin(S, t, coll) {
    const fl = opts.slowBeat ? 1 : 5;
    for (const k of coll.kin) {
      if (!S.inView(k.x, k.y, 6)) continue;
      const C = k.coll;
      // its answer to a beacon: a small pulse of its own as it joins
      if (k.answer && k.answer.t >= 0) { const e = Math.min(1, k.answer.t / 0.7); ring(S, k.x, k.y, 0.9 + 2.8 * e, (1 - e) * 1.3, 0.2, 12); }
      if (k.dying && k.dying.kind === 'waylaid') {
        // picked off by a stranger: an amber flash where it left, then it swims away with it, fading
        const e = Math.min(1, k.dying.t / 2.4);
        if (k.dying.t < 0.8) amberRing(S, k.dying.x, k.dying.y, 1 + 5 * (k.dying.t / 0.8), 1 - k.dying.t / 0.8, 0.3, 18);
        spirillum(S, k.x, k.y, k.a, k.L, k.r, k.amp, k.wl, k.bodyPhase, zOf(k, k.z), k.flPhase * fl, { tumbling: false, fl: 1 - e });
        tint(S, k, zOf(k, k.z), 1 - e);
        continue;
      }
      if (k.dying) {
        // a member taken in your place: it rounds up, darkens and fades
        const e = Math.min(1, k.dying.t / 1.2);
        S.rod(k.x, k.y, k.a, k.L * (1 - 0.8 * e), k.r * (1 + e), { dn: 0.05 * (1 - 0.6 * e), scat: 0.12, fl: [MEMB * chan.memb * (1 - 0.8 * e), 0, 0], memb: 0.85, ab: [0.002 + 0.05 * e, 0.002 + 0.045 * e, 0.003 + 0.03 * e], z: zOf(k, k.z) });
        continue;
      }
      // a charged collective holds the toxin: a faint purple (violacein-like) absorbance
      const charge = C ? C.charge : 0;
      // (2.5D: at its height round your cell's plane, a touch bigger above it, with a footprint below)
      const crowd = C && C.members.length > lod.crowd; // (a big swarm: no footprints, windows or per-cell slime: the swarm reads as one)
      const kz = zOf(k, C ? 0 : k.z) * (crowd ? 0.4 : 1), ks = sizeOf(k); // (a big swarm is kept nearer the focus, so it reads as a swarm, not a blur)
      const simple = k.L / lod.px < lod.simple; // (LOD: too small on screen for its parts to show)
      if (simple) {
        // (far out, a cell is drawn a little fatter than life so a big swarm still reads at a wide field: at least
        // 1.6 px across, with its optical path kept per µm, a labelled stretch)
        spirillum(S, k.x, k.y, k.a, k.L * ks, Math.max(k.r * ks, 0.8 * lod.px), k.amp, k.wl, k.bodyPhase, kz, 0, C ? KIN_SIMPLE : KIN_FREE_SIMPLE);
        const lm = k.label && label(k.label, 1, kz);
        if (lm) { lm.phase = k.bodyPhase; S.strand(k.x, k.y, k.a, k.L * ks, k.r * ks, k.amp, k.wl, lm); }
        if (k.drift) tint(S, k, kz, Math.min(1, 0.4 + k.drift.t / 2));
        if (k.drill) bore(S, k, t);
        continue;
      }
      if (!crowd) { footprint(S, k, k.L, k.r); overGrain(S, k, k.L); }
      spirillum(S, k.x, k.y, k.a, k.L * ks, k.r * ks, k.amp, k.wl, k.bodyPhase, kz, k.flPhase * fl, C ? KIN_MEMBER : KIN_FREE);
      // its label (answering a player's beacon turned it); fading in over its answer pulse
      const lm = k.label && label(k.label, k.answer && k.answer.t >= 0 ? Math.min(1, k.answer.t / 0.7) : 1, kz);
      if (lm) { lm.phase = k.bodyPhase; S.strand(k.x, k.y, k.a, k.L * ks, k.r * ks, k.amp, k.wl, lm); }
      // drifting off after a stranger: tinted amber (fading back as it is called back)
      if (k.drift) tint(S, k, kz, Math.min(1, 0.4 + k.drift.t / 2));
      // drilling into an enemy: a bright pore at its nose, flickering as it bores (guards.js)
      if (k.drill) bore(S, k, t);
      if (crowd) continue;
      if (charge > 0.2) { const ab = kinTox.ab; ab[0] = 0.03 * charge; ab[1] = 0.09 * charge; ab[2] = 0.02 * charge; S.disc(k.x, k.y, 0.5, kinTox); }
      // the slime shield: EPS round every member (thin, faint in phase, a haze in fluorescence)
      if (C && C.level >= 1) { kinSlime.fl[0] = 0.03 * chan.memb; S.disc(k.x, k.y, 2.1, kinSlime); }
    }
    if (coll.WAYLAY) waylays(S, coll, coll.WAYLAY);
    // the beacon (X): a pulse spreading from the flock's middle to its reach, then fading
    for (const C of coll.list) {
      for (const b of C.beacons) {
        const e = Math.min(1, b.t / b.dur) ** 0.7, R = 0.6 + (b.R - 0.6) * e;
        const fade = b.t < b.dur ? 0.65 + 0.35 * (1 - e) : Math.max(0, 1 - (b.t - b.dur) / 0.5) * 0.65;
        if (fade > 0.01) ring(S, b.x, b.y, R, fade, 0.32, Math.max(14, Math.min(84, Math.round((6.283 * R) / 1.1))));
      }
    }
    // the toxin burst: a ring of purple granules racing outward
    for (const C of coll.list) {
      const b = C.burst;
      if (!b) continue;
      const e = Math.min(1, b.t / 0.6), R = 3 + e * b.R, fade = 1 - Math.max(0, (b.t - 0.6) / 0.6);
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * 6.283 + i * 0.07;
        const x = b.x + Math.cos(a) * R, y = b.y + Math.sin(a) * R;
        if (S.inView(x, y, 2)) S.disc(x, y, 0.35 + 0.3 * (1 - e), { dn: 0.05 * fade, scat: 1.2 * fade, ab: [0.05 * fade, 0.18 * fade, 0.04 * fade], fl: [0.2 * fade, 0, 0.25 * fade], z: 0 });
      }
    }
  }

  // --- the Micro Zoom landmarks (world.js: landmarks) ---
  const pr = rng(321);
  const cilia = Array.from({ length: 46 }, (_, i) => ({ u: (i / 45 - 0.5), len: 9 + pr() * 2.5, ph: i * 0.42 }));
  const pGran = Array.from({ length: 70 }, () => ({ u: pr() - 0.5, d: 3 + pr() * 80, r: 0.3 + pr() * 0.5, z: (pr() - 0.5) * 3, chl: pr() < 0.45 }));
  function landmarks(S, t, L) {
    // Forward: the swollen host cell with phages landing on it. The phages are true size (60 nm):
    // spots in fluorescence (SYBR) and darkfield, nothing in phase contrast, where only the host's
    // rounded, swollen body and darker contents show that something is wrong with it.
    const F = L.forward, ca = Math.cos(F.a), sa = Math.sin(F.a);
    if (F.placed) forwardHost(S, F, ca, sa);
    backdoor(S, t, L);
  }
  function forwardHost(S, F, ca, sa) {
    S.rod(F.x, F.y, F.a, F.L, F.r, { dn: 0.055, scat: 0.18, fl: [MEMB * chan.memb * 1.3, 0, 0], memb: 0.9, ab: [0.012, 0.011, 0.014], z: 0 });
    // nucleoid and new phage heads crowding inside (the lytic cycle under way)
    for (let i = 0; i < 9; i++) {
      const u = ((i * 0.37) % 1 - 0.5) * F.L * 0.75, v = Math.sin(i * 2.3) * F.r * 0.45;
      S.disc(F.x + ca * u - sa * v, F.y + sa * u + ca * v, 0.12, { dn: 0.25, scat: 6, fl: [0, PHAGE * chan.phage * 0.35, 0], ab: [0.02, 0.02, 0.02], z: 0, hk: 0.5 });
    }
    for (const q of F.phages) {
      const nx = -sa * q.side, ny = ca * q.side;
      const bx = F.x + ca * q.u + nx * (F.r + 0.12), by = F.y + sa * q.u + ny * (F.r + 0.12);
      S.disc(bx, by, 0.035, { dn: 0.3, scat: 22, fl: [0, PHAGE * chan.phage, 0], z: 0, hk: 1 });
    }
    for (const q of F.incoming) S.disc(F.x + Math.cos(q.ang) * (F.r + q.d), F.y + Math.sin(q.ang) * (F.r + q.d), 0.03, { dn: 0.15, scat: 18, fl: [0, PHAGE * chan.phage, 0], z: (q.d - 3) * 0.1, hk: 1 });
  }
  function backdoor(S, t, L) {

    // Backdoor: the edge of a Paramecium looming in the open water (it is 120 µm long, forty times
    // you): the pellicle with its trichocyst seam, green Chlorella inside, and the cilia beating.
    const E = L.back.edge, ec = Math.cos(E.ang), es = Math.sin(E.ang);
    S.edge(E.x, E.y, E.ang, E.L, E.depth, E.amp, E.seed, { dn: 0.028, scat: 0.07, fl: [0.05 * chan.memb, 0, 0], memb: 1, ab: [0.004, 0.0035, 0.005], z: 0.2 });
    const at = (lx, ly) => [E.x + ec * lx - es * ly, E.y + es * lx + ec * ly];
    for (let i = 0; i < 60; i++) { const [x, y] = at((i / 59 - 0.5) * E.L * 0.9, -1.2); S.disc(x, y, 0.28, { dn: 0.09, scat: 0.8, ab: [0.01, 0.01, 0.014], z: 0.1 }); }
    for (const g of pGran) {
      const [x, y] = at(g.u * E.L * 0.85, -g.d * 0.9 - 2);
      S.disc(x, y, g.chl ? 2.6 : g.r, g.chl ? { dn: 0.03, scat: 0.3, ab: [0.11, 0.022, 0.12], fl: [0.02, 0.04, 0], z: g.z } : { dn: 0.06, scat: 0.5, ab: [0.015, 0.015, 0.02], z: g.z });
    }
    for (const c of cilia) {
      const [x, y] = at(c.u * E.L * 0.92, 0.2);
      const beat = Math.sin(t * (opts.slowBeat ? 4 : 20) - c.ph);
      const ang = E.ang + Math.PI / 2 - 0.25 + 0.55 * beat; // power stroke along the edge, then recovery
      S.strand(x, y, ang, c.len, 0.12, 0.35 + 0.25 * beat, 12, { dn: 0.05, scat: 1.1, fl: [0.5 * chan.memb, 0, 0], memb: 1, z: 0.1, phase: t * 2 + c.ph });
    }
  }

  // --- being caught: every run-ending catch is drawn (main.js drives s.catchAnim) ---
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const lysisDots = Array.from({ length: 26 }, () => ({ a: r() * 6.28, d: Math.sqrt(r()), v: 0.7 + r() * 0.6 }));
  /** The player's body, `round` 0..1 from its own shape to a sphere; `dim` 0..1 darkens and fades it. */
  function body(S, s, x, y, a, round, dim = 0, flPh = 0, flagella = true) {
    const sp = s.sp, mtb = s.species === 'mtb';
    const L = sp.L * (1 - 0.85 * round), rr = sp.r * (1 + 1.0 * round);
    const mat = { dn: 0.05 * (1 - 0.5 * dim), scat: 0.12, fl: [MEMB * chan.memb * (1 - 0.7 * dim), 0, 0], memb: 0.85, ab: [0.002 + 0.05 * dim, 0.002 + 0.045 * dim, 0.003 + 0.03 * dim], z: 0 };
    const lm = label(s.label, 1 - dim);
    if (mtb && round < 0.35) {
      S.strand(x, y, a, L, rr, sp.amp * (1 - round / 0.35), sp.wl, { ...mat, centred: true, phase: s.bodyPhase });
      if (lm) { lm.phase = s.bodyPhase; S.strand(x, y, a, L, rr, sp.amp * (1 - round / 0.35), sp.wl, lm); }
      if (opts.flagella && flagella) for (const sgn of [1, -1]) S.strand(x + Math.cos(a) * L * 0.5 * sgn, y + Math.sin(a) * L * 0.5 * sgn, a + (sgn > 0 ? 0 : Math.PI), 3.2, 0.011, 0.24, 1.25, { ...flag(1 - dim), phase: flPh * sgn, z: 0 });
    } else {
      S.rod(x, y, a, L, rr, { ...mat, curve: mtb ? 0 : (sp.curve || 0) * (1 - round) });
      if (lm) { lm.curve = mtb ? 0 : (sp.curve || 0) * (1 - round); S.rod(x, y, a, L, rr, lm); lm.curve = 0; }
    }
    if (mtb) S.chain(x, y, a, L * 0.48 * (1 - 0.6 * round), 0.024, 15, { dn: 1.0, scat: 2, fl: [0, 0, MAG * chan.mag * (1 - dim)], ab: [2.5, 2.5, 2.5], z: 0, hk: 0.2 });
    if (!mtb && opts.flagella && flagella && round < 0.3) S.strand(x - Math.cos(a) * L * 0.5, y - Math.sin(a) * L * 0.5, a + Math.PI, 3.2, 0.014, 0.2, 1.05, { ...flag(1.3), phase: flPh, z: 0 });
  }
  function drawCaught(S, t, s, A) {
    const sp = s.sp, k = A.t, ph = A.phase;
    const flPh = s.flPhase * (opts.slowBeat ? 1 : 5);
    if (A.kind === 'grazer' || A.kind === 'stentor') {
      // swept down the oral funnel, spinning, then packed into a food vacuole that darkens
      const eat = ph === 'eat' ? ease(k) : ph === 'eaten' ? 1 : 0;
      if (eat > 0) S.disc(s.x, s.y, 2.6 - 0.6 * eat, { dn: -0.02 + 0.05 * eat, scat: 0.5, fl: [0.5 * chan.memb, 0, 0], memb: 1, ab: [0.01 + 0.06 * eat, 0.012 + 0.055 * eat, 0.016 + 0.045 * eat], z: 0 });
      body(S, s, s.x, s.y, s.a, 0.25 * eat, 0.8 * eat, flPh, eat < 0.5);
      return;
    }
    if (A.kind === 'amoeba') {
      // two lobes of the edge rise either side and meet over you; then a phagosome closes and darkens
      const W2 = A.who, n = { x: -Math.sin(W2.ang), y: Math.cos(W2.ang) }, tg = { x: Math.cos(W2.ang), y: Math.sin(W2.ang) };
      const rise = ph === 'strike' ? ease(k) : 1, meet = ph === 'strike' ? 0 : ph === 'hold' ? ease(k) : 1;
      const eat = ph === 'eat' ? ease(k) : ph === 'eaten' ? 1 : 0;
      const lobe = { dn: 0.03, scat: 0.06, fl: [0.06 * chan.memb, 0, 0], memb: 1, ab: [0.004, 0.004, 0.006], z: 0.1 };
      if (eat < 1) for (const sg of [1, -1]) {
        const off = 3.6 - 2.4 * meet;
        const bx = A.x0 + tg.x * sg * off + n.x * (1.2 * rise - 1), by = A.y0 + tg.y * sg * off + n.y * (1.2 * rise - 1);
        const ang = Math.atan2(n.y, n.x) - sg * (0.5 + 0.9 * meet);
        S.rod(bx, by, ang, 2.2 + 2.4 * rise, 1.1 * (1 - 0.6 * eat), { ...lobe, dn: lobe.dn * (1 - eat) });
      }
      if (eat > 0) S.disc(s.x, s.y, 2.4 - 0.9 * eat, { dn: 0.018, scat: 0.3, fl: [0.25 * chan.memb, 0, 0], memb: 1, ab: [0.004 + 0.03 * eat, 0.004 + 0.03 * eat, 0.006 + 0.025 * eat], z: 0 });
      body(S, s, s.x, s.y, s.a, 0.15 * eat, 0.85 * eat, flPh, eat < 0.3);
      return;
    }
    if (A.kind === 'phage') {
      // the phage (drawn ×3 so it reads) lands, its tail sheath contracts and the DNA goes in;
      // then the cell rounds up, fills with new phages and bursts
      const P = A.who, side = P.side;
      const nx = -Math.sin(s.a) * side, ny = Math.cos(s.a) * side; // outward normal at the phage
      const bx = s.x + Math.cos(s.a) * P.u + nx * sp.r, by = s.y + Math.sin(s.a) * P.u + ny * sp.r;
      const contract = ph === 'strike' ? ease(k) : 1;
      const inject = ph === 'hold' ? ease(k) : ph === 'strike' ? 0 : 1;
      const lys = ph === 'eat' ? k : ph === 'eaten' ? 1 : 0;
      const round = ease(Math.min(1, lys / 0.45));
      const burst = Math.max(0, (lys - 0.78) / 0.22);
      const tail = 0.36 * (1 - 0.5 * contract);
      // (drawn ×3 and denser than life so it shows in phase contrast too; really ≈60 nm and invisible there)
      const pmat = { dn: 0.6, scat: 20, fl: [0, PHAGE * chan.phage * 0.15, 0], z: 0, hk: 1 };
      if (lys < 0.3) {
        S.rod(bx + nx * tail * 0.5, by + ny * tail * 0.5, Math.atan2(ny, nx), tail, 0.045 + 0.03 * contract, pmat);
        S.disc(bx + nx * (tail + 0.14), by + ny * (tail + 0.14), 0.17, { ...pmat, fl: [0, PHAGE * chan.phage * 0.3 * (1 - 0.6 * inject), 0] });
      }
      // the DNA: a fluorescent thread uncoiling into the cytoplasm
      if (inject > 0 && lys < 0.5) S.strand(bx - nx * 0.25 * inject, by - ny * 0.25 * inject, Math.atan2(ny, nx) + Math.PI, 0.5 * inject + 0.05, 0.03, 0.06, 0.25, { dn: 0.3, scat: 4, fl: [0, 120 * chan.phage, 0], z: 0, phase: t * 3 });
      if (burst <= 0) body(S, s, s.x, s.y, s.a, round, 0.25 * round, flPh, lys < 0.1);
      else S.disc(s.x, s.y, sp.r * 2.1 * (1 + 0.4 * burst), { dn: 0.012 * (1 - burst * 0.6), scat: 0.05, fl: [0.25 * chan.memb * (1 - burst * 0.7), 0, 0], memb: 1, z: 0 });
      // new phages fill the round cell, then fly out when it lyses
      const fill = Math.max(0, Math.min(1, (lys - 0.35) / 0.4));
      const n = Math.floor(lysisDots.length * fill);
      for (let i = 0; i < n; i++) {
        const d = lysisDots[i];
        const rad = sp.r * 1.7 * d.d * (1 + burst * 7 * d.v);
        S.disc(s.x + Math.cos(d.a) * rad, s.y + Math.sin(d.a) * rad, 0.1, { dn: 0.5, scat: 18, fl: [0, PHAGE * chan.phage * 0.5, 0], z: 0, hk: 1 });
      }
      return;
    }
    if (A.kind === 'bdello') {
      // it rams, bores in through the wall and the cell rounds into a bdelloplast round it
      const lys = ph === 'eat' ? ease(k) : ph === 'eaten' ? 1 : 0;
      body(S, s, s.x, s.y, s.a, lys, 0.15 * lys, flPh, ph === 'strike');
      // the predator inside, denser than your cytoplasm so it shows through the wall
      const B = A.who;
      if (ph !== 'strike') S.rod(B.x, B.y, B.a, 0.95 * (1 - 0.25 * lys), 0.2, { dn: 0.09, scat: 0.3, fl: [MEMB * chan.memb, 30 * chan.flag, 0], memb: 0.85, ab: [0.03, 0.03, 0.04], curve: 0.7 + 0.8 * lys, z: 0 });
      return;
    }
  }

  /** The player's label over its spirillum body (drawPlayer). */
  function labelSpiral(S, s, x, y, L, phase = s.bodyPhase) {
    const lm = label(s.label);
    if (lm) { lm.phase = phase; S.strand(x, y, s.a, L, s.sp.r, s.sp.amp, s.sp.wl, lm); }
  }
  function drawPlayer(S, t, s) {
    const sp = s.sp;
    if (s.catchAnim) { drawCaught(S, t, s, s.catchAnim); return; }
    if (s.over && s.over !== 'won') {
      // oxygen damage or starvation: the motors stop, the cell darkens, swells a little and fades
      if (s.overT > 2.5) return;
      const k = Math.min(1, s.overT / 2.2);
      body(S, s, s.x, s.y, s.a, 0.25 * k, k, 0, false);
      return;
    }
    const flPh = s.flPhase * (opts.slowBeat ? 1 : 5);
    if (s.shedFlagellum) {
      const f = s.shedFlagellum;
      f.t += 1 / 60;
      if (f.t < 12) S.strand(f.x, f.y, f.a, 3.2, 0.014, 0.2, 1.05, { ...flag(1.3 * (1 - f.t / 12)), phase: 0 });
    }
    if (s.species === 'mtb') {
      if (s.divideT) {
        // binary fission: the cell elongates, constricts, and each daughter keeps half the chain
        const k = Math.min(1, s.divideT / 2);
        const L = sp.L * (1 + 0.8 * Math.min(1, k * 1.6));
        if (k < 0.65) { spirillum(S, s.x, s.y, s.a, L, sp.r, sp.amp, sp.wl, s.bodyPhase, 0, flPh, {}); labelSpiral(S, s, s.x, s.y, L); }
        else {
          const off = L * 0.26 + (k - 0.65) * 1.5;
          for (const sg of [1, -1]) { spirillum(S, s.x + Math.cos(s.a) * off * sg, s.y + Math.sin(s.a) * off * sg, s.a, L * 0.48, sp.r, sp.amp, sp.wl, s.bodyPhase, 0, flPh, {}); labelSpiral(S, s, s.x + Math.cos(s.a) * off * sg, s.y + Math.sin(s.a) * off * sg, L * 0.48); }
        }
        return;
      }
      // feeding: the dissolved food taken up from the patch shows as a soft glow drawn into the cell
      if (s.feeding) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 7);
        S.disc(s.x, s.y, 1.9 + 0.35 * pulse, { dn: -0.006, scat: 0.25, fl: [0.03, 0.12 + 0.06 * pulse, 0.02], z: 0 });
        for (let i = 0; i < 6; i++) { const ang = i * 1.047 + t * 1.3, rr = 2.4 - ((t * 1.6 + i * 0.37) % 1) * 2; S.disc(s.x + Math.cos(ang) * rr, s.y + Math.sin(ang) * rr, 0.09, { dn: 0.03, scat: 1.5, fl: [0.05, 0.6, 0.05], z: 0 }); }
      }
      spirillum(S, s.x, s.y, s.a, sp.L, sp.r, sp.amp, sp.wl, s.bodyPhase * s.sense, 0, flPh, { tumbling: s.mode === 'tumble' });
      labelSpiral(S, s, s.x, s.y, sp.L, s.bodyPhase * s.sense);
    } else {
      if (s.inside) {
        // inside the bdelloplast the predator grows as a filament: only a fluorescent protein shows it (green channel)
        const p = s.inside;
        const k = Math.min(1, s.insideT / 4);
        S.rod(p.x, p.y, p.a + 0.6, 0.6 + 0.9 * k, 0.15, { dn: 0, scat: 0, fl: [0, 6 * chan.flag, 0], z: 0 });
        const lm = label(s.label);
        if (lm) { lm.curve = 0; S.rod(p.x, p.y, p.a + 0.6, 0.6 + 0.9 * k, 0.15, lm); }
        return;
      }
      // boring in: the predator spins on its pole against the prey's wall and a pore opens there
      const boreA = s.boring ? Math.sin(t * 38) * 0.22 : 0;
      vibrio(S, s.x, s.y, s.a + boreA, sp.L, sp.r, sp.curve, 0, flPh, s.mode === 'tumble' ? Math.sin((1 - s.tumbleT / sp.tumble) * Math.PI) : 0, { flagellum: !s.boring || s.boreT < 1.5 });
      const lm = label(s.label);
      if (lm) { lm.curve = sp.curve; S.rod(s.x, s.y, s.a + boreA, sp.L, sp.r, lm); lm.curve = 0; }
      if (s.boring) {
        const k = Math.min(1, s.boreT / 2.5), px = s.x + Math.cos(s.a) * sp.L * 0.5, py = s.y + Math.sin(s.a) * sp.L * 0.5;
        S.disc(px, py, 0.14 + 0.12 * k + 0.04 * Math.sin(t * 20), { dn: -0.02, scat: 1.2, fl: [0.5 * chan.memb, 30 * chan.flag * k, 0], z: 0 });
      }
    }
  }

  return { draw, drawPlayer, chan, chanLab, opts, LABELS, depth, lod };
}
