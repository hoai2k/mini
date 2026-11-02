# Paramecium

A playable prototype: swim as *Paramecium bursaria*, the Level 3
protagonist of the Zoom Chain spec, through a pond drop seen through a
microscope. Eat prey, bask in the light, and head out in any direction: the
challenges are placed as you go, ahead of you in water you have not seen yet,
one after another (*Dileptus*, which your trichocysts drive off, a
*Chlamydomonas* bloom to push and gulp through, two *Didinium*, which they
cannot stop), and last the way on, a biofilm under a golden light, guarded
by a bladderwort trap. *Amoeba proteus*, a slow giant
that cups you in its pseudopods, keeps to the way back.

## Placed as you go (encounter pattern)

The owner (2026-11-01, `micro/design/encounter-pattern.md`, *Placed as you
go*): "feel free to place things in the world dynamically … keep the areas
they've explored constant … don't skip obstacles, ensure the user encounters
each thing in the game before giving them the boss and portal." The rings
round the start (one instance of each challenge moved round its ring) are
gone: the shared director (`../shared/director.js`) places each challenge
once, in order, in water nobody has seen, a little ahead of whoever is
furthest along (`route.js` holds the order and the settings; `main.js`, *the
encounters, placed as you go*, what each does):

1. **Dileptus**, after a warm-up of ~6 s of swimming;
2. **the *Chlamydomonas* bloom**, a band 0.5 mm deep and 1.8 mm wide lying
   across the way, after a calm break of ~5 s of swimming clear of the last;
3. **the two *Didinium***, side by side 0.6 mm apart across the way;
4. **the biofilm (the portal) with the bladderwort trap** on guard in front
   of it, its door toward whoever comes.

- **Planar:** the drop is 650 µm deep and the challenges millimetres apart,
  so the director runs in 2D (`mode: '2d'`): 1 mm cells over the plane, each
  covering the whole depth.
- **What counts as seen:** every split view's frustum, its far plane brought
  in to 7.5 mm from the camera (`route.js` `VIEW_FAR`: beyond it the set
  pieces are culled and the rest fades below ~5 %; `main.js`
  `directorViews`), within 7.5 mm of what it frames, and 0.8 mm round each
  cell. Water seen is never changed: nothing placed, moved or removed there.
- **Placement:** 9-12.5 mm ahead of the leader (the portal 9.5-13 mm),
  fanning out to the sides, then all round them, then farther out; every
  disc that could be seen of it (the Dileptus and its waters; five discs
  along the bloom's band; each Didinium's waters; the leaf and the trap)
  on unseen water and out of every view. Anywhere in the dish well inside
  the meniscus and away from the way back (`canPlace`). One placed but not
  yet seen may be moved again (unseen to unseen) when the leader heads
  elsewhere.
- **Met:** in a hunter's waters (its home and 450 µm round it) or within
  550 µm of it; within 300 µm of the bloom's band. One seen but passed counts
  as met once everyone is 9 mm off, or after 10 s in sight nearby.
- **Lingering** still brings them: after the warm-up (or a break) and 6 s
  more without swimming, the next one is placed 3-5.5 mm round the player,
  out of view (the chase camera sees ahead, so it usually comes from behind
  or the side), and then comes over to them: a hunter's home (and so the
  hunter) or the bloom drifts toward the leader at 350 µm/s
  (`driftEncounter`: behaviour, not a placement) until they meet it. In the
  end the portal is placed near them too.
