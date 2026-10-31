# Mite · SEM prototype

A box mite (Oribatida: Phthiracaridae), about 0.35 mm long, walks through a
few square millimetres of moss cushion, imaged as a scanning electron
micrograph. Built in three.js (`../shared/vendor`), world units are µm.

A predatory mite (Mesostigmata: Parasitidae) hunts in the same moss: run
from it, close up against it, or nip it. The mite climbs over grains, flakes
and stems and pushes through moss blades and hyphae, which bend and spring
back.

Open `micro/prototypes/mite/` (the invite gate is off on localhost).

## Controls (Xbox controller; keyboard in brackets)

The shared scheme (`../CONTROLS.md`, read through `../shared/controls.js`),
with one exception at the owner's request: A jumps, B scrambles and Y closes
up.

| Button | Action |
| --- | --- |
| LS (WASD) | Walk (~420 µm/s), relative to the view. The mite turns toward the stick and walks forward; it climbs grains, flakes and stems and pushes through blades |
| RS (arrows) | Orbit the specimen. Up looks up (the camera swings down toward the floor), down looks down; Features → Controls → Invert camera Y flips it for every prototype |
| **A (Space)** | **Jump**: a 0.13 s crouch, then a hop (~0.17 mm high, ~0.35–0.4 mm long) onto the floor, a grain, a flake or a moss blade (the blade takes the landing and bends); 0.45 s after landing before the next. Borrowed from jumping oribatids (see Notes). **X in the air: the pounce-bite** |
| **X (E)** | Three moves, by what is in reach: **eat** (a spore or hyphal tip: leg I reaches out and holds it to the mouth while the chelicerae work and it shrinks away, 0.9 s); **fight** (the predator or the pseudoscorpion's pincer: rear up with leg I raised, then lunge and snap); **attack** (nothing in reach: a lunge with the chelicerae) |
| **B (Shift)**, hold | **Defend: ptychoidy.** Close into a sealed capsule (the predator's strike slides off; a held mite closing up drops out of the grip); release to reopen |
| **RT (X key)**, hold | **Scramble**: a punchy burst to ~2.1x the walk (~0.88 mm/s), nose down, tight turns, the gait racing (feet still planted) and crumbs kicked up behind; on a stamina meter (`scramble ■■■■■` in the corner: empties in ~1.6 s, refills in ~2.8 s). In a grab's strike window, a scramble breaks out |
| Y (R) | Observer mode (as LS click). At the backdoor (see Landmarks), Y goes back up to the bog surface |
| LS click (C) | Observer mode: SEM data bar and raster lines |
| LB / RB (Q / F) | Walk slowly (~210 µm/s) / hurry (~590 µm/s) |
| D-pad ← → (3 / 4) | Imaging mode: SE (Everhart-Thornley), BSE (low vacuum), SE false colour |
| D-pad ↑ ↓ (1 / 2) | Magnification steps (×1.5) |
| Menu (Esc) | Features panel: what the prototype does, with switches |
| View (Tab) | Hide the help panel |

Rumble: a tick on footfalls, a thump on closing, landing and opening, a kick
on each scramble and jump, a jolt when the predator grabs a leg.

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A moss ambience loop; footfalls (at most ~8 a second), the scramble (B), the jump and its landing (A), closing and opening (Y), the bite (X), moss blades brushing as they bend, and the predator closing in or grabbing a leg.

## Landmarks

Both are built into the moss (`landmarks.js`) and drawn by the SEM like
everything else.

- **Forward: the wet leaf axil** (design §1.6), straight ahead of the start
  view, ~1.8 mm off (`FORWARD`, toward −x, +z). A moss stem 1.5 mm tall with
  its lowest leaf arching out and down to the floor; in the angle between them
  a smooth lens of water, and lying in it a tardigrade tun, a wrinkled barrel
  ~0.2 mm long that swells a little as a mite comes near (rehydration). Any
  player within 330 µm of the water reaches it: `embed.landmark('forward')`,
  once, and again only after everyone has left.
- **Backdoor: a giant springtail at rest**, the creature of the stage above
  (~1.5 mm long, four box mites; `BACKDOOR`, behind the start view,
  ~1.8 mm off). It is solid: mites climb onto it. Dwell beside its head
  (within 380 µm): the game shows "Y: Rise to the bog surface"
  (`embed.near('back', true)`; standalone a quiet prompt of our own, with R
  when no controller is connected). There **Y goes back**
  (`embed.landmark('back')`) instead of closing up; anywhere else Y still
  closes up, and a mite held by the predator can still close up there.
- **Edge arrows** (`shared/landmark.js`): a brass chevron toward the water,
  a ring toward the springtail, near the edge of each view.
- The predatory mite now starts to the side of the way on (`PRED_START`).

## Multiplayer

Up to four players (`shared/players.js`, `../CONTROLS.md`): player 1 on the
keyboard and the first controller, players 2–4 join at any time by pressing
any button on another controller (a toast; in the game `embed.join`). In the
game the roster comes in from the shell (`embed.players`).

- Each player is a box mite of their own, with their own scramble, wounds and
  footfalls; a faint ellipse of their colour and a "P2" tag mark them (the
  SEM has no colour). Everyone uses the shared controls; RS from any player
  orbits the shared camera, player 1 also has magnification, imaging mode and
  observer mode.
- **Split screen** (`shared/splitscreen.js`): together, one view on the
  group (a little wider as it spreads); apart, LEGO-style split views, each
  with the cutaway cleared toward its own players. The SEM composite ends on
  the screen, so the split copies each view (`capture`); split views render
  at 70% resolution (55% when split three or four ways).
- **The predator** goes for the nearest player. A caught player plays the
  whole catch (and can still close up to slip free); with company there is no
  Eaten card: they come back beside a teammate. Alone, the Eaten card and
  restart are as before.
- Test hooks on `window.__micro`: `players`, `split`, `layout`, `recs()`,
  `teleport(slot, x, z)`, `settle(n)`, `landmarks`, `landmarkLog`,
  `nearBack`, `joins`, `forceCapture(slot)`.

## Fighting back

Shared rules (`shared/predation.js` `createFight`; B is defend in every world).

- **Calm vs attacking.** A calm predatory mite wanders at an easy pace and
  stops to groom; hunting, it is fast and turned on you. Before each strike
  it **rears, leg I and the palps up, the chelicerae open** (0.8 s; the
  banner says so), then lunges (`predator.js`: wander, hunt, windup, strike,
  recover, recoil, retreat).
- **Block:** close up (B): the strike slides off the capsule, it recoils.
- **Bite back:** X with it in reach: rear up, then lunge and snap. Blocks and
  bites each take about a third of its interest (facing it close by wears it
  slowly too); out of interest it runs off and rests.
- **The pounce-bite (a game stretch):** X while jumping dives at the nearest
  enemy point ahead (homing as it moves), a strong bite on impact (two bites'
  worth, a hit-pause, crumbs, a rumble), then a hop back; a mistimed dive is a
  clear miss.
- **A grab:** three leg grabs and it holds on (strike, hold, eat: pulled in
  and swallowed between the chelicerae); scramble (RT) in the strike window,
  or close up (B) before it eats, to slip free. Eaten, the camera pulls back
  and follows the predator for a couple of seconds, a fade, and you are back
  beside a teammate or (alone) at your last safe spot.

## The boss: a pseudoscorpion

`boss.js`; `micro/design/bosses.md`. *Neobisium*-like, ~2.5 mm (seven box
mites), lying in wait before the wet leaf axil (between the start and the
water), **dormant** until a player comes within 1.25 mm after the calm
opening. Built from anatomy (MP-R15 is requested, not delivered): carapace
with eye spots, a flattened ringed abdomen (no tail), eight legs, long
pedipalps with chelae (hand, fixed finger, movable finger with the venom
tooth), long tactile setae.

- **Tell:** the pincers held **open and dead still** (0.9 s; 0.7 s before a
  sweep). Then one of three attacks: a **snap** straight ahead, a **sweep**
  of both pincers in from wide, or a **step-in** and snap when you hang back.
  It keeps its distance at the edge of its reach.
- **Counters:** stay out of reach; **close up (B)** to survive a grab (the
  venom tooth cannot get through); **scramble (RT)** out of a grab in its
  strike window; in its **recovery** (pincers lowered, 1.3 s) bite its pincer
  joints (X, double) or pounce-bite them. About three good rounds and it
  **backs into the moss**: the way is open.
- Its resolve is a quiet brass gauge; the camera widens to keep its pincers
  in frame. In multiplayer it goes for the nearest player or whoever bit it
  last. A grab that is not escaped is eaten whole and followed as above.
- Test hooks: `bossFight(slot)`, `bossBite(slot)`, `boss`, `jumpAt(slot, x, z)`,
  `impact(slot)`; for the fights `setFoe`, `nudgeFoe`, `calm`, `me`, `feed`,
  `fightLog`.

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
- **Speed**: walking is ~720 µm/s, twice the old hurry pace (at the owner's
  request), with slow ~360 and hurry ~1 mm/s. Strides lengthen up to 1.5×
  with speed (118 → 177 µm) so the legs don't flicker, and the gait phase
  runs on distance, so the feet stay planted: a scripted 3 s walk measured
  ~680 µm/s over the ground and 0 µm of stance-foot slip.
- **Scramble (B)**: the speed limit rises to ~1.3 mm/s with a fast
  acceleration (tau 0.05 s). The legs cycle faster and the stance feet stay
  planted (swings shorten to 80 ms). A stretch: box mites are slow, steady
  walkers.
- **Jump (A)** (`jump()` in `mite.js`, modes `crouch` and `air`): the body
  sinks ~75 µm over 0.13 s, then launches at 1.25 mm/s up and 0.7 mm/s
  forward (plus half the running speed) under the game gravity. In the air
  the hind legs kick back and then all legs reach down; the body noses up and
  then down. Rigid things ahead (stems, grains) bounce it back; blades bend
  out of its way. It lands on whatever is below (floor, grain, flake or
  blade), sinks briefly into the landing, and a blade it lands on takes a
  downward kick and bends (scripted landings bent blades 250–290 µm at the
  tip). From a standstill on open floor: ~290 µm high, 690 µm long, 1.1 s in
  the air.
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

## Size

The box mite is ~0.35 mm long (the Level 1 spec asks for ~270–390 µm; box
mites range ~0.3–1 mm). Its anatomy is modelled at ~0.6 mm in `mite.js` and
placed with `createMite(..., { scale: 0.58 })`: the body, legs, setae,
stride, hop and speeds all scale together and the gait still runs on distance,
so the feet stay planted. The moss (blades, stems, grains, hyphae, spores) is
at its true size, so it is now relatively larger: more of a forest. Collisions
are cast against the world at its true size (a scaled view of the colliders).
The predator stays at ~0.8 mm, more than twice your length; the springtail
(1.5 mm) is ~4× longer, and you are about the tardigrade's size.

## Threats and pacing

The predatory mite follows the shared pacing in `shared/predation.js`:

- **A calm opening.** It starts ~1.3 mm away and for the first 45 s (and
  again after every restart) it only wanders: even bumping into you, it
  ignores you.
- **Hunger comes and goes.** Then it is hungry for ~18–32 s at a time and
  rests in between: 45–75 s after eating you, 15–30 s after you slip free,
  lose it, or it gives up on your closed capsule. Hungry, it wanders toward
  you and hunts on touch or a nearby scramble; resting, it ignores you. A
  banner at the top says when it is hungry or hunting.
- **Every catch is shown.** Its first two grabs at your legs stun you
  briefly; on the third it holds on and the catch plays, the camera closing
  in side-on with a red banner naming the phase: **strike**, it seizes a leg
  with its chelicerae; **hold**, it pulls you in and lifts you, legs kicking;
  **eat**, the chelicerae work at the soft body by the legs, which go limp
  and fold, and you sag; **eaten**, the Eaten card (A restarts, with the calm
  opening again).
- **Closing up still saves you**: hold Y during the strike or the hold and you
  seal into the capsule, drop out of its grip, and it gives up.

Features → Simulation → **Calm opening** (45 s / 20 s / 90 s / off) and
**Predator hunger** (comes and goes / always / never) for testing.
`window.__micro.forceCapture()` plays a catch; `__micro.pacing()` reports
hunger and state.

## The predator (`predator.js`, `PRED` in `mite.js`)

A parasitid (Mesostigmata: Parasitidae, *Pergamasus* / *Parasitus* type):
a pale, flattened oval about 0.8 mm long with one dorsal shield, a
transverse seam, peritremes and rows of fine setae, a projecting gnathosoma
with long, stout chelate chelicerae (an open chela, the movable digit hooked
below; brought toward `assets/reference-sheets/predatory-mite-v2.webp`, as
is the broader shield) and palps, and long legs. Leg I is held up and
forward as a feeler and taps ahead; legs II–IV walk with the same walker and
gait as the box mite (createMite with the `PRED` anatomy), so it climbs and
pushes through blades the same way.

- Only when hungry (see Threats and pacing): it wanders toward you until it
  touches you (~480 µm centre to centre) or feels you scramble close by
  (~950 µm), then runs you down at ~0.6 mm/s: faster than your walk
  (~0.42 mm/s), slower than your scramble (~0.75 mm/s).
- It strikes at legs first: each grab stuns you for 0.7 s and slows you 15%;
  a grabbed leg recovers after 20 s; the third grab holds on and it eats you
  (the catch above).
- Closed up (Y), you are a smooth, hard capsule it cannot grip: it gives up
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
- A **per-object cutaway** keeps moss from hiding the mite without
  clipping it (`createObjectCut` in `../shared/techniques/mite-sem.js`).
  Every leaf, stem and litter flake carries an id in a `cutId` vertex
  attribute and a centre line (a leaf's midrib, following its bend; a stem's
  axis). Each frame the centre lines are tested against the camera-to-mite
  line: an object passing within 340 µm of it, more than 110 µm in front of
  the mite, dissolves as a whole (a dithered fade over ~0.2 s, back the same
  way); a stem in the way takes its leaves with it; what the mite stands on,
  and that leaf's stem, are never cut. The old cut was a cylinder in view
  space (radius 380 µm + 6% of the field, so ~630 µm zoomed out) that
  discarded fragments: it sliced leaves and stems with hard edges and, as
  the camera orbited, cut pieces off plants and left leaves hanging from
  removed stems. That was the "clipping of plants when zoomed out" (the
  near/far planes, depth precision and frustum culling were checked and are
  not involved: the moss is one merged mesh with frustum culling on a
  bounding sphere of the whole patch, and the near plane at 8% of a ≥4 mm
  working distance is never reached). Hyphae and spores are no longer cut
  (too thin to hide anything). The cylinder remains for geometry without
  ids.
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
| Rendering | Observer mode | off (LS click) |
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
| Simulation | Game walking speed | always |
| Simulation | Scramble (B) | always |
| Simulation | Jump (A), borrowed from jumping oribatids | always |
| Simulation | Bite and graze (X) | always |
| Simulation | Predatory mite (Parasitidae) | on |
| Simulation | Calm opening: 45 s / 20 s / 90 s / off | 45 s |
| Simulation | Predator hunger: comes and goes / always / never | comes and goes |
| World | Moss shoots, mineral grains, litter, hyphae, spores and pollen | on (each; off also removes it from walking) |
| World | Procedural SEM textures | always |
| Controls | Camera-relative walking | always |
| Controls | Rumble | on |
| Controls | Invert camera Y (shared by every prototype) | off |

Technique modules other prototypes can borrow:

- `../shared/techniques/mite-sem.js`: the SEM G-buffer materials and
  composite (SE, BSE, false colour; per-term switches; the cylinder cutaway
  and the per-object cutaway `createObjectCut`).
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
  speed (~720 µm/s) is a game speed, several times what an oribatid walks
  (a few hundred µm/s at most), so the moss can be crossed in good time; the
  scramble (~1.3 mm/s) and the predator (~0.9 mm/s) are scaled to match.
- **The jump is borrowed.** Box mites (Phthiracaridae) do not jump. Some
  oribatids do: *Zetorchestes* (Zetorchestidae) jumps with enlarged, elongated
  hind legs and a catch mechanism (Krisper 1990, 1991), and the ptychoid
  *Indotritia* (Oribotritiidae), a box-mite relative, jumps backwards using a
  catch mechanism in its forelegs (Wauthy et al. 1998, Proc. R. Soc. Lond. B
  265: 2235–2242). The game's forward hop, its height and its cooldown are
  game values.
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
