# The Drippet: Drip Drop Dash (45 s)

The Drippet is a blue water tap on legs that never quite turns off. It runs
about a tiled kitchen floor, dripping as it goes, and every drip spreads into
a puddle. Thirsty things wait on the floor: a drooping fern, the cat's empty
bowl, a glass, a vase of tired daisies. Run to one and stand over it (inside
its dashed ring) for half a second while the tap fills it. A thing left too
long gives up (its little drop-clock runs out) and another appears elsewhere.

A fresh drip is harmless, but a puddle that has sat for about a second is
slippery: run into one and the Drippet skids across the floor for a second,
spinning, and can't be steered. Press the action to hop over a puddle. A hop
is a little slower than running and lands with a splash that leaves a puddle
of its own, and landing in an old puddle still skids, so hopping everywhere
floods the floor rather than saving time. Running fast spreads the drips out
into a dotted trail you can slip between; dawdling makes one big puddle in
front of you.

**Score:** drinks (one per thing filled). The page opens at 10.

**Getting harder:** the tap drips faster (every 0.42 s down to 0.22 s), the
puddles spread wider and last longer (5 s up to 9.5 s), the thirsty things
lose patience sooner (11 s down to 7 s), and after 15 s two are thirsty at
once. The first thing appears at least a short run away on a dry floor.

**Controls:** stick, D-pad, arrows or WASD run in any direction; A, Space or
Enter hops. With a mouse or finger the Drippet runs towards the pointer, and
a click or tap hops. On a narrow screen the view follows the Drippet.

**Bots** (`game/test/drippet.test.mjs`): a beginner runner (slow stick,
short look-ahead, sometimes forgets to hop) scores 12 to 17; a good one 19
to 23; hopping all the way to every thing 14 to 16; running in circles and
idling 0; random mashing 0.

## Images (IC-M16)

- **IC-M16a, the kitchen** (`scene.drippet`): the background; the floor
  below 55% of the height stays empty because everything moves there.
- **IC-M16b, thirsty things** (`sprites.drippetThings`, 4 x 2): the four
  things dry (top row) and refreshed (bottom row); a thing switches to its
  refreshed cell when filled.
- **IC-M16c, puddles** (`sprites.puddles`, 3 x 1): three puddle shapes,
  scaled to each puddle as it spreads and dries.
- **IC-M16d, hopping and skidding** (`sprites.drippetPoses`, 2 x 1): the
  Drippet's two moving poses; standing and running use its portrait.
