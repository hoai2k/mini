# Zoom transitions

A prototype of the Zoom Chain's world-to-world zooms
([`../../design/zoom-chain-levels.md`](../../design/zoom-chain-levels.md)).
In each world you play the creature (or leave the pad alone and a demo drives
it) to a destination. The exact rectangle the next world's screen will show
is highlighted (it flashes); then the camera zooms so that rectangle grows to
fill the screen exactly, and it becomes the next world, where play continues.
Where two worlds share a scale (mite → tardigrade) there is no highlight and
no zoom: the creature and the look hand off in place. The five transitions play through as one
chain, and each can be picked, replayed, reversed and scrubbed to compare
ways of changing the optical look.

## How the hand-off works

**One specimen at every scale.** The six worlds are not six pictures: they are
scale bands of one procedural specimen (`specimen.js`), a bog pool's edge with
a Sphagnum capitulum. Its leaves carry the hyaline-cell lattice the DIC
resolves; a water film runs from a leaf axil down a leaf into the pool; a
biofilm patch coats a leaf near the tip; one bacterium in it carries phages.
Each layer lives in its own frame (µm, origin at the zoom target that leads
into it), so float precision holds from 18 mm down to 0.6 µm, and each fades
in by pixel size, with anything finer than a pixel widened and dimmed so its
integrated amount is kept. So the zoom target really contains the next world
at the right scale, and the hand-off cannot jump: the biofilm's cells are the
texture the brightfield shows; the leaf whose cells the DIC resolves is the
leaf the mite walked on; the previous protagonist stays in the new world as a
giant neighbour (the springtail at the corner of the mite's field, the mite
beside the tun, the tardigrade at the edge of the pool field), as the spec
asks.

**One image-formation model for every look.** Every look is a point in one
model (`../shared/techniques/zoom-optics.js`): reflected light (Lambert, a
key-light direction, wet specular, sky), secondary-electron yield (the 1/cos θ
secant law, detector shadowing, edge brightening, cavity darkening),
transmitted light (absorbance, a DIC shear term, a defocus Laplacian, a
phase-ring term with its halo) and emission (fluorescence), plus the
instrument's frame (field stop, vignette, grain, scan lines, grade). The
weights are lamps; incoherent images add, so dimming the episcopic lamp while
bringing up the transmitted one is what a microscope with both would show, and
the other numbers (light direction, aperture, shear, field stop, halo)
interpolate as real settings would. A morph moves the instrument through
parameter space, not pixels. The **Crossfade** strategy forms both finished
images and cross-fades them, for comparison.

**Log-scale zoom.** The field width is interpolated in log space
(`../shared/techniques/zoom-path.js`), so each second magnifies by the same
factor, from 18 mm down to 0.6 µm.

