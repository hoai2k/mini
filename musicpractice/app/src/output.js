// One way out for everything the app plays on an audio context: a limiter
// just under full scale, then a soft clipper as the hard ceiling. The
// metronome and the drone can each come close to full scale on their own,
// and a Practice Routine item plays both at once, with a chime or a voice
// over them: whatever sums, nothing clips. The browser's compressor is not a
// true brick wall (the sharpest transients get through it by half a decibel
// or so), so the clipper rounds off what it lets past, smoothly, at 0.95.
// Quieter than the threshold (as nearly everything is) neither does anything.

import { meterOutput } from './debuglog.js';

const outs = new WeakMap(); // context -> its limiter

const KNEE = 0.8; // the clipper is exactly linear below this
const CEIL = 0.95; // and never goes past this

/** The clipper's transfer curve: identity to KNEE, then a tanh shoulder to CEIL. */
export function clipCurve(n = 4097) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= KNEE ? a : KNEE + (CEIL - KNEE) * Math.tanh((a - KNEE) / (CEIL - KNEE));
    c[i] = Math.sign(x) * y;
  }
  return c;
}

/** Where to connect anything that should be heard on `ctx`. */
export function output(ctx) {
  let o = outs.get(ctx);
  if (!o) {
    o = ctx.createDynamicsCompressor();
    o.threshold.value = -2;
    o.knee.value = 0;
    o.ratio.value = 20;
    o.attack.value = 0.001;
    o.release.value = 0.15;
    const clip = ctx.createWaveShaper();
    clip.curve = clipCurve();
    clip.oversample = '4x';
    o.connect(clip).connect(ctx.destination);
    // How loud it all comes out, for the debug log (not on a context rendering a file).
    if (!(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext)) {
      const meter = ctx.createAnalyser();
      meter.fftSize = 2048;
      clip.connect(meter);
      meterOutput(meter);
    }
    outs.set(ctx, o);
  }
  return o;
}
