# Mite · SEM prototype

A box mite (Oribatida: Phthiracaridae), about 0.6 mm long, walks through a
few square millimetres of moss cushion, imaged as a scanning electron
micrograph. Built in three.js (`../shared/vendor`), world units are µm.

Open `micro/prototypes/mite/` (the invite gate is off on localhost).

## Controls (Xbox controller; keyboard in brackets)

| Button | Action |
| --- | --- |
| LS (WASD) | Walk, relative to the view. The mite turns toward the stick and walks forward |
| RS (arrows) | Orbit the specimen |
| LT / RT (Z / X) | Lower / higher magnification (HFW 0.26–4.2 mm) |
| A or B (Space / Shift), hold | Ptychoidy: close into a sealed capsule; release to reopen |
| LB / RB (Q / F) | Walk slowly / hurry |
| Y (R) | Imaging mode: SE (Everhart-Thornley), BSE (low vacuum), SE false colour |
| X (E) | Observer mode: SEM data bar and raster lines |
| View (Tab) | Hide the help panel |
| Menu (Esc) | Features panel: what the prototype does, with switches |

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
  lowest moss leaves, which arch down to the floor as ramps. It slides along
  stems and boulders that are too steep. A 2.5 µm bob and a slight roll keep
  time with the leg groups.
- **Ptychoidy**: the legs pull in and shrink into the cavity and the aspis
  folds down over it in 0.16 s (Heethoff et al. 2018 measured encapsulation
  nearly complete within 150 ms of a beetle's attack). Closed, it cannot move.
  It is then a rigid ellipsoid: gravity torque about the contact point tips
  it onto its flat side, it rolls without slipping down slopes and falls off
  edges. Reopening is slower (0.9 s), and it rights itself onto whatever
  surface is under it.
- A second box mite wanders with the same walker and closes up when you come
  near.

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
- 3–5 µm fungal hyphae strung between surfaces, with branches;
- fungal conidia, echinate (aster-type) pollen and bisaccate conifer pollen.

Walking queries go to low-poly colliders, prefiltered by bounding spheres.

## Features

The Menu button opens the panel (`../shared/features.js`). Switches apply
live and persist per browser.

| Group | Feature | Switch |
| --- | --- | --- |
| Rendering | Deferred SEM composite | always |
| Rendering | Imaging mode (SE / BSE / false colour) | choice (Y) |
| Rendering | Secant-law tilt contrast | on |
| Rendering | Edge effect | on |
| Rendering | Detector shadowing (ETD) | on |
| Rendering | Dark crevices (SSAO) | on |
| Rendering | Surface relief from SEM textures | on |
| Rendering | Shot noise | on |
| Rendering | Scan-line jitter | on |
| Rendering | Observer mode | off (X) |
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
| Simulation | Ptychoidy speed (real 0.16 s / slowed 4×) | choice |
| Simulation | Closed capsule rolls and falls | on |
| Simulation | A second box mite | on |
| World | Moss shoots, mineral grains, litter, hyphae, spores and pollen | on (each; off also removes it from walking) |
| World | Procedural SEM textures | always |
| Controls | Camera-relative walking | always |
| Controls | Rumble | on |

Technique modules other prototypes can borrow:

- `../shared/techniques/mite-sem.js`: the SEM G-buffer materials and
  composite (SE, BSE, false colour; per-term switches; cutaway).
- `../shared/techniques/mite-gait.js`: the gaits (tetrapod, wave, pairs),
  distance-driven phase triggers, swing targets and two-bone IK.

`sem.js` here just re-exports `mite-sem.js`.

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
  but is not measured for this species.
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
- Parry's SEM revisions of the Phthiracaridae: aspis, collar, sensilli, and
  leg I longest with monodactyl legs.
- Standard SEM texts on secondary-electron topographic contrast (the edge
  effect and ETD shadowing).
