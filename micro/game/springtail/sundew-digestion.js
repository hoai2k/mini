// The catch and respawn timings (shared/predation.js createCapture phases).
// No black fade: `fadeOut` is the camera's glide from the catch to the
// respawn spot (main.js placeCamera), `fadeIn` a moment's hand-over, and the
// springtail then re-forms there for REFORM s (main.js, mode 'reform').
// Nothing in a catch is skippable: it is short (the owner, 2026-11-01).
// The sundew: strike, wrapped (hold), digested into drifting white motes
// (eat), a beat on the closed leaf (follow), then the glide and re-forming:
// ~1.9 s from the last mote to control.
export const SUNDEW_PHASES = [['strike', 0.45], ['hold', 0.8], ['eat', 2.2], ['follow', 0.3], ['fadeOut', 0.6], ['fadeIn', 0.05]];
// A predator: strike, hold, eat, then follow it with its meal a moment.
export const CATCH_PHASES = [['strike', 0.45], ['hold', 1.0], ['eat', 2.2], ['follow', 1.4], ['fadeOut', 0.6], ['fadeIn', 0.05]];
export const REFORM = 1.0;
const ease = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export function digestion(phase, t) {
  if (phase === 'eat') return { white: ease(t / 0.45), dissolve: ease((t - 0.15) / 0.85) };
  if (phase === 'follow' || phase === 'fadeOut') return { white: 1, dissolve: 1 };
  return { white: 0, dissolve: 0 };
}

/** Re-forming at the respawn spot, u = 0..1: motes gather, the body fills in white, then colours. */
export function reform(u) {
  return { dissolve: 1 - ease((u - 0.2) / 0.55), white: 1 - ease((u - 0.6) / 0.4) };
}
