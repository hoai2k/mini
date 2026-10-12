import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMidi, parseNotes, fitWindow, windowKeys, isWhite, noteName, difficulty, keyOf, spell, spellToken, staffStep, chromaticCount } from '../src/music.js';
import { createRound, press, redo, expected, stars, points, starsForTry, pointsForTry } from '../src/round.js';
import { buildLibrary, inBook, transpose, pickNext, rate, countAt, SONGBOOKS, LEVELS, WHITES, LOWEST, HIGHEST } from '../src/library.js';
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

test('a round: wrong notes count but never advance; redo starts clean', () => {
  const r = createRound(parseNotes('C4 D4 E4'));
  assert.equal(press(r, 61), 'wrong');
  assert.equal(expected(r), 60);
  assert.equal(press(r, 60), 'correct');
  assert.equal(press(r, 64), 'wrong');
  assert.equal(press(r, 62), 'correct');
  assert.equal(r.mistakes, 2);
  redo(r);
  assert.equal(r.pos, 0);
  assert.equal(r.mistakes, 0, 'wrong notes before a Redo no longer count');
  assert.equal(press(r, 60), 'correct');
  assert.equal(press(r, 62), 'correct');
  assert.equal(press(r, 64), 'done');
  assert.equal(press(r, 50), 'free');
  assert.equal(r.mistakes, 0, 'a correct run after Redo is clean');
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
  for (const l of LEVELS.filter((x) => x.range)) assert.equal(pickNext(lib, { level: l.id, rng: () => rng }).level, l.range[0], l.id);
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
  for (let m = 21; m <= 108; m++) {
    const { sample, rate } = sampleFor(m);
    assert.ok(Math.abs(m - sample) <= 1, `${m} -> ${sample}`);
    assert.ok(Math.abs(rate - 2 ** ((m - sample) / 12)) < 1e-9);
  }
});

const byId = (lib, id) => lib.find((m) => m.id === id);

test('difficulty levels match how hard familiar tunes are', () => {
  const lib = buildLibrary();
  const lv = (id) => byId(lib, id).level;
  assert.equal(lv('kid-hot-cross-buns'), 1);
  assert.equal(lv('pop-jaws'), 1);
  assert.ok(lv('kid-mary-had-a-little-lamb') <= 2);
  assert.ok(lv('summertime') <= 2);
  assert.equal(lv('ode-to-joy'), 3);
  assert.ok(lv('greensleeves') >= 3 && lv('greensleeves') <= 4);
  assert.ok(lv('giant-steps') >= 3);
  assert.equal(lv('fur-elise'), 5);
  assert.equal(lv('lick-chromatic-octave-down-g'), 5);
  // Longer, chromatic licks are harder than short diatonic ones.
  const licks = lib.filter((m) => m.cat === 'licks');
  const avg = (xs) => xs.reduce((a, m) => a + m.level, 0) / xs.length;
  assert.ok(avg(licks.filter((m) => m.parsed.length >= 11)) > avg(licks.filter((m) => m.parsed.length <= 5)) + 1.5);
});

test('every level has a fair share of the library', () => {
  const lib = buildLibrary();
  for (const l of LEVELS.filter((x) => x.range)) {
    const n = countAt(lib, l.id);
    assert.ok(n >= lib.length * 0.04, `${l.id} has only ${n}`);
  }
  assert.equal(countAt(lib, 'adaptive'), lib.length);
});

test('keys and spelling for the staff', () => {
  const fe = parseNotes('E5 D#5 E5 D#5 E5 B4 D5 C5 A4');
  const k = keyOf(fe);
  assert.equal(chromaticCount(fe, k), 0, 'a minor key\'s raised 7th is not chromatic');
  assert.deepEqual(spell(75, k), { letter: 'D', acc: 1, octave: 5 });
  const eb = parseNotes('Eb4 Eb5 D5 Bb4 C5 D5 Eb5');
  assert.deepEqual(spell(70, keyOf(eb)), { letter: 'B', acc: -1, octave: 4 });
  assert.equal(staffStep(spellToken('C4')), 28);
  assert.equal(staffStep(spellToken('B#3')), 27);
  assert.equal(staffStep(spell(60, { tonic: 7, minor: false })), 28);
});

