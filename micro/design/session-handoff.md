# Micro Zoom: working state and handoff

A running record of where the work stands, so a new session (or a resumed one)
can pick it up without the conversation. Update it as work lands. Last updated
2026-11-04.

## How the work flows

- Work happens on a session branch (lately `claude/nice-mendel-c0e9ih`),
  merged to `main`; deploys are `git push origin HEAD:refs/heads/deploy`, a
  fast-forward only (check `git merge-base --is-ancestor origin/deploy HEAD`
  first), and **only after every check passes** (gate the push on the checks'
  exit codes, never chain it after them with `;`).
- The owner plays the live build (https://games.hoai.net/mini/micro/) and
  gives feedback; batch work into one deploy when agents finish, don't ask
  for approval to deploy.
- Checks, from the repository root:
  - `node --test $(git ls-files 'micro/*.test.mjs')` (plus new, untracked test files by name)
  - `node micro/game/check-worlds.mjs [worlds…]` (every world page)
  - `node micro/game/check.mjs` (the shell walkthrough)
  - `node micro/game/phage/play-check.mjs` (flaky under load: rerun once)
  - `node micro/workbench/check.mjs` (run `node micro/workbench/build_audio_triggers.mjs` after any change to an `audio.play`/`audio.loop` call)
  - `python3 micro/design/source/build_requests.py --check`, `python3 micro/design/source/build_audio.py --check`
- Browser scripts serve `micro/` as the web root (pages at `/game/<world>/`);
  Playwright via `createRequire('/home/user/mini/micro/game/check-worlds.mjs')('playwright')`,
  launched with `--use-gl=swiftshader --enable-unsafe-swiftshader`.
- Several agents share one working tree: each stages only its own paths; the
  stop hook's "uncommitted changes" is answered with a `WIP … not verified`
  snapshot commit on the branch (never on `main`).
- Commit messages end with the Co-Authored-By and Claude-Session lines; no
  model names in commits or code.

## Layout (after the 3 November restructure)

- `micro/game/` the game: shell in `src/`, worlds in `<world>/`
  (springtail, mite, tardigrade, amoeba, paramecium, bacterium, phage),
  `shared/`, `assets/`, `zoom/`.
- `micro/text_config.js` every player-facing string (edit it directly; `{btn:A}`
  draws a button icon).
- `micro/game_config.js` tunable game dynamics (new, 4 November; mite first).
- `micro/workbench/` the sound workbench (its Audio tab).
- `micro/prototypes/` only the prototype browser, `split-demo/`, `CONTROLS.md`.

## Standing decisions (the owner)

- No hidden meters; dangers visible; every attack has a readable tell and can
  be dodged; nothing vanishes (eaten, leaps, burrows, with an animation).
- No direction arrow by default (Settings → Portal arrow, off).
- Portals entered with Y; the game asks for Y on screen, so controls lists
  don't list it. No Menu: Pause row; View is "Hide/show instructions".
- Cameras: yaw locked to each world's forward (springtail, mite, tardigrade,
  paramecium), RS left/right peeks; Settings → Free camera (single player).
  Phage: fixed split screen, free camera each. LT/RT zoom where the triggers
  are free (paramecium, bacterium, phage, mite).
- The default path runs straight ahead along each world's forward.
- Sounds: the original set plays; the newer set is for the workbench
  (`?sfx=experimental`). No Sound effects setting.
- Credits: Principal Game Designer Hoai Nguyen; thanks Francis Nguyen
  (playtesting), Stephen Jay Gould (inspiration), Opus 5.5; © 2026.

## Latest deploy

`841023bf` (4 November): paramecium food trail and more hunters, bacterium
fight audit (amoeba pseudopod loops, readable tells, drill feedback),
pause blurs only the world's canvases, bacterium starts at a 118 µm field.

## In progress (4 November)

- **Mite** (agent): creatures push each other by mass; nothing vanishes
  suddenly; one X press grabs and eats (more presses speed it up); jump attack
  (X while landing) to reach the tall mite; a corridor world bounded in
  seconds of walking (start ~10 s from the south wall, sides ~10 s out, north
  wall 10 s past the portal) read from `micro/game_config.js`.
- **Bacterium** (agent): the amoeba can't be killed but is routed by sustained
  attack; drilling bores tunnels through pseudopods or the body; tunnels
  close and trap cells faster (visible constriction warning first).
- **All text** (agent): every mention of a controller button in
  `text_config.js` uses `{btn:…}` so it draws the button icon.

## Open questions and loose ends

- Bacterium: scripted runs reach the host in ~2–2.5 min (target 3–5);
  the SEM and DIC looks don't show the drop's edge.
- Amoeba → paramecium transition: the cell appears at about half the
  amoeba's size during the zoom.
- Split screen not tested with 3–4 players under the locked camera; a merge
  while a peek is held; the free-camera ease-back can swing ~35° in a frame.
- The reverse "super-gene" chain is designed (`zoom-chain-levels.md`) but
  not built.
