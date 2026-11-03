# Paramecium

World 5 of Micro Zoom (`micro/game/`, "Hollow Pool"), between the amoeba and
the bacterium: swim as the green *Paramecium bursaria* across a microscope
slide in darkfield, quick and light, battling the pond drop's other protists
on the way to a biofilm guarded by a bladderwort trap. Published at `micro/game/paramecium/`.

## The redesign: a 2D slide that looks like its card (2026-11-02)

The owner: "For the paramecium world, I think the current 3D set up isn't
working too well. Can we instead make it visually look like the image I see on
the selection card (not the current intro screen)? It can be more like a 2D
slide where the paramecium is quick and you battle other protists (including
using the lush coloring that I see in the card image), including trying avoid
a giant amoeba … This should also be a better transition because it will be
more similar to the worlds next to it." Then: "more of a 2D game, or actually
2.5D as we could have you go further or closer a little bit, to dodge around
things, and go over/under obstacles", refined to: "RS up/down be into/out-of
… creatures should be able to interact across planes, and some span multiple
planes, making the planes feel continuous and connected … sometimes you should
automatically wind above or below a simple obstacle plant … RS left/right can
be maybe rotating the camera (though only far left and right)".

So the world is now a top-down slide drawn after the card
(`assets/cards/paramecium.webp`), with a continuous depth under the coverslip
that the microscope's focus follows. The 3D chase camera, the volumetric
optics, the ray-marched cell and the 3D set pieces are gone (see *What was
removed*).

## Fighting back, continuous depth and the zoom (2026-11-02, later)

The owner: "I saw an enemy and kept attacking him but nothing seemed to do
any damage and then he killed me. Do you know what's going on? Also, let's
start at the further zoomed out level and have the current default be the
furthest in you can zoom, but allow zooming further out. Also, let's zoom with
LT and RT continuously instead of using DPad. And let's not have 3 depth
levels, just a continuous depth. I want it to feel 3D."

