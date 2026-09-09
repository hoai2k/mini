# Code-built models: the clean-up pass they still need

The 28 manifest entries with `"authoring": "code-built"` (and `"processing": "needs-cleanup"`) were exported by `hopper/game/scripts/code-models.mjs` straight from three.js primitives so that episode one could be played end to end. They pass the delivery validator and look right at game distance, but they are not production meshes. This is the list of what a Blender pass should do to each, in the order that pays off first. The painted models from the Blender pipeline (`source/*.py`) do not need this; they were authored under the contract in `source/BUILD-CONTRACT.md`.

## What is wrong with them

| Problem | Where it comes from | Cost |
| --- | --- | --- |
| One mesh and one node per part (a crag column is 39 meshes, a terrace step 51) | every `piece()` call becomes its own primitive | draw calls, node count, no shared vertices |
| Full 1024² trim sheet and terrain tiles embedded in every file, plus the emissive sheet | the exporter paints by sampling the region sheets, so each GLB carries them | ~3.5–5 MB per file; the same images repeated across 28 files (and across the 43 painted deliveries, which embed theirs the same way) |
| Faceted shells with duplicated vertices | `faceted()` un-indexes so slate reads as cut stone | 3× the vertex count a welded, split-normal mesh needs |
| Hidden faces inside the model (block courses inside blocks, cap soil under turf, plate faces under decals) | parts overlap instead of joining | overdraw and wasted triangles |
| Box UVs with band remaps, no seams thought about | the exporter projects UVs per primitive | stretching on tilted parts; the trim band inset shows as a thin line on some edges |
| LOD1 by dropping small parts and rebuilding primitives with fewer segments | `coarsen()` | silhouettes pop at the switch; a few LOD1s are far below the target |
| Stand-in-shaped kits (alien regions, landmarks) | exported from the placeholder geometry, not from the reference sheets | correct size and landings, but no authored detail |
| Terrain sculpts as a flat 173² grid | the game's heightfield, sampled uniformly | 60k triangles where a remeshed sculpt would spend them on the cliffs |

## The pass, per model

1. **Import** the GLB (Blender's glTF importer handles `KHR_mesh_quantization`; run `gltfpack -i model.glb -o model.raw.glb -noq` first if the meshopt streams are not decoded) or rebuild from the builder's parameters: `scripts/code-models/*.mjs` documents every dimension, landing and socket.
2. **Merge by material**: join all parts that share a paint (rock, turf, timber, iron) into one mesh each. Keep the `LOD0` root, the socket empties (`Landing.N` and any named socket) and the `landings` extras on the root untouched; the game and the validator read those.
3. **Weld and clean**: merge by distance (1 cm), delete interior faces, recalculate normals with autosmooth or split normals where the faceted look should stay (slate, obsidian), decimate planar regions.
4. **Retopologise the shells** that came from `roughen()`: rock courses, scree boulders, poplar canopies, reef and coral bodies. Remesh at a coarse voxel size, then decimate to the request's triangle budget (`targetBounds` and `triangles` in the manifest; the request lists the budget too).
5. **Unwrap** to one UV set per model and **bake** the trim and terrain paint into a single 1024² (2048² for the cathedral facade and the freighter-scale kits) albedo per model, with the emissive mask as a second channel where a part glows. This replaces the embedded sheets and is where most of the file size goes.
6. **Author LOD1** by hand at roughly a third of LOD0, keeping the silhouette and the landings; the validator only requires it to be lighter.
7. **Alien kits and landmarks**: this is also the point to model them from the round-two reference sheets (`design/references/kits/{red,blue,violet}.png`) rather than clean up the stand-in shapes; the request entries in `design/model-requests.md` carry the sizes, landings and sockets to keep.
8. **Terrain sculpts**: import `terrain/<region>-height.png` (16-bit; metres = value / 65535 × range + min from `heightRange` in the manifest) as a displacement, remesh with more density on slopes, keep the plateau tops flat, and export the mesh with the heightmap resampled from it so the game's collision still matches.
9. **Export** with the pipeline's settings (`source/compress_batch.py` or `gltfpack -cc -kn -ke`), then `node source/validate.mjs` and `node source/previews.mjs --force`. Change the manifest entry's `authoring` to the painted pipeline's value and drop `processing`; nothing in the game needs to change.

## Order

Episode one first, because the player sees them most: terrace step (M-024), windbreak (M-027), crag column (M-036), ledge shelf (M-037), then the three terrain sculpts. The alien kits and landmarks can wait for their districts.
