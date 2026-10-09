# The book's other birds: audit of the 18 new minigames

Audited on 2026-10-09, on `main` at `7287924`, against the bar set by the
original ten (`game/src/games/{coot,cupadee,shuttercluck,gullfinch,plume,bobolinks,peeper,piffle,dodo,crow}.js`
and their tests) and the goals in [`../design.md`](../design.md): school-age
kids, Mario Party level, 30 to 60 s, easy to pick up, a real score to beat,
harder over time, the same few controls on controller, keyboard and touch,
and playable on a phone.

For each game I read the design note, the field-guide entry, the game and its
test; ran `node --test test/*.test.mjs` (139 tests, all pass; the bot scores
quoted below are from that run); ran
`node scripts/browser-check.mjs --bird <id>` for each (no page errors; every
game reaches its result card); and took extra screenshots on a 1280 x 720
desktop with a simulated controller (the bird's page, then 1.5 s, 5 s and
10 s into play) and on a 390 x 844 phone with touch. The art is not
delivered, so the stand-ins were judged for readability only, not polish.

Scores are 1 to 5, where 4 is level with the original ten and 5 is a
strength. Columns: **Cl** clarity of the goal in the first seconds, **Fun**
game feel (feedback, sound, pops), **Fair** fairness and difficulty ramp
(including the pass mark), **Read** readability of what is happening, **Ctl**
controls on controller, keyboard and touch, **Ph** phone fit (focus and
span), **Tst** test quality.

## Summary

| Bird | Game | Verdict | Cl | Fun | Fair | Read | Ctl | Ph | Tst |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Milkbottle Midge | Milk Round | needs improvement | 3 | 3 | 2 | 3 | 4 | 3 | 4 |
| Waterglass Goose | Glass Harp | needs improvement | 5 | 3 | 3 | 3 | 4 | 3 | 4 |
| Jackknife Niffy | Snip Snap | needs improvement | 3 | 4 | 2 | 2 | 4 | 3 | 4 |
| Cutitup Snippit | Snip the String | meets the bar | 5 | 4 | 4 | 4 | 4 | 3 | 5 |
| Buttonbeaks | Button Up | meets the bar | 4 | 4 | 3 | 4 | 4 | 4 | 4 |
| Broomwhisk | Clean Sweep | needs improvement | 3 | 3 | 2 | 3 | 3 | 2 | 4 |
| Key Crane | Lucky Dip | meets the bar | 5 | 4 | 3 | 5 | 4 | 3 | 4 |
| Garbage Canary | Bin Day | needs improvement | 4 | 4 | 3 | 2 | 5 | 4 | 5 |
| Steampresser Sparrow | Pressing Business | needs improvement | 4 | 3 | 4 | 3 | 3 | 4 | 4 |
| Wetweather Wren | Puddle Hop | needs improvement | 2 | 4 | 3 | 3 | 4 | 4 | 4 |
| Glove Dove | Squeaky Clean | reimplement | 4 | 3 | 3 | 4 | 3 | 4 | 4 |
| Ten O'clock Tit Trush | Set the Clocks | needs improvement | 4 | 3 | 3 | 5 | 2 | 4 | 5 |
| Plugsocket Swift | Lights On | meets the bar | 4 | 4 | 4 | 4 | 4 | 3 | 5 |
| Saltshaker Shrike | Just a Pinch | needs improvement | 4 | 3 | 2 | 4 | 4 | 4 | 4 |
| Soupladle Lark | Soup's On | needs improvement | 4 | 4 | 4 | 3 | 4 | 4 | 5 |
| Drippet | Drip Drop Dash | needs improvement | 4 | 4 | 2 | 4 | 4 | 4 | 3 |
| Saw Bird | Saw It Straight | needs improvement | 4 | 4 | 4 | 4 | 2 | 4 | 3 |
| Radio Bird | Tune In | needs improvement | 3 | 2 | 2 | 3 | 3 | 2 | 3 |

Four meet the bar, thirteen need improvement, and one (the Glove Dove) should
have its core loop reworked, because it plays as a second Pressing Business.

## Across all eighteen

