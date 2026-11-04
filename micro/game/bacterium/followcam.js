// The follow camera (the owner, 3 November 2026: "a follow camera, which allows movement on the
// screen and then as you move it starts following you (instead of being directly locked to your
// movement) and does a little look ahead in your direction of movement. RS can adjust this
// positioning by holding a look ahead in any given direction").
//
// One per player (main.js; each split view shows its own players'), all in slide µm, scaled by the
// field height shown so it feels the same at every zoom:
//   dead zone  the target (the flock's middle, or your cell) moves freely within FOLLOW.dead of the
//              field height round the camera's base point before the base moves at all;
//   follow     past it, the base catches up with a critically damped spring (FOLLOW.omega) toward
//              the zone's edge, moving with the target: eased, never locked, no lag in a steady run;
//   look-ahead along the target's velocity, up to FOLLOW.ahead of the field at full run speed,
//              eased in and out over FOLLOW.aheadT s, so a reversal swings it through, not across;
//   RS look    held, the right stick adds an offset in its direction up to FOLLOW.look of the field
//              (scaled by how far it is pushed), eased; released, it eases back.
// The camera's point is base + look-ahead + RS look.

export const FOLLOW = {
  dead: 0.16,   // dead-zone radius, × field height
  omega: 4.5,   // spring rate (1/s) of the catch-up past the dead zone (critically damped)
  ahead: 0.22,  // look-ahead at full speed, × field height
  aheadT: 0.9,  // s: how the look-ahead eases in and out
  vRef: 45,     // µm/s: full run speed (full look-ahead)
  look: 0.4,    // RS look at full tilt, × field height
  lookT: 0.25,  // s: how the RS look eases in and out
};

export function createFollow(x = 0, y = 0) {
  return { bx: x, by: y, vx: 0, vy: 0, ax: 0, ay: 0, lx: 0, ly: 0, x, y };
}

/** Put the camera on (x, y) at once, with no look-ahead or look (a respawn, a teleport, a new game). */
export function snapFollow(F, x, y) {
  F.bx = F.x = x; F.by = F.y = y; F.vx = F.vy = F.ax = F.ay = F.lx = F.ly = 0;
  return F;
}

/**
 * Step the camera by dt toward target (tx, ty) moving at (vx, vy) µm/s, with the right stick
 * look = { x, y } (-1..1, y up on screen = +y on the slide), for a field fieldH µm tall.
 */
export function stepFollow(F, dt, tx, ty, vx, vy, look, fieldH) {
  if (!(dt > 0)) return F;
  // the dead zone: the goal is the nearest point that has the target inside the zone
  const r = FOLLOW.dead * fieldH;
  const dx = tx - F.bx, dy = ty - F.by, d = Math.hypot(dx, dy);
  let gx = F.bx, gy = F.by, gvx = 0, gvy = 0;
  // (past the zone the goal moves with the target, so a steady run is followed with no lag beyond the zone)
  if (d > r) { gx = tx - (dx / d) * r; gy = ty - (dy / d) * r; gvx = vx; gvy = vy; }
  // a critically damped spring toward it (exact for a goal moving steadily over the step)
  const w = FOLLOW.omega, e = Math.exp(-w * dt);
  for (const [p, v, g, gv] of [['bx', 'vx', gx, gvx], ['by', 'vy', gy, gvy]]) {
    const x0 = F[p] - g, v0 = F[v] - gv;
    const c = v0 + w * x0;
    F[p] = g + gv * dt + (x0 + c * dt) * e;
    F[v] = gv + (c - w * (x0 + c * dt)) * e;
  }
  // look-ahead along the motion
  const sp = Math.hypot(vx, vy), k = sp > 1e-6 ? (Math.min(1, sp / FOLLOW.vRef) * FOLLOW.ahead * fieldH) / sp : 0;
  const ka = 1 - Math.exp(-dt / FOLLOW.aheadT);
  F.ax += (vx * k - F.ax) * ka; F.ay += (vy * k - F.ay) * ka;
  // the right stick's look
  const lx = look ? look.x : 0, ly = look ? look.y : 0, lm = Math.hypot(lx, ly), lk = lm > 1 ? 1 / lm : 1;
  const kl = 1 - Math.exp(-dt / FOLLOW.lookT);
  F.lx += (lx * lk * FOLLOW.look * fieldH - F.lx) * kl; F.ly += (ly * lk * FOLLOW.look * fieldH - F.ly) * kl;
  F.x = F.bx + F.ax + F.lx; F.y = F.by + F.ay + F.ly;
  return F;
}

/**
 * The default field for a swarm (the owner, 2026-11-03: "The default camera should also slowly zoom out
 * as your group becomes bigger and bigger"): the field height (µm) that fits a flock of `army` cells
 * spread `extent` µm from its middle, never below the species' own field `base` nor above AUTO.max.
 * main.js eases toward it over AUTO.ease s; the player's LT/RT zoom multiplies it.
 */
export const AUTO = { perR: 3.6, pad: 12, perExtent: 2.5, max: 200, ease: 2.5 };
export function autoFieldFor(army, extent, base = 45) {
  if (!(army > 1)) return base;
  const R0 = 1.05 * Math.sqrt(army) + 1.2; // the flock's comfortable radius (collective.js)
  return Math.min(AUTO.max, Math.max(base, AUTO.perR * R0 + AUTO.pad, AUTO.perExtent * (extent || 0) + 10));
}
