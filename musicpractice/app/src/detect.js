// Telling music from noise, deciding when playing starts and stops, and
// trimming the take. Pure functions and a small state machine with no browser
// dependencies, so the tests can drive them with synthesized audio.

/** Samples per analysis frame (about 43 ms at 48 kHz). */
export const FRAME = 2048;

const MIN_HZ = 60;
const MAX_HZ = 1800;

/** How strict each sensitivity is: pitch clarity a frame needs to count as a
 *  note, and the quietest level (RMS, full scale = 1) that can start a take. */
export const SENSITIVITY = {
  low: { clarity: 0.82, minLevel: 0.012 },
  medium: { clarity: 0.72, minLevel: 0.006 },
  high: { clarity: 0.6, minLevel: 0.003 },
};

/**
 * Loudness and pitch of one frame.
 * Pitch clarity is the peak of the normalized square difference function
 * (McLeod's NSDF): close to 1 for a steady musical tone, low for noise,
 * scrapes and thumps, which have no repeating period.
 * @param {Float32Array} x samples (any length ≥ 512)
 * @param {number} sampleRate
 * @returns {{ rms: number, clarity: number, hz: number }}
 */
export function analyzeFrame(x, sampleRate) {
  // Halve the rate first (a two-tap average) to keep the work small on phones.
  const n = x.length >> 1;
  const y = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = (x[2 * i] + x[2 * i + 1]) * 0.5;
    y[i] = v;
    sum += x[2 * i] * x[2 * i] + x[2 * i + 1] * x[2 * i + 1];
  }
  const rms = Math.sqrt(sum / (n * 2));
  if (rms < 1e-5) return { rms, clarity: 0, hz: 0 };
  const sr = sampleRate / 2;
  const minLag = Math.max(2, Math.floor(sr / MAX_HZ));
  const maxLag = Math.min(n >> 1, Math.ceil(sr / MIN_HZ));
  const nsdf = new Float32Array(maxLag + 2);
  for (let tau = minLag - 1; tau <= maxLag + 1; tau++) {
    let acf = 0;
    let m = 0;
    for (let i = 0, end = n - tau; i < end; i++) {
      const a = y[i];
      const b = y[i + tau];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }
  // McLeod peak picking: skip the lobe around lag 0, take the first peak that
  // reaches 90% of the highest one (avoids octave errors).
  let tau = minLag;
  while (tau <= maxLag && nsdf[tau] > 0) tau++;
  const peaks = [];
  let best = 0;
  while (tau <= maxLag) {
    while (tau <= maxLag && nsdf[tau] <= 0) tau++;
    let pi = -1;
    let pv = -Infinity;
    while (tau <= maxLag && nsdf[tau] > 0) {
      if (nsdf[tau] > pv) { pv = nsdf[tau]; pi = tau; }
      tau++;
    }
    if (pi > 0) { peaks.push([pi, pv]); if (pv > best) best = pv; }
  }
  if (!peaks.length) return { rms, clarity: 0, hz: 0 };
  const [lag, clarity] = peaks.find(([, v]) => v >= best * 0.9);
  // Parabolic interpolation for a finer period.
  const a = nsdf[lag - 1], b = nsdf[lag], c = nsdf[lag + 1];
  const den = a - 2 * b + c;
  const shift = den !== 0 ? (0.5 * (a - c)) / den : 0;
  return { rms, clarity, hz: sr / (lag + shift) };
}

/** Is the change between two pitches small enough to call it one held note? */
export function samePitch(a, b, tolerance = 0.04) {
  return a > 0 && b > 0 && Math.abs(a - b) / Math.min(a, b) <= tolerance;
}

/**
 * The listening state machine. Feed it one analysed frame at a time.
 *
 * - While waiting, it tracks the room's noise floor and starts a take when it
 *   hears a run of loud enough, clearly pitched, steady frames (a held note,
 *   about 130 ms). Scrapes, thumps and hiss have no steady pitch, so moving
 *   a chair doesn't start one. With `mode: 'any'` (drums), any sound well
 *   above the floor for 100 ms starts it.
 * - While recording, every musical (or, in 'any' mode, loud) frame resets the
 *   silence clock; `silenceSec` of nothing ends the take.
 *
 * Frame positions are passed in samples so the caller can trim afterwards.
 */
export class PlayDetector {
  /** @param {{ sampleRate: number, silenceSec?: number, sensitivity?: keyof SENSITIVITY, mode?: 'music'|'any', maxSec?: number }} o */
  constructor(o) {
    this.sampleRate = o.sampleRate;
    this.configure(o);
    this.reset();
  }

  configure({ silenceSec = 3, sensitivity = 'medium', mode = 'music', maxSec = 600 } = {}) {
    this.silenceSec = silenceSec;
    this.sens = SENSITIVITY[sensitivity] || SENSITIVITY.medium;
    this.mode = mode;
    this.maxSec = maxSec;
  }

  /** Forget the current take and listen afresh (the noise floor is kept). */
  reset() {
    this.state = 'waiting';
    this.run = 0;
    this.prevHz = 0;
    this.startAt = -1;
    this.lastActiveEnd = -1;
    this.history = [];
    if (this.floor === undefined) this.floor = 0;
  }

