# Tier A cleanup progress

This is the restart record for the mechanical cleanup pass in
`CODE-BUILT-CLEANUP.md`. Root has reviewed, integrated, and validated all nine
static landmark candidates. In-progress candidates, atlases, logs, and
machine-readable reports remain under the ignored `local/hopper-tier-a/` tree;
this runner never edits production GLBs or `manifest.json` itself.

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
  bakes static part transforms into LOD-root space before merging by material,
  welds at 1 cm, repairs normals, checks landing raycasts, bakes a per-model
  albedo/emission atlas, transfers Atlas UVs to LOD1, and exports without
  animation. Baking transforms before the join avoids unrepresentable shear
  and the inflated bounds first exposed by M-027 and M-036.
- Blender's `select_interior_faces` classified 30 visible M-089 LOD1 ring faces
  as interior. The cleanup now snapshots each welded mesh and rolls deletion
  back whenever the operator selects any faces. It records the attempted count
  and `skipped-conservative`; silhouette preservation takes precedence over a
  speculative hidden-face reduction.
- Source image nodes are pinned to their original UV before Atlas becomes the
  active bake layer. LOD0 material islands occupy deterministic non-overlapping
  cells, and LOD1 receives Atlas from the active LOD0 source. The original
  implementation made LOD1 active, reversing Blender's data transfer and
  overwriting the packed LOD0 Atlas with tiled UVs. Final UV data is copied
  into primary TEXCOORD_0 and asserted to remain within 0..1 before export.
- `tier_a_preview.py` renders matched before/after studio views from the
  uncompressed job artifacts without copying candidates over production files.
- Cross-file checks compare LOD extras and socket world positions against the
  original compressed GLB. Candidates with more than two embedded images,
  changed sockets, invalid bounds/LODs, validator failures, or size-limit
  failures are deleted and recorded as failed reports.
- Blender records exact decoded vertex bounds before and after cleanup and
  requires each axis to stay within 1 cm. The job-local validator uses those
  exact source bounds because transforming compressed accessor AABB corners can
  overestimate rotated assemblies (M-036 recorded 59.357 m in X while its
  decoded vertices span 52.003 m).
- This is intentionally a static export path. The runner and Blender script
  reject a source before cleanup if either the GLB contains animations or the
  manifest declares clips, and the final cross-file check requires zero source
  and candidate animations. A separately reviewed path is required for any
  animated or functional rigid pivot; `export_animations=False` is never used
  on such an input.
- Source files with no embedded images keep their existing flat-color
  materials instead of receiving a redundant atlas. This applies to the
  silhouette landmarks; the two-image rule is an upper bound there, and adding
  a 2048 atlas made the first M-083 trial 4.6 times larger than its source.

## Integrated landmarks

All nine landmarks have zero clips and zero glTF animations. LOD0 and LOD1
visual comparisons preserve their silhouettes and colors. Root integrated them
in commits `7e6d7f9` (M-083), `06894cc` (M-084..088, M-090..091), and `4607af3`
(M-089 after the LOD1 ring fix), with the full production validator at 71/71.

| Request | Candidate bytes | Reduction | LOD0 / LOD1 triangles |
| --- | ---: | ---: | ---: |
| M-083 | 6,260 | 64.3% | 108 / 96 |
| M-084 | 3,604 | 45.8% | 34 / 8 |
| M-085 | 5,568 | 44.1% | 124 / 36 |
| M-086 | 5,284 | 34.3% | 84 / 72 |
| M-087 | 6,952 | 41.3% | 416 / 112 |
| M-088 | 10,612 | 27.3% | 640 / 192 |
| M-089 | 10,312 | 38.6% | 928 / 118 |
| M-090 | 5,056 | 43.7% | 360 / 80 |
| M-091 | 8,104 | 42.0% | 512 / 28 |

The landmark contact sheets are
`local/hopper-tier-a/previews/landmarks-M084-M087-contact.png` and
`local/hopper-tier-a/previews/landmarks-M088-M091-contact.png`. M-089 also has
the explicit LOD1 pair `M-089-before-lod1.png` / `M-089-after-lod1.png`.

## Integrated episode-one static candidate

- M-037 Ledge shelf passed unchanged 1,052 / 312 triangle counts, exact decoded
  bounds, landing raycast, final Atlas range, size limit, and matched LOD0 and
  LOD1 renders. Root integrated it in `068ac04`; the production validator passed
  72/72.

## First accepted candidate detail

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
- M-024, M-027, and M-036 remain in candidate QA. Their first atlas export
  passed some numeric checks but visibly mapped a tiled UV set across the new
  atlas. The failure is fixed and guarded as described above. M-027 and M-036
  have been rebuilt with passing numeric reports but still need refreshed dual
  LOD review. M-024 also passes after retaining the 1024 atlas resolution and
  storing its opaque albedo as JPEG quality 92; PNG exceeded the 1.2 MB limit.
  It still needs refreshed dual LOD review before production integration.

## Resume

From the repository root, run one bounded selector at a time:

```sh
python3 hopper/3d/models/source/tier_a_batch.py landmarks
python3 hopper/3d/models/source/tier_a_batch.py episode-one-static
python3 hopper/3d/models/source/tier_a_batch.py M-056
```

Use `--force` only to rebuild a completed/failed job after changing the cleanup
scripts. A normal rerun reuses already-passed reports.

Current resume command:

```sh
python3 hopper/3d/models/source/tier_a_batch.py M-024 M-027 M-036 --force
```

Render and inspect both LOD0 and LOD1 before integrating any of these three.
