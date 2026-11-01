# Micro Zoom

The game built from the Micro prototypes: seven worlds at seven
magnifications, from a water springtail on a bog pool's surface film down to a
bacteriophage beyond the reach of light. Choose any world to start in (the
springtail is the default). Each world has a **forward landmark** in the
direction of play. Reach it and the microscope zooms into the next world. In
the opposite direction is an optional **backdoor**: dwell on it and press Y to
zoom back out to the world above.

Published at https://hoai2k.github.io/mini/micro/, public: it has no invite
gate (`../prototypes/shared/boot.js` starts the page directly). Visits are
counted for games.hoai.net/stats/ (the GoatCounter script in `index.html`).

## Structure

| File | What it does |
| --- | --- |
| `index.html` | The screens: title, world select, world intro, play, transition layer, pause, settings, instructions, confirm |
| `src/boot.js` | The invite door, then `main.js` |
| `src/main.js` | The shell: screens, focus and controller navigation, the play frame and its messages, pause, settings, progression, test hooks (`window.__game`) |
| `src/worlds.js` | The seven worlds: card data (magnification, field, body, look), goal, landmarks, controls, field notes |
| `src/transition.js` | `playTransition(from, to, dir) → Promise`: the zoom between worlds (see below) |
| `src/continuous.js` | `playContinuous(…)`: the continuous transition's camera move and crossfade between two live worlds (see below) |
| `src/bus.js` | Messages to and from the world frames |
| `src/input.js` | Menu input: every controller (any joined player drives the menus), keyboard, repeat timing, held-button locking |
| `src/players.js` | The local players (up to four), through `../prototypes/shared/players.js`; a stub with the same surface stands in if it is missing |
| `src/glyphs.js` | Button glyphs: Xbox buttons whenever a controller is connected, keyboard keys only when none is |
| `src/sound.js` | The shell's own synthesised sounds and the master switch and volume (sent to the worlds) |
| `src/title-bg.js` | The title's moving background: an endless zoom through the worlds' plates, nested as objective fields |
| `src/art.js` | Delivered images from `../image-requests.md`, with drawn stand-ins |
| `src/style.css` | Ivory paper, brass rules and vernier ticks, ink green and oxblood; Cormorant Garamond and DM Sans (Google Fonts, with Georgia and system fallbacks) |
| `icons/`, `manifest.webmanifest` | The app icon (MP-G06) at 512, 192, 180 and 32 px |
| `check.mjs` | The headless check |

The modules reach the prototypes at `../../prototypes/` from `src/`. In the
repository that is `micro/prototypes/`; `../publish.sh` puts `index.html` at
the root of `<site>/micro/` and the modules in `<site>/micro/game/src/`,
beside `<site>/micro/prototypes/`, so the same relative path holds (only
`index.html`'s own `src/` references are rewritten to `game/src/`).

## Screens

- **Title.** The MP-G01 logo over a continuous nested photographic zoom:
  springtail → mite → tardigrade → amoeba → paramecium → bacterium → normal
  Phage → water → the identical opening bog scene. Eight dedicated plates
  form an 80-second cycle, with a fivefold zoom per step and soft compositing.
  The Phage uses the updated realistic false-light environment without glow.
  All images decode before the first scene appears; reduced motion holds a
  composed frame. [Plates and loop design](../design/title-zoom.html).
  "Press Start" pulses. Any controller button, Enter, Space or a
  click goes to the menu, asks for fullscreen and turns the sound on. Moving
  the left stick enters the corner buttons (Instructions, Settings, Sound,
  Fullscreen).
- **World select.** One card per world (MP-U01–U07 in the MP-G04 brass
  frame), carousel-style with depth, over the menu background (MP-G03, or a
  dark green bench with an engraved grid). Each card shows the magnification,
  field width, body size, look, a line about the world and whether it has
  been visited. A brass log-scale rule along the bottom marks each world's
  field, with a cursor on the focused one. Every world can be chosen.
- **Intro.** Choosing a card zooms it to fill the screen and becomes the
  world's intro when its image is decoded: the plate (MP-G07–G13), the data, the goal,
  the forward landmark and the backdoor, the controls and field notes. "Press
  A to begin". Pending artwork shows a spinner rather than a temporary image.
  The selected world loads behind the intro at full viewport size, paused
  and without sound or input. Begin reuses that frame; a ready world opens
  immediately, while an unfinished load retains the loading screen. Going
  back to the tray discards the preload.
- **Play.** The world in an iframe (`../prototypes/<world>/?embed=1`), a brass
  plaque (bottom right) with the world and its magnification, a controls-card
  button and a pause button. The controls card is the shell's own (in the
  game's style, filled with the world's live control rows from its HUD).
  Prototype diagnostic stats stay hidden in the game; standalone prototypes
  keep their readouts.
  It shows for 8 s at the start of every world after the first (a setting),
  and View or the button toggles it. At the backdoor a prompt shows when the
  world reports the player there (`near`, "Y · Rise to …"). The way on has no
  prompt or text: the portal itself (its golden light, `shared/portal.js`)
  says "go there"; a world's `near {kind: 'forward'}` only starts the next
  world loading.
