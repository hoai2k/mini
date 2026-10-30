import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, describe, nearestString, noteName, midiToHz, hzToMidi, TUNINGS, PitchSmoother, TraceSmoother, TRACE_SMOOTH } from '../src/tuning.js';

const SR = 48000;
const N = 4096;
const cents = (a, b) => 1200 * Math.log2(a / b);

/** A tone with harmonics (weights) and a little noise. */
function tone(hz, { harmonics = [1], noise = 0, phase = 0.3, amp = 0.3 } = {}) {
  let s = 7;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const total = harmonics.reduce((p, q) => p + q, 0);
  return Float32Array.from({ length: N }, (_, i) => {
    let v = 0;
    harmonics.forEach((w, k) => { v += w * Math.sin(2 * Math.PI * hz * (k + 1) * (i / SR) + phase * (k + 1)); });
    return (amp * v) / total + noise * rnd();
  });
}

test('sine tones are found to within 1 cent from 31 Hz to 1500 Hz', () => {
  for (const hz of [30.87, 41.2, 55, 82.41, 110, 146.83, 196, 246.94, 329.63, 440, 445.5, 659.26, 987.77, 1318.5]) {
    const r = detectPitch(tone(hz), SR);
    assert.ok(r, `${hz} Hz found`);
    assert.ok(Math.abs(cents(r.hz, hz)) < 1, `${hz} Hz read as ${r.hz.toFixed(3)} (${cents(r.hz, hz).toFixed(2)} cents)`);
  }
});

test('instrument-like tones: right octave, within 1.5 cents', () => {
  const guitar = [1, 0.8, 0.6, 0.5, 0.3, 0.2]; // bright, strong overtones
  const weakFundamental = [0.25, 1, 0.8, 0.5]; // bass/low strings: little fundamental
  const clarinet = [1, 0.05, 0.6, 0.05, 0.4]; // odd harmonics
  for (const [hz, harmonics] of [[82.41, guitar], [110, guitar], [329.63, guitar], [41.2, weakFundamental], [55, weakFundamental], [233.08, clarinet], [466.16, clarinet]]) {
    const r = detectPitch(tone(hz, { harmonics, noise: 0.01 }), SR);
    assert.ok(r, `${hz} Hz found`);
    assert.ok(Math.abs(cents(r.hz, hz)) < 1.5, `${hz} Hz (harmonics ${harmonics}) read as ${r.hz.toFixed(2)} (${cents(r.hz, hz).toFixed(2)} cents)`);
  }
});

test('works at 44.1 kHz too', () => {
  const sr = 44100;
  const x = Float32Array.from({ length: N }, (_, i) => 0.3 * Math.sin(2 * Math.PI * 196 * (i / sr)));
  const r = detectPitch(x, sr);
  assert.ok(Math.abs(cents(r.hz, 196)) < 1);
});

