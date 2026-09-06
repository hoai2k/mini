# Mini games

Controller-first browser games. Start with [Hopper the Grasshopper](hopper/game/README.md); shared requirements are in [GAME_GUIDELINES.md](GAME_GUIDELINES.md).

Play online: **[Hopper the Grasshopper](https://hoai2k.github.io/mini/hopper/)**.

## GitHub Pages

Pushes to `main` run `.github/workflows/pages.yml`, which builds the game and deploys only `local/pages/` as the Pages artifact. The source entry is `hopper/index.html`; its compiled version is published at `/mini/hopper/index.html`. GitHub redirects `/mini/hopper` to `/mini/hopper/`.

To build locally, run `pnpm build:pages` in `hopper/game`. This uses the same game components and engine as the existing development setup, with a static entry and `/mini/hopper/` asset base. Generated files stay under `local/pages/hopper/` and are not committed. Repository Settings → Pages must use **GitHub Actions** (already configured for this repository).

## GitHub contents

Keep the source, runtime art and music, design documents and their source artwork, QA reports and tests, configuration, `package.json`, and `pnpm-lock.yaml`. The illustrated Hopper design is available as [Word](hopper/design/Hopper_Game_Design.docx) and [PDF](hopper/design/Hopper_Game_Design.pdf).

`local/` is excluded by the root `.gitignore`. It holds installed dependencies, package caches, build output, intermediate document previews, and the previous game-only Git history. Ignored symlinks at the original dependency/cache paths keep this checkout usable. Do not include those symlinks in a manual browser upload; Git excludes them automatically.

## Run after cloning

Use Node.js 22.13 or newer and pnpm:

```sh
cd hopper/game
pnpm install --frozen-lockfile
pnpm dev
```

Dependencies and build output are regenerated locally and are ignored by Git. `local/` is not needed to run a fresh clone. See the game README for controls and verification commands.
