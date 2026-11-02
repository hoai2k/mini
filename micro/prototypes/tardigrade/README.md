# Tardigrade · The Moss Film

A ~350 µm eutardigrade climbing the cell walls of overlapping moss leaves with
its claws, out from the shoot it starts on along spokes of leaves, past
encounters placed as you go, to the pool at a leaf tip that is the way on. Seen
through a DIC (Nomarski) microscope with a real, shallow focal plane.
Published at https://hoai2k.github.io/mini/micro/prototypes/tardigrade/
(behind the invite gate).

It follows the encounter pattern (`../../design/encounter-pattern.md`): the
scenery laid out round the start, the same in every direction, the enemies
and events placed as you go by the shared director (in order, on leaves
nobody has seen yet, a short way ahead of whoever leads), a portal the boss
guards, no arrow unless the Portal arrow setting is on, and nothing that runs you down while you stay put (see The
rings and the encounters, and What was removed).

## Controls (Xbox; keyboard in brackets)

The shared scheme (`../CONTROLS.md`, read through `../shared/controls.js`):

| Button | Action |
| --- | --- |
| LS (WASD) | Crawl, relative to the view. The stick is analogue: a slight push creeps at ~30 µm/s, full tilt hurries at ~150 µm/s (a quadratic curve between, so the slow end is easy to hold). The keys walk at a middle pace (~90 µm/s); hold **G** to hurry (full tilt) or **T** to creep (keyboard only). **Push behind it to walk backwards**: with the stick within ±45° of straight behind the body it backs up, legs in reverse, at 0.4× the forward speed on the same curve (up to ~60 µm/s), and does not turn; it keeps backing until the stick leaves ±60° of behind or is let go, and a little to either side curves the backward path gently (0.45 rad/s at most). To turn round, push to the side first (`wantsBack`, `BACK_*` in `gait.js`; every player, stick or keys; not during a scramble, and it does not reach across to another leaf while backing). Push into a leaf edge, or into a leaf rising across the way, to reach across to it, or round the margin onto the underside |
| RS (arrows) | Turn and tilt the view. Up looks up (the camera swings down toward the leaf's edge-on view), down looks down; Features → Controls → Invert camera Y flips it for every prototype |
| **A (Space)** | **Scramble**: 0.9 s of fast wave gait (~280 µm/s, nearly twice the full-tilt walk), recharging over 2.6 s (the `dash` meter); no other cost. With no stick, straight ahead |
| **X (E)** | **Pierce** with the stylets: food in reach (algae, diatoms, detritus) or the living leaf cell under the mouth. One press starts the meal and it runs to the end by itself (no holding). You can keep walking while you feed: walking off before the food is in the mouth breaks the meal off (a leaf cell gives the share already sucked out); at a Milnesium or Prionchulus, a jab with a head thrust that bites back |
| B (Shift), hold | **Defend**: grip hard / brace (two legs swing at most, slower, much harder to slip). Facing a predator as it lunges, it blocks |
| Y (R), hold | Curl into a tun (a predator struggles to get it into its mouth). In a tun, press again to wake (it always wakes). In the leaf axil (the backdoor) Y goes back up to the mite instead, and at the open portal (the game shows "Y Enter the portal") Y goes through it |
| LT / RT (Z / X) | Fine focus down / up through the layers. Auto-focus keeps the focal plane on the animal: a manual setting holds while you stand still and eases back onto the animal once you walk on (Features → Optics → Auto-focus) |
| LB / RB (Q / F) | Anatomy labels / rain (test: the film floods for a moment, then settles back) |
| D-pad ← → (3 / 4) | Optical look: DIC / brightfield / lit (hypothetical) |
| D-pad ↑ ↓ (1 / 2) | Magnification 10× / 12.5× / 20× / 40× (12.5× is the 10× objective behind a 1.25× Optovar magnification changer). It starts at 12.5× (1.6× the 20× field) so the leaf, the film and the surroundings read while the animal, centred and in focus, stays the clearest thing in view |
| LS click (C) | Refocus on the animal |
| RS click (V) | Restart (test): back at the start, the rings as at the beginning |
| Menu (Esc) | Features panel: what the prototype is doing, with switches |
| View (Tab) | Hide the help panel |


## Fighting back, eating, being eaten

- **Milnesium fights readably** (`predator.js`, `shared/predation.js`
  `createFight`). Calm (wandering or resting) it creeps with its mouth shut.
  Hunting, it stops a little short of you and **winds up**: it rears its
  front, the mouth ring opens wide (`pose.gape`) and the stylets protrude, a
  0.9 s pause with a red banner, then **lunges**. Facing it and bracing (B)
  blocks the lunge: it staggers back and you shove its head away. A stylet
  jab (X) at its head bites back: it staggers. Facing it, blocks and jabs wear
  its interest down; at none left it turns and crawls off, then rests. An
  unblocked lunge bites (−25% health); at none, you are caught.
- **Your moves** (`fightPose`, `startAttack` in `main.js`): X is one attack,
  the same whether it bites food, pierces a leaf cell, jabs Milnesium or
  Prionchulus, touches the rotifers or bites at nothing (0.42 s): a **wind-up**
  (0.08 s: the head draws back and up, the trunk bunches shorter and taller),
  a **lunge** (the head thrusts forward and down with the trunk stretching
  after it, the mouth ring opens wide, `pose.gape` ~1.1, and the stylets shoot
  out past it, `pose.stylet` 1.45), a **snap** at 0.16 s (the ring closes on
  the stylets) and a **recoil** back to rest. The snap lands an **impact** on
  the overlay (it reads in every look): a bright burst of rays at Milnesium's
  or Prionchulus's head, a gold one at the food or the cell, and at nothing (or
  the rotifers) a small puff of ripples and bubbles in the water film just
  ahead of the mouth. Fights are still decided on the press, with the same
  timings as before: the animation is how it reads, not when it counts.
  Pressing X again while feeding (from 0.5 s in, so a double tap does not)
  spits the food out and plays no attack. Defending
  (B) crouches, head drawn in and down; a block butts its head away; a landed
  jab recoils a little.
- **What you can eat** (`Life.reach`, `REACH` in `life.js`): a food item
  (alga, diatom, detritus) on the face you stand on, anywhere under the front
  quarter of the body (the head and the first leg pair: body x ≥ 0.98 of the
  1.84 to the mouth ring, within 0.6 of the midline) or within 0.42 just ahead
  of the mouth, with 0.12 of slack all round (`REACH.grace`); the nearest to
  the mouth is eaten. **One press of X starts eating**, and the meal runs to
  the end with X let go. Food in reach comes first: in a rotifer meadow the
  press used to touch the rotifers instead (they took any X with rotifers in
  front), so it took two or three presses, once they had contracted, to reach
  the food; now the meadow takes the press only with no food in reach
  (`Life.canEat`, the meadow jab in `step`). Checked in `controls.test.mjs`. Food under the middle or
  back of the body is not. The food X would eat now (`life.target`) is
  highlighted: a soft green glow and a breathing ring round it with the
  button (X, or E on the keyboard), and the mouth ring parts a little with the
  stylets showing (`drawCues`, `fightPose`). With nothing in reach X still
  attacks, and over a living leaf cell under the mouth it pierces it as
  before. You keep walking while you feed; walking the item out of reach (the
  same zone with 0.3 of slack) before it is in the mouth breaks the meal off.
