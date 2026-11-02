# Paramecium

World 5 of Micro Zoom (`micro/game/`, "Hollow Pool"), between the amoeba and
the bacterium: swim as the green *Paramecium bursaria* across a microscope
slide in darkfield, quick and light, battling the pond drop's other protists
on the way to a biofilm guarded by a bladderwort trap. Published in the
prototype archive at `micro/prototypes/paramecium/`.

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

So the world is now a top-down slide (an orthographic view, as the amoeba's
and the bacterium's are) drawn after the card (`assets/cards/paramecium.webp`),
with a shallow continuous depth under the coverslip that the microscope's
focus follows. The 3D chase camera, the volumetric optics, the ray-marched
cell and the 3D set pieces are gone (see *What was removed*).

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
  close, its stalk coiling up, then re-extends slowly); pennate diatoms with
  golden chloroplast plates and *Fragilaria* ribbons; loose golden flocs; and
  fine glittering specks everywhere (hashed per 80 µm cell, the same on every
  visit), twinkling. All laid out in a 2.4 mm tile repeated in every
  direction, so the field is as full far out as at the start; the opening view
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

## Depth (2.5D)

The drop is a shallow continuous depth, the coverslip above (`z` +150 µm),
the slide below (−150 µm) (`route.js` `DEPTH`).

- **RS up swims deeper** (into the slide, away from you), **RS down
  shallower** (toward you); LB/RB do the same (Q/F, or the arrow keys). The
  depth gauge at the right edge shows where every player is between the glass
  and the slide.
- **The focus follows you** (each split view its own players). What lies
  off your depth is drawn softer (its edges widen with the distance, which
  also spreads and dims fine lines and specks, as defocus does), a little
  dimmer, and scaled about the view's centre (nearer the objective: larger,
  sliding faster as the view moves). Features → *Depth cues* turns the
  parallax and most of the blur off.
- **One connected volume**: contacts need bodies to meet in the plane and in
  depth, with a generous reach, so things interact across depth rather than
  in separate planes. Filaments and *Vorticella* stalks run through the depth
  from one end to the other, the giant amoeba fills the lower half of the
  drop, the trap most of it; hunters follow you in depth, each at its own
  pace.
