### The Cutitup Snippit: Snip the String (45 s)

A bunch of balloons and kites is tied along the top rail of the fence at
the edge of the fair, and the wind has crossed their strings. A tag under
the clock shows the one to let go, and that balloon wobbles inside a dotted
pink ring. Follow its string down with your eye to the knot where it is
tied, walk the Snippit there, and snip. All the strings are drawn alike, so
the only way to know is to trace them; the string under the blades glints
pink for its first stretch above the knot, a hint without giving the answer
away. The mechanic is tracing a tangle, the activity-book puzzle, against
the clock.

**Scoring.** The right string lets that balloon float off: 10 points, and 5
more if it took less than three seconds. A wrong string loses a balloon
nobody asked for, costs 5 points (never below zero) and jams the blades
for 0.8 s; the same balloon is still wanted. A snip away from every knot
does nothing. Each snipped balloon is replaced by a new one dropping into
the bunch in a colour not already there.

**Getting harder.** Three balloons at first, four from 10 s, five from
20 s, six from 31 s. Strings curl more as the game goes on, so they cross
more than once. From 22 s the wind jostles the bunch: every 4.5 s (3 s
after 34 s) two neighbours drift past each other, re-crossing their
strings while you look.

**Controls.** Controller: left stick or D-pad walks, A snips. Keyboard:
arrows or A/D walk, Space snips. Mouse or touch: the Snippit follows the
pointer; a click or tap snips at the knot under it straight away. On a
narrow screen the view keeps the whole tangle (1000 wide) in sight.

**Pass.** 120 points. Bots (seeds 1–4): a beginner (slow to look, one
string in eight wrong) 155–180; a good snipper 540–600; walking up and down
snipping all the time 0–35; standing still and snipping 10–15; idle 0.

**Images.** IC-M04a is the fairground fence behind it all, with the top
rail kept plain for the knots and the sky kept empty for the bunch. IC-M04b
is the six balloons and six kites in the six colours, drawn without
strings (the game draws the strings from the knot or the kite's tail).
IC-M04c is the Snippit with its blades open and snapped shut, for walking
and snipping.
IC-M04d is the Snippit mid-stride, jammed after a wrong snip, and looking up
at a balloon it let go; standing still it uses IC-M04c's open blades.

## Changes after the audit

1. **Snip point marked.** A small pink notch is drawn just above the knots,
   under the hinge, and turns magenta when a knot is in reach, so a child
   aims the notch rather than the blade tips.
2. **Phone span 1000.** The knots and the bunch now spread from x 400 to
   1200 instead of 330 to 1270, so the whole tangle fits a 1000-wide view
   and the strings stay thick enough to trace.
3. **Wrong string costs 5, not 10.** The 0.8 s jam already stings. Mashing
   still stays far below the pass mark (0–35 against 120). The pass mark
   stays at 120: a beginner now scores 155–180.

## Matched to the painting

The snip point is the painting's eye, at the hinge where its blades cross
(322 units above its feet, 25 to the left), held just above the knots: the
Snippit is sized from that (about 246 px tall, feet at the bottom edge),
and the stand-in keeps its own hinge until the painting loads. The pink
notch now sits on the rail pointing up at the eye instead of covering it;
the closing-blade strokes and "Jammed!" sit on the blades and above the
head. The pose sheets are drawn at the painting's framing. IC-M04c and
IC-M04d now describe the painting (pink scissors, grey blades pointing up
and to the left, eye at the hinge, finger loops as head and body, pink tail).

## Matched to the delivered art

The fairground scene (IC-M04a) puts the fence's top rail higher than the
stand-in did: its top edge is at y 674 (measured on the painting), so the
knots, the notch and the strings now tie on there (was 706), and the
Snippit is sized from it, its eye just above the rail (about 286 px tall).
The balloons, kites and the Snippit's poses (IC-M04b to d) are still
drawn in code or from the portrait until their sheets arrive.

The balloon and kite sheet (IC-M04b) and both pose sheets (IC-M04c, d)
arrived next. Each string now ties on where the painting puts it: a
balloon's knot, or a kite's bottom point just above its bowed tail, measured
per cell (the sheet's pictures are not centred in their cells). Each pose is
drawn with its painted eye on the snip point and its claws on the ground,
from the eye and claw positions measured in each cell, and the shake on
jamming turns about the eye. The jammed pose came out milder than asked
(blades half open rather than twisted), so the shake stays. The portrait's
eye was re-measured too: 321 units up and 29 to the left of its feet.
Nothing of the Snippit's game is drawn in code now apart from the strings,
knots, notch, tag and pops.
