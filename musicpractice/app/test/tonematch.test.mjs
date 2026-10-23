import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickNote, judgeMatch, SteadyNote, MATCH_LOW, MATCH_HIGH, STEADY_MS } from '../src/tonematch.js';
import { midiToHz } from '../src/tuning.js';

test('notes to match are exact notes in the cello range, never the same note name twice running', () => {
  let prev = null;
  let seed = 1;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < 500; k++) {
    const n = pickNote(prev, rand);
    assert.ok(Number.isInteger(n) && n >= MATCH_LOW && n <= MATCH_HIGH);
    if (prev !== null) assert.notEqual((n - prev) % 12, 0);
    prev = n;
  }
});

test('a match is judged on the note (any octave) and then on the cents', () => {
  const d3 = 50;
  const j = (hz) => judgeMatch(hz, d3);
  assert.deepEqual([j(midiToHz(50)).right, Math.round(j(midiToHz(50)).cents), j(midiToHz(50)).closeness], [true, 0, 'inTune']);
  // An octave up, 10 cents sharp: right, close.
  const up = j(midiToHz(62.1));
  assert.deepEqual([up.right, Math.round(up.cents), up.closeness, up.played], [true, 10, 'close', 62]);
  // Two octaves down, 30 cents flat: right note, but off.
  const low = j(midiToHz(25.7));
  assert.deepEqual([low.right, Math.round(low.cents), low.closeness], [true, -30, 'off']);
  // E3 is the wrong note, two semitones up; C3 two down; G#3 is a tritone either way.
  assert.deepEqual([j(midiToHz(52)).right, j(midiToHz(52)).semitones], [false, 2]);
  assert.equal(j(midiToHz(48)).semitones, -2);
  assert.equal(Math.abs(j(midiToHz(56)).semitones), 6);
  // 60 cents sharp is nearer the next note: wrong.
  assert.equal(j(midiToHz(50.6)).right, false);
});

test('a held note is heard once steady, a wavering one is not', () => {
  const s = new SteadyNote();
  let got = null;
  for (let t = 0; t <= STEADY_MS + 100 && !got; t += 50) got = s.push(220 * (1 + (t % 100 ? 0.003 : -0.003)), t);
  assert.ok(got && Math.abs(got - 220) < 1);
  const w = new SteadyNote();
  let none = null;
  for (let t = 0; t <= 2000; t += 50) none = none || w.push(t % 200 ? 220 : 233, t); // jumps a semitone every 200 ms
  assert.equal(none, null);
});
