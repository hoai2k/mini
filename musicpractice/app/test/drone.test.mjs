import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrap, sequenceNote, DRONE_MIN, DRONE_MAX } from '../src/drone.js';

const seq = (id, start, n) => Array.from({ length: n }, (_, i) => sequenceNote(id, start, i));

test('notes wrap by octaves into the drone range (C1 to B4)', () => {
  assert.deepEqual([DRONE_MIN, DRONE_MAX], [24, 71]);
  assert.equal(wrap(72), 60);
  assert.equal(wrap(23), 35);
  assert.equal(wrap(96), 60);
  assert.equal(wrap(40), 40);
  assert.equal(wrap(24), 24);
});

test('chromatic up and down, wrapping at the ends of the range', () => {
  assert.deepEqual(seq('chrom-up', 69, 5), [69, 70, 71, 60, 61]); // A4 B♭4 B4, then C4 (wrapped down an octave)
  assert.deepEqual(seq('chrom-down', 26, 4), [26, 25, 24, 35]); // D1 C♯1 C1, then B1
});

test('the major scale of the starting note, up and down', () => {
  assert.deepEqual(seq('major-up', 36, 9), [36, 38, 40, 41, 43, 45, 47, 48, 50]); // C2 D E F G A B C3 D3
  assert.deepEqual(seq('major-down', 36, 9), [36, 35, 33, 31, 29, 28, 26, 24, 35]); // C2 B A G F E D C1, then B (wrapped up)
  // From D4: up D E F♯ G A B C♯ D, staying in range.
  assert.deepEqual(seq('major-up', 62, 8), [62, 64, 66, 67, 69, 71, 61, 62]);
});

test('fifths and fourths go round all twelve notes', () => {
  const f = seq('fifths', 36, 13);
  assert.deepEqual(f.slice(0, 6), [36, 43, 50, 57, 64, 71]); // C2 G2 D3 A3 E4 B4
  assert.equal(f[6], 66); // then F♯4 (an octave down, not F♯5)
  assert.equal(new Set(f.map((m) => m % 12)).size, 12);
  assert.equal(f[12] % 12, 0);
  assert.deepEqual(seq('fourths', 24, 5), [24, 29, 34, 39, 44]); // C1 F1 B♭1 E♭2 A♭2
  for (const m of [...f, ...seq('fourths', 71, 30)]) assert.ok(m >= DRONE_MIN && m <= DRONE_MAX);
});

test('the settings accept exactly the voices and sequences the drone has', async () => {
  const { VOICES, SEQUENCES } = await import('../src/drone.js');
  const { sanitize } = await import('../src/settings.js');
  for (const v of VOICES) assert.equal(sanitize({ droneVoice: v.id }).droneVoice, v.id);
  // Changing periodically moves on to another note: every sequence but Stop.
  for (const q of SEQUENCES.filter((q) => q.id !== 'stop')) {
    assert.equal(sanitize({ droneMode: 'change', droneSeq: q.id }).droneThen, q.id);
  }
  assert.equal(sanitize({ droneMode: 'change', droneSeq: 'stop' }).droneSeq, 'chrom-up');
});

test('recorded voices: every note is close to a recording, in its own octave, and the files are there', async () => {
  const { SAMPLED, VOICES, nearestLoop } = await import('../src/drone.js');
  const { existsSync, statSync } = await import('node:fs');
  // Every voice is recorded, apart from the Synth organ, which is synthesized on purpose.
  for (const v of VOICES) assert.ok(SAMPLED[v.id] || v.id === 'organ-synth', `${v.id} has recordings`);
  for (const [id, voice] of Object.entries(SAMPLED)) {
    const limit = (voice.maxShift ?? 4) + 0.6; // + the reference pitch moving (A4 415-466)
    for (let m = DRONE_MIN; m <= DRONE_MAX; m++) {
      for (const a4 of [415, 440, 466]) {
        const hz = a4 * 2 ** ((m - 69) / 12);
        const l = nearestLoop(voice.loops, hz, voice.maxShift);
        // The same note (or an octave of it), from a recording at most `limit` semitones away.
        const octaves = Math.log2(l.target / hz);
        assert.ok(Math.abs(octaves - Math.round(octaves)) < 1e-9, `${id} note ${m}: plays the same note`);
        // Every note of the range, C1 to B4, in its own octave (only a fifth above B4 may fold down).
        assert.equal(Math.round(octaves), 0, `${id} note ${m} at A4=${a4}: played an octave away`);
        assert.ok(Math.abs(12 * Math.log2(l.target / l.hz)) <= limit, `${id} note ${m} at A4=${a4}: ${l.file} is ${(12 * Math.log2(l.target / l.hz)).toFixed(1)} semitones away`);
      }
    }
    for (const l of voice.loops) {
      const f = new URL(`../assets/audio/drone/${l.file}`, import.meta.url);
      assert.ok(existsSync(f) && statSync(f).size > 50000, l.file);
      assert.ok(l.loop > 1.5 && l.margin >= 0.25, `${l.file}: a loop of ${l.loop} s with ${l.margin} s either side`);
    }
  }
});

test('every recorded loop is on disk (the smoothed loops, under their own names)', async () => {
  const { SAMPLED } = await import('../src/drone.js');
  const fs = await import('node:fs');
  for (const [id, spec] of Object.entries(SAMPLED)) {
    for (const l of spec.loops) assert.ok(fs.existsSync(new URL(`../assets/audio/drone/${l.file}`, import.meta.url)), `${id}: ${l.file}`);
    assert.ok(!id.endsWith('-smooth'), id);
  }
});

test('accidentals: Auto spells by the way the note was reached; Sharps and Flats always', async () => {
  const { spelling, SEQ_DIRECTION, SEQUENCES } = await import('../src/drone.js');
  assert.equal(spelling('auto', 'sharps', -1), 'flats');
  assert.equal(spelling('auto', 'flats', 1), 'sharps');
  assert.equal(spelling('auto', 'flats', 0), 'flats'); // picked from the list: as shown
  assert.equal(spelling('auto', undefined, 0), 'sharps');
  for (const d of [-1, 0, 1]) {
    assert.equal(spelling('sharps', 'flats', d), 'sharps');
    assert.equal(spelling('flats', 'sharps', d), 'flats');
  }
  // Every sequence has a way it goes.
  for (const q of SEQUENCES) if (q.id !== 'stop') assert.ok([1, -1].includes(SEQ_DIRECTION[q.id]), q.id);
});

test('the drone clock reads MM:SS, and H:MM:SS from an hour', async () => {
  const { clock } = await import('../src/droneui.js');
  assert.equal(clock(0), '00:00');
  assert.equal(clock(65.9), '01:05');
  assert.equal(clock(3599), '59:59');
  assert.equal(clock(3600 + 125), '1:02:05');
});

test('the output clipper is linear below its knee and never reaches full scale', async () => {
  const { clipCurve } = await import('../src/output.js');
  const c = clipCurve(4097);
  const at = (x) => c[Math.round(((x + 1) / 2) * 4096)];
  for (const x of [0, 0.25, -0.5, 0.79]) assert.ok(Math.abs(at(x) - x) < 1e-3, `linear at ${x}`);
  for (let i = 0; i < c.length; i++) assert.ok(Math.abs(c[i]) <= 0.95 + 1e-6);
  for (let i = 1; i < c.length; i++) assert.ok(c[i] >= c[i - 1], 'monotonic');
});
