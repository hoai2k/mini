# Tier A cleanup progress

This is the restart record for the mechanical cleanup pass in
`CODE-BUILT-CLEANUP.md`. Production GLBs and `manifest.json` remain untouched.
All candidates, atlases, logs, and machine-readable reports are written under
the ignored `local/hopper-tier-a/` tree.

## Pipeline

- `tier_a_batch.py` selects only manifest entries whose `processing` is
  `needs-cleanup`, decodes with the repository's cached `gltfpack`, runs Blender,
  compresses with `source/compress.mjs`, validates with `source/validate.mjs`,
  and promotes a candidate only after every check passes.
- Decode adds `-kn -ke -km` to the documented `-noq` invocation. With the
  installed gltfpack 1.2, `-noq` alone collapsed `landmarks/fields.glb` from 36
  nodes to one and removed both LOD roots. The preservation flags keep names,
  extras, and named materials through the decode.
- `tier_a_cleanup.py` preserves the imported hierarchy and empty transforms,
  merges meshes by material within each LOD, welds at 1 cm, applies Blender's
  interior-face selection/deletion, repairs normals, checks landing raycasts,
  bakes a per-model albedo/emission atlas, transfers Atlas UVs to LOD1, and
  exports without animation.
- `tier_a_preview.py` renders matched before/after studio views from the
  uncompressed job artifacts without copying candidates over production files.
- Cross-file checks compare LOD extras and socket world positions against the
  original compressed GLB. Candidates with more than two embedded images,
  changed sockets, invalid bounds/LODs, validator failures, or size-limit
  failures are deleted and recorded as failed reports.
- Source files with no embedded images keep their existing flat-color
  materials instead of receiving a redundant atlas. This applies to the
  silhouette landmarks; the two-image rule is an upper bound there, and adding
  a 2048 atlas made the first M-083 trial 4.6 times larger than its source.

## Verified candidates

### M-083 — Landmark: Crownline skyline

- Candidate: `local/hopper-tier-a/candidates/landmarks/fields.glb`
- Validator: pass against a job-local manifest containing the production bounds
  and triangle contract.
- Geometry: 17 meshes to 2; 408 vertices to 136; triangles unchanged at
  108 / 96 for LOD0 / LOD1.
- Storage: 17,540 bytes to 6,260 bytes (64.3% reduction).
- Hierarchy: LOD root extras preserved; no sockets or clips apply. The two
  merged mesh nodes remain parented under their original LOD root. Legacy
  per-tower empty pivots were retained, although this static asset has no clips.
- Textures: source contains no images, so no atlas was added. Existing flat
  color material retained; candidate also contains zero images.
- Visual QA: matched studio renders at
  `local/hopper-tier-a/previews/M-083-before.png` and
  `local/hopper-tier-a/previews/M-083-after.png` show the same silhouette,
  proportions, color, and face shading.

## Stopped candidates

- The first M-083 trial technically validated but added a redundant 2048²
  atlas to a source with no embedded images, increasing 17,540 bytes to 80,204
  bytes. That trial was discarded. The pipeline now detects this case and keeps
  flat-color materials directly; the rebuilt candidate above is smaller.

## Resume

From the repository root, run one bounded selector at a time:

```sh
python3 hopper/3d/models/source/tier_a_batch.py landmarks
python3 hopper/3d/models/source/tier_a_batch.py episode-one-static
python3 hopper/3d/models/source/tier_a_batch.py M-056
```

Use `--force` only to rebuild a completed/failed job after changing the cleanup
scripts. A normal rerun reuses already-passed reports.
