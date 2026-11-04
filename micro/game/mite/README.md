# Mite · SEM prototype

A box mite (Oribatida: Phthiracaridae), about 0.35 mm long, walks through a
few square millimetres of moss cushion, imaged as a scanning electron
micrograph. Built in three.js (`../shared/vendor`), world units are µm.

A predatory mite (Mesostigmata: Parasitidae) hunts in the same moss: run
from it, close up against it, or nip it. The mite climbs over grains, flakes
and stems and pushes through moss blades and hyphae, which bend and spring
back.

Open `micro/game/mite/` (the invite gate is off on localhost).

**Goal:** head out through the moss in any direction. The encounters are
placed as you go, in order, in moss you have not seen yet (the encounter
pattern, `../../design/encounter-pattern.md`, "Placed as you go"), rising in
threat: a family of box mites, the predatory mite, a drop of water falling
into the moss nearby (never aimed at you), the predatory mite again
(hungrier, faster), a shower of drops round you, the predatory mite a third time (always hungry, faster than your full
tilt), and then the way on: a wet leaf axil under a golden glow, where a
tardigrade walks in the water, guarded by a pseudoscorpion. The moss grows
wetter, beaded with water, as you go and thickest round the water; a row of
marks at the foot of the screen ("the way on ●●○○○○○") fills as each is met. Lure it off its post and get round it (or bite
its pincer joints until it backs into the moss), reach the water, and in the
Micro Zoom game the light changes to the tardigrade's world. Nothing runs you
down while you stay put: no hunger, no timers; food heals nothing and is
never needed, it is grazing.

## The encounters, placed as you go (`layout.js`, `../shared/director.js`)

The owner (2026-11-01): obstacles soon but not immediately, calm breaks
between, a portal and its boss at the end whichever way you go, no arrow;
and "feel free to place things in the world dynamically … keep the areas
they've explored constant … don't skip obstacles". So the scenery is laid
out before play and the enemies and events are placed by the shared
encounter director (`createDirector` with `layout.js` `DIRECTOR` and
`ENCOUNTERS`; `main.js` adds what placing and meeting each one does).

**Scenery (laid out, anywhere, you can walk round all of it):** the moss
tile in every direction (see World), the start's ten shoots, spores and
hyphal tips to graze, the second box mite, the giant springtail (the
backdoor) behind the start view, and the **hyphal thickets full of
springtails** (`CLUSTERS`: 13 round the 5 mm ring and 54 round the 20.3 mm
ring, each 1.64 mm across, alternately 0.35 mm in and out, so every straight
way out passes within 0.4 mm of one on each ring and there is always a way
round; and five more along the forward route, `FORWARD_THICKETS`, at 12.6,
28.8, 37.9, 46.2 and 57.5 mm, to alternate sides of the line with their edges
~0.65 mm off it, in the gaps between the default path's encounters: walking
straight ahead skirts each one). The thickets are a harmless crowd you push or bite through (a drag,
never a stop), so they are scenery, not encounters.

