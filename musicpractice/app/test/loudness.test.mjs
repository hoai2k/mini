import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loudness, leveled, TARGET_LUFS, MAX_GAIN_DB, CEILING } from '../src/loudness.js';

const SR = 48000;
const sine = (amp, hz = 997, sec = 3) => Float32Array.from({ length: SR * sec }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR));
const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

test('loudness is measured as BS.1770 does: a full-scale 997 Hz sine is -3.01 LUFS', () => {
  assert.ok(Math.abs(loudness(sine(1), SR) + 3.01) < 0.05, String(loudness(sine(1), SR)));
  assert.ok(Math.abs(loudness(Float32Array.from({ length: 44100 * 3 }, (_, i) => Math.sin((2 * Math.PI * 997 * i) / 44100)), 44100) + 3.01) < 0.05); // at 44.1 kHz too
  assert.ok(Math.abs(loudness(sine(0.1), SR) + 23.01) < 0.1); // 20 dB down
  assert.equal(loudness(new Float32Array(SR), SR), -Infinity); // silence
  // The gate: a second of silence doesn't count (only the blocks half over its edge do):
  // -23.2 LUFS, as ffmpeg's ebur128 measures the same signal, where averaging it in would give -24.3.
  const gap = new Float32Array(SR * 4); gap.set(sine(0.1));
  assert.ok(Math.abs(loudness(gap, SR) + 23.2) < 0.05, String(loudness(gap, SR)));
});

test('a quiet take is brought up to the target, never past the ceiling; a loud one is left alone', () => {
  const quiet = leveled(sine(0.02), SR); // about -37 LUFS: held to the most it may be brought up
  assert.ok(Math.abs(quiet.gainDb - MAX_GAIN_DB) < 1e-9);
  const soft = leveled(sine(0.05), SR); // about -29 LUFS
  assert.ok(Math.abs(loudness(soft.samples, SR) - TARGET_LUFS) < 0.3, String(loudness(soft.samples, SR)));
  assert.ok(peak(soft.samples) <= CEILING + 1e-6);
  const loud = sine(0.7);
  assert.equal(leveled(loud, SR).samples, loud); // already louder than the target: untouched
  assert.equal(leveled(new Float32Array(100), SR).gainDb, 0); // silence: nothing to bring up
});

test('a sharp attack is limited, but only so far: the take is brought up less instead', () => {
  const x = sine(0.03); x[SR] = 0.9; // one sharp spike in a quiet take
  const r = leveled(x, SR);
  assert.ok(r.gainDb <= 20 * Math.log10(CEILING / 0.9) + 6 + 1e-6, String(r.gainDb));
  assert.ok(peak(r.samples) <= CEILING + 1e-6);
  // Away from the spike the take is simply louder by the gain (the limiter lets go).
  const g = 10 ** (r.gainDb / 20);
  assert.ok(Math.abs(r.samples[SR * 2 + 7] - x[SR * 2 + 7] * g) < 1e-4);
});
