# Milkbottle Midge: Milk Round (45 s)

Dawn, and the Midge rides the back of the milk float along a street of
houses, each set back behind its own front garden at a different depth. A
chalk lane runs up the street from the Midge's hand (green when a house that
wants milk is on it), so the house to aim for is plain. Hold the action to
wind up a throw and let go to lob a pint up the lane: the longer the hold,
the further back it flies. A ring on the ground shows where the bottle will
land and turns green when it is on the step, so the trick is to start
winding up before the house reaches the lane and let go when the ring goes
green. Past the farthest step the wind-up swings back down, so holding on is
no help.

- **Scoring.** A pint on a doorstep scores 1, or 2 right in the middle, on
  the mat ("On the mat! +2"). A bottle that misses smashes: no points lost,
  but the Midge needs 0.7 s to fetch another. A smash near a sleeping dog
  wakes it (−1), and a bottle on the step of a house with a "No milk" card
  comes back (−1). The score never drops below zero. Pass: 16 points.
- **Ramp.** The first four houses are near, with wide steps, no dogs and no
  cards. Then the steps spread from near to far and narrow, houses come
  closer together, the float speeds up from 150 to 235 px/s, the full
  wind-up quickens from 1.35 to 1.15 s, and dogs (30% to 50% of houses) and
  cards (12% to 24%) come more often. The depth that counts as on the step
  stays ±30 px. Close neighbours can't both be reached: choose.
- **Controls.** Controller A / RT, Space or Enter, or a mouse button or
  touch: hold to wind up, release to throw. The stick isn't used; the float
  drives itself. On a phone the view keeps the Midge, the lane and the next
  house in sight.
- **Bots (tests).** A beginner (±26 px off in depth, often late, throws at
  a card house a quarter of the time) scores 19–25 over six seeds; a good
  milkman 38–44; tapping, flinging at random and idling score 0–2.

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
- **f: the Midge pleased and startled** (`sprites.midgeMoods`, 2 x 1): shown
  for a moment after a pint lands, or after a smash, a woken dog or a
  bottle sent back.

## Changes after the audit

1. **Throw lane.** A dashed chalk line now always runs up the street from
   the Midge's hand, green when a house that wants milk is on it.
2. **Ring.** Bigger (62 x 20 at the front), filled, with a thick dashed
   rim; it turns green when it would land on the step of the house in the
   lane.
3. **Depth window.** `tol()` stays at ±30 px all game, and the full wind-up
   slows to 1.35 s, falling only to 1.15 s.
4. **Penalties.** A plain smash costs no points, only a 0.7 s pause to fetch
   another bottle; a woken dog costs 1 (was 2 more on top of the smash); a
   "No milk" house still costs 1. To keep skill visible now that misses are
   cheap, a pint in the middle of the step scores 2 ("On the mat!"), so the
   unit is now points and the pass mark rose from 9 to 16.
5. **Phone view.** `focus()` is `FLOAT_SX + 150`, so the Midge and the next
   house are both in view.
6. **Dog.** The stand-in dog now has a head on its paws, a muzzle and nose,
   a shut eye, a floppy ear and a curled tail.

The presentation differs from the other "slide past" games in its
side-on street, the chalk lane and the depth (how far up the path) that the
hold sets.

## Matched to the painting

The painted Midge (a glass milk bottle with a red-and-white checked cloth
cap) rides the float flipped to face right, as the stand-in did; nothing in
the game depends on where its beak is. Its variants (the throw and the moods)
are now drawn as whole square cells framed like the portrait (feet on the
0.966 line), so they swap in without a jump. The IC-M01e and IC-M01f prompts
now describe the painting (the checked cloth cap, the milk inside, the ochre
wings) and ask for the portrait's framing.

