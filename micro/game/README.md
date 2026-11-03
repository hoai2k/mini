# Micro Zoom

The game built from the Micro prototypes: seven worlds at seven
magnifications, from a water springtail on a bog pool's surface film down to a
bacteriophage beyond the reach of light. Choose any world to start in (the
springtail is the default). In each world the way on is a **golden portal**,
placed as you go after every other encounter (`../design/encounter-pattern.md`)
and guarded by the world's boss: get past the boss, reach it, and the scene
carries on into the next world. Behind the start is an optional **backdoor**:
dwell on it and press Y to zoom back out to the world above.

Published at https://hoai2k.github.io/mini/micro/, public: it has no invite
gate (`../game/shared/boot.js` starts the page directly). Visits are
counted for games.hoai.net/stats/ (the GoatCounter script in `index.html`).

## Structure

| File | What it does |
| --- | --- |
| `index.html` | The screens: title, world select, world intro, play, transition layer, pause, settings, instructions, confirm |
| `src/boot.js` | The invite door, then `main.js` |
| `src/main.js` | The shell: screens, focus and controller navigation, the play frame and its messages, pause, settings, progression, test hooks (`window.__game`) |
| `src/worlds.js` | The seven worlds: card data (field width for the zoom, art ids, tints) and whether there is a way back; their words (magnification, field, body, look, goal, controls, field notes) come from `worlds.<id>` in `../text_config.js` (see "Editing the game's text") |
| `src/transition.js` | `playTransition(from, to, dir) → Promise`: the zoom between worlds (see below) |
| `src/continuous.js` | `playContinuous(…)`: the continuous transition's camera move and crossfade between two live worlds (see below) |
| `src/bus.js` | Messages to and from the world frames |
| `src/input.js` | Menu input: every controller (any joined player drives the menus), keyboard, repeat timing, held-button locking |
| `src/players.js` | The local players (up to four), through `../game/shared/players.js`; a stub with the same surface stands in if it is missing |
| `src/glyphs.js` | Button glyphs: Xbox buttons whenever a controller is connected, keyboard keys only when none is |
| `src/sound.js` | The shell's own synthesised sounds, the menu music and the master switch and volume (sent to the worlds) |
| `music/` | The menu songs: `clockwork-chamber-music.mp3` (title) and `clockwork-lullaby.mp3` (world select and intros) |
| `src/title-bg.js` | The title's moving background: an endless zoom through the worlds' plates, nested as objective fields |
| `src/art.js` | Delivered images from `../image-requests.md`, with drawn stand-ins |
| `src/style.css` | Ivory paper, brass rules and vernier ticks, ink green and oxblood; Cormorant Garamond and DM Sans (Google Fonts, with Georgia and system fallbacks) |
| `icons/`, `manifest.webmanifest` | The app icon (MP-G06) at 512, 192, 180 and 32 px |
| `check.mjs` | The headless check of the shell |
| `check-worlds.mjs` | The headless check of each world's own page, the zoom player and the prototype browser |
| `springtail/` … `phage/`, `zoom/` | The worlds and the zoom player, each with its own README |
| `shared/` | Modules the worlds and the shell share (input, HUD, sound, text lookup, embed protocol, techniques) |
| `assets/` | Delivered art and sound, listed in `shared/asset-list.js` and `shared/audio-list.js` |

Everything the game runs is under `micro/game/`: the shell in `src/`, the
world pages (`springtail/` … `phage/`), `zoom/`, `shared/`, `assets/` and
`music/`, all siblings, so the shell reaches a world at `../<world>/` and the
shared modules at `../shared/` from `src/`. The player-facing text is one
level up, in `micro/text_config.js`. `../publish.sh` mirrors that layout into
`<site>/micro/` (`game/` to `<site>/micro/game/`, `text_config.js` beside
it), so every relative path holds; only `index.html` moves, to the root of
`<site>/micro/`, with its `src/` references rewritten to `game/src/`.

## Screens

- **Title.** The MP-G01 logo over a continuous nested photographic zoom:
  springtail → mite → tardigrade → amoeba → paramecium → bacterium → normal
  Phage → water → the identical opening bog scene. Eight dedicated plates
  form an 80-second cycle, with a fivefold zoom per step and soft compositing.
  The Phage uses the updated realistic false-light environment without glow.
  All images decode before the first scene appears; reduced motion holds a
  composed frame. [Plates and loop design](../design/title-zoom.html).
  "Press Start" pulses. A or Start on a controller, Enter, Space, P or a
  click on Press Start goes to the menu, asks for fullscreen and turns the
  sound on. Any other controller button or key, and a click anywhere else on
  the title, only starts the title music (and the sound switch still applies). Moving
  the left stick enters the corner buttons (Instructions, Settings, Sound,
  Fullscreen).
