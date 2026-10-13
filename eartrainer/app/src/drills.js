// Drills: short made-up exercises aimed at one skill, from level 1 (the skill
// alone, as plainly as it can be heard) to level 4 (the skill twice, inside a
// little tune). They are ordinary melodies to the rest of the app (with
// `drill: true`), so the round, the staff and the scoring all work as usual.
import { noteName, range, difficulty } from './music.js';
import { has } from './skills.js';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const between = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));

/** The midi note of scale degree `d` (0 = tonic, may be negative or past 7). */
function degree(tonic, scale, d) {
  const o = Math.floor(d / 7);
  return tonic + o * 12 + scale[((d % 7) + 7) % 7];
}
/** A wandering line in a key: `n` notes by steps (and the odd third). */
function walk(tonic, scale, n, rng, { leaps = false, start = 0 } = {}) {
  const out = [];
  let d = start;
  for (let i = 0; i < n; i++) {
    out.push(degree(tonic, scale, d));
    const moves = leaps ? [-2, -1, 1, 2, -3, 3] : [-1, 1, -1, 1, -2, 2];
    let mv = pick(moves, rng);
    if (d + mv > 9) mv = -Math.abs(mv);
    if (d + mv < -3) mv = Math.abs(mv);
    d += mv;
  }
  return out;
}
const fits = (ms) => Math.max(...ms) - Math.min(...ms) <= 16 && Math.min(...ms) >= 43 && Math.max(...ms) <= 86;

/** Phrases for each skill at each level, as midi lists (and an optional beat length per note). */
const MAKERS = {
  interval(k, level, rng) {
    const d1 = rng() < 0.5 ? 1 : -1;
    const a = between(55, 67, rng);
    if (level === 1) return [a, a + k * d1, a];
    if (level === 2) { const b = a + pick([-5, -3, -2, 2, 3, 5], rng); return [a, a + k * d1, b, b + k * d1]; }
    if (level === 3) {
      const x = a + k * d1 + pick([-2, -1, 1, 2], rng);
      const y = x - k * d1;
      return [a, a + k * d1, x, y, y + pick([-2, 2], rng)];
    }
    // Level 4: inside a little tune, twice, once each way.
    const ops = [k, -k, ...Array.from({ length: 3 }, () => pick([-2, -1, 1, 2], rng))];
    for (let i = ops.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ops[i], ops[j]] = [ops[j], ops[i]]; }
    const out = [a];
    for (const o of ops) out.push(out[out.length - 1] + o * d1);
    return out;
  },
  contour(level, rng) {
    const n = 3 + level;
    const out = [between(57, 67, rng)];
    let dir = rng() < 0.5 ? 1 : -1;
    for (let i = 1; i < n; i++) {
      if (rng() < 0.6) dir = -dir; // changes of direction are the point
      out.push(out[i - 1] + dir * between(1, 2 + level, rng));
    }
    return out;
  },
  octave(level, rng) {
    const a = between(52, 62, rng);
    if (level === 1) return [a, a + 12, a];
    if (level === 2) return [a, a + 12, a + 7, a];
    const out = [a];
    for (let i = 1; i < 2 + level; i++) out.push(out[i - 1] + pick([12, -12, 9, -9, 10, -10, 7, -7], rng));
    return out;
  },
  chromatic(level, rng) {
    const tonic = between(55, 64, rng);
    const line = walk(tonic, MAJOR, 3 + level, rng);
    // One (or, from level 3, two) notes nudged a half step outside the key.
    const spots = new Set();
    while (spots.size < (level >= 3 ? 2 : 1)) spots.add(between(1, line.length - 2, rng));
    for (const i of spots) {
      const up = line[i] + 1, down = line[i] - 1;
      const inKey = (m) => MAJOR.includes(((m - tonic) % 12 + 12) % 12);
      line[i] = !inKey(up) ? up : !inKey(down) ? down : line[i] + 1;
    }
    return line;
  },
  minor(level, rng) {
    const tonic = between(57, 64, rng);
    const line = walk(tonic, MINOR, 3 + level, rng, { leaps: level >= 3 });
    line.push(tonic); // minor tunes come home
    return line;
  },
  long(level, rng) {
    const tonic = between(55, 62, rng);
    return walk(tonic, MAJOR, Math.min(16, 8 + level * 2), rng);
  },
  fast(level, rng) {
    const tonic = between(55, 64, rng);
    return walk(tonic, MAJOR, 4 + level, rng, { leaps: level >= 3 });
  },
};

const LABEL = {
  contour: 'which way the line moves', octave: 'the right octave', chromatic: 'notes outside the key',
  minor: 'minor keys', long: 'longer melodies', fast: 'fast notes',
};
let serial = 0;

function toNotes(ms, beats) {
  let at = 0;
  return ms.map((midi, i) => {
    const b = i === ms.length - 1 ? 2 : beats;
    const n = { midi, beats: b, at, name: noteName(midi, { flats: false }) };
    at += b;
    return n;
  });
}

/** A drill for `skill` at `level` (1..4). */
export function makeDrill(skill, level, rng = Math.random, names = {}) {
  const lv = Math.max(1, Math.min(4, Math.round(level)));
  const beats = skill === 'fast' ? 0.5 : skill === 'long' ? 0.5 : 1;
  const bpm = skill === 'fast' ? 132 + lv * 18 : skill === 'long' ? 120 : 92 + lv * 6;
  // Make one, and keep it only if it fits and really works the skill as the
  // judge hears it (a short line can sound like another key, for instance).
  let ms = null;
  for (let tries = 0; tries < 60; tries++) {
    const cand = skill.startsWith('int') ? MAKERS.interval(Number(skill.slice(3)), lv, rng) : (MAKERS[skill] || MAKERS.contour)(lv, rng);
    if (!fits(cand)) continue;
    ms = cand;
    if (skill === 'octave' || has({ parsed: toNotes(cand, beats), bpm }, skill)) break;
  }
  if (!ms) ms = [60, 62, 64];
  const parsed = toNotes(ms, beats);
  const what = names[skill] || LABEL[skill] || skill;
  return {
    id: `drill-${skill}-${lv}-${++serial}`, drill: true, skill, drillLevel: lv,
    title: `Drill: ${what}`, by: `Focus drill · step ${lv} of 4`, cat: 'drill', bpm,
    notes: parsed.map((n) => `${n.name}${n.beats === 1 ? '' : `:${n.beats}`}`).join(' '),
    parsed, ...range(parsed), level: difficulty(parsed),
  };
}
