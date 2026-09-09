# Code-built models: the clean-up pass they still need

The 28 manifest entries with `"authoring": "code-built"` and `"processing": "needs-cleanup"` were exported by `hopper/game/scripts/code-models.mjs` straight from three.js primitives so that episode one could be played end to end. They pass the delivery validator and look right at game distance, but they are not production meshes. The painted models from the Blender pipeline (`source/*.py`) do not need this; they were authored under `source/BUILD-CONTRACT.md`.

The work splits into two tiers. **Tier A** is mechanical: every step is a fixed recipe with a pass/fail check, and it can be handed to a small local model or a script without judgement calls. **Tier B** needs someone to look at the reference sheet and decide what the shape should be; give it to a stronger model or an artist. Do Tier A first on every file; it removes most of the bytes and the draw calls, and Tier B works on a cleaner base.

## What is wrong with them

| Problem | Where it comes from | Cost | Tier |
| --- | --- | --- | --- |
| One mesh and one node per part (a crag column is 39 meshes, a terrace step 51) | every `piece()` call becomes its own primitive | draw calls, node count, no shared vertices | A |
| Full 1024² trim sheet and terrain tiles embedded in every file, plus the emissive sheet | the exporter paints by sampling the region sheets | ~3.5–5 MB per file, the same images repeated across 28 files (the 43 painted deliveries embed theirs the same way) | A |
| Faceted shells with duplicated vertices | `faceted()` un-indexes so slate reads as cut stone | 3× the vertex count a welded, split-normal mesh needs | A |
| Hidden faces inside the model (block courses inside blocks, cap soil under turf, plate faces under decals) | parts overlap instead of joining | overdraw and wasted triangles | A |
| Box UVs with band remaps | the exporter projects UVs per primitive | stretching on tilted parts; a thin line where the band inset shows | A (bake) / B (seams) |
| LOD1 by dropping small parts and rebuilding primitives with fewer segments | `coarsen()` | silhouettes pop at the switch; some LOD1s are far below target | B |
| Stand-in-shaped kits (alien regions, landmarks) | exported from the placeholder geometry, not from the reference sheets | correct size and landings, no authored detail | B |
| Terrain sculpts as a flat 173² grid | the game's heightfield, sampled uniformly | 60k triangles where a remeshed sculpt would spend them on the cliffs | B |

## Tier A: straightforward (scriptable, small model)

Run in Blender 4.x or 5.x, headless is fine (`blender --background --python cleanup.py -- structures/fields/terraceStep.glb`). Every step names the operator; every step has a check. Do not change anything not listed. If a check fails, stop and report the file and the step; do not improvise.

**Invariants (must hold before and after):**

- The `LOD0` and `LOD1` root empties keep their names and their `extras` (`request`, `standIn`, `landings` JSON, `authoring`); the validator reads them.
- Every empty whose name starts with `Landing.` or is listed under `sockets` in `manifest.json` keeps its name and world position (tolerance 1 cm).
- LOD0 bounds stay within 12 % of the manifest `bounds` on every axis (validator rule).
- LOD1 triangle count stays below LOD0.
- No mesh is added, no material colour is changed.

**Steps, per file:**