What is already at the bar everywhere: every game keeps to the contract, has
`hud`, `summary`, `focus` and `span`, a one-line hint on screen for the first
seconds, pops and synthesised sound on every scoring event (all the `sfx`
names exist in `audio.js`), a rumble on hits and misses, and a test with
skill-graded bots (idle, mashing and a degenerate strategy below the pass
mark) plus unit tests of the rules. The tests are, on the whole, more thorough
than the originals'.

What recurs:

1. **The core test skips them.** `test/core.test.mjs` runs only the ten in
   `BIRDS` idle and mashed and checks their entries (four-line rhyme, a
   whole-number `pass`, the required fields). Extend it to `BUILT_IDS` from
   `src/more/index.js`, so a new bird cannot land without that floor.
2. **Too many penalties.** The originals rarely take points away (Safe
   Crossing's near miss, Hot off the Press's smudge). Most of the new games
   subtract (−1 to −10) and clamp at zero, so a child's first round often ends
   on 0 after scoring several times (a random round of Milk Round ended on 0
   after a pint went in). Where a mistake already costs time (a jam, a daze, a
   stop), let that be the cost and drop the subtraction, or keep it to −1.
3. **A cluster of "slide past and press over it" games.** Snip Snap (walkers
   pass below, swoop with a lead), Button Up (coats pass above, toss up under
   one), Just a Pinch (plates pass below, drop salt with a lead) and Milk
   Round (houses pass behind, release at the right moment) share a shape.
   Each has its own twist, but keep them apart in the guide order and make
   their presentation as different as possible (see each game).
4. **Pressing Business and Squeaky Clean are the same game** (see the Glove
   Dove).
5. **Phone views that lose a key display.** Where something the player must
   watch lives far from the `focus` (the goose's crack counter, the radio's
   signal meter, the dustpan), it falls off the narrow view. Either bring it
   near the focus or draw a small copy at the view's edge.

### Changes made

- **Item 1 (done).** `test/core.test.mjs` now loads every built new bird
  (`loadMoreBirds()`) and holds it to the same checks as the ten: the entry's
  fields, a four-line rhyme, a whole-number `pass`, a list of controls, and the
  game running to its end idle and mashed. It also now asserts that random
  mashing stays below `pass`, for all 28 games.
- **Found by that check: Left Foot, Right Foot (one of the original ten).**
  Random mashing scored 57 against a pass of 45, because a wrong step only
  cost 0.6 s. Now a wrong press within 1.5 s of the last one stumbles longer
  (up to 3.4 times as long), so mashing scores 20–33; a careful beginner bot
  still scores 44–57, and the pass is now 40 (it was 45, which the beginner
  bot only just reached on one seed).

## Milkbottle Midge: Milk Round

Hold to wind up, let go to lob a pint up a garden path onto the doorstep.

**Findings**

- It asks for two timings at once: start winding at the right moment, and
  let go when both the house is under the float (x) and the ring has reached
  the step (depth). That is harder than anything in the original ten.
- The depth window is very tight late on: ±20 px over a 0.95 s wind-up across
  400 px is about 0.1 s to let go in. Bots pass, but a seven-year-old won't
  feel why they missed.
- Where the bottle lands across the street (x = 430) is not shown until you
  start holding. Nothing tells a child which house is "next" or where to aim.
- Smash −1, dog −2 more, "No milk" −1, clamped at zero: in a random round the
  score was 0 with one pint delivered and 22 smashes. Early failure feels like
  nothing happened.
- The sleeping dog stand-in is a brown loaf; "z"s help, but it doesn't read as
  a dog at a glance. The ring is small and faint (thin dashes on pale paint).
- On a phone the Midge itself sits at the left edge of the view (focus 690,
  span 900), and pops at the left are cut off.

**Improvements**

1. Always draw the throw lane: a faint dotted line or chalk mark up the
   street at the float's x, so the target house is obvious before you hold.
2. Make the ring bigger and bolder (thicker stroke, a filled tint), and turn
   it green when it would land on a step and on the house under the lane.
3. Widen the late depth window (keep `tol()` at ±30 px, or slow
   `windTime()` to no faster than 1.15 s); the ramp already has speed, dogs
   and cards.
4. Drop the −1 for a plain smash (it already loses the pint); keep a cost only
   for waking a dog (−1) and for a "No milk" house.
5. Move the focus left (`FLOAT_SX + 150`) so the Midge and the next house are
   both in the phone view.
