// How a melody is played: when each note starts and lets go, and how loud.
//
// A pianist doesn't play a tune as a row of equal, detached notes:
// - Notes join up (legato), each held until just after the next one sounds,
//   the way the sustain pedal is half-changed under a melody. A rest lifts.
// - Long notes, and the last note, are held for their full value and left to
//   ring, as if with the pedal down.
// - Strong beats lean a little; the line swells toward its high point and
//   eases off at the end; a note after a big leap is placed with care.
// - A touch of unevenness (a few milliseconds, a few percent of loudness),
//   the same every time a melody plays, keeps it from sounding mechanical.

/** Seconds per beat for a melody at a playback speed. */
export const secondsPerBeat = (bpm, speed = 1) => 60 / bpm / speed;

/** Small repeatable jitter in -1..1 for note i. */
const jitter = (i, salt) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

/**
 * Plan a performance: [{ midi, on, off, velocity }] with times in seconds from
 * the start. `spb` is seconds per beat.
 */
export function perform(notes, spb) {
  const n = notes.length;
  const lo = Math.min(...notes.map((x) => x.midi));
  const hi = Math.max(...notes.map((x) => x.midi));
  const peak = notes.findIndex((x) => x.midi === hi);
  // Overlap between joined notes: enough to sound connected, not muddy.
  const overlap = Math.min(0.12, spb * 0.22);
  return notes.map((x, i) => {
    const next = notes[i + 1];
    const on = x.at * spb + (i ? jitter(i, 1) * 0.006 : 0);
    const dur = x.beats * spb;
    let off;
    if (!next) off = on + Math.max(dur, 0.9) + 0.9; // the last note rings on
    else {
      const gap = (next.at - (x.at + x.beats)) * spb; // a rest after this note
      const nextOn = next.at * spb;
      if (gap > 0.02) off = on + dur * 0.96; // lift for the rest
      else if (x.beats >= 1.5) off = nextOn + overlap * 1.6; // long note: held, pedalled into the next
      else off = nextOn + overlap; // legato
    }
    // Loudness, 0..1 (the melody's channel sits under the player's keys).
    let v = 0.66;
    const beatPos = x.at % 1;
    if (beatPos < 0.01) v += x.at % 2 < 0.01 ? 0.07 : 0.04; // strong and weaker beats
    else v -= 0.03; // off-beats lighter
    v += hi > lo ? ((x.midi - lo) / (hi - lo)) * 0.06 : 0; // higher notes sing out a little
    if (peak > 0) v += i <= peak ? (i / peak) * 0.05 : (1 - (i - peak) / Math.max(1, n - 1 - peak)) * 0.05; // swell to the high point
    if (x.beats >= 1.5) v += 0.03; // long notes carry
    if (i === n - 1) v -= 0.06; // ease into the last note
    if (i > 0 && Math.abs(x.midi - notes[i - 1].midi) >= 7) v -= 0.03; // a leap lands gently
    v += jitter(i, 2) * 0.025;
    return { midi: x.midi, on, off, velocity: Math.max(0.35, Math.min(0.95, v)) };
  });
}
