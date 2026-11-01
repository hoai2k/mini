# Amoeba · brightfield prototype

*Amoeba proteus* crawling on a wet-mount slide and hunting the way it really
does: it pushes out pseudopods, cups them round a ciliate or flagellate
without needing to touch it, and closes the cup into a food vacuole. The cell
keeps its volume, so every arm takes body from somewhere else. Ciliates flee
the approaching membrane, so the surge (A) matters, and the trap hyphae of a
predatory fungus wait on the slide. Crawl out in any direction: the
encounters are placed as you go, ahead of you in glass you have not seen yet,
one after another, out to the way on (a green *Paramecium bursaria* in a
golden glow) guarded by the giant amoeba *Chaos* (see *The slide*). Built in three.js (`../shared/vendor`, no
addons); world units are µm.

Open `micro/prototypes/amoeba/` (the invite gate is off on localhost).

## Controls (Xbox controller; keyboard in brackets)

Three schemes, chosen in Features → Controls. **Select and steer** is the
default (the owner's design); **Lead and follow** and **Two pseudopods
(classic)** behave exactly as before.

### Select and steer (default)

RS always steers the **selected** pseudopod and LS moves the body
(twin-stick), unless LT is held. The selected pseudopod carries a subtle mark
in the player's colour: a thin line along the membrane round its tip, a tick
and the letter **R**; while LT is held its neighbour carries an **L**. The
corner says what each stick holds (`RS: pseudopod R (3 out) · LS: body`).

| Button | Action |
| --- | --- |
| RS (arrows) | Steers the selected pseudopod (area conserved). With none selected, grows one in its direction and selects it. Pushed more than ~70° from the selected one's base (on a fresh push, or held there for 0.15 s), starts a new pseudopod there and selects it (or selects the one already standing out that way) |
| LS (WASD) | Moves the bulk of the cell that way (the rear contracts, the endoplasm streams forward). With RS held as well, the cell travels behind its pseudopod |
| LT (Z), held | LS steers the **adjacent** pseudopod instead: the neighbour round the outline towards the top of the screen (anticlockwise on the right half of the cell, clockwise on the left), or towards the bottom if the selected one is the topmost. With no neighbour there, one sprouts 55° round (above, unless the selected one already points within 40° of straight up) and buds a little so you see it. Let go: LS moves the body again and that pseudopod flows slowly back |
| RT (X) | Selects the next pseudopod **clockwise** round the outline (idle pseudopods count: selecting one takes it over). With LT held the pair moves together: the new selection's neighbour becomes the L one. With RS held through the press, the new one leans towards the stick (at most 60° off its base) until the stick comes round |
| LB (Q) | Spread out / relax |
| RB (F) | Push harder |
| LS click / RS click (C / V) | Fine focus down / up |

A centred RS lets the selected pseudopod flow slowly back; it stays selected
while it still stands out. After eating, the cup's pseudopods dissolve into
the vacuole, nothing is selected, and an RS still held must be let go before
it grows another. **Pinching Chaos**: hold LT and close RS and LS round one of
its arms from both sides (a pincer), then X.

In code (`main.js`, `selectInput`, `cyclePods`, `pickAdjacent`): the soft body
steers as many pseudopods as it is given (`Body.addPod`, up to 8 per cell), so
a pseudopod let go keeps flowing back on its own while another is steered.
The R/L marks are drawn on the landmarks overlay (`drawPodMarks`), clipped to
each player's region when the screen is split.

### Lead and follow

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

### All schemes

| Button | Action |
| --- | --- |
| **A (Space)** | **Surge**: for 0.9 s every active pseudopod extends up to 2.5× faster and may run a little further ahead, the rear contracts harder and streaming surges to the tips, so the whole cell lunges; recharges over 2.4 s (the `dash` meter). With no stick held it surges along the cell's heading (in select and steer and lead and follow, the body flows on that way). Tears the membrane free of a fungal trap |
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
  fresh amoeba on calm glass nearby (see *Being caught* below; in
  multiplayer, beside a teammate).

## The boss: Chaos (`chaos.js`)

The giant amoeba *Chaos*, multinucleate, an eater of smaller amoebae
(`../../design/bosses.md`; *Chaos* eating *A. proteus* is plausible but not
well documented), on guard at the portal. The same soft body as yours at ~1.9×
the width (~0.65 mm; real *Chaos* reaches 1–5 mm), with nine nuclei, slower.
Its look follows the delivered sheet (`../assets/reference-sheets/boss-chaos.webp`):
broad, blunt, finger-like arms (its pseudopods are ~1.7× the player's in
width), a thin clear rim, and olive-golden endoplasm packed with round
refractile granules to the tips (4200 granules, mostly lipid-like spheres and
food granules; an extra olive density and coarser granularity in the body
shader, `uLook`).

- **On guard**: it is off the slide until the portal is placed, then sits on
  its post beside the portal (330 µm to one side of it and 90 µm toward the
  way you came: `world.js` `chaosPost`, the first side with room), dormant,
  until a player's centre comes within 700 µm (`CHAOS_WAKE`); a brass
  **resolve** gauge shows while it is awake.
- **The tell**: it raises and spreads its pseudopods, every arm out at once.
  **The cup**: two arms reach to your flanks, then curl round behind you; if
  they wrap you (~170°+) it engulfs you. Every third attack is **a lunge**:
  one broad arm with the whole cell flowing after it.
- **Two ways past it.** *Lure it*: it follows you, slowly (~10 µm/s against
  your ~45), but no further than 720 µm from its post (`CHAOS_LEASH`), and once
  it is more than 360 µm off its post it only follows (no new attack); then it
  gives up and flows back. While it is more than 480 µm from the portal the
  portal is open: get round it. *Drive it off*: push into it and pinch its
  arms off: X when your membrane is on both sides of an arm's neck (within
  ~70 µm each side) cuts it (`Body.pinchAt`); the piece rounds up and dies.
  Each cut staggers it and wears it down; worn out, it flows away off the
  portal to rest to one side and stays beaten (the portal stays open).
  Surging (A) in the first moment of an engulf breaks out.