6. Give the dog stand-in a head, ears and tail so it reads as a dog asleep.

**Changes made**

## Waterglass Goose: Glass Harp

Watch the Goose tap a tune on the glasses, then tap it back.

**Findings**

- Clear from the first second ("Listen…" / "Your turn!" and the dots), and
  the pentatonic notes sound pleasant. The best memory-game read of the
  eighteen.
- There is a ceiling: every good bot scores exactly 58, the most possible.
  Once a child can play all eight tunes there is no score left to beat.
- The pink (`#ea8fb0`) and mauve (`#b98aa3`) glasses are both "pink" to a
  child, and they stand side by side in the five-glass rounds; the tip tells
  them to say the colours.
- The glass the Goose is at is marked only by a small yellow triangle under
  the table edge; with a controller or keyboard that is easy to lose.
- The crack counter (three little glasses up on the window, x ≈ 1440–1540)
  is outside the phone view (focus 800, span 1300).

**Improvements**

1. Remove the ceiling: after the eighth tune keep going (longer tunes) until
   the third crack, or add a quick-play bonus (+1 for a note within 0.6 s of
   the last), so a strong player always has a higher score to chase.
2. Change the fifth tint to a clearly different hue (orange or a deep blue),
   and name it in the tip.
3. Highlight the selected glass itself: a glow or thick outline round it and
   a lift, not just the triangle.
4. Move the crack counter inside x 200–1400 (for example under "Listen…"),
   or draw it beside the HUD.

**Changes made**

## Jackknife Niffy: Snip Snap

Fly along the sky and swoop to snip feathers, flowers, threads and price tags
from walkers; avoid balloons and the Park Keeper's gaze.

**Findings**

- Three rules at once (lead the walker, never a balloon, not while the Keeper
  looks) on a 45 s game. Each is fair, but together they are more than the
  originals ask.
- Skill doesn't show cleanly: beginners score 7–20 and careful snippers
  13–23 over the same seeds, and the beginner's lowest is the pass mark (7).
  Luck in the crowd decides too much.
- The Keeper's warning eye (beside the Niffy and over the Keeper) reads as a
  white cloud or blob in the stand-in. The "?" is the only clear cue, and it
  is over the Keeper at the far right.
- In the busy middle the walkers overlap into a crowd, with feathers and
  flowers stacked; it is hard to see which thing the swoop will take.
- On a phone the Keeper is usually off screen, so the eye beside the Niffy is
  the only warning, and that is the unreadable one.

**Improvements**

1. Make the warning unmistakable next to the Niffy: a big "!" or an eye that
   is plainly an eye, in red, and tint the sky a little while he looks.
2. Space walkers so no more than two overlap, and draw the thing the swoop
   would take with a highlight (a small pink ring) while hovering above it.
3. Cut variance: fewer spawns in pairs, a steadier walker speed; aim for the
   beginner band to sit clearly above 7 (for example 9–14) and good above it.
4. Make the Keeper's catch cost the daze only (no −2), or −1.
5. Keep it clear of Snip the String in the guide order; both are "snip".

**Changes made**

## Cutitup Snippit: Snip the String

Trace a tangled balloon string down to its knot and snip there.

**Findings**

- A fresh, readable puzzle: the stand-in strings are clean ink lines, the
  wanted balloon has a dotted pink ring and the tag says which, and the
  tangle grows in a clear ramp. Wrong snips cost points and jam the blades,
  so guessing doesn't pay (mashing scores 0).
- Where exactly it snips is the hinge (its eye), not the blade tips; a child
  will aim the tips. `REACH` is generous, which hides most of it.
- On a phone, a span of 1180 makes the knots and strings small.

**Improvements**

1. Mark the snip point: a small notch or arrow under the hinge, or make the
   blade tips the snip point.
2. Narrow the phone span to about 1000 by drawing the bunch a little tighter
   (X0/X1 inward), so strings stay thick enough to trace.
3. Consider halving the wrong-string cost (−5): the jam already stings.

**Changes made**

Done (4484368); details in `snippit.md`.
1. A pink notch marks the snip point under the hinge, magenta when a knot is in reach; the tip says so.
2. Knots and balloons spread over x 400–1200; `span` is 1000 (was 1180).
3. A wrong string costs 5 (was 10).
Pass stays 120; beginner bots 155–180, good 540–600, mashing 0–35, idle 0.

