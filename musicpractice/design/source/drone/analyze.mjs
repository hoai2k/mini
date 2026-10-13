// node analyze.mjs file.mp3 [...]  — pitch track, steadiness and level of each clip.
import { execFileSync } from 'node:child_process';
import { detectPitch, describe } from '../../../app/src/tuning.js';
const SR = 44100;
export function decode(file) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}
export function track(x, hop = 0.1) {
  const out = [];
  for (let t = 0; t + 0.2 < x.length / SR; t += hop) {
    const w = x.subarray(Math.round(t * SR), Math.round(t * SR) + 8192);
    let s = 0; for (const v of w) s += v * v;
    const p = detectPitch(w, SR, { minHz: 30, maxHz: 1200, minClarity: 0.7 });
    out.push({ t, rms: Math.sqrt(s / w.length), hz: p ? p.hz : null, clarity: p ? p.clarity : 0 });
  }
  return out;
}
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
if (process.argv[1].endsWith('analyze.mjs')) {
  for (const f of process.argv.slice(2)) {
    const x = decode(f);
    const tr = track(x);
    const voiced = tr.filter((r) => r.hz && r.rms > 0.01);
    if (!voiced.length) { console.log(f, 'no pitch'); continue; }
    const hz = median(voiced.map((r) => r.hz));
    // Fold octave errors onto the median before measuring spread.
    const cents = voiced.map((r) => { let c = 1200 * Math.log2(r.hz / hz); c -= 1200 * Math.round(c / 1200); return c; });
    const sd = Math.sqrt(cents.reduce((s, c) => s + c * c, 0) / cents.length);
    const d = describe(hz);
    const rmsDb = tr.map((r) => (20 * Math.log10(r.rms + 1e-9)).toFixed(0));
    console.log(`${f.split('/').pop().padEnd(28)} ${(x.length / SR).toFixed(1)}s  ${hz.toFixed(2)} Hz = ${d.name}${d.octave} ${d.cents >= 0 ? '+' : ''}${d.cents.toFixed(1)}c  spread ±${sd.toFixed(1)}c  voiced ${Math.round((100 * voiced.length) / tr.length)}%  octave jumps ${voiced.filter((r) => Math.abs(1200 * Math.log2(r.hz / hz)) > 600).length}`);
    console.log('   level dB per 0.5s:', tr.filter((_, i) => i % 5 === 0).map((r) => (20 * Math.log10(r.rms + 1e-9)).toFixed(0)).join(' '));
  }
}
