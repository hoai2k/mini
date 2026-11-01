# The encounter pattern (every world)

The owner's direction for every Micro Zoom world (2026-11-01), first built in
the springtail world and then applied to the rest. Each world's README says how
it follows this; where a world departs from it, the README says why.

## A series of encounters and exploration, not a race

- **Rings round the start, the same in every direction.** A short warm-up of
  calm space (a few seconds of moving: two or three screen widths), then the
  first obstacle, a short calm break, the next obstacle, and so on, out to the
  portal and its boss, the obstacles spaced roughly evenly along the way (no
  rule that holds them back to the second half). Whichever way the player heads, they meet the same kinds
  of obstacle at about the same distances. No long stretches of pure travel.
- **Rushing through takes about a minute; dealing with the obstacles makes it
  about three.** Obstacles come soon, but never immediately.
- **One instance can serve a ring.** A predator (or other obstacle) may be
  moved round its ring to meet whoever is approaching, as long as nobody can see
  it move, it is not engaged with anyone, and it is never placed on top of a
  player (springtail: `placeZone` in `springtail/main.js`). Static obstacles
  (plants, traps, currents) are laid out as a ring of clusters close enough
  that every bearing meets one.
- **The portal (the way on) appears at a set distance in whatever direction
  the player first gets far enough**, out of their view, and is guarded by the
  world's boss. The boss blocks it: reaching it while the boss is on guard
  turns you back; you have to do something simple to get in (lure the boss
  away, distract it, drive it off). The arrow (`shared/landmark.js`) is hidden
  until the portal has been found, then points to it.
- **The portal looks like somewhere you want to be**, with no text about it:
  the shared golden sparkle and glow (`shared/portal.js`), the same gold as the
  super-gene glow (`design/super-gene-return.html`), the same in every world
  (per-world options for scale and colour balance only).
- **Entering it is continuous:** a success cue, a slow-down to a freeze frame,
  and a camera move from the frozen scene into the next world's opening view,
  with the next world loaded in the background during the animation (the
  protocol is in `game/README.md`).

## Everything is action

- **No hidden or abstract clocks:** no oxygen, no drying film, no starvation,
  no hunger meter that runs the player down, no time limits. A player can stay
  in a safe area forever.
- **Every danger is visible and avoidable.** A dangerous current shows on
  screen (drifting particles, streaks, a visible plume) where it flows; a toxin
  shows as a visible cloud; a predator's reach is readable from its behaviour.
- **Food and health are encounters, not upkeep.** Eating can heal, power up or
  score; going without food never kills.
- **Lives and respawns stay simple:** a lost life puts you back in a safe spot
  near where you were (or at the start), never further back than that.
