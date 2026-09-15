/** Jump tuning for the 3D edition: every number that shapes the spring, in
 * one place so the feel can be changed without reading the controller.
 *
 * `controller.ts` spreads this straight into `MOVE` under these same names,
 * so this file is the only place any of them is written down. Nothing here
 * is read at run time from disk -- edit, then `pnpm build:pages`.
 *
 * ## How the spring works
 *
 * A held on the ground roots Hopper where he stands and winds the spring up;
 * letting go launches it. Nothing fires while the button is down, so a quick
 * tap is a small hop taken without a pause and `chargeTime` seconds is the
 * full charge. The wind fraction `c` runs 0 (a tap) to 1 (full).
 *
 * **Height.** The arc's apex runs from `chargeApexMin` at a tap to
 * `chargeApexMax` at a full wind, straight-line in `c`. With the stick
 * neutral the whole wind goes into height instead of being split between
 * forward and up, multiplying the launch by `chargeUp`; as the stick comes
 * over to full tilt that boost fades out to nothing.
 *
 * **Reach.** The forward throw is not a fixed speed. It is worked back from
 * the arc's own flight time so the spring can be measured against the run it
 * interrupted: over the wind-up and the flight together, a tap keeps exactly
 * the pace Hopper was running at and a full wind covers `chargePace` times
 * the ground in the same time. That is why springing across a district beats
 * running it, and why the bargain holds under every region's gravity and
 * scales with the sprint without another number to keep in step.
 *
 * ## What the numbers below currently produce
 *
 * Running at `run` (68 m/s) under standard gravity, stick held forward:
 *
 * | wind   | apex  | ground | pace vs running |
 * | ------ | ----- | ------ | --------------- |
 * | tap    |  13 m |   62 m | 1.00x           |
 * | 0.75 s | 100 m |  317 m | 1.50x           |
 * | 1.5 s  | 189 m |  641 m | 1.99x           |
 * | 1.5 s sprinting | 189 m | 993 m | 1.97x    |
 *
 * Stick neutral, straight up: 23 m from a tap, 345 m from a full wind.
 *
 * `qa/tests/engine3d.mjs` sections 2, 5 and 17 hold this contract: change a
 * number here and they will tell you what moved.
 */
export const JUMP = {
  // ---- The arc ----------------------------------------------------------
  /** Downward pull, m/s². A region's own gravity multiplies this. */
  gravity: 120,
  /** Falling pulls this much harder than rising: up quick, down sharp. */
  fallGravity: 1.4,

  // ---- The spring -------------------------------------------------------
  /** Seconds of holding A that reach a full wind. Holding past it adds
   * nothing, so over-holding only costs the time. */
  chargeTime: 1.5,
  /** Apex in metres at a tap. Keep it small: this is the hop that should
   * cost nothing to take mid-run. */
  chargeApexMin: 10,
  /** Apex in metres at a full wind. */
  chargeApexMax: 190,
  /** Launch multiplier with the stick neutral, where the wind is not split
   * between forward and up. 1.35 on the speed is about 1.8x the height. */
  chargeUp: 1.35,
  /** Ground covered per second at a full wind, as a multiple of running,
   * counting the wind-up as part of the manoeuvre. 2 means a full spring is
   * twice as fast as running the same stretch; 1 would make it break even. */
  chargePace: 2,
  /** A jump away from a ceiling (inverted gravity), as a fraction of the
   * spring's impulse: a hop that comes back rather than a leap that leaves. */
  ceilingJump: 0.7,

  // ---- The run the spring is measured against ---------------------------
  // These live here because `chargePace` is a multiple of them: change the
  // run and every spring's reach follows it.
  /** Top speed on a light stick, m/s. */
  walk: 34,
  /** Top speed at full tilt, m/s. */
  run: 68,
  /** Stick throw up to which he walks; past it the gallop takes over. */
  walkBand: 0.55,
  /** Multiplier on the top speed while RB is held. */
  sprint: 1.6,

  // ---- After takeoff ----------------------------------------------------
  /** Hover: A held in the air holds altitude on beating wings this long. */
  hoverFuel: 1.8,
  hoverLift: 2.5,
  hoverGrip: 9,
  /** Glide, once the hover fuel is spent: sink rate and forward speed. */
  glideSink: 7,
  glideSpeed: 80,
  glideTurn: Math.PI * 0.6,
  /** Dive (Y in the air): gravity multiplier and terminal speed. */
  diveGravity: 2.5,
  diveTerminal: 190,
  /** Grace after leaving the ground during which a spring still fires, and
   * how long a press is remembered. */
  coyote: 0.12,
  buffer: 0.14,

  // ---- Launched by something other than the legs ------------------------
  /** A spring pad's apex, in metres. */
  springApex: 168,
  /** Rebounding off a stomped shadow, plain and off a hover or glide. */
  bounceApex: 56,
  bounceApexHeld: 84,
  /** Wall kick: up, and away from the face. */
  wallKickUp: 62,
  wallKickAway: 26,
} as const;
