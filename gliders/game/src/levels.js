// The levels: seeded generators for Superflight-style maps of floating block
// formations (arches, frames, tunnels, towers, spires, mesas, lattices, rings),
// each with its own palette and mix. Pure data, no rendering: the same seed
// always builds the same level, so every player flies the same structures.

import { createRng, hashSeed } from './rng.js';

// --- 3x3 rotation matrices, stored as three columns (local x, y, z axes in world space).
export const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export function rotY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, -s, 0, 1, 0, s, 0, c];
}
export function rotX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, c, s, 0, -s, c];
}
export function rotZ(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}
export function mul(A, B) {
  const out = new Array(9);
  for (let col = 0; col < 3; col++) {
    const x = B[col * 3], y = B[col * 3 + 1], z = B[col * 3 + 2];
    out[col * 3] = A[0] * x + A[3] * y + A[6] * z;
    out[col * 3 + 1] = A[1] * x + A[4] * y + A[7] * z;
    out[col * 3 + 2] = A[2] * x + A[5] * y + A[8] * z;
  }
  return out;
}
export function apply(M, v) {
  return [M[0] * v[0] + M[3] * v[1] + M[6] * v[2], M[1] * v[0] + M[4] * v[1] + M[7] * v[2], M[2] * v[0] + M[5] * v[1] + M[8] * v[2]];
}

// --- Palettes. sky: zenith and horizon; fog; cloud sea; sun light; blocks.
export const PALETTES = {
  sherbet: { sky: ['#6fa8ff', '#ffd3e6'], fog: '#f6d6ea', cloud: '#fff1f7', sun: '#fff1d6', hemi: ['#dfe9ff', '#ffc9b8'], blocks: ['#ff6b6b', '#ffa45c', '#ffd75e', '#5fd3a8', '#3fb6c8', '#b18cff'] },
  mint: { sky: ['#57c7c2', '#f3ffe9'], fog: '#d9f5e6', cloud: '#f4fff8', sun: '#fffbe0', hemi: ['#e2fff6', '#c9e8c0'], blocks: ['#0f8f8a', '#3cc4a0', '#9be3b0', '#f2e3b3', '#ffffff', '#f28b6b'] },
  sunset: { sky: ['#4b2f86', '#ff9a6b'], fog: '#f2a07f', cloud: '#ffc5a6', sun: '#ffc48a', hemi: ['#b9a4ff', '#ff8c6b'], blocks: ['#d6336c', '#ff7a45', '#ffc145', '#7b3fa0', '#fff0d9', '#3b2a6b'] },
  glacier: { sky: ['#7cc4ff', '#ffffff'], fog: '#e6f4ff', cloud: '#ffffff', sun: '#ffffff', hemi: ['#eaf6ff', '#b8d4ea'], blocks: ['#bfe6ff', '#ffffff', '#6f8fb3', '#8c9eff', '#3ec6e0', '#d0f0ff'] },
  neon: { sky: ['#0b0626', '#4a1d6b'], fog: '#2a1450', cloud: '#3b1d63', sun: '#ffd0ff', hemi: ['#6b4cff', '#ff4fa3'], blocks: ['#ff3fa4', '#2de2e6', '#b6ff3b', '#8a4dff', '#ffe14d', '#ffffff'], glow: true },
  reef: { sky: ['#2fb8d6', '#e9fff9'], fog: '#bfeef0', cloud: '#e8fffb', sun: '#fff6dc', hemi: ['#d2fbff', '#ffc4b0'], blocks: ['#ff7f6e', '#ffb199', '#ffe066', '#9b72ff', '#1fb5a8', '#ff5d8f'] },
  lava: { sky: ['#1d1212', '#ff6a3d'], fog: '#8a3b2a', cloud: '#c2553a', sun: '#ffb070', hemi: ['#ff9a6b', '#3a1d1d'], blocks: ['#2b2424', '#e8452c', '#ff8c2b', '#ffd04a', '#5a3a3a', '#a62d2d'], glow: true },
  lilac: { sky: ['#a58cff', '#ffe3ef'], fog: '#efd9f2', cloud: '#fff4fa', sun: '#fff0e0', hemi: ['#efe6ff', '#ffd6cf'], blocks: ['#c3a6ff', '#ff9fc2', '#fff3dc', '#9fc7a0', '#7c6bd1', '#ffd28c'] },
  storm: { sky: ['#2e3d55', '#9fb4b8'], fog: '#8fa3a8', cloud: '#c3cfd0', sun: '#fff5d8', hemi: ['#c9d6e6', '#5a6470'], blocks: ['#1f2a44', '#4f6d8f', '#9fb3c8', '#f2c14e', '#e8eef2', '#5ec2b7'] },
  citrus: { sky: ['#3fa9f5', '#fffbd6'], fog: '#fdf3c9', cloud: '#fffdf0', sun: '#fff3c4', hemi: ['#e8f6ff', '#ffe2a8'], blocks: ['#ffcf26', '#ff8f1f', '#a6e22e', '#2ec27e', '#ffffff', '#ff5e5b'] },
};

