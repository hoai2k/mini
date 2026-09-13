# Tier A cleanup progress

This is the final restart record for the mechanical cleanup pass in
`CODE-BUILT-CLEANUP.md`. Root reviewed, integrated, and validated 27 of the 28
code-built entries; M-056 is held on its invalid authored landing. Candidates,
atlases, logs, and machine-readable reports remain under the ignored
`local/hopper-tier-a/` tree; this runner never edits production GLBs or
`manifest.json` itself.

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
  bakes static part transforms into their allowed rigid-owner space before merging by material,
  welds at 1 cm, checks landing raycasts, bakes a per-model albedo/emission
  atlas, transfers Atlas UVs to LOD1, and exports without animation. Baking
  transforms before the join avoids unrepresentable shear and the inflated
  bounds first exposed by M-027 and M-036.
- Welds are rolled back per material when they alter the triangle count. This
  preserves M-027's overlapping cone shells, where merging nearby vertices had
  collapsed 42 visible canopy triangles. Normals are recalculated only on
  closed manifold meshes; source normals remain intact for open shells.
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
- `tier_a_preview.py` renders matched LOD0 and LOD1 before/after studio views
  from the uncompressed job artifacts without copying candidates over
  production files. The batch runner refreshes all four previews whenever the
  source or candidate changes.
- Cross-file checks compare LOD extras and socket world positions against the
  original compressed GLB. Candidates with more than two embedded images,
  changed sockets, invalid bounds/LODs, validator failures, or size-limit
  failures are deleted and recorded as failed reports.
- Blender records exact decoded vertex bounds before and after cleanup and
  requires each axis to stay within 1 cm. The job-local validator uses those
  exact source bounds because transforming compressed accessor AABB corners can
  overestimate rotated assemblies (M-036 recorded 59.357 m in X while its
  decoded vertices span 52.003 m).
- This path accepts only files with no stored animation clips. The runner and Blender script
  reject a source before cleanup if either the GLB contains animations or the
  manifest declares clips, and the final cross-file check requires zero source
  and candidate animations. Functional behavior described outside the GLB is
  handled by the rigid-owner branch: it records protected node parents, local
  matrices, extras, and triangle ownership, merges only within the nearest
  protected pivot, and rejects any post-compression drift. `export_animations=False`
  runs only after the zero-animation checks pass.
- Source files with no embedded images keep their existing flat-color
  materials instead of receiving a redundant atlas. This applies to the
  silhouette landmarks; the two-image rule is an upper bound there, and adding
  a 2048 atlas made the first M-083 trial 4.6 times larger than its source.
- Opaque generated albedo atlases use JPEG quality 92. M-061 also stores its
  opaque 2048 emission atlas as quality-92 JPEG, cutting the atlas below its
  size cap without lowering resolution. M-036 is an explicit quality
  exception: its original three painted
  images and materials are retained because one atlas erased the visible slate
  courses. M-059, M-060, and M-064 also retain their source images, materials,
  and UVs so functional cleanup cannot reduce their painted texture fidelity.
  The source-texture path still merges meshes by material and applies
  conservative geometry cleanup.

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

## Integrated episode-one static candidates

Root accepted both refreshed contact sheets and ran the integration helper for
M-024, M-027, and M-036. After correcting M-036's manifest measurement from
the verified decoded source, the full production validator passes 73/73.

- M-024 Terrace step passes exact bounds, unchanged 1,536 / 216 triangle
  counts, zero animations, landing checks, Atlas range, and both LOD renders.
  It is 252,696 bytes, down 95.7%. The packed atlas changes the visual texture
  density from horizontal streaks to a coarser dirt pattern, while preserving
  the material placement and silhouette; root previously judged its LOD0
  render reasonable.
- M-027 Windbreak row passes exact bounds and restored unchanged 1,416 / 348
  triangle counts. The canopy material now records
  `weld_action=skipped-triangle-change`, and all open shell normals are
  preserved. The corrected LOD0 and LOD1 renders retain every canopy sector.
  It is 206,872 bytes, down 94.7%.
- M-036 Crag column passes exact bounds, unchanged 1,364 / 304 triangle counts,
  and matched LOD0 and LOD1 renders after retaining its three source textures.
  It is 5,865,996 bytes, down only 0.7%, but reduces 90 nodes to 62 and 38
  meshes to 6 without blurring the painted slate courses. This is a deliberate
  image-quality exception to the normal atlas path.

