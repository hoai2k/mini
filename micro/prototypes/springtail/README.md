# Springtail · macro prototype (Zoom Chain, Level 0)

The water springtail *Podura aquatica*, about 1.5 mm long, lives on the
surface film of a bog pool. It walks on the film, grazes what floats there,
and escapes by flinging itself into the air with its furcula. The pool is
seen through a macro lens at 1–5x: daylight, true colour, a focal plane a
fraction of a millimetre thick and soft bokeh everywhere else. Built in
three.js (`../shared/vendor`). World units are millimetres; the water
surface is y = 0.

Open `micro/prototypes/springtail/` (the invite gate is off on localhost).

**Goal:** head out across the pool in any direction. The encounters find
you wherever you go, one after another with calm water between them: the rove
beetle *Stenus*, the water strider and its mass of *Podura*, the rain, and
last the way on: a floating raft of Sphagnum under a golden sparkle, guarded
by a wolf spider. Lure the spider off the raft, get round it and reach the
raft, and in the Micro Zoom game the microscope zooms in to the mite's world.
On the way, graze: 8 clumps of food (three bites each) is the side goal. A
catch costs no lives: you re-form at your last safe spot.

**The way out: placed as you go** (`shared/director.js`; the settings and the
order are `DIRECTOR` and `ENCOUNTERS` in `world.js`, the placing and meeting
in `main.js`; `design/encounter-pattern.md`, "Placed as you go"). The owner,
2026-11-01: place things "into areas the player hasn't reached yet, though we
should keep the areas they've explored constant ... place the next obstacles
near them and even the final portal if they hang out long enough ... ensure
the user encounters each thing in the game before giving them the boss and
portal"; and the placed things are "events or enemies", while things you can
jump over or walk round (the sundews) can be anywhere. So:

| Order | Encounter | Placed | Met (calm break starts once you are clear of it) |
| --- | --- | --- | --- |
| warm-up | Calm water | — | ~5 s of moving (a few jumps) |
| 1 | *Stenus*: its water (40 mm, chase leash 25 mm) with the beetle at the spot | 55–95 mm ahead (lingering: 40–62 mm round you) | in its reach, or within 30 mm of the beetle |
| 2 | The water strider (its water 42 mm, leash 20) and the *Podura* mass (220 NPC springtails, `shared/crowd.js`) at its near edge, a little to one side | 72–112 mm ahead (lingering: 50–80 mm) | in the strider's reach, or within 30 mm of the mass's edge |
| 3 | The rain, from now on, round whoever leads | at once (an event) | at once |
| 4 | The portal raft and the pond wolf spider guarding it | 80–120 mm ahead (lingering: 40–70 mm) | going through it ends the level |

Between them, calm breaks of ~8–10 s of moving (counted only once you are
outside the last encounter). Rushing straight out with tap jumps (enemies
passive) meets *Stenus* after ~5–6 s and reaches the raft after ~45–60 s
(`route.test.mjs`, 16 directions: 41–56 s; in the browser, 4 directions:
see Checks); dealing with the encounters stretches that to a few minutes.

- **Explored stays constant.** A 10 mm grid over the pool records what every
  view has seen (each frame, the cells inside the view's frustum within
  60 mm of what it frames, and the 6 mm round each springtail). Nothing is
  placed, moved or removed in a seen cell, and nothing is placed inside any
  view. The low macro view sees the film from ~37 mm before the springtail to
  ~55 mm beyond, so "ahead" is usually just past the edge of the picture or
  off to its side. Seen sundews, islands, placed encounters: all stay as they
  were (`__micro.seenAt(x, z)`).
- **Ahead, in order, never skipped.** The next encounter comes only after the
  last was met and the break has passed, in water nobody has seen, a little
  ahead of whoever is furthest along, out of view, clear of islands
  (`fits` in `ENCOUNTERS`). One placed but not yet seen follows you if you
  turn away (moved, unseen to unseen). One seen and walked away from counts
  as met (it is never moved). The portal comes last, after every other.
- **Lingering.** Stay put and, after the break, each encounter is placed
  round you all the same, out of view: *Stenus* with you in its water, the
  strider (with no open water for it and its mass near the start's islands
  it is placed a little farther off and then rows over to you, 4 mm/s:
  `driftStrider`), the rain, and in the end the raft ~55 mm away.
- **Before placing**, each predator is hidden and parked far off
  (`parkZone`); a new game parks them again and starts the director over.
- **Sundews are scenery:** 16 clusters scattered over the pool at every
  distance from the start (~70 to ~430 mm out), each a band of three islands
  with a rosette on each; you can go round them or jump over.

**The portal and the boss.** The raft is placed by the director as the last
encounter, out of everyone's sight (its 60 mm golden beacon included), so
its golden light then draws you on. A brief hint comes once someone is
within 70 mm of it: "The wolf spider guards the way on. Lure it off the moss,
then get round it". The spider sits on the raft's near rim, facing the way
you come. A
player who reaches the raft while it is on guard (within 15 mm of the raft's
centre) is turned back (a toast, once; the spider attacks as its fight does).
While it is lured off, or beaten, the raft lets you through (`enterPortal`:
`embed.landmark('forward')`). Luring: it wakes when you come within 30 mm of
its post and follows you out up to 90 mm from it; then, or when it has lost
you (farther than 40 mm), it walks back at 6 mm/s (a jumping springtail does
13–17). A big ripple within 50 mm of it and away from the raft (a charged
landing, a raindrop) draws it off to look. The golden sparkle over the raft
(`shared/portal.js`) is dim and restless while it is guarded, bright once it
is open. No arrow points the way (the owner: keep moving and you find it):
once the raft is placed its golden light leads you (see Landmarks).

