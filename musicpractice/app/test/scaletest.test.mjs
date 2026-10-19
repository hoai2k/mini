import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScaleListener, judge, SCALE_TOLERANCE } from '../src/scaletest.js';

const SR = 48000;
/** A played scale: each note with a few harmonics, a soft attack and release, then quiet (with a little room noise). */
function scale(notes, { noteSec = 0.5, gapSec = 0.04, leadSec = 1, tailSec = 3.6, a4 = 440 } = {}) {
  const total = leadSec + notes.length * (noteSec + gapSec) + tailSec;
  const x = new Float32Array(Math.round(total * SR));
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
  for (let i = 0; i < x.length; i++) x[i] = rnd() * 0.002;
  notes.forEach(([midi, cents], k) => {
    const hz = a4 * 2 ** ((midi - 69 + cents / 100) / 12);
    const s0 = Math.round((leadSec + k * (noteSec + gapSec)) * SR);
    const n = Math.round(noteSec * SR);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.03) * Math.min(1, (n - i) / (0.05 * SR));
      x[s0 + i] += 0.25 * env * (Math.sin(2 * Math.PI * hz * t) + 0.4 * Math.sin(4 * Math.PI * hz * t) + 0.2 * Math.sin(6 * Math.PI * hz * t));
    }
  });
  return x;
}

function listen(x, opts) {
  const l = new ScaleListener(SR, opts);
  const events = [];
  for (let i = 0; i < x.length; i += 1024) {
    const e = l.push(x.subarray(i, i + 1024));
    if (e) events.push(e);
  }
  return { l, events };
}

test('judge: within 15 cents is in tune, more leniently than the tuner', () => {
  assert.equal(SCALE_TOLERANCE, 15);
  assert.equal(judge(0), 'good');
  assert.equal(judge(-14.9), 'good');
  assert.equal(judge(15), 'good');
  assert.equal(judge(-16), 'flat');
  assert.equal(judge(22), 'sharp');
});

test('a C major scale is heard note by note, and the out-of-tune ones are found', () => {
  const played = [[60, 3], [62, -6], [64, 25], [65, 0], [67, 8], [69, -30], [71, -4], [72, 5]];
  const { l, events } = listen(scale(played));
  assert.deepEqual(events, ['start', 'done']);
  const notes = l.result;
  assert.deepEqual(notes.map((n) => n.midi), played.map(([m]) => m));
  notes.forEach((n, i) => assert.ok(Math.abs(n.cents - played[i][1]) < 4, `${n.midi}: ${n.cents.toFixed(1)} for ${played[i][1]}`));
  assert.deepEqual(notes.map((n) => judge(n.cents)), ['good', 'good', 'sharp', 'good', 'good', 'flat', 'good', 'good']);
});

test('nothing played: it waits, and never finishes', () => {
  const quiet = scale([]);
  const { l, events } = listen(quiet);
  assert.deepEqual(events, []);
  assert.equal(l.state, 'waiting');
});

test('down the scale, with the reference at 442', () => {
  const played = [[72, 0], [71, -20], [69, 0], [67, 12]];
  const { l, events } = listen(scale(played, { a4: 442 }), { a4: 442 });
  assert.deepEqual(events, ['start', 'done']);
  assert.deepEqual(l.result.map((n) => [n.midi, judge(n.cents)]), [[72, 'good'], [71, 'flat'], [69, 'good'], [67, 'good']]);
});
