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

/**
 * A score out of 1000 for a scale, more than the share in tune:
 * - up to 600 for the share of notes in tune;
 * - up to 250 for how close every note was, so a near miss earns more than a
 *   wild one and a note dead in the centre more than one only just in tune
 *   (in full at 0 cents, nothing from 50 off);
 * - up to 150 for how clear and steady the tone was (the pitch clarity the
 *   detector measures: nothing at 0.7, where a frame stops counting as a
 *   note, in full from 0.95).
 * Returns the total and its three parts, rounded so they add up.
 */
export const SCORE_PARTS = { inTune: 600, close: 250, clear: 150 };
export function scaleScore(notes, tolerance = SCALE_TOLERANCE) {
  if (!notes.length) return { total: 0, inTune: 0, close: 0, clear: 0 };
  const mean = (f) => notes.reduce((s, n) => s + f(n), 0) / notes.length;
  const inTune = Math.round(SCORE_PARTS.inTune * mean((n) => (Math.abs(n.cents) <= tolerance ? 1 : 0)));
  const close = Math.round(SCORE_PARTS.close * mean((n) => Math.max(0, 1 - Math.abs(n.cents) / 50)));
  const clear = Math.round(SCORE_PARTS.clear * mean((n) => Math.min(1, Math.max(0, ((n.clarity ?? 1) - 0.7) / 0.25))));
  return { total: inTune + close + clear, inTune, close, clear };
}

/*
 * The score shown, out of 10. At Beginner, Easy and Medium it is simply the
 * share of notes in tune (65% in tune is 6.5); at Hard, Advanced and Custom
 * it is the full score above scaled to 10 (988 is 9.88), its parts with it.
 * A perfect result is celebrated: 10 at the simple levels, 9.7 or more at
 * the others.
 */
export const SIMPLE_LEVELS = ['beginner', 'easy', 'medium'];
export function scoreOutOf10(judged, level, tolerance) {
  const n = judged.length;
  if (SIMPLE_LEVELS.includes(level)) {
    const good = judged.filter((x) => x.verdict === 'good').length;
    return { score: n ? Math.round((100 * good) / n) / 10 : 0, simple: true, parts: null };
  }
  const sc = scaleScore(judged, tolerance);
  return { score: sc.total / 100, simple: false, parts: { inTune: sc.inTune / 100, close: sc.close / 100, clear: sc.clear / 100 } };
}
export const celebrates = ({ score, simple }) => (simple ? score >= 10 : score >= 9.7);
/** The score as shown: one decimal at the simple levels (none for a whole number), two at the others. */
export const scoreText = (score, simple) => (simple ? (Number.isInteger(score) ? String(score) : score.toFixed(1)) : score.toFixed(2));

/** 'good', 'flat' or 'sharp' for a note `cents` off its nearest pitch. */
export const judge = (cents, tolerance = SCALE_TOLERANCE) =>
  (Math.abs(cents) <= tolerance ? 'good' : cents < 0 ? 'flat' : 'sharp');

/*
 * Each note is measured three ways: where it settled first, after the attack
 * (`start`, where the finger landed), across its middle (`mid`, the median,
 * the note as a whole), and where it settled last, before the release
 * (`end`, after any correction). The difficulty says how many cents count as
 * in tune and which of those may show it: the easier, the wider, and the more
 * of the three that may; the harder, the narrower, down to the start alone,
 * where the note has to land in tune.
 */
export const MEASURES = ['start', 'mid', 'end'];
export const LEVELS = {
  beginner: { tolerance: 35, use: ['start', 'mid', 'end'] },
  easy: { tolerance: 25, use: ['start', 'mid', 'end'] },
  medium: { tolerance: 20, use: ['mid', 'end'] }, // a note corrected before it ends counts
  hard: { tolerance: 15, use: ['mid'] }, // the note as a whole (as the test always judged)
  advanced: { tolerance: 10, use: ['start'] }, // it has to land in tune
};
export const LEVEL_IDS = [...Object.keys(LEVELS), 'custom'];
/** The rule for a difficulty: a level's own, or Custom's threshold and one measure. */
export function scaleRule(level, { tolerance = SCALE_TOLERANCE, attack = 'mid' } = {}) {
  if (LEVELS[level]) return LEVELS[level];
  return { tolerance, use: [MEASURES.includes(attack) ? attack : 'mid'] };
}

/**
 * Judge a note by `rule`: in tune when any measure the rule uses is within
 * its tolerance. Returns the verdict, the cents it is judged by (the closest
 * of the measures used: the one that put it in tune, or its nearest miss),
 * `by` (which measure put it in tune), and `parts`, every measure that was in
 * tune, used or not, so the results can say which part of a note was right.
 */