- **Engulfed**: drawn into its middle, darkened and shrunk in a food vacuole,
  while the camera follows it carrying you off; then the fade and respawn.
  Sated, it stays asleep for 40 s and flows back to its post.
- It targets the nearest player; the amoebae push against its membrane.

## The slide: scenery anywhere, encounters placed as you go

The owner's encounter pattern (`../../design/encounter-pattern.md`, *Placed
as you go*): a series of encounters and exploration, not a race. The slide's
scenery is laid out before play, anywhere; the encounters are placed by the
shared director (`../shared/director.js`) one at a time, in order, in glass
nobody has seen yet, a little ahead of whoever leads. Glass a player has seen
is never changed. Distances are µm from the start (the cell's centre at the
origin).

**Scenery** (`world.js`, the same every game):

| What | Where |
| --- | --- |
| Clear glass | the first 520 µm round the start (`SLIDE.warm`): no slide objects in focus |
| Easy prey (*Chilomonas*, *Chlamydomonas*: they do not flee) | a patch of four round the start, and 12 patches of three scattered over the slide (`PATCHES`: one per 30° sector, alternately 0.65-1.7 and 1.9-3.6 mm out), so food is always about |
| The fungal traps | 14 clusters of two hyphae (`TRAP_CENTRES`), scattered from ~1.4 to ~3.5 mm out on every side, at least ~400 µm apart (room to crawl between), clear of the leaf and the easy patches: static hazards you see and crawl round, in calm stretches too |
| The slide's objects | diatoms, flakes and filaments above the focal plane out to 5 mm (`SLIDE.field`) in every direction, a share of the flakes in every 30° sector of every band; filaments in focus only beyond 4.1 mm (`SLIDE.far`), where no encounter goes |

