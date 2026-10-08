# One Monster After Another: design

A game made from Mercer Mayer's *One Monster After Another* (Golden Press,
1974). Sally Ann posts a letter to her best friend Lucy Jane, and before the
mailman comes it is stolen by one monster after another. In the game you
**are** each monster in turn, as it tries to snatch the letter from the
monster that has it: you play the snatch, celebrate with the prize, and then
the next monster is spotted eyeing it, and you become that one. The story, the monsters and
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
- **Every chapter is a snatch.** You play the monster trying to get the
  letter from whoever has it, and the holder fights to keep it. Get it, and
  you celebrate.
- **The cliffhanger is the hand-off.** Mid-celebration, the camera finds the
  next monster eyeing the prize, the way the book's pages turn: "But before
  the ___ could ___, ..." Its name card comes up, and you are it.
- **Passing the letter is passing the controller.** With two to four
  players, each chapter belongs to the next player in turn. The hand-off
  screen says whose turn it is ("Player 2, you are the Letter-Eating
  Bombanat!"), so on a single controller the letter and the controller change
  hands together.

## Flow

1. **Title.** The logo, Press Start, and the Instructions, Settings and
   Fullscreen buttons at the bottom right (see `GAME_GUIDELINES.md`).
2. **Choose.** *The Journey* (play every chapter in order, alone or with
   up to four players taking turns), *Snatch & Keep* (the journey for two
   players head to head, below), or *One Monster* (replay any chapter already
   reached, alone or head to head). For more than one player, each presses A
   on their own controller to join, or a single controller is shared and
   passed.
3. **Prologue.** A picture-book page in the book's layout (big painting
   above, a white text band below with a drop capital): Sally Ann writes her
   letter and puts it in the mailbox. Any button turns the page.
4. **Each chapter.**
   - *Name card:* the monster's portrait, its full name in the book's style
     ("The Stamp-Collecting Trollusk"), a one-line "what it wants" (stamps,
     a letter to eat, a Bombanat lunch), and in party mode whose turn it is.
   - *How to play:* the goal, the controls for the device in use, and the
     postmark targets. Any button starts.
   - *Eyeing the prize:* a short scene (skippable) of the new monster
     watching the holder with the letter, from hiding.
   - *Play:* a 3-2-1 count, then the snatch: get the letter from the holder.
     "SNATCH!" when you do.
   - *Celebrate:* your monster's victory with the letter, while the postmarks
     are stamped on the envelope and the route map draws one more step.
   - *Spotted:* mid-celebration, the camera finds the next monster eyeing the
     prize, and the next chapter's name card follows.
5. **Epilogue.** The Grithix mails the letter; the mailman rides up on his
   official-looking motorcycle ("Unhand that official mailbox!") and rides
   away with it; Lucy Jane opens her mailbox and finds the letter, a little
   worse for wear. Then the envelope, covered in every postmark won, and in
   party mode each player's total, the most postmarks winning.
6. Back to the title, with the journey's best total kept.

## Controls

Every challenge uses the same small set of inputs, so kids learn them once:
move, one action button, and sprint for the chases.

| Action | Controller | Keyboard | Mouse / touch |
| --- | --- | --- | --- |
| Move / steer | Left stick or D-pad | Arrow keys or WASD | Point (the monster follows the pointer) |
| Action (press or hold) | A | Space or Enter | Click or tap (hold to hold) |
| Sprint (hold) | B | Shift (player 2 in versus: right Shift) | The sprint button, bottom left |
| Pause | Menu or View | Esc or P | The pause button, top right |
| Menus | Left stick / D-pad, A, B | Arrows, Enter, Esc | Click |

In the turn-taking journey with several controllers, only the current
player's controller plays; the others can pause. In Snatch & Keep both
players play at once (see below). With one shared controller, the hand-off screen
waits for a fresh press, so a button held while passing it over does nothing.
If the playing controller disconnects, the game pauses and asks for it back
(or for any controller to take over).

Settings: music and sound volume, vibration on or off, reduced motion, and
**Gentle mode** (slower hazards and longer timers for younger players; it is
shown on the results, but postmarks still count).

## Two-player versus

