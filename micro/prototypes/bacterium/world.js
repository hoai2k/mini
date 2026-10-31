// The scene: a thin layer of bog-pond water over sediment and biofilm, seen
// at 1000×. Oxygen falls toward the sediment; food comes in patches; two
// peritrich grazers draw feeding currents; an amoeba's edge creeps; phages
// drift; other bacteria run and tumble or sit in the biofilm.
// Units: µm and seconds. +y is toward the air (the meniscus), −y into the sediment.

export const WORLD = { x0: -210, x1: 210, y0: -135, y1: 135, slabY: -72 };

// Oxygen in % of air saturation: falls roughly exponentially from the
// meniscus and is used up by the biofilm, reaching zero just above it.
export function oxygen(y) {
  return Math.max(0, 100 * Math.exp((y - WORLD.y1) / 38) - 1);
}
export function oxygenY(pct) { return WORLD.y1 + 38 * Math.log((pct + 1) / 100); }

// Seeded random numbers so the scene is the same each visit.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Distance from point (px, py) to a segment centred at (x, y), angle a, length L. Returns [dist, s along]. */
export function segDist(px, py, x, y, a, L) {
  const c = Math.cos(a), s = Math.sin(a);
  const dx = px - x, dy = py - y;
  const u = Math.max(-L / 2, Math.min(L / 2, dx * c + dy * s));
  const qx = x + c * u - px, qy = y + s * u - py;
  return [Math.hypot(qx, qy), u];
}

// Matching the GLSL edge functions in bacterium-shapes.js.
const slabEdge = (x, amp, seed) => amp * (0.6 * Math.sin(0.04 * x + seed) + 0.4 * Math.sin(0.11 * x + 2 * seed));
const amoebaEdge = (x, amp, seed, t) => amp * (0.6 * Math.sin(0.07 * x + seed + 0.2 * t) + 0.4 * Math.sin(0.17 * x + 2 * seed - 0.13 * t));

// E. coli tumble angle: mean about 68° (Berg & Brown 1972), either way.
export function tumbleAngle(r) {
  const a = Math.max(0.15, Math.min(Math.PI, (68 + 36 * gauss(r)) * Math.PI / 180));
  return r() < 0.5 ? -a : a;
}

