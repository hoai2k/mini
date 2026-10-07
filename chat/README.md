# Games Chat

A video chat in the browser with 70 face effects and backgrounds and 20
minigames. Everyone
who opens the page joins the same chat. It is tuned for two people (your
friend fills the screen and you sit in the corner) and works for up to 16,
although every extra person costs upload bandwidth (see "How calls work").
Play it at https://hoai2k.github.io/mini/chat/.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css` | The page: title screen, call screen, trays, dialogs |
| `js/main.js` | Wires everything together: tiles, controls, trays, invites, chat, settings |
| `js/net.js` | The shared room on the mini-rooms relay: join or host, reconnect, presence, topics |
| `js/rtc.js` | Mesh WebRTC calls, negotiated over the relay |
| `js/studio.js` | My camera and microphone, face tracking, and the effect renderer (WebGL pass, then 2D) whose canvas is what I send |
| `js/face.js` | MediaPipe Face Landmarker and selfie segmenter (loaded from jsDelivr), face geometry, the sticker face template |
| `js/gamehost.js` | Minigame sessions: who is playing, per-player and shared state, messages |
| `js/flyer.js`, `js/bubble-art.js` | The bubble that flies from one video to another and pops |
| `js/votes.js` | Thumbs up and down, added up for everyone on the relay |
| `js/motion.js` | Where I'm looking for 360 worlds: phone motion sensor, or head turn |
| `effects/lib/world360.js` | Shared code for the eight 360 worlds |
| `games/data/` | Trivia questions and the Word Blitz dictionary |
| `js/sheet.js`, `js/icons.js` | Pull-down-to-close sheets; the control icons (mic and camera get a slash when off) |
| `manifest.webmanifest`, `app-icon-*.png` | Home-screen install, which is how iPhones get full screen (made from the delivered app icon, CH-U03) |
| `js/gamepad.js`, `js/audio.js`, `js/assets.js`, `js/store.js` | Controller navigation, synthesised sounds, delivered art, saved settings and records |
| `js/asset-list.js` | Generated: which artwork has been delivered |
| `effects/` | One file per face effect; see [`effects/README.md`](effects/README.md) |
| `games/` | One file per minigame; see [`games/README.md`](games/README.md) |
| `design/` | Image requests (`image-requests.md`), the face template, and `source/build_requests.py` that generates them |
| `test/` | Unit tests, previews and browser checks (below) |
| `publish.sh` | Copies the app plus `multiplayer/client/mini-rooms.js` into the Pages output |
| `intake/` | Drop box for delivered art |

## Layout

The videos fill the screen and every control floats over them: a status pill
and buttons at the top, the call controls in a pill at the bottom. With two
people your friend fills the screen and you float in a corner (drag yourself
to another corner). Effects are a strip of lenses above the controls: swipe
it, and whichever stops in the ring is put on. Games and Messages are bottom
sheets. All three can be pulled down to peek at the video and closed by
pulling further or flicking. An open game takes the whole screen between the
two bars, and the videos shrink to bubbles in the top bar; games marked
`fullBleed` (Hoops) draw under the bars too.

Full screen: Android and desktop browsers go full screen on Start and with
the top-right button. iPhone Safari has no full screen for web pages, so the
button explains Add to Home Screen; the installed app opens full screen.

## Effects

Effects are drawn onto the video I send, so friends see them without doing
anything. Many react to the face; with no face tracked, hold Space, hold your
own video, or hold RT instead.

