# Springtail · macro prototype (Zoom Chain, Level 0)

The water springtail *Podura aquatica*, about 1.5 mm long, lives on the
surface film of a bog pool. It walks on the film, grazes what floats there,
and escapes by flinging itself into the air with its furcula. The pool is
seen through a macro lens at 1–5x: daylight, true colour, a focal plane a
fraction of a millimetre thick and soft bokeh everywhere else. Built in
three.js (`../shared/vendor`). World units are millimetres; the water
surface is y = 0.

Open `micro/prototypes/springtail/` (the invite gate is off on localhost).

**Goal:** eat 8 clumps of food (each takes three bites), then climb onto
moss: one of the Sphagnum islands standing in the pool. You have three lives.

**The water is the ground.** The pool is a 1.2 x 0.9 m sheet of open water
(some 17 full jumps from the middle to the edge) with 64 moss islands
standing in it, sundews on some of them, and floating debris and food on the
film. A steep Sphagnum bank rings it: jump at it and you bounce off and drop
back onto the water at its foot. The water reaches the horizon wherever you
are; there is no edge to fall off.

## Controls (Xbox controller; keyboard in brackets)

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Button | Action |
| --- | --- |
| LS (WASD) | Walk on the film, relative to the view. Slow and a bit slippery: you coast |
| RS (arrows) | Orbit the camera. Up looks up (the camera swings down toward the horizon), down looks down, in either view; Features → Invert camera Y flips it (shared by every prototype) |
| **A** (Space) | **Furcula jump.** Hold to cock it (a tap is a short hop, ~0.7 s of hold is a full jump), release to fire. Aim with LS (no stick: straight ahead). The furcula re-cocks for 0.9 s after landing. When stuck in sundew glue, mash A to tear free; on your back, tap A to flick upright |
| **X** (E) | Graze: bite the pollen, spores or algae in front of your head |
| B (Shift) | Hold: hunker. Pressed flat with the collophore: waves cannot flip you, and a still, hunkered springtail makes no ripples for the strider to feel. You cannot move |
| Y (R) | Camera: top-down, and back to the low view you had (RS also brings it down) |
| LT / RT (Z / X) | Focus pull nearer / farther (an offset from autofocus) |
| LB / RB (Q / F) | Aperture wider / narrower (f/2.8 to f/22) |
| D-pad ←→ (3 / 4) | Look: macro in low sun, macro overcast, stereo microscope |
| D-pad ↑↓ (1 / 2) | Magnification 1x, 2x, 3x, 5x (field 36, 18, 12, 7.2 mm) |
| LS click (C) | Autofocus again (clears the focus offset) |
| Menu (Esc) | Features panel |
| View (Tab) | Hide the help panel |

Rumble: a kick when the furcula fires (stronger for a full jump), a tap on
landing, a faint buzz when *Stenus* lowers its head (jump now), thumps for
nearby raindrops and being caught.

The HUD has a scale bar that is true at the focal plane, the magnification,
the f-number (and effective aperture), the depth of field, the food count,
lives, and a furcula meter (cocking, full jump, re-cocking, struggle).

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A bog ambience loop; the furcula jump (A), landings on the water film and the sticky sundew landing, grazing (X), raindrops (quieter and panned by distance), and the Stenus skim and harpoon strike.

## Threats and pacing

Predators follow the shared pacing in `shared/predation.js`:

- **A calm opening.** For the first 45 s of a game, and again after each
  lost life, nothing hunts: *Stenus* patrols, the strider rows about its own
  water, and raindrops land around you (9–19 mm off) rather than on you. Both
  predators start well away (the beetle's patrol is placed ≥30 mm off, the
  strider ~40 mm off, on open water). The strider's calm runs 15 s longer.
- **Hunger comes and goes.** After the calm each predator is hungry for
  ~18–32 s, then rests: 45–75 s after a meal, 15–30 s after a miss (a
  *Stenus* strike that finds nothing, a strider that loses your ripples).
  Only a hungry *Stenus* notices, stalks, skims and strikes; only a hungry
  strider answers ripples and grabs. A hungry predator also drifts its patrol
  toward your part of the pool, so it does find you sometimes. The status bar
  says *Calm*, *Stenus hungry* / *Strider hungry*, or *Hunted!*.
