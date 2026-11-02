// The microscope's operator (pure: no three.js; focus.test.mjs runs it in
// node). The owner, 2026-11-02: "make it look realistic microscope like ...
// if you move in depth you might appear defocused, and then the microscope
// catches up and refocuses you ... if you're continually moving up and down
// the depth the microscope doesn't follow, it waits for a stable depth before
// refocusing, like a person would."
//
// Each view has its own focal plane (z, µm), separate from the players'
// depth. Every frame the operator is told the depth it should keep in focus
// (its player's, or for a shared view the depth of its most settled player):
//
//   - while that depth is changing (faster than FOCUS.moving µm/s) the knob
//     is left alone: the plane holds where it is and the swimmer goes soft;
//   - once it has stayed put for FOCUS.wait s, the operator turns the fine
//     focus to it: an eased turn over FOCUS.turn[0]..[1] s (longer the further
//     it has to go), with a slight overshoot (about 3 %) and settle;
//   - moving again mid-turn stops the knob where it is, and the wait starts
//     over.
//
// Only the focus lags: the perspective (size and parallax) follows the
// swimmer's depth at once (main.js).

export const FOCUS = { moving: 30, wait: 0.5, turn: [0.5, 0.9], perUm: 1 / 450, overshoot: 0.8, tol: 3 };

export function createFocus(z = 0) {
  return { z, still: 0, last: null, mode: 'hold', from: z, to: z, t: 0, dur: 0, turns: 0, interrupted: 0 };
}

/** The knob's ease: quick to start, slowing in, a slight overshoot (back-out, FOCUS.overshoot) and a settle. */
export function knob(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const c1 = FOCUS.overshoot, c3 = c1 + 1, w = u - 1;
  return 1 + c3 * w * w * w + c1 * w * w;
}

/** Snap the plane to z at once (a teleport, a respawn, the opening). */
export function snapFocus(F, z) { Object.assign(F, { z, still: FOCUS.wait, last: z, mode: 'hold', from: z, to: z, t: 0 }); }

/** One step: target is the depth to keep in focus now. Returns F (F.z is the focal plane). */
export function stepFocus(F, target, dt) {
  if (!(dt > 0)) return F;
  const v = F.last === null ? 0 : Math.abs(target - F.last) / dt;
  F.last = target;
  if (v > FOCUS.moving) {
    F.still = 0;
    if (F.mode === 'turn') { F.mode = 'hold'; F.interrupted++; } // moving again: the hand stops on the knob
  } else F.still += dt;
  if (F.mode === 'hold' && F.still >= FOCUS.wait && Math.abs(target - F.z) > FOCUS.tol) {
    const d = Math.abs(target - F.z);
    F.mode = 'turn'; F.from = F.z; F.to = target; F.t = 0; F.turns++;
    F.dur = Math.min(FOCUS.turn[1], FOCUS.turn[0] + d * FOCUS.perUm);
  }
  if (F.mode === 'turn') {
    F.to = target; // (still: it barely drifts)
    F.t += dt;
    const u = F.t / F.dur;
    F.z = F.from + (F.to - F.from) * knob(u);
    if (u >= 1) { F.z = F.to; F.mode = 'hold'; }
  }
  return F;
}
