# Games Chat

A video chat in the browser with 75 face effects and backgrounds and 25
minigames. Everyone
who opens the page joins the same chat, unless a link names its own room
(`?room=call-abc123`: calls from the iOS app and their invite links meet
there). One person fills the screen and the
others float in movable small windows, for two people or up to 16,
although every extra person costs upload bandwidth (see "How calls work").
Play it at https://hoai2k.github.io/mini/chat/.

There is also an iPhone and iPad app in [`ios/`](ios/README.md): the same
call screen, effects and games (it loads this web app), with calls that ring
like phone calls, by username or phone number. Getting it onto devices:
[`ios/TESTFLIGHT.md`](ios/TESTFLIGHT.md). `privacy.html` is its privacy policy.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css` | The page: title screen, call screen, trays, dialogs |
| `themes.css`, `js/palette.js` | The Teen, Art and Classical themes (Kid is `styles.css` as it stands) and each theme's shade of every player colour |
| `js/debug-bots.js`, `js/debug-bot-runtime.js`, `js/rookie.js` | Settings-controlled test participants, isolated game windows and rookie inputs |
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
| `ios/` | The iPhone and iPad app, its calls server and its guides (see `ios/README.md`) |
| `privacy.html` | Privacy policy for the website and the app |

## Layout

The videos fill the screen and every control floats over them, kept small
so the picture stays clear:

- **Top:** the status pill on the left; microphone, camera, settings and full
  screen on the right. Settings also holds How to play, Messages (unread
  counts show on the settings button) and Leave the call; your name there is
  tapped to change it. **Add Debug Bot** near the bottom uses − / + for up to
  four test players; the count applies when Settings closes, including Escape.
  Bots use simulated cameras, accept any shared effect, and join human game
  sessions with simple rookie inputs: every game gets a move from them, and
  games that need aiming give the bot a simple one of their own (`rookie()`:
  Air Hockey chases the puck, Minigolf putts at the cup, Bowling rolls,
  Hoops tosses, Word Blitz finds a word now and then). They join the same
  room as you (a `?room=` call too) and run in an invisible window kept on
  screen, since browsers pause animation in off-screen frames. Their scores
  never update your records.
  They leave when removed, when you leave the call, or when the page reloads.
  This is a session-only control, not a saved preference.
- **Videos:** names show only for a moment (when someone arrives, renames or
  the videos swap); connection messages show while connecting and then go.
  Your friend fills the screen and everyone else floats over it. The main
  video shows a friend's whole picture in its own shape, letterboxed (a friend
  holding their phone sideways shows wide on your upright one); small videos
  all keep one shape and crop to it, and your own view always fills. Pinch out
  on a friend's main video to fill the screen with it (cropped) and drag to
  pick the part you see; pinch in for their whole picture again, and drag that
  to slide it up or down (or across) in its spare room. On a computer a trackpad
  pinch or a double-click switches. Each friend's framing is remembered. Tap a small
  video to make it primary (or focus it and press Enter/Space); drag each small video
  independently to position it. This also works with three or more people.
  A quiet **Copy** prompt names the effect used by the person in the main video.
  Small videos have no buttons. A shared effect replaces the quiet prompt with
  a **Try it** notification in the same spot; dismissing or expiry returns to
  the main person's current effect. Copying and accepting use the same action.
- **During a game** the bottom row and strips go away so the game gets the
  screen and your effect is removed. Effects cannot be put on during a game.
  Close the game with the ✕ beside its name to get the controls back.
- **Bottom row:** Favorites, Effects, Accessories, Backgrounds and Games.
  Picking one lights it up and opens its strip; once something from it is
  on, the button slides to the left (the others fold away; tap it again,
  or pick "no effect", for the whole row) and the space to its right shows
  what's on: its full name above the thumbs, ⓘ (how it works) and share
  (offers it to everyone, who get a Try it button). Deselecting or leaving
  an effects category removes its effect; reopening Effects, Accessories or
  Backgrounds restores that category's last choice. Choosing "no effect"
  clears that choice. Games keep effects off until you reopen a category.
  Bottom gradients and sheet backgrounds reach the screen's bottom edge,
  including behind the row and the phone's home-bar area.
  Effects, Accessories and Backgrounds are strips of lenses:
  swipe one and whichever stops in the ring is put on. Favorites is a strip
  of everything you gave a thumbs up (effects and games); tap one to use it.
  Drag a strip up (or tap its grip) for a grid that scrolls up and down;
  pull the grid down to go back to the strip. Games and Messages are bottom
  sheets that can be pulled down to peek at the video and closed by pulling
  further or flicking.
- **Making room:** drag the bottom UI down to step it out of the way: first
  the row tucks away (an open strip drops to the bottom edge), then the
  strip goes too, leaving a small grip. Drag up (or tap the grip) to bring
  each level back; dragging an open strip up once more opens its grid.
- An open game takes the whole screen between the two bars, and the videos
  shrink to bubbles in the top bar; games marked `fullBleed` (Hoops) draw
  under the bars too.

Themes: Settings > Theme picks the look. Kid (the default) is the original
candy look with the first icon set; Teen is dark and sleek with the teen
icon set; Art borrows mid-century French New Wave cinema posters (paper,
black outlines, offset shadows, red, Jost); Classical is 18th-century French
Rococo (ivory, double gold borders, gilt buttons, Garamond). `themes.css`
restyles the page through `html[data-theme]`; text over the video keeps a
dark backing in every theme, and the game area keeps its dark palette.
The colour you pick is a colour name rather than an exact shade: each
theme has its own blue, pink and so on (`js/palette.js`: candy for Kid, neon
for Teen, printing inks for Art, Rococo pastels for Classical), and frames
itself with it: a glow in Teen, the poster's spot colour and offset shadows
in Art, a ribbon inside the gilt frames in Classical. The Kid shade is what
gets saved and sent to the others, so everyone sees your colour in their own
theme's shade.
Icons fall back through the theme's own set, then the teen set, then the
first set (`themedIconName` in `js/assets.js`); the title logo and
background do the same, with a styled text logo until Art and Classical get
theirs.

Full screen: Start and the top-right button ask for full screen with
whichever API the browser has (the prefixed one too, which iPhone Safari
offers without reporting it as enabled). Only if the page doesn't go full
screen does the button explain Add to Home Screen; the installed app opens
full screen.

## Effects

Effects are drawn onto the video I send, so friends see them without doing
anything. They're split into three tabs (`effects/index.js` lists which go
where): **Effects** (warps, colour, time tricks, drawn particles),
**Accessories** (things in front of you: hats, ears, horns, masks, hearts,
the rainbow, tears, snow and bubbles)
and **Backgrounds** (new backdrops and the 360 worlds). Bright backgrounds
and worlds lift a dim camera image to match them.

**Auto light** (on by default; Settings can turn it off) does the same for
everyone, like most video-chat apps: a few times a second the brightness of
your face (or the middle of the picture before a face is found) is measured,
and a dark picture is lifted up to 2.8 times with a curve that brightens
shadows most and leaves highlights alone. It never darkens. Sound effects play at half
the level the slider sets, so they sit under the conversation. Many react to the face; with no face tracked, hold Space, hold your
own video, or hold RT instead.

- **Stickers and characters:** Bubble Blow (pucker to blow a bubble that
  flies to a friend's face and pops), Puppy, Kitty, Bunny, Heart Eyes, Dragon,
  Rainbow Mouth, Alien, Deal With It, Royalty, Fancy, Clown, Flower Crown,
  Devil, Angel, Pirate, Viking, Wizard, Butterflies, Glam, Waterworks, Hotdog,
  Laser Eyes.
- **360 worlds** (the room behind you is replaced; turn all the way round
  with the phone and tilt it up and down, or turn your head on a laptop, to
  look around): Beach, Space, Reef, Forest, City,
  Snow, Candy, Volcano.
- **Backgrounds:** Outer Space, Under the Sea, Blur, Colour Pop, Neon Aura,
  Disco, Code Rain, Sunset.
- **Time:** Time Trails, Delay Ghost, Time Warp, Side Warp, Wobble Time, Stop
  Motion, Clones, Motion Glow.
- **Warps:** Big Eyes, Bobblehead, Noodle Face, Swirl, Tiny Face, Chubby
  Cheeks, Baby Face, Mirror Face, Cyclops, Big Mouth, Fisheye.
- **Reshaping:** Baby (a bigger, rounder head with the features gathered
  lower, larger eyes, a tiny nose and mouth, fat cheeks, faint brows, smooth
  skin), Man (a broader jaw and longer chin, a stronger nose, a lower heavier
  brow, contour shadows and only light stubble) and Woman (a softer, narrower
  jaw, a smaller nose, lifted finer brows, fuller lips, light on the
  cheekbones and a touch of colour). They lean on proportion and shading
  (`effects/lib/faceshade.js`); Baby and Woman also take a beard away
  (inside the face's outline, and below the chin using the person cut-out).
  Thinner and Fatter squeeze or stretch you sideways from head to toe.
- **Filters:** 8-Bit, Comic Book, Heat Vision, Film Noir, VHS, Pop Art,
  Kaleidoscope.
- **Particles:** Storm Cloud, Snowfall, Confetti, Make It Rain, Fireworks.

## Games

Hoops (laid out like Messenger's: a big hoop and the ball at the bottom; pick
the ball up, carry it and toss it, or just flick it straight off its spot; it
moves with your finger and flies on from where you let go, with no help. It
is essentially 2D: every ball reaches the hoop and never goes past it; the
swipe's speed sets how high it is when it gets there (an S-curve centred on
a good throw, so speeds near it change the height gently and far ones a lot)
and its direction on screen where it is sideways; the hoop moves every five
shots; the ball is drawn in front of the rim on the way up and behind the rim and net on the way down), Flappy Face (your face is the bird; tap to
flap), Air Hockey (your paddle keeps its distance from your finger, so you
can drag from below it; after a goal the puck waits, still, on the side of
the player who conceded until someone hits it), Connect Four, Quick Draw, Staring Contest,
Copy Cat, Rock Paper Scissors, Doodle Guess, Memory Match, Mini Golf (nine
holes played together with friends' ghost balls; pull back to aim and the
arrow sits behind the ball, following your finger, pointing the way it will go),
Bowling (pins finish falling and stay on the lane for 1.5 seconds before the
rack resets or the turn changes), Beach Bump (bump
a ball between faces by nodding), Burger Stack (catch ingredients by moving
your head: patty, cheese, lettuce, tomato, bacon, ketchup, pickles, onion and
a fried egg, packed snugly on the bun; dodge the boots and the poop; live
miniature kitchens show friends' stacks, falling ingredients, scores and
remaining lives), Asteroid Dodge (steer with your head or by tilting the phone
or dragging; the ship sits about a quarter of the way up the screen, clear of
your finger, and flies up from below the edge when a run starts),
Don't Smile, Snake, Battleship, Trivia (384 questions in 12 categories, pitched for 12-year-olds and up; a question closes as soon as everyone has answered) and
Word Blitz (a Boggle-style word race on a 20,000-word dictionary) and Go Fish
(thirteen creatures from the ancient oceans, from Anomalocaris and Opabinia to
Dunkleosteus and the Mosasaur, four cards each. Ask someone for a creature you
hold (with one opponent, tapping the creature asks straight away; with more, tap
the card, tap a player, press Ask). When you are asked and have the card, it
bounces in your hand; tap it and it flies to the asker, or press Go Fish if you
have none. If they say Go Fish, press Go Fish and your angler, with your face, casts
into the pond and reels up a card. Fish shadows swim there, one per card left
once fewer than four remain. Two to five players gather in a lobby and anyone
deals; alone you play Robo-Fisher), Mob Whack (a blocky whack-a-mole: tap zombies, whack creepers before they explode, leave villagers alone and catch endermen once they stop teleporting; everyone plays the same seeded 60-second round on one shared field: each player's hammer shows in their colour, the first valid whack on a mob takes it and its points (the round owner referees the claims by time, so a later hit just gets "Too slow!"), a creeper nobody whacks costs everyone still in a heart and 10 points, a villager costs only whoever hit it, and the owner's tally gives every seat the same scores and winner) and Baseball (a home run derby seen from
behind the plate in the style of Wii Sports Baseball's batting, with your face
on the slugger: the pitch grows from a dot in the pitcher's hand to a big
streaking ball at the plate, and you tap it as it gets there; the slugger
loads as it comes and swings in about a third of a second, the bat level
through the ball and round over his front shoulder; when you swing sets the direction, early pulls and late is foul,
and where you tap on the ball sets the launch, on top a grounder and under it
a pop-up; ten fastballs, changeups and curves a round, friends' hits fly as
ghost balls and everyone's home runs are on the scoreboard). Kart Dash is a
behind-the-kart Mode-7 racer (WebGL ground) for one to four racers with
computer karts filling the grid: three laps and item boxes giving boost
rockets, banana peels, bouncing bombs and rainbow stars that spin karts out
with wheels and panels flying, each kart driven by its player's live face. A
kart holds two items: a box fills the next empty slot, the item button shows
the one you'll use large and the next one small beside it (greyed while
empty), and using one moves the next one up. On touch (after Brick Kart) gas
is automatic: drag a finger left or right anywhere but the item button to
steer, from where it touched down (full lock at 14% of the screen's shorter
side, 48 to 100 px, with a small dead zone and a gentle curve, and the anchor
follows past full lock so turning back is instant); drag that finger well down
(10% of the screen height) to brake and then reverse, and slide it back up to
let go; touch with a second finger while steering to hop into a drift, and let
go of it for the mini or super boost. Keys: arrows or A/D steer, Shift (or
X/C/Z) drifts, Down or S brakes, Space, Enter or E uses an item; a controller's
stick steers, RT, RB or X drifts, LT, LB or down brakes and A uses an item.
Block Drop is a falling-block puzzle on modern rules: a 10 x 20 well, the seven
four-square pieces in their usual colours from a seeded 7-bag, SRS turning with
wall kicks, hold, three next pieces, a ghost where the piece will land, soft and
hard drops, half a second of lock delay, rows that flash white and burst before
they clear, a level every ten lines with faster falling, and points for one to
four rows (a 4-row clear is a Block Buster) plus combos. Everyone plays their
own well from the same seed, so all get the same pieces in the same order, and
sees everyone else's well live beside or above their own (up to three in a rail
beside it on a phone, more in a strip on top; a column on the right sideways),
with their face, score and the falling piece, updated eight times a second.
Clearing two rows or more sends garbage (2 rows send 1, 3 send 2, 4 send 4, and
a combo adds up to 4 more), first cancelling garbage waiting for you; it goes
to your one opponent, or with more players to whoever leads on points, flies
across as a streak, waits beside the well as a red bar and rises with one gap
the next time that player locks a piece without clearing. Topping out puts you
out to watch; the last one standing wins and the next round starts by itself.
Alone it is an endless marathon with the best score kept per device; anyone
joining mid-round starts at once with an empty well. On touch, tap to turn
(a second finger's tap turns the other way), drag sideways and the piece
follows a cell at a time, drag down to soft-drop, flick down to hard-drop, and
tap Hold or swipe up to hold. Keys: arrows or A/D move, Down soft-drops, Up or
X turns clockwise, Z or Ctrl anticlockwise, Space hard-drops, C or Shift holds;
a controller's D-pad or stick moves and soft-drops, up hard-drops, A and X turn,
Y, LB or RB hold. Starting a game shows friends an invite with a Join button.
Records are kept per device.

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

- `node --test chat/test/*.test.mjs`: face geometry, Hoops and Baseball physics, and the
  room layer on an in-memory relay (also run by the Pages workflow)
- `python3 chat/design/source/build_requests.py --check`: request documents
  are up to date
- `node chat/test/fx-shots.mjs [ids] [--only=neutral,beard,bearded,...]`:
  every effect on a drawn test face (`beard` gives the face a beard, to check
  beard removal; `bearded` is the same face with no effect)
  through Chromium's fake camera, screenshots in `local/chat-shots/`
- `node chat/test/game-check.mjs [ids] [--n=3]`: each game with simulated
  players side by side (`test/game.html`)
- `chat/publish.sh local/pages/chat && node chat/test/chat-fixes.mjs`: group
  video dragging and primary selection, effect deselection and copying,
  effects disabled during games, live opponent burgers, and bowling's
  1.5-second pause after pins settle (needs the local relay dependencies)
- `chat/publish.sh local/pages/chat && node chat/test/effect-prompt.mjs`: main-video
  copying, keyboard promotion, shared offer replacement/dismissal/expiry,
  mobile fit, game suppression and peer departures.
- `chat/publish.sh local/pages/chat && node chat/test/debug-bots.mjs`: Settings
  count and deferred joins/removals, simulated cameras, effect copying and
  offers, all 25 games with rookie controls, real turns, live Burger Stack
  state, isolated records and cleanup. Uses an in-memory relay.
- `node chat/test/trivia-check.mjs`: two players answer and the question
  closes straight away rather than waiting out its clock
- `chat/publish.sh local/pages/chat && node chat/test/bot-app-check.mjs [ids]`:
  the real app with a debug bot in each game (the human seat plays too),
  checking the bot's window keeps animating and the bot makes moves
- `node chat/test/airhockey-check.mjs`: the puck waits, still, after a serve
  until someone hits it, and a bot goes and hits it
- `node chat/test/gofish-play.mjs [--n=2]`: plays whole games of Go Fish for
  every seat (`--n=1` against Robo-Fisher), checking all 52 cards stay
  accounted for and every book gets made; screenshots of a cast, a low pond,
  the Go Fish bubbles and the end in `local/chat-shots/`
- `node chat/test/whack-play.mjs`: two phone-sized Mob Whack seats share one field: mouse whacks show one seat's whack taking the mob off the other's field and scoring for the whacker, a second hit on the same mob getting nothing, the earlier whack winning even from the non-owner, the other player's hammer drawn where they aim, an unwhacked creeper costing both a heart, a villager costing only its whacker, an enderman teleporting, the same scores and winner on both seats, rookie bots scoring, and the second seat refereeing on when the owner leaves mid-round (screenshots in `local/chat-shots/whack-*.png`)
- `node chat/test/baseball-play.mjs`: on two phone-sized seats, checks the
  swing (arms keep their length, both hands stay on the bat, the bat sweeps
  one way from behind his head, level through the zone, over his front
  shoulder) and that the ball is 6-10% of the screen's width at the plate, then
  taps timed to the pitch: right on the ball as it reaches the plate is a home run, far
  too early misses, late is foul, above the ball is a grounder, no swing is a
  take; the round ends after ten pitches with the card, the home runs reach
  the friend's scoreboard and Bat again starts the next, where taps on the
  ball's top and bottom edges both connect, the top one lower; a rookie bot in
  the other seat swings and sees the hits as ghosts (mid-swing picture in
  `local/chat-shots/baseball-swing.png`)
- `node chat/test/kart-play.mjs`: two racers on phone-sized Kart Dash seats:
  the countdown, touch drag-steering both ways, dragging down to brake and
  reverse, a second finger drifting, stick steering, two item boxes filling
  both slots and a tap on the item button using the first, a banana spin-out
  with flying parts,
  a bomb, and rookie bots racing three laps to a finishing order, with frame
  times; screenshots in `local/chat-shots/kart-*.png`
- `node chat/test/blocks-play.mjs`: two phone-sized Block Drop seats get the
  same seed and the same pieces; real touches move the piece a cell at a time
  both ways, a tap turns it, a slow drag down soft-drops, a quick swipe up
  holds, a flick down hard-drops, and the D-pad moves it; each seat sees the
  other's well, score and falling piece live; a 2-to-4-row clear sends the right
  garbage, shown waiting on both seats and rising into the other well when it
  locks a piece; a top-out ends the round with the same winner on both seats;
  the next round starts by itself and rookie bots place pieces and clear rows
  (screenshots in `local/chat-shots/blocks-*.png`)
- `node chat/test/hoops-play.mjs`: on a phone-sized Hoops: the ball follows
  the pointer, letting go without a flick puts it down, flicks aimed beside
  the hoop arrive exactly where aimed, soft and hard flicks miss, and a
  straight flick of the right speed scores
- `chat/publish.sh local/pages/chat && node chat/test/conn-check.mjs`: a
  working call turns the pill green with signal bars and a route in the
  Connection panel; calls that can't connect (`?rtcdrop=1&rtcfast=0.2`) go
  from connecting to retrying to "can't connect" with Try again, and the
  pill turns red
- `chat/publish.sh local/pages/chat && node chat/test/ui-check.mjs`: on a
  phone-sized page, mouse and touch pulls on each sheet (a short pull peeks
  and snaps back, a long one closes) and a sideways scroll of the effects
  strip putting on the effect in the ring
- `chat/publish.sh local/pages/chat && node chat/test/effect-controls.mjs`:
  remembered category toggles, explicit None and game protection; bottom
  backings, uncut grid labels and full titles above actions in every theme
  at phone and desktop widths, plus expanded thumb touch targets
- `chat/publish.sh local/pages/chat && node chat/test/call-check.mjs`: two
  browsers against a local relay: video both ways, a bubble flying and
  popping, chat, joining a game from an invite, and a background tab pausing
  the camera and mic (needs `npm ci` in `multiplayer/server`)
- iOS app: `chat/ios/README.md` lists its checks (Swift tests, the calls
  server's tests, `chat/ios/test/web-shell.mjs` for the app's layer over this
  page, and the Mac build in `.github/workflows/chat-ios.yml`)
- `chat/publish.sh local/pages/chat && node chat/test/theme-shots.mjs`:
  title, call, effects, settings and games in every theme (`--color=#4dabf7`
  picks the player colour), screenshots in `local/chat-shots/themes/`

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
  pauses: friends see your initial with "away" and an Away flag on your
  tile. The microphone stays on and friends' voices keep playing, so talking
  carries on both ways; only the app's own sound effects go quiet. The
  camera comes back when you return, unless you had turned it off.
- The camera and microphone start alongside joining, never before it, and
  each request gives up after 8 s (iPhones can leave it unanswered while a
  phone or video call holds the microphone). If they don't start, a dialog
  says why (busy in another app, blocked for the site, not found, or didn't
  answer) with Try again; the mic and camera buttons also try again. A
  device taken away mid-call (a phone call starting) is reported the same way.
- The Connection panel and its report include the video loop: frame rate,
  time per frame, face tracking time, and any freezes (a gap over 0.7 s
  with the tab in front) with the effect that was on. Slow face tracking
  is thinned to every second or third frame so it can't starve the page.
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
| `fxshare` | the sharer | An effect offered to everyone (`{ fx }`); each gets a Try it button |
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
  the first tap after picking one. The view follows the direction the back of
  the phone points (worked out from the full orientation, so holding the
  phone upright doesn't jam it); this is checked on simulated readings only,
  not yet on a real phone.
- Until the relay is deployed with the TURN secrets above, calls between
  some networks (mobile data, strict routers, offices) can't connect video;
  the tile then says so and chat and games still work.
- Every person uploads one copy of their video per other person, so more
  than about four people strains uploads. An SFU (Cloudflare Realtime) would
  lift that.
- Scores and records live on each device, not in a shared leaderboard.
- Artwork: all 96 second-set effect and game icons are delivered as
  256 × 256 transparent PNGs in `assets/icons2/`, selected through `iconUrl`
  in `js/assets.js`. The first set remains available. The 255 original requests are delivered, including both Baby icons and
  the revised Blur icon with a sharp person against a heavy bokeh blur.
  Additional theme artwork is tracked in `design/image-requests.md`.
- Artwork (themes): all six title assets and all 95 Art and 95 Classical
  icons are delivered and checked in the effects strip, grid and games sheet
  (`theme-shots.mjs`); Art's Tiny Face was redone once (CH-N56) because its
  first features vanished at icon size.
- Artwork (Block Drop): the block tile (CH-G73, a white glossy cell the game
  tints per piece) and the backdrop (CH-G74) are requested; until they arrive
  the game draws bevelled jelly blocks and a night sky with drifting block
  outlines itself.
- Artwork (Go Fish): the thirteen creature cards (CH-G25 to CH-G37), the card
  back (CH-G38), the pond (CH-G39) and the Go Fish icon in each set (CH-I97,
  CH-K97, CH-N96, CH-R96) are delivered and checked in play
  (`gofish-play.mjs`) and in the games sheet of every theme. The angler
  stands on the pond's painted jetty, and the fish shadows are drawn darker
  over the painted water. The game's own creature drawings remain as
  stand-ins for any art that fails to load.
- Artwork (first set): all 159 first-set image requests are delivered. The approved blue/green/purple
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
  Instructions (with a controller diagram), Settings, Sound and Fullscreen are in
  place and menus work with a controller. The title's Sound button mutes the
  app's own sound effects only (saved in Settings storage as `muted`); the
  microphone and friends' voices are untouched, and the effects also go quiet
  whenever the tab is hidden or the window loses focus. Pause doesn't apply to a live call.
  Real Xbox controller testing and iOS Safari testing are still outstanding;
  only simulated input and headless Chromium have been checked.
