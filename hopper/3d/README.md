# Hopper the Grasshopper · 3D edition

The 3D reinterpretation of Hopper: same title screen, music, characters, missions and painted personality, with the play rebuilt around leaping between structures in an open district and fighting shadows on the ground and in the air. Falling never kills; only shadows do.

| What | Where |
| --- | --- |
| Design and production plan | [design/source/design.md](design/source/design.md) · [Word](design/Hopper_3D_Design.docx) · [PDF](design/Hopper_3D_Design.pdf) · [HTML](design/Hopper_3D_Design.html) (also published at https://hoai2k.github.io/mini/hopper/3d/design/Hopper_3D_Design.html) |
| 3D model requests, with the rig each one needs | [design/model-requests.md](design/model-requests.md) |
| Image and texture requests, round one | [design/image-requests.md](design/image-requests.md) |
| Round two: model reference sheets (generate before modelling) | [design/image-requests-round-2.md](design/image-requests-round-2.md) |
| Stand-in manifest (request ↔ stand-in ↔ final file ↔ status) | [design/standin-manifest.json](design/standin-manifest.json) |
| Procedural stand-ins (models, textures, terrain) | [standins/](standins/) |
| Stand-in review viewer | [viewer/](viewer/) · published at https://hoai2k.github.io/mini/hopper/3d/viewer/ |
| 3D controller diagram | [design/source/controller-3d.svg](design/source/controller-3d.svg) |
| Delivered Hopper and rider GLBs | [../models/](../models/) |

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
