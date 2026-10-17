// node smooth.mjs : write the Smoothed drone loops (<voice>-<note>-smooth.mp3)
// beside the shipped ones and print a level report.
//
// The shipped loops already have their level evened out period by period
// (steady.mjs); what is left is a slow swell of a few per second (the bow).
// This divides it out: the loop's level, smoothed over a quarter of a second
// and wrapped round the loop so the seam stays seamless, becomes a gain that
// holds it steady. Pitch, length and loop points are the shipped loop's, so
// drone.js plays a Smoothed file with the same entry under another name.
import { decode } from './analyze.mjs';
import { writeLoopMp3, SR } from './loop.mjs';
import { SAMPLED } from '../../../app/src/drone.js';

const dir = new URL('../../../app/assets/audio/drone/', import.meta.url).pathname;
const SMOOTH = 0.25; // seconds of level smoothing: slower swells go, the bow's grain stays

/** How much the level swings, in 50 ms windows: standard deviation over mean, %. */
function swing(x) {
  const n = Math.round(0.05 * SR), e = [];
  for (let i = 0; i + n <= x.length; i += n) { let s = 0; for (let j = i; j < i + n; j++) s += x[j] * x[j]; e.push(Math.sqrt(s / n)); }
  const m = e.reduce((a, b) => a + b, 0) / e.length;
  return (100 * Math.sqrt(e.reduce((a, b) => a + (b - m) ** 2, 0) / e.length)) / m;
}

export function smoothLoop(loop) {
  const L = loop.length, h = Math.round(SMOOTH * SR);
  // Power smoothed by a Hann window, taken round the loop (so it wraps at the seam).
  const w = new Float64Array(h);
  let ws = 0;
  for (let i = 0; i < h; i++) ws += (w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / h));
  const sq = new Float64Array(L);
  for (let i = 0; i < L; i++) sq[i] = loop[i] * loop[i];
  // Running sums over the wrapped loop, a 64-sample step for speed, then interpolated.
  const step = 64, pts = Math.ceil(L / step), lv = new Float64Array(pts);
  for (let p = 0; p < pts; p++) {
    let s = 0;
    const c = p * step - (h >> 1);
    for (let i = 0; i < h; i += 4) s += w[i] * sq[(((c + i) % L) + L) % L];
    lv[p] = Math.sqrt((s * 4) / ws);
  }
  const mean = lv.reduce((a, b) => a + b, 0) / pts;
  const out = new Float32Array(L);
  for (let i = 0; i < L; i++) {
    const f = i / step, p = Math.floor(f), t = f - p;
    const l = lv[p % pts] * (1 - t) + lv[(p + 1) % pts] * t;
    out[i] = loop[i] * (mean / l);
  }
  return out;
}

if (process.argv[1].endsWith('smooth.mjs')) {
  const done = new Set();
  for (const spec of Object.values(SAMPLED)) {
    for (const l of spec.loops) {
      if (done.has(l.file)) continue;
      done.add(l.file);
      const x = decode(dir + l.file);
      const m = Math.round(l.margin * SR), L = Math.round(l.loop * SR);
      const loop = x.slice(m, m + L);
      const smooth = smoothLoop(loop);
      const file = l.file.replace(/\.mp3$/, '-smooth.mp3');
      writeLoopMp3(smooth, dir + file, { margin: l.margin, kbps: 160 });
      const back = decode(dir + file).slice(m, m + L);
      console.log(`${file}: level swing ${swing(loop).toFixed(1)}% -> ${swing(back).toFixed(1)}%`);
    }
  }
}
