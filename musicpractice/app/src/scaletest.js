// Test My Scale Intonation, under the tuner. Listens for a scale to begin, follows it note by note, and
// takes three seconds of quiet as the end (the Playback Recorder's own
// PlayDetector). Then each note played is judged: in tune, flat or sharp,
// more leniently than the tuner's needle. Pure: tunerui.js feeds it the mic
// and shows the results; the tests feed it synthesized scales.

import { analyzeFrame, PlayDetector, FRAME } from './detect.js';

/** Cents either way that count as in tune here (the tuner's needle wants 5). */
export const SCALE_TOLERANCE = 15;
const HOP = FRAME / 2; // frames overlap by half, for a finer split between notes
const MIN_NOTE_SEC = 0.12; // shorter than this is a slide between notes, not a note
const CLARITY = 0.7;

/**
 * Which chime greets the results: 'great' (a triumphant one) when at least
 * 80% of the notes were in tune, 'good' from half, else 'neutral' (results
 * are in), as with nothing heard.
 */
export const resultTier = (good, n) => (!n ? 'neutral' : good / n >= 0.8 ? 'great' : good / n >= 0.5 ? 'good' : 'neutral');

/** 'good', 'flat' or 'sharp' for a note `cents` off its nearest pitch. */
export const judge = (cents, tolerance = SCALE_TOLERANCE) =>
  (Math.abs(cents) <= tolerance ? 'good' : cents < 0 ? 'flat' : 'sharp');

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * The notes in a run of analysed frames ({ at, rms, clarity, hz }, `at` in
 * samples): runs of clear, loud enough frames on one semitone, a stray frame
 * or two (an octave slip, a breath) let through, at least MIN_NOTE_SEC long.
 * Each note's pitch is the median of its settled middle (the attack and the
 * release left out), as `midi` (the nearest semitone) and `cents` off it.
 * @returns {{ midi: number, cents: number, start: number, end: number }[]} times in seconds
 */
export function segmentNotes(frames, { sampleRate, a4 = 440, gate = 0 }) {
  const runs = [];
  let cur = null;
  let stray = 0;
  for (const f of frames) {
    const ok = f.clarity >= CLARITY && f.rms > gate && f.hz > 0;
    const exact = ok ? 69 + 12 * Math.log2(f.hz / a4) : null;
    const m = ok ? Math.round(exact) : null;
    if (cur && m === cur.midi) {
      cur.frames.push({ at: f.at, exact });
      cur.end = f.at + HOP;
      stray = 0;
    } else if (cur && stray < 2) {
      stray++; // one or two odd frames inside a note don't end it
    } else {
      if (cur) runs.push(cur);
      cur = ok ? { midi: m, frames: [{ at: f.at, exact }], start: f.at, end: f.at + HOP } : null;
      stray = 0;
    }
  }
  if (cur) runs.push(cur);
  const notes = [];
  for (const r of runs) {
    if ((r.end - r.start) / sampleRate < MIN_NOTE_SEC) continue;
    const n = r.frames.length;
    const settled = r.frames.slice(Math.floor(n * 0.25), Math.max(Math.floor(n * 0.25) + 1, Math.ceil(n * 0.85)));
    const exact = median(settled.map((x) => x.exact));
    const prev = notes.at(-1);
    // The same note again with hardly a gap is one note that wavered.
    if (prev && prev.midi === r.midi && r.start / sampleRate - prev.end < 0.08) {
      prev.end = r.end / sampleRate;
      continue;
    }
    notes.push({ midi: r.midi, cents: (exact - r.midi) * 100, start: r.start / sampleRate, end: r.end / sampleRate });
  }
  return notes;
}

/**
 * Listens to the mic, a block at a time: 'waiting' for the scale to begin,
 * 'listening' while it is played, 'done' after three seconds of quiet (or
 * `maxSec`). `push` returns 'start' or 'done' when the state changes.
 */
export class ScaleListener {
  constructor(sampleRate, { a4 = 440, silenceSec = 3, maxSec = 180 } = {}) {
    this.sampleRate = sampleRate;
    this.a4 = a4;
    this.detector = new PlayDetector({ sampleRate, silenceSec, maxSec, sensitivity: 'medium' });
    this.buf = new Float32Array(FRAME);
    this.filled = 0;
    this.pos = 0; // samples heard so far
    this.state = 'waiting';
    this.recent = []; // the last few frames, so the first note's start isn't lost
    this.frames = []; // frames since the scale began
    this.result = null;
  }

  push(block) {
    let event = null;
    let i = 0;
    while (i < block.length && this.state !== 'done') {
      const take = Math.min(FRAME - this.filled, block.length - i);
      this.buf.set(block.subarray(i, i + take), this.filled);
      this.filled += take;
      i += take;
      if (this.filled < FRAME) break;
      const at = this.pos;
      const f = { at, ...analyzeFrame(this.buf, this.sampleRate) };
      this.pos += HOP;
      this.buf.copyWithin(0, HOP);
      this.filled = FRAME - HOP;
      const e = this.detector.feed(f, at, HOP);
      if (this.state === 'waiting') {
        this.recent.push(f);
        if (this.recent.length > 12) this.recent.shift();
        if (e?.type === 'start') {
          this.state = 'listening';
          this.frames = this.recent.filter((x) => x.at >= e.at);
          event = 'start';
        }
      } else if (this.state === 'listening') {
        this.frames.push(f);
        if (e?.type === 'end') {
          this.state = 'done';
          this.result = this.notes(e.end);
          event = 'done';
        }
      }
    }
    return event;
  }

  /** The notes so far (up to `end`, in samples, when it is known). */
  notes(end = Infinity) {
    const frames = this.frames.filter((f) => f.at < end);
    return segmentNotes(frames, { sampleRate: this.sampleRate, a4: this.a4, gate: this.detector.gate() * 0.6 });
  }
}
