// Greek letters settling into English: the timing and the letters, with no
// DOM and no Three.js (the node tests load it; ui/greekText.js draws it in
// the page and world/liveSign.js on painted signs).
//
// Only in-game and title text uses the effect: chapter and place titles, boss
// names, godly powers, the words on the school bus and on signs in the
// world, the prophecy. Narration (cutscene subtitles, story-card lines),
// objectives, hints and messages are plain English.
//
// A piece of text shows in Greek for `hold` seconds, then settles letter by
// letter, left to right, over `settle` seconds, then stays in English for
// `read` seconds before it goes (toasts).

// How long each kind of text stays Greek, settles and stays readable.
export const GREEK = {
  title: { hold: 1.8, settle: 0.8, read: 2.6 },   // a chapter or place title (toasts, story-card titles)
  boss: { hold: 1.3, settle: 0.7, read: 2.4 },    // a boss's name as it appears
  map: { hold: 0.9, settle: 0.6, read: 0 },       // the chapter map's title as you browse (shorter: you are choosing)
  power: { hold: 0.5, settle: 0.5, read: 1.8 },   // a godly power's name, mid-fight
  prophecy: { hold: 0.6, settle: 1.4, read: 0 },  // a prophecy line revealed
  sign: { hold: 0, settle: 1.1, read: 0 },        // a painted sign once it is read (the time it settles)
};
export const FLUX = 0.3;     // seconds a letter scrambles before it settles
export const FLUX_HZ = 18;   // scrambles per second

// When letter i of n settles (seconds from the start). jitter in [0, 1).
export function letterAt(i, n, { hold = 0, settle = 0.8 } = {}, jitter = 0) {
  const span = settle * 0.8;
  return hold + (n > 1 ? i / (n - 1) : 0) * span + jitter * settle * 0.2;
}
// Everything is English after this many seconds.
export const settledBy = (t) => (t.hold ?? 0) + (t.settle ?? 0.8);
// How long a toast of this kind stays on screen (English for `read` at the end).
export const showFor = (t) => settledBy(t) + (t.read ?? 2.4);

// Look-alike Greek letters; any other letter becomes a random Greek one.
export const LOOK = {
  A: 'Α', B: 'Β', E: 'Ε', Z: 'Ζ', H: 'Η', I: 'Ι', K: 'Κ', M: 'Μ', N: 'Ν', O: 'Ο', P: 'Ρ', T: 'Τ', Y: 'Υ', X: 'Χ',
  C: 'Ϲ', S: 'Σ', D: 'Δ', L: 'Λ', G: 'Γ', F: 'Φ', R: 'Ρ', U: 'Υ', V: 'Ν', W: 'Ω', J: 'Ϳ',
  a: 'α', b: 'β', d: 'δ', e: 'ε', i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'η', o: 'ο', p: 'ρ', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', v: 'ν', w: 'ω', x: 'χ', y: 'γ', z: 'ζ', c: 'ϲ', f: 'φ', g: 'γ', h: 'η', j: 'ϳ',
};
const RAND_L = 'αβγδεζηθκλμνξπρστφχψω';
const RAND_U = 'ΓΔΘΛΞΠΣΦΨΩ';
export const isLetter = (c) => /[A-Za-z]/.test(c);
export const upperOf = (c) => c === c.toUpperCase();
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const randGreek = (upper, r = Math.random) => { const s = upper ? RAND_U : RAND_L; return s[Math.floor(r() * s.length)]; };
const hash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return ((Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0) / 4294967296; };

// Whole string to Greek letters (stable for a given seed), for scrolls and signs.
export function toGreek(text, seed = 1) {
  const r = rng(seed);
  let out = '';
  for (const c of text) out += isLetter(c) ? (r() < 0.8 && LOOK[c] ? LOOK[c] : randGreek(upperOf(c), r)) : c;
  return out;
}

// The letters of `text` with their Greek look and the time each settles.
export function greekPlan(text, timing, seed = text.length * 7919 + 13) {
  const r = rng(seed);
  const chars = [...String(text)];
  const n = chars.filter(isLetter).length || 1;
  let idx = 0;
  return chars.map((ch) => {
    if (!isLetter(ch)) return { ch, greek: ch, at: -1 };
    const greek = LOOK[ch] && r() < 0.85 ? LOOK[ch] : randGreek(upperOf(ch), r);
    return { ch, greek, at: letterAt(idx++, n, timing, r()) };
  });
}
// The string at time t (seconds from the start): settled letters in English,
// letters about to settle scrambling, the rest in Greek.
export function greekAt(text, t, timing, seed) {
  const plan = Array.isArray(text) ? text : greekPlan(text, timing, seed);
  let out = '';
  plan.forEach((L, i) => {
    if (L.at < 0 || t >= L.at) out += L.ch;
    else if (t >= L.at - FLUX) out += randGreek(upperOf(L.ch), () => hash(i, Math.floor(t * FLUX_HZ)));
    else out += L.greek;
  });
  return out;
}