// --- Formation mixes: how often each kind of structure appears.
const MIX = {
  balanced: { arch: 3, frames: 3, tunnel: 2, tower: 3, spires: 2, mesa: 2, lattice: 1.5, spiral: 1, wall: 1.5, ring: 1.5, megalith: 1 },
  spires: { arch: 1, frames: 2, tunnel: 1, tower: 4, spires: 5, mesa: 1, lattice: 1, spiral: 2, wall: 0.5, ring: 1, megalith: 1 },
  canyon: { arch: 2, frames: 1.5, tunnel: 3, tower: 1, spires: 1, mesa: 5, lattice: 0.5, spiral: 0.5, wall: 2, ring: 1, megalith: 2 },
  gates: { arch: 3, frames: 5, tunnel: 2, tower: 1.5, spires: 1, mesa: 1, lattice: 1, spiral: 1, wall: 1, ring: 3, megalith: 0.5 },
  lattice: { arch: 1, frames: 3, tunnel: 2, tower: 1.5, spires: 1, mesa: 0.5, lattice: 5, spiral: 1, wall: 2, ring: 1.5, megalith: 0.5 },
  halls: { arch: 2, frames: 2, tunnel: 5, tower: 2, spires: 1, mesa: 1.5, lattice: 1, spiral: 0.5, wall: 2.5, ring: 1, megalith: 1.5 },
  ruins: { arch: 5, frames: 2, tunnel: 1, tower: 2, spires: 1.5, mesa: 1.5, lattice: 0.5, spiral: 2, wall: 3, ring: 1, megalith: 1.5 },
};

// The level list. Same seed, same level, forever: change a seed only on purpose.
export const LEVELS = [
  { id: 'sherbet-spires', name: 'Sherbet Spires', seed: 'sherbet-1', palette: 'sherbet', mix: 'spires', count: 58, radius: 420, height: 420 },
  { id: 'mint-canyon', name: 'Mint Canyon', seed: 'mint-7', palette: 'mint', mix: 'canyon', count: 50, radius: 440, height: 380 },
  { id: 'sunset-mesa', name: 'Sunset Mesa', seed: 'sunset-3', palette: 'sunset', mix: 'balanced', count: 60, radius: 450, height: 440 },
  { id: 'glacier-halls', name: 'Glacier Halls', seed: 'glacier-2', palette: 'glacier', mix: 'halls', count: 54, radius: 420, height: 400 },
  { id: 'coral-gates', name: 'Coral Gates', seed: 'reef-5', palette: 'reef', mix: 'gates', count: 62, radius: 430, height: 420 },
  { id: 'lilac-ruins', name: 'Lilac Ruins', seed: 'lilac-4', palette: 'lilac', mix: 'ruins', count: 58, radius: 440, height: 400 },
  { id: 'citrus-stacks', name: 'Citrus Stacks', seed: 'citrus-9', palette: 'citrus', mix: 'balanced', count: 66, radius: 460, height: 460 },
  { id: 'storm-lattice', name: 'Storm Lattice', seed: 'storm-6', palette: 'storm', mix: 'lattice', count: 56, radius: 430, height: 420 },
  { id: 'neon-night', name: 'Neon Night', seed: 'neon-8', palette: 'neon', mix: 'gates', count: 60, radius: 430, height: 420 },
  { id: 'ember-spires', name: 'Ember Spires', seed: 'lava-2', palette: 'lava', mix: 'spires', count: 64, radius: 440, height: 440 },
];

