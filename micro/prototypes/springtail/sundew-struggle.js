// Stuck in sundew glue: the struggle. Escape takes active effort of two kinds,
// tugging (each new push or change of direction of the left stick; WASD
// changes on a keyboard) and furcula kicks (A presses), and both together
// count far more than either alone. Stop for PAUSE s and the hold wins: your
// progress slips back and the leaf pulls you deeper; deep enough and you are
// engulfed. One kind of effort alone holds the leaf off only slowly.
export const STRUGGLE = {
  one: 0.03,        // progress per kick with one kind of effort only
  both: 0.07,       // per kick while tugging and kicking together
  window: 0.7,      // s: a tug and an A press this close count as "together"
  pause: 0.8,       // s without a tug or a kick before the hold wins
  slip: 0.25,       // progress lost per s while paused
  sinkPause: 0.35,  // depth gained per s while paused (engulfed at 1)
  sinkOne: 0.12,    // depth gained per s on one kind of effort
  unsink: 0.15,     // depth won back per s while tugging and kicking
  tugAngle: 0.7,    // rad (~40 deg): a change of stick direction this big is a new tug
  stickOn: 0.5, stickOff: 0.25,
  tugGap: 0.12, kickGap: 0.08, // s: the fastest tugs and kicks that count (no turbo)
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function newStruggle() {
  return { t: 0, progress: 0, sink: 0, idle: 0, lastA: -9, lastTug: -9, stickA: null, tugDir: null, thrash: 0, effort: 0 };
}

/**
 * One step. inp: { dashPressed, move: { x, y, m } }.
 * Returns { tug, kick, both, paused, escaped, engulfed }.
 */
export function stepStruggle(S, inp, dt, C = STRUGGLE) {
  S.t += dt;
  const mv = inp.move || { x: 0, y: 0, m: 0 };
  let tug = false, kick = false;
  if (mv.m > C.stickOn) {
    const a = Math.atan2(mv.y, mv.x);
    const fresh = S.stickA === null || Math.abs(wrap(a - S.stickA)) > C.tugAngle;
    if (fresh && S.t - S.lastTug >= C.tugGap) { tug = true; S.stickA = a; S.tugDir = a; S.lastTug = S.t; }
  } else if (mv.m < C.stickOff) S.stickA = null;
  if (inp.dashPressed && S.t - S.lastA >= C.kickGap) { kick = true; S.lastA = S.t; }
  const both = S.t - S.lastA < C.window && S.t - S.lastTug < C.window;
  const n = (tug ? 1 : 0) + (kick ? 1 : 0);
  if (n) { S.progress += n * (both ? C.both : C.one); S.idle = 0; S.thrash = 1; } else S.idle += dt;
  const paused = S.idle > C.pause;
  if (paused) { S.progress -= C.slip * dt; S.sink += C.sinkPause * dt; }
  else if (both) S.sink -= C.unsink * dt;
  else S.sink += C.sinkOne * dt;
  S.progress = Math.max(0, Math.min(1, S.progress));
  S.sink = Math.max(0, Math.min(1, S.sink));
  // the body's thrash: kicked up by each effort, dying away in a pause
  S.thrash = Math.max(0, S.thrash - dt * 1.6);
  S.effort += ((paused ? 0 : both ? 1 : 0.55) - S.effort) * Math.min(1, dt * 4);
  return { tug, kick, both, paused, escaped: S.progress >= 1, engulfed: S.sink >= 1 };
}
