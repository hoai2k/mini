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

Models use metres, +Y up, +Z forward. A runtime must show **one LOD hierarchy at a time** and decode `EXT_meshopt_compression` / `KHR_mesh_quantization`. The viewer demonstrates this. Machinery clips animate rigid parts; these assets do not add new character animation. Existing gameplay landings are carried as metadata and named sockets; the model meshes themselves are not a new collision implementation. This delivery does not switch the live game from stand-ins to these models.

The paint comes from the previously generated trim/terrain/shadow images. Meshes were authored in Blender against the approved reference sheets; these are intentionally economical game meshes, not image-to-3D reconstructions of every painted detail. The exhaust shaft uses an open cutaway for visibility. Transparent shields need the runtime's usual transparency sorting; emitted light, damage, particles, collision and spawning remain runtime responsibilities.

## Code-built entries

Beyond the 43 Blender deliveries, the manifest carries 28 entries with `"authoring": "code-built"`: the four remaining episode-one structures (terrace step, windbreak row, crag column, ledge shelf), the twelve alien-region kit pieces, the nine landmark silhouettes and three terrain sculpts with 16-bit heightmaps. They come from `hopper/game/scripts/code-models.mjs` (three.js geometry painted with the delivered trim and terrain sheets), pass the same validator, and have previews from `source/previews.mjs`. They keep episode one playable end to end and are meant to be replaced by painted models at the same paths. Each is flagged `processing: needs-cleanup`; [CODE-BUILT-CLEANUP.md](CODE-BUILT-CLEANUP.md) is the Blender pass they need (merge, weld, retopology, one baked atlas per model, authored LOD1) before they are shippable meshes.

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
