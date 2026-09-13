# Code-built models: Tier A cleanup record

## Tier A result: 27 of 28 delivered

- Twenty-seven mechanical candidates are delivered. M-056 Ivory rib arch is the
  sole hold: its unchanged source geometry has no downward face within 0.5 m of
  the authored `Landing.0`, so the cleanup correctly refuses to relax the
  gameplay contract.
- M-057/058 (`4c0bc91`), M-062/063/065 (`d0b9106`), M-061 plus fields terrain
  (`42aa735`), city/mountains terrain (`f169534`), and M-067 (`879f691`) are
  delivered after matched LOD review. M-067 removes two exact coincident ring
  faces (LOD1 124 to 122) with explicit source/import topology evidence.
- Functional models use a separate rigid-owner branch. M-060 Floating reef and
  M-064 Ring shard were delivered in `1135ed2`; M-059 Coral bridge and M-066
  Gravity seam were delivered in `1f00d9a`. The branch preserves protected node
  parents, local transforms, extras, and triangles by rigid subtree, and merges
  only inside one owner. M-059 preserves the source's three stage pivots. Its
  `Landing.0`–`Landing.2` nodes remain siblings of the stages under each LOD root,
  exactly as authored; cleanup does not invent a new landing-parent relationship.
- Quality-preserving exceptions to the original bake recipe retain original
  textures where atlasing loses painted detail or LOD readability: M-036,
  M-059, M-060, M-064, M-067, and all three terrain files. M-061 uses 2048
  quality-92 JPEG albedo and emission atlases. These are mechanical deliveries,
  not Tier B art approval. See the per-model progress record for measured bounds,
  bytes, and retained textures.
- M-024 Terrace step, M-027 Windbreak row, and M-036 Crag column: delivered after matched review of both LODs (`52f8a38`). M-037 Ledge shelf is also delivered at 1,197,276 bytes after matched LOD0/LOD1 review.
- All nine landmarks, M-083–M-091, are delivered after matched before/after render review and full model validation. They retain their original untextured color materials and unchanged LOD triangle counts. M-083 merged 17 meshes to 2 and reduced 17,540 bytes to 6,260; M-089's corrected candidate preserves 928/118 triangles and passed separate LOD1 comparison (`4607af3`). Tier B remains pending.
- Repeatable candidate-only scripts: `source/tier_a_batch.py`, `source/tier_a_cleanup.py`, `source/tier_a_preview.py`. Decode must use `-noq -kn -ke -km`; `-noq` alone discards hierarchy with the installed gltfpack. Detailed restart evidence is in `source/tier-a-progress.md`.

The 28 manifest entries whose `authoring` begins with `code-built` and whose
`cleanup` points here were exported by
`hopper/game/scripts/code-models.mjs` straight from three.js primitives so that
episode one could be played end to end. Twenty-seven now record
`"processing": "cleaned-tier-a"`; M-056 remains `"needs-cleanup"` with its
failed landing evidence. These remain stand-in shapes pending Tier B art review.
The painted models from the Blender pipeline (`source/*.py`) do not need this;
they were authored under `source/BUILD-CONTRACT.md`.

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
- Functional rigid nodes keep the same parent, local matrix, extras, and triangle ownership. A merge may not cross a protected stage, root, or arrow pivot.
- LOD0 bounds stay within 12 % of the manifest `bounds` on every axis (validator rule).
- LOD1 triangle count stays below LOD0.
- No mesh is added, no material colour is changed.

**Steps, per file:**

1. **Decode.** `gltfpack -i <in>.glb -o work.glb -noq -kn -ke -km`
   removes meshopt compression while preserving names, extras, and materials,
   then Blender imports `work.glb`. Check compressed-source, decoded, and Blender
   import triangle counts separately; only M-067 has a reviewed import exception.
2. **Merge by material.** For ordinary static models, merge separately under
   each LOD root. For functional models, assign every mesh to its nearest
   protected rigid owner and merge only within that subtree. Bake geometry into
   that owner's local space and export transforms verbatim.
3. **Weld.** Edit mode, select all, `bpy.ops.mesh.remove_doubles(threshold=0.01)`.
   Roll back the weld for that mesh if its triangle count changes.
4. **Delete interior faces.** Run `bpy.ops.mesh.select_interior_faces()`, but roll
   back deletion whenever it selects any face. Blender misclassified visible
   overlapping shells in M-089, so speculative removal is not accepted. Every
   landing must still raycast to a face within 0.5 m.
5. **Normals.** `bpy.ops.mesh.normals_make_consistent(inside=False)`, then per object set auto smooth 30° (`mesh.set_sharp_from_angle` / `shade_smooth_by_angle`). Rock and obsidian materials (`terrain.cliff`, `trim.obsidian`, `trim.ringstone`) keep flat shading (`shade_flat`). Check: no black faces in the preview.
6. **Bake one atlas per model.** Add and activate `Atlas` only after pinning every
   implicit source texture node to the original UV map. Bake LOD0, transfer from
   the active LOD0 source to LOD1, and make Atlas the sole exported TEXCOORD_0.
   Retain source textures for the quality exceptions listed above.
7. **Export.** Export with `export_apply=False`, `export_extras=True`, and
   `export_animations=False` only after proving the source and manifest contain
   no clips. Compress with `source/compress.mjs`, run the per-candidate validator,
   and inspect matched LOD0 and LOD1 before/after renders.
8. **Manifest.** In `manifest.json` set the entry's `processing` to `"cleaned-tier-a"`, record the new `triangles` and `bytes` from the validator output, keep `authoring` as is. Regenerate `validation.txt` (`node source/validate.mjs > validation.txt` from the repository root).

**Tier A status:** 27 delivered; M-056 held. Do not rebuild an accepted candidate
without regenerating both LOD comparisons and repeating the full validator.

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
