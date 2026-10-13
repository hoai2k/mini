import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrap, sequenceNote, DRONE_MIN, DRONE_MAX } from '../src/drone.js';

const seq = (id, start, n) => Array.from({ length: n }, (_, i) => sequenceNote(id, start, i));

test('notes wrap by octaves into the drone range (C2 to B3)', () => {
  assert.deepEqual([DRONE_MIN, DRONE_MAX], [36, 59]);
  assert.equal(wrap(60), 48);
  assert.equal(wrap(35), 47);
  assert.equal(wrap(84), 48);
  assert.equal(wrap(40), 40);
});

test('chromatic up and down, wrapping at the ends of the range', () => {
  assert.deepEqual(seq('chrom-up', 57, 5), [57, 58, 59, 48, 49]); // A3 B♭3 B3, then C3 (wrapped down an octave)
  assert.deepEqual(seq('chrom-down', 38, 4), [38, 37, 36, 47]); // D2 C♯2 C2, then B2
});

test('the major scale of the starting note, up and down', () => {
  assert.deepEqual(seq('major-up', 36, 9), [36, 38, 40, 41, 43, 45, 47, 48, 50]); // C2 D E F G A B C3 D3
  assert.deepEqual(seq('major-down', 48, 9), [48, 47, 45, 43, 41, 40, 38, 36, 47]); // C3 B A G F E D C2, then B (wrapped up)
  // From D3: up D E F♯ G A B C♯ D, staying in range.
  assert.deepEqual(seq('major-up', 50, 8), [50, 52, 54, 55, 57, 59, 49, 50]);
});

test('fifths and fourths go round all twelve notes', () => {
  const f = seq('fifths', 36, 13);
  assert.deepEqual(f.slice(0, 5), [36, 43, 50, 57, 52]); // C2 G2 D3 A3, then E3 (an octave down, not E4)
  assert.equal(new Set(f.map((m) => m % 12)).size, 12);
  assert.equal(f[12] % 12, 0);
  assert.deepEqual(seq('fourths', 36, 5), [36, 41, 46, 51, 56]); // C2 F2 B♭2 E♭3 A♭3
  for (const m of [...f, ...seq('fourths', 59, 30)]) assert.ok(m >= DRONE_MIN && m <= DRONE_MAX);
});

test('the settings accept exactly the voices and sequences the drone has', async () => {
  const { VOICES, SEQUENCES } = await import('../src/drone.js');
  const { sanitize } = await import('../src/settings.js');
  for (const v of VOICES) assert.equal(sanitize({ droneVoice: v.id }).droneVoice, v.id);
  for (const q of SEQUENCES) assert.equal(sanitize({ droneThen: q.id }).droneThen, q.id);
});

test('recorded cello: every note is within three semitones of a recording, and the files are there', async () => {
  const { SAMPLED, nearestLoop } = await import('../src/drone.js');
  const { existsSync, statSync } = await import('node:fs');
  for (let m = DRONE_MIN; m <= DRONE_MAX; m++) {
    const hz = 440 * 2 ** ((m - 69) / 12);
    for (const a4 of [415, 440, 466]) {
      const l = nearestLoop(SAMPLED.cello.loops, hz * (a4 / 440));
      assert.ok(Math.abs(12 * Math.log2((hz * a4) / 440 / l.hz)) <= 3.6, `note ${m} at A4=${a4} is ${l.file}`);
    }
  }
  for (const l of SAMPLED.cello.loops) {
    const f = new URL(`../assets/audio/drone/${l.file}`, import.meta.url);
    assert.ok(existsSync(f) && statSync(f).size > 50000, l.file);
    assert.ok(l.loop > 1.5 && l.margin >= 0.25, `${l.file}: a loop of ${l.loop} s with ${l.margin} s either side`);
  }
});