**The encounters** (`world.js` `ENCOUNTERS`, `DIRECTOR`; `main.js` *the
encounters, placed as you go*), in this order:

1. **A patch of fleeing ciliates** (*Tetrahymena*, *Colpidium*: surge to
   catch them), after a warm-up of ~5 s of crawling.
2. **A patch with *Paramecium caudatum*** (trichocysts) among them, after a
   calm break of ~3.5 s of crawling clear of the first.
3. **Chaos on guard beside the portal**, after another calm break.

- **Placement:** each goes 0.76-1.15 mm ahead of the leader (the portal
  1-1.5 mm), fanning out to the sides, then all round them, then farther out,
  only where every disc that could be seen of it (a patch and its prey; the
  portal's glow and Chaos) lies on glass nobody has seen and outside every
  view (the screen's rectangle round each split view and, while the camera
  lags a cell, round that cell: `directorViews`). Clear of the leaf, the trap
  hyphae and the far filaments (`clearAt`). One placed but not yet seen may be
  moved again, unseen to unseen, when the leader heads elsewhere (its prey go
  with it; Chaos goes back on its post by the portal).
- **Met:** a patch is met when a player's cell edge comes within ~120 µm of
  it. One seen but walked past counts as met once everyone is 1.3 mm off
  it, or after 6 s in sight nearby (it is never moved). The portal waits
  where it is.
- **Lingering** still brings them: after the warm-up (or a break) and 6 s
  more standing still, the next one is placed 0.65-1 mm round the player,
  out of view, and a patch placed beyond a lingering player's reach swims
  over to them (its centre drifts at 30 µm/s, `driftPatch`: behaviour, not a
  placement). In the end the portal is placed near them too.
- **The patches**: each prey keeps to its patch (a loose tether, slack while
  a player is in or beside the patch, so fleeing ciliates scatter and drift
  back), and an eaten one comes back to its patch about 8 s after it is
  digested, swimming in from out of everyone's view. So the start (and every
  patch) always has food: you can stay as long as you like. Prey far from
  every player only swim (no contact or collision checks).
- **The fungal traps** lie grown from the start; whether they bite shows on
  the hyphae (their knobs: large, dark and sticky while the fungus is hungry;
  small and pale while it rests). Only hyphae near a player fight.
- **The portal** (the way on) is the director's last entry, so it comes only
  after both patches were met. There is no arrow or edge pointer to it: keep
  crawling and you find it; the golden sparkle is its only marker.
- **Snags**: a cell whose rear hooks round a flake or a diatom stretches out
  behind its pseudopod; stretched past ~900 µm it flows over the small debris
  (flakes and diatoms; not filaments or the leaf) until it has gathered itself
  up (`nearCol` in `main.js`).

Timings. `route.test.mjs` runs the director with these settings against a
cell crawling straight out at 50 µm/s (the surge used whenever it is ready),
the 20× view round it: in 16 directions the ciliates are placed at 5.2 s and
met by 11.5-17.1 s, *P. caudatum* by 22-41 s, and the portal is reached at
44-62 s; standing still at the start, each comes in turn (the ciliates placed
at 11 s, met at 29 s; *P. caudatum* 38/56 s; the portal placed at 66 s, near
them) and the cell then goes to it. Scripted runs in the browser (both sticks
held toward the bearing, the surge whenever ready, steering off a snag after
3 s stuck; traps and Chaos passive, Chaos stood down once the portal is
placed) are in the *Checks* below; there the cell's snags on prey and debris
make the times vary more.

**Being caught** brings a single player back on calm glass a little back
from where it happened, toward the start (never further back than it), clear
of every hypha, Chaos, the leaf and the encounters' patches (`safeSpot`).
With others playing, beside a teammate.

## Landmarks (the way on and the way back)

Both are things on the slide, drawn into the same optical property buffer as
everything else.

