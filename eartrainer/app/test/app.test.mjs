import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMidi, parseNotes, fitWindow, windowKeys, isWhite, noteName, difficulty } from '../src/music.js';
import { createRound, press, redo, expected, stars, points } from '../src/round.js';
import { buildLibrary, inBook, transpose, pickNext, rate, SONGBOOKS, WHITES, LOWEST, HIGHEST } from '../src/library.js';
import { sampleFor } from '../src/audio.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('pitch names', () => {
  assert.equal(toMidi('C4'), 60);
  assert.equal(toMidi('A4'), 69);
  assert.equal(toMidi('Bb3'), 58);
  assert.equal(toMidi('E#4'), 65);
  assert.equal(toMidi('Cb5'), 71);
  assert.equal(noteName(61), 'C#4');
  assert.equal(noteName(61, { flats: true }), 'Db4');
  assert.throws(() => toMidi('H4'));
});

test('notation: durations and rests', () => {
  const n = parseNotes('C4:0.5 r:0.5 D4 E4:2');
  assert.deepEqual(n.map((x) => [x.midi, x.beats, x.at]), [[60, 0.5, 0], [62, 1, 1], [64, 2, 2]]);
});

test('a window of eleven white keys spans an octave and a half', () => {
  const ks = windowKeys(60, 11);
  assert.equal(ks[0], 60);
  assert.equal(ks[ks.length - 1], 77); // C4 .. F5
  assert.equal(ks.filter(isWhite).length, 11);
});

test('every melody fits the keyboard, in its own key and transposed', () => {
  const lib = buildLibrary();
  assert.ok(lib.length > 200, `library has ${lib.length} melodies`);
  for (const m of lib) {
    for (const shift of [0, -6, -3, 3, 6]) {
      const t = transpose(m, shift);
      assert.ok(t.window != null, `${m.id} shift ${shift} has no window`);
      const ks = windowKeys(t.window, WHITES);
      assert.ok(t.lo >= ks[0] && t.hi <= ks[ks.length - 1], `${m.id} shift ${shift} spills out of its window`);
      assert.ok(t.lo >= LOWEST && t.hi <= HIGHEST, `${m.id} out of range`);
    }
    assert.ok(m.level >= 1 && m.level <= 5);
  }
});

test('the melody files pass the validator', () => {
  const v = fileURLToPath(new URL('./validate-melodies.mjs', import.meta.url));
  execFileSync(process.execPath, [v], { stdio: 'pipe' });
});

test('every songbook has melodies', () => {
  const lib = buildLibrary();
  for (const b of SONGBOOKS) assert.ok(inBook(lib, b.id).length > 0, b.id);
});

test('fitWindow centres a small melody', () => {
  const s = fitWindow(60, 67, 11); // C4..G4
  const ks = windowKeys(s, 11);
  assert.ok(ks[0] <= 60 && ks[ks.length - 1] >= 67);
  assert.ok(60 - ks[0] >= 3, 'room below');
});

test('a round: wrong notes count but never advance; redo restarts', () => {
  const r = createRound(parseNotes('C4 D4 E4'));
  assert.equal(press(r, 61), 'wrong');
  assert.equal(expected(r), 60);
  assert.equal(press(r, 60), 'correct');
  assert.equal(press(r, 64), 'wrong');
  assert.equal(press(r, 62), 'correct');
  redo(r);
  assert.equal(r.pos, 0);
  assert.equal(r.mistakes, 2);
  assert.equal(press(r, 60), 'correct');
  assert.equal(press(r, 62), 'correct');
  assert.equal(press(r, 64), 'done');
  assert.equal(press(r, 50), 'free');
  assert.equal(r.mistakes, 2);
});

test('stars and points', () => {
  assert.equal(stars(8, 0), 3);
  assert.equal(stars(8, 2), 2);
  assert.equal(stars(8, 3), 1);
  assert.equal(stars(3, 1), 2);
  assert.ok(points(8, 0, 3) > points(8, 0, 0));
  assert.ok(points(8, 0) > points(8, 1));
  assert.equal(points(4, 100), 12); // never below three a note
});

test('adaptive picking prefers unsolved melodies near the rating', () => {
  const lib = buildLibrary();
  let rng = 0.3;
  const m = pickNext(lib, { rating: 1, rng: () => rng });
  assert.ok(m.level <= 2);
  const best = Object.fromEntries(lib.filter((x) => x.level <= 2).slice(0, 5).map((x) => [x.id, 3]));
  const n = pickNext(lib, { rating: 1, best, rng: () => rng });
  assert.ok(!(n.id in best));
  assert.equal(rate(1, 1), 1);
  assert.ok(rate(2, 3) > 2);
  assert.equal(rate(5, 3), 5);
  assert.equal(difficulty(parseNotes('C4 D4 E4')), 1);
});

test('samples: each note borrows the nearest sample within a semitone and a half', () => {
  for (let m = 36; m <= 96; m++) {
    const { sample, rate } = sampleFor(m);
    assert.ok(Math.abs(m - sample) <= 1, `${m} -> ${sample}`);
    assert.ok(Math.abs(rate - 2 ** ((m - sample) / 12)) < 1e-9);
  }
});
