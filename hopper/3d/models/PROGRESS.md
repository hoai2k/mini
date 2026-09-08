# Restart checkpoint — high-confidence batch complete, work PAUSED

Saved 2026-09-08. Latest user instruction: finish the current models, commit/push main, stop for the day, and retain context. **Do not start medium-high models until the user asks to resume.**

## Delivered batch

43 reference-authored GLBs: M025, M026, M028, M029–035, M038–040, M041–055, M068–082. This is 28 structures and 15 props/effects. Delivery lives in `hopper/3d/models`; the existing Hopper, boy and combined GLBs under `hopper/models` were untouched.

Each new model includes LOD0 + LOD1, embedded painted textures where appropriate, named attachment sockets and rigid-part clips where applicable. Solid-colour effect meshes are intentional. Landings retain the original numeric stand-in contracts. README explains runtime loading, compression, transparent effects and collision responsibilities. This batch is stored for future integration: the live game continues using its existing loading/stand-in behavior.

Review at `https://games.hoai.net/mini/hopper/3d/models/viewer.html` after Pages deployment, or serve the repo and open `/hopper/3d/models/viewer.html`. Query `?model=M-046` selects the crane. Viewer has clip controls, Rest pose, LOD controls, socket overlays and a hideable panel.

## Validation and corrections

- Final results: 43/43 strict GLB checks; 43/43 independent triangle budgets; 92/92 required sockets; all three transparency audits passed.
- Strict GLB report: `validation.txt`. Checks all manifest files, compression, LODs, bounds, buffers, animation channels and sockets. Missing files now fail.
- Independent audit compares original triangle budgets and required sockets, rather than merely trusting the generated manifest.
- Stand-in regression suite: 1,121 checks passed across 85 stand-ins, 13 textures, 179 requests.
- All 43 published file paths and viewer verified by a local `publish.sh` dry run.
- Visual review: rendered contact sheets and per-model previews; browser checked painted GLB loading, crane hoist, clip UI and socket overlay. Pilot viewer tests also checked LOD switching.
- Fixed NLA default-pose contamination: tracks remain muted in native models; Blender temporarily unmutes each while exporting its independent clip. Default poses and bounds now match source.
- Fixed a Blender crash from long decimal-number object-name suffixes in M054; use short integer IDs for generated names.
- Corrected six size mismatches without changing required sockets/landings. Silo's roof summit remains at y26, with an offset grain flue completing the 32m silhouette. M054 intentionally has a cutaway wall for visible baffles.
- Translucent dome/gate/shield materials verified as glTF BLEND; surrounding machinery and contour seams remain opaque.

## Reproduction / local state

Source: `models/source/{common,build,rural,architecture,props}.py`; source request and numeric stand-in snapshots included. `compress_batch.py` builds the complete delivery manifest; `validate.mjs` checks it. See README for commands. Rebuilding resets status to awaiting review.

Native `.blend`, raw GLBs, records, logs and contact sheets are in ignored `local/hopper-model-production/`. Keep these local. Preexisting untracked `hopper/design/tripo/` is unrelated and must not be staged as part of this batch.

Tools on this Mac:
- Blender: `/Applications/Blender.app/Contents/MacOS/Blender`; requires an escalated launch in this environment, otherwise it crashes at startup.
- Node: `/Users/hoai/.local/opt/node/bin/node`.
- Portable pipeline: `/Users/hoai/Documents/Stuff/Generations/portable-3d-model-pipeline-macOS-release`. Its humanoid cleanup/Rigify workflow does not apply here; the static builder uses Blender export and the same gltfpack compression conventions.
- A local HTTP server was available on port 8877; restart if needed with Python's `http.server` from the repository root.

Main was fast-forwarded to `65ad10d` before this delivery, preserving newer gameplay changes. Find this batch's final commit with `git log -1 -- hopper/3d/models`; the commit itself contains this restart note. Local `local/hopper-model-production/HANDOFF.md` records the final pushed SHA after commit.

## Deferred — do not begin automatically

Medium-high-confidence scope previously authorized but now explicitly paused:
- Natural/alien environment structures, nine landmarks and terrain.
- Armoured/segmented enemies: Window Ray, Spire Leech, Crag Tortoise, Seed Spitter, Chain Manta, Ballast Crab, Turbine Wasp, Basalt Burrower, Phase Skate.
- Smelter Leviathan.

Organic Hounds, Condor, Wraith, Choir, Medusa, Stalker, Cantor, Night Rook, Regent, and further Hopper/rider animation work remain outside that confidence batch. Read `design/model-requests.md` and `design/references/MODELLING-NOTES.md` before resuming. Reconcile anatomy, deformation and gameplay contracts before building creatures. User permits simpler agents for bounded/simple work and Astra high for creative/complex work. Save state at each completed batch.