- **Forward: the portal**, a green *Paramecium bursaria* swimming low over
  the slide at the opening toward open water, its Chlorella symbionts filling
  it with green (`prey.js` `bursaria`, kind 5 in `PREY_FS`; not prey here),
  in the shared golden glow (`../shared/portal.js` `createPortalGlow`: the glow
  pool, twinkling glints and the success burst, no beam and no text). The glow
  is drawn after the optics, over the microscope image, with an orthographic
  camera looking down on the slide: the group is turned so its "up" points at
  the viewer and built at unit size, scaled in the slide's plane only
  (`GLOW_S` µm), with `pixelHeight` sizing the glints for that camera
  (`drawGlow` in `main.js`; compiled and drawn once off screen at load, so no
  program links in play). It is dimmer and restless while Chaos is on guard
  and opens (brighter, calmer) when it is not. Placed (by the director) and
  guarded as *The slide* above says.
- **Reaching it**: when any player's membrane comes within ~45 µm of the
  *P. bursaria*: on guard (Chaos within 480 µm of the portal, not beaten or
  leaving), you are turned back (a brief toast, the first time) and Chaos
  turns on you; open, `enterPortal(cell)` runs, the one place the way on is
  triggered: the glow's burst, a golden bloom on the screen
  (`createPortalLight`), the portal chime and a rumble, then
  `embed.landmark('forward', { player })` (the shell runs the transition;
  standalone, `embed.js` shows a toast). Turned back and still at it when
  Chaos leaves: you go through. `embed.near('forward')` is posted while
  someone is within 1.2 mm of the placed portal, so the shell can load the
  next world. No arrow or edge pointer points to it (the owner's call): the
  sparkle on the slide is the only marker.
- **Backdoor: a Sphagnum leaf tip** dipping into the pool, about 2.3 mm to the
  left (`LEAF_FS`: one cell thick, large clear hyaline cells with fibril bands
  and pores in a net of narrow green chlorophyllose cells, and the water
  film's edge as a soft meniscus round it), its blade running on out beyond
  the slide's middle (`world.js` `LEAF`). The amoeba flows round it (capsule
  colliders down its axis). Near the tip a quiet "Y: Back to the tardigrade"
  prompt shows (the shell's, from `embed.near('back')`, or this page's own
  when standalone), and Y there posts `embed.landmark('back')` instead of
  toggling the labels. A hollow ring labelled Leaf marks it at the edge of the
  view (`../shared/landmark.js`).
- Steady crawling (both sticks held) covers ~45 µm/s on the ×10 clock (~65
  with the surge used whenever it is ready), so the way on is about a minute
  in a straight line and the way back under a minute.

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
  own membrane mask, body quad and granules. Per view, the cells it can see
  (Chaos too) go four at a time into one RGBA mask target, a channel each
  (one clear, one pass, one MSAA resolve), then their bodies into the
  property buffer. The split screen (`../shared/splitscreen.js`, 2D mode:
  a field drawn round a centre) composes each view into its own target
  (`render({ target })`, render scale 0.75), and while split the quality
  governor draws the property buffers at 0.7 (2 views) or 0.55 (3–4) of its
  scale, so a split frame costs well under N full frames. A joining amoeba
  starts from a settled teammate's shape (turned), so a join costs no long
  frame. Extra amoebae carry 1300 granules.
- **The fungal traps** catch whoever touches them. Alone, the full catch and
  the Eaten card, as before; with others playing the drained player sees the
  whole sequence, then a fresh amoeba appears beside a teammate (no card).
- **The landmarks** trigger for any player. Labels, look, objective and focus
  are player 1's.

## The intro (from the tardigrade)

In the game this world is the far end of the continuous transition from the
tardigrade (`../../game/README.md`, "The continuous transition"): the
tardigrade's freeze frame holds an *Amoeba proteus* crawling on the pool
floor past the rim leaf's tip, seen from straight above and turned the way
this cell faces as it opens, and this world fades in under the same framing,
the cell where that glimpse was. The two are the same size (the glimpse and
this cell are both 344 µm across: a pose's `len` here is 2 √(A0/π), the
disc of the starting area), so the pair is a hand-off: a short push (×1.35)
while the light changes from DIC to brightfield. This world preloads hidden
while the tardigrade nears its portal, declares `embed.provide('intro')`,
and on `hold` stays frozen at its start but renders (the HUD hidden), the
view centred on the cell, reporting how its opening view frames it
(`embed.opening`: looking straight down, `pitch` 1.55, `rel` π, the round
cell's starting front up the slide, `f` 344 µm over the 900 µm field). While held it takes the
shell's `camera` poses (`introView`: the view's centre and field from each,
on the cell), so the move ends exactly on the opening view and play carries
on from it; on `begin` its time eases back in over 0.6 s. Test hooks:
`__micro.pose()` (how the view just drawn frames player 1's cell),
`__micro.intro`.

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

The threats are the fungus (scattered traps) and *Chaos* (placed by the
director at the portal; see *The slide*);
their pacing and catches use the shared `shared/predation.js`
(`createHunger`, `createCapture`, `createFight`), as in the other prototypes.

- **Nothing runs you down.** There is no clock on the player: no hunger, no
  oxygen, no time limit, and going without food never harms the cell (eating
  grows it a little). The calm opening on a clock (the hyphae absent for the
  first 45 s, then growing in) is gone: the calm is the warm-up glass round
  the start, and the hyphae lie grown from the first frame.
  There is no current on the slide.
- **Hunger comes and goes** (the fungus's, and it shows): the fungus is hungry for 30–50 s:
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
  Then the fade and a fresh cell on calm glass nearby (or, with the card
  option, the Eaten card and a fresh cell where the old one was). The sticks do nothing during the catch, and the red
  line and the stats corner say why.
- **Testing:** Features → World → *Traps come and go* (off: sticky all the
  time). `window.__micro.pacing()` reports the time, when the traps
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

## Performance

Audited in `../../design/performance.md` (amoeba section, fixes A1–A6), all
applied:

- **Fixed steps**: 60 Hz, **at most 2 catch-up steps a frame** (the owner's
  trade-off: on a slow machine the world slows rather than stutters). Every
  step runs the soft bodies and distance grids; the granules (`Cytoplasm`)
  run once a frame, on the last step, integrating the time skipped.
- **Granules**: the crowding gradient is computed once per update on the
  40×40 grid and sampled once per granule (it was four bilinear density
  samples); the organelle list and tip caps are reused, not reallocated.
- **Masks**: one mask pass per view instead of one per cell, cells outside a
  view skipped.
- **Halo blur**: only phase contrast and darkfield read it, so brightfield
  and the immersive view skip its two passes (`amoeba-optics.js`).
- **Join**: a new amoeba copies a settled teammate's shape; alone (a
  respawn), its 90 warm-up steps are spread over the next frames.
- **Quality governor** (`../shared/quality.js`, Features → Rendering): steps
  the property buffers' scale down when frames run long (and up again), then
  the effects level (granules drawn 2600 → 1800 → 1100, then no chromatic
  fringes), and owns the pixel ratio (1.25 cap; 1.0 while split). `?q=high`
  fixes it for measurements.
- **Software GL** (SwiftShader, headless checks): the buffers at 0.5 of the
  screen or less, like the other worlds' fallbacks. Players never see it.

### Performance (second pass)

Nothing visible or felt changed: deterministic screenshots (fixed clock and
seed) match the previous build to within 1/255. Measured with a paused
JS-only bench of 60 Hz steps (`advance`), since the frame harness is noisy here:

- **Garbage**: `Math.hypot` returns a boxed number, and the per-pseudopod
  loops call it per membrane node and per granule, so the 8-pseudopod scheme
  multiplied it. Hot loops now use `hyp()` (`util.js`; a last-bit rounding
  difference at most). `Cytoplasm.flowAt` takes its point through a typed
  array (`flowQ`), the granule loop samples the distance grid inline, scratch
  objects are `Scratch` instances, and the self-crossing checks and collision
  circles reuse their storage. One player: 1.45 MB → 0.20 MB per step; three
  players together 3.0 → 0.3 MB; beside Chaos 3.6 → 0.46 MB.
- **Distance grid** (`amoeba-sdfgrid.js`): crossings sorted in place, column
  passes as two linear sweeps, the inside transform limited to the cell's box,
  the outside rows to the columns that hold the cell. Bit-identical output over
  3000 test outlines, 1.17 → 0.61 ms per build.
- **Collisions**: circles clear of the ring's bounding box are skipped (exact).
- **Render**: a cell's outline, uniforms and granules update only when a view
  draws it (Chaos far away costs nothing).
- Simulation per step, three players together: 7.6–9.1 → 5.4 ms.
- **Join**: the 90 warm-up steps are gone (since the first pass). What remains
  in the join frame is the first use of the split-screen shader programs (six
  links, 100–400 ms in SwiftShader); prewarming them at load belongs in
  `../shared/splitscreen.js`.
- **Shaders at load** (third pass): `view.precompile()` compiles every program
  the view can use right after it is made (the composite into a split view's
  target, pinched-off fragments, each prey and slide-object kind, Chaos and
  the trap hyphae included), and `splitscreen.js` compiles its compose
  programs when it is created; both use `compileAsync`, then draw each new
  program once where nothing shows (1-pixel targets; a zero-area triangle via
  `split.prewarm()`), since SwiftShader builds a pipeline only at its first
  draw. Joining now links no program (6 before); the join frame's main-thread
  time fell from 144–284 ms to 65–191 ms (SwiftShader, 640×360, a loaded
  machine); load time and steady frame times are unchanged within noise.

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
| Rendering | Quality governor (auto); Manual quality | on; High |
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
| World | Traps come and go (fungal hunger) | on |
| Body | Membrane never crosses itself | always |
| Body | Pinch-off (rare) | on |
| Controls | Controls: Select and steer, Lead and follow, Two pseudopods (classic) | Select and steer |
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
node micro/prototypes/amoeba/route.test.mjs   # the scenery on every side; the director: rushing in 16 directions, lingering, turning back
node --test micro/prototypes/shared/director.test.mjs
node micro/prototypes/check.mjs amoeba
node micro/prototypes/amoeba/opening.mjs --check   # the tardigrade's glimpse is still this world's opening cell
```

`opening.mjs` loads the page with no frames run, reads the cell its
deterministic warm-up leaves (the outline, the nucleus, the contractile
vacuole) and writes `../shared/amoeba-opening.js`, which the tardigrade
world draws on its pool floor (`tardigrade/landmarks.js` `buildAmoeba`), so
the Tardigrade → Amoeba crossfade turns that cell into this one. Run it
without `--check` after any change to the warm-up, the soft body or the
seeds.

`route.test.mjs` checks that nothing is placed in view, every encounter comes
in order (the portal last), and, in the lingering and turning-back runs and
every fourth rush, that what the director put in a grid cell never changes
once a view has seen that cell. Scripted runs in the
browser (2026-11-01; `advance()` in 0.25 s steps, both sticks toward the
bearing, the surge whenever ready, steering 70° off for 2 s after 3 s stuck,
traps and Chaos passive, Chaos stood down once the portal is placed): nothing
was ever placed inside the screen's rectangle, and every run met the
ciliates, then *P. caudatum*, then reached the portal. Portal reached at
0° 100 s, 180° 85 s, 270° 82 s (8-11 snags each, the cell catching prey in a
fork or hooking round debris and hyphae); turning back at 16 s (45°) 50 s;
standing still at the start, the patches came to the cell and the portal was
placed at 46 s and reached at 65 s. At 90° the cell wedged itself across a
trap hypha (stretched out, the sticks flailing) and never got there in 240 s.
The scripted push snags far more than a player steering would; the director's
own timings are the node runs above.

Re-run 2026-11-01 (the pre-deploy audit's script, no animation frames so it
is deterministic, Chaos kept stood down every step, and "reached" meaning
the portal was entered: the outro starts): 0° 44.8 s, 45° 55.5 s, 90°
63.5 s, 180° 160.3 s, 270° not in 240 s. The audit had 90° "never arriving"
with the cell crawling 90-140° off the stick from ~200 µm out: it had in
fact gone through the portal at 63.5 s (the way on opens when the membrane
touches the *P. bursaria* beacon, 210-300 µm from the portal's centre, and
the outro then takes the sticks), and the script, waiting for the centre to
come within 85 µm, kept steering a cell that no longer listened. Two things
it did find stand: the director re-placing an unseen portal (`placePortal`)
puts Chaos back on guard, and a pseudopod pushed straight into a large
obstacle (the Sphagnum leaf's tip at 180°, a diatom on the line at 270°)
slides along it and the cell backs away from it rather than going round,
so a stick held straight at the portal behind one does not get there (at
270° the cell drifted away from it for ~70 s); steering round works.

`window.__micro` exposes `{ renderer, camera, scene, scenes, view, body,
cyto, prey, world, state, features }` plus test hooks: `input` (override
the sticks), `press(name)`, `setMode(i)`, `pause()`, `renderOnce()`,
`advance(seconds)` (simulate without rendering), `spawnPrey(kind, x, y)`,
`clearPrey()`, `resetBody()`, `close()`, `surge` (the dash), `ctl`,
`readInput()`, `roles` (`{ pod, body, branch, latch, sel, adj }`), `rolesText()`,
`pods(slot)` (select and steer: `{ sel, adj, list }`, each pseudopod's angle
round the outline), `route()` (the slide, the trap hyphae's distances, the
patches (scenery and the encounters') and their prey, `met`: when and how far
out each encounter was placed and met, and the director's state),
`encounters()` (the director's state: the current entry, its phase, each
entry's place and times), `director`, `seenAt(x, y)`, `placeNow()` (end the
current break), `placeEncounter(id, x, y, b)`, `portal()` (placed, found,
guarded or open, where it is, Chaos's state and distance), `placePortal(a,
slot, d)` (the portal `d` µm from that player at bearing `a`, as the director
would: every encounter before it counts as met), `enterPortal(slot)`, `passive(on)`
(traps never arm, Chaos never wakes: scripted runs), `log` (the encounter log),
`scheme('select' | 'lead' | 'classic')`, `pinch(i, j)` (cut the ring as a hypha would)
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
multiplayer, both landmarks standalone and in the shell. Select and steer was
checked with mocked pads: RS grows a pseudopod, RS >70° away starts and
selects a new one, RT goes round clockwise and wraps, LT gives LS the
adjacent pseudopod (or sprouts one above a lone right-side one), RT with LT
moves the pair, LS without LT moves the body, two players steer
independently, and LT + RS + LS round an arm of Chaos then X pinches it off.

## Sources

S04 NIES Amoeba morphology; S05 Jeon & Jeon (1976), SEM of *A. proteus*
during phagocytosis; S06 De la Fuente et al. (2019), amoeboid locomotion
and streaming; S07 Kreutz, *Paramecium caudatum*; S08 Ogura & Takahashi
(1976), ciliary reversal; S09 Knoll, Haacke-Bell & Plattner (1991),
trichocyst escape; S15 Lauga & Powers (2009), low Reynolds number. Full
citations in `micro/research/build.py`. Digestion time of Chilomonas
(3–18 min): Britannica, *Protozoan: mechanisms of food ingestion*.