- **Every catch is shown.** When a predator gets you, control stops and the
  whole catch plays, the lens swinging side-on and widening to frame you and
  the predator together, while the status bar turns red and names the phase:
  - *Stenus*: **strike**, the labium shoots out and its sticky pads hit you;
    **hold**, it reels you in, twisting, legs and antennae flailing;
    **eat**, the mandibles work and you shrink into the mouth head first;
    **eaten**, it chews, and the Eaten card comes up.
  - The strider: **strike**, the raptorial forelegs snap shut on you;
    **hold**, it lifts you, kicking, to its rostrum; **eat**, the rostrum
    pierces and sucks you dry (you shrivel and go still); **eaten**.
  - A sundew is a trap, not a predator: stuck, its tentacles curl over you
    while you mash A. If they close first, **strike**: every tentacle folds
    over you; **hold**: wrapped in glue, struggling weaker; **eat**: the leaf
    blade cups and closes round you and you sink into it; **eaten**
    (digested).

  Then press A: a life is lost and you start again (with the calm opening),
  or a new game starts after the last life.
- Raindrops stay hazards: a direct hit swamps you (now only within ~0.95 of
  the drop's radius, with a 2 s shadow warning, and only about half the drops
  aim near you); near misses throw you out of the crater.

Features → World → **Calm opening** (45 s / 20 s / 90 s / off) and
**Predator hunger** (comes and goes / always / never) change this for
testing. `window.__micro.forceCapture('stenus' | 'strider' | 'sundew')` plays
a catch; `__micro.pacing()` reports hunger and states.

## Hazards

- **The rove beetle *Stenus comma*** (5 mm, black, huge eyes, a pale spot on
  each elytron) patrols the pool on the film. When it sees something move
  within ~17 mm in front of it, it stalks; from farther than ~4.5 mm it
  **skims** at you (55 mm/s here) on a surfactant it releases from its
  abdomen tip: the Marangoni wake is simulated, calms the ripples under it and
  shoves floating food (and you) aside. In reach, it lowers its head for
  0.45 s (the wind-up, your cue to jump), then shoots its sticky labium ~2 mm.
  It then needs 1.6 s to recover and 3.5 s before it can skim again. All of
  this only while it is hungry (see Threats and pacing).
- **Sundews** (*Drosera rotundifolia*): rosettes on seven of the islands
  near the start, their round leaves held out over the water on one side, each with ~90 red
  glandular tentacles tipped with glue. Land on a leaf and you stick; the
  tentacles curl over you. Mash A before they close.
- **A water strider** (*Gerris*, ~9 mm, legs spanning ~23 mm) stands on six
  dimples. It feels ripples: landings, grazing and struggling bring it rowing
  over, and its strokes send waves that flip an unbraced springtail. Its
  forelegs grab. Keep still and hunker and it loses you.
- **Raindrops** ~3 mm across (twice your length). A shadow grows where one
  will land (2 s); it falls, blasts a crater, throws a crown of droplets
  and rings the pool. A direct hit swamps you; near misses throw you out of
  the crater; the ring waves flip you unless you hunker.
- **Waves** in general: where the film's slope passes ~0.2 you are flipped
  onto your back unless hunkered.

## The springtail (`springtail.js`)

Built from anatomy with `shared/sdf.js` (signed-distance parts, surface-nets
mesh), never traced from a picture:

- **Head**: rounded and hypognathous (mouth cone underneath), with a glossy
  black eye patch on each side (8 ocelli on a dark field in life).
- **Antennae**: four short segments, shorter than the head is long, reddish at
  the tips.
- **Thorax**: a visible pronotum (Th1, as in Poduromorpha), then Th2 and Th3;
  **abdomen**: six rings, Abd IV the longest, Abd VI a rounded tip. A stout
  cylinder of rings with furrows between them.
