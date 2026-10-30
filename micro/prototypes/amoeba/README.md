# Amoeba · brightfield prototype

*Amoeba proteus* crawling on a wet-mount slide and hunting the way it really
does: it pushes out pseudopods, cups them round a ciliate or flagellate
without needing to touch it, and closes the cup into a food vacuole. The cell
keeps its volume, so every arm takes body from somewhere else. Ciliates flee
the approaching membrane, so the surge (A) matters, and the trap hyphae of a
predatory fungus wait on the slide. Built in three.js (`../shared/vendor`, no
addons); world units are µm.

Open `micro/prototypes/amoeba/` (the invite gate is off on localhost).

## Controls (Xbox controller; keyboard in brackets)

| Button | Action |
| --- | --- |
| LS (WASD) | Pseudopod 1: grows from the part of the cell facing the stick; turning the stick bends it; stick magnitude is how hard it pushes |
| RS (arrows) | Pseudopod 2, so the two sticks can wrap a cup round prey from both sides |
| RT (X) | Push harder |
| LT (Z) | Spread out / relax: the cell flattens (its footprint grows, since the volume is fixed), rounds up and its pseudopods relax |
| **A (Space)** | **Surge**: for 0.9 s every active pseudopod extends up to 2.5× faster and may run a little further ahead, the rear contracts harder and streaming surges to the tips, so the whole cell lunges; recharges over 2.4 s (the `dash` meter). With no stick held it surges along the cell's heading. Tears the membrane free of a fungal trap |
| **X (E)** | **Close the food cup** round the prey it wraps (needs ≥ 190° of membrane round it): the rims advance and endoplasm floods in to fill round the prey until they meet |
| B (Shift) | Let go while closing; otherwise egest the oldest food vacuole at the uroid (a live, barely digested prey swims away) |
| Y (R) | Labels (nucleus, contractile vacuole, uroid, hyaline caps, ectoplasm, endoplasm, prey with real sizes, trap hyphae) |
| LB / RB (Q / F) | Fine focus down / up: changes the sign and size of the defocus contrast and how blurred the layer above is |
| D-pad ← → (3 / 4) | Optics: brightfield, phase contrast, darkfield, hypothetical immersive lit view |
| D-pad ↑ ↓ (1 / 2) | 20× objective (0.9 mm field) / 10× objective (1.8 mm field) |
| Menu (Esc) | Features panel: what the prototype does, with switches |
| View (Tab) | Hide the help panel |

Centre a stick to let that pseudopod flow slowly back. Centre it and push
again to start a new one elsewhere. A dashed ring marks the prey the
membrane wraps furthest, with the angle; it turns green when X will close.
Rumble: a tick on prey contact, a kick on each surge, a heavy jolt when a
Paramecium fires its trichocysts or a trap hypha grabs the membrane, a pulse
on capture. The two sticks keep the amoeba's own scheme; A, X, B, Y and the
d-pad follow the shared one (`../CONTROLS.md`).

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A pool ambience loop; pseudopods flowing out (rate-limited), the surge (A), closing the food cup (X), a vacuole forming, the contractile vacuole emptying, and digestion finishing.

## The biology it follows

- **Size and shape.** *A. proteus* reaches roughly 600 µm or more [S04]; the
  cell here has the area of a 344 µm disc (≈ 9.3 × 10⁴ µm²) and is 400–550 µm
  long when spread. It is polypodial: at rest, several broad, blunt
  pseudopods come and go at once (the idle pseudopods), as in the reference
  photo (`research/assets/references/amoeba.jpg`).
- **Ectoplasm and endoplasm.** A clear gel rim a few µm wide, granular sol
  inside; a hyaline cap free of granules at each advancing tip; a crumpled,
  denser uroid at the rear.
- **Fountain streaming.** The endoplasm streams towards each advancing tip,
  about twice as fast as the tip advances, along the cell's axis; the gel rim
  does not stream. At the tip it turns to gel and is left behind (here: a
  slow backward drift near the cortex). The rear cortex contracts and
  squeezes endoplasm forward once a pseudopod is at full reach, so the cell
  follows its arm [S06].
- **Organelles.** One discoid nucleus (~45 µm, many small peripheral
  nucleoli) carried by the flow and tumbling slowly so it reads as a disc or
  a lens; a contractile vacuole near the rear that swells slowly and empties
  in about a second, faster while food vacuoles are giving up water;
  bipyramidal crystals, refractile granules, lipid droplets, algal remnants.
