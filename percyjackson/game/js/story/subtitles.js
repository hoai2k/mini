// How long a cutscene subtitle needs on screen, and how long a shot must last
// so its last subtitle can be read. Pure (the node tests use it too). The
// subtitles live in js/text_config.js, so a longer line written there makes
// its shot hold a little longer rather than cutting the reader off.
// A medium-speed reader: about 18 characters a second (roughly 3.4 words,
// the gentle end of film subtitling's 17-20), and never less than a second
// and a half for a line. Counting characters rather than words gives a line
// of long names (Poseidon, Half-Blood Hill) a little more time. Holding B
// pauses a cutscene for a slower reader, and A moves on for a faster one.
export const CHARS_PER_SECOND = 18, MIN_READ = 1.5;
export const readTime = (text) => Math.max(MIN_READ, String(text ?? '').trim().length / CHARS_PER_SECOND);
// shot: { dur, lines: [{ at, text }], fadeOut }
export function shotDuration(shot) {
  const L = shot.lines ?? [];
  if (!L.length) return shot.dur;
  const last = L[L.length - 1];
  return Math.max(shot.dur, last.at + readTime(last.text) + (shot.fadeOut ? 0.4 : 0));
}