// A level made from any seed text: the Daily level and Random levels.
export function seededLevel(seedText, name) {
  const rng = createRng('def:' + seedText);
  const palette = rng.pick(Object.keys(PALETTES));
  const mix = rng.pick(Object.keys(MIX));
  return {
    id: 'seed:' + seedText,
    name: name || 'Seed ' + seedText,
    seed: String(seedText),
    palette,
    mix,
    count: rng.int(50, 66),
    radius: Math.round(rng.range(410, 460)),
    height: Math.round(rng.range(380, 460)),
  };
}

export function dailyLevel(date = new Date()) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return seededLevel('daily-' + key, 'Daily · ' + key);
}

export function randomSeedText(rand = Math.random) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += A[Math.floor(rand() * A.length)];
  return s;
}

// --- The builder: formations add boxes in a local frame (origin + rotation).
class Builder {
  constructor(rng, palette) {
    this.rng = rng;
    this.colors = palette.blocks.length;
    this.boxes = [];
    this.origin = [0, 0, 0];
    this.M = IDENTITY;
    this.color = 0;
  }
  frame(origin, M, fn) {
    const o = this.origin, m = this.M;
    const off = apply(m, origin);
    this.origin = [o[0] + off[0], o[1] + off[1], o[2] + off[2]];
    this.M = mul(m, M);
    fn();
    this.origin = o;
    this.M = m;
  }
  // A box centred at local (x, y, z) with half sizes (hx, hy, hz).
  add(x, y, z, hx, hy, hz, opts = {}) {
    const p = apply(this.M, [x, y, z]);
    const m = opts.rot ? mul(this.M, opts.rot) : this.M;
    this.boxes.push({
      c: [this.origin[0] + p[0], this.origin[1] + p[1], this.origin[2] + p[2]],
      h: [Math.max(0.6, hx), Math.max(0.6, hy), Math.max(0.6, hz)],
      m,
      color: opts.color ?? this.color,
      shade: opts.shade ?? this.rng.range(0.9, 1.06),
    });
  }
  pickColor() {
    return this.rng.int(0, this.colors - 1);
  }
  otherColor(not) {
    if (this.colors < 2) return 0;
    let c = this.pickColor();
    while (c === not) c = this.pickColor();
    return c;
  }
}

