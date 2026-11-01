# Phage

Level 6 (optional) of the Zoom Chain, as a playable prototype: be a **T4-like
tailed bacteriophage** in bog water beside its host bacteria. No light
microscope can see a phage (a head of ~0.1 µm against a ~0.2 µm resolution
limit [S17]), so the level is an illustration. Its default look is
**realistic microscopic false light** (`micro/design/phage-visual-style.html`,
references in `micro/design/generated/phage-false-light/`): realistic
biological surfaces and translucent materials lit by an invented light, the
phage glowing gold against teal-blue translucent cells covered in surface
proteins, in a crowded, softly lit molecular water with a large depth of
field. The shapes come from cryo-electron tomography [S99]. David Goodsell's
watercolour manner (the previous default), cryo-EM greyscale and
fluorescence pseudo-colour remain on the D-pad. Published in the prototype archive at
`micro/prototypes/phage/`.

**The revamp (2 November 2026).** The owner found the world sparse and
geometric next to its lush, organic references, the controls weird (a stick
could set the view spinning, as if in gimbal lock), a big empty space as soon
as the camera turned right, and Brownian motion that floated rather than
knocked. Now: the water is packed in every direction with thousands of
bead-cluster molecules drawn as sphere impostors, as real-time molecular
viewers draw them (`shared/techniques/phage-beads.js`, look notes in
[`LOOK.md`](LOOK.md)); the hosts are furred with LPS, porins and membrane
proteins all round; the view turns about its own axes (no up or down, no poles,
and it never turns on its own); and molecules visibly strike the phage and
bounce off, each knock a small push and a little spin (`kicks.js`).

