# Session state: The Ice-Cream Cone Coot

A running note of where the work stands, kept so a fresh session can pick up
without the conversation. Update it as work starts, finishes or is handed to an
agent. Newest first.

## Open

- **Agent running (started 2026-10-11):** a Fullscreen on/off checkbox in
  Settings; a bigger celebration on the result card for a World Record on an
  already-passed bird; a smaller one for passing again without a best. Files:
  `index.html`, `src/main.js`, `styles.css`, maybe `src/celebrate.js` and
  `scripts/browser-check.mjs`. When it reports: check its screenshots, run
  the checks, commit, push.
- **Clean Sweep redraw (IC-M06f, IC-M06g):** requested 2026-10-09. The
  Broomwhisk's pose sheets paint the head at portrait size and the broom about
  12% smaller. Until the new sheets arrive, `src/games/broomwhisk.js` draws
  them at a compromise scale (the geometric mean). When they arrive: drop them
  in `intake/`, register them at one scale like the others (see
  `design/source/pose-scales.json`, `test/sprite-rig.mjs`), and flip the
  requests to delivered in `design/source/more/broomwhisk.json`.
- **Lights On fuse:** the user was told how it works (more than 3 lamps on,
  sleepers included, heat it; unplug sleepers to cool it). Offered: make
  sleeping lamps easier to spot, or forgive a fourth lamp longer. No answer
  yet.

## Done on `main` (2026-10-09)

| Commit | What |
| --- | --- |
| 742e072 | Puddle Hop chicks one size as they fly off |
| 3ec4c10 | Broomwhisk re-request (IC-M06f/g) |
| 369d8fd | Third audit: every pose of a character at one size, in 12 games (AUDIT.md, `pose-scales.json`, `sprite-rig.mjs`) |
| 361b9bf | Sticker book: still parts cached, stickers cut ahead of time (about 11 to 59 fps) |
| e1c672f | Press Start on the horizon, halfway between logo and camera bird (`placePressStart` in main.js) |
| 0e1cb32 | Soup's On: bits lying across the ring count; RS / Q-E / wheel resize the ring 0.8x to 1.3x |
| 6f3263c | Pause menu ignores a stick held when pausing until it is centred (`navStickHeld` in input.js) |
| 4eb3443 | Puddle Hop and Slippery Dishes new sheets fitted at one size |
| f521624 | Snip the String bird turns to face and snip either way |
| 6e72cc7 | Lights On: the Swift's beak works the bubbles, panes and fuse lever |
| d6335c2 | Bin Day pieces registered by measured features; fairer catching |
| 1c579b8 | Press Start lower, title hint line removed |

## Ways of working

- Checks, from `icecreamcone/game`: `node --test test/*.test.mjs`,
  `node scripts/browser-check.mjs` (`--no-games`, `--bird <id>`), and
  `python3 ../design/source/build_requests.py --check`.
- Size sprites from a feature that doesn't change between poses (eye, rim,
  lid, handle), never from cell or outline height; each game's test holds its
  poses within 4-5% of standing.
- `?debug` unlocks everything and keeps saves for the session only.
- When agents share the checkout, commit with explicit file lists and test
  the staged change in a clean worktree.
