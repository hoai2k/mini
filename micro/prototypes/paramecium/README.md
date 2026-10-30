# Paramecium

A playable prototype: swim as *Paramecium caudatum* through a pond drop, and
compare microscope techniques (darkfield, phase contrast, brightfield, DIC
and a hypothetical lit view) on the same scene. Published in the prototype
archive at `micro/prototypes/paramecium/`.

## Controls

| Xbox | Keyboard | Action |
| --- | --- | --- |
| RT | X | Ciliary beat: swim. Speed follows the trigger almost at once; release it and the cell stops (no gliding at low Reynolds number) |
| LT | Z | Slow beat: hover and feed. The oral cilia draw bacteria into the groove |
| LS | WASD | Steer (chase camera: yaw and pitch; microscope view: point where to go) |
| LB / RB | Q / F | Dive / rise |
| B | Shift | Avoidance reaction: ciliary reversal, back up, pivot about the posterior, swim off. Also fires on any contact |
| A | Space | Trichocyst discharge: escape burst away from the nearest threat, with threads left in the water (3 charges, one back every 7 s) |
| X | E | Next microscope technique |
| Y | R | Microscope view (top-down, focal plane follows you) or chase camera |
| RS | Arrows | Orbit the chase camera; in the microscope view, move the stage |
| D-pad up/down | 1 / 2 | Objective 10× / 20× / 40× (microscope view) or camera distance (chase) |
| View | Tab | Hide or show the controls panel |
| Menu | Esc | Feature panel: what the prototype is doing, with switches |

The stats corner shows the real speed in µm/s and body lengths per second,
depth in the drop, trichocyst charges, food vacuoles, bacteria eaten and the
nearest Didinium.

## Checks

```bash
node micro/prototypes/check.mjs paramecium
```

It must pass with no console errors. The page exposes `window.__micro`
(`scene`, `camera`, `renderer`, `cell`, `world`, `swimmer`, `encounters`,
`optics`, `features`, and `debug` with `setMode`, `setView`, `setOrbit`,
`avoid`, `burst`, `teleport`, `freeze`, `step`, `inspect`) for screenshot
scripts.

## The cell

All lengths are micrometres, and the scale is honest: the cell is 230 µm
long (S07: 200–260 µm), the field at 20× is 0.9 mm.

- **Body:** a signed-distance slipper meshed with the shared surface-nets
  mesher (`shared/sdf.js`). The outline is two superellipse halves joined 20
  µm behind the middle: a blunt anterior tapering to about 0.78 of the width
  and a conical, narrowly rounded posterior; the cross-section is slightly
  flattened dorsoventrally. The **oral groove** is carved by a chain of
  tapered capsules that twists from the anterior left down to the ventral
  midline at mid-body, ending in a deeper buccal pocket (the cytostome).
- **Cilia:** about 4600 on 100 kineties (rows that twist slightly round the
  body), each 10 µm long, as instanced ribbons animated in the vertex shader.
  A beat is a straight power stroke toward the posterior and obliquely to the
  right (which rolls the cell to the left) and a slower recovery stroke with
  the tip lagging and curled. The **metachronal wave** is a phase offset per
  cilium along a diagonal of the surface. Oral cilia (three rows, faster and
  stronger with LT) line the groove; a **caudal tuft** of 22 longer, stiffer
  cilia trails from the posterior pole.
- **Trichocysts:** 2600 spindles 3.6 µm long docked just under the pellicle,
  which give the dense granular margin seen in micrographs.
- **Contractile vacuoles:** two on the dorsal side, at the anterior and
  posterior thirds, each with eight radiating collecting canals. The canals
  swell, empty into the vacuole, the vacuole swells and then empties through
  its pore; period 6 s, the two half a cycle apart.
- **Nuclei:** an ellipsoidal macronucleus mid-body and a micronucleus beside
  it.
- **Cyclosis:** 1500 granules and crystals and the food vacuoles ride the
  endoplasm loop (back along the ventral side from the cytostome, forward
  dorsally). Every ten bacteria eaten form a food vacuole at the cytostome;
  vacuoles are egested at the cytoproct after about 1.3 loops.
