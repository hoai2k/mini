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
- A clock left waiting too long (12 s at first, 8 s by the end; its patience
  is the bar under the bubble) gives up, and the next one calls.
- Every fifth clock calls ten o'clock, the Trush's own hour: worth two.

## Scoring

One per clock set (two for ten o'clock). The page opens at 8.

## Getting harder

The first three times are o'clocks, an hour or three away, with a faint pink
ghost of the right hands on the face to match against; then half pasts; then
quarter past and quarter to; then five-minute times in words ("twenty-five to
nine"); then, from the fourteenth clock, any minute in digits ("7:43"), to be
set to the minute. The times also lie further round the face as it goes on.

Bots (`node --test test/titthrush.test.mjs`): a slow beginner (reads for 1.6
s, spins gently, sometimes presses too soon) sets 11 to 12; a good spinner 22
to 24; a keyboard player with ↑ / ↓ and ← / → about 24. Spinning while
mashing the button, mashing alone and idling score 0.

## Controls

| Device | Turn the hands | Set |
| --- | --- | --- |
| Controller | spin the left stick (one turn of the stick is one hour); or push it left or right and hold: a minute, then faster and faster | A |
| Keyboard | hold ← / → (a tap is one minute); ↑ / ↓ jump a whole hour | Space or Enter |
| Mouse / touch | drag the hands round the face (clockwise is later) | click or tap |

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
