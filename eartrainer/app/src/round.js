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

/** Press a key. Returns 'correct', 'wrong', 'done' (the last correct note) or 'free' (already solved). */
export function press(round, midi) {
  if (round.done) return 'free';
  if (midi === round.notes[round.pos].midi) {
    round.pos++;
    if (round.pos === round.notes.length) { round.done = true; return 'done'; }
    return 'correct';
  }
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
