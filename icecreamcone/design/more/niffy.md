# Jackknife Niffy: Snip Snap (45 s)

The Niffy hovers over the park promenade while people stroll along below,
each with a little something that wants snipping: a long hat feather, a
buttonhole flower, a loose thread from a coat hem, a price tag left on a new
hat. Fly along the sky, and up or down between a high line (blade tip at
y 150) and a low one (y 385, about 70 px above the tallest hat feather).
Press the action to swoop. A pink ring shows what a swoop would go for: the
nearest thing whose spot, when the blade gets down to it, is within 90 px
across (35 px while flying flat out, so you line up rather than sweep). The
swoop homes onto that thing as it walks, so **a thing in the ring is
snipped**, unless its person is holding on, it is a balloon, or the Keeper
catches you first. Swoops take longer the further down they go (a pixel
every ~1/1050 s, at least 0.14 s), and the climb back likewise, so cruising
low snips quickly. Nothing is ever cut off a person: only loose bits and
bobs.

- **Scoring.** A snip scores 1, a price tag 2. A child's balloon string is
  not for snipping: the balloon floats away (−1). A swoop at nothing makes
  the people within 170 px hold a hand over their things for 1.8 s, with a
  "!" over them and a "Hmph!"; swooping again at someone holding on pops
  "They're holding on!".
- **The Keeper.** He watches the pond with his back turned; now and then he
  turns (a red "!") and then looks up (his eye). While he looks, his
  noticing fills an ink ring round the eye (shown over him and beside the
  Niffy, the eye opening wider as it fills): slowly for a Niffy cruising
  high and still (a whole watch is safe up there), fast for one low down
  (about a second), faster still while it swoops. Full, and he whistles:
  "Peep! Caught!" and the Niffy is dazed for 1.6 s; no points lost. It
  drains while he looks away. High is safe but slow; low is quick but
  noticed quickly. Pass: 10 snips.
- **Ramp.** For the first 8 s the Keeper never looks round, the walkers are
  slow and there are no balloons. Walkers speed up (90 to 165 px/s), come a
  little more often, and people walking the same way keep at least 420 px
  apart. After 60% of the game a few carry two things. Children with
  balloons join after 10 s, and the Keeper looks round more often (away
  4.2 s to 2.2 s), for longer, with less warning.
- **Controls.** Stick, D-pad, arrows or WASD fly left and right, and up and
  down (▲ higher, ▼ lower); A, Space or Enter swoops. With a mouse or touch
  the Niffy follows the pointer across and in height (between the two
  lines), and a click or tap swoops for whatever the ring shows near where
  you tapped (up to 300 px aside). On a phone the view follows the Niffy,
  and the Keeper's "!", eye and meter show beside it.
- **Bots (tests).** A beginner (lines up within ±55 px, stays at its
  starting height, careless one swoop in seven) scores 13–17 over six
  seeds; a careful snipper that flies low while the Keeper's back is turned
  and climbs as he turns scores 15–23; swooping non-stop while sweeping the
  sky scores 0–4 at either height; idling 0. With the Keeper watching,
  a Niffy high and still is never caught in 4 s, one low is caught in about
  1.1 s, one swooping low in 0.7 s.

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


## Matched to the delivered art (scene)

- **Promenade.** The painted paving starts at y 733, so the walkers' feet
  at 800 stand on it. The Park Keeper now stands at y 735 (was 640), on
  the promenade's back edge in front of the painted railing, instead of
  floating over the railing at the pond's edge.
- **Nest.** The painted branch reaches in across the top left; the nest
  (stand-in until `sprites.niffyProps` arrives) now sits on it at (300, 122)
  instead of at the corner under the HUD, and snippings fly there. The
  stand-in branch follows the same line.
- **Sky.** The Niffy hovers at y 230 in the open sky above the trees; no
  change needed.
- **Still stand-in:** the passers-by, the Keeper, the things to snip, the
  nest and the Niffy's flying and swooping poses (IC-M03b–f, requested).

## Matched to the delivered art (walkers, props, Keeper, poses)

- **Where things hang.** `PAINTED_SPOT` gives, for each of the six painted
  walkers, where the feather (back of the hat band), price tag (front of the
  brim), flower (lapel) and loose thread (back of the hem) go, measured on
  the sheet from the middle of each figure's outline and up from its feet.
  The child's balloon string starts at its raised fist and is snipped just
  above it. The stand-in `SPOT` is kept for when the sheet is missing.
- **Spacing.** The painted people are wider than the stand-ins, so people
  walking the same way now keep 420 px apart (was 330). Bots after the
  change: beginner 11–17, careful 15–19, non-stop swooping 1–7, idle 0;
  pass stays 9.
- **Niffy's poses.** The flying, dazed and swooping cells are not framed
  like the portrait (they float in their cells), so each is placed by its
  own measured blade tip (`POSE_TIP`, in 1024 px cells, drawn at the
  portrait's scale): the open blades' point stays on the snipping point,
  and the swoop still pivots there.
- **Keeper.** The three painted Keepers stand 340 tall on the promenade's
  back edge (y 735) in front of the railing, as placed for the scene; the
  red warning sits above his cap.
- **Props and nest.** The painted feather, flower, thread, tag, balloon
  and nest replace the stand-ins in place. "Hey!" is now brick red and
  bolder so it reads against the trees.
- **Still drawn in code:** the balloon string, the hand held over a thing
  when someone is wary, the aim ring, the warning and the pops. No new
  requests.

## Second audit (2026-10-09)

Checked against the delivered art; see the second audit in [`AUDIT.md`](AUDIT.md) for what was changed.

## Changes after playtesting (the swoop, height and being seen)

The user found swoops "only sometimes work" and asked to fly higher and
lower, with low quicker but riskier.

1. **Reliable swoops.** A swoop used to aim within 110 px but then needed
   the blade within 38 px of the thing at arrival, so many ringed swoops
   missed. Now the swoop homes onto the ringed thing and snips it; the ring
   window is 90 px (35 px flying flat out) and is exactly what a press
   would do. With the pointer, the ring and the swoop use the tap's x.
2. **Wariness you can read.** People holding on show a cupped hand over
   their thing, a "!" in a bubble over them and a "Hmph!"; swooping at them
   pops "They're holding on!" instead of a bare "Snap!". It lasts 1.8 s
   (was 2.5 s).
3. **Height.** Up and down on the stick or keys, or the pointer's height,
   move the cruising line between y 150 and y 385; swoop and climb times
   scale with the distance.
4. **Being seen.** The Keeper no longer catches any swoop while he looks;
   his noticing fills a meter by height and by swooping, and only a full
   meter gets the Niffy whistled at and dazed.
5. **Controls and balance.** A "Fly higher / lower" line in the controls and
   new tips. Pass rose from 9 to 10 (the beginner bot's lowest is 13; the
   best mashing run 4). New tests: a ringed swoop on a walking person snips
   it, the stick sets the height and low swoops are quicker, the meter fills
   slowest high and fastest swooping, and being caught costs no points and
   the meter drains.

