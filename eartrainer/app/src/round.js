// One melody to answer: the pure rules, no DOM or audio.
//
// The player must press the melody's notes in order. A wrong note counts as a
// mistake but changes nothing else: the player keeps trying until they find
// the right one. Timing is never judged. Redo starts the answer over from a
// clean slate: wrong notes made before it no longer count, so a correct run
// after a Redo is a clean one.

export function createRound(notes) {
  return { notes, pos: 0, mistakes: 0, done: false, misses: new Array(notes.length).fill(0) };
}

/** Press a key. Returns 'correct', 'wrong', 'done' (the last correct note) or 'free' (already solved).
 *  With `freeFirst` (the first note is marked on the keys), a wrong key before
 *  the first note is found is still 'wrong' but isn't counted as a mistake. */
export function press(round, midi, { freeFirst = false } = {}) {
  if (round.done) return 'free';
  if (midi === round.notes[round.pos].midi) {
    round.pos++;
    if (round.pos === round.notes.length) { round.done = true; return 'done'; }
    return 'correct';
  }
  if (freeFirst && round.pos === 0) return 'wrong';
  round.mistakes++;
  round.misses[round.pos]++;
  return 'wrong';
}

export function redo(round) {
  if (round.done) return;
  round.pos = 0;
  round.mistakes = 0;
  round.misses.fill(0);
}

/** The note the player is looking for next (null once solved). */
export const expected = (round) => (round.done ? null : round.notes[round.pos].midi);

/** Three stars for no mistakes, two for a few (a quarter of the notes, at least one), else one. */
export function stars(count, mistakes) {
  if (mistakes === 0) return 3;
  if (mistakes <= Math.max(1, Math.floor(count / 4))) return 2;
  return 1;
}

/** Points: ten a note, less for mistakes, a bonus for a clean answer and a streak of them. */
export function points(count, mistakes, streak = 0) {
  const base = Math.max(count * 3, count * 10 - mistakes * 5);
  const clean = mistakes === 0 ? 25 + Math.min(streak, 10) * 5 : 0;
  return base + clean;
}

// ---------------------------------------------------------------- tries
// A melody is finished by a run with no wrong notes. A run with wrong notes
// isn't scored: the melody comes round again. The stars say which try the
// clean run was; a skipped melody gets none.

/** Stars for finishing cleanly on try `attempt` (1, 2, 3…); 0 for a skip. */
export function starsForTry(attempt) {
  if (!attempt) return 0;
  return attempt === 1 ? 3 : attempt === 2 ? 2 : 1;
}

/** Points for finishing cleanly on try `attempt`: ten a note and a streak
 *  bonus the first time, six a note on the second, three after that. */
export function pointsForTry(count, attempt, streak = 0) {
  if (attempt === 1) return count * 10 + 25 + Math.min(streak, 10) * 5;
  if (attempt === 2) return count * 6;
  return count * 3;
}
