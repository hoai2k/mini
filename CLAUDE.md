# Claude working agreement

## Deploy state: **ENABLED**

Deploy branch: `deploy`

This repository deploys from the `deploy` branch, not from `main`. Pushing to
`main` runs no workflow and costs nothing; the site is published only when
`deploy` is moved forward to `main`. This switch overrides every other
instruction in this file about deploying.

- **ENABLED** means deploy after every change, exactly as before the deploy
  branch existed: commit, push `main` as the rest of this file says, then
  publish it with `git push origin main:deploy`. That push deploys. A deploy
  that is already running always finishes, and pushes waiting behind it
  collapse into the newest one.
- **DISABLED** means deploys are off to save GitHub Actions minutes. Commit and
  push `main` as usual, so finished work still lands on `main`, but never push,
  merge or fast-forward `deploy`. End every change with this warning to the
  owner:
  > ⚠️ Deploys are disabled for this repo: the change is on `main` but NOT
  > deployed. The live site is still whatever `deploy` holds.
- **Turning deploys on** happens only when the owner explicitly asks to deploy,
  to enable deploys, or for a push to `main` that should go live. Change the
  heading above to `**ENABLED**`, commit and push `main`, then
  `git push origin main:deploy`. If the owner disabled the deploy workflow in
  the Actions tab, remind them to re-enable it.
- **Turning deploys off**, when the owner asks: change the heading to
  `**DISABLED**`, commit and push `main`. It costs nothing.
- `git push origin main:deploy` is always a fast-forward. Never force-push
  `deploy`. If the push is refused, `deploy` has commits `main` lacks: merge
  `origin/deploy` into `main` first, then push both.
- `.claude/hooks/deploy-guard.sh` enforces this for Claude sessions: while the
  heading says DISABLED it refuses any push to `deploy`. It reads the heading
  at the moment of the push, so flipping it to ENABLED is all it takes to let
  the push through.

Repository-wide instructions for Claude Code sessions in this repository.

## Repository layout: one folder per game

`mini` is a collection. **Each top-level folder is a separate game**, apart
from `sites/`, `multiplayer/` and `local/` (`smoothcraft/` is a Minecraft mod rather than a browser game):

