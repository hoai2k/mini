# The Ice-Cream Cone Coot: design

A game made from Arnold Lobel's *The Ice-Cream Cone Coot and Other Rare
Birds* (1971). It plays as a field guide: each page introduces one of the
book's rare birds, and then you play a short minigame as that bird, doing
what its object does. What the book looks like is in
[`../reference/README.md`](../reference/README.md).

It is for school-age kids, at about the level of Mario Party minigames: easy
to pick up, short (30 to 60 seconds), with a real score to beat. Each game
keeps your best score, has one score to reach to open the next page, and gets
harder the longer it runs. There are no medals or grades: beating your best
says "New World Record!" and nothing more specific.

## Flow

1. **Title.** The logo, Press Start, and the Instructions, Settings and
   Fullscreen buttons (see `GAME_GUIDELINES.md`).
2. **The field guide.** A spread of pages, one per bird. A bird you haven't
   met yet shows as an ink silhouette marked "Not yet spotted". The first
   bird is open from the start; reaching a bird's score opens the next page.
   Each tab shows your best score.
3. **The bird's page.** The bird large on cream paper, gently alive (it
   breathes, blinks, shuffles, does its thing now and then), with its name and
   a short rhyme in the game's own words (not the book's verses). "Read to
   me" speaks the rhyme. "Play" goes to the game.
4. **How to play.** A card with the goal, the controls for the device you are
   using, the score that opens the next page (until you've reached it) and
   your best. Any button starts.
5. **Play.** A 3-2-1 count, the game, then "Time!".
6. **Result.** Your score, under "New World Record!" when it beats your best
   and reaches the score that opens the next page ("Personal Best!" when it
   beats your best but falls short; otherwise "Time!" and your best), and the score that opens the next page
   if you haven't reached it yet. Options: Play again, Next bird, Back to the
   guide.
7. **The gathering.** When every bird has been spotted, a final page shows them all
   together, like the book's endpapers. Any bird can be replayed at any time.

The score to reach is the same for everyone and fairly gentle; beating your
own best is the long game.

## Controls

Every minigame uses the same small set of inputs, so kids learn them once.

| Action | Controller | Keyboard | Mouse / touch |
| --- | --- | --- | --- |
| Move | Left stick or D-pad | Arrow keys or WASD | Point (the game follows the pointer) |
| Action (press or hold) | A | Space or Enter | Click or tap (hold to hold) |
| Left / right step (Bobolinks only) | LB / RB, or ◀ ▶ | ← / → or A / D | Tap the left or right half |
| Pause | Menu or View | Esc or P | The pause button, top right |
| Menus | Left stick / D-pad, A, B | Arrows, Enter, Esc | Click |

## The minigames

Scores are whole numbers. The score that opens the next page (`pass`) is in
`game/src/birds.js`, tuned so it comes within a try or two.

### 1. Ice-Cream Cone Coot: Scoop Stack (45 s)

Scoops fall from the sky. Move the Coot left and right to catch them on its
head. Each scoop lands where it touches, so the stack leans; a stack that
leans too far topples and is lost, and you start again from the cone. Your
score is the tallest stack you build. Falling pickles and socks knock off
a scoop. Scoops fall faster as time goes on, and a golden cherry is worth
three.

A scoop that hits the side of the stack (or the Coot's head) clings there for
a moment, then slips down. How long it holds follows the physics: a stack
leaning away from it holds it longer, since that side faces up, and one
leaning towards it sheds it sooner; running towards its side presses it on,
running away peels it off, and a wobbling stack shakes it loose. A slipping
scoop comes to rest on a scoop that juts out below it, or on another
clinging scoop. A scoop that lands on a clinging one props it up, and if
it's high enough, level with the top, it is pushed up onto the stack.
Clinging scoops weigh on their side of the balance: they can tip the stack,
or steady one that leans the other way.

### 2. Cupadee: Tea Time (45 s)

A row of Cupadees walks in under the teapot one at a time. Hold the action
to pour and let go when the tea reaches the line. Close to the line scores
more, a perfect fill scores most, and a spill scores nothing and makes the
bird squawk. Later cups are smaller, walk faster or bob up and down.

### 3. Shuttercluck: Say Cheese (10 photos)

You are the Shuttercluck's eye. Birds from the book peek out of bushes, the
wall, the tree and the gate for a moment. Move the viewfinder and press the
action to take a picture. A bird in the middle of the frame scores most;
rarer birds score more. You have ten shots. The results show your photos.

### 4. Gramophone Gullfinch: Wind and Sing (one song)

Notes drift along the record's groove toward the needle. Press the action as
each one reaches it: perfect, good or miss. The spring runs down as you play,
and the song slows and sags; turn the left stick in circles (or mash the
action between notes, or drag in circles) to wind it back up. Score is the
accuracy, with a bonus for long streaks.

### 5. Flowerpot Plume: Bloom (45 s)

Five Flowerpot Plumes sit on the bench, and a watering-can rose hangs above.
Move it left and right and hold the action to water. A watered plume grows
from sprout to bud to full bloom, and each bloom scores and resets to a
sprout. A plume left dry wilts and loses its growth; one watered too long
gets soggy and stops growing for a moment. Plants dry out faster as time goes
on.

### 6. Highbutton Bobolinks: Left Foot, Right Foot (40 s)

The boots cross a moonlit stream on stepping stones. Each stone is on the
left or the right; press the matching side to step. A wrong step splashes
and costs a moment. Score is the stones crossed. The stones come faster, and
some are doubles (both at once).

### 7. Newspaper Peeper: Hot off the Press (45 s)

A word is printed at the top. Letters flutter down like loose feathers; move
the Peeper to catch the letters of the word in order. The wrong letter
smudges the word and costs a point. Finished words score by length. Words get
longer as you go.

### 8. Pincushion Piffle: Stitch in Time (45 s)

A dotted seam winds down the quilt as it scrolls. Steer the needle left and
right to follow it; hold the action to stitch faster, at the risk of
wandering off the seam. Score is the stitches sewn on the line.

### 9. Dollarbill Dodo: Spot the Dodo (8 rounds)

The Dodo hides under one of three hats on the counter (four, then five in
later rounds). The hats shuffle, faster each round. When they stop, move to
the right hat and press the action. Score is the rounds won, with a bonus for
answering quickly.

### 10. Safecrossing Crow: Safe Crossing (45 s)

The Crow is the traffic light at a zebra crossing. Press the action to switch
between green for the cars and red for the walkers. Little birds gather on
the pavements and cross on red; cars pile up on red and honk. Score is
everyone who crosses (birds and cars). Waiting too long makes them give up
and leave, and switching while someone is still on the crossing is a
near-miss that costs points.

## Look and sound

- Everything sits on cream paper, in ink and wash, like the book. The
  minigame scenes are framed like the book's few framed pictures.
- Until the art arrives, every bird is drawn in code from simple shapes in
  the book's colours, with a wobbly ink outline (`game/src/draw.js`).
- Type: a clean, slightly old-fashioned sans for the rhymes, as in the book,
  and a friendly serif for headings.
- Sound is synthesised in the browser: soft music-box and woodwind tunes, and
  plinks, pours, clicks and honks for the games.

## Later

- Two to four players, Mario Party style: everyone plays the same minigame
  together on one screen or takes turns, with the gathering page as the
  scoreboard.
- More birds from the book: the Waterglass Goose, the Wetweather Wren, the
  Key Crane, the Jackknife Niffy and others.