- **The default path** (the owner, 2026-11-01: "a default path to a portal,
  but just dynamically generate the other directions"): on the first frame
  the director lays all four along one bearing from the start (`route.js`
  `DEFAULT_PATH`: square to the opening view's heading, away from the way
  back, at a rush's distances: the Dileptus ~19.7 mm out, the bloom ~38 mm,
  the Didinium ~56 mm, the biofilm ~75 mm), out of sight, so the way on
  exists from the start. It stays sealed (no prompt, its glow shut, no edge
  light, nothing preloaded; down on it: "The biofilm is not open to you yet:
  the hunters are still out in the drop") until the three before it are met;
  the trap guards it as always. Follow that bearing and you meet them in
  order where they lie; swim off another way and each, while nobody has seen
  it, leaves the path and is placed ahead of you as before (each is one
  thing, a hunter, the bloom, the pair of Didinium or the biofilm: the
  director's `single`); one somebody has seen stays put.
- **Until placed** each hunter is parked far off, hidden and not stepped
  (`world.js`, `encounters.js` `parked`), the bloom and the trap hidden (on
  the default path all are placed from the first frame). A
  hunter's hunger clock starts when it is placed (6 s grace, the second
  Didinium 5 s later); it hunts only a player in its waters.
- **Timings** (`route.test.mjs`: the director with these settings against a
  cell rushing at 1.5 mm/s, the chase view round it): in 16 directions the
  Dileptus is placed at 6.1 s and met by 11.9-17.2 s, the bloom by 23.7-27.9
  s, the Didinium by 35.6-44.4 s, and the portal is reached at 48.3-55.6 s;
  standing still at the start, each comes in turn and the portal is placed
  near them at 79 s. Scripted runs in the browser are in *Checks*.
- **Explored stays constant** is checked in `route.test.mjs`: in the
  lingering and turning-back runs and every fourth rush, what the director
  put in each grid cell never changes once a view has seen it. With the
  default path: following its bearing meets the four pre-placed ones in
  order (nothing generated, the biofilm reached in ~50 s); swimming off
  three other ways takes each off the path while unseen and places it as you
  go, in order, explored cells unchanged.
- **The way back** stays a fixed place: the amoeba's floor 17 mm from the
  start the other way from the opening view, where the amoeba keeps to its
  patch and hunts only round it, after its own 45 s calm opening.
- **Nothing runs down.** The sunlit patches are a bonus (the dash recharges 1.4×
  faster there); shade costs nothing. There is no light meter, oxygen or
  hunger of your own: stay in the calm water as long as you like (the
  challenges come to you all the same).
- **Dangers you can see:** the trap's inflow is drawn as streaks rushing into
  its door, faint over its reach while the door quivers (the pulse to come),
  strong while it pulses; the bloom's sinking plumes are its cells themselves.
- **Guarded:** while the trap is not spent, touching the biofilm turns you
  back (you are swept back off the leaf, with a toast once). Make it fire and
  miss until its resolve is gone: spent, it hangs slack for 24 s and the way
  is open. Open, it is never an automatic door (the owner, 2026-11-01): down
  on the biofilm the game shows "Y Enter the portal" (`embed.near('portal',
  true)`; standalone, `shared/embed.js` shows it) and that player's **Y** (R)
  goes through instead of switching the camera (`enterPortal` fires
  `embed.landmark('forward')`); guarded there is no prompt and Y switches
  the camera as usual.
- **Through it, the dive** (in the game): the light turns to phase contrast
  and the camera dives on the spirillum's clump (`../shared/kin-clump.js`),
  a dark mass that resolves into the bacteria the bacterium world opens
  among (`DIVE`, `clump` in `main.js`; `../../game/README.md`, "The
  continuous transition").
- A player who is eaten comes back alone a little back from where they were
  (toward the start), at the spot furthest from every hunter, the trap and
  the bloom (with others: beside a teammate).
- **No arrow by default:** there is no edge pointer to the portal
  (`shared/landmark.js` draws no forward mark); its golden glow is its only
  marker. With **Portal arrow** on in the game's Settings (default off;
  `?arrow=1` on this page) each view gets a brass arrow at its edge toward
  the biofilm, sealed or not, with the view's nearest cell's distance beside
  it ("75.0 mm"; µm under 1 mm). Test hooks: `portalArrow()`, `portals()`,
  `portalSealed()`.

The dish is about 17 cm across (`route.js` `DROP_R`; a labelled departure).
The set pieces (five Spirogyra, 70 flakes, six Vorticella colonies with 35
Vorticella, 24 diatoms, five sunlit patches) are laid out in a 7 mm scenery
tile that repeats in every direction: each view shows every piece at its copy
nearest where it looks (`world.viewAt`, before each view's culling), and
collisions meet the copy nearest the cell. The pond water (`ambient.js`)
repeats in its own 1.5 mm tile, coverslip dust included. So the field is
equally full 50 mm out as at the start.

## The crowd: a *Chlamydomonas* bloom

`bloom.js`, on `shared/crowd.js`: a band of green flagellates 1.8 mm along
the way (placed by the director, lying across the way you are heading)
(combat-ideas.md, the crowd set piece). The owner wanted crowds "you can fight through by moving and
attacking" without too much difficulty and with no time limits, so:

- **Swim** and the cells part round you (you are slowed to 0.82 of full
  speed inside, no more). **X** gulps a cone of them ahead, clearing the way
  (and feeding you); **A** wedges a lane open, flinging them aside. B is the
  avoidance reaction, a deliberate reverse out of a jam.
- **Bioconvection** (C34): more cells toward the coverslip than the slide,
  five plume columns where the cells sit lower, and a mild current: down
  ≈70 µm/s in a plume, up ≈25 µm/s between. Pushing through, your heading
  wanders a little (the real cell reverses at every bump, S08: softened).
- **No clock:** the design's oxygen meter is left out on purpose.
- Three crowds stacked through the depth (a crowd lives in x-z), each in a
  frame turned to the route; a player shoves only the tier at their depth.
  1660 cells in all; eaten ones come back after 8 s, away from every player.
- Departures: cells drawn 14 µm long (really ≈10 µm), wandering slower than
  their ≈100 µm/s; flagella not drawn; algae as food is [Unverified].

## The right defence for each hunter

combat-ideas.md idea 1 (C14, C15): B fires the trichocysts, and what that
does depends on the hunter, shown as it is:

- ***Dileptus*** (new, `world.js`: a ≈330 µm flask with a long toxicyst
  trunk, a bead-chain macronucleus): its trunk swings at you in a 1.1 s
  wind-up, then slashes. B while the trunk is at you (wind-up, strike, or
  holding you) drives it off: it recoils, is stunned and gives up. You need
  not face it; the threads fire where you are touched. Fired too early, the
  toast says so.
- ***Didinium***: trichocysts do not stop it (wild type and mutants equally
  vulnerable; its pexicysts hold on). B never blocks its strike; held, B
  spends a charge and it holds on ("Trichocysts can't stop Didinium"). The
  right play is to keep away: back off early and dash sideways as it lunges,
  and it misses. A ram (X) staggers it for a moment, no more.
- A **one-time hint** for each, the first time one closes in, and the
  warning line under the goal strip names the right move for whichever is
  at you. `window.__micro.trichoLog` records each discharge's outcome.
Published in the prototype archive at `micro/prototypes/paramecium/`.

## Movement and camera

LS supplies both analog swimming speed and camera-relative direction; RT is
optional. Forward drives into the view, left/right turns the creature toward
that side, and release stops active propulsion. The resting camera framing
does not pitch the creature into the floor. RS orbits the camera and helps aim
swimming; after release a 0.45 s hold lets the view settle before it eases
behind the creature’s heading. LB/RB still dive/rise. The camera follows the
body's centre, without following its roll (see *Look and roll* below). In microscope view LS also
propels and aims relative to the stage; RS moves the stage.

This uses the camera-relative movement idea in Cambrian’s
`src/sim/game-actor.ts` and the manual-look hold/follow behaviour in
`src/render/engine.ts`, adapted to this board’s coordinate system.

```bash
node --test micro/prototypes/shared/swim-control.test.mjs
```

## Landmarks (the Micro Zoom chain)

World 5 of the game (`micro/game/`), between the amoeba and the bacterium.
Both landmarks are things in the drop, drawn with the microscope's own
materials (`landmarks.js`). `shared/landmark.js` draws no edge arrow to
either (the owner's call; the Portal arrow setting adds one to the portal):
the portal's golden glow is its only marker.

- **Forward: the biofilm on a leaf** (the portal). A fragment of dead leaf
  lies on the slide where the director placed it (see *Placed as you go*),
  under the shared golden glow, guarded by the trap. Its
  surface is coated in a biofilm: thousands of rods and dots in microcolonies
  under a faint slime sheen, which at 20× read only as texture. That texture
  is the zoom target into the bacterium level (spec §3.6, §4.6). Swim down
  onto it (within 230 µm of its middle, below 120 µm) and, once the trap is
  spent, press Y: `embed.landmark('forward')`.
- **Backdoor: the amoeba's floor.** The other way (−860, 0, −700 µm), the
  patch of slide where the *Amoeba proteus* crawls: its slime trail through the
  sediment and the food vacuoles it has egested. The amoeba keeps to this
  patch while it is not hunting (`amoeba.home`). Swim down over it (within
  240 µm, below 170 µm) and stay half a second: a quiet prompt "Y · back to
  the amoeba" shows (in the game the shell draws it, `embed.near('back')`),
  and Y rises to the amoeba level (`embed.landmark('back')`). There Y means
  "go back" instead of switching the camera.
- Standalone, the page behaves the same and `embed.js` shows a small toast
  in place of the zoom. The stats corner gives both distances.

## The boss: a bladderwort trap

`bladderwort.js`, run by `runBoss` in `main.js` (`shared/predation.js`
`createFight`, with more resolve). A *Utricularia* bladder about half a millimetre
long hangs on its stalk just above the slide in front of the biofilm (the
portal), placed with it, its door facing the way you come: it guards the way
on (see *Placed as you go*). Shaped after the delivered sheet
(`assets/reference-sheets/boss-bladderwort.webp`): a rounded, slightly pear-
shaped translucent green sac with a mottled wall of cells, its upper front
drawn out into a collar that holds an oval door with a thick threshold; two
branched antennae fan long bristles with dark beads along them up and
forward from above the door, short trigger hairs below it; quadrifid glands
dot the inside, with a brown mass of digested catches and a round prey still
whole; the stalk joins at the back and runs to the stem.
You glance off its wall.

- **Hidden** until the portal is placed, then **dormant** until a player
  comes within 650 µm of its door (it is a choice to engage). Then a quiet brass **resolve gauge**
  shows under the goal strip while anyone is near.
- **Its tell:** after each reset the walls are drawn in (set); before a
  pulse the door quivers, the trigger hairs twitch and the walls draw in
  further (1.3 s), with a red ring at the door.
- **Its attack, three patterns:** an aimed pulse when you come within
  ≈320 µm of the door (its trigger hairs); a pulse on its own every 7–12 s
  while you are about (real traps fire spontaneously); and, below half
  resolve, a wider pull (×1.3). A pulse (0.38 s) springs the walls out,
  swings the door in and pulls everything within ≈400 µm toward the door,
  hardest close in. Drawn within ≈95 µm of the door, you are sucked in.
- **Your play:** read the door; stay out of reach or dash away from the
  edge of the inflow; **B** in the pulse fires your trichocysts and bursts
  you out of it (a block). After each pulse it **resets** for 2.4 s with the
  door shut: that is the moment to dash past. Every wasted pulse and every
  burst out costs it resolve; spent, it hangs full and slack and cannot
  fire for 24 s ("Slip past to the biofilm!").
- **Sucked in:** the follow-and-respawn catch. You are pulled through the
  door (B can still burst you free), the door shuts, and the camera pulls
  back and holds on the bladder with you inside; then the fade and a respawn
  (alone at a safe spot, away from the trap; together beside a teammate).
- **Multiplayer:** the pulse pulls every player in reach; anyone can wear it
  down.
- **Departures:** a real pulse lasts about half a millisecond and pulls from
  about a millimetre; here it is drawn over a third of a second and pulls
  from ≈400 µm so it can be read and dodged. Reference sheet MP-R18 is
  requested, not yet delivered (`shared/asset-list.js`); the trap is built
  from anatomy until then.
- Test hooks: `__micro.boss()` (awake, state, resolve, a log of wake, tell,
  pulse, catch, miss, blocked, spent), `__micro.trap`, `debug.wakeBoss()`.

## Multiplayer

Up to four players (`shared/players.js`, see `../CONTROLS.md`): player 1 on
the keyboard and the first controller; anyone else joins at any time by
pressing a button on another controller ("Player 2 joined"; in the game the
shell's roster comes in with `embed.players`).

- **Each player is their own Paramecium** with its own dash, trichocysts,
  sunlight bonus and catch. Alone, nothing is drawn round your cell; together,
  each cell has a faint broken ring and a "P2" tag in its player's colour.
  The prey count is shared.
- **One shared camera, then a split.** Player 1's controls set the view (Y
  chase/microscope, RS orbit or stage, D-pad technique and objective). The
  camera frames the group's middle and backs off as it spreads; further apart
  the screen splits LEGO-style (`shared/splitscreen.js`) and merges again when
  you meet. The chase camera splits in its image plane (`up: null`); the
  microscope's top-down view slides its stage. The optics pipeline ends on
  the screen, so each view is rendered and captured (`capture: true`), at
  75 % resolution while split, without the field stop, and each view focuses
  on its own players' depth.
- **Hunters pick a player:** each Didinium and the amoeba go for the player
  they hold, else the nearest free one; the warning line says who is hunted.
- **Caught together:** the catch plays out as alone (strike, hold, eat,
  follow), then the player rejoins beside a teammate; only the full-screen
  fade is left out. Alone you respawn at a safe spot.
- **Landmarks** fire for any player: anyone on the biofilm takes everyone
  on; anyone dwelling on the amoeba's floor can press Y.

Test hooks: `__micro.players`, `__micro.split`, `__micro.roster()`,
`__micro.landmarks` (positions, the log of fired landmarks, `near`),
`debug.teleport(x, y, z, yaw, pitch, slot)`, `forceCapture(kind, slot)`.

## Look and roll (2026-11-01)

The owner: "I feel like the original prototype looked better … a richer
environmental feel", "as I move I feel the creature spinning around a
non-centered axis", and "he looks like a collection of green spheres instead
of like a creature".

**What made the first prototype richer** (`ef1407e1`, rendered side by side
with today's from the same viewpoints):

- **Darkfield by default, with the habitat plate in full** (MP-P01: Spirogyra,
  golden detritus and a Vorticella cluster glowing on black). The readability
  rework switched to brightfield, which shows no plate, and dimmed the plate to
  30 % behind a mip blur in darkfield and phase.
- **Density.** The drop was 3 mm across with 70 flakes, 2200 sediment specks,
  eight Vorticella, four Spirogyra and 7000 bacteria. The route needs a 10 mm
  drop (eleven times the area), and its 90 flakes, 3200 specks, three
  Vorticella and three Spirogyra spread over it left most of the water empty:
  per square millimetre, about a ninth of the flakes and an eighth of the
  sediment. No performance pass thinned it; the scene was spread thin.

**What is restored:**

- Darkfield is the default again, and the plate shows at 80 % with a light
  softening (Features: *Rich*, the default; *Dimmed*, *Full* and *Off* stay).
  The saved-settings key moves to `paramecium.v4` so the new defaults apply.
- **The water's texture everywhere** (`ambient.js`): 300 suspended flocs (loose
  clusters of granules, 15–60 µm), 2600 fine specks, a clumped sediment carpet
  and 150 small flakes (8–28 µm), laid out in a 1.5 mm tile that each view's
  vertex shader repeats round the point it looks at, so the density is the
  same everywhere at the cost of one tile. The suspended matter drifts with the
  ambient flow. All of it is smaller than anything solid (flakes under 30 µm
  never blocked the cell), so it is texture to swim through.
- **Set pieces along the route:** thirteen Vorticella (the original eight on
  the start flake, five more on a second flake at 1250 µm), two more Spirogyra
  crossing the route at about 1500 and 2050 µm, and fourteen more diatoms along
  the way.
- The plates' edges are not seamless and showed as straight seams. The
  seamless tiles MP-P04 and MP-P05 are delivered and replace them; the optics
  map a plate across the screen as 16:9, so each square tile is laid twice
  side by side (2:1, about 11 % stretch) and still wraps seamlessly (checked:
  the tiles' opposite edges differ no more than neighbouring columns, and
  darkfield and phase screenshots 30 mm out show no seam; a mirrored second
  copy was tried and read as a kaleidoscope).

**Why it spun round an off-centre axis.** The swimmer put the body on a
left-handed helix (`helixPose`): its centre sat 15 µm (the 29 µm caudatum
radius, scaled) off the helix axis and went round it once per roll, 2.5 times
a second at full speed (0.25 even at rest), with the long axis tilted 12° along
the path. The cameras follow the helix axis, not the body. So on screen the
body circled a point beside it, rolling and sweeping a cone: a spin about an
axis that was not its own. (The mesh is fine: its centroid is within 1.5 µm of
the origin it rolls about.)

**The fix** (`swim.js`): by default the body is not carried round a helix.
It rolls about its own long axis, through its centre, at 0.45 turns a second at
full speed and not at all at rest, and the camera follows that centre. The real
helix is kept as a switch (Features → Motion → *Corkscrew path*, off). A
scripted straight swim at 1.4 mm/s (`spin.mjs` in the session scratchpad,
recorded here):

| | before | after |
| --- | --- | --- |
| body centre's lateral wobble (max, from the local chord) | 28.5 µm (0.24 body lengths) | 0 µm |
| centre to the point the camera follows | 15.1 µm | 0 µm |
| long axis off the heading (max) | 12.0° | 0° |
| roll | 2.53 turns/s | 0.45 turns/s |

**Cost** (`tools/perf/measure.mjs paramecium 1` and `4`, q=high, SwiftShader
on a shared machine, so times are rough; before = the commit before this work,
after = with the rings and portal too):

| | 1 player before | after | 4 players before | after |
| --- | --- | --- | --- | --- |
| triangles per frame | 596 k | 619 k | 2.86 M (3 views) | 2.71 M (4 views) |
| draws per frame | 106 | 99 | 487 | 423 |
| scene pass (SwiftShader ms) | 1313 | 1196 | | |

The pond-water tile is GPU-only (no per-frame CPU); the extra Spirogyra's
pyrenoids were made coarser (2–3 µm specks) to pay for the new filaments.

**One creature, not green beads.** The 520 *Chlorella* rode a cyclosis loop
sized like a box (loop half-widths 22 µm up and 23 µm across against a body
22 µm deep and tapering to the poles), so many sat outside the body near the
ends and their dark-green discs drew the cell's outline themselves; the body
was nearly colourless and its edge faint. Now (`cell.js`):

- the **pellicle** is a thin shell over the body mesh whose path grows toward
  the silhouette, giving the continuous, crisp outline of the reference sheet
  (MP-R `paramecium-bursaria.webp`) in every look;
- the **cytoplasm** carries a faint yellow-green cast, so the cell reads as one
  green body;
- the ***Chlorella*** (760, drawn 4–5 µm, real 3–5 µm) stream in their own
  shader that keeps every one inside the body's real outline (`radiusAt`,
  mirrored in GLSL), mostly in the outer half, so the middle (macronucleus,
  food vacuoles, contractile vacuoles with their canals) stays clearer, as in
  the reference; their pigment is weaker so they are texture inside the cell,
  not its shape;
- the **chase camera** rests a little higher (pitch −0.5 from −0.25), so the
  slipper is seen in outline from behind and above rather than end-on.

## What changed after the owner's feedback

"It moves too slow, you often get blocked and it's not clear why; remove the
circle indicators round your creature; the previous feel was good." So:

- **The pre-rework feel is back:** the chase camera is the default again
  (Y switches to the microscope), top speed is 1.4 mm/s again (it was
  1 mm/s, and only 0.62 mm/s in shade), the drop is 650 µm deep again (it
  was 300 µm), and the chase camera sits at the same distance in body
  lengths as before. LS now drives as well as turns in the chase view; in the
  microscope view it is 40 % quicker.
- **Nothing is drawn round your cell:** no outline, heading tick, dash ring
  or gulp ring. Hunters in view are left to the image (their rings are a
  Features switch, off); a faint red arrow at the edge appears only for a
  hunter closing in from out of view. Prey get a small soft ring only when
  in reach of a gulp, and a faint arrow when none is in view.
- **No invisible blocking.** A scripted 30 s swim (full thrust, the stick
  swept round every 2.5 s, a dash every 4 s; three seeds, each view) counted
  the frames where the cell was stopped or crawling below 35 % of top speed:

  | | Microscope view | Chase view |
  | --- | --- | --- |
  | Before: mean speed | 450 µm/s | 315 µm/s |
  | Before: blocked | 63–72 % of frames | 95–97 % |
  | After: mean speed | 1310 µm/s | 1420 µm/s |
  | After: blocked | 0.2–0.4 % | 0.1 % |

  Before, the causes were: the automatic avoidance reaction (0.75 s of
  backing up and pivoting) on every contact, most often with the slide and
  the coverslip, which the 300 µm drop kept the helix brushing (about 60 %
  of the blocked time in the chase view), then the edge of the drop,
  Spirogyra and detritus; and being held and eaten by Didinium, which caught
  the stalled cell. Each is now handled:
  - **Contacts glance off:** the heading turns along the surface, so the
    cell slides past a filament, flake or diatom instead of stopping. Each
    real bump shows where it happened: a puff of specks at the contact
    point, a small recoil and squash of the cell, and a rumble scaled by the
    impact. In the microscope view fine focus jumps to what you touched, so
    an out-of-focus obstacle comes sharp. The real avoidance reaction stays
    on B, and on hard head-on hits only if switched on (Features).
  - **The glass is visible and slippery:** sediment marks the slide, dust
    the underside of the coverslip, and the meniscus at the rim of the drop
    is a bright refractile wall. Meeting the glass levels you out along it;
    the first touch of each says what it is.
  - **The depth band** is gone with the deeper drop; the old position clamp
    is only a safety net behind the visible boundaries.
  - **Depth of field** in the microscope view defaults to mild (about
    35 µm sharp at 20×), so whatever you can bump into is visible.
  - **Hunters holding you** stays (the Didinium's proboscis and the
    amoeba's arms are on screen, the goal strip says HELD, and X or A break
    free); at full speed you now outswim a Didinium. The amoeba's cup, which
    drags on you, rumbles while it does.
  - **Shade** now slows only the dash recharge, never your swimming.

## Playing

- **Where you are:** the default view is the chase camera (darkfield): a
  hypothetical camera in the water behind and above your cell, following its
  centre. LS yaws and pitches; RS
  orbits. Y switches to the microscope (20×, 0.9 mm field), top-down, with
  the stage keeping your cell centred; that view turns slowly with your
  heading so you swim up the screen, never rolls, and holds still while you
  steer sideways. Nothing is drawn round your cell: its bright pellicle outline
  and green *Chlorella* make it the clearest thing in the field.
- **Bumping into things:** you glance off and slide along whatever you
  touch (filaments, flakes, the slide, the coverslip, the meniscus at the
  rim). A puff of specks marks the contact, the cell recoils a little and
  the controller rumbles.
- **The goal strip** (top centre) shows the round: eat 6 prey, ☀ when you
  are in the sun, the dash meter and trichocyst charges, and a red warning line when
  something is hunting you.
- **Prey** (a small soft green ring when in reach of a gulp, a faint arrow
  at the edge when none is in view):
  bacterial clumps that drift, and *Chilomonas*, a flagellate that jumps
  away with its ejectisomes when you get close, so it has to be chased.
- **Light:** sunlight falls on a slowly wandering patch of the drop; the
  rest is shaded (darker). In the sun your *Chlorella* feed you and the dash
  recharges 1.4× faster; shade costs nothing. A yellow arrow points to the light.
- **Hunters** (shown by the image itself; a faint red arrow at the edge only
  when one is closing in from out of view): a hungry *Didinium* turns on you
  within ≈480 µm and swims nearly straight at about 1 mm/s; a dash sideways
  makes it overshoot. If its proboscis touches you, you are held and reeled
  in: B fires trichocysts to break free, A or X struggles for time, otherwise
  you are swallowed. A hungry *Amoeba proteus* creeps toward you on the
  slide; swim low near it and two pseudopods flank you into a food cup. The
  cup fills while you stay between the arms (it also holds you back): dash
  out, or fire trichocysts. See **Threats and pacing** below.
- Eat 6 prey and the cell divides (the round counter goes up); eaten, the
  Eaten card says by what, and A starts the round again.

## Threats and pacing

Hunters use the shared `shared/predation.js` (`createHunger`,
`createCapture`), so they feel the same as in the other prototypes.

- **Placed, not timed** (see *Placed as you go*): each ciliate's hunger
  clock starts when the director places it, after a 6 s grace (the second
  Didinium 5 s later), and they hunt only in their own waters. The amoeba by the way
  back has a 45 s calm opening. A restart sends every hunter home.
- **Hunger comes and goes.** Each hunter has its own clock: hungry for
  18–32 s (the amoeba 25–40 s), then resting, 45–75 s after a meal and
  15–30 s after a miss (driven off by trichocysts, or it gave up). Only a
  hungry hunter hunts or catches; a resting Didinium wanders, a resting
  amoeba creeps. The stats corner shows each one (`calm`, `hungry`,
  `resting` with the seconds left); the red goal-strip line still warns when
  one is hunting you.
- **Fighting back** (`shared/predation.js` `createFight`, `runFights` in
  `main.js`). A hungry hunter close to you **stalks**, then **winds up** in
  a clear attack posture, then **strikes**:
  - *Didinium:* calm, it cruises with slow cilia and no tip. Hunting, its
    girdles beat hard. Winding up (0.95 s), it slows almost to a stop, swings
    its proboscis onto you, rears back, and the toxicyst battery at the tip
    swells and reddens (a pulsing red ring marks it too). Then it lunges
    (0.32 s). If the tip reaches you, you are caught.
  - *Amoeba proteus:* winding up (1.4 s), it stops creeping, lifts and
    spreads two arms wide round you; the strike (0.5 s) sweeps them shut.
    Inside them and low, you are cupped.
  - **Block:** face it and press B (trichocysts, backing off) as it strikes:
    it recoils. **Fight back:** X facing it rams and stings it. **Facing**
    it also wears it down slowly. Each costs it interest; at none it gives up
    and swims (or creeps) off for a while, then rests. A dash sideways in the
    wind-up still makes a Didinium miss. The warning line says which is
    happening ("winding up to strike: face it and B to block").
- **Being caught is always shown,** never a silent stop:
  - *Didinium.* **Strike:** the proboscis touches you and its toxicysts fire
    (a spray of short threads, the `paramecium/didinium` and `held` sounds).
    **Hold** (3.5 s, as before): you are held fast and reeled in, cilia
    beating hard; B fires trichocysts if you have any left (you break free
    and it rests), A or X struggles for a little time. **Eat:** its mouth
    gapes enormously (a lip ring opening to about twice your width) and you
    are drawn in front first, squeezed, while its body balloons round you
    (`gulp` at a low pitch). It really does swallow a Paramecium larger than
    itself whole.
  - *Amoeba proteus.* **Strike:** the two arms of the food cup sweep over you
    and their tips meet. **Hold** (2.5 s): escape is still possible with
    trichocysts. **Eat:** a food vacuole forms round you, closes and
    tightens, is drawn into the cell and its contents darken as digestion
    begins. The chase camera rises to look down into it.
  - **Follow, fade, respawn** (no card): through the eat the camera pulls
    back (chase distance ×2.6, microscope field ×1.9) to watch it swallow
    you whole, then follows it: the Didinium closes its mouth and swims off
    bulging with you inside; the amoeba creeps on with you in a darkening
    vacuole. A caption says what ate you. Then a fade, and you respawn: alone
    at a safe spot (the furthest from every hunter), together beside a
    teammate (the fade is skipped so it does not black out the others).
- **Testing:** Features → World → *Grace once you reach the hunters' waters* (6 s, 20 s or 0 s) and
  *Hunger comes and goes* (off: once the opening is over they hunt all the
  time, the old pacing). `window.__micro.pacing()` reports the round time,
  the first time any hunter was hungry and the first time one hunted you,
  and each hunter's state; `window.__micro.forceCapture('didinium' |
  'amoeba')` puts a hunter on you and starts its catch.

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A pond ambience loop and a ciliary swim loop whose volume and rate follow your speed; the dash (A), the feeding gulp and trichocyst discharge (B, and the jab when you fight back with X), the avoidance reaction (B), Didinium closing in and being held.

## Controls

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Xbox | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | Swim at analog speed and turn relative to the view; forward drives, left/right turns. Release to stop active propulsion |
| RS | Arrows | Orbit and aim swimming; after release, follow the creature heading (up looks up; Features: Invert camera Y). Microscope: move the stage |
| **A** | Space | **Dash**: a ciliary sprint toward the stick (a quick pivot, then up to 3.2 mm/s for 0.32 s), recharging in 1.8 s (slower in shade); rumble. While held: struggle |
| **X** | E | **Eat**: an oral gulp pulls up to three prey within ≈70 µm of the front of the cell into the groove; each swells into a food vacuole at the cytostome, pinches off and rides the cyclosis round the cell while the cell bulges. **At a hunter you face (within ≈260 µm): fight back**: the cell rams it, thrashing, and stings it with a short jab of trichocysts from the patch facing it (no charge spent, 0.8 s cooldown). Held: struggle |
| **B** | Shift | **Defend** (the shared defend button): with a hunter close, **fire trichocysts** at it (3 charges, one back every 9 s) while the cilia reverse and back you off, still facing it. Facing it as it strikes, this **blocks** the strike. Held: breaks you free. With no hunter near: the avoidance reaction (reverse, pivot, swim off) |
| Y | R | Chase camera (default) / microscope view. On the open biofilm (the portal, "Y Enter the portal" showing): enter it. On the amoeba's floor (the backdoor): back to the amoeba |
| LT / RT | Z / X | LT slow feeding beat (hover; draws bacteria into the groove) · RT optional forward swim. LS already drives; release movement and active propulsion stops (no gliding) |
| LB / RB | Q / F | Dive / rise |
| D-pad ←→ | 3 / 4 | Microscope technique (switches a borrowed look off) |
| D-pad ↑↓ | 1 / 2 | Objective 10× / 20× / 40× (chase camera: distance) |
| Menu | Esc | Feature panel |
| View | Tab | Hide or show the controls panel |

The stats corner shows the look on screen (a borrowed one by name and
source), the field, speed in µm/s and body lengths per second, depth, state,
prey, food vacuoles and bacteria eaten, the meters, and the nearest hunter.

## Checks

```bash
node micro/prototypes/paramecium/route.test.mjs   # the director: rushing in 16 directions, lingering, turning back
node --test micro/prototypes/shared/director.test.mjs
node micro/prototypes/check.mjs paramecium
node micro/game/check.mjs
node micro/tools/perf/measure.mjs paramecium 1   # and 4
```

Scripted runs in the browser (2026-11-01; `debug.step` at 1/30 s, full
speed with a dash every 2.2 s, hunters never hungry, the trap spent on
arrival): nothing was placed inside the chase view (projected on screen and
nearer than the fade-out), and every run met the Dileptus, the bloom and the
Didinium in order before the portal. The portal was reached at 48.3 s (0°),
48.5 s (90°), 49.1 s (180°), 48.9 s (270°) and 49.2 s turning back at 12 s
(45°); standing still, each challenge was placed near the cell and came to it
(Dileptus placed 12 s, met 22 s; bloom 33/45 s; Didinium 56/67 s) and the
portal was placed at 78 s and reached at 83 s.

The roll check (a straight swim at full speed, the centre's lateral wobble
against the local chord, the centre to the followed axis, the long axis to the
heading) is recorded under *Look and roll*; its numbers must stay at 0 with
the corkscrew off.

It must pass with no console errors. The page exposes `window.__micro`
(`scene`, `camera`, `renderer`, `cell`, `world`, `swimmer`, `encounters`,
`prey`, `amoeba`, `optics`, `features`, `game`, `dash`, `look`, and `debug`
with `setMode`, `setView`, `setOrbit`, `avoid`, `dash`, `attack`, `burst`,
`teleport`, `didinium(dx, dz)`, `amoeba(dx, dz)`, `prey(dx, dz, i)`,
`freeze`, `step`, `inspect`, `clean` (no overlay), `hungry`, `wakeBoss`,
`press('B' | 'X')`) for screenshot scripts: freeze, set a scene up,
`step(n)`, wait for a render, capture (`step` moves the cameras and the
director's views too, as a drawn frame would), `placePortal(a, d)` (the
portal `d` µm from player 1 at bearing `a`, as the director would: every
encounter before it counts as met) and `placeEncounter(id, x, z, b)`. Also
`route()` (the director's state, the portal, where each player is),
`director`, `encounterState()`, `seenAt(x, z)`, `placeNow()` (end the current
break), `challenges()` (where each is, null until placed), `bloom`,
`bloomLog()`, `trichoLog`, `hintLog`, `quality`.

## The cell

All lengths are micrometres, and the scale is honest. *P. bursaria* is 120 µm
long and 56 µm wide (S27: 85–150 µm); in the 0.9 mm field at 20× it is about
an eighth of the field. *P. caudatum* (230 µm, S07) is a Features choice
(Body → Species; the page reloads), colourless and without the sunlight bonus.

- **Body:** a signed-distance slipper meshed with the shared surface-nets
  mesher (`shared/sdf.js`): two superellipse halves joined near the middle.
  *P. bursaria* is short, plump and rounded at both ends, slightly flattened;
  *P. caudatum* has a blunt anterior and a conical posterior. The **oral
  groove** is carved by a chain of tapered capsules that twists from the
  anterior left down to the ventral midline, ending in a buccal pocket.
- **Pellicle outline:** a thin shell over the body (path ∝ thickness / cos),
  the crisp continuous edge of the micrographs.
- **Chlorella** (*P. bursaria*): 760 green algae drawn 4–5 µm across stream
  inside the cortex, always within the body's outline (their own shader); with
  the faint green of the cytoplasm, chlorophyll makes the cell green in
  brightfield and darkfield (S27).
- **Cilia:** about 2200 (*bursaria*) or 4600 (*caudatum*) on 90–100 kineties,
  10 µm long, as instanced ribbons beating in the vertex shader: a straight
  power stroke toward the posterior and obliquely to the right (which rolls
  the cell to the left) and a slower recovery with the tip lagging. The
  **metachronal wave** is a phase offset per cilium along a diagonal. Oral
  cilia line the groove; a **caudal tuft** trails from the posterior pole.
- **Trichocysts:** spindles 3.6 µm long docked just under the pellicle (the
  dense granular margin in micrographs).
- **Contractile vacuoles:** two on the dorsal side, each with eight radiating
  collecting canals; period 6 s, the two half a cycle apart.
- **Nuclei:** an ellipsoidal macronucleus and a micronucleus beside it.
- **Cyclosis:** granules, *Chlorella* and food vacuoles ride the endoplasm
  loop. Every prey gulped, and every ten bacteria eaten, form a food vacuole;
  vacuoles are egested at the cytoproct after about 1.3 loops.
- **Pellicle:** a procedural pattern of alveolar units in kinety rows
  (MP-P03 replaces it when delivered).

## Swimming

- **Low Reynolds number (S15):** speed relaxes to what the beat produces with
  a 35 ms lag. There is no coasting; the ambient drift (about 20 µm/s with
  eddies) still carries you. Top speed 1400 µm/s for both species, as
  before the readability rework (*P. caudatum* measured 1–1.5 mm/s; for the
  smaller *P. bursaria*, ≈12 body lengths/s, it is a stretch).
- **Roll:** about the body's own long axis, through its centre, 0.45 turns a
  second at full speed, none at rest. **Corkscrew** (Features, off): the real
  left-handed helix, one roll per turn, oral side toward the axis, body tilted
  along the path; radius 29 µm and pitch 850 µm as measured in *P. caudatum*,
  scaled down for *P. bursaria*.
- **Steering** comes from asymmetric beating; turn rate 1.7–3.2 rad/s
  (microscope view 2.4–4.5 rad/s).
- **Dash (A):** every cilium beats hard: a pivot of up to 80° toward the
  stick, then a sprint peaking at 3.2 mm/s that eases off over 0.32 s.
- **Contact:** the cell is pushed out of whatever it touches and its
  heading turns along the surface (head-on, it picks a side and keeps it),
  so it slides past; at the glass it levels out. A hit faster than about
  60 µm/s into the surface plays a 0.28 s recoil and squash, a puff of
  specks at the contact point and a rumble.
- **Avoidance reaction (S08):** the stroke reverses within tens of
  milliseconds, the cell backs up for 0.3 s, then pivots about its posterior
  end for 0.45 s to a new heading (away from what it hit, or toward the
  stick in the microscope view). B sets it off; a hard head-on hit with a
  filament, flake, diatom or Vorticella does too when Features → Avoidance
  reaction on hard contact is on (off by default, because it took control
  away on every bump).
- **Trichocyst discharge (S09):** about 240 threads 20–40 µm long fire from
  the patch of pellicle facing the hunter and the cell is thrown about 100 µm
  the other way; the hunter recoils.

## The scene

Full pond water again (see *Look and roll*), with your cell's outline the
clearest thing in the field.

- A wet mount 3 mm across and 650 µm deep (slide at y = 0, coverslip above).
  The boundaries are drawn: sediment on the slide, 700 dust specks on the
  underside of the coverslip, and the meniscus at the rim as a refractile
  wall (Δn 0.33, the air-water step).
- **Pond water** (`ambient.js`): flocs, specks, small flakes and sediment
  repeated round each view in a 1.5 mm tile, drifting with the flow.
- **Spirogyra:** five filaments 42 µm thick at different depths, with cross
  walls, helical serrated chloroplasts, pyrenoids and nuclei.
- **Detritus:** 35 flakes, half settled on the slide, plus 900 sediment specks.
- **Vorticella:** eight on a flake near the start and five on another at
  1250 µm along the route, each an inverted bell on a contractile
  stalk; touch one and the stalk coils in one frame, re-extending over about
  3 s (S10, S11). Their peristome currents feed on the bacteria too.
- **Diatoms:** *Pinnularia*-type pennates that glide slowly, and two
  *Fragilaria*-type ribbon colonies.
- **Bacteria:** 2400 rods and cocci in a box that travels with you, drifting,
  running and tumbling, and showing the flow you make (a neutral squirmer's
  dipole field plus the feeding current into the oral groove).
- **Prey:** 12 bacterial clumps (a ball of rods in a faint slime matrix) and
  6 *Chilomonas* (25 µm), in a box that travels with you, near your depth.
- **Didinium nasutum (S28, S56):** two barrel-shaped hunters about 130 µm
  long with two girdles of cilia, a proboscis and a horseshoe macronucleus,
  rotating as they swim. Hunting at 1050 µm/s, striking at 1250 µm/s within
  200 µm; they drift back toward you when far away so encounters keep coming.
- **Amoeba proteus (S29, S05):** about 300 µm across at rest, up to 600 µm
  with pseudopods, creeping on the slide: a flattened body deformed every
  frame by pseudopod lobes, with streaming granules and crystals, a disc
  nucleus, a contractile vacuole and green food vacuoles. When you swim
  within ≈150 µm of the slide and close by, two arms flank you into a food
  cup and close.

## Performance

- **Quality governor** (`shared/quality.js`): it steps the microscope's own
  buffers (scene pass, blurs, image formation) between 1.0 and 0.5 of the
  screen with the time between real renders (a skipped frame counts), and
  owns the pixel ratio (1.25 alone, 1.0 split). Split views render at 0.7
  (two) or 0.55 (three or four) of that. `?q=high|medium|low` fixes it.
- **Per-view culling** (`cullFor` in `main.js`): every cell, hunter, the
  amoeba, the trap and each landmark is tested against each view's own
  frustum and the depth of field's fade, and hidden for that view only.
  The bloom's crowds carry their own bounds. At the lowest effects step a
  far teammate's cell keeps its body but not its cilia.
- **Each split view renders only its region**: the optics take a `rect`
  and scissor every pass to it, padded by the blur's reach.
- **A lighter scene pass**: a fragment whose depth-of-field fade leaves it
  under 0.4 % (far past the focus, or at the chase camera) is discarded
  instead of blending four float attachments (`emit()` in
  `paramecium-microscope.js`; the buffer layout is unchanged, so borrowers
  are unaffected).
- The far-off amoeba re-meshes every 8th step; the overlay's font is set
  once per resize.

### Performance (second pass)

Measured with `tools/perf/measure.mjs` at `q=high`, players placed in the
*Chlamydomonas* bloom (route 3700–4300 µm), before and after back to back on
a shared machine (compare draws, triangles and uploads; SwiftShader times only
roughly).

- **The bloom is culled cell by cell** (`bloom.cullView`): each view draws a
  copy of each tier holding only the cells inside the part of the screen its
  scene pass writes; the kept cells stay in order, so the additive buffers sum
  the same values in the same order. A view keeps 15–60 % of the 1660 cells.
- **Split views cull to their region**: the optics' new `onScene(box)` hook
  hands over the scene pass's padded scissor box, and `cullRegion` hides
  cells, hunters and set pieces outside it (`sceneFrustum` in
  `paramecium-microscope.js` builds the frustum; borrowers are unaffected).
- `plume()` skips the square root for cells outside every plume.
- Checked pixel-identical (frozen frame, A/B with `__micro.debug.fineCull`):
  1 player chase and microscope views, 4 players split.

| in the bloom | 1 player before | after | 4 players (3 views) before | after |
| --- | --- | --- | --- | --- |
| triangles per frame | 667 k | 529 k | 2.56 M | 2.09 M |
| draws per frame | 88 | 85 | 335 | 320 |
| buffer upload per frame | 152 KB | 80 KB | 169 KB | 167 KB |

The bloom's own triangles fall by 60–85 % per view (166 k drawn in every
view before); the rest of the 4-player figure moves with where the hunters
and prey happen to be.

The bloom's CPU cost is small (the crowd step ≈ 1 ms a frame for 1660 cells,
run once whatever the player count); its remaining cost is the fill of the
visible cells. Not done (they change what is seen): thinning far cells inside
the bloom, and freezing cells far from every player (needs `shared/crowd.js`).
Found: until a player comes within 1400 µm the cells have never been given
their heights, so from afar the bloom lies flat on the slide.

## Rendering: forming a microscope image

Nothing in the scene is lit. Every object writes what a transmitted-light
microscope responds to into four half-float render targets (multiple render
targets, additive blending, no depth test, both faces): **optical path
difference** (Δn × thickness, µm), **scatter** (sharp index steps: rims,
granules, crystals) and **absorption** (optical density per colour), each in a
sharp layer and a defocused layer. Transmitted light really does sum along
the optical axis, so this order-free projection is the right model.

- Closed bodies use the **front/back-face chord trick**: a front face adds
  −depth, a back face +depth (both relative to the object's own centre or
  axis, for precision), so each pixel receives the chord through the body.
- Thin parts (cilia, threads, stalks, bacteria, granules) add a fixed path.
  Anything thinner than a pixel is drawn one pixel wide with its path scaled
  down, so distant cilia aggregate into the faint fringe a microscope shows.
- **Depth of field:** each fragment is split between the sharp and defocused
  layers by its object's distance from the focal plane; the defocused layer
  is blurred at quarter resolution. A wider blur of the whole path field
  feeds the halo and high-pass terms.

The image modes then follow image formation:

| Mode | How it is formed |
| --- | --- |
| Darkfield | The zero order removed: squared gradient and squared high-pass of the path field plus scatter, faintly tinted by pigment; near-black background (MP-P01 plate or procedural specks) |
| Phase contrast | Positive phase contrast: dark where the path is long. The finite phase ring leaks the low-pass back (φ − 0.82·blur φ), which gives the bright halo and the shade-off of large objects |
| Brightfield | Warm lamp, weak absorption (exp(−A)), edge darkening and a defocus term from the transport-of-intensity effect (I ≈ 1 − k∇²φ): pale and faint, like living cells |
| DIC | The derivative of the path along a 45° shear on a grey bias: the relief look |
| Immersive | Hypothetical: water gradient with light shafts, the path map as a thickness map and its gradient as normals, lit from above |

A post pass adds lateral chromatic softness, the objective's point spread,
sensor noise, and the round eyepiece field stop in the microscope view.

Legibility, so your cell is the clearest thing on screen:

- **Darkfield is the default** again (it was the first prototype's, and the
  owner preferred it): the habitat plate and the glittering water behind, your
  cell's bright pellicle outline and green interior in front. Brightfield
  (D-pad) keeps the green cell on the pale field, colourless hunters grey.
  Phase contrast was tried as the default too; its grey field and halos made
  the green cell no clearer and the plate busier.
- Brightfield here uses the microscope's `bfSoft` option, a soft limit on
  its defocus and edge terms, so thick bodies (Didinium, the amoeba) shade
  grey instead of clipping to black.
- **The habitat plate** (darkfield and phase) is shown at 80 %, lightly
  softened, by default (Features: dimmed, full or off), and turns with the
  view.
- **Mild depth of field** in the microscope view (about 35 µm sharp at 20×;
  Strong: 16 µm), and a contact pulls fine focus to what you touched.
- **Overlays** (drawn over the image, each switchable), kept few: nothing
  round your cell; a soft ring on prey in reach and an arrow to the nearest
  prey when none is in view; a faint arrow for a hunter closing in from out
  of view (rings round hunters are a switch, off); the shade outside the
  sunlit patch (a multiplied layer).

Performance: the pixel ratio is capped at 1.5, and a GPU fence per frame
skips the render when the GPU is behind and steps the internal resolution
down until frames keep up (software renderers start at the 0.4 floor).

## Features

The Menu button (Esc) opens the shared feature panel
(`shared/features.js`): every notable technique, with live switches where it
could be mixed and matched. State persists per browser, and `?f=` overrides
it (for example `?f=-dof,look:DIC (Nomarski)`).

| Group | Feature | Switch |
| --- | --- | --- |
| Optics | Microscope technique (synced with D-pad ←→; default brightfield) | choice |
| Optics | Camera: chase (default) or microscope (synced with Y) | choice |
| Optics | Microscope view turns with your heading (off: north up) | on/off |
| Optics | Objective 10× / 20× / 40× (synced with D-pad ↑↓) | choice |
| Optics | Depth of field (microscope): mild (default), strong, off | choice |
| Optics | Phase halo and shade-off | on/off |
| Optics | Brightfield defocus contrast | on/off |
| Optics | Background habitat plate: rich (default), dimmed and blurred, full, off | choice |
| Optics | Hunter arrow (on); hunter rings (off); prey cues (on); light and shade (on) | on/off each |
| Optics | Lateral chromatic softness, objective point spread, camera noise | on/off each |
| Optics | Eyepiece field stop | on/off |
| Rendering | Optical-path buffers; front/back-face chord trick; sub-pixel widening | always |
| Rendering | Frame skip while the GPU is behind; Quality governor (auto) + Manual quality (`shared/quality.js`); Per-view culling | on/off, choice |
| Body | Species: *P. bursaria* (default) or *P. caudatum* (reloads) | choice |
| Body | SDF body with carved oral groove | always |
| Body | Chlorella symbionts (*P. bursaria*) | on/off |
| Body | Cilia; metachronal waves; pellicle pattern; docked trichocysts; cyclosis; contractile vacuole cycle; nuclei | on/off each |
| Motion | Low Reynolds number (off: a 1.4 s glide, for comparison) | on/off |
| Motion | Roll about the long axis (on); corkscrew path, the real helix (off); camera follows the helix axis (with the corkscrew) | on/off each |
| Motion | Ciliary beat rate: slowed (readable) or real | choice |
| Motion | Dash; avoidance reaction (B); glance off obstacles; trichocyst defence | always |
| Motion | Avoidance reaction on hard contact | on/off, default off |
| Controls | Invert camera Y (shared by every prototype) | on/off |
| Simulation | Flow round the swimming cell; feeding currents; ambient drift; bacterial run-and-tumble | on/off each |
| World | Didinium hunters; Didinium homing; Amoeba proteus; Vorticella stalk contraction | on/off each |
| World | Grace once you reach the hunters' waters: 6 s (default), 20 s, 0 s; Chlamydomonas bloom | choice, on/off |
| World | Hunger comes and goes (off: they hunt all the time once the opening ends) | on/off |
| World | Spirogyra, detritus, diatoms, prey | always |
| Borrowed | SEM (mite), tardigrade DIC, amoeba optics, each with its mode | on/off, default off |

Saved state uses the key `paramecium.v4`, so settings saved before darkfield
and the rich plate were the defaults again no longer apply.

### Technique modules (for other prototypes)

Each is self-contained and documents its interface in its header.

- `shared/techniques/paramecium-microscope.js`: the whole image-formation
  pipeline (optic materials, MRT buffers, defocus layers, darkfield, phase,
  brightfield, DIC and lit modes, post pass, stand-in plates, switches).
  Options added for this version, all off or unchanged by default so
  borrowers see no difference: `plateMix`, `plateBlur`, `plateRot` and
  `bfSoft` on `render()`, `loop` on `pointsMaterial`, `uLen` on
  `volumeMaterial`.
- `shared/techniques/paramecium-cilia.js`: instanced ribbon strands beating
  in the vertex shader (cilia with metachronal waves and reversal, caudal
  tufts, docked and extruded trichocysts, coiling stalks).
- `shared/techniques/paramecium-squirmer.js`: low-Re helpers: speed that
  follows the beat, a neutral squirmer's flow field, feeding sinks and a
  helical swimming pose.

`optics.js` and `strands.js` in this folder re-export the first two.

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
| `semMite` (+ `semMiteMode`) | mite | The real geometry (body with oral groove, nuclei, Didinium, Vorticella, Spirogyra, diatoms) drawn into the SEM G-buffer; cilia, trichocysts, bacteria and granules are shaped in their vertex shaders and are left out. Works in both cameras |
| `dicTardigrade` (+ `dicTardigradeMode`) | tardigrade | The optical buffers (sharp and blurred defocused layers) through the tardigrade's three-wavelength DIC or its brightfield |
| `opticsAmoeba` (+ `opticsAmoebaMode`) | amoeba | The same buffers through the amoeba's brightfield, phase, darkfield or immersive optics |

Not borrowed:

- Amoeba soft body: a 2D crawling outline; the Paramecium is a rigid 3D swimmer.
- Mite gait and IK: no legs.
- Tardigrade leg coordination: no legs.

## Art

Procedural stand-ins are used until the images in
`micro/image-requests.md` are delivered; `shared/assets.js` switches
automatically: MP-P01 (darkfield plate), MP-P02 (phase plate), MP-P03
(pellicle, sampled as the kinety pattern). MP-P04 and MP-P05 (delivered):
seamless darkfield and phase tiles that replace the plates.

## Departures, labelled

- **Thin things drawn thicker:** cilia 0.8 µm wide (really about 0.25 µm),
  trichocyst threads 1.2 µm (really 0.1–0.2 µm), bacteria about 1.3 µm wide;
  all at least one pixel, with their optical path scaled down to compensate.
  Pellicle units are drawn about 1.5 times their size.
- **Cilia count and beat:** about 2200 (*bursaria*) or 4600 (*caudatum*) cilia, single rather than paired. The
  beat is shown at roughly a quarter of the real 15–35 Hz so the strokes and
  waves can be followed (the panel has the real rate).
- **Depth of field** is deeper than real: 16 µm sharp and fully blurred at
  75 µm at 20×, against about 6 µm in a real 20× objective. With the real
  value the cell itself would be mostly out of focus.
- **Drop depth** 650 µm (deep for a wet mount; a hollow-ground slide) so
  there is room to swim in three dimensions; the amoeba reaches a cell that
  swims within about 150 µm of the slide.
- **Glancing off:** a real Paramecium usually answers a collision with the
  avoidance reaction; here it slides along instead unless the switch is on.
- **Roll:** about 0.45 turns a second at full speed, against roughly one per
  helix turn (1–2.5 a second) in life, and the body is not carried round the
  helix unless the corkscrew is switched on: the real motion read as spinning.
- **Pond water texture** repeats every 1.5 mm (`ambient.js`) and the set
  pieces every 7 mm (`world.js` TILE); the flocs and small flakes are not solid.
- **The dish** is about 17 cm across so the rings fit a minute of rushing; a
  wet mount is a few mm. Everything in it keeps its true size.
- **Cyclosis** runs about five times faster than life; the contractile
  vacuole period (6 s) is within the real range.
- **Trichocyst recharge** (3 charges, one every 9 s) is invented: re-docking
  new trichocysts takes hours. The ≈100 µm throw is a game value.
- **Dash:** escape swimming in Paramecium reaches several mm/s for a moment;
  the 3.2 mm/s peak, the 80° pivot and the 1.8 s recharge are game values.
  The *P. bursaria* top speed (1.4 mm/s) is a stretch at the top of the
  measured Paramecium speeds.
- **Sunlight bonus:** *P. bursaria* does gather on the lit side and gets sugars
  from its *Chlorella* (S27), but the 1.4× faster dash recharge in the sun is
  invented (a bonus only: nothing runs down in shade). The sunlit patch is drawn over the image, not rendered
  by the optics.
- **Didinium and Dileptus homing** within ≈480 µm is invented; Didinium
  finds prey by collision. Its 1–1.25 mm/s is a game value (Dileptus at 0.62
  of it). Each keeping to its own waters is a placement rule, not biology.
  Struggling with A to buy time is invented. Dileptus's wind-up and slash
  timings are game values.
- **Hunger and the catch timing** (the calm opening, hungry and resting
  spells, a 0.45 s strike, the hold and a 1.8 s swallow) are game values.
  Didinium's swallow takes minutes in life; the gape is drawn as a lip ring
  and a stretched oral cone, a simplification of the cytostome widening.
- **Amoeba proteus** creeps about 10× faster than life (38 µm/s against
  0.5–5 µm/s) and its pseudopods extend about 5× faster, so it is a threat
  within a minute; its food cup reaching 150 µm up into the water from the
  slide is a stretch. Its body is a deformed flattened sphere, not the
  amoeba prototype's soft body.
- **Prey:** *Chilomonas* is drawn without its flagella; its ejectisome jump
  (≈150 µm at up to 1.5 mm/s) is real in kind but its size here is a game
  value. The gulp's 70 µm reach and three-prey limit are game values.
- **Vorticella** contracts in one frame (really a few milliseconds) and
  neighbours may follow a touched cell (individual Vorticella are solitary).
- **Chase camera** is a hypothetical camera in the water; perspective
  projection of a transmitted-light image is itself a departure. The
  immersive mode is a rendering hypothesis, not microscopy.
- **Species:** *P. bursaria*, as the Zoom Chain spec recommends for Level 3;
  its shape is drawn from descriptions (S27) rather than measured outlines.
  *P. caudatum* remains as a choice. Dileptus is not in the scene yet.
- **Overlays** (prey and hunter cues, shade, the trap's inflow streaks) and the
  contact puffs are game aids, not microscopy. The golden portal glow is the
  game's shared sign for the way on, drawn over the image.
- **Rings:** one Dileptus, one bloom and one pair of Didinium are moved round
  their rings, unseen, to meet whoever heads out; the layout is a game
  structure, not a pond.
- **Scene composition:** Spirogyra, Vorticella, diatoms, Didinium and
  Amoeba proteus together in one drop is plausible pond water, not a recorded sample.

## Sources

- S27 Kreutz, *Paramecium bursaria* (Real Micro Life): 85–150 µm; green with
  *Chlorella* symbionts 5–6 µm; gathers on the side facing the light.
- S29 Kreutz, *Amoeba proteus* (Real Micro Life): 160–760 µm. S05: the food
  cup.
- S07 Kreutz, *Paramecium caudatum* (Real Micro Life): 170–300 µm (measured
  cells 200–260 µm); blunt anterior, conical posterior; oral groove widening
  anteriorly; two contractile vacuoles with about seven radial canals; ellipsoid
  macronucleus with an 8 µm micronucleus; 80–120 kineties; caudal tuft 10–20
  µm; spindle extrusomes 3–4 µm in a dense seam under the pellicle.
- S08 Ogura & Takahashi (1976): ciliary reversal on contact.
- S09 Knoll, Haacke-Bell & Plattner (1991): local trichocyst exocytosis lets
  Paramecium escape *Dileptus*.
- S10 NIES Vorticella morphology; S11 Upadhyaya et al. (2008): fast stalk
  contraction, slow re-extension.
- S15 Lauga & Powers (2009): microswimmer hydrodynamics, no coasting.
- S28, S56 (atlas): *Didinium nasutum* 80–200 µm, eats Paramecium whole with
  pexicysts and toxicysts on its proboscis.
- Swimming speed about 1–1.5 mm/s on a helix of radius ≈29 µm and pitch ≈849
  µm (Tulane Studies in Zoology; APS DFD 2012 abstract on Paramecium
  swimming); rotation to the left from the oblique stroke (Jennings).
