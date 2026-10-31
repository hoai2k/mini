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
flow, and slow tumbling when idle. Steering turns the baseplate and long attachment
fibres toward the movement direction, with the head following behind. Release the stick and only Brownian motion and the flow
remain. *Features → LS drift → Honest* turns the open-water drift off.

The phage’s water remains a shallow XY slab. LS already supplies analog drive
and direction relative to the view; its attachment end leads. The camera now
follows that travel heading within the plane when RS is not overriding it,
while RS retains the 3D orbit. Idle Brownian tumbling does not spin the camera.

## Controls

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Xbox | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | **Drift legs-first** (a labelled departure); steer the attachment fibres toward a protein |
| RS | Arrows | Orbit the view. Manual RS look holds for 0.45 s after release, then the camera eases back to the swimming heading |
| **A** | Space | **Dash**: a passing *current gust* in open water, or a *push-off* with the fibres from a surface (both departures; recharging, HUD `dash` meter) |
| **X** | E | **Grab protein**: aim the leading attachment fibres at a protruding protein and press X. The large gold three-lobed receptors fit; violet paired proteins do not. Both can be grabbed: the fibres converge for 0.45 s, then a mismatch slips off with a small recoil and a 0.25 s retry delay. A match latches and automatically starts the existing irreversible attachment: short fibres bind, baseplate opens, sheath contracts and DNA enters (camera close-up and shake on the snap). No automatic cell-contact attachment or hidden three-foot requirement. **At an amoeba's lobe: a fibre jab** (a departure, below) |
| B | Shift | **Defend: fold the fibres** back against the sheath and slip: an amoeba's lobe gets no purchase, clay and wrong hosts slide past; also lets go of a host. Press again to extend them (ready to grab receptors with X; clay still catches them) |
| Y | R | **At the flagellum (the backdoor)**: back to the sediment (Level 5). Elsewhere: the odds and receptor overlay: receptor patches ringed, each host's receptors, defences and odds of a burst, the UV line, the amoeba's hunger, your distance to the nearest host; inside, each enzyme's sensing range. Marked on screen as data, not optics |
| D-pad ←→ | 3 / 4 | Look: Goodsell watercolour, cryo-EM greyscale, fluorescence (pseudo-colour) |
| D-pad ↑↓ | 1 / 2 | Zoom in / out |
| Menu | Esc | Features panel |
| View | Tab | Hide or show the controls |

Inside the host, LS steers the DNA's leading end and A is a short *surge* (the
strand pulled in faster; a departure).

**Goal.** Drift legs-first, grab a gold three-lobed receptor to attach, and get
the whole genome (169 kbp, shown as a progress bar) into the cell past its
restriction enzyme and CRISPR complex. Success: the host bursts with 40 new
phages. The odds overlay says which host is the better bet: Host A (no
matching CRISPR spacer) or Host B (a matching spacer: its CRISPR complexes
hunt hard, a near dead end). The third cell is the wrong host.

## In the game, landmarks and players

- **Micro Zoom shell** (`micro/game/`, through `shared/embed.js`): embedded,
  the world skips its opening toast (the shell's intro has said it), the
  shell's pause freezes everything (embed.js holds the frames; the sound
  stops), and Menu posts `menu`.
- **Forward: the win.** The phage is the last world, so there is no next
  stage; the shell's README treats `landmark('forward')` from the last world
  as the ending (its "The end of the light" screen). After the burst plays,
  the world posts `landmark {kind: 'forward', won: true, burst: 40, host}`;
  standalone it shows its own Burst card instead.
- **Back: the flagellum.** In open water above Host B, a flagellum of the
  Level 5 bacterium sweeps past (a turning helix). Drifting within ~0.55 µm
  of it posts `near {kind: 'back', label: 'Y: back to Sediment'}`, and Y
  there posts `landmark('back')`; anywhere else Y is the overlay.
- **Edge marks** (`shared/landmark.js`): a brass chevron toward Host A's
  front OmpC patch (the best odds) and a ring toward the flagellum, per view.
- **Up to four local players** (`shared/players.js`): the roster comes from
  the shell (`embed.players`) or starts as P1 alone; anyone joins during play
  by pressing a button on another controller (posted as `join`). Each player
  has their own phage, its sheath in their colour. The view is the LEGO split
  (`shared/splitscreen.js`, image-plane offsets for this free-floating 3D
  world, with `capture` since the Goodsell pass draws to the screen): one view
  together, split as phages drift apart. The amoeba hunts the nearest phage;
  UV acts on each. A caught player plays the whole sequence, then drifts back
  in beside a teammate (no card; `captured` is posted); solo keeps the card.
  One player at a time can commit: the inside phase is a single shared view
  steered by the player who injected, while the others wait outside. Any
  player's camera stick, look and zoom buttons work.

## Threats and pacing

- **A calm opening.** The amoeba waits at least 45 s (`createHunger`) and the
  UV is only near the top, so you can drift and explore first. The phage
  starts in clear water well below the UV line.
- **The amoeba's edge** (left), fought with the shared `createFight`: when
  hungry it reaches a pseudopod lobe toward you (stalk), then **rears and
  curls it** (the wind-up, 1.1 s: the lobe swells and flushes rose, its lips
  spread wide and quiver, the tip lifts sideways, and the stats say WINDING
  UP), then lunges (strike). **Fold your fibres (B)** and the strike slips off
  you (blocked: it staggers back); a **fibre jab (X)** near the lobe makes it
  recoil and pushes you off; **facing it** (your baseplate end, or the stick,
  toward it) slowly wears its interest down. Interest at zero: it draws the
  lobe back and leaves (retreat), and rests. *Amoebae grazing viruses is
  [Unverified] in the spec.*
