# Tardigrade · The Drying

A ~350 µm eutardigrade climbing the cell walls of overlapping moss leaves with
its claws, through one compressed day as the water film dries. Seen through a
DIC (Nomarski) microscope with a real, shallow focal plane. A predatory
*Milnesium* stalks it through the film. Published at
https://hoai2k.github.io/mini/micro/prototypes/tardigrade/ (behind the invite
gate).

## Controls (Xbox; keyboard in brackets)

The shared scheme (`../CONTROLS.md`, read through `../shared/controls.js`):

| Button | Action |
| --- | --- |
| LS (WASD) | Crawl, relative to the view. Push into a leaf edge to reach across to a neighbouring leaf, or round the margin onto the underside |
| RS (arrows) | Turn and tilt the view |
| **A (Space)** | **Scramble**: 0.9 s of fast wave gait (~290 µm/s), recharging over 2.6 s (the `dash` meter); costs ~3.5% water and 2% reserves. With no stick, straight ahead |
| **X (E)** | **Pierce** with the stylets: food in reach (algae, diatoms, detritus) or the living leaf cell under the mouth; at a Milnesium touching you, a jab that makes it back off |
| B (Shift), hold | Grip hard / brace: two legs swing at most, slower, much harder to slip |
| Y (R), hold | Curl into a tun. In a tun on a wet leaf, press again to wake |
| LT / RT (Z / X) | Fine focus down / up through the layers |
| LB / RB (Q / F) | Anatomy labels / rain (test) |
| D-pad ← → (3 / 4) | Optical look: DIC / brightfield / lit (hypothetical) |
| D-pad ↑ ↓ (1 / 2) | Objective 10× / 20× / 40× |
| LS click (C) | Refocus on the animal |
| RS click (V) | New day (test) |
| Menu (Esc) | Features panel: what the prototype is doing, with switches |
| View (Tab) | Hide the help panel |

When dead (eaten or a tun that did not wake), A starts a new day.

## What it does

- **The animal.** Built with `shared/sdf.js` from anatomical parts: head with
  mouth ring, four trunk regions with transverse cuticle folds, eight stubby
  lobopod legs (pairs I–III ventrolateral, pair IV terminal and pointing
  backwards), each foot with two double claws (primary + secondary branch on a
  common base, outer claw larger, Hypsibius-like). Inside, as separate meshes:
  buccal tube, two stylets with supports, pharyngeal bulb with placoids, two
  eyespots, a lobed midgut whose colour follows what was eaten, the gonad, and
  ~80 free storage cells. Rigged by part on the CPU (`creature.js`): legs
  stretch and turn from hip to foot, the trunk carries a lateral wave, bob and
  surge, and the tun contraction.
- **Climbing (`gait.js`).** Discrete footholds: each stepping foot searches for
  the nearest cell wall within ~20 µm (`patterns.js` `snapToWall`) and hooks
  it; junctions and walls across the pull hold best. The gait clock advances
  with distance; the leg phases follow the back-to-front ipsilateral wave with
  the sides in antiphase measured in *Hypsibius exemplaris* (Nirody et al.
  2021), about a third of each cycle in swing. A leg only lifts when its
  neighbours are down; a stretched leg must step; a body that outruns its feet
  is held back and the claws scrape. Grip (sum of hold qualities) is compared
  with what the slope needs: walking fast up the steep leaf C slips unless you
  brace. Leaves are walkable on both faces, at any angle; transfers happen
  where leaves touch or where the film bridges a wider gap.
- **Smooth climbing.** The trunk follows its target through three first-order
  lags in series, so position, velocity and acceleration stay continuous; a
  change of face (a transfer, the margin, a fall) no longer jumps the target
  but blends the old pose out over a smootherstep (0.45–0.8 s), and after a
  transfer every foot steps over to a hold on the new face, back to front,
  instead of being left stretched across the gap. Slipping has hysteresis:
  it starts only below 85% of the load for 0.6 s and catches at 75% (or at
  100% braced) as the claws scrabble. A fall never lands back on the leaf it
  slid off (the old slip–fall–slip loop on leaf C). The camera follows the
  smoothed trunk. Scripted 30 s climbs at a fixed 60 Hz (leaf A to the steep
  leaf C, braced on C; and A to the underside of B): peak trunk jerk fell from
  853 000 to 7 200 µm/s³ (C) and from 2 100 000 to 7 500 µm/s³ (B) at the old
  speed, mean jerk from 1 200 to 350 and from 7 500 to 580 µm/s³, and the
  largest frame-to-frame change in turn rate from 2.3° to 0.2° (C) and 11.6°
  to 2.8° (B). At the new 1.5× speed the C climb peaks at 7 200 µm/s³ too.
