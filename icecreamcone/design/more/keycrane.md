### The Key Crane: Lucky Dip (45 s)

An old penny-arcade crane cabinet full of lost-property trinkets: a
lantern, a birdcage, a handbag, a basket, a bell, a kettle, an alarm clock,
each with a wire ring on top. The Key Crane hangs on a string from a
trolley on the brass rail, and its claws are the hook. Move the trolley
left and right, then drop: the Crane goes straight down, and its claws
close at the bottom. If they close on a ring, the prize comes up with it;
carry it over the chute at the left and it drops in (or drop it there
yourself). The mechanic is a claw crane on a pendulum: moving the trolley
sets the Crane swinging, and the swing carries on while it is lowered, so
you stop over a ring, let it settle (or time the swing), and then drop. A
faint dotted line from the claws shows where they are over the pile.

**Scoring.** One per prize in the chute; a golden pocket watch counts as
three. Claws that close on the top of a prize, or on nothing, come up
empty. Carrying, a swing past about 24° (a jerk of the stick back and
forth) makes the prize slip off and fall back onto the pile, or, if it was
nearly there, into the chute. A new prize tumbles in from above for each
one taken, so the pile always has six or so.

**Getting harder.** Rings start generous (about 64 px across) and shrink
to about 40 px by the end, and golden watches, with smaller rings still,
turn up after 8 s. The trolley is slower with a prize in the claws.

**Controls.** Controller: left stick or D-pad moves the trolley, A drops
(and lets go). Keyboard: arrows or A/D, Space. Mouse or touch: the trolley
follows the pointer; the Crane drops when you let go of the click or touch,
so a finger can drag to aim first. On a narrow screen the view follows the
trolley, and while a prize is carried it widens smoothly to keep the chute
in sight too.

**Pass.** 5 prizes. Bots: a beginner (half-speed stick, waits until the
swing is small; seeds 1–8) 7–9; a good operator (full speed, drops while it
is still swinging a little, goes for golden watches) 10–12; wandering and
dropping all the time 0; idle 0.

**Images.** IC-M07a is the inside of the cabinet: the brass rail, the
wallpaper, the velvet floor and the chute, with the space between kept
empty for the crane and the pile. IC-M07b is the eight trinkets, painted
without rings (the game draws each ring at its true size, since the rings
shrink). IC-M07c is the Key Crane hanging from its shaft with its claws
open and shut, to swing on the string in place of the standing portrait.
IC-M07d is the same hanging Crane startled, legs kicked apart, shown for a
moment when a prize slips or the claws close on nothing.

## Changes after the audit

1. Rings now shrink only to about 40 px across (`lerp(32, 20)`), and the
   pass mark is 5 rather than 6, so one slip no longer decides the page.
   Beginners score 7–9 on seeds 1–8; good 8–12.
2. The rail is lower (`RAIL_Y` 150), so the trolley runs clear of the HUD
   clock. The scene request (IC-M07a) now puts the rail about 13% down.
3. Instead of an arrow at the edge, the phone view widens while a prize is
   carried (the game's `span` grows smoothly to take in the trolley and the
   chute, and `focus` moves between them), so the chute itself stays in
   sight. On a wide screen nothing changes.

Shared items: no point penalties here; the chute was the one display that
fell off the narrow view (item 3).
