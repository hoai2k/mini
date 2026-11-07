# Springtail · macro prototype (Zoom Chain, Level 0)

The water springtail *Podura aquatica*, about 1.5 mm long, lives on the
surface film of a bog pool. It walks on the film, grazes what floats there,
and escapes by flinging itself into the air with its furcula. The pool is
seen through a macro lens at 1–5x: daylight, true colour, a focal plane a
fraction of a millimetre thick and soft bokeh everywhere else. Built in
three.js (`../shared/vendor`). World units are millimetres; the water
surface is y = 0.

Open `micro/game/springtail/` (the invite gate is off on localhost).

**Goal:** head out across the pool in any direction. The encounters find
you wherever you go, one after another with calm water between them: the rove
beetle *Stenus*, the water strider and its mass of *Podura*, then the rain.
Then the way on is open: floating rafts of Sphagnum under a golden sparkle,
each in a column of golden light from the sky, out across the pool where bog
pondweed grows thick and a wolf spider hunts. Hold RT to focus ahead: the camera stays put, the focus moves out to the
water in front of you and the depth of field deepens, so the pondweed or a
spider ahead comes sharp.
Spot a spider and its raft is near (follow it home); lure it off the raft, get
round it, stand on the raft and press Y, and in the Micro Zoom game the
microscope zooms in to the mite's world. On the way, graze: 8 clumps of food
(three bites each) is the side goal. A catch costs no lives: you re-form at
your last safe spot.

**The way out: fixed portals, encounters placed as you go.** The owner,
2026-11-01: "place the portals in the Springtail game in random noise
generated locations with a certain average distribution (so it's still
random, but not influenced by player behavior) and certain plants indicate
that you're coming close to a portal. And also the spiders hunt within a
certain radius and return to the portal, so you could follow the spiders to
their portal ... I like the idea of wandering spiders. Then also if you see
one you know you're near a portal ... a few seconds away a certain plant could
appear common, and that might also be the spider's hunting grounds." Earlier:
"ensure the user encounters each thing in the game before giving them the
boss and portal"; obstacles soon but not immediately; rushing to a portal
about a minute. So the portals, their spiders and the plants are laid out
before play, the same every game, and the other encounters are still placed
as you go (`design/encounter-pattern.md`, "Per-world placement").

