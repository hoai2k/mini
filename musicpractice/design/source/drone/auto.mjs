// node auto.mjs takes... : find each take's steady stretch, loop it, check the seam, describe the tone.
import { decode, track } from './analyze.mjs';
import { makeLoop, level, seamReport, writeRepeated, SR } from './loop.mjs';
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
export function steady(x) {
  const tr = track(x);
  const db = tr.map((r) => 20 * Math.log10(r.rms + 1e-9));
  const loud = db.filter((d) => d > -45);
  const med = median(loud);
  let i = db.findIndex((d) => d > med - 6);
  let j = db.length - 1 - [...db].reverse().findIndex((d) => d > med - 6);
  const a = tr[i].t + 0.6, b = tr[j].t - 0.2; // past the attack; before the release
  const hz = median(tr.filter((r) => r.hz && r.t >= a && r.t <= b).map((r) => r.hz));
  return { a, b, hz, med };
}
function centroid(x) {
  // Spectral brightness: mean frequency weighted by magnitude (crude DFT on 4096 frames, every 0.5 s).
  let num = 0, den = 0;
  for (let s = 0; s + 4096 < x.length; s += SR / 2) {
    for (let k = 1; k < 200; k++) { // up to ~2150 Hz in 10.8 Hz bins
      let re = 0, im = 0; const w = (2 * Math.PI * k) / 4096;
      for (let n = 0; n < 4096; n += 2) { re += x[s + n] * Math.cos(w * n); im -= x[s + n] * Math.sin(w * n); }
      const m = Math.hypot(re, im); num += m * k * 10.77; den += m;
    }
  }
  return num / den;
}
if (process.argv[1].endsWith("auto.mjs")) for (const f of process.argv.slice(2)) {
  const x = decode(f);
  const s = steady(x);
  if (s.b - s.a < 5) { console.log(f.split('/').pop(), 'too short a steady stretch', s.a.toFixed(1), s.b.toFixed(1)); continue; }
  const loop = level(makeLoop(x, s.a, s.b, { hz: s.hz }));
  const rep = seamReport(loop);
  const name = f.split('/').pop().replace('.mp3', '');
  writeRepeated(loop, `loops/${name}-x3.mp3`);
  console.log(name.padEnd(12), `${s.a.toFixed(1)}-${s.b.toFixed(1)}s`, `${s.hz.toFixed(2)} Hz`, `level ${s.med.toFixed(0)} dB`, `bright ${centroid(loop).toFixed(0)} Hz`, JSON.stringify(rep));
}