- **Pellicle:** a procedural pattern of alveolar units in kinety rows
  (MP-P03 replaces it when delivered).

Turnaround renders of the in-game mesh were checked against
`research/assets/references/paramecium.jpg` over three rounds: the first
body (a sine profile) read as a symmetric lens; the second (two blended round
cones) had a kink at the widest point and a truncated anterior; the third
(superellipse halves, wider, deeper groove) reads as the slipper of the
reference, with the groove visible as an oblique line in darkfield and DIC.

## Swimming

- **Low Reynolds number (S15):** speed relaxes to what the beat produces with
  a 35 ms lag. There is no coasting; the ambient drift (about 20 µm/s with
  eddies) still carries you. Top speed 1400 µm/s, about 6 body lengths per
  second (measured cells swim 1–1.5 mm/s).
- **Helix:** a left-handed helix of radius 29 µm and pitch 850 µm (measured
  values), one roll per turn, oral side toward the axis, body tilted along the
  path. The chase camera follows the helix axis and travel heading, not the
  body, so steering stays calm.
- **Steering** comes from asymmetric beating; turn rate 1.7–3.2 rad/s.
- **Avoidance reaction (S08):** the stroke reverses within tens of
  milliseconds, the cell backs up for 0.3 s at 650 µm/s, then pivots about its
  posterior end for 0.45 s to a new heading (away from what it hit, or toward
  the stick in the microscope view) and swims on. Any contact with a filament,
  flake, diatom, Vorticella, the slide, the coverslip or the edge of the drop
  sets it off.
- **Trichocyst discharge (S09):** about 240 threads 20–40 µm long fire from
  the patch of pellicle facing the threat (or the anterior if there is none)
  and the cell is thrown about 100 µm the other way. Rumble on a controller.

## The scene

- A wet mount 3 mm across and 650 µm deep (slide at y = 0, coverslip above).
- **Spirogyra:** four filaments 42 µm thick crossing the drop at different
  depths, each a closed tube of 88 µm cells with cross walls, a helical
  chloroplast ribbon with serrated margins (about 4.5 turns per cell) studded
  with pyrenoids, and a central nucleus.
- **Detritus:** 70 flakes (noise-displaced, flattened), half settled on the
  slide, plus 2200 sediment specks.
- **Vorticella:** eight on a flake near the start, each an inverted bell with
  a peristome lip, a C-shaped macronucleus and a ring of oral cilia, on a
  110–190 µm stalk. Touch one and the stalk coils into a tight helix in one
  frame, then re-extends over about 3 s; neighbours may follow (S10, S11).
  Their peristome currents feed on the bacteria too.
- **Diatoms:** three *Pinnularia*-type pennates (striae and raphe, golden
  plastids) that glide slowly back and forth, and two *Fragilaria*-type
  ribbon colonies.
- **Bacteria:** 7000 rods and cocci in a box that travels with you. They drift
  with the ambient flow, half of them run and tumble, and they visualise the
  flow you make: a neutral squirmer's dipole field (carried ahead at the
  poles, swept back along the sides, decaying as 1/r³) plus the feeding
  current into the oral groove.
