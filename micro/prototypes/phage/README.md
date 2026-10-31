# Phage

Level 6 (optional) of the Zoom Chain, as a playable prototype: be a **T4-like
tailed bacteriophage** in bog water beside its host bacteria. No light
microscope can see a phage (a head of ~0.1 µm against a ~0.2 µm resolution
limit [S17]), so the level is drawn as a **molecular illustration** in the
manner of David Goodsell's watercolours, grounded in shapes from cryo-electron
tomography [S99]. A cryo-EM greyscale look and a fluorescence pseudo-colour
look are on the D-pad. Published in the prototype archive at
`micro/prototypes/phage/`.

**LS drives the phage; let go and the water has it.** A real phage has no
motor: it diffuses until it touches a receptor [S100]. At the owner's request
LS still controls the motion, as a labelled departure, and the motion is made
to feel organic: the stick sets a slow, sluggish drift (about 0.3 µm/s on the
slowed clock) and on top of it act a smooth Brownian velocity, the ambient
flow, and slow tumbling that lets the head lead and the long fibres trail
and sway like weed. Release the stick and only Brownian motion and the flow
remain. Bound to a host, LS walks the phage across the surface fibre by
fibre. *Features → LS drift → Honest* turns the open-water drift off.

## Controls

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Xbox | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | **Drift** (a labelled departure). Bound to a host: **walk** on the long fibres, one fibre re-planting at a time |
| RS | Arrows | Orbit the view (it drifts back when released) |
| **A** | Space | **Dash**: a passing *current gust* in open water, or a *push-off* with the fibres from a surface (both departures; recharging, HUD `dash` meter) |
| **X** | E | **Commit**: the irreversible bind. Works only with at least three long fibres bound on an OmpC patch of a host; then the short fibres bind, the baseplate opens into a star, the sheath contracts, the tube crosses the envelope and the DNA goes in |
| B | Shift | **Fibres**: fold them back against the sheath (slip past clay and wrong hosts; also lets go of a host) or extend them (catch receptors, and clay) |
| Y | R | Odds and receptor overlay: receptor patches ringed, each host's receptors, defences and odds of a burst, the UV line, the amoeba's hunger, your distance to the nearest host; inside, each enzyme's sensing range. Marked on screen as data, not optics |
| D-pad ←→ | 3 / 4 | Look: Goodsell watercolour, cryo-EM greyscale, fluorescence (pseudo-colour) |
| D-pad ↑↓ | 1 / 2 | Zoom in / out |
| Menu | Esc | Features panel |
| View | Tab | Hide or show the controls |

Inside the host, LS steers the DNA's leading end and A is a short *surge* (the
strand pulled in faster; a departure).

**Goal.** Find a host with receptors, walk to an OmpC patch, commit, and get
the whole genome (169 kbp, shown as a progress bar) into the cell past its
restriction enzyme and CRISPR complex. Success: the host bursts with 40 new
phages. The odds overlay says which host is the better bet: Host A (no
matching CRISPR spacer) or Host B (a matching spacer: its CRISPR complexes
hunt hard, a near dead end). The third cell is the wrong host.

## Threats and pacing

- **A calm opening.** The amoeba waits at least 45 s (`createHunger`) and the
  UV is only near the top, so you can drift and explore first. The phage
  starts in clear water well below the UV line.
- **The amoeba's edge** (left): when hungry it reaches a pseudopod toward
  you, slower than your drift; get away or ride a gust. It gives up after a
  while. *Amoebae grazing viruses is [Unverified] in the spec.*
- **UV** (top): your integrity erodes in the UV-bright water; bound to the
  clay platelet you are shielded [S103, S104].
- **Clay / peat platelet**: extended fibres stick to it [S103]. A trap, but
  a shelter from UV. Fold the fibres (B) to slip free.
- **The wrong host**: a Gram-positive with no outer membrane and no OmpC. The
  fibres slide off; fold them to pass cleanly.
- **Inside**: the restriction enzyme and the CRISPR complex slide along the
  host DNA and, after a short calm, home on your DNA's leading end when they
  sense it. Lead it away; the strand piles up and feeds more slowly if you
  just sit by the pore.

**Being caught always plays a sequence** through `createCapture` (strike,
hold, eat, then the card; A starts again):

