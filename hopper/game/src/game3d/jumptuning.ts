/** Jump tuning for the 3D edition: every number that shapes the spring, in
 * one place so the feel can be changed without reading the controller.
 *
 * `controller.ts` spreads this straight into `MOVE` under these same names,
 * so this file is the only place any of them is written down. Nothing here
 * is read at run time from disk -- edit, then `pnpm build:pages`.
 *
 * ## Two jumps
 *
 * **A is the jump.** It fires the instant the button goes down, at the speed
 * that reaches `jumpApexMax`, and holding A keeps the whole arc. Let go
 * while he is still going up and the rise is cut to `jumpCut` of its speed,
 * which lands a tap at `jumpApexMin`. Everything between is a matter of how
 * long the button is held -- an ordinary jump, with no pause and no wind.
 * Keep holding past the top and the wings take over as they always did:
 * hover, then glide.
 *
 * ## How the spring works
 *
 * **LB is the spring**, the super jump: held on the ground it winds up, and
 * letting go launches it. For the first `tapWindow` seconds nothing is given
 * up -- Hopper keeps running, so a mis-tap never costs a stride -- and a
 * release inside that window is the smallest spring there is, taken at full
 * stride. Hold past it and he stops where he stands and the wind begins,
 * reaching full `chargeTime` seconds after the press. The wind fraction `c`
 * runs 0 (a tap, or the instant the wind starts) to 1 (full).
 *
 * **Power.** The wind sets one launch speed, written here as the height it
 * would reach thrown straight up: `chargeApexMin` at a tap rising to
 * `chargeApexMax` at a full wind. `chargeApexMax` is therefore the highest
 * jump in the game.
 *
 * **Aim.** The stick sets the angle the launch leaves at, measured from the
 * ground. Pushed fully forward it is `aimForward` -- a flat, fast lunge
 * rather than a jump. Neutral it is `aimNeutral`. Pulled fully back it is
 * `aimBack`, straight up. A half-pushed stick lands halfway between, and a
 * stick pushed sideways aims sideways at `aimNeutral`. Pulling back never
 * launches him backwards: the backward part of the stick only stands the
 * launch up, and what forward or sideways part is left sets the direction.
 * A tap cannot reach the flattest angle -- at no wind, fully forward is
 * `aimForwardTap` instead, so the lunge has to be earned.
 *
 * **Lunge.** The flatter the launch, the shorter its flight, so a flat angle
 * would otherwise cover little ground. `lungeBoost` adds horizontal speed at
 * the flat end (fading to nothing as the launch stands up) so a full-forward
 * spring reads as a lunge. It does not touch the height.
 *
 * ## What the numbers below currently produce
 *
 * Running at `run` (68 m/s) under standard gravity. "Held" is how long A was
 * down, the free `tapWindow` included; "pace" is ground covered per second
 * over the whole manoeuvre, that hold included, against running the same
 * stretch:
 *
 * | held   | stick        | angle | apex  | ground | pace  |
 * | ------ | ------------ | ----- | ----- | ------ | ----- |
 * | tap    | forward      |  25°  |   4 m |   45 m | 1.36x |
 * | 0.25 s | forward      |  25°  |   4 m |   62 m | 1.24x |
 * | 0.75 s | forward      |  21°  |  14 m |  152 m | 1.62x |
 * | 1.5 s  | forward      |  15°  |  16 m |  262 m | 1.73x |
 * | 1.5 s  | half forward |  30°  |  60 m |  481 m | 2.24x |
 * | 1.5 s  | neutral      |  45°  | 120 m |  550 m | 2.03x |
 * | 1.5 s  | fully back   |  90°  | 240 m |    0 m |   --  |
 * | tap    | neutral      |  45°  |  11 m |   55 m | 1.00x |
 *
 * So a tap never loses ground, a hold barely past the window is still that
 * same tap, a mid-angle wind is the fastest way across a district, and fully
 * forward is a flat dart that crosses a gap in under a second. The highest
 * jump in the game is the 240 m one, pulled fully back.
 *
 * `qa/tests/engine3d.mjs` sections 2, 5 and 17 hold this contract: change a
 * number here and they will tell you what moved.
 */