**The highlight is the next frame, and the zoom fills it exactly.** The
highlight is the rectangle the next world's screen will show: its field
width × the screen's aspect, centred on the zoom target. During the highlight
the camera moves only as far as needed to get that rectangle on screen (6 %
margin). The zoom is then a pure scaling about one fixed point X, chosen so
that the rectangle maps onto the screen: with camera centre c₀ and field F₀
at the start, target T and next field F₁ (r = F₁/F₀),
X = (T − r·c₀)/(1 − r) and c(w) = X + (c₀ − X)·w/F₀. The rectangle's corners
move straight to the screen's corners, with no drift and no recentring.
Measured (`__micro.rect()`, 960 × 540): the corner error at p = 1 is 0 px for
transitions 1, 3 and 5 and 7 × 10⁻¹³ px for 4. The rectangle at the end of
the highlight equals the one at p = 0, so nothing jumps when the zoom starts.
Cropping the rectangle from the p = 0 frame and enlarging it gives the same
picture as the p = 1 frame, cell for cell (in the zoom-first strategy, where
the look doesn't change during the zoom). The scale bar and magnification
follow the field width throughout.

## The five transitions

Field widths are the screen's width. Magnification is shown as an
eyepiece equivalent, 180 mm ÷ field (a 10× eyepiece of field number 18, the
convention the Paramecium prototype's objectives already follow).

| # | From → to | Field | Zooms into | Why (spec) |
| --- | --- | --- | --- | --- |
| 1 | Springtail (macro photo) → mite (SEM, or the stereo microscope) | 18 mm → 1.8 mm (10× → 100×) | A speck moving on the capitulum at the lawn edge: the box mite (0.35 mm; the springtail is 1.5 mm, about 4× longer) | §0.6: the springtail lands at the lawn edge, a speck on the capitulum becomes the mite; the springtail's head stays at the edge of the mite's field |
| 2 | Mite (SEM) → tardigrade (DIC): **hand-off, no zoom** | 1.8 mm throughout (100×) | Nothing: the mite (0.35 mm) and the tardigrade (0.35 mm) share a scale | §1.6: the mite reaches a wet axil where a tun lies in the film; the camera holds while the light switches from reflected to transmitted and the tun rehydrates; attention moves from the mite (which wanders off along the leaf) to the tardigrade |
| 3 | Tardigrade (DIC) → Paramecium (brightfield) | 1.8 mm → 0.9 mm (100× → 200×) | The leaf tip dipping into the pool, where a green *P. bursaria* swims past | §2.6: the camera follows a passing *Paramecium* out into the pool at 20×; the tardigrade stays as a clawed giant at the field's edge |
| 4 | Paramecium (brightfield) → bacteria (phase contrast, or fluorescence) | 0.9 mm → 90 µm (200× → 2000×) | A biofilm patch on the leaf: rods and dots that read only as texture | §3.6 (the alternative without the trap: the periphyton on a Sphagnum leaf) and §4.6 (the bacterial film under it, texture at low power, resolved at 100× oil) |
| 5 | Bacterium (phase) → phage (cryo-EM → molecular illustration), stub | 90 µm → 0.6 µm | A host cell that swells; phages stuck to it, invisible in any light microscope | §5.8: nothing visible marks it, the end of light microscopy; grey cryo-EM, then colour as an illustration |

Level 4 of the spec (*Trachelomonas* at 40×) has no prototype, so transition 4
takes the spec's no-trap alternative straight to the biofilm.

## The mite → tardigrade hand-off

With no change of scale there is nothing to zoom into, so there is no
highlight. The hand-off runs at a constant 1.8 mm field (the 10× objective's
field): the look morphs from SEM (reflected) to DIC (transmitted) in place,
the tun rehydrates, the mite walks off along the leaf as a neighbour, and the
camera eases its framing from the mite onto the tardigrade, ending exactly
where the tardigrade's own play framing begins. Strategies that make sense
without a zoom: **look first** (the light changes, then the tun revives),
**look while it revives** (the "Look during" choice; "Zoom first" falls back
to it here), **crossfade** while it revives, and the **cut** at mid-revival.

**The tun.** Tuns form by contracting the body and retracting the legs, and
rehydration reverses both [S73]. Richaud et al. (2020) measured *Hypsibius
exemplaris* at 164 ± 32 µm hydrated and 101 ± 12 µm as tuns, about 38 %
shorter, with the cuticle folded; after 24 h of rehydration the animals were
back to their hydrated size (S73 in `design/zoom-chain-levels.md`:
https://pmc.ncbi.nlm.nih.gov/articles/PMC7062702/). So the 350 µm tardigrade's
tun here is 215 µm long, plump and folded, not a 110 µm speck. Revival is
staged so it reads as coming to life, not as scaling: water soaks in from the
rim (the folds fill, the body darkens and turns glossy), the legs evert first,
then the body lengthens to 350 µm and clears, then the first steps. It starts
when the hand-off starts and takes the hand-off's length (4.5 s or more;
hours in life).

## Strategies (D-pad ←→ or Features)

1. **Look first**: at world N's scale, morph N's optics into N+1's, then zoom.
2. **Look during**: the optics morph with zoom progress.
3. **Zoom first**: zoom in N's look, arrive in N+1 still in N's look, then morph.
4. **Crossfade**: as during, but the two finished images cross-fade (no optics morph).
5. **Cut at hand-off**: the look switches at 55 % of the zoom (a baseline).

Durations (zoom 2 / 3.5 / 6 s, morph 1 / 2.5 / 4 s, highlight 1.2 / 2.2 / 3.5 s)
and easing (constant log speed, ease in and out, fast start and slow arrival)
are Features choices.

## Highlight: the next world's frame (X or Features)

Always the exact rectangle of the next screen: a 3 px line just inside it with
a dark rim outside (readable on bright fields), and corner marks just outside
it so even the 6 px frame of transition 5 can be found. Three ways to flash it:

- **Frame flash**: the frame, and its inside flashes twice.
- **Pulsing frame**: the frame pulses.
- **Darken outside**: everything outside the frame dims.

The frame stays during the zoom (growing with it) and fades as it reaches the
screen's edges.

## Controls

| Button | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | Move the creature (relative to the view); a demo drives it after a moment idle |
| A | Space | Dash. Near the destination: start the transition. On the highlighted frame: zoom now; hold: skip the highlight. While scrubbing: resume |
| X | E | Cycle the frame flash style |
| B | Shift | Reverse: zoom back out (during a transition, or just after arriving) |
| Y | R | Replay this transition (the one just played, right after arriving) |
| LT / RT | Z / X | Scrub the transition backward / forward (stops it; A resumes) |
| LB / RB, D-pad ↑↓ | Q / F, 1 / 2 | Previous / next transition |
| D-pad ←→ | 3 / 4 | Cycle the strategy |
| Menu | Esc | Features |
| View | Tab | Hide the controls |

The menu at the top lists the transitions and their looks, with a timeline
(highlight, look morph, zoom) and a cursor. The bottom left shows a 1-2-5
scale bar, the field width, the magnification, the look of the moment (with
morph percentage) and the instruments.

Sound: each world's ambience (`springtail/amb-bog`, `mite/amb-moss`,
`tardigrade/amb-film`, `paramecium/amb-pool`, `bacterium/amb-sediment`, the
last slowed for the phage) cross-fades with the zoom; steps and the tun's
revival.

## Technique modules

- `shared/techniques/zoom-optics.js` (new): the specimen field (the
  `adapters.js` optical-field layout plus albedo and gloss, mipmapped), the
  unified image-formation model, `LOOKS` for every prototype's look, `mixLook`
  and `lookPath`, and the highlight post pass.
- `shared/techniques/zoom-path.js` (new): log zoom, the transition timeline
  for each strategy, scale bar and magnification.
- `specimen.js`: the multi-scale specimen and the six creatures (springtail,
  0.35 mm box mite with a tetrapod gait, tardigrade from a 215 µm tun to active, *P. bursaria*
  with Chlorella and metachronal cilia, a magnetotactic spirillum with its
  magnetosome chain, a T4-like phage).
- `chain.js`: the worlds, fields, paths, frames and transition texts.
- `shared/` `pad`, `controls`, `hud`, `features`, `audio`, `boot`.

No other prototype's files were changed. The real prototypes' scene builders
start their own loops and renderers, so the worlds here are lightweight
representative scenes drawn into one field.

## Recommendation

From the contact sheets (every transition × strategy at zoom 0, 25, 50, 75
and 100 % and settled; each highlight style):

| # | Best | Why |
| --- | --- | --- |
| 1 Macro → SEM | **Zoom first** | The macro photo's colour leads the eye down to the speck; the SEM then "develops" on the mite. Morphing during the zoom passes through a pale, foggy half-and-half; look first is crisp but spends the whole zoom in SEM, losing the bog. |
| 2 SEM → DIC (hand-off) | **Look while it revives** | The spec's own beat: the camera holds while the reflected light fades and the transmitted light comes up; the mite turns into a silhouette as it walks off, the film's meniscus appears and the tun comes to life in the same few seconds. Look first works too (the light changes, then the tun wakes) but splits one moment into two. |
| 3 DIC → brightfield | **Look during** | The field stop closes in as the zoom advances, as if the condenser were swung: the most "instrument-like" morph of the five. Crossfade shows a ghost of both frames. |
| 4 Brightfield → phase | **Look during** (or zoom first, to teach) | During: the stop opens as the bacteria resolve. Zoom first is a good lesson (the cells barely show in brightfield, then phase reveals them) but spends a beat on an almost empty disc. |
| 5 Phase → cryo-EM → illustration | **Look during** | Passes through grey cryo-EM at mid-zoom, then gains colour, as §5.8 describes. Zoom first shows honest empty magnification (the phase image just blurs past ~0.2 µm), a strong point but a long blank. |

Overall: the parametric morph beats the plain crossfade wherever the field
stop or the lamp changes (3, 4, 5), where the crossfade shows two frames at
once; they are close for 1 and 2. **Look first** is best when the new look
should be read before it is entered (useful for teaching a new optics), never
worse than a cut. The **cut** at the hand-off is abrupt in every case.

Highlight: **frame flash** reads best: two flashes say "this is where you are
going" and the frame then grows into the screen. **Darken outside** is the
clearest on the 10× and 150× zooms (4, 5), where the frame is small;
**pulsing frame** is the quietest.

## Checks

```bash
node micro/prototypes/check.mjs zoom
```

`window.__micro` has test hooks: `start(k)`, `setZoom(p)`, `setProgress(s)`,
`setStrategy(id)`, `setHighlight(name)`, `snap()` (renders and returns the
canvas and the scale readout), `rect()` (the next frame on screen, in
drawing-buffer pixels), `profile()` (ms per pass), `state()`. On a software
rasteriser (the headless check's SwiftShader) the specimen is drawn at 35 %
resolution at most, so screenshots stay within the check's time limit.

## Known issues

- **Representative scenes, not the prototypes' own.** The six prototypes'
  scene builders start their own renderers and loops, so the worlds here are
  lightweight procedural stand-ins drawn with one image model. The looks are
  tuned to read like the prototypes (see the screenshots), not computed by
  their modules; `zoom-optics.js` keeps `adapters.js`'s optical-field layout
  so the real sinks could be wired in later for the rest states.
- **Delivered art is not used.** The SEM and DIC leaf plates (MP-M01, MP-T02)
  show the same kind of cell net but are not registered to each other, so a
  shared procedural cell lattice keeps the leaf aligned across the hand-off.
- **Sphagnum is stylised**: a capitulum is a rosette of 12 branches of ovate
  leaves; between overlapping leaves the edges are hard (no anti-aliasing),
  visible as thin lines at 1000×.
- **The SEM is a fiction**, as in the mite prototype: water (the pool, the
  film) is shown flat and grey; a real SEM sample is dried.
- **Mid-morph between reflected and transmitted light** (1, 2) is pale: the
  two lamps' images add, which is physically right and low in contrast.
- **The frame is small for transitions 4 and 5** (1/10 and 1/150 of the
  screen width: 96 × 54 and 6 × 4 px at 960 × 540); the corner marks are what
  find it in 5.
- **The highlight camera move:** when the next frame would fall off screen,
  the camera first shifts (as little as possible) to bring it on, so the
  frame is not always exactly where the creature stopped.
- **Time:** the tun revives in the hand-off's 4.5 s or more (hours in life,
  labelled). The phage drifts without its real Brownian motion (D ≈ 4 µm²/s
  would carry it out of a 0.6 µm field in a fraction of a second). Phage level
  is a stub: drift only.
- Level 4 (*Trachelomonas*, 40×) is skipped (no prototype); transition 4 takes
  the spec's no-trap alternative.
- The HUD panels overlap on short windows; View hides the controls.