*Snatch & Keep* is the journey for two players head to head: in every
chapter one player is the **snatcher** and the other the **holder**, the one
with the letter trying to keep it, and the sides swap each chapter. Player 1
snatches in the odd chapters and player 2 in the even ones, so over the nine
chapters each player is both the Trollusk who sneaks and the mailbox's
lookouts who watch for him.

- **Winning a chapter.** The snatcher scores by getting the letter, with
  postmarks for time to spare as in the journey. The holder scores by
  keeping it: postmarks for how long they held out, and the full three if the
  clock runs out (then, as in the book, the holder fumbles it in the
  hand-off scene and the story goes on). The celebration belongs to whoever
  won the chapter: the snatcher with the letter, or the holder with a
  raspberry at the snatcher. At the end, the most postmarks wins.
- **Fair sides.** Each chapter is tuned so that two players of the same skill
  win about half the time each way; the tuning lives in the chapter data.
  Each player can turn on Gentle mode for themselves, which helps only them.
- **The same game alone.** In the solo journey the holder is played by the
  computer through the same holder controls, so every holder below is an AI
  in one-player and a player in versus, and the two never drift apart.
- **Devices.** Two controllers, one each. Or one keyboard shared: player 1
  on WASD, Space and left Shift, player 2 on the arrow keys, Enter and right
  Shift. On a touch screen
  the screen splits in two (left half and right half), each player steering
  by dragging in their half and tapping to act there. The chapter intro shows
  each player their own controls and their side's goal.

What the holder does in each chapter (and the AI does alone):

| # | Snatcher | Holder | The holder's controls |
| --- | --- | --- | --- |
| 1 | Trollusk | The lookouts (Sally Ann at her window, the dozing neighbour, the dog) | Move a spotlight-eye between the three lookouts; press A to make one look out (the eye warning shows first, so it can be read); each lookout needs a moment to rest after looking. The mailman puttering along the top is the holder's clock |
| 2 | Bombanat | Trollusk, running through the wood | Steer the scurry left and right along the ground, A to hop logs, down to duck under branches and hide the letter under his hat |
| 3 | Grumley | Bombanat, looking for somewhere to land | Fly (A to flap) among the plain Bombanats; the goo bubbles show where the Grumley is lurking, if you watch closely |
| 4 | Ice-Ferg | The *Peg*, the captain at the wheel | Steer the boat for the harbour; A for a burst of steam that cannot be used again for a few seconds |
| 5 | Typhoonigator | The captain's bottle, adrift | Steer the bottle with the waves; A to bob under the surface for a moment (the spout can't suck what it can't reach) |
| 6 | Yalapappus | Typhoonigator, letting go | Steer the cloud above; A drops the next thing in its belly (boats, fish, goo); the bottle is somewhere in the queue, shown to the holder only, and the holder decides where to drop it |
| 7 | Trollusk | Yalapappus, munching, then chasing | While munching, A to look round (red light, green light); after the snatch, chase the Trollusk: steer, A to hop |
| 8 | Bombanat | Trollusk, running across open ground | As in chapter 2, but in the open; the Yalapappus stomps behind on his own |
| 9 | Grithix | Bombanat with the letter | Fly about the clearing, A to flap; other monsters scramble on their own; once netted, the holder takes the Trollusk and trips the Grithix on his way to the mailbox |

## The chapters

Every chapter is one snatch from the book, played as the monster doing the
snatching, in the book's order. Nine snatches, seven monsters: the Trollusk
and the Bombanat each come back for a rematch, as they do in the book, with
a new twist on their game. Scores are whole numbers; the postmark targets live
in the game's monster data and are tuned so that one postmark comes on a first
try, two take some practice and three are a stretch.

The holder always fights to keep the letter (it runs, dodges, flaps, hides),
and gets cleverer the longer the chapter runs. Each chapter has a time limit;
if it runs out before the snatch, the holder stumbles at the last moment and
the letter is snatched anyway, for no postmarks (the book never stops, and
neither does the game). Score is mostly time to spare, plus each chapter's
own bonus.

### 1. The Stamp-Collecting Trollusk snatches it from the mailbox (45 s)

*In the book:* Sally Ann posts her letter; before the mailman comes, the
Trollusk creeps up to the mailbox, steals it and gabbles away with a smirk on
his snerk.

*Eyeing the prize:* the Trollusk peeks round a gnarled tree as Sally Ann
posts the letter and skips back indoors.

