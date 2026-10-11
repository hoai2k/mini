// The melody library: songbooks, difficulty, transposition and what comes next.
import { parseNotes, range, difficulty, fitWindow } from './music.js';
import LISTS from '../data/melodies/index.js';

export const WHITES = 11; // white keys on screen: an octave and a half
export const LOWEST = 36; // C2
export const HIGHEST = 96; // C7

export const SONGBOOKS = [
  { id: 'all', name: 'Everything', blurb: 'The whole library, mixed', glyph: '✦' },
  { id: 'children', name: "Children's Songs", blurb: 'Nursery rhymes and campfire tunes', glyph: '☺' },
  { id: 'traditional', name: 'Folk & Traditional', blurb: 'Songs from around the world', glyph: '♣' },
  { id: 'holiday', name: 'Carols & Hymns', blurb: 'Seasonal and celebration songs', glyph: '❄' },
  { id: 'classical', name: 'Classical Themes', blurb: 'From Bach to Gershwin', glyph: '𝄞' },
  { id: 'jazz', name: 'Jazz Standards', blurb: 'Heads, bossa and swing', glyph: '♫' },
  { id: 'licks', name: 'Jazz & Blues Licks', blurb: 'Vocabulary: arpeggios, enclosures, runs', glyph: '♯' },
  { id: 'popular', name: 'Film & Pop Hooks', blurb: 'Riffs and themes everyone knows', glyph: '★' },
];

export const LEVELS = [
  { id: 'adaptive', name: 'Adaptive', range: null },
  { id: 'easy', name: 'Easy', range: [1, 2] },
  { id: 'medium', name: 'Medium', range: [3, 3] },
  { id: 'hard', name: 'Hard', range: [4, 4] },
  { id: 'expert', name: 'Expert', range: [5, 5] },
];

export function buildLibrary(lists = LISTS) {
  const all = [];
  for (const list of lists) {
    for (const m of list) {
      const notes = parseNotes(m.notes);
      all.push({ ...m, parsed: notes, ...range(notes), level: difficulty(notes) });
    }
  }
  return all;
}

export function inBook(lib, book) {
  return book === 'all' ? lib : lib.filter((m) => m.cat === book);
}

/** Shift a melody by `shift` semitones (kept inside the keyboard's range). */
export function transpose(m, shift) {
  let s = shift;
  while (m.lo + s < LOWEST) s += 12;
  while (m.hi + s > HIGHEST) s -= 12;
  const notes = m.parsed.map((n) => ({ ...n, midi: n.midi + s }));
  return { ...m, notes, shift: s, lo: m.lo + s, hi: m.hi + s, window: fitWindow(m.lo + s, m.hi + s, WHITES) };
}

/** A random shift of up to a fifth either way. */
export const randomShift = (rng = Math.random) => Math.floor(rng() * 12) - 6;

/**
 * Pick the next melody from a songbook.
 * - level 'adaptive' aims at the player's rating (1..5); a fixed level filters.
 * - Unsolved melodies come first, then the ones with fewest stars; recent ones are avoided.
 */
export function pickNext(pool, { level = 'adaptive', rating = 1, best = {}, recent = [], rng = Math.random } = {}) {
  if (!pool.length) return null;
  let candidates = pool;
  const lv = LEVELS.find((l) => l.id === level);
  if (lv?.range) {
    const f = pool.filter((m) => m.level >= lv.range[0] && m.level <= lv.range[1]);
    if (f.length) candidates = f;
  } else {
    // Adaptive: the nearest levels to the rating that have melodies.
    const target = Math.round(rating);
    for (let d = 0; d <= 4; d++) {
      const f = pool.filter((m) => Math.abs(m.level - target) <= d);
      if (f.length >= Math.min(6, pool.length)) { candidates = f; break; }
    }
  }
  const fresh = candidates.filter((m) => !recent.includes(m.id));
  if (fresh.length) candidates = fresh;
  const score = (m) => best[m.id] ?? -1; // unsolved first
  const lowest = Math.min(...candidates.map(score));
  const tier = candidates.filter((m) => score(m) === lowest);
  return tier[Math.floor(rng() * tier.length)];
}

/** Adjust the adaptive rating after a melody (by stars earned). */
export function rate(rating, starsEarned) {
  const delta = { 3: 0.34, 2: 0.08, 1: -0.3 }[starsEarned] ?? 0;
  return Math.min(5, Math.max(1, rating + delta));
}