- **World select.** One card per world (MP-U01–U07 in the MP-G04 brass
  frame), carousel-style with depth, over the menu background (MP-G03, or a
  dark green bench with an engraved grid). Each card shows the magnification,
  field width, body size, look, a line about the world and whether it has
  been visited. A brass log-scale rule along the bottom marks each world's
  field, with a cursor on the focused one. Every world can be chosen.
- **Intro.** Choosing a card opens the world's intro. When the card and the
  intro plate are different pictures (every delivered world today), the
  paper panel slides in from the left and the plate from the right while the
  tray fades out underneath; a plate not decoded yet shows its spinner and
  slides in when it arrives. Only a world whose card and plate are the same
  image zooms the card to fill the screen. Going back slides the panel out to
  the left and the plate out to the right, then the tray fades in on the same
  card (reduced motion: plain fades). The intro holds the plate (MP-G07–G13), the data, a
  one-line goal ("Reach the glowing portal, and avoid getting eaten by …",
  naming the world's main threats in plain names), then the controls and the
  field notes side by side. "Press A to begin". Player-facing text is in plain
  game terms (the owner, 2026-11-02): control labels are 1–5 words ("Move",
  "Dash", "Attack / eat", "Block (hold)", "Enter portal"), and the intro
  leaves out the board's obstacles and landmarks; each world's README has
  the detail. Pending artwork shows a spinner rather than a temporary image.
  The selected world loads behind the intro at full viewport size, paused
  and without sound or input. Begin reuses that frame: the panel slides off
  to the left and the plate to the right (as going back does) over a dark
  backdrop while the world, held on its first frames, fades in underneath,
  and it starts once the reveal ends (reduced motion: a crossfade). A world
  still loading is revealed as its loading veil ("Preparing the slide…"),
  which fades into the world when it is ready. Input is ignored during the
  reveal, and the world only runs once the Begin press is released. Going
  back to the tray discards the preload.
- **Play.** The world in an iframe (`../<world>/?embed=1`, i.e. `micro/game/<world>/`), a brass
  plaque (bottom right) with the world and its magnification, a controls-card
  button and a pause button. The controls card is the shell's own (in the
  game's style, filled with the world's live control rows from its HUD).
  Prototype diagnostic stats stay hidden in the game; standalone prototypes
  keep their readouts.
  It shows for 8 s at the start of every world after the first (a setting),
  and View or the button toggles it. At the backdoor a prompt shows when the
  world reports the player there (`near`, "Y · Rise to …"), in the same
  gold-edged pill at the top centre of the screen as the portal's. The way on has no
  prompt or text: the portal itself (its golden light, `shared/portal.js`)
  says "go there"; a world's `near {kind: 'forward'}` only starts the next
  world loading.
- **Pause.** Menu/Start (on any controller), the world's `menu` message, the
  window losing focus, the tab hiding, or a controller disconnecting. The
  world stops (its frames and its sound). The pause menu (Resume,
  Instructions, Settings, Restart world, Choose world, Title) has the
  bottom-right buttons for settings, sound and fullscreen. Leaving or
  restarting asks first. The pause veil blurs only the scene: an open
  controls card is raised above it (`z-index` 26 while `#pause` is shown) and
  stays sharp and readable beside the menu; a dialog opened from the menu
  (settings, instructions) still covers it.
