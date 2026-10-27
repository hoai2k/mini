# Hopper the Grasshopper

A controller-first platformer, published at https://hoai2k.github.io/mini/hopper/
(2D edition; `?render=3d` loads the 3D edition). Controls and verification
commands are in [`game/README.md`](game/README.md). The 3D design, asset
requests and stand-in viewer are in [`3d/README.md`](3d/README.md). The
illustrated design is available as [Word](design/Hopper_Game_Design.docx) and
[PDF](design/Hopper_Game_Design.pdf). The music is by Space Tiber, whose
artist page is at [`../sites/space-tiber/`](../sites/space-tiber/).

## Folder contents

- `game/`: source, runtime art and music, QA reports and tests, configuration,
  `package.json` and `pnpm-lock.yaml`.
- `design/`: design documents and their source artwork.
- `models/`: the delivered Hopper GLBs.
- `3d/`: the 3D design, asset requests and procedural stand-ins.
- `intake/`: the drop box for Hopper files handed to Claude. It is emptied once
  its contents land; [`intake/README.md`](intake/README.md) describes how a
  drop is processed.
- `index.html`: the static entry for the Pages build.

## Run after cloning

Use Node.js 22.13 or newer and pnpm:

```sh
cd hopper/game
pnpm install --frozen-lockfile
pnpm dev
```

Dependencies and build output are regenerated locally and ignored by Git.

## GitHub Pages

Deploys (pushes to the `deploy` branch, see "Deploy state" in the root
`CLAUDE.md`) run `.github/workflows/pages.yml`, which builds Hopper and
publishes the other games and sites beside it. The source entry is
`hopper/index.html`, and its compiled version is published at
`/mini/hopper/index.html`; GitHub redirects `/mini/hopper` to `/mini/hopper/`.

To build locally, run `pnpm build:pages` in `hopper/game`. This uses the same
components and engine as the development setup, with a static entry and a
`/mini/hopper/` asset base. Generated files go under `local/pages/hopper/` and
are not committed.

`local/` at the repository root is ignored by Git. It holds installed
dependencies, package caches, build output, intermediate document previews and
the previous game-only Git history. Ignored symlinks at the original
dependency and cache paths keep the checkout usable; leave them out of a manual
browser upload (Git already excludes them).
