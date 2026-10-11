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
    out.push({ midi: toMidi(p), beats, at });
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

/** A difficulty from 1 (easiest) to 5, from length, leaps and chromatic notes. */
export function difficulty(notes) {
  const n = notes.length;
  let leaps = 0, big = 0;
  for (let i = 1; i < n; i++) {
    const d = Math.abs(notes[i].midi - notes[i - 1].midi);
    if (d > 2) leaps++;
    if (d > 5) big++;
  }
  const pcs = new Set(notes.map((x) => x.midi % 12)).size;
  const { span } = range(notes);
  const score = n * 0.55 + leaps * 0.5 + big * 0.9 + Math.max(0, pcs - 5) * 0.9 + span * 0.12;
  if (score < 5) return 1;
  if (score < 7.5) return 2;
  if (score < 10) return 3;
  if (score < 13) return 4;
  return 5;
}
