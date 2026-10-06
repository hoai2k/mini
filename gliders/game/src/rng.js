// Seeded random numbers, so a level is the same for every player and every visit.

export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function createRng(seed) {
  let s = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
    // Pick a key of { key: weight }.
    weighted(weights) {
      const entries = Object.entries(weights).filter(([, w]) => w > 0);
      let total = 0;
      for (const [, w] of entries) total += w;
      let r = next() * total;
      for (const [k, w] of entries) {
        r -= w;
        if (r <= 0) return k;
      }
      return entries[entries.length - 1][0];
    },
  };
  return rng;
}
