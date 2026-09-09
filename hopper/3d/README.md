# Hopper the Grasshopper · 3D edition

The 3D reinterpretation of Hopper: same title screen, music, characters, missions and painted personality, with the play rebuilt around leaping between structures in an open district and fighting shadows on the ground and in the air. Falling never kills; only shadows do.

| What | Where |
| --- | --- |
| Design and production plan | [design/source/design.md](design/source/design.md) · [Word](design/Hopper_3D_Design.docx) · [PDF](design/Hopper_3D_Design.pdf) · [HTML](design/Hopper_3D_Design.html) (also published at https://hoai2k.github.io/mini/hopper/3d/design/Hopper_3D_Design.html) |
| 3D model requests, with the rig each one needs | [design/model-requests.md](design/model-requests.md) |
| Image and texture requests, round one | [design/image-requests.md](design/image-requests.md) |
| Round two: model reference sheets (generate before modelling) | [design/image-requests-round-2.md](design/image-requests-round-2.md) |
| Round three: surfaces, Hopper effect sprites, decals, optional sky repaints (initial delivery integrated) | [design/image-requests-round-3.md](design/image-requests-round-3.md) · [textures/round3/](textures/round3/) |
| Delivered painted pack (round one) and its review page | [textures/](textures/) · [viewer/textures.html](viewer/textures.html) |
| Stand-in manifest (request ↔ stand-in ↔ final file ↔ status) | [design/standin-manifest.json](design/standin-manifest.json) |
| Procedural stand-ins (models, textures, terrain) | [standins/](standins/) |
| Stand-in review viewer | [viewer/](viewer/) · published at https://hoai2k.github.io/mini/hopper/3d/viewer/ |
| 3D controller diagram | [design/source/controller-3d.svg](design/source/controller-3d.svg) |
| Delivered architecture and props (43 painted, 28 code-built) | [models/README.md](models/README.md) · [model viewer](models/viewer.html) |
| Delivered Hopper and rider GLBs | [../models/](../models/) |

## Delivered models in the game

`hopper/3d/models/` holds the authored structures and props (43 so far, with LOD0/LOD1, sockets and machinery clips). The game swaps each one in over its stand-in at runtime: `hopper/game/src/game3d/models3d.ts` reads both manifests, loads the GLB as a child of the stand-in group, hides the stand-in's meshes and plays the idle clip. Position, visibility and the colliders derived from the stand-in stay as they are, so a delivered model needs no level change; it only has to keep the numeric landings the request lists. Flip a request to `delivered` in both manifests and it appears.

## Code-built models

The requests no painter has reached yet, but the game needs now, are exported by `hopper/game/scripts/code-models.mjs`: three.js geometry (hand-authored for the episode-one pieces M-024, M-027, M-036 and M-037; the stand-in library for the alien kits and the landmarks; the game's own heightfield for the terrain sculpts) painted with the delivered trim and terrain sheets and written to the same GLB contract as the Blender deliveries (LOD0/LOD1, sockets, landing extras, quantised and meshopt-compressed). They pass `models/source/validate.mjs`, carry `authoring: "code-built"` in `models/manifest.json`, and are marked *Code-built* in `design/model-requests.md`. They are placeholders with better clothes: a painted model at the same path replaces one with no code change. They also need a Blender clean-up pass before they count as shippable meshes (merge by material, weld, retopologise the rock and canopy shells, bake one atlas per model instead of the embedded sheets, hand-made LOD1); [models/CODE-BUILT-CLEANUP.md](models/CODE-BUILT-CLEANUP.md) is the checklist, split into a scriptable Tier A for a small local model and a judgement Tier B for a stronger model or an artist; the manifest flags each entry with `processing: needs-cleanup`.

```sh
cd hopper/game
node scripts/code-models.mjs            # rebuild every code-built entry
node scripts/code-models.mjs M-024      # one request
node ../3d/models/source/validate.mjs   # the delivery contract
node ../3d/models/source/previews.mjs   # studio previews with headless Chromium
```

The shadows, the Night Rook and Hopper's new clips have no code-built version: skeletal creatures need a modeller. The game shows a **STAND-IN ART** tag in the HUD while any of them is on screen.

## Stand-ins

Every model, texture and sky the design asks for has a procedural placeholder so the game can be built before the art arrives. `standins/src/index.js` exposes `createStandIn(id)` for every id in the manifest; the viewer shows them all, and `design/assets/` holds rendered contact sheets and one diorama per region made from them. When a real asset lands, its manifest entry flips from `stand-in` to `delivered` and the loader takes the GLB instead; nothing in gameplay code changes.

```sh
cd hopper/3d/standins
pnpm install --frozen-lockfile
pnpm test            # builds every stand-in, checks sockets, sizes, textures and the manifest
```

The viewer is a static page that loads three.js from a CDN and the stand-ins from `../standins/src/`. Serve `hopper/` with any static server and open `3d/viewer/index.html`, or use the published copy. `?diorama=<region>`, `?sheet=<name>` and `?item=<id>` pick a scene; `&shot=1` hides the panel for renders.

## Documents

`design/source/build_requests.py` is the single source for the two request documents and the manifest; edit its data and rerun it. `design/source/build_document.py` turns `design.md` into the Word file (python-docx); `build_html.py` renders the same source as a self-contained HTML page, and the PDF is that page printed by headless Chromium (LibreOffice Writer converts the Word file the same way where it is installed):

```sh
cd hopper/3d/design/source
python3 build_requests.py
python3 build_document.py
python3 build_html.py        # then print ../Hopper_3D_Design.html to ../Hopper_3D_Design.pdf
```

`publish.sh` copies the viewer, the stand-in library and the GLBs into the GitHub Pages output next to the built game; the Pages workflow runs it after the game build.