**LS drives the phage; let go and the water has it.** A real phage has no
motor: it diffuses until it touches a receptor [S100]. At the owner's request
the sticks still move it, as a labelled departure: LS drifts it across the
view (the view's right and up, in full 3D), RT into the view and LT back
toward you, a slow, sluggish drift (about 0.3 µm/s on the slowed clock) with
the baseplate and long fibres turning to lead and the head following.
Release the sticks and only the water moves it: molecules strike it now and
then (Brownian motion), the ambient flow carries it, and it tumbles slowly.
*Features → LS drift → Honest* turns the open-water drift off.

**No up or down.** The water is open in all three directions (the old play
slab was ±0.34 µm deep; the field is now ±2.6 µm deep, with a soft current
back beyond its bounds instead of walls). The camera is a quaternion that RS
turns about the view's own axes, so it has no poles to flip at, a held stick
turns it at a steady rate in any orientation, and released it stays exactly
where it is. Only one thing may turn it on its own: an optional, gentle roll
(*Features → Keep the surface up*, on) that keeps the sunlit surface, where
the UV is, toward the top of the screen; it is rate-limited and fades to
nothing looking straight up or down, so it can never spin the view.

### What was wrong (root causes)

- **The spin.** Three faults fed each other. (1) The camera's up vector
  followed the travel heading (`followYaw` toward `P.moveHeading`), while the
  stick's travel direction was computed from the camera's own right and up:
  holding LS sideways set a heading 90° from the camera's up, the camera
  rolled toward it, which turned the stick's direction with it, and so on
  for as long as the stick was held: a steady spin with nothing on RS.
  (2) The phage was aimed with `setFromUnitVectors(UP, -stick)`, a full
  orientation built from a fixed reference, which is singular when the stick
  points up the screen: there the phage flipped and spun about its own axis.
  (3) `camera.lookAt` with that rolling up vector degenerates when RS orbits
  the view toward it (the classic gimbal flip). Now: the view is a
  quaternion turned only by RS (and the bounded levelling roll), the stick is
  read in the view's frame without feedback, and the phage turns by the
  shortest rotation from where its baseplate points now. A scripted test
  drives every LS and trigger direction (the view must not turn at all), RS
  in every direction with LS held, and checks everything settles after
  release.
- **The empty space.** The molecule crowd lived in a thin slab (±1.75 ×
  ±1.2 µm round the target, 1.2 µm deep, wrapped in x and y only), the far
  cells only in a band far behind it, and the backdrop was a screen-space
  gradient. Orbiting right looked along the slab, past its edge, into bare
  water. Now the baths wrap round each view's centre in all three axes, far
  cells sit on a shell in every direction, and the backdrop is drawn by view
  direction. A coverage test orbits fully round both axes and reads the
  scene's coverage of the frame at each step.
- **Brownian motion as a float.** The phage's random motion was a smooth
  Ornstein–Uhlenbeck velocity, and the crowd drifted beside it untouched.
  Now molecules strike it (see Motion below).

## Controls

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Xbox | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | **Drift across the view, legs first** (a labelled departure): the view's right and up, in 3D; the baseplate and fibres turn to lead |
| LT / RT | Z / X | **Drift back toward you / into the view** (analog), so every direction in the water is a stick away |
| RS | Arrows | **Turn the view** about its own axes (a quaternion: no up or down, no poles, no flips). It stays where you leave it |
| **A** | Space | **Dash**: a passing *current gust* in open water, or a *push-off* with the fibres from a surface (both departures; recharging, HUD `dash` meter) |
| **X** | E | **Grab protein**: aim the leading attachment fibres at a protruding protein and press X. The large gold three-lobed receptors fit; violet paired proteins do not. Both can be grabbed: the fibres converge for 0.45 s, then a mismatch slips off with a small recoil and a 0.25 s retry delay. A match latches and automatically starts the existing irreversible attachment: short fibres bind, baseplate opens, sheath contracts and DNA enters (camera close-up and shake on the snap). No automatic cell-contact attachment or hidden three-foot requirement. **At an amoeba's lobe: a fibre jab** (a departure, below) |
| B | Shift | **Defend: fold the fibres** back against the sheath and slip: an amoeba's lobe gets no purchase, clay and wrong hosts slide past; also lets go of a host. Press again to extend them (ready to grab receptors with X; clay still catches them) |
| Y | R | **At the flagellum (the backdoor)**: back to the sediment (Level 5). Elsewhere: the odds and receptor overlay: receptor patches ringed, each host's receptors, defences and odds of a burst, the UV line, the amoeba's hunger, your distance to the nearest host; inside, each enzyme's sensing range. Marked on screen as data, not optics |
| D-pad ←→ | 3 / 4 | Look: realistic false light (default), Goodsell watercolour, cryo-EM greyscale, fluorescence (pseudo-colour) |
| D-pad ↑↓ | 1 / 2 | Zoom in / out |
| Menu | Esc | Features panel |
| View | Tab | Hide or show the controls |

Inside the host, LS steers the DNA's leading end and A is a short *surge* (the
strand pulled in faster; a departure).

**Goal flow.** The HUD's first line always says what to do now: explore
outward (with how far out you are of the 8.8 µm to the way on), then, once
the way on has appeared, drift to the golden glow (the brass chevron points
to it), deal with its guard, aim at the gold receptor and press X; inside, get
the genome in; damaged, find a partner to co-infect with.

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
  standalone it shows its own Burst card instead. `enterPortal(m)` in
  `main.js` is the one function that fires it. The portal itself (Host A's
  open receptor under the golden glow) leads inside the host; the burst at the
  end of the inside phase is what finishes the chain.
- **Back: the flagellum.** In the calm water beside the start, a flagellum of the
  Level 5 bacterium sweeps past (a turning helix). Drifting within ~0.55 µm
  of it posts `near {kind: 'back', label: 'Y: back to Sediment'}`, and Y
  there posts `landmark('back')`; anywhere else Y is the overlay.
- **Edge marks** (`shared/landmark.js`): no chevron until the way on has
  been placed; then a brass chevron toward the golden receptor (and its light
  spilling in from that edge, `createPortalLight`), and a ring toward the
  flagellum, per view.