- *Engulfed:* the pseudopod's lips close round you, a food vacuole forms,
  and you darken and shrink as it draws you into the amoeba (card: "Eaten").
- *Fried by UV:* a violet flash, the head darkens, cracks open across the
  capsid and the DNA leaks (card: "Inactivated").
- *DNA cut:* the enzyme's blades straddle the strand and close, a red flash
  marks the cut, the cut piece drifts free and is chewed away (card: "Cut").

The shared card always reads "Eaten"; the prototype retitles it for UV and
cuts.

## Checks

```bash
node micro/prototypes/check.mjs phage
```

The smoke check opens the page in headless Chromium, drives the keyboard and
fails on any console error. `window.__micro.debug` has hooks for scripted
screenshots: `teleport`, `orient`, `isolate` (the phage alone, for
turnarounds), `cam(yaw, pitch, dist)`, `fold`, `walkOn(hostId, u, phi)`,
`commit`, `inside(hostId)`, `win`, `capture('amoeba' | 'uv' | 'cut')`,
`hungry`, `overlay`, `look`, `zoom`, `reset`, plus `maxDt` and `pause`.

## Approach

Three.js, 1 unit = 10 nm outside and 1 nm inside the host.

### The phage (`shared/techniques/phage-model.js`)

Built from T4's anatomy [S98, S99], checked in turnarounds against the MP-R12
reference sheet and `research/assets/references/production/phage-t4.jpg`:

- **Head**: a prolate icosahedron 120 × 86 nm (two icosahedral caps on an
  elongated band of ten faces), studded with capsomer beads, blue with green
  patches at the vertices. Its **DNA** is a coaxial spool inside, seen through
  a **cutaway** (a clipping plane always facing the camera) or a translucent
  capsid. The spool drains as the DNA leaves.
- **Collar** with six fibritin whiskers; **sheath** of 23 rings, 98 nm long
  and 21 nm wide, that contracts to 42 nm and 33 nm, pulling the head down so
  the rigid **inner tube** pokes out below the baseplate.
- **Baseplate**: six wedges round a hub, a hexagon that opens into a star.
- **Six long tail fibres** (~160 nm, kinked at the knee) are Verlet chains
  in world space: each node springs toward a pose (extended: out to the knee,
  then down; folded: up the sheath with the knee at the whiskers and the
  distal half back down), proximal halves stiffer than distal, with a sway
  that grows toward the tip. Moving through the water they lag and trail;
  their tips can be pinned to a surface.
- **Six short tail fibres** curl under the plate and swing down on commit.

### Motion

- Drift: the stick sets a target velocity the phage eases toward (a 0.7 s
  lag), so it never snaps. Brownian motion is an Ornstein–Uhlenbeck velocity
  (D ≈ 0.2 µm²/s on the slowed clock, from T4's 4 µm²/s [S100]), plus a fine
  tremble. Rotation is a slow random angular velocity; when moving, a soft
  torque turns the head to lead so the fibres trail, and another eases the
  phage back toward side-on so it stays readable.
- Walking: the phage stands on its fibres over the host's surface and
  rocks. Each foot is pinned in the host's own frame (so it rides along as
  the host drifts); when a foot falls behind its ideal place, it lets go and
  swings to a new one, one fibre at a time. The body moves faster while a
  foot is stepping and slower with fewer feet planted. With the stick
  released it still wanders slowly, as bound phages do [S99].
- The commit is a 3.6 s sequence: short fibres down, star, a sheath snap with
  a small overshoot and rumble, the DNA spool draining, then a fade into the
  host.
- Inside, the DNA is a rope of nodes 3.4 nm apart (one helix turn), drawn as
  two twisting bead strands. New DNA enters at the pore and pushes the strand
  out; you steer the leading end with wobble and drag.

### The look (`shared/techniques/phage-goodsell.js`)

Every object uses one toon material: flat watercolour colour with a soft
two-tone light, slight darkening at the silhouette, world-space mottling, and
**depth by desaturation** (far things fade toward the water colour). An
inverted-hull **ink outline** fades with depth. The scene is drawn over a
transparent background, and a final pass applies the look: watercolour paper
and wet edges over the water; cryo-EM greyscale (density dark on grey, a
bright defocus fringe, shot noise); or fluorescence pseudo-colour on black.
The same pass draws the UV wash above the line where UV starts.