## Buttonbeaks: Button Up

Pick the button a coat is missing from the bowls and toss it up into its hole.

**Findings**

- Fetch and deliver reads well: ghost buttons on pale patches, bowls of each
  kind, a dotted ring on the bowl in reach. The look-alikes differ in shape as
  well as holes, so they are fair.
- The pass mark is tight: beginners score 12–14, pass is 12.
- Shares the conveyor shape with Snip Snap and Just a Pinch.

**Improvements**

1. Lower the pass mark to 10 so a beginner gets it within a try or two.
2. When holding a button, highlight the open holes on the line that it
   matches (a pulse), so the child sees where to run.

**Changes made**

Done (4484368); details in `buttonbeaks.md`.
1. Pass lowered from 12 to 10.
2. While the pair hold a button, every hole on the line it fits pulses pink.
The shared "slides past" shape is kept: it is a fetch-and-deliver game; keep it apart from Snip Snap and Just a Pinch in the guide order. Bots: beginner 12–14, good 25–26, mashing 4–5, idle 0.

## Broomwhisk: Clean Sweep

Push leaves and dust with momentum into the dustpan; flick to send them
skidding.

**Findings**

- Steering a broom in two dimensions on a foreshortened floor (up and down is
  into the picture, y counts double) is hard to read and hard to aim for a
  child; the push direction follows the broom's motion, not its look.
- Skill barely separates: beginners 14–24, good 18–29, flickers 15–28. My
  sinusoidal random run scored 11 against a pass of 14.
- Gusts undo work the child can't prevent, and come every 5 s by the end.
- Grey dust balls on a grey-beige floor have little contrast; leaves are thin
  slivers.
- On a phone (span 1000, following the broom) the dustpan is often off
  screen, so you push towards something you can't see.

**Improvements**

1. Draw an arrow or short dotted line from the broom showing where touched
   things will slide, and light up an item once it counts as swept.
2. Widen the pan's mouth and add a gentle funnel (items within 120 px of the
   mouth that are swept slide in), so a near miss still lands.
3. Make gusts rarer and weaker (every 12 s, then 8 s) and never blow swept
   items away from the pan.
4. Darken the dust balls and fatten the leaves in the stand-ins.
5. On a phone, draw an edge arrow pointing to the pan when it is off view, or
   bias the focus towards the pan.
6. Re-tune the pass mark once the variance is down; target beginners clearly
   above it.

**Changes made**

Done (4484368); details in `broomwhisk.md`.
1. A dotted line shows where pushed things will slide; swept things glow for the 3 s they count.
2. The pan's mouth is wider (110 from its middle, was 84) and pulls in near misses within 130.
3. Gusts every 12 s rising to every 8 s (was 9 and 5), a third weaker, and they never move a swept thing.
4. Darker dust, wider leaves.
5. The phone view leans towards the pan, with a "pan" arrow when it is far off.
6. Pass 15 (was 14). Bots over 10 seeds: beginner 16–23, good 22–32, smooth wandering 4–9, flailing 0–5, zigzag 0–1, idle 0; the tests assert the last four stay below the pass.

## Key Crane: Lucky Dip

Move the trolley, let the swinging Crane settle, drop onto a prize's ring,
carry it to the chute.

**Findings**

- The most readable of the eighteen: clear rings, a clear chute with an
  arrow, a pendulum that feels physical. Exactly the claw-machine fantasy.
- Pass is tight (beginners 6–7, pass 6), and scores are small numbers, so
  one slip is a big share of the score.
- The trolley runs under the HUD clock at the middle of the rail.
- On a phone the chute is off view while at the pile.

**Improvements**

1. Lower the pass mark to 5, or slow the ring shrink (`lerp(32, 20)`).
2. Lower the rail a little (`RAIL_Y` ≈ 150) so the trolley clears the clock.
3. On a phone, show a small chute arrow at the left edge while carrying.

**Changes made**

