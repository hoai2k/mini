# Milkbottle Midge: Milk Round (45 s)

Dawn, and the Midge rides the back of the milk float along a street of
houses, each set back behind its own front garden at a different depth. Hold
the action to wind up a throw and let go to lob a pint up the garden path:
the longer the hold, the further back it flies. A dotted ring on the ground
shows where the bottle will land, so the trick is to start winding up before
the house arrives and let go when the ring sits on the doorstep. Past the
farthest step the wind-up swings back down, so holding on is no help.

- **Scoring.** A bottle on a doorstep with a yellow mat is a pint (+1); a
  "Perfect!" in the middle of the step is just for show. A bottle that
  misses smashes (−1), and one that smashes near a sleeping dog wakes it too
  (−2 more, −3 in all). A house with a "No milk" card on its door wants none:
  a bottle there comes back (−1). The score never drops below zero. Pass: 9
  pints.
- **Ramp.** The first four houses are near, with wide steps, no dogs and no
  cards. Then the steps spread from near to far, narrow (and the depth that
  counts as on the step shrinks from ±30 to ±20 px), houses come closer
  together, the float speeds up from 150 to 235 px/s, the full wind-up
  quickens from 1.25 to 0.95 s, and dogs (30% to 50% of houses) and cards
  (12% to 24%) come more often. Close neighbours can't both be reached:
  choose.
- **Controls.** Controller A / RT, Space or Enter, or a mouse button or
  touch: hold to wind up, release to throw. The stick isn't used; the float
  drives itself. On a phone the view keeps the float and the houses coming
  up in sight.
- **Bots (tests).** A beginner (±26 px off in depth, often late, throws at
  a card house a quarter of the time) scores 10–12; a good milkman 19–21;
  tapping, flinging at random and idling score 0.

## Images (IC-M01)

- **a: the street at dawn** (`scene.milkmidge`): sky, distant roofs, a quiet
  green band where the game draws the houses, the pavement and the road.
- **b: house fronts** (`sprites.milkHouses`, 3 x 2): six fronts, each ending
  at its doorstep; scaled down with depth. The game draws the gardens, paths
  and fences itself.
- **c: props** (`sprites.milkProps`, 3 x 2): the pint bottle, spilt milk and
  glass, the dog asleep and barking, the no-milk card (a picture, no words)
  and the doormat.
- **d: the milk float** (`sprites.milkFloat`), facing left; the game flips it.
- **e: the Midge throwing** (`sprites.midgeThrow`, 2 x 1): winding up and
  the follow-through.
