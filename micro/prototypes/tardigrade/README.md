# Tardigrade · The Drying

A ~350 µm eutardigrade climbing the cell walls of overlapping moss leaves with
its claws, through one compressed day as the water film dries. Seen through a
DIC (Nomarski) microscope with a real, shallow focal plane. Published at
https://hoai2k.github.io/mini/micro/prototypes/tardigrade/ (behind the invite
gate).

## Controls (Xbox; keyboard in brackets)

| Button | Action |
| --- | --- |
| LS (WASD) | Crawl, relative to the view. Push into a leaf edge to reach across to a neighbouring leaf, or round the margin onto the underside |
| RS (arrows) | Turn and tilt the view |
| LT / RT (Z / X) | Fine focus down / up through the layers |
| LS click (C) | Refocus on the animal |
| LB / RB (Q / F) | Objective 10× / 20× / 40× |
| A (Space), hold | Grip hard / brace: two legs swing at most, slower, much harder to slip |
| B (Shift) | Bite: stylets into food in reach (algae, diatoms, detritus) or the living leaf cell under the mouth |
| Y (R), hold | Curl into a tun. In a tun on a wet leaf, press again to wake |
| X (E) | Optical look: DIC / brightfield / lit (hypothetical) |
| D-pad ↑ / ↓ / ← (1 / 2 / 3) | Rain (test) / new day / anatomy labels |
| View (Tab) | Hide the help panel |
| Menu (Esc) | Features panel: what the prototype is doing, with switches |

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
Controls: anatomy labels, rumble on claw catch, camera-relative crawl (fixed).

Technique module: `shared/techniques/tardigrade-dic.js` (DIC and brightfield
with a focal plane; `opticalMaterial`, `OPTICAL_*` building blocks for custom
optical shaders, `DicMicroscope`).

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
- **Speed:** up to 100 µm/s (~0.3 body lengths/s); Nirody et al. measured
  79–263 µm/s.
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
`view` and `features` for scripted checks (`?pr=1` forces full resolution on
software GL).
