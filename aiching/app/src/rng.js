// Seeded randomness. A reading is cast from a seed made of the question and
// the day it is asked, so the same question asked on the same day gives the
// same answer (the old rule: do not ask the oracle twice), while a new day or
// a differently worded question casts afresh.

/** Normalise a question so stray spaces and capitals do not change the cast. */
export function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s　]+/g, ' ')
    .replace(/\s*([?？!！.。,，])\s*$/u, '$1')
    .trim();
}

/** cyrb128: four 32-bit hashes of a string. */
export function hash128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32 generator: returns floats in [0, 1). */
export function sfc32([a, b, c, d]) {
  return function next() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ (b >>> 9);
    b = c + (c << 3) | 0;
    c = (c << 21) | (c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** A generator seeded by the question and the day. */
export function seeded(question, day) {
  const key = `${normalise(question)}|${day}`;
  const h = hash128(key);
  const rng = sfc32(h);
  for (let i = 0; i < 12; i++) rng(); // warm up
  return { rng, seed: h[0].toString(36) + h[1].toString(36) };
}

/** Pick from a list with a generator. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}
