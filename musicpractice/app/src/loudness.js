// Takes are recorded as the mic hears them (no automatic gain), so an
// instrument across the room comes back 10-15 dB quieter than music on
// YouTube. Each take is brought up for playback to about the loudness
// streaming services play at, measured the way they measure it (ITU BS.1770:
// K-weighted, in gated 400 ms blocks), with a look-ahead limiter so its
// loudest moments stay under full scale. The recording itself is never
// changed; only what is played.

export const TARGET_LUFS = -15; // YouTube plays at -14; a little under, so less is limited
export const MAX_GAIN_DB = 20; // a near-silent take isn't made into hiss
export const CEILING = 0.89; // -1 dBFS
export const MAX_LIMIT_DB = 6; // at most this much is taken off the loudest moments

/**
 * BS.1770's K-weighting at any sample rate, as libebur128 derives it: a
 * shelf of +4 dB above about 1.7 kHz (the head) and a high-pass at about
 * 38 Hz. Each is [b0, b1, b2, a1, a2].
 */
function kWeighting(sampleRate) {
  let K = Math.tan((Math.PI * 1681.974450955533) / sampleRate);
  const Q = 0.7071752369554196, Vh = 10 ** (3.999843853973347 / 20), Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelf = [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  K = Math.tan((Math.PI * 38.13547087602444) / sampleRate);
  const Qh = 0.5003270373238773;
  a0 = 1 + K / Qh + K * K;
  const highpass = [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Qh + K * K) / a0];
  return [shelf, highpass];
}

/** Integrated loudness of mono samples, in LUFS (-Infinity for silence). */
export function loudness(samples, sampleRate) {
  const [[s0, s1, s2, sa1, sa2], [h0, h1, h2, ha1, ha2]] = kWeighting(sampleRate);
  // One pass: both filters, and the K-weighted power summed in 100 ms quarters
  // (a 400 ms block every 100 ms is four of them).
  const n = samples.length, hop = Math.round(0.1 * sampleRate);
  const quarters = new Float64Array(Math.floor(n / hop));
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, all = 0, acc = 0, q = 0;
  for (let i = 0; i < n; i++) {
    const x = samples[i];
    const y = s0 * x + s1 * x1 + s2 * x2 - sa1 * y1 - sa2 * y2;
    x2 = x1; x1 = x;
    const z = h0 * y + h1 * y1 + h2 * y2 - ha1 * z1 - ha2 * z2;
    y2 = y1; y1 = y; z2 = z1; z1 = z;
    acc += z * z;
    if ((i + 1) % hop === 0) { quarters[q++] = acc; all += acc; acc = 0; }
  }
  all += acc;
  const powers = [];
  for (let k = 0; k + 4 <= quarters.length; k++) powers.push((quarters[k] + quarters[k + 1] + quarters[k + 2] + quarters[k + 3]) / (4 * hop));
  if (!powers.length && n) powers.push(all / n); // shorter than a block: the whole of it
  const lufs = (p) => -0.691 + 10 * Math.log10(p);
  const gated = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const abs = powers.filter((p) => lufs(p) > -70); // the absolute gate
  if (!abs.length) return -Infinity;
  const rel = lufs(gated(abs)) - 10; // and the relative one
  const kept = abs.filter((p) => lufs(p) > rel);
  return lufs(gated(kept));
}

/**
 * The take as it is played: brought up to TARGET_LUFS (never turned down, and
 * by MAX_GAIN_DB at most), then limited to CEILING. The gain is also held to
 * what the limiter can take (MAX_LIMIT_DB over the peak), so a take with a
 * sharp attack is brought up less rather than squashed.
 * @returns {{ samples: Float32Array, gainDb: number }}
 */
export function leveled(samples, sampleRate) {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const lufs = loudness(samples, sampleRate);
  if (!peak || !Number.isFinite(lufs)) return { samples, gainDb: 0 };
  const byPeak = 20 * Math.log10(CEILING / peak) + MAX_LIMIT_DB;
  const gainDb = Math.max(0, Math.min(TARGET_LUFS - lufs, MAX_GAIN_DB, byPeak));
  if (gainDb < 0.1) return { samples, gainDb: 0 };
  return { samples: limit(samples, 10 ** (gainDb / 20), sampleRate), gainDb };
}

/**
 * `x` times `gain`, limited to CEILING: a look-ahead peak limiter (the gain
 * is already down when a peak arrives, 5 ms ahead), letting go over 80 ms.
 */
export function limit(x, gain, sampleRate) {
  let peak = 0;
  for (let i = 0; i < x.length; i++) { const a = x[i] < 0 ? -x[i] : x[i]; if (a > peak) peak = a; }
  if (peak * gain <= CEILING) return x.map((v) => v * gain); // nothing to limit
  const n = x.length, ahead = Math.max(1, Math.round(0.005 * sampleRate));
  const release = 1 - Math.exp(-1 / (0.08 * sampleRate));
  // The gain each sample needs, then the least over the look-ahead window.
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = Math.abs(x[i]) * gain; need[i] = a > CEILING ? CEILING / a : 1; }
  const minAhead = new Float32Array(n);
  const q = new Int32Array(n); // a monotonic queue of indices (q[head..tail)): the window's minimum
  let head = 0, tail = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (tail > head && need[q[tail - 1]] >= need[i]) tail--;
    q[tail++] = i;
    while (q[head] > i + ahead) head++;
    minAhead[i] = need[q[head]];
  }
  const out = new Float32Array(n);
  let g = 1;
  for (let i = 0; i < n; i++) {
    const want = minAhead[i];
    g = want < g ? want : g + (want - g) * release; // down at once (it was seen coming), up slowly
    out[i] = Math.max(-CEILING, Math.min(CEILING, x[i] * gain * g));
  }
  return out;
}

const cache = new WeakMap(); // samples -> { samples (leveled), gainDb, lufs }
/** leveled(), worked out once per take. */
export function forPlayback(samples, sampleRate) {
  let r = cache.get(samples);
  if (!r) {
    const lufs = loudness(samples, sampleRate);
    r = { ...leveled(samples, sampleRate), lufs: Number.isFinite(lufs) ? Math.round(lufs * 10) / 10 : null };
    cache.set(samples, r);
  }
  return r.samples;
}
/** How a take was brought up for playback: { gainDb, lufs } (after forPlayback). */
export const playbackLevel = (samples) => {
  const r = cache.get(samples);
  return r ? { gainDb: Math.round(r.gainDb * 10) / 10, lufs: r.lufs } : null;
};
