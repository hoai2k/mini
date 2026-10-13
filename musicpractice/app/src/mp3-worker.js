// Turns a take into an MP3 off the main thread (a classic worker, so it can
// load the unmodified LAME build in vendor/lamejs).
// In: { samples: Float32Array, sampleRate, kbps }. Out: { mp3: Blob } or { error }.

importScripts('../vendor/lamejs/lame.min.js');

const RATES = [48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000];

/** Linear resampling, for a rate MP3 doesn't have (96 kHz, say). */
function resample(x, from, to) {
  const n = Math.floor((x.length * to) / from);
  const out = new Float32Array(n);
  const step = from / to;
  for (let i = 0; i < n; i++) {
    const p = i * step;
    const j = Math.floor(p);
    const f = p - j;
    out[i] = x[j] * (1 - f) + (x[j + 1] ?? x[j]) * f;
  }
  return out;
}

function encode(samples, sampleRate, kbps) {
  let rate = sampleRate;
  if (!RATES.includes(rate)) {
    rate = RATES.find((r) => r <= sampleRate) ?? 8000;
    samples = resample(samples, sampleRate, rate);
  }
  const enc = new lamejs.Mp3Encoder(1, rate, kbps);
  const BLOCK = 1152 * 16;
  const pcm = new Int16Array(BLOCK);
  const parts = [];
  for (let i = 0; i < samples.length; i += BLOCK) {
    const n = Math.min(BLOCK, samples.length - i);
    for (let j = 0; j < n; j++) {
      const v = Math.max(-1, Math.min(1, samples[i + j]));
      pcm[j] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    const out = enc.encodeBuffer(n === BLOCK ? pcm : pcm.subarray(0, n));
    if (out.length) parts.push(out);
  }
  const end = enc.flush();
  if (end.length) parts.push(end);
  return new Blob(parts, { type: 'audio/mpeg' });
}

self.onmessage = (e) => {
  const { samples, sampleRate, kbps = 128 } = e.data;
  try {
    self.postMessage({ mp3: encode(samples, sampleRate, kbps) });
  } catch (err) {
    self.postMessage({ error: String(err?.message || err) });
  }
};
