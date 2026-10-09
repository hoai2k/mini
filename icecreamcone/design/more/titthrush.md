# Ten O'clock Tit Trush: Set the Clocks (50 s)

Bird 12 of the book's other birds. The Ten O'clock Tit Trush is a gold pocket
watch whose face shows ten o'clock. Code: `game/src/games/titthrush.js`;
entry: `game/src/more/titthrush.js`; tests: `game/test/titthrush.test.mjs`.

## Rules

The town's clocks want the Trush to keep their time. One after another a
town clock (the church clock, the station clock, the town hall clock, the
cuckoo clock) shows a time and calls it out in a speech bubble: "Half past
three!", with the digits underneath. Turn the hands of the Trush's big watch
face to match, then press the action (the crown) to set it. The hour hand
follows the minute hand like a real clock's, so going from ten o'clock to
half past three means turning the long hand round five and a half times, or
backwards six and a half. The watch starts, of course, at ten o'clock.

- Set the right time and the clock rings, the Trush hops and sings, and the
  next clock calls.
- Press on the wrong time and the crown jams for a second ("Not quite!", or
  "Wrong hour!").
- A clock left waiting too long gives up, and the next one calls. Its
  patience (the bar under the bubble) is 9 s at first and 6 s by the end,
  plus a second for every hour the hands have to travel.
- Every fifth clock calls ten o'clock, the Trush's own hour, when that is
  within three hours of the hands: worth two.

## Scoring

One per clock set (two for ten o'clock). The page opens at 9.

## Getting harder

Every time is within three hours of where the hands are. The first three
are o'clocks, with a faint pink
ghost of the right hands on the face to match against; then half pasts; then
quarter past and quarter to; then five-minute times in words ("twenty-five to
nine"); then, only from the sixteenth clock, any minute ("7:43"), to be set to the
minute. The digits are shown under the words throughout.

Bots (`node --test test/titthrush.test.mjs`): a slow beginner (reads for 1.6
s, spins gently, sometimes presses too soon) sets 11 to 13 over eight seeds;
a good spinner 25 to 27; a keyboard player with ↑ / ↓ and ← / → 23 to 24. Spinning while
mashing the button, mashing alone and idling score 0.

## Controls

| Device | Turn the hands | Set |
| --- | --- | --- |
| Controller | spin the left stick (one turn of the stick is one hour); or push it left or right and hold: a minute, then faster and faster; flick the stick (or the D-pad) up or down for a whole hour | A |
| Keyboard | hold ← / → (a tap is one minute); ↑ / ↓ jump a whole hour | Space or Enter |
| Mouse / touch | drag the long hand round the face (clockwise is later); grab the short hand to drag whole hours | tap (without dragging) |

Resting hands settle on the nearest whole minute. On a narrow screen the view
keeps the watch face and the town clock's call in view.

## Images

- **IC-M12a, the scene** (`scene.titthrush`): a small town square in the
  morning, kept calm where the game draws the watch, the town clock and its
  bubble, with no clocks of its own.
- **IC-M12b, the big watch face** (`sprites.watchFace`): the Trush's face
  without hands, its enamel face at a fixed size so the game's hands fit it.
- **IC-M12c, town clocks** (`sprites.townClocks`, 2 x 2): the church, station,
  town hall and cuckoo clocks without hands, each dial centred at a fixed size.
- **IC-M12d, the Trush singing** (`sprites.titthrushSing`): shown for a moment
  after each clock is set; until then the portrait hops.
- **IC-M12e, the Trush flustered** (`sprites.titthrushFluster`): after a wrong
  setting (while the crown is jammed) or when a clock gives up; until it
  arrives the portrait shakes.

## Changes after the audit

1. Targets now lie at most three hours from the hands (and the ten o'clock
   clock is called only when ten is within three hours), so there are at most
   three turns of the stick. Whole-hour jumps on every device: ↑ / ↓ on the
   keyboard, the D-pad or a quick flick of the stick on the controller (a
   flick from the middle with the stick not turning, so spinning never jumps),
   and on touch, grabbing near the short hand drags whole hours. The hint in
   the first seconds names the controls for the device in use.
2. Patience is 9 s falling to 6 s, plus a second per hour the hands must
   travel.
3. "Any minute" now starts at the sixteenth clock (it was the fourteenth);
   five-minute times come in words with the digits under them, as before.

Re-tuned: pass 8 → 9. Beginner bot 11 to 13 over eight seeds, good spinner
25 to 27, keyboard bot 23 to 24; spinning while mashing, mashing and idling
still score 0. New tests: an hour at a time on the controller and by
dragging the short hand; targets within three hours with patience growing
with the distance.

## Matched to the painting

The painting is a gold pocket watch with its lid open at the front, showing
ten o'clock. Flipped to face the big watch, its face read backwards, so the
Trush now always faces left, unflipped, at the far left (x 180, its beak
still on screen); the singing and flustered variants are drawn unflipped too.
The singing notes rise from its painted head. The variant requests
(IC-M12d sing, IC-M12e fluster) and the big watch face (IC-M12b) now describe
the painting: the hinged lid at the front, the crown and ring bow on its head,
the pink crest and wing, the chain tail, and the cream face with black
numerals.

## Matched to the delivered art

The town square scene (IC-M12a) keeps the middle quiet as asked: the big
watch sits over the square on the left, the town clock and its bubble over
the houses on the right, and the Trush stands on the cobbles at the bottom
left among the painted leaves. Nothing needed moving. Still drawn in code:
the big watch face (IC-M12b), the town clocks and their frames (IC-M12c, so
the church tower and cuckoo house stand-ins float over the painted houses
until it arrives), and the singing and flustered poses (IC-M12d, IC-M12e),
all requested.