- **Legs**: three pairs, short and stout (thickened ~1.4x to survive the
  mesh), coxa–femur and tibiotarsus with claws on the film.
- **Collophore** (ventral tube) on Abd I, bilobed, touching the film.
- **Retinaculum** (the catch) on Abd III.
- **Furcula** on Abd IV: manubrium, paired dentes reaching forward under the
  body to the collophore, broad lamellate mucrones. A separate mesh, so it
  swings cleanly down and back (~160°) on a jump and refolds as it re-cocks.
- **Rig**: 26 bones in the vertex shader, one per part (two per leg), blended
  across part boundaries with the `part`/`part2`/`partW` attributes. Pivots
  for a head-and-tail-up U-pose, the head's grazing nod, waving antennae, a
  tripod gait (L1 R2 L3 / R1 L2 R3) driven by distance walked, legs tucked in
  the air and flailing on the back, hunkering, and the furcula swing.
- **Cuticle shader**: slate blue-black dorsum, reddish-brown venter and limbs;
  Podura has no scales, so fine granules as a noise bump with frosty specks
  where granule tips catch the light; transverse wrinkles on each tergite;
  a blue-grey velvet sheen at grazing angles; dark furrows where two rings
  meet (from the part weights).

**Checked against photographs** of *Podura aquatica* from iNaturalist (CC BY
and CC BY-NC observations by Ben Armstrong, Alexis Tinker-Tsavalas, Michał
Górski and ariellopezpics; not copied into the repository) in two turnaround
rounds (front, side, three-quarter and rear views at 5x). Round one: the
legs and antenna tips were too orange, the rings were separate discs, the
sheen too pale. Round two: darker reddish-brown limbs, ring ellipsoids that
overlap more (shallower furrows), a weaker sheen. The photos show the same
blue-grey frosting under diffuse light that the shader gives when backlit
or overcast.

## Movement and simulation

- **Walking**: acceleration 11 mm/s² against a light drag (1.9 /s), so the top
  speed is ~5 mm/s (about 3 body lengths a second) and you coast. Slower on
  moss. The ripple slope pushes you downhill and the surfactant flow carries
  you.
- **Jump (A)**: a ballistic arc. Range 3–36 mm and apex 0.3x the range + 0.6 mm,
  from tap to full charge. Right after take-off the body tumbles backward
  (the furcula strikes behind the centre of mass); then it curls into the
  **U-pose** (head and tail up), which turns the ventral tube down, and it
  lands on its venter with an **adhesive landing**: no bounce, a deeper
  collophore dimple and a small ring of ripples. 85% of landings are upright,
  as measured (switchable). Land on a sundew leaf and you stick; on moss or
  a piece of floating debris you walk on it (debris carries you as it
  drifts).
- **Water surface** (`shared/techniques/springtail-surface.js`):
  - A 256 x 256 damped wave equation over an 84 mm window (0.33 mm cells),
    stepped 240 times a second on the CPU and uploaded as an RG half-float
    texture each frame. The window **follows the springtail**
    (`field.recenter`, whole-cell shifts once you stray ~10 mm), and a sponge
    rim soaks ripples up before the window's edge. Islands and the bank are
    the boundary. The water mesh is one wide grid (0.4 mm cells in the
    middle, coarser out to 1.1 m) re-centred under the camera every frame.
  - A **surfactant** field in the same grid: released by *Stenus* while it
    skims, it diffuses, decays (0.25 /s), damps capillary waves under it, and
    drives a surface flow down its gradient (Marangoni), which moves the
    floating food and you.
  - **Menisci**: up to 96 analytic dimples per frame (claws, ventral tube,
    hunkered body, *Stenus*'s tarsi and abdomen tip, the strider's legs,
    floating food, and a rising meniscus round each piece of debris). Each has a logarithmic profile like the K0 meniscus of a
    small load, `ln((R²+a²)/(r²+a²))`, fading to zero at six contact radii,
    with its analytic gradient for the normal.