A side-on country lane: the picket fence, gnarled trees, flowerbeds, and Sally
Ann's mailbox at the far end, with the mailman's motorcycle puttering closer
along the top of the screen as the clock runs. Move the Trollusk from cover
to cover toward the mailbox; hold A to duck into a flowerbed. Sally Ann at her
window, a dozing neighbour and a dog look out now and then (a little eye
warning first): caught moving in the open and the Trollusk scuttles back to
the last cover. Reach the mailbox and press A to grab the letter before the
mailman gets there. Bonus: loose stamps blowing along the lane.

*Celebrate:* he hugs the letter, sniffs the stamp and does a gabbling jig.

### 2. The Letter-Eating Bombanat snatches it from the Trollusk (45 s)

*In the book:* before the Trollusk can tear off the stamp, the Bombanat flies
out of Nowhere and snaps up the letter.

*Eyeing the prize:* high in a tree, the Bombanat licks his snout as the
Trollusk sits down to work the stamp off.

A side-scrolling flight over the wood. The Trollusk, warned, gabbles off
along the ground with the letter in his snerk, ducking under branches and
logs. Press A to flap, let go to glide, and hold the stick down to dive;
swoop low over him and the snap is automatic when your jaws reach the letter.
Branches and the Trollusk's flailing paws knock you back up. Bonus: the
Trollusk's dropped stamps snapped up on the way.

*Celebrate:* a loop-the-loop, the letter in his teeth, and off over the Blue
Ocean of Bubbley Goo to find somewhere to eat it.

### 3. The Bombanat-Munching Grumley snatches it from the Bombanat (45 s)

*In the book:* the Bombanat flies over the Blue Ocean of Bubbley Goo; the
Grumley reaches up out of the goo and grabs it, letter and all.

*Eyeing the prize:* two spectacled eyes rise from the goo and follow the
Bombanat across the sky.

The goo seen side-on. The Grumley lurks with only his eyes above the goo;
move left and right, sinking out of sight, and press A to lunge up with a
crab claw. The letter Bombanat (the one in the red-and-white necktie) swoops
and dips among other Bombanats, looking for somewhere to land; each lunge
that misses warns it off for a while. Grabbing a plain Bombanat costs time;
the letter Bombanat is the one. Bonus: plain Bombanats grabbed for lunch
along the way, popped into the lunch basket on the shore.

*Celebrate:* napkin on, fork up... and SNAP! A big fishing net snags him and
hauls him wiggly-squiggly aboard the fishing boat *Peg*, Bombanat, letter and
all.

### 4. The Furious-Floating Ice-Ferg wrecks the fishing boat (45 s)

*In the book:* before the fishing boat can reach land, a Furious-Floating
Ice-Ferg strikes it, SCRUNNCCCHHH!! As it goes down, the captain stuffs a
note into a bottle, pushes in the letter for good measure and throws it into
the ocean.

*Eyeing the prize:* one beady eye opens in a crevice of the ice as the *Peg*
chugs past with the Grumley's tentacles over its side.

The sea from above. Steer the Ice-Ferg; it drifts with the currents (arrows
of foam on the water), and holding A huffs up a head of fury for a charge.
The *Peg* zigzags for the harbour at the top of the screen; strike it before
it gets there. Little rowing boats cross your path: bump one and you lose
fury, and a charge too hard sends a sea lion sliding off your ledges. Bonus:
a strike at full fury.

*Celebrate:* the eye glares in triumph, the sea lions clap their flippers,
and the captain's bottle bobs away on the waves.

### 5. The Wild-'n-Windy Typhoonigator sucks it up out of the sea (45 s)

*In the book:* the Typhoonigator comes storming along, sucking up everything
in its path, the whole Blue Ocean of Bubbley Goo and the bottle too.

*Eyeing the prize:* the storm cloud's face turns, sniffing, toward a bottle
bobbing far below.

The sea from above, scrolling. Steer the Typhoonigator's spout and hold A to
suck. The captain's bottle (the red-and-white label) bobs among other
bottles, fish, buoys and rowing boats, drifting away from the spout; get it
in. Everything else sucked up fills the fullness meter, and a full
Typhoonigator slows down, so suck carefully. Bonus: how little else you
swallowed on the way.

*Celebrate:* a great swirling burp of satisfaction, and away it storms, so
full by morning that it has to let go.

