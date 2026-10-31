# Micro Zoom

The game built from the Micro prototypes: seven worlds at seven
magnifications, from a water springtail on a bog pool's surface film down to a
bacteriophage beyond the reach of light. Choose any world to start in (the
springtail is the default). Each world has a **forward landmark** in the
direction of play. Reach it and the microscope zooms into the next world. In
the opposite direction is an optional **backdoor**: dwell on it and press Y to
zoom back out to the world above.

Published at https://hoai2k.github.io/mini/micro/ in the prototype archive,
behind the invite gate (`public-access.json` beside `index.html`, opened
through `../prototypes/shared/boot.js`). The gate is off on localhost.

## Structure

| File | What it does |
| --- | --- |
| `index.html` | The screens: title, world select, world intro, play, transition layer, pause, settings, instructions, confirm |
| `src/boot.js` | The invite door, then `main.js` |
| `src/main.js` | The shell: screens, focus and controller navigation, the play frame and its messages, pause, settings, progression, test hooks (`window.__game`) |
| `src/worlds.js` | The seven worlds: card data (magnification, field, body, look), goal, landmarks, controls, field notes |
| `src/transition.js` | `playTransition(from, to, dir) → Promise`: the zoom between worlds (see below) |
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

- **Title.** The MP-G01 logo over the MP-G02 key art (until it is delivered,
  a slow zoom through the worlds' plates, each a brass-rimmed field nested in
  the last). "Press Start" pulses. Any controller button, Enter, Space or a
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
  and View or the button toggles it. A prompt shows when the world reports the
  player at a landmark (`near`).
- **Pause.** Menu/Start (on any controller), the world's `menu` message, the
  window losing focus, the tab hiding, or a controller disconnecting. The
  world stops (its frames and its sound). The pause menu (Resume,
  Instructions, Settings, Restart world, Choose world, Title) has the
  bottom-right buttons for settings, sound and fullscreen. Leaving or
  restarting asks first.
- **Settings.** Sound on/off and volume, Invert camera Y (the shared
  `micro.invertY`), the controls card at the start of each world, the
  transition style (microscope zoom or specimen plates), fullscreen, and in
  play "World features" (the world's own feature panel, for development).
- **Progression.** A forward landmark plays the zoom in and loads the next
  world; a back landmark plays the zoom out to the previous one. The furthest
  world reached and the worlds visited are kept in localStorage.

## The embed protocol

Documented in full in `../prototypes/shared/embed.js`. In short:

- World → shell: `ready` (sent by embed.js after the first frames), `hud`
  (the controls rows, sent by `shared/hud.js`), `landmark {kind:
  'forward'|'back'}`, `near {kind, on, label?}`, `menu` (sent by
  `shared/features.js` on Menu), `view` (sent by `shared/hud.js` on View),
  `join {index, color}`, `features {open}`, optional `captured`, `died`,
  `progress`; the zoom player's `done`.
- Shell → world: `pause`, `resume`, `sound {on, volume}`, `controls {show,
  autoHide}`, `settings {invertY}`, `features {open}`, `players {roster}`.

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
