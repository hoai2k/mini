# Bacterium

Level 5 of the Zoom Chain, as a playable prototype: be a **magnetotactic
bacterium** (a *Magnetospirillum*-like spirillum, 3 µm long) in bog-pond
sediment at 1000×, at the limit of the light microscope. Or switch, in
Features, to the predator ***Bdellovibrio bacteriovorus*** (1 µm), which rams
a prey cell, bores into its periplasm and eats it from inside. Published in
the prototype archive at `micro/prototypes/bacterium/`.

The core verb is honest **run and tumble**. A bacterium cannot steer. It runs
straight, rotational Brownian motion slowly bends its course, and it tumbles
into a new random direction. Chemotaxis is only a choice of *when* to tumble,
and here the player makes that choice.

## Controls

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Xbox | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | Tumble bias: a labelled assist. The next tumble leans toward the stick. Set Features → Tumble bias → Honest and the stick does nothing |
| RS | Arrows | Move the stage (the view drifts back to your cell) |
| **A** | Space | **Sprint run**: every flagellum at full motor speed (spirillum 95 µm/s, Bdellovibrio 160 µm/s), 0.6 s, recharging (HUD `dash` meter). It also shakes off loosely bound phages and an attaching Bdellovibrio |
| **X** | E | **Feed / attack**. Magnetotactic: hold to take up food in a patch. Bdellovibrio: press while touching a Gram-negative rod to attach and bore in |
| B | Shift | **Tumble** (the "defend" slot): stop, turn to a random new heading (E. coli's distribution, mean 68°), run on. For Bdellovibrio it is a reverse plus a flick |
| Y | R | Data overlay: oxygen, food, field lines and feeding currents, marked on screen as data, not optics |
| LT / RT | Z / X | Fine focus down / up (it drifts back to your cell's plane unless switched off) |
| LB / RB | Q / F | **Reverse the run**: the other pole leads. For the magnetotactic cell, this is how it swims back the other way along the field line |
| D-pad ←→ | 3 / 4 | Look: phase contrast, fluorescence, darkfield, SEM (borrowed), DIC (borrowed) |
| D-pad ↑↓ | 1 / 2 | Field: 180 µm (the eyepiece field) / 90 / 45 / 22 µm (camera crops) |
| Menu | Esc | Features panel |
| View | Tab | Hide or show the controls |

The stats corner shows the real speed in µm/s and body lengths per second,
oxygen at your position, what your sensors feel (getting better or worse,
compared over the last ~1.5 s, as the chemotaxis network does), growth or prey,
the dash meter, phages on you and the magnetic alignment (mB/kT).

**Goals.** Magnetotactic: find the microaerobic band (0.5–5 % of air
saturation), feed in a patch, grow and divide (then keep going). Bdellovibrio:
take three prey; the last bdelloplast bursts with five new cells.

**Ways to lose the run:** too much oxygen (the magnetotactic cell is a
microaerophile) or too little energy; swept into a grazer's oral funnel; the
amoeba's edge closing over you; a phage binding irreversibly and injecting;
(magnetotactic) a Bdellovibrio boring in.

## Checks

```bash
node micro/prototypes/check.mjs bacterium
```

The smoke check opens the page in headless Chromium, drives the keyboard and
fails on any console error. `window.__micro.debug` has hooks for scripted
screenshots (`teleport`, `look`, `zoom`, `tumble`, `dash`, `reverse`,
`overlay`, `species`, `phageOnMe`, `nearGrazer`).

## Approach

### The scene

A flat chamber of bog water over the sediment, seen from above. The screen's
up is toward the air (the meniscus), down is into the sediment. That is how a
real oxygen gradient is set up under a microscope: in a flat capillary or at
the edge of a coverslip, with the gradient along the slide. **[Departure]** the
sediment surface sits in the same focal plane as the water.

- **Oxygen** falls about exponentially from the meniscus (100 %) and is used up
  by the biofilm, reaching 0 just above it. The microaerobic band is
  20–50 µm wide.
- **Food**: dissolved organic matter in patches round decaying detritus
  flakes or lysed cells (with a cloud of phages from the lysis). The dissolved
  food is invisible in every optical look; only the flake shows. Patches are
  eaten down and new ones appear elsewhere.
- **The Earth's field** is a fixed vector. North points into the sediment, as
  the field's downward dip does in the Northern Hemisphere, so north-seeking
  cells swim down toward lower oxygen.
- **The biofilm**: an EPS-rich layer of attached rods and cocci (slows you to
  45 %), matrix strands, clay and silt grains far bigger than you.
- **Other bacteria**: E. coli-like rods that run and tumble (18–28 µm/s), cocci
  and Gram-positive chains (non-motile, Brownian), ten other magnetotactic
  cells that swim along the field and reverse by their oxygen sense (so the
  field lines show in their traffic), and three Bdellovibrio hunting rods and
  leaving bdelloplasts.
- **Grazers**: two Vorticella-like peritrichs on stalks. Their oral cilia beat
  a feeding current, a sink about 60 µm/s at 16 µm from the funnel and faster
  near it (faster than you), strongest in front of the opening. Specks,
  phages and bacteria are drawn in and vanish. They contract on their stalks
  now and then, or when bumped, and the current stops for a few seconds.
- **Amoeba**: the leading edge of a giant amoeba, its hyaline margin thin and
  the granular cytoplasm behind streaming toward it, creeping at ~1.4 µm/s.
- **Phages**: diffuse (D ≈ 4 µm²/s) and stick where they touch you.

### Swimming

- **Low Reynolds number**: speed follows the motor at once; no coasting.
- **Rotational diffusion**: D_r ≈ 0.15 rad²/s for the spirillum, 0.6 rad²/s
  for tiny Bdellovibrio, which therefore loses its heading within a second.
- **Translational Brownian motion**: D ≈ 0.25 µm²/s for you, visible as a
  jitter at 45 µm; clay specks D ≈ 0.22/r µm²/s; phages ~4 µm²/s.
- **Magnetotaxis**: the magnetosome chain's moment m ≈ 10⁻¹⁵ A·m² feels a
  torque m × B. The heading relaxes toward the field at a rate
  (mB/kT)·D_r, with mB/kT ≈ 5 in a 20 µT horizontal field, so the cell lines up
  within 1–2 s and wanders about ±25° about it. A tumble turns the body, and
  the torque then turns it back: tumbling cannot change which way along the
  field you swim. Only a **reversal** (LB/RB) does. That is **magneto-
  aerotaxis**: the field gives the axis, the oxygen sense picks the
  direction. The field can be set to a bar magnet (200 µT) or cancelled.
- **Tumbles**: angle from E. coli's distribution (mean 68°, Berg & Brown
  1972), 0.1–0.3 s. The **assist** draws eight angles from that distribution
  and keeps the nearest to the stick: still random, but leaning.
- **Spontaneous tumbles** (Features): the motor's own switching (about
  once a second for E. coli, rarer for the spirillum), suppressed while the
  remembered signal is rising, as the Che network does.
