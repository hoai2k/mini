# Amoeba · brightfield prototype

*Amoeba proteus* crawling on a wet-mount slide and hunting the way it really
does: it pushes out pseudopods, cups them round a ciliate or flagellate
without needing to touch it, and closes the cup into a food vacuole. The cell
keeps its volume, so every arm takes body from somewhere else. Ciliates flee
the approaching membrane, so the surge (A) matters, and the trap hyphae of a
predatory fungus wait on the slide. Crawl out in any direction: the
encounters are placed as you go, ahead of you in glass you have not seen yet,
one after another, out to the way on (a green *Paramecium bursaria* in a
golden glow) with the giant amoeba *Chaos* lying beside it (see *The boss*
and *The slide*). Built in three.js (`../shared/vendor`, no
addons); world units are µm.

Open `micro/game/amoeba/` (the invite gate is off on localhost).

Focus controls are removed in every scheme; the microscope retains its fixed focus.

## Controls (Xbox controller; keyboard in brackets)

Three schemes, chosen in Features → Controls. **Pseudopods and movement** is
the default (the owner, 2026-11-02; it replaces "Select and steer", where the
triggers chose pseudopods); **Lead and follow** and **Two pseudopods
(classic)** behave as before.

### Pseudopods and movement (default)

The logic is `select.js` (pure, tested in node by `select.test.mjs`); `main.js`
feeds it each player's body and roles. Three modes, read afresh every frame
from the triggers: LT held is movement mode, RT past 50% is choosing (release below that to leave it), neither is
pseudopod mode. The owner, 2026-11-03: "we won't auto select pseudopods after
neutral but keep them defined. To change them we hold RT and then we see a
glow at the base of the currently selected pseudopods. If any are currently
moving they don't become editable until they rest at neutral first. When
editable you can move their stick around and the glow will find a new base
to use. The glow should move smoothly from its initial position and settle
accurately, being easy to control. If needed to display the selection, auto
zoom the camera out and keep it there."

