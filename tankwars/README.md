# Tank Wars

Top-down tank battles against CPU tanks, either on one screen (keyboard and
mouse plus up to four controllers, or touch on phones) or online with up to
eight players. Play it at https://hoai2k.github.io/mini/tankwars/.

The game came from https://www.hoai.net/games/tankwars/, where online play ran
on InstantDB. In this repository it uses the shared mini-rooms relay instead
(see [`../MULTIPLAYER.md`](../MULTIPLAYER.md)).

## Files

| Path | What it is |
| --- | --- |
| `game/index.html`, `game/styles.css` | Page and styles |
| `game/menu.js` | Menus, lobby, settings and pause, with keyboard and controller navigation; the master sound switch |
| `game/sound.js` | Arcade sound effects and sparse music, synthesised with Web Audio (no audio files) |
| `game/game.js` | The game: map, tanks, AI, bullets, power-ups, rendering and online sync |
| `publish.sh` | Copies the game plus `multiplayer/client/mini-rooms.js` into the Pages output |
| `intake/` | Drop box for files to integrate |

## Running it locally

The page loads `mini-rooms.js`, which `publish.sh` copies in, so serve the
published copy rather than `game/`:

```sh
tankwars/publish.sh local/pages/tankwars
python3 -m http.server 8000 --directory local/pages
```

Open http://localhost:8000/tankwars/. For online play, also run the relay
(`cd multiplayer/server && npx wrangler dev`). Pages on localhost use it
automatically.

## Checks

- `node --check tankwars/game/game.js && node --check tankwars/game/menu.js && node --check tankwars/game/sound.js`
- `cd multiplayer/server && npm test` (the relay the online mode uses)
- In a browser: Play Local spawns CPU tanks; the Settings, Sound and Fullscreen
  buttons in the bottom right corner hide during play and show on hover, on a
  click and in the pause menu, and a controller or the
  arrow keys reach them by moving down past a menu's last item; in two tabs, Host Online Game in
  one and join it from the other's lobby, then confirm both see each other's
  tanks and shots, and that the guest returns to the lobby when the host exits.

## How online play works

The host's browser runs the match: it generates the map, owns the CPU tanks
and spawns power-ups. Every player publishes their own tanks as presence
(about 20 times a second), and one-off events go out as topics:

| Topic | Sent by | Meaning |
| --- | --- | --- |
| `map_sync` | host | Map, warps, settings and current power-ups; sent when someone joins and each round |
| `fire` | anyone | A shot, so others can draw and collide it |
| `powerup_spawn` | host | A new power-up on the map |
| `powerup_pickup` | whoever collected it | Removes it everywhere and applies it to the picker |
| `remote_pause` | host | Pauses or resumes everyone |

When the host leaves, the room closes and guests are sent back to the lobby.

## Known gaps

Tank Wars predates [`GAME_GUIDELINES.md`](../GAME_GUIDELINES.md). It does not
yet have the generated title logo, the Press Start title screen with the
Instructions icon, an Instructions screen with a controller diagram, or saved
settings.

## Corner buttons

Settings, Sound and Fullscreen sit in the bottom right corner over the menus
and the game. During play they are hidden until the mouse hovers over them,
or a click (or a tap away from the joysticks) shows them for three seconds.
Clicks don't show them while a keyboard-and-mouse player is in the game,
since that player's clicks are shots; then only hovering or a menu does;
they show whenever a menu is up, such as the pause menu. On phones they sit
above the right stick.
Settings is not in the menus. Opening it during a local match pauses first, so
Back returns to the pause menu, or restarts the round if a setting changed; in
an online game the button is hidden because the host's settings apply.

## Sound

`sound.js` synthesises everything with Web Audio in the manner of an early-80s
arcade board: square, pulse and buzzy tones with pitch sweeps, and stepped
noise for explosions. Effects are panned by where they happen, and other
players' and CPU tanks' sounds are quieter than this screen's own.

- **Shots** are voiced by the shooter's power-ups (spray, side shot, big, fast,
  rapid, ricochet, distance and bomb each change the shot).
- **Each of the 14 power-ups has its own pickup sound**, and a chime marks a
  power-up appearing.
- Hits, shield absorbs, kinetic reflections, ricochet bounces, wall hits, bomb
  blasts, CPU explosions, a player's death and last life, respawns, EMP stuns,
  players joining (a coin drop), round start, round cleared and round failed.
- Menu moves, selections, back, pause and resume.
- **Music** is sparse: a pulsing bass line with a short high phrase every few
  bars during play, quickening as the CPU tanks fall, and a slower, quieter
  loop in the menus. It stops while paused and on the round-over screen.

Everything goes through `TankWarsSound.audible()` in `menu.js`: nothing plays
while muted (saved as `tankwars.muted`), while the tab is hidden or while the
window is unfocused. Browsers start audio only after a click, tap or key press.
