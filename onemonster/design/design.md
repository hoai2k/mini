# One Monster After Another: design

A game made from Mercer Mayer's *One Monster After Another* (Golden Press,
1974). Sally Ann posts a letter to her best friend Lucy Jane, and before the
mailman comes it is stolen by one monster after another. In the game you
**are** each monster in turn: you play a short challenge doing what that
monster does in the book, and at the end of it the letter is snatched from
you by the next monster, and you become that one. The story, the monsters and
the book's look are in [`../reference/README.md`](../reference/README.md).

It is for school-age kids, at about the level of Mario Party minigames: one
idea per challenge, easy to pick up, 30 to 60 seconds long, with a real score
to beat. The letter always goes on, as in the book: nobody is stuck on a
chapter, and a weak score still passes the letter along. What you collect is
**postmarks**: one, two or three stamped on the envelope per chapter.

## The idea that holds it together

- **The letter is the hero.** It is on screen in every chapter, it shows each
  monster's handling (a nibbled corner, a goo stain, a soggy edge, a torn-off
  stamp), and the route map between chapters traces where it has been.
- **The hand-off is the moment.** Every chapter ends the same way the book's
  pages do: "But before the ___ could ___, a ___ came along and ___ the
  letter." A short animated snatch, the new monster's name card, and you are
  it.
- **Passing the letter is passing the controller.** With two to four
  players, each chapter belongs to the next player in turn. The hand-off
  screen says whose turn it is ("Player 2, you are the Letter-Eating
  Bombanat!"), so on a single controller the letter and the controller change
  hands together.

## Flow

1. **Title.** The logo, Press Start, and the Instructions, Settings and
   Fullscreen buttons at the bottom right (see `GAME_GUIDELINES.md`).
2. **Choose.** *The Journey* (play every chapter in order), or *One Monster*
   (replay any chapter already reached). Then the number of players (1 to 4)
   and, for more than one, who joins: each player presses A on their own
   controller, or a single controller is shared and passed.
3. **Prologue.** A picture-book page in the book's layout (big painting
   above, a white text band below with a drop capital): Sally Ann writes her
   letter and puts it in the mailbox. Any button turns the page.
4. **Each chapter.**
   - *Name card:* the monster's portrait, its full name in the book's style
     ("The Stamp-Collecting Trollusk"), a one-line "what it wants" (stamps,
     a letter to eat, a Bombanat lunch), and in party mode whose turn it is.
   - *How to play:* the goal, the controls for the device in use, and the
     postmark targets. Any button starts.
   - *Play:* a 3-2-1 count, the challenge, then "SNATCH!" as the next monster
     arrives.
   - *Hand-off:* the snatch (a few seconds, skippable), the postmarks stamped
     on the envelope, the route map with one more step drawn on it.
5. **Epilogue.** The Grithix mails the letter; the mailman rides up on his
   official-looking motorcycle ("Unhand that official mailbox!") and rides
   away with it; Lucy Jane opens her mailbox and finds the letter, a little
   worse for wear. Then the envelope, covered in every postmark won, and in
   party mode each player's total, the most postmarks winning.
6. Back to the title, with the journey's best total kept.

## Controls

Every challenge uses the same small set of inputs, so kids learn them once.

| Action | Controller | Keyboard | Mouse / touch |
| --- | --- | --- | --- |
| Move / steer | Left stick or D-pad | Arrow keys or WASD | Point (the monster follows the pointer) |
| Action (press or hold) | A | Space or Enter | Click or tap (hold to hold) |
| Pause | Menu or View | Esc or P | The pause button, top right |
| Menus | Left stick / D-pad, A, B | Arrows, Enter, Esc | Click |

In party mode with several controllers, only the current player's controller
plays; the others can pause. With one shared controller, the hand-off screen
waits for a fresh press, so a button held while passing it over does nothing.
If the playing controller disconnects, the game pauses and asks for it back
(or for any controller to take over).

Settings: music and sound volume, vibration on or off, reduced motion, and
**Gentle mode** (slower hazards and longer timers for younger players; it is
shown on the results, but postmarks still count).

## The chapters

Scores are whole numbers; the postmark targets live in the game's monster
data and are tuned so that one postmark comes on a first try, two take some
practice and three are a stretch. Every challenge gets harder the longer it
runs.

### 1. The Stamp-Collecting Trollusk: Before the Mailman Comes (45 s)

*In the book:* he creeps up to Sally Ann's mailbox before the mailman comes,
steals the letter and gabbles away with a smirk on his snerk.

A side-on street of porches and flowerbeds, the mailbox at the far end and
the mailman's motorcycle puttering closer along the top of the screen as the
clock runs. Move the Trollusk from bush to bush toward the mailbox; hold A to
duck into a flowerbed. Neighbours, a dog and Sally Ann at her window look out
now and then (a little "eye" warning first): caught moving in the open and the
Trollusk scuttles back to the last bush. Reach the mailbox, press A to grab
the letter, and gabble back to the woods. Loose stamps blow along the street:
picking them up on the way is the bonus. Score: seconds to spare plus stamps.
Later, lookers look more often and with less warning.