| Button | Action |
| --- | --- |
| LS / RS (WASD / arrows) | **Steer your pseudopods.** Each stick keeps one: LS the one marked **L**, RS the one marked **R**. Pushed (past 0.3), the stick steers it (direction and reach); at neutral (below 0.15) it rests (no longer steered, it flows slowly back) and stays that stick's, so the next push steers the same one. Only when it is gone (drawn in, eaten, merged) does the next push take a default: the pseudopod whose tip lies within 34° of the stick (idle ones too), or a new one grown at the membrane that way. R and L are never the same |
| RT (X), held | **Choose pseudopods.** The sticks steer nothing. A soft glow in your colour, marked L and R, sits at the base of each stick's pseudopod (where it meets the body). A stick still pushed as RT goes down is *busy*: its glow is dim and pulsing until the stick comes back to neutral; then it is *editable* (bright, ringed). Pushed past 0.25, it slides its glow round the membrane toward the stick's direction: critically damped easing (13 rad/s) from where it was, settling exactly on the target; within 20° of a pseudopod's base the glow snaps to it, and lets go only past 28° (no flicker). L and R never share a base: the other's is skipped and the glow is held 24° aside. Let go of RT and each moved glow takes the pseudopod at its base, or, at bare membrane, grows a new one there (pushed out on its own for 0.8 s, along the membrane's normal); a glow left alone keeps its pseudopod; a stick still pushed must come back to neutral before it steers. Sounds: a soft stretch on entering, a squish on a commit, and a short rumble. On above 0.5, off below 0.3 |
| LT (Z), held | **Move the cell.** The sticks become movement intents; the pseudopods stay assigned and rest. One stick, or both the same way: the cell crawls that way. Two different ways: it crawls between them and widens across its path. LS left + RS right (apart): stretches along that line; LS right + RS left (together): squishes; LS up + RS down: turns clockwise, LS down + RS up: anticlockwise, like a tank (the contents turn with it). Mixed angles blend (below). **Rolling into a pseudopod** (the owner, 2026-11-03: "if moving in the direction of an extended pseudopod, if that stick is not pointing in the same direction, the pseudopod should thicken into a stump as the body rolls into/past it. If the pseudopod is actively reaching forward while moving then it stays"): a steered pseudopod within 60° ahead of the crawl whose own stick does not point on along it (within 35°), or which has none, is fed only a weak, fully spread push, so it shortens and its base broadens into a stump, and the cell is squished along the travel so the body flows into it; once it stands out less than 22 µm it is let go and merges. Its stick pointing on along the crawl, it keeps reaching and the cell travels behind it (with both sticks forward, both crawl and both pseudopods they point along keep reaching). Pseudopods to the side or behind are left alone. On above 0.5, off below 0.3 |
| LB (Q) | **Thicken**: the pseudopod a pushed stick is steering gets broader and shorter (the thickness that wins pushes, `contact.js`). With none steered, the whole cell spreads out at once; held on, from about 1.5 s it draws its pseudopods in and rounds up, near round after about 8 s |
| RB (F) | **Push harder**: the steered pseudopod runs out faster; in LT movement mode, crawling is 50% stronger. A surge also boosts movement, and combines with RB |

**The camera when choosing**: if the cell and its glows (70 µm round it) do
not fit within 80% of the view when RT goes down, the field widens to frame
them (eased over ~0.6 s), up to 3×, and stays there: it never zooms back in
on its own; the D-pad objective starts afresh. One field serves every view,
so in split screen it widens for whichever player needs it.

Movement mode in detail (`moveInput` in `main.js`): with a = LS and b = RS,
the cell travels along a + b (capped at full speed). How far apart the sticks
point weights the rest: from 90° to 160° apart, d = (b̂ − â)/2 × the weaker
stick's push drives a stretch (horizontal part of d > 0) or squish (< 0) along
the line of the sticks and a turn by its vertical part (0.45 rad/s game time at
full); below that, 15–75° apart widens the cell across its travel. In the soft
body (`shared/techniques/amoeba-softbody.js`) these are `input.shape` (the ends
pushed out or in, the area taken from or given to the sides, stretching
stopping at about 2.1 radii, squishing at about 0.65), `input.turn` (the
outline rotated about the centroid; `cytoplasm.rotateAbout` turns the
contents) and `input.round` (LB with nothing steered); shaping in place quiets the idle pseudopods
and holds the centroid, so it goes nowhere. Per-pseudopod `input.pods[k].push`
and `.spread` carry RB and LB.

The marks: a thin line along the membrane round each owned pseudopod's tip, a
tick and the stick's letter in the player's colour; dimmer while it rests.
While choosing, the glows replace them. The corner says what each stick holds
(`LS: steering L · RS: R resting · LT: move · RT: choose`; `RT: choosing
pseudopods · LS: L busy (back to neutral first) · RS: R at a new base`; `LT:
moving the cell (crawling + widening)` in movement mode).

The other schemes are unchanged: **Lead and follow** (either trigger held
grows the second pseudopod) and **Two pseudopods (classic)** (physical LT
pushes harder, RT spreads, after the trigger swap in `rawInput`).

After eating, the cup's pseudopods dissolve into the vacuole and a stick still
pushed must be let go before it grabs another. Against another cell (Chaos,
or another player) a pseudopod is a push: aim a broad one at it, or surge
(A), and it gives ground (see *Cells push, never overlap*).

### Lead and follow

At any moment one stick is the **pseudopod stick** and the other the **body
stick**. With no pseudopod out, the first stick pushed grows one in its
direction and becomes the pseudopod stick; the other becomes the body stick.
The corner shows the roles (`LS: body · RS: pseudopod`).

| Button | Action |
| --- | --- |
| Pseudopod stick (LS WASD or RS arrows) | Aims and extends the pseudopod (area conserved, as before) |
| Body stick (the other one) | Moves the bulk of the cell that way: the rear (uroid) contracts, the endoplasm streams forward, the centroid travels. **Both held**: the pseudopod holds its length and its tip keeps advancing, so the cell travels behind it. **Body stick alone towards the pseudopod**: the body flows into it and takes it back. Pointed elsewhere: the body goes that way and the pseudopod trails or flows back |
| RT / LT (Z / X), held | The body stick grows a **second pseudopod** instead, starting 30–70° round from the first on the side the stick points, so the two can close round prey. Let go: that stick moves the body again, and the second pseudopod relaxes slowly (hold the trigger again to pick it back up) |
| LB (Q) | Spread out / relax: the cell flattens, rounds up and its pseudopods relax |
| RB (F) | Push harder |

The roles reset once the pseudopod is fully taken back or has flowed back,
and after eating (the cup's pseudopods dissolve into the vacuole). A stick
still held when you eat must be let go before it can lead again; a body stick
still held keeps moving the body.

### Two pseudopods (classic)

| Button | Action |
| --- | --- |
| LS (WASD) | Pseudopod 1: grows from the part of the cell facing the stick; turning the stick bends it; stick magnitude is how hard it pushes |
| RS (arrows) | Pseudopod 2, so the two sticks can wrap a cup round prey from both sides |
| LT (Z) | Push harder |
| RT (X) | Spread out / relax: the cell flattens (its footprint grows, since the volume is fixed), rounds up and its pseudopods relax |

### All schemes

| Button | Action |
| --- | --- |
| **A (Space)** | **Surge**: for 0.9 s every active pseudopod extends up to 2.5× faster and may run a little further ahead, the rear contracts harder and streaming surges to the tips, so the whole cell lunges; recharges over 2.4 s (the `dash` meter). With no stick held it surges along the cell's heading (in the default scheme and lead and follow, the body flows on that way). Tears the membrane free of a fungal trap |
| **X (E)** | **Close the food cup** round the prey it wraps (needs ≥ 190° of membrane round it; the contextual close hint appears only from 300°): the rims advance and endoplasm floods in to fill round the prey until they meet. At a trap hypha: a pseudopod jab that cuts its tip. (Rarely: with your membrane closed on both sides of an arm of Chaos, it pinches the arm off) |
| B (Shift) | Let go while closing; otherwise egest the oldest food vacuole at the uroid (a live, barely digested prey swims away). Near a threatening trap hypha (or stuck on one), hold to **stiffen** (defend) |
| Y (R) | At the leaf tip (the backdoor) Y goes back up to the tardigrade, and at the open portal (any part of your cell on it; the game shows "Y Enter the portal") Y goes through it; elsewhere it does nothing. The anatomy labels it toggled until 4 November 2026 (nucleus, contractile vacuole, uroid, hyaline caps, ectoplasm, endoplasm, prey with real sizes, trap hyphae) are in the Features panel (Rendering, Anatomy labels): the owner asked for the info-overlay action to go from every world. The in-game controls lists have no Y row (the portal and the way back ask for Y on screen when you are there) |
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
- **Being eaten** (no card): strike, hold, drain (a surge tears free until
  the drain is done), then the cell dies on screen (see *Harm, shown on the
  cell* below), a short fade, and a fresh amoeba gathers itself up on calm
  glass nearby (see *Being caught* below; in multiplayer, beside a teammate).

## The boss: Chaos (`chaos.js`)

The giant amoeba *Chaos*, multinucleate, an eater of smaller amoebae
(`../../design/bosses.md`; *Chaos* eating *A. proteus* is plausible but not
well documented), lying beside the portal. The same soft body as yours at ~1.9×
the width (~0.65 mm; real *Chaos* reaches 1–5 mm), with nine nuclei, slower.
Its look follows the delivered sheet (`../assets/reference-sheets/boss-chaos.webp`):
broad, blunt, finger-like arms (its pseudopods are ~1.7× the player's in
width), a thin clear rim, and olive-golden endoplasm packed with round
refractile granules to the tips (4200 granules, mostly lipid-like spheres and
food granules; an extra olive density and coarser granularity in the body
shader, `uLook`).

The owner (2026-11-02): "the normal interaction would be just pushing and
ensuring you don't get encircled ... he shouldn't eat you just by touching
you, but rather only if he manages to encircle you entirely and then do his
equivalent of pressing X. That's what he'd attempt to do, but you have to
prevent it and find the portal."

- **Beside the portal**: it is off the slide until the portal is placed, then
  lies on its post beside it (330 µm to one side and 90 µm toward the way you
  came: `world.js` `chaosPost`, the first side with room; its edge just short
  of the portal's centre), dormant. It is slow to notice you: only after you
  have been within 240 µm of its edge (`CHAOS_WAKE`) for 2.2 s, or bump into
  it, does it stir. So you can slip past it to the portal.
- **Pushing.** Awake, it flows at you and pushes. Cells never overlap (see
  *Cells push, never overlap*): you push back, and the thicker, more actively
  advancing membrane wins ground. Its broad arms beat your thin pseudopods,
  your body or a broad pseudopod holds one of its arms, and a surge (A)
  shoves it. Touching it never eats you.
- **The tell**: it raises and spreads its pseudopods, every arm out at once
  ("it is going to try to surround you").
- **The encircle** (every other attack; between attacks it recovers 4.5 s
  and then stalks and pushes, so most of the bout is shoving): two broad arms start from its
  membrane beside your flanks and crawl round you, hugging your outline about
  95 µm out, curling on behind you; its body leans in. How far it rings you is
  measured every step (`contact.js` `encircle`: 48 rays from your centre, each
  covered where its membrane lies within 120 µm beyond your edge) and drawn as
  **the closing ring**: rust-red arcs round your cell where it already has you,
  thicker and brighter as it closes, the open arc the gap to get out by. Its
  rust stain seeps into your cell where its arms press (`harmOf`), and the
  `shared/danger` sound plays as the ring passes half way.
- **Its X**: only when the ring is nearly shut (90% of the bearings covered
  and no gap wider than ~26°) does it close it, its equivalent of X: 1.2 s in
  which both arms drive for the last gap, the ring pulses and tightens, the
  danger sound plays again and your membrane trembles. Fully shut at the end
  (94%), you are engulfed; forced open first (below 80%) or not closed, it
  has to start again. A still cell is ringed within one 9 s encircle and
  engulfed ~11 s after Chaos wakes; a cell that keeps a way out is not.
- **Getting away**: push out through the gap (both sticks that way, LT, a
  surge), or force the ring open with a thick pseudopod or your body. Every
  other attack is instead **a shove**: one broad arm with the whole cell
  flowing after it, pushing hard (never a bite).
- **The lure**: it follows you, slowly (~10 µm/s against your ~45), but no
  further than 720 µm from its post (`CHAOS_LEASH`), and once it is more than
  360 µm off its post it only follows (no new attack); then it gives up and
  flows back. Pushed off its post while dormant, it flows back too.
- **The portal never waits on it**: there is no guard rule. Open, Y enters
  whatever Chaos is doing; on the portal itself it blocks only with its body,
  and you can force a pseudopod through that (below).
- **Forcing a pseudopod through it** (the owner, 2026-11-02: "you should be
  able to try to push a pseudopod through the boss's body to reach the
  portal, if it's directly on top of it. I want the amoeba battle to be very
  push-and-pull oriented"). A pseudopod pushed into Chaos dents its membrane
  in: a channel, lined with Chaos's membrane, opens ahead of the tip (never an
  overlap). Chaos remembers each dent (`body.dent`), pushes back harder the
  deeper it is (× 1 + dent / 250 µm in `pushAt`) and squeezes it shut again
  (`squeeze`: 32 µm/s back out, the dent fading at 15%/s), so the tip gains
  only while it pushes harder than that: a broad pseudopod (LB), pushed (RB),
  with a surge (A) every time it recharges, works its way in; a thin one
  stalls; ease off and the channel closes and shoves it back out. While a
  steered pseudopod presses on another cell, the body puts its weight behind
  it (flows on after it), so a held push keeps driving. The tip counts at the
  portal like any part of the cell (`reaches`), so "Y Enter the portal" comes
  up with Chaos still over the glow. Chaos, woken, goes on trying to ring
  you while you do it. Node (`contact.test.mjs`, Chaos calm, a portal 260 µm
  inside its edge): the broad surging pseudopod gets ~120-140 µm in and
  reaches the portal in ~4 s; the thin one stalls under ~60 µm and never
  does; let go after 8 s, the channel is pushed back out to under a third.
- **Pinching (rare, not the way to play it)**: X when your membrane closes on
  both sides of the neck of one of its arms (within ~70 µm each side) cuts it
  (`Body.pinchAt`); the piece rounds up and dies and it staggers. Enough cuts
  and it flows away to rest to one side for good. Nothing prompts it.
- **Engulfed**: drawn into its middle, darkened and shrunk in a food vacuole,
  a rust-brown stain of its digestion seeping in from its side (a surge breaks
  out in the strike or hold); then the cell dies on screen, the fade and the
  respawn. Sated, it stays asleep for 40 s and flows back to its post.
- It targets the nearest player; a ring in progress stays on whoever it is
  round.

## Cells push, never overlap (`contact.js`)

The owner (2026-11-02): "you shouldn't overlap him, you should have more of a
push-pull struggle (same with other players)". Cells are not each other's
colliders: every body steps freely, then `resolveCells()` (`main.js`)
settles every touching pair (each player and Chaos, players with each other)
with `contact.js` `resolvePair`: each membrane node of one cell that got
inside the other is moved out, and the other's membrane at that spot gives
way, the weaker side yielding more. Its membrane dents in (and the area
projection bulges it out elsewhere, so it gives ground), and a share of the
yield moves the whole cell (a shove; less for a bigger cell). Up to six
passes, three times round `untangle()`, run last in the step (after prey and
untangling have moved membrane); a couple of µm of overlap at most is left
(Playwright: ≤ 2.3 µm between two players pushing for 6 s; 0 µm against
Chaos).

- **Push strength** at a contact node (`pushAt`): the cell's cross-section
  there (`thickness`: an inward ray to the far membrane, or, at a
  pseudopod's tip, the chord across it 20 µm inside, whichever is less,
  capped at 250 µm, so a broad pseudopod beats a thin one and a body beats
  either) × how actively
  that membrane is advancing (0.5 resting, up to 1.5 in a pseudopod's cap or
  the front of a flowing body: `Body.Gp`) × the cell's `pushK`: for a player
  the surge factor (up to 2.5 at its peak), × (1 − 0.6 × spread) for RT, ×
  1.25 stiffened (B); for Chaos 0.85, 0.95 in an encircle and 1.5 in a shove.
- **Contact inhibition**: a player's idle pseudopods are drawn in while it
  touches another cell (`touchT`, 0.6 s after the last touch, and while
  Chaos's ring is shut round it), as real amoebae's pseudopods collapse on
  contact; the ones you steer are not.
- `contact.test.mjs` runs it in node: two cells never overlap, the stronger
  push wins ground, thickness, the ring measure, Chaos engulfing a still cell
  only after its ring and X, and a cell pushing out through the gap escaping.

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
- **The default path** (the owner, 2026-11-01: "a default path to a portal,
  but just dynamically generate the other directions"): on the director's
  first update all three are laid along one bearing from the start
  (`world.js` `DEFAULT_PATH`), straight up the screen (`FORWARD`, π/2: the
  view never turns, so up is where a player most likely heads; the owner,
  2026-11-03: "the default path [should] be straight forward essentially,
  since that's the most likely direction of travel when the camera is
  fixed"; it was 0.2 rad, to the right; both are away from the leaf), each
  as near the line as it fits (`lateral`). A rush's spacing would put the
  portal past the clear glass, so the distances are given: the ciliates
  ~1.1 mm out, *P. caudatum* ~2.6 mm (past a cluster of fungal traps that
  stands on the line at ~2.1 mm), the portal ~3.5 mm, out of sight, so the
  way on exists from the start. Crawling straight up (`route.test.mjs`,
  50 µm/s) meets them where they lie: the ciliates at 13.1 s, *P. caudatum*
  42.7 s, the portal 67.6 s. Follow that bearing and you
  meet them in order where they lie; crawl off another way and each, while
  nobody has seen it, leaves the path and is placed ahead of you as before
  (each is one thing, a patch moved whole with its prey or the portal: the
  director's `single`); one somebody has seen stays put.
- **The portal** (the way on) is the director's last entry: on the default
  path from the start, else placed after both patches were met. It stays
  sealed until both patches are met (no prompt, its sparkle shut, nothing
  preloaded; reaching it says why, as a toast and on the warning line for as
  long as you stay: "Sealed: the way on opens once you have hunted the
  fleeing ciliates", or "... met the *Paramecium caudatum* patch"); Chaos
  lies beside it as always. There is no arrow or edge pointer to
  it by default: keep crawling and you find it; the golden sparkle is its
  only marker. With **Portal arrow** on in the game's Settings (default off;
  `?arrow=1` on this page) each view gets a brass arrow at its edge toward
  the bursaria, sealed or not, with the view's nearest cell's distance
  beside it ("3.0 mm"; µm under 1 mm). Test hooks: `portalArrow()`,
  `portals()`, `portalSealed()`.
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
  program links in play). It is dimmer and restless while sealed and opens
  (brighter, calmer) once its encounters are met. Placed (by the director)
  as *The slide* above says, with Chaos beside it.
- **Reaching it**: a player is at the portal when any part of its cell
  (outline or pseudopod) is within 120 µm of the portal's centre (`PORTAL.R`,
  `atPortal`: the nearest membrane node, or the centre inside the cell), not
  only its centre. The portal opens once its encounters are met and never
  waits on Chaos (the owner, 2026-11-02): slipping past it or pushing it aside
  is enough; Chaos right on the portal blocks it only with its body. (Before,
  reaching it while Chaos was within 480 µm of the portal and not beaten
  turned you back with no prompt and only a one-off toast, and the membrane
  had to come within ~45 µm of the wandering *P. bursaria* rather than the
  portal: why the owner reached it and saw no "Press Y".) Sealed, it says
  why (above). Open, it is never an
  automatic door (the owner, 2026-11-01): while anyone is at it the game
  shows "Y Enter the portal" (`embed.near('portal', true)`; standalone,
  `shared/embed.js` shows it), and that player's **Y** (R) runs
  `enterPortal(cell)`, the one place the way on is
  triggered: the glow's burst, a golden bloom on the screen
  (`createPortalLight`), the portal chime and a rumble, then
  `embed.landmark('forward', { player })` (the shell runs the transition;
  standalone, `embed.js` shows a toast). `embed.near('forward')` is posted while
  someone is within 1.2 mm of the open portal, so the shell can load the
  next world. No arrow or edge pointer points to it (the owner's call) unless
  the Portal arrow setting is on: the sparkle on the slide is the only marker.
- **Backdoor: a Sphagnum leaf tip** dipping into the pool, about 2.3 mm to the
  left (`LEAF_FS`: one cell thick, large clear hyaline cells with fibril bands
  and pores in a net of narrow green chlorophyllose cells, and the water
  film's edge as a soft meniscus round it), its blade running on out beyond
  the slide's middle (`world.js` `LEAF`). The amoeba flows round it (capsule
  colliders down its axis). Near the tip a quiet "Y: Back to the tardigrade"
  prompt shows (the shell's, from `embed.near('back')`, or this page's own
  when standalone), and Y there posts `embed.landmark('back')`. A hollow ring labelled Leaf marks it at the edge of the
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
  run unchanged for each cell. Amoebae push against each other and never
  overlap (*Cells push, never overlap*); prey flee, touch and are cupped by
  any of them.
- **Colour**: each player's cell has its own shade (**Telling players
  apart**), a faint tint of the player's colour in the cell (`uTint` in
  `BODY_FS`, mostly in the clear ectoplasm rim), and a broken ring and name
  tag round each amoeba; each player's cup reticle is labelled.
- **Rendering**: each amoeba is a cell layer in `render.js` (`addCell`): its
  own membrane mask, body quad and granules. Per view, the cells it can see
  (Chaos too) go four at a time into one RGBA mask target, a channel each
  (one clear, one pass, one MSAA resolve), then their bodies into the
  property buffer. The split screen (`../shared/splitscreen.js`, 2D mode:
  a field drawn round a centre) prefers one shared field: as the cells
  spread the field widens (the split's `zoom`) up to 2x before it splits,
  and it merges once they are back inside 0.75 of that for most of a second
  (split views keep a 1.5x field). It composes each view into its own target
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

## Telling players apart

Every player's amoeba has its own shade of endoplasm and of its food
vacuoles, as extra optical density (red, green, blue absorbed), so it reads
in brightfield whether it plays alone or with others (`VARIETIES` in
`main.js`, `setVariety` in `render.js`, `uVarE` / `uVarV` in `BODY_FS`).
Player 1 is today's cell.

| Player (colour) | Endoplasm and food vacuoles |
| --- | --- |
| P1 (gold) | today's: warm olive-grey |
| P2 (teal) | a cool grey-green |
| P3 (rose) | rosier, mauve-brown |
| P4 (blue) | bluish slate |

The faint multiplayer tint in the rim, the ring and name tag stay as before.
**Departure**: real amoebae vary in shade with what they have eaten and
stored, but not one colour per strain; here each player's cell keeps its own.

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
  seconds left, and the anatomy labels (Features) mark each hypha.
- **Stuck** on a sticky hypha, a red line at the top counts down to the
  haustoria (8 s, as before) and asks for a surge (A).
- **The catch, shown in full:** **strike** (0.45 s): haustoria (feeding
  hyphae, drawn without knobs) pierce the membrane where it is glued and grow
  toward the centre; **hold** (1 s): they reach in and the cytoplasm starts
  to brown; a surge (A) in the strike or hold still tears the cell free,
  and the haustoria take a bite (−7% of its area) as before; **eat**
  (1.8 s): the cytoplasm is drained, darkening and turning brown, and the
  cell shrivels to 55% of its area (`amoeba/engulf`, then `amoeba/digest`).
  The player keeps control throughout (the sticks still steer, B still
  stiffens), and a surge in the eat tears free too, at the cost of what was
  drained. Then **die** (1.8 s, the sticks no longer answer), a 0.45 s fade,
  the respawn on calm glass nearby and a 0.45 s fade in, while the fresh cell
  gathers itself up (1.3 s). The caption at the bottom says only "Drained by
  a trap fungus" (or "Engulfed by Chaos").

### Harm, shown on the cell

The owner, 2026-11-02, after a run where a toast about a fungus was followed
by a respawn with nothing on screen to explain it. What had happened: a
fungal hypha snapped shut on the membrane, held it for 8 s (only the red line
said so), its haustoria drained the cell, and the game took the controls away
and cut to a fresh amoeba with a toast. Now the danger shows where it comes
from (`harmOf`, `stepHarm` in `main.js`; drawn by `render.js` and `BODY_FS`):

- **Stuck on a hypha:** a yellow-green poison stain seeps into the cytoplasm
  from up to three glued spots, its reach growing from ~30 to ~95 µm towards
  the 8 s mark, and the membrane there trembles (a fast flicker of the
  outline within 60 µm of each spot).
- **Caught:** the stain spreads from the haustoria with the drain (~60 µm in
  the hold, ~180 µm into the eat) until it fills the cell; the tremor goes on
  until it dies.
- **Engulfed by Chaos:** the same in rust brown, from Chaos's side.
- **Torn free:** the bitten spots stay stained, fading over 5 s.
- **Death** (C.death, the 1.8 s die phase): the cell goes slack (its outline
  wrinkles all round and it shrinks), breaks up into patches from the
  membrane inward (fragments discarded by a noise threshold), and its
  granules drift outward and fade. **Re-forming** (C.reform): the fresh cell
  runs the same in reverse, granules gathering into it.

The stains are three uniforms (`uStain`: position of the membrane node, reach,
strength; `uStainC`: the colour as optical density), so they move with the
membrane and read in every optics mode.
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
| Controls | Controls: Pseudopods and movement, Lead and follow, Two pseudopods (classic) | Pseudopods and movement |
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
  simulated. Spreading (RT) trades thickness for area explicitly.
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
node micro/game/amoeba/route.test.mjs   # the scenery on every side; the director: rushing in 16 directions, lingering, turning back
node --test micro/game/shared/director.test.mjs
node micro/game/check-worlds.mjs amoeba
node micro/game/amoeba/opening.mjs --check   # the tardigrade's glimpse is still this world's opening cell
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
once a view has seen that cell. With the default path: following its bearing
meets the three pre-placed ones in order (nothing generated, the portal
reached in ~68 s); straight up the screen, the path's bearing, likewise
(the first after the warm-up by 20 s, the gaps roughly even, the portal by
80 s); crawling off three other ways takes each off the path
while unseen and places it as you go, in order, explored cells unchanged. Scripted runs in the
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
`pods(slot)` (default scheme: `{ sel, adj, mode, move, round, list }`, each pseudopod's angle
round the outline), `route()` (the slide, the trap hyphae's distances, the
patches (scenery and the encounters') and their prey, `met`: when and how far
out each encounter was placed and met, and the director's state),
`encounters()` (the director's state: the current entry, its phase, each
entry's place and times), `director`, `seenAt(x, y)`, `placeNow()` (end the
current break), `placeEncounter(id, x, y, b)`, `portal()` (placed, found,
sealed or open, `blocked` (Chaos's body over its centre), `at` (the slots at
it), where it is, Chaos's state and distance), `placePortal(a,
slot, d)` (the portal `d` µm from that player at bearing `a`, as the director
would: every encounter before it counts as met), `enterPortal(slot)`, `passive(on)`
(traps never arm, Chaos never wakes: scripted runs), `log` (the encounter log),
`scheme('select' | 'lead' | 'classic')`, `pinch(i, j)` (cut the ring as a hypha would)
and `fragments`; for multiplayer and the landmarks: `players`, `cells`,
`split`, `layout`, `beacon` (the P. bursaria), `leaf`, `landmarks.log`
(every landmark and near posted), `place(slot, x, y)`, `teleport('forward' |
'back', slot)`, `forceCapture(slot)`, `traps()`, `defend(on, slot)`,
`cut(slot)`, `chaos`, `pinchChaos(slot, reach)`, `engulf(slot)`, `contact()`
(cells in contact last step, and the overlap between every two cells now),
`ring()` (Chaos's ring: cover, gap, its X), `wakeChaos()`, `placeChaos(x, y)`
and `addPlayer()` (a second local player with a cell). The trap
fight (windup, a stiffened block, cuts driving it off), Chaos (dormant, the
spread tell, the cup, pinched-off arms, retreat, an engulf with the camera
following) and both catches were checked in Playwright; the scripted pinch
test uses a relaxed reach (120 µm) because it does not drive the sticks. `body`, `cyto`, `capture` and `surge`
are player 1's. Multiplayer was checked with mocked gamepads in Playwright:
joins during play, 2 and 4 players splitting and merging, a catch in
multiplayer, both landmarks standalone and in the shell. Select and steer was
checked with mocked pads: RS grows a pseudopod (the old ">70° away starts a new one" rule is gone), LT gives LS the
adjacent pseudopod (or sprouts one above a lone right-side one), LS without LT
moves the body, two players steer independently, and LT + RS + LS round an
arm of Chaos then X pinches it off. The trigger choosing (2026-11-02) was
checked frame by frame with a scripted pad in Playwright: RT + RS at
0/90/180/270° chose the pseudopod that way or grew one (each within 40°);
a full RT sweep in 4 s changed R four times with no flicker; with RT let go
RS swept 360° over 5 s and R never changed; RS centred under RT, and steering
with no trigger, kept R; LT gave LS the neighbour; LT + RT let LS choose L
by direction three times while RS held R; RS swept onto L's
pseudopod under both triggers was refused; and R was never L on any frame. Pseudopods and movement (2026-11-02, replacing
the trigger choosing) was checked frame by frame with a scripted pad in
Playwright: a first RS push grows R that way and steers it; a 0.12 s pass
through neutral keeps it; 0.6 s at rest lets it go and the next push grabs
another; LS does the same with L; a push at the other stick's pseudopod grows
one beside it; R was never L. RT 0.4 never enters movement mode, and letting
RT go leaves it on the first frame. With RT: one stick or both right crawl
right (~120 µm in 3 s); LS up + RS right crawls at ~50° and widens; apart
stretches (aspect 1.0 → 2.7) and together squishes (→ 0.36) with the
centroid still; LS up + RS down turns ~150° clockwise in 3 s (the nucleus with
it), the reverse anticlockwise. LT spreads at once (spread 0.5 in 0.6 s,
circularity unchanged) and only slowly rounds (circularity 0.54 after 1 s,
0.94 after 5 s, 1.0 after 8 s). LB / RB changed only the steered pseudopod
(broader 113 vs 56 µm; tip 75 vs 52 µm in 0.8 s) and nothing with no stick
pushed. Two sticks closed R and L round an arm-sized obstacle and Chaos's
pincer test found the neck.

## Sources

S04 NIES Amoeba morphology; S05 Jeon & Jeon (1976), SEM of *A. proteus*
during phagocytosis; S06 De la Fuente et al. (2019), amoeboid locomotion
and streaming; S07 Kreutz, *Paramecium caudatum*; S08 Ogura & Takahashi
(1976), ciliary reversal; S09 Knoll, Haacke-Bell & Plattner (1991),
trichocyst escape; S15 Lauga & Powers (2009), low Reynolds number. Full
citations in `micro/research/build.py`. Digestion time of Chilomonas
(3–18 min): Britannica, *Protozoan: mechanisms of food ingestion*.

**Pushing, the ring and the portal (2026-11-02)**, checked in Playwright
(software WebGL, `__micro` hooks, no page errors): with only the edge of the
cell over the portal (its centre 248 µm from the portal's, ~60 µm of
membrane inside the 120 µm reach) and Chaos awake beside it and not beaten,
`portal().prompt` was on, the standalone pill read "Y R Enter the portal",
and Y started the outro (`landmark forward`); a sealed portal (the default
path, nothing met) showed no prompt and said "Sealed: the way on opens once
you have hunted the fleeing ciliates" as a toast and on the warning line;
pushing a pseudopod into Chaos for 4 s (37 steps in contact) neither ate the
cell nor shut a ring, with no overlap left (0 µm); a still cell beside it
was ringed (cover 0.25 → 0.88 in the first encircle, 1.0 in the second),
its X began at 16.2 s and it was engulfed after it;
a cell that pushed out through the gap with a surge as soon as the ring
passed 30% was never ringed past 35% and never engulfed; two players, one
crawling into the other for 6 s, stayed in contact with at most 2 µm of
overlap and shoved the other 134 µm along.

**Forcing a pseudopod through Chaos (2026-11-02, later)**, Playwright, Chaos
passive and placed right over the portal (its centre 40 µm beyond it, the
portal ~280 µm inside its near edge): LS held at it with LB and RB and a
surge each time it recharged, the channel opened and the prompt came up
after 3.8 s with Chaos's body still over the portal; Y entered. LS alone (a
thin pseudopod) got ~57 µm in and never brought it up in 16 s. Let go after
reaching it, the tip was pushed back from 119 to 160 µm off the portal in
3 s. No overlap (0 µm). Screenshots: `tunnel-1.png`, `tunnel-2.png`. The
earlier runs above were repeated after the change (22/22, the ring now
closing in the first encircle: its X at 9.1 s, engulfed 1.8 s later).

**Choosing on RT and rolling into stumps (2026-11-03)**: `select.test.mjs`
(node, 9 tests): assignments persist through neutral and movement mode; a
busy stick's glow stays put until it rests, then follows; the glow eases with
no overshoot and settles exactly (also the short way across ±180°); snapping
within 20°, held to 25°, let go at 35°; L and R held apart when both sticks
aim at the same place; RT release takes an existing pseudopod or grows one at
bare membrane (within 25° of its glow); LB broadens a steered pseudopod (> 1.3×)
without spreading the cell, and spreads the cell with none steered; LT
crawling into a resting pseudopod turns it into a stump (spread > 0.5, reach
under 60%) that merges, while one whose stick reaches on keeps its reach and
the cell follows it; one to the side is left alone. Playwright (10/10, no page
errors; screenshots in the scratchpad `amoeba-select/`): R busy then
editable, its glow moving and settling at -60°, the commit growing a new R
at -53° with L kept, the view widening to 1.73× at 20× and staying after RT,
and an LT crawl rolling a 144 µm pseudopod into a 55 µm stump.