// Each formation builds around its local origin and returns its rough radius.
// `s` scales it; sizes are in metres.
const FORMATIONS = {
  arch(b, r, s) {
    const n = r.chance(0.35) ? r.int(2, 4) : 1;
    const gap = r.range(13, 24) * s;
    const pw = r.range(3, 6) * s;
    const ph = r.range(22, 48) * s;
    const depth = r.range(3, 7) * s;
    const lh = r.range(2.5, 5) * s;
    const step = gap + pw * 2;
    const x0 = -((n - 1) * step) / 2;
    const accent = b.otherColor(b.color);
    for (let i = 0; i <= n; i++) b.add(x0 - step / 2 + i * step, 0, 0, pw, ph / 2, depth);
    b.add(0, ph / 2 + lh, 0, (n * step) / 2 + pw + r.range(1, 6), lh, depth + 1, { color: accent });
    if (r.chance(0.4)) {
      // A smaller arch stacked on top.
      const g2 = gap * 0.6, p2 = pw * 0.7, h2 = ph * 0.45;
      b.add(-(g2 / 2 + p2), ph / 2 + lh * 2 + h2 / 2, 0, p2, h2 / 2, depth * 0.8);
      b.add(g2 / 2 + p2, ph / 2 + lh * 2 + h2 / 2, 0, p2, h2 / 2, depth * 0.8);
      b.add(0, ph / 2 + lh * 2 + h2 + lh * 0.6, 0, g2 / 2 + p2 * 2, lh * 0.6, depth * 0.8, { color: accent });
    }
    return Math.max((n * step) / 2 + pw, ph * 0.75);
  },

  frames(b, r, s) {
    const n = r.int(2, 6);
    const inner = r.range(10, 20) * s;
    const bar = r.range(2, 4) * s;
    const gapZ = r.range(16, 34) * s;
    const twist = r.chance(0.5) ? r.range(-0.4, 0.4) : 0;
    const curve = r.chance(0.4) ? r.range(-0.15, 0.15) : 0;
    let x = 0, yaw = 0;
    const z0 = (-(n - 1) * gapZ) / 2;
    for (let i = 0; i < n; i++) {
      const z = z0 + i * gapZ;
      yaw += curve;
      x += Math.sin(yaw) * gapZ * (i ? 1 : 0);
      const M = mul(rotY(yaw), rotZ(twist * i));
      const half = inner / 2 + bar;
      b.frame([x, 0, z], M, () => {
        const col = i % 2 && r.chance(0.6) ? b.otherColor(b.color) : b.color;
        b.add(0, half, 0, half, bar, bar, { color: col });
        b.add(0, -half, 0, half, bar, bar, { color: col });
        b.add(half, 0, 0, bar, inner / 2, bar, { color: col });
        b.add(-half, 0, 0, bar, inner / 2, bar, { color: col });
      });
    }
    return (n * gapZ) / 2 + inner;
  },

  tunnel(b, r, s) {
    const len = r.range(40, 110) * s;
    const w = r.range(9, 16) * s;
    const h = r.range(8, 14) * s;
    const t = r.range(1.6, 3) * s;
    const seg = r.int(2, 6);
    const segLen = len / seg;
    const windows = r.chance(0.6);
    const accent = b.otherColor(b.color);
    for (let i = 0; i < seg; i++) {
      const z = -len / 2 + segLen * (i + 0.5);
      const gap = windows ? r.range(2, 6) : 0;
      const hl = segLen / 2 - gap / 2;
      b.add(0, -h / 2 - t, z, w / 2 + t * 2, t, hl); // floor
      if (!(windows && r.chance(0.3))) b.add(0, h / 2 + t, z, w / 2 + t * 2, t, hl, { color: i % 2 ? accent : b.color }); // ceiling
      if (!(windows && r.chance(0.35))) b.add(w / 2 + t, 0, z, t, h / 2, hl);
      if (!(windows && r.chance(0.35))) b.add(-w / 2 - t, 0, z, t, h / 2, hl);
    }
    // A collar at each end.
    for (const z of [-len / 2, len / 2]) {
      b.add(0, h / 2 + t * 2, z, w / 2 + t * 3, t * 1.4, t * 1.4, { color: accent });
      b.add(0, -h / 2 - t * 2, z, w / 2 + t * 3, t * 1.4, t * 1.4, { color: accent });
    }
    return len / 2 + 6;
  },

  tower(b, r, s) {
    const total = r.range(60, 170) * s;
    let y = -total / 2;
    let w = r.range(7, 13) * s;
    const accent = b.otherColor(b.color);
    let i = 0;
    while (y < total / 2 - 6) {
      const h = Math.min(r.range(8, 26) * s, total / 2 - y);
      const ox = r.range(-2, 2), oz = r.range(-2, 2);
      const col = r.chance(0.25) ? accent : b.color;
      if (i > 0 && r.chance(0.28) && h > 10) {
        // An open cage storey: four posts and a lid you can fly through.
        const post = Math.max(1.4, w * 0.18);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(ox + sx * (w - post), y + h / 2, oz + sz * (w - post), post, h / 2, post, { color: col });
        b.add(ox, y + h - 1.2, oz, w, 1.4, w, { color: accent });
      } else {
        b.add(ox, y + h / 2, oz, w, h / 2, w * r.range(0.7, 1.2), { color: col, rot: rotY(r.range(-0.25, 0.25)) });
      }
      if (r.chance(0.35)) {
        // A fin or cantilever sticking out.
        const len = r.range(10, 26) * s;
        const dir = r.int(0, 3) * (Math.PI / 2);
        b.frame([ox, y + h * r.range(0.3, 0.9), oz], rotY(dir), () => b.add(w + len / 2, 0, 0, len / 2, r.range(1, 2.2), r.range(2, 5), { color: accent }));
      }
      y += h;
      w = Math.max(3, w * r.range(0.78, 1.08));
      i++;
    }
    return total / 2;
  },

  spires(b, r, s) {
    const n = r.int(7, 18);
    const spread = r.range(22, 40) * s;
    const baseH = r.range(2, 4);
    const base = r.chance(0.55);
    if (base) b.add(0, -baseH, 0, spread + 5, baseH, spread + 5, { color: b.otherColor(b.color) });
    let tallest = 0;
    for (let i = 0; i < n; i++) {
      const x = r.range(-spread, spread), z = r.range(-spread, spread);
      const h = r.range(14, 70) * s;
      const t = r.range(1.4, 4) * s;
      b.add(x, h / 2, z, t, h / 2, t, { color: r.chance(0.2) ? b.otherColor(b.color) : b.color, rot: rotY(r.range(0, 1.5)) });
      if (r.chance(0.3)) b.add(x, h + t * 0.8, z, t * 1.8, t * 0.8, t * 1.8, { color: b.otherColor(b.color) });
      tallest = Math.max(tallest, h);
    }
    return Math.max(spread * 1.2, tallest * 0.6);
  },

  mesa(b, r, s) {
    const w = r.range(30, 60) * s;
    const d = r.range(30, 60) * s;
    const t = r.range(7, 16) * s;
    const canyon = r.chance(0.6);
    const gap = canyon ? r.range(8, 14) : 0;
    const accent = b.otherColor(b.color);
    if (canyon) {
      const half = (w - gap / 2) / 2;
      b.add(-(gap / 2 + half), 0, 0, half, t, d, { rot: rotY(r.range(-0.05, 0.05)) });
      b.add(gap / 2 + half, 0, 0, half, t, d, { rot: rotY(r.range(-0.05, 0.05)) });
      // Bridges across the canyon.
      for (let i = r.int(0, 2); i > 0; i--) b.add(0, r.range(-t * 0.5, t), r.range(-d * 0.7, d * 0.7), gap / 2 + 3, 1.2, r.range(2, 4), { color: accent });
    } else {
      b.add(0, 0, 0, w, t, d);
    }
    for (let i = r.int(3, 8); i > 0; i--) {
      const hx = r.range(5, 14), hy = r.range(4, 18), hz = r.range(5, 14);
      const x = r.range(-w + hx, w - hx);
      if (canyon && Math.abs(x) < gap / 2 + hx) continue;
      b.add(x, t + hy, r.range(-d + hz, d - hz), hx, hy, hz, { color: r.chance(0.35) ? accent : b.color, rot: rotY(r.range(-0.3, 0.3)) });
    }
    for (let i = r.int(2, 7); i > 0; i--) {
      const hx = r.range(3, 9), hy = r.range(5, 20);
      const x = r.range(-w + hx, w - hx);
      if (canyon && Math.abs(x) < gap / 2 + hx) continue;
      b.add(x, -t - hy, r.range(-d + hx, d - hx), hx, hy, hx);
    }
    return Math.max(w, d) * 1.1;
  },

  lattice(b, r, s) {
    const nx = r.int(2, 4), ny = r.int(2, 4), nz = r.int(2, 4);
    const cell = r.range(16, 24) * s;
    const t = r.range(1.2, 2.2) * s;
    const sx = (nx * cell) / 2, sy = (ny * cell) / 2, sz = (nz * cell) / 2;
    const accent = b.otherColor(b.color);
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) if (r.chance(0.82)) b.add(-sx + i * cell, -sy + j * cell, 0, t, t, sz + t);
    for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) if (r.chance(0.7)) b.add(-sx + i * cell, 0, -sz + k * cell, t, sy + t, t, { color: accent });
    for (let j = 0; j <= ny; j++) for (let k = 0; k <= nz; k++) if (r.chance(0.82)) b.add(0, -sy + j * cell, -sz + k * cell, sx + t, t, t);
    // A few solid cubes stuck in the grid.
    for (let i = r.int(1, 4); i > 0; i--) b.add(-sx + (r.int(0, nx - 1) + 0.5) * cell, -sy + (r.int(0, ny - 1) + 0.5) * cell, -sz + (r.int(0, nz - 1) + 0.5) * cell, cell * 0.3, cell * 0.3, cell * 0.3, { color: accent });
    return Math.hypot(sx, sy, sz);
  },

  spiral(b, r, s) {
    const turns = r.range(1.2, 2.5);
    const steps = Math.round(turns * r.int(10, 16));
    const rad = r.range(14, 26) * s;
    const rise = r.range(3, 6) * s;
    const dir = r.sign();
    const core = r.range(3, 6) * s;
    const h = steps * rise;
    b.add(0, 0, 0, core, h / 2 + 4, core, { color: b.otherColor(b.color) });
    for (let i = 0; i < steps; i++) {
      const a = (dir * i * Math.PI * 2 * turns) / steps;
      b.frame([0, -h / 2 + i * rise, 0], rotY(a), () => b.add(rad * 0.55 + core * 0.5, 0, 0, rad * 0.5, r.range(0.8, 1.6), r.range(2.5, 4.5)));
    }
    return Math.max(rad, h / 2);
  },

  wall(b, r, s) {
    const nx = r.int(4, 8), ny = r.int(3, 6);
    const cw = r.range(6, 10) * s, ch = r.range(6, 10) * s;
    const depth = r.range(2, 5);
    const holeP = r.range(0.2, 0.42);
    const accent = b.otherColor(b.color);
    const x0 = (-(nx - 1) * cw) / 2, y0 = (-(ny - 1) * ch) / 2;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const edge = i === 0 || j === 0 || i === nx - 1 || j === ny - 1;
        if (!edge && r.chance(holeP)) continue;
        if (edge && r.chance(holeP * 0.3)) continue;
        b.add(x0 + i * cw, y0 + j * ch, r.range(-0.6, 0.6), cw / 2, ch / 2, depth + (r.chance(0.2) ? r.range(1, 4) : 0), { color: r.chance(0.18) ? accent : b.color, shade: r.range(0.85, 1.08) });
      }
    }
    return Math.max(nx * cw, ny * ch) / 2;
  },

  ring(b, r, s) {
    const n = r.int(10, 18);
    const rad = r.range(14, 30) * s;
    const t = r.range(2, 4) * s;
    const vertical = r.chance(0.65);
    const accent = b.otherColor(b.color);
    const M = vertical ? IDENTITY : rotX(Math.PI / 2);
    b.frame([0, 0, 0], M, () => {
      const seg = (Math.PI * rad) / n + 0.6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        b.add(Math.cos(a) * rad, Math.sin(a) * rad, 0, t, seg, t * 1.4, { rot: rotZ(a), color: i % 2 ? accent : b.color });
      }
    });
    if (!vertical && r.chance(0.6)) {
      // Standing stones around a horizontal ring.
      for (let i = 0; i < n; i += 2) {
        const a = (i / n) * Math.PI * 2;
        b.add(Math.cos(a) * rad, -r.range(8, 20), Math.sin(a) * rad, t, r.range(6, 16), t);
      }
    }
    return rad + t * 2;
  },

  megalith(b, r, s) {
    const hx = r.range(14, 34) * s, hy = r.range(20, 60) * s, hz = r.range(12, 30) * s;
    b.add(0, 0, 0, hx, hy, hz, { rot: mul(rotY(r.range(0, Math.PI)), rotZ(r.range(-0.18, 0.18))) });
    if (r.chance(0.5)) b.add(hx * r.sign() * 0.8, hy + 4, 0, hx * 0.5, 4, hz * 1.4, { color: b.otherColor(b.color) });
    return Math.hypot(hx, hz) + 4;
  },
};

