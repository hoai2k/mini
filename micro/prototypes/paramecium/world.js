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
import { START, DEPTH } from './route.js';

export const TILE = 4800;
const MAXREACH = 2300; // the longest thing's half-extent from its tile-local position (filaments)

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

  // Spirogyra: long unbranched filaments of cells, each with its spiral chloroplast ribbon
  const filaments = [];
  for (let tries = 0; filaments.length < 6 && tries < 200; tries++) {
    const L = R(2000, 4300), a = R(0, Math.PI), cx = R(0, TILE), cy = R(0, TILE);
    const x0 = cx - Math.cos(a) * L / 2, y0 = cy - Math.sin(a) * L / 2, x1 = cx + Math.cos(a) * L / 2, y1 = cy + Math.sin(a) * L / 2;
    if (!segClear(x0, y0, x1, y1, 30)) continue;
    // keep filaments apart where they would lie on top of one another
    if (filaments.some((f) => Math.abs(Math.sin(f.ang - a)) < 0.25 && Math.hypot(f.cx - cx, f.cy - cy) < 500)) continue;
    const rad = R(16, 21);
    filaments.push({ x0, y0, x1, y1, cx, cy, ang: a, L, r: rad, z0: zr(-110, 110), z1: zr(-110, 110), cell: R(70, 105), pitch: R(26, 40), turns: r() < 0.5 ? 1 : 2, phase: R(0, 6.28), shade: R(0.8, 1.15) });
  }
  // detritus clumps: golden-brown flocs of granules; some carry Vorticella
  const clumps = [];
  for (let tries = 0; clumps.length < 16 && tries < 400; tries++) {
    const x = R(0, TILE), y = R(0, TILE), rad = R(26, 66);
    if (!clearOfStart(x, y, rad)) continue;
    if (clumps.some((c) => Math.hypot(c.x - x, c.y - y) < c.r + rad + 120)) continue;
    const z = zr(-120, 60);
    const g = [];
    const n = Math.round(rad * 1.1);
    for (let i = 0; i < n; i++) {
      const aa = R(0, 6.28), d = rad * Math.pow(r(), 0.6);
      g.push({ dx: Math.cos(aa) * d * R(0.8, 1.15), dy: Math.sin(aa) * d, dz: R(-0.6, 0.6) * rad, r: R(1.2, 4.2), gold: r(), tw: R(0, 6.28) });
    }
    clumps.push({ x, y, z, r: rad, h: rad * 0.55, g });
  }
  // Vorticella colonies on some clumps: bells on coiling stalks, fanning out from the clump
  const vorticella = [];
  for (const c of clumps.filter((_, i) => i % 4 === 1)) {
    const base = R(0, 6.28), n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * R(0.35, 0.55);
      const stalk = R(70, 150);
      vorticella.push({ clump: c, ax: c.x + Math.cos(a) * c.r * 0.7, ay: c.y + Math.sin(a) * c.r * 0.7, az: c.z, a: a + R(-0.15, 0.15), stalk, bz: c.z + R(-50, 70), bell: R(15, 20), phase: R(0, 6.28), next: R(3, 14), g: Array.from({ length: 14 }, () => ({ u: R(0.15, 0.9), v: R(-0.7, 0.7), r: R(1.3, 2.6), gold: r() })) });
    }
  }
  // diatoms: pennate (pointed boats with golden chloroplasts) and Fragilaria ribbons
  const diatoms = [];
  for (let tries = 0; diatoms.length < 26 && tries < 400; tries++) {
    const x = R(0, TILE), y = R(0, TILE), rect = r() < 0.25;
    const L = rect ? R(60, 120) : R(45, 115), W = rect ? R(32, 55) : L * R(0.16, 0.26);
    if (!clearOfStart(x, y, L)) continue;
    diatoms.push({ x, y, z: zr(), a: R(0, Math.PI), L, W, rect, n: rect ? Math.round(L / 9) : 0, drift: R(-6, 6) });
  }
  // flocs: small loose golden clusters (texture to swim through)
  const flocs = Array.from({ length: 70 }, () => {
    const rad = R(6, 22);
    return { x: R(0, TILE), y: R(0, TILE), z: zr(), r: rad, g: Array.from({ length: Math.round(4 + rad * 0.5) }, () => ({ dx: R(-1, 1) * rad, dy: R(-1, 1) * rad, r: R(0.8, 2.2), gold: r() })) };
  });
  // the fine glitter: tiny specks that twinkle (bacteria, mineral grains, droplets)
  const glitter = Array.from({ length: 1400 }, () => ({ x: R(0, TILE), y: R(0, TILE), z: zr(DEPTH.min, DEPTH.max), r: R(0.5, 1.5), k: r(), ph: R(0, 6.28), w: R(0.6, 2.4) }));

  // bounding boxes (tile-local) for culling and queries
  for (const f of filaments) f.box = [Math.min(f.x0, f.x1) - f.r, Math.min(f.y0, f.y1) - f.r, Math.max(f.x0, f.x1) + f.r, Math.max(f.y0, f.y1) + f.r];
  for (const c of clumps) c.box = [c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r];
  for (const v of vorticella) {
    const tx = v.ax + Math.cos(v.a) * (v.stalk + v.bell * 2.2), ty = v.ay + Math.sin(v.a) * (v.stalk + v.bell * 2.2);
    v.box = [Math.min(v.ax, tx) - 30, Math.min(v.ay, ty) - 30, Math.max(v.ax, tx) + 30, Math.max(v.ay, ty) + 30];
  }
  for (const d of diatoms) d.box = [d.x - d.L, d.y - d.L, d.x + d.L, d.y + d.L];
  for (const f of flocs) f.box = [f.x - f.r, f.y - f.r, f.x + f.r, f.y + f.r];

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
  const stalkState = new Map(); // a Vorticella's contraction: shared by every copy of it (it is one place, repeated)
  /** A Vorticella's stalk as an obstacle (its coiled length now) and where its bell is. */
  function vortPose(v, ox, oy, time) {
    let st = stalkState.get(v);
    if (!st) { st = { c: 0, t: v.next }; stalkState.set(v, st); }
    const k = 1 - 0.62 * st.c; // contracted: the stalk coils up to ~40 % of its length
    const L = v.stalk * k;
    const sway = Math.sin(time * 0.6 + v.phase) * 0.06 * (1 - st.c);
    const a = v.a + sway;
    const bx = v.ax + ox + Math.cos(a) * L, by = v.ay + oy + Math.sin(a) * L, bz = v.az + (v.bz - v.az) * k;
    return { x0: v.ax + ox, y0: v.ay + oy, z0: v.az, x1: bx, y1: by, z1: bz, a, c: st.c, L };
  }
  /** Step the Vorticella: each contracts now and then on its own, and at once when something swims close. */
  function stepVorticella(dt, near) {
    for (const v of vorticella) {
      let st = stalkState.get(v);
      if (!st) { st = { c: 0, t: v.next }; stalkState.set(v, st); }
      st.t -= dt;
      if (st.c > 0.5 || st.t > 0) st.c = Math.max(0, st.c - dt * 0.55); // re-extends slowly
      if (st.t <= 0 && st.c < 0.05) { st.c = 1; st.t = 6 + (v.phase * 7) % 9; }
      if (near && near(v)) { st.c = 1; st.t = Math.max(st.t, 4); }
    }
  }

  const ob = () => ({});
  /** The solid things near (x, y): obstacles for swim.js. */
  function near(x, y, R0 = 160, time = 0) {
    const out = [];
    const x0 = x - R0, y0 = y - R0, x1 = x + R0, y1 = y + R0;
    eachIn(filaments, x0, y0, x1, y1, (f, ox, oy) => { const o = ob(); Object.assign(o, { kind: 'seg', x0: f.x0 + ox, y0: f.y0 + oy, z0: f.z0, x1: f.x1 + ox, y1: f.y1 + oy, z1: f.z1, r: f.r, weave: true, what: 'spirogyra' }); out.push(o); });
    eachIn(clumps, x0, y0, x1, y1, (c, ox, oy) => { const o = ob(); Object.assign(o, { kind: 'disc', x: c.x + ox, y: c.y + oy, z: c.z, r: c.r * 0.8, h: c.h, weave: true, what: 'detritus' }); out.push(o); });
    eachIn(diatoms, x0, y0, x1, y1, (d, ox, oy) => {
      const o = ob();
      const hx = Math.cos(d.a) * (d.L / 2 - d.W / 4), hy = Math.sin(d.a) * (d.L / 2 - d.W / 4);
      Object.assign(o, { kind: 'seg', x0: d.x + ox - hx, y0: d.y + oy - hy, z0: d.z, x1: d.x + ox + hx, y1: d.y + oy + hy, z1: d.z, r: d.W / 2, weave: true, what: 'diatom' }); out.push(o);
    });
    eachIn(vorticella, x0, y0, x1, y1, (v, ox, oy) => {
      const p = vortPose(v, ox, oy, time), o = ob();
      Object.assign(o, { kind: 'seg', x0: p.x0, y0: p.y0, z0: p.z0, x1: p.x1, y1: p.y1, z1: p.z1, r: 3, weave: true, what: 'stalk', vort: v }); out.push(o);
    });
    return out;
  }

  return { filaments, clumps, vorticella, diatoms, flocs, glitter, eachIn, glitterIn, near, vortPose, stepVorticella, stalkState };
}
