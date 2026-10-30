# Mite · SEM prototype

A box mite (Oribatida: Phthiracaridae), about 0.6 mm long, walks through a
few square millimetres of moss cushion, imaged as a scanning electron
micrograph. Built in three.js (`../shared/vendor`), world units are µm.

A predatory mite (Mesostigmata: Parasitidae) hunts in the same moss: run
from it, close up against it, or nip it. The mite climbs over grains, flakes
and stems and pushes through moss blades and hyphae, which bend and spring
back.

Open `micro/prototypes/mite/` (the invite gate is off on localhost).

## Controls (Xbox controller; keyboard in brackets)

| Button | Action |
| --- | --- |
The shared scheme (`../CONTROLS.md`, read through `../shared/controls.js`):

| Button | Action |
| --- | --- |
| LS (WASD) | Walk, relative to the view. The mite turns toward the stick and walks forward; it climbs grains, flakes and stems and pushes through blades |
| RS (arrows) | Orbit the specimen |
| **A (Space)** | **Scramble**: 0.6 s at up to ~525 µm/s (2.5× walking), recharging over 2.2 s (the `dash` meter in the corner); with no stick, straight ahead |
| **X (E)** | **Bite** with the chelicerae: eat a fungal spore or nibble a hyphal branch tip in reach of the mouth; at the predator, a nip that makes it recoil |
| B (Shift), hold | Ptychoidy: close into a sealed capsule (the predator cannot grip it); release to reopen |
| Y (R) | Observer mode: SEM data bar and raster lines |
| LT / RT (Z / X) | Lower / higher magnification (HFW 0.26–4.2 mm) |
| LB / RB (Q / F) | Walk slowly / hurry |
| D-pad ← → (3 / 4) | Imaging mode: SE (Everhart-Thornley), BSE (low vacuum), SE false colour |
| D-pad ↑ ↓ (1 / 2) | Magnification steps (×1.5) |
| Menu (Esc) | Features panel: what the prototype does, with switches |
| View (Tab) | Hide the help panel |

Rumble: a tick on footfalls, a thump on closing, landing and opening, a kick
on each scramble, a jolt when the predator grabs a leg.

Rumble: a faint tick on each footfall group, a thump on closing, landing and
opening.

## Why a box mite

The atlas recommends *Limnozetes* for the Level 1 bog, but the box mite
(Phthiracaroidea) is the one with the most gameable *real* ability:
ptychoidy, a sealed armoured capsule [S39], and it matches the reference
photo (`micro/research/assets/references/mite.jpg`, an unidentified
phthiracarid). The prototype card also promises it.

## Anatomy (`mite.js`)

Built from parts placed by measurements against the reference, never traced:

- **Notogaster**: one laterally compressed egg (430 × 344 × 272 µm), with a
  thickened anterior collar, genitoanal plates set in a ventral slot (sutures
  carved as grooves), and 14 pairs of short notogastral setae in rows c, d, e,
  h and ps, lying back along the shield.
- **Aspis (prodorsum)**: a hood hinged inside the collar, tipped down with a
  rostrum, lateral carinae, cup-shaped bothridia with a pair of fusiform
  sensilli, and rostral, lamellar, interlamellar and exobothridial setae.
- **Chelicerae** (chelate, two digits) and two-segment **palps** under the rostrum.
- **Eight legs** from the soft podosoma under the aspis, each
  trochanter–femur–genu–tibia–tarsus with a single claw (Phthiracarus is
  monodactyl). Coxae are fused into the ventral plates, as in all oribatids.
  Leg I is the longest, lifted higher in swing and carries a long tactile
  seta on the tibia. Every segment has setae.
- Meshed with `shared/sdf.js` (surface nets): the notogaster and aspis are
  separate meshes so the aspis can hinge. Legs, claws and setae are instanced.

## Movement