- **Speed.** Walking is 1.5× the old pace: up to 150 µm/s (~0.4 body
  lengths/s), inside the 79–263 µm/s Nirody et al. measured. Stride and swing
  timing follow speed, so footfalls stay matched to the wave.
- **Scramble (A).** The speed limit rises to ~290 µm/s with a fast pick-up,
  strides lengthen up to 35% and swings shorten to 90 ms, keeping the
  back-to-front wave. It costs water and reserves; too weak (reserves under
  4%) it refuses.
- **Milnesium (`predator.js`).** A second Walker and Creature at 1.5× scale,
  with a wide buccal tube and no placoids (true of *Milnesium*), a browner
  gut and a slightly denser cuticle. It wanders until you come within
  ~650 µm, then stalks you at up to ~205 µm/s (faster than your walk, slower
  than your scramble) and bites when its mouth reaches you: −20% reserves
  each, and empty, you are eaten. Escape by scrambling away, by retreating
  into film too thin for its bigger body (below ~3.5 µm of water it barely
  moves; you still can), by jabbing it with the stylets (X) so it backs off
  for 2.4 s, or by curling into a tun (Y): it cannot get a tun into its mouth
  quickly and gives up after three tries. It ignores slope load (it never
  slips).
- **The Drying (`life.js`, `world.js`).** Each leaf has a film-capacity field
  (wetter towards the stem, in hollows and where leaves nearly touch; margins
  dry first); film = capacity − dryness, which rises through the day. Dry leaf
  drains the water meter; empty, it forces a hasty tun. Food: algae, diatoms,
  detritus in the film, or living leaf cells (Sphagnum hyaline cells are dead
  and empty; the costa has nothing to suck). A tun on a dry leaf skips ahead to
  the next rain (1–3 days), the patch is reshuffled, then it rehydrates
  (7 s) and might not wake: the chance falls after a hasty tun, on low
  reserves and after long droughts.
- **Delivered art.** MP-T01..T04 are used when delivered. `wallmap.js` reads
  the leaf micrographs: walls by gradient threshold, a chamfer distance
  transform for "distance to wall", flood-filled cells. So the claws hook the
  walls in the picture and an eaten cell empties as a whole. The shader takes
  colour from the photo (relative to its mean colour, so only chloroplasts
  tint) but relief from the wall map, so DIC relief keeps this microscope's
  shear direction. Procedural cells (and canvas stand-ins for the atlas and
  backdrop) are the fallback.

## Rendering

DIC is the main look, implemented as the reusable technique
`shared/techniques/tardigrade-dic.js` (its header documents the interface):

1. Every transparent object is drawn additively into two float targets at
   once (MRT): Σ Δn·thickness, Σ depth·thickness, Σ thickness, and
   absorbance. Thickness comes from closed meshes (front faces subtract their
   depth, back faces add it). The leaf shader adds walls, chloroplasts and the
   water film per pixel; the film shows as menisci (thickness rises as √h from
   the contact line) rather than as blue water.
2. Leaves and specimen are separate layers, each defocused by its own mean
   depth from the focal plane (gather blur): fine focus moves through them.
3. Composite: I = sin²(π(Γ_bias + shear·∂OPD/∂s)/λ) at three wavelengths,
   times exp(−absorbance), with soft saturation for steep steps, grain and a
   vignette. Brightfield and a lit "hypothetical immersive" view are there to
   compare. On software GL (SwiftShader in headless checks) the page drops to
   a low-resolution path; on real GPUs quality adapts to the frame rate.

## Features (Menu panel)

Rendering: optical look (DIC / brightfield / lit), optical-path buffers
(fixed), camera grain, vignette, out-of-focus backdrop (MP-T03).
Optics: shallow depth of field, three-wavelength interference, shear × bias
strength, shear direction.
World: cell walls as optical path, chloroplasts, water film, contact-line
steepening, footholds read from delivered micrographs (fixed), drifting
particles (MP-T04).
Body: SDF body from parts (fixed), internal anatomy visible, claw size
(enhanced / true), part rig (fixed).
Motion: soft-body sway and surge, leg coordination (measured back-to-front
wave / front-to-back / pairs in step), claws need cell walls, slope load and
slipping.
Simulation: time compression (240× / 60× / 1440× / paused), desiccation,
revival risk, film capacity field (fixed).
Simulation also has Milnesium (the predator, on).
Motion also has the scramble (fixed) and smoothed trunk and camera (on; off
is the old single lag).
Controls: anatomy labels, rumble (claw catch, slips, scramble, bites),
camera-relative crawl (fixed).