- **Sensing**: oxygen and food are compared over time, not space (the cell is
  too small to compare its two ends): the HUD's "getting better / worse".

### Rendering: forming a microscope image at the limit

No lights. Each object writes what a microscope responds to into three float
buffers, additively: **optical path** (Δn × thickness), scatter, height (for
the SEM), **fluorescent stain** in three channels and absorbance. The shapes
are 2D signed-distance quads (`shared/techniques/bacterium-shapes.js`):
capsules bent into vibrios, sine strands for helical cells and flagella seen
side-on, wobbly discs for grains, chains of dots for the magnetosomes, a bell
with a carved oral funnel, the amoeba's edge and the biofilm slab. Each pixel
receives the real chord through the cross-section (2√(r² − d²)).

- **The diffraction limit** (`shared/techniques/bacterium-fluorescence.js`):
  every buffer is blurred by a Gaussian of σ = 0.21 λ/NA ≈ 89 nm (FWHM
  ≈ 0.21 µm at 550 nm, NA 1.3), in µm, so on screen the blur grows as you zoom
  the camera crop: **empty magnification**, softer, never sharper. Parts
  thinner than a pixel are widened with their integrated amount kept, so a
  20 nm flagellum carries its true tiny signal into the blur, and vanishes in
  phase contrast as it really does.
