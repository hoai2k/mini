// The skies: seeded worlds of huge floating rock islands, built from cubes in
// the manner of Superflight. Each island is a voxel mass: an irregular outline,
// a top shaped as a mesa, peak, ridge or terraces, and an underside that tapers
// into hanging spurs. Tunnels are bored right through, holes punched through
// the cliffs, spires raised on top, and loose rocks scattered around. Islands
// stack above one another with gaps to fly between. A ring of distant giants
// (scenery, not solid) and the mist below make the world feel endless.
//
// Pure data, no rendering: the same seed always builds the same world, so every
// player flies the same one. All sizes are in metres.

import { createRng, hashSeed } from './rng.js';
import { World } from './world.js';

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

// --- Palettes. sky: zenith and horizon; fog: the haze in the distance; mist:
// the white-ish depths below; sun light; hemisphere light; island colours.
export const PALETTES = {
  sherbet: { sky: ['#5f9cff', '#ffd9ea'], fog: '#f4d8ec', mist: '#fff3f8', sun: '#fff1d6', hemi: ['#dfe9ff', '#ffc9b8'], blocks: ['#ff6b6b', '#ffa45c', '#ffd75e', '#5fd3a8', '#3fb6c8', '#b18cff'] },
  mint: { sky: ['#4bbdbb', '#f3ffe9'], fog: '#dcf5e8', mist: '#f6fffa', sun: '#fffbe0', hemi: ['#e2fff6', '#c9e8c0'], blocks: ['#0f8f8a', '#3cc4a0', '#9be3b0', '#f2e3b3', '#e9f7ef', '#f28b6b'] },
  sunset: { sky: ['#47308a', '#ffa476'], fog: '#f4ab8b', mist: '#ffe1cf', sun: '#ffc48a', hemi: ['#b9a4ff', '#ff8c6b'], blocks: ['#d6336c', '#ff7a45', '#ffc145', '#7b3fa0', '#fff0d9', '#3b2a6b'] },
  glacier: { sky: ['#6cbcff', '#ffffff'], fog: '#e3f2ff', mist: '#ffffff', sun: '#ffffff', hemi: ['#eaf6ff', '#b8d4ea'], blocks: ['#bfe6ff', '#f4fbff', '#6f8fb3', '#8c9eff', '#3ec6e0', '#d0f0ff'] },
  neon: { sky: ['#0b0626', '#4a1d6b'], fog: '#2a1450', mist: '#5b2d86', sun: '#ffd0ff', hemi: ['#6b4cff', '#ff4fa3'], blocks: ['#ff3fa4', '#2de2e6', '#b6ff3b', '#8a4dff', '#ffe14d', '#f4f0ff'], glow: true },
  reef: { sky: ['#22b0d2', '#e9fff9'], fog: '#c4eff0', mist: '#effffd', sun: '#fff6dc', hemi: ['#d2fbff', '#ffc4b0'], blocks: ['#ff7f6e', '#ffb199', '#ffe066', '#9b72ff', '#1fb5a8', '#ff5d8f'] },
  lava: { sky: ['#1d1212', '#ff6a3d'], fog: '#94402c', mist: '#ff9a5c', sun: '#ffb070', hemi: ['#ff9a6b', '#3a1d1d'], blocks: ['#2b2424', '#e8452c', '#ff8c2b', '#ffd04a', '#5a3a3a', '#a62d2d'], glow: true },
  lilac: { sky: ['#9f86ff', '#ffe5f0'], fog: '#efdcf3', mist: '#fff6fb', sun: '#fff0e0', hemi: ['#efe6ff', '#ffd6cf'], blocks: ['#c3a6ff', '#ff9fc2', '#fff3dc', '#9fc7a0', '#7c6bd1', '#ffd28c'] },
  storm: { sky: ['#2e3d55', '#a6babd'], fog: '#94a8ac', mist: '#dfe7e8', sun: '#fff5d8', hemi: ['#c9d6e6', '#5a6470'], blocks: ['#1f2a44', '#4f6d8f', '#9fb3c8', '#f2c14e', '#e8eef2', '#5ec2b7'] },
  ash: { sky: ['#5d6066', '#c9cbcf'], fog: '#b8babe', mist: '#e6e7e9', sun: '#f4f4f4', hemi: ['#e2e3e6', '#6b6e74'], blocks: ['#3a3c40', '#6b6e74', '#9a9da3', '#c4c6ca', '#2a2b2e', '#83868c'] },
  silhouette: { sky: ['#3ad0b0', '#d6fff2'], fog: '#bff5e6', mist: '#e9fff8', sun: '#ffffff', hemi: ['#d8fff4', '#0e2a26'], blocks: ['#101418', '#1a2228', '#0b0f12', '#24302f', '#151b1f', '#1f2a2a'] },
  citrus: { sky: ['#3aa3f2', '#fffbd6'], fog: '#fcf1cc', mist: '#fffef4', sun: '#fff3c4', hemi: ['#e8f6ff', '#ffe2a8'], blocks: ['#ffcf26', '#ff8f1f', '#a6e22e', '#2ec27e', '#fffbe8', '#ff5e5b'] },
};

