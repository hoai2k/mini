# Jackknife Niffy: Snip Snap (45 s)

The Niffy hovers over the park promenade while people stroll along below,
each with a little something that wants snipping: a long hat feather, a
buttonhole flower, a loose thread from a coat hem, a price tag left on a new
hat. Move along the sky and press the action to swoop down; the blades snip
whatever is right below at the bottom of the swoop and the Niffy flies it
off to its nest. A pink ring marks what a swoop from where the Niffy is
would go for; the swoop takes a third of a second to get down, so the ring
already allows for where the walker is going. Nothing is ever cut off a
person: only loose bits and bobs.

- **Scoring.** A snip scores 1, a price tag 2. A child's balloon string is
  not for snipping: the balloon floats away (−1). A snap at the air makes
  the people within 170 px say "Hey!" and hold a hand over their things for
  2.5 s. The Park Keeper on the right watches the pond with his back turned;
  now and then he turns round (a red "!" over him and beside the Niffy, and
  the sky reddens) and then he looks up at the sky (a red-rimmed eye). A
  Niffy caught low in a swoop while he looks is whistled at and dazed for
  1.6 s; that is the whole cost. Pass: 9 snips.
- **Ramp.** For the first 8 s the Keeper never looks round, the walkers are
  slow and there are no balloons. Walkers speed up (90 to 165 px/s, each
  within 5% of that), come a little more often, and people walking the same
  way keep at least 330 px apart, so no more than two ever bunch together.
  After 60% of the game a few carry two things. Children with balloons join
  after 10 s, and the Keeper looks round more often (away 4.2 s to 2.2 s),
  for longer, with less warning (0.9 s to 0.5 s).
- **Controls.** Stick, D-pad, arrows or WASD fly left and right; A, Space or
  Enter swoops. With a mouse or touch the Niffy follows the pointer, and a
  click or tap swoops towards where you tapped (up to 300 px aside). On a
  phone the view follows the Niffy, and the "!" and red eye beside it warn
  of the Keeper even when he is off screen.
- **Bots (tests).** A beginner (±55 px off, careless about the Keeper and
  balloons on one swoop in seven) scores 10–17 over six seeds; a careful
  snipper 15–22; swooping non-stop while sweeping the sky 1–5; idling 0.

## Images (IC-M03)

- **a: the park promenade** (`scene.niffy`): open sky for flying, trees, the
  pond and railings, the promenade, a branch for the nest, a plain place for
  the Keeper.
- **b: the passers-by** (`sprites.niffyWalkers`, 3 x 2): five grown-ups and
  a child walking left, with nothing on them; the game hangs the snippable
  things on them (`SPOT` in the game is measured on the stand-ins and may
  need adjusting when they arrive).
- **c: things to snip** (`sprites.niffyProps`, 3 x 2): feather, flower,
  thread, price tag, balloon (the game draws its string) and the nest.
- **d: the Park Keeper** (`sprites.parkKeeper`, 3 x 1): back turned, glancing
  round, looking up.
- **e: the Niffy swooping** (`sprites.niffyDive`, 2 x 1): blade open, blade
  shut; the game tilts it into the swoop.
- **f: the Niffy hovering and dazed** (`sprites.niffyFly`, 3 x 1): two flap
  frames for hovering, and tumbling after the Keeper's whistle.

## Changes after the audit

1. **Warning.** Beside the Niffy, and bigger over the Keeper: a pulsing red
   "!" while he turns, then a plainly drawn eye (almond white, blue iris,
   red rim and lashes) while he looks; the sky takes a red tint too.
2. **Crowds and aim.** People walking the same way keep at least 330 px
   apart (a spawn waits until its side is clear), so no more than two
   overlap. While hovering, a pink ring circles the thing a swoop would go
   for (red if it is a balloon string).
3. **Variance.** Steadier walkers (speed within ±5%, spawns within ±15%),
   and two things on one walker only after 60% of the game, 15% of the
   time. A snap at the air now makes nearby people hold on to their things
   for 2.5 s, so aiming matters and swooping at random doesn't pay. The
   beginner band is 10–17 (was 7–20), the good band 15–22, mashing 1–5, and
   the pass mark rose from 7 to 9.
4. **Keeper's catch.** No points lost: the 1.6 s daze (was 1.2 s) is the
   cost. A balloon costs 1 (was 2).
5. **Guide order.** Not done here: the order is `MORE_IDS` in
   `game/src/more/index.js`, a shared file, where Snip Snap (3rd) sits right
   before Snip the String (4th). The lead could move one of them.

## Matched to the painting

The painted Niffy is a red pocketknife whose beak is a pair of open blades,
with two more blades as wings. The game draws it so the beak's point is at
the swoop's snipping point: measured on the painting at about (−190, −291)
from the feet (the stand-in's was (−170, −230)), so rotation into the
swoop pivots on the blade tip. Its variants are drawn as whole square cells
framed like the portrait (feet on the 0.970 line), placed by the same tip.
The IC-M03e and IC-M03f prompts now describe the painting (the scissor-like
beak blades, the blades as wings, the pink feathers) and ask for the beak's
point to stay where it is in the portrait.