- **Depth of field ≈ 0.4 µm**: objects off the focal plane are drawn wider and
  fainter with their total kept. LT/RT move the focus.
- **Phase contrast** (Ph3, 100× oil): I = e^(−OD)·(1 − c·tanh(k(φ − 0.75·φ_low))):
  dark cells with bright halos and shade-off. Flagella and phages invisible.
- **Fluorescence**: pseudo-coloured channels on black: membranes (FM 4-64,
  magenta, brighter at the rim), flagella (Alexa 488 maleimide on
  cysteine-substituted flagellin, green; the bundle in a run, splayed filaments
  in a tumble), the magnetosome chain (MamC-GFP, shown blue so it reads apart)
  and phages (SYBR Gold, green spots). Haze, autofluorescence and shot noise.
  A Bdellovibrio expressing a fluorescent protein shows (green) inside its
  bdelloplast only here; phase contrast shows only the prey rounding up.
- **High-intensity darkfield**: the squared high-pass of φ plus scatter, which
  does show flagellar bundles (Macnab 1976).
- **Data overlay (Y)**, drawn on top and tagged *DATA OVERLAY · not optics*:
  oxygen as a colour wash with the band outlined and isolines with % labels at
  the edge, food contours, field lines with chevrons pointing north, streaks
  into the grazers' funnels, and the magnetosome chain picked out.
- **Field stop** at 180 µm (the eyepiece field), noise, an out-of-focus
  background mottle.

## Features

Every technique is listed in the panel (Menu), switchable where it can be
mixed:

- **Body**: protagonist (Magnetospirillum / Bdellovibrio); flagella on/off;
  how each cell turns (fixed, explained).
- **Optics**: look; diffraction limit; phase halo; depth of field and focus
  follow; background; noise; field stop; each stain channel; data overlay;
  the corner brackets that mark your cell (a game marker, not optics).
- **Rendering**: the instanced distance-field specimen; the shared optical
  field (fixed, explained).
- **Motion**: tumble bias (assist / honest); spontaneous tumbles (off / real
  motor clock); rotational and translational Brownian motion; low Reynolds
  number; flagellar rotation speed shown.
- **Simulation**: magnetic field (Earth 20 µT / bar magnet / cancelled); oxygen
  stress.
- **World**: grazers, amoeba, phages, Bdellovibrio hunters, other bacteria
  swimming; scenery (fixed).
- **Borrowed** (default off, also on the D-pad look cycle): **SEM** from the
  mite (the height buffer through the adapters' `fieldFromBuffers` and
  `semFromField`, with its detector choice) and **DIC** from the tardigrade
  (optical path ×6, after the diffraction blur, with its DIC/brightfield
  choice).

### Technique modules (for other prototypes)

- `shared/techniques/bacterium-fluorescence.js`: diffraction PSF in µm,
  phase contrast with halo, epifluorescence with pseudo-coloured channels,
  high-intensity darkfield, field stop and noise. Its field is the adapters'
  optical field plus a fluorescence attachment.
- `shared/techniques/bacterium-shapes.js`: the instanced 2D distance-field
  specimen renderer (rods, vibrios, helical strands, discs, chains, a
  peritrich bell, a giant-cell edge, a surface slab) with energy-kept
  sub-pixel widening and defocus.

## Art

Wired with `loadTexture` (null until delivered; unknown ids are caught, so the
page runs before the request list has them), with procedural stand-ins:

| Id | Use |
| --- | --- |
| MP-B01 | Sediment-bacteria background plate behind phase contrast (stand-in: fbm mottle) |
| MP-B02 | Biofilm surface texture in the slab's optical path (stand-in: fbm) |
| MP-B03 | Ciliate oral region plate on the peritrich bell (stand-in: fbm) |
| MP-B04 | Magnetosome-chain fluorescence texture along the chain (stand-in: even dots) |
| MP-U06 | The launcher card (`../index.html`) |

## Departures, labelled

- **Time compression**: attachment to entry takes minutes in life, 2.5 s here;
  growth inside the bdelloplast takes 3–4 h, 4 s here. Phage binding is
  reversible for ~3 s, then injection follows 2 s later (minutes in life).
- **Bdellovibrio re-emerges** after each prey so you can hunt three. In life
  it grows as a filament inside one prey and divides into several progeny
  that burst out together (this happens only after the third).
