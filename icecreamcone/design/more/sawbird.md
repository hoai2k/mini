# The Saw Bird: Saw It Straight (50 s)

A long plank lies across two sawhorses with a blue chalk line along it, and
the Saw Bird (a carpenter's handsaw) cuts along the line from the right-hand
end to the left. It plays as two hands at once: one pushes and pulls the saw,
the other keeps it on the line.

**Strokes.** The stick's left-right position is the saw's place in its
stroke (arrows: hold ← then →; mouse or finger: drag back and forth). Each
stroke only bites once it has travelled about a third of the way, so short
jiggles and button-mash flicking barely cut, and long full strokes do. Long
strokes in a row build a rhythm (the five orange dots under the gauge) that
makes each stroke bite up to half as much again; stopping or a short stroke
loses it. The saw has a top speed, so there is nothing to gain by thrashing.

**Steering.** The cut heads the way the saw is tipped: stick or arrows up
and down (with a pointer, point above or below the cut). The grain pulls each
plank's cut steadily to one side, and knots (from the second plank) give it
a sudden shove and slow the saw, so the cut keeps needing small corrections.
The dark cut line is drawn over the chalk line, so you can see every wobble.

**Scoring.** When the cut reaches the end the plank falls in two and is
marked by how far, on average, the cut strayed from the chalk: dead straight
(within 6 px) 10 points, straight (14 px) 7, a bit crooked (26 px) 4,
crooked 1. The page opens at 30 points.

**Getting harder:** planks grow from about 640 px to 1000 px long, the grain
pulls up to three times as hard, and one knot, then two, sit on the line.
The first plank is short with a gentle grain.

**Controls:** stick or arrows/WASD (left-right to saw, up-down to steer);
mouse or touch: drag left and right, and point where the cut should go. On a
narrow screen the view follows the cut.

**Bots** (`game/test/sawbird.test.mjs`): a beginner sawyer (shorter strokes,
pauses, a shaky and slow steering hand) scores 44; a good one 70; full
strokes that never steer 15 to 22; fast jiggling 4; idling and random
mashing 0.

## Images (IC-M17)

- **IC-M17a, the carpenter's yard** (`scene.sawbird`): the background; the
  middle of the yard stays plain for the sawhorses and the plank.
- **IC-M17b, planks** (`sprites.planks`, 1 x 3): pine, oak and cedar,
  stretched to each plank's length; the chalk line, knots and the cut are
  drawn over them, and the two halves are cut apart along the cut.
- **IC-M17c, sawhorse** (`sprites.sawhorse`): used twice under the plank.
- **IC-M17d, the Saw Bird sawing** (`sprites.sawbirdSawing`): blade level,
  teeth down and legs tucked, so its teeth sit in the cut; it slides back and
  forth and tips a little as it steers.
