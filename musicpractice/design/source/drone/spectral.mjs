// Steady brightness: hold each frequency's slow-moving strength at its usual
// level (STFT, 4096-point frames, 8x overlap, original phases kept), so the
// tone doesn't swell brighter and darker. Fast texture is left alone.
import { SR } from './loop.mjs';

function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar; im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar; im[i + k] += ai;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

export function holdSpectrum(x, { amount = 0.85, smoothSec = 0.15, N = 4096 } = {}) {
  const hop = N / 8, win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const frames = Math.floor((x.length - N) / hop) + 1, bins = N / 2 + 1;
  const spec = [];
  for (let f = 0; f < frames; f++) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = x[f * hop + i] * win[i];
    fft(re, im);
    spec.push({ re, im });
  }
  // Each bin's strength, smoothed over time, and its median.
  const S = Math.max(1, Math.round((smoothSec * SR) / hop));
  const gains = Array.from({ length: frames }, () => new Float64Array(bins));
  for (let k = 0; k < bins; k++) {
    const mag = spec.map((s) => Math.hypot(s.re[k], s.im[k]));
    const sm = mag.map((_, f) => { let a = 0, c = 0; for (let j = f - S; j <= f + S; j++) if (j >= 0 && j < frames) { a += mag[j] * mag[j]; c++; } return Math.sqrt(a / c); });
    const med = [...sm].sort((p, q) => p - q)[sm.length >> 1];
    for (let f = 0; f < frames; f++) gains[f][k] = Math.min(4, Math.max(0.25, ((med + 1e-9) / (sm[f] + 1e-9)) ** amount));
  }
  // Resynthesize with the gains, overlap-adding with the same window.
  const out = new Float64Array(x.length), norm = new Float64Array(x.length);
  for (let f = 0; f < frames; f++) {
    const { re, im } = spec[f];
    for (let k = 0; k < bins; k++) { const g = gains[f][k]; re[k] *= g; im[k] *= g; if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; } }
    fft(re, im, true);
    for (let i = 0; i < N; i++) { out[f * hop + i] += re[i] * win[i]; norm[f * hop + i] += win[i] * win[i]; }
  }
  // Keep only the fully covered middle (the edges have fewer overlapping frames).
  const a = N, b = (frames - 1) * hop;
  return Float32Array.from({ length: b - a }, (_, i) => out[a + i] / (norm[a + i] || 1));
}
