// Soft body collision for creatures that walk on a ground plane (x, z): they
// push each other apart instead of walking through each other (the owner,
// 2026-11-04: "can we have creatures push each other instead of clipping
// through each other? ... I'd hope to push and be pushed").
//
// Each body is a disc { id, x, z, r, m } (and, optionally, its centre's height
// y and half height h: discs whose heights do not overlap pass, as in a jump
// over another). Overlapping discs are moved apart
// along the line between their centres, the push shared by mass: a body of
// mass m against one of mass M moves M / (m + M) of the overlap, so a bigger
// mite shoves you more than you shove it, and a body of mass Infinity (a
// boss, a fixed post) is never moved. A body with `fixed: true` counts as
// Infinity too. A few relaxation passes settle a crowd.
//
// Momentum: what a body was pushed by this step it keeps, in part (`carry`),
// as a slide over the next steps (decaying over `tau` s), so a shove reads as
// a shove and a walker leaning into another keeps pushing it along.
//
// Cost: a spatial hash (cells `cell` wide, a Map of cell keys to body indices)
// rebuilt each step; each body tests only the bodies in its own and the eight
// neighbouring cells. Bodies wider than a cell are fine (the cell grows to the
// widest pair).
//
//   const push = createPush({ cell: 400, carry: 0.35 });
//   const moved = push.step(dt, bodies); // fills each body's dx, dz (µm) and returns the bodies
//   for (const b of moved) if (b.dx || b.dz) b.apply(b.dx, b.dz);
//   push.overlaps(bodies) -> the deepest remaining overlap (checks)

const key = (i, j) => i * 73856093 ^ j * 19349663;

/** One relaxation over the bodies (positions moved in place); returns the deepest overlap found. */
export function relax(bodies, { cell = 400, passes = 3, slop = 0.5 } = {}) {
  const n = bodies.length;
  let maxR = 0;
  for (const b of bodies) if (b.r > maxR) maxR = b.r;
  const C = Math.max(cell, 2 * maxR);
  let deepest = 0;
  const grid = new Map();
  for (let pass = 0; pass < passes; pass++) {
    grid.clear();
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      const k = key(Math.floor(b.x / C), Math.floor(b.z / C));
      const list = grid.get(k);
      if (list) list.push(i); else grid.set(k, [i]);
    }
    deepest = 0;
    for (let i = 0; i < n; i++) {
      const a = bodies[i];
      const ci = Math.floor(a.x / C), cj = Math.floor(a.z / C);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const list = grid.get(key(ci + di, cj + dj));
        if (!list) continue;
        for (const j of list) {
          if (j <= i) continue;
          const b = bodies[j];
          if (a.group !== undefined && a.group === b.group) continue; // (members of one rigid group do not push each other)
          if (a.h !== undefined && b.h !== undefined && Math.abs(a.y - b.y) > a.h + b.h) continue; // (one passes over the other: a jump)
          let dx = b.x - a.x, dz = b.z - a.z;
          const R = a.r + b.r;
          const d2 = dx * dx + dz * dz;
          if (d2 >= R * R) continue;
          let d = Math.sqrt(d2);
          if (d < 1e-6) { dx = Math.cos(i * 2.399 + j); dz = Math.sin(i * 2.399 + j); d = 1e-6; } else { dx /= d; dz /= d; }
          const o = R - d;
          if (o > deepest) deepest = o;
          if (o <= slop) continue;
          const ma = a.fixed ? Infinity : a.m, mb = b.fixed ? Infinity : b.m;
          let wa, wb;
          if (ma === Infinity && mb === Infinity) continue;
          else if (ma === Infinity) { wa = 0; wb = 1; }
          else if (mb === Infinity) { wa = 1; wb = 0; }
          else { wa = mb / (ma + mb); wb = ma / (ma + mb); }
          const push = o - slop;
          a.x -= dx * push * wa; a.z -= dz * push * wa;
          b.x += dx * push * wb; b.z += dz * push * wb;
          a.dx -= dx * push * wa; a.dz -= dz * push * wa;
          b.dx += dx * push * wb; b.dz += dz * push * wb;
        }
      }
    }
    if (deepest <= slop) break;
  }
  return deepest;
}

/**
 * A push solver that keeps each body's slide between steps (by id).
 * cell: the hash's cell width (µm); carry: share 0..1 of a push kept as a
 * slide; tau: how fast the slide dies away (s); maxSlide: its speed limit (µm/s).
 */
export function createPush({ cell = 400, carry = 0.35, tau = 0.15, maxSlide = 900, passes = 3 } = {}) {
  const slide = new Map(); // id -> { vx, vz, t }
  let clock = 0;
  const stats = { bodies: 0, deepest: 0, pushed: 0 };
  return {
    stats,
    /**
     * One step: each body's slide is added first, then overlaps are pushed apart. Fills b.dx, b.dz (the
     * whole move this step, µm) and updates b.x, b.z; the caller applies dx, dz to its creatures.
     */
    step(dt, bodies) {
      clock += dt;
      for (const b of bodies) {
        b.dx = 0; b.dz = 0;
        const s = slide.get(b.id);
        if (s && !(b.fixed || b.m === Infinity) && dt > 0) {
          const k = Math.exp(-(clock - s.t) / tau);
          const ex = s.vx * k * dt, ez = s.vz * k * dt;
          b.x += ex; b.z += ez; b.dx += ex; b.dz += ez;
        }
      }
      const sx = bodies.map((b) => b.dx), sz = bodies.map((b) => b.dz);
      stats.deepest = relax(bodies, { cell, passes });
      stats.bodies = bodies.length; stats.pushed = 0;
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const px = b.dx - sx[i], pz = b.dz - sz[i]; // this step's push alone
        if (px || pz) stats.pushed++;
        const old = slide.get(b.id);
        const k0 = old ? Math.exp(-(clock - old.t) / tau) : 0;
        let vx = (old ? old.vx * k0 : 0) + (dt > 0 ? (carry * px) / dt : 0);
        let vz = (old ? old.vz * k0 : 0) + (dt > 0 ? (carry * pz) / dt : 0);
        const v = Math.hypot(vx, vz);
        if (v > maxSlide) { vx *= maxSlide / v; vz *= maxSlide / v; }
        if (v < 2) slide.delete(b.id); else slide.set(b.id, { vx, vz, t: clock });
      }
      if (slide.size > 4 * bodies.length + 64) for (const [id, s] of slide) if (clock - s.t > 5 * tau) slide.delete(id);
      return bodies;
    },
    /** Forget a body's slide (it was placed somewhere new). */
    forget(id) { slide.delete(id); },
    reset() { slide.clear(); },
  };
}

/** The deepest overlap between any two bodies (µm; 0 when none touch): for checks. */
export function deepestOverlap(bodies) {
  let worst = 0;
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i], b = bodies[j];
    if (a.group !== undefined && a.group === b.group) continue;
    if (a.h !== undefined && b.h !== undefined && Math.abs(a.y - b.y) > a.h + b.h) continue;
    const o = a.r + b.r - Math.hypot(a.x - b.x, a.z - b.z);
    if (o > worst) worst = o;
  }
  return worst;
}
