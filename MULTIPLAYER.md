# Online multiplayer (mini-rooms)

Games in this repository get online play from **mini-rooms**, a small relay
we run on Cloudflare. GitHub Pages serves only static files, so the relay runs
separately as a Cloudflare Worker, and games connect to it with WebSockets.
Tank Wars (`tankwars/`) is the reference implementation.

| Piece | Path | Where it runs |
| --- | --- | --- |
| Relay server | `multiplayer/server/` | https://mini-rooms.hoai2k.workers.dev (Cloudflare Workers + Durable Objects) |
| Browser client | `multiplayer/client/mini-rooms.js` | Copied into each game's published folder |

Hand this document to an agent adding online play to a game. It covers the
model, the client API, how to wire a game up, and how to run, test and deploy.

## The model

The relay passes messages between players and keeps nothing important. All
game rules run in the browsers.

- A **game** is a short name such as `tankwars`. Each game has its own lobby.
- A **room** is one match. One player **hosts** it, which creates it and lists
  it in the lobby. Others **join** it by ID. A room holds up to 16 players
  (the host chooses the limit, default 8).
- **Presence** is each player's current state (positions, health, and so on).
  Each player publishes their own. Everyone else sees the latest value for each
  player. It replaces, it doesn't accumulate, so send the whole current state
  each time.
- **Topics** are one-off events (a shot, a pickup, a pause) broadcast to
  everyone else in the room.
- **The host is authoritative.** The relay doesn't simulate anything, so pick
  one browser, the host, to own shared things: the map, the AI, spawns, round
  flow and settings. Guests own only their own players. When the host leaves,
  the room closes and every guest is told `host_left`.
- **The lobby** lists open rooms for a game: title, player count and capacity.
  It updates when players come and go. A room vanishes from it when its host
  leaves or when nobody is connected.

There are no accounts, no stored game state and no anti-cheat. That suits
party games among friends. Don't use it for anything that needs secrets or
fair competitive play.

Two guards limit abuse. The relay only accepts browsers on the sites listed
in `ALLOWED_ORIGINS` in `multiplayer/server/wrangler.jsonc` (currently
`games.hoai.net`, `hoai2k.github.io` and `hoai.net`) plus localhost. **If a
game is served from a new domain, add it there and redeploy**, or that page
can't connect. A client that sends more than 300 messages in 2 seconds is
disconnected. That's far above normal play, but don't send one message per
particle or per frame per object: batch them into one message.

## Client API

Load the client before your game script. The global is `MiniRooms`.

```html
<script src="mini-rooms.js"></script>
<script src="game.js"></script>
```

```js
const net = MiniRooms.connect('mygame');     // the game name: letters, digits, - and _

// Lobby
const stop = net.watchRooms(({ rooms, error }) => {
  // rooms: [{ id, title, count, capacity, updated }], newest first; polled every 3 s
});
stop();                                      // stop polling when the lobby closes
const rooms = await net.listRooms();         // or fetch once

// Hosting and joining (both return a room handle immediately; it connects in the background)
const room = net.host(net.newRoomId(), { title: "Ana's Game", name: 'Ana', capacity: 8 });
const room = net.join(roomId, { name: 'Bo' });

// Presence: my state, sent at most every 50 ms (the latest value wins)
room.publishPresence({ x, y, hp });
room.subscribePresence(({ peers }) => {
  // peers: { [peerId]: presenceData }, everyone except me.
  // A player who just joined appears with {} until their first publish.
});

// Topics: one-off events to everyone else (never echoed back to the sender)
room.publishTopic('fire', { x, y, angle });
room.subscribeTopic('fire', (data, fromPeerId) => { ... });

// Lifecycle
room.peerId;     // my ID in this room (null until connected)
room.isHost;     // true for the host
room.ready;      // true once connected
room.onClose(reason => { ... });   // see the reasons below
room.leave();                      // also send this on beforeunload
```

`subscribePresence`, `subscribeTopic` and `onClose` each return an
unsubscribe function. `subscribePresence(query, callback)` also accepts the
InstantDB-style `(query, callback)` signature. `room.unsubscribe()` is an
alias for `leave()`.

Close reasons:

| Reason | Meaning |
| --- | --- |
| `left` | You called `leave()` |
| `host_left` | The host left, so the room is gone |
| `full` | The room was at capacity |
| `not_found` | No open room with that ID, usually because it already ended |
| `taken` | You tried to host a room ID that's already open |
| `rate_limited` | This client sent more than 300 messages in 2 seconds |
| `disconnected` | The connection dropped, or the server refused the page's origin |

The client doesn't reconnect automatically. On anything other than `left`,
tell the player and return them to the lobby.

### Which server it talks to

- Pages on `localhost` or `127.0.0.1` use `http://localhost:8787`, which is
  `wrangler dev`.
- Every other page uses the production URL in `PRODUCTION_URL` at the top of
  `mini-rooms.js`. The GitHub Pages site is served at `http://games.hoai.net`
  (`hoai2k.github.io/mini/` redirects there). It's plain HTTP, so browser
  features that need a secure page, such as `crypto.randomUUID`, aren't
  available: always provide a fallback.
- `?rooms=<url>` in the page address overrides both, for example
  `?rooms=http://127.0.0.1:8787`.
