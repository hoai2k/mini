# Zoom transitions

A prototype of the Zoom Chain's world-to-world zooms
([`../../design/zoom-chain-levels.md`](../../design/zoom-chain-levels.md)).
In each world you play the creature (or leave the pad alone and a demo drives
it) to a destination. A point in the scene is highlighted; when the highlight
ends the camera zooms continuously into that point, and the point becomes the
next world, where play continues. The five transitions play through as one
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
giant neighbour (the springtail beside the mite, the mite beside the tun, the
tardigrade at the edge of the pool field, the Paramecium's flank beside the
biofilm), as the spec asks.

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
factor, from 18 mm down to 0.6 µm. The camera centres the target during the
highlight and zooms straight into it.

## The five transitions

Field widths are the screen's width. Magnification is shown as an
eyepiece equivalent, 180 mm ÷ field (a 10× eyepiece of field number 18, the
convention the Paramecium prototype's objectives already follow).

| # | From → to | Field | Zooms into | Why (spec) |
| --- | --- | --- | --- | --- |
| 1 | Springtail (macro photo) → mite (SEM, or the stereo microscope) | 18 mm → 4.2 mm (10× → 43×) | A speck moving on the capitulum at the lawn edge: the box mite | §0.6: the springtail lands at the lawn edge, a speck on the capitulum becomes the mite; the springtail stays as a giant neighbour |
| 2 | Mite (SEM) → tardigrade (DIC) | 4.2 mm → 1.8 mm (43× → 100×) | The water film in a leaf axil, with a dry tun lying in it | §1.6: the mite reaches a wet axil; reflected light gives way to transmitted, 10×; the tun swells, legs evert, it walks (sped up ~300×, labelled) |
| 3 | Tardigrade (DIC) → Paramecium (brightfield) | 1.8 mm → 0.9 mm (100× → 200×) | The leaf tip dipping into the pool, where a green *P. bursaria* swims past | §2.6: the camera follows a passing *Paramecium* out into the pool at 20×; the tardigrade stays as a clawed giant at the field's edge |
| 4 | Paramecium (brightfield) → bacteria (phase contrast, or fluorescence) | 0.9 mm → 90 µm (200× → 2000×) | A biofilm patch on the leaf: rods and dots that read only as texture | §3.6 (the alternative without the trap: the periphyton on a Sphagnum leaf) and §4.6 (the bacterial film under it, texture at low power, resolved at 100× oil) |
| 5 | Bacterium (phase) → phage (cryo-EM → molecular illustration), stub | 90 µm → 0.6 µm | A host cell that swells; phages stuck to it, invisible in any light microscope | §5.8: nothing visible marks it, the end of light microscopy; grey cryo-EM, then colour as an illustration |

Level 4 of the spec (*Trachelomonas* at 40×) has no prototype, so transition 4
takes the spec's no-trap alternative straight to the biofilm.

## Strategies (D-pad ←→ or Features)

1. **Look first**: at world N's scale, morph N's optics into N+1's, then zoom.
2. **Look during**: the optics morph with zoom progress.
3. **Zoom first**: zoom in N's look, arrive in N+1 still in N's look, then morph.
4. **Crossfade**: as during, but the two finished images cross-fade (no optics morph).
5. **Cut at hand-off**: the look switches at 55 % of the zoom (a baseline).

Durations (zoom 2 / 3.5 / 6 s, morph 1 / 2.5 / 4 s, highlight 1.2 / 2.2 / 3.5 s)
and easing (constant log speed, ease in and out, fast start and slow arrival)
are Features choices.

## Highlights (X or Features)

- **Ring pulse** around the next world's field (a circle inscribed in it).
- **Focus rack**: everything but the target defocuses.
- **Iris (field stop)**: the field stop closes onto the target; the zoom runs
  inside it (it is exactly the next world's field, growing to fill the screen)
  and it opens as the zoom arrives.
- **Objective click**: the nosepiece turning (a rotational blur about an axis
  off screen) and a click, at the start of the zoom and softer at its end.

A dashed frame (Features: on by default) outlines exactly what will fill the
screen when the zoom arrives.

## Controls

| Button | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | Move the creature (relative to the view); a demo drives it after a moment idle |
| A | Space | Dash. Near the destination: start the transition. On the highlight: zoom now; hold: skip the highlight. While scrubbing: resume |
| X | E | Cycle the highlight style |
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
last slowed for the phage) cross-fades with the zoom; steps, the tun's revival
and a synthesised objective click.

## Technique modules

- `shared/techniques/zoom-optics.js` (new): the specimen field (the
  `adapters.js` optical-field layout plus albedo and gloss, mipmapped), the
  unified image-formation model, `LOOKS` for every prototype's look, `mixLook`
  and `lookPath`, and the highlight post pass.
- `shared/techniques/zoom-path.js` (new): log zoom, the transition timeline
  for each strategy, scale bar and magnification.
- `specimen.js`: the multi-scale specimen and the six creatures (springtail,
  box mite with a tetrapod gait, tardigrade from tun to active, *P. bursaria*
  with Chlorella and metachronal cilia, a magnetotactic spirillum with its
  magnetosome chain, a T4-like phage).
- `chain.js`: the worlds, fields, paths, frames and transition texts.
- `shared/` `pad`, `controls`, `hud`, `features`, `audio`, `boot`.

No other prototype's files were changed. The real prototypes' scene builders
start their own loops and renderers, so the worlds here are lightweight
representative scenes drawn into one field.

## Recommendation

RECOMMENDATION

## Known issues

KNOWN
