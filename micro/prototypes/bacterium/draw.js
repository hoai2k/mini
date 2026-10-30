// Draws the world and the player into the shape renderer as optical
// properties (refractive index step, scatter, fluorescent stain, absorbance).
// Index steps: cytoplasm ≈ 1.38–1.39 in water 1.333 (Δn ≈ 0.05); flagellin
// and phage protein ≈ 1.45–1.5; clay ≈ 1.55; magnetite ≈ 2.4.
import { rng, WORLD } from './world.js';

// Stain amounts per µm of chord. Thin things carry a lot of dye for their
// volume (a filament is mostly surface), so their per-volume amount is high.
const MEMB = 1.0, FLAG = 260, MAG = 140, PHAGE = 650;

export function createDrawer(world) {
  const chan = { memb: 1, flag: 1, mag: 1, phage: 1 };
  const opts = { flagella: true, slowBeat: true };
  const r = rng(99);
  const granules = Array.from({ length: 90 }, () => ({ lx: (r() - 0.5) * 80, ly: -4 - r() * 50, r: 0.25 + r() * 0.45, z: (r() - 0.5) * 2, k: r() }));
  const flakes = new WeakMap();

  const cell = (fl = 1) => ({ dn: 0.05, scat: 0.12, fl: [MEMB * chan.memb * fl, 0, 0], memb: 0.85, ab: [0.002, 0.002, 0.003] });
  const flag = (k = 1) => ({ dn: 0.13, scat: 90, fl: [0, FLAG * chan.flag * k, 0], hk: 0.3 });

  function rodCell(S, c, t, mat = cell()) {
    const k = c.bdelloplast || 0;
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

  function spirillum(S, x, y, a, L, rr, amp, wl, phase, z, flPh, o = {}) {
    const mat = cell(o.fl ?? 1);
    S.strand(x, y, a, L, rr, amp, wl, { ...mat, centred: true, phase, z });
    // a magnetosome chain along the axis: ~15 magnetite crystals of ~45 nm
    if (o.chain !== false) S.chain(x, y, a, L * 0.48, 0.024, 15, { dn: 1.0, scat: 2, fl: [0, 0, MAG * chan.mag], ab: [2.5, 2.5, 2.5], z, hk: 0.2 });
    if (opts.flagella) {
      // one flagellum at each pole
      for (const sgn of [1, -1]) {
        const px = x + Math.cos(a) * L * 0.5 * sgn, py = y + Math.sin(a) * L * 0.5 * sgn;
        const bend = o.tumbling ? sgn * 0.9 : 0;
        S.strand(px, py, a + (sgn > 0 ? 0 : Math.PI) + bend, 3.2, 0.011, 0.24, 1.25, { ...flag(), phase: flPh * sgn, z });
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
    const R = g.R * (0.82 + 0.18 * ext);
    // stalk: from the biofilm to the bell's base; coiled when contracted
    const bx = P.ox - P.up.x * R * 1.9, by = P.oy - P.up.y * R * 1.9;
    const sx = g.x, sy = g.base;
    const L = Math.hypot(bx - sx, by - sy);
    S.strand((sx + bx) / 2, (sy + by) / 2, Math.atan2(by - sy, bx - sx), L, 0.9, 0.3 + (1 - ext) * 3, 3 + ext * 30, { dn: 0.035, scat: 0.2, centred: true, fl: [0.15 * chan.memb, 0, 0], memb: 1, z: 0.4 });
    S.bell(P.ox, P.oy, P.ang, R, 8, R * 0.32, g.seed, { dn: 0.028, scat: 0.06, fl: [0.035 * chan.memb, 0, 0], memb: 1, ab: [0.004, 0.003, 0.006], z: 0.2 });
    // food vacuoles and granules inside the bell
    const rr = rng(Math.floor(g.seed * 100));
    for (let i = 0; i < 26; i++) {
      const ang = rr() * 6.28, rad = Math.sqrt(rr()) * R * 0.75;
      const lx = Math.cos(ang + t * 0.05) * rad, ly = -R * 0.95 + Math.sin(ang + t * 0.05) * rad * 0.9;
      const wx = P.ox + Math.cos(P.ang) * lx - Math.sin(P.ang) * ly, wy = P.oy + Math.sin(P.ang) * lx + Math.cos(P.ang) * ly;
      S.disc(wx, wy, i < 6 ? 1.6 + rr() : 0.4 + rr() * 0.4, { dn: i < 6 ? 0.02 : 0.07, scat: 0.3, ab: i < 6 ? [0.02, 0.025, 0.04] : [0.01, 0.01, 0.01], z: (rr() - 0.5) * 3 });
    }
    if (g.contract > 0 && ext < 0.6) return; // cilia folded in while contracted
    // the peristomial wreath: oral cilia beating in a metachronal wave (shown slowed)
    const n = 34;
    const w = R * 0.32;
    for (let i = 0; i < n; i++) {
      const side = i < n / 2 ? -1 : 1;
      const k = (i % (n / 2)) / (n / 2 - 1);
      const lx = side * (w + k * (R * 0.92 - w));
      const ly = -0.95 * R + Math.sqrt(Math.max(R * R - lx * lx, 0)) / 0.92;
      const beat = Math.sin(t * (opts.slowBeat ? 5 : 25) - i * 0.55);
      const out = side * (0.35 + 0.5 * k) + beat * 0.45 * side;
      const ca = Math.PI / 2 - out; // local angle from +x
      const wx = P.ox + Math.cos(P.ang) * lx - Math.sin(P.ang) * ly, wy = P.oy + Math.sin(P.ang) * lx + Math.cos(P.ang) * ly;
      S.strand(wx, wy, P.ang + ca, 7.5, 0.13, 0.4 + 0.3 * beat, 9, { dn: 0.045, scat: 1.2, fl: [0.6 * chan.memb, 0, 0], memb: 1, z: 0.1, phase: t * 2 + i });
    }
  }

  function amoeba(S, A, t) {
    S.edge(A.x, A.y, A.ang, A.width, A.depth, A.amp, A.seed, { dn: 0.03, scat: 0.05, fl: [0.04 * chan.memb, 0, 0], memb: 1, ab: [0.003, 0.003, 0.004], z: 0.2 });
    const c = Math.cos(A.ang), s = Math.sin(A.ang);
    for (const g of granules) {
      // granules stream toward the advancing edge, and are recycled at the back
      g.ly += 0.6 * (1 / 60);
      const edge = A.amp * (0.6 * Math.sin(0.07 * g.lx + A.seed + 0.2 * t) + 0.4 * Math.sin(0.17 * g.lx + 2 * A.seed - 0.13 * t));
      if (g.ly > edge - 4) g.ly = -A.depth * (0.5 + 0.4 * g.k);
      const wx = A.x + c * g.lx - s * g.ly, wy = A.y + s * g.lx + c * g.ly;
      S.disc(wx, wy, g.r, { dn: 0.08, scat: 0.6, ab: [0.02, 0.02, 0.03], z: g.z });
    }
  }

  function draw(S, t, player, view) {
    const W = world;
    // the biofilm and sediment surface
    S.slab(0, WORLD.slabY, 440, 70, W.slab.amp, W.slab.seed, { dn: 0.014, scat: 0.04, fl: [0.06 * chan.memb, 0, 0.0], ab: [0.012, 0.015, 0.024], z: -0.2, hk: 3 });
    for (const e of W.eps) S.strand(e.x, e.y, e.a, e.L, 0.14, e.amp, e.wl, { dn: 0.012, scat: 0.15, centred: true, fl: [0.35 * chan.memb, 0, 0.04], z: e.z, phase: e.ph });
    for (const c of W.film) {
      if (c.kind === 'coccus') S.disc(c.x, c.y, c.r, { ...cell(), z: c.z });
      else rodCell(S, c, t);
    }
    for (const g of W.grains) S.disc(g.x, g.y, g.r, { wobble: g.wob, seed: g.seed, cap: g.cap, ang: g.ang, dn: 0.2, scat: 0.35, fl: [0.006, 0.01, 0.0], ab: [0.05, 0.065, 0.09], z: g.z });
    for (const p of W.specks) S.disc(p.x, p.y, p.r, { wobble: 0.2, seed: p.seed, dn: 0.2, scat: 0.5, fl: [0.01, 0.015, 0], ab: [0.06, 0.08, 0.11], z: p.z });
    for (const p of W.patches) {
      // a flake of decaying detritus at the patch's heart (the dissolved food itself is invisible)
      S.disc(p.x, p.y, p.flake.r * (0.6 + 0.4 * Math.min(1, p.amt)), { wobble: 0.35, seed: p.flake.seed, ang: p.flake.a, cap: 1.2, dn: 0.05, scat: 0.3, fl: [0.12, 0.14, 0.02], ab: [0.12, 0.16, 0.24], z: 0.3 });
    }
    if (W.opts.grazers) for (const g of W.grazers) grazer(S, g, t);
    if (W.opts.amoeba) amoeba(S, W.amoeba, t);
    for (const c of W.cells) {
      if (c.hidden > 0) continue;
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
        else spirillum(S, c.x, c.y, c.a, c.L, c.r, c.amp, c.wl, c.flPhase * 0.4 * c.sense, c.z, c.flPhase * (opts.slowBeat ? 1 : 5), { tumbling: c.tumble > 0 });
      } else if (c.kind === 'bdello') {
        vibrio(S, c.x, c.y, c.a, c.L, c.r, c.curve, c.z, c.flPhase * (opts.slowBeat ? 1 : 5), c.tumble > 0 ? 1 : 0, { flagellum: !c.prey });
      }
    }
    if (W.opts.phages) for (const p of W.phages) S.disc(p.x, p.y, 0.03, { dn: 0.15, scat: 18, fl: [0, PHAGE * chan.phage, 0], z: p.stuck ? 0 : p.z, hk: 1 });
    drawPlayer(S, t, player);
  }

  function drawPlayer(S, t, s) {
    const sp = s.sp;
    if (s.over && s.over !== 'won' && s.overT > 2.5) return;
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
        if (k < 0.65) spirillum(S, s.x, s.y, s.a, L, sp.r, sp.amp, sp.wl, s.bodyPhase, 0, flPh, {});
        else {
          const off = L * 0.26 + (k - 0.65) * 1.5;
          for (const sg of [1, -1]) spirillum(S, s.x + Math.cos(s.a) * off * sg, s.y + Math.sin(s.a) * off * sg, s.a, L * 0.48, sp.r, sp.amp, sp.wl, s.bodyPhase, 0, flPh, {});
        }
        return;
      }
      spirillum(S, s.x, s.y, s.a, sp.L, sp.r, sp.amp, sp.wl, s.bodyPhase * s.sense, 0, flPh, { tumbling: s.mode === 'tumble' });
    } else {
      if (s.inside) {
        // inside the bdelloplast the predator grows as a filament: only a fluorescent protein shows it (green channel)
        const p = s.inside;
        const k = Math.min(1, s.insideT / 4);
        S.rod(p.x, p.y, p.a + 0.6, 0.6 + 0.9 * k, 0.15, { dn: 0, scat: 0, fl: [0, 6 * chan.flag, 0], z: 0 });
        return;
      }
      vibrio(S, s.x, s.y, s.a, sp.L, sp.r, sp.curve, 0, flPh, s.mode === 'tumble' ? Math.sin((1 - s.tumbleT / sp.tumble) * Math.PI) : 0, { flagellum: !s.boring || s.boreT < 1.5 });
    }
  }

  return { draw, chan, opts };
}
