# Micro Zoom: working state and handoff

A running record of where the work stands, so a new session (or a resumed one)
can pick it up without the conversation. Update it as work lands. Last updated
2026-11-04 (evening).

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

See `git log origin/deploy -1`. The 4 November batch: the mite corridor
(walls in seconds of walking from `micro/game_config.js`), pushing bodies, no
vanishing, one-press eating, the jump attack on the tall predator; the
bacterium amoeba (unkillable, routed by irritation, tunnels that pinch shut);
every button named in text drawn as its icon (`{btn:…}`; the
`shared/button-text.test.mjs` scan fails on bare button names).

## In progress

Nothing running. Next ideas are the loose ends below.

## Open questions and loose ends

- Bacterium: scripted runs reach the host in ~2–2.5 min (target 3–5);
  the SEM and DIC looks don't show the drop's edge.
- Amoeba → paramecium transition: the cell appears at about half the
  amoeba's size during the zoom.
- Split screen not tested with 3–4 players under the locked camera; a merge
  while a peek is held; the free-camera ease-back can swing ~35° in a frame.
- The reverse "super-gene" chain is designed (`zoom-chain-levels.md`) but
  not built.