1. **Decode.** `gltfpack -i <in>.glb -o work.glb -noq` (removes meshopt compression so Blender's importer reads it), then `bpy.ops.import_scene.gltf(filepath='work.glb')`. Check: object count equals `nodes` in the validator's line for that file.
2. **Merge by material.** For each LOD root separately: select all mesh children that share the same material name (`trim.timber`, `terrain.cliff`, …), `bpy.ops.object.join()`, rename the result `<LODn>.<materialName>`. Parent it to the LOD root. Check: each LOD root has at most one mesh per material; empties untouched.
3. **Weld.** Edit mode, select all, `bpy.ops.mesh.remove_doubles(threshold=0.01)`. Check: vertex count dropped or equal; no non-manifold spikes appear in the render (compare `previews.mjs --force` output side by side).
4. **Delete interior faces.** `bpy.ops.mesh.select_interior_faces()` then `bpy.ops.mesh.delete(type='FACE')`. Then `bpy.ops.mesh.select_all(action='DESELECT')`; select faces whose normal points into the model within closed volumes is not required. Check: triangle count did not go up; landings' top faces still exist (raycast down at each `Landing.N` position hits a face within 0.5 m).
5. **Normals.** `bpy.ops.mesh.normals_make_consistent(inside=False)`, then per object set auto smooth 30° (`mesh.set_sharp_from_angle` / `shade_smooth_by_angle`). Rock and obsidian materials (`terrain.cliff`, `trim.obsidian`, `trim.ringstone`) keep flat shading (`shade_flat`). Check: no black faces in the preview.
6. **Bake one atlas per model.** Add a second UV map `Atlas`, `bpy.ops.uv.smart_project(angle_limit=66°, island_margin=0.02)` on all LOD0 meshes together, then bake `DIFFUSE` (colour only, no lighting) and `EMIT` from the existing materials into a new 1024² image (`2048²` when the manifest `bounds` exceed 120 m on any axis). Replace every material's base colour texture with the baked albedo and its emissive texture with the baked emission; delete the trim/terrain images from the file. LOD1 shares the atlas: transfer UVs with `bpy.ops.object.data_transfer(data_type='UV')` from the LOD0 mesh of the same material. Check: only two images remain in the exported file; file size below 1.2 MB (2.5 MB for the 2048² cases).
7. **Export.** `bpy.ops.export_scene.gltf(export_format='GLB', export_extras=True, export_apply=True, export_yup=True, export_animations=False)` to `work.out.glb`, then compress with `node source/compress.mjs work.out.glb <target>.glb --force` (or `gltfpack -cc -kn -ke`). Check: `node source/validate.mjs <target>.glb` passes; `node source/previews.mjs --force <target>.glb` renders; sockets listed in the manifest are still present (the validator says so).
8. **Manifest.** In `manifest.json` set the entry's `processing` to `"cleaned-tier-a"`, record the new `triangles` and `bytes` from the validator output, keep `authoring` as is. Regenerate `validation.txt` (`node source/validate.mjs > validation.txt` from the repository root).

**Order for Tier A:** all 28 files, episode one first (M-024, M-027, M-036, M-037, terrain fields/city/mountains), then landmarks, then the alien kits. Each file is independent; they can run in parallel.

**What Tier A must not do:** retopologise, decimate, move vertices except by welding, re-author LOD1, touch the reference sheets, change any landing, or edit `hopper/game`.

## Tier B: creative and judgement (stronger model or artist)

These steps change the shape. They need the reference sheets (`design/references/kits/<region>.png`), the request text in `design/model-requests.md` (sizes, landings, sockets, triangle budgets), and a look at the result in the model viewer.

1. **Retopologise the organic shells** that came from `roughen()`: crag courses and scree, ledge shelf slab and chunks, poplar canopies, reef and coral bodies, the floating reef's roots. Remesh at a coarse voxel size, decimate to the request's triangle budget, keep the silhouette the stand-in established (the colliders come from it). Judgement: where to spend the triangles so the slate strata, the canopy layers and the coral tiers still read at 100 m.
2. **UV seams by hand** on the retopologised shells before re-baking the atlas: hide seams under ledges and in creases, keep the trim bands straight on timber and iron.
3. **Author LOD1** at roughly a third of LOD0, keeping every landing surface and the outline that matters at range (the crag's lean, the poplar column, the windbreak's line). Delete what does not read at 300 m rather than decimating uniformly.
4. **Model the alien kits from the reference sheets** rather than cleaning the stand-in shapes: M-056..067 (ivory rib arch, coral spire, basin terrace, coral bridge, floating reef, root pillar, dust current, obsidian arch, ring shard, cathedral facade, gravity seam, eclipse dais). Keep the size, the landings and the sockets the request lists; the rigid ones (coral bridge stages, floating reef, ring shard) need the pivot the request names. This is new modelling, not clean-up.
5. **Landmark silhouettes** M-083..091: decide per region whether the silhouette gets its own low-poly model with painted colour bands or stays a plain shape until the kit model exists (the design reuses the kit model at approach). Fields (Crownline skyline), city (Thunderhead summit) and mountains (the mast) matter first; they are on screen for all of episode one.
6. **Terrain sculpts** M-092: import `terrain/<region>-height.png` (16-bit; metres = value / 65535 × range + min from `heightRange` in the manifest) as a displacement on a plane, sculpt the cliffs and plateau edges so they read as painted rock rather than noise, keep plateau tops flat where the district places structures, then remesh with density on slopes and export the mesh together with a heightmap resampled from it so the game's collision still matches. Judgement throughout.
7. **Review** every result against the reference sheet in `viewer.html?model=M-0xx`; approve or send back. Set `processing` to `"cleaned"` and drop the `cleanup` pointer only after this pass.

## Per-model split

| Request | Model | Tier A | Tier B items |
| --- | --- | --- | --- |
| M-024 | Terrace step | yes | 3 (LOD1) |
| M-027 | Windbreak row | yes | 1, 2, 3 (canopies) |
| M-036 | Crag column | yes | 1, 2, 3 (courses, scree) |
| M-037 | Ledge shelf | yes | 1, 2, 3 (slab, chunks) |
| M-056..067 | Alien kits (12) | yes | 4, 3 |
| M-083..091 | Landmarks (9) | yes | 5 |
| M-092 | Terrain sculpts (3) | 6 and 7 only | 6 |

Tier A on the terrain files is bake and export only (steps 6 and 7): they are single meshes already and welding or deleting faces would change the collision match.