Technique module: `shared/techniques/tardigrade-dic.js` (DIC and brightfield
with a focal plane; `opticalMaterial`, `OPTICAL_*` building blocks for custom
optical shaders, `DicMicroscope`).

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
| `semMite` (+ `semMiteMode`: SE / BSE / false colour) | mite | The real geometry (deformed body, claws, leaves, detritus) drawn into the SEM G-buffer at 100 µm per scene unit; leaf cell walls are drawn per pixel by the optical shader, so the SEM sees bare leaf slabs |
| `opticsAmoeba` (+ `opticsAmoebaMode`) | amoeba | The DIC buffers (after the focal-plane blur) through the amoeba's optics |
| `microscopeParamecium` (+ `microscopeParameciumMode`) | paramecium | The same buffers through the paramecium microscope |
| `miteGait` | mite | The mite's alternating tetrapod offsets on the eight lobopods (overrides Leg coordination while on) |

The field looks need the optical materials, so choosing the Lit look turns
them off.

Not borrowed:

- Paramecium squirmer and low-Re helpers: the tardigrade crawls on claws; it does not swim.
- Paramecium cilia: tardigrades have none.
- Amoeba soft body: a 2D area-conserving outline cannot drive a legged 3D body with a part rig.
- Mite two-bone IK: lobopods are telescoping, unjointed legs; the part rig already stretches them hip to foot.

## Departures (labelled)

- **Time:** the day runs 240× by default (1 s = 4 min). Walking and feeding are
  real time; tun formation (4 s) and rehydration (7 s) are minutes to hours in
  life (Halberg et al. 2013 for tun formation as an active, muscle-driven
  contraction).
- **Claws** are drawn about 1.6× longer and 3× thicker than true (~10 µm), the
  buccal tube and stylets about 2× thicker, so they survive the mesh and read
  on screen (switchable in Features).
- **DIC relief is optical, not height:** it is the gradient of optical path
  along the shear; dense organelles stand up exactly like ridges. The shear,
  bias and soft saturation are tuned for legibility.
- **Gravity** decides slipping here. At 0.35 mm, surface tension and adhesion
  dominate; the slope load is a game rule (switchable).
- **Leaves** are flat laminae with cells in the shader; real leaves curve,
  and fold in as they dry. Cell sizes are lax-celled (about 20 × 100 µm
  procedural, ~30 × 60 µm with the delivered art).
- **Speed:** up to 150 µm/s walking (~0.4 body lengths/s) and ~290 µm/s
  scrambling; Nirody et al. measured 79–263 µm/s, so the scramble is a
  stretch.
- **Milnesium's rules** are game rules: the sensing range, its speed, the
  −20% bites, the thin-film refuge threshold, backing off after a stylet jab
  (tardigrades do not really fight back this way) and giving up on a tun
  after three tries (a tun's hardness against *Milnesium* is not measured).
  It is drawn as this prototype's animal at 1.5× with a wider buccal tube and
  no placoids, not as a separate *Milnesium* model (no peribuccal papillae,
  different claws).
- **Not added yet:** rotifers or nematodes as moving prey or competition.
- **Revival** odds are invented to make the choice matter.

## Sources

- Nirody JA, Duran LA, Johnston D, Cohen DJ (2021). Tardigrades exhibit robust
  interlimb coordination across walking speeds and terrains. PNAS 118(35):
  e2107289118.
- Halberg KA, Jørgensen A, Møbjerg N (2013). Desiccation tolerance in the
  tardigrade *Richtersius coronifer* relies on muscle mediated structural
  reorganization. PLoS ONE 8(12): e85091.
- Research atlas `micro/research/` (S02, S03, S18, S19, S41–S44, S69, S73) and
  `micro/design/zoom-chain-levels.md` Level 2.
- References: `tardigrade-light.png` (Dorathyexplorer, CC BY 4.0),
  `tardigrade-sem.png` (Schokraie et al. 2012, CC BY 2.5), `moss.jpg`.

## Checks

```bash
node micro/prototypes/check.mjs tardigrade
```

Must print `ok tardigrade` with no console errors. `window.__micro` exposes
`scene`, `camera`, `renderer`, `world`, `walker`, `creature`, `life`, `mic`,
`view`, `features`, `predator` and `dash` for scripted checks (`?pr=1` forces
full resolution on software GL).