- **Pause.** Menu/Start (on any controller), the world's `menu` message, the
  window losing focus, the tab hiding, or a controller disconnecting. The
  world stops (its frames and its sound). The pause menu (Resume,
  Instructions, Settings, Restart world, Choose world, Title) has the
  bottom-right buttons for settings, sound and fullscreen. Leaving or
  restarting asks first.
- **Settings.** Sound on/off and volume, Invert camera Y (the shared
  `micro.invertY`), the controls card at the start of each world, the
  transition style (Continuous, the default: the continuous transition where a
  pair supports it and the microscope zoom elsewhere; Microscope zoom; or
  Specimen plates), fullscreen, and in
  play "World features" (the world's own feature panel, for development).
- **Starting direction.** Every world starts with its forward landmark up and
  to the right. Orbit views use a starting camera angle; the bacterium and
  Phage fields start their creature below and left of the host. Camera and stage controls
  continue to work, and the arrow follows the landmark's actual projection.
- **Progression.** A forward landmark plays the transition in (every pair
  from the springtail to the phage: the continuous transition; the microscope
  zoom if a world cannot answer in time) and the next world
  takes over; a back landmark plays the zoom out to the previous one. The furthest
  world reached and the worlds visited are kept in localStorage.

## The embed protocol

Documented in full in `../prototypes/shared/embed.js`. In short:

- World → shell: `ready` (sent by embed.js after the first frames), `hud`
  (the controls rows, sent by `shared/hud.js`), `landmark {kind:
  'forward'|'back', outro?}`, `frozen {pose}`, `opening {pose}`, `near {kind, on, label?}`, `menu` (sent by
  `shared/features.js` on Menu), `view` (sent by `shared/hud.js` on View),
  `join {index, color}`, `features {open}`, optional `captured`, `died`,
  `progress`; the zoom player's `done`.
- Shell → world: `pause`, `resume`, `sound {on, volume}`, `controls {show,
  autoHide}`, `settings {invertY}`, `features {open}`, `players {roster}`,
  `hold`, `camera {pose}`, `begin` (the continuous transition, below).

A world loaded with `?embed=1` inside the shell starts held after its first
two frames and runs when the shell sends `resume`. embed.js holds its
`requestAnimationFrame` callbacks while paused, so every world (they all
drive their loop with requestAnimationFrame and clamp dt) pauses with no code
of its own; `shared/audio.js` suspends its sound. Opened standalone, the
worlds behave as before, and `embed.landmark()` shows a toast.

The shell resumes a world only once every controller button is released, so
the A that began a world, or the Menu that resumed it, never reaches it. A
press both sides see (Menu, View) is counted once.

## Transitions

### The continuous transition (springtail → mite → tardigrade → amoeba → paramecium → bacterium → phage; the pattern for every pair)

The owner (2026-11-01): a landmark "you see and intentionally go into, and
then an indication of success and then a slowdown to freeze frame, and a
direct transition from the existing world scene into the beginning scene of
the next world. It should feel continuous", with the portal "tempting to go
to … maybe it can sparkle or glint … but we shouldn't have text about it",
in the gold of the phage's super-gene, and the same in every world. As it
plays for springtail → mite:

1. **The portal** draws you (`shared/portal.js`, the super-gene gold of
   `../design/super-gene-return.html`): over the raft a glow pool, a fine
   spray of rising sparks with star glints and a 60 mm beacon of light;
   since the narrow macro view has the raft out of frame until you are on
   it, its light also spills in from the edge of the view on its side (a
   warm glow, an anamorphic streak and gold bokeh discs, stronger as you come
   closer; `createPortalLight`). There is no arrow: this light leads you. In view, a halo
   marks it through the depth of field, and the raft is brought into focus as
   you reach it. No text.
2. **Success.** Reaching it, the world posts `landmark {kind: 'forward',
   outro: true}` and keeps running: a golden burst from the raft (a ring
   racing out over the film and a fountain of sparks), a bloom on screen, a
   chime (`shared/portal-chime`), a rumble; the HUD hides
   (`embed.cinematic`).
3. **Slow-down to a freeze frame.** The world's time scale eases from 1 to 0
   over 1 s while it keeps rendering; frozen, it posts `frozen {pose}`: how
   the next world's creature (the mite speck walking on its capitulum) is
   framed on screen.
4. **The camera move.** The next world has been loading since the player came
   within 120 mm of the raft (`near`), hidden behind the world in play, and at
   the latest from the landmark; the freeze holds until it is ready. The shell
   sends it `hold` (frozen at its start, rendering, HUD hidden); it answers
   `opening {pose}`: how its opening view frames its own creature. Then
   (`src/continuous.js`, 3.4 s) one pose eases from the old to the new and is
   sent to both worlds every frame as `camera {pose}`: the springtail's camera
   pushes in on the speck, and the mite world, stacked above it, crossfades in
   (40–68 % of the move) under exactly the same framing, so the mite is where
   the speck was, at the same size and growing at the same rate (size on a log
   scale; position, pitch and azimuth relative to the creature eased
   together). The move ends exactly on the mite world's opening view.
5. **Begin.** The old frame goes, the new world gets `begin` (its time eases
   back in over 0.6 s; the camera is its own again, from where the move left
   it), then its sound and the controls card.

The other wired pairs follow the same steps; what each pushes in on:

- **Mite → tardigrade (a hand-off):** the two are the same size, so the move
  is a change of light more than of scale. A 350 µm tardigrade walks in the
  water film of the leaf axil (the portal). As time slows the mite's camera
  settles on it from the side and height the tardigrade world opens on
  (pitch 1.18 and the same `rel`, its heading turned to match), a little
  wider than there, and the portal's glow dims so the animal reads; the move
  is then a short push (f 0.18 → 0.243) while the DIC world crossfades in
  over the SEM. The tardigrade world settles its view state from each
  `camera` pose, so play carries on from the opening view. Back keeps the zoom.
- **Tardigrade → amoeba (a hand-off):** an *Amoeba proteus* (344 µm, the
  amoeba world's cell at its start) crawls on the pool floor past the rim
  leaf's tip. As time slows the tardigrade's view settles on it from straight
  above (pitch 1.55, the 2D amoeba world's), the amoeba turning the way that
  world's cell faces (`rel` π), a little wider than there, and the sparkle
  dims; the move is a short push (f 0.283 → 0.382) while the brightfield
  world crossfades in over the DIC, the cell where the glimpse was. The amoeba
  world takes each `camera` pose as its view's centre and field.
- **Amoeba → paramecium:** the green *P. bursaria* in the portal's glow is
  the next creature itself. Through the portal it turns up the screen as time
  slows (the paramecium's chase camera sees it from behind), and the amoeba's
  view (2D) narrows and re-centres on it while the darkfield paramecium
  world fades in over the brightfield.
- **Paramecium → bacterium:** a magnetotactic spirillum (3 µm, with a small
  gold glint) swims over the biofilm and comes up to just ahead of whoever
  is down on the leaf. The chase camera dives in on it and turns to look down
  on the film, as the bacterium's microscope does; the portal's glow fades
  over the first ×4 of the dive so its glints do not blow up into the frame.
  The bacterium's phase contrast comes in under the crossfade.
- **Bacterium → phage:** one of the phages landed on the host (0.23 µm, a
  gold glint on the host's wall); the field closes in on it (empty
  magnification below the eyepiece field) and the phage's false-light world
  fades in with your gold phage where the glimpse was. The phage world
  settles its camera on `hold`, so play carries on from the opening view
  without a drift.

A 2D microscope world gives its poses looking straight down (`pitch` 1.55,
just short of vertical) with `rel` = its heading + π/2, so a 3D world turning
to the pose shows the creature at the same angle on screen; a 3D world
measures `pitch` and `yaw` from its camera's own direction. Each world
exposes `__micro.outro()`, `OUTRO.rate` (slow it for tests) and its creatures'
poses (`beaconPose`, `spirillum().pose`, `glimpsePose`, `cellPose`) for the
shell-path checks.

A **pose** frames a creature in a view the same way in every world: `f` (its
length over the view's width at its depth), `x, y` (its centre in normalised
device coordinates), `pitch` (the camera's elevation) and `rel` (the camera's
azimuth round the creature minus the creature's heading). `embed.poseOf()`
measures one from a three.js camera, `embed.poseCamera()` places a camera for
one (a dolly: the field of view is kept).

If anything does not come in time (no `frozen` in 20 s, the next world not
ready in 25 s or not providing `'intro'`, no `opening` in 5 s) the shell
pauses the old world and plays the microscope zoom as before. The settings'
"Microscope zoom" and "Specimen plates" always do. Back (the backdoor) keeps
the zoom out for now.

**Wiring another pair** (world A, the next world B):

- A, at its portal: use `createPortalGlow` and `createPortalLight` from
  `shared/portal.js` (tune size, beacon, intensity; the gold stays); on
  reaching it call `embed.landmark('forward', { outro: embed.active })`,
  burst, bloom, chime (`audio.play('shared/portal-chime')`), rumble,
  `embed.cinematic(true, canvas)`, ease its time to 0 while rendering, then
  `embed.frozen(embed.poseOf(camera, nextCreature.centre, { len, heading,
  pitch, yaw }))`. Then follow `embed.on('camera')`: place the camera with
  `embed.poseCamera(camera, pose, centre, { len, heading })` and render. Post
  `embed.near('forward', on)` from ~a screen or two away so B preloads. The
  springtail's `startOutro` / `stepOutro` / `placePoseCamera` in
  `../prototypes/springtail/main.js` are the reference.
- B: `embed.provide('intro')` before its first frame; on `hold` place its
  opening camera, `embed.cinematic(true, canvas)` and reply
  `embed.opening(embed.poseOf(...))`; while `embed.held`, render without
  stepping, with `embed.poseCamera` for each `camera` pose (and set its rig
  from the result so play carries on from it); on `begin`, cinematic off and
  ease time back in. The mite's `placePoseCamera` and frame loop in
  `../prototypes/mite/main.js` are the reference.
- The creature lengths must be the same creature's: A's speck and B's body
  (the speck 0.36 mm, the mite `2 × max(mite.radii)` µm).
- No shell changes are needed: it takes the continuous path whenever A sends
  `outro: true` and B provides `'intro'`.

### The zoom

`playTransition(from, to, dir)` in `src/transition.js` tries, in order:

1. the zoom prototype's module, `../prototypes/zoom/player.js`
   (`createTransitionPlayer({ container }).play(fromId, toId, { dir })`),
   drawn into the transition layer under the shell's caption and readout (the
   readout follows `player.readout()`);
2. the zoom prototype embedded, `zoom/?embed=1&from=<id>&to=<id>&dir=in|out`,
   if the page declares `embed.provide('transition')`; it plays on `resume`
   and posts `done`;
3. the shell's specimen zoom: the larger field's plate scales on a log scale
   while the next world's plate grows from a brass-rimmed field at the centre,
   with the true field width and an eyepiece-equivalent magnification (180 mm ÷
   field). Mite → tardigrade and tardigrade → amoeba (same body size) are
   hand-offs: the reflected light dims and the transmitted light comes up.

The "Specimen plates" setting goes straight to 3.

## Controls

The shared scheme (`../prototypes/CONTROLS.md`), plus:

| Button | Keyboard | In the shell |
| --- | --- | --- |
| Menu | Esc | Pause and resume |
| View | Tab | The controls card |
| D-pad ↑↓ | 1 / 2 | Passed to the world: zoom in and out |
| Y | R | On the backdoor: rise a world (the world posts the landmark) |
| LS / D-pad | Arrows / WASD | Move through menus |
| A / B | Enter / Esc | Choose / back |

Players 2–4 join by pressing any button on another controller, in the menus
(a toast and a colour chip) or during play (the world's roster reports a
`join`, and the shell toasts it). Instructions show controller glyphs whenever a
controller is connected, and keyboard keys only when none is.

## Checks

```bash
node micro/game/check.mjs
```

Serves `micro/`, opens the game in headless Chromium and walks title → menu →
intro → play (springtail) → controls card → pause → settings → instructions →
resume, renders transition stills, fires a forward landmark
(`__game.forceLandmark('forward')`, the zoom into the mite, whose controls card
must show) and a back landmark (back to the springtail). It fails on any
console or page error and saves a screenshot of each screen to `$SHOTS`.
Also run `node micro/prototypes/check.mjs`, since the shell loads the
prototypes, and `bash micro/publish.sh local/pages/micro`.

## What each world still needs

No world posts landmarks yet. For each world (in its own folder):

- **Landmarks:** place the forward landmark and the backdoor (draw their edge
  arrows with `shared/landmark.js`); call `embed.landmark('forward')` on
  reaching the forward one, `embed.near('back', on)` while dwelling on the
  backdoor and `embed.landmark('back')` on Y there. Mite: Y is its block, so
  the backdoor needs its own rule.
- **Embed polish:** skip the world's own start card (the springtail's "Press A
  to start" panel, the phage's card) when `embed.active`, since the shell's
  intro has already said it; anything timed with `setTimeout` should honour
  `embed.on('pause')`.
- **Players:** restore the shell's roster from `embed.players` (or the
  `players` message) and report joins with `embed.join(index, color)`.

## Known issues

- Fullscreen and sound need a user gesture: a controller button on the title
  is not one for the browser, so with a controller alone fullscreen may be
  refused (play carries on in the window and the Fullscreen button stays).
- Keyboard input goes to whichever frame has focus. During play the world has
  it (Esc and Tab reach the shell as `menu` and `view`); clicking the shell's
  buttons hands focus back to the world.

## Future progression

The [glowing return journey plan](../design/super-gene-return.html) records the proposed Phage clear, reverse journey and fingertip ending, with generated references. Its sequence is not implemented; the current Phage ending offers “Work in progress”, return to menu, or continued Phage play.

The [Phage visual-style plan](../design/phage-visual-style.html) proposes a realistic microscopic false-light treatment with a reasonably large depth of field for both exterior and inside-cell views.
