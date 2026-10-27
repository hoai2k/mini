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

There are no accounts, no stored game state and no anti-cheat. The one thing
the relay does store is votes: `GET /votes/<game>` returns thumbs up and down
totals per item, and `POST /votes/<game>` with `{ item, voter, value }`
(value 1, -1 or 0) sets one browser's vote. Games Chat (`chat/js/votes.js`)
uses it to rate its effects and games. That suits
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

## Lessons from a larger game

Brick Kart (in the `hoai2k/francis` repository, `brick-kart/js/online/`) is a
racer for up to 12 people per room. It has several split-screen players per
browser, host-driven AI karts, projectiles, reconnects and host migration, all
on the unchanged relay. Its README has the full protocol. These are the
patterns from it that any game with more than a couple of players will need.

### Identity and roster

- **Peer IDs change on every connection.** Put your own stable ID (random per
  page load) and the player's name in every presence message, and key
  everything on that. A reconnect is then the same player with a new peer ID.
- **The relay doesn't tell clients names or join order.** The `name` query
  parameter stays on the server. Send names in presence. The host keeps the
  join order (needed for host migration) and publishes it in its presence.
- **Presence can be empty for a newcomer.** A room keeps presence in memory,
  so after hibernation a `welcome` may list peers as `{}`. Re-publish your
  presence, after a short random delay, whenever a new peer ID appears, and
  keep a slow heartbeat (every 15 s) for anything that slips through.
- **A dropped socket can linger,** so the same player can briefly show under
  two peer IDs. Prefer the one that updated most recently.
- **Don't report a leave at once.** Mark a vanished player missing and call
  them gone after about 3 s. A quick reconnect then shows no "left" and
  "joined" messages and doesn't hand their avatar to the AI. Skip leave
  detection while you are reconnecting or migrating yourself.
- **One presence message per browser, not per player.** Put all of a
  browser's split-screen players in one message, so cost grows with browsers,
  not people. Room capacity counts connections, so enforce a people limit in
  the game.

### Keep durable state in the host's presence

Topics aren't replayed, so a joiner, a reconnecting player or a migrated room
misses them. Put everything a newcomer needs (phase, join order, round, level
setup, start time, results) in one object in the host's presence, and make
each client a pure function of its latest value. Use topics only for truly
one-off things such as pings, item uses and hits.

