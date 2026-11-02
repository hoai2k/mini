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
  player (the springtail did this with `placeZone` before it moved to the
  director). Static obstacles
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
while every area a player has already seen stays as it was. And: "for placed
obstacles I mean more like events or enemies etc. Things you can jump over or
walk around can be in safe areas too, because you can just avoid them."

- **The director places enemies and events, not scenery.** Predators, a
  boss, weather that starts (the rain), the portal: these come from the
  director (`prototypes/shared/director.js`), one at a time, in the world's
  order. Scenery, ambient life and avoidable static hazards (sundews, plants,
  traps you can walk round or jump over) are pre-placed as before, anywhere,
  early or late, safe areas included.
- **Explored stays constant.** Whatever a player has seen (a coarse grid of
  cells over the ground, or a 3D grid in the volumetric worlds, marked from
  every split-screen view each frame: inside its frustum and within a set
  distance of what it frames) is never changed behind their back: nothing
  placed, moved or removed there. A creature can still walk or swim on into
  seen water; that is behaviour, not placement.
- **The next encounter is placed ahead.** When a player has had their calm
  break after one encounter (a few seconds of moving clear of it; the first
  after a short warm-up), the next one in the world's order is placed in
  unexplored space near them, in the direction they're moving, out of every
  view, a short way off (so it arrives soon, but not immediately). If there is
  no room there it goes to the side, then farther out, then to the nearest
  unseen spot anywhere. One placed but not yet seen may be moved again (unseen
  to unseen) when the player heads elsewhere. Where the walkable world is
  narrow, "ahead" is along the way the player is going and every spot is
  snapped onto it: the tardigrade's spokes of leaves (Milnesium onto a wet
  leaf of the spoke the leader is heading out along, the pool onto that
  spoke's rim: `prototypes/tardigrade/encounters.js`). The mite
  (`prototypes/mite/layout.js`) and the tardigrade use the director too.
- **Nothing is skipped.** Encounters come strictly in order; the boss and the
  portal are placed only after the player has met every earlier encounter. A
  player who hangs about in a safe area still gets them: if they linger, the
  next encounter is placed near them (in unexplored space, out of view), and
  in the end the portal and its boss too. An encounter someone has seen but
  walked away from (or watched a long while without going to it) counts as
  met; it is never moved, so it can't hold the game up.
- **Multiplayer.** Progress through the order is shared. Each encounter is
  placed for the player who is furthest along it; the others meet it where it
  is, or the next one placed near the leader.
- **Rings are the fallback.** A world that hasn't adopted the director yet
  keeps its rings round the start (above). The springtail world was the first
  to use the director (`prototypes/springtail/README.md`, "The way out"; its
  portals are now fixed: "Per-world placement", below);
  the amoeba (`prototypes/amoeba/README.md`, "The slide") and the paramecium
  (`prototypes/paramecium/README.md`, "Placed as you go": a 2D darkfield
  slide since 2026-11-02, the director in 2D, five encounters including the
  giant amoeba) followed; how to adopt it is at the top of
  `shared/director.js`.
  The bacterium (`prototypes/bacterium/README.md`, "The way: placed as you
  go": the gates in order, the breaks held longer while the army is short,
  kin and prey kept near every player) and the phage
  (`prototypes/phage/README.md`, "Threats and pacing": a 3D grid, the decoys
  then the portal, flocs, UV shafts and big cells as scenery) use it too.

## Per-world placement

The owner (2026-11-01): "For other worlds I will play them first before
seeing what we might want in terms of distribution, but we can have the
dynamic distribution the default if we haven't specified any other."

- **The dynamic director is the default.** A world places its enemies,
  events, boss and portal as you go (above) unless its README says
  otherwise.
- **Springtail: fixed portals with resident spiders and indicator plants**, at
  the owner's request ("place the portals ... in random noise generated
  locations with a certain average distribution (so it's still random, but
  not influenced by player behavior) and certain plants indicate that you're
  coming close to a portal ... the spiders hunt within a certain radius and
  return to the portal, so you could follow the spiders to their portal").
  Sixteen portal rafts are laid out before play by seeded blue noise with a
  coverage check (every bearing from the start reaches a portal's
  surroundings in ~30–60 s of rushing), each with its own wolf spider that
  goes out on rounds of its hunting ground and back to its raft, and bog
  pondweed growing thick in that ground and rare elsewhere. The director
  still places Stenus, the strider and the rain as you go, in order; the
  portals stay sealed until those are met, and anyone who reaches a hunting
  ground early has the rest placed round them at once
  (`prototypes/springtail/README.md`, "The way out").
- **A default path to a portal** (the owner, 2026-11-01: "For dynamically
  generated levels, let's have a default path to a portal, but just
  dynamically generate the other directions if the player goes off in
  another direction"): a director world may lay its whole order (each
  encounter, then the boss and portal) along a bearing from the start on the
  first frame, at the distances a rush would meet them, out of sight; off
  that bearing it places as you go as before (`shared/director.js`
  `defaultPath`, `portals()`; the phage is the first:
  `prototypes/phage/README.md`, "The default path"). The portal there stays
  sealed until every earlier encounter is met. Every director world has one
  now: the mite, the amoeba and the paramecium along a bearing off to the
  side of the opening view, the tardigrade out along one spoke (the 240°),
  and the bacterium, whose field has no room for its gates' breaks and
  army-size holds, lays only the host there (its gates still placed as you
  go); each world's README says where.
- **The Portal arrow** (Settings, default off): every world points an arrow
  at the edge of each view to its nearest portal, with the distance beside it
  (`shared/landmark.js` `portalArrowOn`; how to wire a world is at the top of
  `shared/director.js`).
- **Entering a portal is deliberate** in every world: standing in its area
  while it is open shows "Y Enter the portal", and Y goes through
  (`game/README.md`, "Entering a portal (Y)").

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