- **Floating debris**: ~100 rafts of dead Sphagnum leaves, birch bark flakes,
  pine needles and heather twigs, drifting on the flow; you can land and stand
  on them.
- **Food**: 90 floating clumps of pine pollen (yellow), fungal spores (brown)
  and green algae (elongated cells), each a few dozen grains with its own
  little meniscus, drifting on the flow. Three bites each; an eaten clump
  reappears elsewhere 6 s later.

## Rendering (`shared/techniques/springtail-macro.js`)

The **macro photography** look is new to the set:

- **Thin-lens camera.** A 100 mm macro lens on a 36 mm sensor: m = 36 / field
  width, subject distance f(1 + 1/m) (the camera really is 12–20 cm back,
  so the near plane sits ~35 mm in front of the subject, the lens's working
  distance), field of view from the field width, effective aperture N(1 + m),
  depth of field 2Nc(1 + m)/m² with c = 0.03 mm. At 2x and f/11 that is
  ~0.5 mm; at 5x and f/8 ~0.12 mm, thinner than the springtail is tall.
- **Depth of field** as a depth-based gather. Every material writes HDR colour
  and its distance from the focal plane (alpha of a half-float target; small
  near focus, so half floats stay precise where it matters). Half-res
  prefilter → signed blur-disc size per pixel (thin-lens CoC) → 16x16 tiles of
  the largest foreground blur → a 64-tap golden-spiral **two-layer
  scatter-as-gather**: background taps are averaged with their discs clamped
  to the centre's blur (sharp edges never smear backward), foreground taps
  spread over their own discs and add coverage by area (tap area / disc area),
  so blurred foreground spills over sharp background as it does through a
  real lens, independent of the tap radius. Per-pixel spiral rotation plus a
  tent filter turn tap patterns into fine noise; taps near a disc's edge are
  weighted up for onion-ring bokeh. The water writes the refracted floor at
  its **apparent depth** (path / 1.333), mixed with the surface depth by how
  much of the pixel is reflection, so the floor blurs as a camera sees it.
- **Water film**: Fresnel mix of a reflected sky-and-bog environment and the
  refracted pool floor (Snell), tea-coloured humic water (Beer–Lambert,
  red passes, blue is lost), a sharp sun disc that makes glints, which bloom
  into bokeh. **Caustics**: the floor point is lit through the surface above
  it, offset toward the sun, with brightness 1 / (1 + depth x curvature / 4):
  ripples focus light into bands and every dimple throws a dark spot with a
  bright rim onto the floor, like a water strider's shadow. Soft round shadows
  of the springtail, beetle, strider and the rain telegraph.
- **Legible surfaces** (game cues drawn by rendering, no HUD markers):
  - **Water film**: a deep, dark tea pool (the floor fades out except in the
    shallows by the shores) under a boosted Fresnel sky sheen and a broad sun
    lobe, faint moving micro-ripples, and fine dust and pollen specks floating
    on the film that are sharp only in the focal plane, so the film shows as
    a plane receding in perspective.
  - **Shores**: a raised meniscus where the water meets an island or the
    bank, which catches the sky as a bright line, then a wet dark band.
  - **Moss heads**: a bright backlit rim on every branch and wet dark bases
    at the waterline, so each head stands out against the water; the island
    domes carry the MP-S02 moss texture.
  - **Drop shadow** (`dropShadow` in springtail-macro): a dark core and a
    soft halo straight below the springtail on whatever is there (water,
    moss, a sundew leaf, debris). Standing, it is a contact shadow; in a leap
    it shows your height and the exact spot you will come down on, and the
    camera frames low enough to keep it in view.
  - **Focus follows the jump**: while you cock a jump and while you fly, the
    focal plane moves to between you and the predicted landing spot and the
    depth of field deepens (up to 14x) until both are acceptably sharp; the
    framing leans 30% toward the landing. The landing spot comes into focus
    before you get there.