- **Phagocytosis.** Prey stimulates broad pseudopods that surround it and
  form a food cup, which closes into a food vacuole; contact is not
  required [S05, Jeon & Jeon 1976]. Here the cup is measured by how far the
  membrane winds round the prey; once A is pressed, the lining holds still
  and only the rims advance across the mouth; when they meet, the lining
  zips shut and the cup's water and prey become a food vacuole. The vacuole
  then sheds water and the prey digests (Chilomonas is digested in minutes
  in life), after which the cell grows a little.
- **Prey.** *Chilomonas* (~30 µm, two flagella, starch grains),
  *Chlamydomonas* (~12 µm, cup chloroplast, eyespot, breaststroke
  flagella), *Tetrahymena* (~50 µm) and *Colpidium* (~60 µm), and one
  *Paramecium caudatum* (~220 µm, oral groove, two contractile vacuoles with
  radiating canals, caudal tuft) [S07]. They swim on wobbling helical paths,
  and pause to graze. Ciliates and Chilomonas that touch (or nearly touch)
  the membrane show the avoidance reaction: back up, pivot, swim off [S08].
- **Trichocysts.** A Paramecium caught in a closing cup fires a local burst
  of trichocysts (long thin threads with heads, out in milliseconds) that
  shoves it clear and knocks the membrane back [S09]. It has three such
  bursts; then the nearby trichocysts are spent.
- **The slide.** Spirogyra filaments (helical chloroplast ribbons,
  pyrenoids, cross walls, a mucilage sheath), pennate diatoms gliding
  slowly along their raphe (girdle and valve views), detritus flakes. The
  cell flows round them; egested vacuoles leave residue flakes.

## Simulation

- **Soft body** (`../shared/techniques/amoeba-softbody.js`): a ring of 160
  membrane nodes, overdamped (low Reynolds number: displacement ∝ force,
  nothing coasts, motion stops when protrusion stops). Each step: cortical
  tension (normal part of the Laplacian) and tangential spacing; protrusion
  at each pseudopod's blunt, fixed-width cap (flat-topped, so pseudopods stay
  roughly cylindrical); substrate adhesion (non-protruding membrane resists
  normal motion but still slides into growing arms); posterior contraction
  once an arm is at full reach; capsule/circle obstacles; self-contact; and
  an exact area projection weighted to the rear, so what an arm gains is
  taken from the uroid. Food cups: winding of the nearest membrane run round
  the prey, rims chosen as the pair that wraps furthest for the smallest gap,
  a seal that zips the lining to the chord and resamples the ring.
- **Distance grid** (`../shared/techniques/amoeba-sdfgrid.js`): every frame
  the ring is scan-filled into a 128² grid and an exact Euclidean distance
  transform gives signed distance from the membrane. Granules use it to stay
  in the endoplasm, prey to stay out, the renderer for the thickness dome.
- **Cytoplasm** (`cytoplasm.js`): 2600 particles advected by the fountain
  flow, with crowding diffusion, saltatory jitter, exclusion from organelles,
  the ectoplasm margin and the hyaline caps. Streaming scales with the
  pseudopod speed and the surge, and while a cup closes it floods toward the
  cup mouth (filling in).
- **Pseudopod speed.** Pseudopods ramp up and advance 2× faster than the
  first tuning (`body.opts.speed`, Features: Quick 2× / Original); the area
  conservation and rear retraction are unchanged, so the reshaping feel is
  the same. Measured: a held stick gains 88 µm of tip reach in 1.5 s against
  54 µm before (1.6×, since a pseudopod is held back as it nears full reach).
- **Surge (A)** (`body.opts.boost`): eased in and out over 0.9 s, up to 2.5×
  on the player's pseudopods' ramp and speed, a little more reach before the
  body must follow, and a harder rear contraction, so the cell body follows
  the arm and the whole cell moves. Inspired by blebbing, the fastest
  protrusion of *A. proteus*; the strength is a game value.
- **Fleeing ciliates.** *Tetrahymena*, *Colpidium* and *Paramecium* that come
  within ~75 µm of the membrane turn away from it and swim off at ~2.2× for
  2.5 s. A plain pseudopod rarely catches them; a surge does. Slow
  flagellates (*Chilomonas*, *Chlamydomonas*) still just show the avoidance
  reaction on contact.