export const FORMATION_KINDS = Object.keys(FORMATIONS);

// Build a level from its definition. Returns boxes plus spawn and bounds.
export function buildLevel(def) {
  const rng = createRng(hashSeed('level:' + def.seed));
  const palette = PALETTES[def.palette] || PALETTES.sherbet;
  const mix = MIX[def.mix] || MIX.balanced;
  const R = def.radius || 430;
  const H = def.height || 420;
  const b = new Builder(rng, palette);
  const placed = [];

  // The start: a big frame gate under the launch point, facing the middle.
  const start = { x: 0, z: -R * 0.98 };
  const gateZ = -R * 0.72;
  const gateY = H - 40;
  b.color = b.pickColor();
  b.frame([0, gateY, gateZ], IDENTITY, () => {
    const inner = 52, bar = 4;
    const half = inner / 2 + bar;
    const col = b.otherColor(b.color);
    b.add(0, half, 0, half, bar, bar, { color: col });
    b.add(0, -half, 0, half, bar, bar, { color: col });
    b.add(half, 0, 0, bar, inner / 2, bar, { color: col });
    b.add(-half, 0, 0, bar, inner / 2, bar, { color: col });
  });
  placed.push({ x: 0, y: gateY, z: gateZ, r: 30 });

  const tries = def.count * 40;
  let made = 0;
  for (let i = 0; i < tries && made < def.count; i++) {
    const kind = rng.weighted(mix);
    const s = rng.range(0.85, 1.35);
    // Denser towards the middle, spread through the height.
    const rr = R * Math.pow(rng.next(), 0.62);
    const a = rng.range(0, Math.PI * 2);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const y = rng.range(30, H - 40);
    const est = { arch: 34, frames: 70, tunnel: 60, tower: 90, spires: 45, mesa: 60, lattice: 45, spiral: 40, wall: 40, ring: 32, megalith: 50 }[kind] * s;
    if (y + est * 0.6 > H || y - est * 0.6 < 0) continue;
    // Keep the launch lane open: no structures between the spawn and the gate.
    if (Math.abs(x) < 70 && z < gateZ + 30 && y > H - 140) continue;
    if (placed.some((p) => Math.hypot(p.x - x, (p.y - y) * 1.15, p.z - z) < p.r + est * 0.75 + 6)) continue;
    const yaw = rng.range(0, Math.PI * 2);
    const tilt = rng.chance(0.18) ? rng.range(-0.25, 0.25) : 0;
    b.color = b.pickColor();
    let radius = est;
    b.frame([x, y, z], mul(rotY(yaw), rotZ(tilt)), () => {
      radius = FORMATIONS[kind](b, rng, s);
    });
    placed.push({ x, y, z, r: Math.max(radius, est * 0.6), kind });
    made++;
  }

  // Long beams bridging neighbouring formations.
  for (let i = 1; i < placed.length; i++) {
    if (!rng.chance(0.4)) continue;
    const p = placed[i];
    let best = null, bestD = Infinity;
    for (let j = 1; j < placed.length; j++) {
      if (j === i) continue;
      const q = placed[j];
      const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      if (d > p.r + q.r + 20 && d < 200 && d < bestD) {
        bestD = d;
        best = q;
      }
    }
    if (!best) continue;
    const dx = best.x - p.x, dy = best.y - p.y, dz = best.z - p.z;
    const len = Math.hypot(dx, dy, dz);
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.asin(dy / len);
    const t = rng.range(1.2, 2.6);
    b.color = b.pickColor();
    b.frame([p.x, p.y, p.z], mul(rotY(yaw), rotX(pitch)), () => b.add(0, 0, len / 2, t, t, len / 2 - Math.min(p.r, best.r) * 0.3));
  }

  // Spawn high above the start, gliding in towards the gate.
  // Aimed at the middle of the gate, so a hands-off launch flies through it.
  const spawnY = H + 30;
  const spawn = { pos: [start.x, spawnY, start.z], yaw: 0, pitch: Math.atan2(spawnY - gateY, gateZ - start.z) * 0.85 };
  return {
    def,
    palette,
    boxes: b.boxes,
    formations: placed,
    spawn,
    bounds: { radius: R, top: H, floor: -55, ceiling: H + 260, edge: R + 220 },
  };
}

export function levelById(id) {
  return LEVELS.find((l) => l.id === id) || null;
}
