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

- Phase Skate was handed to a separate Astra refinement owner; root authorized M-014 in isolated source/output.
- Authored source: `hopper/3d/models/source/turbine_wasp.py`.
- Canonical sprite: `hopper/game/public/assets/enemies/turbineWasp.png`.
- Approved/corrected modelling reference: `hopper/3d/design/references/enemies/turbineWasp-turnaround.png` with correction metadata in `turbineWasp-turnaround.json`.
- Contract source: `hopper/3d/design/model-requests.md` (M-014). Contract anatomy is authoritative: exactly three ducted fans (left, right, one central tail), two dangling hooked legs, one stinger.
- Silhouette checkpoint command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/turbine_wasp.py -- silhouette`
- Full candidate command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/turbine_wasp.py -- full`
- Isolated output directory: `local/hopper-rigid-creatures/M-014/` (ignored). No production GLB or shared manifest touched.
- Frozen technical draft: exact 7.7 × 3.4 × 6.1 m, 4228/1736 triangles, LOD0/LOD1, named rigid hierarchy, compressed GLB with meshopt and KHR mesh quantization. The validator reports 334 nodes, 94 meshes, and 8 materials. Validation command:
  `node hopper/3d/models/source/validate.mjs --manifest local/hopper-rigid-creatures/M-014/manifest.json local/hopper-rigid-creatures/M-014/turbineWasp.glb`
- Required clips present and nonzero: `Hover`, `Intake_Tell`, `Dash`, `Guard_Break`, `Hit`, and `Dissolve`; `Dash` alone translates the root. Required sockets present: `Core`, `Fan.L`, `Fan.R`, `Fan.Tail`, `Hitbox.Body`, and `Landing`.
- Current outputs: `turbineWasp.glb`, `turbineWasp-uncompressed.glb`, `turbineWasp.blend`, `record.json`, `manifest.json`, `preview-front.png`, `preview-three-quarter.png`, `preview-side.png`, and `preview-top.png`, all under `local/hopper-rigid-creatures/M-014/`.
- The exporter preview-state bug is fixed in source by capturing and restoring every object location, rotation, and scale around export. Nominal rest renders now show all three fans and exact bounds.
- Visual review still rejects this draft: the enlarged almond eyes read as separate floating discs rather than painted/inset facial anatomy, so the head/eye integration remains below the canonical reference quality. Earlier buried eyes, rectangular dorsal boards, noisy generic fan materials, and crude triangular fan blades were improved, but the candidate is not approved for delivery.
- Status: frozen for Astra creative refinement; useful structural/mechanical draft only. No production GLB, shared manifest, or shared build script touched.