**Why attacks did nothing.** The hunters had no health or interest at all: X
only paused one for a moment (a Dileptus for about a second, a Didinium for
0.8 s, the giant's pseudopod pulled back) and nothing added up, so it always
came straight back. The jab was also silently ignored in most of a hunter's
states (a Didinium recovering next to you after a lunge, lunging, or idling;
anything out of a narrow cone), X ate any prey or bloom algae at your mouth
instead of jabbing, and a jab looked and sounded the same whether it landed
or not. The Didinium's lunge could not be blocked at all, after a 0.55 s
crouch. Now (`foes.js` *Fighting back*, `../CONTROLS.md` "Fighting back"):

- every hunter has an **interest**; a jab that lands (X) costs it a third, a
  block (B) of its strike half: **three jabs, or two blocks, and it gives up**
  and swims off (the giant amoeba takes four jabs and draws back, creeping
  away for 14 s). Red pips by a hunting hunter show what it can still take;
- a jab that lands **flashes** where it struck (sparks, a ring), knocks the
  hunter back, interrupts its wind-up and plays `shared/hit`; one that cannot
  land is a **visible miss**: its threads fizzle where they fell short (grey;
  a blue ring when the hunter is above or below you), with a word the first
  time ("only reaches about half a body length", "match its depth");
- X jabs before it eats whenever a hunter is close;
- every strike is **telegraphed** (Dileptus: its trunk winds back 0.9 s, the
  tip reddening; Didinium: a 0.7 s crouch, the snout reddening; the giant's
  rising pseudopod) and **B blocks** the Dileptus's slash and the Didinium's
  crouch or lunge (with or without trichocyst charges: `shared/block`, the
  burst of threads, the hunter knocked back), so a death always follows a
  tell you could have answered.

**The depth is one continuous water volume** four body lengths deep (480 µm,
`DEPTH`), seen in perspective (below). Everything sits at any depth; meeting
(eating, a jab, a block, a catch) needs the two to be near in depth, within
`ZTOL` (40 µm, about a body's thickness) on top of their half-thicknesses,
never on the same level. The depths laid out for the old 300 µm drop (the
scenery, the trap, the giant, the portal and the way back) are scaled by `ZK`.

**The zoom** (`ZOOM`, `route.js`; recalibrated 2026-11-03, below): **LT
zooms out, RT in**, analogue and continuous (a full trigger is ×e in 0.9 s),
eased (0.14 s). The D-pad does not zoom (↑↓ do nothing; ←→ change the look).
Each player has their own zoom: one view shows the widest of its players',
split views each keep their own players'.

## Everything stirs, the zoom recalibrated, the way to the portal legible (2026-11-03)

The owner: "in the paramecium world, I notice plants that retract when I go
by (what are those and should I be able to eat them?). Also I see what look
like thin oval cells standing still with an H shape in the middle of them,
but they don't seem interactable … pressing X seems to spurt out lines …
it only seems to have an effect on the tiny bugs that I can eat. It should
also be able to move / affect other things in the environment … Everything
should be interactable if possible. Also, can we start the zoom from the
current furthest zoom, and recalibrate to be able to go further out or in
from there? Also I couldn't find the portal … We should slowly vary the
environment as we get closer to the portal, so you know which track to take."

The retracting "plants" are the *Vorticella* colonies (bells on contractile
stalks: `world.js` `vorticella`, drawn by `drawVorticella`); the still ovals
with an H are pennate diatoms (the H is the raphe slit down the middle and
its central nodule: `drawDiatom`). Neither can be eaten: a *Vorticella* bell
is a ciliate about a third of your length, a diatom is glass. Now:

**X sends a push wave** (`stir.js` `WAVE`): the jab's threads are shorter and
softer (9 fanning out ±35° ahead, ~25 µm, fading in 0.3 s; `cell.js`), and
an arc runs out ahead of the oral end to 170 µm in 0.42 s and fades
(`draw.js` `drawWaves`), rippling the glitter as it passes. What it reaches
(once, in its arc, within 75 µm of depth) is shoved along it by its mass;
the jab's hits on hunters (`foes.js`) and the gulp of food at your mouth are
unchanged. **X during a dash** (or just after one) is a strong wave: 240 µm,
2.6× the push. What each thing does (each tile copy keeps its own state,
`world.js` `dynOf`; `stir.js` `shove`):

| Thing | X (and the body) | Strong X (in a dash) |
| --- | --- | --- |
| Pennate diatom (live: gold plates) | slides away and turns, by its mass (a small one ~60 µm, a big one ~20); the body shoves it as you weave over it; it glides slowly to and fro along its raphe on its own (14-34 µm at 7-13 µm/s) | tumbles |
| Empty frustule (dead: glass, striae, no gold; ~30 %, one near the start) | slides and turns | **cracks** across: two half-shells part, two food clumps spill out |
| *Fragilaria* ribbon | slides, heavier | tumbles |
| Detritus clump | wobbles; **crumbles** once struck harder than its radius / 36 µm (one jab breaks a small one, a big one takes two or a strong one; a dash into it counts 0.6): its granules fly apart and settle as a loose scatter, 1-2 bacterial clumps (food) drift out, and it is no longer an obstacle | crumbles |
| Clump carrying a *Vorticella* colony | wobbles only (the colony holds it) | wobbles |
| *Spirogyra* filament (anchored) | bends where struck (up to 34 µm) and springs back (a damped spring, 8 rad/s); the body bends it as you weave through | bends further |
| *Vorticella* | snaps its stalk shut at once (also when you bump its stalk, and as before when you swim close), the bell recoiling with a wobble; one struck **open** (feeding) knocks loose the bacterial clump at its mouth (food, once every 14 s per bell). Open bells draw drifting bacterial clumps toward them (their feeding current, up to 44 µm/s within 170 µm, with specks swirling into the bell), so food gathers at them | the same |
| Flocs | pushed far (light) and loosened; the body sweeps them along | broken up |
| Prey | bacterial clumps knocked along; a *Chilomonas* darts off | |
| Bloom cells | pushed out of the wave's way (beyond the gulp) | |
| Bladderwort trap | its antennae and trigger hairs wave; touch the hairs of a set trap and it fires (early: a wasted pulse if you are clear). Its pulse also drags in the loose diatoms, flocs and prey within its reach, and swallows what reaches its door | |

**Departures:** a real trichocyst discharge is a defence, not a current
strong enough to shove a diatom; the wave stands for the discharge plus the
cell's oral current, scaled up so a hit reads. Detritus does not hold
bacteria as tidy clumps, and a frustule does not hold food; both spill
"food" for the game. *Vorticella* contracts in milliseconds and re-extends in
seconds (as here); a knocked bell does not really spit out a clump.

**The zoom recalibrated** (`route.js` `ZOOM`): play starts at **3×** (1.68
mm across, the widest it used to go), zooms in to **0.9×** (504 µm, a little
closer than the old closest) and out to **5.6×** (3.1 mm, 1.9× the old
widest). Zoomed out, the far detail thins (`draw.js` `lod`: glitter, clump
granules and fibres, *Vorticella* stalks, cilia and granules, the
filaments' ribbon steps; flocs at 3.6×), and past 3.2× the cell keeps a soft
glowing outline so it never shrinks into the scenery (`drawCellHalo`). The
fill rectangle is now the view's own box (the turn is locked to the slide's
up), not a square round it: a third of the shapes at the start. The world's
card keeps its nominal 0.9 mm field (the shell's ladder of fields,
`../src/worlds.js` `fieldMm`, must keep falling from the amoeba's 1.4 mm);
the transition in eases to the opening framing as before.

**The gradient toward the portal** (`world.js` `RICH`, `richAt`): a value
`rich(x, y)` from the distance to the portal's leaf, 0 beyond 44 mm, rising
(eased) to 1 within 1.2 mm; at the start of the default path (39 mm) it is
0.07. A second, ranked layer of scenery (8 more filaments, 26 clumps, most
carrying *Vorticella* colonies, 14 diatoms, 70 flocs a tile) shows where the
gradient passes each thing's rank, fading in over a fifth of the range; and
toward the leaf: bacteria join the glitter (up to 4 more short rods per 80 µm,
low in the drop), patches of biofilm haze (green and amber, with
microcolonies) thicken on the slide, a warm green creeps into the field and
the habitat tile below (`main.js` `tintLook`), more food is kept round you
(6 → 10), and within ~5 mm the slide turns to leaf litter (a net of plant
cells). Sideways and back it stays open water (it depends only on distance,
so it works wherever the portal ends up: if the portal is placed as you go,
the gradient's reference eases after it over a few seconds, `stepRich`). The
way back has its own cue: within 2.4 mm of the amoeba's patch its slime
trails and egested vacuoles thicken on the slide (`backK`). Measured at 3×
along the default path (`rich` / shape instances): start 0.07 / 10.6 k,
quarter way 0.28 / 11.7 k, half 0.51 / 13.7 k, three quarters 0.76 / 14.7 k,
3 mm short 0.95 / 18.2 k; 20 mm to the side 0.04 / 8.9 k.

**Straight up the screen reaches everything** (2026-11-03, this build):
`debug.rush({ bearing: π/2 })` (the real game stepped at 1/30 s, dashing
when ready) meets the Dileptus at 5.8 s, the bloom 14.5, the giant amoeba
23.1, the Didinium 35.8 and reaches the open portal at 47.6 s, no deaths.

## The look

Darkfield by default, as the card: a near-black field where everything glows
where it scatters light.

- **Your *Paramecium bursaria*** (`cell.js`): a luminous slipper outline (the
  pellicle, with a fainter cortex just inside), a bright fringe of cilia all
  round beating in metachronal waves (faster as you swim, reversed as you back
  up), the oral groove running in from the front to the mouth at mid-length,
  green *Chlorella* and golden granules streaming round inside (cyclosis), the
  pale macronucleus, two star-shaped contractile vacuoles that fill and
  empty, and a food vacuole for each meal. It bends into turns and stretches
  in a dash.
- **The pond drop** (`world.js`, drawn in `draw.js`): green *Spirogyra*
  filaments with their spiral chloroplast ribbons (brighter on the near side,
  beaded with pyrenoids, broken at each cross wall) crossing the field at
  angles and running through the depth; golden-brown detritus clumps;
  colonies of bell-shaped *Vorticella* on coiled stalks rising from some of
  them (each contracts now and then on its own, and at once when you swim
  close or knock it, its stalk coiling up, then re-extends slowly); pennate
  diatoms with golden chloroplast plates (some empty, glass only) gliding
  slowly along their raphe, and *Fragilaria* ribbons; loose golden flocs; and
  fine glittering specks everywhere (hashed per 80 µm cell, the same on every
  visit), twinkling. All laid out in a 2.4 mm tile repeated in every
  direction (each copy keeping its own shoves and breaks), richer toward the
  portal (above); the opening view
  is composed after the card (two filaments crossing to the right, a
  *Vorticella* colony on a clump up to the left, diatoms between).
- **Far below the drop**, the delivered seamless habitat tile (MP-P04;
  MP-P05 in phase contrast), blurred and dim, sliding slower than the drop
  (parallax).
- **Other looks** (D-pad ←→, Features → *Microscope look*): phase contrast
  (dark structures with bright halos on grey) and brightfield (dark on a lit
  field), from the same shapes.
- **One renderer** (`shapes.js`): every shape is an instance of a soft
  signed-distance quad (capsule, disc, ellipse, outline) in one dynamic buffer
  drawn in one call; darkfield simply adds them up (no sorting), the other
  looks subtract them from a lit field. A view is one draw plus the tile and
  the portal's glow.

## Depth (continuous, 3D)

The drop is one continuous water volume 480 µm deep, the coverslip above (`z`
+240 µm), the slide below (−240 µm) (`route.js` `DEPTH`).

- **RS up swims deeper** (into the slide, away from you), **RS down
  shallower** (toward you), smoothly (340 µm/s: the whole drop in 1.4 s);
  LB/RB do the same (Q/F, or the arrow keys). The goal strip says how deep you
  are (µm under the coverslip) and the gauge at the right edge shows where
  every player is between the glass and the slide.
- **Seen in perspective from your depth** (each split view its own
  players' depth; `shapes.js`): the objective is 900 µm above you, so what
  lies above you is drawn larger and slides faster as the view moves, what
  lies below smaller and slower (parallax: the glittering motes, spread
  through the whole depth, show the volume as you swim). The perspective
  follows you at once; only the focus lags (next).
- **The focus is the microscope's, turned by a patient operator**
  (`focus.js`; the owner: "if you move in depth you might appear defocused,
  and then the microscope catches up and refocuses you ... if you're
  continually moving up and down the depth the microscope doesn't follow, it
  waits for a stable depth before refocusing, like a person would"). Each
  view has its own focal plane, separate from the swimmers' depth. While
  your depth changes (faster than 30 µm/s) the plane holds and you go soft,
  what was at the old depth staying sharp; once you have held a depth for
  0.5 s the operator turns the fine focus to you, an eased turn of 0.5-0.9 s
  (longer the further) with a slight overshoot (~2 %) and settle, the drop
  sliding in and out of focus as the plane sweeps; move again mid-turn and
  the knob stops where it is, and the wait starts over. A shared view keeps
  its most settled player in focus. Out of focus your cell keeps a soft
  glowing outline (as a darkfield halo stays visible), and the game's marks
  (the hunters' red tells, hits, misses, the interest pips, the players'
  rings) keep most of their edge (`shapes.marker`), so nothing that matters
  is lost in the blur. Off the focal plane things are softer (defocus: their edges widen 0.06 µm per µm, which
  also spreads and dims fine lines and specks) and dimmer (more below than
  above), and what lies below sinks into a cool blue haze. **Soft shadows**
  fall on the slide (on the habitat tile in darkfield, plainer in
  brightfield), offset from what casts them by its height, as from a low
  lamp: a cell's shadow walks away from it as it rises. Features → *Depth
  cues* turns the perspective, the haze, the halo and most of the blur off.
- **One connected volume**: contacts need bodies to meet in the plane and
  near in depth, so things interact across depth rather than in separate
  planes. Filaments and *Vorticella* stalks run through the depth
  from one end to the other, the giant amoeba fills the lower half of the
  drop, the trap most of it; hunters follow you in depth, each at its own
  pace.
- **Auto-weave** (`swim.js`): swim into a filament, a stalk, a clump or a
  diatom and the cell winds over or under it on its own, to the side its
  depth is already on (else the side with room), a little slowed; only
  something that fills the depth (the trap's wall) turns you aside, glancing
  along it. You never need RS to get past the scenery; you use it to slip
  under a lunge or over the giant amoeba.
- **RS left/right peeks** sideways (the view slides about 30 % of the field
  that way and eases back). The view's turn is locked with the slide's +y up
  the screen (`view.rot` 0: the world's forward, for the layout); with **Free
  camera (single player)** on in the game's Settings (or `?freecam=1`), a lone
  player's RS far left/right turns the view as it used to, and a second
  player joining eases it back over 0.6 s and locks it
  (`../shared/camlock.js`). Swimming stays screen-relative.

## Controls

| Button | Label | What it does |
| --- | --- | --- |
| LS | Swim | Analogue speed and direction (screen-relative); the cell turns to it fast; let go and it stops (low Reynolds number) |
| RS | Deeper / shallower · peek | Up deeper, down shallower, smoothly; left/right peeks sideways |
| A | Dash | A ciliary sprint (1.5 mm/s for 0.28 s, recharges in 0.9 s); flings bloom cells aside |
| X | Jab · push / eat | With a hunter close: a trichocyst jab ahead (reaching 110 µm past the front): it lands (a flash, `shared/hit`, the hunter knocked back and worn down) or visibly misses. Otherwise gulps prey at the oral end, or a cone of algae in the bloom. Every jab sends a push wave ahead that shoves, bends, snaps or breaks what it reaches (above); in a dash, a strong one |
| B | Block / burst | The avoiding reaction (back up and swing round, away from the nearest threat); blocks a Dileptus's slash or a Didinium's crouch or lunge (always); with a charge also a trichocyst burst all round (three charges, one back every 3 s): bursts you out of the giant amoeba's cup and the trap's pull |
| Y | (not in the in-game list) | At the open portal (down on the biofilm, the trap spent); on the amoeba's patch: back up a world. The world asks for Y on screen there, so the controls lists leave it out (3 November 2026) |
| LT/RT | Zoom out / in | Analogue and continuous, from 0.9× (504 µm) to 5.6× (3.1 mm); the game starts at 3× (1.68 mm) |
| LB/RB | Deeper / shallower | The same as RS up/down |
| D-pad ←→ | Change the look | Darkfield, phase contrast, brightfield |

Keyboard: WASD swim, arrow keys depth (left/right peek), Space dash, E
jab/eat, Shift block/burst, R enter, Z/X zoom out/in, Q/F deeper/shallower,
3/4 look. The shell's list (`micro/game/src/worlds.js`, from
`../../text_config.js` `worlds.paramecium.controls`): `[['LS', 'Swim'],
['RS', 'Deeper / shallower · peek'], ['A', 'Dash'], ['X',
'Jab · push / eat'], ['B', 'Block / burst'], ['LT/RT', 'Zoom out / in'], ['LB/RB', 'Deeper / shallower'], ['D-pad ←→', 'Change the
look']]`.

## Playing

- **Quick and light** (`swim.js`): up to 620 µm/s (the closest field crossed in
  under a second), full speed in a fifth of a second, turns at 11 rad/s,
  stops almost at once; the dash more than doubles it. The camera follows the
  group's middle with a little lead.
- **The goal strip** (top centre): prey eaten of 6 (eat 6 and the cell
  divides: the count starts again), the dash's charge, the trichocyst charges
  (✦), your depth, the trap's resolve once it is about, and a red warning line
  naming the right move for whatever is at you. No hidden meters: nothing runs
  down, stay in calm water as long as you like.
- **Prey** (`prey.js`): bacterial clumps that drift (glittering gold) and
  *Chilomonas*, which darts away when you come within ~115 µm (chase it). Kept
  at about six round every player.
- **Death** (the owner, for the amoeba: a death animation, and you keep
  control until the moment of death): a strike lands only on contact, and
  then the cell dissolves where it is (its outline breaks apart and drifts,
  its *Chlorella* and granules scatter, 1.5 s) and comes back 2.4 s later,
  materialising a little back toward the start at the spot furthest from every
  hunter (together: behind a teammate), blinking and safe for 2.5 s.

## The encounters, placed as you go

The shared director (`../shared/director.js`, 2D: its z is our y) places each
encounter once, in order, in water nobody has seen, ahead of whoever is
furthest along, with calm breaks between (`route.js`; the owner's
*Placed as you go*, `../../design/encounter-pattern.md`):

1. **Dileptus** after a warm-up of ~4 s of swimming;
2. **the *Chlamydomonas* bloom**, a band across the way;
3. **the giant amoeba**;
4. **the two *Didinium***, side by side across the way;
5. **the biofilm on a leaf (the portal)** with the bladderwort trap on guard
   in front of it, its door toward whoever comes.

- Calm breaks of ~7.5 s of swimming clear of the last; a lingering player
  still gets each in turn (it is placed round them and comes over:
  `driftEncounter`, to `DRIFT_TO`).
- **What counts as seen:** each view's field (a turned rectangle with a 1.2
  margin for parallax), plus 260 µm round each cell. Seen water never changes.
- **The default path:** all five laid along one bearing from the start on
  the first frame, straight up the screen, the world's forward (`BEARING` =
  `FORWARD`, π/2: the view's turn is locked with the slide's +y up; the
  owner, 2026-11-03: "with the new camera, we should have the default path
  be straight forward essentially ... make the forward path the one of
  discovery"; it was 0.62 rad, up and to the right), at a rush's distances
  (5.5, 13.7, 22, 30 and 39 mm), each as near the line as it fits
  (`lateral`), out of sight; follow it and you meet them
  where they lie; head off another way and each, while unseen, leaves the
  path and comes ahead of you (`single`). The portal stays sealed (no prompt,
  its glow shut) until the four before it are met.
- **Timings** (`route.test.mjs`, the director alone, a cell rushing at 850
  µm/s, the closest, 560 µm view): in 16 directions the Dileptus is placed at 4.1 s
  and met at 5.6 s, the bloom at 15.4 s, the giant amoeba at 25.5 s, the
  Didinium at 35.4 s, and the portal is reached at 46.4 s; on the default path
  at 45.7 s; straight up the screen (turning for the leaf only within 0.9
  of a view), rushing: the Dileptus 5.9 s, the bloom 15.6, the giant 25.1,
  the Didinium 34.9, the portal 45.7 s, all where the path laid them, and
  without dashes (510 µm/s) 9.8, 26.0, 41.9, 58.1 and 76.2 s; on the page
  (2026-11-03, W held, real time) 9.1, 22.5, 35.8 (the cell put back ~3 mm
  just after), 59.6 and 74.7 s, against, before (the path at 0.62 rad), each
  placed as you go and the pre-placed portal ~32 mm off to the side the
  whole way up until the portal was placed ahead at 68 s; out 8 s and back, 48 s; standing still, everything comes and the
  portal is placed near you at 87 s. **In the game** (`debug.rush({ bearing
  })`: the real swim, scenery, auto-weave and hunters stepped at 1/30 s,
  full stick and a dash whenever it is ready, steering for the portal only
  once it is within 1.6 mm and diving for it within 0.7 mm), at the start
  zoom (1.6×) and in the 480 µm depth, in four directions (0.62 = the default
  path then, 2.2, 3.8, 5.4; measured before it turned up the screen): the Dileptus met at 5.8-6.2 s, the bloom 15.0-15.7 s,
  the giant amoeba 23.9-25.6 s, the Didinium 32.6-39.1 s, the portal reached
  at 42.9-50.8 s;
  rushing flat out, nothing caught the cell (`safe: false`).

## The hunters (`foes.js`), each with its tell and its answer

- ***Dileptus*** (a 330 µm flask with a long toxicyst trunk, a bead-chain
  macronucleus): it stalks you, then winds its trunk back (0.9 s, the tip
  reddening: the tell) and slashes across. **B** in the wind-up or the slash
  blocks it (stunned, it recoils); **X** that lands staggers it; two blocks
  or three jabs and it gives up and swims off. Its trunk reaches you only
  near its depth (±~70 µm); it follows you in depth slowly (150 µm/s), so a
  quick dive also slips the slash.
- **The *Chlamydomonas* bloom** (`bloom.js`): 520 green flagellates through
  the whole depth, densest toward the coverslip (bioconvection: plumes sink,
  the rest rise). Swim and they part round you (0.72 speed while you push
  through); **X** gulps a cone of them (six count as a meal); **A** flings
  them aside. Eaten ones come back after 8 s away from everyone.
- **The giant amoeba** (a 460 µm *Amoeba proteus* at game size, `GIANT`):
  slow (32 µm/s), huge, filling the lower half of the drop. Hunting, one
  pseudopod reaches for you and rises toward your depth, its hyaline tip
  brightening (the tell). Touch it and it closes round you (1.4 s): **B**
  bursts you out (it flinches, its pseudopod pulls back), or dash clear. Near
  the coverslip, over it, you are out of its reach. **X** at its reaching
  pseudopod or its edge makes it snap back; four jabs (or bursts from
  inside) and it draws back and creeps away for 14 s. It eats the prey it
  covers too.
- **Two *Didinium*** (100 µm barrels with two girdles of cilia and a snout):
  they close in (480 µm/s: you outswim them only flat out) and follow you in
  depth quickly (260 µm/s), then crouch (0.7 s, the snout reddening) and
  lunge straight (1.35 mm/s) at the depth they crouched at. **B** in the
  crouch or the lunge blocks it (it glances off, staggered); or dodge
  sideways, or change depth while it crouches and it passes over or under
  you. Two blocks or three jabs (**X**) and it gives up and swims off. After
  three misses it rests.
- **The bladderwort trap** (the boss, `createTrap`): a *Utricularia* bladder
  just above the slide in front of the leaf, its door toward you; dormant until
  you come within 680 µm. Its tell: the door quivers and reddens and the walls
  draw in (1.2 s), with streaks of the inflow you can see; then a pulse
  (0.38 s) pulls everything near the door toward it (weaker up near the
  coverslip); drawn within 90 µm of the door, you are sucked in. Aimed pulses
  when you come within 330 µm, and one now and then on its own. Every wasted
  pulse and every burst out (**B** in a pulse) costs it resolve (●●●●●);
  spent, it hangs slack for 24 s: the way is open. You glance off its wall.

## Landmarks and the way on

- **The portal: a biofilm on a leaf** lying on the slide (a fragment with its
  veins, coated in microcolonies of rods and dots), under the shared golden
  glow (`../shared/portal.js`, its light spilling in from the screen's edge
  when it is off screen, `createPortalLight`); no arrow unless the Portal
  arrow setting is on (`?arrow=1` here; `portalArrow()`). Down on it (over
  the leaf, deeper than −80 µm) with the trap spent: "Y Enter the portal"
  (`embed.near('portal')`), and **Y** goes through (`enterPortal`). While the
  trap guards it, touching the leaf sweeps you back off it.
- **The way back: the amoeba's patch of slide** (its slime trail and egested
  vacuoles) 2.6 mm behind the start, marked by a quiet ring at the edge of the
  view. Down on it for half a second: "Y · back" (`embed.near('back')`), and
  Y rises to the amoeba.

## The transitions (all three neighbours are 2D slides now)

(`../../game/README.md`, *The continuous transition*.)

- **In, from the amoeba:** the amoeba's portal frames a green *P. bursaria*
  turning up its screen as time slows; this world opens on your cell centred,
  facing up the screen (heading π/2), at mid-depth, the focus on it, as a 2D
  pose (pitch 1.55, `rel` = heading + π/2 = π). The shell eases one pose to
  the other; both worlds are top-down slides, so the move is a short change
  between two framings of the same creature (f 0.144 → 0.071 since
  2026-11-03: this world opens at 3×, so the cell narrows to about half the
  amoeba's beacon during the move; at the old 1.6× start it was 0.134, about
  as large) while darkfield fades in over brightfield.
  While held, the view takes each `camera` pose (`poseView`: its width from
  `f`, its centre from x, y, its turn from `rel`); on `begin` time eases back
  in over 0.6 s. Nothing changed on the amoeba's side.
- **Out, into the bacterium (the dive):** Y on the biofilm: a golden burst, a
  bloom, the chime, a rumble; time eases to a stop (on the frame's real time,
  so a slow machine plays it slower, never skips it) while a magnetotactic
  spirillum (3 µm, a gold glint) swims up just ahead of you and its kin clump
  (`../shared/kin-clump.js`) comes in round it. Frozen, it posts the
  spirillum's pose and asks for the dive (`DIVE`: 5.2 s, crossfade 50-78 %,
  halo from 50 %). From each `camera` message's `u`: the light turns from
  darkfield to the bacterium's phase contrast (3-30 %), the portal's glow
  fades within the first ×1.5 of magnification, the focus drops to the film,
  the clump shows as a dark mass, its slime thins (36-60 %) and it resolves
  into bacteria; the bacterium world fades in under the same framing with its
  opening field laid out from the same layout, ending on your cell.
- Test hooks: `__micro.outro()`, `OUTRO.rate`, `DIVE`, `spirillum().pose`,
  `cellPose()`, `clumpScreen()`, `enterPortal(slot)`, `debug.placePortal()`,
  `debug.toPortal(d, z)`, `debug.spendTrap()`.

## Multiplayer

Up to four players (`../shared/players.js`): anyone joins with a button on
another controller. Each has their own cell, dash, trichocysts and death; the
prey count is shared. One view frames the group and **zooms out** as it spreads
(`split.zoom`, up to 1.6× the field, on top of the players' own zoom), then splits LEGO-style
(`../shared/splitscreen.js`, its 2D form: `{ center, pxPerUnit }`; positions
are given in the turned view's frame and the offsets turned back), each split
view focused on its own players' depth and zoomed to its own players' zoom
(LT/RT: the widest of them; the shared view the widest of everyone's). A
split view's own depth, focal plane (each player's own) and zoom are blended
with the players near them and eased in and out with the split
(`split.viewBlend`; the zoom about its players, so they stay at their region's
middle), so the last split frame and the first merged one are the same
picture, and two views joining on the way to a merge do not jump.
Together, each cell carries a faint
broken ring in its player's colour; hunters pick a player each; the trap's
pulse pulls everyone in reach; anyone can wear it down; a player who dies
comes back behind a teammate.

### Telling players apart

Every player's *P. bursaria* carries its own shade of *Chlorella*
(`VARIETIES` in `cell.js`), alone or together:

| Player (colour) | Chlorella |
| --- | --- |
| P1 (gold) | green |
| P2 (teal) | blue-green |
| P3 (rose) | olive (pale yellow in darkfield) |
| P4 (blue) | light yellow-green |

**Departure**: symbiont strains do differ in shade, but not one per player.

## Features

Microscope look (Darkfield / Phase contrast / Brightfield), Depth cues (focus
and parallax), Habitat backdrop (the tiles), the scenery (fixed), sound and
ambience, the quality governor (`../shared/quality.js`, scaling the pixel
ratio; `?q=high`).

## Art

Delivered and used (`../../design/source/build_requests.py`):

- the darkfield and phase tiles **MP-P04**, **MP-P05** (blurred 512 px
  copies made at load, laid below the drop);
- **MP-P06**, the darkfield top-down *P. bursaria* (`assets/paramecium/
  bursaria-darkfield.webp`): the inside of every player's cell in darkfield,
  its #FF00FF ground keyed to black at load so it simply adds to the field,
  its *Chlorella* turned to each player's shade in the shader, drawn in the
  same perspective and focus as everything else, under the procedural
  pellicle, beating cilia, oral groove, streaming granules and food vacuoles
  (the procedural Chlorella, nucleus and contractile vacuoles stand in for it
  in the other looks, before it loads, and as the cell dissolves);
- **MP-P07**, the hunters in darkfield (`assets/reference-sheets/
  paramecium-hunters-darkfield.webp`): the reference the procedural Didinium,
  Dileptus, giant amoeba and trap are drawn after (luminous outlines,
  golden granules on black), as requested; not loaded by the game;
- **MP-P08**, the darkfield intro plate (`assets/game/
  intro-paramecium-darkfield.webp`): the shell's intro plate for this world
  (`micro/game/src/worlds.js`), in place of the brightfield 3D one (MP-G11).

Not used any more: the plates MP-P01, MP-P02 and the pellicle MP-P03 (the 3D
cell's texture).

## What was removed

The 3D world: the chase camera and the microscope camera, the volumetric
optics (`optics.js`, re-exporting `../shared/techniques/paramecium-microscope.js`,
which stays for others), the ray-marched cell and its *Chlorella* shader, the
3D strands (`strands.js`), `ambient.js` (the 3D pond-water tile),
`landmarks.js`, `encounters.js`, `proteus.js` (the old *Amoeba proteus* of
the floor), `bladderwort.js` (3D), `catch.js`, `fx.js`, `geom.js`, the
helical swim and roll, the camera-relative 3D stick, the borrowed looks.
`world.js`, `cell.js`, `swim.js`, `bloom.js`, `prey.js` and `route.js` keep
their names with new 2D contents; `shapes.js`, `draw.js` and `foes.js` are new.

## Performance

2026-11-03 (the fill rectangle now the view's own box; SwiftShader, 1280×720,
the same shared machine): ~4.8 k shape instances at the closest (0.9×),
~10.6 k at the start (3×), ~14.9 k at the widest (5.6×), ~18-20 k at 3× next
to the portal (the gradient's full layer) and ~29 k at the widest there; a
frame ~170 ms at the start and ~265 ms at the widest. The numbers below are
from before.

Zoomed (SwiftShader, 1280×720, a shared machine: rough): ~6.8 k shape
instances at the closest field, ~11 k at the start (1.6×), ~22 k at the
widest (3×; of 90 k), plus ~20-190 shadows; the glitter thins as the field
widens (`drawGlitter` `lod`) and the filaments' ribbons take longer steps, and
the culled rectangle grows only by what the perspective shows below the
focus. A frame ~170-250 ms at the start and ~285 ms at the widest under
SwiftShader on the loaded machine.

`../../tools/perf/measure.mjs paramecium 1` and `4` (before the zoom and the
perspective): one player, 2 draws a frame, ~11.6 k primitives
(~5.8 k shape instances), SwiftShader frame ~245 ms (the 3D world's scene pass
was ~1200 ms, with ~600 k triangles and ~100 draws); four players spread
apart, 4 views, 13 draws, ~166 k primitives, ~1260 ms (every view redraws the
shared instance buffer, filled once over the union of the views; the 3D
world drew 2.7 M triangles in 423 draws there). CPU ~3 ms a frame (one
player), ~10 ms (four). Fill is the cost: each quad covers only its shape's soft edge and
halo (to 5 %), and a speck too faint once spread by defocus is dropped in the
vertex shader.

## Departures, labelled

- The cell is drawn at its real length (120 µm) but swims about half as fast
  as a sprinting *Paramecium* (1-1.5 mm/s) at 620 µm/s, so the 560 µm view
  can follow it; the dash is faster than it.
- The drop is 480 µm deep (a real wet mount is ~20-100 µm under a coverslip
  but a pond drop far more), and it is seen in perspective with shadows on the
  slide and a haze below, which a microscope's nearly parallel view would not
  give: the focus and the defocus are a microscope's, the perspective, the
  shadows and the haze are there so the volume reads as 3D.
- The giant amoeba is *A. proteus* at the large end (460 µm across), and it
  rises toward you with a pseudopod; real amoebae crawl on the slide.
- The trap's pulse is drawn over 0.38 s and pulls from ~430 µm (real: half a
  millisecond, about a millimetre).
- *Chlamydomonas* drawn 10 µm (real ≈10 µm), wandering slower than their
  ≈100 µm/s; flagella not drawn.
- Glitter, granules and flocs are scattered light from particles too small
  to name; their density follows the card, not a count.
- The push wave, the food spilled by a crumbled clump, a cracked frustule
  or a knocked *Vorticella*, and the gradient's tidy rise toward one leaf
  (see *Everything stirs*).

## Checks

```bash
for f in micro/game/paramecium/*.js micro/game/paramecium/*.mjs; do node --check "$f"; done
node --test micro/game/paramecium/*.test.mjs micro/game/shared/director.test.mjs   # stir.test.mjs: the pushes, breaks and gradient
node micro/game/paramecium/route.test.mjs        # the timings above
node micro/game/check-worlds.mjs paramecium amoeba bacterium index
node micro/game/check.mjs
node micro/tools/perf/measure.mjs paramecium 1        # and 4
```

`focus.test.mjs`: the operator holds the focus through a dive and through
continual up and down, waits 0.5 s once the depth is still, then turns to it
in 0.5-0.9 s (eased, a slight overshoot, settled), a longer turn for a longer
way, and stops the knob when the swimmer moves again mid-turn, refocusing
after the next wait.

`stir.test.mjs`: the wave shoves a diatom (it slides off and turns, a
heavier one less); a strong wave cracks an empty frustule (no longer an
obstacle) and only tumbles a live one, a plain one cracks nothing; a small
clump crumbles at one jab, a big one at a strong one, one carrying a colony
never; a filament bends where struck and springs back, its ends still; a
*Vorticella* snaps shut, its bell recoils and, struck open, it knocks loose
food (struck shut, nothing); the body shoves a diatom it swims into; shoves
die away; the strong wave reaches further; the gradient rises steadily
toward the portal (subtle at 39 mm, about half at 20 mm), the start barely
changes, 1.5 mm short of the portal the clumps and colonies are 1.4× as
many or more, square to the way nothing changes, leaf litter only near it
(in three directions).

`play.test.mjs`: auto-weave crosses a filament with no depth input (over or
under, by the side it was on) and passes a clump; a wall is glanced off; depth
stops at the glass and the slide; the swim reaches full speed in 0.2 s, the
dash doubles it and letting go stops it; a Didinium lunge catches you at its
depth and **misses when you change depth while it crouches**; it follows you
in depth as it closes; the Dileptus slashes without a defence and a block in
its wind-up drives it off (twice: beaten); the drop is one 480 µm depth and a
jab lands at any depth near the hunter's; a jab lands in front, and misses
(saying why) too far ahead, behind, above or below; three jabs drive a
Didinium or a Dileptus off, each one flinching it; B blocks a Didinium in its
crouch and in its lunge (no kill); four jabs drive the giant amoeba back and
it then engulfs nobody; the zoom's limits (start 3×, 0.8-1× in, 1.6-2× the
old widest out); the giant amoeba engulfs a cell
low in the drop, leaves one over it alone, a burst frees you and no burst
means digestion; the trap pulls, bursts and wasted pulses spend it, and a cell
at its door in a pulse is sucked in; the scenery repeats and the start is clear.
Shell-path transition runs (amoeba → paramecium, paramecium → bacterium)
with contact sheets: poses equal on both sides at every step of the move.

## Sources

- S27 Kreutz, *Paramecium bursaria* (Real Micro Life): 85–150 µm; green with
  *Chlorella* symbionts 5–6 µm.
- S29 Kreutz, *Amoeba proteus*: 160–760 µm; S05: the food cup.
- S07 Kreutz, *Paramecium caudatum*: oral groove; two contractile vacuoles
  with about seven radial canals; trichocysts under the pellicle.
- S08 Ogura & Takahashi (1976): ciliary reversal on contact (the avoiding
  reaction).
- S09 Knoll, Haacke-Bell & Plattner (1991): trichocyst exocytosis lets
  *Paramecium* escape *Dileptus*.
- S10 NIES *Vorticella* morphology; S11 Upadhyaya et al. (2008): fast stalk
  contraction, slow re-extension.
- S15 Lauga & Powers (2009): microswimmer hydrodynamics, no coasting.
- S28, S56 (atlas): *Didinium nasutum* 80–200 µm, eats *Paramecium* whole.