- **Lit materials** (`litMaterial`): sun (GGX), sky hemisphere, wrap and
  back-light translucency (moss, sundew leaves, glue), velvet sheen, a ring
  light for the stereo microscope look. Filmic (ACES) tone mapping, vignette,
  faint sensor grain.
- **Sphagnum**: ~1000 instanced capitula (three variants) built from
  curved tapered branch tubes: a tight terminal bud and spreading branches,
  green, ochre and red, translucent when backlit, packed on the islands and
  along the bank (the bank and the lawn beyond it use the lighter variant).
- **Looks** (D-pad ←→): macro in low sun, macro overcast (no glints, soft),
  stereo microscope (ring light, round field stop, ~4x the depth of field).

## Features panel (Menu)

| Group | Feature | Default |
| --- | --- | --- |
| Rendering | Depth of field (bokeh gather) | on |
| Rendering | Bright-rimmed bokeh discs | on |
| Rendering | Caustics and dimple shadows on the pool floor | on |
| Rendering | Water film shading | always |
| Rendering | Velvety cuticle | always |
| Rendering | Sensor grain | on |
| Rendering | Dynamic resolution | on |
| Optics | Look (D-pad) | Macro, low sun |
| Optics | Thin-lens macro camera | always |
| Optics | Autofocus on the springtail | on |
| Optics | Focus follows the jump | on |
| Rendering | Drop shadow under the springtail | on |
| Rendering | Legible water film (sheen, shore menisci, specks) | on |
| Simulation | Ripple height field | on |
| Simulation | Marangoni surfactant | on |
| Simulation | Show the surfactant (tints the film yellow) | off |
| Simulation | Meniscus depth: exaggerated ~3x / life-like | exaggerated |
| Simulation | Landing odds: real 85% upright / always upright | real |
| Simulation | Jump time: slowed ~6x / real time | slowed |
| Body | Mid-air U-pose righting | on |
| Body | Anatomy from SDF parts | always |
| World | Rove beetle, water strider | on |
| World | Calm opening: 45 s / 20 s / 90 s / off | 45 s |
| World | Predator hunger: comes and goes / always / never | comes and goes |
| World | Rain: sometimes / often / off | sometimes |
| Controls | Invert camera Y (shared by every prototype) | off |
| Controls | Camera-relative walking and aiming | always |
| Controls | Rumble | on |

Borrowed looks from the other prototypes are not wired in: their adapters
need an SEM G-buffer or an optical field, and this pipeline renders an
opaque, lit scene with depth in alpha.

## Delivered art

Every requested image is loaded with `loadTexture(id)` (guarded, since the ids
may not be in `shared/asset-list.js` yet) and has a procedural stand-in:

| Id | Use | Stand-in |
| --- | --- | --- |
| MP-S01 | Water surface texture, mixed into the pool floor seen through the water | Procedural peat floor (humus, sunken Sphagnum leaves, twigs, sand) |
| MP-S02 | Sphagnum lawn texture on the capitula and the island domes | Procedural ribbing and colour variation |
| MP-S03 | Bog backdrop as an equirectangular environment (reflections, sky) | Procedural sky, clouds and a band of bog vegetation |
| MP-S04 | Sundew leaf plate: the blade's middle (glands and tentacle bases) mapped onto the leaf blades | Green centre to red rim |
| MP-S05 | Raindrop/ripple sprite: an expanding splash ring at impacts | Crown droplets and simulated rings only |
| MP-U05 | Launcher card, also shown on the title card | Title card without an image |

## Scale and departures (labelled)

- **Jump**: real semiaquatic springtails take off from water at ~0.7 m/s and
  travel up to ~48 body lengths; a full jump lasts on the order of 0.1–0.2 s
  (the body rights itself within ~20 ms). Here a full jump is 36 mm
  (24 body lengths, about half) lasting 0.85 s (~6x slowed) so it stays on
  screen and you can see the tumble and the U-pose. "Real time" in Features
  plays it at the real duration. The righting takes ~0.15 s on screen.
- **Ripples** travel ~43 mm/s, ~5x slower than real millimetre capillary
  waves, so you can see them coming.