- `MiniRooms.connect(game, { server })` overrides it in code.

## Adding online play to a game

1. **Ship the client.** In the game's `publish.sh`, copy
   `multiplayer/client/mini-rooms.js` into the output folder, and load it with
   a `<script>` tag before the game code. Don't fork the file into the game.
   Improve the shared copy instead.
2. **Decide who owns what** before writing code. Write it in the game's
   README as a topic table, like the one in `tankwars/README.md`. Usually:
   - presence: each player's own avatar state;
   - host-only topics: map or level setup, spawns, round start and end,
     settings, pause;
   - anyone's topics: discrete actions others must see (shots, pickups,
     emotes).
3. **Lobby UI.** Host form (player name, then `net.host`), join list
   (`net.watchRooms` while the lobby is visible, then `net.join`), and a back
   button. Escape room titles and player names before putting them in HTML.
   They come from other players.
4. **Joining mid-game.** When the host's `subscribePresence` callback shows a
   new peer, the host publishes the current setup (for example `map_sync`) so
   the newcomer can build the world. Topics only reach players already in the
   room, so nothing earlier is replayed.
5. **Remote players.** Draw other players from presence. Smooth their motion
   by lerping toward the latest position rather than snapping, and snap only
   on big jumps (respawns, warps). Remove a player when they disappear from
   `peers`.
6. **Send rates.** Call `publishPresence` every frame if that's convenient,
   because the client throttles it to 20 a second. Keep each presence message
   small (well under 64 KB, ideally a few KB): send numbers and IDs, not
   objects with methods or images.
7. **Clean up.** Call `room.leave()` when leaving to the menu and on
   `beforeunload`. Handle `onClose` as described above.
8. **Controllers and the guidelines.** Online menus follow the same controller
   rules as everything else in [GAME_GUIDELINES.md](GAME_GUIDELINES.md). Lobby
   entries must be navigable with a D-pad or stick and joinable with A.

## Running and testing locally

```sh
cd multiplayer/server
npm install            # first time only
npx wrangler dev       # relay at http://localhost:8787
npm test               # end-to-end tests (starts its own wrangler dev on port 8799)
```

Then publish the game to `local/pages/` and serve it, for example with
`python3 -m http.server 8000 --directory local/pages`, and open it in two
browser windows: host in one and join from the other. Many games only read
input while their window has focus, so click into a window before testing its
controls.

Check before merging: the server tests pass; host, join, presence and topics
work across two windows; the lobby count updates; a guest returns to the
lobby when the host exits; and local (offline) play still works.

The GitHub Pages workflow runs `npm ci && npm test` in `multiplayer/server` on
every push to `main`.

## Deploying the relay

Pushing to `main` doesn't deploy the relay. It's a Cloudflare Worker, so
deploy it from a machine logged in to the Cloudflare account:

```sh
cd multiplayer/server
npx wrangler login     # first time on a machine: opens a browser to approve
npx wrangler deploy
```

Redeploy only when `multiplayer/server/` changes. Client-only changes ship
with the games through GitHub Pages. If the deploy prints a different URL from
`PRODUCTION_URL` in `mini-rooms.js`, update that constant and the URL at the
top of this document.

Changing the protocol: the deployed relay serves every published game at once,
so keep it backward compatible. Add fields and message types; don't rename or
remove them. If a breaking change is unavoidable, deploy it as a new Worker
name and move games over one at a time.

## Limits and cost

The relay runs on Cloudflare's free Workers plan. Rooms use WebSocket
hibernation, so idle rooms cost nothing. Each incoming WebSocket message counts
as 1/20 of a request against the free allowance of 100,000 requests a day.
That's roughly 25–30 hours of a player sending 20 presence updates a second,
every day, which is plenty for party games. If the dashboard ever shows the
allowance running out, lower the presence rate (`PRESENCE_INTERVAL_MS` in the
client) before paying for anything.

Server-side limits: 64 KB per message, 300 messages per 2 seconds per
client, 16 players per room, room titles up to 40 characters, names up to 24,
and the lobby shows up to 50 rooms per game.

On the free plan, running out of the daily allowance makes the relay refuse
requests until the next day; it never produces a bill. Staying on the free
Workers plan keeps that hard cap.

## Server protocol (for changing the relay)

| Endpoint | Purpose |
| --- | --- |
| `GET /lobby/<game>` | `{ rooms: [{ id, title, count, capacity, updated }] }` |
| `WS /room/<game>/<roomId>?host=1&title=&name=&capacity=` | Open a room as host |
| `WS /room/<game>/<roomId>?name=` | Join a room |

| Direction | Message |
| --- | --- |
| client → server | `{t:"p", d}` set my presence · `{t:"m", topic, d}` broadcast a topic |
| server → client | `{t:"welcome", you, host, peers}` · `{t:"join", from}` · `{t:"p", from, d}` · `{t:"m", from, topic, d}` · `{t:"leave", from}` · `{t:"closed", reason}` |

Each room is a `Room` Durable Object named `<game>/<roomId>`, and each game's
lobby is a `Lobby` Durable Object named after the game, backed by SQLite.
Rooms report their player count to the lobby on every join and leave, and
every 30 seconds while anyone is connected. The lobby drops rooms it hasn't
heard from in 90 seconds. The code is `multiplayer/server/src/index.js`.
