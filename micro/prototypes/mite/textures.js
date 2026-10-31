// Procedural stand-ins for the requested SEM textures (MP-M01..MP-M04 in
// micro/image-requests.md). Each is a greyscale height-like image: the
// G-buffer pass reads its luminance as surface relief, so a delivered SEM
// micrograph (bright ridges, dark pits) drops in through the same path.
// `semTextures()` resolves every slot to the delivered file when its status is
// `delivered` (shared/assets.js loads it and logs loudly if it fails) and to
// the stand-in otherwise.
import * as THREE from '../shared/vendor/three.module.min.js';
import { loadTexture } from '../shared/assets.js';

/** Deterministic 32-bit hash -> [0, 1). */
export function hash(...n) {
  let h = 2166136261 >>> 0;
  for (const v of n) { h = Math.imul(h ^ (v | 0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
  return (h >>> 0) / 4294967296;
}

/** Seeded PRNG (mulberry32). */
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

const smooth = (t) => t * t * (3 - 2 * t);

/** Tileable value noise on a period-p lattice. */
function vnoise(x, y, p, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = smooth(x - xi), fy = smooth(y - yi);
  const m = (v) => ((v % p) + p) % p;
  const a = hash(m(xi), m(yi), seed), b = hash(m(xi + 1), m(yi), seed);
  const c = hash(m(xi), m(yi + 1), seed), d = hash(m(xi + 1), m(yi + 1), seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function fbm(u, v, p, oct, seed) {
  let s = 0, amp = 0.5, f = 1;
  for (let o = 0; o < oct; o++) { s += amp * vnoise(u * p * f, v * p * f, p * f, seed + o); amp *= 0.5; f *= 2; }
  return s;
}

function canvasTexture(w, h, fill) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  fill(img.data, w, h, g);
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/**
 * MP-M01 stand-in: a moss lamina, long narrow rhomboid cells in staggered
 * rows running along v (the leaf's length), sunken lumens between raised
 * walls, a few papillae. One tile ~140 µm square of leaf.
 */
function mossLeaf(N = 512) {
  const CX = 10, CY = 2.5; // cells across and along one tile (cells ~14 x 56 µm)
  const pts = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < CX; i++) {
    // staggered: alternate columns shift half a cell, so the cell ends are rhomboid
    const jx = (hash(i, j, 11) - 0.5) * 0.3, jy = (hash(i, j, 12) - 0.5) * 0.35;
    pts.push([(i + 0.5 + jx) / CX, ((j + (i % 2) * 0.5 + 0.5 + jy) / 3) % 1]);
  }
  return canvasTexture(N, N, (d) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      let f1 = 9, f2 = 9;
      for (const [px, py] of pts) {
        let dx = Math.abs(u - px); dx = Math.min(dx, 1 - dx);
        let dy = Math.abs(v - py); dy = Math.min(dy, 1 - dy);
        const dd = Math.hypot(dx * CX, dy * CY * 1.0);
        if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
      }
      const wall = 1 - Math.min(1, (f2 - f1) / 0.16);
      const lumen = 0.42 - 0.12 * Math.min(1, f1 * 1.6); // slightly dished cell
      const pap = hash(Math.floor(u * 64), Math.floor(v * 64), 5) > 0.985 ? 0.25 : 0;
      const n = fbm(u, v, 16, 2, 9) * 0.08;
      const hgt = Math.min(1, lumen + wall * wall * 0.62 + pap * (1 - wall) + n);
      const g = Math.round(hgt * 255);
      const o = 4 * (y * N + x);
      d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 255;
    }
  });
}

/** MP-M02 stand-in: crumbly humus and grain surface; one tile ~300 µm. */
function litter(N = 512) {
  return canvasTexture(N, N, (d) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const big = fbm(u, v, 6, 4, 21);
      const crumbs = Math.pow(fbm(u, v, 24, 3, 33), 2.2) * 1.6;
      const crack = Math.abs(fbm(u, v, 8, 3, 44) - 0.5) < 0.018 ? -0.35 : 0;
      const hgt = Math.max(0, Math.min(1, big * 0.55 + crumbs * 0.45 + crack));
      const g = Math.round(hgt * 255);
      const o = 4 * (y * N + x);
      d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 255;
    }
  });
}

