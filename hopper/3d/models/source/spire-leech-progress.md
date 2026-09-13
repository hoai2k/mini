# M-006 Spire Leech scaffold progress

This checkpoint records the mechanical rig and animation foundation that fed
the later Astra art pass. The scaffold itself is not the delivered art;
`spire_leech_refine.py` superseded its placeholder geometry, and the reviewed
Spire Leech was integrated in `bdd3082`.

## Contract and references

- Request: `hopper/3d/design/model-requests.md` (M-006).
- Canonical sprite: `hopper/game/public/assets/enemies/spireLeech.png`.
- Approved implementation reference: `hopper/3d/design/references/enemies/spireLeech-turnaround.png` and adjacent JSON metadata.
- Axis contract: +Y up, +Z forward.
- Exact bounds: 1.3 × 1.3 × 8.2 m.
- Triangle budgets: 5,000 / 1,500.
- Rig: seven connected deforming chain bones plus deforming `Head` and `Jaw` bones.
- Required clips: `Cling_Idle`, `Crawl`, `Charge_Tell`, `Beam_Hold`, `Retract`, `Hit`, `Dissolve`.
- Required sockets: `Core`, `Emitter`, `Hitbox.Body`.

## Source and isolated outputs

- Source: `hopper/3d/models/source/spire_leech.py`.
- Output directory: `local/hopper-rigid-creatures/M-006/` (ignored).
- Candidate files: `spireLeech.glb`, `spireLeech-uncompressed.glb`, `spireLeech.blend`, `record.json`, `manifest.json`, `rig-qa.json`, and `preview-scaffold.png`.
- Rebuild from repository root:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/spire_leech.py -- full`
- Validate from repository root:
  `node hopper/3d/models/source/validate.mjs --manifest local/hopper-rigid-creatures/M-006/manifest.json local/hopper-rigid-creatures/M-006/spireLeech.glb`

## Current QA

- Repository validator: PASS; 117 nodes, 46 meshes, 6 materials, 1,760 / 940 triangles.
- Rest bounds: LOD0 1.300000 × 1.300000 × 8.199999 m; LOD1 1.300000 × 1.300000 × 8.200001 m.
- The compressed GLB contains two skins with nine joints each. Mesh primitives retain `JOINTS_0`, `WEIGHTS_0`, positions, normals, and UVs.
- All vertices on both LODs have finite, normalized weights assigned only to their nine permitted deform bones. Body and collar vertices blend between adjacent chain bones for smooth bends; head, mouth, emitter, lenses, and terminal hook use their intended rigid deform groups.
- `rig-qa.json` records evaluated-mesh samples at the start, middle, and end of every required clip. All sampled coordinates are finite. Both LOD roots have no animation data; `Crawl` is surface-relative and no clip translates either LOD root.
- All seven exported animations contain 46 channels and remain separate after meshopt compression. `Charge_Tell` and `Beam_Hold` also animate the mouth-emitter scale as a readable glow proxy.
- Three authoritative sockets exist on LOD0. `Core` follows `Chain.3`, `Emitter` follows `Head`, and `Hitbox.Body` remains under the LOD root.

## Completed art handoff

The placeholder established the long segmented silhouette, circular hooked
mouth, charge lenses, and terminal hook far enough to exercise the rig.
`spire_leech_refine.py` replaced the simple tube, collars and teeth with the
reviewed overlapping armour and hooked anatomy while retaining the scaffold
interfaces. The final production GLB is
`hopper/3d/models/enemies/spireLeech.glb`; validation and final render details
are in `spire-leech-refine-progress.md`.

The scaffold authoring step did not edit shared manifests, request sources,
production state or production GLBs. Production integration happened later
under the reviewed refinement commit.