export function createWorld() {
  const r = rng(51);
  const W = WORLD;
  const opts = { grazers: true, phages: true, hunters: true, amoeba: true, npcRun: true, brownian: true, field: 20 };
  // which predators are hungry right now (main.js runs their hunger: shared/predation.js)
  const hunt = { phage: true, bdello: true, amoeba: true };
  const slab = { amp: 4, seed: 1.3 };
  const surfaceY = (x) => W.slabY + slabEdge(x, slab.amp, slab.seed);

  // --- sediment grains (clay and silt, bigger than any bacterium), static ---
  const grains = [];
  for (let i = 0; i < 26; i++) {
    const big = i < 14;
    const x = W.x0 + r() * (W.x1 - W.x0);
    const y = big ? W.slabY - 6 + r() * 14 : W.slabY + 5 + r() * 120;
    const rad = big ? 6 + r() * 10 : 1.6 + r() * 3;
    grains.push({ x, y, r: rad, wob: 0.18 + r() * 0.12, seed: r() * 50, cap: big ? 7 : 2.5, ang: r() * 6.28, z: big ? -0.5 + r() : (r() - 0.5) * 2.4 });
  }
  // small clay specks and colloids: Brownian
  const specks = [];
  for (let i = 0; i < 260; i++) specks.push({ x: W.x0 + r() * (W.x1 - W.x0), y: W.y0 + 30 + r() * (W.y1 - W.y0 - 30), r: 0.12 + r() * 0.3, z: (r() - 0.5) * 2.5, seed: r() * 9 });

  // --- matrix (EPS) strands in and above the biofilm ---
  const eps = [];
  for (let i = 0; i < 70; i++) {
    const x = W.x0 + r() * (W.x1 - W.x0);
    eps.push({ x, y: W.slabY - 4 + r() * 14, a: (r() - 0.5) * 2.2, L: 8 + r() * 22, amp: 0.4 + r() * 1.2, wl: 6 + r() * 10, ph: r() * 6, z: (r() - 0.5) * 1.2 });
  }

  // --- biofilm cells: attached rods, cocci in clusters, below the surface ---
  const film = [];
  for (let i = 0; i < 520; i++) {
    const x = W.x0 + 4 + r() * (W.x1 - W.x0 - 8);
    const y = surfaceY(x) - 0.8 - Math.pow(r(), 1.6) * 26;
    const coccus = r() < 0.3;
    film.push({ kind: coccus ? 'coccus' : 'rod', x, y, a: r() * 6.28, L: coccus ? 0 : 1.4 + r() * 1.6, r: coccus ? 0.45 + r() * 0.15 : 0.32 + r() * 0.1, z: (r() - 0.5) * 1.6, gramNeg: !coccus, bdelloplast: 0, ghost: false, prey: !coccus });
  }

  // --- free bacteria in the water ---
  const cells = [];
  const addCell = (kind, x, y) => {
    const c = { kind, x, y, a: r() * 6.28, z: (r() - 0.5) * 0.9, run: r() * 1.5, tumble: 0, stopped: 0, bdelloplast: 0, ghost: false, sense: r() < 0.5 ? 1 : -1, attachedBy: null, flPhase: r() * 6 };
    if (kind === 'rod') Object.assign(c, { L: 1.8 + r() * 0.9, r: 0.42, v: 18 + r() * 10, motile: r() < 0.65, gramNeg: true, prey: true });
    if (kind === 'coccus') Object.assign(c, { L: 0, r: 0.5, v: 0, motile: false, gramNeg: false });
    if (kind === 'chain') Object.assign(c, { L: 0, r: 0.42, n: 4 + Math.floor(r() * 6), bend: (r() - 0.5) * 0.25, v: 0, motile: false, gramNeg: false });
    if (kind === 'mtb') Object.assign(c, { L: 2.6 + r() * 0.8, r: 0.27, v: 35 + r() * 15, motile: true, gramNeg: true, prey: true, amp: 0.3, wl: 1.6 });
    if (kind === 'bdello') Object.assign(c, { L: 1.0, r: 0.19, v: 75, motile: true, gramNeg: true, curve: 0.7, hunter: true, cooldown: 0 });
    cells.push(c);
    return c;
  };
  for (let i = 0; i < 90; i++) addCell('rod', W.x0 + r() * (W.x1 - W.x0), W.slabY + 4 + Math.pow(r(), 1.4) * 170);
  for (let i = 0; i < 40; i++) addCell('coccus', W.x0 + r() * (W.x1 - W.x0), W.slabY + 3 + r() * 190);
  for (let i = 0; i < 16; i++) addCell('chain', W.x0 + r() * (W.x1 - W.x0), W.slabY + 3 + r() * 190);
  for (let i = 0; i < 10; i++) addCell('mtb', W.x0 + r() * (W.x1 - W.x0), oxygenY(2.5) + (r() - 0.5) * 40);
  for (let i = 0; i < 3; i++) addCell('bdello', -60 + r() * 120, oxygenY(3) + (r() - 0.5) * 30);

  // --- food patches: dissolved organic matter round decaying detritus or a lysed cell ---
  const patches = [];
  const addPatch = (x, y, lysis = false) => {
    const p = { x, y, r: 10 + r() * 9, amt: 0.8 + r() * 0.4, flake: { a: r() * 6.28, seed: r() * 40, r: 1.2 + r() * 1.8 }, lysis };
    patches.push(p);
    if (lysis) for (let i = 0; i < 35; i++) phages.push(newPhage(x + gauss(r) * 5, y + gauss(r) * 5));
    return p;
  };

  // --- phages ---
  const phages = [];
  function newPhage(x, y) { return { x, y, z: (r() - 0.5) * 1.6, stuck: null }; }
  for (let i = 0; i < 110; i++) phages.push(newPhage(W.x0 + r() * (W.x1 - W.x0), W.slabY + r() * 200));

  for (const [x, y, lys] of [[-40, oxygenY(2), false], [55, oxygenY(1.2), true], [140, oxygenY(3.5), false], [-150, oxygenY(1.0), true], [10, oxygenY(0.6), false], [-95, oxygenY(4), false], [100, W.slabY + 10, false]]) addPatch(x, y, lys);

  // --- grazers: two peritrichs (Vorticella-like) on stalks from the biofilm ---
  const grazers = [
    { x: -118, base: W.slabY - 4, ang: 0.35, R: 17, ext: 1, contract: 0, next: 18 + r() * 10, seed: 3.1 },
    { x: 92, base: W.slabY - 4, ang: -0.3, R: 15, ext: 1, contract: 0, next: 26 + r() * 10, seed: 7.7 },
  ];
  const STALK = 46;
  for (const g of grazers) g.stalk = STALK;
  function grazerPose(g) {
    // bell centre on top of the stalk; oral opening points along ang (0 = up)
    const L = g.stalk * (0.35 + 0.65 * g.ext);
    const sx = g.x + Math.sin(g.ang * 0.6) * L * 0.5;
    const top = { x: sx + Math.sin(g.ang) * 2, y: g.base + L };
    const up = { x: -Math.sin(g.ang), y: Math.cos(g.ang) };
    // shape origin = oral opening; the bell centre is R below it along −up
    const ox = top.x + up.x * g.R * 1.9, oy = top.y + up.y * g.R * 1.9;
    const mouth = { x: ox - up.x * g.R * 0.6, y: oy - up.y * g.R * 0.6 };
    return { ox, oy, up, top, mouth, ang: g.ang, R: g.R };
  }

  // --- the amoeba's edge, creeping in from the lower right ---
  const amoeba = { x: 175, y: W.slabY + 26, ang: 2.0, width: 110, depth: 70, amp: 5, seed: 2.2, speed: 1.4 };

  function grazerFlow(x, y, out) {
    out.x = 0; out.y = 0;
    if (!opts.grazers) return out;
    for (const g of grazers) {
      if (g.contract > 0 || g.feeding === false) continue; // the feeding current is off while it rests
      const P = g.pose;
      const dx = P.mouth.x - x, dy = P.mouth.y - y;
      const d = Math.hypot(dx, dy) + 1e-6;
      if (d > 70) continue;
      // a sink at the oral funnel, strongest in front of the opening (1/r² in this thin layer)
      const cosF = -(dx * P.up.x + dy * P.up.y) / d;
      const front = 0.25 + 0.75 * Math.max(0, cosF);
      const u = Math.min(260, 60 * (16 / Math.max(d, 4)) ** 2) * front * g.ext;
      out.x += (dx / d) * u; out.y += (dy / d) * u;
    }
    return out;
  }
  const tmpF = { x: 0, y: 0 };

  function food(x, y) {
    let c = 0;
    for (const p of patches) { const d2 = (x - p.x) ** 2 + (y - p.y) ** 2; if (d2 < 9 * p.r * p.r) c += p.amt * Math.exp(-d2 / (p.r * p.r)); }
    return c;
  }
  function eat(x, y, amount) {
    let tot = 0;
    for (const p of patches) { const d2 = (x - p.x) ** 2 + (y - p.y) ** 2; const w = Math.exp(-d2 / (p.r * p.r)); const take = Math.min(p.amt, amount * w); p.amt -= take; tot += take; }
    return tot;
  }

  function insideAmoeba(x, y, t) {
    if (!opts.amoeba) return -1;
    const c = Math.cos(amoeba.ang), s = Math.sin(amoeba.ang);
    const dx = x - amoeba.x, dy = y - amoeba.y;
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    if (Math.abs(lx) > amoeba.width * 0.45 || ly < -amoeba.depth) return -1;
    return amoebaEdge(lx, amoeba.amp, amoeba.seed, t) - ly; // depth inside (positive inside)
  }

  function pushOutOfGrains(o, rad) {
    for (const g of grains) {
      const dx = o.x - g.x, dy = o.y - g.y, d = Math.hypot(dx, dy), m = g.r * 0.92 + rad;
      if (d < m && d > 1e-6) { o.x = g.x + (dx / d) * m; o.y = g.y + (dy / d) * m; return true; }
    }
    return false;
  }

  const world = {
    opts, hunt, grains, specks, eps, film, cells, phages, patches, grazers, amoeba, slab, surfaceY,
    oxygen, food, eat, insideAmoeba, pushOutOfGrains, grazerPose,
    flowAt(x, y) { const f = grazerFlow(x, y, { x: 0, y: 0 }); return f; },
    /** Field direction (unit) and strength in µT. North points into the sediment (−y). */
    get field() { return { x: 0.12, y: -0.993, uT: opts.field }; },
    addPatch,
    newPhage,
    r,
    update(dt, t, player) {
      for (const g of grazers) {
        g.pose = grazerPose(g);
        // stalk contraction: the spasmoneme coils in milliseconds, re-extends over seconds
        if (g.contract > 0) { g.contract -= dt; g.ext = Math.min(1, g.ext + dt / 3); if (g.contract <= 0) g.ext = 1; }
        else if (t > g.next) { g.contract = 3; g.ext = 0; g.next = t + 20 + r() * 15; }
      }
      // the amoeba creeps toward the player when near (≈1.4 µm/s), otherwise wanders
      if (opts.amoeba) {
        const dx = player.x - amoeba.x, dy = player.y - amoeba.y, d = Math.hypot(dx, dy);
        if (d < 90 && player.alive && hunt.amoeba) {
          const nAng = Math.atan2(-dx, dy); // turn the edge's outward normal (local +y) toward the player
          amoeba.ang += wrapA(nAng - amoeba.ang) * Math.min(1, dt * 0.15);
          amoeba.x += (dx / d) * amoeba.speed * dt; amoeba.y += (dy / d) * amoeba.speed * dt;
        } else {
          amoeba.x += Math.sin(t * 0.05) * 0.3 * dt;
        }
        amoeba.x = Math.max(W.x0 + 30, Math.min(W.x1 - 10, amoeba.x));
        amoeba.y = Math.max(W.slabY - 10, Math.min(W.y1 - 40, amoeba.y));
      }
      const sq = Math.sqrt(dt);
      const br = opts.brownian ? 1 : 0;
      // specks: Brownian (D = kT / 6πηr ≈ 0.22/r µm²/s) and carried by the feeding currents
      for (const p of specks) {
        const D = 0.22 / p.r;
        const f = grazerFlow(p.x, p.y, tmpF);
        p.x += f.x * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
        p.y += f.y * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
        if (eatenByGrazer(p)) respawnFar(p, player);
      }
      // phages: D ≈ 4 µm²/s (a 60 nm head and tail)
      if (opts.phages) for (const p of phages) {
        if (p.stuck) continue;
        const f = grazerFlow(p.x, p.y, tmpF);
        p.x += f.x * dt + br * 2.9 * sq * gauss(r);
        p.y += f.y * dt + br * 2.9 * sq * gauss(r);
        if (eatenByGrazer(p) || p.x < W.x0 || p.x > W.x1 || p.y < W.slabY - 10 || p.y > W.y1) respawnFar(p, player);
      }
      // free cells
      for (const c of cells) stepCell(c, dt, t, sq, br, player);
      // depleted patches are replaced by a new one elsewhere (a new lysis or decaying flake)
      for (let i = patches.length - 1; i >= 0; i--) {
        if (patches[i].amt < 0.06) {
          patches.splice(i, 1);
          const y = oxygenY(0.6 + r() * 5);
          let x = W.x0 + 20 + r() * (W.x1 - W.x0 - 40);
          if (Math.abs(x - player.x) < 40) x = -x;
          addPatch(x, y, r() < 0.4);
        }
      }
      if (phages.length > 260) phages.splice(0, phages.length - 260);
    },
  };

  function eatenByGrazer(p) {
    if (!opts.grazers) return false;
    for (const g of grazers) {
      if (g.contract > 0 || g.feeding === false) continue;
      const P = g.pose;
      if ((p.x - P.mouth.x) ** 2 + (p.y - P.mouth.y) ** 2 < 9) return true;
    }
    return false;
  }
  function respawnFar(p, player) {
    for (let k = 0; k < 6; k++) {
      p.x = W.x0 + r() * (W.x1 - W.x0); p.y = W.slabY + r() * (W.y1 - W.slabY);
      if (Math.hypot(p.x - player.x, p.y - player.y) > 40) break;
    }
  }

  function stepCell(c, dt, t, sq, br, player) {
    c.flPhase += dt * 30;
    if (c.ghost) return;
    const f = grazerFlow(c.x, c.y, tmpF);
    if (c.bdelloplast > 0 || c.attachedBy) {
      // a prey cell with a predator attached stops swimming; a bdelloplast is a sphere
      c.stopped = 1;
      if (c.bdelloplast > 0 && c.bdelloplast < 1) c.bdelloplast = Math.min(1, c.bdelloplast + dt / 1.5);
      c.x += f.x * dt * 0.3; c.y += f.y * dt * 0.3;
      return;
    }
    let vx = 0, vy = 0;
    if (c.motile && opts.npcRun) {
      if (c.tumble > 0) {
        c.tumble -= dt;
        if (c.tumble <= 0) c.run = c.kind === 'mtb' ? 2 + r() * 3 : -Math.log(1 - r()) * (c.kind === 'bdello' ? 0.7 : 1.0);
      } else {
        c.run -= dt;
        if (c.run <= 0) {
          if (c.kind === 'mtb') { c.sense *= -1; c.a += Math.PI; c.tumble = 0.2; }
          else { c.a += tumbleAngle(r); c.tumble = c.kind === 'bdello' ? 0.12 : 0.1 + r() * 0.1; }
        }
        let v = c.v;
        if (c.kind === 'mtb') {
          // magneto-aerotaxis: aligned by the field, reversing on the oxygen sense
          const O = oxygen(c.y);
          const goingDown = Math.sin(c.a) < 0;
          if ((O > 5 && !goingDown) || (O < 0.4 && goingDown)) { c.run = Math.min(c.run, 0.05); }
          const mAng = c.sense > 0 ? c.a : c.a + Math.PI;
          const B = world.field;
          const bAng = Math.atan2(B.y, B.x);
          c.a -= Math.sin(mAng - bAng) * (B.uT / 20) * 0.75 * dt;
        }
        if (c.kind === 'bdello' && opts.hunters) {
          c.cooldown -= dt;
          // collide with prey: attach and enter (time-compressed)
          if (c.cooldown <= 0) for (const p of cells) {
            if (!p.prey || p === c || p.bdelloplast || p.ghost || p.attachedBy) continue;
            if (Math.abs(p.x - c.x) > 3 || Math.abs(p.y - c.y) > 3) continue;
            const [d] = segDist(c.x, c.y, p.x, p.y, p.a, p.L);
            if (d < p.r + 0.3) { p.attachedBy = c; c.prey = p; c.attachT = 0; break; }
          }
          if (c.prey) {
            c.attachT += dt;
            c.x = c.prey.x + Math.cos(c.prey.a) * c.prey.L * 0.3; c.y = c.prey.y + Math.sin(c.prey.a) * c.prey.L * 0.3;
            if (c.attachT > 3) { c.prey.bdelloplast = 0.01; c.prey.attachedBy = null; c.prey = null; c.cooldown = 8; c.hidden = 6; }
            return;
          }
          if (c.hidden > 0) { c.hidden -= dt; return; }
        }
        vx = Math.cos(c.a) * v; vy = Math.sin(c.a) * v;
        c.a += (c.kind === 'bdello' ? 1.1 : 0.45) * sq * gauss(r) * br;
      }
    }
    // Brownian translation: a 1–2 µm cell, D ≈ 0.2–0.4 µm²/s
    const D = c.motile ? 0.25 : c.kind === 'chain' ? 0.12 : 0.4;
    c.x += (vx + f.x) * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
    c.y += (vy + f.y) * dt + br * Math.sqrt(2 * D) * sq * gauss(r);
    if (!c.motile) c.a += br * 0.3 * sq * gauss(r);
    if (c.y < surfaceY(c.x) + 1) { c.y = surfaceY(c.x) + 1; c.a = -c.a; }
    if (c.y > W.y1 - 2) { c.y = W.y1 - 2; c.a = -c.a; }
    if (c.x < W.x0) c.x += W.x1 - W.x0;
    if (c.x > W.x1) c.x -= W.x1 - W.x0;
    pushOutOfGrains(c, c.r);
    if (eatenByGrazer(c)) { c.x = W.x0 + r() * (W.x1 - W.x0); c.y = W.slabY + 20 + r() * 150; }
    void player; void t;
  }

  for (const g of grazers) g.pose = grazerPose(g);
  return world;
}
