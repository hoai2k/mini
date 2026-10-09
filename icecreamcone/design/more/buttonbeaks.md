### The Buttonbeaks: Button Up (45 s)

Coats, cardigans and waistcoats travel right to left along the washing
line, and each has empty buttonholes. Every hole shows, on a pale patch,
a ghost of the button it is missing: its colour, its shape (round, square
or flower) and its two or four thread holes. The two Buttonbeaks stand
behind an open button tin with a bowl for each kind of button. Walk them to
the right bowl and press to pick one up; walk under the coat and press
again to toss it up. A toss that reaches a coat sews itself into an empty
hole of its kind on that coat. The mechanic is fetch and deliver: read what
is wanted, fetch it, and get under a moving target with it.

**Scoring.** One per button sewn on. A button that matches nothing on the
coat it hits bounces off and the Buttonbeaks are dizzy for a second. A
toss with no coat above flies away harmlessly (the way to get rid of a
wrong pick). A coat that leaves with open holes simply goes; the results
count the coats buttoned all the way.

**Getting harder.** The line speeds up from 80 to 140 px/s and the coats
come closer together. Coats have one hole for the first 8 s, one or two
until 22 s, then two or three. At 18 s two more bowls join the tin with
look-alike buttons: a pink square with two holes beside the pink round with
four, a blue flower beside the blue round.

**Controls.** Controller: left stick or D-pad walks, A picks up or tosses.
Keyboard: arrows or A/D walk, Space picks up or tosses. Mouse or touch:
they follow the pointer; tap a bowl to pick from it, tap up by the coats
to toss from there. On a narrow screen the view follows them, 1000 wide.

**Pass.** 10 buttons. Bots (seeds 1–4): a beginner (slower, a moment to
look, now and then a look-alike by mistake) 12–14; a good tailor 25–26;
walking up and down pressing all the time 4–5; idle 0.

**Images.** IC-M05a is the garden with the two clothes posts and the
front of the tin; the line itself is drawn by the game so the coats hang
on it. IC-M05b is the six buttons in the game's order. IC-M05c is four
garments with a plain, buttonless placket down the exact middle, where the
game puts the holes and buttons. IC-M05d is one bowl, drawn for each kind.
IC-M05e is the pair holding something up between their beaks and tossing
it.
IC-M05f is the pair mid-stride, pecking into a bowl, dazed after a wrong
button and hopping for joy when one is sewn on.

## Changes after the audit

1. **Pass lowered to 10** (from 12), so a beginner (12–14 with the bots)
   clears it within a try or two. Mashing scores 4–5.
2. **Matching holes pulse.** While the Buttonbeaks hold a button, every open
   hole on the line that it fits gets a pulsing pink ring, so the child sees
   where to run. The tips say so.

Not changed: the shared "things pass by" shape (the audit's point 3 across
all games). Button Up already differs by being fetch-and-deliver (two
trips, reading a button's colour, shape and holes) rather than timing one
press; its place in the guide order is for the lead to keep apart from
Snip Snap and Just a Pinch. There were no point penalties to drop.

## Matched to the painting

The painted pair stands taller than the stand-in (362 units against 230),
so the held button now sits between their two heads, above the pink one's
beak and clear of the yellow one's eye, with a thread to each beak; tosses,
the aim line and the dizzy stars start from there, and the pose sheets are
drawn at the painting's height. IC-M05e and IC-M05f now describe the
painting (the taller yellow-headed bird on the left, the smaller pink one
on the right, bodies of overlapping buttons).

## Matched to the delivered art

The washing line now hangs from the hooks painted on the two posts in the
garden scene (IC-M05a): from (98, 116) to (1502, 116), sagging 26 in the
middle, instead of running edge to edge lower down. The bowls sit in the
painted open tin, their rims just behind its rim (y 756), and the
Buttonbeaks stand on the lawn just behind it (feet at y 748), so the held
button and their tosses start higher too. A touch below y 712 counts as a
tap on the bowls. The coats, buttons, bowls and the pair's poses (IC-M05b
to f) are still drawn in code or from the portrait until they arrive.

The buttons, coats, bowl and both pose sheets (IC-M05b to f) arrived next.
Each painted coat hangs with its shoulders just under the pegs and its
plain centre strip on the line of buttonholes (strip and shoulders measured
per coat; the holes moved up a little, to 80, 155 and 228 below the line,
so the lowest stays above every hem). Each bowl is drawn 150 wide, set in
the tin with its heap of buttons inside its rim. The poses are drawn at a
fixed scale per sheet (the pose sheet was painted smaller than the
portrait) with their claws on the lawn line and the pair's feet centred
where the portrait's are, so nothing jumps between poses; the pecking pose
is short, as painted, rather than stretched. While they hold a button they
show the holding pose, and the button sits just above their touching beak
tips, so the code-drawn thread is gone; tosses start from there. During
the quick peck the button isn't shown until it's picked up.

## Third audit: pose sizes (2026-10-09)

Every painted pose is drawn so the character is one size, by the scale each cell is painted at (`design/source/pose-scales.json`); a test checks it. See the third audit in [`AUDIT.md`](AUDIT.md).
