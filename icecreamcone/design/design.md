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

1. **Title.** The logo, Press Start, and the Controls, Settings and
   Fullscreen buttons (see `GAME_GUIDELINES.md`).
2. **The field guide.** A card for each of the book's 28 birds, in order:
   the ten below first, then the other 18 (the Milkbottle Midge to the Radio
   Bird; their games are in [`more/`](more/)). A bird you haven't met yet
   shows as an ink silhouette marked "Not yet spotted". The first bird is open
   from the start; reaching a bird's score opens the next page. Each tab shows
   your best score, and the heading counts the birds spotted ("3 of 28").
   The cards sit seven to a row (five on a narrower screen, three on a phone
   held upright) in a sheet that scrolls, its top and bottom edges fading
   like paper running on; the chosen card is always scrolled into view. Down
   goes to the card below, not to the buttons, until the last row; left and
   right run on from the end of one row to the next. The chosen card is
   unmistakable from the sofa: it lifts and grows, ringed in pink with its
   name on a pink tab, its bird comes alive, and the other cards fade back a
   little. Only the cards in view are drawn, and only the chosen one every
   frame. Under the cards: Back, the Sticker Book (Y on a controller) and
   Settings.
3. **The bird's page.** The bird large on cream paper, gently alive (it
   breathes, blinks, shuffles, does its thing now and then), with its name, a
   short rhyme in the game's own words (not the book's verses), and how its
   game plays: the goal, the controls for the device you are using, a few
   tips, and the score that opens the next page (until you've reached it) or
   your best. The rhyme is read aloud when that setting is on. One button,
   Play, starts the game; B, Esc or the × in the corner goes back to the
   guide.
4. **Play.** A 3-2-1 count, the game, then "Time!".
5. **Result.** The first time a round reaches the bird's score there is no
   result card but a celebration (about six seconds), drawn in the book's
   ink and watercolour: the bird's portrait pops in as a die-cut sticker (a
   cream margin following its outline, a cut edge, a shadow, a light sweeping
   across it) with its name; the field guide's sticker book opens under it,
   at the spread with the bird's place: the book has two spreads of 14
   (pages 1 to 14, 15 to 28), each two facing pages of seven places in the
   guide's order (rows of 2, 3, 2 side by side, or 4, 3 one above the
   other), the stickers already earned stuck in theirs (or wherever the
   player has put them, over the picture chosen for the book) and the rest
   pencilled outlines with their page numbers; the new sticker flies to its
   place and sticks with a slap and a puff ("A new page is open: ..."). Then the guide comes
   back, the next card still locked; it turns over to show its bird, with a
   New tab, and is chosen, ready to play (after the last bird, the bird
   itself is chosen). Any press (A, Enter, Space, a click or tap) jumps to
   the next step; B, Esc or a long press skips to the end. With reduced
   motion the steps fade instead of flying and turning.

   Every other round shows the result card for about three seconds: the
   score, under "New World Record!" when it beats your best and reaches the
   score that opens the next page ("Personal Best!" when it beats your best
   but falls short; otherwise "Time!" and your best), the score that opens
   the next page if you haven't reached it yet, and the game's own summary
   lines. It has no buttons: a little bar runs down, any press goes on
   sooner, and the guide comes back with the bird just played chosen.
6. **The sticker book.** From the guide (its button, or Y), the book alone,
   as large as the screen allows, with every sticker earned. Any sticker can
   be picked up and put anywhere on the pages of its spread: dragged with the
   mouse or a finger, or, with a controller or the keyboard, a little ink hand
   moved with the stick or the arrows picks it up with A (Space) and puts it
   down with A again; while carried it lifts with a shadow and follows. The
   one put down goes on top of the pile; stickers may overlap; one let go off
   the pages is kept just inside the nearer page. B (Esc) puts a carried
   sticker back where it was, and otherwise closes the book. LB / RB (Q / E,
   or the arrows by its name) change the picture behind the stickers: the
   plain page, then a picture for each bird passed, in the guide's order,
   named by the bird. Each bird has its own painting for the book (IC-B01 to
   IC-B28, `book.<id>`: 2:1, a fold down the middle), drawn to the edges of
   both pages, its left half on the left (or upper) page and its right half
   on the other; until it arrives, the bird's game scene stands in, pasted in
   across the spread with its edges fading into the paper. Over a picture
   the headings and names sit on paper labels. LT / RT (Page Up / Page Down, or the arrows at the sides) turn
   between the two spreads. Every place (kept as a share of its page, so it
   stays put whether the book lies open side by side or one page above the
   other), the pile's order, the picture and the spread are saved
   (`icecreamcone.stickers.v1`) and kept from visit to visit; forgetting the
   scores in Settings empties the book too. In ?debug and ?all every sticker
   and picture is there.
7. **The gathering.** When every bird has been spotted, a final page shows them all
   together, like the book's endpapers. Any bird can be replayed at any time.

**The pause menu** has only buttons that do something: How to play, Settings,
and, small at the foot, Restart and Exit to Field Guide. There is no Resume
or Back button: B (or Esc, or the Menu button again), the × in the corner, or
a click or tap outside the dialog returns to the game. How to play shows the
bird's card again, with a Controls button for the simple controls page. These
two pages have nothing else to choose, so A goes straight back to the game
and B steps back one page; nothing is focused until the stick moves.

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

These are the first ten; the other 18 (pages 11 to 28) are described in
[`more/`](more/), one file per bird, with their guide entries in
`game/src/more/`. Scores are whole numbers. The score that opens the next page (`pass`) is in
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

As the stack grows the view makes room, so there is always a good stretch of
sky above the top scoop, and new scoops start just above the top of the
view: a tall stack gets the same warning as a short one. First the Coot
steps back along the boardwalk, a little smaller with distance; then the
camera pulls back over the wide seaside painting (IC-S11), so the whole
scene shrinks together, down to half size. Until that painting arrives the
seaside stays put and only the Coot and its scoops shrink. The view closes
in again slowly after a topple.

### 2. Cupadee: Tea Time (45 s)

A row of Cupadees walks in under the teapot one at a time. Hold the action
to pour and let go when the tea reaches the line. Close to the line scores
more, a perfect fill scores most, and a spill scores nothing and makes the
bird squawk. Later cups are smaller, walk faster or bob up and down.

### 3. Shuttercluck: Say Cheese (10 photos)

You are the Shuttercluck's eye. The as-yet-undiscovered birds peek out of
bushes, the wall, the tree and the gate for a moment: ten of our own (the
Hourglass Heron, the Spectacle Snipe and the rest, see
`game/src/subjects.js`) and those of the book's 18 later birds (the Milkbottle
Midge, the Key Crane, the Glove Dove...) whose pages in the guide are still
closed, decided as each round starts. Once every page is open only our ten
are left; in ?debug and ?all, with everything open, it is all 28 again. What
a round scores depends on the birds' rarity, not on how many there are to
find, so the score to reach stays the same. Each is drawn from its painting
(IC-R01 to IC-R18, IC-N01 to IC-N10). Move the viewfinder and press the
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
- The gathering page's painting shows the first ten birds; a gathering of
  all 28 would need a new one.