The refreshed comparison sheets are
`local/hopper-tier-a/previews/episode-one-remaining-lod0-contact.png` and
`local/hopper-tier-a/previews/episode-one-remaining-lod1-contact.png`.

### M-036 manifest-bound diagnostic

M-036's committed pre-cleanup GLB is 5,908,448 bytes with SHA-256
`47906b3b1937a5f1f4ea58a7c8e6d556120a5f5dd2d3233df1995b150d393cc8`.
The production validator reports its compressed LOD0 bounds as
59.357 / 98.318 / 55.545 m because meshopt-compressed positions are not read;
it transforms every primitive accessor's eight AABB corners instead. Decoding
that exact Git blob exposes the real vertex bounds as
52.003 / 95.943 / 51.100 m. The final candidate decodes to
52.004 / 95.943 / 51.102 m, with the sub-centimetre difference coming from
compression quantization. Triangle counts remain exactly 1,364 / 304.

The model therefore did not shrink. Merging rotated parts tightened the final
primitive AABBs and exposed a pre-existing 12.4% X-axis manifest overestimate.
The job-local validator intentionally substituted the exact decoded source
bounds, which explains why candidate validation passed before integration.
`tier_a_batch.py` now records `manifest_bounds_review` in every passed report,
including the old measurements, exact decoded source measurements, per-axis
deltas, and whether production metadata review is required. Root owns any
manifest correction.

## Rejected trials

- The first M-083 trial technically validated but added a redundant 2048²
  atlas to a source with no embedded images, increasing 17,540 bytes to 80,204
  bytes. That trial was discarded. The pipeline now detects this case and keeps
  flat-color materials directly; the rebuilt candidate above is smaller.
- The first M-024, M-027, M-036, and M-037 atlas exports passed some numeric
  checks but visibly mapped a tiled UV set across the new atlas. The reversed
  LOD data transfer caused this and those candidates were discarded. M-036's
  later one-atlas build also lost too much texture detail, so the candidate
  above uses its source paint instead.

## Remaining alien-kit and terrain scope

The remaining manifest inventory contains 12 alien-kit structures and three
terrain files. All currently contain zero glTF animations and declare zero
clips, but the design source still identifies rigid or procedurally animated
pivots that a GLB-only animation check cannot see.

Root reviewed and integrated the first true-static visual gate in `4c0bc91`:

- M-057 Coral spire: 1,866,472 to 113,552 bytes (93.9% reduction), unchanged
  148 / 32 triangles, exact decoded bounds, and `Landing.0` moved less than
  0.000001 m. Both LODs preserve the silhouette, material placement, coral
  stripe texture, and emissive fronds.
- M-058 Basin terrace: 1,856,104 to 177,820 bytes (90.4% reduction), unchanged
  24 / 12 triangles, exact decoded bounds, and `Landing.0` moved less than
  0.000001 m. Both LODs preserve the coral sides and striped ivory top.

Their review sheets are
`local/hopper-tier-a/previews/alien-static-first-two-lod0-contact.png` and
`local/hopper-tier-a/previews/alien-static-first-two-lod1-contact.png`.

Root reviewed and integrated M-062 Dust current, M-063 Obsidian arch, and M-065
Gravity cathedral facade in `d0b9106`. M-062 retains translucent `BLEND`, 0.25
alpha, double-sided material semantics and exact FlowStart/FlowEnd positions.
M-063 retains CeilingLane and Landing.0 exactly. M-065 retains ArenaCenter and
both landings exactly. Their candidates are 3,832, 97,112, and 357,256 bytes,
respectively, with unchanged source triangle counts at both LODs.

Root integrated M-061 Root pillar with M-092 fields in `42aa735`. M-061 is
1,202,560 bytes, down 68.8%. Its 2048
albedo and emission atlases are JPEG quality 92, and both LOD renders preserve
the reef strands and four shelves. Triangles remain 212 / 48, exact bounds are
unchanged, all four landing raycasts pass, and socket drift stays below
0.000007 m. The review sheets are `alien-static-M061-lod0-contact.png` and
`alien-static-M061-lod1-contact.png` under the local preview directory.