The water is crowded with humic colloids, proteins, sugars and solutes that
jostle (their own random velocities), are swept by the flow and gusts, and
are shoved aside by the phage. The amoeba's edge and the hosts breathe with a
slow vertex wobble. Hosts carry an LPS forest and OmpC trimer patches; the
inside is a crowded cytoplasm of ribosomes and proteins under an envelope
section (outer membrane, periplasm, inner membrane), with the host's DNA
wandering through it.

## Features

The Menu panel lists everything with a switch where it makes sense:

- **Rendering**: Look (Goodsell / cryo-EM / fluorescence); Capsid (Cutaway /
  Translucent / Solid); Ink outlines; Depth by desaturation; Delivered art.
- **Body**: T4 from its anatomy (always).
- **Motion**: LS drift (Drift / Honest); Brownian motion; Slow tumbling.
- **Simulation**: UV near the surface; Amoeba edge.
- **World**: Crowded water.
- **Controls**: Invert camera Y (shared).
- **Sound**: the shared Sound and Ambience switches.

## Art

- **MP-V01** (envelope surface, tileable) maps onto the hosts, **MP-V02**
  (water backdrop) replaces the procedural water wash, **MP-V03** (envelope
  section) is the inside view's envelope band. All three are still
  `requested`; procedural stand-ins draw until they are delivered (a canvas
  dot pattern for the envelope, an fbm wash for the water, a Goodsell-style
  canvas section of LPS, bilayers and periplasm).`loadTexture` is wrapped so
  an id missing from the list warns rather than throws.
- **MP-E04** (concept, delivered) set the mood: the palette, the LPS forest,
  the crowded water and the envelope section.
- **MP-R12** (T4 reference sheet, delivered) for the turnarounds.

Sound reuses the bacterium's foley: the sediment ambience, the run loop
(faint, pitched to drift speed), `sprint` (gust, surge), `tumble` (fibres,
steps, slipping off), `phage` (binding, commit), `eat` (sheath snap, UV
death) and `graze` (engulfed, the burst). Sounds this level would want:
a humic-water ambience, a soft fibre "tick" for each step, a sheath-contraction
snap, DNA translocation (a fast zipper), an enzyme clamp, a capsid crack, and
the lysis burst.

## Departures, labelled

- **LS drift and the dash** (current gust, fibre push-off, inside surge): a
  phage has no motor and makes no decisions; the player's choices stand for
  chance [S100]. The fibres' state follows conditions in reality, not a
  choice. Shown in the HUD, the bottom label and the toasts.
- **Colour and continuous motion in a cryo-EM-derived look**: cryo-EM gives
  grey, frozen snapshots [S99]; Goodsell colours, motion and the uncrowded
  view are invented. Small solutes are drawn several times too large.
- **T4 standing in for a bog phage**: T4 infects *E. coli*; phages of the
  Level 5 bacteria were not researched **[Unverified]**. "Clay" stands for
  mineral and peat particles in a bog **[Unverified for Simmelried]**.
- **Time**: the clock is slowed about 20× (a phage crosses 1 µm in ~0.04 s),
  tumbling is slowed far more (real orientation is lost in ~1 ms), the
  search for a host is compressed (hours at low host density [S100]), and the
  ~25-minute takeover before the burst is compressed to seconds
  **[Unverified here]**.
- **Inside rules**: only the leading end can be cut (a game rule; real
  restriction enzymes and CRISPR complexes cut any matching site
  [S101, S102]); burst size (40) is a game number.

## Sources

From `micro/design/zoom-chain-levels.md` (Level 6) and `movement.md`:
S17 (resolution), S98 (T4 structure: head 120 × 86 nm, tail, six 160 nm
fibres, baseplate hexagon to star, 169 kbp), S99 (Hu et al. 2015: folded
long fibres, surface walk, LPS/OmpC binding, the infection steps), S100
(diffusion and adsorption: D ≈ 4 µm²/s), S101 (CRISPR-Cas), S102
(restriction-modification), S103 (phages on clay; clay protects from UV),
S104 (UV in humic lakes).
