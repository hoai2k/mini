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
  comes back (−1). The score never drops below zero. Pass: 15 points.
- **Difficulty over the round.** One eased curve (`level()`, progress to
  the power 1.6) drives every knob, so the first third stays gentle, the
  middle is about the old average and the end is harder than before. Steps
  start near and wide (depth 450–548, half-width 78) and spread back to
  320–565 and narrow to 50; houses start 420 apart and close to 235; the
  float speeds up from 140 to 245 px/s and the full wind-up quickens from
  1.4 to 1.12 s. The first three houses have no dog or card; after that dogs
  rise from 12% to 55% of houses and cards from 5% to 28%. The depth that
  counts as on the step stays ±30 px. Close neighbours can't both be
  reached: choose.
- **Controls.** Controller A / RT, Space or Enter, or a mouse button or
  touch: hold to wind up, release to throw. The stick isn't used; the float
  drives itself. On a phone the view keeps the Midge, the lane and the next
  house in sight.
- **Bots (tests).** A beginner (±26 px off in depth, often late, throws at
  a card house a quarter of the time) scores 15–23 over twelve seeds (pass
  lowered from 16 to 15 with the ramp, 2026-10-12); a good milkman 30–42;
  tapping, flinging at random and idling score 0–2.

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


## Matched to the delivered art

- **Street.** The painted pavement runs from 615 to 700 (738–840 of 1080
  px) and the road below, so the garden fences now stand at y 615 (was 668).
  A bottle let go at once lands on the pavement at 650 (was 690), and the
  nearest doorstep is at 565 (was 600) so even near houses keep a short
  path. The beginner bot now scores 17–24; pass stays 16.
- **Houses, props, float.** The painted houses, bottle, spilt milk, dogs,
  card and doormat replace the stand-ins in place. The doormat is drawn
  smaller (0.95 x the step's half-width, was 1.4) so it sits on the painted
  step instead of covering it. The painted float matches the stand-in's
  place, and the Midge stands on its crates.
- **Midge.** The painted wind-up holds the bottle in its wing, so the game
  no longer draws a second bottle beside it once `sprites.midgeThrow` is in.
- **Garden path and fence (IC-M01g, delivered).** The left cell's painted
  path (385 x 521 px of paint, narrowing to about a quarter of its width at
  the top) is drawn for every house from the fence up to its doorstep: only
  its lower part is used, cut where the path is as wide as that step wants
  (narrower for houses further back), 120 px wide at the fence and
  stretched to the path's length. The right cell's fence (813 x 143 px of
  paint) is laid end to end along the back of the pavement in 200 px
  lengths, about 35 px tall, with a gap cut where each path comes through.
  The code-drawn path, stepping stones and ink fence are now only the
  stand-ins for when the sheet is missing.
- **Still drawn in code:** the faint green wash of each front garden, and
  the chalk lane, ring, pops and glass bits as game feedback. No new
  requests.
## Second audit (2026-10-09)

Checked against the delivered art; see the second audit in [`AUDIT.md`](AUDIT.md) for what was changed.

## Third audit: pose sizes (2026-10-09)

Every painted pose is drawn so the character is one size, by the scale each cell is painted at (`design/source/pose-scales.json`); a test checks it. See the third audit in [`AUDIT.md`](AUDIT.md).