- **UV** (top): your integrity erodes in the UV-bright water; bound to the
  clay platelet you are shielded [S103, S104].
- **Clay / peat platelet**: extended fibres stick to it [S103]. A trap, but
  a shelter from UV. Fold the fibres (B) to slip free.
- **The wrong host**: a Gram-positive with no outer membrane and no OmpC. The
  fibres slide off; fold them to pass cleanly.
- **Inside: the boss, a CRISPR-Cas complex** (type I: Cascade, the blue Cas7
  backbone on its red crRNA guide, with Cas3, the amber nuclease-helicase, at
  one end; `micro/design/bosses.md` [S101]). It **slides along the host DNA
  scanning**; while your DNA's free end is within its range its match builds,
  and **its guide RNA glows** brighter (the tell; the brass gauge's lower bar).
  At a full match it leaves the host DNA and closes in. Reaching your end, it
  **binds** (the guide blazes, a halo, Cas3 swings in: the wind-up, 1 s), then
  Cas3 chops. Pull your end away in time (LS, A to surge) and it is a **near
  miss**: it loses its grip and some interest; three near misses and it lets
  go and drifts off for a while. Host B's complexes carry a matching spacer
  (two of them, fast matches); Host A's has a partial match (one, slow). The
  restriction enzyme is a lesser hazard. Get the whole genome in (the gauge's
  upper bar) and the host bursts. Lead your end away; the strand piles up and
  feeds more slowly if you just sit by the pore. **Multiplayer:** only one
  player can be inside a host at a time, so Cas always targets that strand.

**Being caught always plays a sequence** through the shared `createCapture`
(strike, hold, eat, follow, fade out, respawn, fade in; a caption names what
happened). Solo or not, you drift back in at the start, or beside a teammate
in multiplayer:

- *Engulfed:* the lobe's lips close round you and draw you in; the camera
  pulls back and the amoeba turns translucent so you watch it swallow you
  whole in a food vacuole, then the camera follows the vacuole as the
  cytoplasm streams it along the amoeba's edge.
- *Fried by UV:* a violet flash, the head darkens, cracks open across the
  capsid and the DNA leaks; the camera pulls back as the broken shell drifts.
- *DNA cut:* by Cas3 (the guide holds the strand, Cas3 cuts, a red flash),
  then the camera follows Cas3 as it chews your DNA back toward the pore; or
  by the restriction enzyme's blades, which then slide off along the host DNA.

## Checks

```bash
node --test micro/prototypes/phage/binding.test.mjs
node micro/prototypes/check.mjs phage
node micro/game/check.mjs
```

The smoke check opens the page in headless Chromium, drives the keyboard and
fails on any console error. `window.__micro.debug` has hooks for scripted
screenshots: `teleport`, `orient`, `isolate` (the phage alone, for
turnarounds), `cam(yaw, pitch, dist)`, `fold`, `walkOn(hostId, u, phi)`,
`grab` (the normal aimed grab), `commit` (bypass from a debug walk), `inside(hostId)`, `win`, `capture('amoeba' | 'uv' | 'cut')`,
`hungry`, `overlay`, `look`, `zoom`, `reset`, `place(slot, x, y)`, plus
`maxDt` and `pause`; `debug.fight` (the amoeba's fight state and interest) and `debug.boss()` (the CRISPR-Cas state, match, distance). `window.__micro` also exposes `team`, `players`,
`split`, `nearBack` and `where`.

## Known issues

- `shared/landmark.js` throws on an empty split-region polygon, which
  `shared/splitscreen.js` can emit for a frame while players leave; the
  phage skips its edge marks on such frames.
- The overlay's text labels are placed with the shared camera, so in a split
  they sit in the merged position.
- Software WebGL: four split views cost about 1–3 s a frame in headless
  SwiftShader (each view is a full Goodsell pass); on a GPU it is the usual
  N renders.

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
  tremble. Rotation is a slow random angular velocity; when moving, steering
  turns the attachment fibres to lead; a soft torque follows a gust with the
  same end forward, and another eases the
  phage back toward side-on so it stays readable.
- Prototype debug walking (`walkOn`): the phage stands on its fibres over the host's surface and
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

- **MP-V01** (envelope surface, tileable, delivered) maps onto the hosts
  over a white base (the wrong host keeps a dull tint); **MP-V02** (water
  backdrop, delivered) is one painted plate behind the scene, with a small
  parallax, a 30 % wash toward the water colour so the foreground reads, and
  the depth fog matched to its average colour; **MP-V03** (envelope section,
  delivered) is the inside view's envelope band, showing only its membrane
  rows (12–70 % down the plate). Features → Delivered art off brings back the
  procedural stand-ins (a canvas dot pattern, an fbm wash, a Goodsell-style
  canvas section).`loadTexture` is wrapped so
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
- **The fibre jab**: a phage has no weapon and does not fight. Its fibres
  jabbing an amoeba's membrane so the lobe recoils is a game departure
  (labelled in the toast). Folded fibres slipping off a membrane is a stretch
  of the same idea.
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

### Protein-grab readability

Large surface proteins stand above the small LPS forest without enabling the
observer overlay. Matching proteins have three gold lobes with dark sockets;
non-matching proteins have two violet lobes, so shape also distinguishes them
in cryo-EM greyscale. The aim cone uses the baseplate’s forward direction and
a short reach; it selects by aim, never by compatibility. The start-facing
side of Host A has a matching receptor as well as non-matching proteins.
Colour, size and the explicit player-controlled grab are gameplay cues.
