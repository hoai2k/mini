// Pitch names, the melody notation and the keyboard window.
//
// A melody's notes are a space-separated string of tokens: a pitch with its
// octave (middle C is C4; sharps "#", flats "b") and an optional ":beats"
// duration (default 1 beat; 0.5 is an eighth, 1.5 a dotted quarter,
// 0.333 a triplet eighth), or a rest "r:beats". For example:
//   'E4:0.5 D4:0.5 C4 D4 E4 E4 E4:2'

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const BLACK = new Set([1, 3, 6, 8, 10]);

export const isBlack = (midi) => BLACK.has(((midi % 12) + 12) % 12);
export const isWhite = (midi) => !isBlack(midi);

/** "C#4" → 61. Throws on anything else. */
export function toMidi(name) {
  const m = /^([A-G])(#|b|##|bb)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad pitch "${name}"`);
  const acc = { '#': 1, '##': 2, b: -1, bb: -2 }[m[2]] ?? 0;
  return (Number(m[3]) + 1) * 12 + LETTER[m[1]] + acc;
}

export function noteName(midi, { flats = false, octave = true } = {}) {
  const pc = ((midi % 12) + 12) % 12;
  const n = (flats ? FLAT_NAMES : SHARP_NAMES)[pc];
  return octave ? `${n}${Math.floor(midi / 12) - 1}` : n;
}

/** Parse a notes string into [{ midi, beats, at }] (rests advance time only). */
export function parseNotes(str) {
  const out = [];
  let at = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [p, d] = tok.split(':');
    const beats = d === undefined ? 1 : Number(d);
    if (!(beats > 0) || !Number.isFinite(beats)) throw new Error(`bad duration in "${tok}"`);
    if (p === 'r') { at += beats; continue; }
    out.push({ midi: toMidi(p), beats, at, name: p });
    at += beats;
  }
  if (!out.length) throw new Error('no notes');
  return out;
}

export function range(notes) {
  let lo = Infinity, hi = -Infinity;
  for (const n of notes) { lo = Math.min(lo, n.midi); hi = Math.max(hi, n.midi); }
  return { lo, hi, span: hi - lo };
}

/** The white key at or below a midi note. */
export const whiteAtOrBelow = (midi) => (isWhite(midi) ? midi : midi - 1);

/** The midi notes of a window of `whites` white keys starting on white key `start`
 *  (including the black keys between them). */
export function windowKeys(start, whites) {
  const keys = [];
  let w = 0;
  for (let m = start; w < whites; m++) {
    keys.push(m);
    if (isWhite(m)) w++;
  }
  // a trailing black key after the last white is not part of the window
  return keys;
}

export function windowTop(start, whites) {
  const k = windowKeys(start, whites);
  return k[k.length - 1];
}

/** Choose a window start (a white key) of `whites` white keys that holds lo..hi,
 *  centring the melody when there is room. Returns null if it can't fit. */
export function fitWindow(lo, hi, whites) {
  const options = [];
  for (let s = whiteAtOrBelow(lo); s > lo - 24; s--) {
    if (!isWhite(s)) continue;
    const top = windowTop(s, whites);
    if (top < hi) break;
    // Score: how evenly the spare room splits above and below.
    const below = lo - s, above = top - hi;
    options.push({ s, score: Math.abs(above - below) });
  }
  if (!options.length) return null;
  options.sort((a, b) => a.score - b.score || b.s - a.s);
  return options[0].s;
}

// ---------------------------------------------------------------- key and spelling
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_TONIC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
// Sharps or flats in each major key's signature.
const SIGNATURE = [0, 5, 2, 3, 4, 1, 6, 1, 4, 3, 2, 5];
const MINOR_TONIC = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** The major scale (and its relative minor) that best holds a melody:
 *  { tonic, minor, scale: Set of pitch classes }. */
