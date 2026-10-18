// How long a cutscene subtitle needs on screen, and how long a shot must last
// so its last subtitle can be read. Pure (the node tests use it too). The
// subtitles live in js/text_config.js, so a longer line written there makes
// its shot hold a little longer rather than cutting the reader off.
// A medium-speed reader of 8 to 14 (the game's players): about 3 words a
// second, and never less than a second and a half for a line. (Until the
// player could hold B to pause a cutscene this was 0.055 s a character, about
// 18 characters or 3.4 words a second, at least 2 s.)
export const WORDS_PER_SECOND = 3, MIN_READ = 1.5;
export const words = (text) => String(text ?? '').split(/\s+/).filter(Boolean).length;
export const readTime = (text) => Math.max(MIN_READ, words(text) / WORDS_PER_SECOND);
// shot: { dur, lines: [{ at, text }], fadeOut }
export function shotDuration(shot) {
  const L = shot.lines ?? [];
  if (!L.length) return shot.dur;
  const last = L[L.length - 1];
  return Math.max(shot.dur, last.at + readTime(last.text) + (shot.fadeOut ? 0.4 : 0));
}
