# Rigid creature candidate progress

Working area: `local/hopper-rigid-creatures/` (ignored)

## M-018 Phase Skate

- 2026-09-12: Read `model-requests.md`, `BUILD-CONTRACT.md`, `common.py`, validator, modelling notes, and the canonical turnaround.
- Build target locked to 8.7 × 0.9 × 6.1 m (+Y up, +Z forward), 3k/1k triangles.
- Identity requirements: thin blue-black armored diamond, forward eye/core, two wing pivots, three continuous segmented tail silhouettes.
- Required clips: Glide, Fade_Out, Silhouette_Hold, Fade_In, Dash, Hit, Dissolve.
- Required sockets: Core, Hitbox.Body.
- Authored source: `hopper/3d/models/source/rigid_creatures.py`.
- Canonical sprite: `hopper/game/public/assets/enemies/phaseSkate.png`.
- Approved modelling reference: `hopper/3d/design/references/enemies/phaseSkate-turnaround.png` with request metadata beside it in `phaseSkate-turnaround.json`.
- Contract source: `hopper/3d/design/model-requests.md` (M-018), plus the three-tail reconciliation in `hopper/3d/design/references/MODELLING-NOTES.md`.
- Reproduction command from repository root:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/rigid_creatures.py -- M-018`
- Isolated candidate outputs: `local/hopper-rigid-creatures/M-018/phaseSkate.glb`, `phaseSkate-uncompressed.glb`, `phaseSkate.blend`, `record.json`, `manifest.json`, `preview.png`, `preview-rear.png`, and `preview-top.png`.
- Technical validation passes: exact 8.7 × 0.9 × 6.1 m bounds, 2768/852 triangles, LOD0/LOD1, all seven clips, both sockets, meshopt compression, and KHR mesh quantization. Validation command:
  `node hopper/3d/models/source/validate.mjs --manifest local/hopper-rigid-creatures/M-018/manifest.json local/hopper-rigid-creatures/M-018/phaseSkate.glb`
- Visual review rejected the current candidate. Remaining defects: stair-stepped flat wing silhouette, insufficient shallow convex/sculpted body volume, angular strip-like tails rather than flowing curves, eye still reading pasted onto the shell, and armour/seam treatment lacking the canonical overlapping painted plate quality. The three tail pivots exist (`Tail.L`, `Tail.C`, `Tail.R`), but one silhouette becomes visually occluded/blended in the rest renders.
- Status: frozen for Astra creative handoff; no production GLB, shared manifest, or shared build script touched.

## M-014 Turbine Wasp

- Not started. Remains gated until Phase Skate reaches visual acceptance.
