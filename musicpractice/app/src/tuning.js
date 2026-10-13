// The tuner's maths: an accurate pitch from a block of samples, and what
// that pitch is as a note (name, octave, cents) for a chosen reference A,
// note spelling and transposing instrument. No browser dependencies.

export const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/** Transposing instruments: written pitch = concert pitch + semitones. */
export const TRANSPOSE = [
  { id: 'C', label: 'C (concert)', semis: 0 },
  { id: 'Bb', label: 'B♭ (clarinet, trumpet, tenor sax)', semis: 2 },
  { id: 'Eb', label: 'E♭ (alto & baritone sax)', semis: 9 },
  { id: 'F', label: 'F (horn)', semis: 7 },
];

/** Strings as MIDI notes, lowest first. */
export const TUNINGS = [
  { id: 'chromatic', label: 'Chromatic (any note)' },
  { id: 'guitar', label: 'Guitar: E A D G B E', strings: [40, 45, 50, 55, 59, 64] },
  { id: 'guitar-dropd', label: 'Guitar, drop D: D A D G B E', strings: [38, 45, 50, 55, 59, 64] },
  { id: 'guitar-dadgad', label: 'Guitar, DADGAD', strings: [38, 45, 50, 55, 57, 62] },
  { id: 'bass4', label: 'Bass: E A D G', strings: [28, 33, 38, 43] },
  { id: 'bass5', label: 'Bass, 5-string: B E A D G', strings: [23, 28, 33, 38, 43] },
  { id: 'ukulele', label: 'Ukulele: G C E A', strings: [67, 60, 64, 69] },
  { id: 'violin', label: 'Violin: G D A E', strings: [55, 62, 69, 76] },
  { id: 'viola', label: 'Viola: C G D A', strings: [48, 55, 62, 69] },
  { id: 'cello', label: 'Cello: C G D A', strings: [36, 43, 50, 57] },
  { id: 'mandolin', label: 'Mandolin: G D A E', strings: [55, 62, 69, 76] },
  { id: 'banjo', label: 'Banjo: G D G B D', strings: [67, 50, 55, 59, 62] },
];

export const A4_MIN = 415;
export const A4_MAX = 466;

export const midiToHz = (midi, a4 = 440) => a4 * 2 ** ((midi - 69) / 12);
export const hzToMidi = (hz, a4 = 440) => 69 + 12 * Math.log2(hz / a4);

/** A MIDI note's written name and octave (concert note + transposition). */
export function noteName(midi, { flats = false, transpose = 'C' } = {}) {
  const semis = TRANSPOSE.find((t) => t.id === transpose)?.semis ?? 0;
  const written = Math.round(midi) + semis;
  const names = flats ? FLATS : SHARPS;
  return { name: names[((written % 12) + 12) % 12], octave: Math.floor(written / 12) - 1 };
}

/** The note nearest a frequency and how far off it is, in cents. */
export function describe(hz, { a4 = 440, flats = false, transpose = 'C' } = {}) {
  const exact = hzToMidi(hz, a4);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100, ...noteName(midi, { flats, transpose }), hz };
}

/** In a tuning, the string a frequency is nearest to and how far off, in cents. */
export function nearestString(hz, strings, a4 = 440) {
  const exact = hzToMidi(hz, a4);
  let best = 0;
  for (let i = 1; i < strings.length; i++) {
    if (Math.abs(strings[i] - exact) < Math.abs(strings[best] - exact)) best = i;
  }
  return { index: best, midi: strings[best], cents: (exact - strings[best]) * 100 };
}

function nsdfAt(x, n, tau) {
  let acf = 0;
  let m = 0;
  for (let i = 0, end = n - tau; i < end; i++) {
    const a = x[i];
    const b = x[i + tau];
    acf += a * b;
    m += a * a + b * b;
  }
  return m > 0 ? (2 * acf) / m : 0;
}

/**
 * The fundamental frequency of a block (4096 samples suits 30-1500 Hz at
 * 44.1-48 kHz), or null when there is no clear pitch.
 *
 * McLeod's normalized square difference function, first on the block at
 * half rate to find the period (the first peak within 90% of the highest,
 * which avoids octave errors), then refined at full rate around twice that
 * lag with parabolic interpolation, which is good to well under a cent.
 */
export function detectPitch(x, sampleRate, { minHz = 30, maxHz = 1500, minRms = 0.002, minClarity = 0.8 } = {}) {
  const n = x.length >> 1;
  const y = new Float32Array(n);
  let energy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[2 * i];
    const b = x[2 * i + 1];
    y[i] = (a + b) * 0.5;
    energy += a * a + b * b;
  }
  const rms = Math.sqrt(energy / (n * 2));
  if (rms < minRms) return null;
  const sr = sampleRate / 2;
  const minLag = Math.max(2, Math.floor(sr / maxHz));
  const maxLag = Math.min(Math.floor(n * 0.66), Math.ceil(sr / minHz));
  const d = new Float32Array(maxLag + 2);
  for (let tau = 1; tau <= maxLag + 1; tau++) d[tau] = nsdfAt(y, n, tau);

  // Skip the positive lobe around lag 0, then take each positive lobe's top.
  let tau = 1;
  while (tau <= maxLag && d[tau] > 0) tau++;
  const peaks = [];
  let best = 0;
  while (tau <= maxLag) {
    while (tau <= maxLag && d[tau] <= 0) tau++;
    let pi = -1;
    let pv = -Infinity;
    while (tau <= maxLag && d[tau] > 0) {
      if (d[tau] > pv) { pv = d[tau]; pi = tau; }
      tau++;
    }
    if (pi >= minLag) { peaks.push([pi, pv]); if (pv > best) best = pv; }
  }
  if (!peaks.length || best < minClarity) return null;
  const [coarse, clarity] = peaks.find(([, v]) => v >= best * 0.9);

  // Refine at full rate around twice the half-rate lag.
  const N = x.length;
  const centre = coarse * 2;
  let bt = centre;
  let bv = -Infinity;
  const vals = new Map();
  for (let t = centre - 3; t <= centre + 3; t++) {
    if (t < 2 || t > N - 2) continue;
    const v = nsdfAt(x, N, t);
    vals.set(t, v);
    if (v > bv) { bv = v; bt = t; }
  }
  const a = vals.get(bt - 1) ?? nsdfAt(x, N, bt - 1);
  const c = vals.get(bt + 1) ?? nsdfAt(x, N, bt + 1);
  const den = a - 2 * bv + c;
  const shift = den !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0;
  const hz = sampleRate / (bt + shift);
  if (hz < minHz * 0.95 || hz > maxHz * 1.05) return null;
  return { hz, clarity, rms };
}

/**
 * Smooths a run of pitch readings for display: the median of the last few
 * readings that belong to the same note, so the needle is steady but quick.
 */
export class PitchSmoother {
  constructor(size = 5) {
    this.size = size;
    this.values = [];
  }

  push(hz) {
    const last = this.values[this.values.length - 1];
    // A new note (more than 60 cents away) starts the window again.
    if (last && Math.abs(1200 * Math.log2(hz / last)) > 60) this.values = [];
    this.values.push(hz);
    if (this.values.length > this.size) this.values.shift();
    const sorted = [...this.values].sort((p, q) => p - q);
    return sorted[sorted.length >> 1];
  }

  reset() {
    this.values = [];
  }
}
