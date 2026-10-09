### The Saltshaker Shrike: Just a Pinch (45 s)

The Shrike hangs upside down by its feet from a brass rail over a big round
revolving café table (a lazy Susan), its perforated cap pointing down. The
cook sets each plate on the table's right-hand edge, and the table turns it
round the near side to the diner at the left. Each has
a little flag with dots: how many pinches of salt it wants (one to five).
Move along the rail and press the action to shake one pinch. The salt
takes about half a second to fall and the table keeps turning: a plate
creeps at the two ends and swings fast across the middle, so the ends are
the easy places and the middle needs a lead. Each pinch that lands fills a
dot on its flag; one too many shows as a red dot. Salt that misses lands on
the table. The mechanic is counting presses onto a moving target with a
lead, rather than holding to a line (Tea Time) or framing (Say Cheese).

**Scoring.** When a plate reaches the diner: just right 3 ("Just right!"),
one pinch out 1 ("A little bland" or "A little salty", only if it had any
salt), anything else 0 and a frown. Puddings (cake, sundae) carry a flag
with a crossed-out shaker and want no salt: left alone they score nothing,
salted they cost 1.

**Getting harder.** The table turns at 0.4 radians a second at first and
0.65 by the end (a plate takes about 8 s, then about 5 s, to go round), and
plates come every 2.8 s at first, every 1.35 s at the end. Orders are one
to three pinches for the first nine seconds, then two to four, then two to
five. Puddings start after 8 s, about one plate in five. All the plates
ride the same table, so they never overtake.

**Controls.** Controller: left stick or D-pad moves along the rail, A
shakes. Keyboard: ← → or A / D, Space. Mouse or touch: the Shrike follows
the pointer along the rail; click or tap to shake. A faint dotted line
shows where the salt falls. On a narrow screen the view follows the
Shrike, 900 wide.

**Pass.** 30 points. Bots over seeds 1–12: a beginner (leads only 70% as
much as it should, slower, aims loosely, loses count one time in eight)
30–45; a good cook (full lead, keeps pace with the plate) 36–57; shaking
on the spot 0–13; wandering and mashing 0–14; following each plate and
shaking all the way 0–4; idle 0.

**Images.** IC-M14a is the café, its wall and tiled floor kept plain for
the table and the falling salt (the game draws its own brass rail).
IC-M14e is the round revolving table, its top's oval spanning the full
width so the game can fit the plates' rim to it. IC-M14b is the eight dishes on their plates: six savoury, two
puddings. IC-M14c is the four diners, waiting and pulling a face.
IC-M14d is the Shrike painted hanging upside down by its claws (a flipped
portrait would be lit from below): still, shaking out a pinch, squawking
pleased at a plate that's just right, and flinching at a frown. Until it
arrives the game turns the portrait upside down.

## Changes after the audit

1. **Shaking on the spot no longer pays.** The plates now ride a turning
   table instead of a straight counter, so each one crosses the middle (where
   a lazy shaker sits) at its fastest; the catch is narrower (`FOOD_HALF` 64
   to 50); and after the first nine seconds orders are two to five pinches,
   not one to five, so one or two lucky pinches rarely match. The table turns
   at 0.4 to 0.65 radians a second.
2. **Pass kept at 30**, not raised to 32: the slower beginner bot's lowest
   score over twelve seeds is 30, and the guide asks that a beginner clear it
   every time. Bots over seeds 1–12: beginner 30–45, good 36–57, shaking on
   the spot 0–13 (asserted below 20), wandering and mashing 0–14, following
   a plate and shaking all the way 0–4, idle 0.
3. **It looks different from the other conveyors:** a round lazy Susan in a
   café with a tiled floor, the plates creeping and swinging round it, and
   the Shrike over it. This needed new art: IC-M14a (the café, now without a
   counter, its middle kept clear for the table) was rewritten and IC-M14e
   (the revolving table) added.
- Shared guidance: a salted pudding now costs 1, not 2.

## Matched to the painting

The painting's cap is high and forward of its feet, at (−83, −375) in bird
units, where the stand-in's was at (0, −268). Turned upside down, it is drawn
a little smaller (size 229, not 320) and shifted so that its cap hangs where
the salt falls from, at the same height. The pose request IC-M14d now
describes the painting itself: a fluted glass body, a domed silver cap with
an eye mask, mauve and olive wings.