export function judgeNote(note, rule) {
  const m = { start: note.startCents ?? note.cents, mid: note.cents, end: note.endCents ?? note.cents };
  const ok = (k) => Math.abs(m[k]) <= rule.tolerance;
  const closest = (keys) => keys.reduce((a, b) => (Math.abs(m[b]) < Math.abs(m[a]) ? b : a));
  const used = rule.use.filter(ok);
  const by = used.length ? closest(used) : null;
  const cents = m[by ?? closest(rule.use)];
  return { verdict: by ? 'good' : cents < 0 ? 'flat' : 'sharp', cents, by, parts: MEASURES.filter(ok) };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const STEADY = 0.15; // semitones: a stretch whose pitch keeps within this has settled
const STEADY_SEC = 0.1; // how long a stretch has to hold to count
/**
 * Where a note's pitch first settled after its attack (or, `last`, last
 * settled before its release), as a fractional MIDI number: the median of
 * the first (or last) STEADY_SEC that kept within STEADY, with the attack's
 * and the release's first and last tenth left out; if it never held still
 * that long, the median of the first (or last) third.
 */
function steady(exacts, sampleRate, last = false) {
  const n = exacts.length;
  const cut = Math.max(1, Math.round(n * 0.1));
  let body = exacts.slice(cut, n - cut);
  if (body.length < 3) body = exacts;
  if (last) body = [...body].reverse();
  const w = Math.max(3, Math.round((STEADY_SEC * sampleRate) / HOP));
  for (let i = 0; i + w <= body.length; i++) {
    const win = body.slice(i, i + w);
    if (Math.max(...win) - Math.min(...win) <= STEADY) return median(win);
  }
  return median(body.slice(0, Math.max(1, Math.ceil(body.length / 3))));
}

/**
 * The notes in a run of analysed frames ({ at, rms, clarity, hz }, `at` in
 * samples): runs of clear, loud enough frames on one semitone, a stray frame
 * or two (an octave slip, a breath) let through, at least MIN_NOTE_SEC long.
 * Each note's pitch is the median of its settled middle (the attack and the
 * release left out), as `midi` (the nearest semitone) and `cents` off it;
 * `startCents` and `endCents` are where it first and last settled (steady).
 * @returns {{ midi: number, cents: number, startCents: number, endCents: number, start: number, end: number }[]} times in seconds
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
      cur.frames.push({ at: f.at, exact, clarity: f.clarity });
      cur.end = f.at + HOP;
      stray = 0;
    } else if (cur && stray < 2) {
      stray++; // one or two odd frames inside a note don't end it
    } else {
      if (cur) runs.push(cur);
      cur = ok ? { midi: m, frames: [{ at: f.at, exact, clarity: f.clarity }], start: f.at, end: f.at + HOP } : null;
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
    const all = r.frames.map((x) => x.exact);
    const endCents = (steady(all, sampleRate, true) - r.midi) * 100;
    const prev = notes.at(-1);
    // The same note again with hardly a gap is one note that wavered (it ends where this part does).
    if (prev && prev.midi === r.midi && r.start / sampleRate - prev.end < 0.08) {
      prev.end = r.end / sampleRate;
      prev.endCents = endCents;
      continue;
    }
    notes.push({
      midi: r.midi, cents: (exact - r.midi) * 100, start: r.start / sampleRate, end: r.end / sampleRate,
      startCents: (steady(all, sampleRate) - r.midi) * 100, endCents,
      clarity: median(settled.map((x) => x.clarity)), // how clear and steady its tone was (0 to 1)
    });
  }
  return notes;
}

/**
 * The samples from `from` to `to` (absolute sample positions) out of `chunks`
 * ({ at, data }, in order), faded in and out over `fade` samples so a note
 * cut from the middle of a phrase plays without clicks.
 */
export function sliceAudio(chunks, from, to, fade = 0) {
  from = Math.max(0, Math.floor(from));
  to = Math.max(from, Math.floor(to));
  const out = new Float32Array(to - from);
  for (const c of chunks) {
    const a = Math.max(from, c.at);
    const b = Math.min(to, c.at + c.data.length);
    if (b > a) out.set(c.data.subarray(a - c.at, b - c.at), a - from);
  }
  const f = Math.min(fade, out.length >> 1);
  for (let i = 0; i < f; i++) {
    const g = i / f;
    out[i] *= g;
    out[out.length - 1 - i] *= g;
  }
  return out;
}

/** The sample rate to play a note at so it sounds `cents` lower (or higher, negative): in tune when `cents` is how far off it was. */
export const correctedRate = (sampleRate, cents) => Math.round(sampleRate * 2 ** (-cents / 1200));

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
    // The sound itself, kept so each note can be played back as it was played
    // (and pitch-corrected): blocks with their place in the stream, the last
    // second or so of them while waiting, all of them while listening.
    this.heard = 0;
    this.audio = [];
  }

  /** A note's own sound (the samples it spans), faded in and out. */
  clip(note) {
    return sliceAudio(this.audio, note.start * this.sampleRate, note.end * this.sampleRate, Math.round(this.sampleRate * 0.015));
  }

  push(block) {
    if (this.state !== 'done') {
      this.audio.push({ at: this.heard, data: Float32Array.from(block) });
      if (this.state === 'waiting') {
        const keep = this.heard - this.sampleRate * 1.5;
        while (this.audio.length > 1 && this.audio[0].at + this.audio[0].data.length < keep) this.audio.shift();
      }
    }
    this.heard += block.length;
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

  /** End the test now (the Stop button): the notes heard so far are the result. */
  finish() {
    if (this.state !== 'listening') return null;
    this.state = 'done';
    this.result = this.notes();
    return this.result;
  }

  /** The notes so far (up to `end`, in samples, when it is known). */
  notes(end = Infinity) {
    const frames = this.frames.filter((f) => f.at < end);
    return segmentNotes(frames, { sampleRate: this.sampleRate, a4: this.a4, gate: this.detector.gate() * 0.6 });
  }
}