// --- World styles: how the islands are shaped and how many of each kind.
//   shapes: weights of island top shapes; big/medium/small: island counts;
//   tunnels/holes/spires: per-island amounts (scaled by size); stack: how
//   often islands are piled above others; updrafts per large island.
export const STYLES = {
  archipelago: { blurb: 'Mesas and peaks of every size, stacked high, with tunnels and holes to thread.', shapes: { mesa: 3, peak: 2, ridge: 2, terrace: 2 }, big: 4, medium: 14, small: 26, tunnels: 1.2, holes: 1.2, spires: 1, stack: 0.45 },
  spires: { blurb: 'Islands bristling with tall spires, and pillars of rock to slalom.', shapes: { peak: 4, ridge: 2, mesa: 1, terrace: 1 }, big: 3, medium: 16, small: 30, tunnels: 0.8, holes: 0.8, spires: 3, stack: 0.4 },
  canyon: { blurb: 'Vast flat-topped mesas split by canyons and bored with long tunnels.', shapes: { mesa: 5, terrace: 2, ridge: 1 }, big: 5, medium: 10, small: 20, tunnels: 2, holes: 0.8, spires: 0.6, stack: 0.35, canyons: true },
  stacks: { blurb: 'Islands piled on islands: fly the gaps between the layers.', shapes: { terrace: 3, mesa: 3, peak: 1 }, big: 4, medium: 16, small: 24, tunnels: 1, holes: 1, spires: 1, stack: 0.85 },
  caverns: { blurb: 'Hollowed islands riddled with tunnels and holes, like Swiss cheese.', shapes: { mesa: 2, ridge: 2, peak: 1 }, big: 4, medium: 12, small: 22, tunnels: 3, holes: 2.6, spires: 0.6, stack: 0.4 },
  peaks: { blurb: 'Upturned mountains: sharp summits, deep hanging spurs, long ridges.', shapes: { peak: 4, ridge: 3, terrace: 1 }, big: 4, medium: 14, small: 26, tunnels: 0.8, holes: 1, spires: 1.4, stack: 0.5 },
};

// The named skies. Same seed, same world, forever: change a seed only on purpose.
export const LEVELS = [
  { id: 'sherbet-spires', name: 'Sherbet Spires', seed: 'sherbet-1', palette: 'sherbet', style: 'spires', materials: { needles: 3, craggy: 1 } },
  { id: 'mint-canyon', name: 'Mint Canyon', seed: 'mint-7', palette: 'mint', style: 'canyon', materials: { massive: 3, shelves: 1 } },
  { id: 'sunset-mesa', name: 'Sunset Mesa', seed: 'sunset-3', palette: 'sunset', style: 'archipelago', materials: { massive: 2, craggy: 2 } },
  { id: 'glacier-halls', name: 'Glacier Halls', seed: 'glacier-2', palette: 'glacier', style: 'caverns', materials: { sponge: 3, massive: 1 } },
  { id: 'coral-stacks', name: 'Coral Stacks', seed: 'reef-5', palette: 'reef', style: 'stacks', materials: { shelves: 3, massive: 1 } },
  { id: 'lilac-peaks', name: 'Lilac Peaks', seed: 'lilac-4', palette: 'lilac', style: 'peaks', materials: { craggy: 3, massive: 1 } },
  { id: 'citrus-isles', name: 'Citrus Isles', seed: 'citrus-9', palette: 'citrus', style: 'archipelago', materials: { massive: 2, columns: 1 } },
  { id: 'storm-caverns', name: 'Storm Caverns', seed: 'storm-6', palette: 'storm', style: 'caverns', materials: { sponge: 2, wispy: 1 } },
  { id: 'neon-night', name: 'Neon Night', seed: 'neon-8', palette: 'neon', style: 'stacks', materials: { wispy: 3, massive: 1 } },
  { id: 'ember-spires', name: 'Ember Spires', seed: 'lava-2', palette: 'lava', style: 'spires', materials: { needles: 2, craggy: 2 } },
  { id: 'ash-columns', name: 'Ash Columns', seed: 'ash-11', palette: 'ash', style: 'archipelago', materials: { columns: 3, craggy: 1 } },
  { id: 'mint-silhouette', name: 'Mint Silhouette', seed: 'night-bird', palette: 'silhouette', style: 'stacks', materials: { wispy: 2, shelves: 2 } },
];