- **Shedding phages by dashing** is a stretch: reversible adsorption is real,
  shear stripping it is a game rule.
- **Shaking off an attaching Bdellovibrio** by dashing or tumbling is a game
  rule (early attachment is reversible).
- **Magnetospirillum's tumble** (B): real spirilla mostly reverse (LB/RB here).
  The tumble is a stop-and-turn with E. coli's angle distribution.
- **Bdellovibrio's reverse-and-flick** is borrowed from *Vibrio*
  (polar flagellum); its own reorientation is less studied.
- **Peak sprint speeds**: 95 µm/s for the spirillum (some magnetotactic
  bacteria are faster, Magnetospirillum usually slower); 160 µm/s for
  Bdellovibrio, one reported maximum **[Unverified]**.
- **All stains at once**: a real experiment stains one strain or one structure.
  The fluorescence look shows four labels together, pseudo-coloured.
- **Flagellar rotation** is shown slowed (100–300 Hz in life).
- **One focal plane** holds the sediment surface and the water above it.
- **Grazer flow** is a 2D sink with a forward bias, not a solved Stokes flow.
- **The amoeba homes** on you slowly; real amoebae find prey by contact and
  chemical cues.
- **Energy and stress meters** are game abstractions of respiration and
  oxidative damage.

## Sources

- Berg HC, Brown DA (1972). Chemotaxis in *Escherichia coli* analysed by
  three-dimensional tracking. Nature 239: 500–504. (Runs ~1 s, tumbles
  ~0.1 s, mean tumble angle 68°, speeds ~14–30 µm/s.)
- Berg HC (1993). *Random Walks in Biology*. Princeton. (Rotational
  diffusion, why small cells compare over time, low Reynolds number.)
- Purcell EM (1977). Life at low Reynolds number. Am J Phys 45: 3–11.
- Turner L, Ryu WS, Berg HC (2000). Real-time imaging of fluorescent flagellar
  filaments. J Bacteriol 182: 2793–2801. (Alexa-labelled flagella; bundles
  in runs, splaying in tumbles.)
- Macnab RM (1976). Examination of bacterial flagellation by dark-field
  microscopy. J Clin Microbiol 4: 258–265.
- Xie L, Altindal T, Chattopadhyay S, Wu XL (2011). Bacterial flagellum as a
  propeller and as a rudder for efficient chemotaxis. PNAS 108: 2246–2251.
  (*Vibrio*'s run-reverse-flick.)
- Blakemore R (1975). Magnetotactic bacteria. Science 190: 377–379.
- Frankel RB, Bazylinski DA, Johnson MS, Taylor BL (1997). Magneto-aerotaxis
  in marine coccoid bacteria. Biophys J 73: 994–1000. (Axial and polar
  magneto-aerotaxis, oxic–anoxic bands.)
- Faivre D, Schüler D (2008). Magnetotactic bacteria and magnetosomes. Chem Rev
  108: 4875–4898. (Chain moments ~10⁻¹⁵ A·m², mB/kT, microaerophily.)
- Lang C, Schüler D (2008). Expression of green fluorescent protein fused to
  magnetosome proteins in microaerophilic magnetotactic bacteria. Appl
  Environ Microbiol 74: 4944–4953. (MamC-GFP labels the chain.)
- Katzmann E, et al. (2011). Magnetosome chains are recruited to cellular
  division sites and split by asymmetric septation. Mol Microbiol 82:
  1316–1329.
- Sockett RE (2009). Predatory lifestyle of *Bdellovibrio bacteriovorus*. Annu
  Rev Microbiol 63: 523–539. (Attack, periplasmic entry, bdelloplast,
  filamentous growth, progeny release; Gram-negative prey.) Atlas S65.
- Noble RT, Fuhrman JA (1998). Use of SYBR Green I for rapid epifluorescence
  counts of marine viruses and bacteria. Aquat Microb Ecol 14: 113–118.
- Moldovan R, et al. (2007). On kinetics of phage adsorption. Biophys J 93:
  303–315. (Reversible, then irreversible binding.)
- Abbe/Rayleigh resolution at NA 1.25–1.4 and depth of field: atlas S17, S18.
