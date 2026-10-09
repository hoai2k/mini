# Jackknife Niffy: Snip Snap (45 s)

The Niffy hovers over the park promenade while people stroll along below,
each with a little something that wants snipping: a long hat feather, a
buttonhole flower, a loose thread from a coat hem, a price tag left on a new
hat. Move along the sky and press the action to swoop down; the blade snips
whatever is right below at the bottom of the swoop and the Niffy flies it
off to its nest. The swoop takes a third of a second to get down, so aim
where the walker is going. Nothing is ever cut off a person: only loose
bits and bobs.

- **Scoring.** A snip scores 1, a price tag 2. A child's balloon string is
  not for snipping: the balloon floats away (−2). The Park Keeper on the
  right watches the pond with his back turned; now and then his head turns
  (a "?" and a blinking eye, over him and beside the Niffy) and then he looks
  up at the sky. A Niffy caught low in a swoop while he looks is whistled at
  (−2) and is dazed for a moment. Pass: 7 snips.
- **Ramp.** For the first 8 s the Keeper never looks round, the walkers are
  slow and there are no balloons. Walkers speed up (90 to 175 px/s) and come
  more often (every 1.6 s to 0.8 s), some carry two things, children with
  balloons join after 10 s, and the Keeper looks round more often (away
  4.2 s to 2.2 s), for longer, with less warning (0.9 s to 0.5 s).
- **Controls.** Stick, D-pad, arrows or WASD fly left and right; A, Space or
  Enter swoops. With a mouse or touch the Niffy follows the pointer, and a
  click or tap swoops towards where you tapped (up to 300 px aside). On a
  phone the view follows the Niffy, and its little eye tells you when the
  Keeper is looking even when he is off screen.
- **Bots (tests).** A beginner (±55 px off, careless about the Keeper and
  balloons on one swoop in seven) scores 7–20; a careful snipper 13–23;
  swooping non-stop scores 0 (the Keeper catches it); idling 0.

## Images (IC-M03)

- **a: the park promenade** (`scene.niffy`): open sky for flying, trees, the
  pond and railings, the promenade, a branch for the nest, a plain place for
  the Keeper.
- **b: the passers-by** (`sprites.niffyWalkers`, 3 x 2): five grown-ups and
  a child walking left, with nothing on them; the game hangs the snippable
  things on them (`SPOT` in the game is measured on the stand-ins and may
  need adjusting when they arrive).
- **c: things to snip** (`sprites.niffyProps`, 3 x 2): feather, flower,
  thread, price tag, balloon (the game draws its string) and the nest.
- **d: the Park Keeper** (`sprites.parkKeeper`, 3 x 1): back turned, glancing
  round, looking up.
- **e: the Niffy swooping** (`sprites.niffyDive`, 2 x 1): blade open, blade
  shut; the game tilts it into the swoop.
