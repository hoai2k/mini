# Amoeba · brightfield prototype

*Amoeba proteus* crawling on a wet-mount slide and hunting the way it really
does: it pushes out pseudopods, cups them round a ciliate or flagellate
without needing to touch it, and closes the cup into a food vacuole. The cell
keeps its volume, so every arm takes body from somewhere else. Ciliates flee
the approaching membrane, so the surge (A) matters, and the trap hyphae of a
predatory fungus wait on the slide. Built in three.js (`../shared/vendor`, no
addons); world units are µm.

Open `micro/prototypes/amoeba/` (the invite gate is off on localhost).

## Controls (Xbox controller; keyboard in brackets)

Two schemes, chosen in Features → Controls. **Lead and follow** is the default;
**Two pseudopods (classic)** behaves exactly as before.

### Lead and follow (default)

At any moment one stick is the **pseudopod stick** and the other the **body
stick**. With no pseudopod out, the first stick pushed grows one in its
direction and becomes the pseudopod stick; the other becomes the body stick.
The corner shows the roles (`LS: body · RS: pseudopod`).

| Button | Action |
| --- | --- |
| Pseudopod stick (LS WASD or RS arrows) | Aims and extends the pseudopod (area conserved, as before) |
| Body stick (the other one) | Moves the bulk of the cell that way: the rear (uroid) contracts, the endoplasm streams forward, the centroid travels. **Both held**: the pseudopod holds its length and its tip keeps advancing, so the cell travels behind it. **Body stick alone towards the pseudopod**: the body flows into it and takes it back. Pointed elsewhere: the body goes that way and the pseudopod trails or flows back |
| LT / RT (Z / X), held | The body stick grows a **second pseudopod** instead, starting 30–70° round from the first on the side the stick points, so the two can close round prey. Let go: that stick moves the body again, and the second pseudopod relaxes slowly (hold the trigger again to pick it back up) |
| LB (Q) | Spread out / relax: the cell flattens, rounds up and its pseudopods relax |
| RB (F) | Push harder |
| LS click / RS click (C / V) | Fine focus down / up |