- **The portals** (`PORTALS` in `world.js`, `layPortals`): 16 rafts, seeded
  blue noise (`PORTAL_SEED` 44): dart throwing over open water inside poolE
  0.88, at least `PORTAL_SPACING` 340 mm apart and at least `PORTAL_MIN_D`
  530 mm from the start (450 mm of rushing, ~30 s, plus a ground's radius),
  clear of islands; then a coverage pass that walks a rusher out on 64
  bearings (`rushToGround`: 15 mm/s, round islands, along the bank toward the
  nearer raft once it meets it) and adds a raft on the way of any bearing
  that would go more than 58 s without reaching a ground (8 of the 16), kept
  at least 0.6 x the spacing from the others. Then **the forward raft**
  (`FORWARD_RAFT`; the owner, 2026-11-03: "with the new camera ... make the
  forward path the one of discovery"): the raft nearest the spot 590 mm
  straight ahead along the world's forward (`FORWARD`, screen-up with the
  locked camera) is moved across onto that line, only as far as it must
  (within 20 mm of it: raft 14, moved 65 mm), and the coverage pass runs
  again; walking screen-up then leads into its spider's ground at ~34 s of
  rushing. (Before, the nearest raft stood 85 mm off the line, just past the
  edge of its ground, so straight ahead passed it by and went on to raft 0,
  800 mm out.) Result: nearest neighbours 214–486 mm apart (mean 261),
  531–819 mm from the start. Each raft is turned
  so its mite faces the start. `route.test.mjs` checks every one of 64
  bearings with its own rusher: a ground after 30.2–52.7 s (mean 41; 27
  bearings meet the bank first, and the far way along the bank is never more
  than 69 s).
- **The pool grew** from 1.5 x 0.9 m to 1.9 x 1.24 m (`POOL`) for this: in
  the old pool the bank was ~29 s from the start along the short axis, so a
  raft's ground could not be both ~30 s out and before the bank. The sundew
  clusters now spread out to ~550 mm, food to ~620 mm, and the bank carries
  400 capitula.
- **The hunting grounds and the pondweed** (`GROUND.r` 80 mm, ~5 s of
  rushing): each raft's spider hunts within its ground, and bog pondweed
  (`PONDWEED`, below) grows thick there: 34 leaves a raft, denser toward it
  (about 2-2.7x as many per cm² within 45 mm as beyond), and only 26 stray leaves on all
  the rest of the pool (~30x thinner), so "lots of these leaves: a portal
  nearby". Grounds never overlap.
- **The spiders** (`boss.js`; one per raft, made the first time someone comes
  near: main.js `spiderFor`). Each rests on its raft's near rim (5–9 s), then
  goes out on a round of its ground (2–4 spots, 35–92% of the way out, dashing
  at 9 mm/s and pausing 1.2–2.6 s at each, crouched, feeling the film) and
  walks back to its post, and so on: out on its ground nearly half the time,
  so a spider seen moving about means a raft within a few seconds, and one
  walking home leads you to it (followed at ~30 mm, five rafts tried in the
  browser: 18–46 mm from the raft when it is back on its post). Out on its
  ground it comes for a springtail within 22 mm (`SENSE`) or one landing within
  20 mm, and if one makes for its post while it is out it hurries home
  (11 mm/s) to guard it. Its fight, lure and guard are as before (below).
  Spiders far from everyone are parked (`stepSpiders`): hidden and not
  stepped unless someone is within 220 mm of the raft (a spider never goes
  more than its 90 mm leash from its post, so it is then 130 mm or more
  away, a blur at most at the far edge of a low view).
  The spider in focus (`boss`: the nearest raft's, switched only while it is
  not busy with anyone) is the one that hunts, fights and catches; the
  others nearby wander but ignore players (with two players at two rafts at
  once, only the nearer raft's spider hunts: a limitation).
- **Don't skip** (`sealed` in main.js). The portals are fixed, so a player can
  reach one early. Until the director is done (*Stenus*, the strider and its
  mass, and the rain all met) every raft is sealed: its sparkle stays dim
  and standing on it gives no prompt (a toast once: "Not yet: the way on opens
  once you have met what else the pool holds"), whatever its spider is
  doing; and while anyone is in a hunting ground with encounters left, the
  director ends the current calm break at once (`placeNow`), so the rest are
  placed round them promptly. In practice the seal rarely bites: rushing
  out, every encounter is met by ~28–41 s, before a ground; a sprinter (30
  mm/s, charged jumps) beelining for the nearest raft reaches its ground at
  15 s with the strider and the rain still to come, and they are placed and
  met within half a second (`route.test.mjs`).
- **The encounters, placed as you go** (`shared/director.js`; the settings
  and the order are `DIRECTOR` and `ENCOUNTERS` in `world.js`, the placing
  and meeting in `main.js`). Things you can jump over or walk round (the
  sundews, the pondweed) are scenery and can be anywhere:

| Order | Encounter | Placed | Met (calm break starts once you are clear of it) |
| --- | --- | --- | --- |
| warm-up | Calm water | — | ~5 s of moving (a few jumps) |
| 1 | *Stenus*: its water (40 mm, chase leash 25 mm) with the beetle at the spot | 55–95 mm ahead (lingering: 40–62 mm round you) | in its reach, or within 30 mm of the beetle |
| 2 | The water strider (its water 42 mm, leash 20) and the *Podura* mass (220 NPC springtails, `shared/crowd.js`) at its near edge, a little to one side | 72–125 mm ahead (lingering: 50–80 mm) | in the strider's reach, or within 30 mm of the mass's edge |
| 3 | The rain, from now on, round whoever leads; then the portals open | at once (an event) | at once |

Between them, calm breaks of ~8–10 s of moving (counted only once you are
outside the last encounter). "Ahead" is the way the leader has gone over the
last 3 s (`headingSec`: a hop round an island does not swing it), and a spot
straight ahead is preferred to one off to the side (`aheadBias` 3): the
strider's mass sits on its near side, so straight ahead it needs the far end
of its range (to 125 mm; it was 112, and straight ahead it kept landing
~80 mm off the line and being moved on unseen until the raft). The director's old last entry (the portal and
its spider, placed ahead) is gone. Encounters are never placed on a raft and
its spider's post (`canPlace`: 38–68 mm clear of every raft).

**Timings** (sim seconds, enemies passive). `route.test.mjs`, 16 directions,
15 mm/s, into the nearest ground and on to its raft: *Stenus* met 5.2–6.5 s,
the strider 20.3–24.5 s, the rain 30.2–38.4 s, a ground 30.1–48.8 s, a raft
34.7–53.4 s. Straight ahead (screen-up, round islands, no steering until a
raft is near): *Stenus* 5.8 s, the strider 23.7 s, the forward raft's ground
34.3 s, the raft 38.9 s, the rain on arrival in the ground (34.4 s). On the
page (2026-11-03; a mock pad, the stick held up, a tap jump every 5 frames,
~8 mm/s, turning for a raft once within 60 mm): *Stenus* met 5.4 s, the
strider 23.7 s, the rain 37.8 s, on raft 14 at 53.5 s; before the forward
raft, the same run met the same three but passed raft 14 ~100 mm off and
reached raft 0 at 62.6 s. In the browser (tap jumps of ~8 mm, along the bank toward the
nearest raft, four directions: +x, +z, −x, −z): the first pondweed leaf of a
ground 37–47 s (strays earlier), the ground 26–49 s, a spider within 45 mm
30–51 s (on three of the four), the raft 31–52 s. The browser rusher makes
~17 mm/s, a little faster than the model, so the nearest ground (bearing −z)
came at 26 s, with the rain placed at once on arrival (the don't-skip rule).

- **Explored stays constant.** A 10 mm grid over the pool records what every
  view has seen (each frame, the cells inside the view's frustum within
  60 mm of what it frames, and the 6 mm round each springtail). Nothing is
  placed, moved or removed in a seen cell, and nothing is placed inside any
  view. The low macro view sees the film from ~37 mm before the springtail to
  ~55 mm beyond, so "ahead" is usually just past the edge of the picture or
  off to its side. Seen sundews, islands, placed encounters: all stay as they
  were (`__micro.seenAt(x, z)`); the rafts, spiders' posts and pondweed never
  move at all. Checked in the browser: out 25 s and back 25 s, every placed
  encounter where it was (no moves), the portals unchanged.
- **Ahead, in order, never skipped.** The next encounter comes only after the
  last was met and the break has passed, in water nobody has seen, a little
  ahead of whoever is furthest along, out of view, clear of islands
  (`fits` in `ENCOUNTERS`). One placed but not yet seen follows you if you
  turn away (moved, unseen to unseen). One seen and walked away from counts
  as met (it is never moved).
- **Lingering.** Stay put and, after the break, each encounter is placed
  round you all the same, out of view: *Stenus* with you in its water, the
  strider (with no open water for it and its mass near the start's islands
  it is placed a little farther off and then rows over to you, 4 mm/s:
  `driftStrider`), then the rain. The portals stay where they are: you go to
  them.
- **Before placing**, each predator is hidden and parked far off
  (`parkZone`); a new game parks them again, starts the director over, seals
  the portals and puts every spider back on its post.
- **Sundews are scenery:** 16 clusters scattered over the pool at every
  distance from the start (~70 to ~550 mm out), each a band of three islands
  with a rosette on each; you can go round them or jump over.

**The portal and the boss.** A raft lets you through only once the way on is
unsealed and its spider is off guard. A brief hint comes once someone is
within 70 mm of a raft: "The wolf spider guards the way on. Lure it off the
moss, then get round it". The spider rests on the raft's near rim, facing the
start. A player who reaches a raft while it is on guard (within 15 mm of the
raft's centre) is turned back (a toast, once; the spider attacks as its fight
does). While it is lured off, out on its ground, or beaten, standing on the
raft (within 11 mm of its centre) puts up the prompt "Y Enter the portal"
(`embed.near('portal')`; the owner: never an automatic door), and Y goes
through (`enterPortal`: `embed.landmark('forward')`); off the raft, Y is the
camera's top-down toggle as before. Luring: it wakes when you come within
30 mm of its post and follows you out up to 90 mm from it; then, or when it
has lost you (farther than 40 mm), it walks back at 6 mm/s (a jumping
springtail does 13–17). A big ripple within 50 mm of it and away from the
raft (a charged landing, a raindrop) draws it off to look. The golden
sparkle over each raft (`shared/portal.js`) is dim and restless while it is
guarded or sealed, bright once it is open, and so is its column of light
(below, Landmarks). No arrow points the way (the owner: keep moving and you
find it).

**Bog pondweed** (`PONDWEED`, `buildPondweed` in `world.js`). *Potamogeton
polygonifolius*, the pondweed of acid, nutrient-poor water: bog pools, peaty
runnels and ditches, where it grows in clonal patches of floating leaves on
long stalks from rhizomes in the peat. Chosen over duckweed (*Lemna minor*,
a plant of nutrient-rich water, rare in Sphagnum bog pools) and cotton-grass
fluff (*Eriophorum* grows on the bog, but its seed hairs blow everywhere, so
they would not mark a place). Its leathery elliptic floating leaves are giant rafts at springtail scale,
unmistakable in the narrow macro view, and wolf spiders really do hunt from
floating leaves. **Drawn to read as harmless** (the owner, 2026-11-02: "I
wasn't sure when I saw it if it was a dangerous plant or not"), nothing like
a sundew side by side: smooth, glossy, broad ovals lying flat on the film,
fresh green with a soft yellow-green margin, pale parallel veins and midrib;
about one leaf in four faintly flushed red toward its base (as the species is
in acid water); no hairs, tentacles, droplets or red rim. Round each raft up
to five flower spikes stand out of the water (a slender green stalk and a
dense cylindrical spike of tiny green-brown flowers, ~18 mm tall), one more
instanced mesh per raft's patch.
Departures, labelled: the leaves are 14–28 mm long (in life floating leaves
are mostly 20–60 mm or more), lie flat and still (no stalks shown, no drift),
and grow thick only round the rafts (the patches stand for the clones a
raft's peat holds). Each leaf is solid footing like the debris (`pondweedAt`;
walking on it is slow, jumping from it is not), drawn as one instanced mesh
per patch (culled as one) and the strays in 300 mm tiles. Image request
MP-S06 (a leaf plate, its prompt now asking for the same harmless fresh-green
leaf, no droplets) is open; until it arrives the procedural leaf stands in.

**The water is the ground.** The pool is a 1.9 x 1.24 m sheet of open water
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
| RS (arrows) | **Tilt · peek**: left/right peeks sideways (the turn is locked to the world's forward, below; Free camera in single player turns it). Up looks up (the camera swings down toward the horizon), down looks down, in either view; Features → Invert camera Y flips it (shared by every prototype) |
| **A** (Space) | **Furcula jump.** Tap to hop; hold and release for distance (~0.7 s for a full jump). Aim with LS (no stick: straight ahead). Tap again during a jump to hop immediately on landing, or hold in the air to prepare a charged jump. The furcula re-cocks in 0.08 s, including during flight, so normal landings have no extra cooldown. Released at an enemy in range, the jump becomes a pounce-bite. When stuck in sundew glue, struggle: tug with LS (each new push or change of direction counts; WASD changes on a keyboard) and kick with A, both together, to tear free; on your back (lying in the film, legs kicking), tap A to flip over at once, or wait ~1.2 s and it rights itself |
| **X** (E) | Three moves, by what is in front of your head: **eat** (food: the head goes down on a grain, the mouthparts work and the grain shrinks away, 0.7 s a bite); **fight** (a predator's leg in reach: rear up, then snap: a nip that staggers it); **attack** (nothing in reach: a lunge-nip). **In the air: the pounce-bite** (see Fighting back) |
| **B** (Shift) | Hold: **hunker, the defend button.** Pressed flat with the collophore: facing a predator, it blocks its strike; waves cannot flip you, and a still, hunkered springtail makes no ripples for the strider to feel. You cannot move |
| Y (R) | Camera: top-down, and back to the low view you had (RS also brings it down). At a portal raft Y goes through instead (the game shows "Y Enter the portal"). The in-game controls lists show Y as "Top view" only (3 November 2026): the portal and the way back ask for Y on screen when you are there, so the lists leave them out |
| RT (X) | Hold: **focus ahead.** Over ~0.4 s the focal plane moves out to the water in the upper part of the frame, ahead of you, and the depth of field deepens, so the plants and creatures in front of you come sharp. The lens, the camera's place and its angle don't change (the owner, 2026-11-02): lower the view (RS) and hold RT to read what lies ahead. Let go and it eases back onto the springtail |
| LT (Z) | Hold: **focus near.** The focal plane comes in to the water in the lower part of the frame, with the lens's own shallow depth of field; the camera doesn't move. Let go and it eases back |
| LB / RB (Q / F) | Aperture wider / narrower (f/2.8 to f/22) |
| D-pad ←→ (3 / 4) | Look: macro in low sun, macro overcast, stereo microscope |
| D-pad ↑↓ (1 / 2) | Magnification 1x, 2x, 3x, 5x (field 36, 18, 12, 7.2 mm) |
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

- **Forward: the portal rafts** (design §0.6): 16 floating mats of moss
  (`PORTALS` in `world.js`, radius 8 mm, fixed; `mossTop` honours them, so you
  land and walk on them like islands), each crowned with big red and green capitula
  (`landmarks.js`). On the tallest one a speck moves: a *Limnozetes* mite,
  0.36 mm, walking about on its capitulum. Over it the super-gene's golden
  light (`shared/portal.js` `createPortalGlow`: a glow pool, a fine spray of
  rising sparks with star glints, a 60 mm beacon with motes rising up it;
  five draws). **A column of light from the sky** comes down onto every raft
  (the owner, 2026-11-02: "a vertical column of light from the sky to the
  portal to make it a little more clear that it's not just another plant"):
  `createPortalColumn` (`shared/portal.js`, also an option of
  `createPortalGlow`), a soft-edged shaft of the portal's gold 700 mm tall
  and 7 mm in radius at the foot (`COLUMN` in `landmarks.js`), facing the
  camera about the vertical, brightest at the raft and fading upward, with
  slow streaks, rising motes and a slow pulse; dim while the way on is
  sealed or the raft guarded, bright once open; thinner when a player
  stands at its foot (the raft and the mite stay clear) and gone in the
  outro. One draw each, frustum culled; columns within 900 mm of a player
  are drawn (`COLUMN_SHOW`), and always the four nearest (`COLUMN_KEEP`).
  The low macro camera looks down at ~24 degrees through a ~4 degree field,
  so the horizon (and a column rising from it) is out of frame: instead the
  nearest four columns are **reflected in the film** (`uCol` in
  `springtail-surface.js`), which lays a long golden path across the water
  toward a portal you face, at any distance, as a low sun does; held RT
  (look far) shows the columns themselves standing over the pool. The low
  macro view has the raft out of frame until you are about on it; in view a halo marks the nearest raft (`createPortalLight`;
  the edge spill is off); within 26 mm the focus deepens so the raft is sharp
  beside you. Rafts farther than 260 mm from every player are hidden and not
  updated (`RAFT_SHOW`, `landmarks.js`), and a raft's mite (nine small
  meshes) is drawn only within 120 mm (`MITE_SHOW`); the nearest is in focus (its glow and
  mite are the outro's). Any player standing within 11 mm of an open raft's
  centre gets the prompt "Y Enter the portal" (`embed.near('portal')`); Y
  there calls `enterPortal(P)`, which calls `embed.landmark('forward', { outro })` and plays the
  outro (the column fades out): a golden burst (a ring over the film, a fountain of sparks), a
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
- **No arrow by default** (`shared/landmark.js` draws no forward mark): the
  portal's light at the edge of the view, and its sparkle in view, are the
  only marker. With **Portal arrow** on in the game's Settings (default off;
  `?arrow=1` on this page) each view gets a brass arrow at its edge pointing
  at its players' nearest raft, sealed or not (they open together), with the
  distance beside it ("214 mm"); on screen, a marker over the raft. Test
  hook: `portalArrow()`.

## Multiplayer
**The world's forward** (the owner, 2026-11-03): the camera's turn is locked
to it, so obstacle layout can rely on it. `FORWARD_YAW` in `world.js` (5π/6, the start view): the camera looks toward +x and a little toward -z (the camera sits at −x, +z of its target), the bearing `FORWARD` (−π/6) from the start, and one raft stands on that line (`FORWARD_RAFT`, The way out). RS left/right peeks
sideways instead (the view slides about 30 % of its width that way and eases
back; each player's own, blended through a split and a merge), RS up/down
tilts, and LS moves relative to the fixed forward. With **Free camera (single
player)** on in the game's Settings (or `?freecam=1` here) a lone player turns
the camera freely again; a second player joining eases it back to the forward
over 0.6 s and locks it (`../shared/camlock.js`).

Up to four players (`shared/players.js`, `../CONTROLS.md`): player 1 on the
keyboard and the first controller, players 2–4 join at any time by pressing
any button on another controller (a "Player N joined" toast; in the game the
shell is told with `embed.join`). In the game the roster comes in from the
shell (`embed.players`).

- Each player is a springtail of their own (a second springtail shares the
  first one's meshed geometry), marked by a faint ring of their colour on the
  film. Everyone uses the shared controls; RS left/right peeks (each
  player's own view), and player 1 also has the optics (Y, zoom, look, aperture).
  Focusing ahead or near (RT / LT held) is each player's own: alone it
  focuses the shared camera; with company each view takes its own players'
  focus (the portal halo is left out while anyone looks). A split view's own
  focus, depth of field and look are eased in and out with the split, so a
  merge changes no focus (the shared view's is the strongest look of all).
- **Split screen** (`shared/splitscreen.js`, LEGO-style): together, one view
  that frames the group, with the depth of field deepened until everyone is
  sharp. It prefers to stay one view: as the group spreads it zooms out (the
  split's `zoom`: the lens's field widened, so the camera backs off on the
  same orbit and the focal plane follows it) up to 1.8x the solo framing, and
  splits only once that is not enough; it merges again once you are back
  inside 0.75 of it for most of a second. Split views keep a gentle 0.75 x 1.8
  (1.35x) zoom-out, and each view focuses on its own players. The macro chain ends on the screen, so the
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
  `teleport(slot, x, z)`, `settle(n)`, `landmark` (the portal in focus),
  `landmarkLog` (`ready`, `forward`, `turnedBack`, `sealed`), `portal()` (the
  nearest raft: its position, `sealed`, `guarded`, `open`, its spider),
  `portals()` (every raft and its spider: state, distance, parked),
  `pondweed`, `spiders`, `boss` (the spider in focus), `lookHold(v, slot)`
  (hold RT: 1, LT: -1, let go: 0, back to the pad: null), `lookState()`
  (each player's eased look, the lens, focus, field of view and the light
  columns drawn), `portalReady()` (who
  has the Y prompt), `pressY(slot)`, `enterPortal(slot)`,
  `nearPortal(i, d, b, slot)`, `sealed(open?)`, `joins`,
  `forceCapture(kind, slot)`; the director: `encounters()` (its state),
  `seenAt(x, z)`, `placeNow()` (end the current break), `director` (and its
  `log`); for tests only, out of order on purpose: `placePortal(a, slot, d, i)`
  (take the player `d` mm short of the nearest raft, or raft `i`, on its
  start side, and unseal the way on) and
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
water. One lives at every portal raft: it rests on guard on the raft's rim,
**dormant** until a player comes within 30 mm of its post, and between rests
goes out on rounds of its hunting ground (**wander**) and walks back (see "The
way out" above). Lured off (see "The portal and the
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
  - A sundew is a trap, not a predator. Walking into or landing on a leaf, you are held up
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
  glandular tentacles tipped with glue. The blades rest on the water surface; walk into or land on a leaf and you stick, and
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

### Telling players apart

In multiplayer each player's springtail has its own colouring, tied to the
player colour (`PLAYER_COLORS`, `shared/players.js`) so the ring, the prompts
and the body agree. Springtails vary a lot in life, so each is a natural
colouring; `BODY_COLORS` in `springtail.js` holds them and `createSpringtail({ slot })`
sets them as per-animal shader uniforms (dorsum, venter, legs, claws, furcula,
antenna tips, sheen, specks):

| Player | Ring | Body |
| --- | --- | --- |
| P1 | brass | blue-black Podura with a blue-grey sheen, exactly as before (also alone) |
| P2 | teal | slate-teal dorsum, olive-brown belly, green sheen |
| P3 | rose | plum-violet dorsum, rosy sheen, warm red limbs |
| P4 | slate blue | lighter steel-blue dorsum, grey limbs, bright blue sheen |

The colouring belongs to the animal, so it holds through the dissolve and
re-form, the back-landing, captures, the outro and every split view; the white
of a digested body keeps a faint cast of the sheen (none for P1). The motes are
shared and stay whitish. The faint ring on the film stays. Labelled departure:
P2-P4 are our own colour morphs; *Podura aquatica* itself is the blue-black of
P1 (other springtails are violet, green, bronze or steel-blue).

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
  across the pool in every direction (to ~620 mm). Three bites each; an eaten clump reappears elsewhere 6 s later.
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
    a plane receding in perspective. The portals' columns of light are
    reflected in it (a golden path toward a portal you face; Landmarks).
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
| Optics | Look far / close (RT / LT held) | always |
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
  (`DIRECTOR`, `ENCOUNTERS`), their water (`ZONES`), the fixed portals
  (`PORTALS`, `layPortals`, `rushToGround`), their hunting grounds (`GROUND`)
  and the bog pondweed (`PONDWEED`, `pondweedAt`), moss islands, Sphagnum,
  sundews, food, floating debris.
- `../shared/director.js`: the encounter director (shared by every world).
- `boss.js`: the pond wolf spider boss (one per raft; its rounds of its hunting ground).
- `landmarks.js`: the portal rafts, their capitula, the moving mites and
  their golden sparkles (`../shared/portal.js`); the players' colour rings.
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
node micro/game/check-worlds.mjs springtail
node micro/game/springtail/route.test.mjs       # the fixed portals (64 bearings: a ground in 30-60 s), the pondweed (thick round each raft, rare elsewhere), a spider's rounds (out and home; follow it home), and the director with this world's settings: rushing out on 16 bearings, straight ahead (screen-up: Stenus after the warm-up, then the forward raft's ground and raft within a minute), beelining and sprinting for a raft (don't skip), lingering: every encounter in order, out of view, on open water; sundews scattered
node micro/game/shared/director.test.mjs         # the director itself
node micro/game/springtail/jump-input.test.mjs
node micro/game/springtail/sundew-struggle.test.mjs   # the struggle's balance: both inputs ~2 s, A alone slow, LS alone or idle engulfed
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
