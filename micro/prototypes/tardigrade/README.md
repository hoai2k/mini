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
| RS (arrows) | Turn and tilt the view. Up looks up (the camera swings down toward the leaf's edge-on view), down looks down; Features → Controls → Invert camera Y flips it for every prototype |
| **A (Space)** | **Scramble**: 0.9 s of fast wave gait (~400 µm/s), recharging over 2.6 s (the `dash` meter); costs ~3.5% water and 2% reserves. With no stick, straight ahead |
| **X (E)** | **Pierce** with the stylets: food in reach (algae, diatoms, detritus) or the living leaf cell under the mouth; at a Milnesium or Prionchulus, a jab with a head thrust that bites back |
| B (Shift), hold | **Defend**: grip hard / brace (two legs swing at most, slower, much harder to slip). Facing a predator as it lunges, it blocks |
| Y (R), hold | Curl into a tun. In a tun on a wet leaf, press again to wake. In the leaf axil (the backdoor) Y goes back up to the mite instead |
| LT / RT (Z / X) | Fine focus down / up through the layers. Auto-focus keeps the focal plane on the animal: a manual setting holds while you stand still and eases back onto the animal once you walk on (Features → Optics → Auto-focus) |
| LB / RB (Q / F) | Anatomy labels / rain (test) |
| D-pad ← → (3 / 4) | Optical look: DIC / brightfield / lit (hypothetical) |
| D-pad ↑ ↓ (1 / 2) | Magnification 10× / 12.5× / 20× / 40× (12.5× is the 10× objective behind a 1.25× Optovar magnification changer). It starts at 12.5× (1.6× the 20× field) so the leaf, the film and the surroundings read while the animal, centred and in focus, stays the clearest thing in view |
| LS click (C) | Refocus on the animal |
| RS click (V) | New day (test) |
| Menu (Esc) | Features panel: what the prototype is doing, with switches |
| View (Tab) | Hide the help panel |

When dead (eaten or a tun that did not wake), A starts a new day.

## Fighting back, eating, being eaten

- **Milnesium fights readably** (`predator.js`, `shared/predation.js`
  `createFight`). Calm (wandering or resting) it creeps with its mouth shut.
  Hunting, it stops a little short of you and **winds up**: it rears its
  front, the mouth ring opens wide (`pose.gape`) and the stylets protrude, a
  0.9 s pause with a red banner, then **lunges**. Facing it and bracing (B)
  blocks the lunge: it staggers back and you shove its head away. A stylet
  jab (X) at its head bites back: it staggers. Facing it, blocks and jabs wear
  its interest down; at none left it turns and crawls off, then rests. An
  unblocked lunge bites (−25% reserves); empty, you are caught.
- **Your moves** (`fightPose` in `main.js`): the attack is a stylet jab with a
  head thrust (also how every bite starts); defending (B) crouches, head drawn
  in and down; a block butts its head away; a landed jab recoils a little.
- **Eating** (`animateEating`): food is drawn to the mouth, through the buccal
  tube and pharynx and into the gut, visible all the way through the
  transparent body. There it slowly shrinks and fades over ~9 s, tinting the
  gut's colour as it goes. A pierced leaf cell becomes a green bolus of
  chloroplasts that does the same. Labelled departure: inside, food is drawn
  up to 4× denser than it is so it reads at these magnifications.
- **Being eaten** (`createCapture`, no card): strike, hold, then the camera
  pulls back to watch Milnesium swallow you whole (you stay visible inside its
  transparent body) and follows it for a couple of seconds as it crawls off;
  a fade, and you wake at whichever start spot is furthest from it (in
  multiplayer, beside a teammate).

## The boss: Prionchulus (`nematode.js`)

A predatory nematode, *Prionchulus muscorum*, a real hunter of tardigrades in
moss films (`../../design/bosses.md`), guarding the Sphagnum leaf on the way
to the pool tip. Drawn ~1.3 mm long and 60 µm wide (adults reach ~2 mm: scaled
so the arena fits), a transparent tube with a denser pharynx, a darker
intestine and the large tooth at the head, gliding with a nematode's wave.

- Dormant at its post until a player comes within ~650 µm after the calm
  opening. Awake, a brass **resolve** gauge shows under the banner.
- Two attacks, alternating: **the whip** (the tell: the front coils into an
  S, tooth bared; then the head whips forward) and **the sweep** (the tell:
  the whole body ripples fast; then the head sweeps sideways across you).
- Brace (B) facing it on the strike to block; jab its head (X) in its
  recovery; in thin film (< ~3.5 µm) it flounders and loses heart. A hit
  stabs you (−35% reserves); empty, it pins you with its tooth and sucks you
  dry while the camera follows it dragging you off, then the fade and respawn.
- Worn down (createFight with more interest), it slides off and down into a
  deep groove between the cells, gone for the rest of the day. It targets the
  nearest player. Features → Simulation → Prionchulus switches it off.

## Landmarks (the way on and the way back)

Both are things in the moss patch (`landmarks.js`), drawn through the same
optics as everything else; `../shared/landmark.js` adds a quiet mark near the
edge of each view when they are off screen: a brass chevron labelled Pool
towards the way on, a hollow ring labelled Moss towards the way back.

- **Forward: the pool tip.** The tip of the Sphagnum leaf below dips into the
  hollow pool, towards the amoeba's pool floor (design §2.6). Beyond it lies
  open water: a slab whose bevelled shore is a bright meniscus line in DIC,
  where the film meets open water, with three green *Paramecium bursaria*
  swimming in it. The film is deep there (the leaf's last ~30% is wet:
  `world.js`). Reaching the last ~250 µm of that leaf, on either face, posts
  `embed.landmark('forward')` (once per visit); standalone, `embed.js` shows a
  toast. From the start it lies right and down: along leaf A, then onto the
  leaf below (a scripted straight walk got there in about 15 s; with feeding,
  the Milnesium and the drying, a few minutes).
- **Backdoor: the leaf axil.** The drier axil above, where leaf A and leaf D
  leave the stem (drawn as a chain of capsules, the overlaps reading as
  nodes), back up to the mite (§1.6). It lies the other way, left along leaf A
  (~0.5 mm, about 30 s). Within ~200 µm of either leaf's base a quiet "Y: Back
  to the mite" prompt shows (the shell's, from `embed.near('back')`, or this
  page's own when standalone), and Y there posts `embed.landmark('back')`
  instead of curling into a tun.

## Multiplayer (local, up to four)

Through `../shared/players.js`, as `../CONTROLS.md` describes: player 1 on the
keyboard and the first controller; players 2-4 join at any time by pressing
any button on another controller (a "Player N joined" toast, and in the shell
`embed.join`). Inside the Micro Zoom shell the roster from its menus is
restored (`embed.players`, the `players` message).

- **Each player is their own tardigrade** (its own Walker, Creature, water,
  reserves, scramble and tun), with a faint tint of their colour in the
  cuticle and a broken ring and name tag in that colour round it. A new
  player appears a body length behind a teammate on the same leaf.
- **One day for everyone.** Player 1's Life keeps the clock, the drying and
  the rain (`life.js`, `clock: false` for the others); another player's tun on
  a dry leaf waits for rain instead of skipping days.
- **Split screen** (`../shared/splitscreen.js`): together, one shared view
  (straight to the screen, as before); apart, the LEGO-style split, each view
  composed by the DIC microscope into its own target (`tardigrade-dic.js`
  `render({ target })`, render scale 0.75; the auto quality drops the optical
  buffers further if the frame rate falls). Any player's right stick turns
  the shared view; the d-pad, LB/RB and the stick clicks are player 1's.
- **Milnesium hunts one player at a time**: the nearest one up and about,
  held unless another is clearly nearer. Only that player's jab (X) drives it
  off.
- **Caught**: alone, the full catch and the Eaten card, as before. With
  others playing, the caught player sees the whole sequence (strike, hold,
  swallowed), then wakes beside a teammate (no card); a tun that did not wake
  comes back the same way on A.
- **The landmarks** trigger for any player.

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A water-film ambience loop; claw footfalls (at most ~8 a second), the scramble (A), stylet bites (X), forming the tun (Y), rehydrating, rain, and the Milnesium stalking and lunging.

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
  to 2.8° (B). At the 1.5× speed the C climb peaked at 7 200 µm/s³ too, and
  at today's 2.25× speed (the same scripts, 60 Hz) C peaks at 7 260 µm/s³
  (mean 550, was 430) and B at 37 080 µm/s³ (mean 1 350, was 1 310; that
  run includes slips and falls), with the turn-rate change unchanged (0.2°,
  0.7°).
- **Low magnification reads.** At 10× and 12.5× the defocus blur per unit
  of distance from the focal plane is stronger (12 and 14 px at 720p, was 5;
  still far less than a real NA 0.25 lens would give), so with the focal
  plane on the animal's mid-depth the leaf surface under it softens and the
  animal stands out with its DIC relief.
- **Speed.** Walking is 2.25× the original pace (1.5× and then 1.5× again,
  at the owner's request): a limit of 225 µm/s (~0.65 body lengths/s),
  inside the 79–263 µm/s Nirody et al. measured; a scripted straight walk on
  leaf A covers ~150 µm/s over the ground (was ~100), because the trunk
  surges with each wave and stretched legs hold it back. Strides lengthen
  above the old 150 µm/s pace (55 µm, up to 35% longer at the walking limit)
  and swings may shorten to 100 ms, so footfalls stay matched to the wave.
- **Scramble (A).** The speed limit rises to ~400 µm/s with a fast pick-up
  (~270 µm/s over the ground), strides lengthen up to ~90% and swings shorten
  to 90 ms, keeping the back-to-front wave. It costs water and reserves; too weak (reserves under
  4%) it refuses.
- **Milnesium (`predator.js`).** A second Walker and Creature at 1.5× scale,
  with a wide buccal tube and no placoids (true of *Milnesium*), a browner
  gut and a slightly denser cuticle. It starts far off, near the tip of the
  steep leaf C (~1.4 mm away, out of the 10× and 12.5× fields and above the focal
  plane, so at most a defocused shape), and for the first 40 s it only
  browses there, so there is time to explore. Then it hunts: it heads for
  you at under half speed, coming into view from the edge of the field, and
  within ~650 µm stalks at up to ~270 µm/s (faster than your walk, slower
  than your scramble). Its mouth on you is a bite: −20% reserves, and empty,
  it swallows you (see Threats and pacing). After a bite it lets go, backs
  off for 2.2 s, keeps its distance and rests 45–75 s before it is hungry
  again (it no longer bites every
  1.3 s while in contact). Escape by scrambling away, by retreating into
  film too thin for its bigger body (below ~3.5 µm of water it barely moves;
  you still can), by jabbing it with the stylets (X) so it backs off for
  2.4 s and then keeps off for 7 s, or by curling into a tun (Y): it cannot
  get a tun into its mouth quickly and gives up after three tries. It
  ignores slope load (it never slips). Measured (scripted at 30 Hz from a
  new day): idle, it starts hunting at 40 s, comes within the 10× field at
  ~52 s, starts stalking at 58 s and first bites at 61 s; walking about the
  leaves, 55 s in view and first bite at 63 s; walking straight at it, it is
  in view from 18 s but still only hunts at 40 s (first bite 47 s). Bites
  then come 21–28 s apart (was 1.3 s).
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

## Threats and pacing

*Milnesium* follows the shared pacing in `shared/predation.js`:

- **A calm opening.** It starts far off on the tip of leaf C (~1.4 mm away)
  and browses there for the first 40 s of each day.
- **Hunger comes and goes** (`createHunger`): then it is hungry for ~30–45 s
  at a time (once it is stalking you it sees the hunt through) and rests in between: 45–75 s after a bite, 15–30 s after a jab,
  after losing you or after giving up on a tun. Only a hungry *Milnesium*
  closes in, stalks and bites; resting, it browses or keeps off. A banner at
  the top says when it is closing in or stalking.
- **Bites drain, the last one is the catch.** Each bite takes 20% of your
  reserves and it lets go and backs off. A bite that empties them plays the
  whole catch, framed closer (about the 20× field) on you and its head, with
  a red banner naming the phase: **strike**, its mouth tube and stylets lunge
  onto you; **hold**, it grips with the stylets out while you writhe and its
  pharynx starts to pump; **eat**, you are drawn head first in through the
  mouth and pharynx, swallowed whole (a real *Milnesium* habit: it swallows
  small prey whole or sucks them out), and lie curled in its gut, visible
  through its cuticle; **eaten**, the card. A starts a new day.

Features → Simulation → **Calm opening** (40 s / 20 s / 90 s / off) and
**Milnesium hunger** (comes and goes / always / never) for testing.
`window.__micro.forceCapture()` plays the catch; `__micro.pacing()` reports
hunger and state; `__micro.paused` with `__micro.testStep(dt, stick)` steps
the simulation by hand.

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
Simulation also has Milnesium (the predator, on), the calm opening (40 s /
20 s / 90 s / off) and Milnesium hunger (comes and goes / always / never).
Motion also has the scramble (fixed) and smoothed trunk and camera (on; off
is the old single lag).
Controls: anatomy labels, rumble (claw catch, slips, scramble, bites),
Invert camera Y (shared by every prototype, off), camera-relative crawl
(fixed).

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
- **Speed:** up to 225 µm/s walking (~0.65 body lengths/s) and ~400 µm/s
  scrambling; Nirody et al. measured 79–263 µm/s, so the walk is at the
  fast end and the scramble is a stretch.
- **Milnesium's rules** are game rules: the calm start, the slow approach,
  backing off after a bite, hunger that comes and goes, the sensing range, its speed, the
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
full resolution on software GL), plus `players`, `animals`, `split`,
`layout`, `places` (the landmarks), `landmarks.log` (every landmark and near
posted), `teleport('forward' | 'back', slot)`, `place(slot, leaf, u, v)`,
`forceCapture(slot)`, `boss`, `forceBossCapture(slot)`, `captor`, and
`testStep(dt, stick, { down, pressed })` with button ids. The fight, the eating,
the catches and the boss were checked in Playwright (windup, strike, a block,
jabs driving Milnesium and Prionchulus off, a diatom visible in the gut
fading into it, both catches following the predator and respawning). Multiplayer was checked with mocked gamepads in
Playwright: joins during play, 2 and 4 players splitting and merging, a catch
in multiplayer (respawn beside a teammate, no card), both landmarks standalone
and in the shell.
