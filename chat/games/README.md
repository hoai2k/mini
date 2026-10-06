# Minigames

Each minigame is one ES module in this folder that default-exports a plain
object. `index.js` lists them in picker order and loads each on its own, so a
broken game drops out of the picker instead of breaking the app.

Anyone in the chat can start a game from the Games tray. That creates a
**session**; everyone else sees it with a Join button. The game host
(`../js/gamehost.js`) keeps each player's game state in their presence on the
relay and passes game messages between the session's members.

## The game object

```js
export default {
  id: 'connect4',            // same as the file name and the id in index.js
  name: 'Connect Four',
  emoji: '🔴',               // picker icon until the icon art (game-<id>) arrives
  blurb: 'Drop discs, get four in a row.',   // one line in the picker
  minPlayers: 2,             // shown in the picker; 1 means it can be played alone
  maxPlayers: 2,             // extra people who join watch
  needsFace: false,          // true: the studio tracks my face every frame
  create(api) {
    // build the UI inside api.el, start timers...
    return {
      destroy() {},                    // remove listeners, stop timers/animation
      onMessage(type, data, fromId) {},// optional: any game message
      onChange() {},                   // optional: players or their states changed
      onPad(pad) {},                   // optional: controller state every frame
    };
  },
};
```

`create` runs when I start or join a session. It must build everything inside
`api.el` (an absolutely positioned box filling the game panel; size the canvas
from it and handle resizes with a `ResizeObserver`). `destroy` runs when I
leave the game, so stop every `requestAnimationFrame`, timer and listener.

## The api

| Member | Meaning |
| --- | --- |
| `el` | the game's root element |
| `me` | `{ id, name, color }` |
| `players()` | session members, me included, in join order: `[{ id, name, color, since, state, shared, me }]` |
| `owner()`, `isOwner()` | the first member; they own the shared state. Ownership moves to the next member if they leave |
| `state()`, `setState(patch)` | my own state for this game, merged and published to everyone (keep it small: numbers, short strings) |
| `shared()`, `setShared(value)` | the shared game state (board, turn, round, scores…). Only the owner should call `setShared`; everyone reads `shared()` |
| `send(type, data)`, `sendTo(id, type, data)` | one-off messages to the session (moves, shots, taps) |
| `on(type, cb)` | subscribe to a message type; `cb(data, fromId)` |
| `store.get(key, fallback)`, `store.set(key, value)` | this game's localStorage on this device (records, totals) |
| `face()` | my tracked face (see `../effects/README.md`) or `null` |
| `selfCanvas` | my live video canvas, effects included (for drawing my face into a game) |
| `mediaOf(id)` | another player's `<video>` (or my canvas for my id), for drawing faces into the game |
| `img(name)` | delivered artwork by asset name, or `null` until it arrives |
| `sfx(name)` | `pop blow whoosh click score miss bounce win lose tick join leave zap fire bang flap honk` |
| `toast(text)` | a short message at the bottom of the screen |
| `exit()` | leave the game |

## Patterns

- **Turn-based games** (Connect Four, Memory Match): the owner holds the
  whole game in `setShared(...)`. Other players send their move with
  `send('move', ...)`; the owner checks it is legal, applies it and publishes
  the new shared state. Everyone draws from `shared()` in `onChange`. The
  first two members (or however many the game takes) play; later joiners
  watch and can take a seat when one frees up.
- **Real-time games** (Air Hockey): the owner simulates the shared objects
  (the puck) and publishes them in shared state about 20 times a second;
  each player publishes their own paddle in `setState`. Draw others smoothly
  by easing toward the latest value.
- **Score attack** (Hoops, Flappy Face): everyone plays their own copy.
  Publish your score in `setState`, broadcast your actions so friends' ghosts
  can be drawn, and keep personal records in `store`.
- **Rounds with a referee** (Quick Draw, Staring Contest, Copy Cat): the
  owner runs the round clock in shared state (`phase`, `startAt` timestamps)
  and decides winners from what players send.
- Presence is the only thing a newcomer gets on joining (messages are not
  replayed), so anything a joiner needs to draw the game must be in shared
  state or player state, not only in messages.
- Messages and state from other players are untrusted input: validate types
  and ranges, and never put their text into `innerHTML` (use `textContent`).

## Look and controls

Use the app's look (`../styles.css`: dark purple panels, pink `--pink`, aqua
`--aqua`, sun `--sun`, rounded font) and the shared classes `.g-center`,
`.g-big`, `.g-row`, `.g-canvas`, `.g-hud`, `.btn`, `.btn.aqua`, `.btn.ghost`.
Every game works with pointer/touch and keyboard, and with a controller via
`onPad(pad)`: `pad.x`/`pad.y` left stick (−1..1), `pad.a`, `pad.b`, `pad.xBtn`,
`pad.yBtn` (true on the frame the button went down), `pad.pressed[i]` held
buttons, `pad.up/down/left/right` D-pad held, `pad.rt`/`pad.lt` triggers
0..1. B leaves the game, so don't use it. When `onPad` is missing, the
controller moves focus between the game's buttons instead.

## Trying a game

`../test/game.html?game=<id>&n=2` runs a session with `n` simulated players
side by side in one page, connected through an in-memory relay, so you can
play every seat. `node chat/test/game-check.mjs <id>` opens it in headless
Chromium, checks it starts without errors on every seat, and screenshots it
into `local/chat-shots/`.
