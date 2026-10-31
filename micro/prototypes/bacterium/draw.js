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
        // lining up to ram (main.js: c.windup): its leading pole sharpens into a bright point
        if (c.windup > 0) S.disc(c.x + Math.cos(c.a) * c.L * 0.5, c.y + Math.sin(c.a) * c.L * 0.5, 0.12 + 0.12 * c.windup, { dn: 0.12, scat: 2.5, fl: [0.4 * chan.memb, 20 * chan.flag * c.windup, 0], z: c.z, hk: 0.5 });
      }
    }
    if (W.opts.phages) for (const p of W.phages) if (!p.anim && !p.homing) S.disc(p.x, p.y, 0.03, { dn: 0.15, scat: 18, fl: [0, PHAGE * chan.phage, 0], z: p.stuck ? 0 : p.z, hk: 1 });
    // a phage homing in on a player (main.js): drawn 3× and denser so it reads in every look (a labelled
    // stretch, as in the catch); its long tail fibres splay as they catch the wall (the wind-up)
    if (W.opts.phages) for (const p of W.phages) if (p.homing) homingPhage(S, p, t);
    if (W.landmarks) landmarks(S, t, W.landmarks);
    if (W.stentor) stentor(S, t, W.stentor);
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
  const stR = rng(707);
  const vortex = Array.from({ length: 90 }, () => ({ a: stR() * 6.283, r: stR(), v: 0.4 + stR() * 0.8, sz: 0.25 + stR() * 0.5 }));
  const stripes = Array.from({ length: 220 }, () => ({ u: stR(), v: stR() * 2 - 1 }));
  function stentor(S, t, B) {
    const M = B.mouth, c = B.contract;
    const R = B.discR * (1 - 0.45 * c); // contracted: the disc pulls in
    const blue = { dn: 0.03, scat: 0.12, fl: [0.06 * chan.memb, 0, 0], memb: 1, ab: [0.014, 0.006, 0.002], z: 0.2 };
    // the oral disc's rim: a giant-cell edge facing the field (left)
    S.edge(M.x - R, M.y, Math.PI / 2, R * 2.1, 140, 2.5, 6.1, blue);
    // the body: from below the disc down to the foot on the biofilm
    const fx = B.foot.x, fy = B.foot.y, bx = M.x - R * 0.4, by = M.y - R * 0.85;
    const bodyA = Math.atan2(fy - by, fx - bx), bodyL = Math.hypot(fx - bx, fy - by);
    S.edge((fx + bx) / 2 - Math.sin(bodyA) * 6, (fy + by) / 2 + Math.cos(bodyA) * 6, bodyA + Math.PI, bodyL * (1 - 0.3 * c), 60, 2, 2.2, blue);
    // stentorin stripes: rows of blue granules along the body
    for (const g of stripes) {
      const x = bx + (fx - bx) * g.u * (1 - 0.3 * c) + Math.sin(bodyA) * (g.v * 18 + 10) * (1 - 0.4 * g.u), y = by + (fy - by) * g.u * (1 - 0.3 * c) - Math.cos(bodyA) * (g.v * 18 + 10) * (1 - 0.4 * g.u);
      S.disc(x, y, 0.45, { dn: 0.05, scat: 0.4, ab: [0.05, 0.02, 0.004], z: 0.1 });
    }
    // the foot: a holdfast of fine threads on the biofilm
    for (let i = 0; i < 7; i++) S.strand(fx, fy, -Math.PI / 2 + (i - 3) * 0.3, 5 + (i % 3), 0.15, 0.4, 3, { dn: 0.04, scat: 0.6, fl: [0.3 * chan.memb, 0, 0], memb: 1, z: 0 });
    // the membranelle band round the disc: long compound cilia beating in a wave (faster in the tell)
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.55 + 0.9 * (i / (n - 1)));
      const x = M.x + Math.cos(a) * R, y = M.y + Math.sin(a) * R;
      const beat = Math.sin(B.phase * 2 - i * 0.5);
      const ang = a + Math.PI * 0.5 + 0.55 * beat * (1 - c);
      S.strand(x, y, ang, (16 + 3 * beat) * (1 - 0.7 * c), 0.35, 0.6, 14, { dn: 0.05, scat: 1.4 + 2.5 * B.glow, fl: [0.6 * chan.memb, 0, 0], memb: 1, z: 0.1, phase: B.phase + i });
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

  // --- the Micro Zoom landmarks (world.js: landmarks) ---
  const pr = rng(321);
  const cilia = Array.from({ length: 46 }, (_, i) => ({ u: (i / 45 - 0.5), len: 9 + pr() * 2.5, ph: i * 0.42 }));
  const pGran = Array.from({ length: 70 }, () => ({ u: pr() - 0.5, d: 3 + pr() * 80, r: 0.3 + pr() * 0.5, z: (pr() - 0.5) * 3, chl: pr() < 0.45 }));
  function landmarks(S, t, L) {
    // Forward: the swollen host cell with phages landing on it. The phages are true size (60 nm):
    // spots in fluorescence (SYBR) and darkfield, nothing in phase contrast, where only the host's
    // rounded, swollen body and darker contents show that something is wrong with it.
    const F = L.forward, ca = Math.cos(F.a), sa = Math.sin(F.a);
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
    if (mtb && round < 0.35) {
      S.strand(x, y, a, L, rr, sp.amp * (1 - round / 0.35), sp.wl, { ...mat, centred: true, phase: s.bodyPhase });
      if (opts.flagella && flagella) for (const sgn of [1, -1]) S.strand(x + Math.cos(a) * L * 0.5 * sgn, y + Math.sin(a) * L * 0.5 * sgn, a + (sgn > 0 ? 0 : Math.PI), 3.2, 0.011, 0.24, 1.25, { ...flag(1 - dim), phase: flPh * sgn, z: 0 });
    } else S.rod(x, y, a, L, rr, { ...mat, curve: mtb ? 0 : (sp.curve || 0) * (1 - round) });
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
        if (k < 0.65) spirillum(S, s.x, s.y, s.a, L, sp.r, sp.amp, sp.wl, s.bodyPhase, 0, flPh, {});
        else {
          const off = L * 0.26 + (k - 0.65) * 1.5;
          for (const sg of [1, -1]) spirillum(S, s.x + Math.cos(s.a) * off * sg, s.y + Math.sin(s.a) * off * sg, s.a, L * 0.48, sp.r, sp.amp, sp.wl, s.bodyPhase, 0, flPh, {});
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
    } else {
      if (s.inside) {
        // inside the bdelloplast the predator grows as a filament: only a fluorescent protein shows it (green channel)
        const p = s.inside;
        const k = Math.min(1, s.insideT / 4);
        S.rod(p.x, p.y, p.a + 0.6, 0.6 + 0.9 * k, 0.15, { dn: 0, scat: 0, fl: [0, 6 * chan.flag, 0], z: 0 });
        return;
      }
      // boring in: the predator spins on its pole against the prey's wall and a pore opens there
      const boreA = s.boring ? Math.sin(t * 38) * 0.22 : 0;
      vibrio(S, s.x, s.y, s.a + boreA, sp.L, sp.r, sp.curve, 0, flPh, s.mode === 'tumble' ? Math.sin((1 - s.tumbleT / sp.tumble) * Math.PI) : 0, { flagellum: !s.boring || s.boreT < 1.5 });
      if (s.boring) {
        const k = Math.min(1, s.boreT / 2.5), px = s.x + Math.cos(s.a) * sp.L * 0.5, py = s.y + Math.sin(s.a) * sp.L * 0.5;
        S.disc(px, py, 0.14 + 0.12 * k + 0.04 * Math.sin(t * 20), { dn: -0.02, scat: 1.2, fl: [0.5 * chan.memb, 30 * chan.flag * k, 0], z: 0 });
      }
    }
  }

  return { draw, drawPlayer, chan, opts };
}