| Folder | What it is | Published at |
| --- | --- | --- |
| `hopper/` | Hopper the Grasshopper | https://hoai2k.github.io/mini/hopper/ |
| `widowsbay/` | Widow's Bay | https://hoai2k.github.io/mini/widowsbay/ |
| `bronzedrum/` | Bronze Drum | https://hoai2k.github.io/mini/bronzedrum/ |
| `tankwars/` | Tank Wars | https://hoai2k.github.io/mini/tankwars/ |
| `gliders/` | Gliders (Superflight-style gliding, 1–4 players split screen); in the prototype archive, behind the invite gate | https://hoai2k.github.io/mini/gliders/ |
| `icecreamcone/` | The Ice-Cream Cone Coot (a field guide of rare birds from Arnold Lobel's book, with a minigame for each) | https://hoai2k.github.io/mini/icecreamcone/ |
| `onemonster/` | One Monster After Another (after Mercer Mayer's book: play each monster as it snatches the letter from the last, as a side-scrolling Adventure or as minigames, alone or two players head to head); in the prototype archive, behind the invite gate | https://hoai2k.github.io/mini/onemonster/ |
| `fibreart/` | Fibre Art (a shifting collage after the fibre art, paintings and drawings of Hanneke de Neve: controllers move, stretch, swirl and dissolve the parts of her pictures) | https://hoai2k.github.io/mini/fibreart/ |
| `percyjackson/` | Half-Blood Quests (a Percy Jackson co-op dungeon crawler in the style of Minecraft Dungeons; style references in `reference/` are private) | https://hoai2k.github.io/mini/percyjackson/ |
| `aiching/` | Ai-Ching (an I Ching reader styled like an AI prompt: a question seeds the cast and shapes the reading) | https://hoai2k.github.io/mini/aiching/ |
| `eartrainer/` | Ear Trainer (hear a melody, play it back on a 1.5-octave piano; after the Chet app) | https://hoai2k.github.io/mini/eartrainer/ |
| `musicpractice/` | Music Practice (a metronome, a tuner, a drone, and a Playback Recorder that hears when you start and stop playing and plays each take back); its iOS and Android apps (Capacitor, with Music Practice Pro) are in `musicpractice/mobile/` | https://hoai2k.github.io/mini/musicpractice/ |
| `bookzam/` | Bookzam (Shazam for books: photos of shelves become book and board game catalogues, and Find Book circles a named book in a photo; photos are read on the device with PaddleOCR models and books identified on Open Library); in the prototype archive, behind the invite gate | https://hoai2k.github.io/mini/bookzam/ |
| `stocks/` | Stocks (stock and ETF charts with total return: price only, with dividends, or dividends reinvested; live data through its own `mini-stocks` Cloudflare Worker in `stocks/server/`, separate from the relay) | https://hoai2k.github.io/mini/stocks/ |
| `mp3player/` | MP3 Player (the music files on the device, played like a streaming app: songs, albums, artists, shuffle, repeat, a queue and a custom order; songs are copied into the browser's storage, never changed on the device) | https://hoai2k.github.io/mini/mp3player/ |
| `imageannotator/` | Image Annotator (open a picture, point things out with arrows, circles and free drawing, each with an optional title that is placed clear of the others; save, then export as the original format, JPEG or JPEG for web) | https://hoai2k.github.io/mini/imageannotator/ |
| `meditation/` | Meditation Timer (a sitting timer: a preroll to settle, 5 seconds by default, then a starting chime, the time, and an ending chime; singing bowls, rin, tingsha, Koshi chimes or a temple bell, recorded or synthesized) | https://hoai2k.github.io/mini/meditation/ |
| `micro/` | Micro Zoom (play as microscopic creatures: the game shell in `micro/game/` hosts the worlds in `micro/prototypes/` (springtail, mite, tardigrade, amoeba, Paramecium, bacterium, phage, each in a different microscope look) and zooms between them; a cited research atlas in `micro/research/` and the Zoom Chain level spec in `micro/design/`); in the prototype archive, behind the invite gate | https://hoai2k.github.io/mini/micro/ (prototypes at `/micro/prototypes/`) |
| `smoothcraft/` | Smoothcraft (a Minecraft Java Edition mod for Fabric: smooth terrain, rounded mobs, physically based materials and lighting, high-resolution textures from its image requests); a Gradle project in `smoothcraft/mod/`, not a browser game, so it has no `publish.sh`, Pages step or library card; `pages.yml` skips pushes that only change `smoothcraft/` | — |
| `chat/` | Games Chat (video chat with face effects and minigames); its iPhone/iPad app, calls server and TestFlight guide are in `chat/ios/` | https://hoai2k.github.io/mini/chat/ |
| `multiplayer/` | Shared online-multiplayer relay (Cloudflare Worker) and its browser client, used by any game; see `MULTIPLAYER.md` | https://mini-rooms.hoai2k.workers.dev |
| `sites/` | A collection of websites (band, label and other pages), not a game | https://hoai2k.github.io/mini/sites/<name>/ |
| `local/` | Ignored by Git: dependencies, caches and build output | — |

- **Keep each game inside its own folder.** Its code, design documents, asset
  requests, art, audio, tests, publish script and intake drop box all live
  there. Never put one game's files in another game's folder. In particular,
  `hopper/` belongs to Hopper alone: don't use `hopper/intake/` or anything
  else under `hopper/` for another game.
- **A new game gets a new top-level folder** with a `README.md`, an `intake/`
  folder (holding only its README), and a `publish.sh` that copies the
  playable build into `local/pages/<folder>/`. Add a step for it to
  `.github/workflows/pages.yml`, a link in the root `README.md`, a card at the
  front of the game library page (`index.html`): newest game first by when it
  was made, so Tank Wars comes last; Fibre Art sits after Kingdom of the
  Fairies at the owner's request, and a row in the table above.
- **The root holds only what is shared.** `README.md` is a list of links to
  the games and sites and nothing more; each game's details belong in its own
  README. `index.html` is the game library published at
  https://hoai2k.github.io/mini/, one card per game. Apps (tools such as Ear Trainer,
  Ai-Ching, Music Practice, Stocks, MP3 Player, Image Annotator and Meditation Timer) go on its mini apps shelf below the games, with Music
  Practice pinned first and Games Chat second, then the rest newest first. Games that haven't turned out as hoped yet are listed as
  plain links in its Prototype archive, at the bottom. The games shelf also
  carries cards for invite-only games from the `swingers` repository (Spider
  Swingers, Wobblers, Wobbly Battles and Swingers, published at
  `/swingers/...` on the same site). Their gates ignore the public-access
  switch, so their cards sit in `<template data-invite>` blocks that the
  library reveals only to visitors holding an invite pass, like the archive;
  they keep the shelf's newest-first order. `GAME_GUIDELINES.md` applies to every game.
- **The Prototype archive is code-locked.** The library shows it only to
  visitors holding an invite pass, and every game or app listed there sits
  behind the shared invite gate opened with `ignorePublicAccess: true`, so the
  owner's public-access switch (`/public-access.json` in `hoai2k.github.io`)
  never opens a prototype. Moving a game or app into the archive means adding
  that gate (copy `onemonster/game/src/gate/gate.js` byte for byte, open it
  from a `boot.js` the way One Monster and Gliders do); moving one out to a
  shelf means dropping `ignorePublicAccess` (or the gate) as the owner wants.
  Each locked game or site also carries its own `public-access.json` beside
  its `index.html`, holding `{ "followPublicAccess": false }` and named in
  its gate call as `accessFile: 'public-access.json'` (publish it with the
  game). Setting it to `true` makes that one game or site follow the
  public-access switch like the finished games, with no code change; a
  missing or broken file keeps it locked. The private test sites in `sites/`
  (see `sites/shared/README.md`) follow the same rule.
  `MULTIPLAYER.md` explains how a game adds online play through `multiplayer/`. `.github/workflows/pages.yml`
  builds and publishes everything.

## Always commit finished work to `main`

Every task ends on `main`. When a task is complete, do not leave the work
sitting on a feature branch or uncommitted: commit it, merge it into `main`,
push `main`, and say so in the final message with the resulting commit. This
applies to documents and asset requests as much as to code, because the user
generates art from the request documents on `main`.

1. Commit the work on the session's development branch as each piece is
   finished, and push the branch (pushes to a working branch run nothing).
2. Verify the change by running the checks of each game it touched. Each game's
   README lists them (for Hopper, `pnpm test`, `pnpm typecheck`, `pnpm lint`,
   `pnpm build` in `hopper/game`). This is the only place the tests run: a
   deploy builds and publishes without them (see "Tests and deploys" below).
   For changes that affect a published build, confirm the deployed page still
   plays.
3. Merge that branch into `main` and push `main`, once, at the end of the task,
   then (while deploys are ENABLED, see "Deploy state" above) publish it with
   `git push origin main:deploy`. The GitHub Pages workflow
   (`.github/workflows/pages.yml`) then builds and deploys every game and site;
   a game whose build fails keeps its live copy and the run says so in a
   warning.
4. Report the merge and the resulting `main` commit.

Open a pull request only when the user explicitly asks for one; otherwise merge
directly. Never merge work that is unfinished, untested, or known to be broken —
finish it or say plainly what is blocking, rather than merging a broken `main`.
When a task produces several independently useful pieces (a document, a request
list, a working feature), commit each as soon as it is finished and verified,
and push them to `main` together at the end of the task.

**Image and asset requests go first.** They are the one exception to a single
push at the end: when a task needs new artwork, write the request entries (and
regenerate the request documents) and push them to `main` before building the
feature that uses them (a push to `main` deploys nothing, so this costs no
Actions minutes), so the user can start generating
while the rest is written. The game keeps drawing its stand-ins until the art
arrives.

## Hopper: two editions, one shell

`main` serves the 2D edition of Hopper at https://hoai2k.github.io/mini/hopper/:
the regular title screen has one Play button. `?render=3d` loads the 3D edition
and shows a button for each edition on the title screen. Switching rebuilds the
engine and its canvas in place rather than reloading. Both share the title
screen, play-select, menus, settings and audio. Keep the 2D game working: run
its checks (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build:pages` in
`hopper/game`) whenever shared code changes, and keep saves separate per
edition.

The 3D design, asset requests and procedural stand-ins live in `hopper/3d/`.
The request documents (`hopper/3d/design/model-requests.md`,
`image-requests.md`) and `standin-manifest.json` are generated from
`hopper/3d/design/source/build_requests.py`; edit the data there and rerun it.
When delivered art replaces a stand-in, flip its manifest status to `delivered`
and load the real file; stand-ins remain for tests.

## Intake

Each game has its own drop box at `<game>/intake/` (`hopper/intake/`,
`widowsbay/intake/`, `bronzedrum/intake/`, `chat/intake/`, `gliders/intake/`, `icecreamcone/intake/`, `onemonster/intake/`, `fibreart/intake/`, `percyjackson/intake/`, `aiching/intake/`, `eartrainer/intake/`, `musicpractice/intake/`, `bookzam/intake/`, `stocks/intake/`, `mp3player/intake/`, `imageannotator/intake/`, `meditation/intake/`, `micro/intake/`, `smoothcraft/intake/`). The user drops files there for
integration: artwork, audio, models, exported data, notes from another agent.
A file belongs to the game whose intake it was dropped in. If it plainly
belongs to a different game, move it there; if that is unclear, ask.

Process a drop rather than leaving it: verify each file against what it claims
to be, integrate what holds up, and empty the folder, keeping only its README.
Take artwork and machine-readable data as delivered, but rewrite accompanying
prose from what the files actually show — a drop's write-up is intent, not
repository documentation, and it may carry another machine's paths or a status
the repository has since moved past. Treat "done" or "verified" as a claim to
test; run the check where one can be run, and record the result either way.
Each intake README says where that game's files land; `hopper/intake/README.md`
spells out the processing steps in full.

## Agents

Use subagents where they save effort, and pick the model by the work (see
"Models" below): `sonnet` for mechanical edits, lookups, file-by-file chores,
well-specified implementation, tests and reviews with a clear contract; `opus`,
or the model left unset so it inherits, for design, architecture, gameplay
feel and anything open-ended. Give an agent the exact files, interfaces and
checks it must satisfy so a cheaper model can finish the job without guessing.

## No Git LFS

Don't use Git LFS anywhere in this repository: don't track new files with
it, and don't update the one file already in it
(`smoothcraft/dist/smoothcraft-0.1.0.jar`, kept as it is at the owner's
request). GitHub never frees LFS storage: a deleted or replaced LFS file keeps
counting against the account's 10 GiB until the whole repository is deleted
and recreated, and the allowance is shared by every project. Files over
GitHub's 100 MB limit go somewhere else (a GitHub Release, which the owner
creates), or ask.

## Tests and deploys

Deploys (pushes to `deploy`) build and publish only; they run no tests. Tests
are your job before you commit:

- Run the checks of each game your change touches (each game's README lists
  them; for Hopper, `pnpm test`, `pnpm typecheck`, `pnpm lint`,
  `pnpm build:pages` in `hopper/game`). For a change to shared files (root
  `index.html`, `multiplayer/`, the workflow), run every game's checks.
- Say in the commit message what you ran and that it passed.
- The full tests can also be run on demand: Actions → Deploy games to GitHub
  Pages → Run workflow → tests: full. iOS builds (`chat-ios.yml`) run only
  that way.
- The one exception is the multiplayer relay: `relay.yml` runs
  `multiplayer/server`'s `npm test` on every deploy that changes it and will not
  deploy on a failure, because every online game shares that live server. Run
  the tests before committing anyway.

Every deploy is paid for in GitHub Actions minutes while the repository is
private, so batch a task's work into one deploy at the end rather than
deploying after every small step. Pushes to `main` and to working branches run
nothing. A deploy
that is already running always finishes — never cancel one unless the owner asks
— and pushes waiting behind it collapse into the newest one. Pushes that only
change Markdown or `.claude/` don't deploy at all (`paths-ignore` in the deploy
workflow), and every workflow job carries a `timeout-minutes`, so a hung run
cannot bill for hours. Keep all three when editing a workflow.

## Models

- Only a session already running on Fable may start Fable subagents, workers or helper agents. Opus,
  Sonnet and every other model never pass model "fable"; they leave the model unset so it inherits, or
  pick Opus or Sonnet.
- Don't switch a session to Fable on your own. If a task seems to need Fable, ask me first and say why.
- This is enforced in `.claude/settings.json`: sessions in this repository default to Opus, and a
  PreToolUse hook (`.claude/hooks/block-fable.sh`) reads the calling model from the transcript and
  refuses a subagent or workflow call that asks for Fable unless the caller is itself Fable. When I ask
  for Fable, switch the main session with `/model`; don't edit the hook to get round it.

## Deployment reminder

`deploy` is the deployed branch. Pushing it (`git push origin main:deploy`)
publishes every game and site, the multiplayer relay and the Stocks Worker when
they changed; treat every deploy as a release and check that the build succeeds
afterwards.