- **Settings.** Sound on/off and volume, Invert camera Y (the shared
  `micro.invertY`), Portal arrow, fullscreen, and in play "World features"
  (the world's own feature panel, for development). The controls card always
  shows at the start of each world and transitions are always continuous (the
  owner removed those two settings; the microscope zoom remains only as the
  fallback when a pair can't do the continuous move).
- **Starting direction.** The way on is not fixed in advance: every
  direction leads to a portal, placed out of sight once you have met every
  other encounter, and there is no arrow (`shared/landmark.js` draws only the
  backdoor's ring). Orbit views use a starting camera angle.
- **Progression.** A forward landmark plays the transition in (every pair
  from the springtail to the phage: the continuous transition; the microscope
  zoom if a world cannot answer in time) and the next world
  takes over; a back landmark plays the zoom out to the previous one. The furthest
  world reached and the worlds visited are kept in localStorage.

## The embed protocol

Documented in full in `../game/shared/embed.js`. In short:

- World → shell: `ready` (sent by embed.js after the first frames), `hud`
  (the controls rows, sent by `shared/hud.js`), `landmark {kind:
  'forward'|'back', outro?}`, `frozen {pose, move?}`, `opening {pose}`, `near {kind, on, label?}`, `menu` (sent by
  `shared/features.js` on Menu), `view` (sent by `shared/hud.js` on View),
  `join {index, color}`, `features {open}`, optional `captured`, `died`,
  `progress`; the zoom player's `done`.
- Shell → world: `pause`, `resume`, `sound {on, volume}`, `controls {show,
  autoHide}`, `settings {invertY}`, `features {open}`, `players {roster}`,
  `hold`, `camera {pose, u, alpha}`, `begin` (the continuous transition, below).

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
   together). The move ends exactly on the mite world's opening view. Each
   `camera` message also carries the move's progress `u` and the new world's
   opacity `alpha`; an old world may ask for a longer move, a later
   crossfade or a later halo with `frozen {pose, move: {duration, fade, halo}}`
   (`continuous.js` `moveOf`; the Paramecium's dive does).
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
- **Paramecium → bacterium (the dive):** a magnetotactic spirillum (3 µm,
  with a small gold glint) swims over the biofilm and comes up to just ahead
  of whoever is down on the leaf; at the freeze it is a speck you need not
  see. The owner (2026-11-01): "if the light changes first then you see a
  dark mass and as you zoom in it becomes apparent that it's a bunch of
  bacteria and you zoom in to that one". The Paramecium asks for a longer
  move (`frozen {move}`: 5.2 s, the crossfade at 50–78 %, the gold halo only
  from 50 %) and stages it from each `camera` message's `u`: (1) as the
  chase camera starts its push and turns to look down on the film, the light
  turns from darkfield to the bacterium's phase contrast (3–30 % of the
  move; the portal's sparks and the leaf's lawn of rods fade with it);
  (2) the spirillum's own clump (`shared/kin-clump.js`, which came in under
  the slow-down: ~150 kin spirilla, rods and cocci in absorbing slime,
  about 40 µm across) shows as a dark mass; (3) the push resolves it into
  separate bacteria as the slime thins (36–60 %), and the bacterium world
  crossfades in, its opening field laid out round your cell from the same
  layout (its own meadow kin, prey rods and attached biofilm cells, moved, not
  added), so every cell lands where it was (measured: the kin within 0.002
  of each other on screen through the crossfade); (4) the halo comes in on
  the one cell, yours, and the move settles on the opening view.
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
pauses the old world and plays the microscope zoom as before. Back (the backdoor) keeps
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
  `../game/springtail/main.js` are the reference.
- B: `embed.provide('intro')` before its first frame; on `hold` place its
  opening camera, `embed.cinematic(true, canvas)` and reply
  `embed.opening(embed.poseOf(...))`; while `embed.held`, render without
  stepping, with `embed.poseCamera` for each `camera` pose (and set its rig
  from the result so play carries on from it); on `begin`, cinematic off and
  ease time back in. The mite's `placePoseCamera` and frame loop in
  `../game/mite/main.js` are the reference.
- The creature lengths must be the same creature's: A's speck and B's body
  (the speck 0.36 mm, the mite `2 × max(mite.radii)` µm).
- No shell changes are needed: it takes the continuous path whenever A sends
  `outro: true` and B provides `'intro'`.

#### Entering a portal (Y)

A portal is never an automatic door (the owner, 2026-11-01). While a player
is in a portal's area and its boss isn't guarding it, the world sends
`embed.near('portal', true)` (and `false` when they leave or the boss returns);
the shell shows "Y Enter the portal" in a large gold-edged pill at the top
centre of the screen (clear of the plaque, above the HUD; it pops in with a
glow that then breathes gently, and toasts drop below it while it is up). Pressing Y there calls the world's
`enterPortal(P)`, which starts the outro. A world opened on its own shows the
same prompt itself (`shared/embed.js`). `near('forward')` stays a quiet
"nearing the way on" signal that only preloads the next world.


## The zoom

`playTransition(from, to, dir)` in `src/transition.js` tries, in order:

1. the zoom prototype's module, `../game/zoom/player.js`
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
| Y | R | Enter the portal; on the way back: go up a world (the world posts the landmark) |
| LS / D-pad | Arrows / WASD | Move through menus |
| A / B | Enter / Esc | Choose / back |

Players 2–4 join by pressing any button on another controller, in the menus
(a toast and a colour chip) or during play (the world's roster reports a
`join`, and the shell toasts it). Instructions show controller glyphs whenever a
controller is connected, and keyboard keys only when none is.

## Editing the game's text

Every word a player sees, in the shell and in the seven worlds (menus,
buttons, the intro's goal, controls and field notes, HUD lines, toasts,
warnings, prompts, end cards, the features panels and their choices,
aria-labels), is in one file:
[`../text_config.js`](../text_config.js) (at the top of `micro/`).
It exports `TEXT`, a nested object with readable keys: `shell.*` (title,
menu, intro, play, pause, settings, instructions, credits, toasts),
`worlds.<id>.*` (each world's card and intro: name, look, magnification,
line, goal, `controls` rows, `facts`), `shared.*` (the help panel, the
features panel, players, being eaten) and one block per world
(`springtail.*` … `phage.*`: `hud`, `toasts`, `banner`/`warn`, `capture`,
`features.<id>.label/about/choices`, …), then `prototypes`, `zoom` and
`split-demo` for the prototype browser.

- Edit the words between the quotes; keep the keys. `{name}`-style
  placeholders are filled by the game and `{btn:A}` draws a button glyph
  (or its key when no controller is connected); move them freely within a
  sentence. Simple markup (`<b>`, `<i>`, `<br>`) shows as markup where the
  string already had it.
- Code reads it through `shared/text.js`: `t('shell.pause.resume')`
  for a string (with `t(key, { n: 2 })` for placeholders), `tx(key)` for an
  array or object, and `fillText()` for the `data-t`, `data-t-html`,
  `data-t-aria` and `data-t-title` attributes in `index.html`. A missing key
  shows the key itself and warns once in the console. Feature panels find
  `<world>.features.<id>` by the feature's id.
- Another language: copy `TEXT` with the same keys, translate the strings
  (anything left out falls back to English) and call `setLocale(table)` from
  `text.js` before the page builds its text.
- Left in code on purpose: the developer stats line (`hud.stats`, hidden in
  the game), console messages, number and unit formatting (`mm`, `µm`, `nm`,
  `×`), button and key names (A, LS, Space, WASD), Latin species names used
  as data (the amoeba's prey), the zoom prototype's transition data and
  status line (`../game/zoom/chain.js`, a developer page), and the
  page `<title>`/description meta in `index.html` (read without scripts).

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
Also run `node micro/game/check-worlds.mjs`, which opens every world's own
page and the prototype browser, and `bash micro/publish.sh local/pages/micro`.

## What each world still needs

Every world posts its landmarks (the portal and, below the springtail, the
backdoor), skips its own start card inside the shell and restores the shell's
roster. Back (the backdoor) still plays the microscope zoom rather than a
continuous transition, and the phage's portal (the gold receptor), the end of
the chain, leads to "Work in progress" for now.

## Known issues

- **Music.** The title plays "Clockwork Chamber Music"; world select and the
  intros play "Clockwork Lullaby"; the worlds have no music, only their own
  ambience. Songs crossfade on a screen change, loop, keep their place when
  left and resumed, and play through the master switch and volume at about
  -24 LUFS. A song that fails to load falls back to the old synthesised drone.
  The title tries its song on load (some browsers allow that for a site the
  visitor knows); otherwise any press that doesn't start the game, a stick
  move, or a click away from Press Start starts it.
- Fullscreen and sound need a user gesture: a controller button on the title
  is not one for the browser, so with a controller alone fullscreen may be
  refused (play carries on in the window and the Fullscreen button stays).
- Keyboard input goes to whichever frame has focus. During play the world has
  it (Esc and Tab reach the shell as `menu` and `view`); clicking the shell's
  buttons hands focus back to the world.

## Future progression

The [glowing return journey plan](../design/super-gene-return.html) records the proposed Phage clear, reverse journey and fingertip ending, with generated references. Its sequence is not implemented; the current Phage ending offers “Work in progress”, return to menu, or continued Phage play.

The [Phage visual-style plan](../design/phage-visual-style.html) proposes a realistic microscopic false-light treatment with a reasonably large depth of field for both exterior and inside-cell views.