- **Stenus** skims at 55 mm/s here; *S. comma* reaches ~0.7 m/s. Its labium
  shoots out in 0.06 s here, a few milliseconds in life. The ~2 mm reach is
  a game value; the sources consulted describe the labium's "large range"
  without a figure.
- **Sundew** tentacles curl in a few seconds here; in life, minutes.
- **The strider** rows ~4x slower than a real *Gerris* (which can sprint at
  ~1 m/s).
- **The drop shadow, the shore highlight, the boosted water sheen and the
  jump focus** are legibility cues, not optics (each can be switched off).
  The pool is deeper (up to ~14 mm) than many bog pools so the dark water
  reads as a mirror.
- **Menisci** are ~3x deeper than life by default (switchable), so the
  dimples and their floor shadows read at screen size. Food grains (pollen
  60–80 µm) are thickened ~1.5x.
- **Raindrops** fall slowed, and their crown droplets fly under reduced
  gravity, for the same reason as the jumps.
- **Thin parts** (legs, antennae, tentacles) are thickened to survive the
  mesh and the screen.
- **Hunkering** as a defence is a proposal, built on the collophore's real
  adhesion to the film.

## Biology sources

- Ortega-Jiménez VM, Challita EJ, Kim B, Ko H, Gwon M, Koh J-S, Bhamla MS
  (2022). Directional takeoff, aerial righting, and adhesion landing of
  semiaquatic springtails. *PNAS*; preprint https://arxiv.org/abs/2211.04285.
  Take-off direction set by body angle and collophore adhesion; a U-shaped
  pose rights the body in under ~20 ms; 85% of landings on the ventral side,
  anchored by the collophore. Press summaries (Georgia Tech, ScienceDaily,
  Bhamla lab) for the 20 ms and 85% figures; the ~0.7 m/s and 48 body
  lengths come from a later review's summary of that study.
- *Podura aquatica*: Wikipedia and the Missouri Department of Conservation
  field guide. 1–1.5 mm (up to 2.5 mm reported), blue-black, lives on the
  surface film of still water; the flattened furcula lets it jump without
  breaking the film; a tenaculum (retinaculum) latches the furcula.
- *Stenus*: Betz O. (1996, 1998) on the labial prey-capture apparatus
  (protrusion in ~1–3 ms by haemolymph pressure, sticky paraglossae, used
  against springtails); Wikipedia's *Stenus* article for Marangoni skimming
  with pygidial-gland secretion at ~0.75 m/s.
- The Micro research atlas, `micro/research/` and
  `micro/design/zoom-chain-levels.md` (S40).

## Files

- `index.html`, `main.js`: the page, the game loop, the camera and optics,
  HUD and features.
- `springtail.js`: the springtail model, rig and cuticle shader.
- `world.js`: pool shape and bank, moss islands, Sphagnum, sundews, food,
  floating debris.
- `enemies.js`: *Stenus*, the water strider, raindrops.
- `../shared/techniques/springtail-macro.js`: macro lens, lighting, bokeh
  post chain (reusable).
- `../shared/techniques/springtail-surface.js`: ripple and surfactant field,
  analytic menisci, water film material, peat floor (reusable).

## Checks

```bash
node micro/prototypes/check.mjs springtail
```

The camera's pitch was once stuck overhead: top-down was a separate mode in
which RS pitch was ignored, so only Y brought it back (and the stick raised
the camera when pushed up). Now one wanted elevation (0.1–1.5 rad) is moved
by RS in either view through the shared `ctl.look()`, and Y jumps to
top-down and back.

## Known issues

- Software WebGL (the headless check) renders a frame in about a second; the
  64-tap gather and the water's dimple loops are the costliest passes. Dynamic
  resolution keeps a slow GPU responsive.
- The beetle and the strider are moved (out of sight) to water near you when
  you travel far from them, so the whole pool stays inhabited.
- On moss the springtail walks over the capitula tops rather than climbing
  through the branches, and can be hidden among them at low angles.
- Sun shadows are soft round blobs, not true shadow maps.