/** MP-M03 stand-in: smooth sclerotised cuticle with fine punctae; one tile ~150 µm. */
function cuticle(N = 256) {
  const pits = [];
  const r = rng(77);
  for (let i = 0; i < 90; i++) pits.push([r(), r(), 0.006 + r() * 0.008]);
  return canvasTexture(N, N, (d) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      let hgt = 0.6 + fbm(u, v, 4, 3, 61) * 0.12 + (hash(x, y, 3) - 0.5) * 0.02;
      for (const [px, py, pr] of pits) {
        let dx = Math.abs(u - px); dx = Math.min(dx, 1 - dx);
        let dy = Math.abs(v - py); dy = Math.min(dy, 1 - dy);
        const dd = Math.hypot(dx, dy) / pr;
        if (dd < 1.6) hgt -= 0.45 * Math.max(0, 1 - dd * dd) - (dd > 1 ? 0.06 * (1.6 - dd) : 0);
      }
      const g = Math.round(Math.max(0, Math.min(1, hgt)) * 255);
      const o = 4 * (y * N + x);
      d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 255;
    }
  });
}

/**
 * MP-M04 stand-in: a far backdrop of moss shoots fading into the dark of the
 * chamber, drawn as SEM-toned silhouettes with bright rims (2560 x 1080 is
 * the delivered size; the stand-in is smaller).
 */
function backdrop(W = 1280, H = 540) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0b0b0b'); grad.addColorStop(0.7, '#262626'); grad.addColorStop(1, '#3a3a3a');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const r = rng(91);
  for (let layer = 0; layer < 3; layer++) {
    const tone = 40 + layer * 30;
    for (let s = 0; s < 14; s++) {
      let x = r() * W, y = H + 10;
      const lean = (r() - 0.5) * 0.6, h = H * (0.45 + r() * 0.5) * (1 - layer * 0.15);
      g.lineCap = 'round';
      for (let k = 0; k < 18; k++) {
        const nx = x + lean * (h / 18) + (r() - 0.5) * 6, ny = y - h / 18;
        g.strokeStyle = `rgb(${tone},${tone},${tone})`; g.lineWidth = 7 - layer * 1.5;
        g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
        // spiralling leaves: two blades per node, bright edge rim like the SE edge effect
        for (const sd of [-1, 1]) {
          const a = -Math.PI / 2 + sd * (0.5 + r() * 0.6), L = 30 + r() * 30 - layer * 6;
          g.fillStyle = `rgb(${tone},${tone},${tone})`;
          g.strokeStyle = `rgb(${tone + 70},${tone + 70},${tone + 70})`; g.lineWidth = 1.2;
          g.beginPath(); g.ellipse(nx + Math.cos(a) * L * 0.5, ny + Math.sin(a) * L * 0.5, L * 0.5, L * 0.12, a, 0, Math.PI * 2);
          g.fill(); g.stroke();
        }
        x = nx; y = ny;
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/**
 * Every SEM texture, resolved: delivered art where it exists, the stand-in
 * otherwise. `onDelivered(id, tex)` fires when a delivered file replaces a
 * stand-in, so materials can swap their sampler.
 */
export function semTextures(onDelivered) {
  const tex = { leaf: mossLeaf(), litter: litter(), cuticle: cuticle(), backdrop: backdrop() };
  const ids = { leaf: 'MP-M01', litter: 'MP-M02', cuticle: 'MP-M03', backdrop: 'MP-M04' };
  for (const [k, id] of Object.entries(ids)) {
    loadTexture(id, { repeat: k !== 'backdrop', srgb: false }).then((t) => {
      if (!t) return;
      if (k === 'backdrop') t.wrapS = THREE.RepeatWrapping;
      tex[k] = t;
      console.info(`[micro] using delivered ${id} for ${k}`);
      onDelivered(k, t);
    });
  }
  return tex;
}