- **Stickers and characters:** Bubble Blow (pucker to blow a bubble that
  flies to a friend's face and pops), Puppy, Kitty, Bunny, Heart Eyes, Dragon,
  Rainbow Mouth, Alien, Deal With It, Royalty, Fancy, Clown, Flower Crown,
  Devil, Angel, Pirate, Viking, Wizard, Butterflies, Glam, Waterworks, Hotdog,
  Laser Eyes.
- **360 worlds** (the room behind you is replaced; tilt the phone, or turn
  your head on a laptop, to look around): Beach, Space, Reef, Forest, City,
  Snow, Candy, Volcano.
- **Backgrounds:** Outer Space, Under the Sea, Blur, Colour Pop, Neon Aura,
  Disco, Code Rain, Sunset.
- **Time:** Time Trails, Delay Ghost, Time Warp, Side Warp, Wobble Time, Stop
  Motion, Clones, Motion Glow.
- **Warps:** Big Eyes, Bobblehead, Noodle Face, Swirl, Tiny Face, Chubby
  Cheeks, Baby Face, Mirror Face, Cyclops, Big Mouth, Fisheye.
- **Filters:** 8-Bit, Comic Book, Heat Vision, Film Noir, VHS, Pop Art,
  Kaleidoscope.
- **Particles:** Storm Cloud, Snowfall, Confetti, Make It Rain, Fireworks.

## Games

Hoops (laid out like Messenger's: a big hoop and the ball at the bottom; pick
the ball up, carry it and toss it, and any toss roughly at the hoop goes in;
the hoop moves every five shots), Flappy Face (your face is the bird; tap to
flap), Air Hockey, Connect Four, Quick Draw, Staring Contest,
Copy Cat, Rock Paper Scissors, Doodle Guess, Memory Match, Mini Golf (nine
holes played together with friends' ghost balls), Bowling, Beach Bump (bump
a ball between faces by nodding), Burger Stack (catch ingredients by moving
your head), Asteroid Dodge (steer with your head or by tilting the phone),
Don't Smile, Snake, Battleship, Trivia (351 questions in 12 categories) and
Word Blitz (a Boggle-style word race on a 20,000-word dictionary). Starting
one shows friends an invite with a Join button. Records are kept per device.

## Thumbs up and down

Every effect and game has 👍 and 👎 buttons: on the effects strip next to the
effect's name, under each game card, and in the bar of a running game. Votes
from everyone are added up on the relay (`/votes/chat`, one vote per browser
per item, changeable), and Settings → Ratings lists every effect and game by
score, so the ones nobody likes can be removed. Until the relay with the
Votes object is deployed, each browser only sees its own votes.

## Running it locally

```sh
chat/publish.sh local/pages/chat
python3 -m http.server 8000 --directory local/pages
(cd multiplayer/server && npx wrangler dev)     # the relay; localhost pages use it
```

Open http://localhost:8000/chat/ in two windows. Cameras need a secure page,
which localhost counts as. On any other plain-HTTP address the page moves
itself to HTTPS.

## Checks

- `node --test chat/test/*.test.mjs`: face geometry, Hoops physics, and the
  room layer on an in-memory relay (also run by the Pages workflow)
- `python3 chat/design/source/build_requests.py --check`: request documents
  are up to date
- `node chat/test/fx-shots.mjs [ids]`: every effect on a drawn test face
  through Chromium's fake camera, screenshots in `local/chat-shots/`
- `node chat/test/game-check.mjs [ids] [--n=3]`: each game with simulated
  players side by side (`test/game.html`)
- `node chat/test/hoops-play.mjs`: on a phone-sized Hoops, picks the ball up
  (it must follow the pointer), carries it and tosses it seven ways that must
  all score, checks the hoop moves after five shots, a wild toss misses and
  letting go without a toss puts the ball back
- `chat/publish.sh local/pages/chat && node chat/test/conn-check.mjs`: a
  working call turns the pill green with signal bars and a route in the
  Connection panel; calls that can't connect (`?rtcdrop=1&rtcfast=0.2`) go
  from connecting to retrying to "can't connect" with Try again, and the
  pill turns red
- `chat/publish.sh local/pages/chat && node chat/test/ui-check.mjs`: on a
  phone-sized page, mouse and touch pulls on each sheet (a short pull peeks
  and snaps back, a long one closes) and a sideways scroll of the effects
  strip putting on the effect in the ring
- `chat/publish.sh local/pages/chat && node chat/test/call-check.mjs`: two
  browsers against a local relay: video both ways, a bubble flying and
  popping, chat, joining a game from an invite, and a background tab pausing
  the camera and mic (needs `npm ci` in `multiplayer/server`)

`test/fx.html?fx=<id>` and `test/game.html?game=<id>&n=2` are also handy by
hand.

## Connection status

- The status pill at the top left has a dot: green when the chat relay and
  every call are working, amber (pulsing) while something is connecting,
  red when a call can't connect. Tap it for the Connection panel: the chat
  relay, whether a TURN relay server is available, and for each person the
  call state, the route (direct or through the relay server), round trip,
  their frame rate and bit rate, packet loss and retries, with a Reconnect
  button and Copy report (paste it into a bug report).
- Each friend's tile says what the call is doing: "Connecting to Bo…",
  "Still connecting… trying another way" (after 10 s the call restarts ICE),
  "Can't connect video with Bo" with a Try again button (after two failed
  restarts; it keeps retrying every 30 s in the background), "Reconnecting…"
  when a working call drops, and "Bo's video has paused" when frames stop
  arriving. Connected tiles show signal bars from round trip and loss.
- While the tab is in the background or the window loses focus, the camera
  and microphone pause: friends see your initial with "away" and an Away
  flag on your tile. They come back when you return, except whichever you
  had muted.
- If the browser won't start a friend's video with sound, the video plays
  muted and a "Tap to hear your friends" button appears.

## How calls work

- **Signalling.** Everyone joins room `everyone` of game `chat` on the
  mini-rooms relay. The relay closes a room when its host leaves, so
  `net.js` hosts the room when it doesn't exist and reconnects quietly when
  it closes. Each page load has its own client ID, carried in presence and in
  every topic, so calls survive the relay reconnecting.
- **Media.** One `RTCPeerConnection` per pair of people (a mesh), negotiated
  with the perfect-negotiation pattern over the `sig` topic. STUN only
  (Cloudflare and Google); there is no TURN server yet, so on strict networks
  the video can't connect, though chat and games still work.
- **What I send** is the studio canvas (camera plus effect) captured at 30 fps,
  plus my microphone.
- **TURN.** Direct connections fail on many mobile networks and strict
  routers. The relay's `GET /turn` hands out short-lived Cloudflare Realtime
  TURN credentials when the Worker has the secrets `TURN_KEY_ID` and
  `TURN_KEY_API_TOKEN` (create a TURN key in the Cloudflare dashboard under
  Realtime → TURN Server, then `npx wrangler secret put TURN_KEY_ID` and
  `npx wrangler secret put TURN_KEY_API_TOKEN` in `multiplayer/server`).
  Without them it returns STUN servers only.

| Topic | Sent by | Meaning |
| --- | --- | --- |
| `sig` | anyone, to one peer | WebRTC offers, answers and ICE candidates |
| `bubble` | the blower | A Bubble Blow bubble leaving my mouth for a friend (`to`) |
| `chat` | anyone | A text message |
| `invite` | whoever starts a game | Shows friends a Join button |
| `g` | session members | Game messages, filtered by session ID |

Presence carries my name, colour, camera and mic state, current effect, a
rough face position (where friends' bubbles should pop) and my game session
with its state (see `js/gamehost.js`).

## Known gaps

- The relay update with the Votes object is deployed by
  `.github/workflows/relay.yml` once the repository has the secrets
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (or by hand with
  `npx wrangler deploy` in `multiplayer/server`). Until then votes are only
  kept per browser.
- The 360 worlds use the phone's motion sensor; iPhones ask for permission on
  the first tap after picking one. Real-device sensor directions are untested.
- Until the relay is deployed with the TURN secrets above, calls between
  some networks (mobile data, strict routers, offices) can't connect video;
  the tile then says so and chat and games still work.
- Every person uploads one copy of their video per other person, so more
  than about four people strains uploads. An SFU (Cloudflare Realtime) would
  lift that.
- Scores and records live on each device, not in a shared leaderboard.
- Artwork: all 153 image requests are delivered. The approved blue/green/purple
  logo is `assets/ui/logo-v3.png`; the original and second version remain at
  `assets/ui/logo.png` and `assets/ui/logo-v2.png`. `design/generated/deliveries.json`
  records current files and built-in imagegen prompts. `generation-history.json`
  preserves earlier generation records. The early rejected gym, pillar, table,
  and antennae now have corrected deliveries. Face stickers with placement
  corrections are positioned by `js/assets.js` using `templateRects`; the crown
  and mustache were fitted directly by the remote review. Hoops retains its
  calibration to the delivered hoop.
- Face tracking and segmentation load MediaPipe from jsDelivr and Google
  Storage on first use (about 4 MB). Without them, face effects fall back to
  the hold gesture.
- A real finger swipe on the effects strip hasn't been tested (headless
  Chromium's synthetic touch gestures don't scroll it); the scroll-to-select
  logic is tested with a sideways wheel scroll.
- Against [`GAME_GUIDELINES.md`](../GAME_GUIDELINES.md): the title screen,
  Instructions (with a controller diagram), Settings and Fullscreen are in
  place and menus work with a controller. Pause doesn't apply to a live call.
  Real Xbox controller testing and iOS Safari testing are still outstanding;
  only simulated input and headless Chromium have been checked.
