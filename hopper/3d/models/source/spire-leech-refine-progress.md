# M006 Spire Leech art refinement

2026-09-12: Separate `spire_leech_refine.py` builds on Sol's true nine-bone scaffold in `spire_leech.py`. Outputs remain isolated in `local/hopper-spire-leech-refine/`; production integration authorized after final root review.

- Preserves seven chain bones, Head and Jaw, normalized skin groups, all seven clips, and Core/Emitter/Hitbox.Body sockets.
- Canonical turnaround inspected: slate/violet overlapping shell armor, recessed circular ivory hooked mouth and orange emitter. Initial art pass adds fourteen armor segments, thick curved mouth mandibles, dorsal thorns and a curled terminal hook.
- Both LODs are authored from the same curves, without decimating skin weights. Final authored geometry is 4,858 / 1,480 triangles at 1.3 × 1.3 × 8.2 m.
- Run Blender `--background --python hopper/3d/models/source/spire_leech_refine.py`; append `-- --qa` for three deformation samples of every clip on both LODs.
- All rest transforms are restored between render poses and around export. Existing generated hide/violet trim are used, with shell UVs constrained to a quiet painted band.
- Completed 50 QA renders: four views and start/middle/end of every clip on each LOD. Loops match endpoints, both exported skins retain nine joints, and all 11,551 exported vertices have normalized finite weights. Root accepted final appearance and both LOD deformation sheets. Integrated `enemies/spireLeech.glb`, compact `previews/enemy.spireLeech.png`, manifest metadata and delivered request documents. No commit made by the refinement agent.
- Corrected the central validator under root authorization: skinned bounds now use weighted joint world × inverse bind transforms, without applying meshWorld twice. Static asset measurement is unchanged. `skin_bounds.test.mjs` covers a small normalized-weight fixture and both raw/compressed M006 LODs. Compressed decoded dimensions: LOD0 1.299936 × 1.299937 × 8.200142 m; LOD1 1.299937 × 1.299937 × 8.200142 m. Full existing production regression passes 73/73.
- Final candidate: 3,404,984 bytes, SHA-256 `84d5c76e08d3952f792aab8aab0c8ad33e0d2c9cc187d03e1620d751e1a0d252`. `spire-leech-refine-validation.json` records the receipt.
- Dissolve QA retains a stable minimum camera span so geometric collapse remains visible. Other deformation views fit evaluated skin vertices to avoid cropping extreme bends.