- **Auto-weave** (`swim.js`): swim into a filament, a stalk, a clump or a
  diatom and the cell winds over or under it on its own, to the side its
  depth is already on (else the side with room), a little slowed; only
  something that fills the depth (the trap's wall) turns you aside, glancing
  along it. You never need RS to get past the scenery; you use it to slip
  under a lunge or over the giant amoeba.
- **RS far left/right turns the view** about its axis (only past 0.7 and
  more sideways than up/down, so depth is never disturbed). Swimming stays
  screen-relative.

## Controls

| Button | Label | What it does |
| --- | --- | --- |
| LS | Swim | Analogue speed and direction (screen-relative); the cell turns to it fast; let go and it stops (low Reynolds number) |
| RS | Depth · far sides: turn view | Up deeper, down shallower; pushed far left or right, turns the view |
| A | Dash | A ciliary sprint (1.5 mm/s for 0.28 s, recharges in 0.9 s); flings bloom cells aside |
| X | Attack / eat | Gulps prey at the oral end; in the bloom gulps a cone of algae; otherwise a trichocyst jab ahead (stuns Dileptus, staggers Didinium, makes the giant amoeba's reaching pseudopod pull back) |
| B | Burst / back off | The avoiding reaction (back up and swing round, away from the nearest threat) with a trichocyst burst all round while charged (three charges, one back every 3 s): drives Dileptus off, bursts you out of the giant amoeba's cup and the trap's pull |
| Y | Enter portal | At the open portal (down on the biofilm, the trap spent); on the amoeba's patch: back up a world |
| LB/RB | Deeper / shallower | The same as RS up/down |
| D-pad ←→ | Change the look | Darkfield, phase contrast, brightfield |
| D-pad ↑↓ | Zoom | The objective: 400, 560 (default) or 820 µm across |

Keyboard: WASD swim, arrow keys depth (far left/right turn), Space dash, E
attack/eat, Shift burst, R enter, Q/F deeper/shallower, 3/4 look, 1/2 zoom.
For `micro/game/src/worlds.js`: `[['LS', 'Swim'], ['RS', 'Depth · far sides:
turn view'], ['A', 'Dash'], ['X', 'Attack / eat'], ['B', 'Burst / back off'],
['Y', 'Enter portal'], ['LB/RB', 'Deeper / shallower'], ['D-pad ←→', 'Change
the look'], ['D-pad ↑↓', 'Zoom']]`.

## Playing

- **Quick and light** (`swim.js`): up to 620 µm/s (a 560 µm field crossed in
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
- **The default path:** all five laid along one bearing from the start
  (`BEARING`, up and to the right) on the first frame at a rush's distances
  (5.5, 13.7, 22, 30 and 39 mm), out of sight; follow it and you meet them
  where they lie; head off another way and each, while unseen, leaves the
  path and comes ahead of you (`single`). The portal stays sealed (no prompt,
  its glow shut) until the four before it are met.
- **Timings** (`route.test.mjs`, a cell rushing at 850 µm/s, the 560 µm
  view): in 16 directions the Dileptus is placed at 4.1 s and met at 5.6 s,
  the bloom at 15.4 s, the giant amoeba at 25.5 s, the Didinium at 35.4 s,
  and the portal is reached at 46.4 s; on the default path at 45.7 s; out 8 s
  and back, 48 s; standing still, everything comes and the portal is placed
  near you at 87 s.

## The hunters (`foes.js`), each with its tell and its answer

- ***Dileptus*** (a 330 µm flask with a long toxicyst trunk, a bead-chain
  macronucleus): it stalks you, then winds its trunk back (0.9 s, the tip
  reddening: the tell) and slashes across. **B** in the wind-up or the slash
  drives it off (stunned, it recoils); twice and it gives up and swims off.
  Its trunk reaches you only at its depth (±~70 µm); it follows you in depth
  slowly (120 µm/s), so a quick dive also slips the slash.
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
  the coverslip, over it, you are out of its reach. It eats the prey it
  covers too.
- **Two *Didinium*** (100 µm barrels with two girdles of cilia and a snout):
  they close in (360 µm/s) and follow you in depth quickly (210 µm/s), then
  crouch (0.55 s, the snout reddening) and lunge straight (1.35 mm/s) at the
  depth they crouched at. **B cannot stop them** (the warning says so): dodge
  sideways, or change depth while it crouches and it passes over or under
  you. **X** staggers one for a moment. After three misses it rests.
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
  the leaf, deeper than −50 µm) with the trap spent: "Y Enter the portal"
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
  the other; both worlds are top-down slides, so the move is a short push
  between two framings of the same creature (f 0.144 → 0.214, measured equal
  on both sides at every step) while darkfield fades in over brightfield.
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
(`split.zoom`, up to 1.6× the field), then splits LEGO-style
(`../shared/splitscreen.js`, its 2D form: `{ center, pxPerUnit }`; positions
are given in the turned view's frame and the offsets turned back), each split
view focused on its own players' depth. Together, each cell carries a faint
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

Delivered and used: the darkfield and phase tiles MP-P04, MP-P05 (blurred
512 px copies made at load, laid below the drop). Requested (procedural
stand-ins until delivered; `../../design/source/build_requests.py`):

- **MP-P06** a darkfield top-down *P. bursaria* body sprite (the inside of
  the cell under the procedural outline and cilia);
- **MP-P07** the hunters in darkfield, top down (a reference sheet for
  Didinium, Dileptus, *Amoeba proteus* and the trap);
- **MP-P08** a darkfield intro plate matching the card, to replace the
  brightfield 3D one (MP-G11) in the shell.

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

`../../tools/perf/measure.mjs paramecium 1` and `4` (SwiftShader, 1280×720,
a shared machine: rough): one player, 2 draws a frame, ~8.8 k primitives
(~4.4 k shape instances), SwiftShader frame ~235 ms (the 3D world's scene pass
was ~1200 ms); four players, 4 views, 13 draws, ~119 k primitives, ~970 ms
(every view redraws the shared instance buffer). CPU ~4 ms a frame (one
player). Fill is the cost: each quad covers only its shape's soft edge and
halo (to 5 %), and a speck too faint once spread by defocus is dropped in the
vertex shader.

## Departures, labelled

- The cell is drawn at its real length (120 µm) but swims about half as fast
  as a sprinting *Paramecium* (1-1.5 mm/s) at 620 µm/s, so the 560 µm view
  can follow it; the dash is faster than it.
- The drop is 300 µm deep (a real wet mount is ~20-100 µm under a coverslip
  but a pond drop far more); depth is shown by focus and a little parallax, as
  a microscope would show it, plus the gauge.
- The giant amoeba is *A. proteus* at the large end (460 µm across), and it
  rises toward you with a pseudopod; real amoebae crawl on the slide.
- The trap's pulse is drawn over 0.38 s and pulls from ~430 µm (real: half a
  millisecond, about a millimetre).
- *Chlamydomonas* drawn 10 µm (real ≈10 µm), wandering slower than their
  ≈100 µm/s; flagella not drawn.
- Glitter, granules and flocs are scattered light from particles too small
  to name; their density follows the card, not a count.

## Checks

```bash
for f in micro/prototypes/paramecium/*.js micro/prototypes/paramecium/*.mjs; do node --check "$f"; done
node --test micro/prototypes/paramecium/*.test.mjs micro/prototypes/shared/director.test.mjs
node micro/prototypes/paramecium/route.test.mjs        # the timings above
node micro/prototypes/check.mjs paramecium amoeba bacterium index
node micro/game/check.mjs
node micro/tools/perf/measure.mjs paramecium 1        # and 4
```

`play.test.mjs`: auto-weave crosses a filament with no depth input (over or
under, by the side it was on) and passes a clump; a wall is glanced off; depth
stops at the glass and the slide; the swim reaches full speed in 0.2 s, the
dash doubles it and letting go stops it; a Didinium lunge catches you at its
depth and **misses when you change depth while it crouches**; it follows you
in depth as it closes; the Dileptus slashes without a defence and a burst in
its wind-up drives it off (twice: beaten); the giant amoeba engulfs a cell
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