- **Rumble** is kept for impacts: a bite into food, a jab that lands on
  Milnesium or Prionchulus, being bitten or stabbed, the scramble, slips,
  falls (and the claws biting again after a slip), the tun, the predators'
  wind-ups and the portal. Walking does not rumble: each claw hooking a wall
  used to knock the controller (45 ms, up to ~8 a second) and each hand-over
  onto the next leaf kicked it (120 ms), so a steady walk buzzed; both are gone
  (the footfall sounds stay).
- **Eating** (`animateEating`): food is drawn to the mouth, through the buccal
  tube and pharynx and into the gut, visible all the way through the
  transparent body. There it slowly shrinks and fades over ~9 s, tinting the
  gut's colour as it goes. A pierced leaf cell becomes a green bolus of
  chloroplasts that does the same. Labelled departure: inside, food is drawn
  up to 4× denser than it is so it reads at these magnifications.
- **Being eaten** (`createCapture`, no card): strike, hold, then the camera
  pulls back to watch Milnesium swallow you whole (you stay visible inside its
  transparent body) and follows it for a couple of seconds as it crawls off;
  a fade, and you wake on your spoke at the last calm stretch behind you
  (2.75, 5.05 or 6.8 mm out) that is well away from what caught you, else at
  the start; in multiplayer, beside a teammate. Never further back than that.

## The rings and the encounters (`world.js`, `encounters.js`, checked by `route.test.mjs`)

The owner's encounter pattern (2026-11-01): the same whichever way you go, a
short warm-up, the obstacles with calm breaks between, out to a portal
guarded by the boss; and "feel free to place things in the world dynamically
… keep the areas they've explored constant … don't skip obstacles". The
scenery (the spokes, the meadows, the dry patches) is laid out in rings; the
enemies and events (Milnesium, then the pool with Prionchulus) are placed by
the shared director (`../shared/director.js`).

**The layout.** The start is on leaf A of the shoot (six of the old patch's
overlapping leaves, kept as they were: leaf A, B above, the steep C, the
Sphagnum leaf below, D rising to the left, the broad E; the old pool leaf
went). Out of the shoot run **12 spokes**, one every 30°: from the point of
the shoot that reaches furthest that way (its exit), a chain of 4-6 leaves
(lamina and Sphagnum in turn, ~12-19 units long, 2.3-4.2 half-width), each
one's base tucked 15 µm under the last one's tip, so a body at the tip has
its head over the next leaf and the claws reach across (the gait's
transfers; the head's gap is 25 µm at most hand-overs and never more than
36 µm (`HANDOVER_GAP`), well inside the claws' 55 µm reach without the wet
film's help). The first leaf continues the exit leaf's slope and the chain
levels out; where it levels out of a climb (the two west spokes, rising with
leaf D) the flatter leaf would open the gap towards the tip (47-61 µm before
2026-11-01), so there its base sits nearer the last tip (as little as 0.4
units of overlap) and, if that is not enough, it levels out a little less.
A spoke's first leaf is lifted, dropped or rolled a little where it would cut
through a shoot leaf or a neighbouring spoke's first leaf (spokes 7 and 8,
which fan out from leaf D); two, spokes 3 and 10 against leaf E and spoke 9,
find no such spot within reach of the exit and still cross at their bases,
under the shoot. The
last leaf on each spoke is a broad Sphagnum leaf (the rim) whose tip is on
the portal ring. Every bearing is within 15° of a spoke; between spokes is
the defocused moss below. 58 leaves in all (was 7). Walking off a spoke's
side goes round the margin onto the underside, as on any leaf.

The scenery, by straight-line (horizontal) distance from the start (the
default 12.5× view is 1.44 mm across):

| From | Scenery |
| --- | --- |
| 0-1.5 mm | The shoot, food, the backdoor axil |
| 4.0-4.6 mm | A band of ~110 rotifers across every spoke's leaf (the meadows) |
| 5.5-6.2 mm | Dry patches: three on every spoke, staggered across the leaf |
| 8.4 mm | The rims, where the pool can dip (its tip 260 µm in) |

**The encounters, placed as you go** (`encounters.js` `DIRECTOR` and
`encounters(world)`; `main.js` adds what placing and meeting each does).
The director keeps a 3D grid of 3-unit (300 µm) cells, marked from every
view's frustum within 2.2 mm of what it frames and 300 µm round every
player: the view looks down through the leaves, and the west spokes climb
2.2 mm above the rest, so what is seen is kept at the leaves' own height.
The walkable world is the spokes, so every spot is snapped to a leaf, and
"ahead" is along the spoke whoever leads is heading out on (`wayOut`: their
leaf's spoke, or on the shoot the spoke whose exit they are making for;
none while idle or heading back in):

| # | What | Placed | Met |
| --- | --- | --- | --- |
| 1 | *Milnesium* browsing in its water (radius 700 µm; it lets you go 500 µm past it) | after the warm-up (4.5 s of moving), 1.2-1.8 mm ahead on a wet spot of that spoke's leaves (1-1.6 mm round a lingering player), past the shoot's middle and short of the rim's arena, its body out of every view and on unseen leaf | in its water, or within 500 µm of it |
| 2 | *Prionchulus* and **the pool** at the rim leaf's tip of that spoke | after 16 s of moving clear of Milnesium's reach (the meadow and the dry patches come in this calm), when that rim is within 4 mm, the tip, the sparkle over it, the pool beyond and the boss's post all out of every view and unseen | entering the open portal |

Anything placed but not yet seen moves (unseen to unseen) if the leader
heads elsewhere; anything seen stays (seen and walked away from, or watched
12 s, it counts as met). Milnesium placed beyond a lingering player's reach
wanders over: its water drifts toward the leader at 80 µm/s after 5 s
(`driftMilnesium`, behaviour, not a placement). Until placed Milnesium is
hidden and still and there is no pool at any rim; a restart starts the
director over. The pool can only dip at a rim leaf's tip, so a player who
lingers at the start gets Milnesium round them and then the pool at the
nearest rim, ~8.4 mm off: they still have to walk out to it.