// A world made from any seed text: the Daily sky and Random skies.
export function seededLevel(seedText, name) {
  const rng = createRng('def:' + seedText);
  return {
    id: 'seed:' + seedText,
    name: name || 'Seed ' + seedText,
    seed: String(seedText),
    palette: rng.pick(Object.keys(PALETTES)),
    style: rng.pick(Object.keys(STYLES)),
    materials: randomMaterials(rng),
  };
}

// One to three rock materials, the first dominant.
function randomMaterials(rng) {
  const keys = Object.keys(MATERIALS);
  const out = { [rng.pick(keys)]: 3 };
  for (let n = rng.int(0, 2); n > 0; n--) {
    const k = rng.pick(keys);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
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

export function levelById(id) {
  return LEVELS.find((l) => l.id === id) || null;
}

// --- Seeded 2D value noise.
function makeNoise(seed) {
  const h = (x, z) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (x, z) => {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const a = h(ix, iz), b = h(ix + 1, iz), c = h(ix, iz + 1), d = h(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  };
  // Fractal noise in -1..1.
  return (x, z, oct = 4) => {
    let v = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      v += amp * (noise(x * f, z * f) * 2 - 1);
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return v / norm;
  };
}

// Seeded 3D value noise in -1..1 (one octave; callers add octaves).
function makeNoise3(seed) {
  const h = (x, y, z) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 1103515245) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const l = (a, b, t) => a + (b - a) * t;
    const v = l(
      l(l(h(ix, iy, iz), h(ix + 1, iy, iz), ux), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), ux), uy),
      l(l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), ux), l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), ux), uy),
      uz,
    );
    return v * 2 - 1;
  };
}

// --- Rock materials: what a world's rock is like inside an island's outline.
// Superflight's seeds range from "needle town" to "flat wide channels", "tons of
// flat floating platforms", "hollow shelves", "large columns with tiny spaces",
// "one large mountain with lots of holes", "tons of windows" and a "spruce
// forest of polygons". Each material is a 3D noise rule within the outline:
// `env` is how far inside the outline a cell is, in metres (negative outside).
//   f: base frequency (per metre) on x, y, z; grain: cell size multiplier;
//   shape: how the island outline is drawn for it (tall, flat, wide).
export const MATERIALS = {
  massive: { blurb: 'thick, smooth masses', grain: 1 },
  craggy: { blurb: 'jagged crags and spikes', grain: 0.85, f: [1 / 34, 1 / 30, 1 / 34] },
  sponge: { blurb: 'riddled with windows and holes', grain: 0.9, f: [1 / 48, 1 / 40, 1 / 48] },
  wispy: { blurb: 'thin, curling sheets of rock', grain: 0.5, f: [1 / 75, 1 / 55, 1 / 75], shape: 'wide' },
  needles: { blurb: 'forests of tall needles', grain: 0.75, f: [1 / 16, 1 / 260, 1 / 16], shape: 'tall' },
  shelves: { blurb: 'stacked shelves and platforms', grain: 0.85, f: [1 / 200, 1 / 15, 1 / 200], shape: 'flat' },
  columns: { blurb: 'great columns with narrow gaps', grain: 1, f: [1 / 46, 1 / 900, 1 / 46], shape: 'tall' },
};

