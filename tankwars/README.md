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
| `game/menu.js` | Menus, lobby, settings and pause, with keyboard and controller navigation |
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

- `node --check tankwars/game/game.js && node --check tankwars/game/menu.js`
- `cd multiplayer/server && npm test` (the relay the online mode uses)
- In a browser: Play Local spawns CPU tanks; in two tabs, Host Online Game in
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
Instructions/Settings/Fullscreen icons, an Instructions screen with a
controller diagram, or saved settings.
