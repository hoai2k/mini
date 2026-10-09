### The Broomwhisk: Clean Sweep (45 s)

Leaves drop from the fig tree into a paved courtyard and dust collects on
the flagstones. Steer the Broomwhisk around the floor (up and down is into
and out of the picture). Whatever its bristles touch is pushed along with
the broom's own speed and slides on after it, slowing as it goes, so
sweeping is a push with momentum: get behind a leaf and sweep it towards
the dustpan, whose mouth has a dotted pink ring in front of it. Press the
action to flick the bristles: everything just in front of the broom skids
off in the way it is moving. The mechanic is pushing loose things with
momentum, like a puck, rather than catching or steering a path.

**Scoring.** One per leaf or dust ball in the pan, three for a golden
leaf (about one in eleven). Only what the broom has touched in the last
three seconds goes in; anything else, blown or drifting, bumps off the
pan's lip, so a gust never scores for you.

**Getting harder.** No wind for the first 13 s. Then gusts, warned 1.3 s
ahead by the tree's leaves shivering and a "Gust!" arrow, blow everything
loose across the floor for 1.5 s, every 12 s at first and every 8 s by
the end; they leave swept things alone. Leaves fall faster (every 2.2 s, down to 1.1 s; at most 18 on the
floor). The dustpan moves to another wall (left, right or back) after
every eight sweepings.

**Controls.** Controller: left stick or D-pad sweeps, A flicks. Keyboard:
arrows or WASD sweep, Space flicks. Mouse or touch: the broom follows the
pointer, so a quick swipe pushes hard; click or tap to flick. On a narrow
screen the view follows the broom, 1000 wide.

**Pass.** 15 points. Sweeping is physical, so runs vary; bots over seeds
1–10: a beginner (two-thirds speed, slower to line up, no flicks) 16–23,
average 20.5; a good sweeper 22–32, average 27; one that also flicks 21–30;
running about at random and flicking 0–5; wandering in smooth loops 4–9;
zigzagging along the floor 0–1; idle 0.

**Images.** IC-M06a is the courtyard, its floor of flagstones kept
completely clear. IC-M06b is four leaves, a dust ball, a feather, a golden
leaf and a sweet wrapper: about one leaf in ten falls as a feather and one
in twelve blows in as a wrapper, for variety. IC-M06c is the dustpan from the side and from the front, for the
side walls and the back wall. IC-M06d is the Broomwhisk mid-sweep and
flicking.
IC-M06e is the Broomwhisk pushing into or out of the picture with its
bristles splayed, braced against a gust (mirrored to face the wind), and
pleased when something lands in the pan.

## Changes after the audit

1. **Where things will slide, and what counts.** While the broom moves, a
   dotted pink line runs ahead of it in the direction pushed things will go.
   Anything swept has a pink glow under it for as long as it counts (3 s).
2. **Wider mouth and a funnel.** The pan takes things within 110 floor units
   of its middle (was 84), and a swept thing sliding within 130 of the mouth
   is drawn in, so a near miss still lands.
3. **Gentler wind.** Gusts come every 12 s at first and every 8 s by the
   end (was 9 and 5), blow about a third less hard, and never move a swept
   thing, so the wind can't undo a good sweep.
4. **Stand-ins read better.** Dust balls are darker with dark ink, and
   leaves are fatter (about half as wide again).
5. **The pan on a phone.** The view now follows the point between the broom
   and the pan (or as far towards the pan as keeps the broom in view), and
   when the pan is more than 420 px to the side a pink "pan" arrow beside the
   broom points to it.
6. **Re-tuned.** Variance is down and both bots score higher: beginners
   16–23 over ten seeds, good sweepers 22–32. The pass mark goes up to 15,
   with every beginner seed above it. A new bot that wanders in smooth loops
   (like the audit's random run) scores 4–9 and is asserted below it,
   alongside flailing, zigzagging and idling. A new test covers the funnel
   and the gusts sparing swept things.

No new art is needed: the arrow, line and glow are drawn by the game over
any art.

## Matched to the painting

The painting is the same size and stance as the stand-in (feet on the
floor point, about 400 units tall), so the push circle, shadow, lean and
flips needed no change; the pose sheets are now drawn at its full height.
In the painting the straw hangs like a skirt above its legs rather than
reaching the floor, so IC-M06d and IC-M06e now describe the painting (a
broomstick neck, bound straw body, crest and slate-blue beak) and ask for
the straw to brush the floor in the sweeping poses.

## Matched to the delivered art

The courtyard scene (IC-M06a) fits the game as built: the wall meets the
flagstones at y 470, where the floor's back edge already was, the fig tree
overhangs the top left where the leaves fall from, and the floor is clear.
Nothing changed. The leaves, dust, dustpan and the Broomwhisk's poses
(IC-M06b to e) are still drawn in code or from the portrait until they
arrive.

The leaves and dust, the dustpan and both pose sheets (IC-M06b to e)
arrived next. Leaves, feathers, wrappers and dust are drawn 84 wide at
the front of the floor, smaller further back. The painted dustpan is placed
by its mouth: from the side, the scoop's tip sits just past the pan's
point (mirrored for the right wall); from the front, the bottom of the
mouth sits on it, so the game's mouth and funnel line up with the painted
opening, and the dotted ring stays in front of it. The poses were painted
at about 0.79 of the portrait's size, so they are drawn 1.27 times larger,
each with its own feet (measured per cell) on the floor point and mirrored
when it faces right.

## Third audit: pose sizes (2026-10-09)

Every painted pose is drawn so the character is one size, by the scale each cell is painted at (`design/source/pose-scales.json`); a test checks it. See the third audit in [`AUDIT.md`](AUDIT.md).

The Broomwhisk pose sheets (IC-M06d, e) have a portrait-sized head on a smaller broom; a re-request is in the third audit in [`AUDIT.md`](AUDIT.md).