// Is a cell solid? env: metres inside the outline; n3: 3D noise; p: position.
function solidFor(mat, env, n3, x, y, z) {
  const m = MATERIALS[mat];
  if (!m.f) return env > 0;
  const [fx, fy, fz] = m.f;
  const n = (s, o = 0) => n3(x * fx * s + o, y * fy * s + o * 0.7, z * fz * s - o);
  switch (mat) {
    case 'craggy': {
      // Ridged noise pushes spikes out of the surface and bites into it.
      const r = 1 - Math.abs(n(1)) * 2 + (1 - Math.abs(n(2.1, 17)) * 2) * 0.5;
      return env + r * 13 > 4;
    }
    case 'sponge':
      return env > 0 && Math.abs(n(1)) + Math.abs(n(2.3, 9)) * 0.35 > 0.2;
    case 'wispy':
      // Thin curved sheets through the volume, kept to its inner part so the
      // outline does not close them into a shell.
      return env > 4 && Math.abs(n(1) + n(1.9, 5) * 0.35) < 0.06;
    case 'needles':
      return env > -6 && n(1) + n(0.37, 3) * 0.6 > 0.32;
    case 'shelves':
      return env > -4 && n(1) + n(2.4, 7) * 0.25 > 0.12;
    case 'columns':
      return env > 0 && n(1) + n(2.2, 4) * 0.3 > -0.25;
  }
  return env > 0;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// --- One island as a voxel grid.
class Island {
  constructor(o) {
    Object.assign(this, o);
    const c = this.cell;
    this.x0 = this.cx - this.rx * 1.35;
    this.z0 = this.cz - this.rz * 1.35;
    this.y0 = this.cy - this.hb * 1.6 - c * 2;
    this.nx = Math.ceil((this.rx * 2.7) / c) + 1;
    this.nz = Math.ceil((this.rz * 2.7) / c) + 1;
    this.ny = Math.ceil((this.hb * 1.6 + this.ht * 1.9 + this.spireMax + c * 4) / c) + 1;
    this.grid = new Uint8Array(this.nx * this.ny * this.nz);
  }
  idx(i, j, k) {
    return (j * this.nz + k) * this.nx + i;
  }
  get(i, j, k) {
    if (i < 0 || j < 0 || k < 0 || i >= this.nx || j >= this.ny || k >= this.nz) return 0;
    return this.grid[this.idx(i, j, k)];
  }
  set(i, j, k, v) {
    if (i < 0 || j < 0 || k < 0 || i >= this.nx || j >= this.ny || k >= this.nz) return;
    this.grid[this.idx(i, j, k)] = v;
  }
  // World position of a cell's centre, and the cell holding a point.
  pos(i, j, k) {
    const c = this.cell;
    return [this.x0 + (i + 0.5) * c, this.y0 + (j + 0.5) * c, this.z0 + (k + 0.5) * c];
  }
  cellAt(x, y, z) {
    const c = this.cell;
    return [Math.floor((x - this.x0) / c), Math.floor((y - this.y0) / c), Math.floor((z - this.z0) / c)];
  }

  shape(noise, rng, n3) {
    const { cell: c, rx, rz, ht, hb, kind } = this;
    const sx = 0.004 + rng.next() * 0.003;
    const ox = rng.range(0, 1000), oz = rng.range(0, 1000);
    this.tops = new Float64Array(this.nx * this.nz).fill(NaN);
    for (let i = 0; i < this.nx; i++) {
      for (let k = 0; k < this.nz; k++) {
        const [x, , z] = this.pos(i, 0, k);
        const dx = (x - this.cx) / rx, dz = (z - this.cz) / rz;
        // An irregular outline: the radius wobbles with the angle and with noise.
        const warp = 1 + 0.32 * noise(x * sx + ox, z * sx + oz, 3);
        const r = Math.hypot(dx, dz) / warp;
        if (r >= 1) continue;
        const edge = 1 - r;
        const n1 = noise(x * 0.012 + oz, z * 0.012 + ox, 3);
        const n2 = noise(x * 0.025 + 300 + ox, z * 0.025 - oz, 2);
        let top;
        if (kind === 'mesa') top = ht * (smooth(0, 0.16, edge) * (0.8 + 0.2 * n1)) + (n2 > 0.35 ? c * 2 : 0);
        else if (kind === 'peak') top = ht * Math.pow(edge, 1.35) * (1.25 + 0.6 * n1);
        else if (kind === 'ridge') {
          const along = Math.abs(dx * this.ridgeSin - dz * this.ridgeCos);
          top = ht * Math.max(0, 1 - along * 1.6) * smooth(0, 0.3, edge) * (1 + 0.5 * n1) + ht * 0.15 * edge;
        } else top = Math.floor((ht * Math.pow(edge, 0.55) * (0.9 + 0.3 * n1)) / (c * 2)) * c * 2; // terrace
        top = Math.max(c * 0.5, top);
        // The underside tapers into spurs; now and then a long one hangs down.
        let bottom = hb * Math.pow(edge, 0.62) * (0.55 + 0.45 * (n2 * 0.5 + 0.5));
        if (noise(x * 0.03 - 77, z * 0.03 + 91, 2) > 0.45) bottom += hb * 0.7 * edge;
        const yTop = this.cy + top, yBot = this.cy - bottom;
        this.tops[k * this.nx + i] = yTop;
        if (this.material === 'massive' || !n3) {
          const [, j0] = this.cellAt(x, yBot, z);
          const [, j1] = this.cellAt(x, yTop, z);
          for (let j = Math.max(0, j0); j <= Math.min(this.ny - 1, j1); j++) this.set(i, j, k, 1);
          continue;
        }
        // Other materials: a 3D rule within the outline (crags may poke out).
        const rimDist = edge * Math.min(rx, rz);
        const pad = 16;
        const [, j0] = this.cellAt(x, yBot - pad, z);
        const [, j1] = this.cellAt(x, yTop + pad, z);
        for (let j = Math.max(0, j0); j <= Math.min(this.ny - 1, j1); j++) {
          const y = this.y0 + (j + 0.5) * c;
          const env = Math.min(yTop - y, y - yBot, rimDist);
          if (solidFor(this.material, env, n3, x, y, z)) this.set(i, j, k, 1);
        }
      }
    }
  }

  carveSphere(x, y, z, r) {
    const c = this.cell;
    const [i0, j0, k0] = this.cellAt(x - r, y - r, z - r);
    const [i1, j1, k1] = this.cellAt(x + r, y + r, z + r);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++)
        for (let k = k0; k <= k1; k++) {
          const [px, py, pz] = this.pos(i, j, k);
          if ((px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2 <= r * r + c * c * 0.25) this.set(i, j, k, 0);
        }
  }

  // A tunnel bored right through: a wandering path from rim to rim.
  tunnel(rng) {
    const a = rng.range(0, Math.PI * 2);
    const R = Math.max(this.rx, this.rz);
    const r = Math.max(this.cell * 1.05, rng.range(9, 17));
    let x = this.cx + Math.cos(a) * R * 1.15, z = this.cz + Math.sin(a) * R * 1.15;
    let y = this.cy + rng.range(-this.hb * 0.25, this.ht * 0.25);
    let dir = a + Math.PI + rng.range(-0.5, 0.5);
    let dy = 0;
    const steps = Math.ceil((R * 2.5) / (r * 0.6));
    for (let s = 0; s < steps; s++) {
      this.carveSphere(x, y, z, r);
      dir += rng.range(-0.18, 0.18);
      dy = Math.max(-0.35, Math.min(0.35, dy + rng.range(-0.08, 0.08)));
      x += Math.cos(dir) * r * 0.6;
      z += Math.sin(dir) * r * 0.6;
      y += dy * r * 0.6;
    }
  }

  // A hole punched through a cliff: a straight chord near the rim.
  hole(rng) {
    const a = rng.range(0, Math.PI * 2);
    const depth = rng.range(0.72, 0.9);
    const R = Math.max(this.rx, this.rz) * depth;
    const r = Math.max(this.cell * 1.05, rng.range(8, 15));
    const len = Math.max(this.rx, this.rz) * 0.9;
    const px = this.cx + Math.cos(a) * R, pz = this.cz + Math.sin(a) * R;
    const y = this.cy + rng.range(-this.hb * 0.2, this.ht * 0.3);
    const tx = -Math.sin(a), tz = Math.cos(a);
    for (let t = -len; t <= len; t += r * 0.5) this.carveSphere(px + tx * t, y, pz + tz * t, r);
  }

  // A canyon cut across the island.
  canyon(rng) {
    const a = rng.range(0, Math.PI);
    const w = rng.range(11, 22);
    const tx = Math.cos(a), tz = Math.sin(a);
    for (let i = 0; i < this.nx; i++)
      for (let k = 0; k < this.nz; k++) {
        const [x, , z] = this.pos(i, 0, k);
        const d = Math.abs((x - this.cx) * tz - (z - this.cz) * tx);
        const wobble = w + 6 * Math.sin((x * tx + z * tz) * 0.02);
        if (d < wobble) {
          const keep = this.cy - this.hb * 0.25; // the canyon has a floor
          for (let j = 0; j < this.ny; j++) if (this.pos(i, j, k)[1] > keep) this.set(i, j, k, 0);
        }
      }
  }

  // A spire rising from the top.
  spire(rng) {
    for (let t = 0; t < 20; t++) {
      const i = rng.int(1, this.nx - 2), k = rng.int(1, this.nz - 2);
      const top = this.tops[k * this.nx + i];
      if (!Number.isFinite(top)) continue;
      const [, j0] = this.cellAt(0, top, 0);
      const h = rng.int(3, Math.max(4, Math.floor(this.spireMax / this.cell)));
      let w = rng.int(1, 2);
      for (let j = j0; j < Math.min(this.ny - 1, j0 + h); j++) {
        for (let a = -w + 1; a < w; a++) for (let b = -w + 1; b < w; b++) this.set(i + a, j, k + b, 1);
        if (j - j0 > h * 0.55 && w > 1) w--;
      }
      return;
    }
  }
}

// --- Building a world.
export function buildLevel(def) {
  const rng = createRng(hashSeed('world:' + def.seed));
  const noise = makeNoise(hashSeed('noise:' + def.seed));
  const n3 = makeNoise3(hashSeed('noise3:' + def.seed));
  const materials = def.materials || { massive: 2, craggy: 1 };
  const palette = PALETTES[def.palette] || PALETTES.sherbet;
  const style = STYLES[def.style] || STYLES.archipelago;
  const R = 1250; // the island field's radius
  const H = 1150; // the top of the highest islands; the mist begins at 0
  const islands = [];

  // Vertical intervals that must not touch where islands overlap horizontally.
  const fits = (o) =>
    islands.every((p) => {
      const d = Math.hypot(o.cx - p.cx, o.cz - p.cz);
      const reach = Math.max(o.rx, o.rz) + Math.max(p.rx, p.rz);
      if (d > reach * 0.92) return true;
      const gap = 55;
      const aTop = o.cy + o.ht * 1.9 + o.spireMax, aBot = o.cy - o.hb * 1.6;
      const bTop = p.cy + p.ht * 1.9 + p.spireMax, bBot = p.cy - p.hb * 1.6;
      return aBot > bTop + gap || bBot > aTop + gap;
    });

  const make = (size) => {
    const big = size === 'big', med = size === 'medium';
    // Small rocks are plain or craggy; the rest take the world's materials.
    const material = size === 'small' ? (materials.craggy || rng.chance(0.3) ? 'craggy' : 'massive') : rng.weighted(materials);
    const M = MATERIALS[material];
    let rx = big ? rng.range(230, 400) : med ? rng.range(90, 190) : rng.range(18, 55);
    let ht = big ? rng.range(70, 170) : med ? rng.range(35, 110) : rng.range(8, 30);
    let hb = big ? rng.range(140, 300) : med ? rng.range(60, 170) : rng.range(14, 50);
    if (M.shape === 'tall') {
      ht *= 2.2;
      hb *= 0.8;
    } else if (M.shape === 'flat') {
      rx *= 1.15;
      ht *= 1.4;
      hb *= 0.6;
    } else if (M.shape === 'wide') {
      rx *= 1.2;
      ht *= 1.5;
    }
    const o = {
      size,
      material,
      kind: rng.weighted(style.shapes),
      rx,
      rz: rx * rng.range(0.65, 1.35),
      ht,
      hb,
      cell: Math.max(6, (big ? 14 : med ? 11 : 7) * M.grain),
      spireMax: size === 'small' ? 0 : (big ? 120 : 70) * style.spires,
      color: rng.int(0, palette.blocks.length - 1),
      ridgeSin: 0,
      ridgeCos: 1,
    };
    const ra = rng.range(0, Math.PI);
    o.ridgeSin = Math.sin(ra);
    o.ridgeCos = Math.cos(ra);
    for (let t = 0; t < 60; t++) {
      // Stacked: right above or below an existing island; otherwise anywhere.
      if (islands.length && rng.chance(style.stack) && size !== 'small') {
        const p = rng.pick(islands.filter((q) => q.size !== 'small'));
        o.cx = p.cx + rng.range(-0.5, 0.5) * p.rx;
        o.cz = p.cz + rng.range(-0.5, 0.5) * p.rz;
        o.cy = p.cy + rng.sign() * rng.range(p.hb + o.ht + 120, p.hb + o.ht + 320);
      } else {
        const rr = R * Math.sqrt(rng.next()) * (big ? 0.75 : 1);
        const a = rng.range(0, Math.PI * 2);
        o.cx = Math.cos(a) * rr;
        o.cz = Math.sin(a) * rr;
        o.cy = rng.range(big ? 380 : 180, H - o.ht);
      }
      const top = o.cy + o.ht * 1.9 + o.spireMax, bot = o.cy - o.hb * 1.6;
      if (top > H + 120 || bot < 40) continue;
      if (fits(o)) {
        islands.push(o);
        return o;
      }
    }
    return null;
  };
  for (let i = 0; i < style.big; i++) make('big');
  for (let i = 0; i < style.medium; i++) make('medium');
  for (let i = 0; i < style.small; i++) make('small');

  // Shape, carve and decorate each island, then keep only its surface cubes.
  const boxes = [];
  const parts = [];
  const blocks = palette.blocks.length;
  for (const o of islands) {
    const isl = new Island(o);
    const r2 = createRng(hashSeed(`island:${def.seed}:${o.cx.toFixed(1)}:${o.cz.toFixed(1)}`));
    isl.shape(noise, r2, n3);
    if (o.size !== 'small') {
      const scale = Math.max(o.rx, o.rz) / 150;
      if (style.canyons && o.size === 'big' && o.kind === 'mesa') isl.canyon(r2);
      for (let n = Math.round(style.tunnels * scale * r2.range(0.6, 1.4)); n > 0; n--) isl.tunnel(r2);
      for (let n = Math.round(style.holes * scale * 1.5 * r2.range(0.5, 1.5)); n > 0; n--) isl.hole(r2);
      for (let n = Math.round(style.spires * scale * r2.range(1, 3)); n > 0; n--) isl.spire(r2);
    }
    const start = boxes.length;
    emitSurface(isl, r2, o.color, blocks, boxes);
    // Loose rocks drifting near the bigger islands.
    if (o.size !== 'small') {
      for (let n = r2.int(2, o.size === 'big' ? 10 : 5); n > 0; n--) {
        const a = r2.range(0, Math.PI * 2);
        const d = Math.max(o.rx, o.rz) * r2.range(1.08, 1.4);
        const s = r2.range(3, 9);
        const x = o.cx + Math.cos(a) * d, z = o.cz + Math.sin(a) * d, y = o.cy + r2.range(-o.hb * 0.6, o.ht * 0.6);
        for (let m = r2.int(1, 4); m > 0; m--) {
          const q = s * r2.range(0.5, 1);
          boxes.push(cube(x + r2.range(-s, s), y + r2.range(-s, s), z + r2.range(-s, s), q, o.color, r2.range(0.85, 1.05)));
        }
      }
    }
    parts.push({ start, end: boxes.length, cx: o.cx, cy: o.cy, cz: o.cz, radius: Math.hypot(Math.max(o.rx, o.rz) * 1.45, o.hb * 1.6 + o.ht * 1.9 + o.spireMax) });
  }

  // Distant giants: scenery only, far beyond the field, softened by the haze.
  const backdrop = [];
  for (let n = 0; n < 18; n++) {
    const a = (n / 18) * Math.PI * 2 + rng.range(-0.12, 0.12);
    const d = rng.range(2600, 4600);
    const rx = rng.range(350, 800);
    const o = { size: 'far', kind: rng.weighted({ mesa: 2, peak: 2, terrace: 1 }), rx, rz: rx * rng.range(0.7, 1.3), ht: rng.range(120, 380), hb: rng.range(300, 700), cell: 60, spireMax: 0, cx: Math.cos(a) * d, cz: Math.sin(a) * d, cy: rng.range(250, 1400), color: rng.int(0, blocks - 1), ridgeSin: 0, ridgeCos: 1 };
    const isl = new Island(o);
    isl.shape(noise, rng);
    emitSurface(isl, rng, o.color, blocks, backdrop, true);
  }

  // Updrafts: rising air along the cliffs of the larger islands.
  const updrafts = [];
  for (const o of islands) {
    if (o.size === 'small') continue;
    for (let n = o.size === 'big' ? rng.int(1, 3) : rng.int(0, 1); n > 0; n--) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.max(o.rx, o.rz) * rng.range(1.02, 1.2);
      updrafts.push({ x: o.cx + Math.cos(a) * d, z: o.cz + Math.sin(a) * d, y0: o.cy - o.hb, y1: o.cy + o.ht + rng.range(150, 300), r: rng.range(28, 55), strength: rng.range(11, 17) });
    }
  }

  const world = new World(boxes);
  const clearance = (x, y, z) => world.nearest(x, y, z, 60);

  // Portals: rings of purple cubes in open air near the rock; worth 1000 and a
  // fresh dive from the top.
  const portals = [];
  for (let t = 0; t < 400 && portals.length < 3; t++) {
    const o = rng.pick(islands.filter((q) => q.size !== 'small'));
    const a = rng.range(0, Math.PI * 2);
    const d = Math.max(o.rx, o.rz) * rng.range(1.1, 1.4);
    const x = o.cx + Math.cos(a) * d, z = o.cz + Math.sin(a) * d, y = o.cy + rng.range(-o.hb * 0.6, o.ht);
    const c = clearance(x, y, z);
    if (c > 22 && c < 60 && portals.every((p) => Math.hypot(p.x - x, p.y - y, p.z - z) > 400)) portals.push({ x, y, z, r: 9, yaw: rng.range(0, Math.PI * 2) });
  }

  // Spawn: high above the edge of the field, diving in toward the middle over
  // the tallest islands.
  let topMost = 0;
  for (const o of islands) topMost = Math.max(topMost, o.cy + o.ht * 1.9 + o.spireMax);
  const sa = rng.range(0, Math.PI * 2);
  const sx = Math.cos(sa) * R * 0.95, sz = Math.sin(sa) * R * 0.95;
  const spawn = { pos: [sx, topMost + 140, sz], yaw: Math.atan2(-sx, -sz), pitch: 0.35 };

  return {
    def,
    palette,
    boxes,
    parts,
    backdrop,
    updrafts,
    portals,
    world,
    spawn,
    bounds: { radius: R, top: H, mist: 0, floor: -40, ceiling: topMost + 900, edge: R + 750 },
  };
}

