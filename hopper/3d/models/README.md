# Hopper architecture and props

43 reference-authored models (plus 28 code-built entries, see below) for the future 3D game: 28 buildings / civil or industrial structures and 15 interactive props / effects. These are separate from the existing Hopper and rider rigs in `hopper/models`.

[Open the model review viewer](viewer.html). Select a model, switch LOD0 / LOD1, show sockets, and play its individual animation clips. A direct link accepts a request ID, for example `viewer.html?model=M-025`. The viewer loads Three.js from its pinned CDN import map and needs an HTTP server.

## Delivery

- `structures/<region>/*.glb`, `props/*.glb`: compressed GLBs with embedded painted textures, named pivots / sockets, and both LOD hierarchies.
- `manifest.json`: paths, dimensions, triangle counts, clips, sockets, and numeric gameplay landings.
- `previews/`: neutral-pose studio renders.
- `source/`: editable Blender builders, immutable request/stand-in snapshots, export and compression tools.
- `validation.txt`: export validation results.
- `PROGRESS.md`: restart context and deferred scope.

Models use metres, +Y up, +Z forward. A runtime must show **one LOD hierarchy at a time** and decode `EXT_meshopt_compression` / `KHR_mesh_quantization`. The viewer demonstrates this. Machinery clips animate rigid parts; these assets do not add new character animation. Existing gameplay landings are carried as metadata and named sockets. For every delivered *structure*, `collision.json` (below) now bakes real collision from these meshes, so where a delivered model's shape differs from the stand-in it replaced, Hopper's footing matches what is drawn rather than the stand-in's box.

## Collision

`collision.json` bakes, for every delivered structure, a list of axis-aligned boxes in the model's own local frame (the same frame `swapDelivered` in `hopper/game/src/game3d/models3d.ts` draws the GLB in -- a child of the stand-in group at local origin, unit scale, so no placement transform applies here; `world.ts` applies each instance's own position/yaw at runtime). `world.ts` uses these boxes instead of the stand-in's primitive-mesh boxes whenever a placement's stand-in has a delivered file, keeping the stand-in path for everything without one.

- `source/collision-audit.mjs`: measures the mismatch between a delivered GLB's own drawn top surface and the stand-in colliders it replaces, for a representative placement of each delivered structure in every district that uses it. Writes `collision-audit.md` (max/mean height difference, and the fraction of the footprint where the GLB has a surface the old collider missed -- fall-through -- or the reverse -- an invisible floor). Run it after a new delivery to see whether baking is needed: `node source/collision-audit.mjs [--out collision-audit.md] [file.glb ...]`.
- `source/bake-collision.mjs`: bakes `collision.json`. A 2 m grid over each model's LOD0 footprint, raycast down and up (the kit's surfaces are single-sided, so a downward ray only ever finds tops and an upward ray only undersides; paired and sorted by height they reconstruct real solid intervals -- tiers, a bridge deck with open air below it, and so on) and a coarser ring scan around the perimeter for near-vertical faces a vertical ray cannot see (a cylindrical tower, a curved facade). Columns are grouped by their rounded vertical extent and rectangle-merged (an X run per Z row, then merged along Z) to keep the box count sane over flat expanses; ring-scan boxes are flagged `wall: true` so gameplay code that wants a designed top (`perchNear`, signal placement) can skip a shell that is only there for `resolveWalls` to meet. Run it after a new delivery or a `bake-collision.mjs` change: `node source/bake-collision.mjs [--step 2] [file.glb ...]` (no arguments rebakes every delivered structure).

The paint comes from the previously generated trim/terrain/shadow images. Meshes were authored in Blender against the approved reference sheets; these are intentionally economical game meshes, not image-to-3D reconstructions of every painted detail. The exhaust shaft uses an open cutaway for visibility. Transparent shields need the runtime's usual transparency sorting; emitted light, damage, particles, collision and spawning remain runtime responsibilities.

## Code-built entries

Beyond the 43 Blender deliveries, the manifest carries 28 entries with `"authoring": "code-built"`: the four remaining episode-one structures (terrace step, windbreak row, crag column, ledge shelf), the twelve alien-region kit pieces, the nine landmark silhouettes and three terrain sculpts with 16-bit heightmaps. They come from `hopper/game/scripts/code-models.mjs` (three.js geometry painted with the delivered trim and terrain sheets), pass the same validator, and have previews from `source/previews.mjs`. They keep episode one playable end to end and are meant to be replaced by painted models at the same paths. Each is flagged `processing: needs-cleanup`; [CODE-BUILT-CLEANUP.md](CODE-BUILT-CLEANUP.md) is the Blender pass they need before they are shippable meshes, split into a scriptable Tier A (merge, weld, interior faces, one baked atlas, re-export, with a check per step) for a small local model and a Tier B (retopology, hand seams, authored LOD1, modelling the alien kits and landmarks from the reference sheets, terrain sculpting) for a stronger model or an artist.

## Rebuild

Requires Blender 5.2, Python 3.9+, Node.js, and gltfpack with meshopt support. No machine-specific dependencies are checked in. The compression wrapper accepts `GLTFPACK=/path/to/gltfpack`; it can also find a cached npm installation. Viewer dependencies are pinned in its import map.

From the repository root:

```sh
blender --background -t 4 --python hopper/3d/models/source/build.py
NODE=/path/to/node python3 hopper/3d/models/source/compress_batch.py
node hopper/3d/models/source/validate.mjs
```

For a selective build, append `-- M-025 M-068` to the Blender command. The source snapshots keep all 43 requests reproducible without requiring an earlier local session. Native `.blend` files, raw GLBs, per-model records and logs go to ignored `local/hopper-model-production/`. Rebuilding resets delivery status to `built-awaiting-review`; inspect the results before declaring another delivery.

This static/rigid workflow reuses Blender GLB export and gltfpack conventions from the portable Generations pipeline. It does not invoke its humanoid cleanup/Rigify stages, which do not apply to these assets.
