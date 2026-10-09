# The Ice-Cream Cone Coot

A field guide of rare birds from Arnold Lobel's *The Ice-Cream Cone Coot and
Other Rare Birds* (1971), with a Mario Party-style minigame for each bird:
catch scoops as the Ice-Cream Cone Coot, pour tea into the Cupadee, take
pictures as the Shuttercluck, and so on through ten birds. Each game lasts 30
to 60 seconds and keeps your best score ("New World Record!" when you beat
it, or "Personal Best!" while it's still short of opening the next page); reaching a set score opens the next page of the guide.

Play it at https://hoai2k.github.io/mini/icecreamcone/. It sits behind the
shared invite gate (`game/src/gate/gate.js`, a byte-identical copy of the one
in the `hoai2k.github.io` repository), which is off on localhost.

- [`design/design.md`](design/design.md): the flow, the controls and the ten
  minigames.
- [`design/image-requests.md`](design/image-requests.md): the image requests,
  generated from [`design/source/build_requests.py`](design/source/build_requests.py),
  which also writes `game/src/asset-list.js`. Edit the data there and rerun it.
  Delivered images live in [`game/assets/`](game/assets/); the request list tracks remaining work. The first
  25 images have prompts and checksums in
  [`design/image-deliveries.json`](design/image-deliveries.json); the 14
  gameplay sprites and the medal sheet (no longer used) are recorded with their grid layouts in
  [`design/image-deliveries-round-2.json`](design/image-deliveries-round-2.json).
  The expanded seaside for Scoop Stack is recorded in
  [`design/image-deliveries-wide.json`](design/image-deliveries-wide.json).
  The 18 additional book birds and 10 original pocket birds are recorded in
  [`design/image-deliveries-subjects.json`](design/image-deliveries-subjects.json).
  Backgrounds for the 18 additional minigames are recorded in
  [`design/image-deliveries-minigame-scenes.json`](design/image-deliveries-minigame-scenes.json).
  New image drops go in [`intake/`](intake/README.md).
- [`reference/`](reference/README.md): photos of the book's pages and notes on
  its style and its birds, for the image generator. Reference only; never
  published.

| File | What it is |
| --- | --- |
| `game/src/main.js` | Screens, menus and navigation, the guide, bird pages, running a minigame (count-in, HUD, pause, results, best scores) |
| `game/src/birds.js` | The ten birds: names, rhymes, goals, tips, the score that opens the next page |
| `game/src/subjects.js` | The undiscovered birds Shuttercluck photographs (the book's other 18 and ten of our own): names, rarity, their stand-in drawings and where each painting goes |
| `game/src/games/*.js` | One minigame per bird; `games/index.js` documents the contract they share |
| `game/src/draw.js` | Ink-and-wash drawing: the stand-in birds, how each delivered portrait is placed, and what is drawn over it (lamps, growth, blinks) |
| `game/src/input.js` | Controllers, keyboard, mouse and touch, as one small set of actions |
| `game/src/audio.js` | Synthesised sound effects and music-box tunes |
| `game/src/store.js` | Saved settings and best scores |

## Controls

| Action | Controller | Keyboard | Mouse or touch |
| --- | --- | --- | --- |
| Move | Left stick or D-pad | Arrow keys or WASD | Point: the game follows |
| Action (press or hold) | A or RT | Space or Enter | Click or tap, hold to hold |
| Left / right step (Bobolinks) | LB / RB or D-pad ◀ ▶ | ← / → | Tap the left or right half |
| Wind the spring (Gullfinch) | Spin the left stick | Tap Space or ← → between notes | Drag in circles |
| Pause | Menu or View | Esc or P | The pause button |

## Run and check

```sh
cd icecreamcone/game
python3 -m http.server 8125        # then open http://localhost:8125/ (?all opens every page)
node --test test/*.test.mjs        # birds, every minigame idle and mashed, a bot per game
node scripts/browser-check.mjs     # in Chromium: title → guide → page → play → pause → result,
                                   # keyboard round, then every minigame to its result card
python3 ../design/source/build_requests.py --check
```

`publish.sh` copies the game into the Pages output (`local/pages/icecreamcone`).
The browser check simulates an Xbox controller by replacing
`navigator.getGamepads` and runs with `?dt=0.05`. Testing with a real Xbox
controller, and listening to the synthesised sound, are still outstanding.