function cube(x, y, z, half, color, shade) {
  return { c: [x, y, z], h: [half, half, half], m: IDENTITY, color, shade };
}

// The visible skin of an island: every solid cell with an open face becomes a
// cube, slightly jittered in size and place so the rock reads as rough, with
// tops lit lighter, undersides darker and faint layered strata.
function emitSurface(isl, rng, base, blocks, out, far = false) {
  const c = isl.cell;
  const top = (base + 1 + (rng.next() < 0.5 ? 0 : 1)) % blocks;
  const strataPhase = rng.range(0, 6);
  const capDepth = isl.material === 'craggy' || isl.material === 'needles' ? 2 : 1;
  const skyTop = new Int32Array(isl.nx * isl.nz).fill(-1);
  for (let k = 0; k < isl.nz; k++)
    for (let i = 0; i < isl.nx; i++)
      for (let j = isl.ny - 1; j >= 0; j--)
        if (isl.get(i, j, k)) {
          skyTop[k * isl.nx + i] = j;
          break;
        }
  for (let j = 0; j < isl.ny; j++)
    for (let k = 0; k < isl.nz; k++)
      for (let i = 0; i < isl.nx; i++) {
        if (!isl.get(i, j, k)) continue;
        const up = !isl.get(i, j + 1, k), down = !isl.get(i, j - 1, k);
        const open = up || down || !isl.get(i + 1, j, k) || !isl.get(i - 1, j, k) || !isl.get(i, j, k + 1) || !isl.get(i, j, k - 1);
        if (!open) continue;
        const [x, y, z] = isl.pos(i, j, k);
        let half = c * 0.5 * (far ? 1 : rng.range(1.0, 1.12));
        let ox = 0, oy = 0, oz = 0;
        if (!far) {
          ox = rng.range(-0.06, 0.06) * c;
          oz = rng.range(-0.06, 0.06) * c;
          oy = rng.range(-0.04, 0.04) * c;
          if (rng.next() < 0.07) {
            half *= 1.22;
            oy += up ? c * 0.18 : 0;
          }
        }
        const strata = 1 + 0.06 * Math.sin(j * 1.7 + strataPhase);
        // A cohesive cap: the top two layers take the cap colour, steps included.
        // The cap: the first two solid layers seen from the sky in this column.
        const cap = j >= skyTop[k * isl.nx + i] - capDepth;
        const color = cap && rng.next() < 0.93 ? top : base;
        const shade = (up ? 1.08 : down ? 0.8 : cap ? 1.0 : 0.94) * strata * rng.range(0.94, 1.04);
        out.push({ c: [x + ox, y + oy, z + oz], h: [half, half, half], m: IDENTITY, color, shade });
      }
}
