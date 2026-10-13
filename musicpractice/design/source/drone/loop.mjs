// Make a seamless loop from a steady stretch of a recording, and measure the seam.
import { execFileSync } from 'node:child_process';
import { decode, track } from './analyze.mjs';
export const SR = 44100;

const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

/** Even out slow swells (bow changes): divide by a smoothed level, partly. */
function flatten(x, amount = 0.6, win = 0.4) {
  const n = x.length, w = Math.round(win * SR), out = new Float32Array(n);
  const env = new Float32Array(n);
  let acc = 0;
  const sq = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { acc += x[i] * x[i]; sq[i + 1] = acc; }
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - w), b = Math.min(n, i + w);
    env[i] = Math.sqrt((sq[b] - sq[a]) / (b - a)) + 1e-6;
  }
  const target = median(Array.from(env.filter((_, i) => i % 441 === 0)));
  for (let i = 0; i < n; i++) out[i] = x[i] * Math.min(2.5, Math.max(0.4, (target / env[i]) ** amount));
  return out;
}

/**
 * x: the recording. a, b: the stretch to use (seconds). Returns the loop
 * (length L, a whole number of pitch periods) with its end crossfaded into
 * its start, so playing it round and round has no seam.
 */
export function makeLoop(x, a, b, { hz, xfade = 1.5, flattenAmount = 0.6, search = true, minLoop = 5 } = {}) {
  const y = flatten(x.subarray(Math.round(a * SR), Math.round(b * SR)), flattenAmount);
  const X = Math.round(xfade * SR);
  let L = y.length - X;
  if (hz) { const p = SR / hz; L = Math.round(Math.floor(L / p) * p); }
  if (hz && search) L = bestLength(y, X, SR / hz, Math.max(Math.round(minLoop * SR), Math.round(L * 0.7)), L);
  const out = new Float32Array(L);
  for (let i = 0; i < L; i++) out[i] = y[i];
  // The end flows into the start: the first X samples blend the material
  // that followed the loop's end into the loop's own beginning.
  for (let i = 0; i < X; i++) {
    const u = i / X;
    const wIn = Math.sin((Math.PI / 2) * u), wOut = Math.cos((Math.PI / 2) * u);
    out[i] = y[i] * wIn + y[L + i] * wOut;
  }
  return out;
}

/**
 * The loop length (a whole number of periods, between lo and hi samples)
 * where what follows the loop's end best matches its start: level and
 * brightness over the crossfade, frame by frame.
 */
function bestLength(y, X, period, lo, hi) {
  const F = Math.round(0.02 * SR);
  const feat = (i) => {
    let e = 0, d = 0, prev = y[i];
    for (let j = i; j < i + F; j++) { e += y[j] * y[j]; const v = y[j] - prev; d += v * v; prev = y[j]; }
    return [10 * Math.log10(e / F + 1e-12), 10 * Math.log10(d / (e + 1e-12) + 1e-12)];
  };
  const frames = Math.floor(X / F);
  const start = Array.from({ length: frames }, (_, k) => feat(k * F));
  let best = hi, bestScore = Infinity;
  for (let n = Math.floor(hi / period); n * period >= lo; n--) {
    const L = Math.round(n * period);
    if (L + X + F > y.length) continue;
    let score = 0;
    for (let k = 0; k < frames; k++) {
      const f = feat(L + k * F);
      // Weighted toward the moment of the join.
      const w = 1 + 3 * (1 - k / frames);
      score += w * (Math.abs(f[0] - start[k][0]) + 2 * Math.abs(f[1] - start[k][1]));
    }
    if (score < bestScore) { bestScore = score; best = L; }
  }
  return best;
}

/** Normalize to an RMS level (dBFS), limiting peaks. */
export function level(x, db = -20) {
  let s = 0; for (const v of x) s += v * v;
  const g = 10 ** (db / 20) / Math.sqrt(s / x.length);
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v * g));
  const k = peak > 0.95 ? 0.95 / peak : 1;
  return x.map((v) => v * g * k);
}

/**
 * How seamless: play the loop 3 times; compare the change across each seam
 * with the change elsewhere (sample jump, and 20 ms level and spectral flux).
 */
export function seamReport(loop) {
  const L = loop.length, y = new Float32Array(L * 3);
  for (let r = 0; r < 3; r++) y.set(loop, r * L);
  const diffs = []; for (let i = 1; i < y.length; i++) diffs.push(Math.abs(y[i] - y[i - 1]));
  const typical = median(diffs.filter((_, i) => i % 7 === 0));
  const jump = Math.max(Math.abs(y[L] - y[L - 1]), Math.abs(y[2 * L] - y[2 * L - 1])) / (typical + 1e-9);
  // 20 ms frames: level change and spectral flux (via 4 band energies).
  const F = Math.round(0.02 * SR), frames = [];
  for (let i = 0; i + F <= y.length; i += F) {
    let e = 0, hi = 0, prev = 0;
    for (let j = i; j < i + F; j++) { e += y[j] * y[j]; const d = y[j] - prev; hi += d * d; prev = y[j]; }
    frames.push({ e: 10 * Math.log10(e / F + 1e-12), b: 10 * Math.log10(hi / F + 1e-12) });
  }
  const flux = frames.slice(1).map((f, k) => Math.abs(f.e - frames[k].e) + Math.abs(f.b - frames[k].b));
  const seamFrames = [L / F, (2 * L) / F].map(Math.floor);
  const atSeam = Math.max(...seamFrames.flatMap((s) => [flux[s - 1], flux[s], flux[s + 1]].filter((v) => v != null)));
  const sorted = [...flux].sort((p, q) => p - q);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { seconds: +(L / SR).toFixed(2), jump: +jump.toFixed(2), seamFlux: +atSeam.toFixed(2), p95Flux: +p95.toFixed(2), ok: jump < 4 && atSeam <= p95 * 1.2 };
}

/** Write a loop for the app: a margin of continuous audio each side, so a decoder offset still lands inside seamless material. */
export function writeLoopMp3(loop, file, { margin = 0.3, kbps = 160 } = {}) {
  const m = Math.round(margin * SR), L = loop.length;
  const y = new Float32Array(L + 2 * m);
  for (let i = 0; i < y.length; i++) y[i] = loop[(((i - m) % L) + L) % L];
  encode(y, file, kbps);
  return { margin, samples: L };
}

/** Write the loop played `times` round, for listening. */
export function writeRepeated(loop, file, times = 3) {
  const y = new Float32Array(loop.length * times);
  for (let r = 0; r < times; r++) y.set(loop, r * loop.length);
  encode(y, file, 192);
}

function encode(y, file, kbps) {
  const pcm = Buffer.from(y.buffer, y.byteOffset, y.byteLength);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', `${kbps}k`, file], { input: pcm });
}

if (process.argv[1].endsWith('loop.mjs')) {
  const [file, a, b, out] = process.argv.slice(2);
  const x = decode(file);
  const tr = track(x).filter((r) => r.hz && r.t >= +a && r.t <= +b);
  const hz = median(tr.map((r) => r.hz));
  const loop = level(makeLoop(x, +a, +b, { hz }));
  console.log(file.split('/').pop(), `${a}-${b}s`, `${hz.toFixed(2)} Hz`, seamReport(loop));
  if (out) writeRepeated(loop, out);
}