  /** The level a frame must pass to count as sound rather than room noise. */
  gate() {
    return Math.max(this.floor * 3, this.sens.minLevel);
  }

  /** Is this frame playing (a clear, loud enough tone)? */
  isMusical(f, strictness = 1) {
    return f.rms > this.gate() * (strictness < 1 ? 0.6 : 1) && f.clarity >= this.sens.clarity * strictness;
  }

  /**
   * @param {{ rms: number, clarity: number, hz: number }} f
   * @param {number} at sample position of the frame's start
   * @param {number} len frame length in samples
   * @returns {null | { type: 'start', at: number } | { type: 'end', start: number, end: number, reason: 'silence'|'max' }}
   */
  feed(f, at, len) {
    if (this.state === 'waiting') {
      // Noise floor: falls quickly, rises slowly (so a long note doesn't become "the room").
      if (this.floor === 0) this.floor = f.rms;
      else if (f.rms < this.floor) this.floor += (f.rms - this.floor) * 0.3;
      else this.floor += (f.rms - this.floor) * 0.004;

      let hit;
      if (this.mode === 'any') {
        hit = f.rms > this.gate() * 1.5;
        this.run = hit ? this.run + 1 : 0;
      } else {
        // A run counts frames holding one steady pitch; a new pitch starts it over.
        hit = this.isMusical(f);
        this.run = !hit ? 0 : samePitch(f.hz, this.prevHz) ? this.run + 1 : 1;
        this.prevHz = hit ? f.hz : 0;
      }
      this.history.push({ at, len, hit });
      if (this.history.length > 8) this.history.shift();
      const need = this.mode === 'any' ? 2 : 3;
      if (this.run >= need) {
        this.state = 'recording';
        // The take starts at the first frame of this run of hits.
        let first = this.history.length - 1;
        while (first > 0 && this.history[first - 1].hit) first--;
        this.startAt = this.history[first].at;
        this.lastActiveEnd = at + len;
        return { type: 'start', at: this.startAt };
      }
      return null;
    }
    if (this.state === 'recording') {
      // Keep counting softer, decaying notes as playing once a take has begun.
      const active = this.mode === 'any' ? f.rms > this.gate() : this.isMusical(f, 0.85);
      if (active) this.lastActiveEnd = at + len;
      const end = at + len;
      if ((end - this.lastActiveEnd) / this.sampleRate >= this.silenceSec) {
        this.state = 'done';
        return { type: 'end', start: this.startAt, end: this.lastActiveEnd, reason: 'silence' };
      }
      if ((end - this.startAt) / this.sampleRate >= this.maxSec) {
        this.state = 'done';
        return { type: 'end', start: this.startAt, end: this.lastActiveEnd, reason: 'max' };
      }
    }
    return null;
  }
}

/**
 * Where to cut a take. Starts a little before the first detected note,
 * reaching back over the attack (which is louder than the room but not yet
 * clearly pitched); ends after the last note has rung down to the floor.
 * @returns {{ start: number, end: number }} sample indices into `samples`
 */
export function trimBounds(samples, sampleRate, firstNote, lastNoteEnd, floor) {
  const hop = Math.round(sampleRate * 0.01);
  const gate = Math.max(floor * 2, 0.002);
  const level = (i) => {
    let s = 0;
    const end = Math.min(samples.length, i + hop);
    for (let j = Math.max(0, i); j < end; j++) s += samples[j] * samples[j];
    return Math.sqrt(s / Math.max(1, end - Math.max(0, i)));
  };
  let start = Math.max(0, firstNote);
  const backLimit = Math.max(0, start - Math.round(sampleRate * 0.5));
  while (start - hop >= backLimit && level(start - hop) > gate) start -= hop;
  start = Math.max(0, start - Math.round(sampleRate * 0.04));

  let end = Math.min(samples.length, lastNoteEnd);
  const fwdLimit = Math.min(samples.length, end + Math.round(sampleRate * 1.5));
  while (end + hop <= fwdLimit && level(end) > gate) end += hop;
  end = Math.min(samples.length, end + Math.round(sampleRate * 0.15));
  return { start, end: Math.max(end, start) };
}

/** Copy out [start, end) with short fades so the cut doesn't click. */
export function cut(samples, start, end, sampleRate) {
  const out = samples.slice(start, end);
  const fade = Math.min(out.length >> 1, Math.round(sampleRate * 0.01));
  const fadeOut = Math.min(out.length >> 1, Math.round(sampleRate * 0.06));
  for (let i = 0; i < fade; i++) out[i] *= i / fade;
  for (let i = 0; i < fadeOut; i++) out[out.length - 1 - i] *= i / fadeOut;
  return out;
}

/** Min/max pairs for drawing a waveform `columns` wide. */
export function peaks(samples, columns) {
  const out = new Float32Array(columns * 2);
  const per = samples.length / columns;
  for (let c = 0; c < columns; c++) {
    let lo = 0, hi = 0;
    const end = Math.min(samples.length, Math.floor((c + 1) * per));
    for (let i = Math.floor(c * per); i < end; i++) {
      const v = samples[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    out[2 * c] = lo;
    out[2 * c + 1] = hi;
  }
  return out;
}
