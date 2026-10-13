// node export.mjs outDir voice name=take ... : write the app's loop files and print their manifest.
import { decode, track } from './analyze.mjs';
import { makeLoop, level, seamReport, writeLoopMp3, SR } from './loop.mjs';
import { steady } from './auto.mjs';
import { steadyLoop } from './steady.mjs';
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
// --steady: one bow stroke, pitch held exactly, level evened out (see steady.mjs).
const args = process.argv.slice(2);
const steadyMode = args.includes('--steady');
const [outDir, voice, ...pairs] = args.filter((a) => a !== '--steady');
const out = [];
for (const p of pairs) {
  // NOTE=take, then optional flags: :sp to steady the brightness too
  // (spectral.mjs), :whole to use the whole steady stretch rather than one
  // bow stroke (an ensemble changes bow at staggered times), :p2 for a sound
  // that repeats every two periods (a tonic with its fifth), :xf2 for a
  // 2 s crossfade (very steady sounds show a short join more).
  const [note, spec] = p.split('=');
  const [take, ...flags] = spec.split(':');
  const flag = flags.includes('sp') ? 'sp' : '';
  const x = decode(new URL(`../../sounds/drone/${take}.mp3`, import.meta.url).pathname);
  const s = steady(x);
  const loop = level(steadyMode ? steadyLoop(x, s.a, s.b, s.hz, { spectral: flag === 'sp' ? 0.85 : 0, wholeStretch: flags.includes('whole'), periods: flags.includes('p2') ? 2 : 1, xfade: Number((flags.find((f) => f.startsWith('xf')) || 'xf0.8').slice(2)) }).loop : makeLoop(x, s.a, s.b, { hz: s.hz }), -20);
  // The pitch of the finished loop itself (played round twice, so windows cross the seam too).
  const two = new Float32Array(loop.length * 2); two.set(loop); two.set(loop, loop.length);
  const hz = median(track(two).filter((r) => r.hz).map((r) => r.hz));
  const file = `${voice}-${note}.mp3`;
  const { margin, samples } = writeLoopMp3(loop, `${outDir}/${file}`, { margin: 0.3, kbps: 160 });
  out.push({ file, hz: +hz.toFixed(3), margin, loop: +(samples / SR).toFixed(6), source: take, spectral: flag === 'sp', seam: seamReport(loop) });
}
console.log(JSON.stringify(out, null, 1));
