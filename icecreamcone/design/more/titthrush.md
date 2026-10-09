# Ten O'clock Tit Trush: Clock Hop (45 s)

Bird 12 of the book's other birds. The Ten O'clock Tit Trush is a gold pocket
watch whose face shows ten o'clock. Code: `game/src/games/titthrush.js`;
entry: `game/src/more/titthrush.js`; tests: `game/test/titthrush.test.mjs`.

It replaces Set the Clocks (turn a big watch's hands to the time a town clock
calls), which read well but played slowly: a lot of turning, then one press,
and telling the time is a school skill some players don't have yet.

## Why this game

A pocket watch's whole life is hands going round. In Clock Hop the Trush
rides them: it perches on the tip of a clock's long hand, is carried round
and round, and lets go to fly to the next clock. One button, readable in
a second ("press when the dotted line points at a clock"), with something
happening all the time. There is a whoosh, a clang, a song and a
star-burst on every landing, and a tumble on the cobbles when it misses. The
skill grows from "any line through the clock" to threading bullseyes through
the middle of small, swaying clocks whose hands sweep fast. It is also a
shape the collection doesn't have yet.

Alternatives considered:

- **Round the Clock** (a rhythm game: notes sit round the watch face and
  you press as the sweeping hand reaches each). It's lively and very much a
  watch, but it's the Gramophone Gullfinch's game (notes riding a record to
  the needle).
- **Chime Back** (the town clocks chime a little tune, and you play it back
  by pointing the stick at each clock). It's gentle and musical, but it's the
  Waterglass Goose's Glass Harp, and a memory game is slow to play.
- **Wind the Town** (fly round the square winding the clocks before each runs
  down). It's a juggling game like Lights On and Bloom, and holding to wind
  isn't much fun from moment to moment.

## Rules

Clocks hang in the air over the town square: the church clock, the station
clock and the town hall clock, then from a third of the way in the cuckoo
clock too, which runs backwards (a little red arrow over it says so). There
is always the clock the Trush is on and two more to hop to.

- The Trush perches on the tip of its clock's long hand, which sweeps round
  (clockwise, or backwards on the cuckoo clock). A dotted line runs on from
  the tip the way the hand points. When it passes through another clock it
  turns pink and a dashed pink ring goes round that clock (thicker when it
  would be a bullseye).
- Press the action to let go. The Trush flies straight along the line.
  Reaching another clock's dial, it grabs that clock's long hand where it
  arrives and rides on from there. The clock it left chimes and fades, and
  a new one swings in somewhere else, never just where the hand is about to
  point (it always comes round to it).
- Through the middle of the dial (within 0.4 of its radius) is a
  **bullseye**.
- Miss every clock and the Trush tumbles onto the cobbles (or flies off
  the edge and drops back in), then after a moment flutters back to the
  clock it left. Nothing is taken off: the miss costs only time (about two
  seconds) and the run.
- The Trush needs a quarter of a second to get a grip on a new hand. Pressing
  before then makes it grab on again ("Hold on!"), so mashing never lets go.
- Now and then (every 8 to 11 s from 7 s in) **the gold ten o'clock watch**,
  the Trush's own hour, shows up with a glow and a gold arc that runs down
  over six seconds; then it goes.

## Scoring

| Event | Points |
| --- | --- |
| Reach a clock | 1 |
| Bullseye | +1 |
| The gold ten o'clock watch | 3 (4 with a bullseye) |
| Every fifth hop in a row | +1 |

The HUD shows the points and the run ("Points 22 · 10 in a row"). The page
opens at **14**.

## Getting harder

Over the 45 s: the long hand goes round in 3.4 s at first and 2.1 s by the
end; dials shrink from radius 100 to 72; the dotted line shortens from 1000
to 420 (by the end a far clock is out of its reach, and you judge the
rest); from 30% in, new clocks sway up and down; from 33%, the cuckoo
clock (backwards) joins; from 60%, new clocks drift slowly sideways.

## Balance

Bots (`node --test test/titthrush.test.mjs`) watch the hand come round and
press a moment ahead, with their timing off by up to `noise` either way:

| Bot | How it plays | Scores (seeds 1–8) |
| --- | --- | --- |
| Beginner | ±0.11 s, takes any line through a clock, lets a quarter of chances go by | 16–38 (all pass) |
| Clumsy | ±0.16 s, lets a third go by, slow to settle | 13–24 (7 of 8 pass) |
| Good | ±0.035 s, waits for bullseyes, goes for the gold watch | 45–54 (seeds 1–4) |
| Hopping blind | presses three times a second without looking | 1–13 (mean 5) |
| Mashing | presses every few frames | 0 |
| Idle | | 0 |

## Controls

| Device | Let go and hop |
| --- | --- |
| Controller | A (or RT) |
| Keyboard | Space or Enter |
| Mouse / touch | click or tap anywhere |

Nothing else is needed: the hand does the aiming. Clock centres stay within
x 470 to 1130 and y 290 to 650, so a narrow screen (`span` 1060 round x 800)
sees every clock, and the Trush perched on a hand pointing straight up stays
below the top of the picture.

## Images

Reused, all delivered:

- **IC-M12a, the scene** (`scene.titthrush`): the town square; the clocks
  hang over its middle.
- **IC-M12b, the big watch face** (`sprites.watchFace`) and **IC-M12f, the
  crown** (`sprites.watchCrown`): the gold ten o'clock watch, drawn at the
  bonus clock's size (its tick ring is 0.36 of the image round 0.5, 0.495).
- **IC-M12c, town clocks** (`sprites.townClocks`, 2 x 2): the clocks to hop
  between, each dial a quarter of its cell, so a clock of radius r is drawn 4r
  wide.
- **IC-M12d, singing** (`sprites.titthrushSing`): for half a second after
  each landing.
- **IC-M12e, flustered** (`sprites.titthrushFluster`): tumbling on the
  cobbles.

Requested:

- **IC-M12g, Tit Trush hopping** (`sprites.titthrushHop`, 2 x 1). Cell 1:
  perched, crouched, its claws closed at (0.5, 0.92) of the cell, drawn so the
  bird is 170 tall with its claws on the hand's tip. Cell 2: flying, level,
  lid shut, the case centred, turned along the flight and mirrored for
  rightward hops. Until it arrives, the portrait stands on the tip, and in
  flight it tilts the way it flies.
- **IC-M12h, clock hands** (`sprites.clockHands`, 2 x 1): the long hand (tip
  0.46 of the cell above its centred pivot) and the short hand (0.26),
  turned about the cell's centre. Until they arrive, tapered blue-black hands
  are drawn in code, the long one with a knob at its tip.

## Feel

Every hour mark the long hand passes ticks. Letting go whooshes. Landing
rings the clock (pitched by kind), the clock wobbles, stars burst (pink for
a bullseye, gold for the gold watch), the Trush sings with notes rising, and
there's a short rumble. A fifth hop in a row plays a little fanfare. A miss
bonks on the cobbles with a puff of dust and a wilting note. The music stays
`clockwork`.