The roles reset once the pseudopod is fully taken back or has flowed back,
and after eating (the cup's pseudopods dissolve into the vacuole). A stick
still held when you eat must be let go before it can lead again; a body stick
still held keeps moving the body.

### Two pseudopods (classic)

| Button | Action |
| --- | --- |
| LS (WASD) | Pseudopod 1: grows from the part of the cell facing the stick; turning the stick bends it; stick magnitude is how hard it pushes |
| RS (arrows) | Pseudopod 2, so the two sticks can wrap a cup round prey from both sides |
| RT (X) | Push harder |
| LT (Z) | Spread out / relax: the cell flattens (its footprint grows, since the volume is fixed), rounds up and its pseudopods relax |
| LB / RB (Q / F) | Fine focus down / up: changes the sign and size of the defocus contrast and how blurred the layer above is |

### Both schemes

| Button | Action |
| --- | --- |
| **A (Space)** | **Surge**: for 0.9 s every active pseudopod extends up to 2.5× faster and may run a little further ahead, the rear contracts harder and streaming surges to the tips, so the whole cell lunges; recharges over 2.4 s (the `dash` meter). With no stick held it surges along the cell's heading (in lead and follow, the body flows on that way). Tears the membrane free of a fungal trap |
| **X (E)** | **Close the food cup** round the prey it wraps (needs ≥ 190° of membrane round it): the rims advance and endoplasm floods in to fill round the prey until they meet. At a trap hypha: a pseudopod jab that cuts its tip. With your membrane round an arm of Chaos: pinch it off |
| B (Shift) | Let go while closing; otherwise egest the oldest food vacuole at the uroid (a live, barely digested prey swims away). Near a threatening trap hypha (or stuck on one), hold to **stiffen** (defend) |
| Y (R) | Labels (nucleus, contractile vacuole, uroid, hyaline caps, ectoplasm, endoplasm, prey with real sizes, trap hyphae). At the leaf tip (the backdoor) Y goes back up to the tardigrade instead |
| D-pad ← → (3 / 4) | Optics: brightfield, phase contrast, darkfield, hypothetical immersive lit view |
| D-pad ↑ ↓ (1 / 2) | 20× objective (0.9 mm field) / 10× objective (1.8 mm field) |
| Menu (Esc) | Features panel: what the prototype does, with switches |
| View (Tab) | Hide the help panel |

Centre a pseudopod stick to let that pseudopod flow slowly back. A dashed ring marks the prey the
membrane wraps furthest, with the angle; it turns green when X will close.
Rumble: a tick on prey contact, a kick on each surge, a heavy jolt when a
Paramecium fires its trichocysts, a trap hypha grabs the membrane or cuts a
piece off, a pulse on capture. The sticks keep the amoeba's own scheme; A, X,
B, Y and the d-pad follow the shared one (`../CONTROLS.md`).

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A pool ambience loop; pseudopods flowing out (rate-limited), the surge (A), closing the food cup (X), a vacuole forming, the contractile vacuole emptying, and digestion finishing.

## Fighting back

- **The fungal traps fight readably** (`createFight` per hypha). While the
  fungus is hungry and a membrane comes within ~40 µm, the hypha **winds up**
  (it curls and its adhesive knobs swell with a sticky shimmer, `uWind` in
  `TRAP_FS`), then snaps shut; only then does it stick (`o.grip`, ~7 s). A
  calm or dormant hypha lies straight with small pale knobs.
- **Defend (B)**: near a threatening hypha (or stuck), B held stiffens the
  cell: its pseudopods draw in, the membrane peels off a trap (it keeps 55% of
  each step instead of 8%), and a snap that meets it is blocked (the hypha
  slides off). Elsewhere B is still let go / egest.
- **Attack (X)**: at a hypha (and no cup ready to close), a fast pseudopod jab
  engulfs its tip and cuts it back (bite back). Blocks and cuts wear the
  fungus down: the hypha withdraws for ~16 s.
- **Being eaten** (no card): strike, hold (surge to tear free), drain, then
  the view pulls back over the fungus at work and holds there, a fade, and a
  fresh amoeba at the start spot furthest from the traps (in multiplayer,
  beside a teammate).

## The boss: Chaos (`chaos.js`)

The giant amoeba *Chaos*, multinucleate, an eater of smaller amoebae
(`../../design/bosses.md`; *Chaos* eating *A. proteus* is plausible but not
well documented), between the start and the green *P. bursaria*. The same soft
body as yours at ~1.9× the width (~0.65 mm; real *Chaos* reaches 1–5 mm), with
nine nuclei, slower.

- Dormant until a player comes within ~950 µm after the calm opening; a brass
  **resolve** gauge shows while it is awake.
- **The tell**: it raises and spreads its pseudopods, every arm out at once.
  **The cup**: two arms reach to your flanks, then curl round behind you; if
  they wrap you (~170°+) it engulfs you. Every third attack is **a lunge**:
  one broad arm with the whole cell flowing after it.
- **Your play**: push into it and pinch its arms off: X when your membrane is
  on both sides of an arm's neck (within ~70 µm each side) cuts it
  (`Body.pinchAt`); the piece rounds up and dies. Each cut staggers it and
  wears it down; then it flows away and rests, and you slip round it to the
  landmark. Surging (A) in the first moment of an engulf breaks out.
- **Engulfed**: drawn into its middle, darkened and shrunk in a food vacuole,
  while the camera follows it carrying you off; then the fade and respawn.
- It targets the nearest player; the amoebae push against its membrane.

## Landmarks (the way on and the way back)

Both are things on the slide, drawn into the same optical property buffer as
everything else; `../shared/landmark.js` adds a quiet mark near the edge of
each view while they are off screen: a brass chevron labelled Pool towards the
way on, a hollow ring labelled Leaf towards the way back.

- **Forward: a green *Paramecium bursaria*** swimming low over the slide,
  about 2.6 mm to the right of the start: its Chlorella symbionts fill it with
  green (`prey.js` `bursaria`, kind 5 in `PREY_FS`). It wanders in a loose
  circle round its spot and is not prey here. When any player's membrane comes
  within ~45 µm of it, `embed.landmark('forward')` is posted (once per visit):
  the camera follows it out into the pool (design §2.6 and Level 3);
  standalone, `embed.js` shows a toast.
- **Backdoor: a Sphagnum leaf tip** dipping into the pool, about 2.3 mm to the
  left (`LEAF_FS`: one cell thick, large clear hyaline cells with fibril bands
  and pores in a net of narrow green chlorophyllose cells, and the water
  film's edge as a soft meniscus round it). The amoeba flows round it (capsule
  colliders down its axis). Near the tip a quiet "Y: Back to the tardigrade"
  prompt shows (the shell's, from `embed.near('back')`, or this page's own
  when standalone), and Y there posts `embed.landmark('back')` instead of
  toggling the labels.
- Steady crawling (both sticks held) covers ~35-40 µm/s on the ×10 clock, so
  each is about a minute away in a straight line; a couple of minutes with
  hunting and the traps.

## Multiplayer (local, up to four)

Through `../shared/players.js`, as `../CONTROLS.md` describes: player 1 on the
keyboard and the first controller; players 2-4 join at any time by pressing
any button on another controller (a toast, and in the shell `embed.join`).
Inside the Micro Zoom shell the roster from its menus is restored.

- **Each player is their own amoeba** with the lead-and-follow two-stick
  scheme (or the classic one, from Features), its own surge, food cup,
  vacuoles, trap contact and catch. A joining amoeba appears beside a teammate.
  In `main.js` the per-player state is switched in by `use(cell)` (body,
  cytoplasm, surge, capture, roles, pad...), so the single-player code paths
  run unchanged for each cell. Amoebae push against each other's membranes
  instead of overlapping; prey flee, touch and are cupped by any of them.
- **Colour**: a faint tint of the player's colour in the cell (`uTint` in
  `BODY_FS`, mostly in the clear ectoplasm rim), and a broken ring and name
  tag round each amoeba; each player's cup reticle is labelled.
