// Leave a full second on the empty leaf before the respawn fade starts.
export const SUNDEW_PHASES = [['strike', 0.45], ['hold', 1], ['eat', 2.2], ['follow', 1], ['fadeOut', 0.6], ['fadeIn', 0.6]];
const ease = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export function digestion(phase, t) {
  if (phase === 'eat') return { white: ease(t / 0.45), dissolve: ease((t - 0.15) / 0.85) };
  if (phase === 'follow' || phase === 'fadeOut') return { white: 1, dissolve: 1 };
  return { white: 0, dissolve: 0 };
}