test('silence and noise give no pitch', () => {
  assert.equal(detectPitch(new Float32Array(N), SR), null);
  let s = 3;
  const noise = Float32Array.from({ length: N }, () => (((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1) * 0.2);
  assert.equal(detectPitch(noise, SR), null);
});

test('notes, cents, spelling and transposition', () => {
  assert.deepEqual([describe(440).name, describe(440).octave, Math.round(describe(440).cents)], ['A', 4, 0]);
  assert.equal(Math.round(describe(445).cents), 20);
  assert.equal(Math.round(describe(440, { a4: 442 }).cents), -8);
  assert.equal(describe(277.18).name, 'C♯');
  assert.equal(describe(277.18, { flats: true }).name, 'D♭');
  // A concert B♭ (466.16 Hz) reads as C on a B♭ instrument, and as G on an E♭ one.
  assert.deepEqual([describe(466.16, { transpose: 'Bb' }).name, describe(466.16, { transpose: 'Bb' }).octave], ['C', 5]);
  assert.equal(describe(466.16, { transpose: 'Eb' }).name, 'G');
  assert.equal(describe(466.16, { transpose: 'F', flats: true }).name, 'F');
  assert.equal(noteName(60).octave, 4);
  assert.ok(Math.abs(midiToHz(69, 440) - 440) < 1e-9 && Math.abs(hzToMidi(261.6256) - 60) < 1e-4);
});

test('nearest string in a tuning', () => {
  const guitar = TUNINGS.find((t) => t.id === 'guitar').strings;
  assert.equal(nearestString(82.41, guitar).index, 0); // low E
  assert.equal(nearestString(108, guitar).index, 1); // flat A
  assert.ok(nearestString(108, guitar).cents < -30);
  assert.equal(nearestString(330, guitar).index, 5); // high E
  const uke = TUNINGS.find((t) => t.id === 'ukulele').strings; // re-entrant G C E A
  assert.equal(uke[nearestString(392, uke).index], 67);
});

test('smoothing follows a note, steadies it, and restarts on a new one', () => {
  const s = new PitchSmoother(5);
  for (const v of [440, 441, 439, 450, 440]) s.push(v);
  assert.equal(s.push(440.5), 440.5);
  assert.equal(s.push(330), 330); // new note: starts again
});

test('pure intervals: judged against just ratios above the drone', async () => {
  const { pureTarget, PURE_CENTS, midiToHz } = await import('../src/tuning.js');
  assert.ok(Math.abs(PURE_CENTS[4] - 386.31) < 0.01); // 5:4
  assert.ok(Math.abs(PURE_CENTS[7] - 701.96) < 0.01); // 3:2
  const d3 = 50;
  const root = midiToHz(d3);
  // F#3 a pure major third above D3: in tune, 13.7 cents under the piano's.
  const third = pureTarget(root * 5 / 4, d3);
  assert.equal(third.interval, 4);
  assert.equal(third.midi, 54);
  assert.ok(Math.abs(third.cents) < 0.01);
  assert.ok(Math.abs(third.shift + 13.69) < 0.01);
  // The piano's F#3 reads 13.7 cents sharp of pure.
  assert.ok(Math.abs(pureTarget(midiToHz(54), d3).cents - 13.69) < 0.01);
  // A fifth an octave up, and a note below the root.
  const fifth = pureTarget(root * 3, d3);
  assert.deepEqual([fifth.interval, fifth.octaves, Math.round(fifth.cents)], [7, 1, 0]);
  const below = pureTarget(root * 3 / 4, d3); // a fourth below = a fifth an octave down
  assert.deepEqual([below.interval, below.octaves, Math.round(below.cents)], [7, -1, 0]);
});

test('the pitch line\'s sensitivity: High draws every reading, Medium and Low a steadier running average', () => {
  // A held note whose readings wander ±6 cents every 25 ms.
  const wander = (tau) => {
    const t = new TraceSmoother(tau);
    const out = [];
    for (let i = 0; i < 80; i++) out.push(t.push(i * 25, i % 2 ? 6 : -6, 57));
    const tail = out.slice(40);
    return Math.max(...tail) - Math.min(...tail);
  };
  assert.equal(wander(TRACE_SMOOTH.high), 12); // as read
  assert.ok(wander(TRACE_SMOOTH.medium) < 3, String(wander(TRACE_SMOOTH.medium)));
  assert.ok(wander(TRACE_SMOOTH.low) < wander(TRACE_SMOOTH.medium));
  // It still follows: a note settling 10 cents sharp is there within a second, even on Low.
  const t = new TraceSmoother(TRACE_SMOOTH.low);
  let v = 0;
  for (let i = 0; i <= 40; i++) v = t.push(i * 25, 10, 57);
  assert.ok(v > 9, String(v));
  // A new note, or a gap, starts it again.
  assert.equal(t.push(1100, -20, 58), -20);
  assert.equal(t.push(1600, 30, 58), 30);
});
