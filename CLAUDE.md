# Claude working agreement

Repository-wide instructions for Claude Code sessions in this repository.

## Always commit finished work to `main`

Every task ends on `main`. When a task is complete, do not leave the work
sitting on a feature branch or uncommitted: commit it, merge it into `main`,
push `main`, and say so in the final message with the resulting commit. This
applies to documents and asset requests as much as to code, because the user
generates art from the request documents on `main`.

1. Commit the work on the session's development branch and push it.
2. Verify the change: run the game's checks in `hopper/game` (`pnpm test`,
   `pnpm typecheck`, `pnpm lint`, `pnpm build`) when code under `hopper/game`
   changed, and confirm the deployed page still plays for changes that affect
   the published build.
3. Merge that branch into `main` and push `main`, so the GitHub Pages workflow
   (`.github/workflows/pages.yml`) deploys the result to
   https://hoai2k.github.io/mini/hopper/.
4. Report the merge and the resulting `main` commit.

Open a pull request only when the user explicitly asks for one; otherwise merge
directly. Never merge work that is unfinished, untested, or known to be broken —
finish it or say plainly what is blocking, rather than merging a broken `main`.
When a task produces several independently useful pieces (a document, a request
list, a working feature), commit and push each to `main` as soon as it is
finished and verified rather than holding everything for one final merge.

## Two editions, one shell

`main` serves the 3D edition of Hopper by default at
https://hoai2k.github.io/mini/hopper/; the original 2D game stays playable at
the same URL with `?render=2d`. Both share the title screen, play-select, menus,
settings and audio. Keep the 2D game working: run its checks (`pnpm test`,
`pnpm typecheck`, `pnpm lint`, `pnpm build:pages` in `hopper/game`) whenever
shared code changes, and keep saves separate per edition.

The 3D design, asset requests and procedural stand-ins live in `hopper/3d/`.
The request documents (`hopper/3d/design/model-requests.md`,
`image-requests.md`) and `standin-manifest.json` are generated from
`hopper/3d/design/source/build_requests.py`; edit the data there and rerun it.
When delivered art replaces a stand-in, flip its manifest status to `delivered`
and load the real file; stand-ins remain for tests.

## Intake

`hopper/intake/` is where the user drops files for integration: artwork, audio,
models, exported data, notes from another agent. Process a drop rather than
leaving it: verify each file against what it claims to be, integrate what holds
up, and empty the folder, keeping only its README. Take artwork and
machine-readable data as delivered, but rewrite accompanying prose from what the
files actually show — a drop's write-up is intent, not repository
documentation, and it may carry another machine's paths or a status the
repository has since moved past. Treat "done" or "verified" as a claim to test;
run the check where one can be run, and record the result either way.
`hopper/intake/README.md` holds the full convention.

## Agents

Use subagents where they save effort, and pick the model by the work:
`haiku` for mechanical edits, lookups and file-by-file chores; `sonnet` for
well-specified implementation, tests and reviews with a clear contract; the
default (Fable) for design, architecture, gameplay feel and anything
open-ended. Give an agent the exact files, interfaces and checks it must
satisfy so a cheaper model can finish the job without guessing.

## Deployment reminder

`main` is the deployed branch. Pushing to `main` publishes; treat every merge as
a release and check that the build succeeds afterwards.