*Snatch:* the Letter-Eating Bombanat flies out of Nowhere and snaps it up.

### 2. The Letter-Eating Bombanat: Over the Bubbley Goo (45 s)

*In the book:* he flies off with the letter over the Blue Ocean of Bubbley
Goo, looking for somewhere to sit down and eat it.

A side-scrolling flight. Press A to flap; let go to glide down. Goo bubbles
rise from the sea and pop, flinging blobs up; a hit sticks goo to your wings
and drags you down for a moment. Scraps of paper (old tickets, a menu, a
paper hat) float on the wind: snap them up as snacks. Score: distance flown
plus snacks. Later the bubbles come faster and the wind gusts.

*Snatch:* as he dips to land, a Bombanat-Munching Grumley reaches up out of
the goo and grabs him, letter and all.

### 3. The Bombanat-Munching Grumley: A Nice Bombanat Lunch (45 s)

*In the book:* he grabs the Bombanat out of the air from the goo and means to
slither down into the sea for a nice Bombanat lunch.

The Grumley lurks in the goo with only his eyes showing; Bombanats flit and
swoop overhead in loops. Move left and right under them and press A to lunge
up and grab. A Bombanat caught is popped in the lunch basket on the shore;
a miss leaves the Grumley spluttering in the goo for a moment. Some Bombanats
are decoys (a kite, a flapping umbrella) that cost a point. Score: Bombanats
caught. Later they fly faster and the decoys look more like Bombanats.

*Snatch:* SNAP! The letter drops from the struggling Bombanat onto the deck of
a passing ship. *(How the book gets the letter from the Grumley to the ship
is not in the text we have; check the scan and match it if it is better.)*

### 4. The Furious-Floating Ice-Ferg: Furious Floating (45 s)

*In the book:* the ship carrying the letter is struck by a Furious-Floating
Ice-Ferg as it nears land, SCRUNNCCCHHH!!

You are the Ice-Ferg, an iceberg in a terrible temper, seen from above.
Steer with the stick; you drift with the currents (arrows on the water), and
hold A to huff up a head of fury and charge. The captain's ship zigzags
toward the harbour at the top of the screen; bump it before it gets there.
Little fishing boats cross your path: bump one and you lose fury. Score:
seconds to spare when the ship is struck, plus a bonus for a full-fury
charge. Later the ship turns more sharply and the currents get stronger.

*Snatch:* as the ship goes down (the crew paddle away safely in their pink
raft), the captain stuffs a note into a bottle, pushes in the letter for good
measure and throws it into the ocean.

### 5. The Wild-'n-Windy Typhoonigator: Suck It All Up (50 s)

*In the book:* it storms along sucking up everything in its path, the whole
Blue Ocean of Bubbley Goo and the bottle too, until it is so full of fishing
boats, bottles and bubbly goo that it has to let go.

Two parts. *Inhale (40 s):* the sea scrolls below; steer the Typhoonigator's
spout and hold A to suck. Bottles, fish, buoys and goo score; the captain's
bottle (a red-and-white label) is worth the most and must be among the haul.
A fullness meter rises; let go of A to stop it bursting early. *Let go
(10 s):* morning comes, and the Typhoonigator lets go. Move it over the edge
of Nowhere, where the Yalapappus trundles to and fro, and press A to drop the
bottle; the nearer his head, the bigger the bonus (KER-PLOP). Score: haul
plus drop bonus.

*Snatch:* the bottle breaks, tinkle-plinkle, right on the Yalapappus's head.

### 6. The Paper-Munching Yalapappus: Munch and Chase (45 s)

*In the book:* he gleefully munches the Captain's note, but before he can
munch the letter the Trollusk snatches it in his snerk and runs away, and the
Yalapappus trundles after him, shouting and loudly grimming.

Two parts. *Munch (8 s):* mash A to munch the Captain's note before the
Trollusk arrives; every bite scores. *Chase (the rest):* a side-scrolling
chase across the bumpy land at the edge of Nowhere. The Yalapappus runs on
his own; press A to hop over rocks and holes, and steer up and down between
lanes for paper scraps to munch on the run. A bump slows him. A gap meter
shows how close the Trollusk is. Score: munches plus how much of the gap was
closed. Later the ground gets rougher.

*Snatch:* suddenly, out of the sky swoops the Letter-Eating Bombanat: SNIP!

### 7. The Bombanat-Collecting Grithix: Net Them All (45 s)

*In the book:* the Grithix, a Bombanat collector, nets everyone, FLIP-FLOP,
and does what anybody should do with a lost letter: he mails it.

Bombanats flutter around a clearing in loops and dives; one wears the
red-and-white necktie and carries the letter. Move the Grithix and press A to
swing his net. Each Bombanat netted goes in a collecting jar; the letter
Bombanat is worth five, and once netted, the letter can be posted: carry it
to the official-looking mailbox at the side while the Trollusk and the
Yalapappus try to trip you (step around them). Posting it early ends the game
with a time bonus; staying to net more is the gamble. Score: Bombanats netted
plus the posting bonus. Later the Bombanats fly in bigger flocks.