- **Gait** (`shared/techniques/mite-gait.js`): an alternating tetrapod
  ({L1 R2 L3 R4} then {R1 L2 R3 L4}) with a small back-to-front metachronal
  lag, duty factor 0.64, stride 118 µm. The gait phase advances with
  distance walked plus turning × 330 µm (the front feet's lever arm), so
  stride matches speed. Swing progress follows either time or phase,
  whichever is faster, so the two groups never overlap. A measured
  240-frame walk with a turn gave 0.000 µm of stance-foot movement and clean
  alternation. A wave gait and a non-arachnid "pairs" gait can be picked in
  the Features panel to compare.
- **Feet** land half a stance ahead of where their rest point will be at
  touchdown, and are raycast onto the real surfaces (floor, grains, leaves,
  litter).
- **IK**: an analytical two-bone solve per leg (femur+genu, tibia+tarsus)
  with the knee bent up. The tibia rides a little above the line and the
  tarsus angles down to the claw.
- **Body**: five ray probes fit a plane to the ground under the body, which
  follows slopes, rides up over grains (steps up to ~140 µm) and onto the
  lowest moss leaves, which arch down to the floor as ramps. A 2.5 µm bob and
  a slight roll keep time with the leg groups.
- **Climbing**: a face too steep to step onto (a grain, a stem, a flake on
  edge) tips the body up onto it as it comes within reach (the forward ray
  sets a target up, eased in over ~0.1 s), so the probes find the face and
  the mite walks up and over it, its up following the smoothed probe normal.
  Oribatid claws hold on any of these surfaces, so there is no slipping.
  Overhangs (faces pointing down) are not climbed; the body slides along
  them. Walking off the end of something with nothing in reach, the mite lets
  go after half a second, closes and drops (box mites do drop).
- **Body clearance**: thirteen rays from the body centre to its ellipsoid
  (round the waist and up) push the body back out of any rigid surface (at
  most 30 µm per frame, so a deep overlap eases out), and five belly rays make
  it stand taller over a ledge the centre has not reached yet. On reopening it
  is cleared before it stands up. A scripted walk through a moss patch, over a
  95 µm grain and up a stem measured the deepest ellipsoid overlap with
  floor, grains, flakes and stems at 10 µm (mean 0.2 µm); the old walker on
  the same path reached 155 µm (mean up to 51 µm in the moss).
- **Bending foliage** (`../shared/techniques/mite-foliage.js`): every moss
  leaf is a bendable blade and every hypha a slack thread (see Features). The
  mites' bodies push them aside (position-based, so they never pass through),
  a mite standing on a blade bends it down and rides it, and they spring back
  in about a second when left. Feet and probes walk on the bent collider.
- **Scramble (A)**: the speed limit rises to ~525 µm/s with a fast
  acceleration (tau 0.05 s). The gait phase runs on distance walked, so the
  legs cycle faster and the stance feet stay planted (swings shorten to
  80 ms). A stretch: box mites are slow, steady walkers.
- **Bite (X)**: the rostrum dips and the chelicerae work (0.28 s). Food is
  the real diet of a phthiracarid: fungal spores (eaten, they vanish) and
  hyphal branch tips (nibbled; they regrow after 25 s).
- **Ptychoidy**: the legs pull in and shrink into the cavity and the aspis
  folds down over it in 0.16 s (Heethoff et al. 2018 measured encapsulation
  nearly complete within 150 ms of a beetle's attack). Closed, it cannot move.
  It is then a rigid ellipsoid: gravity torque about the contact point tips
  it onto its flat side, it rolls without slipping down slopes and falls off
  edges. Reopening is slower (0.9 s), and it rights itself onto whatever
  surface is under it.
- A second box mite wanders with the same walker and closes up when you come
  near.

## The predator (`predator.js`, `PRED` in `mite.js`)

A parasitid (Mesostigmata: Parasitidae, *Pergamasus* / *Parasitus* type):
a pale, flattened oval about 0.8 mm long with one dorsal shield, a
transverse seam, peritremes and rows of fine setae, a projecting gnathosoma
with long chelate chelicerae and palps, and long legs. Leg I is held up and
forward as a feeler and taps ahead; legs II–IV walk with the same walker and
gait as the box mite (createMite with the `PRED` anatomy), so it climbs and
pushes through blades the same way.

- It wanders until it touches you (~560 µm) or feels you scramble close by
  (~950 µm), then runs you down at ~360 µm/s: faster than your walk, slower
  than your scramble.
- It strikes at legs first: each grab stuns you for 0.7 s and slows you 15%;
  a grabbed leg recovers after 20 s; three grabs and you are caught (back to
  the start).
- Closed up (B), you are a smooth, hard capsule it cannot grip: it gives up
  after three tries and wanders off for a while. Feeding trials with
  *Pergamasus* found adult box mites nearly immune (Peschel et al. 2006).
- A nip (X) makes it recoil for 1.5 s. That is a game rule: box mites do not
  really fight back.

## Rendering (`shared/techniques/mite-sem.js`)

A deferred two-pass SEM model. The beam comes from the camera, so the
"lighting" is tied to the view, not the world.

1. **G-buffer**: every material writes its view-space normal, a material
   class (plus a thin-feature flag) and linear depth to one float target.
   Surface relief from the SEM textures is bump-mapped in at this stage.
2. **Composite**:
   - secondary-electron yield rising with tilt (secant law, softened where
     the detector saturates);
   - the **edge effect**: silhouettes found from depth jumps, plus glowing
     thin features (setae, sensilli, claws, hyphae);
   - an **Everhart-Thornley detector** to the upper left: faces toward it are
     brighter, and a screen-space march toward it darkens points with
     something in the way. The shadows are partial, because the collector
     bias pulls electrons round corners;
   - **dark crevices** from normal-oriented SSAO (electrons reabsorbed by the
     walls);
   - **infinite depth of field** (no blur);
   - **shot noise** that grows as the signal falls, plus per-line scan jitter.
   - **BSE** mode: composition contrast (silicate grains bright, chitin and
     cellulose dark), flatter topography, more noise.
   - **False colour**: the SE image tinted by material, like published
     coloured SEMs.
   - **Observer mode**: a data bar (HV, WD, mag, HFW, detector, vacuum, scale
     bar) and raster lines.
- **Truthful scale**: the camera has a 12° vertical field, so there is little
  perspective, as in a beam pivoting far above the sample. HFW is the real
  field width at the mite. Mag = 127 mm / HFW: the old Polaroid 4×5 reference
  width. Vendors differ, which is why HFW is shown too. The scale bar is
  measured from HFW, and WD is the camera distance (about 4–20 mm, a
  realistic range).
- A **cutaway** cylinder discards terrain between the camera and the mite.
- **Dynamic resolution** and GPU fence pacing: frames are never queued while
  the GPU is behind, and resolution drops while frames are slow.

Budget at the default view: about 27 draw calls and 330k triangles. Pixel
ratio is capped at 1.5.

## Textures (`textures.js`)

The requested images MP-M01 (moss leaf), MP-M02 (litter and grains),
MP-M03 (cuticle) and MP-M04 (backdrop) are drawn procedurally as stand-ins:
elongated rhomboid leaf cells with raised walls, crumbly humus, a punctate
cuticle, and silhouetted moss shoots. Each slot switches to the delivered
file automatically once its status in `shared/asset-list.js` is `delivered`,
and `shared/assets.js` logs loudly if that file fails to load. The G-buffer
reads luminance as height, so a delivered SEM micrograph (bright ridges, dark
pits) works through the same path.

## World (`world.js`)

The world is a 4 × 4 mm walkable square of humus floor (an analytic height
field, so feet and probes query it exactly), holding:

- about 150 angular mineral grains, 20–300 µm;
- curled litter flakes;
- ten moss shoots with lanceolate leaves on a 137.5° spiral, each leaf with a
  costa, a channelled blade, a serrate apex, real thickness (12 µm) and
  cell relief;
- 3–5 µm fungal hyphae strung between surfaces, with branches (their tips
  are food);
- fungal conidia, echinate (aster-type) pollen and bisaccate conifer pollen.

Walking queries go to low-poly colliders, prefiltered by bounding spheres.
Floor, grains, flakes and stems are rigid; every moss leaf is a `blade`
collider that bends with its leaf (the lowest leaves, which rest on the floor
as ramps, are 3× stiffer and give little).

## Features

The Menu button opens the panel (`../shared/features.js`). Switches apply
live and persist per browser.

| Group | Feature | Switch |
| --- | --- | --- |
| Rendering | Deferred SEM composite | always |
| Rendering | Imaging mode (SE / BSE / false colour) | choice (D-pad ← →) |
| Rendering | Secant-law tilt contrast | on |
| Rendering | Edge effect | on |
| Rendering | Detector shadowing (ETD) | on |
| Rendering | Dark crevices (SSAO) | on |
| Rendering | Surface relief from SEM textures | on |
| Rendering | Shot noise | on |
| Rendering | Scan-line jitter | on |
| Rendering | Observer mode | off (Y) |
| Rendering | Dynamic resolution | on |
| Optics | Infinite depth of field | always |
| Optics | Narrow scan field, true magnification | always |
| Optics | Cutaway in front of the mite | on |
| Body | Anatomy from SDF parts | always |
| Body | Setae and sensilli | on |
| Body | Thin parts thickened | always |
| Motion | Gait (tetrapod / wave / pairs) | choice |
| Motion | Two-bone leg IK (off: stiff struts) | on |
| Motion | Planted feet, distance-driven phase | always |
| Motion | Surface following and climbing | always |
| Motion | Body bob and sway | on |
| Motion | Climbing rigid surfaces (off: slide along steep faces) | on |
| Motion | Body clearance | on |
| Simulation | Ptychoidy speed (real 0.16 s / slowed 4×) | choice |
| Simulation | Closed capsule rolls and falls | on |
| Simulation | A second box mite | on |
| Simulation | Bending blades and hyphae | on |
| Simulation | Scramble (A) | always |
| Simulation | Bite and graze (X) | always |
| Simulation | Predatory mite (Parasitidae) | on |
| World | Moss shoots, mineral grains, litter, hyphae, spores and pollen | on (each; off also removes it from walking) |
| World | Procedural SEM textures | always |
| Controls | Camera-relative walking | always |
| Controls | Rumble | on |

Technique modules other prototypes can borrow:

- `../shared/techniques/mite-sem.js`: the SEM G-buffer materials and
  composite (SE, BSE, false colour; per-term switches; cutaway).
- `../shared/techniques/mite-gait.js`: the gaits (tetrapod, wave, pairs),
  distance-driven phase triggers, swing targets and two-bone IK.
- `../shared/techniques/mite-foliage.js`: bendable foliage. Each thin thing
  is one rod with a tip offset and a spring (cantilever blades `d·u²`,
  threads fixed at both ends `d·sin πu`); ellipsoid bodies push their centre
  lines out, a body standing on one loads it, and the render vertices (a
  sub-range of a merged mesh), normals and an optional collider are
  rewritten on the CPU only for rods that move.

`sem.js` here just re-exports `mite-sem.js`.

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
| `dicTardigrade` (+ `dicTardigradeMode`: DIC / brightfield) | tardigrade | The G-buffer read as a thick specimen (optical path = height above the floor, absorbance by material) shown through the tardigrade's DIC |
| `opticsAmoeba` (+ `opticsAmoebaMode`) | amoeba | The same field through the amoeba's brightfield, phase, darkfield or immersive optics |
| `microscopeParamecium` (+ `microscopeParameciumMode`) | paramecium | The same field through the paramecium's darkfield, phase, brightfield, DIC or lit view |

Not borrowed:

- Paramecium cilia: the mite has no ciliated surface, and the strands write only into the paramecium's optical buffers.
- Paramecium squirmer (low-Re swimming): the mite walks in air; nothing swims.
- Amoeba soft body and distance grid: a 2D crawling outline has nothing to drive on a rigid, jointed mite.
- Tardigrade gait offsets: the mite's own wave gait is already the back-to-front wave the tardigrade uses.

## Departures from biology and optics (deliberate)

- **A live, walking animal in an SEM is a fiction.** Conventional SEM needs a
  dried, conductively coated specimen in high vacuum [S20]. Only
  environmental or cryo SEM image hydrated samples, and not a mite strolling
  through moss [S21]. The atlas says so too.
- The BSE mode shows composition contrast, which needs an **uncoated sample
  in low vacuum**. A gold-coated sample would look uniform in BSE.
- **Thin parts are thickened**: legs about 1.3×, setae about 1.6× (3 µm
  instead of about 2 µm), sensilli about 1.5×.
- **Time**: falling uses a game gravity of 2600 µm/s², far slower than real
  (a mite crosses this world in a few milliseconds of free fall). The walking
  speed (about 210 µm/s) is a plausible order of magnitude for an oribatid
  but is not measured for this species. The scramble (~525 µm/s) is a
  stretch.
- **The predator's rules**: the touch and vibration ranges, its speed, three
  grabs to be caught, and the recoil after a nip are game values. Going for
  the legs and failing on a closed capsule follow the biology.
- **Foliage**: a moss leaf bends as one rod (no twist, no folding along the
  costa), and blades are pushed by the body and legs as one enlarged
  ellipsoid. Real leaves this thin are wetted and sticky; here they are dry
  and springy.
- **Retraction** is simplified: the legs shrink as they pull in rather than
  folding into a modelled cavity, and the ventral plates do not move.
- **The moss** is a generic acrocarp (Bryum-like lanceolate leaves), not
  Sphagnum, and the shoots are shorter than real ones so the scene fits.
- **Cutaway and false colour** are image-making conveniences. False colour
  copies how published SEM art is tinted.
- Exact setal counts and positions follow *Phthiracarus* in outline only:
  no species is modelled.

## Checks

```bash
node micro/prototypes/check.mjs mite
```

The check loads the page in headless Chromium (software WebGL), drives the
keyboard, and fails on any console error. Software WebGL is slow, so the
prototype drops to a low resolution there. Judge performance by the draw
calls and triangles shown in the stats corner, not by headless fps.

## Sources

S20, S21, S37, S39 in the research atlas (`micro/research/sources.html`).
Also:

- Heethoff, M. et al. (2018), *BMC Zoology*, doi:10.1186/s40850-018-0031-8:
  ptychoid defence of *Euphthiracarus reticulatus*, with encapsulation
  nearly complete within ~150 ms of a beetle's attack.
- Peschel, K., Norton, R. A., Scheu, S. & Maraun, M. (2006), *Soil Biology
  and Biochemistry* 38: feeding trials of the predatory mite *Pergamasus
  septentrionalis* on oribatids; heavily sclerotised and ptychoid adults are
  rarely eaten.
- Schmelzle, S. & Blüthgen, N. (2019), *Frontiers in Zoology*: force
  resistance of box mites (the closed capsule withstands far more than the
  mite weighs).
- Parry's SEM revisions of the Phthiracaridae: aspis, collar, sensilli, and
  leg I longest with monodactyl legs.
- Standard SEM texts on secondary-electron topographic contrast (the edge
  effect and ETD shadowing).