### 6. The Paper-Munching Yalapappus catches it at the edge of Nowhere (45 s)

*In the book:* down falls the bottle, KER-PLOP, right on the head of the
Yalapappus, who lives on the edge of Nowhere. It breaks, tinkle-plinkle, and
he gleefully munches the Captain's note.

*Eyeing the prize:* the Yalapappus, napkin on and fork up, looks up hungrily
as the swollen Typhoonigator groans overhead.

Side-on at the edge of Nowhere. The Typhoonigator lets go: fishing boats,
fish, bottles and blobs of goo rain down. Trundle left and right (A to hop)
to catch the captain's bottle on your head, KER-PLOP, while dodging the rest;
a boat or a fish on the head dazes you for a moment. Then mash A to munch the
Captain's note. Bonus: paper scraps caught and munched on the way.

*Celebrate:* he pats his tummy, napkin flapping, and reaches for the letter
for afters.

### 7. The Stamp-Collecting Trollusk snatches it back (45 s)

*In the book:* before the Yalapappus can munch the letter, the Trollusk, who
just happens to be passing by, snatches it in his snerk and runs away, and
the Yalapappus trundles after him, shouting and loudly grimming.

*Eyeing the prize:* the Trollusk's hat and snerk rise slowly behind a rock.

The Trollusk's rematch, with a new twist: first the snatch, then the
getaway. Creep up behind the munching Yalapappus as in chapter 1 (freeze when
he looks round), press A to snatch, and then run a side-scrolling getaway
across the bumpy ground with the Yalapappus trundling after you, A to hop
rocks and holes. Score: time to the snatch plus how far ahead you stay.

*Celebrate:* he waves the letter over his head at the puffing Yalapappus.

### 8. The Letter-Eating Bombanat snatches it again (30 s)

*In the book:* suddenly, out of the sky swoops the Bombanat, SNIP!

*Eyeing the prize:* a mauve wing-shadow sweeps across the ground.

The Bombanat's rematch, short and fast: swoop on the running Trollusk as in
chapter 2, but now the Yalapappus is stomping along behind, waving his paws
at anything in reach, and the ground is open with nowhere to hide.

*Celebrate:* a smug glide... straight toward a waiting butterfly net.

### 9. The Bombanat-Collecting Grithix nets them all, and mails it (60 s)

*In the book:* by way of a net, everyone is caught, FLIP-FLOP, by the
Bombanat-Collecting Grithix, who does what anybody should do with a lost
letter: he mails it.

*Eyeing the prize:* the Grithix peeks round a tree, net raised, smiling.

A clearing in the wood. The Bombanat with the letter, the Trollusk and the
Yalapappus scramble about; move the Grithix and press A to swing his net,
FLIP-FLOP. Net the Bombanat to get the letter, then carry it to the
official-looking mailbox while the Trollusk and the Yalapappus try to trip
you (step round them, or net them too). Bonus: everyone netted before
posting.

*Celebrate:* he drops the letter in the slot, dusts off his hands, and
doesn't care a snickle. And who is eyeing the official mailbox? The official
mailman, for the epilogue.

## Chases

Chapters 2, 7, 8 and 9 are chases, and chapter 3 borrows from them. A chase
has to be a contest of wits, not of who presses a button first: every move
has an answer, and every move costs something. The same chase kit runs every
chase, with each creature's own speed, weight and moves.

**The moves.**

- **Run and sprint.** The stick runs. Holding **Sprint** (B, Shift, or the
  sprint button on a touch screen) is much faster but drains a stamina
  meter, shown as a ring round the creature's feet. Stamina comes back while
  walking or hiding, slowly, and faster standing still. Run it dry and the
  creature is *winded*: slow for a couple of seconds, panting. Sprinting is
  how you close a gap or open one, and the meter is how you know when the
  other side can't.
- **Hide.** Cover (bushes, logs, rocks, flowerbeds, a tree to circle) stands
  about the play area. A holder who stops inside cover vanishes: the computer
  snatcher loses sight of them and goes to where it last saw them. Moving
  inside cover makes it rustle, so creeping is a giveaway; sitting still is
  safe but gets you nowhere and the clock is the snatcher's enemy, not yours.
  In versus, where both players see the same screen, some cover rustles on
  its own (the wind, a bird) so the snatcher still has to guess.
