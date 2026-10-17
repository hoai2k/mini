// Seeded 2D value noise for terrain: smooth hills (fbm), ridges (mountain
// spines) and a cell jitter. Pure, so the node tests can use it.
export function makeNoise(seed = 1) {
  const hash = (x, z) => {
    let h = (x * 374761393 + z * 668265263 + seed * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const sm = (t) => t * t * (3 - 2 * t);
  // value noise in [0, 1]
  const value = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = sm(x - xi), zf = sm(z - zi);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
  };
  // fractal sum in [0, 1]: `scale` blocks per feature
  const fbm = (x, z, scale = 32, oct = 4) => {
    let s = 0, amp = 1, tot = 0, f = 1 / scale;
    for (let i = 0; i < oct; i++) { s += value(x * f + i * 17.3, z * f - i * 9.1) * amp; tot += amp; amp *= 0.5; f *= 2; }
    return s / tot;
  };
  // ridges in [0, 1]: 1 along the crest lines
  const ridge = (x, z, scale = 48, oct = 3) => {
    let s = 0, amp = 1, tot = 0, f = 1 / scale;
    for (let i = 0; i < oct; i++) { s += (1 - Math.abs(value(x * f + i * 5.7, z * f + i * 3.1) * 2 - 1)) * amp; tot += amp; amp *= 0.5; f *= 2; }
    return s / tot;
  };
  return { hash, value, fbm, ridge };
}
// A seeded random in [0, 1).
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