export function keyOf(notes) {
  let best = null;
  const last = notes[notes.length - 1].midi % 12;
  const first = notes[0].midi % 12;
  for (let t = 0; t < 12; t++) {
    const scale = new Set(MAJOR.map((x) => (x + t) % 12));
    let fit = 0;
    for (const n of notes) if (scale.has(n.midi % 12)) fit += 1 + Math.min(n.beats, 2) * 0.25;
    const rel = (t + 9) % 12;
    // A minor melody's raised 7th falls outside the major scale: count it as in.
    const raised = (rel + 11) % 12;
    const minorFit = fit + notes.filter((n) => n.midi % 12 === raised).length * 0.9;
    // Prefer simpler key signatures when the fit is close.
    const sig = SIGNATURE[t] * 0.12;
    const majorScore = fit + (last === t ? 0.6 : 0) + (first === t ? 0.2 : 0) - sig;
    const minorScore = minorFit + (last === rel ? 0.6 : 0) + (first === rel ? 0.2 : 0) - 0.05 - sig;
    for (const [score, minor] of [[majorScore, false], [minorScore, true]]) {
      if (!best || score > best.score) best = { score, tonic: minor ? rel : t, minor, scale, raised: minor ? raised : null };
    }
  }
  return best;
}

/** Notes that fall outside the melody's key (a minor key's raised 7th excepted). */
export function chromaticCount(notes, key = keyOf(notes)) {
  return notes.filter((n) => !key.scale.has(n.midi % 12) && n.midi % 12 !== key.raised).length;
}

/** Spell a note in a key: { letter, acc (-2..2), octave }. Notes outside the key take
 *  the usual chromatic spelling: lowered 2nd, 3rd, 6th and 7th, raised 4th (and in
 *  minor, raised 6th and 7th). */
export function spell(midi, key) {
  const pc = ((midi % 12) + 12) % 12;
  const tonicName = (key.minor ? MINOR_TONIC : MAJOR_TONIC)[key.tonic];
  const tonicLetter = LETTERS.indexOf(tonicName[0]);
  const rel = (pc - key.tonic + 12) % 12;
  const degree = key.minor
    ? { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6 }[rel]
    : { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6 }[rel];
  const li = (tonicLetter + degree) % 7;
  let acc = pc - LETTER_PC[li];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  // The octave follows the letter (B#3 is C4's pitch, Cb5 is B4's).
  const octave = Math.floor((midi - acc) / 12) - 1;
  return { letter: LETTERS[li], acc, octave };
}

/** Spell a token the way it was written ('Bb3' → { letter: 'B', acc: -1, octave: 3 }). */
export function spellToken(name) {
  const m = /^([A-G])(#|b|##|bb)?(-?\d)$/.exec(name);
  return { letter: m[1], acc: { '#': 1, '##': 2, b: -1, bb: -2 }[m[2]] ?? 0, octave: Number(m[3]) };
}

/** Diatonic step number of a spelled note (C4 = 28). */
export const staffStep = (sp) => sp.octave * 7 + LETTERS.indexOf(sp.letter);

// ---------------------------------------------------------------- difficulty
// How hard a melody is to hear and play back. Memory load (how many notes, and how
// many different pitches), the size of each leap (a repeated interval costs half:
// patterns are easy to hold), notes outside the key, and a wide range all add up.
const LEAP_COST = [0.1, 0.7, 0.45, 0.9, 0.9, 1.2, 2.3, 1.2, 1.8, 1.8, 2.3, 2.6, 1.5];
export const LEVEL_BOUNDS = [6, 8.5, 11.5, 14]; // scores below each bound: levels 1..4; above: 5

export function difficultyScore(notes) {
  let leaps = 0, prev = null;
  for (let i = 1; i < notes.length; i++) {
    const d = notes[i].midi - notes[i - 1].midi;
    const c = LEAP_COST[Math.abs(d)] ?? 2.8;
    leaps += prev !== null && Math.abs(d) === Math.abs(prev) ? c * 0.5 : c;
    prev = d;
  }
  const distinct = new Set(notes.map((n) => n.midi)).size;
  const { span } = range(notes);
  return notes.length * 0.15 + distinct * 0.55 + leaps + chromaticCount(notes) * 2 + Math.max(0, span - 7) * 0.12;
}

/** A difficulty level from 1 (Beginner) to 5 (Expert). */
export function difficulty(notes) {
  const s = difficultyScore(notes);
  const i = LEVEL_BOUNDS.findIndex((b) => s < b);
  return i < 0 ? 5 : i + 1;
}