- **Lunge** (snatcher: A at a distance). A fast committed dash or dive at the
  holder, longer for the Bombanat's dive and the Grithix's net swing. If it
  misses, the snatcher stumbles and can't lunge again for a moment. A lunge is
  the way to catch a holder who is sprinting in a straight line.
- **Dodge** (holder: A). A quick sidestep, hop or duck, with a cooldown. A
  dodge timed against a lunge makes it miss and buys a stumble's worth of
  time; a dodge wasted leaves the holder open.
- **Grab and break free.** A snatcher who reaches the holder (or lands a
  lunge) grabs them, and a tug starts: a bar between them, each mashing A to
  pull their way, and tilting the stick against the other's pull doubles the
  effect. Stamina counts: a winded holder is easy to hold, a fresh one hard.
  If the snatcher wins, it's the snatch. If the holder wins, they break free,
  the snatcher is dazed for a moment, and the holder gets a head start.
- **Obstacles.** Logs, rocks and holes slow some creatures and not others:
  the small Trollusk hops a log the Yalapappus has to go round, while the
  Yalapappus rolled into a ball bowls through bushes. The Bombanat can't dive
  through leaves, and the Grithix can pole-vault what he can't step over.

**Why no move always wins.** Sprinting wins a straight race but runs out;
lunging catches a sprinter but a dodge beats it; dodging beats a lunge but
not a patient snatcher who walks up and grabs; grabbing ends in a tug that
stamina decides, so the snatcher wants the holder tired first and the holder
wants to rest in cover first. Hiding beats a snatcher who is far away, not one
who saw you go in. Each creature leans on different moves, so each chase feels
different.

**The computer holder** (solo play) runs the same kit: it keeps its distance,
breaks line of sight through cover, rests when it can, sprints when the
snatcher sprints, and dodges lunges with a skill that rises through the
chapter (and stays lower in Gentle mode). It is beatable by pressure,
patience and ambush, and it makes mistakes on purpose now and then.

## How each creature moves

Moving is the toy. Each creature gets its own way of getting about, with its
own weight and timing, and it should be fun just to steer it round an empty
screen before any goal is added. All of it is tuned by feel in the game's
monster data (speeds, springs, squash amounts), and the animation is driven by
the movement, never the other way round: speed sets the stride or the beat,
turning tilts the body, landing squashes it.

- **The Stamp-Collecting Trollusk: tiptoe, freeze, scurry.**
  *Tiptoe* is slow, high-kneed and hunched, the snerk leading, each step
  placed with a little wobble; it is silent. *Freeze* (let go of the stick)
  snaps him into a disguise pose, holding a leafy twig in front of his face
  with his hat poking over it; a lookout who catches him frozen is not fooled
  for long, but for a moment. *Scurry* (holding the stick) is a gabbling
  sprint, legs a blur, arms windmilling, the MY STAMPS bag swinging and the
  hat bouncing on his head, with a skid and a dust puff on every turn. He
  hops low and lands with a squash.
- **The Letter-Eating Bombanat: flap, glide, dive, wing-walk.** Each press
  of A is one wing beat that lifts him (rapid presses climb, a held glide
  sinks slowly), with momentum, so a well-timed series of beats feels like
  swimming through the air. Pulling down tucks the wings for a steep dive
  that gains speed, and pulling up out of it trades the speed for height in a
  swoop. Too slow and he stalls into a frantic flutter. On the ground he
  wing-walks like a bat, hobbling on his wrist claws, which is slow and
  undignified and very funny. The necktie and his thin tail stream behind him, and the propeller on his cap
  spins with every beat, faster as he climbs.
- **The Bombanat-Munching Grumley: lurk, glide, lunge.** Under the goo he
  glides in any direction with only his horns and spectacled eyes above
  the surface, leaving a V-shaped wake and a trail of bubbles; he can sink
  out of sight entirely (and bubbles give him away). The lunge shoots a
  spiny crab arm up out of the goo, stretching to three times its length, the
  claw (which has its own little eyes and teeth) snapping shut at the top, and
  then springing back; a full lunge throws his whole head and body up out of
  the goo in a splash. His tentacles wave lazily all the time, and the claws
  click open and shut while he waits.
