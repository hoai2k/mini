/** Kick tuning for the 3D edition: the numbers that shape the spin kick, in
 * one place beside `jumptuning.ts` so the feel can be changed without
 * reading the combat simulation.
 *
 * `combat3d.ts` and `scene.ts` read these directly. Nothing here is loaded at
 * run time from disk -- edit, then `pnpm build:pages`.
 *
 * ## How the kick works
 *
 * X (or B) starts a spin. The hind legs sweep the whole circle around Hopper,
 * so it reaches every side and overhead rather than only his back, and each
 * shadow is hit once per swing. The swing runs `time` seconds; it damages
 * while `hitFrom..hitTo` of that remains, and it parries while `parryFrom`
 * remains -- a longer window than the damage, so turning to meet something is
 * enough. A parried shot becomes Hopper's and flies back at whoever fired it.
 *
 * There is no held guard in this edition. The kick is the whole answer to
 * "something is attacking me", which is why its parry is generous.
 */
export const KICK = {
  /** How long a swing lasts, in seconds, counted down from this. */
  time: 0.5,
  /** The swing damages while the countdown is between these. */
  hitFrom: 0.15,
  hitTo: 0.42,
  /** ...and parries a blow or a shot while it is above this. Wider than the
   * damage window: the parry is the defence, so it should feel forgiving. */
  parryFrom: 0.12,
  /** How far past Hopper's own body the sweep reaches, in metres. */
  reach: 16,
  /** How far above and below his body the sweep counts, in metres. */
  rise: 6,
  /** A parried shot flies back this fast, carrying this much damage. */
  returnSpeed: 120,
  returnDamage: 6,
  /** The arc drawn as he spins: how thick the band is against its radius,
   * how much of the circle it covers (radians), how many turns it makes over
   * the swing, and how bright it starts. */
  arcThickness: 0.055,
  arcSweep: (120 * Math.PI) / 180,
  arcTurns: 2.2,
  arcOpacity: 0.95,
  /** How far up Hopper's body the arc is drawn, in metres: level with the
   * hind legs that swing it, not down among his feet. */
  arcHeight: 9,
} as const;
