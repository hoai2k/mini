# One Monster After Another

A game after Mercer Mayer's picture book *One Monster After Another* (1974),
in which Sally Ann's letter to Lucy Jane is stolen by one monster after
another on its way. You play each monster in turn, in the book's order, as it
snatches the letter from the one that has it: a short Mario Party-style
challenge (creep up to the mailbox as the Stamp-Collecting Trollusk, swoop on
the fleeing Trollusk as the Letter-Eating Bombanat, and so on), a celebration
with the prize, and then the next monster is spotted eyeing it. Up to four
players can take turns, and in *Snatch & Keep* two players go head to head,
one snatching and one keeping the letter, swapping sides each chapter.

Play it at https://hoai2k.github.io/mini/onemonster/. It sits behind the
shared invite gate (`game/src/gate/gate.js`, a byte-identical copy of the one in
the `hoai2k.github.io` repository), which is off on localhost.

- [`design/design.md`](design/design.md): the flow, the controls, the
  two-player mode, the nine snatches, the chase rules, how each creature moves,
  and how the sprites are animated.
- [`design/image-requests.md`](design/image-requests.md): the image requests,
  generated from [`design/source/build_requests.py`](design/source/build_requests.py)
  (which also writes `game/src/asset-list.js`); edit the data there and rerun it.
  The delivered art is in `game/assets/`, recorded with its prompts and checksums
  in [`design/image-deliveries.json`](design/image-deliveries.json). New drops go
  in [`intake/`](intake/README.md).
- [`reference/`](reference/README.md): photos of the book and notes on its
  story, style and monsters, for the image generator. Reference only; never
  published.

The [Adventure design](design/adventure.md) has all 48 new image requests
delivered: seven monster movement sheets in `game/assets/monsters/*/moves.png`,
five terrain sheets in `game/assets/adventure/terrain/`, and three backdrop
panels plus a prop sheet for each of the nine boards in `game/assets/adventure/bNN/`.
The prompts, corrections, source dimensions and final checksums are recorded in
`design/image-deliveries.json`. Generated images were resized to the requested
canvases, preserving PNG alpha. Adventure gameplay and slicing these new sheets
into web sprites are still pending; the existing minigames use their current sprites.

| File | What it is |
| --- | --- |
| `game/src/main.js` | Screens, menus, the journey (solo, turn-taking, Snatch & Keep), story pages, running a chapter (card, count-in, HUD, pause, celebration, postmarks) |
| `game/src/chapters/*.js` | One module per snatch; `chapters/index.js` has the contract they keep and each chapter's texts |
| `game/src/chase.js` | The chase kit: sprint and stamina, hiding and flushing, lunge and dodge, grab and tug, and the computer players |
| `game/src/chasedraw.js` | Stamina rings, the tug bar, rustling cover, chase sounds |
| `game/src/art.js`, `monsters.js` | Loading the sprites; drawing the monsters from their key poses with squash, lean, bob and shadows |
| `game/src/engine/` | Input (controllers, split keyboard, touch), synthesised audio, saved settings |
| `game/sprites/`, `game/src/sprites.js` | The web sprites and their manifest, cut from `game/assets/` by `tools/build_sprites.py` (rectangles checked by hand in `tools/slices.json`). It exports the delivered title painting (or runs `tools/compose_title.py` when a title redo is pending) and runs `tools/scene_front.py` (chapter 1's fence and trees, drawn over the mailman) |

## Controls

| Action | Controller | Keyboard | Touch |
| --- | --- | --- | --- |
| Move | Left stick or D-pad | WASD or arrow keys | Drag anywhere |
| Action | A or RT | Space or Enter | The big button |
| Sprint (hold) | B, LB, RB or LT | Shift | The small button |
| Pause | Menu or View | Esc or P | The pause button |

In Snatch & Keep, each player uses their own controller, or one half of the
keyboard (player 1: WASD, Space, left Shift; player 2: arrows, Enter, right
Shift), or one half of a touch screen.

On a narrow screen (a phone held upright) the scene keeps its full height and
at least 1000 of its 1920 units of width, and the camera follows the player's
monster across it (each chapter's `focus()`); in Snatch & Keep it frames both
players, pulling back as far as it must. The touch buttons keep one size, set
by the screen's short side, in the bottom-right corner clear of the notch.
Leaving the tab or the window pauses play and suspends all sound.

## Run and check

```sh
cd onemonster/game
python3 -m http.server 8126           # then open http://localhost:8126/ (?all opens every chapter)
node --test test/*.test.mjs           # the chase balance, every chapter's contract, each chapter's bots
node scripts/browser-check.mjs        # in Chromium: title, modes, prologue, then every chapter
                                      # through card, play, pause and celebration (SHOTS=dir for screenshots)
python3 ../design/source/build_requests.py --check
python3 ../tools/build_sprites.py     # after new art is delivered: recut game/sprites/ (about 8 minutes)
```

`publish.sh` copies the page, code and web sprites (not `game/assets/`) into
the Pages output (`local/pages/onemonster`).