Root integrated M-067 Eclipse dais in `879f691` after the shared atlas made its
LOD1 emissive ring too faint. The rebuilt candidate retains both source images,
materials, and UVs; both LOD rings now match the source. It is 3,179,428 bytes,
down 0.2%, and reduces five meshes to four while preserving exact bounds and
all seven landing transforms/raycasts. The original compressed GLB and the
`gltfpack` decoded GLB both contain 648 / 124 authored triangles. Two LOD1.Circle
faces are exact coincident geometric duplicates (source triangle pairs 0/1 and
40/41, with no zero-area triangles); Blender removes those faces during import,
so the reviewed candidate deliberately contains 648 / 122. Root accepted this
specific cleanup after both-LOD visual comparison. The runner now rejects any
compressed-source/import triangle change except this documented M-067 delta,
and records the source count, imported count, delta, and duplicate-face evidence
in `local/hopper-tier-a/reports/M-067-eclipseDais.json` under
`blender.import_topology`. Integration records the reviewed 122 count without
falsifying the original compressed GLB's 124 authored triangles.

M-056 Ivory rib arch remains blocked. Its unchanged source geometry already
fails `Landing.0`: the authored crown socket at y=26.5 sits inside the central
rib and has no downward landing face within 0.5 m. The static runner does not
relax that gameplay contract.

The functional rigid-owner path is now implemented for M-059, M-060, M-064,
and M-066. Root reviewed and integrated M-060 Floating reef and M-064 Ring shard
in `1135ed2`; their LOD roots, landing parents/transforms/extras, exact bounds,
and per-root triangle ownership are preserved. Their original painted textures
remain unchanged. Production manifest processing records the cleanup while the
source hierarchy evidence remains in the local reports.

Root integrated M-059 Coral bridge and M-066 Gravity seam in `1f00d9a` after
matched LOD0/LOD1 review. M-059 is 1,859,120 bytes with 132 / 100 triangles.
Stage0/1/2 and the three LOD1 stage pivots retain their exact parents,
transforms, extras, and 12 triangles each; all three landing raycasts pass. The
authored landing nodes are LOD-root siblings, and the candidate preserves that
source relationship rather than inventing a new parent. M-066 is 6,280 bytes,
down 40.9%, with 76 / 68 triangles. Arrow0..7 and LOD1.Arrow1..7 retain exact
parents, transforms, extras, and eight triangles each; the source intentionally
has no LOD1.Arrow0. Quantized compression adds anonymous transform wrappers, so
reported node counts rise to 38 and 53 respectively, but none replaces or
intervenes above a protected pivot. Reports record
`functional_structure: preserved`. Review sheets are
`functional-pivots-secondpair-lod0-contact.png` and
`functional-pivots-secondpair-lod1-contact.png` under the local preview directory.

Root integrated all three M-092 terrain candidates: fields in `42aa735`, then
city and mountains in `f169534`. The first fields atlas
trial introduced dark LOD1 seams and was discarded. All three now retain their
source texture, material, and UVs through the terrain bake-only branch, which
requires one mesh per LOD and skips material merge and weld:

| File | Candidate bytes | Reduction | LOD0 / LOD1 triangles |
| --- | ---: | ---: | ---: |
| `terrain/fields.glb` | 2,382,564 | 9.3% | 59,858 / 2,518 |
| `terrain/city.glb` | 1,949,752 | 10.8% | 59,858 / 2,518 |
| `terrain/mountains.glb` | 2,411,588 | 9.4% | 59,858 / 2,519 |

Exact decoded bounds are unchanged for every LOD. M-092 preview keys append
the terrain stem so the shared request ID cannot overwrite another terrain's
renders. Review files are `M-092-fields-lod0-contact.png`,
`M-092-fields-lod1-contact.png`, `terrain-city-mountains-lod0-contact.png`, and
`terrain-city-mountains-lod1-contact.png` under the local preview directory.

## Resume

Only the held M-056 diagnostic remains. From the repository root, run:

```sh
python3 hopper/3d/models/source/tier_a_batch.py M-056
```

Use `--force` only to rebuild a completed/failed job after changing the cleanup
scripts. A normal rerun reuses already-passed reports.

Current blocked diagnostic:

```sh
python3 hopper/3d/models/source/tier_a_batch.py M-056 --force
```

Do not integrate a rebuilt candidate without regenerating and inspecting both
LOD levels. Invoke terrain with an exact path rather than the shared M-092 ID.