- **Rendering**: each amoeba is a cell layer in `render.js` (`addCell`): its
  own membrane mask, body quad and granules, drawn one after another into the
  same property buffer. The split screen (`../shared/splitscreen.js`, 2D mode:
  a field drawn round a centre) composes each view into its own target
  (`render({ target })`, render scale 0.75), and while split the property
  buffers are drawn at 0.7 of the screen (`View.setScale`), so a split frame
  costs well under N full frames. Extra amoebae carry 1300 granules.
- **The fungal traps** catch whoever touches them. Alone, the full catch and
  the Eaten card, as before; with others playing the drained player sees the
  whole sequence, then a fresh amoeba appears beside a teammate (no card).
- **The landmarks** trigger for any player. Labels, look, objective and focus
  are player 1's.

## The biology it follows

- **Size and shape.** *A. proteus* reaches roughly 600 µm or more [S04]; the
  cell here has the area of a 344 µm disc (≈ 9.3 × 10⁴ µm²) and is 400–550 µm
  long when spread. It is polypodial: at rest, several broad, blunt
  pseudopods come and go at once (the idle pseudopods), as in the reference
  photo (`research/assets/references/amoeba.jpg`).
- **Ectoplasm and endoplasm.** A clear gel rim a few µm wide, granular sol
  inside; a hyaline cap free of granules at each advancing tip; a crumpled,
  denser uroid at the rear.
- **Fountain streaming.** The endoplasm streams towards each advancing tip,
  about twice as fast as the tip advances, along the cell's axis; the gel rim
  does not stream. At the tip it turns to gel and is left behind (here: a
  slow backward drift near the cortex). The rear cortex contracts and
  squeezes endoplasm forward once a pseudopod is at full reach, so the cell
  follows its arm [S06].
- **Organelles.** One discoid nucleus (~45 µm, many small peripheral
  nucleoli) carried by the flow and tumbling slowly so it reads as a disc or
  a lens; a contractile vacuole near the rear that swells slowly and empties
  in about a second, faster while food vacuoles are giving up water;
  bipyramidal crystals, refractile granules, lipid droplets, algal remnants.
- **Phagocytosis.** Prey stimulates broad pseudopods that surround it and
  form a food cup, which closes into a food vacuole; contact is not
  required [S05, Jeon & Jeon 1976]. Here the cup is measured by how far the
  membrane winds round the prey; once A is pressed, the lining holds still
  and only the rims advance across the mouth; when they meet, the lining
  zips shut and the cup's water and prey become a food vacuole. The vacuole
  then sheds water and the prey digests (Chilomonas is digested in minutes
  in life), after which the cell grows a little.
