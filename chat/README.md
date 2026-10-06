# Games Chat

A video chat in the browser with 20 face effects and 10 minigames. Everyone
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
| `js/sheet.js`, `js/icons.js` | Pull-down-to-close sheets; the control icons (mic and camera get a slash when off) |
| `manifest.webmanifest`, `app-icon-*.png` | Home-screen install, which is how iPhones get full screen (stand-in icon until CH-U03 arrives) |
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

Bubble Blow (pucker to blow a bubble; relax and it flies to a friend's face
and pops), Puppy, Heart Eyes, Dragon, Rainbow Mouth, Big Eyes, Bobblehead,
Alien, Deal With It, Royalty, Fancy, Clown, Storm Cloud, Noodle Face, Swirl,
Outer Space (replaces the room behind you), Under the Sea, 8-Bit, Comic Book
and Heat Vision. Each is drawn onto the video I send, so friends see it
without doing anything. Face gestures have a stand-in for when no face is
tracked: hold Space, hold your own video, or hold RT.

## Games

Hoops (flick shots, friends' shots fly as ghost balls, all-time total and best
streak saved), Flappy Face (your face is the bird; open your mouth to flap),
Air Hockey, Connect Four, Quick Draw, Staring Contest (blink detection), Copy
Cat (match the expression), Rock Paper Scissors, Doodle Guess and Memory
Match. Starting one shows friends an invite with a Join button. Records are
kept per device in localStorage.

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
- `chat/publish.sh local/pages/chat && node chat/test/ui-check.mjs`: on a
  phone-sized page, mouse and touch pulls on each sheet (a short pull peeks
  and snaps back, a long one closes) and a sideways scroll of the effects
  strip putting on the effect in the ring
- `chat/publish.sh local/pages/chat && node chat/test/call-check.mjs`: two
  browsers against a local relay: video both ways, a bubble flying and
  popping, chat, and joining a game from an invite (needs `npm ci` in
  `multiplayer/server`)

`test/fx.html?fx=<id>` and `test/game.html?game=<id>&n=2` are also handy by
hand.

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

- No TURN relay, so some office and mobile networks can't connect video.
  Cloudflare's Realtime TURN would fix this but needs an API key held by a
  small Worker endpoint.
- Every person uploads one copy of their video per other person, so more
  than about four people strains uploads. An SFU (Cloudflare Realtime) would
  lift that.
- Scores and records live on each device, not in a shared leaderboard.
- Artwork: everything currently uses drawn stand-ins until the images in
  `design/image-requests.md` are delivered.
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