**The default path** (the owner, 2026-11-01: "a default path to a portal,
but just dynamically generate the other directions"): the walkable world is
the spokes, so the path runs out along one, the 240° spoke (`encounters.js`
`PATH_SPOKE`, `defaultPathFor`: across the opening view, which looks out
along the 330° spoke, and level, unlike the climbing west spokes). On the
first frame the director lays Milnesium on one of its wet leaves ~2.2 mm out
(where a rush meets it) and the pool with Prionchulus at its rim (8.4 mm),
out of sight, so the way on exists from the start. It stays sealed (no
prompt, the sparkle shut, no edge light, nothing preloaded; reaching the tip
says "The pool will not take you yet: Milnesium is still out on the leaves")
until Milnesium is met; Prionchulus guards it as always. Walk out along that
spoke and you meet them where they lie; head out along another and each,
while nobody has seen it, leaves the path and is placed ahead of you on your
spoke as before (each is one object: the director's `single`; the cone that
counts as on the path, 0.4 rad, keeps the neighbouring spokes off it); one
somebody has seen stays put.

**The meadows** are static: a band on every spoke (`Meadows` in `meadow.js`); only
the bands with someone on their leaf move, and each is culled per view.
**The dry patches** are in the film-capacity field (`world.js`): bare cells
with a sharp contact line round them (DIC draws it as a bright rim), slow
going (claws on dry walls: 30% speed); a wet way winds between them.
Milnesium, needing thicker film, barely moves in them. Both are scenery: a
harmless crowd you push through and patches you walk round.

**Timing.** `route.test.mjs` runs the director with the microscope's own
frustum (12.5×) and a player rushing along each of the 12 spokes (~1.6
units/s): Milnesium placed at 4.7 s and met at 7.9-11.8 s, the pool placed at
29.9-33.8 s (at that spoke's rim) and reached at 52.0-54.8 s. On the page
(scripted rush at 30 Hz: full tilt with a scramble whenever it is ready,
steering out along the spoke; Milnesium never hungry and Prionchulus off, the
meadows and dry patches on, so the slow-downs count; the views from the
camera each step):

| Spoke | Milnesium placed | met | Meadow | Dry ring | Pool placed | Pool reached |
| --- | --- | --- | --- | --- | --- | --- |
| 0° (+x, out of leaf B) | 4.7 s | 10.1 s | 23 s | 32 s | 32.1 s | 51.2 s |
| 90° (out of the Sphagnum leaf) | 6.0 s | 10.7 s | 27 s | 34 s | 32.7 s | 56.8 s |
| 180° (out of leaf D, climbing) | 6.9 s | 13.6 s | 28 s | 38 s | 35.6 s | 59.5 s |
| 270° (out of leaf B) | 5.7 s | 14.3 s | 26 s | 34 s | 31.0 s | 56.7 s |

Lingering at the start: Milnesium placed round them at 10.5 s and its water
over them by 25 s, the pool placed at the 150° rim (the nearest unseen) at
47 s; walking out to it, it was reached at 106.9 s. Turning back 0.7 mm out on the +x spoke and heading out the
180° spoke: Milnesium (placed ahead at 4.7 s, in sight while the script
turned) counted as watched at 17.8 s, the pool placed at the 180° rim at
38.1 s and reached at 82.7 s. Dealing with the encounters (a Milnesium fight,
jabbing through a meadow, luring the boss) makes it a few minutes.

**Cost** (`tools/perf/measure.mjs`, headless): the director, its 3D seen
grid included, takes 0.1 ms a frame with one view and 0.44 ms with four;
the draws and triangles are as before (55 and 185 k; 327 and 1.6 M split four
ways).

**The portal and the boss.** The portal is the last encounter, at the rim
of the spoke whoever leads is heading out along: the pool appears beyond that
rim leaf's tip (open water, its meniscus a bright DIC line, green *Paramecium
bursaria* swimming in it, towards the amoeba's pool floor), the golden
sparkle (`../shared/portal.js` `createPortalGlow`, drawn over the
microscope's picture, not through the optics) hangs over the tip, dim and
restless while guarded, bright once open, and *Prionchulus* goes on guard at
its post 420 µm inside it. There is no arrow by default: once open, its
golden light (`createPortalLight`) spills in from the edge of the view on
its side, and haloes it in view. With **Portal arrow** on in the game's
Settings (default off; `?arrow=1` on this page) each view gets a brass arrow
at its edge toward the pool's tip, sealed or not, with the view's nearest
tardigrade's distance beside it ("8.4 mm"; µm under 1 mm). Test hooks:
`portalArrow()`, `portals()`, `portalSealed()`. Reaching the portal (the last ~430 µm before it and beyond, on the rim
leaf, either face) while Prionchulus is on guard (its head within 350 µm of
its post) turns you back (a toast, once). **The way in: lure it off.** It
wakes when you come within 650 µm of its post and follows you up to 850 µm
from it; then, or once it has lost you (1 mm from its head), it gives up and
glides back at 30 µm/s, paying no one any mind (you walk 150 and scramble
280): get round it to the tip. Or wear it down (the brass resolve gauge): it
slides into a groove for good and the way is open. The open portal is never
an automatic door (the owner, 2026-11-01): while any player is on it, the
game shows "Y Enter the portal" (`embed.near('portal', true)`; standalone,
`shared/embed.js` shows it) and that player's **Y** (R) goes through instead
of curling into a tun; on guard there is no prompt and Y curls up as usual.
`enterPortal(a)` in `main.js` is the one place `embed.landmark('forward')`
fires (once per visit); `__micro.portal()` reports it (`prompt`: the Y
prompt is up). Scripted: up the rim leaf with it on guard, turned back;
backing off 2 mm (it gave up 835 µm from its post), then straight for the
tip: through, with it still 380 µm off its post.

`__micro.route()` gives the static layout per spoke and where Milnesium is,
`encounters()` the director's state (`director`, `seenAt(x, y, z)`,
`placeNow()`), `views(dt)` the views' frustums without drawing (`testStep`
does it too), `__micro.challenges` when each encounter first started
(`milnesiumMet`, `milnesiumWater`, `milnesium`, `meadow`, `dry`, `portal`,
`boss`, `bossLured`), `__micro.where()` how far out player 1 is,
`placePortal(k)` and `placeEncounter(k, x, z)` (tests: out of order),
`enterPortal(slot)` and `restart()`.

## What was removed (the pattern: no hidden clocks)

- **The drying day** (the film thinning hour by hour at 240×; the time
  compression switch): the film now stays as it is. Thin and dry film are
  places (the dry patches), not a time.
- **The water meter** (desiccation on dry leaf, the forced hasty tun), and the
  tun on a dry leaf skipping days to the next rain with its revival risk: the
  tun is now a defensive move you wake from with Y, always.
- **The reserves draining** with time and walking, and the scramble's water
  and reserve costs ("too weak to scramble"): the reserves are now your
  **health**, taken by bites and stabs and given back by food (140 items over
  the leaves). Nothing drains while you stay in a safe spot.
- Milnesium's 40 s calm opening and "only past halfway": it hunts in its own
  water, 2 s after someone first comes in.

## The rotifer meadows (`meadow.js`, `../shared/crowd.js`)

A band of ~110 bdelloid rotifers (~150 µm extended, ~40 µm across) across
every spoke's leaf on the meadow ring (4.0-4.6 mm out), each anchored by its
foot, the trunk telescoped up and leaning, the two
wheel discs of the corona spread on top with a wave running round each rim
(the beating cilia), swaying as they feed. Each band's crowd runs in its
leaf's own u-v plane: walking into them pushes their heads aside and they
**bend** away from you from the foot (in the vertex shader) and spring back
behind you. A **stylet jab (X)** into the meadow makes the rotifers in front
contract onto their feet (bdelloids really withdraw the corona and contract
when touched) and opens a lane; they re-extend ~14 s later, a little further
off (they creep like leeches). They never harm you; a dense patch slows you
by up to 25%. No timer. *Milnesium* shoves through them too. Only the bands
with someone on their leaf step their crowd. Features → Simulation → Rotifer
meadow switches them off. Labelled departures: the density is a game
choice (rotifer densities in moss were not read), and the jab clearing them is
a game rule.

## The boss: Prionchulus (`nematode.js`)

A predatory nematode, *Prionchulus muscorum*, a real hunter of tardigrades in
moss films (`../../design/bosses.md`), guarding the portal from its post
420 µm inside it (placed with the portal; hidden until then). Drawn after the delivered sheet
(`../assets/reference-sheets/boss-nematode.webp`): ~1.3 mm long and 52 µm
wide (adults reach ~2 mm: scaled so the arena fits), a slim transparent worm
with a blunt rounded head; at the nose the thick-walled, barrel-shaped buccal
cavity with the one large dorsal tooth inside (it slides forward when bared);
the cylindrical pharynx in the front fifth ending at a small cardia; a dark,
lumpy intestine; a long tail tapering to a fine point. It glides with a
nematode's wave and coils into an S as its tell.

- On guard (dormant) at its post until a player comes within ~650 µm. Awake,
  a brass **resolve** gauge shows under the banner. It follows you up to
  850 µm from its post; then, or once it has lost you, it glides back at
  30 µm/s ignoring everyone (`return`), and lies on guard again. While its
  head is more than 350 µm off its post the portal is open (see The rings).
- Two attacks, alternating: **the whip** (the tell: the front coils into an
  S, tooth bared; then the head whips forward) and **the sweep** (the tell:
  the whole body ripples fast; then the head sweeps sideways across you).
- Brace (B) facing it on the strike to block; jab its head (X) in its
  recovery; in thin film (< ~3.5 µm) it flounders and loses heart. A hit
  stabs you (−35% health); at none, it pins you with its tooth and sucks you
  dry while the camera follows it dragging you off, then the fade and respawn.
- Worn down (createFight with more interest), it slides off and down into a
  deep groove between the cells, gone for good (until a restart): the way is
  open. It targets the nearest player. Caught by it, you wake on your spoke
  and it is back on guard, its resolve restored. Features → Simulation →
  Prionchulus switches it off (the portal is then open).

## The intro (from the mite)

In the game this world is the far end of the continuous transition from the
mite (`../../game/README.md`, "The continuous transition"): the mite's freeze
frame holds a tardigrade walking in the water film of its leaf axil, and this
world fades in under the same framing, the animal where that glimpse was. The
two creatures are the same size (350 µm), so the pair is a hand-off: the
mite world settles its freeze frame on the glimpse from this world's opening
side and height (pitch 1.18, its heading turned to match) a little wider
than here, and the shell's move is a short push (×1.34) while the light
changes from SEM to DIC. This world preloads hidden while the mite nears its
portal, declares `embed.provide('intro')`, and on `hold` stays frozen at its
start but renders (the HUD hidden), reporting how its opening view (12.5×,
the animal centred) frames the animal (`embed.opening`; a pose's `len` is
3.5, the 350 µm body). While held it takes the shell's `camera` poses
(`placePoseCamera`: a dolly, the field of view kept; the view's yaw, pitch,
target and distance follow, so play carries on from where the move ends,
which is exactly the opening view). On `begin` its time eases back in over
0.6 s. Test hooks: `__micro.pose()` (how the view frames player 1's animal
now), `__micro.intro`.

## The outro (to the amoeba)

Through the portal (Y at the open pool, `enterPortal`): the world posts
`embed.landmark('forward', { outro: true })` in the game and keeps running
(the mite's outro is the reference): a golden burst from the tip, a bloom on
the screen over the tip and over you, the portal chime and a rumble, the HUD
hidden (`embed.cinematic`). Then time eases from 1 to 0 over 1 s while the
view keeps drawing (`stepOutro`, in frame time, so a slow machine plays it
slower rather than skipping it), and the view settles on the *Amoeba
proteus* crawling on the pool floor 340 µm past the tip (in view from the tip) (`landmarks.js`
`buildAmoeba`: the amoeba world's own cell as it opens, from
`../shared/amoeba-opening.js`, which `../amoeba/opening.mjs` generates from
that world's deterministic warm-up: its outline with the three long
pseudopods, thickest in the middle and thin along the arms, a darker granular
cortex, the nucleus and the contractile vacuole where they are there, 344 µm
across the disc of its area, so the crossfade turns one cell into the same
cell; the *P. bursaria* swim off out of its frame as the view settles,
`swimOff`): from straight above (pitch 1.55, the amoeba world's 2D
microscope), the focal plane on it, the amoeba turning the way that world's
cell faces as it opens (`rel` π), framed 1.35× smaller than there
(`NEXT_OPENING`), while the sparkle dims so the cell reads. Frozen, it posts
`embed.frozen` (how it frames the amoeba: `__micro.amoebaPose()`) and follows
the shell's `camera` poses (`placeOutroCamera`: a dolly onto the amoeba, the
field of view kept) while the brightfield amoeba world fades in over the DIC,
the cell where the glimpse was. Standalone the freeze holds 1.4 s and time
comes back. `embed.near('forward')` is posted within 1.4 mm of the tip, so the
shell has the amoeba world loaded by then. Test hooks: `outro()`, `OUTRO`
(`rate` slows it), `outroStep(n, dt)`, `amoebaPose()`.

Checked through the shell (Playwright, SwiftShader, 960×540): at the open
pool, through it: the outro froze 1.8 s (frame time) later and the move
began; held at fixed progress, the two worlds reported the same pose of
their amoeba at every step until the crossfade completed (f 0.283 at
u 0-0.1, 0.286 at 0.2-0.3, 0.306 at 0.4, 0.329 at 0.5-0.6, the old world
then hidden while the new reached 0.382; x, y 0, pitch 1.55, rel π in both
throughout), the crossfade from u ≈ 0.45, and the amoeba world began on its
opening view (f 0.382) and played on with no errors.

## Landmarks (the way on and the way back)

Both are things in the moss patch (`landmarks.js`), drawn through the same
optics as everything else (the portal's sparkle on top of them);
`../shared/landmark.js` adds a quiet mark near the edge of each view when
they are off screen: none for the portal (its light leads you), a hollow
ring labelled Moss towards the way back.

- **Forward: the portal**, the pool at a rim leaf's tip, towards the amoeba's
  pool floor (design §2.6): open water beyond the tip, a slab whose bevelled
  shore is a bright meniscus line in DIC where the film meets open water,
  three green *Paramecium bursaria* swimming in it, and the golden sparkle
  over the tip. Placed once a game on the spoke of whoever first nears the
  portal ring, 8.4 mm out, and guarded by Prionchulus (see The rings).
  At it, open, Y (R) enters: `enterPortal` posts `embed.landmark('forward')`;
  standalone, `embed.js` shows a toast. `embed.near('forward')` is posted within ~1.4 mm of it, so
  the shell can load the next world.
- **Backdoor: the leaf axil.** The drier axil above, where leaf A and leaf D
  leave the stem (drawn as a chain of capsules, the overlaps reading as
  nodes), back up to the mite (§1.6). It lies left along leaf A from the start
  (~0.5 mm), in the calm middle of the rings. Within ~200 µm of either leaf's base a quiet "Y: Back
  to the mite" prompt shows (the shell's, from `embed.near('back')`, or this
  page's own when standalone), and Y there posts `embed.landmark('back')`
  instead of curling into a tun.

## Multiplayer (local, up to four)

Through `../shared/players.js`, as `../CONTROLS.md` describes: player 1 on the
keyboard and the first controller; players 2-4 join at any time by pressing
any button on another controller (a "Player N joined" toast, and in the shell
`embed.join`). Inside the Micro Zoom shell the roster from its menus is
restored (`embed.players`, the `players` message).

- **Each player is their own tardigrade** (its own Walker, Creature, health,
  scramble and tun), its own gut colour (see **Telling players apart**), a faint
  tint of their colour in the cuticle and a broken ring and name tag in that colour round it. A new
  player appears a body length behind a teammate on the same leaf.
- **One world for everyone.** Player 1's Life owns the shared state (the
  rain test; `life.js`, `clock: false` for the others). Milnesium meets the
  one farthest out on its ring; the portal goes on the spoke of the first to
  near the portal ring.
- **Split screen** (`../shared/splitscreen.js`): together, one shared view
  (straight to the screen, as before), which zooms out as the group spreads
  (the split's `zoom`: the orbit camera pulled back) up to 1.7x the solo
  framing and splits only beyond that; it merges once you are back inside
  0.75 of it for most of a second (split views keep a gentle 1.275x). Apart,
  the LEGO-style split, each view
  composed by the DIC microscope into its own target (`tardigrade-dic.js`
  `render({ target })`, render scale 0.75; the auto quality drops the optical
  buffers further if the frame rate falls). Any player's right stick turns
  the shared view; the d-pad, LB/RB and the stick clicks are player 1's.
- **Milnesium hunts one player at a time**: the nearest one up and about,
  held unless another is clearly nearer. Only that player's jab (X) drives it
  off.
- **Caught**: alone, the full catch and the Eaten card, as before. With
  others playing, the caught player sees the whole sequence (strike, hold,
  swallowed), then wakes beside a teammate (no card).
- **The landmarks** trigger for any player; the others follow through the
  transition in the game.

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A water-film ambience loop; claw footfalls (at most ~8 a second), the scramble (A), stylet bites (X), forming the tun (Y), rehydrating, rain, and the Milnesium stalking and lunging.

## Telling players apart

Every player's animal has its own gut colour, so each keeps its look whether
it plays alone or with others (`GUT_TINTS` in `main.js`, `Life.gutTint` in
`life.js`: a filter on the gut's colour, which still takes on each meal's).
Player 1 is today's look.

| Player (colour) | Gut |
| --- | --- |
| P1 (gold) | today's: beige-olive, turning the colour of each meal |
| P2 (teal) | green, as after algae |
| P3 (rose) | red-brown |
| P4 (blue) | violet |

With more than one playing, the faint tint of the player's colour in the
cuticle and the broken ring and name tag stay as before. **Departure**: real
tardigrade guts are coloured by their food (green, brown, red after
different prey), not by player; here a player's animal keeps its own cast.

## What it does

- **The animal.** Built with `shared/sdf.js` from anatomical parts: head with
  mouth ring, four trunk regions with transverse cuticle folds, eight stubby
  lobopod legs (pairs I–III ventrolateral, pair IV terminal and pointing
  backwards), each foot with two double claws (primary + secondary branch on a
  common base, outer claw larger, Hypsibius-like). Inside, as separate meshes:
  buccal tube, two stylets with supports, pharyngeal bulb with placoids, two
  eyespots, a lobed midgut whose colour follows what was eaten, the gonad, and
  ~80 free storage cells. Rigged by part (`creature.js`; the same rig on the GPU in the optical looks): legs
  stretch and turn from hip to foot, the trunk carries a lateral wave, bob and
  surge, and the tun contraction.
- **Climbing (`gait.js`).** Discrete footholds: each stepping foot searches for
  the nearest cell wall within ~20 µm (`patterns.js` `snapToWall`) and hooks
  it; junctions and walls across the pull hold best. The gait clock advances
  with distance; the leg phases follow the back-to-front ipsilateral wave with
  the sides in antiphase measured in *Hypsibius exemplaris* (Nirody et al.
  2021), about a third of each cycle in swing. A leg lifts only when its
  partner on the other side is down and its neighbours on the same side are
  past mid-swing; a leg near the end of its reach must step whatever the wave
  says (see Legs). Grip (sum of hold qualities) is compared
  with what the slope needs: walking fast up the steep leaf C slips unless you
  brace. Leaves are walkable on both faces, at any angle; transfers happen
  where leaves touch or where the film bridges a wider gap. A leaf rising
  across the way (leaf C from leaf B) is a wall: the head presses against it
  and, held there ~0.6 s, the animal climbs onto it (at the new speeds it
  used to walk straight through it).
- **Legs: reach and hand-off (`gait.js`).** A lobopod telescopes a little,
  never more. Every leg's length is measured hip to claw base on the body as
  drawn (the displayed trunk with its sway and surge, `creature.bodyDeform`),
  as a multiple of its rest length: a foot is placed within 1.08× (`R_PLANT`),
  must step past 1.11× (`R_STEP`, judged where the body will be this frame),
  and a planted foot past 1.14× (`R_CAP`) lets go; a foot in the air reaches
  no further than 1.14×, and `creature.js` clamps anything else at 1.15×
  (`LEG_STRETCH_MAX`). Holds are chosen on the face the body is on, round
  each leg's stance centre (under the hip for pairs I-III, behind it for the
  backward-pointing pair IV), half a stance ahead plus the distance the body
  covers during the swing, kept on the leaf, snapped to a wall only if the
  leg reaches it; a swing whose hold drifts out of reach (the body slowed or
  turned) picks a new one on the way, and one that lands out of reach lets
  go. A foot with nothing in reach is **let go**: drawn up and in under the
  body, paddling, looking for a hold every 50 ms. After a transfer or the
  margin the feet keep the old leaf while they reach it and let go of it one
  at a time, back to front (60 ms apart), each catching the new leaf as it
  comes in reach; falling, all eight let go and catch as the body lands. So
  nothing is stretched across a gap. Stride length is capped by reach (stance
  travel ≤ 0.5 body units, what pairs II and III reach): faster means faster
  steps, with up to 45% of each cycle in swing at a scramble, and the
  display filter's steady lag is fed forward so the feet are placed for the
  body that is drawn. `legs.test.mjs` checks it (see Checks).
- **Smooth climbing.** The trunk follows its target through three first-order
  lags in series, so position, velocity and acceleration stay continuous; a
  change of face (a transfer, the margin, a fall) no longer jumps the target
  but blends the old pose out over a smootherstep (0.45–0.8 s), and after a
  transfer every foot steps over to a hold on the new face, back to front,
  instead of being left stretched across the gap. Slipping has hysteresis:
  it starts only below 85% of the load for 0.6 s and catches at 75% (or at
  100% braced) as the claws scrabble. A fall never lands back on the leaf it
  slid off (the old slip–fall–slip loop on leaf C). The camera follows the
  smoothed trunk. Scripted 30 s climbs at a fixed 60 Hz (leaf A to the steep
  leaf C, braced on C; and A to the underside of B): peak trunk jerk fell from
  853 000 to 7 200 µm/s³ (C) and from 2 100 000 to 7 500 µm/s³ (B) at the old
  speed, mean jerk from 1 200 to 350 and from 7 500 to 580 µm/s³, and the
  largest frame-to-frame change in turn rate from 2.3° to 0.2° (C) and 11.6°
  to 2.8° (B). At the 1.5× speed the C climb peaked at 7 200 µm/s³ too, and
  at today's 2.25× speed (the same scripts, 60 Hz) C peaks at 7 260 µm/s³
  (mean 550, was 430) and B at 37 080 µm/s³ (mean 1 350, was 1 310; that
  run includes slips and falls), with the turn-rate change unchanged (0.2°,
  0.7°).
- **Low magnification reads.** At 10× and 12.5× the defocus blur per unit
  of distance from the focal plane is stronger (12 and 14 px at 720p, was 5;
  still far less than a real NA 0.25 lens would give), so with the focal
  plane on the animal's mid-depth the leaf surface under it softens and the
  animal stands out with its DIC relief.
- **Speed (analogue, 2026-11).** The owner found no difference between the
  slowest and fastest walk. The cause: the old gait could not keep up with
  its own 225 µm/s limit. Swings lasted up to 0.55 s at low speed, the feet
  fell behind, and the "stretched legs hold the trunk back" rule then held it
  at its 15% floor whatever the stick said, so the walk really ran at
  ~6-34 µm/s and the scramble at ~100 µm/s. Now `walkSpeed(m)` (`gait.js`)
  maps the stick after the pad's dead zone: a slight push is 30 µm/s (the old
  walk as it ran), full tilt 150 µm/s (the old scramble's peak),
  30 + 120·m² between; the gait keeps up, so the hold-back only acts on a
  foot that could not step. The keyboard walks at m = 0.7 (~90 µm/s), G
  hurries, T creeps. Acceleration 3 units/s² (the old 1.35 took 1.7 s to
  reach the limit). The trunk still surges with each wave, now round its
  mean speed (±30%), so the speed is the speed over the ground. Scripted
  straight walks on leaf A at 60 Hz, 2 s after a 2 s run-up, over the ground:

  | Stick | Before | After |
  | --- | --- | --- |
  | 0.2 | 6 µm/s | 35 µm/s |
  | 0.5 | 14 µm/s | 60 µm/s |
  | 1.0 (full tilt) | 27 µm/s | 148 µm/s |
  | Scramble (A, the 0.9 s burst) | 103 µm/s (peak 151) | 248 µm/s (peak 318) |
  | Longest leg drawn | 1.41-1.54× rest | 1.07-1.09× |

- **Scramble (A).** ~280 µm/s with a fast pick-up (0.2 s), nearly twice the
  full-tilt walk; strides are capped by reach, so the legs step faster
  (swings down to 60 ms, up to 45% of each cycle in swing), keeping the
  back-to-front wave. Its only cost is the 2.6 s recharge.
- **Milnesium (`predator.js`).** A second Walker and Creature at 1.5× scale,
  with a wide buccal tube and no placoids (true of *Milnesium*), a browner
  gut and a slightly denser cuticle. It browses in its water on the first
  ring (2.2 mm out, moved round the ring to meet you: see The rings) and
  hunts only a player in its water (once stalking, until you are 500 µm past
  it); its hunger starts 2 s after someone first comes in. Then it heads for
  you at under half speed, coming into view from the edge of the field, and
  within ~650 µm stalks at up to ~180 µm/s (faster than your full-tilt walk,
  slower than your scramble; it closes in from afar at ~75 µm/s). Its walker
  takes the stick linearly (`curve: false`, limit 1.8 units/s): it measured
  175-180 µm/s stalking before and after the gait change. Its mouth on you is a bite: −25% health, and at none,
  it swallows you (see Threats and pacing). After a bite it lets go, backs
  off for 2.2 s, keeps its distance and rests 45–75 s before it is hungry
  again (it no longer bites every
  1.3 s while in contact). Escape by scrambling away, by retreating into
  film too thin for its bigger body (below ~3.5 µm of water it barely moves;
  you still can), by jabbing it with the stylets (X) so it backs off for
  2.4 s and then keeps off for 7 s, or by curling into a tun (Y): it cannot
  get a tun into its mouth quickly and gives up after three tries. It
  ignores slope load (it never slips). Wandered off its water, it heads back
  while browsing. Scripted (hunger Always): walking into its water from the
  warm-up, it bit within 6 s.
- **The film (`world.js`).** Each leaf has a film-capacity field (wetter
  towards the stem, in hollows and where leaves nearly touch; margins
  thinner, the dry ring's patches bare); film = capacity − a fixed dryness
  (no drying clock). A dry patch slows you to 30% and is a refuge from
  Milnesium. Food (health, `life.js`): algae, diatoms, detritus in the film
  (140 items over the leaves), or living leaf cells (Sphagnum hyaline cells
  are dead and empty; the costa has nothing to suck). Going without never
  hurts; a restart puts the food back.
- **Delivered art.** MP-T01..T04 are used when delivered. `wallmap.js` reads
  the leaf micrographs: walls by gradient threshold, a chamfer distance
  transform for "distance to wall", flood-filled cells. So the claws hook the
  walls in the picture and an eaten cell empties as a whole. The shader takes
  colour from the photo (relative to its mean colour, so only chloroplasts
  tint) but relief from the wall map, so DIC relief keeps this microscope's
  shear direction. Procedural cells (and canvas stand-ins for the atlas and
  backdrop) are the fallback.

## Rendering

DIC is the main look, implemented as the reusable technique
`shared/techniques/tardigrade-dic.js` (its header documents the interface):

1. Every transparent object is drawn additively into two float targets at
   once (MRT): Σ Δn·thickness, Σ depth·thickness, Σ thickness, and
   absorbance. Thickness comes from closed meshes (front faces subtract their
   depth, back faces add it). The leaf shader adds walls, chloroplasts and the
   water film per pixel; the film shows as menisci (thickness rises as √h from
   the contact line) rather than as blue water.
2. Leaves and specimen are separate layers, each defocused by its own mean
   depth from the focal plane (gather blur): fine focus moves through them.
3. Composite: I = sin²(π(Γ_bias + shear·∂OPD/∂s)/λ) at three wavelengths,
   times exp(−absorbance), with soft saturation for steep steps, grain and a
   vignette. Brightfield and a lit "hypothetical immersive" view are there to
   compare. On software GL (SwiftShader in headless checks) the page drops to
   a low-resolution path; on real GPUs the shared governor
   (`../shared/quality.js`) adapts the quality to the frame rate.

### Performance

- **The part rig runs on the GPU** (`creature.js`): the body and every
  internal organ keep their rest positions and the vertex shader applies the
  trunk deformation and the eight leg frames (uniforms), so no 48k-triangle
  mesh is rewritten and uploaded per animal per frame. The lit look and the
  borrowed SEM switch the animal back to the CPU rig (they draw the geometry
  with their own materials). Checked identical: max 1/255 between the two.
- **Half-float optical buffers** (RGBA16F, `precision: 'half'`): half the
  bandwidth of the heaviest passes. Compared against RGBA32F on the same
  frame at 10×, 20× and 40×: mean difference 0.1/255, max 17/255, 0.002% of
  pixels over 8/255. `?prec=float` restores float32, `?rig=cpu` the CPU rig.
- **The quality governor** (`../shared/quality.js`, Features → Rendering):
  the optical buffers are allocated once at 0.85 of the drawing buffer and
  each view uses `quality.scale / 0.85` of them (`render({ viewScale })`,
  split factor included), so neither a split nor a governor step reallocates;
  the effects level sets the blur taps (10 / 16 / 26). `?q=high|medium|low`
  fixes it. Split views scissor every optical pass to their region
  (`split.rectFor`).
- Claw scaling, the catches and the views reuse their matrices (no per-frame
  `new Matrix4`).

Measured with the performance audit's `measure.mjs` (SwiftShader, 1280×720,
GPU name spoofed, 8 s; before: the old auto quality at its lowest step, after:
`?q=low`, the same 0.4 scale and 10 taps; the machine was shared, so compare
CPU and uploads, and SwiftShader times only roughly):

| | 1 player before | after | 4 players before | after |
| --- | --- | --- | --- | --- |
| CPU (JS) per frame, median | 22.1 ms | 5.2 ms | 45.4 ms | 13.4 ms |
| buffer upload per frame | 1 079 KB | 20 KB | 2 713 KB | 53 KB |
| heap allocated per frame | 2.1 MB | 0.37 MB | 3.0 MB | 0.76 MB |
| optical buffers used per view | 512×288 | 512×288 | 512×288 ×4 | 282×158 ×4, scissored |
| SwiftShader raster per frame | 429 ms | 612 ms (load) | 3 829 ms | 1 055 ms |

The 1-player raster number rose only because the machine was busier: the
unchanged full-screen composite pass alone went from 65 to 162 ms.

### Performance (second pass)

- **Per-view culling of the animals** (`cullAnimals` in `main.js`): every
  player and *Milnesium* (≈170 k triangles each, deformed on the GPU, so
  three.js could not cull them) is tested against each view's frustum, then
  against the scissored part of the optical buffer the view writes, and
  hidden for that view only. The bound is 1.5× the rest pose's reach plus a
  margin (the deformed pose measured ≤ 0.99× of it). Checked pixel-identical
  (frozen frame, A/B with `__micro.cullViews`) with 4 players spread and in
  the meadow.
- **The rotifer meadow is not a cost worth cutting**: with 4 players in it
  its crowd step measured about 0.5 ms a frame here (two substeps at the
  headless frame rate; one at 60 fps) and its upload 13 KB; it draws
  160 × 1064 = 170 k triangles per view, and at the default objective the
  whole meadow is on screen, so culling saves nothing there. Fewer
  triangles per rotifer would change the look.

Measured with `tools/perf/measure.mjs` at `q=high`, before and after back to
back (shared machine: compare draws and triangles):

| 4 players | in the meadow, before | after | spread over leaves, before | after |
| --- | --- | --- | --- | --- |
| triangles per frame | 4.16 M | 4.16 M | 3.66 M | 2.13 M |
| draws per frame | 522 | 520 | 572 | 405 |

## Threats and pacing

*Milnesium* follows the shared pacing in `shared/predation.js`:

- **Its own water.** It browses in its water on the first ring and hunts
  only a player in it; 2 s after someone first comes in, its hunger starts.
- **Hunger comes and goes** (`createHunger`): then it is hungry for ~30–45 s
  at a time (once it is stalking you it sees the hunt through) and rests in between: 45–75 s after a bite, 15–30 s after a jab,
  after losing you or after giving up on a tun. Only a hungry *Milnesium*
  closes in, stalks and bites; resting, it browses or keeps off. A banner at
  the top says when it is closing in or stalking.
- **Bites hurt, the last one is the catch.** Each bite takes 25% of your
  health and it lets go and backs off. A bite that empties it plays the
  whole catch, framed closer (about the 20× field) on you and its head, with
  a red banner naming the phase: **strike**, its mouth tube and stylets lunge
  onto you; **hold**, it grips with the stylets out while you writhe and its
  pharynx starts to pump; **eat**, you are drawn head first in through the
  mouth and pharynx, swallowed whole (a real *Milnesium* habit: it swallows
  small prey whole or sucks them out), and lie curled in its gut, visible
  through its cuticle; then it carries on, a fade, and you wake on your spoke
  at the calm stretch behind you.

Features → Simulation → **Milnesium wakes** (2 s / 10 s / 30 s / off after
someone first comes into its water) and
**Milnesium hunger** (comes and goes / always / never) for testing.
`window.__micro.forceCapture()` plays the catch; `__micro.pacing()` reports
hunger and state; `__micro.paused` with `__micro.testStep(dt, stick)` steps
the simulation by hand.

## Features (Menu panel)

Rendering: optical look (DIC / brightfield / lit), optical-path buffers
(fixed), quality governor (auto) and manual quality, camera grain, vignette, out-of-focus backdrop (MP-T03).
Optics: shallow depth of field, three-wavelength interference, shear × bias
strength, shear direction.
World: cell walls as optical path, chloroplasts, water film, contact-line
steepening, footholds read from delivered micrographs (fixed), drifting
particles (MP-T04).
Body: SDF body from parts (fixed), internal anatomy visible, claw size
(enhanced / true), part rig (fixed; on the GPU in the optical looks).
Motion: soft-body sway and surge, leg coordination (measured back-to-front
wave / front-to-back / pairs in step), claws need cell walls, slope load and
slipping.
Simulation: rings round the start (fixed, the layout), film capacity field
(fixed), Milnesium (the predator, on), Prionchulus (on; off opens the
portal), the rotifer meadows (on), Milnesium wakes (2 s / 10 s / 30 s / off)
and Milnesium hunger (comes and goes / always / never).
Motion also has the scramble (fixed) and smoothed trunk and camera (on; off
is the old single lag).
Controls: anatomy labels, rumble (impacts only: bites, scramble, slips, falls; not walking),
Invert camera Y (shared by every prototype, off), camera-relative crawl
(fixed).

Technique module: `shared/techniques/tardigrade-dic.js` (DIC and brightfield
with a focal plane; `opticalMaterial`, `OPTICAL_*` building blocks for custom
optical shaders, `DicMicroscope`).

### Borrowed (default off)

`../shared/techniques/adapters.js` holds the adapters: the pipelines meet
in one "optical field" (optical path, scatter, SEM height, absorbance) that
any prototype can fill from what it already draws and any borrowed
microscope can read. SEM of a 3D scene instead redraws the real geometry with
the mite's G-buffer materials. Borrowed looks are mutually exclusive; each
has a companion choice for its mode. All start OFF, so the prototype looks
as designed until one is switched on (or `?f=<id>` is in the address).

| Feature id | Borrowed from | What it does here |
| --- | --- | --- |
| `semMite` (+ `semMiteMode`: SE / BSE / false colour) | mite | The real geometry (deformed body, claws, leaves, detritus) drawn into the SEM G-buffer at 100 µm per scene unit; leaf cell walls are drawn per pixel by the optical shader, so the SEM sees bare leaf slabs |
| `opticsAmoeba` (+ `opticsAmoebaMode`) | amoeba | The DIC buffers (after the focal-plane blur) through the amoeba's optics |
| `microscopeParamecium` (+ `microscopeParameciumMode`) | paramecium | The same buffers through the paramecium microscope |
| `miteGait` | mite | The mite's alternating tetrapod offsets on the eight lobopods (overrides Leg coordination while on) |

The field looks need the optical materials, so choosing the Lit look turns
them off.

Not borrowed:

- Paramecium squirmer and low-Re helpers: the tardigrade crawls on claws; it does not swim.
- Paramecium cilia: tardigrades have none.
- Amoeba soft body: a 2D area-conserving outline cannot drive a legged 3D body with a part rig.
- Mite two-bone IK: lobopods are telescoping, unjointed legs; the part rig already stretches them hip to foot.

## Departures (labelled)

- **Time:** tun formation (2.2 s) and rehydration (2.4 s) are minutes to
  hours in life (Halberg et al. 2013 for tun formation as an active,
  muscle-driven contraction); here the tun is a defensive move.
- **The moss:** spokes of leaves radiating from one shoot are a level layout
  (the rings), not a moss cushion's real structure; a few leaves near the
  shoot pass through each other (the spoke leaves nearest the shoot on the
  60°, 210-240° and 270-300° bearings), harmless in the additive DIC picture.
  The dry patches are bare spots of a film that does not otherwise change.
- **Claws** are drawn about 1.6× longer and 3× thicker than true (~10 µm), the
  buccal tube and stylets about 2× thicker, so they survive the mesh and read
  on screen (switchable in Features).
- **DIC relief is optical, not height:** it is the gradient of optical path
  along the shear; dense organelles stand up exactly like ridges. The shear,
  bias and soft saturation are tuned for legibility.
- **Gravity** decides slipping here. At 0.35 mm, surface tension and adhesion
  dominate; the slope load is a game rule (switchable).
- **Leaves** are flat laminae with cells in the shader; real leaves curve,
  and fold in as they dry. Cell sizes are lax-celled (about 20 × 100 µm
  procedural, ~30 × 60 µm with the delivered art).
- **Speed:** 30-150 µm/s walking (up to ~0.43 body lengths/s) and
  ~280 µm/s scrambling; Nirody et al. measured 79–263 µm/s, so the walk
  spans the slow end to the middle and the scramble is a stretch.
- **Leg reach:** the 1.14× telescoping limit and the tucked, paddling foot
  are game choices for legibility, not measured.
- **Milnesium's rules** are game rules: keeping to its water on a ring (and being moved round it unseen), the slow approach,
  backing off after a bite, hunger that comes and goes, the sensing range, its speed, the
  −25% bites, the thin-film refuge threshold, backing off after a stylet jab
  (tardigrades do not really fight back this way) and giving up on a tun
  after three tries (a tun's hardness against *Milnesium* is not measured).
  It is drawn as this prototype's animal at 1.5× with a wider buccal tube and
  no placoids, not as a separate *Milnesium* model (no peribuccal papillae,
  different claws).
- **Rotifers** are a crowd to push through (the meadow), not prey or
  competition; free-living nematodes other than the boss are not added.

## Sources

- Nirody JA, Duran LA, Johnston D, Cohen DJ (2021). Tardigrades exhibit robust
  interlimb coordination across walking speeds and terrains. PNAS 118(35):
  e2107289118.
- Halberg KA, Jørgensen A, Møbjerg N (2013). Desiccation tolerance in the
  tardigrade *Richtersius coronifer* relies on muscle mediated structural
  reorganization. PLoS ONE 8(12): e85091.
- Research atlas `micro/research/` (S02, S03, S18, S19, S41–S44, S69, S73) and
  `micro/design/zoom-chain-levels.md` Level 2.
- References: `tardigrade-light.png` (Dorathyexplorer, CC BY 4.0),
  `tardigrade-sem.png` (Schokraie et al. 2012, CC BY 2.5), `moss.jpg`.

## Checks

```bash
node micro/prototypes/check.mjs tardigrade
node --test micro/prototypes/tardigrade/route.test.mjs
node --test micro/prototypes/tardigrade/legs.test.mjs
node --test micro/prototypes/tardigrade/controls.test.mjs
```

The first must print `ok tardigrade` with no console errors. The second
(Node, no browser, ~25 s) builds the world and checks the rings: 12 spokes,
every hand-over leaf to leaf within 40 µm (the claws reach 55 µm, so no
hand-over leans on the wet film), each spoke on its bearing, every bearing within 15° of one, each rim
leaf's tip on the portal ring with room to lure the boss, a meadow band and
two or three dry patches (dry, with a wet way beside) at the same distances
on every spoke with calm stretches between, and a wet, calm start; then the
director: rushing along every spoke meets Milnesium (within ~10 s, after a
warm-up) and then the pool at that spoke's rim (reached in 45-62 s), nothing
placed in view, on seen leaves or off the leaves, nothing moved once seen;
lingering brings Milnesium round them and then the pool; turning back moves
nothing that was seen. With the default path: walking out along its spoke
meets the pre-placed Milnesium and pool in order (nothing generated, the
pool reached in ~53 s); heading out along three other spokes takes each off
the path while unseen and places it ahead on that spoke, in order, nothing
seen moved. Then it walks: the real gait (`gait.js` Walker, with
grip, slips, falls and hand-overs) steered out along each of the 12 spokes,
aiming a little ahead on the leaf's centre line, must reach the rim leaf's tip
within 90 s (42-56 s), never carried back a leaf, never falling or bridging;
and just over each hand-over, pushing hard sideways into the new leaf's
narrow base (round its margin, onto the underside, losing grip) must never
carry the walker back to the leaf it left. (The pre-deploy audit saw a walker
ping-pong for minutes between two leaves of the 210° spoke: round the new
leaf's margin, a slip off the underside, the fall landing on the last leaf's
tip, over again. A fall off a leaf's underside with nothing below now lands
back on that leaf's upper face, and a walker no longer reaches back for the
leaf it just left unless the stick turns back.) The third
(headless Chromium, ~30 s) drives the animal at 60 Hz from the Sphagnum leaf
onto leaf E, across the film gap from leaf A to leaf B, up onto the steep
leaf C (then braced), round the margin of leaf D, through scrambles with
turns, a scramble into the climb onto C, a fall and a teleport, and checks
every leg on every frame (`creature.legFrames()[i].raw`, before the backstop
clamp) stays within 1.15× its rest length, and that after each transfer all
eight feet catch the new face (0.9-1.8 s). Latest run: longest 1.14×
(a foot reaching in mid-swing), every transfer handed off. `window.__micro` exposes
`scene`, `camera`, `renderer`, `world`, `walker`, `creature`, `life`, `mic`,
`view`, `features`, `predator` and `dash` for scripted checks (`?pr=1` forces
full resolution on software GL), plus `players`, `animals`, `split`,
`layout`, `places` (the landmarks), `landmarks.log` (every landmark and near
posted), `teleport('forward' | 'back', slot)`, `place(slot, leaf, u, v)`,
`forceCapture(slot)`, `boss`, `forceBossCapture(slot)`, `captor`, and
`testStep(dt, stick, { down, pressed })` with button ids. The attack and the reach were checked in
Playwright (2026-11-02): food under the front quarter beside the head (body
x 1.15, z 0.35) is highlighted and eaten on X, food under the middle of the
body is not, X with nothing plays the attack and a puff, and 10 s of walking
calls no rumble. The fight, the eating,
the catches and the boss were checked in Playwright (windup, strike, a block,
jabs driving Milnesium and Prionchulus off, a diatom visible in the gut
fading into it, both catches following the predator and respawning). Multiplayer was checked with mocked gamepads in
Playwright: joins during play, 2 and 4 players splitting and merging, a catch
in multiplayer (respawn beside a teammate, no card), both landmarks standalone
and in the shell.
