// How long a cutscene subtitle needs on screen, and how long a shot must last
// so its last subtitle can be read. Pure (the node tests use it too). The
// subtitles live in js/text_config.js, so a longer line written there makes
// its shot hold a little longer rather than cutting the reader off.
export const readTime = (text) => Math.max(2, String(text ?? '').length * 0.055);
// shot: { dur, lines: [{ at, text }], fadeOut }
export function shotDuration(shot) {
  const L = shot.lines ?? [];
  if (!L.length) return shot.dur;
  const last = L[L.length - 1];
  return Math.max(shot.dur, last.at + readTime(last.text) + (shot.fadeOut ? 0.4 : 0));
}