Attach big but rarely changing fields (Brick Kart's race setup is about 1 KB)
only once a second, at once when they change, and when someone joins.
Clients cache them. Put a protocol version in every presence and topic and
ignore anything else. Check the type, range and finiteness of every received
number before it reaches physics or rendering, and escape every name.

### A shared clock

- Guests send `ping {a: sentAt}` and the host answers
  `pong {a, h: hostNow, to: uid}`. Topics are broadcast, so name the
  recipient. The offset is `h + rtt/2 - receivedAt`. Keep the last dozen
  samples and use the one with the smallest round trip. Send a burst of 6 on
  joining (250 ms apart), then one every 6 s.
- Ease later corrections in a few milliseconds per second, so game time never
  jumps. Jump only when the error is over 250 ms.
- Schedule starts at an absolute shared time, such as `hostNow + 9 s`. Across
  three test browsers, GO landed within one frame.
- Make anything moving on a timer a function of shared time
  (`pos = f(t)`), not of summed frame times. Draw any randomness in it from a
  hash of the cycle number. Build the level from a shared seed. Swapping
  `Math.random` for a seeded generator while building is a cheap way to make
  existing random code deterministic.
- After host migration, the new host keeps serving the old host's timeline
  (its own clock plus its existing offset). Start times and timestamps in
  flight then stay valid.

### Smooth remote motion

- Owners publish state about 15 times a second, stamped with shared time.
  The client's 50 ms presence throttle adds latency, but that's harmless
  because samples are stamped when created.
- Receivers keep a short buffer per object and draw it at `now - D`. D adapts
  to each sender: `clamp(lateness + min(0.15 s, sample spacing) + 2 × jitter
  + 15 ms, 90 ms, 600 ms)`, using running averages. Set it outright before
  the start, then let it grow by up to 15% a second and shrink by up to 5% a
  second, and treat a single very late sample as an outlier. On a quick
  network it lands around 110–150 ms. A fixed 350 ms cap was too low for a
  slow connection and caused snaps.
- When drawing time passes the newest sample, extrapolate with velocity and
  turn rate for 0.3 s. Then, in a racer, keep advancing along the track at
  the last speed for up to 3 s. That hides reconnects and host changes far
  better than a straight line.
- Move the shown pose by the sample's velocity, then pull it toward the
  sampled pose with `exp(-11 · dt)`. Snap only on jumps over about 9 m
  (respawns). In tests a remote kart stayed within 0.6 m of its owner's real
  path, with no snaps.
- Hold another player's one-off event (firing an item) until their avatar's
  drawing time reaches the event's time. Then run it from where the avatar
  is shown, so the projectile leaves the kart you can see.

### Who decides a hit

Only an object's owner decides what happens to it. Run every item use on
every browser, from the same seed and the same standings snapshot, but make
hits on objects you don't own do nothing. The victim's browser applies the
hit, the result shows through its presence, and it announces the
projectile's ID so the other browsers remove it. Showing an effect locally is
fine as long as no state changes.

### Host migration on the current relay

- The room closes with `host_left`, but every client already has the host's
  latest join order, so all agree on the successor: the first remaining
  player. That player hosts `<roomId>-g<n+1>`, and the others try to join it
  every 0.7 s. Candidate k waits k × 4 s before hosting, in case the
  successor has also gone. If hosting returns `taken`, join instead. In tests
  everyone was in the new room within about 0.8 s.
- A host whose socket drops gets `disconnected`, not `host_left`. It should
  join the successor room like any guest and give up its AI objects.
- The new host takes over AI objects from where they are now (the newest
  sample plus extrapolation), not from its delayed display. Otherwise they
  rewind by D and jump for everyone else.
- Guests whose socket drops rejoin the same room, retrying after 0.3, 0.8,
  1.5, 2.5 and 4 s. `not_found` means the host left meanwhile, so migrate. If
  every attempt is refused because the relay is down, give up after about
  7 s and let the game carry on offline.

### Budget

Each sent message counts as 1/20 of a request, so 15 updates a second from
one browser costs 2,700 requests an hour, about 37 browser-hours of play a
day. Send one batched presence per browser per tick, and batch one-off events
into at most one topic per 50 ms. The hidden cost is the lobby: each
`watchRooms` poll is a full request (1,200 an hour per open lobby at the
3 s default). Poll only while the lobby is visible, and consider 4–5 s.

### Background tabs, locked phones and determinism

- **A hidden tab stops running.** Browsers pause `requestAnimationFrame` and
  slow timers right down, so a host in a background tab freezes every AI
  object. Hand the room on after 2 s hidden, or at once on `pagehide`,
  `freeze` or a phone. A long frame alone isn't proof of being hidden
  (building a level can take seconds), so hand on only if the others have
  moved on.
- Guests give up on a host that has been silent for 4 s mid-game (longer in
  menus). The host drives a guest's avatar as AI after 3 s without updates,
  and hands it back from where it left it, so nothing snaps.
- **`Math.random` isn't shared between pages.** Caches change how many random
  numbers building a level uses, so a "next random number" differs between a
  page that built the level before and one that didn't. Derive every gameplay
  choice from the shared seed and a hash of the cycle number.
- **Write timed hazards as `pos = f(t)`.** Never write `t0 = t` or add up
  frame times: one 3-second frame on one screen shifts them for good.
- **A slow frame can run two game steps with the same input**, so an
  "item pressed" edge can fire twice. Clear input edges once per frame.
- Let players who finish loading late play: the host drives them until they
  are ready.
- Room capacity counts sockets, including silent ones. When two people host
  at once you simply get two rooms, but default titles can be identical, so
  consider adding a short tag.

### Leaving and coming back as the same player

- **Make identity outlive the page.** An ID made up per page load turns any
  real leave (Leave, reload, a closed tab, a phone dropping the page) into a
  new person who has lost their avatar and score. Keep the ID in
  `localStorage`, but never let two tabs of one browser share it. Give each
  open tab a numbered slot held with the Web Locks API
  (`navigator.locks.request(name, { ifAvailable: true }, …)` with a callback
  that never resolves; the browser releases it when the tab closes). Fall back
  to `localStorage` heartbeats. Each slot has its own ID and its own record of
  the last room.
- **Remember the room by its base ID**, so a "Rejoin" entry still finds it
  after host migration (`<base>-g<n>`).
- **Don't let a returning screen drive its avatars until the host lets go.**
  It builds the level fresh, so its avatars start at the start line and would
  teleport. If the game is under way, keep them as remote copies until the
  host's state stops listing them as AI-driven. The host takes them over as
  soon as the ID reappears and releases them once the screen is playing.
  Build only after the clock has synced, since "under way" depends on it.
- When an avatar you were simulating becomes a remote copy, seed its buffer
  with your own current state stamped one render delay in the past, so it
  doesn't freeze and then snap.
- The returning screen restores its own choices (saved with the room record).
  The host only keeps what is keyed by ID: scores, grid places and join order.
  A new host after migration must rebuild any multi-round state, such as a
  points table, from its guest copy.
- If extrapolation switches method (straight line, then along the track),
  blend between them over half a second or so, or the switch shows as a jump.

### Testing headless

- Software WebGL ran three pages at 2.5–4 seconds per frame. A `?norender`
  page flag that skips drawing brought it to about 40 fps per page, enough to
  test logic, timing and sync. Take screenshots from one drawing page only.
- Hold simulated key taps for at least a frame (two `requestAnimationFrame`s),
  or slow pages miss them.
- When measuring smoothness, stamp samples with the `requestAnimationFrame`
  time. Stamping with `performance.now()` inside the recorder produces fake
  speed spikes.
- Test through a small WebSocket proxy that adds delay (40–150 ms each way,
  about 30 ms jitter, in order) and an occasional 300–600 ms stall. It finds
  problems localhost never shows. Clock sync through the relay takes four
  legs, so expect starts to agree only to within about a quarter of the
  round trip.
- The first time a headless page opens a screen full of 3D previews, it can
  block for 20 s or more. Wait generously before calling a late message a
  protocol bug, and keep animations out of the draw path so `?norender`
  pages still advance.
- Claude's cloud sandbox proxy can't open WebSockets (the production relay
  answers 426), so only the lobby can be checked against production from
  there. Chromium ignores proxy bypass lists for localhost, so use a PAC
  script to reach a local `wrangler dev` directly.

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

The relay workflow (below) runs `npm ci && npm test` in `multiplayer/server`
before every deploy of it.

## Deploying the relay

Deploying a change under `multiplayer/server/` (pushing it to the `deploy`
branch with `git push origin main:deploy`; see "Deploy state" in `CLAUDE.md`)
runs `.github/workflows/relay.yml`, which tests the relay and deploys it if the
repository has the secrets `CLOUDFLARE_API_TOKEN` (a Cloudflare API token
with the "Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID`.
Without them the workflow only warns, and you deploy from a machine logged in
to the Cloudflare account:

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

`POST /oracle` uses Workers AI (the `AI` binding in `wrangler.jsonc`), whose
free allowance is separate from the requests allowance. Answers are cached for
a day and each visitor gets 20 model calls per 10 minutes. `POST /transcribe`
runs Whisper on the same allowance, 12 recordings per visitor per 10 minutes. Local `wrangler dev`
has no Workers AI without a Cloudflare login, so the tests run it with
`--local` and the route answers 502 or 503 there; `npm run dev:local` does the
same by hand.

On the free plan, running out of the daily allowance makes the relay refuse
requests until the next day; it never produces a bill. Staying on the free
Workers plan keeps that hard cap.

## Server protocol (for changing the relay)

| Endpoint | Purpose |
| --- | --- |
| `GET /lobby/<game>` | `{ rooms: [{ id, title, count, capacity, updated }] }` |
| `WS /room/<game>/<roomId>?host=1&title=&name=&capacity=` | Open a room as host |
| `WS /room/<game>/<roomId>?name=` | Join a room |
| `POST /oracle` | A short Workers AI opening for an Ai-Ching reading (`src/oracle.js`; see `aiching/README.md`) |
| `POST /transcribe` | Speech to text (Whisper) for a spoken Ai-Ching question; the body is the audio (`src/transcribe.js`) |

| Direction | Message |
| --- | --- |
| client → server | `{t:"p", d}` set my presence · `{t:"m", topic, d}` broadcast a topic |
| server → client | `{t:"welcome", you, host, peers}` · `{t:"join", from}` · `{t:"p", from, d}` · `{t:"m", from, topic, d}` · `{t:"leave", from}` · `{t:"closed", reason}` |

Each room is a `Room` Durable Object named `<game>/<roomId>`, and each game's
lobby is a `Lobby` Durable Object named after the game, backed by SQLite.
Rooms report their player count to the lobby on every join and leave, and
every 30 seconds while anyone is connected. The lobby drops rooms it hasn't
heard from in 90 seconds. The code is `multiplayer/server/src/index.js`.

### Proposed relay changes (not yet made)

These came out of Brick Kart. Each is backward compatible, and games work
without them. They need a redeploy, as described in "Deploying the relay".

1. **Server time on messages.** Add `ts: Date.now()` to `welcome` and to
   every relayed message. Clients could estimate a clock offset without
   ping/pong topics, and the clock would survive host changes for free.
2. **Host migration on the server, opt-in per room** (`?migrate=1` when
   hosting). When the host leaves, promote the earliest-joined remaining
   player, broadcast `{t:"host", id}`, and keep the room open. The client
   would update `room.isHost` on that message; older clients ignore unknown
   types. This removes the half-second gap and the successor-room logic.
3. **Names and join order from the server.** Send
   `{t:"join", from, name, joinedAt}` and add a separate
   `meta: {peerId: {name, joinedAt}}` field to `welcome`, leaving `peers`
   unchanged.
4. **Flush presence at once when idle.** If no presence was sent in the last
   50 ms, send immediately instead of always waiting 50 ms. That removes a
   fixed 50 ms of latency without raising the rate.
