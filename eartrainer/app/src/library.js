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
  { id: 'jazz', name: 'Jazz Standards', blurb: 'The Real Book: swing, ballads and bossa', glyph: '♫' },
  { id: 'bebop', name: 'Bebop Heads', blurb: 'Parker, Monk, Gillespie, Rollins and more', glyph: '♪' },
  { id: 'licks', name: 'Jazz & Blues Licks', blurb: 'Vocabulary: arpeggios, enclosures, runs', glyph: '♯' },
  { id: 'popular', name: 'Film & Pop Hooks', blurb: 'Riffs and themes everyone knows', glyph: '★' },
];

export const LEVELS = [
  { id: 'adaptive', name: 'Adaptive', range: null },
  { id: 'l1', name: '1 · Beginner', short: 'Beginner', range: [1, 1], blurb: 'A few notes, mostly steps' },
  { id: 'l2', name: '2 · Easy', short: 'Easy', range: [2, 2], blurb: 'Short tunes with small leaps' },
  { id: 'l3', name: '3 · Medium', short: 'Medium', range: [3, 3], blurb: 'Longer phrases, wider leaps' },
  { id: 'l4', name: '4 · Hard', short: 'Hard', range: [4, 4], blurb: 'Big leaps, some chromatic notes' },
  { id: 'l5', name: '5 · Expert', short: 'Expert', range: [5, 5], blurb: 'Long, leaping, chromatic lines' },
  { id: 'songs', name: 'Full songs', short: 'Full songs', range: null, songs: true, blurb: 'A whole song, phrase by phrase' },
];
export const isSongs = (level) => level === 'songs';
// Older saves named the levels differently.
export const LEVEL_ALIASES = { easy: 'l2', medium: 'l3', hard: 'l4', expert: 'l5' };

/**
 * Whole songs for the Full Songs mode. Each phrase is a melody of its own
 * (id `<song>#<n>`) that knows its song and place; the song keeps its phrases
 * in order and its overall level (that of its hardest phrase).
 */
export function buildSongs(lists) {
  const songs = [];
  for (const list of lists) {
    for (const s of list) {
      const song = { id: s.id, title: s.title, by: s.by, cat: s.cat, bpm: s.bpm };
      song.phrases = s.phrases.map((notes, i) => {
        const parsed = parseNotes(notes);
        return { id: `${s.id}#${i + 1}`, title: s.title, by: s.by, cat: s.cat, bpm: s.bpm, notes, parsed,
          ...range(parsed), level: difficulty(parsed), song, index: i };
      });
      song.level = Math.max(...song.phrases.map((p) => p.level));
      songs.push(song);
    }
  }
  return songs;
}

/** The next song: one not yet finished (or with the fewest stars), not played lately. */
export function pickSong(pool, { best = {}, recent = [], rng = Math.random } = {}) {
  if (!pool.length) return null;
  let candidates = pool.filter((s) => !recent.includes(s.id));
  if (!candidates.length) candidates = pool;
  const score = (s) => best[s.id] ?? -1;
  const lowest = Math.min(...candidates.map(score));
  const tier = candidates.filter((s) => score(s) === lowest);
  return tier[Math.floor(rng() * tier.length)];
}

/** How many melodies of a pool sit at a level (all of them for Adaptive). */
export function countAt(pool, level) {
  const lv = LEVELS.find((l) => l.id === level);
  return lv?.range ? pool.filter((m) => m.level >= lv.range[0] && m.level <= lv.range[1]).length : pool.length;
}

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
    // The chosen level, or the nearest level that has melodies in this songbook.
    for (let d = 0; d <= 4; d++) {
      const f = pool.filter((m) => m.level >= lv.range[0] - d && m.level <= lv.range[1] + d);
      if (f.length) { candidates = f; break; }
    }
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