- **Up to four local players** (`shared/players.js`): the roster comes from
  the shell (`embed.players`) or starts as P1 alone; anyone joins during play
  by pressing a button on another controller (posted as `join`). Each player
  has their own phage, its sheath in their colour. The view is the LEGO split
  (`shared/splitscreen.js`, image-plane offsets for this free-floating 3D
  world, with `capture` since the Goodsell pass draws to the screen): one view
  together, split as phages drift apart. The amoeba on guard reaches for the
  phage nearest its post; the UV shafts act on each. A caught player plays the whole sequence, then drifts back
  in beside a teammate (no card; `captured` is posted); solo keeps the card.
  One player at a time can commit: the inside phase is a single shared view
  steered by the player who injected, while the others wait outside. Any
  player's camera stick, look and zoom buttons work.

## Threats and pacing

The world follows the encounter pattern every Micro Zoom world shares
([`micro/design/encounter-pattern.md`](../../design/encounter-pattern.md)):
a series of encounters and exploration, not a race, with nothing that runs
down while you explore. The water has no up or down, so the rings round the
start are **shells**, the same in every direction (`RINGS` in `world.js`;
`__micro.debug.placements()` lists them and `debug.rings()` logs when each was
reached and what moved):

| From the start | What | How it meets you |
| --- | --- | --- |
| 0–2.2 µm | Calm warm-up (the backdoor flagellum sits here, off to one side) | — |
| ~3 µm | **Humic flocs** | a shell of 30 static tangles, close enough that every bearing meets one |
| ~4.9 µm | **Decoy hosts**: Host B (a matching CRISPR spacer) and the wrong host | each is moved round its shell to meet whoever approaches, only out of everyone's view and away from every phage (`moveRings`) |
| ~6.8 µm | **UV sunfleck shafts** (a shell of 22) | static, visible from afar |
| 8.8 µm | **The way on**: Host A's gold receptor under the golden glow, the amoeba on guard | placed once a game, out of view, at the bearing of whoever first gets past the UV shell |

Drifting straight out takes about 30–40 s; dealing with what is on the way,
two to three minutes. The obstacles are spaced evenly from the warm-up to the
boss (about 1.9 µm, five or six seconds of drifting, apart); the old "calm
first half" placement is gone.

- **No clocks.** The amoeba's old hunger timer, the UV's slow integrity drain
  and its meter are gone. Hang about anywhere outside a shaft for as long as
  you like.
- **The way on and its guard (the boss outside).** The portal is Host A's
  gold three-lobed receptor that faces the start, marked by the shared golden
  sparkle and beacon (`shared/portal.js`, `createPortalGlow`) and, from the
  edge of the view, its light (`createPortalLight`); the brass chevron
  appears only once it has been placed. An amoeba grazes beside Host A, its
  lobe hovering over the receptor. Come within ~1.7 µm and it reaches for you
  (stalk), **rears and curls the lobe** (the wind-up, 1.1 s: it swells and
  flushes rose, its lips spread wide and quiver), then lunges. **Fold your
  fibres (B)** and the strike slips off (blocked); a **fibre jab (X)** makes
  it recoil; **facing it** wears its interest down. Interest at zero: it draws
  the lobe back **for good** and the receptor is open. Or **lure it**: it
  follows you only out to ~2.6 µm from its post and returns slower than you
  drift, so lead it out and slip round. **Grabbing the receptor while it is on
  guard turns you back** (its lobe shoves you off). With the guard off, grab
  the receptor (X): the fibres latch and the injection starts. *Amoebae
  grazing viruses is [Unverified] in the spec.*
- **UV sunfleck shafts.** Where gaps in the floating peat mat let the sun
  through, a column of UV-B reaches down into the humic water [S104]: drawn
  as violet light with rising glints, visible from afar. **Touch one and you
  are damaged at once** (a violet flash; knocked out of the light; 2.5 s to
  get clear); touch one again while damaged and you are destroyed. Damaged:
  dimmed, cracked, the glow fading.