- **The Furious-Floating Ice-Ferg: drift, huff, charge.** Heavy and slow:
  it turns ponderously, carries its momentum, and drifts with the currents,
  so steering is about planning ahead. Holding A huffs it up, swelling, with
  freezing mist pouring off it and its eye narrowing; letting go launches the
  charge, a surge across the water that leaves a wake and rocks everything
  nearby. It bobs and wobbles at rest, and the sea lions on its ledges react
  to everything it does: they doze, sit up in alarm, cling on, and slide off
  with a splash if it charges too hard.
- **The Wild-'n-Windy Typhoonigator: roll and suck.** It rolls across the
  sky as a churning mass of cloud: the loose puffs orbit and tumble round its
  face, and the spout below sways and lags behind it like a hose, so the
  bottom of the spout swings wide on turns. Holding A sucks: the cloud
  inhales, the cheeks hollow, a vortex spins up on the water, and things
  spiral up the spout. As it fills it swells and slows, its cheeks bulging.
- **The Paper-Munching Yalapappus: trundle and roll.** His trundle is a
  bouncy waddle: his round furry body bobs up and down on stumpy legs that
  go too fast, the napkin flapping. Running downhill or holding A at speed
  tucks him into a ball and he rolls, bowling along and bouncing off rocks,
  and unrolls with a dizzy wobble. From chapter 6 on, a little pink octopus
  rides on his head and clings on for dear life. His hop is a big jump with a huge squash on
  landing that shakes the ground.
- **The Bombanat-Collecting Grithix: stride, swing, vault.** He strides with
  long, unhurried steps, his robe swishing and the spiked ball on his tail
  swinging for balance. The net swing comes in three beats (wind-up, sweep,
  slam), and the slam, FLIP-FLOP, shakes the screen. Holding A while moving
  plants the net pole and pole-vaults him over an obstacle (or a monster)
  in a long, slow arc, robe billowing.
- **The holders that are not monsters.** Sally Ann's lookouts lean out, yawn
  and settle back; the *Peg* rolls on the swell, puffs smoke and leans into
  its turns; the captain's bottle bobs, spins and ducks under the waves.

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
| Stamp-Collecting Trollusk | Side view facing right, standing on his two short legs | Eyeing the prize, celebrating, idle breathing, the tiptoe sneak cycle, ducking, the fright and scuttle back, the grab, the gabbling run cycle, being snatched from, wailing, the freeze in disguise, the skid |
| Letter-Eating Bombanat | Side view facing right in flight, wings spread level | Eyeing the prize, celebrating, the flap cycle, gliding, diving and swooping, the snap, landing, goo-stuck flapping, struggling when grabbed, netted, the stall flutter, the swoop out of a dive, the wing-walk |
| Bombanat-Munching Grumley | Three-quarter view facing right, rising out of the goo with his tentacles spread | Eyeing the prize, celebrating, lurking, rising, tentacles curling and waving, the claw lunge and snap, the miss and splutter, the lunch dance, being netted and hauled up, gliding with a wake, the full lunge |
| Furious-Floating Ice-Ferg | Front three-quarter view from a little above, floating, the waterline along its bottom edge | Eyeing the prize, celebrating, drifting and bobbing, the glaring eye, huffing up, the charge, the crash, the dazed wobble, and the sea lions dozing, startling and sliding off, the sea lions clinging on |
| Wild-'n-Windy Typhoonigator | Front view from a little above, the water spout falling from its lips | Eyeing the prize, celebrating, churning cloud, sucking, swelling as it fills, letting go, the morning sag, rolling along with the spout swinging |
| Paper-Munching Yalapappus | Side view facing right, standing on his two stumpy legs | Eyeing the prize, celebrating, the trundle cycle, the hop and landing, munching, the bonk, the shouting chase, wailing, rolling up into a ball and unrolling dizzy |
| Bombanat-Collecting Grithix | Side view facing right, standing upright, the net over his shoulder | Eyeing the prize, celebrating, the stride cycle with a swinging tail, the net swing in three beats, the slam, posting the letter, tripping, the stroll home, the pole-vault |

The people (the girls, the mailman, the captain and crew, the neighbours and
their dog) are small and move little, so they are whole sprites drawn from
one shared cast model sheet; the props of each chapter come on one sheet per
chapter.

## Later

- All four players at once on one screen in the challenges that suit it (the
  Grumley's lunch, the Grithix's net), Mario Party style.
