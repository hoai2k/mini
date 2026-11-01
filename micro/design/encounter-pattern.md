# The encounter pattern (every world)

The owner's direction for every Micro Zoom world (2026-11-01), first built in
the springtail world and then applied to the rest. Each world's README says how
it follows this; where a world departs from it, the README says why.

## A series of encounters and exploration, not a race

(The rings below were the first version; the director, further down, places the
same sequence dynamically and takes precedence where a world uses it.)

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
  away, distract it, drive it off). There is no arrow (`shared/landmark.js`
  draws no forward mark): every direction leads to a portal, and its golden
  sparkle is the only marker.
- **The portal looks like somewhere you want to be**, with no text about it:
  the shared golden sparkle and glow (`shared/portal.js`), the same gold as the
  super-gene glow (`design/super-gene-return.html`), the same in every world
  (per-world options for scale and colour balance only).
- **Entering it is continuous:** a success cue, a slow-down to a freeze frame,
  and a camera move from the frozen scene into the next world's opening view,
  with the next world loaded in the background during the animation (the
  protocol is in `game/README.md`).

## Placed as you go (the director)

The owner (2026-11-01): the world doesn't need to be laid out before play.
Things can be placed dynamically, into areas the player hasn't reached yet,
while every area a player has already seen stays as it was.

- **Explored stays constant.** Whatever a player has seen (a coarse grid of
  explored cells, marked from every view) is never changed behind their back:
  nothing placed, moved or removed there.
- **The next encounter is placed ahead.** When a player has had their calm
  break after one encounter, the next one in the world's order is placed in
  unexplored space near them, in the direction they're moving, out of view,
  a short way off (so it arrives soon, but not immediately).
- **Nothing is skipped.** Encounters come in the world's order; the boss and
  the portal are placed only after the player has met every earlier
  encounter. A player who hangs about in a safe area still gets them: if they
  linger, the next encounter is placed near them (in unexplored space), and in
  the end the portal and its boss too.
- **Rings are the fallback.** A world may still pre-place scenery and
  ambient life everywhere; the encounters themselves come from the director
  (`shared/director.js`). In multiplayer, each encounter is placed for the
  player who is furthest along the order, and the others meet it or the next
  one placed near them.

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