export const JUMP = {
  // ---- The jump (A) -----------------------------------------------------
  /** The height a jump reaches when A is tapped and let straight go, in
   * metres: about two of Hopper's own heights. */
  jumpApexMin: 26,
  /** ...and when A is held the whole way up: about seven of them. This is
   * the ordinary jump's ceiling; the spring is what goes higher. */
  jumpApexMax: 96,
  /** What is left of the rise when A is released on the way up. It is
   * `sqrt(jumpApexMin / jumpApexMax)` -- change either apex and this should
   * follow, or a tap stops landing where `jumpApexMin` says it does. */
  jumpCut: 0.52,

  // ---- The arc ----------------------------------------------------------
  /** Downward pull, m/s². A region's own gravity multiplies this. */
  gravity: 120,
  /** Falling pulls this much harder than rising: up quick, down sharp. */
  fallGravity: 1.4,

  // ---- The spring -------------------------------------------------------
  /** Seconds LB can be held before Hopper gives anything up. Release inside
   * this and the spring is its smallest, taken without breaking stride;
   * hold past it and he stops and the wind starts. */
  tapWindow: 0.3,
  /** Seconds LB must be held, counted from the press, to reach a full wind.
   * The first `tapWindow` of it is the free hop, so the wind itself builds
   * over `chargeTime - tapWindow`. Holding past this adds nothing, so
   * over-holding only costs the time. */
  chargeTime: 1.5,
  /** The wind's power, written as the height it reaches thrown straight up.
   * At a tap: a small hop that costs nothing to take mid-run. */
  chargeApexMin: 23,
  /** ...and at a full wind. This is the highest jump in the game. */
  chargeApexMax: 241,
  /** Launch angle above the ground with the stick pushed fully forward at a
   * full wind: flat, so it reads as a lunge rather than a jump. Radians. */
  aimForward: (15 * Math.PI) / 180,
  /** ...and fully forward at no wind, so a tap is still a hop you can clear
   * something with. The flattest angle is earned by winding. */
  aimForwardTap: (25 * Math.PI) / 180,
  /** Launch angle with the stick neutral, and the angle a sideways push
   * leaves at. */
  aimNeutral: (45 * Math.PI) / 180,
  /** Launch angle with the stick pulled fully back: straight up. Pulling
   * back stands the launch up; it never throws Hopper backwards. */
  aimBack: (90 * Math.PI) / 180,
  /** Extra horizontal speed at the flattest angle, fading to nothing as the
   * launch stands up. Buys the lunge its ground back without buying height. */
  lungeBoost: 1.4,
  /** The crouch. How far the body sinks at a full wind, in metres, and how
   * far it tips back as the aim stands up (radians at straight up). */
  crouchSink: 7,
  crouchAim: 0.62,
  /** Full wind: the ready signal. Rumble strength and milliseconds, and the
   * throb the body takes on so it reads without a controller in hand. */
  readyRumble: 0.55,
  readyRumbleMs: 130,
  readyThrob: 0.05,
  /** A jump away from a ceiling (inverted gravity), as a fraction of the
   * impulse: a hop that comes back rather than a leap that leaves. */
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
  /** Hover: A still held past the top of a jump (or held from a fall) holds
   * altitude on beating wings this long. */
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
  /** Rebounding off a stomped shadow, plain and off a hover or glide. A
   * stomp is a kick downward rather than a trampoline, so the rebound is
   * deliberately short. */
  bounceApex: 28,
  bounceApexHeld: 42,
  /** ...and sharp: while he is rising off a back, gravity pulls this much
   * harder, so he leaves faster than the apex alone would need and is over
   * the top in about half the time. It is the snap of the kick, not the
   * height, that says the stomp landed. */
  bounceGravity: 1.9,
  /** Wall kick: up, and away from the face. */
  wallKickUp: 62,
  wallKickAway: 26,
} as const;