- **The co-op revive: multiplicity reactivation** (`micro/design/combat-ideas.md`,
  phage idea 1; real for T-even phages, Luria 1947 [C26]). A damaged phage
  still grabs and injects, but its broken genome cannot work alone: its empty
  shell stays on the host (mode `coinfect`) while it waits, 45 s in co-op
  (B gives up). A teammate who injects into the **same host** recombines with
  it: the teammate goes on inside and the damaged player is whole again,
  beside the host. Two damaged players revive each other the same way. Solo, a
  **stray UV-damaged phage** drifts in nearby (out of view, ~1.7 µm off) the
  first time you are damaged: come close and it pairs with you, landing beside
  you to co-infect whichever host you inject, so you go inside whole. A
  damaged phage alone in a host fails after 5 s (solo, said on screen) and
  drifts back in at a safe spot.
- **Lost a life?** You drift back in at a safe spot about 1.6 µm back toward
  the start from where you were lost (clear of the shafts and flocs), or
  beside a teammate; never further back than that.
- **Clay / peat platelet** (beside Host B, moving with it): extended fibres
  stick to it [S103]. Fold the fibres (B) to slip free.
- **The wrong host**: a Gram-positive with no outer membrane and no OmpC. The
  fibres slide off; fold them to pass cleanly.
- **Humic flocs** (new; after MP-R21): a shell of 30 loose, slowly turning
  tangles of humic matter (`FLOCS` in `world.js`). Extended fibres snag in
  one: it drags you in and slows you to a crawl; fold them (B) and you slip
  through. Bog water is rich in humic matter **[Unverified for the size and
  stickiness drawn]**.