- **Prey.** *Chilomonas* (~30 µm, two flagella, starch grains),
  *Chlamydomonas* (~12 µm, cup chloroplast, eyespot, breaststroke
  flagella), *Tetrahymena* (~50 µm) and *Colpidium* (~60 µm), and one
  *Paramecium caudatum* (~220 µm, oral groove, two contractile vacuoles with
  radiating canals, caudal tuft) [S07]. They swim on wobbling helical paths,
  and pause to graze. Ciliates and Chilomonas that touch (or nearly touch)
  the membrane show the avoidance reaction: back up, pivot, swim off [S08].
- **Trichocysts.** A Paramecium caught in a closing cup fires a local burst
  of trichocysts (long thin threads with heads, out in milliseconds) that
  shoves it clear and knocks the membrane back [S09]. It has three such
  bursts; then the nearby trichocysts are spent.
- **The slide.** Spirogyra filaments (helical chloroplast ribbons,
  pyrenoids, cross walls, a mucilage sheath), pennate diatoms gliding
  slowly along their raphe (girdle and valve views), detritus flakes. The
  cell flows round them; egested vacuoles leave residue flakes.

## Simulation

- **Soft body** (`../shared/techniques/amoeba-softbody.js`): a ring of 160
  membrane nodes, overdamped (low Reynolds number: displacement ∝ force,
  nothing coasts, motion stops when protrusion stops). Each step: cortical
  tension (normal part of the Laplacian) and tangential spacing; protrusion
  at each pseudopod's blunt, fixed-width cap (flat-topped, so pseudopods stay
  roughly cylindrical); the body following the body stick (front flows on,
  rear contracts, membrane already far out in front is left to be caught up
  with); substrate adhesion (non-protruding membrane resists
  normal motion but still slides into growing arms); posterior contraction
  once an arm is at full reach; capsule/circle obstacles; self-contact
  (every node kept off every non-adjacent segment through a spatial hash,
  and necks thinner than 26 µm pushed apart so the cell resists thinning);
  a crossing guard that undoes any move that would make the membrane cross
  itself (it runs after the step and again after traps and prey move the
  membrane); and
  an exact area projection weighted to the rear, so what an arm gains is
  taken from the uroid. Food cups: winding of the nearest membrane run round
  the prey, rims chosen as the pair that wraps furthest for the smallest gap,
  a seal that zips the lining to the chord and resamples the ring.
- **Distance grid** (`../shared/techniques/amoeba-sdfgrid.js`): every frame
  the ring is scan-filled into a 128² grid and an exact Euclidean distance
  transform gives signed distance from the membrane. Granules use it to stay
  in the endoplasm, prey to stay out, the renderer for the thickness dome.
- **Cytoplasm** (`cytoplasm.js`): 2600 particles advected by the fountain
  flow, with crowding diffusion, saltatory jitter, exclusion from organelles,
  the ectoplasm margin and the hyaline caps. Streaming scales with the
  pseudopod speed and the surge, and while a cup closes it floods toward the
  cup mouth (filling in).
- **Pseudopod speed.** Pseudopods ramp up and advance 2× faster than the
  first tuning (`body.opts.speed`, Features: Quick 2× / Original); the area
  conservation and rear retraction are unchanged, so the reshaping feel is
  the same. Measured: a held stick gains 88 µm of tip reach in 1.5 s against
  54 µm before (1.6×, since a pseudopod is held back as it nears full reach).
- **Surge (A)** (`body.opts.boost`): eased in and out over 0.9 s, up to 2.5×
  on the player's pseudopods' ramp and speed, a little more reach before the
  body must follow, and a harder rear contraction, so the cell body follows
  the arm and the whole cell moves. Inspired by blebbing, the fastest
  protrusion of *A. proteus*; the strength is a game value.
- **Fleeing ciliates.** *Tetrahymena*, *Colpidium* and *Paramecium* that come
  within ~75 µm of the membrane turn away from it and swim off at ~2.2× for
  2.5 s. A plain pseudopod rarely catches them; a surge does. Slow
  flagellates (*Chilomonas*, *Chlamydomonas*) still just show the avoidance
  reaction on contact.
