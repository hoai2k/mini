# Paramecium

A playable prototype: swim as *Paramecium bursaria*, the Level 3
protagonist of the Zoom Chain spec, through a pond drop seen through a
microscope. Eat prey, keep your symbiotic algae in the light, and outswim
the hunters: *Didinium*, which harpoons you on contact, and *Amoeba
proteus*, a slow giant on the slide that cups you in its pseudopods.
Published in the prototype archive at `micro/prototypes/paramecium/`.

## Landmarks (the Micro Zoom chain)

World 5 of the game (`micro/game/`), between the amoeba and the bacterium.
Both landmarks are things in the drop, drawn with the microscope's own
materials (`landmarks.js`), and a quiet edge arrow (`shared/landmark.js`)
shows where each is when it is off screen: a brass chevron for the way on, a
hollow ring for the way back.

- **Forward: the biofilm on a leaf.** A fragment of dead leaf lies on the
  slide at the far side of the drop (560, 0, 1130 µm; about 1.3 mm from the
  start, a few seconds at full speed, longer with the hunters about). Its
  surface is coated in a biofilm: thousands of rods and dots in microcolonies
  under a faint slime sheen, which at 20× read only as texture. That texture
  is the zoom target into the bacterium level (spec §3.6, §4.6). Swim down and
  touch it (within 230 µm of its middle, below 120 µm): `embed.landmark('forward')`.
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

## Multiplayer

