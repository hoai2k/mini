# Gliders

A Superflight-style gliding game for one to four players on one screen. Pick a
glider (flying squirrel, Microraptor, flying fish, Draco lizard, Wallace's
flying frog or paradise tree snake) and dive through skies of colourful
floating block structures. Flying close to the blocks fills your combo, tricks
raise the multiplier, and clearing everything for two seconds banks it. Crash
first and the combo is lost. Everyone flies the same sky at once, each in their
own split-screen view, and the highest score when the clock runs out wins.

Play it at https://hoai2k.github.io/mini/gliders/.

- [`design/design.md`](design/design.md): the rules, scoring, flight model,
  sky generator, gliders and controls.
- [`design/image-requests.md`](design/image-requests.md): the image requests
  (logo, title background, icon, glider portraits), generated from
  [`design/source/build_requests.py`](design/source/build_requests.py), which
  also writes `game/src/asset-list.js`. Edit the data there and rerun it.
  Generated images go in [`intake/`](intake/README.md).
- [`game/`](game/): the game, static ES modules with no build step. Three.js
  r186 is vendored as `game/vendor/three.module.min.js` (MIT, licence beside it).

| File | What it is |
| --- | --- |
| `game/src/main.js` | Screens, menus and navigation, lobby, level select, split-screen play, HUD, results |
| `game/src/levels.js` | Seeded world generator: voxel rock islands, materials, styles, palettes, updrafts, portals; the twelve named skies, Daily and Random |
| `game/src/world.js` | Collision and proximity: oriented boxes in a grid, distance and ray queries |
| `game/src/flight.js` | The flight model |
| `game/src/scoring.js` | Combo, tricks, multiplier, banking and crashes; the two modes |
| `game/src/scene.js` | Rendering: block shader, sky, clouds, contrails, speed streaks, shadow, crash burst, split layout |
| `game/src/creatures.js` | The six procedural gliders and their animation |
| `game/src/input.js` | Controllers (up to four) and the two keyboard sides |
| `game/src/audio.js` | Layered recorded wind (by speed and proximity), whooshes, crash; synthesised chimes and music |
| `game/src/store.js` | Saved settings and best scores |
| `game/tools/world.html` | Dev viewer for a world: one frame from `?level=` or `?seed=`, `?view=` overview, launch or close; not published |
| `game/tools/creatures.html` | Dev viewer for the gliders (`?only=`, `?variant=`, `?pose=`, `?view=`); not published |

## Controls

| Action | Controller | Keyboard, WASD side | Keyboard, arrows side |
| --- | --- | --- | --- |
| Nose down / up | Left stick ▲ ▼ (pull back: nose up) or D-pad | W / S | ↑ / ↓ |
| Roll | Left stick ◀ ▶ or D-pad | A / D | ← / → |
| Tuck and dive | RT or A | Space | Right Shift or / |
| Flare and brake | LT or X | Left Shift or C | Right Ctrl or ' |
| Rudder | LB · RB, right stick | Q / E | , / . |
| Pause | Menu or View | Esc or P | Esc or P |

On a phone or tablet one player flies by touch: tap Press Start (or a free slot
on the glider screen), then drag on the left half of the screen to steer (down
pulls the nose up), hold Tuck or Flare on the right, and tap ⏸ to pause.

On the glider screen each player joins with A (or Space / Enter), then ◀ ▶
glider, ▲ ▼ colours, Y (F / \ on keyboards) inverts pitch, A ready, B back.

## Invite gate

Gliders is in the library's prototype archive, so it sits behind the shared
invite gate (`game/src/gate/gate.js`, a byte-identical copy of the one in the
`hoai2k.github.io` repository): `src/boot.js` opens the door, then imports
`main.js`. It passes `ignorePublicAccess: true`, so the owner's public-access
switch for the finished games does not open it; only an invite pass does. The
door is off on localhost (add `?gatetest=1` to see it).

## Run and check

```sh
cd gliders/game
python3 -m http.server 8124        # then open http://localhost:8124/
node --test test/*.test.mjs        # levels, collision, flight, scoring, gliders
node scripts/browser-check.mjs     # in Chromium: title → lobby (4 simulated controllers)
                                   # → level select → play → pause → results; keyboard round;
                                   # touch round on a phone-sized screen, blur pauses and mutes
python3 ../design/source/build_requests.py --check
python3 ../design/source/build_audio.py --check
```

The sound effects (wind loops, whooshes, crash) are generated with ElevenLabs
by `design/source/build_audio.py` into `game/assets/audio/`; see
[`design/sound-effects.md`](design/sound-effects.md). It needs ffmpeg and a key
in `ELEVENLABS_API_KEY` (never committed); `--force <id>` remakes one.

`publish.sh` copies the game into the Pages output (`local/pages/gliders`).
The browser check simulates Xbox controllers by replacing
`navigator.getGamepads`; it runs with `?dt=0.05` so the slow software
renderer still advances the clock. Testing with real Xbox controllers is
still outstanding.