- **The membrane never crosses itself.** Before this guard the ring
  occasionally folded over itself (a segment slipping between two nodes,
  mostly where a trap hypha held the membrane), and the outline's ear
  clipping then emitted stray triangles. The mask outline (Catmull-Rom with
  the uroid wrinkles) is also checked and drawn straight where it would fold
  over itself. A 60 s random-input soak now counts 0 crossings and 0 stray
  triangles per frame in both schemes.
- **Pinch-off (rare).** If a neck is squeezed thinner than 12 µm and a trap
  hypha lies across it, the hypha cuts it: the piece holding the nucleus
  stays the amoeba (resampled, its area target reset), the other piece rounds
  up, darkens and breaks up over about 4 s, and a pseudopod cut off is left a
  stump. Necks resist thinning, so this almost never happens in play.
- **Fungal traps.** Three trap hyphae of a zoopagalean fungus (*Stylopage* /
  *Zoopage* type: thin, septate, with adhesive knobs) grow on the slide (see
  **Threats and pacing**). Membrane that touches a sticky one sticks (it
  keeps 8% of each step's motion); a surge tears it free. Stuck for 8 s, the
  fungus catches the cell.

## Threats and pacing

The only threat is the fungus; its pacing and its catch use the shared
`shared/predation.js` (`createHunger`, `createCapture`), as in the other
prototypes. The lead-and-follow controls are unchanged.

- **A calm opening.** For the first 45 s (and after every restart) there are
  no trap hyphae on the slide. Then they grow in from one end over 25 s (the
  hypha nearest the start grows toward the cell); the stats corner says
  `absent (calm, … s)`, then `growing …%`.
- **Hunger comes and goes.** Once grown, the fungus is hungry for 30–50 s:
  its adhesive knobs are large, dark and sticky. Then it rests, 50–80 s
  after a catch and 20–35 s after you tear free: the knobs shrink and pale
  and nothing sticks. The stats corner shows `sticky` or `dormant` with the
  seconds left, and the labels (Y) mark each hypha.
- **Stuck** on a sticky hypha, a red line at the top counts down to the
  haustoria (8 s, as before) and asks for a surge (A).
- **The catch, shown in full:** **strike** (0.45 s): haustoria (feeding
  hyphae, drawn without knobs) pierce the membrane where it is glued and grow
  toward the centre; **hold** (1 s): they reach in and the cytoplasm starts
  to brown; a surge (A) in the strike or hold still tears the cell free,
  and the haustoria take a bite (−7% of its area) as before; **eat**
  (1.8 s): the cytoplasm is drained, darkening and turning brown, and the
  cell shrivels to 55% of its area (`amoeba/engulf`, then `amoeba/digest`).
  Then the Eaten card; A starts a fresh cell where the old one was, with a
  fresh calm opening. The sticks do nothing during the catch, and the red
  line and the stats corner say why.
- **Testing:** Features → World → *Calm opening before the traps* (45 s,
  20 s, 0 s) and *Traps come and go* (off: sticky all the time once grown,
  the old pacing). `window.__micro.pacing()` reports the time, when the traps
  first became sticky, the first time the membrane stuck and the first
  catch; `window.__micro.forceCapture()` lays a grown, sticky hypha across
  the membrane and starts the catch.

## Rendering

Every object draws additively into an **optical property buffer** (half-float:
phase, and optical density for red, green and blue) instead of colour, and
one composite applies the optics
(`../shared/techniques/amoeba-optics.js`):

- **Brightfield** (default): Beer–Lambert absorption of the property buffer
  over the slide; the weak contrast a transparent cell gets from slight
  defocus via the transport-of-intensity equation, I ≈ I0(1 − Δz∇²φ), at two
  scales (fine: granules and edges; wide: the bright halo outside a thick
  edge); edge darkening ∝ |∇φ|² where steep slopes refract light out of the
  aperture; a slightly different defocus per colour channel for faint
  chromatic fringes; the slide seen through the phase gradient.
- **Phase contrast**: positive Zernike, dark phase with the bright halo of a
  finite phase ring (φ − blur φ).
- **Darkfield**: only scattered light: |∇φ|, |∇²φ| and high-pass φ on black.
- **Immersive (hypothetical)**: φ read as height, lit like a gel in water
  over the slide (diffuse, specular, Fresnel, caustics). Not microscopy.

The **thickness dome** is √(distance from the edge) from the grid, so thin
pseudopods are thin; it drives phase and absorption. The membrane outline is
Catmull-Rom subdivided, triangulated and drawn into a 4× MSAA mask. Things
above the focal plane go into a half-resolution buffer that is Gaussian
blurred (depth of field). Granules are point sprites (refractile spheres,
diamond crystals); prey, Spirogyra, diatoms and flakes are analytic shaders
on quads.

Delivered art is used when present, with procedural stand-ins otherwise:
MP-A01 (wet mount: the slide, tiled in world space), MP-A02 (cytoplasm
granules: fine texture inside the endoplasm, carried with the cell), MP-A03
(filament backdrop: converted to optical density, mirrored-tiled in world
space, drawn in the blurred layer above; the procedural filaments and flakes
above are hidden when it is present).

## Features (Menu panel)

| Group | Feature | Default |
| --- | --- | --- |
| Optics | Optical method (brightfield, phase contrast, darkfield, immersive) | Brightfield |
| Optics | Defocus contrast (transport of intensity) | on |
| Optics | Edge refraction loss | on |
| Optics | Chromatic fringes | on |
| Optics | Depth of field | on |
| Optics | Background refraction | on |
| Rendering | Optical property buffer | always |
| Rendering | Thickness dome from a distance grid | always |
| Rendering | MSAA membrane mask | always |
| Rendering | Vignette, Sensor grain | on |
| Body | Crumpled uroid, Hyaline caps | on |
| Body | Volume conservation (area pressure) | on |
| Body | Rear retraction (uroid weighting and posterior contraction) | on |
| Body | Self-contact | on |
| Body | Idle pseudopods (polypodial) | on |
| Motion | Overdamped (low Reynolds number) | always |
| Motion | Amoeba time compression: ×10, ×3, ×1 (real time) | ×10 |
| Motion | Swimmer speed: ×0.1, ×0.3, real | ×0.1 |
| Simulation | Fountain streaming, Brownian jitter, Contractile vacuole cycle | on |
| Simulation | Granules: 2600, 1300, 600 | 2600 |
| Simulation | Food cup and food vacuoles; avoidance reaction and trichocysts | always |
| Simulation | Ciliates flee the membrane | on |
| Simulation | Filling in (X) | on |
| Motion | Pseudopod speed: Quick (2×), Original | Quick |
| Motion | Surge (A) | always |
| World | Obstacles on the slide, Out-of-focus layer | on |
| World | Fungal trap hyphae (hazard) | on |
| World | Calm opening before the traps: 45 s, 20 s, 0 s | 45 s |
| World | Traps come and go (fungal hunger) | on |
| Body | Membrane never crosses itself | always |
| Body | Pinch-off (rare) | on |
| Controls | Controls: Lead and follow (new), Two pseudopods (classic) | Lead and follow |
| Controls | Rumble | on; Stick-driven pseudopods: always |

Technique modules others can reuse (each documents its interface in its
header): `shared/techniques/amoeba-optics.js` (property buffer → microscope
optics), `amoeba-softbody.js` (volume-conserving 2D crawler with food cups),
`amoeba-sdfgrid.js` (per-frame signed distance grid of an outline).

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
| `semMite` (+ `semMiteMode`) | mite | The phase buffer read as a height map (× 40 µm), seen from a virtual beam 4 mm above the glass, shaded by the SEM composite |
| `dicTardigrade` (+ `dicTardigradeMode`) | tardigrade | The property buffers (out-of-focus layer blurred) through the tardigrade's DIC or brightfield |
| `microscopeParamecium` (+ `microscopeParameciumMode`) | paramecium | The same through the paramecium microscope (its darkfield, phase, brightfield, DIC, lit view) |
| `preyLowRe` | paramecium | `lowRe()` on prey: speed follows the beat with a 35 ms lag, and the trichocyst recoil stops in milliseconds instead of gliding ~0.2 s |
| `preyFlow` | paramecium | `squirmerFlow()`: each swimming prey's dipole flow moves the others |

Not borrowed:

- Paramecium cilia: prey are drawn into the 2D property buffer by their own shaders; the 3D ribbon strands need the paramecium's MRT buffers and a 3D scene.
- Mite gait and IK: nothing here has legs.
- Squirmer flow on the amoeba itself: the soft body takes no external flow, and an amoeba crawling on glass is not moved by it noticeably.

## Labelled departures

- **Time compression.** Amoeba processes run ×10, and pseudopods ×20 with
  the quick pseudopod speed (they advance ~60–90 µm/s on screen, about
  3–4 µm/s real; the corner shows both; the contractile vacuole cycles
  in ~40 s, minutes in life; digestion takes ~0.5–1.5 min). Swimmers are
  shown at about ×0.1 of their real speed (a Paramecium swims ~1 mm/s): a
  combined factor of ~100 between the two clocks, so an amoeba can catch
  anything. Both are switchable in the Features panel. Real amoebae mostly
  ambush slow or browsing prey.
- **2D approximation.** The cell is a 2D outline with area conservation
  standing in for volume; thickness is a dome derived from the outline, not
  simulated. Spreading (LT) trades thickness for area explicitly.
- **Stick-driven pseudopods** are a game interpretation of chemotactic
  protrusion; the idle pseudopods stand in for the cell's own probing.
- **Closing the cup on a button** is a game decision; in life the cup closes
  when the prey stimulus and contact are right. The rims advance a few µm
  per second here; the seal is instantaneous once they meet.
- **The surge** is a game action: blebs are real and fast, but an amoeba
  does not choose to make every pseudopod 2.5× faster for a second.
- **Fleeing** ranges and speeds are game values; escape swimming itself is
  real.
- **The fungal trap** compresses a slow process (adhesion, then a haustorium
  over minutes to hours) into seconds; the bite, the fatal drain, the hyphae
  growing in 25 s and the knobs' sticky and dormant spells are game rules.
- **Trichocysts** are limited to three bursts per Paramecium; real cells
  carry thousands, but discharge is local, so a grabbed region runs out.
- **Optics.** The image is computed from a model of phase and absorption,
  not ray-traced; the immersive view is a hypothesis, not microscopy.
  Swimmers drawn above the focal plane do not interact.

## Checks

```bash
node micro/prototypes/check.mjs amoeba
```

`window.__micro` exposes `{ renderer, camera, scene, scenes, view, body,
cyto, prey, world, state, features }` plus test hooks: `input` (override
the sticks), `press(name)`, `setMode(i)`, `pause()`, `renderOnce()`,
`advance(seconds)` (simulate without rendering), `spawnPrey(kind, x, y)`,
`clearPrey()`, `resetBody()`, `close()`, `surge` (the dash), `ctl`,
`readInput()`, `roles` (`{ pod, body, branch, latch }`), `rolesText()`,
`scheme('lead' | 'classic')`, `pinch(i, j)` (cut the ring as a hypha would)
and `fragments`; for multiplayer and the landmarks: `players`, `cells`,
`split`, `layout`, `beacon` (the P. bursaria), `leaf`, `landmarks.log`
(every landmark and near posted), `place(slot, x, y)`, `teleport('forward' |
'back', slot)`, `forceCapture(slot)`, `traps()`, `defend(on, slot)`,
`cut(slot)`, `chaos`, `pinchChaos(slot, reach)` and `engulf(slot)`. The trap
fight (windup, a stiffened block, cuts driving it off), Chaos (dormant, the
spread tell, the cup, pinched-off arms, retreat, an engulf with the camera
following) and both catches were checked in Playwright; the scripted pinch
test uses a relaxed reach (120 µm) because it does not drive the sticks. `body`, `cyto`, `capture` and `surge`
are player 1's. Multiplayer was checked with mocked gamepads in Playwright:
joins during play, 2 and 4 players splitting and merging, a catch in
multiplayer, both landmarks standalone and in the shell. Headless (SwiftShader)
this page drops to a few frames a second once the delivered images load, with
or without these changes, so scripted presses there are held for over a second.

## Sources

S04 NIES Amoeba morphology; S05 Jeon & Jeon (1976), SEM of *A. proteus*
during phagocytosis; S06 De la Fuente et al. (2019), amoeboid locomotion
and streaming; S07 Kreutz, *Paramecium caudatum*; S08 Ogura & Takahashi
(1976), ciliary reversal; S09 Knoll, Haacke-Bell & Plattner (1991),
trichocyst escape; S15 Lauga & Powers (2009), low Reynolds number. Full
citations in `micro/research/build.py`. Digestion time of Chilomonas
(3–18 min): Britannica, *Protozoan: mechanisms of food ingestion*.
