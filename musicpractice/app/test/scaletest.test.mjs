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

test('the results chime: triumphant from 80% in tune, positive from half, neutral below or with nothing heard', async () => {
  const { resultTier } = await import('../src/scaletest.js');
  assert.equal(resultTier(8, 8), 'great');
  assert.equal(resultTier(7, 8), 'great'); // 87.5%
  assert.equal(resultTier(6, 8), 'good'); // 75%
  assert.equal(resultTier(4, 8), 'good');
  assert.equal(resultTier(3, 8), 'neutral');
  assert.equal(resultTier(0, 0), 'neutral');
});

test('the score out of 1000: the share in tune, how close every note was, and how clear', async () => {
  const { scaleScore, SCORE_PARTS } = await import('../src/scaletest.js');
  assert.deepEqual(SCORE_PARTS, { inTune: 600, close: 250, clear: 150 });
  const n = (cents, clarity = 0.95) => ({ midi: 60, cents, clarity });
  assert.deepEqual(scaleScore([]), { total: 0, inTune: 0, close: 0, clear: 0 });
  assert.equal(scaleScore([n(0), n(0)]).total, 1000);
  // A near miss scores more than a wild one; dead centre more than just in tune.
  assert.ok(scaleScore([n(0), n(20)]).total > scaleScore([n(0), n(45)]).total);
  assert.ok(scaleScore([n(0)]).total > scaleScore([n(14)]).total);
  // A cloudier tone costs only its share.
  assert.deepEqual(scaleScore([n(0, 0.7)]), { total: 850, inTune: 600, close: 250, clear: 0 });
  const s = scaleScore([n(0), n(25), n(-30), n(5)]);
  assert.equal(s.total, s.inTune + s.close + s.clear);
  assert.equal(s.inTune, 300);
});

test('scored from what was heard: a clean scale near 1000, a wayward one lower', () => {
  const clean = listen(scale([[60, 0], [62, 2], [64, -3], [65, 0], [67, 4], [69, -2], [71, 0], [72, 3]])).l.result;
  const off = listen(scale([[60, 0], [62, 22], [64, -30], [65, 18], [67, 4], [69, -40], [71, 26], [72, 3]])).l.result;
  return import('../src/scaletest.js').then(({ scaleScore }) => {
    const a = scaleScore(clean);
    const b = scaleScore(off);
    assert.ok(clean.every((x) => x.clarity > 0.9), 'a synthesized tone is clear');
    assert.ok(a.total >= 950, `clean ${a.total}`);
    assert.ok(b.total < 600 && b.total > 250, `off ${b.total}`);
  });
});