Done (577d8b2); details in `keycrane.md`.
1. Rings shrink only to about 40 px across; pass 5 (was 6).
2. The rail is lower, clear of the HUD clock (IC-M07a's prompt moved with it).
3. On a phone the view widens to take in the trolley and the chute while a prize is carried, instead of an edge arrow.
Bots: beginner 7–9, good 8–12, mashing 0, idle 0.

## Garbage Canary: Bin Day

Hold to open the lid for rubbish; keep it shut for the hat, letter, cat and
sparrow.

**Findings**

- A strong one-button game with real skill (beginners 21–28, sharp 29–52) and
  good bots, including holding the lid open all the time (0–3).
- Readability is the problem: ten kinds of thing at about 40 px on a laptop,
  arriving at up to 560 px/s, must be sorted at a glance. In the stand-ins
  the apple core reads as a bow and the tin as a box; nothing says "keep"
  apart from knowing the object.
- The Canary itself is a yellow sliver under the lid; the bird is barely
  seen.
- Late on, a keeper follows rubbish by 0.36 s: very fast for young children.
- "Missed" pops stack on top of each other.

**Improvements**

1. Give the things that aren't rubbish a shared cue: a soft gold outline or a
   little shine, and draw everything about 1.3 times bigger.
2. Draw the canary's head larger, peeping out, and have it look at what is
   coming.
3. Keep the late gap at least 0.5 s.
4. Offset stacked pops so they don't overlap.

**Changes made**

Done (577d8b2); details in `garbagecanary.md`.
1. Everything that isn't rubbish shares a gold glow, ring and star; all things are drawn 1.3 times bigger (IC-M08b's note updated).
2. The canary head is larger (IC-M08c and d now ask for a head a third of the lid's width).
3. Arrivals are always at least 0.5 s apart, gusts included; a test checks it.
4. Pops no longer stack on each other.
Shared item 2: swallowing something that isn't rubbish costs 1 (was 2); the lid stays shut 0.9 s while the Canary splutters. Pass 18; bots: beginner 23–35, good 41–44, lid always open 0–12, mashing about 6, idle 0.

## Steampresser Sparrow: Pressing Business

Run the iron along each crease to press it out; steam presses faster; don't
linger or the cloth scorches.

**Findings**

- Clear, and the heat glow is a good warning. The ramp is sound (beginners
  21–23, good 36–38).
- On touch every new finger-down is an action press, so each time a child
  puts a finger on the board to move the iron it also puffs steam (and heats
  the cloth faster).
- On the silk scarf the stand-in's darker pink blots compete with the creases
  and the scorch marks.
- Too close to Squeaky Clean (see the Glove Dove).
- The iron is steered in two axes at 640 px/s; with a stick that is fine,
  with arrows it is coarse for following a curved crease.

**Improvements**

1. With a pointer, steam only on a tap on the iron itself (or a steam button
   on the board's edge), as Squeaky Clean does with its soap bottle.
2. Keep the cloth plain under the creases (no blots), and draw scorches as a
   clear brown iron shape.
3. With the keyboard, ease the iron in (a short acceleration) so short taps
   nudge it.
4. Keep the steam and heat mechanic here; let the Glove Dove change.

**Changes made**

Done (577d8b2); details in `steampressersparrow.md`.
1. With a pointer only a tap on the iron puffs steam; the touch hint says so.
2. The cloth is plain where creases go (IC-M09b revised); scorches are a clear iron shape.
3. Keyboard movement eases in; the stick stays direct. Tests cover both rules.
4. The steam-and-heat core is kept; the Glove Dove is being redesigned instead.
Shared item 2: a scorch costs 1 (was 2). Pass 16; bots: beginner 19–25, good 36–39, steaming on the spot 0, sweeping 0–1, idle 0.

## Wetweather Wren: Puddle Hop

The street scrolls; press to pop the umbrella and hop, hold to float, over
puddles; shelter little birds; walk under awnings with it shut.

**Findings**

- The core (press to hop, hold to float) is fun and readable, and the delivered
  chicks look good.
- Too many rules for 45 s: puddles, little birds, awnings (shut beneath),
  gusts, a narrow puddle under an awning (tap-hop only), a settle delay after
  landing, and the umbrella turning inside out if opened too often. A child
  meets a new rule every few seconds and can't tell why it stopped.
- The 0.3 s settle after landing makes a press feel ignored.
- The bonus pop says "+3" but adds 2 (the +1 for the puddle is counted
  separately).
- Beginners score 13–26 with a pass of 13; mashing reaches 8.

**Improvements**

1. Drop the inside-out rule and the landing settle; mashing is already held
   back by splashes and awnings. If mashing must still be checked, keep the
   bots' mashing under the pass mark by tuning puddle spacing instead.
2. Drop the narrow puddle under an awning (it asks for a third kind of press).
3. Make the pop say what it adds ("5 dry in a row! +2").
4. Re-tune so beginners sit above 13 on every seed.

**Changes made**

## Glove Dove: Squeaky Clean

Move onto a spot on the dish and rub to wear it away; soap scrubs faster but
too much foams over.

**Findings**

- It plays, but it is Pressing Business again: move a tool in two dimensions
  over marks to wear them away, press for a timed booster (soap / steam) whose
  overuse is punished (foam over / scorch), next item when clear.
- Rubbing with the keyboard means tapping arrows back and forth, which is
  tiring; spinning the stick works but is not obvious.
- Scores are small (beginners 7–8, good 11–13, pass 7), so one slow dish is a
  big share of the score.

**Improvements**

1. Rework the core so it is not a second Pressing Business. Keep the theme
   (washing up, the long pink glove) and give it a different verb, for
   example: dishes come along the draining board, each with one kind of
   grime, and the Dove must scrub in the way that grime needs (circles for
   crust, back and forth for jam) shown by a picture on the dish; or a
   catch-and-stack game where clean wet plates slip from the Dove's grip onto
   the rack. Whatever it becomes, it should share no mechanic with Pressing
   Business.
2. If the rubbing stays, make the action itself scrub (hold A to scrub where
   you stand, with a jiggle), so keyboard and controller don't need to waggle.
3. Score spots, not dishes (one per spot, a bonus per dish), so the number
   grows steadily.

**Changes made**

## Ten O'clock Tit Trush: Set the Clocks

Turn the watch's hands to the time a town clock calls, then press to set it.

**Findings**

- Beautifully readable: big face, the time in words and digits, a patience
  bar, the ghost hands at first, and the watch shows its own digits.
- Turning takes too long: a target can be up to 5.5 hours away, and one turn
  of the stick is one hour, so a child spins five or six full circles; on
  touch, drags five or six full circles round the face. The patience falls
  to 8 s.
- The controller has no hour jump (↑ / ↓ is keyboard only); the stick held
  left or right accelerates, but children won't find it.
- Reading "twenty-five to nine" or "7:43" is a school skill some players
  won't have yet; the digits on the watch make it a matching game, which is
  fine, but the later rounds are hard for the youngest.

**Improvements**

1. Keep targets within three hours (`far` up to 180) and give an hour jump on
   every device: LB / RB on the controller (the `left` / `right` steps), and
   on touch dragging the short hour hand moves hours.
2. Let patience scale with how far the target is (base plus 1 s per hour).
3. Keep "any minute" for the very end only (from clock 16, say), and keep
   showing the digits under the words throughout.

**Changes made**

## Plugsocket Swift: Lights On

Fly to asking windows and plug their lamps in; unplug sleepers to keep the
fuse under its limit; flip the fuse when it blows.

**Findings**

- A good juggling game with a clear house of twelve windows, timer rings on
  the bubbles and a fuse box with a lit-lamp count. Bots show skill (beginners
  13–16, good 19–20, greedy 5–7).
- The fuse rule (three lamps safe) is the thing a child must learn; the box
  shows dots but not the limit.
- On a phone (span 820 following the Swift) the fuse box at x = 230 is off
  view when the Swift is at the right-hand windows.

**Improvements**

1. Draw three dots green and the rest red on the fuse box, so "three is
   safe" is visible.
2. On a phone, show a small fuse warning at the view's edge when it heats.

**Changes made**

## Saltshaker Shrike: Just a Pinch

Shake the number of pinches each plate's flag shows as it slides past;
puddings want none.

**Findings**

- Readable: flags with empty circles that fill, the crossed-out shaker on
  puddings, a dotted drop line.
- The pass mark sits too close to cheap play: shaking on the spot scores
  2–26 against a pass of 30, while beginners score 31–45.
- Shares the conveyor-plus-lead shape with Snip Snap and Button Up.

**Improvements**

1. Score per plate only when it has some salt and isn't over (already so),
   and stop "shaking on the spot" from catching plates by luck: make plates
   one at a time under the Shrike faster than salt can fall, or shrink
   `FOOD_HALF` slightly, so a static shaker over-salts more. Target "still"
   below 20.
2. Raise the pass mark to about 32 once "still" is lower, keeping beginners
   above it.
3. Make it look less like the other conveyors: plates could come down a
   dumbwaiter or round a lazy Susan rather than along a straight counter.

**Changes made**

## Soupladle Lark: Soup's On

Put the ring round exactly what the creature ordered in the swirling soup and
dip.

**Findings**

- A good, distinct mechanic (pick an exact set from a moving crowd) with clear
  order bubbles and patience bars.
- The Lark stand-in stands over the ring, so its body and wings cover the bits
  near the ring, the very place you need to see.
- Peas (20 px) are small for the swirl speed.

**Improvements**

1. Draw the Lark above and behind the ring (offset up and to the side, its
   bowl over the ring's centre), or fade it to half while hovering, so the
   ring's inside is never covered.
2. Draw peas larger (about 26 px).

**Changes made**

## Drippet: Drip Drop Dash

Run to thirsty things to fill them, avoiding the slippery puddles your own
drips leave; hop over puddles.

**Findings**

- Readable and lively: the trail of puddles is clear, so is "Whoops!".
- Hopping all the time scores 14–16, above the pass (10) and close to good
  (19–23); the test only checks it is below good on average. The hop/puddle
  choice hardly matters.
- The fill takes only 0.5 s, so the skill is mostly running.

**Improvements**

1. Make a hop cost more: a longer rest after landing, or landing on a fresh
   puddle also skids. Target "bunny" below the pass mark.
2. Add that to the test: `Math.max(...hops) < pass`.
3. Consider the thirsty things moving away from wet tiles (a cat bowl the cat
   pushes), so the trail you lay changes where you go.

**Changes made**

## Saw Bird: Saw It Straight

Saw with long left-right strokes while steering up and down to keep the cut on
the chalk line.

**Findings**

- Readable: the chalk line, the cut drawn over it, the stroke gauge and the
  rhythm dots; good grading pops.
- On a controller both jobs are on one stick: stroke left and right and
  steer up and down at the same time is a diagonal waggle, hard for a child.
  The keyboard (hold ↑ while tapping ← →) is easier; touch is natural.
- Steering against drift to keep on a line is Stitch in Time's game
  (Pincushion Piffle); the strokes are new, the steering is not.
- The bots score the same on every seed (44 and 70), so the test doesn't
  check the ramp across seeds.

**Improvements**

1. On the controller, move one job off the stick: steer with the stick, saw
   by pressing A in rhythm (or with the right stick), or saw with the stick
   and steer with LB / RB.
2. Make the steering its own thing rather than Piffle's: for example knots to
   steer around, not just a pull.
3. Add randomness that changes the bots' scores across seeds (grain, knots),
   or test several plank layouts.

**Changes made**

## Radio Bird: Tune In

Turn the dial to find the station the listeners ask for and hold the needle
on it while its song plays.

**Findings**

- Skill hardly shows: beginners 7–9, good tuners 8–11. Each song takes 3.2 s
  of holding, so ten songs fill most of the 50 s whatever you do; the
  searching is the only skill.
- Any station you pass is pencilled on the dial, wanted or not, so after the
  first sweep the game is "go to the picture".
- The "signal" eye that closes is an abstract meter for a child.
- The action button slows the dial: an odd use of A, which elsewhere always
  does the thing.
- On a phone the view follows the needle (span 760), so the signal eye and
  speaker (x 700–900) leave the view when the needle is at the right.
- The page has no music (`tune: null`); fine, as the stations play.

**Improvements**

1. Shorten the song (1.5–2 s) and add a quick-find bonus, so finding fast is
   what scores.
2. Make the marks less certain: drift more from the start, or pencil only
   stations you held for a moment.
3. Replace the eye with something literal: the speaker crackles and its
   picture fades in as you get close, and the listeners lean forward.
4. Use A for something that matters (press to "lock" a station and start the
   song), and make fine tuning automatic near a station (a gentle snap).
5. Keep the signal and speaker in the phone view: draw them under the needle,
   or a small copy at the view's edge.

**Changes made**