test('transposed melodies spell without double accidentals', () => {
  const lib = buildLibrary();
  let doubles = 0, total = 0;
  for (const m of lib) for (const shift of [-5, -2, 1, 3, 6]) {
    const t = transpose(m, shift);
    const k = keyOf(t.notes);
    for (const n of t.notes) { total++; if (Math.abs(spell(n.midi, k).acc) > 1) doubles++; }
  }
  assert.ok(doubles / total < 0.002, `${doubles} of ${total}`);
});

import { perform, secondsPerBeat } from '../src/perform.js';

test('playback is phrased: legato, lifts for rests, the last note rings', () => {
  const notes = parseNotes('C4 D4 E4:2 r:1 G4:0.5 A4:0.5 C5:2');
  const spb = secondsPerBeat(120);
  const plan = perform(notes, spb);
  assert.ok(plan[0].off > plan[1].on, 'joined to the next note');
  assert.ok(plan[2].off < plan[3].on, 'lifted before the rest');
  assert.ok(plan[5].off - plan[5].on >= 2 * spb, 'last note held and left to ring');
  for (const p of plan) assert.ok(p.velocity >= 0.35 && p.velocity <= 0.95);
  assert.ok(plan[0].velocity > plan[3].velocity - 0.2);
  assert.deepEqual(perform(notes, spb), plan, 'the same every time');
  // Faster playback scales the timing.
  assert.ok(perform(notes, secondsPerBeat(120, 1.5))[5].on < plan[5].on);
});

test('extracted jazz heads read correctly (the LilyPond and MusicXML readers)', () => {
  const lib = buildLibrary();
  const notes = (id) => byId(lib, id).parsed.map((n) => noteName(n.midi, { flats: true })).join(' ');
  // Blue Monk: D Eb E F, G G# A Bb (spelled here with flats).
  assert.equal(notes('blue-monk'), 'D4 Eb4 E4 F4 G4 Ab4 A4 Bb4');
  // St. Thomas: G C B A G A E F, with its rests.
  assert.equal(notes('st-thomas'), 'G4 C5 B4 A4 G4 A4 E4 F4');
  assert.ok(inBook(lib, 'bebop').length >= 40);
  assert.ok(byId(lib, 'bop-confirmation') && byId(lib, 'donna-lee').cat === 'bebop');
});

test('long holds are shortened, so no melody crawls', () => {
  const spb = secondsPerBeat(120);
  const held = perform(parseNotes('C4:8 D4:6 E4 F4:4'), spb);
  for (let i = 1; i < held.length; i++) assert.ok(held[i].on - held[i - 1].on <= 1.1 + 0.01, 'a held note waits at most 1.1 s');
  // Slowing down stretches the cap too.
  const slow = perform(parseNotes('C4:8 D4'), secondsPerBeat(120, 0.5), { maxHold: 1.1 / 0.5 });
  assert.ok(slow[1].on > 2);
  // Across the library, the average wait between notes stays brisk.
  const lib = buildLibrary();
  const slowest = lib.map((m) => {
    const plan = perform(m.parsed, secondsPerBeat(m.bpm));
    return { id: m.id, gap: (plan[plan.length - 1].on - plan[0].on) / (plan.length - 1) };
  }).sort((a, b) => b.gap - a.gap);
  assert.ok(slowest[0].gap <= 1.1 + 0.02, `${slowest[0].id} averages ${slowest[0].gap.toFixed(2)} s a note`);
  // The 12/8 Nocturne (written in eighth notes) plays at an eighth-note pulse.
  assert.ok(byId(lib, 'chopin-nocturne-op9-2').bpm >= 120);
});

test('tries: stars and points for the clean run, none for a skip', () => {
  assert.deepEqual([1, 2, 3, 7].map(starsForTry), [3, 2, 1, 1]);
  assert.equal(starsForTry(0), 0);
  assert.ok(pointsForTry(8, 1, 0) > pointsForTry(8, 2));
  assert.ok(pointsForTry(8, 2) > pointsForTry(8, 3));
  assert.equal(pointsForTry(8, 3), pointsForTry(8, 9));
  assert.ok(pointsForTry(8, 1, 4) > pointsForTry(8, 1, 0), 'a streak adds to a first-try finish');
});
