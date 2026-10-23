// Tone Matching, one of the Intonation Exercises: a cello plays a note, then
// the player plays (or sings) the same note, in any octave. Judged twice: is
// it the right note at all, and how close is its pitch. The note sounds with
// the microphone closed where it can be, so it never plays over listening
// (the phone stays out of call mode). The sheet is in tunerui.js.

import { hzToMidi } from './tuning.js';

/** The notes a cello plays it on: G2 to D4, the middle of the instrument. */
export const MATCH_LOW = 43;
export const MATCH_HIGH = 62;
/** How long the note sounds, in seconds. */
export const TONE_SEC = 2.6;
/** A note counts once held this long (ms), its readings within STEADY_CENTS of each other. */
export const STEADY_MS = 700;
export const STEADY_CENTS = 40;
/** In tune within this many cents; close within CLOSE_CENTS. */
export const IN_TUNE_CENTS = 5;
export const CLOSE_CENTS = 15;

/** A new note to match: an exact note (no in-between pitch), not the same note name as the last one. */
export function pickNote(prev = null, rand = Math.random) {
  for (;;) {
    const midi = MATCH_LOW + Math.floor(rand() * (MATCH_HIGH - MATCH_LOW + 1));
    if (prev === null || (midi - prev) % 12 !== 0) return midi;
  }
}

/**
 * A pitch against the note to match, in whatever octave it was played:
 * `right` if it is that note, `cents` off it (−50 to 50 when right; −600 to
 * 600 in all), `semitones` from it to the note played (−6 to 6), `played`
 * the nearest note's MIDI number, and `closeness` ('inTune', 'close', 'off').
 */
export function judgeMatch(hz, target, a4 = 440) {
  const exact = hzToMidi(hz, a4);
  const cents = (((exact - target) * 100 + 600) % 1200 + 1200) % 1200 - 600; // in the nearest octave
  const semitones = Math.round(cents / 100) || 0;
  const right = semitones === 0;
  const abs = Math.abs(cents);
  return {
    right,
    cents,
    semitones,
    played: Math.round(exact),
    closeness: !right ? 'off' : abs <= IN_TUNE_CENTS ? 'inTune' : abs <= CLOSE_CENTS ? 'close' : 'off',
  };
}

/** Readings in, a held note out: push(hz, at ms) returns the note's frequency (the median) once it is steady. */
export class SteadyNote {
  constructor() { this.reset(); }

  reset() { this.run = []; }

  push(hz, at) {
    const m = hzToMidi(hz);
    // A reading that strays from the run starts a new one.
    if (this.run.length && Math.abs(m - this.run[0].m) * 100 > STEADY_CENTS) this.run = [];
    this.run.push({ hz, m, at });
    if (at - this.run[0].at < STEADY_MS) return null;
    const sorted = this.run.map((r) => r.hz).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
}
