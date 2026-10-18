// Skipping one shot of a cutscene (story/cutscene.js), pure so the node
// tests can load it.
//
// finishShot runs the rest of a shot in small steps, the way the cutscene's
// update does each frame: the clocks move on, the shot's act gets k up to 1,
// and tick (the set's update: figures walking, vehicles driving) runs with
// the same dt. So what a shot builds up over its length (a car driven so
// far, a figure walked to the door) is where the next shot starts, as if it
// had played to its end.
//
// PressGate turns presses into skips: one press, one skip, and none within
// `cool` seconds of the last (or of the start, so a press still down from
// the menu that opened the cutscene never skips its first shot).
export const NEXT_COOL = 0.3;   // seconds between two shot skips
export const FF_STEP = 1 / 60;  // the step a skipped shot is run to its end with

// clock: { t, shotT } (seconds into the cutscene, into the shot); shot: { dur, act?(k, dt, t) }
export function finishShot(shot, clock, tick = null, step = FF_STEP) {
  if (!shot) return 0;
  let n = 0;
  for (; clock.shotT < shot.dur && n < 10000; n++) {
    const last = shot.dur - clock.shotT <= step, dt = last ? shot.dur - clock.shotT : step;
    clock.t += dt; clock.shotT = last ? shot.dur : clock.shotT + dt;   // (the last step lands on the end exactly: k = 1)
    shot.act?.(Math.min(1, clock.shotT / shot.dur), dt, clock.shotT);
    tick?.(clock.t, dt);
  }
  clock.shotT = Math.max(clock.shotT, shot.dur);
  return n;
}

export class PressGate {
  constructor(cool0 = 0.35, cool = NEXT_COOL) { this.left = cool0; this.cool = cool; }
  // a frame: dt seconds passed, edge = a press began since the last frame; true: skip a shot
  take(dt, edge) {
    this.left = Math.max(0, this.left - dt);
    if (!edge || this.left > 0) return false;
    this.left = this.cool;
    return true;
  }
}
