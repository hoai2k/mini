// A perfectly steady loop from a bowed take: one bow stroke only, its pitch
// held exactly constant and its level evened out, looped a whole number of
// cycles long.
import { SR } from './loop.mjs';
import { holdSpectrum } from './spectral.mjs';

const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

/** Level (dB) every `hop` seconds over a `win` window. */
function levels(x, hop = 0.02, win = 0.05) {
  const H = Math.round(hop * SR), W = Math.round(win * SR), out = [];
  for (let i = 0; i + W <= x.length; i += H) { let e = 0; for (let j = i; j < i + W; j++) e += x[j] * x[j]; out.push(10 * Math.log10(e / W + 1e-12)); }
  return { db: out, hop };
}

/**
 * The longest stretch in [a, b] (seconds) with no bow change: a bow change
 * shows as a dip in level (> 2.5 dB below the level around it) or a sudden jump.
 */
export function longestStroke(x, a, b) {
  const { db, hop } = levels(x);
  const i0 = Math.ceil(a / hop), i1 = Math.floor(b / hop);
  const bad = [];
  for (let i = i0; i <= i1; i++) {
    const around = median(db.slice(Math.max(0, i - 25), i + 26));
    const jump = Math.abs(db[i] - db[i - 1]);
    if (db[i] < around - 2.5 || jump > 1.6) bad.push(i);
  }
  let best = [i0, i0], prev = i0;
  for (const k of [...bad, i1]) {
    if (k - prev > best[1] - best[0]) best = [prev, k];
    prev = k;
  }
  // Keep clear of the change itself.
  return [best[0] * hop + 0.15, best[1] * hop - 0.15];
}

/** Precise pitch every `hop` samples near f0 (NSDF over lags within ±5 %). */
export function pitchTrack(x, s, e, f0, hop = 256) {
  const P0 = SR / f0, W = Math.round(3 * P0);
  const lo = Math.floor(P0 * 0.95), hi = Math.ceil(P0 * 1.05);
  const out = [];
  for (let c = s; c + W + hi < e; c += hop) {
    let bestV = -1, bestL = lo; const vals = {};
    for (let L = lo - 1; L <= hi + 1; L++) {
      let ac = 0, m = 0;
      for (let i = c; i < c + W; i++) { ac += x[i] * x[i + L]; m += x[i] * x[i] + x[i + L] * x[i + L]; }
      vals[L] = (2 * ac) / (m + 1e-12);
      if (L >= lo && L <= hi && vals[L] > bestV) { bestV = vals[L]; bestL = L; }
    }
    const a = vals[bestL - 1], b = vals[bestL], d = vals[bestL + 1];
    const shift = (a - d) / (2 * (a - 2 * b + d) || 1);
    out.push({ pos: c + W / 2 + hi / 2, period: bestL + Math.max(-0.5, Math.min(0.5, shift)) });
  }
  // Smooth lightly (median of 5) to drop single misreadings.
  return out.map((p, i) => ({ pos: p.pos, period: median(out.slice(Math.max(0, i - 2), i + 3).map((q) => q.period)) }));
}

/** Read x so its pitch becomes exactly SR / P everywhere (P an integer number of samples). */
export function holdPitch(x, track, P) {
  const out = [];
  let t = track[0].pos, k = 0;
  while (t < track[track.length - 1].pos) {
    while (k + 1 < track.length && track[k + 1].pos <= t) k++;
    const q = track[k], r = track[k + 1] || q;
    const u = r.pos > q.pos ? (t - q.pos) / (r.pos - q.pos) : 0;
    const period = q.period + (r.period - q.period) * u;
    const i = Math.floor(t), f = t - i;
    // Cubic (Catmull-Rom) interpolation.
    const y0 = x[i - 1], y1 = x[i], y2 = x[i + 1], y3 = x[i + 2];
    out.push(y1 + 0.5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0))));
    t += period / P; // a longer period than wanted: step faster, so it plays higher
  }
  return Float32Array.from(out);
}

/** Even out the level, period by period (window of two periods, smoothed). */
export function holdLevel(y, P, amount = 0.92) {
  const n = y.length, W = 2 * P, env = new Float32Array(n);
  const sq = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) sq[i + 1] = sq[i] + y[i] * y[i];
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - W), b = Math.min(n, i + W); env[i] = Math.sqrt((sq[b] - sq[a]) / (b - a)) + 1e-9; }
  // Smooth the envelope over ~30 ms so the gain doesn't follow the waveform.
  const S = Math.round(0.03 * SR), sm = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += env[i]; if (i >= S) acc -= env[i - S]; sm[i] = acc / Math.min(i + 1, S); }
  const target = median(Array.from(sm.filter((_, i) => i % 200 === 0)));
  return y.map((v, i) => v * Math.min(3, Math.max(0.33, (target / sm[i]) ** amount)));
}

/**
 * The loop: L a whole number of periods; the last X samples blended into
 * the start (the waveforms line up, so a plain linear crossfade).
 */
export function cycleLoop(y, P, xfadeSec = 0.8, periods = 1) {
  const X = Math.min(Math.round(xfadeSec * SR), Math.floor(y.length / 3));
  // `periods`: the whole sound repeats only every few periods (a tonic and its fifth: two).
  const L = Math.floor((y.length - X) / (P * periods)) * P * periods;
  const out = y.slice(0, L);
  for (let i = 0; i < X; i++) { const u = i / X; out[i] = y[i] * u + y[L + i] * (1 - u); }
  return out;
}

export function steadyLoop(x, a, b, f0, opts = {}) {
  // An ensemble changes bow at staggered times (no single stroke): use the whole stretch.
  const [s, e] = opts.wholeStretch ? [a + 0.2, b - 0.2] : longestStroke(x, a, b);
  const track = pitchTrack(x, Math.round(s * SR), Math.round(e * SR), f0);
  const Pm = median(track.map((t) => t.period));
  const P = Math.round(Pm); // an integer period: every cycle lines up exactly
  let y = holdLevel(holdPitch(x, track, P), P, opts.levelAmount ?? 0.92);
  // Steady brightness too (after the pitch is held, each harmonic stays in its bin).
  if (opts.spectral) y = holdLevel(holdSpectrum(y, { amount: opts.spectral }), P, 0.92);
  return { loop: cycleLoop(y, P, opts.xfade ?? 0.8, opts.periods ?? 1), stroke: [s, e], hz: SR / P, wobble: track.map((t) => 1200 * Math.log2(Pm / t.period)) };
}