**The encounters, in order** (`ENCOUNTERS`), each placed by the director in
moss nobody has seen yet (a 0.5 mm grid marked from every view's frustum
within 4.2 mm of what it frames, plus 0.45 mm round every player), out of
every view, a short way ahead of whoever leads (or, if they linger, round
them), and only after the one before was met and a calm break has passed
(4 s of moving over open moss first; 4.5 s between, 3 s before a drop, 6 s
before the portal). The order rises in threat (the owner, 2026-11-02: "more
frequent encounters ... more dangerous creatures indicating that you are
closer to your goal"):

| # | What | Placed (ahead; round a lingering player) | Met |
| --- | --- | --- | --- |
| 1 | **A family of box mites** (three, grazing; walk up slowly and they edge away, touch them, rush them or bite them and they close up; company, not a threat) | 3–4.6 mm; 2.4–3.6 mm, and they wander over | within 1.2 mm of their home |
| 2 | **The predatory mite** on its hunting ground (1.1 mm radius, plus a 0.7 mm chase); hunts at 0.76 mm/s, so full tilt outwalks it | 3.8–5.8 mm; 2.6–4 mm, its ground drifts over | within 1.5 mm of its ground's centre or of it |
| 3 | **A drop of water** falls into the moss round you, never aimed at you (the owner, 2026-11-02: "definitely don't aim them at the player"): when someone comes within 2.6 mm of its spot it lands at a random spot 0.9–2 mm from them and at least 0.9 mm from every player (and from where each will be by then, walking on), clear of the thickets; a ring on the moss marks the spot 0.8 s before it lets go, with the falling sound and a word, and it falls from 2.6 mm up. It leaves a bead of water that soaks away over ~4.5 s; a mite in a bead (one that walks in, or a drop that lands on one anyway) is slowed to 40% and wobbles as it pushes and climbs out: no daze, no loss of control, no harm. A predator within 0.72 mm of the splash staggers | 2.6–3.8 mm; 1–1.45 mm | when it falls (or someone passes within 0.9 mm) |
| 4 | **The predatory mite again** (the same one, gone on through the moss unseen): hungrier, 0.9 mm/s, feels a hurrying mite from 1.15 mm | as 2 | as 2 |
| 5 | **A shower**: three drops, 0.55 s apart, each at its own random spot round you (as 3, never on anyone) | 3–4.4 mm; 1–1.45 mm | as 3 |
| 6 | **The predatory mite a third time**: always hungry, 1.02 mm/s (faster than full tilt: scramble or jump), feels you from 1.35 mm | as 2 | as 2 |
| 7 | **The pseudoscorpion and the portal** (the wet leaf axil) | 5.2–7.8 mm (3.6–5.2 mm round a lingering player), the water's 1.5 mm arena, the post and the boss's retreat clear of the thickets, the stem and glow (2.4 mm tall) out of every view | entering the open portal |

Anything placed but not yet seen moves (unseen to unseen) if the leader
heads elsewhere; anything seen stays where it is (seen and walked away from,
it counts as met). A predator placed beyond a lingering player's reach
wanders over: its ground drifts toward the leader at 200 µm/s after 5 s
(`driftPred`, behaviour rather than a placement); the family does the same
(`stepFamily`). Until placed, the predator and the family are hidden, parked
in a corner of the square and not stepped, the drops are not armed, and
there is no portal; a new game (`resetLevel`) starts the director over.

**Life everywhere** (`life.js`; scenery, not encounters, so nothing is ever
empty): groups of three to six small soil springtails graze on a jittered
lattice over the whole square (about seven groups in ten 1.8 mm cells: one every ~3 s at a rush),
shying from a mite that comes within 0.36 mm (close enough for a bite) and
hopping on the spot now and then (the furcula: a low arc, nose up then nose
down, landing on their feet, every 9–18 s each), standing square to the
slope of the moss under them; each group is a pure function of its place
and the clock, so moss you come back to is as you left it. Only what a bite
does is kept (a dazed or eaten one, a group that leapt away). **They used to
flip upside down** (the owner, 2026-11-02: "a bunch of bugs flipping upside
down, is that expected?"): no. Each hop rolled the body about its
side-to-side axis through ±250° and straight back again within half a
second, so a grazing group always had one or two on their backs (7.7% of
them at any moment, measured over 60 s of their clock); now none tip past
~35° (measured 0%, the steepest 34°). **They used to stand sunk in the
moss** (the owner, 2026-11-04: "are the springtails and similar ambient
creatures clipping through the ground?"): yes. Each was set with its centre
4 µm above the floor at one point, but the body hangs ~56 µm below its centre
(legs to -55, the belly to -30), so every one stood in the moss to its back:
over 240 frames of a walk through the groups (2236 springtails posed), the
deepest vertex was 68-87 µm under the floor (52.7 µm on average), and up to
200 µm inside a grain, since they walked straight through grains, litter and
stems. The thickets' crowd (`shared/crowd.js`) stood level on slopes, its
downhill feet up to 19 µm in. Now each stands on its six feet (`stand.js`
`standSpringtail`): the feet sample the ground, a plane fitted to them sets
the body square to the slope at its legs' height, and wherever a foot, the
belly, the flanks, the head or the nose (a hop's landing) would still dip it
is lifted clear; hops pitch nose up rising and down falling but come down
level, on their feet. The ground is the floor plus the grains and litter on
it (`createGround`: the colliders cast down once per 16 µm lattice point and
kept, the moss left out because it bends); the big grains (over ~90 µm) and
the moss stems are walked round (`createKeepOut`), the smaller grains and the
flakes climbed. The crowd's members are stood the same way after each crowd
step. Measured the same way: 0.3 µm under the floor at worst (0 on average),
and inside a grain at most 7-9 µm in ~0.5% of the samples (a facet between
the checked points). A pose is reused while a member has moved under 4 µm on
even ground: 0.19 ms an update for 42 springtails (0.08 before) in headless
Chromium. The second box mite, the family and the predator (`mite.js`) could
also set a foot into the floor for a few frames (up to ~90 µm when a body
tipped onto a stem cast its foothold along its tilted up from under the
floor, and 6-17 µm mid-stride over a hump on the predator's long legs); a
foothold and a swinging foot are now kept on the floor (0 in 43 200 foot
samples, against 42 before). **Water beads**
on the moss floor are decided per 1.1 mm cell the first time anyone comes
within 5.2 mm (past the edge of any view) and then kept: a few at the start,
commoner and larger with every encounter met, and thickest within 8 mm of
the water (like the springtail world's pondweed thickening toward its
portal). Entering the wet moss once the water is open says so ("The moss is
wetter here ... the water is near").

**What went wrong in the owner's run (2026-11-02)**, "I walked for a while
seeing nothing, and then I hit an invisible wall": the order was only the
predatory mite, the predatory mite again and the portal, each a few
millimetres ahead after an 8 s calm break, and the predator's hunting ground
is invisible (only the 0.8 mm mite on it shows, and it can sit at the edge
of the 1.1 mm ground, off to the side of the view), so between the two rings
of thickets (5 and 20.3 mm out) there were long stretches with nothing on
screen. The wall was the walkable square: 87 mm across, 43.5 mm from the
start each way, kept by a hard clamp in `mite.js` with nothing drawn there,
so walking straight out for about a minute ended against nothing visible.
The large bug was the predatory mite (~0.8 mm, more than twice your length)
or the giant springtail at the backdoor (~1.5 mm, behind the start view);
both are meant to be there. Now the square is 0.96 m across (over 7 minutes
of scrambling straight out; its edge, if anyone gets there, is a wall of
tall Sphagnum you can see and stop against: see World, The edge of the
cushion), the order has seven entries rising in threat with shorter breaks,
life and water beads cover the moss everywhere, the beads thicken toward the
water, and the marks at the foot of the screen show the way on filling.

**The default path** (the owner, 2026-11-01: "a default path to a portal,
but just dynamically generate the other directions"): on the first frame the
director lays all seven out from the start, out of sight, so the way on
exists from the start, straight ahead along the world's forward (`layout.js`
`DEFAULT_PATH`, bearing `FORWARD`, ~2.02 rad: screen-up with the locked
camera; the owner, 2026-11-03: "With the new camera, we should have the
default path be straight forward essentially ... make the forward path the
one of discovery"), at a rush's distances: the family ~8 mm out, the
predator's grounds ~16.5, ~34 and ~51 mm, the drops ~24 and ~41 mm, the
water ~64 mm, each as near the line as it fits (`lateral`: up to 1.6 mm
aside, or a little nearer or farther along it). The moss grows wetter
toward the water (`wetness`, the beads) along the same line.

The way on stays sealed
(no prompt, no edge light, its glow shut, nothing preloaded; reaching the
water says "The water is shut to you yet") until every earlier encounter is
met; the pseudoscorpion guards it as always. There is one predator: its later
grounds on the path are only spots until the one before is met, then it goes
on there while nobody sees it (`movePredOn`). Follow the bearing and you meet
them in order where they lie; head another way and each, while nobody has
seen it, leaves the path and is placed ahead of you as before (each is one
object: the director's `single`); one somebody has seen stays put.

*Why forward was empty before (2026-11-03).* The path then ran at -2.6 rad,
~95° to the side of the locked forward. Walking straight ahead, the director
did place every encounter as you go (in a scripted page run at full tilt the
family came at 8 s, the predator at 18 s, then every ~10 s), but until the
last of them was met (~65 s at full tilt, ~88 s at a slight push) the way on
stayed where the path had put it, 64 mm off to the side: the Portal arrow
pointed there and its distance only grew (66 mm at 16 s, 85 mm at 62 s), the
wet-moss cue thickened only round it, and past the
second ring of thickets (20.3 mm) nothing stood near the forward line but
the ambient springtail groups and the beads, so between encounters there
was only springtails to see. The predator's ground is invisible and a drop
shows only when it falls, so on a 1.6 mm view several encounters were easy
to pass without noticing: a long walk forward felt like nothing but
springtails and a destination that never came nearer. Now the whole order,
the wet moss and the water lie ahead, with thickets in the gaps.

**Timing.** `route.test.mjs` runs the director with the SEM view's own
frustum and a player rushing (~1100 µm/s: full tilt with every scramble the
stamina allows, a third slower in a thicket) in 16 directions: the family met
at 5.8–6.9 s, the predator at 13.9–15.1 s, the drop at 20.8–22.4 s, the
predator again at 28.9–30.4 s, the shower at 36.1–37.6 s, the predator a
third time at 45.4–47.0 s and the portal reached at 59.8–61.3 s; the longest
wait from one encounter to the next is 14.3 s. ("Ahead" is the way the
leader has gone over the last 2.5 s, `headingSec`, with a spot straight
ahead preferred to one off to the side, `aheadBias`, so stepping round a
stem or a thicket does not swing the next one off the line.) On the default
path the water is reached at ~59 s. **Straight ahead** (the stick held up,
turning only for the water once it is within 3 mm): rushing, the family at
7.1 s, the predator 13.9, the drop 21.3, the predator 30.7, the shower 36.5,
the predator 45.9, the water 59.3 s, all where the path laid them; walking
on the keys (~610 µm/s), 12.8, 27.5, 38.4, 55.4, 65.9, 82.8 and 107 s. On the
page (`testStep` at full tilt, 870 µm/s, straight up the screen, 2026-11-03):
the family met at 9.4 s, the predator 21.1, the drop 28.8, the predator 40.6,
the shower 49.4, the predator 63.3, and the water (guarded) passed ~0.5 mm
off at ~80 s, with the moss beaded and "the water is near" from ~70 s
(screenshots of the run were taken every 10 s). Lingering at the start, each comes round them in turn
(the portal at 130 s). On the page (`life` and `inputSteps` test hooks; a
script at full tilt scrambling whenever the stamina is full, steering round
whatever blocks it, the predator passive and its catches off, the drops and
the boss live; it makes for the water once it is open and within 9 mm), in 8
directions from the default bearing round: the family met at 5.4–12.5 s,
the predator at 13.0–23.7 s, the drop at 22.2–31.1 s, the predator again at
30.2–40.2 s, the shower at 39.1–63.4 s, the predator a third time at
47.5–63.4 s, and within 5 mm of the open water at 57.8–72.6 s; the longest
stretch with nothing new coming into view (a springtail group, a thicket, an
encounter) was 2.6–9.8 s per run, against long empty stretches before.
Rushing straight out for 3 minutes, ignoring the water, went 140 and 159 mm
with nothing new for at most 8.1 s, and never near the square's edge
(480 mm out).

**Cost.** Placing and the seen grid cost less than the profiler reports
(under 0.1 ms a frame in `tools/perf/measure.mjs`, one view and four); the
draws and triangles are as before (47 and 197 k with one view, 69 and 354 k
split four ways).

**The portal and the boss.** The portal is the last encounter
(`placePortal`: the water where the director put it, on the default path
from the start, the pseudoscorpion's
post 0.6 mm before it toward the way you came); the moss shoots stand aside
there (an exclusion disc: its arena). Its golden glow (`shared/portal.js`) then draws you on; there is no
arrow. A brief hint comes once, within 3.2 mm: "A pseudoscorpion guards the
water. Lure it away from its post and get round it, or bite its pincer
joints until it backs off". A player who reaches the water (within 360 µm of
its centre) while the pseudoscorpion is on guard (not driven off, and within
1.3 mm of the water) is turned back: a toast, once a visit, and its pincers.
Lured off or driven off, the water is open, but it is never an automatic
door (the owner, 2026-11-01): while any player is at it, the game shows
"Y Enter the portal" (`embed.near('portal', true)`; standalone,
`shared/embed.js` shows it), and that player's **Y** (R) goes through
(`enterPortal`, the one place `embed.landmark('forward')` fires) instead of
closing up; a Y already held (closed up) as you arrive keeps you closed.
While the pseudoscorpion guards it there is no prompt and Y closes up as
usual. Luring: it follows its target out
to 2.6 mm from its post (`BOSS.leash`), gives up one that gets 3.6 mm away
(`BOSS.lose`), and then walks back at 400 µm/s (it stalks at 360; both
raised 2026-11-02 from 260 and 240 with the faster walk: a mite walks
418–870 µm/s, scrambles ~1480) and guards again; someone close by on its way back turns it
round. The glow is dim and restless while it is guarded, bright once open.

**The moss reaches the portal and beyond in every direction**: one 9.6 mm
scenery tile repeated (see World). The walkable square (`BOUNDS`) is 0.96 m
across (it was 87 mm, and the owner walked into its edge, an invisible wall);
its edge is now a visible one, a wall of tall Sphagnum shoots (`EDGE`,
`edge.js`; see World), the body is kept inside its face, the director places
nothing within reach of it or of the shed leaves in front of it (`canPlace`:
each entry's whole clearance disc stays 5 mm short of the face), and pressed
against it a toast says it too (at most every 20 s). A 3-minute rush straight
out goes ~0.2 m. The director's seen grid covers the square (0.5 mm cells, ~3.7 MB).

## Controls (Xbox controller; keyboard in brackets)

The shared scheme (`../CONTROLS.md`, read through `../shared/controls.js`),
with one exception at the owner's request: A jumps, B scrambles and Y closes
up. The in-game controls lists (`../../text_config.js`
`worlds.mite.controls` and `mite.hud.controls`) list Y as "Block (hold)"
only: the portal and the way back ask for Y on screen when you are there, so
the lists no longer carry "enter portal" or a "Way back" row (3 November
2026).

| Button | Action |
| --- | --- |
| LS (WASD) | Walk, relative to the view. The stick is analogue: a slight push walks at ~418 µm/s (the old walk), full tilt hurries at ~870 µm/s (the old scramble), a quadratic curve between so the slow end is easy to hold. The keys walk mid-pace (~610 µm/s); hold Q / F (LB / RB) for the slow end / full tilt. The mite turns toward the stick and walks forward; it climbs grains, flakes and stems and pushes through blades |
| RS (arrows) | **Tilt · peek**: left/right peeks sideways (the turn is locked to the world's forward, see Multiplayer; Free camera in single player orbits). Up looks up (the camera swings down toward the floor), down looks down; Features → Controls → Invert camera Y flips it for every prototype |
| **A (Space)** | **Jump**, with a flea's or a jumping spider's snap: tap for a 0.1 s crouch and a spring of ~1.1 mm (three body lengths, ~0.33 mm high); hold to crouch deeper (up to 0.45 s more, the body quivering at full charge) and release for ~2.1 mm (six body lengths, ~0.65 mm high); a run-up adds to it. Aim with LS while crouched; LS leans the arc a little in the air. Lands on the floor, a grain, a flake or a moss blade (the blade takes the landing and bends); 0.3 s after landing before the next. Borrowed from jumping oribatids (see Departures). **X in the air: the pounce-bite** |
| **X (E)** | **Bite.** Every press shows an attack: the mite rears, the rostrum lifts (the chelicerae open), it lunges and snaps, and crumbs puff where the snap lands (or in the air before it), with the bite sound. By what is in reach: **fight** (the predator or the pseudoscorpion's pincer: rear up with leg I raised, then lunge and snap); **strike** a springtail in front (it lies dazed 2.4 s, its group leaps away and drifts back over ~10 s); **devour** a dazed one (a snap, then it is held to the mouth and eaten, 1.2 s); **strike** one of the box-mite family (it shuts itself in its capsule; the bite glances off); **eat** (a spore or hyphal tip: a dart at it, then leg I holds it to the mouth while the chelicerae work and it shrinks away, 0.9 s); **strike** at nothing (a snap in the air). See "Biting springtails" |
| **Y (R)**, hold | **Defend: ptychoidy.** Close into a sealed capsule (the predator's strike slides off; a held mite closing up drops out of the grip); release to reopen |
| **B (Shift)**, hold | **Scramble** (the dash): a punchy burst to ~1.48 mm/s (~1.7x full tilt, ~3.5x the slow end), nose down, tight turns, the gait racing (feet still planted) and crumbs kicked up behind; on a stamina meter (`scramble ■■■■■` in the corner: empties in ~1.6 s, refills in ~2.8 s). In a grab's strike window, a scramble breaks out |
| Y (R) at the open portal | Enter the portal (the zoom on to the tardigrade) instead of defending; the game shows "Y Enter the portal" while you are there |
| Y (R) at the backdoor | Go back up to the bog surface instead of defending |
| LS click (C), standalone prototype only | Observer mode: simulated SEM instrument data (voltage, working distance, detector, magnification and scale) and raster lines. This viewing aid and its feature switch are omitted from the embedded game |
| LB / RB (Q / F), hold | Walk at the slow end (~418 µm/s) / full tilt (~870 µm/s), whatever the stick's push |
| D-pad ← → (3 / 4) | Imaging mode: SE (Everhart-Thornley), BSE (low vacuum), SE false colour |
| LT / RT (Z / X) | **Zoom out / in** (3 November 2026, was D-pad steps of ×1.5): analogue and continuous like the paramecium's, the horizontal field width from 160 µm to 4.2 mm, ×e^1.4 a second at full trigger (`ZOOM_HFW`, `ZOOM_RATE` in `main.js`), the camera easing to it; the magnification shows once the triggers are let go. The field is one for everyone (the one view), so any player's triggers move it. The D-pad's ↑↓ no longer zoom |
| Menu (Esc) | Features panel: what the prototype does, with switches |
| View (Tab) | Hide the help panel |

Rumble: a tick on footfalls, a thump on closing, landing and opening, a kick
on each scramble and jump, a jolt when the predator grabs a leg.

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A moss ambience loop; footfalls (at most ~8 a second), the scramble (B), the jump and its landing (A), closing and opening (Y), the bite (X), moss blades brushing as they bend, a falling drop and its splash, and the predator closing in or grabbing a leg.

## The intro (from the springtail)

In the game the mite's world is the far end of the continuous transition
from the springtail (`../../game/README.md`, "The continuous transition"):
it preloads hidden while the springtail nears its portal, declares
`embed.provide('intro')`, and on `hold` stays frozen at its start but
renders, with the HUD and arrows hidden, reporting how its opening view
(HFW 1.6 mm, the mite at the centre) frames the mite (`embed.opening`). It
then takes the shell's `camera` poses (`placePoseCamera`: a dolly, the scan's
12° field kept, the rig following so play carries on from it) as it fades in
over the springtail's push onto the speck, the mite where the speck was. On
`begin` its time eases back in over 0.6 s.

## The outro (to the tardigrade)

Going through the open portal (Y there: `enterPortal`) plays the outgoing side of the
continuous transition (`../../game/README.md`, "The continuous transition";
the springtail's is the reference): a golden burst from the water (a ring
over the floor, a fountain of sparks), blooms on the screen, a chime
(`shared/portal-chime`), a rumble, the HUD hidden; then time eases to a
freeze over 1 s (`OUTRO`, on the outro's own clock, so a slow machine plays
it slower rather than skipping it) while rendering goes on. The mite and the
tardigrade are the same size, so this is a hand-off (`transition.js`'s
`HANDOFF`), and it is designed as one: while time slows, the view settles on
the tardigrade walking in the water, from the side and height the
tardigrade world opens on (`NEXT_OPENING`: pitch 1.18, its heading turned
the way it faces there; measured from that world's `__micro.pose()`), a
little wider than there (the glimpse at 0.18 of the view's width against
0.243), and the glow dims so the animal reads. Frozen, it reports that
framing (`embed.frozen`) and follows the shell's `camera` poses
(`placeOutroCamera`); the shell's move is then a short push (×1.34) while the
tardigrade's world crossfades in under the same framing: the change of
light, SEM to DIC. Within 3 mm of the water it posts `near('forward')` so
the shell preloads the tardigrade (no prompt is shown). Standalone, the
freeze holds 1.4 s, time comes back and `embed.js` shows its toast. Test
hooks: `outro()`, `outroStep(n, dt)`, `OUTRO` (`rate` slows it),
`tardiPose()`.

## Landmarks

Both are built into the moss (`landmarks.js`) and drawn by the SEM like
everything else.

- **Forward: the wet leaf axil** (design §1.6), the portal, built where it is
  placed (`place(a, x, z)`; see The encounters). A moss stem 1.5 mm tall behind the
  water with its lowest leaf arching out and down to the floor beside it; in
  the angle between them a film of water, and walking slowly about in it a
  tardigrade, 350 µm (a ringed barrel, a rounded head, four pairs of stubby
  legs with claws stepping in a wave): the next world's creature, the glimpse
  the transition pushes in on. Over it the golden glow (`createPortalGlow`:
  a 620 µm pool, sparks and glints, a 3.2 mm beacon), drawn after the SEM
  composite (additive, so it reads through the moss), and its light at the
  edge of the view on its side (`createPortalLight`). Any player within
  360 µm of the water's centre reaches it and, open, can press Y to enter
  (see The encounters: turned back while guarded).
- **Backdoor: a giant springtail at rest**, the creature of the stage above
  (~1.5 mm long, four box mites; `BACKDOOR`, behind the start view,
  ~1.8 mm off). It is solid: mites climb onto it. Dwell beside its head
  (within 380 µm): the game shows "Y: Rise to the bog surface"
  (`embed.near('back', true)`; standalone a quiet prompt of our own, with R
  when no controller is connected). There **Y goes back**
  (`embed.landmark('back')`) instead of closing up; anywhere else Y still
  closes up, and a mite held by the predator can still close up there.
- **No arrow by default** (`shared/landmark.js` draws no forward mark): the
  open portal's golden light, at the edge of the view or over it in view, is
  the only marker. The backdoor keeps its quiet "Up" mark near it. With
  **Portal arrow** on in the game's Settings (default off; `?arrow=1` on this
  page) each view gets a brass arrow at its edge toward the wet leaf axil,
  sealed or not, with the view's nearest mite's distance beside it
  ("32.2 mm"); on screen, a marker over it. Test hooks: `portalArrow()`,
  `portals()`, `portalSealed()`.

## Multiplayer
**The world's forward** (the owner, 2026-11-03): the camera's turn is locked
to it, so obstacle layout can rely on it. `FORWARD_YAW` in `layout.js` (−0.6 − π/6, the start view): the camera sits at +x, −z of its target and looks toward −x and +z (`FORWARD`, ~2.02 rad from the start, is screen-up, and the default path runs along it: see The default path). RS left/right peeks
sideways instead (the view slides about 30 % of its width that way and eases
back; each player's own, blended through a split and a merge), RS up/down
tilts, and LS moves relative to the fixed forward. With **Free camera (single
player)** on in the game's Settings (or `?freecam=1` here) a lone player turns
the camera freely again; a second player joining eases it back to the forward
over 0.6 s and locks it (`../shared/camlock.js`).

Up to four players (`shared/players.js`, `../CONTROLS.md`): player 1 on the
keyboard and the first controller, players 2–4 join at any time by pressing
any button on another controller (a toast; in the game `embed.join`). In the
game the roster comes in from the shell (`embed.players`).

- Each player is a box mite of their own, with their own scramble, wounds and
  footfalls; a faint ellipse of their colour and a "P2" tag mark them (the
  SEM has no colour). Everyone uses the shared controls; RS left/right peeks (each
  player's own view), player 1 also has magnification, imaging mode and
  observer mode.
- **Split screen** (`shared/splitscreen.js`): together, one view on the
  group, which zooms out as it spreads (the split's `zoom`: the camera pulled
  back along its view, the HFW and scale bar widening with it) up to 1.8x the
  solo field before it splits; it merges once you are back inside 0.75 of
  that for most of a second, and split views keep a gentle 1.35x. Apart,
  LEGO-style split views, each with the cutaway cleared toward its own
  players. The SEM composite ends on
  the screen, so the split copies each view (`capture`); split views render
  at 70% resolution (55% when split three or four ways).
- **The predator** goes for the nearest player. A caught player plays the
  whole catch (and can still close up to slip free); with company there is no
  Eaten card: they come back beside a teammate. Alone, the Eaten card and
  restart are as before.
- Test hooks on `window.__micro`: `players`, `split`, `layout`, `recs()`,
  `teleport(slot, x, z)`, `settle(n)`, `steps(n, dt, inputs)` (simulate
  without rendering), `landmarks`, `landmarkLog` (`forward`, `turnedBack`,
  `back`), `nearBack`, `joins`, `forceCapture(slot)`; for the encounters
  `route()`, `encounters()` (the director's state), `director`,
  `seenAt(x, z)`, `placeNow()`, `views(dt)` (the views' frustums without
  drawing; `testStep` does it too), `portal()`, `placePortal(a, slot, d)` and
  `placeEncounter(k, x, z, b)` (tests: out of order), `enterPortal(slot)`,
  `progress()`, `challenges` (each challenge's first start and first
  approach within 0.4 mm: `kind`, `d` µm from the start, `progress`, `t`),
  `unseen(x, z, r)`, `plan`.

### Telling players apart

Each player's mite has its own look, so you can find yourself in a crowd even
without the rings. The SEM is a micrograph, and false-colouring micrographs is
standard practice, so each player is a hand-tint of the same shell
(`player` in `createMite`, `playerLook` in `shared/techniques/mite-sem.js`):

| Player | False colour | SE and BSE (greyscale) |
| --- | --- | --- |
| P1 (gold) | amber, exactly as before | exactly as before |
| P2 (teal) | teal | smoother, brighter shell, faint teal cast |
| P3 (rose) | rose | granular, darker shell, faint rose cast |
| P4 (blue) | periwinkle blue | flat tone with a bright rim (doubled edge effect), faint blue cast |

The faint rings and "P2" tags stay with company. Cost: one uniform per mite
(`uPlayer`, written into the fraction of the G-buffer's class channel, +0.06
per player, so no extra buffer or pass); the composite decodes it for the
cuticle class only. The look is a property of the mite's materials, so it
carries through closing up, jumps, captures, respawn (the same mite comes
back) and the outro, and in every split view. Other worlds that borrow the SEM
pass `player: 0` by default and render unchanged.

## Biting springtails (X)

The owner (2026-11-02): "should I be able to eat them? Does a mite eat prey?
If so it would be cool to be able to press X to eat or attack the other bugs
I see. Currently I don't see any attack animations when pressing X."

- **The biology:** no. Box mites (phthiracarids and most oribatids) are
  fungivores and detritivores: they graze fungal hyphae and spores and chew
  decaying plant matter. It is the predatory mites (Mesostigmata, like the
  parasitid hunting you here) that eat springtails (S38).
  Biting and eating springtails is a **game rule** (see Departures).
- **The animation, every press:** the old bite at nothing was a 0.4 s nudge
  (the body moved ~27 µm, the rostrum dipped 0.2 rad), too small to see at
  this magnification. Now: 0.5 s; rear up (to 0.55 of the predator-fight
  rear) with the rostrum lifted and the chelicerae open, a short draw back,
  a lunge (~42 µm), the snap (the rostrum dips 0.34 rad), crumbs puffed at
  the target or in the air before the mouth, the bite sound. The fight
  (predator, pseudoscorpion) and the grazing dart share the same parts.
- **Strike a springtail** (one in front, within ~0.27 mm of a point just
  ahead of the mouth; they shy only to 0.36 mm, so walk up and face one): it
  jolts and lies **dazed for 2.4 s** where it was, crouched, legs twitching,
  facing you; the rest of its group **leap away** (~0.5 mm, upright arcs) and
  drift back to graze over ~10 s.
- **Devour a dazed one:** X again in time: a snap onto it, then it is held
  under the mouth and shrinks away as the chelicerae work (1.2 s). **Seen
  from behind** (the owner, 2026-11-04: "if you eat one while facing away
  from the camera, can we show it sort of lifted up ... From the front it
  looks good already") the mite's body hid it, so the devour blends toward
  a rear (to ~0.5 rad) with the springtail lifted ~150 µm in legs I and the
  chelicerae, above the outline of the back, kicking and twisting (weaker as
  it is eaten), each bite of the chelicerae puffing bits off it. The blend
  is by the view: the dot of the mite's facing with the horizontal direction
  from its own split view's camera to it (each view's camera, noted as the
  views are drawn: `viewDir`), 0 below -0.15 (the front, unchanged), 1 above
  0.45, eased over 0.25 s so a peek never jumps it. The timing, the reach
  and what a meal gives are unchanged. It counts
  as grazed, **refills the scramble** and brings a grabbed leg's healing 8 s
  nearer (legs heal one per 20 s). Another wanders into its place after 40 s.
- **Why two bites, and why it doesn't trivialise the encounters:** a nip
  alone only drives them off; eating takes a second, timed bite and 1.7 s of
  standing still. The predator and the pseudoscorpion come first (X in
  their reach is always the fight), a stamina refill is all a meal gives in
  a chase, and the family cannot be eaten: bitten, a box mite closes up and
  the bite glances off (as the predator's does off you).
- Test hooks: `bite(slot)`, `me(slot)` (`strikes`, `lastStrike: { hit:
  'springtail' | 'boxmite' | null }`, `bugs` eaten, `stam`),
  `life.ambient` (`live`, `nearest`, `bugs`, `scatters`).

## Fighting back

Shared fight rules (`shared/predation.js`, `createFight`); the mite uses Y for defence and B for dash.

- **Calm vs attacking.** A calm predatory mite wanders at an easy pace and
  stops to groom; hunting, it is fast and turned on you. Before each strike
  it **rears, leg I and the palps up, the chelicerae open** (0.8 s; the
  banner says so), then lunges (`predator.js`: wander, hunt, windup, strike,
  recover, recoil, retreat).
- **Block:** close up (Y): the strike slides off the capsule, it recoils.
- **Bite back:** X with it in reach: rear up, then lunge and snap. Blocks and
  bites each take about a third of its interest (facing it close by wears it
  slowly too); out of interest it runs off and rests.
- **The pounce-bite (a game stretch):** X while jumping dives at the nearest
  enemy point ahead (homing as it moves), a strong bite on impact (two bites'
  worth, a hit-pause, crumbs, a rumble), then a hop back; a mistimed dive is a
  clear miss.
- **A grab:** three leg grabs and it holds on (strike, hold, eat: pulled in
  and swallowed between the chelicerae); scramble (B) in the strike window,
  or close up (Y) before it eats, to slip free. Eaten, the camera pulls back
  and follows the predator for a couple of seconds, a fade, and you are back
  beside a teammate or (alone) at your last safe spot.

## The boss: a pseudoscorpion

`boss.js`; `micro/design/bosses.md`. *Neobisium*-like, ~2.5 mm (seven box
mites), on guard before the wet leaf axil (the portal), put on its post there
when the portal is placed (`setPost`), **dormant** until a player comes
within 0.9 mm of its post (placement paces it: no timer). It can be lured
off (it follows you out to 2.6 mm from its post, then walks back slowly and
guards again: see The encounters). Built from anatomy and compared side by side with the
delivered sheet (`../assets/reference-sheets/boss-pseudoscorpion.webp`): a
narrow carapace tapering to the chelicerae, with eye spots; behind it a much
broader smooth ovoid abdomen (widest two-thirds back, rounded at the end)
ringed by eleven tergite furrows (one shaped mesh, not stacked plates); long
pedipalps with a clubbed patella and big swollen chela hands; long fingers
that curve in toward each other (the fixed one and the movable one with the
venom tooth); slender walking legs; long tactile setae. The SEM readability
fixes are kept: the chelae, palps and legs carry the stronger edge glow, and
the tell lifts the open chelae high. The sheet's colours (a dark abdomen,
red-brown chelae) have no SEM equivalent: the SEM shows shape only.

- **Tell:** the pincers held **open and dead still** (0.9 s; 0.7 s before a
  sweep). Then one of three attacks: a **snap** straight ahead, a **sweep**
  of both pincers in from wide, or a **step-in** and snap when you hang back.
  It keeps its distance at the edge of its reach.
- **Counters:** stay out of reach; **close up (Y)** to survive a grab (the
  venom tooth cannot get through); **scramble (B)** out of a grab in its
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
- **Speed** (the owner, 2026-11-02: "the mite current movement should be
  the slowest normal movement (LS slightly pushed), whereas the current dash
  speed should be how fast he moves when LS is at full tilt, and then dash
  should be even faster than that"). Before, the stick was linear from
  nothing to the walk (418 µm/s at full tilt; 720 at the 0.6 mm anatomy ×
  0.58), so the walk the owner knew was the fastest the stick went, a slight
  push crept at ~30 µm/s, the keys always walked at 418, and only RB (×1.4)
  and the scramble (878) went faster. Now (`walkSpeed` in `main.js`, after
  the pad's dead zone of 0.14): a slight push walks at 418 µm/s (the old
  walk), full tilt at 878 µm/s (the old scramble's limit), 418 + 460·m²
  between, so the slow end is easy to hold; the keys walk at m = 0.65
  (~610 µm/s), Q / LB holds the slow end and F / RB full tilt; the scramble
  (B) is 1490 µm/s (1.7× the old one), on the same stamina meter. Strides
  lengthen with speed (118 µm at a stroll, 1.5× at 0.9 mm/s, ~2.2× in the
  scramble, `mite.js`), and the gait phase runs on distance, so the feet stay
  planted. Measured over the ground through the real input path (a fake
  controller and the keyboard into `readInput`, `__micro.inputSteps`; 12 runs
  from six open spots at 60 Hz, the median after a 1.5 s run-up; scramble
  after 0.4 s):

  | Input | Before | After |
  | --- | --- | --- |
  | stick 0.2 | 30 µm/s | 417 µm/s |
  | stick 0.35 | 101 | 442 |
  | stick 0.5 | 172 | 496 |
  | stick 0.75 | 292 | 644 |
  | stick 1.0 (full tilt) | 415 | 863 |
  | LB (slow) at full tilt | 207 | 415 |
  | RB (hurry) at stick 0.2 / 1.0 | 42 / 582 | 863 / 863 |
  | keys W / Q+W / F+W | 414 / 207 / 582 | 610 / 414 / 863 |
  | scramble (B) | 872 | 1483 |

  Stance feet moved 0.0 µm in every run (a stance foot's travel between
  frames, steps excluded), and no step completed within a single frame at
  60 Hz. At 30 Hz the fastest scramble swings a leg in one or two frames (a
  blur, as in a real mite).
- **Scramble (B)**: the speed limit rises to ~1.5 mm/s with a fast
  acceleration (tau 0.08 s). The legs cycle faster and the stance feet stay
  planted (swings shorten to 80 ms). A stretch: box mites are slow, steady
  walkers.
- **Jump (A)** (`jump()` and `jumpLaunch()` in `mite.js`, modes `crouch` and
  `air`; the owner: "the mite jump should feel bigger and more flea or spider
  like"): a quick crouch (0.1 s, the body sinking ~40 µm), then an explosive
  launch on a 50° arc under its own snappier gravity (8000 µm/s² at the
  anatomy, 4640 in the world, against the walking world's 2600 / 1510, so the
  arc is quick rather than floaty), carrying 45% of the run-up speed. A tap
  springs ~3 body lengths; **holding A charges** (up to 0.45 s more: the
  crouch deepens to ~65 µm and quivers at full charge) and the release
  springs ~6 (charge for distance, like the springtail's hold-and-release:
  it fits the mite because A is its own button and charging is a clear
  commitment while a predator rears). LS aims it during the crouch (the body
  turns quickly to the stick) and leans the arc a little in the air
  (900 µm/s²). In the air the hind pairs drive back at take-off, then every
  leg tucks under the body; past the top they splay out and reach down; the
  body noses up and then down. It lands on whatever is below (floor, grain,
  flake or blade: a blade takes a downward kick and bends), squashes into the
  landing (deeper the harder it lands) and kicks up a ring of crumbs (and a
  smaller puff at take-off); 0.3 s before the next. Rigid things ahead
  (stems, grains) bounce it back; blades bend out of its way; nothing above
  it is passed through (a cast up stops the rise). Measured from 16 spots
  (`jump.mjs` in the session's scratch; through the real input path, 60 Hz):

  | Jump | Before | After |
  | --- | --- | --- |
  | tap, standing | 422 µm long, 212 µm high, 0.98 s | 1066 µm, 332 µm, 0.72 s |
  | full charge, standing | (no charge) | 2135 µm, 660 µm, 1.03 s |
  | tap, at full tilt | 709 µm | 1707 µm |
  | full charge, at full tilt | | 3030 µm |
  | tap, scrambling | 1094 µm | 2073 µm |

  All 80 jumps landed and walked on; the deepest body overlap after a landing
  was 49 µm (eased out within a few frames). A jump can't leave the world
  (the walkable square clamps the body in the air too, against the face of
  the wall of moss at its edge, 0.96 m across) and can't skip an encounter: the director meets an encounter from
  wherever the player is, in the air or not, its predators notice a mite
  within 0.9 mm of their ground, and the drops fall round whoever comes
  within 2.6 mm (never on them).
- **Bite (X)**: the rostrum lifts, then dips as the chelicerae snap (0.28 s),
  inside an attack of rear, lunge and puff (see "Biting springtails"). Food
  is the real diet of a phthiracarid: fungal spores (eaten, they vanish) and
  hyphal branch tips (nibbled; they regrow after 25 s).
- **Ptychoidy**: the legs pull in and shrink into the cavity and the aspis
  folds down over it in 0.16 s (Heethoff et al. 2018 measured encapsulation
  nearly complete within 150 ms of a beetle's attack). Closed, it cannot move.
  It is then a rigid ellipsoid: gravity torque about the contact point tips
  it onto its flat side, it rolls without slipping down slopes and falls off
  edges. Reopening is slower (0.9 s), and it rights itself onto whatever
  surface is under it.
- A second box mite wanders with the same walker and closes up when you come
  near. The family (the first encounter) only edges away from a mite walking
  up; they close up when touched (0.3 mm), rushed (full tilt, the scramble
  or a jump within 0.48 mm) or bitten, and open again after 1.8–3.2 s.
  Closed, they roll like yours, onto a flat side on a slope; before they
  closed at 0.42 mm whatever you did (shut or shutting 64% of the time while
  a mite walked slowly up to one, rolled past 90°; now 40%, tipped no more
  than ~35°), which read
  as mites forever flipping over.

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

- **Its hunting ground.** One ground (1.1 mm radius, `PRED_GROUND`), placed
  by the director a short way ahead of whoever leads, three times, hungrier
  and faster each time (see The encounters). It notices prey within 0.9 mm
  of it and hunts only there (plus a 1.1 mm chase out of it) and goes back after a retreat. Coming upon a
  thicket it feeds on the springtails (S38: gamasids favour springtails).
- **Calm until its ground.** It only wanders until someone first walks onto
  its ground (no clock); then it is awake.
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
  and fold, and you sag; **eaten**: the camera pulls back and follows it
  with its meal, a fade, and you are back at your last safe spot (or 1.5 mm
  back toward the start on the same bearing), beside a teammate with company.
  No lives.
- **Closing up still saves you**: hold Y during the strike or the hold and you
  seal into the capsule, drop out of its grip, and it gives up.

Features → Simulation → **Calm opening** (until its ground / 20 s / off) and
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

- Only when hungry (see Threats and pacing): it wanders toward you (once you
  are within 0.9 mm of its ground) until it touches you (~480 µm centre to
  centre) or feels you hurry close by (moving faster than 0.6 mm/s, past
  about half tilt: within 0.95 mm the first time, 1.15 the second, 1.35 the
  third; creep at the slow end and only touch gives you away), then runs you
  down, chasing up to 1.1 mm past its ground. **Fairness at the new speeds**
  (2026-11-02): it hunts at 0.76 mm/s the first time (full tilt, 0.87,
  outwalks it), 0.9 the second (level with full tilt: scramble or jump), and
  1.02 the third, always hungry then (faster than full tilt; the scramble,
  ~1.48 mm/s for 1.6 s, gains ~0.75 mm a burst and a chain of charged jumps
  ~1.5 mm/s, so it can always be escaped, but not by walking). Before, it ran
  at 0.6 mm/s against a 0.42 walk and a 0.88 scramble. Its lunge (1.1 mm/s
  for 0.3 s after a 0.8 s rear) is unchanged: a jump or a close-up still
  answers it.
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
- **The quality governor** (`../shared/quality.js`) and GPU fence pacing:
  frames are never queued while the GPU is behind; the governor steps the
  render scale down when frames run long and back up with headroom (pixel
  ratio min(DPR, 1.25) alone, 1.0 when split, times 0.7 / 0.55 for two /
  three or more views); at its cheapest effects level the detector-shadow
  march is skipped. `?q=high|medium|low` fixes it; `?f=-quality` turns it off.

Budget at the default view (1 player): about 44 draw calls and 213k
triangles since the third pass below (the grains, litter, stems and leaves
are one `BatchedMesh` each, culled object by object; each mite is 5 draws).
In split screen the G-buffer and the
composite are both scissored to each view's region (`split.scissor`).

Measured (headless SwiftShader, 640×360, `perf/measure.mjs`, `?q=high`;
CPU numbers compare between runs, not as laptop times):

| run | CPU ms/frame | raycasts (profile) | draws | prims | heap KB/frame |
| --- | --- | --- | --- | --- | --- |
| 1p before | 14.8 | 2.1 ms/s | 56 | 383 k | 1121 |
| 1p after | 5.7 | 1.8 ms/s | 88 | 335 k | 933 |
| 4p together, before | 31–45 | 29–33 ms/s | 84 | 535 k | 1830–1925 |
| 4p together, after | 6.4 | 0.7 ms/s | 134 | 529 k | 939 |
| 4p in 4 views, before | 34.3 | 3.2 ms/s | 332 | 2.01 M | 1834 |
| 4p in 4 views, after | 20.0 | 2.2 ms/s | 527 | 2.28 M | 1798 |

In 4 views the composite pass fell from ~71 to ~22 ms of SwiftShader time
per view (scissor). Per-frame garbage is about half what it was alone but
still ~0.9-1.8 MB (most of what is left is boxed numbers in the foliage,
floor and cutaway loops, and three.js itself).

### Performance (second pass)

Nothing visible or playable changed. Screenshots of the original and the
new code, rendered from the same seeded state, are byte-identical (1 player
and 4 views). A Node replay of 900 steps (walking, jumps, closing up, a
scaled mite, the predator, bending blades) gives bit-identical bodies,
legs and blade vertices.

Garbage came mostly from V8 boxing numbers, not from `new`:

- **Object shapes.** Collider entries, foliage rods and cutaway objects
  gained fields after they were created (`cutId`, `rod`, `tmark`, `prev`,
  `c`, `r` ...), so the hot loops saw many shapes. Their reads went
  megamorphic, and every number read then allocated. Each now declares all
  its fields up front. A ray cast went from 1.3 KB to 0.2 KB of garbage and
  became 2.5× faster.
- **The floor.** `hash(...n)` built a rest array 12 times per `floorH`. The
  three octaves now run in one loop with the hash written out in place
  (bit-identical over 300k points). The broadphase key now fits a small
  integer, and `castGrid` uses typed scratch arrays.
- **The legs.** Array destructuring in the setae loop left iterator garbage.
  `pose()` was too long for V8 to inline its vector calls, so each leg and
  its setae are now posed in their own functions (same arithmetic, same
  order).
- **Culling.** The mite body, its static setae, its instanced legs and the
  boss had `frustumCulled = false`, so every split view drew every mite.
  They now cull by exact bounds: the instanced ones recompute
  `computeBoundingSphere()` from their instances each pose. An object
  outside a view draws no pixels, so the image is unchanged.

Steady state, back to back against the original (headless SwiftShader,
`?q=high`, 600 frames each; a "drawn" frame also renders, the others only
simulate; medians; draws counted per drawn frame, all views):

| run | heap KB/drawn frame | heap KB/sim frame | CPU ms drawn / sim | draws | tris |
| --- | --- | --- | --- | --- | --- |
| 1p before | 463 | 376 | 7.1 / 2.7 | 88 | 347 k |
| 1p after | 144 | 76 | 3.9 / 1.2 | 64–73 | 287 k |
| 4 views before | 1150 | 667 | 40 / 6.3 | 494–581 | 2.28 M |
| 4 views after | 580–940 | 143 | 16 / 2.0 | 317–439 | 1.97 M |

`perf/measure.mjs` gets only 5–8 frames per run on this shared container, so
most of its code runs unoptimized and its heap figure is inflated (1p
874 → 554 KB/frame). Its draws and primitives match the table.

At 4 views most of the remaining garbage is outside this folder:
`shared/landmark.js` (`inPoly` and `insetInside` destructure a point per
polygon edge, about 275 KB per frame), three.js render lists (~55 KB) and
`shared/splitscreen.js` (~40 KB).

Not done (they change the trade-off or the look):

- 3 mm chunks: superseded by the third pass (`BatchedMesh`, below).
- A lower-poly springtail for the far members of the thicket crowd (968 tris
  × 120, ~116 k per view that sees the thicket).

### Performance (third pass)

Again nothing visible or playable changed. Seeded, fixed-step screenshots of
the original and the new code are byte-identical in ten scenes (the start,
walking through bending blades, closed up, mid-jump, the predator's ground,
the thicket, the boss, a capture, and two frames of 4 views), landmark
overlay included, and a 486-step simulation replay (bodies, feet, blade
offsets and vertices) is bit-identical.

- **Fewer draws per mite: 9 → 5** (4 for the predator). Parts that share a
  material are drawn together: the notogaster and aspis as one mesh, the 32
  leg segments and 8 tarsi as one instanced mesh (the tarsus lathe has the
  segment's topology, so it rides along as a second set of positions), and
  the body, prodorsal and leg setae as one instanced mesh. The claws and the
  sensilli keep their own draws (other shapes). `gMaterial({ frames: true })`
  (`../shared/techniques/mite-sem.js`) places each part by vertex or
  instance id with the very matrices three.js would have uploaded for its
  old mesh (`frameUniforms` in `mite.js`), so the arithmetic is unchanged.
  Bounds are recomputed per pose and stay conservative.
- **The moss, litter and grains as `BatchedMesh`es** (`batched()` in
  `world.js`): one multi-draw per material and view, and only the objects
  (a leaf, a stem, a flake, a grain) whose bounds meet the view, instead of
  every 1.5 mm chunk that does. Each object keeps its vertices and an
  identity matrix. A bent blade's bounds are measured again after the
  foliage moves it (`createFoliage({ onWrite })`), so the cull stays
  conservative (checked: 2894 visible objects over 240 steps of bending
  blades and moving cameras, none left out). three.js's own per-object cull
  reads each matrix back from its texture (0.67 ms per view); the one here
  tests cached spheres (0.03 ms). As every matrix is identity, the shader
  looks none up (`BATCH_IDENTITY`), so three.js no longer re-uploads its
  draw-index texture for every view (that alone cost ~6 ms a frame at 4
  views). The hyphae stay chunked: their threads are rewritten by the
  thicket. three r186 has `BatchedMesh` and `WEBGL_multi_draw`; without the
  extension it falls back to one draw per object, still culled.
- **Shaders built while loading** (`sem.warm()`, called from `main.js` as
  the world, the boss, the mites and the dust are made): it links each new
  program (three.js enables `KHR_parallel_shader_compile`), fetches their
  uniforms and uploads the textures, then draws one object of each kind
  (program, side, vertex layout) into one G-buffer pixel and the composite
  into one screen pixel, which it clears back to black. SwiftShader builds
  its shaders on a program's first draw, so that work moves off the first
  frame into the GPU process while the page goes on building. The image is
  unchanged (the G-buffer is cleared before every frame). It covers the
  eight programs the mite uses (G-buffer front, double-sided, instanced,
  batched ×2, frames ×2, composite); the split views use the same ones.
  `renderer.compileAsync` is not used: the page is built in one synchronous
  module, so its promise would only resolve after the first frame.

Measured against the original, back to back (headless SwiftShader,
`?q=high`, 1280×720; draws counted at the WebGL calls, a multi-draw as one,
all views of a frame; walking, 60 frames a run):

| | before | after |
| --- | --- | --- |
| draws, 1 player | 70 | 44 |
| triangles, 1 player | 267 k | 182 k |
| draws, 4 views | 380 | 244 |
| triangles, 4 views | 1.20 M | 0.91 M |
| render CPU, 4 views (median of 9 runs) | 8.7 ms | 7.4 ms |
| first frame's SwiftShader time | 2.3–2.7 s | 1.0–2.0 s |
| navigation to first frame (5 runs each) | 5.4–6.0 s, median 5.7 | 3.9–6.5 s, median 5.3 |

`perf/measure.mjs` (10–12 frames a run, its draw counter extended to see
multi-draws): 1p 70 → 43 draws, 275 k → 212 k primitives, CPU 10.7 → 7.9
ms; 4 players (its spread does not split the screen) 116 → 69 draws,
467 k → 382 k, CPU 9.9 → 7.5 ms. A simulation step plus a frame measured
over 60 frames varies more between runs than between the versions (1p
4.6–6.4 → 6.7–9.1 ms, 4 views 8.4–10.5 → 9.9–11.4 ms medians), so no
change in CPU is claimed: the gains are draws and triangles.

The load time is noisy here: the container was shared with other agents'
runs (load average 6–17 on 4 cores), and the shaders built ahead now
compete with the page's own start-up for the same cores. On a machine
with spare cores the overlap is larger. The first-sight costs of the boss,
the crowd and the predator, and of the first split (2 players), were
measured too: no program links and no frame slower than the steady ones,
before or after. They use the programs the first frame already built, and
`shared/splitscreen.js` warms its own compose shaders.


### Performance (the scenery tile and the rings)

The encounters need moss far out in every direction; the tile's copies give it
without building more. Measured against the bounded patch, back to back
(headless SwiftShader, 1280×720, `?q=high`; `perf/measure.mjs` gets only
13–25 frames a run on this shared machine, so its CPU figures swing by 2×
between runs of the same code):

| | before | after |
| --- | --- | --- |
| triangles at the start view (by layer: grains, litter, moss, hyphae, spores, floor) | 213 k (1, 3, 30, 24, 38, 11 k) | 207 k (1, 0, 9, 24, 52, 15 k) |
| draws, 1 player / 4 players together (`measure.mjs`) | 39 / 64 | 47 / 69 |
| primitives, 1 / 4 players (`measure.mjs`) | 178 k / 336 k | 197 k / 354 k |
| main-thread JS over 8 s at the start (CDP profile, not idle) | 0.86 s | 0.69 s |
| one simulation step / one frame's render CPU (median of 240 / 40) | 0.6–0.7 / 1.3–1.8 ms | 0.7–1.0 / 1.2–1.7 ms |

The copies cost little because they share everything: nine groups whose
world matrices are set only when a copy moves (three.js would otherwise
multiply ~1900 matrices a frame), one-to-four copies drawn per view, and
the grains, litter and moss drawn only within 8 mm of a view's target
(`DRAW_R`, as far as the old patch reached; the SEM backdrop carries on to
the horizon). The 67 thickets add ~270 objects (each frustum culled whole;
their crowds and threads simulated only near someone). Casts cost about the
same: the periodic broadphase visits the same cells; the periodic floor's
lattice wrap makes `floorH` a little dearer.

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

The moss is one **scenery tile**, 9.6 × 9.6 mm (`TILE`), repeated in every
direction, so wherever the encounters are placed there is moss all the way, to
the wall of tall moss at the walkable square's edge (below). The tile holds:

- about 600 angular mineral grains, 20–300 µm;
- ~40 curled litter flakes;
- 28 moss shoots with lanceolate leaves on a 137.5° spiral, each leaf with a
  costa, a channelled blade, a serrate apex, real thickness (12 µm) and
  cell relief (the ten old ones round the start, the rest at least 1.3 mm
  apart across the tile's wrap);
- 3–5 µm fungal hyphae strung between the floor, grains and litter, with
  branches (their tips are food, regrowing after 25 s; more of them, and more
  spores, round the start);
- fungal conidia, echinate (aster-type) pollen and bisaccate conifer pollen.

The floor is an analytic height field (feet and probes query it exactly)
whose three value-noise lattices wrap with the tile (cells of ~690, 259 and
90 µm), so copies meet without a seam, and the tile is a whole number of the
floor and grain textures' repeats (320 and 160 µm), so the triplanar
textures match too.

**Drawing the copies.** Each view draws the 3 × 3 copies of the tile round
its target (`setView`, called per view; each copy culled whole when its box
is outside the view, so usually one to four are drawn): at least 9.6 mm of
moss on every side, beyond any view's far plane. Copy 0 holds the meshes;
the other eight hold proxies that share their geometry: a `Mesh` or
`InstancedMesh` on the same buffers, and for each `BatchedMesh` (grains,
litter, stems, leaves) a BatchedMesh that draws the original's geometry,
info and textures with its own draw list. Their per-object cull (cached
spheres against the view) runs per copy. The floor is 4 × 4 tiles (46 µm
cells) over one scenery tile, and the hyphae and spores are merged per
3.2 mm chunk: few, large objects, since all nine copies are in the scene
graph (about 60 objects a copy). The copies' matrices are set only when a
copy moves.

**Exclusion discs** (`exclude.set`) take moss shoots (the stem and its
leaves, by the stem's foot) out where something else stands, in world space:
the 67 thickets, the giant springtail and, once placed, the portal's arena.
An excluded shoot is skipped in that copy's draw list and its colliders are
skipped in casts there. Spores and hyphae rest only on the floor, grains and
litter, so nothing is left hanging.

**Walking queries** go to low-poly colliders: the tile's set, through a
periodic broadphase (0.48 mm cells that wrap every tile: each collider is
binned with the copy offset of every wrapped cell its footprint covers, and a
ray meets each copy it reaches at that copy's shift, so hits are in world
space), and a fixed set at real places (the giant springtail). Every big
static mesh (stems, flakes, large grains, the giant springtail) has a uniform
grid of its triangles walked cell by cell along the ray; moving blades are
small and tested whole. The analytic floor is marched in steps as long as its
slopes allow. Hits come from a ring of reused objects. Floor, grains, flakes
and stems are rigid; every moss leaf is a `blade` collider that bends with
its leaf (the lowest leaves, which rest on the floor as ramps, are 3× stiffer
and give little). The bending blades and hyphae are simulated in tile
coordinates: each body is handed to them in every copy within reach of the
tile (`tileBodies`). The per-object cutaway tests each copy of an object
near the line of sight (`createObjectCut` `period`). Food in the tile is
eaten from the copy nearest the mouth.

### The edge of the cushion (`edge.js`)

The owner, 2026-11-02: "for the mite world if there's an edge to it ensure
we have a visual barrier, not just a message". The walkable square ends in
the edge of the moss cushion: a band of tall Sphagnum shoots standing
shoulder to shoulder all round it (`layout.js` `EDGE`), 6–9 mm tall (far over
a jump's ~1.1 mm apex and over the camera at the default zoom, so it fills
the frame as you reach it and nothing shows "past the end") and 2.4 mm deep.

- **What it is.** Each side is cut into 1.6 mm segments, each one of three
  prebuilt variants (a hash of its side and index picks it, so it always
  looks the same). A segment has four rows: the front row's stems touch the
  face, with tongue-shaped stem leaves, a fascicle of spreading branches
  every ~0.7 mm with imbricate leaves, and a capitulum (the dense head of
  short curling branches a Sphagnum shoot ends in); two rows behind with
  fewer branches; a palisade of bare stems at the back, so nothing shows
  through. Each side's band runs on past the corners, so they are filled by
  both. Same SEM look as the moss (`gMaterial`, the stem and leaf classes).
- **Its face is the collision.** The face is the plane |x| = `EDGE.face` (and
  |z|), 0.3 mm inside the square's edge. Nothing of the wall reaches inside it
  below 0.9 mm up (every vertex is pushed back to the face there), and
  `mite.js` keeps the body's centre its reach (its longest half-axis and
  offset, so the front of the aspis: 189 µm for the box mite) inside the face,
  walking, scrambling, rolling, in the air and as posed, so the mite stops
  with its front against the front row's stems. The wall has no colliders
  (nothing to climb). Checked by script: walking, scrambling, a 4 mm/s push
  and repeated full jumps into each side and two corners, and the keyboard's
  W+Shift and Space: the centre never passed 479 512 µm (the face at
  479 700).
- **Seen coming.** The 12° scan at the default pitch sees only ~0.9 mm beyond
  the mite, so the wall enters the frame about then, rising out of the top;
  lowered (pitch 0.18) the view sees ~6 mm ahead and the wall stands across
  it. Before that, shed leaves lie on the floor for 5 mm in front of it,
  sparse at first and piling up toward the wall: placed per segment once, on
  the floor's height and slope, when a view first comes near, and kept. The
  springtail groups and water beads (`life.js`) keep inside the face.
- **Drawn near a view only.** `world.setView` hands each view to
  `edge.setView`: the segments within 16 mm of the view's target along the
  wall whose box meets the view are written as instances (one
  `InstancedMesh` per variant and part: stems, branches, leaves, a lighter
  leaf set for segments more than 2.6 mm from the target), and the shed
  leaves within 7 mm; a few KB a view. More than 16 mm from the wall nothing
  is drawn or written. Measured at 1.5 mm from the wall looking at it: +110 k
  triangles (four segments, ~180 shed leaves), ~290 k in all against ~245 k
  at the start, and fewer draws (the wall hides tile copies). Building the
  three variants takes ~0.6 s at load.
- **The cutaway.** When the camera swings out over the wall (the mite with
  its back to it), the shoots between the camera and the mite are cleared by
  the cutaway cylinder (they carry no per-object ids), a little wider than for
  the moss.

## The crowd: the hyphal thickets (`thicket.js`)

The set piece of `micro/design/combat-ideas.md`: pushing and biting through a
crowd. The owner: moving and attacking clear the way without much
difficulty, and nothing is timed. Laid out as two rings of clusters round the
start (`layout.js` `CLUSTERS`: 13 at 5 mm, 54 at 20.3 mm, each 1.64 mm
across) and five along the forward route (12.6-57.5 mm), built where they stand. Each thicket:

- **Conidiophores and threads**: 34 upright fungal stalks (120–270 µm, a
  spore head on top, food that regrows after 30 s) with ~50 threads strung
  between them at a mite's body height.
- **Springtails** (`../shared/crowd.js`): 30 small soil springtails (~190 µm,
  Isotomidae-like: a ringed body, head, four-segment antennae, six legs, the
  folded furcula; one SEM-drawn instanced mesh, shared by every thicket)
  drift and jostle in it. They part round a mite walking into them; they
  never attack. Closed up (Y), they flow round the capsule.
- **Threads**: every thread across your body drags (with the springtails
  pressing on you, at worst half speed; the scramble halves the drag).
- **Bite (X)** in a thicket grazes away up to three threads in front (real
  oribatid feeding; they regrow after ~40 s once nobody is near) and shoves
  the springtails in front aside (a box mite does not eat springtails; the
  grazing groups on open moss can be bitten and eaten, a game rule: see
  "Biting springtails").
- Only the thickets near someone are simulated (their threads within 1.4 mm
  of a body, their crowd within 2.8 mm of a player).
- Test hooks: `bite(slot)`, `drag(slot)`, `thicket` (its `clusters`, `log`:
  threads cleared, springtails shoved, eaten by the predator), `challenges`,
  `plan`.

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
| Rendering | Quality governor (auto), Manual quality (`shared/quality.js`) | on |
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
| Simulation | Calm opening: until its ground / 20 s / off | until its ground |
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
- **Time**: falling uses a game gravity of ~1500 µm/s² in the world (2600 at
  the anatomy; the jump its own ~4600), far slower than real (a mite crosses
  this world in a few milliseconds of free fall). The walking speeds
  (0.42–0.87 mm/s) are game speeds, several times what an oribatid walks (a
  few hundred µm/s at most), so the moss can be crossed in good time; the
  scramble (~1.5 mm/s) and the predator (0.76–1.02 mm/s) are scaled to
  match.
- **Biting and eating springtails** (X) is a game rule: box mites graze
  fungi and decaying plant matter and do not hunt; predatory mites
  (Mesostigmata) eat springtails. The springtail's daze and the meal's
  rewards are game rules too. Their hops stay upright: real furcular leaps
  often tumble end over end, which read here as a glitch.
- **Life and water** (`life.js`): the springtail groups shy and leap on a
  game rule and stand on the floor, its grains and its litter (`stand.js`),
  walking round the big grains and the stems and through the moss leaves
  (which bend for a mite, not for them); water in an SEM needs an environmental (wet) instrument, and a
  falling drop is slowed (real rain drips through a moss cushion), and a
  mite in the bead it leaves pushes out in a moment, where a real one would
  be held by the water's surface tension. The beads are
  smooth domes, not modelled menisci.
- **The jump is borrowed, and stretched.** Box mites (Phthiracaridae) do not jump. Some
  oribatids do: *Zetorchestes* (Zetorchestidae) jumps with enlarged, elongated
  hind legs and a catch mechanism (Krisper 1990, 1991), and the ptychoid
  *Indotritia* (Oribotritiidae), a box-mite relative, jumps backwards using a
  catch mechanism in its forelegs (Wauthy et al. 1998, Proc. R. Soc. Lond. B
  265: 2235–2242). The game's forward leap (three to six body lengths, a
  flea's or a jumping spider's feel), its charge, height and cooldown are
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
node micro/game/check-worlds.mjs mite
node micro/game/mite/route.test.mjs
```

`route.test.mjs` checks the moss and the encounters without a browser: the
tile's floor repeats, every way out passes within 0.4 mm of a thicket on both
rings (with a way round), and the director with the SEM view's frustum:
rushing in 16 directions meets all seven in order (the first within ~10 s
after a warm-up, a calm break of at least 4 s before each of the rest, none
more than 16 s after the one before, the portal reached in 45–95 s), nothing
placed in view, on seen moss or where it does not fit, nothing moved once
seen; lingering brings them all round the player in order; turning back
moves an unseen one to follow; two players heading apart meet them all; the
walkable square is far beyond play. With the default path: following its
bearing meets the seven pre-placed ones in order (nothing generated, the
water reached in ~59 s); heading off three other ways takes each off the
path while unseen and places it as you go, in order, nothing seen moved.
Straight ahead (the default path runs along `FORWARD`, screen-up): holding
the stick up, rushing and walking, meets the pre-placed order where it lies,
the first after the warm-up (by 12 s rushing, 20 s walking), the gaps
roughly even (none over 1.8x the mean), the water by 80 s rushing and
140 s walking.

`node --test micro/game/mite/*.test.mjs micro/game/shared/director.test.mjs`
runs it with the shared director's tests. `stand.test.mjs` poses the
grazing groups (minutes of their clock, with bites, leaps and hops) and the
thickets' crowd and puts every vertex of every springtail through its matrix:
none may be more than 1 µm under the floor (it failed by 52-87 µm before);
over a bumpy stand-in for the grains its feet and underside stay out; and it
checks the ground cache and the walk-round discs. The speed, jump and rush
measurements in this README came from Playwright scripts driving the page
through a fake controller and the keyboard (`__micro.inputSteps(n, dt)`
reads the pads as a frame does; `__micro.life` holds the springtail groups,
the beads, the drops and the family; `__micro.inSight(x, z, r)` asks the
views; `__micro.dripAt(x, z, slot)` drops a drop at a spot, by default right
on a player, which the game never does, and `__micro.wetState(slot)` reports
how deep that player is in a bead, its stun and speed).

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