- **Didinium nasutum (S28, S56):** two barrel-shaped hunters about 130 µm long
  with two girdles of cilia (pectinelles), a proboscis and a horseshoe
  macronucleus, rotating as they swim. Within about two body lengths one turns
  on you at 1050 µm/s. If its proboscis touches you, you are held and reeled
  in; trichocysts break free (B struggles for a moment); after 4 s you are
  swallowed whole and a new cell swims in.

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
| Optics | Microscope technique (synced with X) | choice |
| Optics | Camera: chase or microscope (synced with Y) | choice |
| Optics | Objective 10× / 20× / 40× | choice |
| Optics | Depth of field | on/off |
| Optics | Phase halo and shade-off | on/off |
| Optics | Brightfield defocus contrast | on/off |
| Optics | Background habitat plate | on/off |
| Optics | Lateral chromatic softness, objective point spread, camera noise | on/off each |
| Optics | Eyepiece field stop | on/off |
| Rendering | Optical-path buffers; front/back-face chord trick; sub-pixel widening | always |
| Rendering | Adaptive resolution and frame skip | on/off |
| Body | SDF body with carved oral groove | always |
| Body | Cilia; metachronal waves; pellicle pattern; docked trichocysts; cyclosis; contractile vacuole cycle; nuclei | on/off each |
| Motion | Low Reynolds number (off: a 1.4 s glide, for comparison) | on/off |
| Motion | Helical path and roll; camera follows the helix axis | on/off each |
| Motion | Ciliary beat rate: slowed (readable) or real | choice |
| Motion | Avoidance reaction; trichocyst discharge | always |
| Simulation | Flow round the swimming cell; feeding currents; ambient drift; bacterial run-and-tumble | on/off each |
| World | Didinium hunters; Didinium homing; Vorticella stalk contraction | on/off each |
| World | Spirogyra, detritus, diatoms | always |

### Technique modules (for other prototypes)

Each is self-contained and documents its interface in its header.

- `shared/techniques/paramecium-microscope.js`: the whole image-formation
  pipeline (optic materials, MRT buffers, defocus layers, darkfield, phase,
  brightfield, DIC and lit modes, post pass, stand-in plates, switches).
- `shared/techniques/paramecium-cilia.js`: instanced ribbon strands beating
  in the vertex shader (cilia with metachronal waves and reversal, caudal
  tufts, docked and extruded trichocysts, coiling stalks).
- `shared/techniques/paramecium-squirmer.js`: low-Re helpers: speed that
  follows the beat, a neutral squirmer's flow field, feeding sinks and a
  helical swimming pose.

`optics.js` and `strands.js` in this folder re-export the first two.

## Art

Procedural stand-ins are used until the images in
`micro/design/image-requests.md` are delivered; `shared/assets.js` switches
automatically: MP-P01 (darkfield plate), MP-P02 (phase plate), MP-P03
(pellicle, sampled as the kinety pattern).

## Departures, labelled

- **Thin things drawn thicker:** cilia 0.8 µm wide (really about 0.25 µm),
  trichocyst threads 1.2 µm (really 0.1–0.2 µm), bacteria about 1.3 µm wide;
  all at least one pixel, with their optical path scaled down to compensate.
  Pellicle units are drawn about 1.5 times their size.
- **Cilia count and beat:** about 4600 cilia, single rather than paired. The
  beat is shown at roughly a quarter of the real 15–35 Hz so the strokes and
  waves can be followed (the panel has the real rate).
- **Depth of field** is far deeper than real: 22 µm sharp and fully blurred at
  160 µm at 20×, against about 6 µm in a real 20× objective. With the real
  value the cell itself would be mostly out of focus.
- **Cyclosis** runs about five times faster than life; the contractile
  vacuole period (6 s) is within the real range.
- **Trichocyst recharge** (3 charges, one every 7 s) is invented: re-docking
  new trichocysts takes hours. The ≈100 µm throw is a game value.
- **Didinium homing** within about two body lengths is invented; Didinium
  finds prey by collision. Whether trichocysts free a Paramecium from
  Didinium (as they do from *Dileptus*, S09) is unverified. Struggling with B
  to buy time is invented.
- **Vorticella** contracts in one frame (really a few milliseconds) and
  neighbours may follow a touched cell (individual Vorticella are solitary).
- **Chase camera** is a hypothetical camera in the water; perspective
  projection of a transmitted-light image is itself a departure. The
  immersive mode is a rendering hypothesis, not microscopy.
- **Species:** the Zoom Chain spec recommends *P. bursaria* for Level 3; this
  prototype uses the larger, colourless *P. caudatum* the owner asked about.
  Dileptus is not in the scene yet.
- **Scene composition:** Spirogyra, Vorticella, diatoms and Didinium together
  in one drop is plausible pond water, not a recorded sample.

## Sources

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
