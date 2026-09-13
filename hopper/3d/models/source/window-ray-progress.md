# M-005 Window Ray scaffold progress

This checkpoint is a mechanical skeletal and animation foundation for a later
Astra art pass. It is not a finished creature-art delivery and has not been
copied to production.

## Contract and compatibility

- Request: `hopper/3d/design/model-requests.md` (M-005).
- Canonical sprite: `hopper/game/public/assets/enemies/windowRay.png`.
- Implementation reference: `hopper/3d/design/references/enemies/windowRay-turnaround.png` and adjacent JSON metadata.
- No canonical/rig conflict was found: the single tail uses the requested two-bone tail chain, while the two continuous wings each use two wing bones.
- Axis contract: +Y up, +Z forward.
- Exact bounds: 11 × 0.9 × 6.3 m.
- Triangle budgets: 4,000 / 1,200.
- Skeleton per LOD: `Body`, `Wing.L.0`, `Wing.L.1`, `Wing.R.0`, `Wing.R.1`, `Tail.0`, `Tail.1`, `Eye`.
- Required clips are exported as eight separate animations: `Hover`, `Bank_L`, `Bank_R`, `Dive_Tell`, `Dive`, `Recover`, `Hit`, `Dissolve`.
- Required sockets: `Core`, `Mouth`, `Hitbox.Body`, `Landing`.

## Source and isolated outputs

- Source: `hopper/3d/models/source/window_ray.py`.
- Output directory: `local/hopper-rigid-creatures/M-005/` (ignored).
- Candidate files: `windowRay.glb`, `windowRay-uncompressed.glb`, `windowRay.blend`, `record.json`, `manifest.json`, `rig-qa.json`, and `preview-scaffold.png`.
- Rebuild from repository root:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/window_ray.py -- full`
- Validate from repository root:
  `node hopper/3d/models/source/validate.mjs --manifest local/hopper-rigid-creatures/M-005/manifest.json local/hopper-rigid-creatures/M-005/windowRay.glb`

## Current QA

- Repository validator: PASS; 48 nodes, 12 meshes, 5 materials, 320 / 192 triangles.
- Rest bounds for both LODs: 10.999999 × 0.900000 × 6.299999 m.
- The compressed GLB contains two skins with eight joints each. Mesh primitives retain `JOINTS_0`, `WEIGHTS_0`, positions, normals, and UVs.
- Every mesh vertex on both LODs has finite normalized weights assigned only to the eight permitted bones. Wing-root and outer-wing vertices blend across adjacent controls; the tail blends from `Body` through `Tail.0` and `Tail.1`.
- `rig-qa.json` records isolated evaluated-mesh samples at every authored keyframe. All clips produce finite nonzero deformation on both LODs; maximum displacement from each clip's first sample ranges from 0.166916 m (`Hover`) to 5.2 m (`Dive`).
- `Hover` closes exactly with maximum first/last channel delta 0.0.
- Only `Dive` animates the two LOD roots. Its authored game-space root delta is `[0, -2.4, 5.2]`; all other clip motion remains on the skeleton.
- `Core` follows `Body`, `Mouth` follows `Eye`, and `Hitbox.Body` plus `Landing` remain under LOD0. The top landing socket is the stomp target.

## Art handoff

The placeholder only establishes a flat diamond body, broad continuous wings,
one thin tail, and one visible ivory eye. The creative pass should replace these
simple prisms with the canonical swept armour, camber, inset core and refined eye
while preserving bone and clip names, root-motion isolation, socket placement,
normalized skinning, exact bounds, and LOD budgets.

No shared request document, manifest, production-state file, production GLB or
game file was edited.