**The water is the ground.** The pool is a 1.5 x 0.9 m sheet of open water
with 72 moss islands standing in it (a hand-placed cluster round the start,
the 48 of the sundew clusters, a few scattered), and floating debris and food on the
film. A steep Sphagnum bank rings it: jump at it and you bounce off and drop
back onto the water at its foot. The water reaches the horizon wherever you
are; there is no edge to fall off.

## Controls (Xbox controller; keyboard in brackets)

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Button | Action |
| --- | --- |
| LS (WASD) | Walk on the film, relative to the view. Slow and a bit slippery: you coast |
| RS (arrows) | Orbit the camera. Up looks up (the camera swings down toward the horizon), down looks down, in either view; Features → Invert camera Y flips it (shared by every prototype) |
| **A** (Space) | **Furcula jump.** Tap to hop; hold and release for distance (~0.7 s for a full jump). Aim with LS (no stick: straight ahead). Tap again during a jump to hop immediately on landing, or hold in the air to prepare a charged jump. The furcula re-cocks in 0.08 s, including during flight, so normal landings have no extra cooldown. Released at an enemy in range, the jump becomes a pounce-bite. When stuck in sundew glue, struggle: tug with LS (each new push or change of direction counts; WASD changes on a keyboard) and kick with A, both together, to tear free; on your back (lying in the film, legs kicking), tap A to flip over at once, or wait ~1.2 s and it rights itself |
| **X** (E) | Three moves, by what is in front of your head: **eat** (food: the head goes down on a grain, the mouthparts work and the grain shrinks away, 0.7 s a bite); **fight** (a predator's leg in reach: rear up, then snap: a nip that staggers it); **attack** (nothing in reach: a lunge-nip). **In the air: the pounce-bite** (see Fighting back) |
| **B** (Shift) | Hold: **hunker, the defend button.** Pressed flat with the collophore: facing a predator, it blocks its strike; waves cannot flip you, and a still, hunkered springtail makes no ripples for the strider to feel. You cannot move |
| Y (R) | Camera: top-down, and back to the low view you had (RS also brings it down) |
| LT / RT (Z / X) | Focus pull nearer / farther (an offset from autofocus) |
| LB / RB (Q / F) | Aperture wider / narrower (f/2.8 to f/22) |
| D-pad ←→ (3 / 4) | Look: macro in low sun, macro overcast, stereo microscope |
| D-pad ↑↓ (1 / 2) | Magnification 1x, 2x, 3x, 5x (field 36, 18, 12, 7.2 mm) |
| LS click (C) | Autofocus again (clears the focus offset) |
| Menu (Esc) | Features panel |
| View (Tab) | Hide the help panel |

Rumble: a kick when the furcula fires (stronger for a full jump), a tap on
landing, a faint buzz when *Stenus* lowers its head (jump now), thumps for
nearby raindrops and being caught.

The HUD has a scale bar that is true at the focal plane, the magnification,
the f-number (and effective aperture), the depth of field, the food count,
and a furcula meter (cocking, full jump, re-cocking, struggle, back again).

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A bog ambience loop; the furcula jump (A), landings on the water film and the sticky sundew landing, grazing (X), raindrops (quieter and panned by distance), and the Stenus skim and harpoon strike.

## Landmarks

- **Forward: the portal raft** (design §0.6): a floating mat of moss
  (`PORTAL` in `world.js`, radius 8 mm; `mossTop` honours it, so you land and
  walk on it like an island) crowned with big red and green capitula
  (`landmarks.js`). On the tallest one a speck moves: a *Limnozetes* mite,
  0.36 mm, walking about on its capitulum. Over it the super-gene's golden
  light (`shared/portal.js` `createPortalGlow`: a glow pool, a fine spray of
  rising sparks with star glints, a 60 mm beacon with motes rising up it;
  five draws). The low macro view has the raft out of frame until you are
  about on it, so its light also spills in from the edge of the view on its
  side (`createPortalLight`: a warm glow, an anamorphic streak, gold bokeh
  discs, stronger as you near it), and in view a halo marks it; within 26 mm
  the focus deepens so the raft is sharp beside you. No text.
  Any player who comes within 11 mm of its centre while it is open reaches it:
  `enterPortal(P)` calls `embed.landmark('forward', { outro })` and plays the
  outro: a golden burst (a ring over the film, a fountain of sparks), a
  bloom, a chime (`shared/portal-chime`), a rumble, the HUD hidden; then time
  eases to a freeze over 1 s (`OUTRO`, in frame time) while rendering goes
  on. Frozen, it reports the speck's framing (`embed.frozen`) and follows the
  shell's `camera` poses, pushing in on the speck while the mite's world fades
  in under it (`../../game/README.md`, "The continuous transition"). It fires
  once, and again only after everyone has left it. Within 120 mm it posts
  `near('forward')` so the shell preloads the mite (no prompt is shown).
  Standalone, the freeze holds 1.4 s, time comes back and `embed.js` shows its
  toast. Test hooks: `outro()`, `outroStep(n, dt)`.
- **No backdoor:** this is the top of the Zoom Chain.
- **No arrow** (`shared/landmark.js` draws no forward mark): the portal's
  light at the edge of the view, and its sparkle in view, are the only marker.

## Multiplayer

Up to four players (`shared/players.js`, `../CONTROLS.md`): player 1 on the
keyboard and the first controller, players 2–4 join at any time by pressing
any button on another controller (a "Player N joined" toast; in the game the
shell is told with `embed.join`). In the game the roster comes in from the
shell (`embed.players`).

- Each player is a springtail of their own (a second springtail shares the
  first one's meshed geometry), marked by a faint ring of their colour on the
  film. Everyone uses the shared controls; RS from any player turns the
  shared camera, and player 1 also has the optics (Y, zoom, look, aperture,
  focus).
- **Split screen** (`shared/splitscreen.js`, LEGO-style): together, one view
  that frames the group (a little wider as it spreads, with the depth of
  field deepened until everyone is sharp); apart, the view splits and each
  view focuses on its own players. The macro chain ends on the screen, so the
  split copies each view (`capture`), and split views render at 70%
  resolution (55% when split three or four ways): the quality governor's
  split factor (`setSplitViews`). Every pass of the macro chain (scene,
  prefilter, tiles, gather) is scissored to the view's region
  (`split.scissor`, padded 64 px for the bokeh's reach).
- **Threats:** *Stenus* and the strider each go for the nearest free player;
  raindrops hit whoever is under them. A caught player plays the whole catch;
  with company they re-form beside a teammate when it ends (a swamped one
  likewise); alone, at their last safe spot. There is no Eaten card and
  there are no lives.
- Test hooks on `window.__micro`: `players`, `split`, `layout`, `recs()`,
  `teleport(slot, x, z)`, `settle(n)`, `landmark` (the portal once placed),
  `landmarkLog` (`forward`, `turnedBack`), `portal()` (its position, `guarded`,
  `open`, the spider's state and distance), `enterPortal(slot)`, `joins`,
  `forceCapture(kind, slot)`; the director: `encounters()` (its state),
  `seenAt(x, z)`, `placeNow()` (end the current break), `director` (and its
  `log`); for tests only, out of order on purpose: `placePortal(a, slot, d)`
  (the raft `d` mm from the player at bearing `a`) and
  `placeEncounter(k, x, z, b)`.
- With several players the director places each encounter for the one
  furthest along the order (ties: the one who has travelled farthest); the
  others meet it where it is. The rain falls round that leader.

## Fighting back

Shared rules (`shared/predation.js` `createFight`): every attack is
telegraphed, and facing a hunting predator, blocking its strike and biting
back wear its interest down until it retreats (and rests: `hunger.missed()`).

- **Calm vs attacking.** A calm *Stenus* patrols at an easy pace and stops to
  groom (forelegs over the antennae, head bobbing); hunting, it goes low and
  fast, locked on you. Then **the two-stage strike** (`combat-ideas.md` §0,
  idea 1):
  1. **The tell** (0.8 s): it lowers its head and freezes, the labium cocks
     under it ("Stenus: jump now!", a faint buzz). Already in the air when the
     labium shoots: a **clean escape**, played in slow motion for a moment.
     Still on the film: the sticky pads **hold you** and it starts reeling
     you in (1.5 s). **Mash A** to wriggle loose (the real slip-off from the
     labium's tip), which costs your jump: the furcula takes ~1 s to re-cock.
     Not loose in time: reeled into the mouth (the catch).
  2. **The follow-up**, free or escaped: a second, slower tell (1.1 s: it
     rears its forebody high and sways back, mandibles wide open), then a
     ~3.5 mm **mandible lunge**. Jump or step aside: a dodge.
  Every miss (a clean escape, a wriggle free, a dodged lunge) wears its
  interest down like a nip; three and it skims away. The strider rows in, stops a body length off and **raises its raptorial
  forelegs high** (0.7 s), then lunges and snaps them shut. The status bar
  says *Attacking!* and a toast says what to do.
- **Block:** face it and hunker (B) as the strike lands: it glances off, the
  predator staggers back, and its interest falls.
- **Bite back:** X with its leg in reach (Stenus's foretarsi or head, the
  strider's forelegs): you rear up and snap. Blocks and nips each take about a
  third of its interest (facing it close by wears it slowly too); out of
  interest, Stenus skims away and the strider rows off.
- **The pounce-bite (a labelled departure).** X while airborne, or a jump
  released at an enemy in range: the springtail tucks into a dive onto the
  nearest leg or body under its arc (a short aim assist), nips on impact
  (worth two nips), squashes, hit-pauses briefly, splashes and rumbles, then
  rebounds off it. A mistimed dive is a clear miss ("Missed!"). Landing on
  food takes a whole bite. Real *Podura* graze, and the furcula jump is an
  escape; a few springtails (*Friesea*) prey on tiny animals, never by
  leaping.
- **Caught:** the strike, the hold and the eat play out; then the lens pulls
  back and follows the predator with its meal for a couple of seconds, a fade,
  and you are back: beside a teammate, or (alone) at your last safe spot (no
  lives, no Eaten card).

## The boss: a pond wolf spider

`boss.js`; `micro/design/bosses.md`. *Pirata*, a juvenile ~5 mm (adults are
6–9 mm: scaled down, labelled), a real bog-pool hunter that runs on the
water. It sits on guard on the rim of the portal raft, **dormant** until a
player comes within 30 mm of its post. Lured off (see "The portal and the
boss" above), it follows up to 90 mm, then walks back slowly; big ripples draw
it off to look (wolf spiders feel the film's vibrations).

- **Tells:** it **crouches and raises its first two pairs of legs** (0.8 s)
  before a 7 mm lunge; it feels landing ripples and turns to **pounce** on a
  fresh landing (a shorter 0.55 s tell).
- **Counters:** jump clear (a dodged lunge wears it down a little); after
  each attack it has **overreached**, its front legs splayed out on the film:
  nip a tarsus (X, double) or pounce-bite it (double again, capped). About
  three good rounds and it **backs off under the moss** for good, and the way
  on is open.
- Its resolve is a quiet brass gauge at the top while it is engaged. In
  multiplayer it goes for the nearest player, or whoever bit it last.
- A catch follows the follow-and-respawn sequence; it carries you off under
  the moss.
- **Checked against the reference sheet** (`assets/reference-sheets/
  boss-wolf-spider.webp`, delivered; side, top, front and three-quarter
  views): warm golden brown rather than olive; a carapace longer than wide
  with the eye region raised, dark brown with fine radiating striae, a pale
  median band and cream submarginal bands down the sides; an oval brown
  abdomen with a pale lanceolate heart mark and paired cream spots in rows;
  thicker golden-tan legs ringed dark at each joint and mid-segment, knees
  lower; reddish-brown chelicerae; eight eyes (a row of four small anterior
  eyes, two large posterior medians above, two posterior laterals behind).
- Test hooks: `bossFight(slot)`, `boss`, `jumpAt(slot, x, z, power)`,
  `impact(slot)`; and for the fights `setFoe`, `nudgeFoe`, `calm`, `me`,
  `feed`, `fightLog`.

## Threats and pacing

Predators follow the shared pacing in `shared/predation.js`:

- **Calm stretches between challenges.** Each predator keeps to its own
  water (where the director placed it) and never follows you more than a
  short leash out of it; a hunt starts only in its own water. The rain starts
  as the third encounter. A predator stays calm until a player
  first comes into its water; then (after Features → World → Calm on arrival,
  off by default) its hunger comes and goes. While both are still calm,
  raindrops land around you (9–19 mm off) rather than on you.
- **Hunger comes and goes.** Once awake each predator is hungry for
  ~18–32 s, then rests: 45–75 s after a meal, 15–30 s after a miss (a
  *Stenus* strike that finds nothing, a strider that loses your ripples).
  Only a hungry *Stenus* notices, stalks, skims and strikes; only a hungry
  strider answers ripples (from its own water) and grabs. A hungry predator
  also drifts its patrol toward you, within its water. The status bar
  says *Calm*, *Stenus hungry* / *Strider hungry*, or *Hunted!*.
- **Every catch is shown.** When a predator gets you, control stops and the
  whole catch plays, the lens swinging side-on and widening to frame you and
  the predator together, while the status bar turns red and names the phase:
  - *Stenus*: **strike**, the labium shoots out and its sticky pads hit you;
    **hold**, it reels you in, twisting, legs and antennae flailing;
    **eat**, the mandibles work and you shrink into the mouth head first;
    **eaten**, it chews, and the Eaten card comes up.
  - The strider: **strike**, the raptorial forelegs snap shut on you;
    **hold**, it lifts you, kicking, to its rostrum; **eat**, the rostrum
    pierces and sucks you dry (you shrivel and go still); **eaten**.
  - A sundew is a trap, not a predator. Landing on a leaf you are held up
    on its glue drops, a glue strand from a tentacle tip to each of your six
    legs, and the lens closes in from above. **Struggle**
    (`sundew-struggle.js`): tug with LS (each new push or change of
    direction is a tug; WASD changes on a keyboard; at most ~8 a second
    count) and kick with A (at most ~12 a second). Each effort makes the
    body thrash (big bends and rolls, legs and antennae flailing, a lunge
    against the strands toward the stick, the furcula slapping the leaf,
    the blade shaking) and moves you toward free: 0.07 per tug or kick
    while you do both within 0.7 s of each other, 0.03 with one alone. The
    strands (`sundew-glue.js`) stretch and thin and snap one by one, the
    last at free (the HUD meter shows the same progress). **Pause** for
    0.8 s and the hold wins: progress slips back 0.25/s, a snapped strand
    sticks again, and you sink (0.35/s) down among the tentacles as they
    fold over and the blade begins to cup; one kind of effort alone still
    sinks you slowly (0.12/s), both together win depth back. Fully sunk
    is engulfed. In practice: LS and A together free you in ~1.5–2.5 s;
    A alone needs ~6 presses a second for ~5.5 s (at 4 a second the leaf
    wins); LS alone loses; doing nothing, engulfed after ~3.4 s
    (`sundew-struggle.test.mjs` pins these). Engulfed: **strike**, every
    tentacle folds over you; **hold**, wrapped in glue; **eat**, the blade
    cups (part-way, so you stay in sight) while the body turns white and
    breaks up into whitish motes shed from its surface that drift up and
    away (`motes.js`); a beat on the leaf (0.3 s), then the respawn.

  **The respawn** (every catch, and a swamping): the camera glides from the
  catch to where you come back (0.6 s), and you **re-form** there (1 s):
  motes gather out of the air onto the body, which fills in white, then
  colours, and settles with a ring on the film. From the last mote of a
  sundew digestion to control is ~1.9 s. Alone you come back at your last
  safe spot (the predators back in their own water); a spot more than
  70 mm away dips through black instead of whipping the camera across the
  pool. With company you re-form beside a teammate (no full-screen fade).
  There are no lives. Nothing in a catch or a respawn is skippable (the
  owner, 2026-11-01: only a sequence of 5 s or more might ever be), and A
  held or mashed from the struggle does nothing until it is let go: no
  jump fires on arrival. Until then the old respawn was only a 0.6 s fade
  in from black onto a springtail already standing there, which read as a
  cut.
- Raindrops stay hazards: a direct hit swamps you (now only within ~0.95 of
  the drop's radius, with a 2 s shadow warning, and only about half the drops
  aim near you); near misses throw you out of the crater.

Features → World → **Calm on arrival** (off / 5 s / 15 s) and
**Predator hunger** (comes and goes / always / never) change this for
testing. `__micro.challengeLog` records where and when each challenge first
became active (`stenus`, `strider`, `rain`, `portal`, `boss`, ...), was met
by the director (`stenusMet`, `striderMet`, `rainMet`) and first came within
40 mm of a player (`stenusNear`, `striderNear`, `crowdNear`, `sundewNear`,
`portalNear`), with `progress` (encounters met / 4) and `d` (mm from the
start); `__micro.progress()` is encounters met / 4, and `__micro.tick(n)`
steps the game from the pads without drawing (the camera and the views are
still updated, so the director sees what they would see). `window.__micro.forceCapture('stenus' | 'strider' | 'sundew')` plays
a catch; `__micro.pacing()` reports hunger and states;
`__micro.stickOnLeaf(i, slot)` lands a player on sundew leaf `i` and
`__micro.struggle(slot)` reports the struggle (progress, sink, idle,
strands snapped), the motes in flight and a respawn's re-forming.

## Hazards

- **The rove beetle *Stenus comma*** (5 mm, black, huge eyes, a pale spot on
  each elytron) patrols the pool on the film. When it sees something move
  within ~17 mm in front of it, it stalks; from farther than ~4.5 mm it
  **skims** at you (55 mm/s here) on a surfactant it releases from its
  abdomen tip: the Marangoni wake is simulated, calms the ripples under it and
  shoves floating food (and you) aside. In reach, it lowers its head and
  freezes for 0.8 s (the tell, your cue to jump), then shoots its sticky
  labium ~2 mm. If that misses, or you wriggle free, the mandible lunge
  follows (see Fighting back). It then needs 1.6 s to recover and 3.5 s
  before it can skim again. All of this only while it is hungry and you are
  in its water (see Threats and pacing).
- **Sundews** (*Drosera rotundifolia*): scenery, not encounters: 16
  clusters scattered over the pool (~70–430 mm from the start), each of three small islands, each with a rosette whose round
  leaves reach out over the gaps between them, each leaf with ~90 red
  glandular tentacles tipped with glue. Land on a leaf and you stick, and
  must struggle free (see the sundew catch under Threats and pacing).
- **A water strider** (*Gerris*, ~9 mm, legs spanning ~23 mm) stands on six
  dimples. It feels ripples: landings, grazing and struggling bring it rowing
  over, and its strokes send waves that flip an unbraced springtail. Its
  forelegs grab. Keep still and hunker and it loses you.
- **Raindrops** ~3 mm across (twice your length). A shadow grows where one
  will land (2 s); it falls, blasts a crater, throws a crown of droplets
  and rings the pool. A direct hit swamps you; near misses throw you out of
  the crater; the ring waves flip you unless you hunker.
- **Waves** in general: where the film's slope passes ~0.2 you are flipped
  onto your back unless hunkered.

## The springtail (`springtail.js`)

Built from anatomy with `shared/sdf.js` (signed-distance parts, surface-nets
mesh), never traced from a picture:

- **Head**: rounded and hypognathous (mouth cone underneath), with a glossy
  black eye patch on each side (8 ocelli on a dark field in life).
- **Antennae**: four short segments, shorter than the head is long, reddish at
  the tips.
- **Thorax**: a visible pronotum (Th1, as in Poduromorpha), then Th2 and Th3;
  **abdomen**: six rings, Abd IV the longest, Abd VI a rounded tip. A stout
  cylinder of rings with furrows between them.
- **Legs**: three pairs, short and stout (thickened ~1.4x to survive the
  mesh), coxa–femur and tibiotarsus with claws on the film.
- **Collophore** (ventral tube) on Abd I, bilobed, touching the film.
- **Retinaculum** (the catch) on Abd III.
- **Furcula** on Abd IV: manubrium, paired dentes reaching forward under the
  body to the collophore, broad lamellate mucrones. A separate mesh, so it
  swings cleanly down and back (~160°) on a jump and refolds as it re-cocks.
- **Rig**: 26 bones in the vertex shader, one per part (two per leg), blended
  across part boundaries with the `part`/`part2`/`partW` attributes. Pivots
  for a head-and-tail-up U-pose, the head's grazing nod, waving antennae, a
  tripod gait (L1 R2 L3 / R1 L2 R3) driven by distance walked, legs tucked in
  the air and flailing on the back, hunkering, and the furcula swing.
- **Cuticle shader**: slate blue-black dorsum, reddish-brown venter and limbs;
  Podura has no scales, so fine granules as a noise bump with frosty specks
  where granule tips catch the light; transverse wrinkles on each tergite;
  a blue-grey velvet sheen at grazing angles; dark furrows where two rings
  meet (from the part weights).

**Checked against photographs** of *Podura aquatica* from iNaturalist (CC BY
and CC BY-NC observations by Ben Armstrong, Alexis Tinker-Tsavalas, Michał
Górski and ariellopezpics; not copied into the repository) in two turnaround
rounds (front, side, three-quarter and rear views at 5x). Round one: the
legs and antenna tips were too orange, the rings were separate discs, the
sheen too pale. Round two: darker reddish-brown limbs, ring ellipsoids that
overlap more (shallower furrows), a weaker sheen. The photos show the same
blue-grey frosting under diffuse light that the shader gives when backlit
or overcast.

## Movement and simulation

- **Walking**: acceleration 11 mm/s² against a light drag (1.9 /s), so the top
  speed is ~5 mm/s (about 3 body lengths a second) and you coast. Slower on
  moss. The ripple slope pushes you downhill and the surfactant flow carries
  you.
- **Jump (A)**: a ballistic arc. Range 3–36 mm and apex 0.3x the range + 0.6 mm,
  from tap to full charge. Right after take-off the body tumbles backward
  (the furcula strikes behind the centre of mass); then it curls into the
  **U-pose** (head and tail up), which turns the ventral tube down, and it
  lands on its venter with an **adhesive landing**: no bounce, a deeper
  collophore dimple and a small ring of ripples. 85% of landings are upright,
  as measured (switchable). Land on a sundew leaf and you stick; on moss or
  a piece of floating debris you walk on it (debris carries you as it
  drifts).
- **Water surface** (`shared/techniques/springtail-surface.js`):
  - A 256 x 256 damped wave equation over an 84 mm window (0.33 mm cells),
    stepped 240 times a second on the CPU and uploaded as an RG 32-bit float
    texture each frame (one interleaving copy; half-float, converted per
    texel, only where float textures cannot be filtered linearly). The window **follows the springtail**
    (`field.recenter`, whole-cell shifts once you stray ~10 mm), and a sponge
    rim soaks ripples up before the window's edge. Islands and the bank are
    the boundary. The water mesh is one wide grid (0.4 mm cells in the
    middle, coarser out to 1.1 m) re-centred under the camera every frame.
  - A **surfactant** field in the same grid: released by *Stenus* while it
    skims, it diffuses, decays (0.25 /s), damps capillary waves under it, and
    drives a surface flow down its gradient (Marangoni), which moves the
    floating food and you.
  - **Menisci**: up to 96 analytic dimples per frame (claws, ventral tube,
    hunkered body, *Stenus*'s tarsi and abdomen tip, the strider's legs,
    floating food, and a rising meniscus round each piece of debris). Each has a logarithmic profile like the K0 meniscus of a
    small load, `ln((R²+a²)/(r²+a²))`, fading to zero at six contact radii,
    with its analytic gradient for the normal.
- **Floating debris**: ~100 rafts of dead Sphagnum leaves, birch bark flakes,
  pine needles and heather twigs, drifting on the flow; you can land and stand
  on them.
- **Food**: 110 floating clumps of pine pollen (yellow), fungal spores (brown)
  and green algae (elongated cells), each a few dozen grains with its own
  little meniscus, drifting on the flow; half round the start, the rest out
  across the pool in every direction (to ~430 mm). Three bites each; an eaten clump reappears elsewhere 6 s later.
  Only clumps within 80 mm of a player or the view are drawn (packed into the
  first instances): farther out a grain is under a pixel.

## Rendering (`shared/techniques/springtail-macro.js`)

The **macro photography** look is new to the set:

- **Thin-lens camera.** A 100 mm macro lens on a 36 mm sensor: m = 36 / field
  width, subject distance f(1 + 1/m) (the camera really is 12–20 cm back,
  so the near plane sits ~35 mm in front of the subject, the lens's working
  distance), field of view from the field width, effective aperture N(1 + m),
  depth of field 2Nc(1 + m)/m² with c = 0.03 mm. At 2x and f/11 that is
  ~0.5 mm; at 5x and f/8 ~0.12 mm, thinner than the springtail is tall.
- **Depth of field** as a depth-based gather. Every material writes HDR colour
  and its distance from the focal plane (alpha of a half-float target; small
  near focus, so half floats stay precise where it matters). Half-res
  prefilter → signed blur-disc size per pixel (thin-lens CoC) → 16x16 tiles of
  the largest foreground blur → a 64-tap golden-spiral **two-layer
  scatter-as-gather**: background taps are averaged with their discs clamped
  to the centre's blur (sharp edges never smear backward), foreground taps
  spread over their own discs and add coverage by area (tap area / disc area),
  so blurred foreground spills over sharp background as it does through a
  real lens, independent of the tap radius. Per-pixel spiral rotation plus a
  tent filter turn tap patterns into fine noise; taps near a disc's edge are
  weighted up for onion-ring bokeh. The water writes the refracted floor at
  its **apparent depth** (path / 1.333), mixed with the surface depth by how
  much of the pixel is reflection, so the floor blurs as a camera sees it.
- **Water film**: Fresnel mix of a reflected sky-and-bog environment and the
  refracted pool floor (Snell), tea-coloured humic water (Beer–Lambert,
  red passes, blue is lost), a sharp sun disc that makes glints, which bloom
  into bokeh. **Caustics**: the floor point is lit through the surface above
  it, offset toward the sun, with brightness 1 / (1 + depth x curvature / 4):
  ripples focus light into bands and every dimple throws a dark spot with a
  bright rim onto the floor, like a water strider's shadow. Soft round shadows
  of the springtail, beetle, strider and the rain telegraph.
- **Legible surfaces** (game cues drawn by rendering, no HUD markers):
  - **Water film**: a deep, dark tea pool (the floor fades out except in the
    shallows by the shores) under a boosted Fresnel sky sheen and a broad sun
    lobe, faint moving micro-ripples, and fine dust and pollen specks floating
    on the film that are sharp only in the focal plane, so the film shows as
    a plane receding in perspective.
  - **Shores**: a raised meniscus where the water meets an island or the
    bank, which catches the sky as a bright line, then a wet dark band.
  - **Moss heads**: a bright backlit rim on every branch and wet dark bases
    at the waterline, so each head stands out against the water; the island
    domes carry the MP-S02 moss texture.
  - **Drop shadow** (`dropShadow` in springtail-macro): a dark core and a
    soft halo straight below the springtail on whatever is there (water,
    moss, a sundew leaf, debris). Standing, it is a contact shadow; in a leap
    it shows your height and the exact spot you will come down on, and the
    camera frames low enough to keep it in view.
  - **Focus follows the jump**: while you cock a jump and while you fly, the
    focal plane moves to between you and the predicted landing spot and the
    depth of field deepens (up to 14x) until both are acceptably sharp; the
    framing leans 30% toward the landing. The landing spot comes into focus
    before you get there.
- **Lit materials** (`litMaterial`): sun (GGX), sky hemisphere, wrap and
  back-light translucency (moss, sundew leaves, glue), velvet sheen, a ring
  light for the stereo microscope look. Filmic (ACES) tone mapping, vignette,
  faint sensor grain.
- **Sphagnum**: ~1000 instanced capitula (three variants) built from
  curved tapered branch tubes: a tight terminal bud and spreading branches,
  green, ochre and red, translucent when backlit, packed on the islands and
  along the bank (the bank and the lawn beyond it use the lighter variant).
  They are chunked into 64 mm tiles, so each view culls whole tiles outside
  its narrow macro frustum, and each tile is an LOD: beyond 90 mm past the
  focal plane it draws a coarse head (14 branches of 2 segments and 3 sides,
  ~170 triangles instead of 640–1440), deep in the bokeh there.
- **Looks** (D-pad ←→): macro in low sun, macro overcast (no glints, soft),
  stereo microscope (ring light, round field stop, ~4x the depth of field).

## Features panel (Menu)

| Group | Feature | Default |
| --- | --- | --- |
| Rendering | Depth of field (bokeh gather) | on |
| Rendering | Bright-rimmed bokeh discs | on |
| Rendering | Caustics and dimple shadows on the pool floor | on |
| Rendering | Water film shading | always |
| Rendering | Velvety cuticle | always |
| Rendering | Sensor grain | on |
| Rendering | Quality governor (auto), Manual quality (`shared/quality.js`): render scale x split factor, and the bokeh gather's taps (64 / 40 / 24) by its effects level | auto |
| Optics | Look (D-pad) | Macro, low sun |
| Optics | Thin-lens macro camera | always |
| Optics | Autofocus on the springtail | on |
| Optics | Focus follows the jump | on |
| Rendering | Drop shadow under the springtail | on |
| Rendering | Legible water film (sheen, shore menisci, specks) | on |
| Simulation | Ripple height field | on |
| Simulation | Marangoni surfactant | on |
| Simulation | Show the surfactant (tints the film yellow) | off |
| Simulation | Meniscus depth: exaggerated ~3x / life-like | exaggerated |
| Simulation | Landing odds: real 85% upright / always upright | real |
| Simulation | Jump time: slowed ~6x / real time | slowed |
| Body | Mid-air U-pose righting | on |
| Body | Anatomy from SDF parts | always |
| World | Rove beetle, water strider | on |
| World | Calm on arrival: off / 5 s / 15 s (after first entering a predator's water) | off |
| World | Predator hunger: comes and goes / always / never | comes and goes |
| World | Rain: sometimes / often / off | sometimes |
| Controls | Invert camera Y (shared by every prototype) | off |
| Controls | Camera-relative walking and aiming | always |
| Controls | Rumble | on |

Borrowed looks from the other prototypes are not wired in: their adapters
need an SEM G-buffer or an optical field, and this pipeline renders an
opaque, lit scene with depth in alpha.

## Delivered art

Every requested image is loaded with `loadTexture(id)` (guarded, since the ids
may not be in `shared/asset-list.js` yet) and has a procedural stand-in:

| Id | Use | Stand-in |
| --- | --- | --- |
| MP-S01 | Water surface texture, mixed into the pool floor seen through the water | Procedural peat floor (humus, sunken Sphagnum leaves, twigs, sand) |
| MP-S02 | Sphagnum lawn texture on the capitula and the island domes | Procedural ribbing and colour variation |
| MP-S03 | Bog backdrop as an equirectangular environment (reflections, sky) | Procedural sky, clouds and a band of bog vegetation |
| MP-S04 | Sundew leaf plate: the blade's middle (glands and tentacle bases) mapped onto the leaf blades | Green centre to red rim |
| MP-S05 | Raindrop/ripple sprite: an expanding splash ring at impacts | Crown droplets and simulated rings only |
| MP-U05 | Launcher card, also shown on the title card | Title card without an image |

## Scale and departures (labelled)

- **Jump**: real semiaquatic springtails take off from water at ~0.7 m/s and
  travel up to ~48 body lengths; a full jump lasts on the order of 0.1–0.2 s
  (the body rights itself within ~20 ms). Here a full jump is 36 mm
  (24 body lengths, about half) lasting 0.85 s (~6x slowed) so it stays on
  screen and you can see the tumble and the U-pose. "Real time" in Features
  plays it at the real duration. The righting takes ~0.15 s on screen.
- **Ripples** travel ~43 mm/s, ~5x slower than real millimetre capillary
  waves, so you can see them coming.
- **Stenus** skims at 55 mm/s here; *S. comma* reaches ~0.7 m/s. Its labium
  shoots out in 0.06 s here, a few milliseconds in life. The ~2 mm reach is
  a game value; the sources consulted describe the labium's "large range"
  without a figure.
- **Sundew** tentacles curl in a few seconds here; in life, minutes; and
  digestion takes days, not two seconds.
- **The strider** rows ~4x slower than a real *Gerris* (which can sprint at
  ~1 m/s).
- **The drop shadow, the shore highlight, the boosted water sheen and the
  jump focus** are legibility cues, not optics (each can be switched off).
  The pool is deeper (up to ~14 mm) than many bog pools so the dark water
  reads as a mirror.
- **Menisci** are ~3x deeper than life by default (switchable), so the
  dimples and their floor shadows read at screen size. Food grains (pollen
  60–80 µm) are thickened ~1.5x.
- **Raindrops** fall slowed, and their crown droplets fly under reduced
  gravity, for the same reason as the jumps.
- **Thin parts** (legs, antennae, tentacles) are thickened to survive the
  mesh and the screen.
- **Hunkering** as a defence is a proposal, built on the collophore's real
  adhesion to the film.

## Biology sources

- Ortega-Jiménez VM, Challita EJ, Kim B, Ko H, Gwon M, Koh J-S, Bhamla MS
  (2022). Directional takeoff, aerial righting, and adhesion landing of
  semiaquatic springtails. *PNAS*; preprint https://arxiv.org/abs/2211.04285.
  Take-off direction set by body angle and collophore adhesion; a U-shaped
  pose rights the body in under ~20 ms; 85% of landings on the ventral side,
  anchored by the collophore. Press summaries (Georgia Tech, ScienceDaily,
  Bhamla lab) for the 20 ms and 85% figures; the ~0.7 m/s and 48 body
  lengths come from a later review's summary of that study.
- *Podura aquatica*: Wikipedia and the Missouri Department of Conservation
  field guide. 1–1.5 mm (up to 2.5 mm reported), blue-black, lives on the
  surface film of still water; the flattened furcula lets it jump without
  breaking the film; a tenaculum (retinaculum) latches the furcula.
- *Stenus*: Betz O. (1996, 1998) on the labial prey-capture apparatus
  (protrusion in ~1–3 ms by haemolymph pressure, sticky paraglossae, used
  against springtails); Wikipedia's *Stenus* article for Marangoni skimming
  with pygidial-gland secretion at ~0.75 m/s.
- The Micro research atlas, `micro/research/` and
  `micro/design/zoom-chain-levels.md` (S40).

## Files

- `index.html`, `main.js`: the page, the game loop, the camera and optics,
  HUD and features.
- `springtail.js`: the springtail model, rig and cuticle shader.
- `world.js`: pool shape and bank, the encounters' settings and order
  (`DIRECTOR`, `ENCOUNTERS`), their water (`ZONES`) and the portal
  (`PORTAL`), moss islands, Sphagnum, sundews, food, floating debris.
- `../shared/director.js`: the encounter director (shared by every world).
- `boss.js`: the pond wolf spider boss.
- `landmarks.js`: the portal raft, its capitula, the moving mite and its
  golden sparkle (`../shared/portal.js`); the players' colour rings.
- `enemies.js`: *Stenus*, the water strider, raindrops.
- `../shared/techniques/springtail-macro.js`: macro lens, lighting, bokeh
  post chain (reusable).
- `../shared/techniques/springtail-surface.js`: ripple and surfactant field,
  analytic menisci, water film material, peat floor (reusable).

## Performance (second pass)

Measured in headless SwiftShader (`micro/tools/perf/measure.mjs`, `q=high`),
before and after back to back. Every change gives the same picture and the
same simulation: the water shader's output was compared float for float, the
ripple field's arrays byte for byte, and full-page screenshots differ by at
most 1–2 levels, as much as two runs of the old code differ.

- **Water shader** (`springtail-surface.js`): the five caustic taps sum the
  dimples in one pass (a dimple out of reach costs one test, not five); every
  dimple loop is skipped outside the box the dimples can reach
  (`Dimples.box`, uniform `uDimpleBox`); the shore meniscus's five
  `shoreDist` taps (70 islands each) run only within 3.5 mm of a shore; the
  ripple taps are skipped outside the ripple window (`upload()` keeps the rim
  texels at zero, which also stops a recentred rim smearing to the horizon).
  Scene pass 2.78 → 2.14 s at one player, 1.66 → 1.16 s per view at four.
- **Time to first frame** 7.4 → 6.1 s (GPU process 16.0 → 12.8 s of CPU);
  the first frame is mostly that water draw. `check.mjs springtail` 21 s.
- **Ripple field**: a field nothing has touched yet skips its steps and its
  upload (512 KB → 0 a frame until the first ripple). `recenter()` shifts the
  water mask and reuses its buffers instead of testing all 65 k cells and
  allocating 1 MB: about 4× faster.
- **`islandEdge`** (behind `inPool` and `mossTop`) looks in a 40 mm grid of
  candidate islands: about 10× faster, same island and distance.

Third pass (same method, `q=high`, before and after back to back):

- **Dimples bucketed by position** (`Dimples.pack`, texture `uDimpleGrid`):
  a 16 × 16 grid of 4 mm cells centred on the median dimple lists, in the
  order they were added, every dimple that can reach each cell (plus a list
  for those reaching outside the grid); each pixel loops over its own cell's
  list instead of all 96. The game fills all 96 slots (food, debris and both
  predators, wherever they are), so every pixel used to test 96. Output is
  bit-identical: the water drawn to a float target from five views and three
  dimple sets (the game's own, a dense one, a scattered one) matched the old
  shader float for float, as did `Dimples.height` and the ripple arrays.
  Water draw alone 2.2–5 s → 0.8–1.3 s (the floor with no dimples is
  0.5–1 s); scene pass 6.06 → 2.08 s at one player, frame 5.7 → 2.5 s, the
  CPU packing 0.013 ms and a 13 KB upload a frame.
- **Cheaper ripples (experimental)**, Features → Simulation, off by default
  (in the game: Settings → World features). The ripple field on 128 × 128
  cells at 120 Hz instead of 256 × 256 at 240 (`RippleField.setResolution`):
  per-step damping and the surfactant's diffusion are rescaled and a push's
  kick is kept per second, so rings travel as fast and rise as high, with
  coarser fronts (small rings wider, about half the slope). Chosen over T4's
  plain 120 Hz, which halves the ripple speed for half the saving. Measured
  in the browser with ripples running at 60 fps: step 2.2–2.9 → 0.33–0.37 ms,
  upload 0.11–0.16 → 0.03 ms a frame.

Tried and dropped: drawing the scene once into the tiny targets before the
SDF meshing, to compile pipelines in parallel (no gain); grouping the islands
in `islandDist` (slower under SwiftShader).

## Checks

```bash
node micro/prototypes/check.mjs springtail
node micro/prototypes/springtail/route.test.mjs       # the director with this world's settings: rushing out on 16 bearings and lingering, every encounter in order, out of view, on open water; sundews scattered
node micro/prototypes/shared/director.test.mjs         # the director itself
node micro/prototypes/springtail/jump-input.test.mjs
node micro/prototypes/springtail/sundew-struggle.test.mjs   # the struggle's balance: both inputs ~2 s, A alone slow, LS alone or idle engulfed
```

The camera's pitch was once stuck overhead: top-down was a separate mode in
which RS pitch was ignored, so only Y brought it back (and the stick raised
the camera when pushed up). Now one wanted elevation (0.1–1.5 rad) is moved
by RS in either view through the shared `ctl.look()`, and Y jumps to
top-down and back.

## Known issues

- Software WebGL (the headless check) renders a frame in several seconds; the
  64-tap gather and the water's dimple loops are the costliest passes. The
  quality governor keeps a slow GPU responsive.
- On moss the springtail walks over the capitula tops rather than climbing
  through the branches, and can be hidden among them at low angles.
- Sun shadows are soft round blobs, not true shadow maps.