Up to four players (`shared/players.js`, see `../CONTROLS.md`): player 1 on
the keyboard and the first controller; anyone else joins at any time by
pressing a button on another controller ("Player 2 joined"; in the game the
shell's roster comes in with `embed.players`).

- **Each player is their own Paramecium** with its own dash, trichocysts,
  light meter and catch. Alone, nothing is drawn round your cell; together,
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
- **Caught together:** the catch plays out as alone (strike, hold, eat),
  then the player rejoins beside a teammate. Alone you get the Eaten card
  and A starts the round again.
- **Landmarks** fire for any player: anyone on the biofilm takes everyone
  on; anyone dwelling on the amoeba's floor can press Y.

Test hooks: `__micro.players`, `__micro.split`, `__micro.roster()`,
`__micro.landmarks` (positions, the log of fired landmarks, `near`),
`debug.teleport(x, y, z, yaw, pitch, slot)`, `forceCapture(kind, slot)`.

## What changed after the owner's feedback

"It moves too slow, you often get blocked and it's not clear why; remove the
circle indicators round your creature; the previous feel was good." So:

- **The pre-rework feel is back:** the chase camera is the default again
  (Y switches to the microscope), top speed is 1.4 mm/s again (it was
  1 mm/s, and only 0.62 mm/s in shade), the drop is 650 µm deep again (it
  was 300 µm), and the chase camera sits at the same distance in body
  lengths as before. Turning in the chase view is as it was; in the
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

- **Where you are:** the default view is the chase camera (brightfield): a
  hypothetical camera in the water behind your cell, following the helix
  axis, so the corkscrew wobble stays on the cell. LS yaws and pitches; RS
  orbits. Y switches to the microscope (20×, 0.9 mm field), top-down, with
  the stage keeping your cell centred; that view turns slowly with your
  heading so you swim up the screen, never rolls, and holds still while you
  steer sideways. Nothing is drawn round your cell: the green *Chlorella*
  make it the clearest thing in the field.
- **Bumping into things:** you glance off and slide along whatever you
  touch (filaments, flakes, the slide, the coverslip, the meniscus at the
  rim). A puff of specks marks the contact, the cell recoils a little and
  the controller rumbles.
- **The goal strip** (top centre) shows the round: eat 6 prey, your light
  meter, the dash meter and trichocyst charges, and a red warning line when
  something is hunting you.
- **Prey** (a small soft green ring when in reach of a gulp, a faint arrow
  at the edge when none is in view):
  bacterial clumps that drift, and *Chilomonas*, a flagellate that jumps
  away with its ejectisomes when you get close, so it has to be chased.
- **Light:** sunlight falls on a slowly wandering patch of the drop; the
  rest is shaded (darker). In shade your *Chlorella* stop feeding you: the
  light meter runs down (≈30 s), and with it the dash recharge (to 45 %);
  your swimming speed is never reduced. A yellow arrow points back to the light.
- **Hunters** (shown by the image itself; a faint red arrow at the edge only
  when one is closing in from out of view): a hungry *Didinium* turns on you
  within ≈480 µm and swims nearly straight at about 1 mm/s; a dash sideways
  makes it overshoot. If its proboscis touches you, you are held and reeled
  in: X fires trichocysts to break free, A or B struggles for time, otherwise
  you are swallowed. A hungry *Amoeba proteus* creeps toward you on the
  slide; swim low near it and two pseudopods flank you into a food cup. The
  cup fills while you stay between the arms (it also holds you back): dash
  out, or fire trichocysts. See **Threats and pacing** below.
- Eat 6 prey and the cell divides (the round counter goes up); eaten, the
  Eaten card says by what, and A starts the round again.

## Threats and pacing

Hunters use the shared `shared/predation.js` (`createHunger`,
`createCapture`), so they feel the same as in the other prototypes.

- **A calm opening.** For the first 45 s of a round no hunter is hungry: the
  Didinia wander and the amoeba creeps, and none comes for you. The second
  Didinium wakes 12 s after the first and the amoeba 6 s after. Both Didinia
  start 1.1–1.3 mm away, and after a restart they are put back about 1 mm
  away, on the far side of the drop. The opening repeats after every
  restart.
- **Hunger comes and goes.** Each hunter has its own clock: hungry for
  18–32 s (the amoeba 25–40 s), then resting, 45–75 s after a meal and
  15–30 s after a miss (driven off by trichocysts, or it gave up). Only a
  hungry hunter hunts or catches; a resting Didinium wanders, a resting
  amoeba creeps. The stats corner shows each one (`calm`, `hungry`,
  `resting` with the seconds left); the red goal-strip line still warns when
  one is hunting you.
- **Being caught is always shown,** never a silent stop:
  - *Didinium.* **Strike:** the proboscis touches you and its toxicysts fire
    (a spray of short threads, the `paramecium/didinium` and `held` sounds).
    **Hold** (3.5 s, as before): you are held fast and reeled in, cilia
    beating hard; X fires trichocysts if you have any left (you break free
    and it rests), A or B struggles for a little time. **Eat:** its mouth
    gapes enormously (a lip ring opening to about twice your width) and you
    are drawn in front first, squeezed, while its body balloons round you
    (`gulp` at a low pitch). It really does swallow a Paramecium larger than
    itself whole.
  - *Amoeba proteus.* **Strike:** the two arms of the food cup sweep over you
    and their tips meet. **Hold** (2.5 s): escape is still possible with
    trichocysts. **Eat:** a food vacuole forms round you, closes and
    tightens, is drawn into the cell and its contents darken as digestion
    begins. The chase camera rises to look down into it.
  - **Eaten card:** what ate you; A restarts the round.
- **Testing:** Features → World → *Calm opening* (45 s, 20 s or 0 s) and
  *Hunger comes and goes* (off: once the opening is over they hunt all the
  time, the old pacing). `window.__micro.pacing()` reports the round time,
  the first time any hunter was hungry and the first time one hunted you,
  and each hunter's state; `window.__micro.forceCapture('didinium' |
  'amoeba')` puts a hunter on you and starts its catch.

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A pond ambience loop and a ciliary swim loop whose volume and rate follow your speed; the dash (A), the feeding gulp and trichocyst discharge (X), the avoidance reaction (B), Didinium closing in and being held.

## Controls

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Xbox | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | Steer, relative to the view (microscope: point where to go; chase: yaw and pitch) |
| RS | Arrows | Orbit the chase camera (up looks up; Features: Invert camera Y) or move the stage (microscope) |
| **A** | Space | **Dash**: a ciliary sprint toward the stick (a quick pivot, then up to 3.2 mm/s for 0.32 s), recharging in 1.8 s (slower in shade); rumble. While held: struggle |
| **X** | E | **Eat**: an oral gulp pulls up to three prey within ≈70 µm of the front of the cell into the groove, each forming a food vacuole. Touching or held by a hunter: **fire trichocysts** at it (3 charges, one back every 9 s) |
| B | Shift | Avoidance reaction: ciliary reversal, back up, pivot about the posterior, swim off |
| Y | R | Chase camera (default) / microscope view. On the amoeba's floor (the backdoor): back to the amoeba |
| LT / RT | Z / X | LT slow feeding beat (hover; draws bacteria into the groove) · RT beat cilia: swim. Speed follows the trigger at once; release it and the cell stops (no gliding) |
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
node micro/prototypes/check.mjs paramecium
```

It must pass with no console errors. The page exposes `window.__micro`
(`scene`, `camera`, `renderer`, `cell`, `world`, `swimmer`, `encounters`,
`prey`, `amoeba`, `optics`, `features`, `game`, `dash`, `look`, and `debug`
with `setMode`, `setView`, `setOrbit`, `avoid`, `dash`, `attack`, `burst`,
`teleport`, `didinium(dx, dz)`, `amoeba(dx, dz)`, `prey(dx, dz, i)`,
`freeze`, `step`, `inspect`, `clean` (no overlay)) for screenshot scripts:
freeze, set a scene up, `step(n)`, wait for a render, capture.

## The cell

All lengths are micrometres, and the scale is honest. *P. bursaria* is 120 µm
long and 56 µm wide (S27: 85–150 µm); in the 0.9 mm field at 20× it is about
an eighth of the field. *P. caudatum* (230 µm, S07) is a Features choice
(Body → Species; the page reloads), colourless and without the light meter.

- **Body:** a signed-distance slipper meshed with the shared surface-nets
  mesher (`shared/sdf.js`): two superellipse halves joined near the middle.
  *P. bursaria* is short, plump and rounded at both ends, slightly flattened;
  *P. caudatum* has a blunt anterior and a conical posterior. The **oral
  groove** is carved by a chain of tapered capsules that twists from the
  anterior left down to the ventral midline, ending in a buccal pocket.