- **Fungal traps.** Three trap hyphae of a zoopagalean fungus (*Stylopage* /
  *Zoopage* type: thin, septate, with adhesive knobs) lie on the slide.
  Membrane that touches one sticks (it keeps 8% of each step's motion); a
  surge tears it free. Stuck for 8 s, a haustorium takes a bite (−7% of the
  cell's area) and lets go.

## Rendering

Every object draws additively into an **optical property buffer** (half-float:
phase, and optical density for red, green and blue) instead of colour, and
one composite applies the optics
(`../shared/techniques/amoeba-optics.js`):

- **Brightfield** (default): Beer–Lambert absorption of the property buffer
  over the slide; the weak contrast a transparent cell gets from slight
  defocus via the transport-of-intensity equation, I ≈ I0(1 − Δz∇²φ), at two
  scales (fine: granules and edges; wide: the bright halo outside a thick
  edge); edge darkening ∝ |∇φ|² where steep slopes refract light out of the
  aperture; a slightly different defocus per colour channel for faint
  chromatic fringes; the slide seen through the phase gradient.
- **Phase contrast**: positive Zernike, dark phase with the bright halo of a
  finite phase ring (φ − blur φ).
- **Darkfield**: only scattered light: |∇φ|, |∇²φ| and high-pass φ on black.
- **Immersive (hypothetical)**: φ read as height, lit like a gel in water
  over the slide (diffuse, specular, Fresnel, caustics). Not microscopy.

The **thickness dome** is √(distance from the edge) from the grid, so thin
pseudopods are thin; it drives phase and absorption. The membrane outline is
Catmull-Rom subdivided, triangulated and drawn into a 4× MSAA mask. Things
above the focal plane go into a half-resolution buffer that is Gaussian
blurred (depth of field). Granules are point sprites (refractile spheres,
diamond crystals); prey, Spirogyra, diatoms and flakes are analytic shaders
on quads.

Delivered art is used when present, with procedural stand-ins otherwise:
MP-A01 (wet mount: the slide, tiled in world space), MP-A02 (cytoplasm
granules: fine texture inside the endoplasm, carried with the cell), MP-A03
(filament backdrop: converted to optical density, mirrored-tiled in world
space, drawn in the blurred layer above; the procedural filaments and flakes
above are hidden when it is present).

## Features (Menu panel)

| Group | Feature | Default |
| --- | --- | --- |
| Optics | Optical method (brightfield, phase contrast, darkfield, immersive) | Brightfield |
| Optics | Defocus contrast (transport of intensity) | on |
| Optics | Edge refraction loss | on |
| Optics | Chromatic fringes | on |
| Optics | Depth of field | on |
| Optics | Background refraction | on |
| Rendering | Optical property buffer | always |
| Rendering | Thickness dome from a distance grid | always |
| Rendering | MSAA membrane mask | always |
| Rendering | Vignette, Sensor grain | on |
| Body | Crumpled uroid, Hyaline caps | on |
| Body | Volume conservation (area pressure) | on |
| Body | Rear retraction (uroid weighting and posterior contraction) | on |
| Body | Self-contact | on |
| Body | Idle pseudopods (polypodial) | on |
| Motion | Overdamped (low Reynolds number) | always |
| Motion | Amoeba time compression: ×10, ×3, ×1 (real time) | ×10 |
| Motion | Swimmer speed: ×0.1, ×0.3, real | ×0.1 |
| Simulation | Fountain streaming, Brownian jitter, Contractile vacuole cycle | on |
| Simulation | Granules: 2600, 1300, 600 | 2600 |
| Simulation | Food cup and food vacuoles; avoidance reaction and trichocysts | always |
| Simulation | Ciliates flee the membrane | on |
| Simulation | Filling in (X) | on |
| Motion | Pseudopod speed: Quick (2×), Original | Quick |
| Motion | Surge (A) | always |
| World | Obstacles on the slide, Out-of-focus layer | on |
| World | Fungal trap hyphae (hazard) | on |
| Controls | Rumble | on; Two sticks, two pseudopods: always |

Technique modules others can reuse (each documents its interface in its
header): `shared/techniques/amoeba-optics.js` (property buffer → microscope
optics), `amoeba-softbody.js` (volume-conserving 2D crawler with food cups),
`amoeba-sdfgrid.js` (per-frame signed distance grid of an outline).

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
| `semMite` (+ `semMiteMode`) | mite | The phase buffer read as a height map (× 40 µm), seen from a virtual beam 4 mm above the glass, shaded by the SEM composite |
| `dicTardigrade` (+ `dicTardigradeMode`) | tardigrade | The property buffers (out-of-focus layer blurred) through the tardigrade's DIC or brightfield |
| `microscopeParamecium` (+ `microscopeParameciumMode`) | paramecium | The same through the paramecium microscope (its darkfield, phase, brightfield, DIC, lit view) |
| `preyLowRe` | paramecium | `lowRe()` on prey: speed follows the beat with a 35 ms lag, and the trichocyst recoil stops in milliseconds instead of gliding ~0.2 s |
| `preyFlow` | paramecium | `squirmerFlow()`: each swimming prey's dipole flow moves the others |

Not borrowed:

- Paramecium cilia: prey are drawn into the 2D property buffer by their own shaders; the 3D ribbon strands need the paramecium's MRT buffers and a 3D scene.
- Mite gait and IK: nothing here has legs.
- Squirmer flow on the amoeba itself: the soft body takes no external flow, and an amoeba crawling on glass is not moved by it noticeably.

## Labelled departures

- **Time compression.** Amoeba processes run ×10, and pseudopods ×20 with
  the quick pseudopod speed (they advance ~60–90 µm/s on screen, about
  3–4 µm/s real; the corner shows both; the contractile vacuole cycles
  in ~40 s, minutes in life; digestion takes ~0.5–1.5 min). Swimmers are
  shown at about ×0.1 of their real speed (a Paramecium swims ~1 mm/s): a
  combined factor of ~100 between the two clocks, so an amoeba can catch
  anything. Both are switchable in the Features panel. Real amoebae mostly
  ambush slow or browsing prey.
- **2D approximation.** The cell is a 2D outline with area conservation
  standing in for volume; thickness is a dome derived from the outline, not
  simulated. Spreading (LT) trades thickness for area explicitly.
- **Stick-driven pseudopods** are a game interpretation of chemotactic
  protrusion; the idle pseudopods stand in for the cell's own probing.
- **Closing the cup on a button** is a game decision; in life the cup closes
  when the prey stimulus and contact are right. The rims advance a few µm
  per second here; the seal is instantaneous once they meet.
- **The surge** is a game action: blebs are real and fast, but an amoeba
  does not choose to make every pseudopod 2.5× faster for a second.
- **Fleeing** ranges and speeds are game values; escape swimming itself is
  real.
- **The fungal trap** compresses a slow process (adhesion, then a haustorium
  over minutes to hours) into seconds; the bite is a game rule.
- **Trichocysts** are limited to three bursts per Paramecium; real cells
  carry thousands, but discharge is local, so a grabbed region runs out.
- **Optics.** The image is computed from a model of phase and absorption,
  not ray-traced; the immersive view is a hypothesis, not microscopy.
  Swimmers drawn above the focal plane do not interact.

## Checks

```bash
node micro/prototypes/check.mjs amoeba
```

`window.__micro` exposes `{ renderer, camera, scene, scenes, view, body,
cyto, prey, world, state, features }` plus test hooks: `input` (override
the sticks), `press(name)`, `setMode(i)`, `pause()`, `renderOnce()`,
`advance(seconds)` (simulate without rendering), `spawnPrey(kind, x, y)`,
`clearPrey()`, `resetBody()`, `close()`, and `surge` (the dash) and `ctl`.

## Sources

S04 NIES Amoeba morphology; S05 Jeon & Jeon (1976), SEM of *A. proteus*
during phagocytosis; S06 De la Fuente et al. (2019), amoeboid locomotion
and streaming; S07 Kreutz, *Paramecium caudatum*; S08 Ogura & Takahashi
(1976), ciliary reversal; S09 Knoll, Haacke-Bell & Plattner (1991),
trichocyst escape; S15 Lauga & Powers (2009), low Reynolds number. Full
citations in `micro/research/build.py`. Digestion time of Chilomonas
(3–18 min): Britannica, *Protozoan: mechanisms of food ingestion*.