*Then:* the epilogue, with the mailman and Lucy Jane.

## Look and sound

- The book's look: dense pen-and-ink with crosshatching and furry,
  hair-by-hair monsters, under faded early-1970s washes (dusty mauve and
  lilac skies, olive and teal greens, ochre, slate seas, pink snouts). Story
  pages copy the book's layout: a big painting above a white text band with a
  drop capital. The title uses a chunky, bouncy display face in yellow.
- Until the art arrives, every monster is its stand-in rig (below) with each
  piece drawn in code from simple shapes in the book's colours, with a wobbly
  ink outline, and every scene is a simple painted-in-code version of the
  same place.
- Text in the game is our own, in the book's rhythm ("But before the ...")
  and using its names; the book's text is not reproduced.
- Sound is synthesised in the browser: a bouncy oom-pah tune for the
  journey, a sound for each monster (gabble, flap, slurp, creak, whoosh,
  munch, swish), and a rubber-stamp THUNK for each postmark.

## Sprites and animation

Every character starts from one **canonical model sheet**: its master view
large, with smaller front, back or three-quarter views beside it. Every other
image of that monster (the name-card portrait, the sprite sheets, its
appearance on story pages) is generated with the model sheet attached, so it
stays the same monster throughout. The requests are in
[`image-requests.md`](image-requests.md), five per monster: model sheet
(`OM-C`), portrait (`OM-M`), parts (`OM-R`), swaps (`OM-F`) and key poses
(`OM-K`).

Monsters move as **cut-out rigs** rather than frame-by-frame sprites, which
is what keeps them smooth:

- **Parts.** The parts sheet takes the monster apart in its master view: body,
  head, jaw, ears, each limb segment, wings, tail ends, cap, net. Each piece is
  drawn past its joint with a rounded end, so it can swing without a gap.
  On integration the sheet is keyed and cut into pieces in the order the
  request lists, and each piece gets a pivot and a parent in a rig file,
  `game/src/rigs/<monster>.js`, fitted by laying the pieces back over the
  model sheet's master view.
- **Motion.** The game animates the rig in code every frame: each piece's
  rotation, offset and scale are tweened between key poses with easing, so
  the movement is smooth at any frame rate. On top go the touches that make
  it feel alive: follow-through on ears, tie ends, napkins, robes, tails and nets (springs
  that lag their parent), squash and stretch on landings and lunges, a
  breathing bob, and blinks on a random timer. Facing left is the rig
  mirrored.
- **Swaps.** What rotation cannot do is drawn: a wing at the top or bottom of
  its beat, an open or chomping jaw, eyes alarmed, shut or dizzy, a clenched
  paw. A swap replaces its piece for a frame or a few, in the same place and
  scale. The Bombanat's flap, for one, rotates its wings and swaps through
  raised, level and swept-down shapes, cross-fading for a frame at each
  change.
- **Key poses.** The key-poses sheet is the target each animation is fitted
  to (the sneak cycle's two steps, the lunge, the swing), and the stills of
  the snatch at each hand-off.
- **Stand-ins.** Each rig exists before its art does: the same skeleton with
  its pieces drawn in code. Animation is built and tuned on the stand-ins,
  and a delivered parts sheet drops in with no change to the animation.

The rigs, and the animations each needs:

| Monster | Master view | Animations |
| --- | --- | --- |
| Stamp-Collecting Trollusk | Side view facing right, standing on his two short legs | Idle breathing, the tiptoe sneak cycle, ducking, the fright and scuttle back, the grab, the gabbling run cycle, being snatched from, wailing |
| Letter-Eating Bombanat | Side view facing right in flight, wings spread level | The flap cycle, gliding, diving and swooping, the snap, landing, goo-stuck flapping, struggling when grabbed, netted |
| Bombanat-Munching Grumley | Three-quarter view facing right, from the waist up, rising out of the goo | Lurking, rising, the lunge and grab, the miss and splutter, the lunch dance, the SNAP |
| Furious-Floating Ice-Ferg | Front three-quarter view from high above, floating, the waterline along its bottom edge | Drifting and bobbing, huffing up, the charge, the crash, the dazed bump |
| Wild-'n-Windy Typhoonigator | Front view from a little above, the water spout falling from its lips | Churning cloud, sucking, swelling as it fills, letting go, the morning sag |
| Paper-Munching Yalapappus | Side view facing right, standing on his two stumpy legs | The trundle cycle, the hop and landing, munching, the bonk, the shouting chase, wailing |
| Bombanat-Collecting Grithix | Side view facing right, standing upright, the net over his shoulder | The stride cycle with a swinging tail, the net swing in three beats, the slam, posting the letter, tripping, the stroll home |

The people (the girls, the mailman, the captain and crew, the neighbours and
their dog) are small and move little, so they are whole sprites drawn from
one shared cast model sheet; the props of each chapter come on one sheet per
chapter.

## Later

- All four players at once on one screen in the challenges that suit it (the
  Grumley's lunch, the Grithix's net), Mario Party style.
- A second Trollusk and Bombanat round, as in the book, where they win the
  letter back for a moment.