- **Chlorella** (*P. bursaria*): 520 green algae 5–6 µm across fill the
  cytoplasm and ride the cyclosis; chlorophyll absorbs red and blue, so the
  cell is green in brightfield and darkfield (S27).
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
- **Helix:** left-handed, one roll per turn, oral side toward the axis, body
  tilted along the path. Radius 29 µm and pitch 850 µm as measured in
  *P. caudatum*, scaled down for the smaller *P. bursaria*.
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

Kept sparse so your cell is the clearest thing in the field.

- A wet mount 3 mm across and 650 µm deep (slide at y = 0, coverslip above).
  The boundaries are drawn: sediment on the slide, 700 dust specks on the
  underside of the coverslip, and the meniscus at the rim as a refractile
  wall (Δn 0.33, the air-water step).
- **Spirogyra:** three filaments 42 µm thick at different depths, with cross
  walls, helical serrated chloroplasts, pyrenoids and nuclei.
- **Detritus:** 35 flakes, half settled on the slide, plus 900 sediment specks.
- **Vorticella:** three on a flake, each an inverted bell on a contractile
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

- **Brightfield is the default:** the green *Chlorella* make *P. bursaria*
  stand out on the pale field, while colourless hunters and the amoeba read
  as grey. Phase contrast was tried as the default too; its grey field and
  halos made the green cell no clearer and the plate busier.
- Brightfield here uses the microscope's `bfSoft` option, a soft limit on
  its defocus and edge terms, so thick bodies (Didinium, the amoeba) shade
  grey instead of clipping to black.
- **The habitat plate** (darkfield and phase) is shown at 30 % and blurred
  through its mipmaps by default (Features: full or off), and turns with the
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
| Optics | Background habitat plate: dimmed and blurred (default), full, off | choice |
| Optics | Hunter arrow (on); hunter rings (off); prey cues (on); light and shade (on) | on/off each |
| Optics | Lateral chromatic softness, objective point spread, camera noise | on/off each |
| Optics | Eyepiece field stop | on/off |
| Rendering | Optical-path buffers; front/back-face chord trick; sub-pixel widening | always |
| Rendering | Adaptive resolution and frame skip | on/off |
| Body | Species: *P. bursaria* (default) or *P. caudatum* (reloads) | choice |
| Body | SDF body with carved oral groove | always |
| Body | Chlorella symbionts (*P. bursaria*) | on/off |
| Body | Cilia; metachronal waves; pellicle pattern; docked trichocysts; cyclosis; contractile vacuole cycle; nuclei | on/off each |
| Motion | Low Reynolds number (off: a 1.4 s glide, for comparison) | on/off |
| Motion | Helical path and roll; camera follows the helix axis | on/off each |
| Motion | Ciliary beat rate: slowed (readable) or real | choice |
| Motion | Dash; avoidance reaction (B); glance off obstacles; trichocyst defence | always |
| Motion | Avoidance reaction on hard contact | on/off, default off |
| Controls | Invert camera Y (shared by every prototype) | on/off |
| Simulation | Flow round the swimming cell; feeding currents; ambient drift; bacterial run-and-tumble | on/off each |
| World | Didinium hunters; Didinium homing; Amoeba proteus; Vorticella stalk contraction | on/off each |
| World | Calm opening before the hunters get hungry: 45 s (default), 20 s, 0 s | choice |
| World | Hunger comes and goes (off: they hunt all the time once the opening ends) | on/off |
| World | Spirogyra, detritus, diatoms, prey | always |
| Borrowed | SEM (mite), tardigrade DIC, amoeba optics, each with its mode | on/off, default off |

Saved state uses the key `paramecium.v3`, so settings saved with the
readability rework (microscope view and strong depth of field by default) no
longer apply.

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
(pellicle, sampled as the kinety pattern).

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
- **Cyclosis** runs about five times faster than life; the contractile
  vacuole period (6 s) is within the real range.
- **Trichocyst recharge** (3 charges, one every 9 s) is invented: re-docking
  new trichocysts takes hours. The ≈100 µm throw is a game value.
- **Dash:** escape swimming in Paramecium reaches several mm/s for a moment;
  the 3.2 mm/s peak, the 80° pivot and the 1.8 s recharge are game values.
  The *P. bursaria* top speed (1.4 mm/s) is a stretch at the top of the
  measured Paramecium speeds.
- **Light meter:** *P. bursaria* does gather on the lit side and gets sugars
  from its *Chlorella* (S27), but the drain rate and its effect on the
  dash are invented. The sunlit patch is drawn over the image, not rendered
  by the optics.
- **Didinium homing** within ≈480 µm and its patrol back toward you are
  invented; Didinium finds prey by collision. Its 1–1.25 mm/s is a game
  value. Whether trichocysts free a Paramecium from Didinium (as they do from
  *Dileptus*, S09) is unverified. Struggling with A to buy time is invented.
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
- **Overlays** (prey and hunter cues, shade) and the contact puffs are game
  aids, not microscopy.
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
