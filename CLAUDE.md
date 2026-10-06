# Claude working agreement

Repository-wide instructions for Claude Code sessions in this repository.

## Repository layout: one folder per game

`mini` is a collection. **Each top-level folder is a separate game**, apart
from `sites/`, `multiplayer/` and `local/`:

| Folder | What it is | Published at |
| --- | --- | --- |
| `hopper/` | Hopper the Grasshopper | https://hoai2k.github.io/mini/hopper/ |
| `widowsbay/` | Widow's Bay | https://hoai2k.github.io/mini/widowsbay/ |
| `bronzedrum/` | Bronze Drum | https://hoai2k.github.io/mini/bronzedrum/ |
| `tankwars/` | Tank Wars | https://hoai2k.github.io/mini/tankwars/ |
| `gliders/` | Gliders (Superflight-style gliding, 1–4 players split screen) | https://hoai2k.github.io/mini/gliders/ |
| `chat/` | Games Chat (video chat with face effects and minigames) | https://hoai2k.github.io/mini/chat/ |
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
  front of the game library page (`index.html`, newest game first by
  when it was made, so Tank Wars stays last), and a row in the table above.
- **The root holds only what is shared.** `README.md` is a list of links to
  the games and sites and nothing more; each game's details belong in its own
  README. `index.html` is the game library published at
  https://hoai2k.github.io/mini/, one card per game. `GAME_GUIDELINES.md` applies to every game.
  `MULTIPLAYER.md` explains how a game adds online play through `multiplayer/`. `.github/workflows/pages.yml`
  builds and publishes everything.

## Always commit finished work to `main`

Every task ends on `main`. When a task is complete, do not leave the work
sitting on a feature branch or uncommitted: commit it, merge it into `main`,
push `main`, and say so in the final message with the resulting commit. This
applies to documents and asset requests as much as to code, because the user
generates art from the request documents on `main`.

1. Commit the work on the session's development branch and push it.
2. Verify the change by running the checks of each game it touched. Each game's
   README lists them (for Hopper, `pnpm test`, `pnpm typecheck`, `pnpm lint`,
   `pnpm build` in `hopper/game`). For changes that affect a published build,
   confirm the deployed page still plays.
3. Merge that branch into `main` and push `main`. The GitHub Pages workflow
   (`.github/workflows/pages.yml`) then deploys every game and site.
4. Report the merge and the resulting `main` commit.

Open a pull request only when the user explicitly asks for one; otherwise merge
directly. Never merge work that is unfinished, untested, or known to be broken —
finish it or say plainly what is blocking, rather than merging a broken `main`.
When a task produces several independently useful pieces (a document, a request
list, a working feature), commit and push each to `main` as soon as it is
finished and verified rather than holding everything for one final merge.

**Image and asset requests go first.** When a task needs new artwork, write the
request entries (and regenerate the request documents) and push them to `main`
before building the feature that uses them, so the user can start generating
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
`widowsbay/intake/`, `bronzedrum/intake/`, `chat/intake/`, `gliders/intake/`). The user drops files there for
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

Use subagents where they save effort, and pick the model by the work:
`haiku` for mechanical edits, lookups and file-by-file chores; `sonnet` for
well-specified implementation, tests and reviews with a clear contract; the
default (Fable) for design, architecture, gameplay feel and anything
open-ended. Give an agent the exact files, interfaces and checks it must
satisfy so a cheaper model can finish the job without guessing.

## Deployment reminder

`main` is the deployed branch. Pushing to `main` publishes every game and site;
treat every merge as a release and check that the build succeeds afterwards.
