# Claude working agreement

Repository-wide instructions for Claude Code sessions in this repository.

## Always merge finished work to `main`

When a task is complete, do not leave the work sitting on a feature branch.

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

## Deployment reminder

`main` is the deployed branch. Pushing to `main` publishes; treat every merge as
a release and check that the build succeeds afterwards.