- **Inside: the boss, a CRISPR-Cas complex** (type I, shaped after the delivered
  sheet `assets/reference-sheets/boss-cas.webp`: Cascade, a bulky blue body
  of Cas7 subunits curled round a yellow groove carrying the red crRNA guide,
  a red Cas6 cap, and Cas3, the sky-cyan nuclease-helicase with orange
  active-site patches, docked beside it; every subunit a lumpy cluster of
  small spheres; `micro/design/bosses.md` [S101]). It **slides along the host DNA
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
node --test micro/prototypes/phage/binding.test.mjs micro/prototypes/phage/kicks.test.mjs
node micro/prototypes/phage/play-check.mjs   # controls (no spin), coverage (no empty side), encounters
node micro/prototypes/check.mjs phage
node micro/game/check.mjs
```

The smoke check opens the page in headless Chromium, drives the keyboard and
fails on any console error. `window.__micro.debug` has hooks for scripted
screenshots: `teleport`, `orient`, `isolate` (the phage alone, for
turnarounds), `cam(yaw, pitch, dist)`, `fold`, `walkOn(hostId, u, phi)`,
`grab` (the normal aimed grab), `commit` (bypass from a debug walk), `inside(hostId)`, `win`, `capture('amoeba' | 'uv' | 'cut')`,
`hungry`, `overlay`, `look`, `zoom`, `reset`, `place(slot, x, y)`, plus
`maxDt` and `pause`; `debug.spin()` (the view's turn rate and each phage's angular speed, rad/s),
`debug.kicks()` (the last molecule strikes), `debug.coverage()` (the fraction of the frame the scene
covers, read from the scene target's alpha) and `debug.beads()` (beads drawn in the baths); `debug.fight` (the amoeba's fight state and interest) and `debug.boss()` (the CRISPR-Cas state, match, distance). `window.__micro` also exposes `team`, `players`,
`split`, `nearBack` and `where`.

## Known issues

- `shared/landmark.js` throws on an empty split-region polygon, which
  `shared/splitscreen.js` can emit for a frame while players leave; the
  phage skips its edge marks on such frames.
- The overlay's text labels are placed with the shared camera, so in a split
  they sit in the merged position.
- Software WebGL: four split views cost about 1–3 s a frame in headless
  SwiftShader (each view is a full pass); on a GPU it is the usual N renders.
- The bath's molecules collapse inside the hosts, the amoeba and the clay
  (capsule and sphere tests in the shader); the flocs and the stray phage are
  not in that list, so a molecule can pass through them.
- Molecules wrap round each view's centre, so in a split two views show
  different molecules at the same place where they overlap (nobody can see
  both at once).

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

- Drift: the sticks set a target velocity the phage eases toward (a 0.6 s
  lag), so it never snaps. Steering turns the baseplate toward the travel by
  the shortest rotation from where it points now (never a flip); a weak
  torque eases the body toward side-on to the view so it stays readable;
  angular speed is capped at 3 rad/s.
- **Brownian kicks** (`kicks.js`, tested in `kicks.test.mjs`): about 1.7
  times a second a molecule flies in from a random direction, strikes the
  phage's body (a capsule from baseplate to head), bounces off and fades. The
  phage takes a push along the molecule's travel and a spin from the lever
  arm, then the viscous water takes the velocity away (0.45 s). Small
  molecules (ions, water clusters) are 60 % of hits, fast and light (6 units/s
  pushes); sugar chains 28 % (9); proteins 12 %, slow and harder (14), with a
  soft rumble and a tick. A pale ring flashes where each strikes. While the
  fibres are aimed at a protein in reach the spin is cut to 30 % so a kick
  never wrecks a grab; walking and clay soften kicks further. *Features →
  Molecular kicks* turns them off. The bath itself jostles thermally, the
  small molecules fastest.
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

### The look since the revamp (`shared/techniques/phage-beads.js`, [`LOOK.md`](LOOK.md))

- **Bead-cluster molecules as sphere impostors**: every molecule in the water
  and on the hosts is a template of small spheres (`beadTemplate`: globule,
  small, dimer, chain, complex, humic, lps, porin, mprot, floc), and every
  sphere is one camera-facing quad ray-cast in the fragment shader, writing
  its true depth. One instanced draw per template.
- **Two baths that never touch the CPU**: a near bath (≈2,300 molecules,
  detailed, in a 2.3 µm box) and a mid bath (≈3,200 larger, coarser
  molecules out to the haze, leaving the middle to the near one), each
  wrapped round the view's centre on the GPU, jostling (small ones fastest),
  tumbling, making way for each phage and a gust, vanishing inside solids,
  clearing a lens in front of the camera. Each split view wraps them round
  itself, so every view is full (this replaces the CPU crowd and its
  per-view copies).
- **Hosts furred all round**: LPS chains every ~15 units² (≈3,700 on Host
  A), porins, membrane proteins and globular proteins in the forest, porin
  patches at the receptor sites, and the grab proteins as bead clusters (the
  gold receptors glow a little: the thing to find). The capsule body wobbles
  more under its wet relief.
- **Light and shadow**: per-bead crease occlusion (the side of a bead facing
  into its cluster darkens), screen-space ambient occlusion and depth
  outlines in the final pass (QuteMol-like), per look: false light 0.45 / 0.3,
  Goodsell 0.6 / 0.6, cryo-EM 0.4 / 0.8, fluorescence 0.2 / 0.25.
- **Every direction full**: 48 far cells on a shell round the field; the
  backdrop and the UV wash are placed by view direction and world position,
  not by screen (MP-V06, a panorama, replaces the procedural backdrop when it
  arrives).
- **Palette by type** (`PALETTE`): violet-blue and periwinkle proteins, teal
  and green ones, pale small molecules, olive humic matter, a gold-green LPS
  core with pale tips, blue porins, a blue-violet ribosome-sized complex;
  each with its Goodsell colour for the watercolour look.

### The look before the revamp (`shared/techniques/phage-goodsell.js`)

**False light (the default).** The same materials carry a second branch
(`goodsellShared.uStyle = 1`), each with its own false-light parameters
(`fl` in `toonMaterial`, `FL_DEFAULTS`): a variegated palette pair in world
space, a warm key from the upper left wrapped for soft matter plus a teal
fill, a thickness-based translucency (thick centres absorb toward deep blue,
thin edges let the light through: the cheap stand-in for transmission), a
Fresnel rim, a wet specular, a procedural bump from world noise and screen
derivatives with cavity darkening on the host envelopes, and an emissive glow
(the phage's gold, the entering genome, the guide RNA's tell). The pass (look
3) composites that over teal water with soft light shafts and a drifting
haze, softens only far layers (and the very near) by depth from the depth
buffer (a large depth of field), adds a threshold/blur bloom at 1/4 and 1/8
resolution (half-float when the GPU renders to it), applies a filmic curve and
a teal grade with golden highlights. In false light the capsid is glassy with
glowing facet edges, the molecules swap to lumpy bead-flower geometry, far
cells hang in the haze (one instanced draw) and fine motes drift (one
points draw). Ink hulls are hidden, not just discarded. Inside, the cytoplasm
takes the reference's violet-blue ribosomes and green, orange and teal
proteins under a blue membrane, with the genome as a glowing gold strand.

**Goodsell (a look option).** Every object uses one toon material: flat watercolour colour with a soft
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

### Performance

- The shared quality governor (`shared/quality.js`) owns the pixel ratio and
  scales the post target (lower per split view: 0.7 at two views, 0.55 at
  three or four); its effects level trims the pass (2: DOF and two bloom
  levels, 1: one bloom level, 0: no DOF and, in Goodsell, no ink on the
  crowds). Features → Quality governor.
- No empty draws: hidden ink hulls (false light, or Ink off), crack tubes
  only once cracked, instanced meshes hidden at count 0, and each host's grab
  proteins as two instanced meshes rather than a dozen meshes each.
- `?pr=1` renders at full resolution on software WebGL (for judging
  screenshots); otherwise software WebGL renders at 0.6.

### Performance (second pass)

Measured on 1 November 2026 with `micro/tools/perf/measure.mjs` (`?q=high`, 1 and
4 players, outside and inside). Screenshots before and after, on a seeded,
fixed-step clock, differ by at most 1/255. They cover false light at high,
medium and low quality, inside, Goodsell, cryo-EM, fluorescence and 4 players.

- **Culling:** each host's instanced meshes (LPS forest, OmpC, grab
  proteins) get a bounding sphere once and are culled with their host. The
  molecule crowd gets a sphere fitted every frame. The crowd wraps round
  `view.target`, so a split view far from it no longer draws the crowd. Outside,
  1 player: 52 → 42 draws, 0.58 M → 0.36 M triangles. 4 players (4 views):
  247 → 191 draws, 2.54 M → 1.38 M triangles. Inside is unchanged.
- **A crowd per split view, only when needed:** one crowd wraps round the
  group (`view.target`). Each frame `main.js` unprojects each split view's
  screen region onto the crowd's top and bottom planes; a view that would show
  more than 12 units (120 nm) of bare water beyond what the merged screen shows
  gets its own copy (`world.coverCrowd`), seeded from the main crowd and wrapped
  round that view, drawn only there (`world.crowdView`), with the same gusts
  and wake. It dissolves in over 0.6 s at constant density (copy instance i is
  main n−1−i, so the main crowd draws its first n−c and the copy its first c),
  and out again once the overflow has stayed under 2 units for 1.5 s. While
  every view has a copy the main crowd is not stepped, so 2 players apart cost
  2 crowds and 4 cost 4; together, nothing changes (seeded screenshots are
  identical to before). *Features → Crowd per split view* (or `?crowdsplit=0`)
  turns it off. Cost (world.update, headless Chromium): ≈0.16–0.38 ms with
  1 crowd, 0.35–0.5 ms with 2, 1.1–1.3 ms with 4, plus 36 KB of instance
  upload per crowd per frame (perf harness, 2 players apart: 104 → 164 KB);
  draws grow only because far views, which used to cull the crowd, now draw
  their own (2 players: 95 → 101). `?spread=350` starts joining players apart
  for such runs.
- **`world.update`:** a crowd molecule tests a host's envelope only inside the
  host's bounding sphere. The update runs about 3× faster (≈1.3 → 0.45 ms
  here) and allocates 62 → 40 KB.
- **Bloom:** the bright pass thresholds the DOF's quarter-resolution copy (the
  same 4-tap average) instead of reading the full-resolution scene a second
  time.
- Not done:
  - Specialise the post and toon shaders per look. They branch on uniforms, so
    the gain is small, and each look switch would recompile unless prewarmed.
  - Draw the false-light background noise (cloud and shafts, 10 noise
    octaves per pixel) at ¼ resolution. It is an estimated 40 % of the final pass's ALU,
    but the finest octave would soften.
  - A non-boxing random generator for the crowd's jostle (40 KB a frame).
    It changes the random stream, so it can't be checked pixel for pixel.

## Features

The Menu panel lists everything with a switch where it makes sense:

- **Rendering**: Look (false light / Goodsell / cryo-EM / fluorescence);
  Capsid (Translucent by default / Cutaway / Solid); Ink outlines; Depth by
  desaturation (the haze in false light); Delivered art (in false light the
  painted envelope lends only its grain); Quality governor and Manual quality.
- **Body**: T4 from its anatomy (always).
- **Motion**: LS drift (Drift / Honest); Brownian motion; Molecular kicks;
  Slow tumbling.
- **Simulation**: UV near the surface; Amoeba edge.
- **World**: Crowded water (the baths).
- **Controls**: Keep the surface up (the gentle levelling roll); Invert
  camera Y (shared).
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
- **The revamp's art (requested and delivered 1 November 2026):**
  - **MP-V05** (false-light envelope, tileable): on Hosts A and B in false
    light, tiled at its true scale (about 150 nm a tile, 14 × 9 round the
    capsule) and taking over 75 % of the albedo, under the bead forest; the
    wrong host (no outer membrane) keeps its own wet relief. In the Goodsell
    look the hosts keep MP-V01. Without it, false light shows the procedural
    relief alone (MP-V01's grain streaked it, so it is no longer used there).
  - **MP-V06** (equirectangular panorama): the false-light backdrop, sampled
    by view direction in the final pass (dimmed to 70 %, mixed 85 % over the
    procedural haze), so the far water is the painting whichever way you
    turn. Loaded without mipmaps so the wrap seam leaves no line.
  - **MP-V07** (molecule sprite sheet, 4 × 4): the far layer, 1,400 sprites
    wrapped round the view between 3.3 and 7 µm (`createSprites` in
    `phage-beads.js`), false light only. The sheet's magenta key left coloured
    fringes, so the shader erodes the alpha (the minimum of five taps), drops
    magenta-, cyan- and yellow-cast pixels and never samples the cell's outer
    3 %.
  - **MP-V04** (molecule species sheet), **MP-R21** (humic floc) and
    **MP-R22** (host in the new look) are references: the bead templates and
    `PALETTE` follow them (porins as rounded triangles round a dark pore, the
    receptor's gold lobes on a pale beige stalk, LPS with a gold-olive core,
    red phosphate dots and pale branching tips, lone ions in their own
    colours, flocs as looping golden-brown strands round a dark core with grey
    mineral flakes, the Gram-positive decoy's duller olive fuzz).
  - **MP-U09** (card) and **MP-G14** (intro plate) replace MP-U07 and MP-G13
    in place; the shell and the prototypes page use the new ids.

Sound reuses the bacterium's foley: the sediment ambience, the run loop
(faint, pitched to drift speed), `sprint` (gust, surge), `tumble` (fibres,
steps, slipping off), `phage` (binding, commit), `eat` (sheath snap, UV
death) and `graze` (engulfed, the burst). Sounds this level would want:
a humic-water ambience, a soft fibre "tick" for each step, a sheath-contraction
snap, DNA translocation (a fast zipper), an enzyme clamp, a capsid crack, and
the lysis burst.

## Departures, labelled

- **Individual molecular kicks**: a real phage is struck ~10^13 times a
  second and the sum is a smooth random walk [S100]; a strike every half
  second or so, each a visible molecule bouncing off, makes the cause
  visible. The water is also far more crowded and its small molecules far
  larger than real (so they read).
- **Free 3D drift with the triggers** (RT/LT into and out of the view): the
  same departure as LS drift.

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
