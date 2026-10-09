# Glove Dove: Slippery Dishes (45 s)

Bird 11 of the book's other birds. The Glove Dove is a long pink rubber
washing-up glove with a dove's head. Code: `game/src/games/glovedove.js`;
entry: `game/src/more/glovedove.js`; tests: `game/test/glovedove.test.mjs`.

## Rules

The washing-up is done, but every dish is wet, soapy and slippery. One at a
time they pop up out of the suds in the sink on the left and come down over
the counter. The Glove Dove runs along the counter beneath them and flicks
each one back up with its rubber fingers, keepy-uppy, until it drops into the
plate rack on the right.

- **Where.** A ring on the counter shows where each falling dish will come
  down; it turns pink when the Dove is under it.
- **When.** Press the action just as the dish lands on the glove for a
  **"Hup!"**: a high, long flick aimed at the rack (from near the sink it
  takes two). Press too soon and the fingers flick it only a short, low hop.
  Don't press and it bounces off the rubber once, low and short; the second
  time it slips off ("Slippery!"). A press that catches nothing leaves the
  fingers fumbling for almost a second, so mashing doesn't work.
- **Into the rack:** "Put away!". A dish that hits the counter or the floor
  smashes ("Crash!": no points lost, but it is gone). One that drops back into
  the sink just pops up again later.

## Scoring

Three points for each dish put away and one for each "Hup!". The page opens
at 35.

## Getting harder

At first one or two plates come up every three seconds. From 15 s cups and
bowls and then heavy pans and pie dishes join them (pans fly lower, so they
need more flicks), and dishes come faster (every 1.1 s by the end) with up to
six in the air at once.

Bots (`node --test test/glovedove.test.mjs`, six seeds): a beginner (slow on
the stick, pressing up to 0.15 s early or late) scores 54 to 73; a good
juggler 75 to 92. Running under every dish and mashing at four rhythms scores
8 to 29; running under every dish without pressing scores 0; idling 0.

## Controls

| Device | Run | Flick |
| --- | --- | --- |
| Controller | left stick or D-pad | A |
| Keyboard | ← / → or A / D | Space or Enter |
| Mouse / touch | the Dove runs to the pointer (or where you tap) | click or tap |

On a narrow screen the view follows the Dove, leaning towards the rack.

## Images

- **IC-M11a, the scene** (`scene.glovedove`): the kitchen from the side, the
  sink of suds on the left, an empty plate rack on the right, and a bare
  counter and wall between for play.
- **IC-M11b, dishes** (`sprites.dishes`, 3 x 2): six wet dishes seen from the
  side, spun in the air and stood in the rack.
- **IC-M11e, the Glove Dove cheering and dismayed** (`sprites.glovedovePoses`,
  2 x 1): when a dish is put away, and when one smashes. Until it arrives the
  portrait hops or squashes.
- **IC-M11f, the Glove Dove catching and flicking** (`sprites.glovedoveToss`,
  2 x 1): the long glove neck held level like a tray while a press is live,
  and snapping up for the flick. Until it arrives the portrait braces, then
  tips back, with little pink marks over the glove while a catch is ready.

## Changes after the audit

1. **Reworked the core.** Squeaky Clean (move over spots and rub them away,
   soap as a booster that foams over) played like Pressing Business. Slippery
   Dishes is a timing-and-positioning keepy-uppy: run under a falling dish and
   flick it on contact, the quality of the flick set by the timing, to carry
   it through the air into the rack. It shares no mechanic with Pressing
   Business (no wearing away, no booster) or with Scoop Stack (dishes are
   flicked on, not caught and stacked). The title, goal, tips and rhyme are
   new.
2. Not needed: there is no rubbing any more. The action is a single, timed
   press, the same on every device.
3. Scores grow steadily: one point per "Hup!" and three per dish put away,
   so a round is worth 35 to 80 rather than 7 to 13 dishes.

Images: the scene (IC-M11a) and the dishes (IC-M11b) are kept with new
prompts (side view instead of from above). The grime (IC-M11c) and the
scrubbing pose (IC-M11d) are no longer needed and are removed. IC-M11e is
kept but now asks for cheering and dismayed (it was cheering and swamped in
foam). The catching and flicking poses are new, as IC-M11f.

## Matched to the painting

The game was designed around the painting, which arrived during the rework.
The Glove Dove's long pink glove is its neck, held level behind its head with
the cuff open at the back. So the dishes land on top of the glove, not on the
head: the catch height (473 px, 355 painting units above the feet) and the
catch centre (57 px behind the feet, the middle of the glove) are measured
from the painting. The landing ring turns pink when the glove, not the
feet, is under a dish, and the pointer steers the glove to where you touch.
The Dove always faces left, towards the sink, so the glove always reaches
back towards the rack and the catch point never jumps when it turns. The
flick tips the whole painting back from the feet, so the glove swings up.
The pose requests (IC-M11e, IC-M11f) describe the painting's design: fingers
as a crest on the head, the long studded cuff behind it, and the scalloped
blue-grey body.

## Matched to the delivered art

The kitchen scene (IC-M11a) shows the counter top from a little above, so the
play space is lower than the stand-in's: the Dove now stands near the front
edge of the counter top (y 540; the edge is at 554), the sink's suds are at
y 390 and its rim at x 360, and a dish is put away when it drops through the
tops of the painted rack's wires (y 360, x 1250 to 1560); the dishes put away
stand on the painted tray. To fit the lower space the dishes fly on a smaller
scale (gravity and launches cut to 0.6, the same times in the air), so the
bots' scores hardly moved (beginner 51 to 68, good 76 to 87, mashing 4 to 27,
pass still 35). The hint sits on the tiles under the window. Still drawn in
code: the dishes (IC-M11b) and the Dove's catch, flick, cheer and dismay
poses (IC-M11e, IC-M11f), all requested.
